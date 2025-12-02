"""add_option_groups_to_indicator_4_2_1

Revision ID: 8d66ae521094
Revises: 7346b2e75b9e
Create Date: 2025-12-02 23:32:10.518680

This migration adds option_group values to indicator 4.2.1's checklist items.

Indicator 4.2.1: Presence of a Barangay Health Station/Center
- Option A: BHS/C Operated (photo documentation + assessment field)
- Option B: Clustered BHS/C (certification + assessment field)

The barangay only needs ONE option complete to pass, not both.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d66ae521094'
down_revision: Union[str, Sequence[str], None] = '7346b2e75b9e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Define the option_group mappings for indicator 4.2.1
OPTION_GROUP_MAPPINGS = {
    # Option A - BHS/C Operated
    "4_2_1_photo": "option_a",
    "4_2_1_option_a": "option_a",
    # Option B - Clustered BHS/C
    "4_2_1_cert_clustered": "option_b",
    "4_2_1_option_b": "option_b",
}


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()

    # Update option_group for each checklist item
    for item_id, option_group in OPTION_GROUP_MAPPINGS.items():
        conn.execute(
            sa.text("""
                UPDATE checklist_items
                SET option_group = :option_group
                WHERE item_id = :item_id
            """),
            {"option_group": option_group, "item_id": item_id}
        )

    print(f"Updated option_group for {len(OPTION_GROUP_MAPPINGS)} checklist items in indicator 4.2.1")


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    # Clear option_group for all mapped items
    for item_id in OPTION_GROUP_MAPPINGS.keys():
        conn.execute(
            sa.text("""
                UPDATE checklist_items
                SET option_group = NULL
                WHERE item_id = :item_id
            """),
            {"item_id": item_id}
        )

    print(f"Cleared option_group for {len(OPTION_GROUP_MAPPINGS)} checklist items in indicator 4.2.1")
