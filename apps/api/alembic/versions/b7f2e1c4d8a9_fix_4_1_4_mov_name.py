"""fix_4_1_4_mov_name

Revision ID: b7f2e1c4d8a9
Revises: 8fd14b52a6c1
Create Date: 2026-03-24 23:10:00.000000

Fix indicator 4.1.4 MOV name and align persisted upload display names.
"""

from __future__ import annotations

import json
import re
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7f2e1c4d8a9"
down_revision: Union[str, Sequence[str], None] = "8fd14b52a6c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


MOV_NAME_TEMPLATE = (
    "Accomplishment Report covering 1st to 3rd quarter of CY {CURRENT_YEAR} "
    "with received stamp by the C/MSWDO and C/MLGOO"
)
LEGACY_MOV_NAME = (
    "Quarterly accomplishment reports based on the database/records of VAW cases reported "
    "in the barangay"
)
LEGACY_MOV_NAME_SANITIZED = (
    "Quarterly accomplishment reports based on the database-records of VAW cases reported "
    "in the barangay"
)


def _resolve_year_template(template: str, year: int) -> str:
    return template.replace("{CURRENT_YEAR}", str(year))


def _sanitize_filename_label(label: str) -> str:
    sanitized_label = label.replace("/", "-").replace("\\", "-")
    sanitized_label = sanitized_label.replace(":", " -")
    for char in ["*", "?", '"', "<", ">", "|"]:
        sanitized_label = sanitized_label.replace(char, "")
    sanitized_label = re.sub(r"\s+", " ", sanitized_label)
    return sanitized_label.strip()


def upgrade() -> None:
    conn = op.get_bind()

    result = conn.execute(
        sa.text("SELECT id, form_schema FROM indicators WHERE indicator_code = '4.1.4'")
    ).fetchone()
    if result and result[1]:
        indicator_id, form_schema = result
        if isinstance(form_schema, str):
            form_schema = json.loads(form_schema)

        for field in form_schema.get("fields", []):
            if field.get("field_type") == "file_upload":
                field["label"] = MOV_NAME_TEMPLATE
                field["description"] = MOV_NAME_TEMPLATE
                break

        upload_instructions = form_schema.get("upload_instructions")
        if isinstance(upload_instructions, str):
            form_schema["upload_instructions"] = upload_instructions.replace(
                LEGACY_MOV_NAME, MOV_NAME_TEMPLATE
            )

        conn.execute(
            sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE id = :id"),
            {"id": indicator_id, "schema": json.dumps(form_schema)},
        )

    conn.execute(
        sa.text(
            """
            UPDATE checklist_items
            SET label = :label,
                mov_description = :mov_description
            WHERE item_id = '4_1_4_upload_1'
            """
        ),
        {
            "label": MOV_NAME_TEMPLATE,
            "mov_description": (
                "Verification of uploaded Accomplishment Report covering 1st to 3rd quarter "
                "of CY {CURRENT_YEAR} with received stamp by the C/MSWDO and C/MLGOO"
            ),
        },
    )

    rows = conn.execute(
        sa.text(
            """
            SELECT
                mf.id,
                mf.file_name,
                a.assessment_year
            FROM mov_files mf
            JOIN indicators i ON i.id = mf.indicator_id
            JOIN assessments a ON a.id = mf.assessment_id
            WHERE i.indicator_code = '4.1.4'
              AND mf.field_id = 'upload_section_1'
              AND mf.deleted_at IS NULL
            """
        )
    ).mappings()

    for row in rows:
        expected_label = _resolve_year_template(MOV_NAME_TEMPLATE, row["assessment_year"])
        expected_file_label = _sanitize_filename_label(expected_label)
        new_file_name = row["file_name"]
        new_file_name = new_file_name.replace(LEGACY_MOV_NAME_SANITIZED, expected_file_label)
        new_file_name = new_file_name.replace(LEGACY_MOV_NAME, expected_file_label)

        if new_file_name != row["file_name"]:
            conn.execute(
                sa.text("UPDATE mov_files SET file_name = :file_name WHERE id = :id"),
                {"id": row["id"], "file_name": new_file_name},
            )


def downgrade() -> None:
    """Best-effort downgrade is omitted because this is a display/data correction."""
    pass
