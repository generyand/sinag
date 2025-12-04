"""add_field_notes_to_3_1_8_form_schema

Revision ID: f25c7eb09968
Revises: 272952e50349
Create Date: 2025-12-04 17:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f25c7eb09968'
down_revision: Union[str, Sequence[str], None] = '272952e50349'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add field_notes to the first field in 3.1.8 form_schema."""
    conn = op.get_bind()

    # Get indicator 3.1.8's current form_schema
    result = conn.execute(sa.text("""
        SELECT id, form_schema FROM indicators WHERE indicator_code = '3.1.8'
    """))
    row = result.fetchone()

    if row and row[1]:
        indicator_id = row[0]
        form_schema = row[1]

        # Add field_notes to the first field in the fields array
        if 'fields' in form_schema and len(form_schema['fields']) > 0:
            form_schema['fields'][0]['field_notes'] = {
                "title": "Note:",
                "items": [
                    {"text": "The CIR contains data protected by the Data Privacy Act of 2012. Hence, we recommend submitting only the transmittal."}
                ]
            }

            # Update the form_schema
            import json
            conn.execute(sa.text("""
                UPDATE indicators
                SET form_schema = :schema
                WHERE id = :id
            """), {"schema": json.dumps(form_schema), "id": indicator_id})


def downgrade() -> None:
    """Remove field_notes from the first field in 3.1.8 form_schema."""
    conn = op.get_bind()

    # Get indicator 3.1.8's current form_schema
    result = conn.execute(sa.text("""
        SELECT id, form_schema FROM indicators WHERE indicator_code = '3.1.8'
    """))
    row = result.fetchone()

    if row and row[1]:
        indicator_id = row[0]
        form_schema = row[1]

        # Remove field_notes from the first field
        if 'fields' in form_schema and len(form_schema['fields']) > 0:
            if 'field_notes' in form_schema['fields'][0]:
                del form_schema['fields'][0]['field_notes']

            # Update the form_schema
            import json
            conn.execute(sa.text("""
                UPDATE indicators
                SET form_schema = :schema
                WHERE id = :id
            """), {"schema": json.dumps(form_schema), "id": indicator_id})
