"""add_consideration_notes_to_1_6_1_deposit_items

Revision ID: 650332d0bc71
Revises: 25d466dcac50
Create Date: 2025-12-12 17:10:56.176636

Add CONSIDERATION field_notes to indicator 1.6.1 deposit/proof items:
- 1_6_1_opt1_b: Proof of deposit for OPTION 1
- 1_6_1_opt2_deposit: Deposit slips for OPTION 2
"""
from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


revision: str = '650332d0bc71'
down_revision: Union[str, Sequence[str], None] = '25d466dcac50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CONSIDERATION_NOTE = {
    "title": "CONSIDERATION:",
    "items": [
        {
            "text": "In the absence of deposit slips, bank statements will be considered, provided that it shows the transaction date, and that the total 10% of the SK Fund has been transferred."
        }
    ]
}


def upgrade() -> None:
    """Add CONSIDERATION field_notes to deposit items in indicator 1.6.1."""
    conn = op.get_bind()

    # Get indicator 1.6.1 ID
    result = conn.execute(
        sa.text("SELECT id FROM indicators WHERE indicator_code = '1.6.1'")
    ).fetchone()

    if not result:
        print("Indicator 1.6.1 not found, skipping")
        return

    indicator_id = result[0]

    # Update OPTION 1's proof of deposit item
    conn.execute(
        sa.text(
            "UPDATE checklist_items SET field_notes = cast(:field_notes as jsonb) "
            "WHERE indicator_id = :indicator_id AND item_id = '1_6_1_opt1_b'"
        ),
        {"field_notes": json.dumps(CONSIDERATION_NOTE), "indicator_id": indicator_id}
    )
    print("Added CONSIDERATION note to 1_6_1_opt1_b")

    # Update OPTION 2's deposit slips item
    conn.execute(
        sa.text(
            "UPDATE checklist_items SET field_notes = cast(:field_notes as jsonb) "
            "WHERE indicator_id = :indicator_id AND item_id = '1_6_1_opt2_deposit'"
        ),
        {"field_notes": json.dumps(CONSIDERATION_NOTE), "indicator_id": indicator_id}
    )
    print("Added CONSIDERATION note to 1_6_1_opt2_deposit")


def downgrade() -> None:
    """Remove CONSIDERATION field_notes from deposit items."""
    conn = op.get_bind()

    result = conn.execute(
        sa.text("SELECT id FROM indicators WHERE indicator_code = '1.6.1'")
    ).fetchone()

    if not result:
        print("Indicator 1.6.1 not found, skipping")
        return

    indicator_id = result[0]

    # Remove field_notes from both items
    conn.execute(
        sa.text(
            "UPDATE checklist_items SET field_notes = NULL "
            "WHERE indicator_id = :indicator_id AND item_id IN ('1_6_1_opt1_b', '1_6_1_opt2_deposit')"
        ),
        {"indicator_id": indicator_id}
    )
    print("Removed CONSIDERATION notes from 1_6_1_opt1_b and 1_6_1_opt2_deposit")
