"""Add reviewed_by field to track assessor who completed review

Revision ID: 78a204fd5bc8
Revises: 6da076270c03
Create Date: 2025-11-21 14:10:38.960912

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '78a204fd5bc8'
down_revision: Union[str, Sequence[str], None] = '6da076270c03'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add reviewed_by column to track which assessor completed the review
    op.add_column('assessments', sa.Column('reviewed_by', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_assessments_reviewed_by', 'assessments', 'users', ['reviewed_by'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    """Downgrade schema."""
    # Remove reviewed_by column
    op.drop_constraint('fk_assessments_reviewed_by', 'assessments', type_='foreignkey')
    op.drop_column('assessments', 'reviewed_by')
