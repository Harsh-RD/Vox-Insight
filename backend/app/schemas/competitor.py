import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class CompetitorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    aliases: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    active: bool = True

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Competitor name cannot be empty or whitespace only")
        return stripped

    @field_validator("aliases")
    @classmethod
    def validate_aliases(cls, v: List[str]) -> List[str]:
        cleaned = []
        for alias in v:
            stripped = alias.strip()
            if stripped and stripped not in cleaned:
                cleaned.append(stripped)
        return cleaned


class CompetitorCreate(CompetitorBase):
    workspace_id: uuid.UUID


class CompetitorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    aliases: Optional[List[str]] = None
    description: Optional[str] = None
    active: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Competitor name cannot be empty or whitespace only")
            return stripped
        return v

    @field_validator("aliases")
    @classmethod
    def validate_aliases(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            cleaned = []
            for alias in v:
                stripped = alias.strip()
                if stripped and stripped not in cleaned:
                    cleaned.append(stripped)
            return cleaned
        return v


class CompetitorResponse(CompetitorBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CompetitorAnalysisResult(BaseModel):
    competitor_id: uuid.UUID
    competitor_name: str
    total_mentions: int
    unique_feedback_count: int
    positive_mentions: int
    neutral_mentions: int
    negative_mentions: int
    sentiment_coverage: Optional[float]
    positive_percentage: Optional[float]
    neutral_percentage: Optional[float]
    negative_percentage: Optional[float]


class DatasetCompetitorAnalysisResponse(BaseModel):
    dataset_id: uuid.UUID
    scanned_feedback_count: int
    mentions_found: int
    competitors_detected: int
