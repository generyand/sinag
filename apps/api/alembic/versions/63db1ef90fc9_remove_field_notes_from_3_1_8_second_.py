"""remove_field_notes_from_3_1_8_second_field

Revision ID: 63db1ef90fc9
Revises: f25c7eb09968
Create Date: 2025-12-04 17:58:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import json


# revision identifiers, used by Alembic.
revision: str = "63db1ef90fc9"
down_revision: Union[str, Sequence[str], None] = "f25c7eb09968"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove field_notes from the second field in 3.1.8 form_schema."""
    conn = op.get_bind()

    # Get indicator 3.1.8's current form_schema
    result = conn.execute(
        sa.text("""
        SELECT id, form_schema FROM indicators WHERE indicator_code = '3.1.8'
    """)
    )
    row = result.fetchone()

    if row and row[1]:
        indicator_id = row[0]
        form_schema = row[1]

        # Remove field_notes from the second field (index 1)
        if "fields" in form_schema and len(form_schema["fields"]) > 1:
            if "field_notes" in form_schema["fields"][1]:
                del form_schema["fields"][1]["field_notes"]

            # Update the form_schema
            conn.execute(
                sa.text("""
                UPDATE indicators
                SET form_schema = :schema
                WHERE id = :id
            """),
                {"schema": json.dumps(form_schema), "id": indicator_id},
            )


def downgrade() -> None:
    """Re-add field_notes to the second field in 3.1.8 form_schema."""
    conn = op.get_bind()

    # Get indicator 3.1.8's current form_schema
    result = conn.execute(
        sa.text("""
        SELECT id, form_schema FROM indicators WHERE indicator_code = '3.1.8'
    """)
    )
    row = result.fetchone()

    if row and row[1]:
        indicator_id = row[0]
        form_schema = row[1]

        # Add field_notes back to the second field
        if "fields" in form_schema and len(form_schema["fields"]) > 1:
            form_schema["fields"][1]["field_notes"] = {
                "title": "Note:",
                "items": [
                    {
                        "text": "The CIR contains data protected by the Data Privacy Act of 2012. Hence, we recommend submitting only the transmittal."
                    }
                ],
            }

            # Update the form_schema
            conn.execute(
                sa.text("""
                UPDATE indicators
                SET form_schema = :schema
                WHERE id = :id
            """),
                {"schema": json.dumps(form_schema), "id": indicator_id},
            )
