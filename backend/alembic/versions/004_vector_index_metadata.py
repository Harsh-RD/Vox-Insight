"""Add persisted metadata for dataset FAISS indexes.

Revision ID: 004_vector_index_metadata
Revises: 003_nlp_analysis
Create Date: 2026-08-30 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004_vector_index_metadata"
down_revision: Union[str, None] = "003_nlp_analysis"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vector_indexes",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("dataset_id", sa.UUID(), nullable=False),
        sa.Column("index_type", sa.String(length=50), nullable=False, server_default="IndexFlatIP"),
        sa.Column("embedding_model", sa.String(length=255), nullable=False),
        sa.Column("embedding_dimension", sa.Integer(), nullable=False),
        sa.Column("indexed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("last_indexed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", "dataset_id", name="uq_vector_indexes_workspace_dataset"),
    )
    op.create_index(op.f("ix_vector_indexes_workspace_id"), "vector_indexes", ["workspace_id"], unique=False)
    op.create_index(op.f("ix_vector_indexes_dataset_id"), "vector_indexes", ["dataset_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_vector_indexes_dataset_id"), table_name="vector_indexes")
    op.drop_index(op.f("ix_vector_indexes_workspace_id"), table_name="vector_indexes")
    op.drop_table("vector_indexes")
