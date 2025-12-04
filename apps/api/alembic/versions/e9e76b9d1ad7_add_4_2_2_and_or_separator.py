"""add_4_2_2_and_or_separator

Revision ID: e9e76b9d1ad7
Revises: a35a1f122e1b
Create Date: 2025-12-04 16:36:26.317313

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e9e76b9d1ad7'
down_revision: Union[str, Sequence[str], None] = 'a35a1f122e1b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add AND/OR separator for 4.2.2."""
    conn = op.get_bind()

    # Get the indicator_id for 4.2.2
    result = conn.execute(sa.text("""
        SELECT id FROM indicators WHERE indicator_code = '4.2.2'
    """))
    row = result.fetchone()

    if row:
        indicator_id = row[0]

        # Check if AND/OR separator already exists
        existing = conn.execute(sa.text("""
            SELECT id FROM checklist_items
            WHERE item_id = '4_2_2_and_or_separator'
        """)).fetchone()

        if not existing:
            # Insert AND/OR separator for 4.2.2
            conn.execute(sa.text("""
                INSERT INTO checklist_items (
                    indicator_id, item_id, label, item_type,
                    required, display_order, option_group
                ) VALUES (
                    :ind_id, '4_2_2_and_or_separator', 'AND/OR', 'info_text',
                    false, 2, NULL
                )
            """), {"ind_id": indicator_id})

        # Update display_order for 4_2_2_bho to be after AND/OR separator
        conn.execute(sa.text("""
            UPDATE checklist_items
            SET display_order = 3, option_group = 'Option B'
            WHERE item_id = '4_2_2_bho'
        """))

        # Update option_group for 4_2_2_bhw
        conn.execute(sa.text("""
            UPDATE checklist_items
            SET option_group = 'Option A'
            WHERE item_id = '4_2_2_bhw'
        """))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    # Remove AND/OR separator for 4.2.2
    conn.execute(sa.text("""
        DELETE FROM checklist_items
        WHERE item_id = '4_2_2_and_or_separator'
    """))

    # Reset display_order and option_groups
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET display_order = 2, option_group = NULL
        WHERE item_id = '4_2_2_bho'
    """))

    conn.execute(sa.text("""
        UPDATE checklist_items
        SET option_group = NULL
        WHERE item_id = '4_2_2_bhw'
    """))
