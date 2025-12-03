"""add_notes_to_3_2_1

Revision ID: 63e549ac19d3
Revises: 9a0064a7c8ba
Create Date: 2025-12-03 20:40:29.532390

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import json

# revision identifiers, used by Alembic.
revision: str = '63e549ac19d3'
down_revision: Union[str, Sequence[str], None] = '9a0064a7c8ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Complete form_schema for 3.2.1 with notes and only 1 upload field
FORM_SCHEMA_3_2_1 = {
    "sections": [
        {
            "id": "uploads",
            "title": "Upload Requirements",
            "fields": [
                {
                    "field_id": "3_2_1_upload",
                    "field_type": "file_upload",
                    "label": "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) indicating correct membership in accordance to the EO 366 s. of 1996, covering January to October 2023",
                    "description": "EO or similar issuance organizing BPOC with compliant composition",
                    "required": True,
                    "accept": ".pdf,.doc,.docx,.jpg,.jpeg,.png",
                    "multiple": True,
                    "max_size": 50
                }
            ]
        }
    ],
    "checklist_items": [
        {
            "id": "3_2_1_upload",
            "label": "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) indicating correct membership in accordance to the EO 366 s. of 1996, covering January to October 2023",
            "mov_description": "Verification of uploaded Executive Order or similar issuance organizing BPOC with compliant composition",
            "item_type": "checkbox",
            "required": False,
            "display_order": 1
        }
    ],
    "notes": {
        "title": "Minimum composition of the BPOC:",
        "items": [
            {"label": "1.", "text": "Punong Barangay"},
            {"label": "2.", "text": "Sangguniang Kabataan Chairperson"},
            {"label": "3.", "text": "A member of the Lupon Tagapamayapa"},
            {"label": "4.", "text": "A Public School Teacher"},
            {"label": "5.", "text": "PNP Officer"},
            {"label": "6.", "text": "A representative of the Interfaith Group"},
            {"label": "7.", "text": "A Senior Citizen"},
            {"label": "8.", "text": "At least three (3) members of the existing Barangay-Based Anti-Crime or Neighborhood Watch Groups or an NGO representative"},
            {"label": "9.", "text": "A Barangay Tanod"}
        ]
    }
}


def upgrade() -> None:
    """Add notes and fix form_schema for 3.2.1."""
    form_schema_json = json.dumps(FORM_SCHEMA_3_2_1)
    form_schema_escaped = form_schema_json.replace("'", "''")

    op.execute(
        f"""
        UPDATE indicators
        SET form_schema = '{form_schema_escaped}'::json
        WHERE indicator_code = '3.2.1'
        """
    )


def downgrade() -> None:
    """Remove notes from 3.2.1."""
    pass
