"""add_notes_to_indicator_4_1_5

Revision ID: 184511477e6d
Revises: ca5f6c4af14d
Create Date: 2025-12-03 21:45:00.000000

"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "184511477e6d"
down_revision: Union[str, Sequence[str], None] = "ca5f6c4af14d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Notes to add (above form fields)
NOTES = {
    "title": "Minimum information:",
    "items": [
        {"label": "a)", "text": "total number of VAW cases received"},
        {"label": "   -", "text": "number of cases documented for violating RA 9262"},
        {
            "label": "   -",
            "text": "number of cases documented for violating other VAW-related laws",
        },
        {"label": "b)", "text": "assistance provided to victim-survivors"},
    ],
}


def upgrade() -> None:
    """Add notes to indicator 4.1.5."""
    conn = op.get_bind()

    # Add notes to form_schema using JSONB merge
    notes_json = json.dumps({"notes": NOTES})
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET form_schema = (form_schema::jsonb || CAST(:notes_json AS jsonb))::json
            WHERE indicator_code = '4.1.5'
        """),
        {"notes_json": notes_json},
    )


def downgrade() -> None:
    """Remove notes from indicator 4.1.5."""
    conn = op.get_bind()

    # Remove notes from form_schema
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET form_schema = (form_schema::jsonb - 'notes')::json
            WHERE indicator_code = '4.1.5'
        """)
    )
