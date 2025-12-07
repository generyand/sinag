"""fix_4_1_6_option_groups_for_or_logic

Revision ID: 9a39346fe8f2
Revises: 05b614bebace
Create Date: 2025-12-07 20:28:55.287670

Fix 4.1.6:
1. Change validation_rule to SHARED_PLUS_OR_LOGIC
2. Set option_group='shared' for GAD Accomplishment Report (required field)
3. Set option_group='option_a' for Option A certification
4. Set option_group='option_b' for Option B certification

This enables proper progress calculation: 1/2 when shared is uploaded,
2/2 when shared + (option_a OR option_b) is uploaded.
"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


revision: str = '9a39346fe8f2'
down_revision: Union[str, Sequence[str], None] = '05b614bebace'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix 4.1.6 validation rule and option_groups."""
    conn = op.get_bind()

    # Update validation_rule
    conn.execute(
        sa.text("UPDATE indicators SET validation_rule = 'SHARED_PLUS_OR_LOGIC' WHERE indicator_code = '4.1.6'")
    )
    print("Updated 4.1.6 validation_rule to SHARED_PLUS_OR_LOGIC")

    # Update form_schema option_groups
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.1.6'")
    ).fetchone()

    if not result or not result[0]:
        print("4.1.6 form_schema not found, skipping...")
        return

    form_schema = result[0]
    fields = form_schema.get("fields", [])

    for i, f in enumerate(fields):
        if f.get("field_type") == "file_upload":
            if i == 1:  # GAD Accomplishment Report (shared)
                f["option_group"] = "shared"
            elif i == 3:  # Option A certification
                f["option_group"] = "option_a"
            elif i == 6:  # Option B certification
                f["option_group"] = "option_b"

    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '4.1.6'"),
        {"schema": json.dumps(form_schema)}
    )
    print("Updated 4.1.6 option_groups: shared, option_a, option_b")


def downgrade() -> None:
    """Revert 4.1.6 changes."""
    conn = op.get_bind()

    # Revert validation_rule
    conn.execute(
        sa.text("UPDATE indicators SET validation_rule = 'OR_LOGIC_AT_LEAST_1_REQUIRED' WHERE indicator_code = '4.1.6'")
    )

    # Revert form_schema option_groups
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.1.6'")
    ).fetchone()

    if not result or not result[0]:
        return

    form_schema = result[0]
    fields = form_schema.get("fields", [])

    for f in fields:
        if f.get("option_group") in ["shared", "option_a", "option_b"]:
            del f["option_group"]

    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '4.1.6'"),
        {"schema": json.dumps(form_schema)}
    )
