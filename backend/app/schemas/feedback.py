import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class FeedbackResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    dataset_id: uuid.UUID
    original_text: str
    rating: Optional[float]
    source: Optional[str]
    timestamp: Optional[datetime]
    language: Optional[str]
    processing_status: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
