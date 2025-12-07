"""fix_4_8_4_shared_plus_or_logic

Revision ID: 6a826fba3207
Revises: 711d64a3037e
Create Date: 2025-12-07 20:51:54.753918

Fix 4.8.4:
- Change validation_rule from OR_LOGIC_AT_LEAST_1_REQUIRED to SHARED_PLUS_OR_LOGIC
- Add completion_group to file_upload fields (shared, option_a, option_b)

Structure:
0: [section_header] SHARED (Required):
1: [file_upload] Accomplishment Report on BNAP (shared)
2: [section_header] OPTION A - PHYSICAL:
3: [file_upload] Certification... (option_a)
4: [info_text] OR
5: [section_header] OPTION B - FINANCIAL:
6: [file_upload] Certification... (option_b)
"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


revision: str = '6a826fba3207'
down_revision: Union[str, Sequence[str], None] = '711d64a3037e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix 4.8.4 validation rule and add completion_group."""
    conn = op.get_bind()

    # Update validation_rule
    conn.execute(
        sa.text("UPDATE indicators SET validation_rule = 'SHARED_PLUS_OR_LOGIC' WHERE indicator_code = '4.8.4'")
    )
    print("Updated 4.8.4 validation_rule to SHARED_PLUS_OR_LOGIC")

    # Get current form_schema
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.8.4'")
    ).fetchone()

    if not result or not result[0]:
        print("4.8.4 form_schema not found, skipping...")
        return

    form_schema = result[0]
    fields = form_schema.get("fields", [])

    # Add completion_group to file_upload fields by index
    # Index 1: Accomplishment Report on BNAP (shared)
    # Index 3: Option A certification (option_a)
    # Index 6: Option B certification (option_b)
    file_upload_mapping = {
        1: "shared",
        3: "option_a",
        6: "option_b",
    }

    for idx, group in file_upload_mapping.items():
        if idx < len(fields) and fields[idx].get("field_type") == "file_upload":
            fields[idx]["completion_group"] = group
            print(f"  Set completion_group='{group}' on field {idx}")

    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '4.8.4'"),
        {"schema": json.dumps(form_schema)}
    )
    print("Updated 4.8.4 completion_groups")


def downgrade() -> None:
    """Revert 4.8.4 changes."""
    conn = op.get_bind()

    # Revert validation_rule
    conn.execute(
        sa.text("UPDATE indicators SET validation_rule = 'OR_LOGIC_AT_LEAST_1_REQUIRED' WHERE indicator_code = '4.8.4'")
    )

    # Remove completion_group from fields
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.8.4'")
    ).fetchone()

    if not result or not result[0]:
        return

    form_schema = result[0]
    fields = form_schema.get("fields", [])

    for f in fields:
        if "completion_group" in f:
            del f["completion_group"]

    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '4.8.4'"),
        {"schema": json.dumps(form_schema)}
    )
