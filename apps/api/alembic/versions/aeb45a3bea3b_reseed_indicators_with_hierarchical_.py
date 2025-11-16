"""reseed_indicators_with_hierarchical_structure

Revision ID: aeb45a3bea3b
Revises: 03be4cf96073
Create Date: 2025-11-16 22:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aeb45a3bea3b'
down_revision: Union[str, None] = '03be4cf96073'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Delete all existing indicators and reseed with the new hierarchical structure.
    
    This is necessary because indicator 1.6 now has a 4-level hierarchy:
    1.6 → 1.6.1 (container) → 1.6.1.1, 1.6.1.2, 1.6.1.3 (leaf nodes)
    1.6 → 1.6.2 (container) → 1.6.2.1, 1.6.2.2 (leaf nodes)
    """
    print("\n🔄 Reseeding indicators with hierarchical structure...")
    print("⚠️  WARNING: This will delete all assessments, responses, and MOVs!")

    # Delete in this order to respect foreign keys:
    # 1. MOVs (references assessment_responses)
    op.execute("DELETE FROM movs")

    # 2. Assessment responses (references indicators)
    op.execute("DELETE FROM assessment_responses")

    # 3. BBI results (references assessments)
    op.execute("DELETE FROM bbi_results")

    # 4. Assessments
    op.execute("DELETE FROM assessments")

    # 5. Checklist items (references indicators)
    op.execute("DELETE FROM checklist_items")

    # 6. Child indicators first (those with parent_id)
    op.execute("DELETE FROM indicators WHERE parent_id IS NOT NULL")

    # 7. Then parent indicators
    op.execute("DELETE FROM indicators WHERE parent_id IS NULL")

    print("✅ All assessments, responses, MOVs, and indicators deleted")
    print("🌱 Now running the seed migration to recreate indicators...")
    print("   (This will be handled by the seed_hardcoded_indicators migration)")


def downgrade() -> None:
    """No downgrade - this is a one-way migration for data cleanup"""
    pass
