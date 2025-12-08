"""remove_photo_requirements_text_and_update_names

Revision ID: 32b387c1d419
Revises: 6a826fba3207
Create Date: 2025-12-07 20:59:16.994552

Changes:
1. Remove "(Photo Requirements: One photo with Distant View and one photo with Close-up View)"
   from field labels in 2.3.1, 3.5.2, 4.2.1, 6.2.1
2. Update indicator names for 4.3.4, 4.5.6, 4.8.4 to:
   "Accomplishment Reports: At least 50% Physical Accomplishment OR Fund Utilization - CY {CY_CURRENT_YEAR}"
"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


revision: str = "32b387c1d419"
down_revision: Union[str, Sequence[str], None] = "6a826fba3207"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PHOTO_REQ_TEXT = (
    " (Photo Requirements: One photo with Distant View and one photo with Close-up View)"
)
NEW_NAME = "Accomplishment Reports: At least 50% Physical Accomplishment OR Fund Utilization - {CY_CURRENT_YEAR}"


def upgrade() -> None:
    """Apply changes."""
    conn = op.get_bind()

    # 1. Remove photo requirements text from field labels
    photo_indicators = ["2.3.1", "3.5.2", "4.2.1", "6.2.1"]

    for code in photo_indicators:
        result = conn.execute(
            sa.text("SELECT form_schema FROM indicators WHERE indicator_code = :code"),
            {"code": code},
        ).fetchone()

        if not result or not result[0]:
            print(f"{code} form_schema not found, skipping...")
            continue

        form_schema = result[0]
        fields = form_schema.get("fields", [])
        updated = False

        for f in fields:
            if f.get("field_type") == "file_upload":
                label = f.get("label", "")
                if PHOTO_REQ_TEXT in label:
                    f["label"] = label.replace(PHOTO_REQ_TEXT, "")
                    updated = True
                    print(f"  {code}: Removed photo requirements from label")

        if updated:
            conn.execute(
                sa.text(
                    "UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = :code"
                ),
                {"schema": json.dumps(form_schema), "code": code},
            )

    # 2. Update indicator names for 4.3.4, 4.5.6, 4.8.4
    name_indicators = ["4.3.4", "4.5.6", "4.8.4"]

    for code in name_indicators:
        conn.execute(
            sa.text("UPDATE indicators SET name = :name WHERE indicator_code = :code"),
            {"name": NEW_NAME, "code": code},
        )
        print(f"  {code}: Updated name to '{NEW_NAME}'")


def downgrade() -> None:
    """Revert changes."""
    conn = op.get_bind()

    # 1. Restore photo requirements text (original labels)
    original_labels = {
        "2.3.1": "Two (2) Photo documentation of the permanent or temporary evacuation center (Photo Requirements: One photo with Distant View and one photo with Close-up View)",
        "3.5.2": "Two (2) Photo documentations of poster or tarpaulin (Photo Requirements: One photo with Distant View and one photo with Close-up View)",
        "4.2.1": "Photo documentation of the BHS/C (Photo Requirements: One photo with Distant View and one photo with Close-up View)",
        "6.2.1": "Photo documentation of the MRF/MRF Records of the barangay (Photo Requirements: One photo with Distant View and one photo with Close-up View)",
    }

    for code, original_label in original_labels.items():
        result = conn.execute(
            sa.text("SELECT form_schema FROM indicators WHERE indicator_code = :code"),
            {"code": code},
        ).fetchone()

        if not result or not result[0]:
            continue

        form_schema = result[0]
        fields = form_schema.get("fields", [])

        # Find the first file_upload field and restore its label
        for f in fields:
            if f.get("field_type") == "file_upload":
                f["label"] = original_label
                break

        conn.execute(
            sa.text(
                "UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = :code"
            ),
            {"schema": json.dumps(form_schema), "code": code},
        )

    # 2. Revert indicator names
    old_name = "Accomplishment Reports: At least 50% accomplishment (Physical) OR 50% fund utilization (Financial)"
    for code in ["4.3.4", "4.5.6"]:
        conn.execute(
            sa.text("UPDATE indicators SET name = :name WHERE indicator_code = :code"),
            {"name": old_name, "code": code},
        )

    # 4.8.4 had a different old name
    conn.execute(
        sa.text("UPDATE indicators SET name = :name WHERE indicator_code = '4.8.4'"),
        {"name": old_name + " - {CY_CURRENT_YEAR}"},
    )
