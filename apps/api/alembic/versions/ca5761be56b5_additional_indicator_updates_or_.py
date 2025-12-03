"""additional_indicator_updates_or_separators_and_labels

Revision ID: ca5761be56b5
Revises: 8fc1d74ce449
Create Date: 2025-12-03 23:20:00.000000

"""
from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ca5761be56b5'
down_revision: Union[str, Sequence[str], None] = '8fc1d74ce449'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def add_or_separator(conn, indicator_code: str, insert_index: int):
    """Add OR separator at specified index."""
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = :code"),
        {"code": indicator_code}
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]

    # Check if OR separator already exists
    for field in form_schema.get('fields', []):
        if field.get('field_type') == 'info_text' and field.get('label') == 'OR':
            return  # Already has OR separator

    or_separator = {
        "field_id": "or_separator_1",
        "field_type": "info_text",
        "label": "OR"
    }
    form_schema['fields'].insert(insert_index, or_separator)

    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:fs AS json) WHERE indicator_code = :code"),
        {"fs": json.dumps(form_schema), "code": indicator_code}
    )


def update_field_label(conn, indicator_code: str, field_index: int, new_label: str):
    """Update a field's label by index."""
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = :code"),
        {"code": indicator_code}
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]
    if 'fields' in form_schema and len(form_schema['fields']) > field_index:
        form_schema['fields'][field_index]['label'] = new_label
        form_schema['fields'][field_index]['description'] = new_label

    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:fs AS json) WHERE indicator_code = :code"),
        {"fs": json.dumps(form_schema), "code": indicator_code}
    )


def add_field_notes(conn, indicator_code: str, field_index: int, field_notes: dict):
    """Add field_notes to a specific field."""
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = :code"),
        {"code": indicator_code}
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]
    if 'fields' in form_schema and len(form_schema['fields']) > field_index:
        form_schema['fields'][field_index]['field_notes'] = field_notes

    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:fs AS json) WHERE indicator_code = :code"),
        {"fs": json.dumps(form_schema), "code": indicator_code}
    )


def move_field_notes(conn, indicator_code: str, from_index: int, to_index: int):
    """Move field_notes from one field to another."""
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = :code"),
        {"code": indicator_code}
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]
    fields = form_schema.get('fields', [])

    if len(fields) > from_index and 'field_notes' in fields[from_index]:
        field_notes = fields[from_index].pop('field_notes')
        if len(fields) > to_index:
            fields[to_index]['field_notes'] = field_notes

    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:fs AS json) WHERE indicator_code = :code"),
        {"fs": json.dumps(form_schema), "code": indicator_code}
    )


def remove_field_by_index(conn, indicator_code: str, field_index: int):
    """Remove a field by index."""
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = :code"),
        {"code": indicator_code}
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]
    if 'fields' in form_schema and len(form_schema['fields']) > field_index:
        form_schema['fields'].pop(field_index)

    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:fs AS json) WHERE indicator_code = :code"),
        {"fs": json.dumps(form_schema), "code": indicator_code}
    )


def update_validation_rule(conn, indicator_code: str, new_rule: str):
    """Update validation rule."""
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = :code"),
        {"code": indicator_code}
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]
    form_schema['validation_rule'] = new_rule

    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:fs AS json) WHERE indicator_code = :code"),
        {"fs": json.dumps(form_schema), "code": indicator_code}
    )


def consolidate_to_single_upload(conn, indicator_code: str, new_label: str):
    """Consolidate multiple upload fields to single upload field."""
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = :code"),
        {"code": indicator_code}
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]

    # Keep only first upload field and update its label
    new_fields = []
    found_upload = False
    for field in form_schema.get('fields', []):
        if field.get('field_type') == 'file_upload' and not found_upload:
            field['label'] = new_label
            field['description'] = new_label
            field['field_id'] = 'upload_section_1'
            new_fields.append(field)
            found_upload = True
        elif field.get('field_type') != 'file_upload':
            new_fields.append(field)

    form_schema['fields'] = new_fields
    form_schema['validation_rule'] = 'ALL_ITEMS_REQUIRED'

    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:fs AS json) WHERE indicator_code = :code"),
        {"fs": json.dumps(form_schema), "code": indicator_code}
    )


def upgrade() -> None:
    """Apply all additional indicator updates."""
    conn = op.get_bind()

    # 1.6.1.1 - Move field_notes from field 0 to field 1
    move_field_notes(conn, '1.6.1.1', 0, 1)

    # 1.6.1.2 - Add CONSIDERATION field_notes
    add_field_notes(conn, '1.6.1.2', 0, {
        "title": "CONSIDERATION:",
        "items": [
            {"text": "In the absence of deposit slips, bank statements will be considered, provided that it shows the transaction date, and that the total 10% of the SK Fund has been transferred."}
        ]
    })

    # 1.6.1.3 - Add OR separator
    add_or_separator(conn, '1.6.1.3', 1)

    # 1.6.2 - Add OR separator and update validation rule
    add_or_separator(conn, '1.6.2', 2)
    update_validation_rule(conn, '1.6.2', 'ANY_ITEM_REQUIRED')

    # 2.1.4 - Remove bottom note (section_header_8 at index 7)
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '2.1.4'")
    )
    row = result.fetchone()
    if row and row[0]:
        form_schema = row[0]
        # Find and remove the section_header with the note
        form_schema['fields'] = [
            f for f in form_schema.get('fields', [])
            if not (f.get('field_id') == 'section_header_8' or
                   (f.get('field_type') == 'section_header' and 'Note: Choose either' in f.get('label', '')))
        ]
        conn.execute(
            sa.text("UPDATE indicators SET form_schema = CAST(:fs AS json) WHERE indicator_code = '2.1.4'"),
            {"fs": json.dumps(form_schema)}
        )

    # 3.1.6 - Add OR separator
    add_or_separator(conn, '3.1.6', 1)

    # 3.3.2 - Update field_notes to include both Note and Photo Requirements
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '3.3.2'")
    )
    row = result.fetchone()
    if row and row[0]:
        form_schema = row[0]
        for field in form_schema.get('fields', []):
            if field.get('field_type') == 'file_upload':
                field['field_notes'] = {
                    "title": "Note:",
                    "items": [
                        {"text": "Photos of the computer database using MS Excel and such are acceptable"},
                        {"text": ""},
                        {"text": "Photo Requirements:"},
                        {"text": "One (1) photo with Distant View; and"},
                        {"text": "One (1) photo with Close-up View"}
                    ]
                }
                break
        conn.execute(
            sa.text("UPDATE indicators SET form_schema = CAST(:fs AS json) WHERE indicator_code = '3.3.2'"),
            {"fs": json.dumps(form_schema)}
        )

    # 3.5.2 - Add OR separator
    add_or_separator(conn, '3.5.2', 1)

    # 4.1.4 - Update label
    update_field_label(conn, '4.1.4', 0,
        "Accomplishment Report covering 1st to 3rd quarter of CY 2023 with received stamp by the C/MSWDO and C/MLGOO")

    # 4.1.7 - Update both field labels
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.1.7'")
    )
    row = result.fetchone()
    if row and row[0]:
        form_schema = row[0]
        if len(form_schema.get('fields', [])) >= 2:
            form_schema['fields'][0]['label'] = "Flow Chart based on Annex C - Establishment of Referral System"
            form_schema['fields'][0]['description'] = "Flow Chart based on Annex C - Establishment of Referral System"
            form_schema['fields'][1]['label'] = "Annex J - Directory Form"
            form_schema['fields'][1]['description'] = "Annex J - Directory Form"
        conn.execute(
            sa.text("UPDATE indicators SET form_schema = CAST(:fs AS json) WHERE indicator_code = '4.1.7'"),
            {"fs": json.dumps(form_schema)}
        )

    # 4.2.2 - Consolidate to single upload field
    consolidate_to_single_upload(conn, '4.2.2',
        "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the Appointment of BHW and/or BHO or BHAsst covering January to October 2023")


def downgrade() -> None:
    """Revert is complex - skipping."""
    pass
