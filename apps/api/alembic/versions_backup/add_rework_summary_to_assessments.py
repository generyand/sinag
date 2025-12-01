"""Add rework_summary column to assessments table for AI-generated summaries

Revision ID: add_rework_summary
Revises: 383d9bdd5c19
Create Date: 2025-11-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_rework_summary'
down_revision: Union[str, Sequence[str], None] = '383d9bdd5c19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add rework_summary JSON column to store AI-generated rework summaries
    op.add_column(
        'assessments',
        sa.Column('rework_summary', postgresql.JSONB(astext_type=sa.Text()), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Remove rework_summary column
    op.drop_column('assessments', 'rework_summary')
