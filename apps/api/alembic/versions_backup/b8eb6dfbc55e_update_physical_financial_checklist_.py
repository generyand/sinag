"""update_physical_financial_checklist_items

Revision ID: b8eb6dfbc55e
Revises: 24f243c7b6ba
Create Date: 2025-11-29

Updates checklist items for indicators 2.1.4, 4.8.4, 6.1.4
to have consistent field naming for auto-calculation:
- Physical: {code}_physical_accomplished, {code}_physical_reflected
- Financial: {code}_financial_utilized, {code}_financial_allocated

This supports auto-calculation of accomplishment percentages.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "b8eb6dfbc55e"
down_revision = "24f243c7b6ba"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Update checklist items for physical/financial accomplishment indicators."""
    conn = op.get_bind()

    # Define the updates for each indicator based on ACTUAL database item IDs
    updates = [
        # 2.1.4 - BDRRMC
        {
            "indicator_code": "2.1.4",
            "remove_items": [
                "2_1_4_calculation_a",  # Old physical % field - single field
            ],
            "add_items": [
                {
                    "item_id": "2_1_4_physical_accomplished",
                    "label": "Total number of activities/projects accomplished",
                    "mov_description": "Please supply the required information:",
                    "item_type": "calculation_field",
                    "required": False,
                    "display_order": 5.1,
                },
                {
                    "item_id": "2_1_4_physical_reflected",
                    "label": "Total number of activities/projects reflected in the Plan",
                    "mov_description": "Please supply the required information:",
                    "item_type": "calculation_field",
                    "required": False,
                    "display_order": 5.2,
                },
            ],
            "rename_items": [
                # Financial fields - rename to consistent naming
                (
                    "2_1_4_calculation_b1",
                    "2_1_4_financial_utilized",
                    "Total amount utilized (as of Dec. 31, 2023)",
                ),
                (
                    "2_1_4_calculation_b2",
                    "2_1_4_financial_allocated",
                    "Total amount allocated for PPAs in the BDRRM Plan for CY 2023",
                ),
            ],
        },
        # 4.8.4 - BNC
        {
            "indicator_code": "4.8.4",
            "remove_items": [
                "4_8_4_physical_percentage",  # Old physical % field - single field
            ],
            "add_items": [
                {
                    "item_id": "4_8_4_physical_accomplished",
                    "label": "Total number of activities/projects accomplished",
                    "mov_description": "Please supply the required information:",
                    "item_type": "calculation_field",
                    "required": False,
                    "display_order": 4.1,
                    "option_group": "Option A",
                },
                {
                    "item_id": "4_8_4_physical_reflected",
                    "label": "Total number of activities/projects reflected in the Plan",
                    "mov_description": "Please supply the required information:",
                    "item_type": "calculation_field",
                    "required": False,
                    "display_order": 4.2,
                    "option_group": "Option A",
                },
            ],
            "rename_items": [
                # Financial fields - rename to consistent naming
                (
                    "4_8_4_amount_utilized",
                    "4_8_4_financial_utilized",
                    "Total amount utilized (as of Dec. 31, 2023)",
                ),
                (
                    "4_8_4_amount_allocated",
                    "4_8_4_financial_allocated",
                    "Total amount allocated for PPAs in the BNAP",
                ),
            ],
        },
        # 6.1.4 - BESWMC
        {
            "indicator_code": "6.1.4",
            "remove_items": [
                "6_1_4_calc_a_percentage",  # Old physical % field - single field
            ],
            "add_items": [
                {
                    "item_id": "6_1_4_physical_accomplished",
                    "label": "Total number of activities/projects accomplished",
                    "mov_description": "Please supply the required information:",
                    "item_type": "calculation_field",
                    "required": False,
                    "display_order": 4.1,
                },
                {
                    "item_id": "6_1_4_physical_reflected",
                    "label": "Total number of activities/projects reflected in the BESWMP",
                    "mov_description": "Please supply the required information:",
                    "item_type": "calculation_field",
                    "required": False,
                    "display_order": 4.2,
                },
            ],
            "rename_items": [
                # Financial fields - rename to consistent naming
                (
                    "6_1_4_calc_b_utilized",
                    "6_1_4_financial_utilized",
                    "Total amount utilized (as of Dec 31, 2023)",
                ),
                (
                    "6_1_4_calc_b_allocated",
                    "6_1_4_financial_allocated",
                    "Total amount allocated for PPAs in the BESWM Plan",
                ),
            ],
        },
    ]

    for update in updates:
        indicator_code = update["indicator_code"]

        # Get the indicator ID
        result = conn.execute(
            sa.text("SELECT id FROM indicators WHERE indicator_code = :code"),
            {"code": indicator_code},
        )
        row = result.fetchone()
        if not row:
            print(f"Indicator {indicator_code} not found, skipping...")
            continue

        indicator_id = row[0]
        print(f"Processing indicator {indicator_code} (ID: {indicator_id})")

        # Remove old items
        for item_id in update.get("remove_items", []):
            result = conn.execute(
                sa.text(
                    "DELETE FROM checklist_items WHERE indicator_id = :ind_id AND item_id = :item_id"
                ),
                {"ind_id": indicator_id, "item_id": item_id},
            )
            print(f"  Removed item: {item_id} (rows affected: {result.rowcount})")

        # Rename existing items
        for old_id, new_id, new_label in update.get("rename_items", []):
            result = conn.execute(
                sa.text("""
                    UPDATE checklist_items
                    SET item_id = :new_id, label = :new_label
                    WHERE indicator_id = :ind_id AND item_id = :old_id
                """),
                {
                    "ind_id": indicator_id,
                    "old_id": old_id,
                    "new_id": new_id,
                    "new_label": new_label,
                },
            )
            print(f"  Renamed: {old_id} -> {new_id} (rows affected: {result.rowcount})")

        # Add new items
        for item in update.get("add_items", []):
            # Check if item already exists
            existing = conn.execute(
                sa.text(
                    "SELECT id FROM checklist_items WHERE indicator_id = :ind_id AND item_id = :item_id"
                ),
                {"ind_id": indicator_id, "item_id": item["item_id"]},
            ).fetchone()

            if existing:
                print(f"  Item {item['item_id']} already exists, skipping...")
                continue

            conn.execute(
                sa.text("""
                    INSERT INTO checklist_items (indicator_id, item_id, label, mov_description, item_type, required, display_order, option_group)
                    VALUES (:ind_id, :item_id, :label, :mov_desc, :item_type, :required, :display_order, :option_group)
                """),
                {
                    "ind_id": indicator_id,
                    "item_id": item["item_id"],
                    "label": item["label"],
                    "mov_desc": item.get("mov_description", ""),
                    "item_type": item.get("item_type", "calculation_field"),
                    "required": item.get("required", False),
                    "display_order": item.get("display_order", 0),
                    "option_group": item.get("option_group"),
                },
            )
            print(f"  Added item: {item['item_id']}")


def downgrade() -> None:
    """Revert checklist item changes."""
    # This would be complex to fully reverse, so we'll just note it
    print("Note: Downgrade for this migration would require manual restoration of old field names")
    pass
