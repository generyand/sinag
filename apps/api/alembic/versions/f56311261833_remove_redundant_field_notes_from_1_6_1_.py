"""remove_redundant_field_notes_from_1_6_1_1_and_1_6_1_2

Revision ID: f56311261833
Revises: 63db1ef90fc9
Create Date: 2025-12-04 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import json


# revision identifiers, used by Alembic.
revision: str = 'f56311261833'
down_revision: Union[str, Sequence[str], None] = '63db1ef90fc9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove redundant field_notes from 1.6.1.1 and 1.6.1.2 form_schema fields."""
    conn = op.get_bind()

    # Remove field_notes from 1.6.1.1 second field (Proof of deposit...)
    result = conn.execute(sa.text("""
        SELECT id, form_schema FROM indicators WHERE indicator_code = '1.6.1.1'
    """))
    row = result.fetchone()
    if row and row[1]:
        indicator_id = row[0]
        form_schema = row[1]
        if 'fields' in form_schema and len(form_schema['fields']) > 1:
            if 'field_notes' in form_schema['fields'][1]:
                del form_schema['fields'][1]['field_notes']
            conn.execute(sa.text("""
                UPDATE indicators SET form_schema = :schema WHERE id = :id
            """), {"schema": json.dumps(form_schema), "id": indicator_id})

    # Remove field_notes from 1.6.1.2 first field (Deposit slips...)
    result = conn.execute(sa.text("""
        SELECT id, form_schema FROM indicators WHERE indicator_code = '1.6.1.2'
    """))
    row = result.fetchone()
    if row and row[1]:
        indicator_id = row[0]
        form_schema = row[1]
        if 'fields' in form_schema and len(form_schema['fields']) > 0:
            if 'field_notes' in form_schema['fields'][0]:
                del form_schema['fields'][0]['field_notes']
            conn.execute(sa.text("""
                UPDATE indicators SET form_schema = :schema WHERE id = :id
            """), {"schema": json.dumps(form_schema), "id": indicator_id})


def downgrade() -> None:
    """Re-add field_notes to 1.6.1.1 and 1.6.1.2 form_schema fields."""
    conn = op.get_bind()

    consideration_note = {
        "title": "CONSIDERATION:",
        "items": [
            {"text": "In the absence of deposit slips, bank statements will be considered, provided that it shows the transaction date, and that the total 10% of the SK Fund has been transferred."}
        ]
    }

    # Re-add to 1.6.1.1 second field
    result = conn.execute(sa.text("""
        SELECT id, form_schema FROM indicators WHERE indicator_code = '1.6.1.1'
    """))
    row = result.fetchone()
    if row and row[1]:
        indicator_id = row[0]
        form_schema = row[1]
        if 'fields' in form_schema and len(form_schema['fields']) > 1:
            form_schema['fields'][1]['field_notes'] = consideration_note
            conn.execute(sa.text("""
                UPDATE indicators SET form_schema = :schema WHERE id = :id
            """), {"schema": json.dumps(form_schema), "id": indicator_id})

    # Re-add to 1.6.1.2 first field
    result = conn.execute(sa.text("""
        SELECT id, form_schema FROM indicators WHERE indicator_code = '1.6.1.2'
    """))
    row = result.fetchone()
    if row and row[1]:
        indicator_id = row[0]
        form_schema = row[1]
        if 'fields' in form_schema and len(form_schema['fields']) > 0:
            form_schema['fields'][0]['field_notes'] = consideration_note
            conn.execute(sa.text("""
                UPDATE indicators SET form_schema = :schema WHERE id = :id
            """), {"schema": json.dumps(form_schema), "id": indicator_id})
