import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.v1.datasets import feedback_response
from app.database.session import get_db
from app.models.user import User
from app.services.dataset import get_feedback_for_user

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.get("/{feedback_id}")
def get(feedback_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"success": True, "data": feedback_response(get_feedback_for_user(db, feedback_id, current_user.id))}
