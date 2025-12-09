"""add_missing_submitted_at_columns

Revision ID: 7c78cb0595d7
Revises: update_bbi_results_schema
Create Date: 2024-12-09

Adds missing *_submitted_at columns to assessments table:
- rework_submitted_at: When BLGU resubmitted after assessor rework request
- calibration_submitted_at: When BLGU resubmitted after validator calibration request
- mlgoo_recalibration_submitted_at: When BLGU resubmitted after MLGOO RE-calibration request

NOTE: This migration was applied directly to Supabase. This file exists for codebase sync.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7c78cb0595d7"
down_revision: Union[str, None] = "update_bbi_results_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing *_submitted_at columns to assessments table
    op.add_column(
        "assessments",
        sa.Column("rework_submitted_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "assessments",
        sa.Column("calibration_submitted_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "assessments",
        sa.Column("mlgoo_recalibration_submitted_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("assessments", "mlgoo_recalibration_submitted_at")
    op.drop_column("assessments", "calibration_submitted_at")
    op.drop_column("assessments", "rework_submitted_at")
