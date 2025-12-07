"""update_4_5_4_name_and_4_3_4_assessor_order

Revision ID: efd0b9e22c96
Revises: 56d75954a62b
Create Date: 2025-12-07 19:17:46.925146

Updates:
- 4.5.4: Change name to "covering January to October 31, {year}"
- 4.3.4: Move "Total number accomplished" field after "Total number in Plan" in assessor_validation
"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'efd0b9e22c96'
down_revision: Union[str, Sequence[str], None] = '56d75954a62b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply updates."""
    conn = op.get_bind()

    # 4.5.4 - Update name
    conn.execute(
        sa.text("UPDATE indicators SET name = :name WHERE indicator_code = '4.5.4'"),
        {"name": "Database: Establishment and maintenance of updated Database on Children disaggregated by age, sex, ethnicity, with or without disabilities, OSCY, etc. covering January to October 31, {CY_CURRENT_YEAR}"}
    )
    print("Updated 4.5.4 name")

    # 4.3.4 - Reorder assessor_validation fields (move "accomplished" after "in Plan")
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.3.4'")
    ).fetchone()

    if not result or not result[0]:
        print("4.3.4 not found, skipping...")
        return

    form_schema = result[0]
    av = form_schema.get("assessor_validation", {})
    fields = av.get("fields", [])

    # Find the indices of the fields to swap
    accomplished_idx = None
    in_plan_idx = None

    for i, field in enumerate(fields):
        label = field.get("label", "")
        if "Total number of activities/projects accomplished" in label:
            accomplished_idx = i
        elif "Total number of activities/projects reflected in the Plan" in label:
            in_plan_idx = i

    if accomplished_idx is not None and in_plan_idx is not None:
        # Swap the fields so "in Plan" comes before "accomplished"
        if accomplished_idx < in_plan_idx:
            # Remove accomplished and insert after in_plan
            accomplished_field = fields.pop(accomplished_idx)
            # After pop, in_plan_idx is now one less if it was after accomplished_idx
            new_in_plan_idx = in_plan_idx - 1
            fields.insert(new_in_plan_idx + 1, accomplished_field)
            print(f"Moved 'accomplished' field from index {accomplished_idx} to after index {new_in_plan_idx}")

            # Update form_schema
            conn.execute(
                sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '4.3.4'"),
                {"schema": json.dumps(form_schema)}
            )
            print("Updated 4.3.4 assessor_validation field order")
    else:
        print(f"Could not find fields to reorder: accomplished={accomplished_idx}, in_plan={in_plan_idx}")


def downgrade() -> None:
    """Revert is complex - skipping."""
    pass
