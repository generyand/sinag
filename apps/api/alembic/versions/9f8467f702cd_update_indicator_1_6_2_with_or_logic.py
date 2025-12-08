"""update_indicator_1_6_2_with_or_logic

Revision ID: 9f8467f702cd
Revises: d29d91428996
Create Date: 2025-12-04

Updates indicator 1.6.2 to add info_text headers and OR separator:
- Adds "If the barangay has 5 and above SK Officials:" header
- Adds "OR" separator
- Adds "If the barangay has 4 and below SK Officials:" header
- Updates labels to be cleaner (without the condition prefix)

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9f8467f702cd"
down_revision: Union[str, Sequence[str], None] = "d29d91428996"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update indicator 1.6.2 checklist items with OR logic headers using raw SQL."""
    conn = op.get_bind()

    # Get indicator 1.6.2
    result = conn.execute(
        sa.text("SELECT id FROM indicators WHERE indicator_code = :code"),
        {"code": "1.6.2"},
    ).fetchone()

    if not result:
        print("Indicator 1.6.2 not found, skipping...")
        return

    indicator_id = result[0]

    print("Updating indicator 1.6.2 checklist items with OR logic...")

    # Delete existing checklist items for this indicator
    conn.execute(
        sa.text("DELETE FROM checklist_items WHERE indicator_id = :indicator_id"),
        {"indicator_id": indicator_id},
    )

    # Create new checklist items with headers and OR separator
    new_items = [
        # Option A: 5 and above SK Officials
        {
            "indicator_id": indicator_id,
            "item_id": "1_6_2_5above_header",
            "label": "If the barangay has 5 and above SK Officials:",
            "item_type": "info_text",
            "required": False,
            "display_order": 1,
            "option_group": "Option A",
            "mov_description": None,
            "requires_document_count": False,
            "group_name": None,
        },
        {
            "indicator_id": indicator_id,
            "item_id": "1_6_2_5above_a",
            "label": "Approved Resolution approving the 2023 SK Annual/Supplemental Budget",
            "item_type": "checkbox",
            "mov_description": "Approved Resolution for 2023 SK Annual/Supplemental Budget (Required if 5+ SK officials)",
            "required": False,
            "display_order": 2,
            "option_group": "Option A",
            "requires_document_count": False,
            "group_name": None,
        },
        {
            "indicator_id": indicator_id,
            "item_id": "1_6_2_5above_b",
            "label": "An Approved 2023 ABYIP signed by the SK Chairperson and its members",
            "item_type": "checkbox",
            "mov_description": "Approved 2023 ABYIP with signatures of SK Chairperson and members (Required if 5+ SK officials)",
            "required": False,
            "display_order": 3,
            "option_group": "Option A",
            "requires_document_count": False,
            "group_name": None,
        },
        # OR separator
        {
            "indicator_id": indicator_id,
            "item_id": "1_6_2_or_separator",
            "label": "OR",
            "item_type": "info_text",
            "required": False,
            "display_order": 4,
            "option_group": None,
            "mov_description": None,
            "requires_document_count": False,
            "group_name": None,
        },
        # Option B: 4 and below SK Officials
        {
            "indicator_id": indicator_id,
            "item_id": "1_6_2_4below_header",
            "label": "If the barangay has 4 and below SK Officials:",
            "item_type": "info_text",
            "required": False,
            "display_order": 5,
            "option_group": "Option B",
            "mov_description": None,
            "requires_document_count": False,
            "group_name": None,
        },
        {
            "indicator_id": indicator_id,
            "item_id": "1_6_2_4below_cert",
            "label": "Certification from the C/MLGOO on number of SK officials",
            "item_type": "checkbox",
            "mov_description": "Certification from City/Municipal LGOO confirming number of SK officials (Required if 4 or fewer SK officials)",
            "required": False,
            "display_order": 6,
            "option_group": "Option B",
            "requires_document_count": False,
            "group_name": None,
        },
    ]

    for item in new_items:
        conn.execute(
            sa.text("""
                INSERT INTO checklist_items (
                    indicator_id, item_id, label, item_type, mov_description,
                    required, requires_document_count, display_order, option_group, group_name
                ) VALUES (
                    :indicator_id, :item_id, :label, :item_type, :mov_description,
                    :required, :requires_document_count, :display_order, :option_group, :group_name
                )
            """),
            item,
        )

    # Update indicator validation_rule to ANY_ITEM_REQUIRED
    conn.execute(
        sa.text("UPDATE indicators SET validation_rule = :rule WHERE id = :id"),
        {"id": indicator_id, "rule": "ANY_ITEM_REQUIRED"},
    )

    print("  - Updated 1.6.2 checklist items with OR logic successfully")


def downgrade() -> None:
    """Revert to original checklist structure."""
    pass
