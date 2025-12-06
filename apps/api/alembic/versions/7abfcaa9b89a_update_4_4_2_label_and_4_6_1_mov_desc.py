"""update_4_4_2_label_and_4_6_1_mov_desc

Revision ID: 7abfcaa9b89a
Revises: b60fa0700e4c
Create Date: 2025-12-04 16:51:00.784601

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7abfcaa9b89a"
down_revision: Union[str, Sequence[str], None] = "b60fa0700e4c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - update 4.4.2 label and 4.6.1 mov_description."""
    conn = op.get_bind()

    # 1. Update 4.4.2 label from "Number of Kasambahay Reports submitted" to "Kasambahay reports were submitted"
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'Kasambahay reports were submitted'
        WHERE item_id = '4_4_2_count'
    """)
    )

    # 2. Update 4.6.1 mov_description to "Please supply the required information:"
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Please supply the required information:'
        WHERE item_id = '4_6_1_date'
    """)
    )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'Number of Kasambahay Reports submitted'
        WHERE item_id = '4_4_2_count'
    """)
    )

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Date of approval for the GAD Focal Point System'
        WHERE item_id = '4_6_1_date'
    """)
    )
