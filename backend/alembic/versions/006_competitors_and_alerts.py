"""Add competitors, competitor mentions, and alerts.

Revision ID: 006_competitors_and_alerts
Revises: 005_conversations_rag
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "006_competitors_and_alerts"
down_revision: Union[str, None] = "005_conversations_rag"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Competitors table
    op.create_table(
        "competitors",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("aliases", sa.JSON(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", "name", name="uq_competitors_workspace_name"),
    )
    op.create_index(op.f("ix_competitors_workspace_id"), "competitors", ["workspace_id"])

    # 2. Competitor mentions table
    op.create_table(
        "competitor_mentions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("competitor_id", sa.UUID(), nullable=False),
        sa.Column("feedback_id", sa.UUID(), nullable=False),
        sa.Column("matched_alias", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["competitor_id"], ["competitors.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["feedback_id"], ["feedback.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("competitor_id", "feedback_id", name="uq_competitor_feedback_mention"),
    )
    op.create_index(op.f("ix_competitor_mentions_workspace_id"), "competitor_mentions", ["workspace_id"])
    op.create_index(op.f("ix_competitor_mentions_competitor_id"), "competitor_mentions", ["competitor_id"])
    op.create_index(op.f("ix_competitor_mentions_feedback_id"), "competitor_mentions", ["feedback_id"])

    # 3. Alerts table
    op.create_table(
        "alerts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("alert_type", sa.String(50), nullable=False, server_default="threshold"),
        sa.Column("metric", sa.String(50), nullable=False),
        sa.Column("operator", sa.String(10), nullable=False),
        sa.Column("threshold", sa.Float(), nullable=False),
        sa.Column("dataset_id", sa.UUID(), nullable=True),
        sa.Column("competitor_id", sa.UUID(), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["competitor_id"], ["competitors.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_alerts_workspace_id"), "alerts", ["workspace_id"])
    op.create_index(op.f("ix_alerts_dataset_id"), "alerts", ["dataset_id"])
    op.create_index(op.f("ix_alerts_competitor_id"), "alerts", ["competitor_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_alerts_competitor_id"), table_name="alerts")
    op.drop_index(op.f("ix_alerts_dataset_id"), table_name="alerts")
    op.drop_index(op.f("ix_alerts_workspace_id"), table_name="alerts")
    op.drop_table("alerts")

    op.drop_index(op.f("ix_competitor_mentions_feedback_id"), table_name="competitor_mentions")
    op.drop_index(op.f("ix_competitor_mentions_competitor_id"), table_name="competitor_mentions")
    op.drop_index(op.f("ix_competitor_mentions_workspace_id"), table_name="competitor_mentions")
    op.drop_table("competitor_mentions")

    op.drop_index(op.f("ix_competitors_workspace_id"), table_name="competitors")
    op.drop_table("competitors")
