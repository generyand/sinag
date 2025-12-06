"""update_indicator_6_1_beswmc_bbi

Revision ID: aea5c0b4c76a
Revises: c1bae39e4dad
Create Date: 2025-11-17 00:35:31.383271

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "aea5c0b4c76a"
down_revision: Union[str, Sequence[str], None] = "c1bae39e4dad"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update indicator 6.1 (BESWMC BBI) upload instructions."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Updating indicator 6.1 (BESWMC BBI) upload instructions...")
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

        print("\n✅ Successfully updated indicator 6.1 (BESWMC BBI)!")
        print("   - 6.1.1: 1 upload (EO/resolution) + date input")
        print("   - 6.1.2: 1 upload (Approved SWMP)")
        print("   - 6.1.3: 1 upload (training certificate)")
        print("   - 6.1.4: 1 upload + OR logic (physical accomplishment OR budget utilization)")
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
