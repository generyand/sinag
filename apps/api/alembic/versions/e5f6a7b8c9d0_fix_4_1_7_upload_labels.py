"""fix_4_1_7_upload_labels

Revision ID: a1b2c3d4e5f6
Revises: f8c7d9e2a1b3
Create Date: 2025-12-14 09:45:00.000000

"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "f8c7d9e2a1b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Correct labels for 4.1.7 upload fields
LABEL_1 = "Flow Chart based on Annex C - Establishment of Referral System"
LABEL_2 = "Annex J - Directory Form"


def upgrade() -> None:
    """Fix indicator 4.1.7 upload field labels."""
    conn = op.get_bind()

    # Get current form_schema
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.1.7'")
    )
    row = result.fetchone()
    if not row or not row[0]:
        return

    form_schema = row[0]

    # Fix the fields array - update labels
    form_schema["fields"] = [
        {
            "field_id": "upload_section_1",
            "field_type": "file_upload",
            "label": LABEL_1,
            "description": LABEL_1,
            "required": True,
            "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
            "multiple": True,
            "max_size": 50,
        },
        {
            "field_id": "upload_section_2",
            "field_type": "file_upload",
            "label": LABEL_2,
            "description": LABEL_2,
            "required": True,
            "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
            "multiple": True,
            "max_size": 50,
        },
    ]

    # Update upload_instructions
    form_schema["upload_instructions"] = (
        f"Upload the following (both required):\n\n1. {LABEL_1}\n2. {LABEL_2}"
    )

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
                "item_id": "4_1_7_1_upload",
                "label": LABEL_1,
                "group_name": None,
                "description": "Verification of uploaded Flow Chart based on Annex C (For profiling only)",
                "required": False,
                "requires_document_count": False,
                "display_order": 1,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "4_1_7_2_upload",
                "label": LABEL_2,
                "group_name": None,
                "description": "Verification of uploaded Annex J - Directory Form (For profiling only)",
                "required": False,
                "requires_document_count": False,
                "display_order": 2,
            },
        ]
    }

    # Save form_schema back to database
    conn.execute(
        sa.text(
            "UPDATE indicators SET form_schema = CAST(:form_schema AS json) "
            "WHERE indicator_code = '4.1.7'"
        ),
        {"form_schema": json.dumps(form_schema)},
    )

    # Also update checklist_items table labels
    conn.execute(
        sa.text("UPDATE checklist_items SET label = :label WHERE item_id = '4_1_7_1_upload'"),
        {"label": LABEL_1},
    )
    conn.execute(
        sa.text("UPDATE checklist_items SET label = :label WHERE item_id = '4_1_7_2_upload'"),
        {"label": LABEL_2},
    )


def downgrade() -> None:
    """Revert is not practical - this fixes label formatting."""
    pass
