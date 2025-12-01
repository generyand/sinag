"""update_indicator_3_1_6_to_show_2_upload_fields_with_or_logic

Revision ID: ddb9d728dcc2
Revises: 6629c3c3bd4a
Create Date: 2025-11-17 02:27:41.151511

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ddb9d728dcc2'
down_revision: Union[str, Sequence[str], None] = '6629c3c3bd4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update indicator 3.1.6 to show 2 upload fields with OR logic (only 1 required)."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Updating indicator 3.1.6 to show 2 upload fields with OR logic...")
        print("=" * 70)

        # Delete assessment data first (foreign key constraints)
        print("🧹 Deleting assessment data...")
        op.execute("DELETE FROM movs")
        op.execute("DELETE FROM assessment_responses")
        op.execute("DELETE FROM bbi_results")
        op.execute("DELETE FROM assessments")

        # Clear and reseed indicators
        print("🔄 Reseeding indicators with updated 3.1.6...")
        clear_indicators(session)
        seed_indicators(ALL_INDICATORS, session)

        print("\n✅ Successfully updated indicator 3.1.6!")
        print("   - Now shows 2 upload fields:")
        print("   - Field 1: Approved Barangay Appropriation Ordinance")
        print("   - Field 2: Copy of Barangay Annual Investment Plan (AIP)")
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
