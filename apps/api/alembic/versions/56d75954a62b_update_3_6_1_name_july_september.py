"""update_3_6_1_name_july_september

Revision ID: 56d75954a62b
Revises: 4957c4a13061
Create Date: 2025-12-07 19:12:01.921070

Change 3.6.1 name from "in CY {year}" to "covering July-September {year}"
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "56d75954a62b"
down_revision: Union[str, Sequence[str], None] = "4957c4a13061"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update 3.6.1 indicator name."""
    conn = op.get_bind()

    conn.execute(
        sa.text("UPDATE indicators SET name = :name WHERE indicator_code = '3.6.1'"),
        {"name": "Conducted BaRCO on a monthly basis covering July-September {CY_CURRENT_YEAR}"},
    )
    print("Updated 3.6.1 name")


def downgrade() -> None:
    """Revert 3.6.1 indicator name."""
    conn = op.get_bind()

    conn.execute(
        sa.text("UPDATE indicators SET name = :name WHERE indicator_code = '3.6.1'"),
        {"name": "Conducted BaRCO on a monthly basis in {CY_CURRENT_YEAR}"},
    )
