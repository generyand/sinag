"""fix_4_1_5_single_upload_field

Revision ID: f8c7d9e2a1b3
Revises: 755d018546e3
Create Date: 2025-12-14 09:30:00.000000

"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f8c7d9e2a1b3"
down_revision: Union[str, Sequence[str], None] = "755d018546e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Correct label for the single upload field (matches indicator definition)
UPLOAD_LABEL = (
    "Copy of the generated report or screenshot of the updated database on VAW cases "
    "reported to the barangay with the total no. of VAW cases and assistance provided"
)


def upgrade() -> None:
    """Fix indicator 4.1.5 to have only 1 upload field on BLGU side."""
    conn = op.get_bind()

    # Get current form_schema
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.1.5'")
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
            "description": form_schema.get("upload_instructions", UPLOAD_LABEL),
            "required": True,
            "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
            "multiple": True,
            "max_size": 50,
        }
    ]

    # Fix assessor_validation fields - keep upload checkbox + all checklist items
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
                "item_id": "4_1_5_upload_1",
                "label": (
                    "Copy of the generated report or screenshot of the updated database on VAW cases "
                    "reported to the barangay with the following information at the minimum:"
                ),
                "group_name": None,
                "description": (
                    "Verification of uploaded database report or screenshot showing VAW cases "
                    "and assistance provided"
                ),
                "required": True,
                "requires_document_count": False,
                "display_order": 1,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "4_1_5_total_cases",
                "label": "Total number of VAW cases received",
                "group_name": None,
                "description": "Please supply the number of documents submitted:",
                "required": True,
                "requires_document_count": True,
                "display_order": 2,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "4_1_5_ra_9262",
                "label": "Number of cases documented for violating RA 9262",
                "group_name": None,
                "description": None,
                "required": True,
                "requires_document_count": True,
                "display_order": 3,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "4_1_5_other_laws",
                "label": "Number of cases documented for violating other VAW-related laws",
                "group_name": None,
                "description": None,
                "required": True,
                "requires_document_count": True,
                "display_order": 4,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "4_1_5_assistance",
                "label": "Assistance provided to victim-survivors",
                "group_name": None,
                "description": None,
                "required": True,
                "requires_document_count": True,
                "display_order": 5,
            },
        ]
    }

    # Save back to database
    conn.execute(
        sa.text(
            "UPDATE indicators SET form_schema = CAST(:form_schema AS json) "
            "WHERE indicator_code = '4.1.5'"
        ),
        {"form_schema": json.dumps(form_schema)},
    )


def downgrade() -> None:
    """Revert is not practical - this fixes broken data."""
    pass
