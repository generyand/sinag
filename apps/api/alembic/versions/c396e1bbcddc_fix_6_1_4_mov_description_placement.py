"""fix_6_1_4_mov_description_placement

Revision ID: c396e1bbcddc
Revises: 8744586e4a85
Create Date: 2025-12-04 17:08:44.860556

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c396e1bbcddc'
down_revision: Union[str, Sequence[str], None] = '8744586e4a85'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - fix 6.1.4 mov_description placement."""
    conn = op.get_bind()

    # Remove mov_description from upload checkbox
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = NULL
        WHERE item_id = '6_1_4_upload'
    """))

    # Add mov_description to report_count field (the calculation_field)
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Please supply the number of documents submitted'
        WHERE item_id = '6_1_4_report_count'
    """))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Please supply the number of documents submitted'
        WHERE item_id = '6_1_4_upload'
    """))

    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = NULL
        WHERE item_id = '6_1_4_report_count'
    """))
