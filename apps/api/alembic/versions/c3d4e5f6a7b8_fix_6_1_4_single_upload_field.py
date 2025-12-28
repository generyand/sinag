"""fix_6_1_4_single_upload_field

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2025-12-14 10:00:00.000000

"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Correct label for the single upload field
UPLOAD_LABEL = "Three (3) Monthly Accomplishment Reports"
UPLOAD_INSTRUCTIONS = "Upload: Three (3) Monthly Accomplishment Reports"


def upgrade() -> None:
    """Fix indicator 6.1.4 to have only 1 upload field on BLGU side."""
    conn = op.get_bind()

    # Get current form_schema
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '6.1.4'")
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]

    # Fix the fields array - should only have 1 upload field for BLGU
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

    # Update upload_instructions
    form_schema["upload_instructions"] = UPLOAD_INSTRUCTIONS

    # Fix assessor_validation fields
    form_schema["assessor_validation"] = {
        "fields": [
            {
                "type": "upload_section_checkbox",
                "field_id": "upload_section_1",
                "label": UPLOAD_LABEL,
                "description": UPLOAD_LABEL,
                "requires_document_count": False,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "6_1_4_upload",
                "label": UPLOAD_LABEL,
                "group_name": None,
                "description": None,
                "required": False,
                "requires_document_count": False,
                "display_order": 1,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "6_1_4_report_count",
                "label": "Monthly Accomplishment Reports were submitted",
                "group_name": None,
                "description": "Please supply the number of documents submitted",
                "required": False,
                "requires_document_count": False,
                "display_order": 2,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "6_1_4_option_a",
                "label": "a. At least 50% accomplishment of the physical targets in the BESWMP",
                "group_name": None,
                "description": "Assessment for physical accomplishment option",
                "required": False,
                "requires_document_count": False,
                "display_order": 3,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "6_1_4_physical_accomplished",
                "label": "Total number of activities/projects accomplished",
                "group_name": None,
                "description": "Please supply the required information:",
                "required": False,
                "requires_document_count": False,
                "display_order": 4,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "6_1_4_physical_reflected",
                "label": "Total number of activities/projects reflected in the BESWMP",
                "group_name": None,
                "description": None,
                "required": False,
                "requires_document_count": False,
                "display_order": 5,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "6_1_4_or",
                "label": "OR",
                "group_name": None,
                "description": "OR",
                "required": False,
                "requires_document_count": False,
                "display_order": 6,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "6_1_4_option_b",
                "label": "b. At least 50% utilization rate of BESWM Budget",
                "group_name": None,
                "description": "Assessment for fund utilization option",
                "required": False,
                "requires_document_count": False,
                "display_order": 7,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "6_1_4_financial_utilized",
                "label": "Total amount utilized (as of {DEC_31_CURRENT_YEAR})",
                "group_name": None,
                "description": "Please supply the required information:",
                "required": False,
                "requires_document_count": False,
                "display_order": 8,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "6_1_4_financial_allocated",
                "label": "Total amount allocated for PPAs in the BESWM Plan",
                "group_name": None,
                "description": None,
                "required": False,
                "requires_document_count": False,
                "display_order": 9,
            },
        ]
    }

    # Save form_schema back to database
    conn.execute(
        sa.text(
            "UPDATE indicators SET form_schema = CAST(:form_schema AS json) "
            "WHERE indicator_code = '6.1.4'"
        ),
        {"form_schema": json.dumps(form_schema)},
    )


def downgrade() -> None:
    """Revert is not practical - this fixes broken data."""
    pass
