import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, PermissionDeniedException
from app.models.alert import Alert
from app.models.competitor import Competitor
from app.models.dataset import Dataset
from app.schemas.alert import AlertCreate, AlertMetric, AlertOperator, AlertUpdate
from app.services import analytics as analytics_service
from app.services import competitor as competitor_service
from app.services.workspace import get_user_workspace_membership


def _ensure_workspace_access(db: Session, user_id: uuid.UUID, workspace_id: uuid.UUID) -> None:
    if not get_user_workspace_membership(db, user_id, workspace_id):
        raise PermissionDeniedException(message="You are not a member of this workspace")


def _validate_references(
    db: Session,
    workspace_id: uuid.UUID,
    dataset_id: Optional[uuid.UUID] = None,
    competitor_id: Optional[uuid.UUID] = None,
) -> None:
    if dataset_id:
        ds = db.scalar(select(Dataset).where(Dataset.id == dataset_id))
        if not ds:
            raise NotFoundException(message="Referenced dataset not found")
        if ds.workspace_id != workspace_id:
            raise PermissionDeniedException(
                message="Referenced dataset does not belong to this workspace"
            )

    if competitor_id:
        comp = db.scalar(select(Competitor).where(Competitor.id == competitor_id))
        if not comp:
            raise NotFoundException(message="Referenced competitor not found")
        if comp.workspace_id != workspace_id:
            raise PermissionDeniedException(
                message="Referenced competitor does not belong to this workspace"
            )


def create_alert(db: Session, user_id: uuid.UUID, payload: AlertCreate) -> Alert:
    _ensure_workspace_access(db, user_id, payload.workspace_id)
    _validate_references(
        db,
        payload.workspace_id,
        dataset_id=payload.dataset_id,
        competitor_id=payload.competitor_id,
    )

    alert = Alert(
        workspace_id=payload.workspace_id,
        name=payload.name,
        alert_type=payload.alert_type,
        metric=payload.metric.value if isinstance(payload.metric, AlertMetric) else payload.metric,
        operator=payload.operator.value if isinstance(payload.operator, AlertOperator) else payload.operator,
        threshold=payload.threshold,
        dataset_id=payload.dataset_id,
        competitor_id=payload.competitor_id,
        enabled=payload.enabled,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def list_alerts(db: Session, user_id: uuid.UUID, workspace_id: uuid.UUID) -> List[Alert]:
    _ensure_workspace_access(db, user_id, workspace_id)
    return list(
        db.scalars(
            select(Alert)
            .where(Alert.workspace_id == workspace_id)
            .order_by(Alert.created_at.asc())
        ).all()
    )


def get_alert(db: Session, user_id: uuid.UUID, alert_id: uuid.UUID) -> Alert:
    alert = db.scalar(select(Alert).where(Alert.id == alert_id))
    if not alert:
        raise NotFoundException(message="Alert not found")
    _ensure_workspace_access(db, user_id, alert.workspace_id)
    return alert


def update_alert(
    db: Session, user_id: uuid.UUID, alert_id: uuid.UUID, payload: AlertUpdate
) -> Alert:
    alert = get_alert(db, user_id, alert_id)

    target_dataset_id = payload.dataset_id if payload.dataset_id is not None else alert.dataset_id
    target_competitor_id = payload.competitor_id if payload.competitor_id is not None else alert.competitor_id

    _validate_references(
        db,
        alert.workspace_id,
        dataset_id=target_dataset_id,
        competitor_id=target_competitor_id,
    )

    if payload.name is not None:
        alert.name = payload.name
    if payload.metric is not None:
        alert.metric = payload.metric.value if isinstance(payload.metric, AlertMetric) else payload.metric
    if payload.operator is not None:
        alert.operator = payload.operator.value if isinstance(payload.operator, AlertOperator) else payload.operator
    if payload.threshold is not None:
        alert.threshold = payload.threshold
    if payload.dataset_id is not None:
        alert.dataset_id = payload.dataset_id
    if payload.competitor_id is not None:
        alert.competitor_id = payload.competitor_id
    if payload.enabled is not None:
        alert.enabled = payload.enabled

    db.commit()
    db.refresh(alert)
    return alert


def delete_alert(db: Session, user_id: uuid.UUID, alert_id: uuid.UUID) -> None:
    alert = get_alert(db, user_id, alert_id)
    db.delete(alert)
    db.commit()


# Evaluation Engine


def _calculate_metric_value(
    db: Session, user_id: uuid.UUID, alert: Alert
) -> Optional[float]:
    """Calculate the current value of the configured metric. Returns None if unavailable."""
    workspace_id = alert.workspace_id
    metric = alert.metric
    dataset_id = alert.dataset_id
    competitor_id = alert.competitor_id

    if metric == AlertMetric.NEGATIVE_SENTIMENT_PERCENTAGE.value:
        sentiment_data = analytics_service.get_sentiment_analytics(
            db=db, user_id=user_id, workspace_id=workspace_id, dataset_id=dataset_id
        )
        return sentiment_data.get("sentiment_percentages", {}).get("negative")

    elif metric == AlertMetric.COMPLAINT_RATE.value:
        overview_data = analytics_service.get_overview(
            db=db, user_id=user_id, workspace_id=workspace_id, dataset_id=dataset_id
        )
        return overview_data.get("complaint_rate")

    elif metric == AlertMetric.ANALYSIS_COVERAGE_PERCENTAGE.value:
        overview_data = analytics_service.get_overview(
            db=db, user_id=user_id, workspace_id=workspace_id, dataset_id=dataset_id
        )
        return overview_data.get("analysis_coverage_percentage")

    elif metric == AlertMetric.COMPETITOR_NEGATIVE_PERCENTAGE.value:
        if not competitor_id:
            return None
        stats = competitor_service.get_competitor_analytics(
            db=db,
            user_id=user_id,
            workspace_id=workspace_id,
            dataset_id=dataset_id,
            competitor_id=competitor_id,
        )
        if not stats:
            return None
        return stats[0].get("negative_percentage")

    elif metric == AlertMetric.COMPETITOR_MENTIONS.value:
        if not competitor_id:
            return None
        stats = competitor_service.get_competitor_analytics(
            db=db,
            user_id=user_id,
            workspace_id=workspace_id,
            dataset_id=dataset_id,
            competitor_id=competitor_id,
        )
        if not stats:
            return None
        return float(stats[0].get("total_mentions", 0))

    return None


def _evaluate_condition(current_value: Optional[float], operator: str, threshold: float) -> bool:
    """Evaluate condition safely. If metric is NULL/unavailable, alert must not trigger."""
    if current_value is None:
        return False

    if operator == AlertOperator.GT.value:
        return current_value > threshold
    elif operator == AlertOperator.GTE.value:
        return current_value >= threshold
    elif operator == AlertOperator.LT.value:
        return current_value < threshold
    elif operator == AlertOperator.LTE.value:
        return current_value <= threshold

    return False


def evaluate_workspace_alerts(
    db: Session, user_id: uuid.UUID, workspace_id: uuid.UUID
) -> List[Dict[str, Any]]:
    """Evaluate all enabled alerts for a workspace."""
    _ensure_workspace_access(db, user_id, workspace_id)

    enabled_alerts = list(
        db.scalars(
            select(Alert)
            .where(and_(Alert.workspace_id == workspace_id, Alert.enabled == True))  # noqa: E712
            .order_by(Alert.created_at.asc())
        ).all()
    )

    evaluation_results: List[Dict[str, Any]] = []

    for alert in enabled_alerts:
        current_val = _calculate_metric_value(db, user_id, alert)
        triggered = _evaluate_condition(current_val, alert.operator, alert.threshold)
        evaluation_results.append(
            {
                "id": alert.id,
                "name": alert.name,
                "metric": alert.metric,
                "operator": alert.operator,
                "threshold": alert.threshold,
                "current_value": current_val,
                "triggered": triggered,
                "dataset_id": alert.dataset_id,
                "competitor_id": alert.competitor_id,
            }
        )

    return evaluation_results
