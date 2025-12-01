"""add code to governance areas

Revision ID: a1b2c3d4e5f7
Revises: ucz4sottgz50
Create Date: 2025-11-17 04:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, Sequence[str], None] = 'ucz4sottgz50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add code column to governance_areas table for UI logo mapping.

    Note: For fresh databases, the code column is already created in the initial migration.
    This migration handles existing databases that need the column added.
    """
    conn = op.get_bind()

    # Check if code column already exists (fresh database)
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'governance_areas' AND column_name = 'code'"
    ))
    if result.fetchone() is not None:
        # Column already exists - nothing to do
        return

    # Add code column for existing databases
    op.add_column('governance_areas', sa.Column('code', sa.String(length=10), nullable=True))
    op.create_index(op.f('ix_governance_areas_code'), 'governance_areas', ['code'], unique=False)

    # Update existing governance areas with their codes
    conn.execute(sa.text("""
        UPDATE governance_areas
        SET code = CASE name
            WHEN 'Financial Administration and Sustainability' THEN 'FI'
            WHEN 'Disaster Preparedness' THEN 'DI'
            WHEN 'Safety, Peace and Order' THEN 'SA'
            WHEN 'Social Protection and Sensitivity' THEN 'SO'
            WHEN 'Business-Friendliness and Competitiveness' THEN 'BU'
            WHEN 'Environmental Management' THEN 'EN'
            ELSE NULL
        END
    """))

    op.alter_column('governance_areas', 'code', nullable=False)


def downgrade() -> None:
    """Remove code column from governance_areas table."""
    op.drop_index(op.f('ix_governance_areas_code'), table_name='governance_areas')
    op.drop_column('governance_areas', 'code')
