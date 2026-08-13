import uuid
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, PermissionDeniedException
from app.models.analysis_result import AnalysisResult
from app.models.aspect_analysis import AspectAnalysis
from app.models.feedback import Feedback
from app.nlp.pipeline import analyze as run_nlp_pipeline
from app.services.dataset import get_feedback_for_user, get_dataset_for_user
from app.services.workspace import get_user_workspace_membership

VALID_PROCESSING_STATUSES = {"pending", "processing", "completed", "failed"}


def _get_feedback_for_user(db: Session, feedback_id: uuid.UUID, user_id: uuid.UUID) -> Feedback:
    return get_feedback_for_user(db, feedback_id, user_id)


def get_analysis_for_feedback(db: Session, feedback_id: uuid.UUID, user_id: uuid.UUID) -> AnalysisResult:
    feedback = _get_feedback_for_user(db, feedback_id, user_id)
    result = db.scalar(select(AnalysisResult).where(AnalysisResult.feedback_id == feedback.id))
    if not result:
        raise NotFoundException(message="Analysis not found for this feedback record")
    return result


def get_dataset_analysis_status(db: Session, dataset_id: uuid.UUID, user_id: uuid.UUID) -> Dict[str, Any]:
    dataset = get_dataset_for_user(db, dataset_id, user_id)
    feedback_rows = db.scalars(select(Feedback).where(Feedback.dataset_id == dataset.id)).all()
    status_counts = {status: 0 for status in VALID_PROCESSING_STATUSES}
    for row in feedback_rows:
        status_counts[row.processing_status] = status_counts.get(row.processing_status, 0) + 1

    analysis_count = db.scalar(select(__import__('sqlalchemy').func.count()).select_from(AnalysisResult).join(Feedback, AnalysisResult.feedback_id == Feedback.id).where(Feedback.dataset_id == dataset.id)) or 0
    return {"dataset_id": str(dataset.id), "workspace_id": str(dataset.workspace_id), "feedback_count": len(feedback_rows), "analysis_count": int(analysis_count), "status_counts": status_counts}


def analyze_feedback(db: Session, *, feedback_id: uuid.UUID, user_id: uuid.UUID) -> Dict[str, Any]:
    feedback = _get_feedback_for_user(db, feedback_id, user_id)
    if feedback.processing_status == "processing":
        raise PermissionDeniedException(message="This feedback record is already being processed")

    feedback.processing_status = "processing"
    db.commit()
    try:
        result_payload = run_nlp_pipeline(feedback.original_text)
        analysis = db.scalar(select(AnalysisResult).where(AnalysisResult.feedback_id == feedback.id))
        if analysis is None:
            analysis = AnalysisResult(
                feedback_id=feedback.id,
                workspace_id=feedback.workspace_id,
                normalized_text=result_payload.get("normalized_text"),
                language=result_payload.get("language"),
                language_confidence=result_payload.get("language_confidence"),
                script=result_payload.get("script"),
                is_code_mixed=bool(result_payload.get("is_code_mixed", False)),
                sentiment_label=result_payload.get("sentiment_label"),
                sentiment_score=result_payload.get("sentiment_score"),
                sentiment_source=result_payload.get("sentiment_source"),
                emotion_label=result_payload.get("emotion_label"),
                emotion_confidence=result_payload.get("emotion_confidence"),
                emotion_source=result_payload.get("emotion_source"),
                complaint_label=result_payload.get("complaint_label"),
                complaint_confidence=result_payload.get("complaint_confidence"),
                complaint_source=result_payload.get("complaint_source"),
                status="completed",
                model_version="phase3-foundation",
            )
            db.add(analysis)
            db.flush()
        else:
            analysis.normalized_text = result_payload.get("normalized_text")
            analysis.language = result_payload.get("language")
            analysis.language_confidence = result_payload.get("language_confidence")
            analysis.script = result_payload.get("script")
            analysis.is_code_mixed = bool(result_payload.get("is_code_mixed", False))
            analysis.sentiment_label = result_payload.get("sentiment_label")
            analysis.sentiment_score = result_payload.get("sentiment_score")
            analysis.sentiment_source = result_payload.get("sentiment_source")
            analysis.emotion_label = result_payload.get("emotion_label")
            analysis.emotion_confidence = result_payload.get("emotion_confidence")
            analysis.emotion_source = result_payload.get("emotion_source")
            analysis.complaint_label = result_payload.get("complaint_label")
            analysis.complaint_confidence = result_payload.get("complaint_confidence")
            analysis.complaint_source = result_payload.get("complaint_source")
            analysis.status = "completed"
            analysis.error_message = None
            analysis.model_version = "phase3-foundation"
            analysis.updated_at = __import__('datetime').datetime.now(__import__('datetime').timezone.utc)

        for aspect in analysis.aspects:
            db.delete(aspect)
        for aspect_payload in result_payload.get("aspects", []):
            db.add(AspectAnalysis(
                analysis_result_id=analysis.id,
                aspect_term=str(aspect_payload.get("aspect_term") or "unknown"),
                normalized_aspect=aspect_payload.get("normalized_aspect"),
                sentiment_label=aspect_payload.get("sentiment_label"),
                sentiment_score=aspect_payload.get("sentiment_score"),
                confidence=aspect_payload.get("confidence"),
                source=str(aspect_payload.get("source") or "heuristic"),
            ))

        feedback.language = result_payload.get("language")
        feedback.processing_status = "completed"
        feedback.updated_at = __import__('datetime').datetime.now(__import__('datetime').timezone.utc)
        db.commit()
        db.refresh(analysis)
        return {
            "feedback_id": str(feedback.id),
            "status": "completed",
            "analysis": analysis_response(analysis),
        }
    except Exception as exc:
        feedback.processing_status = "failed"
        feedback.updated_at = __import__('datetime').datetime.now(__import__('datetime').timezone.utc)
        analysis = db.scalar(select(AnalysisResult).where(AnalysisResult.feedback_id == feedback.id))
        if analysis is None:
            analysis = AnalysisResult(
                feedback_id=feedback.id,
                workspace_id=feedback.workspace_id,
                status="failed",
                error_message=str(exc),
                model_version="phase3-foundation",
            )
            db.add(analysis)
        else:
            analysis.status = "failed"
            analysis.error_message = str(exc)
            analysis.updated_at = __import__('datetime').datetime.now(__import__('datetime').timezone.utc)
        db.commit()
        return {"feedback_id": str(feedback.id), "status": "failed", "error": str(exc)}


def analyze_dataset(db: Session, *, dataset_id: uuid.UUID, user_id: uuid.UUID) -> Dict[str, Any]:
    dataset = get_dataset_for_user(db, dataset_id, user_id)
    feedback_rows = db.scalars(select(Feedback).where(Feedback.dataset_id == dataset.id).where(Feedback.processing_status != "completed")).all()
    for feedback in feedback_rows:
        analyze_feedback(db, feedback_id=feedback.id, user_id=user_id)
    return {"dataset_id": str(dataset.id), "processed_count": len(feedback_rows), "status": "completed"}


def analysis_response(analysis: AnalysisResult) -> Dict[str, Any]:
    return {
        "id": str(analysis.id),
        "feedback_id": str(analysis.feedback_id),
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
    }
