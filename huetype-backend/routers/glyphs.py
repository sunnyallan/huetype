import io
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

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


def _validate_svg_for_font_type(svg_text: str, font_type: str) -> int:
    """
    Validates an SVG against a project's font type.
    Returns the layer count (number of unique fill colours).
    Raises HTTPException(422) with a clear message on failure.
    """
    if has_unsupported_fills(svg_text):
        raise HTTPException(
            status_code=422,
            detail=(
                "This SVG uses gradient or pattern fills, which Hue Type can't "
                "process yet. Replace them with solid fills and try again."
            ),
        )

    fills = unique_fills(svg_text)
    layer_count = len(fills)

    if layer_count == 0:
        raise HTTPException(
            status_code=422,
            detail=(
                "This SVG has no solid fill colours. Add a fill='#…' to each "
                "shape so we know what colours to use."
            ),
        )

    if font_type == "duo" and layer_count != 2:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Duo-tone projects need exactly 2 colour layers, but this SVG "
                f"has {layer_count}. Adjust the SVG or switch the project type."
            ),
        )

    if font_type == "tri" and layer_count != 3:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Tri-tone projects need exactly 3 colour layers, but this SVG "
                f"has {layer_count}. Adjust the SVG or switch the project type."
            ),
        )

    return layer_count


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
    layer_count = _validate_svg_for_font_type(svg_text, font_type)

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
        # Validate user-supplied codepoint is in PUA
        try:
            cp_int = int(codepoint.lstrip("U+").lstrip("u+"), 16)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid codepoint format. Use hex e.g. E001")
        if not (_PUA_START <= cp_int <= _PUA_END):
            raise HTTPException(
                status_code=422,
                detail=f"Codepoint must be in the private use area (E001–F8FF)",
            )
        codepoint = format(cp_int, "04X")

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
        .select("id")
        .eq("id", glyph_id)
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if glyph_res is None or not glyph_res.data:
        raise HTTPException(status_code=404, detail="Glyph not found")

    result = (
        db.table("glyphs")
        .update({"name": body.name})
        .eq("id", glyph_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0]


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
