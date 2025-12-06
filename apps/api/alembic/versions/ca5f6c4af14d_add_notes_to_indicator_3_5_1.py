"""add_notes_to_indicator_3_5_1

Revision ID: ca5f6c4af14d
Revises: 7318b8932c0f
Create Date: 2025-12-03 21:40:00.000000

"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "ca5f6c4af14d"
down_revision: Union[str, Sequence[str], None] = "7318b8932c0f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Notes to add (above form fields)
NOTES = {
    "title": "Minimum composition of the BHERTs:",
    "items": [
        {"label": "1.", "text": "Executive Officer"},
        {"label": "2.", "text": "A Barangay Tanod"},
        {"label": "3.", "text": "2 BHWs"},
    ],
}


def upgrade() -> None:
    """Add notes to indicator 3.5.1."""
    conn = op.get_bind()

    # Add notes to form_schema using JSONB merge
    notes_json = json.dumps({"notes": NOTES})
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET form_schema = (form_schema::jsonb || CAST(:notes_json AS jsonb))::json
            WHERE indicator_code = '3.5.1'
        """),
        {"notes_json": notes_json},
    )


def downgrade() -> None:
    """Remove notes from indicator 3.5.1."""
    conn = op.get_bind()

    # Remove notes from form_schema
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET form_schema = (form_schema::jsonb - 'notes')::json
            WHERE indicator_code = '3.5.1'
        """)
    )
