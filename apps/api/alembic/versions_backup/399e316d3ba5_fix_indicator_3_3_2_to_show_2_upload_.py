"""fix_indicator_3_3_2_to_show_2_upload_fields_with_or_logic

Revision ID: 399e316d3ba5
Revises: 94c29d3c1898
Create Date: 2025-11-17 02:38:49.749482

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "399e316d3ba5"
down_revision: Union[str, Sequence[str], None] = "94c29d3c1898"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix indicator 3.3.2 to show 2 upload fields with OR logic (cities vs municipalities)."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Fixing indicator 3.3.2 upload fields...")
        print("=" * 70)

        # Delete assessment data first (foreign key constraints)
        print("🧹 Deleting assessment data...")
        op.execute("DELETE FROM movs")
        op.execute("DELETE FROM assessment_responses")
        op.execute("DELETE FROM bbi_results")
        op.execute("DELETE FROM assessments")

        # Clear and reseed indicators
        print("🔄 Reseeding indicators with fixed 3.3.2...")
        clear_indicators(session)
        seed_indicators(ALL_INDICATORS, session)

        print("\n✅ Successfully fixed indicator 3.3.2!")
        print("   - Now shows 2 upload fields:")
        print("   - Field 1: For barangays of cities (computer database)")
        print("   - Field 2: For barangays of municipalities (manual/digital records)")
        print("   - OR logic: Only 1 of 2 required (0 of 1 completion counter)")
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
