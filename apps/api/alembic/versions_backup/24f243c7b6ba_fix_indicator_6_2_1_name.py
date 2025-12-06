"""fix_indicator_6_2_1_name

Revision ID: 24f243c7b6ba
Revises: f0c7b9b01747
Create Date: 2025-11-29 17:54:18.005611

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "24f243c7b6ba"
down_revision: Union[str, Sequence[str], None] = "f0c7b9b01747"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix indicator 6.2.1 name - was incorrectly set to 'Environmental Management'."""
    op.execute("""
        UPDATE indicators
        SET name = 'Presence of a Materials Recovery Facility (MRF)/Materials Recovery System (MRS)'
        WHERE indicator_code = '6.2.1'
    """)


def downgrade() -> None:
    """Revert indicator 6.2.1 name."""
    op.execute("""
        UPDATE indicators
        SET name = 'Environmental Management'
        WHERE indicator_code = '6.2.1'
    """)
