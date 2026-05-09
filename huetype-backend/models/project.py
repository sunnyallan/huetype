from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""


class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime
