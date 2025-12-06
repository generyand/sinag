"""update_indicator_3_2_3_name_and_add_notes

Revision ID: 21f8ec1016e3
Revises: a4d5f31767e8
Create Date: 2025-12-03 21:25:38.129411

"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "21f8ec1016e3"
down_revision: Union[str, Sequence[str], None] = "a4d5f31767e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# New indicator name
NEW_NAME = "Accomplishment Reports: At least 50% accomplishment (Physical) OR 50% fund utilization (Financial)"
OLD_NAME = "Accomplishment Reports: At least 50% accomplishment (physical OR financial)"

# Notes to add
NOTES = {
    "title": "Note:",
    "items": [
        {
            "text": "Barangay officials have the option to submit both the physical and financial reports. However, for the SGLGB Assessment, only one of the documents is required."
        }
    ],
}


def upgrade() -> None:
    """Update indicator 3.2.3 name and add notes."""
    conn = op.get_bind()

    # Update the indicator name
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET name = :new_name
            WHERE indicator_code = '3.2.3'
        """),
        {"new_name": NEW_NAME},
    )

    # Add notes to form_schema using JSONB merge (cast both sides to jsonb)
    notes_json = json.dumps({"notes": NOTES})
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET form_schema = (form_schema::jsonb || CAST(:notes_json AS jsonb))::json
            WHERE indicator_code = '3.2.3'
        """),
        {"notes_json": notes_json},
    )


def downgrade() -> None:
    """Revert indicator 3.2.3 name and remove notes."""
    conn = op.get_bind()

    # Revert the indicator name
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET name = :old_name
            WHERE indicator_code = '3.2.3'
        """),
        {"old_name": OLD_NAME},
    )

    # Remove notes from form_schema
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET form_schema = (form_schema::jsonb - 'notes')::json
            WHERE indicator_code = '3.2.3'
        """)
    )
