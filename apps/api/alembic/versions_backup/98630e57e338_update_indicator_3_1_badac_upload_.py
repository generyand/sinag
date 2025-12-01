"""update_indicator_3_1_badac_upload_instructions

Revision ID: 98630e57e338
Revises: 1a75c4e22b95
Create Date: 2025-11-17 00:12:09.504024

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '98630e57e338'
down_revision: Union[str, Sequence[str], None] = '1a75c4e22b95'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update indicator 3.1 (BADAC BBI) upload instructions and checklist items."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Updating indicator 3.1 (BADAC BBI) upload instructions...")
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

        print("\n✅ Successfully updated indicator 3.1 (BADAC BBI)!")
        print("   - 3.1.1: 1 upload (EO) + 1 date input")
        print("   - 3.1.2: 1 upload (EO) + 1 date input")
        print("   - 3.1.3: 1 upload (EO) + 1 date input")
        print("   - 3.1.4: 1 upload (EO) + 1 date input")
        print("   - 3.1.5: 1 upload (BADPA)")
        print("   - 3.1.6: Either/Or (BAO OR AIP)")
        print("   - 3.1.7: 1 upload (Activity Report)")
        print("   - 3.1.8: 2 uploads (CIR transmittals + certification) + count input")
        print("   - 3.1.9: 1 upload (UBRA form)")
        print("   - 3.1.10: 1 upload (monthly minutes) + count input")
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
