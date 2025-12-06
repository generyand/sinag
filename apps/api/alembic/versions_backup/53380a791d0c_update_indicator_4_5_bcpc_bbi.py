"""update_indicator_4_5_bcpc_bbi

Revision ID: 53380a791d0c
Revises: 3808f19bee84
Create Date: 2025-11-17 00:24:55.054869

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "53380a791d0c"
down_revision: Union[str, Sequence[str], None] = "3808f19bee84"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update indicator 4.5 (BCPC BBI) upload instructions."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Updating indicator 4.5 (BCPC BBI) upload instructions...")
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

        print("\n✅ Successfully updated indicator 4.5 (BCPC BBI)!")
        print("   - 4.5.1: 1 upload (EO on BCPC establishment)")
        print("   - 4.5.2: 1 upload (training certificate)")
        print("   - 4.5.3: 1 upload (BCPC AWFP)")
        print("   - 4.5.4: 1 upload (database report)")
        print("   - 4.5.5: 3 uploads (Flow Chart, Intervention Program, CAR/CICL registry)")
        print("   - 4.5.6: 1 upload + OR logic (physical accomplishment OR budget utilization)")
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
