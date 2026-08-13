import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.analysis_result import AnalysisResult


class AspectAnalysis(Base):
    __tablename__ = "aspect_analysis"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    analysis_result_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("analysis_results.id", ondelete="CASCADE"), index=True, nullable=False)
    aspect_term: Mapped[str] = mapped_column(String(255), nullable=False)
    normalized_aspect: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sentiment_label: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sentiment_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="heuristic", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    analysis_result: Mapped["AnalysisResult"] = relationship("AnalysisResult", back_populates="aspects")
