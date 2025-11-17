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

    The code field uses 2-letter abbreviations:
    - FI: Financial Administration and Sustainability
    - DI: Disaster Preparedness
    - SA: Safety, Peace and Order
    - SO: Social Protection and Sensitivity
    - BU: Business-Friendliness and Competitiveness
    - EN: Environmental Management
    """
    # Add code column
    op.add_column('governance_areas', sa.Column('code', sa.String(length=10), nullable=True))

    # Create index for faster lookups
    op.create_index(op.f('ix_governance_areas_code'), 'governance_areas', ['code'], unique=False)

    # Update existing governance areas with their codes
    conn = op.get_bind()
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

    # Make code column non-nullable after data migration
    op.alter_column('governance_areas', 'code', nullable=False)


def downgrade() -> None:
    """Remove code column from governance_areas table."""
    op.drop_index(op.f('ix_governance_areas_code'), table_name='governance_areas')
    op.drop_column('governance_areas', 'code')
