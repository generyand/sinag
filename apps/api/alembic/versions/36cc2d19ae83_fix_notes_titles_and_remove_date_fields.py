"""fix_notes_titles_and_remove_date_fields

Revision ID: 36cc2d19ae83
Revises: 38561fc163b2
Create Date: 2025-12-03 20:16:03.559733

"""

from typing import Sequence, Union

from alembic import op
import json

# revision identifiers, used by Alembic.
revision: str = "36cc2d19ae83"
down_revision: Union[str, Sequence[str], None] = "38561fc163b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Updated notes data with correct titles
NOTES_UPDATES = {
    "1.4.1": {
        "title": "Allocated funds for:",
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
    "2.3.2": {
        "title": "Disaster supplies/equipment:",
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
}

# Checklist items for 2.1.1 (only 1 item, removed date field)
CHECKLIST_2_1_1 = [
    {
        "id": "2_1_1_eo",
        "label": "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering January to October 2023",
        "required": True,
        "requires_document_count": False,
        "display_order": 1,
    }
]

# Checklist items for 3.1.1 (only 1 item, removed date field)
CHECKLIST_3_1_1 = [
    {
        "id": "3_1_1_upload",
        "label": "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) creating the BADAC with its composition and appropriate committees, covering January to October 2023",
        "mov_description": "Verification that the EO/issuance creates BADAC with proper composition and committees",
        "item_type": "checkbox",
        "required": False,
        "display_order": 1,
    }
]


def upgrade() -> None:
    """Fix notes titles and remove date fields from checklist items."""

    # Update notes titles for 1.4.1 and 2.3.2
    for indicator_code, notes_data in NOTES_UPDATES.items():
        notes_json = json.dumps(notes_data)
        notes_json_escaped = notes_json.replace("'", "''")
        op.execute(
            f"""
            UPDATE indicators
            SET form_schema = (form_schema::jsonb || jsonb_build_object('notes', '{notes_json_escaped}'::jsonb))::json
            WHERE indicator_code = '{indicator_code}'
            AND form_schema IS NOT NULL
            """
        )

    # Update 2.1.1 checklist items (remove date field)
    checklist_2_1_1_json = json.dumps(CHECKLIST_2_1_1)
    checklist_2_1_1_escaped = checklist_2_1_1_json.replace("'", "''")
    op.execute(
        f"""
        UPDATE indicators
        SET form_schema = (form_schema::jsonb || jsonb_build_object('checklist_items', '{checklist_2_1_1_escaped}'::jsonb))::json
        WHERE indicator_code = '2.1.1'
        AND form_schema IS NOT NULL
        """
    )

    # Update 3.1.1 checklist items (remove date field)
    checklist_3_1_1_json = json.dumps(CHECKLIST_3_1_1)
    checklist_3_1_1_escaped = checklist_3_1_1_json.replace("'", "''")
    op.execute(
        f"""
        UPDATE indicators
        SET form_schema = (form_schema::jsonb || jsonb_build_object('checklist_items', '{checklist_3_1_1_escaped}'::jsonb))::json
        WHERE indicator_code = '3.1.1'
        AND form_schema IS NOT NULL
        """
    )


def downgrade() -> None:
    """Revert notes titles and restore date fields."""

    # Revert notes titles to "Note:"
    old_notes = {
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
                {
                    "label": "d)",
                    "text": "Senior Citizens and Persons with Disabilities;",
                },
                {
                    "label": "e)",
                    "text": "Implementation of the programs of the Local Councils for the Protection of Children; and",
                },
                {
                    "label": "f)",
                    "text": "Ten percent (10%) for the Sangguniang Kabataan",
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
    }

    for indicator_code, notes_data in old_notes.items():
        notes_json = json.dumps(notes_data)
        notes_json_escaped = notes_json.replace("'", "''")
        op.execute(
            f"""
            UPDATE indicators
            SET form_schema = (form_schema::jsonb || jsonb_build_object('notes', '{notes_json_escaped}'::jsonb))::json
            WHERE indicator_code = '{indicator_code}'
            AND form_schema IS NOT NULL
            """
        )

    # Restore 2.1.1 checklist items with date field
    old_checklist_2_1_1 = [
        {
            "id": "2_1_1_eo",
            "label": "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering January to October 2023",
            "required": True,
            "requires_document_count": False,
            "display_order": 1,
        },
        {
            "id": "2_1_1_date",
            "label": "Date of approval",
            "required": True,
            "requires_document_count": True,
            "display_order": 2,
        },
    ]
    checklist_json = json.dumps(old_checklist_2_1_1)
    checklist_escaped = checklist_json.replace("'", "''")
    op.execute(
        f"""
        UPDATE indicators
        SET form_schema = (form_schema::jsonb || jsonb_build_object('checklist_items', '{checklist_escaped}'::jsonb))::json
        WHERE indicator_code = '2.1.1'
        AND form_schema IS NOT NULL
        """
    )

    # Restore 3.1.1 checklist items with date field
    old_checklist_3_1_1 = [
        {
            "id": "3_1_1_upload",
            "label": "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) creating the BADAC with its composition and appropriate committees, covering January to October 2023",
            "mov_description": "Verification that the EO/issuance creates BADAC with proper composition and committees",
            "item_type": "checkbox",
            "required": False,
            "display_order": 1,
        },
        {
            "id": "3_1_1_date",
            "label": "Date of approval",
            "mov_description": "Please supply the required information:",
            "item_type": "document_count",
            "required": False,
            "display_order": 2,
        },
    ]
    checklist_json = json.dumps(old_checklist_3_1_1)
    checklist_escaped = checklist_json.replace("'", "''")
    op.execute(
        f"""
        UPDATE indicators
        SET form_schema = (form_schema::jsonb || jsonb_build_object('checklist_items', '{checklist_escaped}'::jsonb))::json
        WHERE indicator_code = '3.1.1'
        AND form_schema IS NOT NULL
        """
    )
