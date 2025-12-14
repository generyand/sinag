"""fix_4_2_2_upload_fields_with_and_or

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2025-12-14 09:50:00.000000

"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Correct labels for 4.2.2 upload fields
LABEL_1 = "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the Appointment of BHW"
LABEL_2 = "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the Appointment of BHO or BHAsst"

UPLOAD_INSTRUCTIONS = f"Upload the following:\n\n1. {LABEL_1}\n\nAND/OR\n\n2. {LABEL_2}"


def upgrade() -> None:
    """Fix indicator 4.2.2 to have 2 upload fields with AND/OR divider."""
    conn = op.get_bind()

    # Get current form_schema
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.2.2'")
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]

    # Fix the fields array - 2 upload fields with AND/OR divider
    form_schema["fields"] = [
        {
            "field_id": "upload_section_1",
            "field_type": "file_upload",
            "label": LABEL_1,
            "description": LABEL_1,
            "required": False,  # OR logic - not all required
            "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
            "multiple": True,
            "max_size": 50,
        },
        {
            "field_id": "or_separator_1",
            "field_type": "info_text",
            "label": "AND/OR",
            "description": "",
            "required": False,
        },
        {
            "field_id": "upload_section_2",
            "field_type": "file_upload",
            "label": LABEL_2,
            "description": LABEL_2,
            "required": False,  # OR logic - not all required
            "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
            "multiple": True,
            "max_size": 50,
        },
    ]

    # Update upload_instructions
    form_schema["upload_instructions"] = UPLOAD_INSTRUCTIONS

    # Fix assessor_validation fields
    form_schema["assessor_validation"] = {
        "fields": [
            {
                "type": "upload_section_checkbox",
                "field_id": "upload_section_1",
                "label": LABEL_1,
                "description": LABEL_1,
                "requires_document_count": False,
            },
            {
                "type": "upload_section_checkbox",
                "field_id": "upload_section_2",
                "label": LABEL_2,
                "description": LABEL_2,
                "requires_document_count": False,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "4_2_2_bhw",
                "label": LABEL_1,
                "group_name": None,
                "description": None,
                "required": False,
                "requires_document_count": False,
                "display_order": 1,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "4_2_2_and_or_separator",
                "label": "AND/OR",
                "group_name": None,
                "description": None,
                "required": False,
                "requires_document_count": False,
                "display_order": 2,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "4_2_2_bho",
                "label": LABEL_2,
                "group_name": None,
                "description": None,
                "required": False,
                "requires_document_count": False,
                "display_order": 3,
            },
        ]
    }

    # Save form_schema back to database
    conn.execute(
        sa.text(
            "UPDATE indicators SET form_schema = CAST(:form_schema AS json) "
            "WHERE indicator_code = '4.2.2'"
        ),
        {"form_schema": json.dumps(form_schema)},
    )


def downgrade() -> None:
    """Revert is not practical - this fixes field structure."""
    pass
