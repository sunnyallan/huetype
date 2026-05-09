from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from models.job import JobCreate
from services.auth import verify_token
from services.db import db, get_tier_limits
from services import storage
from services.nanoemoji_runner import run_font_job

router = APIRouter(prefix="/projects/{project_id}/jobs", tags=["jobs"])


def _assert_project_owner(project_id: str, user_id: str) -> None:
    res = (
        db.table("projects")
        .select("id")
        .eq("id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")


@router.post("", status_code=202)
def create_job(
    project_id: str,
    body: JobCreate,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(verify_token),
):
    _assert_project_owner(project_id, user_id)
    limits = get_tier_limits(user_id)

    # Validate format is allowed for this tier
    if body.color_format not in limits["formats"]:
        raise HTTPException(
            status_code=403,
            detail=f"Format '{body.color_format}' requires a higher plan. Allowed: {limits['formats']}",
        )

    # Ensure there are glyphs to build
    glyph_res = (
        db.table("glyphs")
        .select("id", count="exact")
        .eq("project_id", project_id)
        .execute()
    )
    if not glyph_res.count:
        raise HTTPException(status_code=400, detail="Upload at least one glyph before building")

    # Create the job row
    now = datetime.now(timezone.utc).isoformat()
    job_res = (
        db.table("font_jobs")
        .insert(
            {
                "project_id": project_id,
                "user_id": user_id,
                "status": "queued",
                "color_format": body.color_format,
                "created_at": now,
            }
        )
        .execute()
    )
    job = job_res.data[0]
    job_id = job["id"]

    # Kick off background processing — returns immediately to caller
    background_tasks.add_task(run_font_job, job_id, project_id, user_id, body.color_format)

    return {"job_id": job_id, "status": "queued"}


@router.get("/{job_id}")
def get_job(project_id: str, job_id: str, user_id: str = Depends(verify_token)):
    _assert_project_owner(project_id, user_id)

    job_res = (
        db.table("font_jobs")
        .select("*")
        .eq("id", job_id)
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job not found")

    return job_res.data


@router.get("/{job_id}/download")
def get_download_url(
    project_id: str,
    job_id: str,
    fmt: str = "woff2",
    user_id: str = Depends(verify_token),
):
    _assert_project_owner(project_id, user_id)

    job_res = (
        db.table("font_jobs")
        .select("status, font_storage_path, ttf_storage_path")
        .eq("id", job_id)
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job not found")

    job = job_res.data
    if job["status"] != "complete":
        raise HTTPException(status_code=400, detail="Font is not ready yet")

    path = job["font_storage_path"] if fmt == "woff2" else job.get("ttf_storage_path")
    if not path:
        raise HTTPException(status_code=404, detail=f"No {fmt.upper()} file available for this job")

    signed_url = storage.get_signed_url(storage.FONT_BUCKET, path, expires_in=3600)
    return {"url": signed_url, "format": fmt, "expires_in": 3600}
