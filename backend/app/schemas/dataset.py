import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class DatasetCreate(BaseModel):
    workspace_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=5000)
    source: Optional[str] = Field(default=None, max_length=255)


class DatasetResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: Optional[str]
    source: Optional[str]
    original_filename: Optional[str]
    row_count: int
    status: str
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UploadSummary(BaseModel):
    dataset: DatasetResponse
    rows_read: int
    rows_imported: int
    rows_skipped: int
    invalid_rows: list[dict[str, str | int]]
