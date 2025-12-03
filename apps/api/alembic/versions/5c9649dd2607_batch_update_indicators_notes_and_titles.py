"""batch_update_indicators_notes_and_titles

Revision ID: 5c9649dd2607
Revises: ed5f44166ed0
Create Date: 2025-12-03 22:00:00.000000

"""
from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c9649dd2607'
down_revision: Union[str, Sequence[str], None] = 'ed5f44166ed0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Common note for accomplishment reports
ACCOMPLISHMENT_NOTE = {
    "title": "Note:",
    "items": [
        {"text": "Barangay officials have the option to submit both the physical and financial reports. However, for the SGLGB Assessment, only one of the documents is required."}
    ]
}

ACCOMPLISHMENT_NEW_NAME = "Accomplishment Reports: At least 50% accomplishment (Physical) OR 50% fund utilization (Financial)"

# Photo requirements field_notes
PHOTO_REQUIREMENTS_FIELD_NOTES = {
    "title": "Photo Requirements:",
    "items": [
        {"text": "One (1) photo with Distant View; and"},
        {"text": "One (1) photo with Close-up View"}
    ]
}


def add_notes_only(conn, indicator_code: str, notes: dict):
    """Add notes to form_schema without modifying anything else."""
    notes_json = json.dumps({"notes": notes})
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET form_schema = (form_schema::jsonb || CAST(:notes_json AS jsonb))::json
            WHERE indicator_code = :code
        """),
        {"notes_json": notes_json, "code": indicator_code}
    )


def update_name_only(conn, indicator_code: str, new_name: str):
    """Update indicator name without modifying anything else."""
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET name = :new_name
            WHERE indicator_code = :code
        """),
        {"new_name": new_name, "code": indicator_code}
    )


def add_field_notes_to_first_field(conn, indicator_code: str, field_notes: dict):
    """Add field_notes to the first upload field without modifying anything else."""
    # Get current form_schema
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = :code"),
        {"code": indicator_code}
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]

    # Add field_notes to first field only
    if 'fields' in form_schema and len(form_schema['fields']) > 0:
        form_schema['fields'][0]['field_notes'] = field_notes

    # Save back
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET form_schema = CAST(:form_schema AS json)
            WHERE indicator_code = :code
        """),
        {"form_schema": json.dumps(form_schema), "code": indicator_code}
    )


def upgrade() -> None:
    """Batch update indicators with notes and title changes."""
    conn = op.get_bind()

    # 4.2.1 - Add note only
    add_notes_only(conn, '4.2.1', {
        "title": "CONSIDERATION:",
        "items": [
            {"text": "Clustered Health Station/Center accessed by several barangays in a city/municipality"}
        ]
    })

    # 4.2.2 - Add note only
    add_notes_only(conn, '4.2.2', {
        "title": "Barangay Personnel can be:",
        "items": [
            {"label": "1.", "text": "Accredited Barangay Health Worker (BHW);"},
            {"text": "AND/OR"},
            {"label": "2.", "text": "Barangay Health Officer (BHO) or Barangay Health Assistant (BHAsst)"}
        ]
    })

    # 4.2.4 - Add note only
    add_notes_only(conn, '4.2.4', {
        "title": "Health Services such as:",
        "items": [
            {"label": "a)", "text": "immunization"},
            {"label": "b)", "text": "maternal and child healthcare"},
            {"label": "c)", "text": "family planning"},
            {"label": "d)", "text": "health education"}
        ]
    })

    # 4.3.4 - Change title + Add note
    update_name_only(conn, '4.3.4', ACCOMPLISHMENT_NEW_NAME)
    add_notes_only(conn, '4.3.4', ACCOMPLISHMENT_NOTE)

    # 4.5.5 - Add note only
    add_notes_only(conn, '4.5.5', {
        "title": "Presence of:",
        "items": [
            {"label": "a)", "text": "Presence of updated Localized Flow Chart of Referral System not earlier than CY 2020;"},
            {"label": "b)", "text": "Presence of Comprehensive Barangay Juvenile Intervention Program (For profiling); and"},
            {"label": "c)", "text": "Presence of Children at Risk (CAR) and Children in Conflict with the Law (CICL) registry (For profiling)."}
        ]
    })

    # 4.5.6 - Change title + Add note
    update_name_only(conn, '4.5.6', ACCOMPLISHMENT_NEW_NAME)
    add_notes_only(conn, '4.5.6', ACCOMPLISHMENT_NOTE)

    # 4.8.1 - Add note only
    add_notes_only(conn, '4.8.1', {
        "title": "Minimum Composition of the BNC:",
        "items": [
            {"label": "1.", "text": "Barangay Captain (as chair)"},
            {"label": "2.", "text": "President of the Rural Improvement Club (RIC)"},
            {"label": "3.", "text": "President, Parent Teacher Child Association (PTCA)"},
            {"label": "4.", "text": "Head/President, local organization"},
            {"label": "5.", "text": "Sangguniang Members on Health"},
            {"label": "6.", "text": "SK Chairperson"},
            {"label": "7.", "text": "Barangay Nutrition Scholar (BNS)"},
            {"label": "8.", "text": "Day Care Worker"},
            {"label": "9.", "text": "Barangay Nutrition Action Association (BNAO)"},
            {"label": "10.", "text": "School Principal"},
            {"label": "11.", "text": "Agriculture Technicians"},
            {"label": "12.", "text": "Rural Health Midwife (RHM)"},
            {"label": "13.", "text": "Other as may be identified"}
        ]
    })

    # 4.8.3 - Change title + Add note
    update_name_only(conn, '4.8.3', "Decrease in Prevalence Rate in the barangay")
    add_notes_only(conn, '4.8.3', {
        "title": "Categories:",
        "items": [
            {"label": "1.", "text": "Underweight and Severe Underweight"},
            {"label": "2.", "text": "Stunting and Severe Stunting; and"},
            {"label": "3.", "text": "Moderate Wasting and Severe Wasting"}
        ]
    })

    # 4.8.4 - Change title + Add note
    update_name_only(conn, '4.8.4', ACCOMPLISHMENT_NEW_NAME)
    add_notes_only(conn, '4.8.4', ACCOMPLISHMENT_NOTE)

    # 5.3.1 - Add field_notes to first upload field only
    add_field_notes_to_first_field(conn, '5.3.1', PHOTO_REQUIREMENTS_FIELD_NOTES)

    # 6.1.4 - Change title + Add note
    update_name_only(conn, '6.1.4', ACCOMPLISHMENT_NEW_NAME)
    add_notes_only(conn, '6.1.4', ACCOMPLISHMENT_NOTE)

    # 6.2.1 - Add field_notes to first upload field only
    add_field_notes_to_first_field(conn, '6.2.1', PHOTO_REQUIREMENTS_FIELD_NOTES)


def downgrade() -> None:
    """Revert is complex - skipping for data migrations."""
    pass
