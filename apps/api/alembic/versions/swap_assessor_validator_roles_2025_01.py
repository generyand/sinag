"""Swap ASSESSOR and VALIDATOR roles and add per-area submission

This migration implements the workflow restructuring:
1. Swap ASSESSOR (system-wide) ↔ VALIDATOR (area-specific) roles
2. Rename validator_area_id → assessor_area_id
3. Add per-area submission tracking fields to assessments
4. Add rework_round_used and calibration_round_used flags
5. Reset REWORK assessments to SUBMITTED (clean reset)

Revision ID: swap_roles_2025_01
Revises: cee2a87017bf
Create Date: 2025-01-09

"""

import json
from datetime import datetime

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "swap_roles_2025_01"
down_revision = "cee2a87017bf"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ==========================================================================
    # STEP 1: Add temporary enum values for role swap
    # ==========================================================================
    # PostgreSQL enums cannot be directly swapped, so we use temporary values
    op.execute("ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'ASSESSOR_TEMP'")
    op.execute("ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'VALIDATOR_TEMP'")

    # Commit to make new enum values available (required by PostgreSQL)
    op.execute("COMMIT")

    # ==========================================================================
    # STEP 2: Swap roles using temporary values
    # ==========================================================================
    # First, move current roles to temporary values
    op.execute("UPDATE users SET role = 'ASSESSOR_TEMP' WHERE role = 'ASSESSOR'")
    op.execute("UPDATE users SET role = 'VALIDATOR_TEMP' WHERE role = 'VALIDATOR'")

    # Then swap to final values
    # Old ASSESSORs (system-wide) become new VALIDATORs (system-wide)
    op.execute("UPDATE users SET role = 'VALIDATOR' WHERE role = 'ASSESSOR_TEMP'")
    # Old VALIDATORs (area-specific) become new ASSESSORs (area-specific)
    op.execute("UPDATE users SET role = 'ASSESSOR' WHERE role = 'VALIDATOR_TEMP'")

    # ==========================================================================
    # STEP 3: Rename column validator_area_id → assessor_area_id
    # ==========================================================================
    op.alter_column(
        "users",
        "validator_area_id",
        new_column_name="assessor_area_id",
    )

    # ==========================================================================
    # STEP 4: Add new assessment fields for per-area submission tracking
    # ==========================================================================
    # Per-area submission status tracking
    # Format: {"1": {"status": "approved", "submitted_at": "...", "assessor_id": "..."}, ...}
    op.add_column(
        "assessments",
        sa.Column(
            "area_submission_status",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default="{}",
        ),
    )

    # Per-area approval tracking (quick lookup)
    # Format: {"1": true, "2": false, ...}
    op.add_column(
        "assessments",
        sa.Column(
            "area_assessor_approved",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default="{}",
        ),
    )

    # Rework round flag - True after first rework cycle
    # All 6 assessors' rework requests count as 1 round
    op.add_column(
        "assessments",
        sa.Column(
            "rework_round_used",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )

    # Calibration round flag - True after first calibration cycle
    # Validator can only request calibration once
    op.add_column(
        "assessments",
        sa.Column(
            "calibration_round_used",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )

    # ==========================================================================
    # STEP 5: Clean reset - Revert REWORK assessments to SUBMITTED
    # ==========================================================================
    op.execute(
        """
        UPDATE assessments
        SET
            status = 'SUBMITTED',
            rework_comments = NULL,
            rework_count = 0,
            rework_requested_at = NULL,
            rework_submitted_at = NULL,
            rework_summary = NULL
        WHERE status = 'REWORK'
        """
    )

    # ==========================================================================
    # STEP 6: Initialize area_submission_status for existing SUBMITTED assessments
    # ==========================================================================
    # For existing submitted assessments, initialize all 6 areas as "submitted"
    connection = op.get_bind()
    result = connection.execute(
        sa.text(
            """
            SELECT id, submitted_at
            FROM assessments
            WHERE status IN ('SUBMITTED', 'IN_REVIEW', 'AWAITING_FINAL_VALIDATION', 'AWAITING_MLGOO_APPROVAL')
            """
        )
    )

    for row in result:
        assessment_id = row[0]
        submitted_at = row[1]
        submitted_at_str = (
            submitted_at.isoformat() if submitted_at else datetime.utcnow().isoformat()
        )

        # Initialize all 6 areas as submitted
        area_status = {}
        area_approved = {}
        for area_id in range(1, 7):
            area_status[str(area_id)] = {
                "status": "submitted",
                "submitted_at": submitted_at_str,
            }
            area_approved[str(area_id)] = False

        connection.execute(
            sa.text(
                """
                UPDATE assessments
                SET area_submission_status = :status,
                    area_assessor_approved = :approved
                WHERE id = :id
                """
            ),
            {
                "status": json.dumps(area_status),
                "approved": json.dumps(area_approved),
                "id": assessment_id,
            },
        )


def downgrade() -> None:
    # ==========================================================================
    # STEP 1: Remove new assessment columns
    # ==========================================================================
    op.drop_column("assessments", "calibration_round_used")
    op.drop_column("assessments", "rework_round_used")
    op.drop_column("assessments", "area_assessor_approved")
    op.drop_column("assessments", "area_submission_status")

    # ==========================================================================
    # STEP 2: Rename column back: assessor_area_id → validator_area_id
    # ==========================================================================
    op.alter_column(
        "users",
        "assessor_area_id",
        new_column_name="validator_area_id",
    )

    # ==========================================================================
    # STEP 3: Swap roles back using temporary values
    # ==========================================================================
    # Current ASSESSORs (area-specific) become VALIDATORs (area-specific)
    op.execute("UPDATE users SET role = 'VALIDATOR_TEMP' WHERE role = 'ASSESSOR'")
    # Current VALIDATORs (system-wide) become ASSESSORs (system-wide)
    op.execute("UPDATE users SET role = 'ASSESSOR_TEMP' WHERE role = 'VALIDATOR'")

    # Then swap to original values
    op.execute("UPDATE users SET role = 'VALIDATOR' WHERE role = 'VALIDATOR_TEMP'")
    op.execute("UPDATE users SET role = 'ASSESSOR' WHERE role = 'ASSESSOR_TEMP'")

    # Note: Cannot remove enum values in PostgreSQL, but they become unused
