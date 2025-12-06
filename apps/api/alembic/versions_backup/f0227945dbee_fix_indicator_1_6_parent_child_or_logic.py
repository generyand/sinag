"""fix_indicator_1_6_parent_child_or_logic

Revision ID: f0227945dbee
Revises: ab5061473d3b
Create Date: 2025-11-17 01:38:43.448524

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f0227945dbee"
down_revision: Union[str, Sequence[str], None] = "ab5061473d3b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix indicator 1.6 parent containers to properly use OR logic."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Fixing indicator 1.6 parent-child OR logic...")
        print("=" * 70)

        # Delete assessment data first (foreign key constraints)
        print("🧹 Deleting assessment data...")
        op.execute("DELETE FROM movs")
        op.execute("DELETE FROM assessment_responses")
        op.execute("DELETE FROM bbi_results")
        op.execute("DELETE FROM assessments")

        # Clear and reseed indicators
        print("🔄 Reseeding indicators with fixed OR logic...")
        clear_indicators(session)
        seed_indicators(ALL_INDICATORS, session)

        print("\n✅ Successfully fixed indicator 1.6 parent-child OR logic!")
        print("   - 1.6.1: Parent container with OR logic (ANY_ITEM_REQUIRED)")
        print("   - 1.6.1.1, 1.6.1.2, 1.6.1.3: Choose ONE option")
        print("   - 1.6.1.3: 2 upload fields with OR logic (only 1 required)")
        print("   - 1.6.2: Parent container with OR logic (ANY_ITEM_REQUIRED)")
        print("   - 1.6.2.1, 1.6.2.2: Choose ONE option")
        print("   - BLGU can now upload either option within each container")
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
