"""fix_4_3_4_assessor_field_description

Revision ID: 1b2b64c8ae25
Revises: efd0b9e22c96
Create Date: 2025-12-07 19:28:51.738832

Remove the duplicate "Please supply..." description from the accomplished field
so both input fields appear together under one header.
"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1b2b64c8ae25'
down_revision: Union[str, Sequence[str], None] = 'efd0b9e22c96'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove description from accomplished field so both fields appear under one header."""
    conn = op.get_bind()

    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.3.4'")
    ).fetchone()

    if not result or not result[0]:
        print("4.3.4 not found, skipping...")
        return

    form_schema = result[0]
    av = form_schema.get("assessor_validation", {})
    fields = av.get("fields", [])

    # Find the accomplished field and remove its description
    for field in fields:
        if field.get("item_id") == "4_3_4_physical_accomplished":
            field["description"] = ""  # Remove the duplicate header
            print("Removed description from accomplished field")
            break

    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '4.3.4'"),
        {"schema": json.dumps(form_schema)}
    )
    print("Updated 4.3.4 assessor_validation")


def downgrade() -> None:
    """Restore description to accomplished field."""
    conn = op.get_bind()

    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.3.4'")
    ).fetchone()

    if not result or not result[0]:
        return

    form_schema = result[0]
    av = form_schema.get("assessor_validation", {})
    fields = av.get("fields", [])

    for field in fields:
        if field.get("item_id") == "4_3_4_physical_accomplished":
            field["description"] = "Please supply the required information:"
            break

    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '4.3.4'"),
        {"schema": json.dumps(form_schema)}
    )
