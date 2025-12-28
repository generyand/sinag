"""move_4_3_4_mov_description_to_first_field

Revision ID: 84ad5b2dfad0
Revises: 4736110d6eef
Create Date: 2025-12-28 23:27:07.077356

Move the "Please supply the required information:" mov_description from the second
calculation field to the first one in indicator 4.3.4, so the orange box appears
before both input fields instead of between them.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '84ad5b2dfad0'
down_revision: Union[str, Sequence[str], None] = '4736110d6eef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Move mov_description from second to first calculation field in 4.3.4."""
    # Add mov_description to the first physical calculation field
    op.execute(
        """
        UPDATE checklist_items
        SET mov_description = 'Please supply the required information:'
        WHERE item_id = '4_3_4_physical_reflected'
        """
    )

    # Remove mov_description from the second physical calculation field
    op.execute(
        """
        UPDATE checklist_items
        SET mov_description = NULL
        WHERE item_id = '4_3_4_physical_accomplished'
        """
    )


def downgrade() -> None:
    """Revert: move mov_description back from first to second calculation field."""
    # Remove mov_description from the first physical calculation field
    op.execute(
        """
        UPDATE checklist_items
        SET mov_description = NULL
        WHERE item_id = '4_3_4_physical_reflected'
        """
    )

    # Add mov_description back to the second physical calculation field
    op.execute(
        """
        UPDATE checklist_items
        SET mov_description = 'Please supply the required information:'
        WHERE item_id = '4_3_4_physical_accomplished'
        """
    )
