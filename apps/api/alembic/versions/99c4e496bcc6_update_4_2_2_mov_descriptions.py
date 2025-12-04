"""update_4_2_2_mov_descriptions

Revision ID: 99c4e496bcc6
Revises: 80bf6d4a6cac
Create Date: 2025-12-04 16:01:26.598138

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99c4e496bcc6'
down_revision: Union[str, Sequence[str], None] = '80bf6d4a6cac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Updates 4.2.2 checklist items:
    - Update label and mov_description for BHW and BHO/BHAsst items
    """
    conn = op.get_bind()

    # Update 4_2_2_bhw label and mov_description
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET label = '1. Accredited Barangay Health Worker (BHW); and/or',
            mov_description = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the Appointment of BHW covering January to October 2023'
        WHERE item_id = '4_2_2_bhw'
    """))

    # Update 4_2_2_bho label and mov_description
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET label = '2.Barangay Health Officer (BHO) or Barangay Health Assistant (BHAsst)',
            mov_description = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the Appointment of BHO or BHAsst covering January to October 2023'
        WHERE item_id = '4_2_2_bho'
    """))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    # Revert 4_2_2_bhw
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET label = 'Accredited Barangay Health Worker (BHW); AND/OR',
            mov_description = 'Verification of uploaded EO/issuance for BHW appointment (Option 1)'
        WHERE item_id = '4_2_2_bhw'
    """))

    # Revert 4_2_2_bho
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET label = 'Barangay Health Officer (BHO) or Barangay Health Assistant (BHAsst)',
            mov_description = 'Verification of uploaded EO/issuance for BHO/BHAsst appointment (Option 2)'
        WHERE item_id = '4_2_2_bho'
    """))
