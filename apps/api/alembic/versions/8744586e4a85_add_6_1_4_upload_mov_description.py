"""add_6_1_4_upload_mov_description

Revision ID: 8744586e4a85
Revises: bf2fbe2d012b
Create Date: 2025-12-04 17:04:57.494895

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8744586e4a85'
down_revision: Union[str, Sequence[str], None] = 'bf2fbe2d012b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - update 6.1.4 upload mov_description to show yellow box."""
    conn = op.get_bind()

    # Update 6_1_4_upload mov_description to show "Please supply the number of documents submitted"
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Please supply the number of documents submitted'
        WHERE item_id = '6_1_4_upload'
    """))

    # Remove mov_description from report_count since the yellow box is now on the upload checkbox
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = NULL
        WHERE item_id = '6_1_4_report_count'
    """))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Verification of uploaded Monthly Accomplishment Reports'
        WHERE item_id = '6_1_4_upload'
    """))

    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Please supply the number of documents submitted:'
        WHERE item_id = '6_1_4_report_count'
    """))
