"""fix_3_1_1_notes_structure

Revision ID: a4d5f31767e8
Revises: 63e549ac19d3
Create Date: 2025-12-03 20:42:17.281676

"""

from typing import Sequence, Union

from alembic import op
import json

# revision identifiers, used by Alembic.
revision: str = "a4d5f31767e8"
down_revision: Union[str, Sequence[str], None] = "63e549ac19d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Complete form_schema for 3.1.1 with proper notes structure
FORM_SCHEMA_3_1_1 = {
    "sections": [
        {
            "id": "uploads",
            "title": "Upload Requirements",
            "fields": [
                {
                    "field_id": "3_1_1_upload",
                    "field_type": "file_upload",
                    "label": "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) creating the BADAC with its composition and appropriate committees, covering January to October 2023",
                    "description": "EO or similar issuance creating BADAC with proper composition and committees",
                    "required": True,
                    "accept": ".pdf,.doc,.docx,.jpg,.jpeg,.png",
                    "multiple": True,
                    "max_size": 50,
                }
            ],
        }
    ],
    "checklist_items": [
        {
            "id": "3_1_1_upload",
            "label": "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) creating the BADAC with its composition and appropriate committees, covering January to October 2023",
            "mov_description": "Verification that the EO/issuance creates BADAC with proper composition and committees",
            "item_type": "checkbox",
            "required": False,
            "display_order": 1,
        }
    ],
    "notes": {
        "title": "Minimum Composition of the BADAC:",
        "items": [
            {"label": "1.", "text": "Punong Barangay"},
            {"label": "2.", "text": "SBM"},
            {"label": "3.", "text": "SK Chairperson"},
            {"label": "4.", "text": "Public School Principal/Representative"},
            {"label": "5.", "text": "Chief Tanod/ Executive Officer"},
            {"label": "6.", "text": "At least 2 representatives of NGOs/CSOs"},
            {"label": "7.", "text": "Representative of Faith-Based Organization"},
            {"label": "8.", "text": "C/M Chief of Police or Representative"},
            {"text": ""},
            {"text": "Minimum Composition of the BADAC Committees:"},
            {"label": "A.", "text": "Committee on Operations"},
            {"label": "   1.", "text": "SBM"},
            {"label": "   2.", "text": "Executive Officer/Chief Tanod"},
            {"label": "   3.", "text": "BADAC Auxiliary Team (BAT)"},
            {"text": ""},
            {"label": "B.", "text": "Committee on Advocacy"},
            {"label": "   1.", "text": "SBM"},
            {"label": "   2.", "text": "SK Chairperson"},
            {"label": "   3.", "text": "Public School Principal/Representative"},
            {"label": "   4.", "text": "At least 2 representatives of NGOs/CSOs"},
            {"label": "   5.", "text": "Representative of Faith-Based Organization"},
        ],
    },
}


def upgrade() -> None:
    """Fix notes structure for 3.1.1."""
    form_schema_json = json.dumps(FORM_SCHEMA_3_1_1)
    form_schema_escaped = form_schema_json.replace("'", "''")

    op.execute(
        f"""
        UPDATE indicators
        SET form_schema = '{form_schema_escaped}'::json
        WHERE indicator_code = '3.1.1'
        """
    )


def downgrade() -> None:
    """Revert notes structure."""
    pass
