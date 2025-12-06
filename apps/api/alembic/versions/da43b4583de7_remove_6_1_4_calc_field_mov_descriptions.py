"""remove_6_1_4_calc_field_mov_descriptions

Revision ID: da43b4583de7
Revises: c396e1bbcddc
Create Date: 2025-12-04 17:12:24.541194

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "da43b4583de7"
down_revision: Union[str, Sequence[str], None] = "c396e1bbcddc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - remove 'Please supply the required information' from 6.1.4 calculation fields."""
    conn = op.get_bind()

    # Remove mov_description from all 6.1.4 calculation fields except report_count
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET mov_description = NULL
        WHERE item_id IN (
            '6_1_4_physical_accomplished',
            '6_1_4_physical_reflected',
            '6_1_4_financial_utilized',
            '6_1_4_financial_allocated'
        )
    """)
    )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET mov_description = 'Please supply the required information:'
        WHERE item_id IN (
            '6_1_4_physical_accomplished',
            '6_1_4_physical_reflected',
            '6_1_4_financial_utilized',
            '6_1_4_financial_allocated'
        )
    """)
    )
