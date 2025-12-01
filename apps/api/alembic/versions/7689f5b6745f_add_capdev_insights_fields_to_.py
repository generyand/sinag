"""add_capdev_insights_fields_to_assessments

Revision ID: 7689f5b6745f
Revises: 0ddebee1b7ac
Create Date: 2025-12-01 18:56:08.029767

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7689f5b6745f'
down_revision: Union[str, Sequence[str], None] = '0ddebee1b7ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add CapDev (Capacity Development) AI insights fields to assessments
    op.add_column('assessments', sa.Column('capdev_insights', sa.JSON(), nullable=True))
    op.add_column('assessments', sa.Column('capdev_insights_generated_at', sa.DateTime(), nullable=True))
    op.add_column('assessments', sa.Column('capdev_insights_status', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('assessments', 'capdev_insights_status')
    op.drop_column('assessments', 'capdev_insights_generated_at')
    op.drop_column('assessments', 'capdev_insights')
