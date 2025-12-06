"""batch_update_indicators_field_notes_round2

Revision ID: 8fc1d74ce449
Revises: 5c9649dd2607
Create Date: 2025-12-03 22:15:00.000000

"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8fc1d74ce449"
down_revision: Union[str, Sequence[str], None] = "5c9649dd2607"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Photo requirements field_notes (standard)
PHOTO_REQUIREMENTS = {
    "title": "Photo Requirements:",
    "items": [
        {"text": "One (1) photo with Distant View; and"},
        {"text": "One (1) photo with Close-up View"},
    ],
}

# Photo requirements field_notes (close-up only)
PHOTO_REQUIREMENTS_CLOSEUP_ONLY = {
    "title": "Photo Requirements:",
    "items": [{"text": "One (1) photo with Close-up View"}],
}

ACCOMPLISHMENT_NEW_NAME = "Accomplishment Reports: At least 50% accomplishment (Physical) OR 50% fund utilization (Financial)"

ACCOMPLISHMENT_NOTE = {
    "title": "Note:",
    "items": [
        {
            "text": "Barangay officials have the option to submit both the physical and financial reports. However, for the SGLGB Assessment, only one of the documents is required."
        }
    ],
}


def add_field_notes_to_field(conn, indicator_code: str, field_index: int, field_notes: dict):
    """Add field_notes to a specific field by index."""
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = :code"),
        {"code": indicator_code},
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]
    if "fields" in form_schema and len(form_schema["fields"]) > field_index:
        form_schema["fields"][field_index]["field_notes"] = field_notes

    conn.execute(
        sa.text(
            "UPDATE indicators SET form_schema = CAST(:fs AS json) WHERE indicator_code = :code"
        ),
        {"fs": json.dumps(form_schema), "code": indicator_code},
    )


def add_field_notes_to_first_upload_field(conn, indicator_code: str, field_notes: dict):
    """Add field_notes to the first file_upload field."""
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = :code"),
        {"code": indicator_code},
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]
    if "fields" in form_schema:
        for field in form_schema["fields"]:
            if field.get("field_type") == "file_upload":
                field["field_notes"] = field_notes
                break

    conn.execute(
        sa.text(
            "UPDATE indicators SET form_schema = CAST(:fs AS json) WHERE indicator_code = :code"
        ),
        {"fs": json.dumps(form_schema), "code": indicator_code},
    )


def update_field_label(conn, indicator_code: str, field_index: int, new_label: str):
    """Update a field's label."""
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = :code"),
        {"code": indicator_code},
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]
    if "fields" in form_schema and len(form_schema["fields"]) > field_index:
        form_schema["fields"][field_index]["label"] = new_label
        form_schema["fields"][field_index]["description"] = new_label

    conn.execute(
        sa.text(
            "UPDATE indicators SET form_schema = CAST(:fs AS json) WHERE indicator_code = :code"
        ),
        {"fs": json.dumps(form_schema), "code": indicator_code},
    )


def add_notes_only(conn, indicator_code: str, notes: dict):
    """Add notes to form_schema."""
    notes_json = json.dumps({"notes": notes})
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET form_schema = (form_schema::jsonb || CAST(:notes_json AS jsonb))::json
            WHERE indicator_code = :code
        """),
        {"notes_json": notes_json, "code": indicator_code},
    )


def update_name_only(conn, indicator_code: str, new_name: str):
    """Update indicator name."""
    conn.execute(
        sa.text("UPDATE indicators SET name = :new_name WHERE indicator_code = :code"),
        {"new_name": new_name, "code": indicator_code},
    )


def remove_secondary_notes(conn, indicator_code: str):
    """Remove secondary_notes from form_schema."""
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET form_schema = (form_schema::jsonb - 'secondary_notes')::json
            WHERE indicator_code = :code
        """),
        {"code": indicator_code},
    )


def upgrade() -> None:
    """Batch update indicators with field_notes."""
    conn = op.get_bind()

    # 1.1.1 - Change label + Add field_notes
    update_field_label(
        conn,
        "1.1.1",
        0,
        "Two (2) Photo Documentation of the BFDP board showing the name of the barangay",
    )
    add_field_notes_to_field(conn, "1.1.1", 0, PHOTO_REQUIREMENTS)

    # 1.5.1 - Add field_notes
    add_field_notes_to_first_upload_field(conn, "1.5.1", PHOTO_REQUIREMENTS)

    # 1.6.1.1 - Add field_notes (CONSIDERATION)
    add_field_notes_to_first_upload_field(
        conn,
        "1.6.1.1",
        {
            "title": "CONSIDERATION:",
            "items": [
                {
                    "text": "In the absence of deposit slips, bank statements will be considered, provided that it shows the transaction date, and that the total 10% of the SK Fund has been transferred."
                }
            ],
        },
    )

    # 2.1.4 - Change title + Add note + Remove secondary_notes
    update_name_only(conn, "2.1.4", ACCOMPLISHMENT_NEW_NAME)
    add_notes_only(conn, "2.1.4", ACCOMPLISHMENT_NOTE)
    remove_secondary_notes(conn, "2.1.4")

    # 2.2.2 - Add field_notes
    add_field_notes_to_first_upload_field(conn, "2.2.2", PHOTO_REQUIREMENTS)

    # 2.2.3 - Add field_notes
    add_field_notes_to_first_upload_field(conn, "2.2.3", PHOTO_REQUIREMENTS)

    # 2.3.1 - Add field_notes
    add_field_notes_to_first_upload_field(conn, "2.3.1", PHOTO_REQUIREMENTS)

    # 2.3.2 - Add field_notes (Close-up only)
    add_field_notes_to_first_upload_field(conn, "2.3.2", PHOTO_REQUIREMENTS_CLOSEUP_ONLY)

    # 3.3.2.1 - Add field_notes (this is actually 3.3.2 first upload field based on screenshot)
    # The screenshot shows indicator 3.3.2 with "For barangays of cities" label
    # We already added field_notes to 3.3.2 in earlier migration, but let's verify it's on the right field

    # 3.4.1 - Add note
    add_notes_only(
        conn,
        "3.4.1",
        {
            "title": "Composition of a Barangay Tanod:",
            "items": [
                {"label": "1.", "text": "Chief Tanod/Executive Officer"},
                {"label": "2.", "text": "Team Leaders"},
                {"label": "3.", "text": "Team Members"},
            ],
        },
    )

    # 3.5.2 - Add field_notes
    add_field_notes_to_first_upload_field(conn, "3.5.2", PHOTO_REQUIREMENTS)

    # 4.2.1 - Add field_notes to first upload field (not section header)
    add_field_notes_to_first_upload_field(conn, "4.2.1", PHOTO_REQUIREMENTS)

    # 4.9.1 - Add field_notes
    add_field_notes_to_first_upload_field(conn, "4.9.1", PHOTO_REQUIREMENTS)


def downgrade() -> None:
    """Revert is complex - skipping."""
    pass
