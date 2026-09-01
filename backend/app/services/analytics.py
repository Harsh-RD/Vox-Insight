"""
Analytics service for VoxInsight.
Provides workspace-scoped analytics metrics computed from persisted structured data.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, PermissionDeniedException
from app.models.analysis_result import AnalysisResult
from app.models.aspect_analysis import AspectAnalysis
from app.models.dataset import Dataset
from app.models.feedback import Feedback
from app.services.dataset import get_dataset_for_user
from app.services.workspace import get_user_workspace_membership


def _ensure_workspace_access(db: Session, user_id: uuid.UUID, workspace_id: uuid.UUID) -> None:
    """Verify user has access to workspace."""
    if not get_user_workspace_membership(db, user_id, workspace_id):
        raise PermissionDeniedException(message="You are not a member of this workspace")


def _ensure_dataset_in_workspace(db: Session, dataset_id: uuid.UUID, workspace_id: uuid.UUID) -> Dataset:
    """Verify dataset belongs to workspace."""
    dataset = db.scalar(select(Dataset).where(Dataset.id == dataset_id))
    if not dataset:
        raise NotFoundException(message="Dataset not found")
    if dataset.workspace_id != workspace_id:
        raise PermissionDeniedException(message="Dataset does not belong to this workspace")
    return dataset


def get_overview(
    db: Session,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    dataset_id: Optional[uuid.UUID] = None,
) -> Dict[str, Any]:
    """
    Get overview metrics for a workspace or specific dataset.
    
    Metrics:
    - total_feedback: Total number of feedback records
    - analyzed_feedback: Number of completed analyses
    - pending_feedback: Number of pending feedback records
    - failed_feedback: Number of failed feedback records
    - analysis_coverage_percentage: Analyzed / Total (0-100, or null if no feedback)
    - average_rating: Average of non-null ratings
    - complaint_count: Count of complaints (complaint_label=true)
    - complaint_rate: Complaints / Known labels (excludes NULLs)
    - positive_count: Count of positive sentiments
    - neutral_count: Count of neutral sentiments
    - negative_count: Count of negative sentiments
    """
    _ensure_workspace_access(db, user_id, workspace_id)
    
    # Build base query
    feedback_query = select(Feedback).where(Feedback.workspace_id == workspace_id)
    if dataset_id:
        _ensure_dataset_in_workspace(db, dataset_id, workspace_id)
        feedback_query = feedback_query.where(Feedback.dataset_id == dataset_id)
    
    # Total feedback count
    total_count = db.scalar(
        select(func.count()).select_from(Feedback).where(Feedback.workspace_id == workspace_id)
    ) or 0
    if dataset_id:
        total_count = db.scalar(
            select(func.count()).select_from(Feedback).where(
                and_(Feedback.workspace_id == workspace_id, Feedback.dataset_id == dataset_id)
            )
        ) or 0
    
    # Analyzed feedback (with completed analysis)
    analyzed_count = db.scalar(
        select(func.count()).select_from(AnalysisResult).where(
            and_(
                AnalysisResult.workspace_id == workspace_id,
                AnalysisResult.status == "completed",
            )
        )
    ) or 0
    if dataset_id:
        analyzed_count = db.scalar(
            select(func.count()).select_from(AnalysisResult).join(
                Feedback, Feedback.id == AnalysisResult.feedback_id
            ).where(
                and_(
                    AnalysisResult.workspace_id == workspace_id,
                    Feedback.dataset_id == dataset_id,
                    AnalysisResult.status == "completed",
                )
            )
        ) or 0
    
    # Pending and failed feedback
    pending_count = db.scalar(
        select(func.count()).select_from(Feedback).where(
            and_(Feedback.workspace_id == workspace_id, Feedback.processing_status == "pending")
        )
    ) or 0
    if dataset_id:
        pending_count = db.scalar(
            select(func.count()).select_from(Feedback).where(
                and_(
                    Feedback.workspace_id == workspace_id,
                    Feedback.dataset_id == dataset_id,
                    Feedback.processing_status == "pending",
                )
            )
        ) or 0
    
    failed_count = db.scalar(
        select(func.count()).select_from(Feedback).where(
            and_(Feedback.workspace_id == workspace_id, Feedback.processing_status == "failed")
        )
    ) or 0
    if dataset_id:
        failed_count = db.scalar(
            select(func.count()).select_from(Feedback).where(
                and_(
                    Feedback.workspace_id == workspace_id,
                    Feedback.dataset_id == dataset_id,
                    Feedback.processing_status == "failed",
                )
            )
        ) or 0
    
    # Analysis coverage
    analysis_coverage = None
    if total_count > 0:
        analysis_coverage = round((analyzed_count / total_count) * 100, 2)
    
    # Average rating
    avg_rating = db.scalar(
        select(func.avg(Feedback.rating)).where(
            and_(Feedback.workspace_id == workspace_id, Feedback.rating.is_not(None))
        )
    )
    if dataset_id:
        avg_rating = db.scalar(
            select(func.avg(Feedback.rating)).where(
                and_(
                    Feedback.workspace_id == workspace_id,
                    Feedback.dataset_id == dataset_id,
                    Feedback.rating.is_not(None),
                )
            )
        )
    if avg_rating is not None:
        avg_rating = round(float(avg_rating), 2)
    
    # Sentiment counts
    sentiment_query = select(AnalysisResult).where(
        and_(
            AnalysisResult.workspace_id == workspace_id,
            AnalysisResult.status == "completed",
            AnalysisResult.sentiment_label.is_not(None),
        )
    )
    if dataset_id:
        sentiment_query = sentiment_query.join(
            Feedback, Feedback.id == AnalysisResult.feedback_id
        ).where(
            and_(
                AnalysisResult.workspace_id == workspace_id,
                Feedback.dataset_id == dataset_id,
                AnalysisResult.status == "completed",
                AnalysisResult.sentiment_label.is_not(None),
            )
        )
    
    positive_count = db.scalar(
        select(func.count()).select_from(AnalysisResult).where(
            and_(
                AnalysisResult.workspace_id == workspace_id,
                AnalysisResult.status == "completed",
                AnalysisResult.sentiment_label == "positive",
            )
        )
    ) or 0
    if dataset_id:
        positive_count = db.scalar(
            select(func.count()).select_from(AnalysisResult).join(
                Feedback, Feedback.id == AnalysisResult.feedback_id
            ).where(
                and_(
                    AnalysisResult.workspace_id == workspace_id,
                    Feedback.dataset_id == dataset_id,
                    AnalysisResult.status == "completed",
                    AnalysisResult.sentiment_label == "positive",
                )
            )
        ) or 0
    
    neutral_count = db.scalar(
        select(func.count()).select_from(AnalysisResult).where(
            and_(
                AnalysisResult.workspace_id == workspace_id,
                AnalysisResult.status == "completed",
                AnalysisResult.sentiment_label == "neutral",
            )
        )
    ) or 0
    if dataset_id:
        neutral_count = db.scalar(
            select(func.count()).select_from(AnalysisResult).join(
                Feedback, Feedback.id == AnalysisResult.feedback_id
            ).where(
                and_(
                    AnalysisResult.workspace_id == workspace_id,
                    Feedback.dataset_id == dataset_id,
                    AnalysisResult.status == "completed",
                    AnalysisResult.sentiment_label == "neutral",
                )
            )
        ) or 0
    
    negative_count = db.scalar(
        select(func.count()).select_from(AnalysisResult).where(
            and_(
                AnalysisResult.workspace_id == workspace_id,
                AnalysisResult.status == "completed",
                AnalysisResult.sentiment_label == "negative",
            )
        )
    ) or 0
    if dataset_id:
        negative_count = db.scalar(
            select(func.count()).select_from(AnalysisResult).join(
                Feedback, Feedback.id == AnalysisResult.feedback_id
            ).where(
                and_(
                    AnalysisResult.workspace_id == workspace_id,
                    Feedback.dataset_id == dataset_id,
                    AnalysisResult.status == "completed",
                    AnalysisResult.sentiment_label == "negative",
                )
            )
        ) or 0
    
    # Complaint metrics
    complaint_count = db.scalar(
        select(func.count()).select_from(AnalysisResult).where(
            and_(
                AnalysisResult.workspace_id == workspace_id,
                AnalysisResult.status == "completed",
                AnalysisResult.complaint_label.is_(True),
            )
        )
    ) or 0
    if dataset_id:
        complaint_count = db.scalar(
            select(func.count()).select_from(AnalysisResult).join(
                Feedback, Feedback.id == AnalysisResult.feedback_id
            ).where(
                and_(
                    AnalysisResult.workspace_id == workspace_id,
                    Feedback.dataset_id == dataset_id,
                    AnalysisResult.status == "completed",
                    AnalysisResult.complaint_label.is_(True),
                )
            )
        ) or 0
    
    # Complaint rate (known labels only)
    known_complaint_labels = db.scalar(
        select(func.count()).select_from(AnalysisResult).where(
            and_(
                AnalysisResult.workspace_id == workspace_id,
                AnalysisResult.status == "completed",
                AnalysisResult.complaint_label.is_not(None),
            )
        )
    ) or 0
    if dataset_id:
        known_complaint_labels = db.scalar(
            select(func.count()).select_from(AnalysisResult).join(
                Feedback, Feedback.id == AnalysisResult.feedback_id
            ).where(
                and_(
                    AnalysisResult.workspace_id == workspace_id,
                    Feedback.dataset_id == dataset_id,
                    AnalysisResult.status == "completed",
                    AnalysisResult.complaint_label.is_not(None),
                )
            )
        ) or 0
    
    complaint_rate = None
    if known_complaint_labels > 0:
        complaint_rate = round((complaint_count / known_complaint_labels) * 100, 2)
    
    return {
        "total_feedback": total_count,
        "analyzed_feedback": analyzed_count,
        "pending_feedback": pending_count,
        "failed_feedback": failed_count,
        "analysis_coverage_percentage": analysis_coverage,
        "average_rating": avg_rating,
        "complaint_count": complaint_count,
        "complaint_rate": complaint_rate,
        "positive_count": positive_count,
        "neutral_count": neutral_count,
        "negative_count": negative_count,
    }


def get_sentiment_analytics(
    db: Session,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    dataset_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Get sentiment analytics: distribution, percentages, trends."""
    _ensure_workspace_access(db, user_id, workspace_id)
    
    if dataset_id:
        _ensure_dataset_in_workspace(db, dataset_id, workspace_id)
    
    # Base condition
    conditions = [
        AnalysisResult.workspace_id == workspace_id,
        AnalysisResult.status == "completed",
        AnalysisResult.sentiment_label.is_not(None),
    ]
    
    if dataset_id:
        conditions.append(Feedback.dataset_id == dataset_id)
    
    if start_date or end_date:
        if start_date:
            conditions.append(Feedback.feedback_timestamp >= start_date)
        if end_date:
            conditions.append(Feedback.feedback_timestamp <= end_date)
    
    # Count by sentiment
    query = select(AnalysisResult.sentiment_label, func.count().label("count")).where(
        and_(*conditions)
    ).group_by(AnalysisResult.sentiment_label)
    
    if dataset_id or start_date or end_date:
        query = query.join(Feedback, Feedback.id == AnalysisResult.feedback_id)
    
    results = db.execute(query).all()
    sentiment_counts = {
        "positive": 0,
        "neutral": 0,
        "negative": 0,
    }
    
    for sentiment, count in results:
        if sentiment in sentiment_counts:
            sentiment_counts[sentiment] = count
    
    total_with_sentiment = sum(sentiment_counts.values())
    
    sentiment_percentages = {
        "positive": None,
        "neutral": None,
        "negative": None,
    }
    
    if total_with_sentiment > 0:
        for key in sentiment_percentages:
            sentiment_percentages[key] = round(
                (sentiment_counts[key] / total_with_sentiment) * 100, 2
            )
    
    # Average confidence
    avg_confidence_query = select(
        AnalysisResult.sentiment_label,
        func.avg(AnalysisResult.sentiment_score).label("avg_confidence"),
    ).where(
        and_(*conditions)
    ).group_by(AnalysisResult.sentiment_label)
    
    if dataset_id or start_date or end_date:
        avg_confidence_query = avg_confidence_query.join(
            Feedback, Feedback.id == AnalysisResult.feedback_id
        )
    
    confidence_results = db.execute(avg_confidence_query).all()
    avg_confidence = {}
    for sentiment, conf in confidence_results:
        if sentiment and conf is not None:
            avg_confidence[sentiment] = round(float(conf), 2)
    
    return {
        "sentiment_distribution": sentiment_counts,
        "sentiment_percentages": sentiment_percentages,
        "average_sentiment_confidence": avg_confidence,
        "total_with_sentiment": total_with_sentiment,
    }


def get_aspect_analytics(
    db: Session,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    dataset_id: Optional[uuid.UUID] = None,
    limit: int = 20,
) -> Dict[str, Any]:
    """Get aspect analytics: top aspects, sentiment distribution per aspect."""
    _ensure_workspace_access(db, user_id, workspace_id)
    
    if dataset_id:
        _ensure_dataset_in_workspace(db, dataset_id, workspace_id)
    
    # Get top aspects by frequency
    conditions = [AnalysisResult.workspace_id == workspace_id]
    
    if dataset_id:
        conditions.append(Feedback.dataset_id == dataset_id)
    
    query = select(
        AspectAnalysis.aspect_term,
        func.count().label("frequency"),
        func.avg(AspectAnalysis.confidence).label("avg_confidence"),
    ).join(
        AnalysisResult, AnalysisResult.id == AspectAnalysis.analysis_result_id
    ).where(and_(*conditions))
    
    if dataset_id:
        query = query.join(Feedback, Feedback.id == AnalysisResult.feedback_id)
    
    query = query.group_by(AspectAnalysis.aspect_term).order_by(
        func.count().desc()
    ).limit(limit)
    
    aspect_frequency = db.execute(query).all()
    
    aspects = []
    for aspect_term, frequency, avg_conf in aspect_frequency:
        # Get sentiment distribution for this aspect
        sentiment_query = select(
            AspectAnalysis.sentiment_label, func.count().label("count")
        ).join(
            AnalysisResult, AnalysisResult.id == AspectAnalysis.analysis_result_id
        ).where(
            and_(
                AnalysisResult.workspace_id == workspace_id,
                AspectAnalysis.aspect_term == aspect_term,
            )
        )
        
        if dataset_id:
            sentiment_query = sentiment_query.join(
                Feedback, Feedback.id == AnalysisResult.feedback_id
            ).where(Feedback.dataset_id == dataset_id)
        
        sentiment_query = sentiment_query.group_by(AspectAnalysis.sentiment_label)
        
        sentiment_results = db.execute(sentiment_query).all()
        sentiment_dist = {"positive": 0, "neutral": 0, "negative": 0}
        
        for sentiment, count in sentiment_results:
            if sentiment in sentiment_dist:
                sentiment_dist[sentiment] = count
        
        aspects.append({
            "aspect_term": aspect_term,
            "mentions": frequency,
            "average_confidence": round(float(avg_conf), 2) if avg_conf else None,
            "sentiment_distribution": sentiment_dist,
        })
    
    return {"top_aspects": aspects}


def get_emotion_analytics(
    db: Session,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    dataset_id: Optional[uuid.UUID] = None,
) -> Dict[str, Any]:
    """Get emotion analytics: distribution, coverage, percentages."""
    _ensure_workspace_access(db, user_id, workspace_id)
    
    if dataset_id:
        _ensure_dataset_in_workspace(db, dataset_id, workspace_id)
    
    # Count total analyses
    total_analyses = db.scalar(
        select(func.count()).select_from(AnalysisResult).where(
            and_(
                AnalysisResult.workspace_id == workspace_id,
                AnalysisResult.status == "completed",
            )
        )
    ) or 0
    
    if dataset_id:
        total_analyses = db.scalar(
            select(func.count()).select_from(AnalysisResult).join(
                Feedback, Feedback.id == AnalysisResult.feedback_id
            ).where(
                and_(
                    AnalysisResult.workspace_id == workspace_id,
                    Feedback.dataset_id == dataset_id,
                    AnalysisResult.status == "completed",
                )
            )
        ) or 0
    
    # Count by emotion
    conditions = [
        AnalysisResult.workspace_id == workspace_id,
        AnalysisResult.status == "completed",
        AnalysisResult.emotion_label.is_not(None),
    ]
    
    query = select(AnalysisResult.emotion_label, func.count().label("count")).where(
        and_(*conditions)
    ).group_by(AnalysisResult.emotion_label)
    
    if dataset_id:
        query = query.join(Feedback, Feedback.id == AnalysisResult.feedback_id).where(
            Feedback.dataset_id == dataset_id
        )
    
    results = db.execute(query).all()
    emotion_distribution = {}
    total_with_emotion = 0
    
    for emotion, count in results:
        if emotion:
            emotion_distribution[emotion] = count
            total_with_emotion += count
    
    # Calculate percentages
    emotion_percentages = {}
    if total_with_emotion > 0:
        for emotion, count in emotion_distribution.items():
            emotion_percentages[emotion] = round(
                (count / total_with_emotion) * 100, 2
            )
    
    # Calculate coverage
    emotion_coverage = None
    if total_analyses > 0:
        emotion_coverage = round((total_with_emotion / total_analyses) * 100, 2)
    
    return {
        "emotion_distribution": emotion_distribution,
        "emotion_percentages": emotion_percentages,
        "emotion_coverage_percentage": emotion_coverage,
        "total_with_emotion": total_with_emotion,
        "total_analyses": total_analyses,
    }


def get_complaint_analytics(
    db: Session,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    dataset_id: Optional[uuid.UUID] = None,
) -> Dict[str, Any]:
    """Get complaint analytics: rate, coverage, breakdown by source."""
    _ensure_workspace_access(db, user_id, workspace_id)
    
    if dataset_id:
        _ensure_dataset_in_workspace(db, dataset_id, workspace_id)
    
    # Count complaints and non-complaints
    conditions = [
        AnalysisResult.workspace_id == workspace_id,
        AnalysisResult.status == "completed",
    ]
    
    base_query_cond = and_(*conditions)
    
    complaint_true = db.scalar(
        select(func.count()).select_from(AnalysisResult).where(
            and_(base_query_cond, AnalysisResult.complaint_label.is_(True))
        )
    ) or 0
    
    complaint_false = db.scalar(
        select(func.count()).select_from(AnalysisResult).where(
            and_(base_query_cond, AnalysisResult.complaint_label.is_(False))
        )
    ) or 0
    
    complaint_unknown = db.scalar(
        select(func.count()).select_from(AnalysisResult).where(
            and_(base_query_cond, AnalysisResult.complaint_label.is_(None))
        )
    ) or 0
    
    if dataset_id:
        complaint_true = db.scalar(
            select(func.count()).select_from(AnalysisResult).join(
                Feedback, Feedback.id == AnalysisResult.feedback_id
            ).where(
                and_(
                    base_query_cond,
                    Feedback.dataset_id == dataset_id,
                    AnalysisResult.complaint_label.is_(True),
                )
            )
        ) or 0
        
        complaint_false = db.scalar(
            select(func.count()).select_from(AnalysisResult).join(
                Feedback, Feedback.id == AnalysisResult.feedback_id
            ).where(
                and_(
                    base_query_cond,
                    Feedback.dataset_id == dataset_id,
                    AnalysisResult.complaint_label.is_(False),
                )
            )
        ) or 0
        
        complaint_unknown = db.scalar(
            select(func.count()).select_from(AnalysisResult).join(
                Feedback, Feedback.id == AnalysisResult.feedback_id
            ).where(
                and_(
                    base_query_cond,
                    Feedback.dataset_id == dataset_id,
                    AnalysisResult.complaint_label.is_(None),
                )
            )
        ) or 0
    
    # Complaint rate
    known_labels = complaint_true + complaint_false
    complaint_rate = None
    if known_labels > 0:
        complaint_rate = round((complaint_true / known_labels) * 100, 2)
    
    # Complaint coverage
    total_analyzed = complaint_true + complaint_false + complaint_unknown
    complaint_coverage = None
    if total_analyzed > 0:
        complaint_coverage = round((known_labels / total_analyzed) * 100, 2)
    
    return {
        "complaint_true": complaint_true,
        "complaint_false": complaint_false,
        "complaint_unknown": complaint_unknown,
        "complaint_rate": complaint_rate,
        "complaint_coverage_percentage": complaint_coverage,
    }


def get_trends(
    db: Session,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    dataset_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    granularity: str = "daily",
) -> Dict[str, Any]:
    """Get sentiment trends over time."""
    _ensure_workspace_access(db, user_id, workspace_id)
    
    if dataset_id:
        _ensure_dataset_in_workspace(db, dataset_id, workspace_id)
    
    # Determine date range
    if not start_date and not end_date:
        # Default to last 30 days
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=30)
    elif start_date and not end_date:
        end_date = datetime.now(timezone.utc)
    elif end_date and not start_date:
        start_date = end_date - timedelta(days=30)
    
    # Build conditions
    conditions = [
        AnalysisResult.workspace_id == workspace_id,
        AnalysisResult.status == "completed",
        Feedback.feedback_timestamp.is_not(None),
    ]
    
    if start_date:
        conditions.append(Feedback.feedback_timestamp >= start_date)
    if end_date:
        conditions.append(Feedback.feedback_timestamp <= end_date)
    
    if dataset_id:
        conditions.append(Feedback.dataset_id == dataset_id)
    
    # Determine grouping function based on granularity (SQLite-compatible)
    if granularity == "weekly":
        # Group by week (using date arithmetic)
        date_func = func.strftime("%Y-%W", Feedback.feedback_timestamp)
    elif granularity == "monthly":
        # Group by month
        date_func = func.strftime("%Y-%m", Feedback.feedback_timestamp)
    else:  # daily (default)
        # Group by day
        date_func = func.strftime("%Y-%m-%d", Feedback.feedback_timestamp)
    
    # Query trends by date and sentiment
    query = select(
        date_func.label("date"),
        AnalysisResult.sentiment_label,
        func.count().label("count"),
    ).join(
        Feedback, Feedback.id == AnalysisResult.feedback_id
    ).where(
        and_(*conditions)
    ).group_by(
        date_func, AnalysisResult.sentiment_label
    ).order_by(
        date_func
    )
    
    results = db.execute(query).all()
    
    # Organize by date
    trends_by_date = {}
    for date_val, sentiment, count in results:
        if date_val is None:
            continue
        date_str = date_val if isinstance(date_val, str) else str(date_val)
        if date_str not in trends_by_date:
            trends_by_date[date_str] = {
                "date": date_str,
                "positive": 0,
                "neutral": 0,
                "negative": 0,
                "unknown": 0,
                "total": 0,
            }
        
        if sentiment in ["positive", "neutral", "negative"]:
            trends_by_date[date_str][sentiment] = count
        else:
            trends_by_date[date_str]["unknown"] = count
        
        trends_by_date[date_str]["total"] += count
    
    return {
        "trends": list(trends_by_date.values()),
        "granularity": granularity,
    }


def get_dataset_comparison(
    db: Session,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    dataset_ids: Optional[List[uuid.UUID]] = None,
) -> Dict[str, Any]:
    """Compare analytics metrics across multiple datasets in same workspace."""
    _ensure_workspace_access(db, user_id, workspace_id)
    
    # Get all datasets in workspace if not specified
    if not dataset_ids:
        datasets = db.scalars(
            select(Dataset).where(Dataset.workspace_id == workspace_id)
        ).all()
        dataset_ids = [d.id for d in datasets]
    else:
        # Validate all datasets belong to workspace
        for did in dataset_ids:
            _ensure_dataset_in_workspace(db, did, workspace_id)
    
    comparisons = []
    for did in dataset_ids:
        overview = get_overview(db, user_id, workspace_id, dataset_id=did)
        
        # Get dataset name
        dataset = db.scalar(select(Dataset).where(Dataset.id == did))
        dataset_name = dataset.name if dataset else "Unknown"
        
        comparisons.append({
            "dataset_id": str(did),
            "dataset_name": dataset_name,
            **overview,
        })
    
    return {"datasets": comparisons}


def get_source_comparison(
    db: Session,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    dataset_id: Optional[uuid.UUID] = None,
) -> Dict[str, Any]:
    """Compare metrics by feedback source."""
    _ensure_workspace_access(db, user_id, workspace_id)
    
    if dataset_id:
        _ensure_dataset_in_workspace(db, dataset_id, workspace_id)
    
    # Get distinct sources
    conditions = [Feedback.workspace_id == workspace_id, Feedback.source.is_not(None)]
    
    if dataset_id:
        conditions.append(Feedback.dataset_id == dataset_id)
    
    sources = db.scalars(
        select(Feedback.source).where(and_(*conditions)).distinct().order_by(Feedback.source)
    ).all()
    
    sources_data = []
    for source in sources:
        if not source:
            continue
        
        # Count feedback by source
        feedback_count = db.scalar(
            select(func.count()).select_from(Feedback).where(
                and_(
                    Feedback.workspace_id == workspace_id,
                    Feedback.source == source,
                )
            )
        ) or 0
        
        if dataset_id:
            feedback_count = db.scalar(
                select(func.count()).select_from(Feedback).where(
                    and_(
                        Feedback.workspace_id == workspace_id,
                        Feedback.dataset_id == dataset_id,
                        Feedback.source == source,
                    )
                )
            ) or 0
        
        # Get sentiment distribution for source
        sentiment_conditions = [
            AnalysisResult.workspace_id == workspace_id,
            AnalysisResult.status == "completed",
            Feedback.source == source,
        ]
        
        if dataset_id:
            sentiment_conditions.append(Feedback.dataset_id == dataset_id)
        
        sentiment_query = select(
            AnalysisResult.sentiment_label, func.count().label("count")
        ).join(
            Feedback, Feedback.id == AnalysisResult.feedback_id
        ).where(
            and_(*sentiment_conditions)
        ).group_by(AnalysisResult.sentiment_label)
        
        sentiment_results = db.execute(sentiment_query).all()
        sentiment_dist = {"positive": 0, "neutral": 0, "negative": 0}
        
        for sentiment, count in sentiment_results:
            if sentiment in sentiment_dist:
                sentiment_dist[sentiment] = count
        
        # Get complaint rate for source
        complaint_conditions = [
            AnalysisResult.workspace_id == workspace_id,
            AnalysisResult.status == "completed",
            Feedback.source == source,
        ]
        
        if dataset_id:
            complaint_conditions.append(Feedback.dataset_id == dataset_id)
        
        complaint_true = db.scalar(
            select(func.count()).select_from(AnalysisResult).join(
                Feedback, Feedback.id == AnalysisResult.feedback_id
            ).where(and_(and_(*complaint_conditions), AnalysisResult.complaint_label.is_(True)))
        ) or 0
        
        complaint_known = db.scalar(
            select(func.count()).select_from(AnalysisResult).join(
                Feedback, Feedback.id == AnalysisResult.feedback_id
            ).where(
                and_(and_(*complaint_conditions), AnalysisResult.complaint_label.is_not(None))
            )
        ) or 0
        
        complaint_rate = None
        if complaint_known > 0:
            complaint_rate = round((complaint_true / complaint_known) * 100, 2)
        
        sources_data.append({
            "source": source,
            "feedback_count": feedback_count,
            "sentiment_distribution": sentiment_dist,
            "complaint_rate": complaint_rate,
        })
    
    return {"sources": sources_data}
