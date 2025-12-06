"""update_1_1_1_bfdp_form_label

Revision ID: 8b2e4f1a9c3d
Revises: 6fa56c3e7208
Create Date: 2025-12-05 16:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8b2e4f1a9c3d"
down_revision: Union[str, Sequence[str], None] = "6fa56c3e7208"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - update 1.1.1 BFDP form label to include Three (3)."""
    conn = op.get_bind()

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'Three (3) BFDP Monitoring Form A of the DILG Advisory covering the 1st to 3rd quarter monitoring data signed by the City Director/C/MLGOO, Punong Barangay and Barangay Secretary'
        WHERE item_id = '1_1_1_bfdp_form'
    """)
    )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'BFDP Monitoring Form A of the DILG Advisory covering the 1st to 3rd quarter monitoring data signed by the City/Municipal C/MLGOO, Punong Barangay and Barangay Secretary'
        WHERE item_id = '1_1_1_bfdp_form'
    """)
    )
