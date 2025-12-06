"""update_6_1_4_report_count_label

Revision ID: e8287d28afc8
Revises: f43f5fff4d98
Create Date: 2025-12-04 16:59:16.263908

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e8287d28afc8"
down_revision: Union[str, Sequence[str], None] = "f43f5fff4d98"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - update 6.1.4 report count label."""
    conn = op.get_bind()

    # Update 6.1.4 report count label
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'Monthly Accomplishment Reports were submitted'
        WHERE item_id = '6_1_4_report_count'
    """)
    )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'Number of Monthly Accomplishment Reports submitted'
        WHERE item_id = '6_1_4_report_count'
    """)
    )
