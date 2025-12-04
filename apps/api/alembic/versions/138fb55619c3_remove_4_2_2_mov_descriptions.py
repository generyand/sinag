"""remove_4_2_2_mov_descriptions

Revision ID: 138fb55619c3
Revises: 0696545e1e11
Create Date: 2025-12-04 16:06:19.881088

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '138fb55619c3'
down_revision: Union[str, Sequence[str], None] = '0696545e1e11'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - remove redundant mov_descriptions from 4.2.2."""
    conn = op.get_bind()

    # Set mov_description to NULL for both items
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = NULL
        WHERE item_id IN ('4_2_2_bhw', '4_2_2_bho')
    """))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the Appointment of BHW covering January to October 2023'
        WHERE item_id = '4_2_2_bhw'
    """))

    conn.execute(sa.text("""
        UPDATE checklist_items
        SET mov_description = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the Appointment of BHO or BHAsst covering January to October 2023'
        WHERE item_id = '4_2_2_bho'
    """))
