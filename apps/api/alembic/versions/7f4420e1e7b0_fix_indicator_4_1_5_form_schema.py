"""fix_indicator_4_1_5_form_schema

Revision ID: 7f4420e1e7b0
Revises: 184511477e6d
Create Date: 2025-12-03 21:50:00.000000

"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7f4420e1e7b0"
down_revision: Union[str, Sequence[str], None] = "184511477e6d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Correct label for the single upload field
UPLOAD_LABEL = "Copy of the generated report or screenshot of the updated database of VAW cases reported to the barangay with the total no. of VAW Cases and assistance provided"


def upgrade() -> None:
    """Fix indicator 4.1.5 to have only 1 upload field with correct label."""
    conn = op.get_bind()

    # Get current form_schema
    result = conn.execute(
        sa.text("""
            SELECT form_schema FROM indicators WHERE indicator_code = '4.1.5'
        """)
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]

    # Fix the fields array - should only have 1 upload field
    form_schema["fields"] = [
        {
            "field_id": "upload_section_1",
            "field_type": "file_upload",
            "label": UPLOAD_LABEL,
            "description": UPLOAD_LABEL,
            "required": True,
            "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
            "multiple": True,
            "max_size": 50,
        }
    ]

    # Fix assessor_validation to match
    form_schema["assessor_validation"]["fields"] = [
        {
            "type": "upload_section_checkbox",
            "field_id": "upload_section_1",
            "label": UPLOAD_LABEL,
            "description": UPLOAD_LABEL,
            "requires_document_count": False,
        },
        {
            "type": "checklist_item_checkbox",
            "item_id": "4_1_5_upload_1",
            "label": "Copy of the generated report or screenshot of the updated database on VAW cases reported to the barangay with the following information at the minimum:",
            "group_name": None,
            "description": "Verification of uploaded database report or screenshot showing VAW cases and assistance provided",
            "required": True,
            "requires_document_count": False,
            "display_order": 1,
        },
        {
            "type": "checklist_item_checkbox",
            "item_id": "4_1_5_total_cases",
            "label": "Please supply the number of documents submitted:\nTotal number of VAW cases received",
            "group_name": None,
            "description": "Input field for total number of VAW cases received",
            "required": True,
            "requires_document_count": True,
            "display_order": 2,
        },
        {
            "type": "checklist_item_checkbox",
            "item_id": "4_1_5_ra_9262",
            "label": "Total number of cases documented for violating RA 9262",
            "group_name": None,
            "description": "Input field for total number of cases documented for violating RA 9262",
            "required": True,
            "requires_document_count": True,
            "display_order": 3,
        },
        {
            "type": "checklist_item_checkbox",
            "item_id": "4_1_5_other_laws",
            "label": "Total number of cases documented for violating other VAW-related laws",
            "group_name": None,
            "description": "Input field for total number of cases documented for violating other VAW-related laws",
            "required": True,
            "requires_document_count": True,
            "display_order": 4,
        },
        {
            "type": "checklist_item_checkbox",
            "item_id": "4_1_5_assistance",
            "label": "Total number of assistance provided to victim-survivors",
            "group_name": None,
            "description": "Input field for total number of assistance provided to victim-survivors",
            "required": True,
            "requires_document_count": True,
            "display_order": 5,
        },
    ]

    # Save back to database
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET form_schema = CAST(:form_schema AS json)
            WHERE indicator_code = '4.1.5'
        """),
        {"form_schema": json.dumps(form_schema)},
    )


def downgrade() -> None:
    """Revert is not practical - this fixes broken data."""
    pass
