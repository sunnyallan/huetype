"""
nanoemoji font build pipeline.

Day 2 implementation — this file is a documented stub.
The full logic will be written in the Day 2 session.

Flow:
  1. Download SVGs from Supabase Storage to /tmp/{job_id}/svgs/
  2. Write codepointmap.csv + config.toml
  3. subprocess.run(["nanoemoji", "--config", "config.toml"])
  4. Upload output .woff2 to Supabase Storage
  5. Update font_jobs row: status=complete
  6. Clean up /tmp/{job_id}/
"""

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from datetime import datetime, timezone

from services.db import db
from services import storage
from services.svg_recolor import recolor_svg_smart


async def run_font_job(job_id: str, project_id: str, user_id: str, color_format: str) -> None:
    """
    Background task: builds a colour font from a project's uploaded glyphs.
    Called by routers/jobs.py via FastAPI BackgroundTasks.
    FULL IMPLEMENTATION IN DAY 2.
    """
    workdir = Path(tempfile.mkdtemp(prefix=f"huetype_{job_id}_"))
    svg_dir = workdir / "svgs"
    svg_dir.mkdir()

    try:
        # ── Mark job as processing ──────────────────────────────────────────
        db.table("font_jobs").update(
            {
                "status": "processing",
                "started_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", job_id).execute()

        db.table("projects").update({"status": "building"}).eq("id", project_id).execute()

        # ── Fetch glyphs ────────────────────────────────────────────────────
        glyphs_res = (
            db.table("glyphs")
            .select("*")
            .eq("project_id", project_id)
            .order("upload_order")
            .execute()
        )
        glyphs = glyphs_res.data or []
        if not glyphs:
            raise ValueError("No glyphs found in project")

        # ── Fetch project (for name, font_type, palette) ────────────────────
        proj_res = (
            db.table("projects")
            .select("name, font_type, palette")
            .eq("id", project_id)
            .single()
            .execute()
        )
        family = proj_res.data.get("name", "Hue Type Icons")
        font_type = proj_res.data.get("font_type", "illustration")
        palette = proj_res.data.get("palette", []) or []

        # ── Validate palette for duo/tri-tone projects ──────────────────────
        required_slots = {"duo": 2, "tri": 3}.get(font_type)
        if required_slots and len(palette) < required_slots:
            raise ValueError(
                f"Project requires {required_slots} palette colour(s) for {font_type}-tone "
                f"but only {len(palette)} are configured."
            )

        # ── Download SVGs (recolour against palette for duo/tri-tone) ───────
        for g in glyphs:
            svg_bytes = storage.download_file(storage.SVG_BUCKET, g["svg_storage_path"])
            cp_int = int(g["codepoint"], 16)
            local_path = svg_dir / f"emoji_u{cp_int:04x}.svg"

            if font_type in ("duo", "tri"):
                try:
                    svg_text = svg_bytes.decode("utf-8")
                    # Hybrid:
                    #   shape count ≤ palette size → per-shape mapping
                    #   shape count > palette size → per-source-colour mapping
                    recoloured = recolor_svg_smart(
                        svg_text, palette[:required_slots]
                    )
                    local_path.write_text(recoloured, encoding="utf-8")
                except ValueError as exc:
                    raise ValueError(f"Glyph '{g['name']}': {exc}") from exc
            else:
                local_path.write_bytes(svg_bytes)

            g["local_path"] = str(local_path)

        # ── Run nanoemoji with SVGs passed directly on the CLI ───────────────
        svg_paths = [g["local_path"] for g in glyphs]
        result = subprocess.run(
            [
                "nanoemoji",
                "--color_format", color_format,
                "--family", family,
            ] + svg_paths,
            capture_output=True,
            text=True,
            timeout=300,
            cwd=str(workdir),
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"nanoemoji failed:\n{result.stderr[-2000:]}\n"
                f"STDOUT:\n{result.stdout[-1500:]}"
            )

        # ── Find output files anywhere under workdir ─────────────────────────
        woff2_files = list(workdir.rglob("*.woff2"))
        ttf_files = [f for f in workdir.rglob("*.ttf") if f not in woff2_files]

        if not woff2_files and not ttf_files:
            raise RuntimeError("nanoemoji produced no output files")

        font_storage_path = None
        ttf_storage_path = None

        # ── Upload to Supabase Storage ───────────────────────────────────────
        if woff2_files:
            woff2_bytes = woff2_files[0].read_bytes()
            font_storage_path = f"{user_id}/{project_id}/{job_id}.woff2"
            storage.upload_font(font_storage_path, woff2_bytes, "font/woff2")

        if ttf_files:
            ttf_bytes = ttf_files[0].read_bytes()
            ttf_storage_path = f"{user_id}/{project_id}/{job_id}.ttf"
            storage.upload_font(ttf_storage_path, ttf_bytes, "font/ttf")

        # ── Mark complete ────────────────────────────────────────────────────
        db.table("font_jobs").update(
            {
                "status": "complete",
                "font_storage_path": font_storage_path,
                "ttf_storage_path": ttf_storage_path,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", job_id).execute()

        db.table("projects").update({"status": "ready"}).eq("id", project_id).execute()

    except Exception as exc:
        db.table("font_jobs").update(
            {
                "status": "failed",
                "error_message": str(exc)[:4000],
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", job_id).execute()
        db.table("projects").update({"status": "error"}).eq("id", project_id).execute()

    finally:
        shutil.rmtree(workdir, ignore_errors=True)
