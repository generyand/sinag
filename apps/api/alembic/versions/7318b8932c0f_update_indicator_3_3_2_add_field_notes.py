"""update_indicator_3_3_2_add_field_notes

Revision ID: 7318b8932c0f
Revises: 21f8ec1016e3
Create Date: 2025-12-03 21:35:00.000000

"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7318b8932c0f"
down_revision: Union[str, Sequence[str], None] = "21f8ec1016e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# New label (shortened, without the note)
NEW_LABEL = "For barangays of cities: Two (2) photos with caption of the computer database with searchable information"

# Old label (with the note embedded)
OLD_LABEL = "For barangays of cities: Two (2) photos with caption of the computer database with searchable information (Photo Requirements: One photo with Distant View and one photo with Close-up View. Note: Photos of the computer database using MS Excel and such are acceptable)"

# Field notes to add
FIELD_NOTES = {
    "title": "Note:",
    "items": [{"text": "Photos of the computer database using MS Excel and such are acceptable"}],
}


def upgrade() -> None:
    """Update indicator 3.3.2 first field label and add field_notes."""
    conn = op.get_bind()

    # Get current form_schema
    result = conn.execute(
        sa.text("""
            SELECT form_schema FROM indicators WHERE indicator_code = '3.3.2'
        """)
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]

    # Update the first field's label and add field_notes
    if "fields" in form_schema and len(form_schema["fields"]) > 0:
        # Update label
        form_schema["fields"][0]["label"] = NEW_LABEL
        form_schema["fields"][0]["description"] = NEW_LABEL
        # Add field_notes
        form_schema["fields"][0]["field_notes"] = FIELD_NOTES

    # Also update assessor_validation fields
    if "assessor_validation" in form_schema and "fields" in form_schema["assessor_validation"]:
        for field in form_schema["assessor_validation"]["fields"]:
            if field.get("field_id") == "upload_section_1":
                field["label"] = NEW_LABEL
                field["description"] = NEW_LABEL

    # Update upload_instructions as well
    if "upload_instructions" in form_schema:
        form_schema["upload_instructions"] = form_schema["upload_instructions"].replace(
            OLD_LABEL, NEW_LABEL
        )

    # Save back to database
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET form_schema = CAST(:form_schema AS json)
            WHERE indicator_code = '3.3.2'
        """),
        {"form_schema": json.dumps(form_schema)},
    )


def downgrade() -> None:
    """Revert indicator 3.3.2 first field label and remove field_notes."""
    conn = op.get_bind()

    # Get current form_schema
    result = conn.execute(
        sa.text("""
            SELECT form_schema FROM indicators WHERE indicator_code = '3.3.2'
        """)
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]

    # Revert the first field's label and remove field_notes
    if "fields" in form_schema and len(form_schema["fields"]) > 0:
        # Revert label
        form_schema["fields"][0]["label"] = OLD_LABEL
        form_schema["fields"][0]["description"] = OLD_LABEL
        # Remove field_notes
        if "field_notes" in form_schema["fields"][0]:
            del form_schema["fields"][0]["field_notes"]

    # Also revert assessor_validation fields
    if "assessor_validation" in form_schema and "fields" in form_schema["assessor_validation"]:
        for field in form_schema["assessor_validation"]["fields"]:
            if field.get("field_id") == "upload_section_1":
                field["label"] = OLD_LABEL
                field["description"] = OLD_LABEL

    # Revert upload_instructions as well
    if "upload_instructions" in form_schema:
        form_schema["upload_instructions"] = form_schema["upload_instructions"].replace(
            NEW_LABEL, OLD_LABEL
        )

    # Save back to database
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET form_schema = CAST(:form_schema AS json)
            WHERE indicator_code = '3.3.2'
        """),
        {"form_schema": json.dumps(form_schema)},
    )
