"""add_or_separator_to_1_6_1_option3

Revision ID: 00bf5f33e043
Revises: 96050d3cf901
Create Date: 2025-12-07 18:42:24.863836

Add an OR separator between the two Option 3 fields in indicator 1.6.1.
"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "00bf5f33e043"
down_revision: Union[str, Sequence[str], None] = "96050d3cf901"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add OR separator between Option 3 fields in indicator 1.6.1."""
    conn = op.get_bind()

    # Get indicator 1.6.1's form_schema
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '1.6.1'")
    ).fetchone()

    if not result or not result[0]:
        print("Indicator 1.6.1 not found or has no form_schema, skipping...")
        return

    form_schema = result[0]
    fields = form_schema.get("fields", [])

    # Find the index of the first Option 3 file_upload field
    insert_index = None
    for i, field in enumerate(fields):
        if field.get("option_group") == "Option 3" and field.get("field_type") == "file_upload":
            # Insert OR separator after this field
            insert_index = i + 1
            break

    if insert_index is None:
        print("Could not find Option 3 file_upload field, skipping...")
        return

    # Check if OR separator already exists
    if (
        insert_index < len(fields)
        and fields[insert_index].get("field_type") == "info_text"
        and fields[insert_index].get("label") == "OR"
    ):
        print("OR separator already exists, skipping...")
        return

    # Create the OR separator field
    or_separator = {
        "field_id": "or_separator_option3",
        "field_type": "info_text",
        "label": "OR",
        "description": "",
        "required": False,
        "option_group": "Option 3",
    }

    # Insert the OR separator
    fields.insert(insert_index, or_separator)
    print(f"Inserted OR separator at index {insert_index}")

    # Update the database
    conn.execute(
        sa.text(
            "UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '1.6.1'"
        ),
        {"schema": json.dumps(form_schema)},
    )
    print("Updated indicator 1.6.1 form_schema with OR separator")


def downgrade() -> None:
    """Remove OR separator from Option 3 in indicator 1.6.1."""
    conn = op.get_bind()

    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '1.6.1'")
    ).fetchone()

    if not result or not result[0]:
        return

    form_schema = result[0]
    fields = form_schema.get("fields", [])

    # Remove the OR separator
    fields[:] = [
        f
        for f in fields
        if not (f.get("field_id") == "or_separator_option3" and f.get("field_type") == "info_text")
    ]

    conn.execute(
        sa.text(
            "UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '1.6.1'"
        ),
        {"schema": json.dumps(form_schema)},
    )
