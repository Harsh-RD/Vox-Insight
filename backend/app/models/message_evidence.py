import uuid

from sqlalchemy import Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class MessageEvidence(Base):
    __tablename__ = "message_evidence"
    __table_args__ = (UniqueConstraint("message_id", "feedback_id", name="uq_message_evidence_message_feedback"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), index=True, nullable=False)
    feedback_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("feedback.id", ondelete="CASCADE"), index=True, nullable=False)
    similarity_score: Mapped[float] = mapped_column(Float, nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    message = relationship("Message", back_populates="evidence")
