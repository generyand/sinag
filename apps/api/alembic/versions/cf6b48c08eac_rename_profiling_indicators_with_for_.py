"""rename_profiling_indicators_with_for_profiling_suffix

Revision ID: cf6b48c08eac
Revises: b194ae4705da
Create Date: 2025-12-12 16:34:59.659751

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "cf6b48c08eac"
down_revision: Union[str, Sequence[str], None] = "b194ae4705da"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename indicators 4.1.7 and 4.9 to include (FOR PROFILING) suffix."""
    # Update 4.1.7: Move "For Profiling" to end as "(FOR PROFILING)"
    op.execute(
        "UPDATE indicators "
        "SET name = 'Referral Network: Presence of referral system and directory (FOR PROFILING)', "
        "updated_at = NOW() "
        "WHERE indicator_code = '4.1.7'"
    )

    # Update 4.9: Add "(FOR PROFILING)" to the end
    op.execute(
        "UPDATE indicators "
        "SET name = 'Halina''t Magtanim ng Prutas at Gulay (HAPAG) sa Barangay Project (FOR PROFILING)', "
        "updated_at = NOW() "
        "WHERE indicator_code = '4.9'"
    )


def downgrade() -> None:
    """Revert indicator names to original."""
    # Revert 4.1.7
    op.execute(
        "UPDATE indicators "
        "SET name = 'Referral Network (For Profiling): Presence of referral system and directory', "
        "updated_at = NOW() "
        "WHERE indicator_code = '4.1.7'"
    )

    # Revert 4.9
    op.execute(
        "UPDATE indicators "
        "SET name = 'Halina''t Magtanim ng Prutas at Gulay (HAPAG) sa Barangay Project', "
        "updated_at = NOW() "
        "WHERE indicator_code = '4.9'"
    )
