import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class AlertMetric(str, Enum):
    NEGATIVE_SENTIMENT_PERCENTAGE = "negative_sentiment_percentage"
    COMPLAINT_RATE = "complaint_rate"
    ANALYSIS_COVERAGE_PERCENTAGE = "analysis_coverage_percentage"
    COMPETITOR_NEGATIVE_PERCENTAGE = "competitor_negative_percentage"
    COMPETITOR_MENTIONS = "competitor_mentions"


class AlertOperator(str, Enum):
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"


class AlertBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    alert_type: str = "threshold"
    metric: AlertMetric
    operator: AlertOperator
    threshold: float
    dataset_id: Optional[uuid.UUID] = None
    competitor_id: Optional[uuid.UUID] = None
    enabled: bool = True

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Alert name cannot be empty or whitespace only")
        return stripped


class AlertCreate(AlertBase):
    workspace_id: uuid.UUID


class AlertUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    metric: Optional[AlertMetric] = None
    operator: Optional[AlertOperator] = None
    threshold: Optional[float] = None
    dataset_id: Optional[uuid.UUID] = None
    competitor_id: Optional[uuid.UUID] = None
    enabled: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Alert name cannot be empty or whitespace only")
            return stripped
        return v


class AlertResponse(AlertBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertEvaluationItem(BaseModel):
    id: uuid.UUID
    name: str
    metric: str
    operator: str
    threshold: float
    current_value: Optional[float]
    triggered: bool
    dataset_id: Optional[uuid.UUID] = None
    competitor_id: Optional[uuid.UUID] = None


class AlertEvaluationResponse(BaseModel):
    alerts: List[AlertEvaluationItem]
