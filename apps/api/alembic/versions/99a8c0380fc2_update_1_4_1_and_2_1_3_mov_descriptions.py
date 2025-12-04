"""update_1_4_1_and_2_1_3_mov_descriptions

Revision ID: 99a8c0380fc2
Revises: da43b4583de7
Create Date: 2025-12-04 17:16:45.983277

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99a8c0380fc2'
down_revision: Union[str, Sequence[str], None] = 'da43b4583de7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - update mov_descriptions for 1.4.1 and 2.1.3."""
    conn = op.get_bind()

    # 1.4.1: Change mov_description to "Please supply the required information"
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Please supply the required information'
        WHERE item_id = '1_4_1_date_of_approval'
    """))

    # 2.1.3: Add mov_description to estimated_revenue field
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Please supply the required information'
        WHERE item_id = '2_1_3_estimated_revenue'
    """))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Date of Approval for the Barangay Appropriation Ordinance'
        WHERE item_id = '1_4_1_date_of_approval'
    """))

    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = NULL
        WHERE item_id = '2_1_3_estimated_revenue'
    """))
