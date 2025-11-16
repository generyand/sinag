"""fix_indicators_4_2_1_4_2_2_and_4_3_3_upload_fields

Revision ID: 1c08cc4ff099
Revises: c8b5470f3469
Create Date: 2025-11-17 03:04:13.309122

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1c08cc4ff099'
down_revision: Union[str, Sequence[str], None] = 'c8b5470f3469'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix indicators 4.2.1, 4.2.2, and 4.3.3 to show correct upload fields."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Fixing indicators 4.2.1, 4.2.2, and 4.3.3 upload fields...")
        print("=" * 70)

        # Delete assessment data first (foreign key constraints)
        print("🧹 Deleting assessment data...")
        op.execute("DELETE FROM movs")
        op.execute("DELETE FROM assessment_responses")
        op.execute("DELETE FROM bbi_results")
        op.execute("DELETE FROM assessments")

        # Clear and reseed indicators
        print("🔄 Reseeding indicators with fixes...")
        clear_indicators(session)
        seed_indicators(ALL_INDICATORS, session)

        print("\n✅ Successfully fixed indicators!")
        print("   - 4.2.1: Now shows 2 upload fields with OR logic (Photos OR Certification)")
        print("   - 4.2.2: Now shows 2 upload fields with AND/OR logic (BHW AND/OR BHO/BHAsst)")
        print("   - 4.3.3: Now shows 2 upload fields (BDP and SB Resolution)")
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
