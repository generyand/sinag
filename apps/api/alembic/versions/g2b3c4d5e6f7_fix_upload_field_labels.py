"""fix_upload_field_labels

Revision ID: g2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2025-12-14 14:15:00.000000

This migration fixes:
- 4.5.6: Remove "(PHYSICAL or/and FINANCIAL)" prefix from upload field label
- 2.1.4: Update OPTION A/B section headers with full descriptions

"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "g2b3c4d5e6f7"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix upload field labels in form_schema."""
    conn = op.get_bind()

    # ========== 4.5.6 ==========
    # Remove "(PHYSICAL or/and FINANCIAL)" prefix from upload field label
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.5.6'")
    )
    row = result.fetchone()
    if row and row[0]:
        form_schema = row[0]

        # Fix the fields array - update upload field label
        new_fields = []
        for field in form_schema.get("fields", []):
            if field.get("field_type") == "file_upload":
                # Remove the "(PHYSICAL or/and FINANCIAL) " prefix
                label = field.get("label", "")
                if label.startswith("(PHYSICAL or/and FINANCIAL) "):
                    label = label.replace("(PHYSICAL or/and FINANCIAL) ", "")
                    field["label"] = label
                    field["description"] = label
            new_fields.append(field)

        form_schema["fields"] = new_fields

        # Also update upload_instructions to ensure consistency
        form_schema["upload_instructions"] = (
            "Upload:\n"
            "- Approved Accomplishment Report on BCPC AWFP with received stamp by the City/Municipality Inter-Agency Monitoring Task Force (IMTF)"
        )

        conn.execute(
            sa.text(
                "UPDATE indicators SET form_schema = CAST(:form_schema AS json) "
                "WHERE indicator_code = '4.5.6'"
            ),
            {"form_schema": json.dumps(form_schema)},
        )

    # ========== 2.1.4 ==========
    # Update OPTION A/B section headers with full descriptions
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '2.1.4'")
    )
    row = result.fetchone()
    if row and row[0]:
        form_schema = row[0]

        # Fix the fields array - update section headers
        new_fields = []
        for field in form_schema.get("fields", []):
            if field.get("field_type") == "section_header":
                label = field.get("label", "").upper()
                # Update OPTION A header
                if "OPTION A" in label and "PHYSICAL" in label:
                    field["label"] = (
                        "OPTION A - PHYSICAL: At least 50% accomplishment of the physical targets in the BDRRM Plan"
                    )
                    field["description"] = ""
                # Update OPTION B header
                elif "OPTION B" in label and "FINANCIAL" in label:
                    field["label"] = (
                        "OPTION B - FINANCIAL: At least 50% fund utilization of the 70% component of CY {PREVIOUS_YEAR} BDRRMF - Preparedness component as of December 31, {PREVIOUS_YEAR}"
                    )
                    field["description"] = ""
            new_fields.append(field)

        form_schema["fields"] = new_fields

        # Also update upload_instructions to ensure consistency
        form_schema["upload_instructions"] = (
            "Upload the following:\n\n"
            "OPTION A - PHYSICAL: At least 50% accomplishment of the physical targets in the BDRRM Plan\n"
            "- Accomplishment Report\n"
            "- Certification on the submission and correctness of Accomplishment Report signed by the C/MDRRMO\n\n"
            "OR\n\n"
            "OPTION B - FINANCIAL: At least 50% fund utilization of the 70% component of CY {PREVIOUS_YEAR} BDRRMF - Preparedness component as of December 31, {PREVIOUS_YEAR}\n"
            "- Annual LDRRMF Utilization Report\n"
            "- Certification on the submission and correctness of fund utilization report signed by the C/MDRRMO\n\n"
            "Note: Choose either Option A (Physical) OR Option B (Financial). Only ONE option is required."
        )

        conn.execute(
            sa.text(
                "UPDATE indicators SET form_schema = CAST(:form_schema AS json) "
                "WHERE indicator_code = '2.1.4'"
            ),
            {"form_schema": json.dumps(form_schema)},
        )


def downgrade() -> None:
    """Revert is not practical - this fixes display formatting."""
    pass
