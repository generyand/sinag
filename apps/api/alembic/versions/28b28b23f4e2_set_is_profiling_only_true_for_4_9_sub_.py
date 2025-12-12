"""set_is_profiling_only_true_for_4_9_sub_indicators

Revision ID: 28b28b23f4e2
Revises: 7f6999516563
Create Date: 2025-12-12 16:50:58.029000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "28b28b23f4e2"
down_revision: Union[str, Sequence[str], None] = "7f6999516563"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Set is_profiling_only=True for all 4.9.x sub-indicators.

    These sub-indicators inherit the profiling-only status from parent 4.9
    (HAPAG sa Barangay Project) and should not affect SGLGB pass/fail calculation.
    """
    # Update all 4.9.x sub-indicators (4.9.1 through 4.9.5)
    op.execute(
        "UPDATE indicators "
        "SET is_profiling_only = true, "
        "updated_at = NOW() "
        "WHERE indicator_code LIKE '4.9.%'"
    )


def downgrade() -> None:
    """Revert is_profiling_only to false for 4.9.x sub-indicators."""
    op.execute(
        "UPDATE indicators "
        "SET is_profiling_only = false, "
        "updated_at = NOW() "
        "WHERE indicator_code LIKE '4.9.%'"
    )
