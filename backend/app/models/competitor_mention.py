import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.competitor import Competitor
    from app.models.feedback import Feedback
    from app.models.workspace import Workspace


class CompetitorMention(Base):
    __tablename__ = "competitor_mentions"

    __table_args__ = (
        UniqueConstraint("competitor_id", "feedback_id", name="uq_competitor_feedback_mention"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    competitor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("competitors.id", ondelete="CASCADE"), index=True, nullable=False
    )
    feedback_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("feedback.id", ondelete="CASCADE"), index=True, nullable=False
    )
    matched_alias: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    workspace: Mapped["Workspace"] = relationship("Workspace")
    competitor: Mapped["Competitor"] = relationship("Competitor", back_populates="mentions")
    feedback: Mapped["Feedback"] = relationship("Feedback")
