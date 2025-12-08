"""consolidate_indicator_1_6_1_with_or_logic

Revision ID: 5446a28e8751
Revises: c4d5e6f7a8b9
Create Date: 2025-12-06

This migration consolidates indicator 1.6.1 from three separate sub-indicators
(1.6.1.1, 1.6.1.2, 1.6.1.3) into a single indicator with OR logic.

Changes:
1. Delete child indicators 1.6.1.1, 1.6.1.2, 1.6.1.3
2. Update parent indicator 1.6.1 with new consolidated checklist items
3. Migrate existing assessment responses and MOVs to use new field IDs
4. Update form_schema with new OR logic structure

The new structure uses Option 1, Option 2, Option 3 with section headers and
OR separators. Only ONE option needs to be completed (ANY_OPTION_GROUP_REQUIRED).

NOTE: This migration uses raw SQL instead of ORM to avoid compatibility issues
with model columns that may be added by later migrations.
"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5446a28e8751"
down_revision: Union[str, Sequence[str], None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Field ID mapping from old (1.6.1.x) to new (1.6.1 with option groups)
FIELD_ID_MAPPING = {
    # Old 1.6.1.1 → Option 1
    "1_6_1_1_a": "1_6_1_opt1_a",
    "1_6_1_1_b": "1_6_1_opt1_b",
    "upload_section_1": "1_6_1_opt1_a",  # Legacy format
    "upload_section_2": "1_6_1_opt1_b",  # Legacy format
    # Old 1.6.1.2 → Option 2
    "1_6_1_2_deposit": "1_6_1_opt2_deposit",
    # Old 1.6.1.3 → Option 3
    "1_6_1_3_a": "1_6_1_opt3_a",
    "1_6_1_3_b": "1_6_1_opt3_b",
}

# New consolidated form schema for 1.6.1
NEW_FORM_SCHEMA = {
    "fields": [
        {
            "id": "1_6_1_opt1_header",
            "label": "Option 1: Trust Fund Agreement with BLGF",
            "type": "section_header",
            "option_group": 1,
        },
        {
            "id": "1_6_1_opt1_a",
            "label": "Approved Trust Fund Agreement",
            "type": "upload",
            "mov_description": "Copy of Trust Fund Agreement signed by the Punong Barangay and LBP",
            "required": True,
            "option_group": 1,
        },
        {
            "id": "1_6_1_opt1_b",
            "label": "Active Trust Fund Account",
            "type": "upload",
            "mov_description": "Any of the following: Bank Statement, Certificate of Deposit, Passbook with recent entry",
            "required": True,
            "option_group": 1,
        },
        {
            "id": "or_separator_1",
            "type": "or_separator",
        },
        {
            "id": "1_6_1_opt2_header",
            "label": "Option 2: Time Deposit with LBP",
            "type": "section_header",
            "option_group": 2,
        },
        {
            "id": "1_6_1_opt2_deposit",
            "label": "Time Deposit Certificate",
            "type": "upload",
            "mov_description": "Copy of Time Deposit Certificate or Bank Statement showing time deposit",
            "required": True,
            "option_group": 2,
        },
        {
            "id": "or_separator_2",
            "type": "or_separator",
        },
        {
            "id": "1_6_1_opt3_header",
            "label": "Option 3: Regular Savings Account with LBP",
            "type": "section_header",
            "option_group": 3,
        },
        {
            "id": "1_6_1_opt3_a",
            "label": "Savings Account Documentation",
            "type": "upload",
            "mov_description": "Copy of Passbook or Bank Statement",
            "required": True,
            "option_group": 3,
        },
        {
            "id": "1_6_1_opt3_b",
            "label": "Account Balance Proof",
            "type": "upload",
            "mov_description": "Certificate of Account Balance or latest Bank Statement",
            "required": True,
            "option_group": 3,
        },
    ],
    "validation_rule": "ANY_OPTION_GROUP_REQUIRED",
}

NEW_CHECKLIST_ITEMS = [
    {
        "item_id": "1_6_1_opt1_header",
        "label": "Option 1: Trust Fund Agreement with BLGF",
        "item_type": "section_header",
        "mov_description": None,
        "required": False,
        "display_order": 1,
        "option_group": 1,
    },
    {
        "item_id": "1_6_1_opt1_a",
        "label": "Approved Trust Fund Agreement",
        "item_type": "upload",
        "mov_description": "Copy of Trust Fund Agreement signed by the Punong Barangay and LBP",
        "required": True,
        "display_order": 2,
        "option_group": 1,
    },
    {
        "item_id": "1_6_1_opt1_b",
        "label": "Active Trust Fund Account",
        "item_type": "upload",
        "mov_description": "Any of the following: Bank Statement, Certificate of Deposit, Passbook with recent entry",
        "required": True,
        "display_order": 3,
        "option_group": 1,
    },
    {
        "item_id": "or_separator_1",
        "label": "OR",
        "item_type": "or_separator",
        "mov_description": None,
        "required": False,
        "display_order": 4,
        "option_group": None,
    },
    {
        "item_id": "1_6_1_opt2_header",
        "label": "Option 2: Time Deposit with LBP",
        "item_type": "section_header",
        "mov_description": None,
        "required": False,
        "display_order": 5,
        "option_group": 2,
    },
    {
        "item_id": "1_6_1_opt2_deposit",
        "label": "Time Deposit Certificate",
        "item_type": "upload",
        "mov_description": "Copy of Time Deposit Certificate or Bank Statement showing time deposit",
        "required": True,
        "display_order": 6,
        "option_group": 2,
    },
    {
        "item_id": "or_separator_2",
        "label": "OR",
        "item_type": "or_separator",
        "mov_description": None,
        "required": False,
        "display_order": 7,
        "option_group": None,
    },
    {
        "item_id": "1_6_1_opt3_header",
        "label": "Option 3: Regular Savings Account with LBP",
        "item_type": "section_header",
        "mov_description": None,
        "required": False,
        "display_order": 8,
        "option_group": 3,
    },
    {
        "item_id": "1_6_1_opt3_a",
        "label": "Savings Account Documentation",
        "item_type": "upload",
        "mov_description": "Copy of Passbook or Bank Statement",
        "required": True,
        "display_order": 9,
        "option_group": 3,
    },
    {
        "item_id": "1_6_1_opt3_b",
        "label": "Account Balance Proof",
        "item_type": "upload",
        "mov_description": "Certificate of Account Balance or latest Bank Statement",
        "required": True,
        "display_order": 10,
        "option_group": 3,
    },
]

NEW_INDICATOR_NAME = "Presence of Trust Fund Agreement/Time Deposit/Regular Savings Account with Land Bank of the Philippines (LBP)"


def upgrade() -> None:
    """Consolidate indicator 1.6.1 into a single indicator with OR logic using raw SQL."""
    conn = op.get_bind()

    print("=" * 60)
    print("Consolidating indicator 1.6.1 with OR logic...")
    print("=" * 60)

    # 1. Get the parent indicator 1.6.1
    result = conn.execute(
        sa.text("SELECT id, indicator_code FROM indicators WHERE indicator_code = '1.6.1'")
    )
    parent = result.fetchone()

    if not parent:
        print("Parent indicator 1.6.1 not found, skipping migration...")
        return

    parent_id = parent[0]
    print(f"Found parent indicator: {parent_id} - {parent[1]}")

    # 2. Get child indicators (1.6.1.1, 1.6.1.2, 1.6.1.3)
    result = conn.execute(
        sa.text("SELECT id, indicator_code FROM indicators WHERE parent_id = :parent_id"),
        {"parent_id": parent_id},
    )
    children = result.fetchall()
    child_ids = [c[0] for c in children]
    child_codes = [c[1] for c in children]
    print(f"Found {len(children)} child indicators: {child_codes}")

    # 3. Migrate assessment responses from children to parent
    for child_id, child_code in zip(child_ids, child_codes):
        _migrate_responses_raw(conn, child_id, child_code, parent_id)

    # 4. Delete checklist items from children
    for child_id, child_code in zip(child_ids, child_codes):
        result = conn.execute(
            sa.text("DELETE FROM checklist_items WHERE indicator_id = :indicator_id"),
            {"indicator_id": child_id},
        )
        print(f"  Deleted checklist items from {child_code}")

    # 5. Delete child indicators
    for child_id, child_code in zip(child_ids, child_codes):
        conn.execute(
            sa.text("DELETE FROM indicators WHERE id = :id"),
            {"id": child_id},
        )
        print(f"  Deleted child indicator: {child_code}")

    # 6. Delete existing checklist items from parent
    conn.execute(
        sa.text("DELETE FROM checklist_items WHERE indicator_id = :indicator_id"),
        {"indicator_id": parent_id},
    )
    print("Deleted existing checklist items from parent 1.6.1")

    # 7. Create new checklist items
    for item in NEW_CHECKLIST_ITEMS:
        conn.execute(
            sa.text("""
                INSERT INTO checklist_items
                (indicator_id, item_id, label, item_type, mov_description, required, display_order, option_group)
                VALUES (:indicator_id, :item_id, :label, :item_type, :mov_description, :required, :display_order, :option_group)
            """),
            {
                "indicator_id": parent_id,
                "item_id": item["item_id"],
                "label": item["label"],
                "item_type": item["item_type"],
                "mov_description": item["mov_description"],
                "required": item["required"],
                "display_order": item["display_order"],
                "option_group": item["option_group"],
            },
        )
    print(f"Created {len(NEW_CHECKLIST_ITEMS)} new checklist items for 1.6.1")

    # 8. Update parent indicator with new configuration
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET name = :name,
                validation_rule = :validation_rule,
                form_schema = :form_schema
            WHERE id = :id
        """),
        {
            "id": parent_id,
            "name": NEW_INDICATOR_NAME,
            "validation_rule": "ANY_OPTION_GROUP_REQUIRED",
            "form_schema": json.dumps(NEW_FORM_SCHEMA),
        },
    )
    print("Updated parent indicator configuration")

    print("=" * 60)
    print("Migration completed successfully!")
    print("=" * 60)


def _migrate_responses_raw(
    conn, old_indicator_id: int, old_code: str, new_indicator_id: int
) -> None:
    """Migrate assessment responses from old child indicator to new parent indicator using raw SQL."""
    # Get responses for the old indicator
    result = conn.execute(
        sa.text("""
            SELECT id, assessment_id, response_data
            FROM assessment_responses
            WHERE indicator_id = :indicator_id
        """),
        {"indicator_id": old_indicator_id},
    )
    responses = result.fetchall()

    print(f"  Migrating {len(responses)} responses from {old_code}...")

    for response_id, assessment_id, response_data in responses:
        # Check if there's already a response for the parent indicator
        result = conn.execute(
            sa.text("""
                SELECT id, response_data FROM assessment_responses
                WHERE assessment_id = :assessment_id AND indicator_id = :indicator_id
            """),
            {"assessment_id": assessment_id, "indicator_id": new_indicator_id},
        )
        existing = result.fetchone()

        if existing:
            # Merge response data
            existing_data = existing[1] or {}
            if response_data:
                remapped = _remap_field_ids(response_data, old_code)
                existing_data.update(remapped)
                conn.execute(
                    sa.text("UPDATE assessment_responses SET response_data = :data WHERE id = :id"),
                    {"data": json.dumps(existing_data), "id": existing[0]},
                )
            # Migrate MOV files
            _migrate_mov_files_raw(conn, old_indicator_id, new_indicator_id, assessment_id)
            # Delete old response
            conn.execute(
                sa.text("DELETE FROM assessment_responses WHERE id = :id"),
                {"id": response_id},
            )
        else:
            # Update response to point to parent
            remapped_data = _remap_field_ids(response_data, old_code) if response_data else None
            conn.execute(
                sa.text("""
                    UPDATE assessment_responses
                    SET indicator_id = :new_id, response_data = :data
                    WHERE id = :id
                """),
                {
                    "id": response_id,
                    "new_id": new_indicator_id,
                    "data": json.dumps(remapped_data) if remapped_data else None,
                },
            )
            # Migrate MOV files
            _migrate_mov_files_raw(conn, old_indicator_id, new_indicator_id, assessment_id)


def _remap_field_ids(response_data: dict, child_code: str) -> dict:
    """Remap old field IDs to new field IDs."""
    if not response_data:
        return {}

    remapped = {}
    for key, value in response_data.items():
        new_key = FIELD_ID_MAPPING.get(key, key)
        remapped[new_key] = value

    return remapped


def _migrate_mov_files_raw(
    conn, old_indicator_id: int, new_indicator_id: int, assessment_id: int
) -> None:
    """Migrate MOV files using raw SQL."""
    # Get MOV files for the old indicator
    result = conn.execute(
        sa.text("""
            SELECT id, field_id FROM mov_files
            WHERE indicator_id = :old_id AND assessment_id = :assessment_id
        """),
        {"old_id": old_indicator_id, "assessment_id": assessment_id},
    )
    movs = result.fetchall()

    for mov_id, field_id in movs:
        new_field_id = FIELD_ID_MAPPING.get(field_id, field_id) if field_id else field_id
        conn.execute(
            sa.text("""
                UPDATE mov_files
                SET indicator_id = :new_id, field_id = :field_id
                WHERE id = :id
            """),
            {"id": mov_id, "new_id": new_indicator_id, "field_id": new_field_id},
        )


def downgrade() -> None:
    """Revert the consolidation (not fully reversible - data may be lost)."""
    print("Downgrade not implemented. Manual intervention required to restore child indicators.")
    pass
