"""add_option_group_to_checklist_items

Revision ID: f492caba063c
Revises: bf1d501ee4c3
Create Date: 2025-11-27 17:07:16.494556

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f492caba063c'
down_revision: Union[str, Sequence[str], None] = 'bf1d501ee4c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add option_group column to checklist_items and update indicator 4.8.4."""
    # Add option_group column
    op.add_column('checklist_items', sa.Column('option_group', sa.String(length=50), nullable=True))

    # Update indicator 4.8.4 checklist items with option_group values
    # Option A items
    op.execute("""
        UPDATE checklist_items
        SET option_group = 'Option A'
        WHERE item_id IN ('4_8_4_option_a_check', '4_8_4_cert_a', '4_8_4_physical_percentage')
    """)

    # Option B items
    op.execute("""
        UPDATE checklist_items
        SET option_group = 'Option B'
        WHERE item_id IN ('4_8_4_option_b_check', '4_8_4_cert_b', '4_8_4_amount_utilized', '4_8_4_amount_allocated')
    """)


def downgrade() -> None:
    """Remove option_group column from checklist_items."""
    op.drop_column('checklist_items', 'option_group')
