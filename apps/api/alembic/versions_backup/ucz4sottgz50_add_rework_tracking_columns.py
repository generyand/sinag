"""add rework tracking columns

Revision ID: ucz4sottgz50
Revises: 6v29gw2io7vj
Create Date: 2025-11-09 14:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "ucz4sottgz50"
down_revision: Union[str, Sequence[str], None] = "6v29gw2io7vj"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add rework tracking columns to assessments table for Epic 5.0 workflow.

    Columns added:
    - rework_requested_at: TIMESTAMP, nullable - When rework was requested
    - rework_requested_by: INTEGER, nullable - FK to users.id, assessor who requested rework
    - rework_comments: TEXT, nullable - Assessor's feedback to BLGU

    Note: rework_count column already exists in the assessments table (added previously).
    This migration adds CHECK constraint to enforce rework_count <= 1.

    Indexes added:
    - idx_assessments_rework_requested_by: Performance index for querying by assessor
    """
    # Add CHECK constraint to existing rework_count column
    # Ensures only one rework cycle is allowed (rework_count must be 0 or 1)
    op.create_check_constraint(
        "chk_rework_count_limit",
        "assessments",
        "rework_count >= 0 AND rework_count <= 1",
    )

    # Add rework_requested_at timestamp column
    # Stores when the assessor requested rework from the BLGU
    op.add_column("assessments", sa.Column("rework_requested_at", sa.DateTime(), nullable=True))

    # Add rework_requested_by foreign key column
    # References the user (assessor/validator) who requested the rework
    # SET NULL on delete to preserve historical data even if user is deleted
    op.add_column("assessments", sa.Column("rework_requested_by", sa.Integer(), nullable=True))

    # Create foreign key constraint for rework_requested_by
    op.create_foreign_key(
        "fk_assessment_rework_requested_by",
        "assessments",
        "users",
        ["rework_requested_by"],
        ["id"],
        ondelete="SET NULL",
    )

    # Add rework_comments text column
    # Stores assessor's feedback explaining what needs to be reworked
    # Required when requesting rework (enforced at application layer)
    op.add_column("assessments", sa.Column("rework_comments", sa.Text(), nullable=True))

    # Create index on rework_requested_by for query performance
    # Improves queries filtering by assessor (e.g., "all assessments I requested rework on")
    op.create_index(
        "idx_assessments_rework_requested_by",
        "assessments",
        ["rework_requested_by"],
        unique=False,
    )


def downgrade() -> None:
    """
    Rollback rework tracking columns.

    Removes all columns and constraints added in the upgrade function.
    """
    # Drop index first (before dropping the column it depends on)
    op.drop_index("idx_assessments_rework_requested_by", table_name="assessments")

    # Drop foreign key constraint before dropping the column
    op.drop_constraint("fk_assessment_rework_requested_by", "assessments", type_="foreignkey")

    # Drop columns in reverse order
    op.drop_column("assessments", "rework_comments")
    op.drop_column("assessments", "rework_requested_by")
    op.drop_column("assessments", "rework_requested_at")

    # Drop check constraint on rework_count
    op.drop_constraint("chk_rework_count_limit", "assessments", type_="check")
