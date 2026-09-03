import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.alert import AlertCreate, AlertResponse, AlertUpdate
from app.services import alert as alert_service

router = APIRouter(prefix="/alerts", tags=["Alerts"])


class AlertEvaluateRequest(BaseModel):
    workspace_id: Optional[uuid.UUID] = None


@router.post("", status_code=status.HTTP_201_CREATED)
def create_alert(
    payload: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = alert_service.create_alert(db, current_user.id, payload)
    return {"success": True, "data": AlertResponse.model_validate(alert)}


@router.get("")
def list_alerts(
    workspace_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alerts = alert_service.list_alerts(db, current_user.id, workspace_id)
    return {"success": True, "data": [AlertResponse.model_validate(a) for a in alerts]}


@router.post("/evaluate")
def evaluate_alerts(
    workspace_id: Optional[uuid.UUID] = Query(None),
    body: Optional[AlertEvaluateRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_workspace_id = workspace_id or (body.workspace_id if body else None)
    if not target_workspace_id:
        from app.core.exceptions import AppException
        raise AppException(
            message="workspace_id query parameter or body field is required",
            code="MISSING_WORKSPACE_ID",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    results = alert_service.evaluate_workspace_alerts(db, current_user.id, target_workspace_id)
    return {"success": True, "data": {"alerts": results}}


@router.get("/{alert_id}")
def get_alert(
    alert_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = alert_service.get_alert(db, current_user.id, alert_id)
    return {"success": True, "data": AlertResponse.model_validate(alert)}


@router.patch("/{alert_id}")
def update_alert(
    alert_id: uuid.UUID,
    payload: AlertUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = alert_service.update_alert(db, current_user.id, alert_id, payload)
    return {"success": True, "data": AlertResponse.model_validate(alert)}


@router.delete("/{alert_id}")
def delete_alert(
    alert_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert_service.delete_alert(db, current_user.id, alert_id)
    return {"success": True, "data": {"message": "Alert deleted"}}
