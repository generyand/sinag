"""add_notes_to_multiple_indicators

Revision ID: 38561fc163b2
Revises: f53a040f0415
Create Date: 2025-12-03 20:04:52.787385

"""

from typing import Sequence, Union

from alembic import op
import json

# revision identifiers, used by Alembic.
revision: str = "38561fc163b2"
down_revision: Union[str, Sequence[str], None] = "f53a040f0415"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Notes data for each indicator
INDICATOR_NOTES = {
    "1.4.1": {
        "title": "Note:",
        "items": [
            {
                "label": "a)",
                "text": "At least 20% of the NTA is allocated for development programs;",
            },
            {
                "label": "b)",
                "text": "Not less than five percent (5%) shall be set aside as the Local Disaster Risk Reduction and Management Fund;",
            },
            {"label": "c)", "text": "Gender and Development;"},
            {"label": "d)", "text": "Senior Citizens and Persons with Disabilities;"},
            {
                "label": "e)",
                "text": "Implementation of the programs of the Local Councils for the Protection of Children; and",
            },
            {"label": "f)", "text": "Ten percent (10%) for the Sangguniang Kabataan"},
        ],
    },
    "1.6.1.3": {
        "title": "Note:",
        "items": [
            {
                "text": "SK Resolution authorizing the barangay to utilize the SK Funds if the SK has no bank account yet shall not be considered as MOV under the indicator."
            },
        ],
    },
    "2.1.1": {
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
    "2.3.2": {
        "title": "Note:",
        "items": [
            {
                "label": "a)",
                "text": "Communication equipment (i.e., 2 way radio mobile phone)",
            },
            {"label": "b)", "text": "Rescue vehicle/Barangay patrol"},
            {"label": "c)", "text": "Generator set/alternative sources of energy"},
            {"label": "d)", "text": "First aid kit"},
            {"label": "e)", "text": "Flashlight with batteries"},
            {"label": "f)", "text": "Personal Protective Equipment (PPE)"},
        ],
    },
    "3.1.1": {
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
    """Add notes section to multiple indicators form_schema."""
    for indicator_code, notes_data in INDICATOR_NOTES.items():
        notes_json = json.dumps(notes_data)
        # Escape single quotes in JSON for SQL
        notes_json_escaped = notes_json.replace("'", "''")
        op.execute(
            f"""
            UPDATE indicators
            SET form_schema = (form_schema::jsonb || jsonb_build_object('notes', '{notes_json_escaped}'::jsonb))::json
            WHERE indicator_code = '{indicator_code}'
            AND form_schema IS NOT NULL
            """
        )


def downgrade() -> None:
    """Remove notes section from multiple indicators form_schema."""
    for indicator_code in INDICATOR_NOTES.keys():
        op.execute(
            f"""
            UPDATE indicators
            SET form_schema = (form_schema::jsonb - 'notes')::json
            WHERE indicator_code = '{indicator_code}'
            AND form_schema IS NOT NULL
            """
        )
