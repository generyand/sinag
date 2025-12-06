"""fix_2_1_1_form_schema_structure

Revision ID: 39e48dc69711
Revises: 36cc2d19ae83
Create Date: 2025-12-03 20:23:14.666452

"""

from typing import Sequence, Union

from alembic import op
import json

# revision identifiers, used by Alembic.
revision: str = "39e48dc69711"
down_revision: Union[str, Sequence[str], None] = "36cc2d19ae83"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Complete correct form_schema for 2.1.1 - only 1 upload field with proper label
FORM_SCHEMA_2_1_1 = {
    "sections": [
        {
            "id": "uploads",
            "title": "Upload Requirements",
            "fields": [
                {
                    "id": "2_1_1_eo",
                    "type": "file_upload",
                    "label": "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering January to October 2023",
                    "required": True,
                    "accept": ".pdf,.doc,.docx,.jpg,.jpeg,.png",
                    "maxFiles": 5,
                    "maxSizeMB": 50,
                }
            ],
        }
    ],
    "checklist_items": [
        {
            "id": "2_1_1_eo",
            "label": "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering January to October 2023",
            "required": True,
            "requires_document_count": False,
            "display_order": 1,
        }
    ],
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
    """Replace the entire form_schema for 2.1.1 with the correct structure."""
    form_schema_json = json.dumps(FORM_SCHEMA_2_1_1)
    form_schema_escaped = form_schema_json.replace("'", "''")

    op.execute(
        f"""
        UPDATE indicators
        SET form_schema = '{form_schema_escaped}'::json
        WHERE indicator_code = '2.1.1'
        """
    )


def downgrade() -> None:
    """Revert to previous form_schema (with extra fields)."""
    # This would restore the old structure - but since we're fixing a bug,
    # we'll leave it as a no-op for the downgrade
    pass
