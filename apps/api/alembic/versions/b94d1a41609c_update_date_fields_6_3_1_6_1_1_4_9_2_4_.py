"""update_date_fields_6_3_1_6_1_1_4_9_2_4_9_3_4_9_5

Revision ID: b94d1a41609c
Revises: 138fb55619c3
Create Date: 2025-12-04 16:09:27.845377

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b94d1a41609c'
down_revision: Union[str, Sequence[str], None] = '138fb55619c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - change date fields to date_input type.

    Updates:
    - 6.3.1: 6_3_1_date_of_approval
    - 6.1.1: 6_1_1_date
    - 4.9.2: 4_9_2_date_of_approval
    - 4.9.3: 4_9_3_date_of_approval
    - 4.9.5: 4_9_5_date_of_approval
    """
    conn = op.get_bind()

    # Update all date fields to date_input type
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET item_type = 'date_input',
            requires_document_count = false
        WHERE item_id IN (
            '6_3_1_date_of_approval',
            '6_1_1_date',
            '4_9_2_date_of_approval',
            '4_9_3_date_of_approval',
            '4_9_5_date_of_approval'
        )
    """))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    # Revert to checkbox with requires_document_count
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET item_type = 'checkbox',
            requires_document_count = true
        WHERE item_id IN (
            '6_3_1_date_of_approval',
            '6_1_1_date',
            '4_9_2_date_of_approval',
            '4_9_3_date_of_approval',
            '4_9_5_date_of_approval'
        )
    """))
