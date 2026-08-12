import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.exceptions import AppException
from app.database.session import get_db
from app.models.user import User
from app.schemas.dataset import DatasetCreate, DatasetResponse
from app.schemas.feedback import FeedbackResponse
from app.services import dataset as dataset_service

router = APIRouter(prefix="/datasets", tags=["Datasets"])


def dataset_response(dataset) -> DatasetResponse:
    return DatasetResponse.model_validate(dataset)


def feedback_response(feedback) -> FeedbackResponse:
    return FeedbackResponse(
        id=feedback.id, workspace_id=feedback.workspace_id, dataset_id=feedback.dataset_id,
        original_text=feedback.original_text, rating=feedback.rating, source=feedback.source,
        timestamp=feedback.feedback_timestamp, language=feedback.language,
        processing_status=feedback.processing_status, created_at=feedback.created_at, updated_at=feedback.updated_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create(payload: DatasetCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    dataset = dataset_service.create_dataset(db, workspace_id=payload.workspace_id, user_id=current_user.id, name=payload.name, description=payload.description, source=payload.source)
    return {"success": True, "data": dataset_response(dataset)}


@router.get("")
def list_for_workspace(workspace_id: uuid.UUID = Query(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    datasets = dataset_service.list_datasets(db, workspace_id=workspace_id, user_id=current_user.id)
    return {"success": True, "data": [dataset_response(item) for item in datasets]}


@router.get("/{dataset_id}")
def get(dataset_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"success": True, "data": dataset_response(dataset_service.get_dataset_for_user(db, dataset_id, current_user.id))}


@router.delete("/{dataset_id}")
def delete(dataset_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    dataset_service.delete_dataset(db, dataset_id, current_user.id)
    return {"success": True, "data": {"message": "Dataset deleted"}}


@router.post("/{dataset_id}/upload")
def upload(dataset_id: uuid.UUID, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    dataset = dataset_service.get_dataset_for_user(db, dataset_id, current_user.id)
    try:
        summary = dataset_service.upload_csv(db, dataset, file)
    except ValueError as exc:
        raise AppException(str(exc), code="INVALID_CSV", status_code=status.HTTP_422_UNPROCESSABLE_CONTENT) from exc
    return {"success": True, "data": {**summary, "dataset": dataset_response(summary["dataset"])}}


@router.get("/{dataset_id}/feedback")
def feedback(dataset_id: uuid.UUID, limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    dataset = dataset_service.get_dataset_for_user(db, dataset_id, current_user.id)
    return {"success": True, "data": [feedback_response(item) for item in dataset_service.list_feedback(db, dataset, limit, offset)]}
