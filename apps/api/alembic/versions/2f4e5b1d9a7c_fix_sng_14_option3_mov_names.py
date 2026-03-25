"""fix_sng_14_option3_mov_names

Revision ID: 2f4e5b1d9a7c
Revises: 6b5f10b0209d
Create Date: 2026-03-24 22:25:00.000000

Fix incorrect 1.6.1 Option 3 MOV names in schema and persisted uploads.
"""

from __future__ import annotations

import json
import re
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2f4e5b1d9a7c"
down_revision: Union[str, Sequence[str], None] = "6b5f10b0209d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


OPTION3_A_TEMPLATE = (
    "Proof of transfer of the 10% {CURRENT_YEAR} SK funds to the trust fund of the Barangay "
    "such as Deposit Slip or Official Receipt;"
)
OPTION3_B_LABEL = (
    "Proof of transfer or corresponding legal forms/documents issued by the "
    "city/municipal treasurer if the barangay opted that the corresponding SK fund be kept as "
    "trust fund in the custody of the C/M treasurer."
)
UPDATED_UPLOAD_INSTRUCTIONS = (
    "Upload documents for ONE of the following options that applies to your barangay:\n\n"
    "OPTION 1: If barangay has Barangay-SK Agreement for release/deposit\n"
    "  - Copy of the written agreement, AND\n"
    "  - Proof of deposit reflecting Account No./Name and total SK funds\n\n"
    "OPTION 2: If barangay does NOT have Barangay-SK Agreement but has current account\n"
    "  - Deposit slips reflecting Account No./Name and total SK funds\n\n"
    "OPTION 3: If barangay does NOT have SK Officials, or has SK Officials but no quorum and/or no SK Bank Account\n"
    "  - Proof of transfer of the 10% {CURRENT_YEAR} SK funds to the trust fund of the Barangay such as Deposit Slip or Official Receipt;\n"
    "  OR\n"
    "  - Proof of transfer or corresponding legal forms/documents issued by the city/municipal treasurer if the barangay opted that the corresponding SK fund be kept as trust fund in the custody of the C/M treasurer."
)

LEGACY_FILE_LABEL_VARIANTS = {
    "1_6_1_opt3_a": [
        "Proof of transfer to trust fund, OR",
        "Proof of transfer to trust fund",
        "Proof of transfer of the 10% SK funds to the trust fund of the Barangay such as Deposit Slip or Official Receipt",
    ],
    "1_6_1_opt3_b": [
        "Legal forms from C/M treasurer if SK fund kept in C/M custody",
        (
            "Proof of transfer or corresponding legal forms/documents issued by the "
            "city/municipal treasurer if the barangay opted that the corresponding SK fund be kept "
            "as trust fund in the custody of the C/M treasurer"
        ),
    ],
}


def _resolve_current_year_template(template: str, year: int) -> str:
    return template.replace("{CURRENT_YEAR}", str(year))


def _sanitize_filename_label(label: str) -> str:
    sanitized_label = label.replace("/", "-").replace("\\", "-")
    sanitized_label = sanitized_label.replace(":", " -")
    for char in ["*", "?", '"', "<", ">", "|"]:
        sanitized_label = sanitized_label.replace(char, "")
    sanitized_label = re.sub(r"\s+", " ", sanitized_label)
    return sanitized_label.strip()


def _update_indicator_form_schema(conn: sa.Connection) -> None:
    result = conn.execute(
        sa.text("SELECT id, form_schema FROM indicators WHERE indicator_code = '1.6.1'")
    ).fetchone()
    if not result or not result[1]:
        return

    indicator_id, form_schema = result
    if isinstance(form_schema, str):
        form_schema = json.loads(form_schema)

    fields = form_schema.get("fields", [])
    option3_file_fields = [
        field
        for field in fields
        if field.get("field_type") == "file_upload" and field.get("option_group") == "Option 3"
    ]
    if len(option3_file_fields) >= 2:
        option3_file_fields[0]["label"] = OPTION3_A_TEMPLATE
        option3_file_fields[0]["description"] = OPTION3_A_TEMPLATE
        option3_file_fields[1]["label"] = OPTION3_B_LABEL
        option3_file_fields[1]["description"] = OPTION3_B_LABEL

    form_schema["upload_instructions"] = UPDATED_UPLOAD_INSTRUCTIONS

    assessor_validation = form_schema.get("assessor_validation", {})
    for field in assessor_validation.get("fields", []):
        if field.get("item_id") == "1_6_1_opt3_a":
            field["description"] = OPTION3_A_TEMPLATE
        elif field.get("item_id") == "1_6_1_opt3_b":
            field["description"] = OPTION3_B_LABEL

    conn.execute(
        sa.text("UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE id = :id"),
        {"id": indicator_id, "schema": json.dumps(form_schema)},
    )


def _update_checklist_items(conn: sa.Connection) -> None:
    conn.execute(
        sa.text(
            """
            UPDATE checklist_items
            SET label = :label,
                mov_description = :mov_description
            WHERE item_id = '1_6_1_opt3_a'
            """
        ),
        {
            "label": f"a) {OPTION3_A_TEMPLATE}",
            "mov_description": OPTION3_A_TEMPLATE,
        },
    )
    conn.execute(
        sa.text(
            """
            UPDATE checklist_items
            SET label = :label,
                mov_description = :mov_description
            WHERE item_id = '1_6_1_opt3_b'
            """
        ),
        {
            "label": f"b) {OPTION3_B_LABEL}",
            "mov_description": OPTION3_B_LABEL,
        },
    )


def _update_existing_mov_file_names(conn: sa.Connection) -> None:
    rows = conn.execute(
        sa.text(
            """
            SELECT
                mf.id,
                mf.file_name,
                mf.field_id,
                a.assessment_year
            FROM mov_files mf
            JOIN indicators i ON i.id = mf.indicator_id
            JOIN assessments a ON a.id = mf.assessment_id
            WHERE i.indicator_code = '1.6.1'
              AND mf.field_id IN ('1_6_1_opt3_a', '1_6_1_opt3_b')
              AND mf.deleted_at IS NULL
            """
        )
    ).mappings()

    for row in rows:
        expected_label = (
            _resolve_current_year_template(OPTION3_A_TEMPLATE, row["assessment_year"])
            if row["field_id"] == "1_6_1_opt3_a"
            else OPTION3_B_LABEL
        )
        expected_file_label = _sanitize_filename_label(expected_label)

        new_file_name = row["file_name"]
        for legacy_label in LEGACY_FILE_LABEL_VARIANTS[row["field_id"]]:
            if legacy_label in new_file_name:
                new_file_name = new_file_name.replace(legacy_label, expected_file_label)

        if new_file_name != row["file_name"]:
            conn.execute(
                sa.text("UPDATE mov_files SET file_name = :file_name WHERE id = :id"),
                {"id": row["id"], "file_name": new_file_name},
            )


def upgrade() -> None:
    conn = op.get_bind()
    _update_indicator_form_schema(conn)
    _update_checklist_items(conn)
    _update_existing_mov_file_names(conn)


def downgrade() -> None:
    """Best-effort downgrade is omitted because this is a data correction migration."""
    pass
