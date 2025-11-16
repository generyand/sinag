"""increase_checklist_item_field_lengths

Increase field lengths in checklist_items table:
- group_name: VARCHAR(100) → VARCHAR(255)
- item_id: VARCHAR(20) → VARCHAR(50)

This accommodates longer indicator section names and item identifiers.

Revision ID: 469f24e4f57a
Revises: 00bed49217f7
Create Date: 2025-11-16 18:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '469f24e4f57a'
down_revision: Union[str, Sequence[str], None] = '00bed49217f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Increase field lengths in checklist_items table."""
    # Increase group_name length
    op.alter_column('checklist_items', 'group_name',
                    existing_type=sa.VARCHAR(length=100),
                    type_=sa.VARCHAR(length=255),
                    existing_nullable=True)

    # Increase item_id length
    op.alter_column('checklist_items', 'item_id',
                    existing_type=sa.VARCHAR(length=20),
                    type_=sa.VARCHAR(length=50),
                    existing_nullable=False)

    print("✅ Increased checklist_items.group_name length to VARCHAR(255)")
    print("✅ Increased checklist_items.item_id length to VARCHAR(50)")


def downgrade() -> None:
    """Revert field lengths in checklist_items table."""
    # Revert item_id length
    op.alter_column('checklist_items', 'item_id',
                    existing_type=sa.VARCHAR(length=50),
                    type_=sa.VARCHAR(length=20),
                    existing_nullable=False)

    # Revert group_name length
    op.alter_column('checklist_items', 'group_name',
                    existing_type=sa.VARCHAR(length=255),
                    type_=sa.VARCHAR(length=100),
                    existing_nullable=True)
