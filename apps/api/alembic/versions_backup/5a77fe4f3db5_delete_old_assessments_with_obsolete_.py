"""delete_old_assessments_with_obsolete_indicators

Revision ID: 5a77fe4f3db5
Revises: d34c4839ca97
Create Date: 2025-11-16 23:06:40.974715

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "5a77fe4f3db5"
down_revision: Union[str, Sequence[str], None] = "d34c4839ca97"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Delete all existing assessments that reference the old indicator structure.
    Users will need to create new assessments with the new hierarchical indicators.
    """
    print("\n🧹 Cleaning up old assessments with obsolete indicator references...")

    # Delete in this order to respect foreign keys:
    # 1. MOVs (references assessment_responses)
    op.execute("DELETE FROM movs")

    # 2. Assessment responses (references assessments and indicators)
    op.execute("DELETE FROM assessment_responses")

    # 3. BBI results (references assessments)
    op.execute("DELETE FROM bbi_results")

    # 4. Assessments
    op.execute("DELETE FROM assessments")

    print("✅ All old assessments deleted")
    print("ℹ️  Users can now create new assessments with the new hierarchical indicator structure")


def downgrade() -> None:
    """Downgrade schema."""
    pass
