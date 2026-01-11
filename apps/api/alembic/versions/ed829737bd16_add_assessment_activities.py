"""add_assessment_activities

Revision ID: ed829737bd16
Revises: 44e657e8abb5
Create Date: 2026-01-04 17:44:16.004873

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "ed829737bd16"
down_revision: Union[str, Sequence[str], None] = "44e657e8abb5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create assessment_activities table for tracking workflow events."""
    op.create_table(
        "assessment_activities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("assessment_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("from_status", sa.String(length=50), nullable=True),
        sa.Column("to_status", sa.String(length=50), nullable=True),
        sa.Column("extra_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_assessment_activities_id"),
        "assessment_activities",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_assessment_activities_assessment_id"),
        "assessment_activities",
        ["assessment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_assessment_activities_user_id"),
        "assessment_activities",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_assessment_activities_action"),
        "assessment_activities",
        ["action"],
        unique=False,
    )
    op.create_index(
        "ix_assessment_activities_created_at_desc",
        "assessment_activities",
        [sa.text("created_at DESC")],
        unique=False,
    )
    op.create_index(
        "ix_assessment_activities_assessment_action",
        "assessment_activities",
        ["assessment_id", "action"],
        unique=False,
    )
    op.create_index(
        "ix_assessment_activities_user_action",
        "assessment_activities",
        ["user_id", "action"],
        unique=False,
    )


def downgrade() -> None:
    """Drop assessment_activities table."""
    op.drop_index("ix_assessment_activities_user_action", table_name="assessment_activities")
    op.drop_index("ix_assessment_activities_assessment_action", table_name="assessment_activities")
    op.drop_index("ix_assessment_activities_created_at_desc", table_name="assessment_activities")
    op.drop_index(op.f("ix_assessment_activities_action"), table_name="assessment_activities")
    op.drop_index(op.f("ix_assessment_activities_user_id"), table_name="assessment_activities")
    op.drop_index(
        op.f("ix_assessment_activities_assessment_id"),
        table_name="assessment_activities",
    )
    op.drop_index(op.f("ix_assessment_activities_id"), table_name="assessment_activities")
    op.drop_table("assessment_activities")
