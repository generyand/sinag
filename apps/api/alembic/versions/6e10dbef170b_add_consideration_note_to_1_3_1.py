"""add_consideration_note_to_1_3_1

Revision ID: 6e10dbef170b
Revises: fa2699af80e4
Create Date: 2025-12-07 18:36:53.184110

Add a consideration note to indicator 1.3.1 about approval deadline.
The year is dynamic using {CY_CURRENT_YEAR} placeholder.
"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e10dbef170b'
down_revision: Union[str, Sequence[str], None] = 'fa2699af80e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add consideration note to indicator 1.3.1."""
    conn = op.get_bind()

    # Get indicator 1.3.1's form_schema
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '1.3.1'")
    ).fetchone()

    if not result or not result[0]:
        print("Indicator 1.3.1 not found or has no form_schema, skipping...")
        return

    form_schema = result[0]

    # Add the notes section with dynamic year placeholder
    form_schema["notes"] = {
        "title": "Consideration:",
        "items": [
            {"text": "Approval until March 31, {CY_CURRENT_YEAR}"}
        ]
    }

    # Update the database
    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '1.3.1'"),
        {"schema": json.dumps(form_schema)}
    )
    print("Added consideration note to indicator 1.3.1")


def downgrade() -> None:
    """Remove consideration note from indicator 1.3.1."""
    conn = op.get_bind()

    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '1.3.1'")
    ).fetchone()

    if not result or not result[0]:
        return

    form_schema = result[0]

    # Remove the notes section
    if "notes" in form_schema:
        del form_schema["notes"]

        conn.execute(
            sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '1.3.1'"),
            {"schema": json.dumps(form_schema)}
        )
