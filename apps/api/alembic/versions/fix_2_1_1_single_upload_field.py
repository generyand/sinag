"""fix_2_1_1_single_upload_field

Revision ID: fix_2_1_1_single_upload_field
Revises: add_assessment_year_support
Create Date: 2025-12-08

Fix indicator 2.1.1 form_schema to have only 1 upload field instead of 3.
The issue was that bullet points in upload_instructions were being parsed as upload fields.
"""

from typing import Sequence, Union

from alembic import op
import json

# revision identifiers, used by Alembic.
revision: str = "fix_2_1_1_single_upload_field"
down_revision: Union[str, Sequence[str], None] = "add_assessment_year_support"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Correct form_schema for 2.1.1 with:
# - Only 1 upload field (not 3)
# - Dynamic year placeholder {JAN_TO_OCT_CURRENT_YEAR}
# - Proper field_id and field_type attributes
# - Notes section for minimum composition requirements
FORM_SCHEMA_2_1_1 = {
    "type": "mov_checklist",
    "fields": [
        {
            "field_id": "upload_section_1",
            "field_type": "file_upload",
            "label": "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering {JAN_TO_OCT_CURRENT_YEAR}",
            "description": "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering {JAN_TO_OCT_CURRENT_YEAR}",
            "required": True,
            "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
            "multiple": True,
            "max_size": 50,
        }
    ],
    "validation_rule": "ALL_ITEMS_REQUIRED",
    "upload_instructions": "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering {JAN_TO_OCT_CURRENT_YEAR}",
    "assessor_validation": {
        "fields": [
            {
                "type": "upload_section_checkbox",
                "field_id": "upload_section_1",
                "label": "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering {JAN_TO_OCT_CURRENT_YEAR}",
                "description": "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering {JAN_TO_OCT_CURRENT_YEAR}",
                "requires_document_count": False,
            },
            {
                "type": "checklist_item_checkbox",
                "item_id": "2_1_1_eo",
                "label": "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering {JAN_TO_OCT_CURRENT_YEAR}",
                "group_name": None,
                "description": None,
                "required": True,
                "requires_document_count": False,
                "display_order": 1,
            },
        ]
    },
    "notes": {
        "title": "Minimum Composition of the BDRRMC:",
        "items": [
            {"label": "1.", "text": "Punong Barangay;"},
            {
                "label": "2.",
                "text": "A Representative from the Sangguniang Barangay; and",
            },
            {
                "label": "3.",
                "text": "2 CSO representatives from the existing and active community-based people's organizations representing the most vulnerable and marginalized groups in the barangay (Item 5.7. of NDRRMC, DILG, DBM, and CSC JMC No. 2014-01)",
            },
        ],
    },
}


def upgrade() -> None:
    """Replace the entire form_schema for 2.1.1 with the correct single upload field."""
    form_schema_json = json.dumps(FORM_SCHEMA_2_1_1)
    form_schema_escaped = form_schema_json.replace("'", "''")

    op.execute(
        f"""
        UPDATE indicators
        SET form_schema = '{form_schema_escaped}'::json
        WHERE indicator_code = '2.1.1'
        """
    )

    # Also update the checklist_items label to include the dynamic year
    op.execute(
        """
        UPDATE checklist_items
        SET label = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering {JAN_TO_OCT_CURRENT_YEAR}'
        WHERE item_id = '2_1_1_eo'
        """
    )


def downgrade() -> None:
    """Revert to previous form_schema."""
    pass
