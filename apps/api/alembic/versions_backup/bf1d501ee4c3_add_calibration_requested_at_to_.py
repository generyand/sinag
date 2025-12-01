"""add_calibration_requested_at_to_assessments

Revision ID: bf1d501ee4c3
Revises: e1abc802507e
Create Date: 2025-11-27 14:21:25.524125

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'bf1d501ee4c3'
down_revision: Union[str, Sequence[str], None] = 'e1abc802507e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add calibration_requested_at column to assessments table."""
    op.add_column('assessments', sa.Column('calibration_requested_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Remove calibration_requested_at column from assessments table."""
    op.drop_column('assessments', 'calibration_requested_at')
