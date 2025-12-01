"""update assessment status enum

Revision ID: 6v29gw2io7vj
Revises: 5562d6674781
Create Date: 2025-11-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6v29gw2io7vj'
down_revision: Union[str, Sequence[str], None] = '5562d6674781'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add new assessment status enum values for Epic 5.0 submission workflow.

    New values: SUBMITTED, IN_REVIEW, REWORK, COMPLETED
    Legacy values preserved: DRAFT (changed from 'Draft'), SUBMITTED_FOR_REVIEW, VALIDATED, NEEDS_REWORK

    Note: PostgreSQL ALTER TYPE ADD VALUE cannot be run inside a transaction block,
    but Alembic migrations run in transactions by default. We need to handle this carefully.
    """
    connection = op.get_bind()

    # The enum is named 'assessment_status_enum' in the database
    enum_type_name = 'assessment_status_enum'

    # Check and add new enum values one by one
    new_values = ['SUBMITTED', 'IN_REVIEW', 'REWORK', 'COMPLETED', 'DRAFT',
                  'SUBMITTED_FOR_REVIEW', 'VALIDATED', 'NEEDS_REWORK']

    for value in new_values:
        # Check if enum value already exists
        result = connection.execute(
            sa.text("""
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_type t
                    JOIN pg_enum e ON t.oid = e.enumtypid
                    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                    WHERE t.typname = :enum_name
                    AND e.enumlabel = :value
                )
            """),
            {"enum_name": enum_type_name, "value": value}
        ).scalar()

        if not result:
            # Add the enum value
            # Note: This must be done outside a transaction in production,
            # but for migrations we'll use COMMIT to handle it
            connection.execute(
                sa.text(f"ALTER TYPE {enum_type_name} ADD VALUE '{value}'")
            )
            connection.commit()


def downgrade() -> None:
    """
    Downgrade assessment status enum.

    WARNING: PostgreSQL does not support removing enum values safely.
    This downgrade function will:
    1. Update all assessments using new enum values to DRAFT
    2. Document that manual cleanup is required for production
    """
    connection = op.get_bind()

    # Update all assessments with new status values back to DRAFT
    connection.execute(
        sa.text("""
            UPDATE assessments
            SET status = 'DRAFT'
            WHERE status IN ('SUBMITTED', 'IN_REVIEW', 'REWORK', 'COMPLETED')
        """)
    )

    print("WARNING: Enum values SUBMITTED, IN_REVIEW, REWORK, COMPLETED were not removed.")
    print("All assessments using these statuses have been set to DRAFT.")
    print("To fully remove these enum values, manual database intervention is required.")
