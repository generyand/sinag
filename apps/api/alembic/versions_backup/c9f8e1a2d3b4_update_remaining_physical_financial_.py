"""update_remaining_physical_financial_checklist_items

Revision ID: c9f8e1a2d3b4
Revises: b8eb6dfbc55e
Create Date: 2025-11-29

Updates checklist items for indicators 3.2.3, 4.1.6, 4.3.4, 4.5.6
to have consistent field naming for auto-calculation:
- Physical: {code}_physical_accomplished, {code}_physical_reflected
- Financial: {code}_financial_utilized, {code}_financial_allocated

This supports auto-calculation of accomplishment percentages.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "c9f8e1a2d3b4"
down_revision = "b8eb6dfbc55e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Update checklist items for physical/financial accomplishment indicators."""
    conn = op.get_bind()

    # Define the updates for each indicator based on ACTUAL database item IDs
    updates = [
        # 3.2.3 - BPOC Accomplishment
        {
            "indicator_code": "3.2.3",
            "remove_items": [
                "3_2_3_calc_physical",  # Old physical % field - single field
            ],
            "add_items": [
                {
                    "item_id": "3_2_3_physical_accomplished",
                    "label": "Total number of activities/projects accomplished",
                    "mov_description": "",
                    "item_type": "calculation_field",
                    "required": False,
                    "display_order": 4.1,
                },
                {
                    "item_id": "3_2_3_physical_reflected",
                    "label": "Total number of activities/projects reflected in the Plan",
                    "mov_description": "",
                    "item_type": "calculation_field",
                    "required": False,
                    "display_order": 4.2,
                },
            ],
            "rename_items": [
                # Financial fields - rename to consistent naming
                (
                    "3_2_3_calc_b1",
                    "3_2_3_financial_utilized",
                    "Total amount utilized (as of Dec. 31, 2023)",
                ),
                (
                    "3_2_3_calc_b2",
                    "3_2_3_financial_allocated",
                    "Total amount allocated for FPAs in the BPOPS Plan for CY 2023",
                ),
            ],
        },
        # 4.1.6 - GAD Accomplishment
        {
            "indicator_code": "4.1.6",
            "remove_items": [
                "4_1_6_calc_physical",  # Old physical % field - single field
            ],
            "add_items": [
                {
                    "item_id": "4_1_6_physical_accomplished",
                    "label": "Total number of activities/projects accomplished",
                    "mov_description": "",
                    "item_type": "calculation_field",
                    "required": False,
                    "display_order": 4.1,
                },
                {
                    "item_id": "4_1_6_physical_reflected",
                    "label": "Total number of activities/projects reflected in the GAD Plan",
                    "mov_description": "",
                    "item_type": "calculation_field",
                    "required": False,
                    "display_order": 4.2,
                },
            ],
            "rename_items": [
                # Financial fields - rename to consistent naming
                (
                    "4_1_6_calc_b1",
                    "4_1_6_financial_utilized",
                    "Total amount utilized (as of Dec. 31, 2023)",
                ),
                (
                    "4_1_6_calc_b2",
                    "4_1_6_financial_allocated",
                    "Total amount allocated for PPAs in the GAD Plan",
                ),
            ],
        },
        # 4.3.4 - BDP Accomplishment
        {
            "indicator_code": "4.3.4",
            "remove_items": [
                "4_3_4_calc_physical",  # Old physical % field - single field
            ],
            "add_items": [
                {
                    "item_id": "4_3_4_physical_accomplished",
                    "label": "Total number of activities/projects accomplished",
                    "mov_description": "",
                    "item_type": "calculation_field",
                    "required": False,
                    "display_order": 4.1,
                },
                {
                    "item_id": "4_3_4_physical_reflected",
                    "label": "Total number of activities/projects reflected in the BDP",
                    "mov_description": "",
                    "item_type": "calculation_field",
                    "required": False,
                    "display_order": 4.2,
                },
            ],
            "rename_items": [
                # Financial fields - rename to consistent naming
                (
                    "4_3_4_calc_b1",
                    "4_3_4_financial_utilized",
                    "Total amount utilized (as of Dec 31, 2023)",
                ),
                (
                    "4_3_4_calc_b2",
                    "4_3_4_financial_allocated",
                    "Total amount allocated for PPAs in the BDP",
                ),
            ],
        },
        # 4.5.6 - BCPC Accomplishment
        {
            "indicator_code": "4.5.6",
            "remove_items": [
                "4_5_6_calc_a",  # Old physical % field - single field
            ],
            "add_items": [
                {
                    "item_id": "4_5_6_physical_accomplished",
                    "label": "Total number of activities/projects accomplished",
                    "mov_description": "",
                    "item_type": "calculation_field",
                    "required": False,
                    "display_order": 3.1,
                },
                {
                    "item_id": "4_5_6_physical_reflected",
                    "label": "Total number of activities/projects reflected in the BCPC Plan",
                    "mov_description": "",
                    "item_type": "calculation_field",
                    "required": False,
                    "display_order": 3.2,
                },
            ],
            "rename_items": [
                # Financial fields - rename to consistent naming
                (
                    "4_5_6_calc_b1",
                    "4_5_6_financial_utilized",
                    "Total amount utilized (as of Dec 31, 2023)",
                ),
                (
                    "4_5_6_calc_b2",
                    "4_5_6_financial_allocated",
                    "Total amount allocated for PPAs in the BCPC AWFP",
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
