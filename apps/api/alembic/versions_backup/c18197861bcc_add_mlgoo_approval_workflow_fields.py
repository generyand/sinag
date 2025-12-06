"""add_mlgoo_approval_workflow_fields

Revision ID: c18197861bcc
Revises: 8158782036f4
Create Date: 2025-11-28 12:29:19.776069

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c18197861bcc"
down_revision: Union[str, Sequence[str], None] = "8158782036f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add MLGOO Final Approval workflow fields to assessments table.

    This migration adds:
    1. AWAITING_MLGOO_APPROVAL status to the assessment_status_enum
    2. MLGOO approval tracking fields (mlgoo_approved_by, mlgoo_approved_at)
    3. MLGOO RE-calibration fields (for when validator is too strict)
    4. Grace period and auto-lock fields
    5. New notification types for MLGOO workflow
    """
    # Add new status value to assessment_status_enum
    op.execute(
        "ALTER TYPE assessment_status_enum ADD VALUE IF NOT EXISTS 'AWAITING_MLGOO_APPROVAL'"
    )

    # Add new notification types
    op.execute(
        "ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'READY_FOR_MLGOO_APPROVAL'"
    )
    op.execute(
        "ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'MLGOO_RECALIBRATION_REQUESTED'"
    )
    op.execute("ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'ASSESSMENT_APPROVED'")
    op.execute(
        "ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'DEADLINE_EXPIRED_LOCKED'"
    )
    op.execute("ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'GRACE_PERIOD_WARNING'")

    # MLGOO Final Approval tracking
    op.add_column("assessments", sa.Column("mlgoo_approved_by", sa.Integer(), nullable=True))
    op.add_column("assessments", sa.Column("mlgoo_approved_at", sa.DateTime(), nullable=True))

    # MLGOO RE-calibration tracking (distinct from Validator calibration)
    op.add_column(
        "assessments",
        sa.Column(
            "is_mlgoo_recalibration",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.add_column(
        "assessments",
        sa.Column("mlgoo_recalibration_requested_by", sa.Integer(), nullable=True),
    )
    op.add_column(
        "assessments",
        sa.Column("mlgoo_recalibration_requested_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "assessments",
        sa.Column(
            "mlgoo_recalibration_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "assessments",
        sa.Column("mlgoo_recalibration_indicator_ids", sa.JSON(), nullable=True),
    )
    op.add_column(
        "assessments",
        sa.Column("mlgoo_recalibration_comments", sa.Text(), nullable=True),
    )

    # Grace Period & Auto-lock tracking
    op.add_column(
        "assessments",
        sa.Column("grace_period_expires_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "assessments",
        sa.Column(
            "is_locked_for_deadline",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.add_column("assessments", sa.Column("locked_at", sa.DateTime(), nullable=True))

    # Foreign key constraints
    op.create_foreign_key(
        "fk_assessments_mlgoo_approved_by",
        "assessments",
        "users",
        ["mlgoo_approved_by"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_assessments_mlgoo_recalibration_requested_by",
        "assessments",
        "users",
        ["mlgoo_recalibration_requested_by"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Downgrade schema by removing MLGOO workflow fields."""
    # Drop foreign keys
    op.drop_constraint(
        "fk_assessments_mlgoo_recalibration_requested_by",
        "assessments",
        type_="foreignkey",
    )
    op.drop_constraint("fk_assessments_mlgoo_approved_by", "assessments", type_="foreignkey")

    # Drop columns
    op.drop_column("assessments", "locked_at")
    op.drop_column("assessments", "is_locked_for_deadline")
    op.drop_column("assessments", "grace_period_expires_at")
    op.drop_column("assessments", "mlgoo_recalibration_comments")
    op.drop_column("assessments", "mlgoo_recalibration_indicator_ids")
    op.drop_column("assessments", "mlgoo_recalibration_count")
    op.drop_column("assessments", "mlgoo_recalibration_requested_at")
    op.drop_column("assessments", "mlgoo_recalibration_requested_by")
    op.drop_column("assessments", "is_mlgoo_recalibration")
    op.drop_column("assessments", "mlgoo_approved_at")
    op.drop_column("assessments", "mlgoo_approved_by")

    # Note: PostgreSQL doesn't support removing enum values easily
    # The enum values will remain but won't be used after downgrade
