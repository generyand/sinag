"""fix_2_1_4_option_b_year

Revision ID: 8fd14b52a6c1
Revises: 2f4e5b1d9a7c
Create Date: 2026-03-24 22:48:00.000000

Fix indicator 2.1.4 Option B year placeholder to use the current assessment year.
"""

from __future__ import annotations

import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8fd14b52a6c1"
down_revision: Union[str, Sequence[str], None] = "2f4e5b1d9a7c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


OLD_OPTION_B_TEXT = (
    "OPTION B - FINANCIAL: At least 50% fund utilization of the 70% component of CY "
    "{PREVIOUS_YEAR} BDRRMF - Preparedness component as of December 31, {PREVIOUS_YEAR}"
)
NEW_OPTION_B_TEXT = (
    "OPTION B - FINANCIAL: At least 50% fund utilization of the 70% component of CY "
    "{CURRENT_YEAR} BDRRMF - Preparedness component as of December 31, {CURRENT_YEAR}"
)
OLD_OPTION_B_TEXT_2024 = (
    "OPTION B - FINANCIAL: At least 50% fund utilization of the 70% component of CY "
    "2024 BDRRMF - Preparedness component as of December 31, 2024"
)
NEW_OPTION_B_TEXT_2025 = (
    "OPTION B - FINANCIAL: At least 50% fund utilization of the 70% component of CY "
    "2025 BDRRMF - Preparedness component as of December 31, 2025"
)


def upgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT id, form_schema FROM indicators WHERE indicator_code = '2.1.4'")
    ).fetchone()
    if not result or not result[1]:
        return

    indicator_id, form_schema = result
    if isinstance(form_schema, str):
        form_schema = json.loads(form_schema)

    for field in form_schema.get("fields", []):
        if field.get("field_type") == "section_header" and "OPTION B - FINANCIAL" in field.get(
            "label", ""
        ):
            if field["label"] == OLD_OPTION_B_TEXT_2024:
                field["label"] = NEW_OPTION_B_TEXT_2025
            else:
                field["label"] = field["label"].replace(OLD_OPTION_B_TEXT, NEW_OPTION_B_TEXT)

    upload_instructions = form_schema.get("upload_instructions")
    if isinstance(upload_instructions, str):
        if OLD_OPTION_B_TEXT_2024 in upload_instructions:
            form_schema["upload_instructions"] = upload_instructions.replace(
                OLD_OPTION_B_TEXT_2024, NEW_OPTION_B_TEXT_2025
            )
        else:
            form_schema["upload_instructions"] = upload_instructions.replace(
                OLD_OPTION_B_TEXT, NEW_OPTION_B_TEXT
            )

    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE id = :id"),
        {"id": indicator_id, "schema": json.dumps(form_schema)},
    )


def downgrade() -> None:
    """Best-effort downgrade is omitted because this is a display data correction."""
    pass
