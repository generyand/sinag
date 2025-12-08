"""fix_3_2_3_sort_order

Revision ID: a3d423dfa05f
Revises: f882c7bc5f45
Create Date: 2025-12-04

Fixes the sort_order for indicator 3.2.3 so it appears after 3.2.2 in the list.

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a3d423dfa05f"
down_revision: Union[str, Sequence[str], None] = "f882c7bc5f45"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix sort_order for indicator 3.2.3 using raw SQL.

    NOTE: Using raw SQL instead of ORM because the model may have columns
    that are added by later migrations, causing compatibility issues.
    """
    print("Fixing sort_order for indicator 3.2.3...")

    # Update sort_order for 3.2.1
    op.execute(
        """
        UPDATE indicators SET sort_order = 1
        WHERE indicator_code = '3.2.1'
        """
    )
    print("  - Updated 3.2.1 sort_order to 1")

    # Update sort_order for 3.2.2
    op.execute(
        """
        UPDATE indicators SET sort_order = 2
        WHERE indicator_code = '3.2.2'
        """
    )
    print("  - Updated 3.2.2 sort_order to 2")

    # Update sort_order for 3.2.3
    op.execute(
        """
        UPDATE indicators SET sort_order = 3
        WHERE indicator_code = '3.2.3'
        """
    )
    print("  - Updated 3.2.3 sort_order to 3")

    print("Migration complete!")


def downgrade() -> None:
    """Revert changes."""
    pass
