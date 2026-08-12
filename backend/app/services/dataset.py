import csv
import io
import uuid
from datetime import datetime
from typing import Optional

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, PermissionDeniedException
from app.models.dataset import Dataset
from app.models.feedback import Feedback
from app.services.workspace import get_user_workspace_membership

VALID_DATASET_STATUSES = {"pending", "processing", "completed", "failed"}


def _null_if_empty(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = value.strip()
    return value or None


def get_dataset_for_user(db: Session, dataset_id: uuid.UUID, user_id: uuid.UUID) -> Dataset:
    dataset = db.scalar(select(Dataset).where(Dataset.id == dataset_id))
    if not dataset:
        raise NotFoundException(message="Dataset not found")
    if not get_user_workspace_membership(db, user_id, dataset.workspace_id):
        raise PermissionDeniedException(message="You are not a member of this dataset's workspace")
    return dataset


def create_dataset(db: Session, *, workspace_id: uuid.UUID, user_id: uuid.UUID, name: str, description: Optional[str], source: Optional[str]) -> Dataset:
    if not get_user_workspace_membership(db, user_id, workspace_id):
        raise PermissionDeniedException(message="You are not a member of this workspace")
    dataset = Dataset(workspace_id=workspace_id, name=name.strip(), description=_null_if_empty(description), source=_null_if_empty(source), created_by=user_id)
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


def list_datasets(db: Session, *, workspace_id: uuid.UUID, user_id: uuid.UUID) -> list[Dataset]:
    if not get_user_workspace_membership(db, user_id, workspace_id):
        raise PermissionDeniedException(message="You are not a member of this workspace")
    return list(db.scalars(select(Dataset).where(Dataset.workspace_id == workspace_id).order_by(Dataset.created_at.desc())))


def delete_dataset(db: Session, dataset_id: uuid.UUID, user_id: uuid.UUID) -> None:
    dataset = get_dataset_for_user(db, dataset_id, user_id)
    db.delete(dataset)
    db.commit()


def list_feedback(db: Session, dataset: Dataset, limit: int, offset: int) -> list[Feedback]:
    return list(db.scalars(select(Feedback).where(Feedback.dataset_id == dataset.id).order_by(Feedback.created_at.asc()).offset(offset).limit(limit)))


def get_feedback_for_user(db: Session, feedback_id: uuid.UUID, user_id: uuid.UUID) -> Feedback:
    feedback = db.scalar(select(Feedback).where(Feedback.id == feedback_id))
    if not feedback:
        raise NotFoundException(message="Feedback not found")
    if not get_user_workspace_membership(db, user_id, feedback.workspace_id):
        raise PermissionDeniedException(message="You are not a member of this feedback's workspace")
    return feedback


def _parse_timestamp(value: Optional[str]) -> Optional[datetime]:
    value = _null_if_empty(value)
    if value is None:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("timestamp must be ISO-8601 formatted") from exc


def upload_csv(db: Session, dataset: Dataset, file: UploadFile) -> dict:
    filename = file.filename or ""
    if not filename.lower().endswith(".csv"):
        raise ValueError("Only .csv files are supported")

    dataset.status = "processing"
    dataset.original_filename = filename[:255]
    db.commit()

    rows_read = rows_imported = rows_skipped = 0
    invalid_rows: list[dict[str, str | int]] = []
    try:
        text_stream = io.TextIOWrapper(file.file, encoding="utf-8-sig", newline="")
        reader = csv.DictReader(text_stream)
        if not reader.fieldnames:
            raise ValueError("CSV file must include a header row")
        columns = {header.strip().lower(): header for header in reader.fieldnames if header}
        if "text" not in columns:
            raise ValueError("CSV file must include a usable 'text' column")

        for row_number, row in enumerate(reader, start=2):
            rows_read += 1
            text = _null_if_empty(row.get(columns["text"]))
            if not text:
                rows_skipped += 1
                if len(invalid_rows) < 100:
                    invalid_rows.append({"row": row_number, "reason": "text is required"})
                continue
            try:
                rating_value = _null_if_empty(row.get(columns["rating"])) if "rating" in columns else None
                rating = float(rating_value) if rating_value is not None else None
                timestamp = _parse_timestamp(row.get(columns["timestamp"]) if "timestamp" in columns else None)
            except ValueError as exc:
                rows_skipped += 1
                if len(invalid_rows) < 100:
                    invalid_rows.append({"row": row_number, "reason": str(exc)})
                continue

            db.add(Feedback(
                workspace_id=dataset.workspace_id, dataset_id=dataset.id, original_text=text,
                rating=rating, source=_null_if_empty(row.get(columns["source"])) if "source" in columns else None,
                feedback_timestamp=timestamp,
                language=_null_if_empty(row.get(columns["language"])) if "language" in columns else None,
                processing_status="pending",
            ))
            rows_imported += 1
            if rows_imported % 500 == 0:
                db.flush()

        dataset.row_count = rows_imported
        dataset.status = "completed" if rows_imported else "failed"
        db.commit()
        db.refresh(dataset)
    except (UnicodeDecodeError, csv.Error, ValueError) as exc:
        db.rollback()
        dataset = db.get(Dataset, dataset.id)
        dataset.status = "failed"
        db.commit()
        raise ValueError(str(exc)) from exc

    return {"dataset": dataset, "rows_read": rows_read, "rows_imported": rows_imported, "rows_skipped": rows_skipped, "invalid_rows": invalid_rows}
