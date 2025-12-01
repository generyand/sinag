"""consolidate_indicator_1_6_2_into_single_indicator

Revision ID: b0ba2938b688
Revises: bc902f23c08b
Create Date: 2025-11-17 02:04:36.537301

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b0ba2938b688'
down_revision: Union[str, Sequence[str], None] = 'bc902f23c08b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Consolidate indicator 1.6.2.1 and 1.6.2.2 into single indicator 1.6.2."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Consolidating indicator 1.6.2 into single indicator...")
        print("=" * 70)

        # Delete assessment data first (foreign key constraints)
        print("🧹 Deleting assessment data...")
        op.execute("DELETE FROM movs")
        op.execute("DELETE FROM assessment_responses")
        op.execute("DELETE FROM bbi_results")
        op.execute("DELETE FROM assessments")

        # Clear and reseed indicators
        print("🔄 Reseeding indicators with consolidated 1.6.2...")
        clear_indicators(session)
        seed_indicators(ALL_INDICATORS, session)

        print("\n✅ Successfully consolidated indicator 1.6.2!")
        print("   - Removed 1.6.2.1 and 1.6.2.2 child indicators")
        print("   - 1.6.2 now has all 3 upload fields in one indicator")
        print("   - Field 1 & 2: Required if 5+ SK officials")
        print("   - Field 3: Required if 4 or fewer SK officials")
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
