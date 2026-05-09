from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from models.project import ProjectCreate
from services.auth import verify_token
from services.db import db, get_tier_limits
from services import storage

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
def list_projects(user_id: str = Depends(verify_token)):
    result = (
        db.table("projects")
        .select("*")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
    )
    projects = result.data or []

    # Attach glyph count per project
    for project in projects:
        count_res = (
            db.table("glyphs")
            .select("id", count="exact")
            .eq("project_id", project["id"])
            .execute()
        )
        project["glyph_count"] = count_res.count or 0

    return projects


@router.post("", status_code=201)
def create_project(body: ProjectCreate, user_id: str = Depends(verify_token)):
    limits = get_tier_limits(user_id)

    if limits["projects"] != -1:
        count_res = (
            db.table("projects")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        if (count_res.count or 0) >= limits["projects"]:
            raise HTTPException(
                status_code=403,
                detail=f"Free plan is limited to {limits['projects']} projects. Upgrade to Pro for unlimited projects.",
            )

    now = datetime.now(timezone.utc).isoformat()
    result = (
        db.table("projects")
        .insert(
            {
                "user_id": user_id,
                "name": body.name,
                "description": body.description or "",
                "status": "draft",
                "created_at": now,
                "updated_at": now,
            }
        )
        .execute()
    )
    return result.data[0]


@router.get("/{project_id}")
def get_project(project_id: str, user_id: str = Depends(verify_token)):
    proj_res = (
        db.table("projects")
        .select("*")
        .eq("id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if proj_res is None or not proj_res.data:
        raise HTTPException(status_code=404, detail="Project not found")

    glyphs_res = (
        db.table("glyphs")
        .select("*")
        .eq("project_id", project_id)
        .order("upload_order")
        .execute()
    )

    job_res = (
        db.table("font_jobs")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    return {
        **proj_res.data,
        "glyphs": glyphs_res.data or [],
        "latest_job": job_res.data[0] if job_res.data else None,
    }


@router.patch("/{project_id}")
def update_project(project_id: str, body: ProjectCreate, user_id: str = Depends(verify_token)):
    proj_res = (
        db.table("projects")
        .select("id")
        .eq("id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if proj_res is None or not proj_res.data:
        raise HTTPException(status_code=404, detail="Project not found")

    result = (
        db.table("projects")
        .update(
            {
                "name": body.name,
                "description": body.description or "",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", project_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0]


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, user_id: str = Depends(verify_token)):
    proj_res = (
        db.table("projects")
        .select("id")
        .eq("id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if proj_res is None or not proj_res.data:
        raise HTTPException(status_code=404, detail="Project not found")

    # Best-effort storage cleanup before DB delete
    for bucket in ("svgs", "fonts"):
        prefix = f"{user_id}/{project_id}"
        paths = storage.list_files(bucket, prefix)
        storage.delete_files(bucket, paths)

    db.table("projects").delete().eq("id", project_id).eq("user_id", user_id).execute()
