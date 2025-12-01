"""final_cleanup_delete_everything_and_reseed_properly

Revision ID: cc04769d7a0a
Revises: 705e8dc66d6a
Create Date: 2025-11-16 23:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cc04769d7a0a'
down_revision: Union[str, None] = '705e8dc66d6a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    FINAL CLEANUP: Delete EVERYTHING (assessments AND indicators) and reseed from scratch.

    This ensures we start with a clean slate with only the new hierarchical indicators.
    """
    print("\n" + "=" * 80)
    print("🧹 FINAL CLEANUP: Deleting ALL data and reseeding from scratch...")
    print("=" * 80)

    # Step 1: Delete all assessment-related data (respecting foreign keys)
    print("\n1️⃣  Deleting all assessment data...")
    op.execute("DELETE FROM movs")
    op.execute("DELETE FROM assessment_responses")
    op.execute("DELETE FROM bbi_results")
    op.execute("DELETE FROM assessments")
    print("   ✅ All assessments deleted")

    # Step 2: Delete all indicators (both old AND new)
    print("\n2️⃣  Deleting ALL indicators (old 1.1226 format AND new 1.1.1 format)...")
    op.execute("DELETE FROM checklist_items")
    op.execute("DELETE FROM indicators WHERE parent_id IS NOT NULL")  # Children first
    op.execute("DELETE FROM indicators WHERE parent_id IS NULL")      # Then parents
    print("   ✅ All indicators deleted (old + new)")

    # Step 3: Reseed with ONLY the new hierarchical indicators
    print("\n3️⃣  Reseeding with NEW hierarchical indicators...")

    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import seed_indicators

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        seed_indicators(ALL_INDICATORS, session)

        print("\n" + "=" * 80)
        print("✅ SUCCESS! Database now has ONLY the new hierarchical indicators:")
        print("=" * 80)
        print("\n📋 Sample indicators:")
        print("  1.1.1 - Posted the following CY 2023 financial documents...")
        print("  1.1.2 - Accomplished and signed BFR...")
        print("  1.2.1 - Increase in local resources...")
        print("  1.3.1 - Presence of a Barangay Appropriation Ordinance...")
        print("  1.6.1.1 - Has Barangay-SK Agreement")
        print("  1.6.1.2 - No agreement but has SK account")
        print("  1.6.1.3 - No SK Officials/quorum")
        print("  1.6.2.1 - If 5+ SK Officials")
        print("  1.6.2.2 - If 4 or fewer SK Officials")
        print("\n" + "=" * 80)
        print("🎉 All done! Users can now create assessments with the new indicator codes!")
        print("=" * 80)

    except Exception as e:
        print(f"\n❌ Error reseeding indicators: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """No downgrade - this is a one-way cleanup."""
    pass
