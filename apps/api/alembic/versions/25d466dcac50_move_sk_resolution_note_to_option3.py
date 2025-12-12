"""move_sk_resolution_note_to_option3

Revision ID: 25d466dcac50
Revises: b194ae4705da
Create Date: 2025-12-12 16:57:28.878234

Move the SK Resolution note from indicator-level notes to inside OPTION 3's section header.
"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "25d466dcac50"
down_revision: Union[str, Sequence[str], None] = "b194ae4705da"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# The note to move
SK_RESOLUTION_NOTE = "SK Resolution authorizing the barangay to utilize the SK Funds if the SK has no bank account yet shall NOT be considered as MOV under this indicator."


def upgrade() -> None:
    """Move SK Resolution note from indicator notes to OPTION 3 field_notes."""
    conn = op.get_bind()

    # 1. Get indicator 1.6.1 ID and form_schema
    result = conn.execute(
        sa.text("""
            SELECT id, form_schema
            FROM indicators
            WHERE indicator_code = '1.6.1'
        """)
    ).fetchone()

    if not result:
        print("Indicator 1.6.1 not found, skipping")
        return

    indicator_id = result[0]
    form_schema = result[1]

    # 2. Update form_schema to remove the second note
    if form_schema and "notes" in form_schema:
        notes = form_schema.get("notes", {})
        items = notes.get("items", [])

        # Filter out the SK Resolution note
        new_items = [
            item for item in items if SK_RESOLUTION_NOTE.lower() not in item.get("text", "").lower()
        ]

        if len(new_items) < len(items):
            notes["items"] = new_items
            form_schema["notes"] = notes

            # Update the indicator using raw SQL with proper escaping
            conn.execute(
                sa.text(
                    "UPDATE indicators SET form_schema = cast(:form_schema as jsonb) WHERE id = :id"
                ),
                {"form_schema": json.dumps(form_schema), "id": indicator_id},
            )
            print("Updated indicator 1.6.1 form_schema notes")

    # 3. Update the OPTION 3 header checklist item to add field_notes
    field_notes = {"title": "Important:", "items": [{"text": SK_RESOLUTION_NOTE}]}

    conn.execute(
        sa.text(
            "UPDATE checklist_items SET field_notes = cast(:field_notes as jsonb) "
            "WHERE indicator_id = :indicator_id AND item_id = '1_6_1_opt3_header'"
        ),
        {"field_notes": json.dumps(field_notes), "indicator_id": indicator_id},
    )
    print("Added field_notes to checklist item 1_6_1_opt3_header")


def downgrade() -> None:
    """Move SK Resolution note back to indicator notes from OPTION 3 field_notes."""
    conn = op.get_bind()

    # 1. Get indicator 1.6.1 ID and form_schema
    result = conn.execute(
        sa.text("""
            SELECT id, form_schema
            FROM indicators
            WHERE indicator_code = '1.6.1'
        """)
    ).fetchone()

    if not result:
        print("Indicator 1.6.1 not found, skipping")
        return

    indicator_id = result[0]
    form_schema = result[1]

    # 2. Remove field_notes from OPTION 3 header
    conn.execute(
        sa.text("""
            UPDATE checklist_items
            SET field_notes = NULL
            WHERE indicator_id = :indicator_id
              AND item_id = '1_6_1_opt3_header'
        """),
        {"indicator_id": indicator_id},
    )
    print("Removed field_notes from checklist item 1_6_1_opt3_header")

    # 3. Add the note back to indicator form_schema
    if form_schema:
        notes = form_schema.get("notes", {"title": "Important Notes:", "items": []})
        items = notes.get("items", [])

        # Add the SK Resolution note back
        items.append({"text": SK_RESOLUTION_NOTE})
        notes["items"] = items
        form_schema["notes"] = notes

        conn.execute(
            sa.text(
                "UPDATE indicators SET form_schema = cast(:form_schema as jsonb) WHERE id = :id"
            ),
            {"form_schema": json.dumps(form_schema), "id": indicator_id},
        )
        print("Restored SK Resolution note to indicator 1.6.1 form_schema")
