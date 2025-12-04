"""update_3_6_1_label

Revision ID: 82edd9dc1668
Revises: 0b9084a9f57f
Create Date: 2025-12-04 16:17:28.232395

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '82edd9dc1668'
down_revision: Union[str, Sequence[str], None] = '0b9084a9f57f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - simplify 3.6.1 label."""
    conn = op.get_bind()

    conn.execute(sa.text("""
        UPDATE checklist_items
        SET label = 'Monthly BaRCo Reports were submitted'
        WHERE item_id = '3_6_1_count'
    """))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(sa.text("""
        UPDATE checklist_items
        SET label = 'Please supply the number of documents submitted:
_____ Monthly BaRCo Reports were submitted'
        WHERE item_id = '3_6_1_count'
    """))
