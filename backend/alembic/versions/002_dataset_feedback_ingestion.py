"""Add dataset and feedback ingestion tables.

Revision ID: 002_dataset_feedback_ingestion
Revises: 001_initial_auth_schema
Create Date: 2026-08-13 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002_dataset_feedback_ingestion"
down_revision: Union[str, None] = "001_initial_auth_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "datasets",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=255), nullable=True),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("row_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("created_by", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_datasets_workspace_id"), "datasets", ["workspace_id"], unique=False)
    op.create_table(
        "feedback",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("dataset_id", sa.UUID(), nullable=False),
        sa.Column("original_text", sa.Text(), nullable=False),
        sa.Column("rating", sa.Float(), nullable=True),
        sa.Column("source", sa.String(length=255), nullable=True),
        sa.Column("feedback_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("language", sa.String(length=50), nullable=True),
        sa.Column("processing_status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_feedback_workspace_id"), "feedback", ["workspace_id"], unique=False)
    op.create_index(op.f("ix_feedback_dataset_id"), "feedback", ["dataset_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_feedback_dataset_id"), table_name="feedback")
    op.drop_index(op.f("ix_feedback_workspace_id"), table_name="feedback")
    op.drop_table("feedback")
    op.drop_index(op.f("ix_datasets_workspace_id"), table_name="datasets")
    op.drop_table("datasets")
