"""fix_4_1_6_use_completion_group

Revision ID: 711d64a3037e
Revises: 9a39346fe8f2
Create Date: 2025-12-07 20:40:00.000000

Fix 4.1.6:
- Remove option_group from file_upload fields (was causing accordion rendering)
- Add completion_group instead (only used by CompletionFeedbackPanel for progress)

Current structure:
0: [section_header] id=section_header_1 - SHARED (Required):
1: [file_upload] id=upload_section_1 - GAD Accomplishment Report (shared)
2: [section_header] id=section_header_3 - OPTION A - PHYSICAL:
3: [file_upload] id=upload_section_2 - Option A certification (option_a)
4: [info_text] id=or_separator_5 - OR
5: [section_header] id=section_header_6 - OPTION B - FINANCIAL:
6: [file_upload] id=upload_section_3 - Option B certification (option_b)

This ensures:
1. Form displays flat without accordions
2. Progress calculation still works (SHARED_PLUS_OR_LOGIC)
"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


revision: str = '711d64a3037e'
down_revision: Union[str, Sequence[str], None] = '9a39346fe8f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Replace option_group with completion_group for 4.1.6."""
    conn = op.get_bind()

    # Get current form_schema
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.1.6'")
    ).fetchone()

    if not result or not result[0]:
        print("4.1.6 form_schema not found, skipping...")
        return

    form_schema = result[0]
    fields = form_schema.get("fields", [])

    # Remove option_group from ALL fields (was causing accordion rendering)
    for f in fields:
        if "option_group" in f:
            del f["option_group"]

    # Add completion_group to file_upload fields by index
    # Index 1: GAD Accomplishment Report (shared)
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
        sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '4.1.6'"),
        {"schema": json.dumps(form_schema)}
    )
    print("Updated 4.1.6: replaced option_group with completion_group")


def downgrade() -> None:
    """Revert to option_group."""
    conn = op.get_bind()

    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.1.6'")
    ).fetchone()

    if not result or not result[0]:
        return

    form_schema = result[0]
    fields = form_schema.get("fields", [])

    # Remove completion_group from file_upload fields
    for f in fields:
        if "completion_group" in f:
            del f["completion_group"]

    # Re-add option_group for file_upload fields by index
    file_upload_mapping = {
        1: "shared",
        3: "option_a",
        6: "option_b",
    }

    for idx, group in file_upload_mapping.items():
        if idx < len(fields) and fields[idx].get("field_type") == "file_upload":
            fields[idx]["option_group"] = group

    # Also restore section_header option_groups
    section_header_mapping = {
        2: "Option A",
        5: "Option B",
    }

    for idx, group in section_header_mapping.items():
        if idx < len(fields) and fields[idx].get("field_type") == "section_header":
            fields[idx]["option_group"] = group

    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '4.1.6'"),
        {"schema": json.dumps(form_schema)}
    )
