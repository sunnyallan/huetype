from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
import re


HEX_COLOR_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    font_type: str = "illustration"
    palette: List[str] = Field(default_factory=list)

    @field_validator("font_type")
    @classmethod
    def _validate_type(cls, v: str) -> str:
        if v not in ("illustration", "duo", "tri"):
            raise ValueError("font_type must be illustration, duo, or tri")
        return v

    @field_validator("palette")
    @classmethod
    def _validate_palette(cls, v: List[str]) -> List[str]:
        for c in v:
            if not HEX_COLOR_RE.match(c):
                raise ValueError(f"Invalid hex colour: {c}")
        return v


class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: str
    status: str
    font_type: str = "illustration"
    palette: List[str] = []
    created_at: datetime
    updated_at: datetime
