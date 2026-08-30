from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import AppException, NotFoundException
from app.embeddings.service import embed_text, embed_texts
from app.models.analysis_result import AnalysisResult
from app.models.feedback import Feedback
from app.models.vector_index import VectorIndex
from app.services.dataset import get_dataset_for_user
from app.services.workspace import get_user_workspace_membership
from app.vector_store.faiss_store import DatasetFaissStore, IndexPersistenceError

VALID_INDEX_STATUSES = {"pending", "indexing", "completed", "failed"}


def _text_for_embedding(feedback: Feedback, normalized_text: str | None) -> str | None:
    candidate = normalized_text or feedback.original_text
    candidate = candidate.strip() if candidate else ""
    return candidate or None


def _metadata(db: Session, dataset_id: uuid.UUID) -> VectorIndex | None:
    return db.scalar(select(VectorIndex).where(VectorIndex.dataset_id == dataset_id))


def _status_payload(record: VectorIndex | None, dataset) -> dict:
    if record is None:
        return {"dataset_id": dataset.id, "workspace_id": dataset.workspace_id, "status": "pending", "indexed_count": 0, "embedding_model": settings.EMBEDDING_MODEL, "embedding_dimension": settings.EMBEDDING_DIMENSION, "index_type": "IndexFlatIP", "last_indexed_at": None, "error_message": None}
    return {"dataset_id": record.dataset_id, "workspace_id": record.workspace_id, "status": record.status, "indexed_count": record.indexed_count, "embedding_model": record.embedding_model, "embedding_dimension": record.embedding_dimension, "index_type": record.index_type, "last_indexed_at": record.last_indexed_at, "error_message": record.error_message}


def get_index_status(db: Session, *, dataset_id: uuid.UUID, user_id: uuid.UUID) -> dict:
    dataset = get_dataset_for_user(db, dataset_id, user_id)
    return _status_payload(_metadata(db, dataset.id), dataset)


def _get_or_create_metadata(db: Session, dataset) -> VectorIndex:
    record = _metadata(db, dataset.id)
    if record is None:
        record = VectorIndex(workspace_id=dataset.workspace_id, dataset_id=dataset.id, embedding_model=settings.EMBEDDING_MODEL, embedding_dimension=settings.EMBEDDING_DIMENSION)
        db.add(record)
        db.flush()
    record.status = "indexing"
    record.error_message = None
    record.embedding_model = settings.EMBEDDING_MODEL
    record.embedding_dimension = settings.EMBEDDING_DIMENSION
    db.commit()
    return record


def _feedback_with_text(db: Session, dataset_id: uuid.UUID) -> list[tuple[Feedback, str]]:
    rows = db.execute(select(Feedback, AnalysisResult.normalized_text).outerjoin(AnalysisResult, AnalysisResult.feedback_id == Feedback.id).where(Feedback.dataset_id == dataset_id)).all()
    return [(feedback, text) for feedback, normalized in rows if (text := _text_for_embedding(feedback, normalized))]


def build_dataset_index(db: Session, *, dataset_id: uuid.UUID, user_id: uuid.UUID) -> dict:
    dataset = get_dataset_for_user(db, dataset_id, user_id)
    record = _get_or_create_metadata(db, dataset)
    try:
        rows = _feedback_with_text(db, dataset.id)
        vectors = embed_texts([text for _, text in rows])
        DatasetFaissStore(dataset.workspace_id, dataset.id).build(vectors, [item.id for item, _ in rows])
        record.indexed_count = len(rows)
        record.status = "completed"
        record.last_indexed_at = datetime.now(timezone.utc)
        db.commit()
        return _status_payload(record, dataset)
    except Exception as exc:
        db.rollback()
        record = _metadata(db, dataset.id)
        if record:
            record.status = "failed"
            record.error_message = str(exc)
            db.commit()
        raise AppException("Dataset indexing failed", code="INDEXING_FAILED", details={"reason": str(exc)}) from exc


def add_to_dataset_index(db: Session, *, dataset_id: uuid.UUID, user_id: uuid.UUID) -> dict:
    dataset = get_dataset_for_user(db, dataset_id, user_id)
    record = _metadata(db, dataset.id)
    if record is None or record.status != "completed":
        raise AppException("Build the dataset index before adding feedback", code="INDEX_NOT_READY", status_code=409)
    record.status = "indexing"
    db.commit()
    try:
        store = DatasetFaissStore(dataset.workspace_id, dataset.id)
        _, mapping = store.load()
        existing = {uuid.UUID(value) for value in mapping}
        rows = [(feedback, text) for feedback, text in _feedback_with_text(db, dataset.id) if feedback.id not in existing]
        added = store.add(embed_texts([text for _, text in rows]), [feedback.id for feedback, _ in rows])
        record.indexed_count += added
        record.status = "completed"
        record.last_indexed_at = datetime.now(timezone.utc)
        db.commit()
        return {**_status_payload(record, dataset), "added_count": added}
    except Exception as exc:
        db.rollback()
        record = _metadata(db, dataset.id)
        if record:
            record.status = "failed"
            record.error_message = str(exc)
            db.commit()
        raise AppException("Incremental indexing failed", code="INDEXING_FAILED", details={"reason": str(exc)}) from exc


def semantic_search(db: Session, *, workspace_id: uuid.UUID, query: str, top_k: int, dataset_id: uuid.UUID | None, user_id: uuid.UUID) -> list[dict]:
    if not get_user_workspace_membership(db, user_id, workspace_id):
        from app.core.exceptions import PermissionDeniedException
        raise PermissionDeniedException(message="You are not a member of this workspace")
    if not query.strip():
        raise AppException("Search query must not be empty", code="INVALID_SEARCH", status_code=422)
    records = list(db.scalars(select(VectorIndex).where(VectorIndex.workspace_id == workspace_id, VectorIndex.status == "completed", *( [VectorIndex.dataset_id == dataset_id] if dataset_id else []))))
    if dataset_id:
        dataset = get_dataset_for_user(db, dataset_id, user_id)
        if dataset.workspace_id != workspace_id:
            raise NotFoundException(message="Dataset not found in this workspace")
    vector = embed_text(query)
    candidates = []
    for record in records:
        try:
            candidates.extend(DatasetFaissStore(workspace_id, record.dataset_id).search(vector, top_k))
        except IndexPersistenceError as exc:
            record.status = "failed"
            record.error_message = str(exc)
            db.commit()
            raise AppException(
                "A semantic index is unavailable; rebuild the affected dataset index",
                code="INDEX_UNAVAILABLE",
                status_code=503,
                details={"dataset_id": str(record.dataset_id)},
            ) from exc
    ranked = sorted(candidates, key=lambda match: match.score, reverse=True)
    feedback_ids = [match.feedback_id for match in ranked]
    if not feedback_ids:
        return []
    rows = list(db.scalars(select(Feedback).where(Feedback.id.in_(feedback_ids), Feedback.workspace_id == workspace_id)))
    by_id = {row.id: row for row in rows}
    results = []
    for match in ranked:
        feedback = by_id.get(match.feedback_id)
        if feedback is None or (dataset_id is not None and feedback.dataset_id != dataset_id):
            continue
        results.append({"feedback_id": str(feedback.id), "dataset_id": str(feedback.dataset_id), "workspace_id": str(feedback.workspace_id), "text": feedback.original_text, "language": feedback.language, "rating": feedback.rating, "similarity_score": match.score})
        if len(results) == top_k:
            break
    return results
