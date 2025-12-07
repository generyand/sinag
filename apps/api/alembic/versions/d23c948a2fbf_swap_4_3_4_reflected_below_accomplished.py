"""swap_4_3_4_reflected_below_accomplished

Revision ID: d23c948a2fbf
Revises: 1b2b64c8ae25
Create Date: 2025-12-07 19:29:59.035254

Swap order: accomplished first, then reflected in Plan below it.
"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


revision: str = 'd23c948a2fbf'
down_revision: Union[str, Sequence[str], None] = '1b2b64c8ae25'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.3.4'")
    ).fetchone()

    if not result or not result[0]:
        return

    form_schema = result[0]
    av = form_schema.get("assessor_validation", {})
    fields = av.get("fields", [])

    # Find indices
    reflected_idx = None
    accomplished_idx = None
    for i, f in enumerate(fields):
        if f.get("item_id") == "4_3_4_physical_reflected":
            reflected_idx = i
        elif f.get("item_id") == "4_3_4_physical_accomplished":
            accomplished_idx = i

    if reflected_idx is not None and accomplished_idx is not None:
        # Swap them
        fields[reflected_idx], fields[accomplished_idx] = fields[accomplished_idx], fields[reflected_idx]
        print(f"Swapped fields: accomplished now at {reflected_idx}, reflected now at {accomplished_idx}")

        conn.execute(
            sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '4.3.4'"),
            {"schema": json.dumps(form_schema)}
        )


def downgrade() -> None:
    # Same swap reverses it
    upgrade()
