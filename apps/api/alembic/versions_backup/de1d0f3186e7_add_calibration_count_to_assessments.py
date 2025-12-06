"""add_calibration_count_to_assessments

Revision ID: de1d0f3186e7
Revises: 3875cc740ca0
Create Date: 2025-11-25 23:00:27.210277

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "de1d0f3186e7"
down_revision: Union[str, Sequence[str], None] = "3875cc740ca0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add calibration_count column to assessments table."""
    op.add_column(
        "assessments",
        sa.Column("calibration_count", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    """Remove calibration_count column from assessments table."""
    op.drop_column("assessments", "calibration_count")
