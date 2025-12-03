"""update_indicator_4_1_6_name_and_add_notes

Revision ID: ed5f44166ed0
Revises: 7f4420e1e7b0
Create Date: 2025-12-03 21:55:00.000000

"""
from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ed5f44166ed0'
down_revision: Union[str, Sequence[str], None] = '7f4420e1e7b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# New indicator name
NEW_NAME = "Accomplishment Reports: At least 50% accomplishment (Physical) OR 50% fund utilization (Financial)"

# Notes to add
NOTES = {
    "title": "Note:",
    "items": [
        {
            "text": "Barangay officials have the option to submit both the physical and financial reports. However, for the SGLGB Assessment, only one of the documents is required."
        }
    ]
}


def upgrade() -> None:
    """Update indicator 4.1.6 name and add notes (nothing else modified)."""
    conn = op.get_bind()

    # Update the indicator name only
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET name = :new_name
            WHERE indicator_code = '4.1.6'
        """),
        {"new_name": NEW_NAME}
    )

    # Add notes to form_schema using JSONB merge (preserves all other fields)
    notes_json = json.dumps({"notes": NOTES})
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET form_schema = (form_schema::jsonb || CAST(:notes_json AS jsonb))::json
            WHERE indicator_code = '4.1.6'
        """),
        {"notes_json": notes_json}
    )


def downgrade() -> None:
    """Revert indicator 4.1.6 name and remove notes."""
    conn = op.get_bind()

    # Revert the indicator name
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET name = 'Accomplishment Reports: Physical accomplishment OR fund utilization (only 1 of the below reports is required)'
            WHERE indicator_code = '4.1.6'
        """)
    )

    # Remove notes from form_schema
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET form_schema = (form_schema::jsonb - 'notes')::json
            WHERE indicator_code = '4.1.6'
        """)
    )
