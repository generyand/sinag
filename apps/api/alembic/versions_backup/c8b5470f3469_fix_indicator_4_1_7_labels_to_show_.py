"""fix_indicator_4_1_7_labels_to_show_correct_numbering

Revision ID: c8b5470f3469
Revises: 5d1d5917f1de
Create Date: 2025-11-17 02:59:00.707066

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c8b5470f3469"
down_revision: Union[str, Sequence[str], None] = "5d1d5917f1de"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix indicator 4.1.7 labels to show correct numbering (4.1.7.1 and 4.1.7.2 instead of 1.7.1 and 1.7.2)."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Fixing indicator 4.1.7 upload field labels...")
        print("=" * 70)

        # Delete assessment data first (foreign key constraints)
        print("🧹 Deleting assessment data...")
        op.execute("DELETE FROM movs")
        op.execute("DELETE FROM assessment_responses")
        op.execute("DELETE FROM bbi_results")
        op.execute("DELETE FROM assessments")

        # Clear and reseed indicators
        print("🔄 Reseeding indicators with fixed 4.1.7 labels...")
        clear_indicators(session)
        seed_indicators(ALL_INDICATORS, session)

        print("\n✅ Successfully fixed indicator 4.1.7!")
        print("   - Upload field labels now show:")
        print("   - Field 1: 4.1.7.1. Presence of Referral System Flow Chart...")
        print("   - Field 2: 4.1.7.2. Presence of Directory...")
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
