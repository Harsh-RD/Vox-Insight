"""Add NLP analysis tables for feedback analysis results and aspect extraction.

Revision ID: 003_nlp_analysis
Revises: 002_dataset_feedback_ingestion
Create Date: 2026-08-13 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003_nlp_analysis"
down_revision: Union[str, None] = "002_dataset_feedback_ingestion"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "analysis_results",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("feedback_id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("normalized_text", sa.Text(), nullable=True),
        sa.Column("language", sa.String(length=50), nullable=True),
        sa.Column("language_confidence", sa.Float(), nullable=True),
        sa.Column("script", sa.String(length=20), nullable=True),
        sa.Column("is_code_mixed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("sentiment_label", sa.String(length=50), nullable=True),
        sa.Column("sentiment_score", sa.Float(), nullable=True),
        sa.Column("sentiment_source", sa.String(length=50), nullable=True),
        sa.Column("emotion_label", sa.String(length=50), nullable=True),
        sa.Column("emotion_confidence", sa.Float(), nullable=True),
        sa.Column("emotion_source", sa.String(length=50), nullable=True),
        sa.Column("complaint_label", sa.Boolean(), nullable=True),
        sa.Column("complaint_confidence", sa.Float(), nullable=True),
        sa.Column("complaint_source", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="completed"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("model_version", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["feedback_id"], ["feedback.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("feedback_id"),
    )
    op.create_index(op.f("ix_analysis_results_feedback_id"), "analysis_results", ["feedback_id"], unique=False)
    op.create_index(op.f("ix_analysis_results_workspace_id"), "analysis_results", ["workspace_id"], unique=False)

    op.create_table(
        "aspect_analysis",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("analysis_result_id", sa.UUID(), nullable=False),
        sa.Column("aspect_term", sa.String(length=255), nullable=False),
        sa.Column("normalized_aspect", sa.String(length=255), nullable=True),
        sa.Column("sentiment_label", sa.String(length=50), nullable=True),
        sa.Column("sentiment_score", sa.Float(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("source", sa.String(length=50), nullable=False, server_default="heuristic"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["analysis_result_id"], ["analysis_results.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_aspect_analysis_analysis_result_id"), "aspect_analysis", ["analysis_result_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_aspect_analysis_analysis_result_id"), table_name="aspect_analysis")
    op.drop_table("aspect_analysis")
    op.drop_index(op.f("ix_analysis_results_workspace_id"), table_name="analysis_results")
    op.drop_index(op.f("ix_analysis_results_feedback_id"), table_name="analysis_results")
    op.drop_table("analysis_results")
