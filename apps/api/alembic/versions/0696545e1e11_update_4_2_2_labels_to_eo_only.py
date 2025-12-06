"""update_4_2_2_labels_to_eo_only

Revision ID: 0696545e1e11
Revises: 99c4e496bcc6
Create Date: 2025-12-04 16:04:23.882765

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0696545e1e11"
down_revision: Union[str, Sequence[str], None] = "99c4e496bcc6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - change labels to just show the EO description."""
    conn = op.get_bind()

    # Update 4_2_2_bhw label to just the EO description
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the Appointment of BHW covering January to October 2023'
        WHERE item_id = '4_2_2_bhw'
    """)
    )

    # Update 4_2_2_bho label to just the EO description
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the Appointment of BHO or BHAsst covering January to October 2023'
        WHERE item_id = '4_2_2_bho'
    """)
    )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = '1. Accredited Barangay Health Worker (BHW); and/or'
        WHERE item_id = '4_2_2_bhw'
    """)
    )

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = '2.Barangay Health Officer (BHO) or Barangay Health Assistant (BHAsst)'
        WHERE item_id = '4_2_2_bho'
    """)
    )
