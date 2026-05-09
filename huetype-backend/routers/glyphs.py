import io
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from services.auth import verify_token
from services.db import db, get_tier_limits
from services import storage

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

    # Validate SVG and count layers
    layer_count = _count_svg_layers(svg_bytes)
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
