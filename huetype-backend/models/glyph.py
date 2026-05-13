from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class GlyphUpdate(BaseModel):
    name: Optional[str] = None
    codepoint: Optional[str] = None

    @field_validator("name")
    @classmethod
    def _validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        if len(v) > 64:
            raise ValueError("Name must be 64 characters or fewer")
        return v

    @field_validator("codepoint")
    @classmethod
    def _validate_codepoint(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not v:
            raise ValueError("Codepoint cannot be empty")
        return v


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
