"""fix_4_6_1_date_item_id

Revision ID: f43f5fff4d98
Revises: 7abfcaa9b89a
Create Date: 2025-12-04 16:53:30.894395

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f43f5fff4d98'
down_revision: Union[str, Sequence[str], None] = '7abfcaa9b89a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - fix 4.6.1 date field with correct item_id."""
    conn = op.get_bind()

    # Update 4.6.1 date field - correct item_id is 4_6_1_date_of_approval
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Please supply the required information:',
            item_type = 'date_input',
            requires_document_count = false
        WHERE item_id = '4_6_1_date_of_approval'
    """))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Date of approval for the GAD Focal Point System',
            item_type = 'checkbox',
            requires_document_count = true
        WHERE item_id = '4_6_1_date_of_approval'
    """))
