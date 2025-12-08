"""move_1_1_1_field_notes_to_photo_field

Revision ID: fa2699af80e4
Revises: 919018f9a562
Create Date: 2025-12-07 18:33:58.015253

Move the Photo Requirements field_notes from field a (BFDP Monitoring Form)
to field b (Photo Documentation) in indicator 1.1.1.
"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "fa2699af80e4"
down_revision: Union[str, Sequence[str], None] = "919018f9a562"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Move field_notes from field 0 to field 1 in indicator 1.1.1."""
    conn = op.get_bind()

    # Get indicator 1.1.1's form_schema
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '1.1.1'")
    ).fetchone()

    if not result or not result[0]:
        print("Indicator 1.1.1 not found or has no form_schema, skipping...")
        return

    form_schema = result[0]
    fields = form_schema.get("fields", [])

    if len(fields) < 2:
        print("Not enough fields in 1.1.1 form_schema, skipping...")
        return

    # Check if field 0 has field_notes to move
    if "field_notes" in fields[0]:
        field_notes = fields[0].pop("field_notes")
        fields[1]["field_notes"] = field_notes
        print("Moved field_notes from field 0 to field 1")

        # Update the database
        conn.execute(
            sa.text(
                "UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '1.1.1'"
            ),
            {"schema": json.dumps(form_schema)},
        )
        print("Updated indicator 1.1.1 form_schema")
    else:
        print("No field_notes found on field 0, checking if already on field 1...")
        if "field_notes" in fields[1]:
            print("field_notes already on field 1, no changes needed")
        else:
            print("No field_notes found on either field")


def downgrade() -> None:
    """Move field_notes back from field 1 to field 0 in indicator 1.1.1."""
    conn = op.get_bind()

    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '1.1.1'")
    ).fetchone()

    if not result or not result[0]:
        return

    form_schema = result[0]
    fields = form_schema.get("fields", [])

    if len(fields) < 2:
        return

    if "field_notes" in fields[1]:
        field_notes = fields[1].pop("field_notes")
        fields[0]["field_notes"] = field_notes

        conn.execute(
            sa.text(
                "UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '1.1.1'"
            ),
            {"schema": json.dumps(form_schema)},
        )
