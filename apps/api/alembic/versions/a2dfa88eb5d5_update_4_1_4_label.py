"""update_4_1_4_label

Revision ID: a2dfa88eb5d5
Revises: 82edd9dc1668
Create Date: 2025-12-04 16:19:59.377574

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a2dfa88eb5d5"
down_revision: Union[str, Sequence[str], None] = "82edd9dc1668"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - simplify 4.1.4 label to remove redundant text."""
    conn = op.get_bind()

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'Quarterly Accomplishment Reports were submitted'
        WHERE item_id = '4_1_4_count'
    """)
    )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'Please supply the number of documents submitted:
_____ Quarterly Accomplishment Reports were submitted'
        WHERE item_id = '4_1_4_count'
    """)
    )
