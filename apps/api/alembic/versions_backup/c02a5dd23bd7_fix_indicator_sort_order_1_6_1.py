"""fix_indicator_sort_order_1_6_1

Revision ID: c02a5dd23bd7
Revises: d27e9678b613
Create Date: 2025-11-19 08:48:03.627738

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c02a5dd23bd7"
down_revision: Union[str, Sequence[str], None] = "d27e9678b613"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix sort_order for indicators 1.6.1.1, 1.6.1.2, 1.6.1.3 to ensure correct ordering."""
    # Update sort_order based on indicator_code natural ordering
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
    """Reset sort_order to original values."""
    # Set back to 0 (or whatever the original was)
    op.execute("""
        UPDATE indicators
        SET sort_order = 0
        WHERE indicator_code IN ('1.6.1.1', '1.6.1.2', '1.6.1.3')
    """)
