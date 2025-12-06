"""add_notes_to_indicator_1_1_1_form_schema

Revision ID: f53a040f0415
Revises: 8d66ae521094
Create Date: 2025-12-03 19:45:48.807157

"""

from typing import Sequence, Union

from alembic import op
import json

# revision identifiers, used by Alembic.
revision: str = "f53a040f0415"
down_revision: Union[str, Sequence[str], None] = "8d66ae521094"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Notes to add to indicator 1.1.1 form_schema
NOTES_DATA = {
    "title": "Note:",
    "items": [
        {"label": "a)", "text": "Barangay Financial Report"},
        {"label": "b)", "text": "Barangay Budget"},
        {"label": "c)", "text": "Summary of Income and Expenditures"},
        {"label": "d)", "text": "20% CoUtilization"},
        {"label": "e)", "text": "Annual Procurement Plan or Procurement List"},
        {
            "label": "f)",
            "text": "List of Notices of Award (1st - 3rd Quarter of CY 2023)",
        },
        {
            "label": "g)",
            "text": "Itemized Monthly Collections and Disbursements (January to September 2023)",
        },
    ],
}


def upgrade() -> None:
    """Add notes section to indicator 1.1.1 form_schema."""
    # Cast JSON to JSONB for operations, then back to JSON
    notes_json = json.dumps(NOTES_DATA)
    op.execute(
        f"""
        UPDATE indicators
        SET form_schema = (form_schema::jsonb || jsonb_build_object('notes', '{notes_json}'::jsonb))::json
        WHERE indicator_code = '1.1.1'
        AND form_schema IS NOT NULL
        """
    )


def downgrade() -> None:
    """Remove notes section from indicator 1.1.1 form_schema."""
    op.execute(
        """
        UPDATE indicators
        SET form_schema = (form_schema::jsonb - 'notes')::json
        WHERE indicator_code = '1.1.1'
        AND form_schema IS NOT NULL
        """
    )
