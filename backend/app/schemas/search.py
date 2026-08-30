import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SemanticSearchRequest(BaseModel):
    workspace_id: uuid.UUID
    query: str = Field(..., min_length=1, max_length=5000)
    top_k: int = Field(default=10, ge=1, le=100)
    dataset_id: Optional[uuid.UUID] = None


class IndexStatusResponse(BaseModel):
    dataset_id: uuid.UUID
    workspace_id: uuid.UUID
    status: str
    indexed_count: int
    embedding_model: str
    embedding_dimension: int
    index_type: str
    last_indexed_at: Optional[datetime]
    error_message: Optional[str]
