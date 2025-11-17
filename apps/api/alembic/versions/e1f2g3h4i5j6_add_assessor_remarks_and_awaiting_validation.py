"""Add assessor_remarks and AWAITING_FINAL_VALIDATION status

Revision ID: e1f2g3h4i5j6
Revises: dfdbe6a41d82
Create Date: 2025-11-17 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e1f2g3h4i5j6'
down_revision: Union[str, Sequence[str], None] = 'dfdbe6a41d82'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add assessor_remarks column to assessment_responses table
    op.add_column(
        'assessment_responses',
        sa.Column('assessor_remarks', sa.Text(), nullable=True, comment='Manual remarks from assessor for validators')
    )

    # Add AWAITING_FINAL_VALIDATION to assessment_status_enum
    op.execute("ALTER TYPE assessment_status_enum ADD VALUE IF NOT EXISTS 'AWAITING_FINAL_VALIDATION'")


def downgrade() -> None:
    """Downgrade schema."""
    # Remove assessor_remarks column
    op.drop_column('assessment_responses', 'assessor_remarks')

    # Note: Cannot remove enum value in PostgreSQL, would require recreating the enum type
    # This is safe to leave as it won't cause issues
