"""fix_indicator_6_2_1_to_show_6_upload_fields

Revision ID: d4cefdcbc1ad
Revises: 8cd2877a9bc9
Create Date: 2025-11-17 03:21:37.836490

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4cefdcbc1ad'
down_revision: Union[str, Sequence[str], None] = '8cd2877a9bc9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix indicator 6.2.1 to show 6 upload fields (1 for MRF, 3 for MRS, 2 for Clustered)."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Fixing indicator 6.2.1 upload fields...")
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

        print("\n✅ Successfully fixed indicator 6.2.1!")
        print("   - Now shows 6 upload fields:")
        print("   - Option 1: 1 field (MRF photo documentation)")
        print("   - Option 2: 3 fields (MRS - junkshop MOA, mechanism, service provider MOA)")
        print("   - Option 3: 2 fields (Clustered - host barangay MOA, coverage document)")
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
