import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False)
    dataset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    feedback_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    processing_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    dataset = relationship("Dataset", back_populates="feedback_items")
