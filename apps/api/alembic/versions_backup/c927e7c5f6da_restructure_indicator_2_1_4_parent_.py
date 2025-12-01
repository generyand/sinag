"""restructure_indicator_2_1_4_parent_child_or_logic

Revision ID: c927e7c5f6da
Revises: 2025976a770d
Create Date: 2025-11-17 01:00:03.911352

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c927e7c5f6da'
down_revision: Union[str, Sequence[str], None] = '2025976a770d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Restructure indicator 2.1.4 to parent-child structure with OR logic."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Restructuring indicator 2.1.4 (BDRRMC Accomplishment Reports)...")
        print("=" * 70)

        # Delete assessment data first (foreign key constraints)
        print("🧹 Deleting assessment data...")
        op.execute("DELETE FROM movs")
        op.execute("DELETE FROM assessment_responses")
        op.execute("DELETE FROM bbi_results")
        op.execute("DELETE FROM assessments")

        # Clear and reseed indicators
        print("🔄 Reseeding indicators...")
        clear_indicators(session)
        seed_indicators(ALL_INDICATORS, session)

        print("\n✅ Successfully restructured indicator 2.1.4!")
        print("   - 2.1.4: Parent container with OR logic (ANY_ITEM_REQUIRED)")
        print("   - 2.1.4.1: Physical accomplishment option (2 uploads)")
        print("   - 2.1.4.2: Financial utilization option (2 uploads)")
        print("   - BLGU can now upload either 2.1.4.1 OR 2.1.4.2 documents")
        print("=" * 70)

    except Exception as e:
        print(f"\n❌ Error updating indicators: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove all indicators."""
    op.execute("DELETE FROM checklist_items")
    op.execute("DELETE FROM indicators WHERE parent_id IS NOT NULL")
    op.execute("DELETE FROM indicators WHERE parent_id IS NULL")
    print("✅ All indicators removed")
