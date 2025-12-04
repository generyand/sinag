"""update_mov_description_4_1_4_3_6_1

Revision ID: 0b9084a9f57f
Revises: b94d1a41609c
Create Date: 2025-12-04 16:15:18.476945

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0b9084a9f57f'
down_revision: Union[str, Sequence[str], None] = 'b94d1a41609c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - update mov_description for 4.1.4 and 3.6.1 count fields."""
    conn = op.get_bind()

    # Update 4_1_4_count mov_description
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Please supply the number of documents submitted:'
        WHERE item_id = '4_1_4_count'
    """))

    # Update 3_6_1_count mov_description
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Please supply the number of documents submitted:'
        WHERE item_id = '3_6_1_count'
    """))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Input field for number of quarterly accomplishment reports submitted'
        WHERE item_id = '4_1_4_count'
    """))

    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Input field for number of Monthly BaRCo Reports submitted'
        WHERE item_id = '3_6_1_count'
    """))
