import uuid
from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, String, Text, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.feedback import Feedback


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    feedback_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("feedback.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False)
    normalized_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    language_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    script: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    is_code_mixed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sentiment_label: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sentiment_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sentiment_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    emotion_label: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    emotion_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    emotion_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    complaint_label: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    complaint_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    complaint_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="completed", nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model_version: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    feedback: Mapped["Feedback"] = relationship("Feedback", back_populates="analysis_result")
    aspects: Mapped[List["AspectAnalysis"]] = relationship("AspectAnalysis", back_populates="analysis_result", cascade="all, delete-orphan")
