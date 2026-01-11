"""add_deadline_windows

Revision ID: 4c800c19753b
Revises: c1a2b3d4e5f6
Create Date: 2026-01-04 11:42:53.420723

This migration adds:
1. Deadline window configuration fields to assessment_years (per-year settings)
2. Per-assessment calculated deadline fields to assessments
3. assessment_deadline_extensions table for MLGOO-granted extensions
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4c800c19753b"
down_revision: Union[str, Sequence[str], None] = "c1a2b3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add deadline window columns to assessment_years
    # These configure how many days BLGUs have for each type of deadline
    op.add_column(
        "assessment_years",
        sa.Column("submission_window_days", sa.Integer(), nullable=True, server_default="60"),
    )
    op.add_column(
        "assessment_years",
        sa.Column("rework_window_days", sa.Integer(), nullable=True, server_default="5"),
    )
    op.add_column(
        "assessment_years",
        sa.Column("calibration_window_days", sa.Integer(), nullable=True, server_default="3"),
    )

    # 2. Add per-assessment deadline columns
    # These are calculated when rework/calibration is triggered
    op.add_column(
        "assessments", sa.Column("per_assessment_rework_deadline", sa.DateTime(), nullable=True)
    )
    op.add_column(
        "assessments",
        sa.Column("per_assessment_calibration_deadline", sa.DateTime(), nullable=True),
    )

    # 3. Create assessment_deadline_extensions table
    # For MLGOO to grant per-assessment deadline extensions
    op.create_table(
        "assessment_deadline_extensions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("assessment_id", sa.Integer(), nullable=False),
        sa.Column("extended_by", sa.Integer(), nullable=True),
        sa.Column("extension_type", sa.String(length=20), nullable=False),
        sa.Column("original_deadline", sa.DateTime(timezone=True), nullable=False),
        sa.Column("new_deadline", sa.DateTime(timezone=True), nullable=False),
        sa.Column("additional_days", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["extended_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_assessment_deadline_extensions_assessment",
        "assessment_deadline_extensions",
        ["assessment_id"],
        unique=False,
    )
    op.create_index(
        "ix_assessment_deadline_extensions_created_at_desc",
        "assessment_deadline_extensions",
        [sa.text("created_at DESC")],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop assessment_deadline_extensions table and indexes
    op.drop_index(
        "ix_assessment_deadline_extensions_created_at_desc",
        table_name="assessment_deadline_extensions",
    )
    op.drop_index(
        "ix_assessment_deadline_extensions_assessment", table_name="assessment_deadline_extensions"
    )
    op.drop_table("assessment_deadline_extensions")

    # Remove per-assessment deadline columns
    op.drop_column("assessments", "per_assessment_calibration_deadline")
    op.drop_column("assessments", "per_assessment_rework_deadline")

    # Remove deadline window columns from assessment_years
    op.drop_column("assessment_years", "calibration_window_days")
    op.drop_column("assessment_years", "rework_window_days")
    op.drop_column("assessment_years", "submission_window_days")
