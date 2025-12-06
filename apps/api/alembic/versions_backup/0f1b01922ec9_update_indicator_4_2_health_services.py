"""update_indicator_4_2_health_services

Revision ID: 0f1b01922ec9
Revises: 2b21101311bf
Create Date: 2025-11-17 00:17:33.523487

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "0f1b01922ec9"
down_revision: Union[str, Sequence[str], None] = "2b21101311bf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update indicator 4.2 (Health Services) upload instructions."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Updating indicator 4.2 (Health Services) upload instructions...")
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

        print("\n✅ Successfully updated indicator 4.2 (Health Services)!")
        print("   - 4.2.1: Photo + Certification (OR logic)")
        print("   - 4.2.2: BHW AND/OR BHO/BHAsst (FOR PROFILING)")
        print("   - 4.2.3: 1 upload (EO appointing BNS)")
        print("   - 4.2.4: Certification + Health services checklist")
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
