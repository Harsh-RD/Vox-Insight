import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ConversationCreate(BaseModel):
    workspace_id: uuid.UUID
    title: str | None = Field(default=None, max_length=255)


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    dataset_id: uuid.UUID | None = None


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
