import io
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from models.glyph import GlyphUpdate
from services.auth import verify_token
from services.db import db, get_tier_limits
from services import storage
from services.svg_recolor import unique_fills, has_unsupported_fills

router = APIRouter(prefix="/projects/{project_id}/glyphs", tags=["glyphs"])

# Private use area: U+E001 through U+F8FF
_PUA_START = 0xE001
_PUA_END = 0xF8FF


def _assert_project_owner(project_id: str, user_id: str) -> None:
    res = (
        db.table("projects")
        .select("id")
        .eq("id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if res is None or not res.data:
        raise HTTPException(status_code=404, detail="Project not found")


def _get_project_font_type(project_id: str, user_id: str) -> str:
    res = (
        db.table("projects")
        .select("font_type")
        .eq("id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if res is None or not res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return res.data.get("font_type", "illustration")


_SHAPE_TAGS = {"path", "rect", "circle", "ellipse", "polygon", "polyline", "line"}


def _count_layer_units(root: ET.Element) -> int:
    """
    Count 'layer units' in an SVG. A <g> group is one unit (all its inner
    shapes share that unit). A standalone shape is one unit. Single-child
    wrapper groups are unwrapped.
    """
    canvas = root
    while True:
        children = [
            c for c in canvas
            if c.tag.split("}")[-1].lower() in (_SHAPE_TAGS | {"g"})
        ]
        if len(children) == 1 and children[0].tag.split("}")[-1].lower() == "g":
            canvas = children[0]
            continue
        break

    count = 0
    for child in canvas:
        tag = child.tag.split("}")[-1].lower()
        if tag == "g":
            if any(
                el.tag.split("}")[-1].lower() in _SHAPE_TAGS
                for el in child.iter()
            ):
                count += 1
        elif tag in _SHAPE_TAGS:
            count += 1
    return count


# Kept for backward compatibility — same body as layer-unit counting but
# returns count of raw shape elements.
def _count_shape_elements(root: ET.Element) -> int:
    return sum(
        1 for el in root.iter()
        if el.tag.split("}")[-1].lower() in _SHAPE_TAGS
    )


def _validate_svg_for_font_type(
    svg_text: str, font_type: str, root: ET.Element
) -> int:
    """
    Validates an SVG against a project's font type.

    Rules:
      - Solid fills only (no gradients/patterns)
      - At least one fill colour
      - Duo-tone: at most 2 distinct fill colours
      - Tri-tone: at most 3 distinct fill colours
      - Illustration: no colour limit

    Returns the layer count (number of shape elements — paths, circles, etc.).
    """
    if has_unsupported_fills(svg_text):
        raise HTTPException(
            status_code=422,
            detail=(
                "This SVG uses gradient or pattern fills, which Hue Type can't "
                "process yet. Replace them with solid fills and try again."
            ),
        )

    colour_count = len(unique_fills(svg_text))
    # "Layer count" surfaced to the user is the number of layer units
    # (groups + standalone shapes), so a group of paths reads as one layer.
    shape_count = _count_layer_units(root)

    if colour_count == 0:
        raise HTTPException(
            status_code=422,
            detail=(
                "This SVG has no solid fill colours. Add a fill='#…' to each "
                "shape so we know what colours to use."
            ),
        )

    if font_type == "duo" and colour_count > 2:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Duo-tone projects allow up to 2 distinct fill colours. This "
                f"SVG uses {colour_count} ({shape_count} shapes). Reduce the "
                f"palette or switch to tri-tone."
            ),
        )

    if font_type == "tri" and colour_count > 3:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Tri-tone projects allow up to 3 distinct fill colours. This "
                f"SVG uses {colour_count} ({shape_count} shapes). Reduce the "
                f"palette or switch to illustration."
            ),
        )

    return shape_count


def _enforce_square(root: ET.Element) -> None:
    """
    Verifies the SVG has a 1:1 aspect ratio via viewBox or width/height.
    Raises HTTPException(422) if not square (with ~1% tolerance).
    """
    viewbox = root.attrib.get("viewBox") or root.attrib.get("viewbox")
    w = h = None

    if viewbox:
        parts = viewbox.replace(",", " ").split()
        if len(parts) == 4:
            try:
                _, _, w, h = (float(p) for p in parts)
            except ValueError:
                pass

    if w is None or h is None:
        try:
            raw_w = root.attrib.get("width", "").rstrip("px").strip()
            raw_h = root.attrib.get("height", "").rstrip("px").strip()
            if raw_w and raw_h:
                w = float(raw_w)
                h = float(raw_h)
        except ValueError:
            pass

    if w is None or h is None or w <= 0 or h <= 0:
        raise HTTPException(
            status_code=422,
            detail=(
                "SVG must declare a viewBox or width/height so we can verify "
                "its aspect ratio."
            ),
        )

    ratio = w / h
    if abs(ratio - 1.0) > 0.01:
        raise HTTPException(
            status_code=422,
            detail=(
                f"SVG must be square (1:1 aspect ratio). This one is "
                f"{w:g}×{h:g} ({ratio:.2f}:1). Resize the artboard before uploading."
            ),
        )


def _count_svg_layers(svg_bytes: bytes) -> int:
    """Counts top-level <g> groups in the SVG — each group = one colour layer."""
    try:
        root = ET.fromstring(svg_bytes.decode("utf-8"))
        ns = {"svg": "http://www.w3.org/2000/svg"}
        # Try with namespace first, then without
        groups = root.findall("svg:g", ns) or root.findall("g")
        return max(len(groups), 1)
    except ET.ParseError:
        raise HTTPException(status_code=422, detail="Invalid SVG: could not parse XML")


def _next_codepoint(project_id: str) -> str:
    """Returns the next available codepoint (hex string) in the PUA for this project."""
    res = (
        db.table("glyphs")
        .select("codepoint")
        .eq("project_id", project_id)
        .execute()
    )
    used = {int(g["codepoint"], 16) for g in (res.data or []) if g.get("codepoint")}
    for cp in range(_PUA_START, _PUA_END + 1):
        if cp not in used:
            return format(cp, "04X")
    raise HTTPException(status_code=400, detail="No available codepoints in the private use area")


def _normalise_codepoint(raw: str) -> str:
    """Parse a user-supplied codepoint string and return canonical 4-char hex."""
    try:
        cp_int = int(raw.lstrip("U+").lstrip("u+"), 16)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail="Invalid codepoint format. Use hex e.g. E001.",
        )
    if not (_PUA_START <= cp_int <= _PUA_END):
        raise HTTPException(
            status_code=422,
            detail="Codepoint must be in the private use area (E001–F8FF).",
        )
    return format(cp_int, "04X")


def _check_name_unique(
    project_id: str, name: str, exclude_glyph_id: Optional[str] = None
) -> None:
    q = (
        db.table("glyphs")
        .select("id, name")
        .eq("project_id", project_id)
        .eq("name", name)
    )
    if exclude_glyph_id:
        q = q.neq("id", exclude_glyph_id)
    res = q.limit(1).execute()
    if res.data:
        raise HTTPException(
            status_code=409,
            detail=f"Another glyph in this project already uses the name '{name}'.",
        )


def _check_codepoint_unique(
    project_id: str, codepoint: str, exclude_glyph_id: Optional[str] = None
) -> None:
    q = (
        db.table("glyphs")
        .select("id, codepoint")
        .eq("project_id", project_id)
        .eq("codepoint", codepoint)
    )
    if exclude_glyph_id:
        q = q.neq("id", exclude_glyph_id)
    res = q.limit(1).execute()
    if res.data:
        raise HTTPException(
            status_code=409,
            detail=f"Codepoint U+{codepoint} is already used by another glyph in this project.",
        )


@router.post("", status_code=201)
async def upload_glyph(
    project_id: str,
    name: str = Form(...),
    codepoint: str = Form(None),  # optional; auto-assigned if omitted
    file: UploadFile = File(...),
    user_id: str = Depends(verify_token),
):
    _assert_project_owner(project_id, user_id)
    limits = get_tier_limits(user_id)

    # Check glyph count limit
    if limits["glyphs"] != -1:
        count_res = (
            db.table("glyphs")
            .select("id", count="exact")
            .eq("project_id", project_id)
            .execute()
        )
        if (count_res.count or 0) >= limits["glyphs"]:
            raise HTTPException(
                status_code=403,
                detail=f"Your plan allows {limits['glyphs']} glyphs per project. Upgrade to add more.",
            )

    if not file.filename or not file.filename.lower().endswith(".svg"):
        raise HTTPException(status_code=422, detail="Only SVG files are accepted")

    svg_bytes = await file.read()
    if len(svg_bytes) > 2 * 1024 * 1024:  # 2 MB hard cap
        raise HTTPException(status_code=413, detail="SVG file exceeds 2 MB limit")

    # Parse XML to confirm it's actually an SVG
    try:
        svg_text = svg_bytes.decode("utf-8")
        root = ET.fromstring(svg_text)
    except (UnicodeDecodeError, ET.ParseError):
        raise HTTPException(
            status_code=422,
            detail="File is not a valid SVG — could not parse as XML.",
        )

    # Confirm the root element is an SVG
    root_tag = root.tag.split("}")[-1].lower()
    if root_tag != "svg":
        raise HTTPException(
            status_code=422,
            detail="File is not a valid SVG — root element is not <svg>.",
        )

    # Aspect ratio must be 1:1 (icon-friendly)
    _enforce_square(root)

    # Project-type-specific validation (also counts unique fills as layer_count)
    font_type = _get_project_font_type(project_id, user_id)
    layer_count = _validate_svg_for_font_type(svg_text, font_type, root)

    # Plan limit on max layers
    if layer_count > limits["layers"]:
        raise HTTPException(
            status_code=403,
            detail=(
                f"This SVG has {layer_count} colour layers. "
                f"Your plan supports up to {limits['layers']} layers. "
                + ("Upgrade to Pro for 8-layer support." if limits["layers"] == 5 else "")
            ),
        )

    # Auto-assign codepoint if not provided
    if not codepoint:
        codepoint = _next_codepoint(project_id)
    else:
        codepoint = _normalise_codepoint(codepoint)
        _check_codepoint_unique(project_id, codepoint)

    # Name uniqueness inside project
    _check_name_unique(project_id, name)

    # Determine upload_order (append to end)
    order_res = (
        db.table("glyphs")
        .select("upload_order")
        .eq("project_id", project_id)
        .order("upload_order", desc=True)
        .limit(1)
        .execute()
    )
    upload_order = (order_res.data[0]["upload_order"] + 1) if order_res.data else 0

    # Insert glyph row first to get the UUID for storage path
    now = datetime.now(timezone.utc).isoformat()
    glyph_res = (
        db.table("glyphs")
        .insert(
            {
                "project_id": project_id,
                "user_id": user_id,
                "name": name,
                "codepoint": codepoint,
                "layer_count": layer_count,
                "upload_order": upload_order,
                "created_at": now,
            }
        )
        .execute()
    )
    glyph = glyph_res.data[0]
    glyph_id = glyph["id"]

    # Upload SVG to Supabase Storage
    svg_path = f"{user_id}/{project_id}/{glyph_id}.svg"
    storage.upload_svg(svg_path, svg_bytes)

    # Save storage path back to the glyph row
    db.table("glyphs").update({"svg_storage_path": svg_path}).eq("id", glyph_id).execute()
    glyph["svg_storage_path"] = svg_path

    # Mark project as updated
    db.table("projects").update(
        {"updated_at": now, "status": "draft"}
    ).eq("id", project_id).execute()

    return glyph


@router.patch("/{glyph_id}")
def update_glyph(
    project_id: str,
    glyph_id: str,
    body: GlyphUpdate,
    user_id: str = Depends(verify_token),
):
    _assert_project_owner(project_id, user_id)

    glyph_res = (
        db.table("glyphs")
        .select("id, name, codepoint")
        .eq("id", glyph_id)
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if glyph_res is None or not glyph_res.data:
        raise HTTPException(status_code=404, detail="Glyph not found")
    current = glyph_res.data

    updates: dict = {}

    if body.name is not None and body.name != current["name"]:
        _check_name_unique(project_id, body.name, exclude_glyph_id=glyph_id)
        updates["name"] = body.name

    if body.codepoint is not None:
        new_cp = _normalise_codepoint(body.codepoint)
        if new_cp != current["codepoint"]:
            _check_codepoint_unique(project_id, new_cp, exclude_glyph_id=glyph_id)
            updates["codepoint"] = new_cp

    if not updates:
        # Nothing to change — just return the current row
        full = (
            db.table("glyphs")
            .select("*")
            .eq("id", glyph_id)
            .single()
            .execute()
        )
        return full.data

    result = (
        db.table("glyphs")
        .update(updates)
        .eq("id", glyph_id)
        .eq("user_id", user_id)
        .execute()
    )

    # Mark project as draft since glyphs changed
    db.table("projects").update(
        {"updated_at": datetime.now(timezone.utc).isoformat(), "status": "draft"}
    ).eq("id", project_id).execute()

    return result.data[0]


@router.put("/{glyph_id}/svg", status_code=200)
async def replace_glyph_svg(
    project_id: str,
    glyph_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(verify_token),
):
    """Replaces the SVG for an existing glyph, re-running all upload validations."""
    _assert_project_owner(project_id, user_id)
    limits = get_tier_limits(user_id)

    glyph_res = (
        db.table("glyphs")
        .select("id, svg_storage_path")
        .eq("id", glyph_id)
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if glyph_res is None or not glyph_res.data:
        raise HTTPException(status_code=404, detail="Glyph not found")

    if not file.filename or not file.filename.lower().endswith(".svg"):
        raise HTTPException(status_code=422, detail="Only SVG files are accepted")

    svg_bytes = await file.read()
    if len(svg_bytes) > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="SVG file exceeds 2 MB limit")

    try:
        svg_text = svg_bytes.decode("utf-8")
        root = ET.fromstring(svg_text)
    except (UnicodeDecodeError, ET.ParseError):
        raise HTTPException(
            status_code=422,
            detail="File is not a valid SVG — could not parse as XML.",
        )

    root_tag = root.tag.split("}")[-1].lower()
    if root_tag != "svg":
        raise HTTPException(
            status_code=422,
            detail="File is not a valid SVG — root element is not <svg>.",
        )

    _enforce_square(root)

    font_type = _get_project_font_type(project_id, user_id)
    layer_count = _validate_svg_for_font_type(svg_text, font_type, root)

    if layer_count > limits["layers"]:
        raise HTTPException(
            status_code=403,
            detail=(
                f"This SVG has {layer_count} colour layers. "
                f"Your plan supports up to {limits['layers']} layers."
            ),
        )

    # Re-upload to the same storage path (upsert)
    svg_path = glyph_res.data.get("svg_storage_path") or f"{user_id}/{project_id}/{glyph_id}.svg"
    storage.upload_svg(svg_path, svg_bytes)

    # Update the row (layer_count may have changed)
    now = datetime.now(timezone.utc).isoformat()
    db.table("glyphs").update(
        {"layer_count": layer_count, "svg_storage_path": svg_path}
    ).eq("id", glyph_id).execute()

    # Mark project draft so it gets rebuilt
    db.table("projects").update(
        {"updated_at": now, "status": "draft"}
    ).eq("id", project_id).execute()

    full = (
        db.table("glyphs")
        .select("*")
        .eq("id", glyph_id)
        .single()
        .execute()
    )
    return full.data


@router.delete("/{glyph_id}", status_code=204)
def delete_glyph(project_id: str, glyph_id: str, user_id: str = Depends(verify_token)):
    _assert_project_owner(project_id, user_id)

    glyph_res = (
        db.table("glyphs")
        .select("svg_storage_path")
        .eq("id", glyph_id)
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if glyph_res is None or not glyph_res.data:
        raise HTTPException(status_code=404, detail="Glyph not found")

    # Delete from storage
    svg_path = glyph_res.data.get("svg_storage_path")
    if svg_path:
        storage.delete_files(storage.SVG_BUCKET, [svg_path])

    db.table("glyphs").delete().eq("id", glyph_id).eq("user_id", user_id).execute()

    # Re-sequence upload_order for remaining glyphs
    remaining = (
        db.table("glyphs")
        .select("id")
        .eq("project_id", project_id)
        .order("upload_order")
        .execute()
    )
    for i, g in enumerate(remaining.data or []):
        db.table("glyphs").update({"upload_order": i}).eq("id", g["id"]).execute()
