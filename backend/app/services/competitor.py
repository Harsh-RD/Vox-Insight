import re
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple

from sqlalchemy import and_, case, func, select
from sqlalchemy.orm import Session
from starlette import status

from app.core.exceptions import AppException, NotFoundException, PermissionDeniedException
from app.models.analysis_result import AnalysisResult
from app.models.competitor import Competitor
from app.models.competitor_mention import CompetitorMention
from app.models.dataset import Dataset
from app.models.feedback import Feedback
from app.schemas.competitor import CompetitorCreate, CompetitorUpdate
from app.services.dataset import get_dataset_for_user
from app.services.workspace import get_user_workspace_membership


def _ensure_workspace_access(db: Session, user_id: uuid.UUID, workspace_id: uuid.UUID) -> None:
    if not get_user_workspace_membership(db, user_id, workspace_id):
        raise PermissionDeniedException(message="You are not a member of this workspace")


def create_competitor(db: Session, user_id: uuid.UUID, payload: CompetitorCreate) -> Competitor:
    _ensure_workspace_access(db, user_id, payload.workspace_id)

    # Check case-insensitive duplicate name within workspace
    existing = db.scalar(
        select(Competitor).where(
            and_(
                Competitor.workspace_id == payload.workspace_id,
                func.lower(Competitor.name) == payload.name.lower(),
            )
        )
    )
    if existing:
        raise AppException(
            message=f"Competitor with name '{payload.name}' already exists in this workspace",
            code="DUPLICATE_COMPETITOR",
            status_code=status.HTTP_409_CONFLICT,
        )

    competitor = Competitor(
        workspace_id=payload.workspace_id,
        name=payload.name,
        aliases=payload.aliases,
        description=payload.description,
        active=payload.active,
    )
    db.add(competitor)
    db.commit()
    db.refresh(competitor)
    return competitor


def list_competitors(
    db: Session, user_id: uuid.UUID, workspace_id: uuid.UUID
) -> List[Competitor]:
    _ensure_workspace_access(db, user_id, workspace_id)
    return list(
        db.scalars(
            select(Competitor)
            .where(Competitor.workspace_id == workspace_id)
            .order_by(Competitor.created_at.asc())
        ).all()
    )


def get_competitor(db: Session, user_id: uuid.UUID, competitor_id: uuid.UUID) -> Competitor:
    competitor = db.scalar(select(Competitor).where(Competitor.id == competitor_id))
    if not competitor:
        raise NotFoundException(message="Competitor not found")
    _ensure_workspace_access(db, user_id, competitor.workspace_id)
    return competitor


def update_competitor(
    db: Session, user_id: uuid.UUID, competitor_id: uuid.UUID, payload: CompetitorUpdate
) -> Competitor:
    competitor = get_competitor(db, user_id, competitor_id)

    if payload.name is not None and payload.name.lower() != competitor.name.lower():
        existing = db.scalar(
            select(Competitor).where(
                and_(
                    Competitor.workspace_id == competitor.workspace_id,
                    Competitor.id != competitor.id,
                    func.lower(Competitor.name) == payload.name.lower(),
                )
            )
        )
        if existing:
            raise AppException(
                message=f"Competitor with name '{payload.name}' already exists in this workspace",
                code="DUPLICATE_COMPETITOR",
                status_code=status.HTTP_409_CONFLICT,
            )
        competitor.name = payload.name

    if payload.aliases is not None:
        competitor.aliases = payload.aliases
    if payload.description is not None:
        competitor.description = payload.description
    if payload.active is not None:
        competitor.active = payload.active

    db.commit()
    db.refresh(competitor)
    return competitor


def delete_competitor(db: Session, user_id: uuid.UUID, competitor_id: uuid.UUID) -> None:
    competitor = get_competitor(db, user_id, competitor_id)
    db.delete(competitor)
    db.commit()


# Matching and Analysis pipeline


def normalize_text_for_matching(text: str) -> str:
    """Normalize text with reasonable whitespace normalization."""
    return " ".join(text.split())


def match_competitors_in_text(
    text: str, active_competitors: List[Competitor]
) -> List[Tuple[Competitor, str]]:
    """
    Deterministic matching using regex word boundaries.
    Prevents false substring matches (e.g. 'comp' in 'company').
    Returns at most one mention per competitor for this feedback item.
    """
    normalized_text = normalize_text_for_matching(text)
    matches: List[Tuple[Competitor, str]] = []

    for comp in active_competitors:
        candidates = [comp.name] + (comp.aliases or [])
        matched_alias: Optional[str] = None
        for candidate in candidates:
            cand = candidate.strip()
            if not cand:
                continue
            pattern = rf"(?<!\w){re.escape(cand)}(?!\w)"
            if re.search(pattern, normalized_text, re.IGNORECASE):
                matched_alias = cand
                break
        if matched_alias:
            matches.append((comp, matched_alias))

    return matches


def analyze_dataset_competitors(
    db: Session, dataset_id: uuid.UUID, user_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Analyze all feedback in a dataset for mentions of active competitors.
    Idempotent: does not duplicate mentions on re-analysis.
    """
    dataset = get_dataset_for_user(db, dataset_id, user_id)
    workspace_id = dataset.workspace_id

    # Retrieve active competitors for this workspace
    active_competitors = list(
        db.scalars(
            select(Competitor).where(
                and_(Competitor.workspace_id == workspace_id, Competitor.active == True)  # noqa: E712
            )
        ).all()
    )

    # Count total feedback
    total_feedback = (
        db.scalar(
            select(func.count())
            .select_from(Feedback)
            .where(Feedback.dataset_id == dataset_id)
        )
        or 0
    )

    if not active_competitors or total_feedback == 0:
        return {
            "dataset_id": dataset_id,
            "scanned_feedback_count": total_feedback,
            "mentions_found": 0,
            "competitors_detected": 0,
        }

    # Fetch existing mention pairs for this dataset to avoid duplicate creation
    existing_mentions = db.execute(
        select(CompetitorMention.competitor_id, CompetitorMention.feedback_id)
        .join(Feedback, Feedback.id == CompetitorMention.feedback_id)
        .where(Feedback.dataset_id == dataset_id)
    ).all()
    existing_pairs: Set[Tuple[uuid.UUID, uuid.UUID]] = {
        (row[0], row[1]) for row in existing_mentions
    }

    scanned_count = 0
    mentions_found = 0
    detected_competitor_ids: Set[uuid.UUID] = set()

    # Stream feedback in batches
    batch_size = 250
    offset = 0

    while True:
        batch = list(
            db.scalars(
                select(Feedback)
                .where(Feedback.dataset_id == dataset_id)
                .order_by(Feedback.id.asc())
                .offset(offset)
                .limit(batch_size)
            ).all()
        )
        if not batch:
            break

        for item in batch:
            scanned_count += 1
            matches = match_competitors_in_text(item.original_text, active_competitors)
            for comp, alias in matches:
                pair = (comp.id, item.id)
                detected_competitor_ids.add(comp.id)
                if pair not in existing_pairs:
                    mention = CompetitorMention(
                        workspace_id=workspace_id,
                        competitor_id=comp.id,
                        feedback_id=item.id,
                        matched_alias=alias,
                    )
                    db.add(mention)
                    existing_pairs.add(pair)
                    mentions_found += 1

        db.commit()
        offset += batch_size

    return {
        "dataset_id": dataset_id,
        "scanned_feedback_count": scanned_count,
        "mentions_found": mentions_found,
        "competitors_detected": len(detected_competitor_ids),
    }


# SQL Aggregation Engine


def get_competitor_analytics(
    db: Session,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    dataset_id: Optional[uuid.UUID] = None,
    competitor_id: Optional[uuid.UUID] = None,
) -> List[Dict[str, Any]]:
    """
    Compute competitor analytics using SQL-only aggregation.
    Excludes NULL sentiment from sentiment percentages.
    Correctly computes coverage: non-null sentiment / total mentions.
    """
    _ensure_workspace_access(db, user_id, workspace_id)

    if dataset_id:
        ds = db.scalar(select(Dataset).where(Dataset.id == dataset_id))
        if not ds:
            raise NotFoundException(message="Dataset not found")
        if ds.workspace_id != workspace_id:
            raise PermissionDeniedException(message="Dataset does not belong to this workspace")

    if competitor_id:
        comp = db.scalar(select(Competitor).where(Competitor.id == competitor_id))
        if not comp:
            raise NotFoundException(message="Competitor not found")
        if comp.workspace_id != workspace_id:
            raise PermissionDeniedException(message="Competitor does not belong to this workspace")

    conditions = [Competitor.workspace_id == workspace_id]
    if competitor_id:
        conditions.append(Competitor.id == competitor_id)

    if dataset_id:
        query = (
            select(
                Competitor.id.label("competitor_id"),
                Competitor.name.label("competitor_name"),
                func.count(Feedback.id).label("total_mentions"),
                func.count(func.distinct(Feedback.id)).label("unique_feedback_count"),
                func.count(
                    case((and_(Feedback.id.is_not(None), AnalysisResult.sentiment_label == "positive"), 1))
                ).label("positive_mentions"),
                func.count(
                    case((and_(Feedback.id.is_not(None), AnalysisResult.sentiment_label == "neutral"), 1))
                ).label("neutral_mentions"),
                func.count(
                    case((and_(Feedback.id.is_not(None), AnalysisResult.sentiment_label == "negative"), 1))
                ).label("negative_mentions"),
                func.count(
                    case((and_(Feedback.id.is_not(None), AnalysisResult.sentiment_label.is_not(None)), 1))
                ).label("with_sentiment"),
            )
            .select_from(Competitor)
            .outerjoin(
                CompetitorMention,
                and_(
                    CompetitorMention.competitor_id == Competitor.id,
                    CompetitorMention.workspace_id == workspace_id,
                ),
            )
            .outerjoin(
                Feedback,
                and_(
                    Feedback.id == CompetitorMention.feedback_id,
                    Feedback.dataset_id == dataset_id,
                ),
            )
            .outerjoin(
                AnalysisResult,
                AnalysisResult.feedback_id == Feedback.id,
            )
            .where(and_(*conditions))
            .group_by(Competitor.id, Competitor.name)
            .order_by(func.count(Feedback.id).desc(), Competitor.name.asc())
        )
    else:
        query = (
            select(
                Competitor.id.label("competitor_id"),
                Competitor.name.label("competitor_name"),
                func.count(CompetitorMention.id).label("total_mentions"),
                func.count(func.distinct(CompetitorMention.feedback_id)).label("unique_feedback_count"),
                func.count(case((AnalysisResult.sentiment_label == "positive", 1))).label("positive_mentions"),
                func.count(case((AnalysisResult.sentiment_label == "neutral", 1))).label("neutral_mentions"),
                func.count(case((AnalysisResult.sentiment_label == "negative", 1))).label("negative_mentions"),
                func.count(case((AnalysisResult.sentiment_label.is_not(None), 1))).label("with_sentiment"),
            )
            .select_from(Competitor)
            .outerjoin(
                CompetitorMention,
                and_(
                    CompetitorMention.competitor_id == Competitor.id,
                    CompetitorMention.workspace_id == workspace_id,
                ),
            )
            .outerjoin(Feedback, Feedback.id == CompetitorMention.feedback_id)
            .outerjoin(AnalysisResult, AnalysisResult.feedback_id == Feedback.id)
            .where(and_(*conditions))
            .group_by(Competitor.id, Competitor.name)
            .order_by(func.count(CompetitorMention.id).desc(), Competitor.name.asc())
        )

    rows = db.execute(query).all()
    results: List[Dict[str, Any]] = []

    for row in rows:
        total_mentions = row.total_mentions or 0
        unique_feedback_count = row.unique_feedback_count or 0
        positive_mentions = row.positive_mentions or 0
        neutral_mentions = row.neutral_mentions or 0
        negative_mentions = row.negative_mentions or 0
        with_sentiment = row.with_sentiment or 0

        sentiment_coverage: Optional[float] = None
        positive_percentage: Optional[float] = None
        neutral_percentage: Optional[float] = None
        negative_percentage: Optional[float] = None

        if total_mentions > 0:
            sentiment_coverage = round((with_sentiment / total_mentions) * 100, 2)

        if with_sentiment > 0:
            positive_percentage = round((positive_mentions / with_sentiment) * 100, 2)
            neutral_percentage = round((neutral_mentions / with_sentiment) * 100, 2)
            negative_percentage = round((negative_mentions / with_sentiment) * 100, 2)

        results.append(
            {
                "competitor_id": row.competitor_id,
                "competitor_name": row.competitor_name,
                "total_mentions": total_mentions,
                "unique_feedback_count": unique_feedback_count,
                "positive_mentions": positive_mentions,
                "neutral_mentions": neutral_mentions,
                "negative_mentions": negative_mentions,
                "sentiment_coverage": sentiment_coverage,
                "positive_percentage": positive_percentage,
                "neutral_percentage": neutral_percentage,
                "negative_percentage": negative_percentage,
            }
        )

    return results
