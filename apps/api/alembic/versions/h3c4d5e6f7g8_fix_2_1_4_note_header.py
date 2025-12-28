"""fix_2_1_4_note_header

Revision ID: h3c4d5e6f7g8
Revises: g2b3c4d5e6f7
Create Date: 2025-12-14 14:20:00.000000

This migration fixes:
- 2.1.4: Remove the incorrectly modified "Note:" section header
         and regenerate the fields array correctly

"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "h3c4d5e6f7g8"
down_revision: Union[str, Sequence[str], None] = "g2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix 2.1.4 fields array - regenerate with correct structure."""
    conn = op.get_bind()

    # ========== 2.1.4 ==========
    # Regenerate the fields array with correct structure
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '2.1.4'")
    )
    row = result.fetchone()
    if row and row[0]:
        form_schema = row[0]

        # Rebuild the fields array correctly
        form_schema["fields"] = [
            {
                "field_id": "section_header_1",
                "field_type": "section_header",
                "label": "OPTION A - PHYSICAL: At least 50% accomplishment of the physical targets in the BDRRM Plan",
                "description": "",
                "required": False,
                "option_group": "option_a",
            },
            {
                "field_id": "upload_section_1",
                "field_type": "file_upload",
                "label": "Accomplishment Report",
                "description": "Accomplishment Report",
                "required": False,
                "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
                "multiple": True,
                "max_size": 50,
                "option_group": "option_a",
            },
            {
                "field_id": "upload_section_2",
                "field_type": "file_upload",
                "label": "Certification on the submission and correctness of Accomplishment Report signed by the C/MDRRMO",
                "description": "Certification on the submission and correctness of Accomplishment Report signed by the C/MDRRMO",
                "required": False,
                "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
                "multiple": True,
                "max_size": 50,
                "option_group": "option_a",
            },
            {
                "field_id": "or_separator_1",
                "field_type": "info_text",
                "label": "OR",
                "description": "",
                "required": False,
            },
            {
                "field_id": "section_header_2",
                "field_type": "section_header",
                "label": "OPTION B - FINANCIAL: At least 50% fund utilization of the 70% component of CY {PREVIOUS_YEAR} BDRRMF - Preparedness component as of December 31, {PREVIOUS_YEAR}",
                "description": "",
                "required": False,
                "option_group": "option_b",
            },
            {
                "field_id": "upload_section_3",
                "field_type": "file_upload",
                "label": "Annual LDRRMF Utilization Report",
                "description": "Annual LDRRMF Utilization Report",
                "required": False,
                "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
                "multiple": True,
                "max_size": 50,
                "option_group": "option_b",
            },
            {
                "field_id": "upload_section_4",
                "field_type": "file_upload",
                "label": "Certification on the submission and correctness of fund utilization report signed by the C/MDRRMO",
                "description": "Certification on the submission and correctness of fund utilization report signed by the C/MDRRMO",
                "required": False,
                "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
                "multiple": True,
                "max_size": 50,
                "option_group": "option_b",
            },
        ]

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
