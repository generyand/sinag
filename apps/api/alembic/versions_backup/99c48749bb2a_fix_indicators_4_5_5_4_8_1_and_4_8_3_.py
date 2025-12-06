"""fix_indicators_4_5_5_4_8_1_and_4_8_3_upload_fields

Revision ID: 99c48749bb2a
Revises: 1c08cc4ff099
Create Date: 2025-11-17 03:11:33.363106

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "99c48749bb2a"
down_revision: Union[str, Sequence[str], None] = "1c08cc4ff099"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix indicators 4.5.5, 4.8.1, and 4.8.3 upload fields."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Fixing indicators 4.5.5, 4.8.1, and 4.8.3 upload fields...")
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
        print(
            "   - 4.5.5: Now shows 3 upload fields (Flow Chart, Intervention Program, CAR/CICL registry)"
        )
        print(
            "   - 4.8.1: Now shows 1 upload field with 13 composition checklist items for assessor"
        )
        print("   - 4.8.3: Now shows 2 upload fields with 3 category checklist items for assessor")
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
