"""fix_complete_1_6_1_ordering

Revision ID: 61cf29cca0ce
Revises: c02a5dd23bd7
Create Date: 2025-11-19 08:53:01.545866

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '61cf29cca0ce'
down_revision: Union[str, Sequence[str], None] = 'c02a5dd23bd7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix complete ordering for all 1.6.1.x indicators by resetting and reordering."""
    # First, reset all sort_orders to ensure clean slate
    op.execute("""
        UPDATE indicators
        SET sort_order = 0
        WHERE indicator_code LIKE '1.6.1%'
    """)

    # Now set them in correct order based on indicator_code
    op.execute("""
        UPDATE indicators
        SET sort_order = 1
        WHERE indicator_code = '1.6.1.1'
    """)

    op.execute("""
        UPDATE indicators
        SET sort_order = 2
        WHERE indicator_code = '1.6.1.2'
    """)

    op.execute("""
        UPDATE indicators
        SET sort_order = 3
        WHERE indicator_code = '1.6.1.3'
    """)


def downgrade() -> None:
    """Reset sort_order to 0 for all 1.6.1.x indicators."""
    op.execute("""
        UPDATE indicators
        SET sort_order = 0
        WHERE indicator_code LIKE '1.6.1%'
    """)
