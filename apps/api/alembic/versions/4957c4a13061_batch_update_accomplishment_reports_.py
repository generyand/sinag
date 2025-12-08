"""batch_update_accomplishment_reports_names_and_notes

Revision ID: 4957c4a13061
Revises: 00bf5f33e043
Create Date: 2025-12-07 18:47:32.112554

Updates:
- 2.1.4: Change name
- 3.2.3: Change name
- 3.3.2: Add Photo Requirements note to Option A field
- 4.1.4: Add VAW note
- 4.1.6: Change name with dynamic year
- 6.1.4: Change name with dynamic year
"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4957c4a13061"
down_revision: Union[str, Sequence[str], None] = "00bf5f33e043"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PHOTO_REQUIREMENTS = {
    "title": "Photo Requirements:",
    "items": [
        {"text": "One (1) photo with Distant View; and"},
        {"text": "One (1) photo with Close-up View"},
    ],
}

VAW_NOTE = {
    "title": "Note:",
    "items": [
        {
            "text": "Quarterly accomplishment reports based on the database/records of VAW cases reported in the barangay containing relevant information such as total number of VAW cases received, assistance provided to victim-survivors, total number of cases documented for violating RA 9262 and other VAW-related laws, total barangay population, number of male and female in the barangay, and minor to adult ratio"
        }
    ],
}


def update_indicator_name(conn, code: str, new_name: str):
    """Update an indicator's name."""
    conn.execute(
        sa.text("UPDATE indicators SET name = :name WHERE indicator_code = :code"),
        {"name": new_name, "code": code},
    )
    print(f"Updated {code} name")


def add_notes_to_form_schema(conn, code: str, notes: dict):
    """Add notes to an indicator's form_schema."""
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = :code"), {"code": code}
    ).fetchone()

    if not result or not result[0]:
        print(f"Indicator {code} not found or has no form_schema, skipping...")
        return

    form_schema = result[0]
    form_schema["notes"] = notes

    conn.execute(
        sa.text(
            "UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = :code"
        ),
        {"schema": json.dumps(form_schema), "code": code},
    )
    print(f"Added notes to {code}")


def add_field_notes_to_first_upload(conn, code: str, field_notes: dict):
    """Add field_notes to the first file_upload field."""
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = :code"), {"code": code}
    ).fetchone()

    if not result or not result[0]:
        print(f"Indicator {code} not found or has no form_schema, skipping...")
        return

    form_schema = result[0]
    fields = form_schema.get("fields", [])

    for field in fields:
        if field.get("field_type") == "file_upload":
            field["field_notes"] = field_notes
            break

    conn.execute(
        sa.text(
            "UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = :code"
        ),
        {"schema": json.dumps(form_schema), "code": code},
    )
    print(f"Added field_notes to {code}")


def upgrade() -> None:
    """Apply all updates."""
    conn = op.get_bind()

    # 2.1.4 - Change name
    update_indicator_name(
        conn,
        "2.1.4",
        "Accomplishment Reports: At least 50% Physical Accomplishment OR Fund Utilization",
    )

    # 3.2.3 - Change name
    update_indicator_name(
        conn,
        "3.2.3",
        "Accomplishment Reports: At least 50% Physical Accomplishment OR Fund Utilization",
    )

    # 3.3.2 - Add Photo Requirements to first upload field
    add_field_notes_to_first_upload(conn, "3.3.2", PHOTO_REQUIREMENTS)

    # 4.1.4 - Add VAW note
    add_notes_to_form_schema(conn, "4.1.4", VAW_NOTE)

    # 4.1.6 - Change name with dynamic year placeholder
    update_indicator_name(
        conn,
        "4.1.6",
        "Accomplishment Reports: At least 50% Physical Accomplishment OR Fund Utilization - CY {CY_CURRENT_YEAR}",
    )

    # 6.1.4 - Change name with dynamic year placeholder
    update_indicator_name(
        conn,
        "6.1.4",
        "Accomplishment Reports: At least 50% Physical Accomplishment OR Fund Utilization - covering July to September {CY_CURRENT_YEAR}",
    )


def downgrade() -> None:
    """Revert is complex - skipping."""
    pass
