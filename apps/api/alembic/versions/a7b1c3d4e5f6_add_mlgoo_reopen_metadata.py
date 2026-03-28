"""add mlgoo reopen metadata

Revision ID: a7b1c3d4e5f6
Revises: 6b5f10b0209d
Create Date: 2026-03-23 00:00:00.000000

Adds the MLGOO reopen status and metadata columns to assessments:
- REOPENED_BY_MLGOO status value
- reopened_at
- reopened_by
- reopen_reason
- reopen_from_status

Downgrade safety:
- rows reopened by MLGOO are rewritten to REWORK before the newer status is removed from use
- reopen metadata columns are cleared/dropped after the data is normalized
- shared generated types still need to be regenerated outside this sandbox
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a7b1c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "6b5f10b0209d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add MLGOO reopen workflow support to assessments."""
    op.execute("ALTER TYPE assessment_status_enum ADD VALUE IF NOT EXISTS 'REOPENED_BY_MLGOO'")
    assessment_status_enum = postgresql.ENUM(
        "DRAFT",
        "SUBMITTED",
        "IN_REVIEW",
        "REWORK",
        "AWAITING_FINAL_VALIDATION",
        "AWAITING_MLGOO_APPROVAL",
        "REOPENED_BY_MLGOO",
        "COMPLETED",
        "SUBMITTED_FOR_REVIEW",
        "VALIDATED",
        "NEEDS_REWORK",
        name="assessment_status_enum",
        create_type=False,
    )

    op.add_column("assessments", sa.Column("reopened_at", sa.DateTime(), nullable=True))
    op.add_column("assessments", sa.Column("reopened_by", sa.Integer(), nullable=True))
    op.add_column("assessments", sa.Column("reopen_reason", sa.Text(), nullable=True))
    op.add_column(
        "assessments",
        sa.Column(
            "reopen_from_status",
            assessment_status_enum,
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_assessments_reopened_by_users",
        "assessments",
        "users",
        ["reopened_by"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Drop MLGOO reopen metadata columns.

    Before older code is restored, normalize any reopened rows back to a legacy
    editable status so the downgrade is operationally safe.

    Note: PostgreSQL does not support removing enum values directly, so the
    REOPENED_BY_MLGOO value remains in assessment_status_enum after downgrade.
    """
    op.execute(
        """
        UPDATE assessments
        SET status = 'REWORK',
            reopened_at = NULL,
            reopened_by = NULL,
            reopen_reason = NULL,
            reopen_from_status = NULL
        WHERE status = 'REOPENED_BY_MLGOO'
        """
    )
    op.drop_constraint("fk_assessments_reopened_by_users", "assessments", type_="foreignkey")
    op.drop_column("assessments", "reopen_from_status")
    op.drop_column("assessments", "reopen_reason")
    op.drop_column("assessments", "reopened_by")
    op.drop_column("assessments", "reopened_at")
