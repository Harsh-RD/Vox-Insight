"""Add persisted RAG conversations, messages, and evidence.

Revision ID: 005_conversations_rag
Revises: 004_vector_index_metadata
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005_conversations_rag"
down_revision: Union[str, None] = "004_vector_index_metadata"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table("conversations",
        sa.Column("id", sa.UUID(), nullable=False), sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False), sa.Column("title", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index(op.f("ix_conversations_workspace_id"), "conversations", ["workspace_id"])
    op.create_index(op.f("ix_conversations_user_id"), "conversations", ["user_id"])
    op.create_table("messages",
        sa.Column("id", sa.UUID(), nullable=False), sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column("role", sa.String(20), nullable=False), sa.Column("content", sa.Text(), nullable=False),
        sa.Column("provider", sa.String(50), nullable=True), sa.Column("model", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index(op.f("ix_messages_conversation_id"), "messages", ["conversation_id"])
    op.create_table("message_evidence",
        sa.Column("id", sa.UUID(), nullable=False), sa.Column("message_id", sa.UUID(), nullable=False),
        sa.Column("feedback_id", sa.UUID(), nullable=False), sa.Column("similarity_score", sa.Float(), nullable=False), sa.Column("rank", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["feedback_id"], ["feedback.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("message_id", "feedback_id", name="uq_message_evidence_message_feedback"))
    op.create_index(op.f("ix_message_evidence_message_id"), "message_evidence", ["message_id"])
    op.create_index(op.f("ix_message_evidence_feedback_id"), "message_evidence", ["feedback_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_message_evidence_feedback_id"), table_name="message_evidence")
    op.drop_index(op.f("ix_message_evidence_message_id"), table_name="message_evidence")
    op.drop_table("message_evidence")
    op.drop_index(op.f("ix_messages_conversation_id"), table_name="messages")
    op.drop_table("messages")
    op.drop_index(op.f("ix_conversations_user_id"), table_name="conversations")
    op.drop_index(op.f("ix_conversations_workspace_id"), table_name="conversations")
    op.drop_table("conversations")
