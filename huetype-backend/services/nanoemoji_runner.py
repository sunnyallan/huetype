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
import csv
import shutil
import subprocess
import tempfile
from pathlib import Path
from datetime import datetime, timezone

from services.db import db
from services import storage


def _toml_config(family: str, glyphs: list[dict], output_dir: str) -> str:
    """Generates a nanoemoji config.toml from a list of glyph dicts."""
    lines = [
        f'[font]',
        f'  family = "{family}"',
        f'  version = "1.0"',
        f'  output_dir = "{output_dir}"',
        "",
    ]
    for g in glyphs:
        cp_int = int(g["codepoint"], 16)
        lines += [
            "[[glyphs]]",
            f'  filename = "{g["local_path"]}"',
            f"  codepoints = [{hex(cp_int)}]",
            "",
        ]
    return "\n".join(lines)


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

        # ── Download SVGs from Supabase Storage ─────────────────────────────
        for g in glyphs:
            svg_bytes = storage.download_file(storage.SVG_BUCKET, g["svg_storage_path"])
            local_path = svg_dir / f"{g['id']}.svg"
            local_path.write_bytes(svg_bytes)
            g["local_path"] = str(local_path)

        # ── Fetch project name for font family ──────────────────────────────
        proj_res = db.table("projects").select("name").eq("id", project_id).single().execute()
        family = proj_res.data.get("name", "Hue Type Icons")

        # ── Write config.toml ───────────────────────────────────────────────
        output_dir = str(workdir / "out")
        Path(output_dir).mkdir()
        config_content = _toml_config(family, glyphs, output_dir)
        config_path = workdir / "config.toml"
        config_path.write_text(config_content)

        # ── Run nanoemoji ────────────────────────────────────────────────────
        result = subprocess.run(
            ["nanoemoji", "--color_format", color_format, "--config_file", str(config_path)],
            capture_output=True,
            text=True,
            timeout=300,  # 5-minute hard timeout
            cwd=str(workdir),
        )
        if result.returncode != 0:
            raise RuntimeError(f"nanoemoji failed:\n{result.stderr[-3000:]}\nSTDOUT:\n{result.stdout[-1000:]}")

        # ── Find output files ────────────────────────────────────────────────
        out_path = Path(output_dir)
        woff2_files = list(out_path.glob("*.woff2"))
        ttf_files = list(out_path.glob("*.ttf"))

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
