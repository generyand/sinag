"""fix_3_2_3_and_4_1_6_labels

Revision ID: i4d5e6f7g8h9
Revises: h3c4d5e6f7g8
Create Date: 2025-12-14 14:25:00.000000

This migration fixes:
- 3.2.3: Remove "(PHYSICAL or/and FINANCIAL)" prefix from upload field label
- 4.1.6: Update OPTION A/B section headers with full descriptions

"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "i4d5e6f7g8h9"
down_revision: Union[str, Sequence[str], None] = "h3c4d5e6f7g8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix upload field labels and section headers."""
    conn = op.get_bind()

    # ========== 3.2.3 ==========
    # Remove "(PHYSICAL or/and FINANCIAL)" prefix from upload field label
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '3.2.3'")
    )
    row = result.fetchone()
    if row and row[0]:
        form_schema = row[0]

        # Fix the fields array - update upload field label
        new_fields = []
        for field in form_schema.get("fields", []):
            if field.get("field_type") == "file_upload":
                label = field.get("label", "")
                # Remove the "(PHYSICAL or/and FINANCIAL) " prefix
                if label.startswith("(PHYSICAL or/and FINANCIAL) "):
                    label = label.replace("(PHYSICAL or/and FINANCIAL) ", "")
                    field["label"] = label
                    field["description"] = label
            new_fields.append(field)

        form_schema["fields"] = new_fields

        conn.execute(
            sa.text(
                "UPDATE indicators SET form_schema = CAST(:form_schema AS json) "
                "WHERE indicator_code = '3.2.3'"
            ),
            {"form_schema": json.dumps(form_schema)},
        )

    # ========== 4.1.6 ==========
    # Update OPTION A/B section headers with full descriptions
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.1.6'")
    )
    row = result.fetchone()
    if row and row[0]:
        form_schema = row[0]

        # Fix the fields array - update section headers
        new_fields = []
        for field in form_schema.get("fields", []):
            if field.get("field_type") == "section_header":
                label = field.get("label", "")
                # Update OPTION A header
                if label == "OPTION A - PHYSICAL:":
                    field["label"] = (
                        "OPTION A - PHYSICAL: At least 50% accomplishment of the physical targets in the GAD Plan"
                    )
                    field["description"] = ""
                # Update OPTION B header
                elif label == "OPTION B - FINANCIAL:":
                    field["label"] = (
                        "OPTION B - FINANCIAL: At least 50% fund utilization of the GAD Budget"
                    )
                    field["description"] = ""
            new_fields.append(field)

        form_schema["fields"] = new_fields

        conn.execute(
            sa.text(
                "UPDATE indicators SET form_schema = CAST(:form_schema AS json) "
                "WHERE indicator_code = '4.1.6'"
            ),
            {"form_schema": json.dumps(form_schema)},
        )


def downgrade() -> None:
    """Revert is not practical - this fixes display formatting."""
    pass
