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
    """Increase field lengths in checklist_items table.

    Note: For fresh databases, these lengths are already set correctly in the base migration.
    """
    conn = op.get_bind()

    # Check current group_name length
    result = conn.execute(sa.text("""
        SELECT character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'checklist_items' AND column_name = 'group_name'
    """))
    row = result.fetchone()
    if row and row[0] == 255:
        # Already correct - fresh database
        return

    # Existing database - apply changes
    op.alter_column('checklist_items', 'group_name',
                    existing_type=sa.VARCHAR(length=100),
                    type_=sa.VARCHAR(length=255),
                    existing_nullable=True)

    op.alter_column('checklist_items', 'item_id',
                    existing_type=sa.VARCHAR(length=20),
                    type_=sa.VARCHAR(length=50),
                    existing_nullable=False)


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
