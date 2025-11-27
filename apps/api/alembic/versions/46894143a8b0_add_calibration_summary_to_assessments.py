"""add_calibration_summary_to_assessments

Revision ID: 46894143a8b0
Revises: 5a8797bc9a86
Create Date: 2025-11-27 20:04:34.948062

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '46894143a8b0'
down_revision: Union[str, Sequence[str], None] = '5a8797bc9a86'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add calibration_summary column to assessments table."""
    op.add_column('assessments', sa.Column('calibration_summary', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Remove calibration_summary column from assessments table."""
    op.drop_column('assessments', 'calibration_summary')
