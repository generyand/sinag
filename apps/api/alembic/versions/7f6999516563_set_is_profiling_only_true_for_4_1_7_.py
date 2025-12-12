"""set_is_profiling_only_true_for_4_1_7_and_4_2_2

Revision ID: 7f6999516563
Revises: dfc452bead53
Create Date: 2025-12-12 16:46:50.828065

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "7f6999516563"
down_revision: Union[str, Sequence[str], None] = "dfc452bead53"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Set is_profiling_only=True for indicators 4.1.7 and 4.2.2.

    These indicators are for profiling purposes only and should not
    affect the SGLGB pass/fail calculation (3+1 rule).
    """
    # Update indicator 4.1.7
    op.execute(
        "UPDATE indicators "
        "SET is_profiling_only = true, "
        "updated_at = NOW() "
        "WHERE indicator_code = '4.1.7'"
    )

    # Update indicator 4.2.2
    op.execute(
        "UPDATE indicators "
        "SET is_profiling_only = true, "
        "updated_at = NOW() "
        "WHERE indicator_code = '4.2.2'"
    )


def downgrade() -> None:
    """Revert is_profiling_only to false for indicators 4.1.7 and 4.2.2."""
    # Revert indicator 4.1.7
    op.execute(
        "UPDATE indicators "
        "SET is_profiling_only = false, "
        "updated_at = NOW() "
        "WHERE indicator_code = '4.1.7'"
    )

    # Revert indicator 4.2.2
    op.execute(
        "UPDATE indicators "
        "SET is_profiling_only = false, "
        "updated_at = NOW() "
        "WHERE indicator_code = '4.2.2'"
    )
