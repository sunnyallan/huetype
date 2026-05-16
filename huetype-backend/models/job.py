from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


class JobCreate(BaseModel):
    color_format: Literal["glyf_colr_1", "glyf_colr_0"] = "glyf_colr_1"


class JobResponse(BaseModel):
    id: str
    project_id: str
    status: str
    color_format: str
    error_message: Optional[str]
    font_storage_path: Optional[str]
    ttf_storage_path: Optional[str]
    sbix_storage_path: Optional[str]   # COLR+SBIX TTF for Safari / iOS
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
