"""add_calibrated_area_ids_to_assessments

Revision ID: 298c4eb4b84e
Revises: de1d0f3186e7
Create Date: 2025-11-26 21:49:41.542600

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "298c4eb4b84e"
down_revision: Union[str, Sequence[str], None] = "de1d0f3186e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add calibrated_area_ids JSON column to track per-area calibration."""
    op.add_column("assessments", sa.Column("calibrated_area_ids", sa.JSON(), nullable=True))


def downgrade() -> None:
    """Remove calibrated_area_ids column from assessments table."""
    op.drop_column("assessments", "calibrated_area_ids")
