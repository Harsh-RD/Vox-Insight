import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, json_schema_extra={"example": "Marketing Team"})


class WorkspaceResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    owner_id: uuid.UUID
    role: str = "owner"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
