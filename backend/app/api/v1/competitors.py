import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.competitor import (
    CompetitorCreate,
    CompetitorResponse,
    CompetitorUpdate,
)
from app.services import competitor as competitor_service
from app.services import dataset as dataset_service

router = APIRouter(prefix="/competitors", tags=["Competitors"])
dataset_competitors_router = APIRouter(prefix="/datasets", tags=["Competitors"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_competitor(
    payload: CompetitorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    competitor = competitor_service.create_competitor(db, current_user.id, payload)
    return {"success": True, "data": CompetitorResponse.model_validate(competitor)}


@router.get("")
def list_competitors(
    workspace_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    competitors = competitor_service.list_competitors(db, current_user.id, workspace_id)
    return {"success": True, "data": [CompetitorResponse.model_validate(c) for c in competitors]}


@router.get("/analysis")
def get_competitor_analysis(
    workspace_id: uuid.UUID = Query(...),
    dataset_id: Optional[uuid.UUID] = Query(None),
    competitor_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    results = competitor_service.get_competitor_analytics(
        db,
        user_id=current_user.id,
        workspace_id=workspace_id,
        dataset_id=dataset_id,
        competitor_id=competitor_id,
    )
    return {"success": True, "data": results}


@router.get("/{competitor_id}")
def get_competitor(
    competitor_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    competitor = competitor_service.get_competitor(db, current_user.id, competitor_id)
    return {"success": True, "data": CompetitorResponse.model_validate(competitor)}


@router.patch("/{competitor_id}")
def update_competitor(
    competitor_id: uuid.UUID,
    payload: CompetitorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    competitor = competitor_service.update_competitor(db, current_user.id, competitor_id, payload)
    return {"success": True, "data": CompetitorResponse.model_validate(competitor)}


@router.delete("/{competitor_id}")
def delete_competitor(
    competitor_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    competitor_service.delete_competitor(db, current_user.id, competitor_id)
    return {"success": True, "data": {"message": "Competitor deleted"}}


# Dataset-scoped competitor endpoints


@dataset_competitors_router.post("/{dataset_id}/competitors/analyze")
def analyze_dataset_competitors(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = competitor_service.analyze_dataset_competitors(
        db, dataset_id=dataset_id, user_id=current_user.id
    )
    return {"success": True, "data": result}


@dataset_competitors_router.get("/{dataset_id}/competitors")
def get_dataset_competitors(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = dataset_service.get_dataset_for_user(db, dataset_id, current_user.id)
    results = competitor_service.get_competitor_analytics(
        db,
        user_id=current_user.id,
        workspace_id=dataset.workspace_id,
        dataset_id=dataset_id,
    )
    return {"success": True, "data": results}
