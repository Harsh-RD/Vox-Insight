import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.services.analysis import analyze_dataset, analyze_feedback, get_analysis_for_feedback, get_dataset_analysis_status

feedback_analysis_router = APIRouter(prefix="/feedback", tags=["Feedback Analysis"])
dataset_analysis_router = APIRouter(prefix="/datasets", tags=["Dataset Analysis"])


@feedback_analysis_router.post("/{feedback_id}/analyze", status_code=status.HTTP_200_OK)
def analyze_single_feedback(feedback_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = analyze_feedback(db, feedback_id=feedback_id, user_id=current_user.id)
    return {"success": True, "data": result}


@feedback_analysis_router.get("/{feedback_id}/analysis")
def get_feedback_analysis(feedback_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    analysis = get_analysis_for_feedback(db, feedback_id, current_user.id)
    return {"success": True, "data": {
        "feedback_id": str(feedback_id),
        "analysis": {
            "id": str(analysis.id),
            "workspace_id": str(analysis.workspace_id),
            "normalized_text": analysis.normalized_text,
            "language": analysis.language,
            "language_confidence": analysis.language_confidence,
            "script": analysis.script,
            "is_code_mixed": analysis.is_code_mixed,
            "sentiment_label": analysis.sentiment_label,
            "sentiment_score": analysis.sentiment_score,
            "sentiment_source": analysis.sentiment_source,
            "emotion_label": analysis.emotion_label,
            "emotion_confidence": analysis.emotion_confidence,
            "emotion_source": analysis.emotion_source,
            "complaint_label": analysis.complaint_label,
            "complaint_confidence": analysis.complaint_confidence,
            "complaint_source": analysis.complaint_source,
            "status": analysis.status,
            "error_message": analysis.error_message,
            "model_version": analysis.model_version,
            "aspects": [{
                "id": str(item.id),
                "aspect_term": item.aspect_term,
                "normalized_aspect": item.normalized_aspect,
                "sentiment_label": item.sentiment_label,
                "sentiment_score": item.sentiment_score,
                "confidence": item.confidence,
                "source": item.source,
            } for item in analysis.aspects],
        },
    }}


@dataset_analysis_router.post("/{dataset_id}/analyze", status_code=status.HTTP_200_OK)
def analyze_dataset_feedback(dataset_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = analyze_dataset(db, dataset_id=dataset_id, user_id=current_user.id)
    return {"success": True, "data": result}


@dataset_analysis_router.get("/{dataset_id}/analysis-status")
def get_dataset_status(dataset_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    status_payload = get_dataset_analysis_status(db, dataset_id, current_user.id)
    return {"success": True, "data": status_payload}
