"""add_parallel_calibration_fields

Revision ID: 9512065761d8
Revises: 46894143a8b0
Create Date: 2025-11-27 22:13:56.533686

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9512065761d8'
down_revision: Union[str, Sequence[str], None] = '46894143a8b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add parallel calibration fields to assessments table."""
    # pending_calibrations: Stores list of pending calibrations from multiple validators
    # Format: [{"validator_id": 1, "governance_area_id": 2, "requested_at": "...", "approved": false}, ...]
    op.add_column('assessments', sa.Column('pending_calibrations', sa.JSON(), nullable=True))

    # calibration_summaries_by_area: Stores AI summaries per governance area
    # Format: {"1": {"ceb": {...}, "en": {...}}, "2": {...}}
    op.add_column('assessments', sa.Column('calibration_summaries_by_area', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Remove parallel calibration fields from assessments table."""
    op.drop_column('assessments', 'calibration_summaries_by_area')
    op.drop_column('assessments', 'pending_calibrations')
