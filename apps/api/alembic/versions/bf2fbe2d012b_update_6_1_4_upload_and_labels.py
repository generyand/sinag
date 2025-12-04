"""update_6_1_4_upload_and_labels

Revision ID: bf2fbe2d012b
Revises: e8287d28afc8
Create Date: 2025-12-04 17:01:45.853011

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bf2fbe2d012b'
down_revision: Union[str, Sequence[str], None] = 'e8287d28afc8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - update 6.1.4 upload checkbox labels."""
    conn = op.get_bind()

    # Update 6_1_4_upload label and mov_description
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET label = 'Three (3) Monthly Accomplishment Reports covering July-September 2023',
            mov_description = 'Verification of uploaded Monthly Accomplishment Reports'
        WHERE item_id = '6_1_4_upload'
    """))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(sa.text("""
        UPDATE checklist_items
        SET label = '(PHYSICAL or/and FINANCIAL) Three (3) Monthly Accomplishment Reports covering July-September 2023',
            mov_description = 'Verification of uploaded Monthly Accomplishment Reports (PHYSICAL or/and FINANCIAL)'
        WHERE item_id = '6_1_4_upload'
    """))
