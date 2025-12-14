"""fix_multiple_indicator_labels_and_notes

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2025-12-14 12:00:00.000000

This migration fixes the following indicators:
- 2.1.4: Update name with dynamic year, update upload_instructions with OPTION A/B labels
- 3.2.3: Update name, simplify upload_instructions, add notes
- 4.1.4: Simplify name, simplify upload_instructions, add notes
- 4.1.6: Update upload_instructions with OPTION A/B labels
- 4.5.6: Update name, simplify upload_instructions, add notes
- 6.1.4: Add notes

"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix multiple indicators: names, upload_instructions, and notes."""
    conn = op.get_bind()

    # ========== 2.1.4 ==========
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '2.1.4'")
    )
    row = result.fetchone()
    if row and row[0]:
        form_schema = row[0]
        form_schema["name"] = (
            "Accomplishment Reports: At least 50% accomplishment (Physical) OR 50% fund utilization (Financial) - CY {CURRENT_YEAR}"
        )
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
                "UPDATE indicators SET name = :name, form_schema = CAST(:form_schema AS json) "
                "WHERE indicator_code = '2.1.4'"
            ),
            {
                "name": form_schema["name"],
                "form_schema": json.dumps(form_schema),
            },
        )

    # ========== 3.2.3 ==========
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '3.2.3'")
    )
    row = result.fetchone()
    if row and row[0]:
        form_schema = row[0]
        form_schema["name"] = (
            "Accomplishment Reports: At least 50% accomplishment (Physical) OR 50% fund utilization (Financial) - CY {CURRENT_YEAR}"
        )
        form_schema["upload_instructions"] = (
            "Upload:\n"
            "- Accomplishment Report with the status of implementation of target activities and utilization of funds "
            "submitted to the C/M POC with received stamp of the DILG City Director or C/MLGOO"
        )
        form_schema["notes"] = {
            "title": "Requirements:",
            "items": [
                {
                    "label": "a.)",
                    "text": "At least 50% accomplishment of the physical targets in the BPOPs Plan",
                },
                {"label": None, "text": "OR"},
                {
                    "label": "b.)",
                    "text": "At least 50% fund utilization rate of the CY {PREVIOUS_YEAR} BPOPs Budget.",
                },
            ],
        }
        conn.execute(
            sa.text(
                "UPDATE indicators SET name = :name, form_schema = CAST(:form_schema AS json) "
                "WHERE indicator_code = '3.2.3'"
            ),
            {
                "name": form_schema["name"],
                "form_schema": json.dumps(form_schema),
            },
        )

    # ========== 4.1.4 ==========
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.1.4'")
    )
    row = result.fetchone()
    if row and row[0]:
        form_schema = row[0]
        form_schema["name"] = (
            "Accomplishment Reports: Quarterly accomplishment reports based on the database/records of VAW cases reported in the barangay"
        )
        form_schema["upload_instructions"] = (
            "Upload: Quarterly accomplishment reports based on the database/records of VAW cases reported in the barangay"
        )
        form_schema["notes"] = {
            "title": "Quarterly accomplishment reports based on the database/records of VAW cases reported in the barangay containing relevant information such as:",
            "items": [
                {"label": None, "text": "total number of VAW cases received"},
                {"label": None, "text": "assistance provided to victim-survivors"},
                {
                    "label": None,
                    "text": "total number of cases documented for violating RA 9262 and other VAW-related laws",
                },
                {"label": None, "text": "total barangay population"},
                {"label": None, "text": "number of male and female in the barangay"},
                {"label": None, "text": "minor to adult ratio"},
            ],
        }
        conn.execute(
            sa.text(
                "UPDATE indicators SET name = :name, form_schema = CAST(:form_schema AS json) "
                "WHERE indicator_code = '4.1.4'"
            ),
            {
                "name": form_schema["name"],
                "form_schema": json.dumps(form_schema),
            },
        )

    # ========== 4.1.6 ==========
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.1.6'")
    )
    row = result.fetchone()
    if row and row[0]:
        form_schema = row[0]
        form_schema["upload_instructions"] = (
            "Upload the following:\n\n"
            "SHARED (Required):\n"
            "- GAD Accomplishment Report\n\n"
            "PLUS ONE of the following (PHYSICAL or FINANCIAL):\n\n"
            "OPTION A - PHYSICAL: At least 50% accomplishment of the physical targets in the GAD Plan\n"
            "- Certification on the submitted GAD Accomplishment Report indicating at least 50% accomplishment of the physical targets in the GAD Plan signed by the C/MSWDO or C/MLGOO\n\n"
            "OR\n\n"
            "OPTION B - FINANCIAL: At least 50% fund utilization of the GAD Budget\n"
            "- Certification on the submitted GAD Accomplishment Report indicating at least 50% fund utilization of the GAD Budget signed by the C/MSWDO or C/MLGOO"
        )
        conn.execute(
            sa.text(
                "UPDATE indicators SET form_schema = CAST(:form_schema AS json) "
                "WHERE indicator_code = '4.1.6'"
            ),
            {"form_schema": json.dumps(form_schema)},
        )

    # ========== 4.5.6 ==========
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '4.5.6'")
    )
    row = result.fetchone()
    if row and row[0]:
        form_schema = row[0]
        form_schema["name"] = (
            "Accomplishment Reports: At least 50% accomplishment (Physical) OR 50% fund utilization (Financial) - CY {CURRENT_YEAR}"
        )
        form_schema["upload_instructions"] = (
            "Upload:\n"
            "- Approved Accomplishment Report on BCPC AWFP with received stamp by the City/Municipality Inter-Agency Monitoring Task Force (IMTF)"
        )
        form_schema["notes"] = {
            "title": "Requirements:",
            "items": [
                {
                    "label": "a.)",
                    "text": "At least 50% accomplishment of the physical targets in the BCPC AWFP",
                },
                {"label": None, "text": "OR"},
                {"label": "b.)", "text": "At least 50% utilization rate of BCPC AWFP Budget"},
            ],
        }
        conn.execute(
            sa.text(
                "UPDATE indicators SET name = :name, form_schema = CAST(:form_schema AS json) "
                "WHERE indicator_code = '4.5.6'"
            ),
            {
                "name": form_schema["name"],
                "form_schema": json.dumps(form_schema),
            },
        )

    # ========== 6.1.4 ==========
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '6.1.4'")
    )
    row = result.fetchone()
    if row and row[0]:
        form_schema = row[0]
        form_schema["notes"] = {
            "title": "Requirements:",
            "items": [
                {
                    "label": "a.)",
                    "text": "At least 50% accomplishment of the physical targets in the BESWMP",
                },
                {"label": None, "text": "OR"},
                {"label": "b.)", "text": "At least 50% utilization rate of BESWM Budget"},
            ],
        }
        conn.execute(
            sa.text(
                "UPDATE indicators SET form_schema = CAST(:form_schema AS json) "
                "WHERE indicator_code = '6.1.4'"
            ),
            {"form_schema": json.dumps(form_schema)},
        )


def downgrade() -> None:
    """Revert is not practical - this fixes display formatting."""
    pass
