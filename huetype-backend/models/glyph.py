from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class GlyphResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    name: str
    codepoint: str
    svg_storage_path: Optional[str]
    layer_count: int
    upload_order: int
    created_at: datetime
