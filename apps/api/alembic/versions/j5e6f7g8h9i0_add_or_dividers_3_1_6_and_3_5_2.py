"""add_or_dividers_3_1_6_and_3_5_2

Revision ID: j5e6f7g8h9i0
Revises: i4d5e6f7g8h9
Create Date: 2025-12-14 15:00:00.000000

This migration adds OR dividers between upload fields for:
- 3.1.6: Approved Barangay Appropriation Ordinance OR Copy of Barangay AIP
- 3.5.2: Photo documentations OR Screenshot of social media posting

"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "j5e6f7g8h9i0"
down_revision: Union[str, Sequence[str], None] = "i4d5e6f7g8h9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add OR dividers between upload fields."""
    conn = op.get_bind()

    # ========== 3.1.6 ==========
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '3.1.6'")
    )
    row = result.fetchone()
    if row and row[0]:
        form_schema = row[0]

        # Rebuild the fields array with OR divider
        old_fields = form_schema.get("fields", [])
        if len(old_fields) >= 2 and not any(f.get("field_type") == "info_text" for f in old_fields):
            # Insert OR divider between the two upload fields
            new_fields = [
                old_fields[0],  # First upload field
                {
                    "field_id": "or_separator_1",
                    "field_type": "info_text",
                    "label": "OR",
                    "description": "",
                    "required": False,
                },
                old_fields[1],  # Second upload field
            ]
            form_schema["fields"] = new_fields

            # Update upload_instructions
            form_schema["upload_instructions"] = (
                "Upload ONE of the following (only 1 required):\n\n"
                "1. Approved Barangay Appropriation Ordinance signed by the PB, Barangay Secretary and SBMs\n\n"
                "OR\n\n"
                "2. Copy of Barangay Annual Investment Plan (AIP)"
            )

            conn.execute(
                sa.text(
                    "UPDATE indicators SET form_schema = CAST(:form_schema AS json) "
                    "WHERE indicator_code = '3.1.6'"
                ),
                {"form_schema": json.dumps(form_schema)},
            )

    # ========== 3.5.2 ==========
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '3.5.2'")
    )
    row = result.fetchone()
    if row and row[0]:
        form_schema = row[0]

        # Rebuild the fields array with OR divider
        old_fields = form_schema.get("fields", [])
        if len(old_fields) >= 2 and not any(f.get("field_type") == "info_text" for f in old_fields):
            # Insert OR divider between the two upload fields
            new_fields = [
                old_fields[0],  # First upload field
                {
                    "field_id": "or_separator_1",
                    "field_type": "info_text",
                    "label": "OR",
                    "description": "",
                    "required": False,
                },
                old_fields[1],  # Second upload field
            ]
            form_schema["fields"] = new_fields

            # Update upload_instructions
            form_schema["upload_instructions"] = (
                "Upload ONE of the following (only 1 required):\n\n"
                "1. Two (2) Photo documentations of poster or tarpaulin "
                "(Photo Requirements: One photo with Distant View and one photo with Close-up View)\n\n"
                "OR\n\n"
                "2. Screenshot of the posting on social media with date covering {CY_CURRENT_YEAR}"
            )

            conn.execute(
                sa.text(
                    "UPDATE indicators SET form_schema = CAST(:form_schema AS json) "
                    "WHERE indicator_code = '3.5.2'"
                ),
                {"form_schema": json.dumps(form_schema)},
            )


def downgrade() -> None:
    """Revert is not practical - this fixes display formatting."""
    pass
