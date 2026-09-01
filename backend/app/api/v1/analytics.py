"""Analytics API endpoints."""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.analytics import (
    AspectAnalyticsResponse,
    ComplaintAnalyticsResponse,
    DatasetComparisonResponse,
    EmotionAnalyticsResponse,
    OverviewResponse,
    SentimentAnalyticsResponse,
    SourceComparisonResponse,
    TrendsResponse,
)
from app.services import analytics

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=OverviewResponse)
def get_overview(
    workspace_id: uuid.UUID = Query(..., description="Workspace ID"),
    dataset_id: Optional[uuid.UUID] = Query(None, description="Optional dataset ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get overview analytics metrics."""
    result = analytics.get_overview(db, current_user.id, workspace_id, dataset_id)
    return OverviewResponse(**result)


@router.get("/sentiment", response_model=SentimentAnalyticsResponse)
def get_sentiment(
    workspace_id: uuid.UUID = Query(..., description="Workspace ID"),
    dataset_id: Optional[uuid.UUID] = Query(None, description="Optional dataset ID"),
    start_date: Optional[datetime] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date (ISO format)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get sentiment analytics."""
    result = analytics.get_sentiment_analytics(
        db, current_user.id, workspace_id, dataset_id, start_date, end_date
    )
    return SentimentAnalyticsResponse(**result)


@router.get("/aspects", response_model=AspectAnalyticsResponse)
def get_aspects(
    workspace_id: uuid.UUID = Query(..., description="Workspace ID"),
    dataset_id: Optional[uuid.UUID] = Query(None, description="Optional dataset ID"),
    limit: int = Query(20, description="Maximum number of aspects"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get aspect analytics."""
    result = analytics.get_aspect_analytics(
        db, current_user.id, workspace_id, dataset_id, limit
    )
    return AspectAnalyticsResponse(**result)


@router.get("/emotions", response_model=EmotionAnalyticsResponse)
def get_emotions(
    workspace_id: uuid.UUID = Query(..., description="Workspace ID"),
    dataset_id: Optional[uuid.UUID] = Query(None, description="Optional dataset ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get emotion analytics."""
    result = analytics.get_emotion_analytics(
        db, current_user.id, workspace_id, dataset_id
    )
    return EmotionAnalyticsResponse(**result)


@router.get("/complaints", response_model=ComplaintAnalyticsResponse)
def get_complaints(
    workspace_id: uuid.UUID = Query(..., description="Workspace ID"),
    dataset_id: Optional[uuid.UUID] = Query(None, description="Optional dataset ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get complaint analytics."""
    result = analytics.get_complaint_analytics(
        db, current_user.id, workspace_id, dataset_id
    )
    return ComplaintAnalyticsResponse(**result)


@router.get("/trends", response_model=TrendsResponse)
def get_trends(
    workspace_id: uuid.UUID = Query(..., description="Workspace ID"),
    dataset_id: Optional[uuid.UUID] = Query(None, description="Optional dataset ID"),
    start_date: Optional[datetime] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date (ISO format)"),
    granularity: str = Query("daily", description="Granularity: daily, weekly, or monthly"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get sentiment trends over time."""
    result = analytics.get_trends(
        db, current_user.id, workspace_id, dataset_id, start_date, end_date, granularity
    )
    return TrendsResponse(**result)


@router.get("/datasets", response_model=DatasetComparisonResponse)
def get_dataset_comparison(
    workspace_id: uuid.UUID = Query(..., description="Workspace ID"),
    dataset_ids: Optional[str] = Query(None, description="Comma-separated dataset IDs (optional)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Compare analytics metrics across datasets."""
    dataset_id_list = None
    if dataset_ids:
        try:
            dataset_id_list = [uuid.UUID(did.strip()) for did in dataset_ids.split(",")]
        except ValueError:
            raise ValueError("Invalid dataset IDs")
    
    result = analytics.get_dataset_comparison(
        db, current_user.id, workspace_id, dataset_id_list
    )
    return DatasetComparisonResponse(**result)


@router.get("/sources", response_model=SourceComparisonResponse)
def get_source_comparison(
    workspace_id: uuid.UUID = Query(..., description="Workspace ID"),
    dataset_id: Optional[uuid.UUID] = Query(None, description="Optional dataset ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get analytics by feedback source."""
    result = analytics.get_source_comparison(
        db, current_user.id, workspace_id, dataset_id
    )
    return SourceComparisonResponse(**result)
