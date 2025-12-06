"""fix_item_type_for_count_fields

Revision ID: 593ff4320a55
Revises: 99a8c0380fc2
Create Date: 2025-12-04 17:45:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "593ff4320a55"
down_revision: Union[str, Sequence[str], None] = "99a8c0380fc2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - fix item_type for count fields to document_count."""
    conn = op.get_bind()

    # Fix item_type for 3_1_8_count
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET item_type = 'document_count'
        WHERE item_id = '3_1_8_count'
    """)
    )

    # Fix item_type for 3_1_10_count
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET item_type = 'document_count'
        WHERE item_id = '3_1_10_count'
    """)
    )

    # Fix item_type for 4_4_2_count
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET item_type = 'document_count'
        WHERE item_id = '4_4_2_count'
    """)
    )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET item_type = 'checkbox'
        WHERE item_id = '3_1_8_count'
    """)
    )

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET item_type = 'checkbox'
        WHERE item_id = '3_1_10_count'
    """)
    )

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET item_type = 'checkbox'
        WHERE item_id = '4_4_2_count'
    """)
    )
