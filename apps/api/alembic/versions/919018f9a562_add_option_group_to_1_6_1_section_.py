"""add_option_group_to_1_6_1_section_headers

Revision ID: 919018f9a562
Revises: 1bcfb685ada1
Create Date: 2025-12-07 18:28:50.229024

This migration adds option_group to section headers in indicator 1.6.1's form_schema.
This allows the frontend to display the full descriptive labels for each option
instead of just "Option 1", "Option 2", "Option 3".
"""
from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '919018f9a562'
down_revision: Union[str, Sequence[str], None] = '1bcfb685ada1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add option_group to section headers in indicator 1.6.1 form_schema."""
    conn = op.get_bind()

    # Get indicator 1.6.1's form_schema
    result = conn.execute(
        sa.text("SELECT id, form_schema FROM indicators WHERE indicator_code = '1.6.1'")
    ).fetchone()

    if not result or not result[1]:
        print("Indicator 1.6.1 not found or has no form_schema, skipping...")
        return

    indicator_id = result[0]
    form_schema = result[1]

    # Mapping: section header labels -> option_group
    label_to_option_group = {
        "OPTION 1:": "Option 1",
        "OPTION 2:": "Option 2",
        "OPTION 3:": "Option 3",
    }

    # Update section headers with option_group
    fields = form_schema.get("fields", [])
    updated = False

    for field in fields:
        if field.get("field_type") == "section_header":
            label = field.get("label", "")
            for prefix, option_group in label_to_option_group.items():
                if label.upper().startswith(prefix):
                    if field.get("option_group") != option_group:
                        field["option_group"] = option_group
                        updated = True
                        print(f"  Updated section_header '{field.get('field_id')}' with option_group='{option_group}'")
                    break

    if updated:
        # Update the form_schema in the database
        conn.execute(
            sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE id = :id"),
            {"schema": json.dumps(form_schema), "id": indicator_id}
        )
        print(f"Updated indicator 1.6.1 form_schema")
    else:
        print("No updates needed for indicator 1.6.1")


def downgrade() -> None:
    """Remove option_group from section headers in indicator 1.6.1 form_schema."""
    conn = op.get_bind()

    # Get indicator 1.6.1's form_schema
    result = conn.execute(
        sa.text("SELECT id, form_schema FROM indicators WHERE indicator_code = '1.6.1'")
    ).fetchone()

    if not result or not result[1]:
        return

    indicator_id = result[0]
    form_schema = result[1]

    # Remove option_group from section headers
    fields = form_schema.get("fields", [])
    updated = False

    for field in fields:
        if field.get("field_type") == "section_header" and "option_group" in field:
            del field["option_group"]
            updated = True

    if updated:
        conn.execute(
            sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE id = :id"),
            {"schema": json.dumps(form_schema), "id": indicator_id}
        )
