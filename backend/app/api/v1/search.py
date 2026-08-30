import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.search import SemanticSearchRequest
from app.services import search as search_service

router = APIRouter(tags=["Semantic search"])
dataset_router = APIRouter(prefix="/datasets", tags=["Semantic search"])


@dataset_router.post("/{dataset_id}/index")
def build_index(dataset_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"success": True, "data": search_service.build_dataset_index(db, dataset_id=dataset_id, user_id=current_user.id)}


@dataset_router.post("/{dataset_id}/index/add")
def add_index(dataset_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"success": True, "data": search_service.add_to_dataset_index(db, dataset_id=dataset_id, user_id=current_user.id)}


@dataset_router.get("/{dataset_id}/index-status")
def index_status(dataset_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"success": True, "data": search_service.get_index_status(db, dataset_id=dataset_id, user_id=current_user.id)}


@router.post("/search")
def search(payload: SemanticSearchRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"success": True, "data": {"workspace_id": str(payload.workspace_id), "query": payload.query, "results": search_service.semantic_search(db, workspace_id=payload.workspace_id, query=payload.query, top_k=payload.top_k, dataset_id=payload.dataset_id, user_id=current_user.id)}}
