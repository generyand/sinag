"""fix_indicator_2_1_all_subindicators

Revision ID: c6fb5c11d0be
Revises: 3f8a8aba2f76
Create Date: 2025-11-17 00:48:38.049715

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c6fb5c11d0be'
down_revision: Union[str, Sequence[str], None] = '3f8a8aba2f76'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix all sub-indicators for indicator 2.1 (BDRRMC BBI)."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Fixing all sub-indicators for indicator 2.1 (BDRRMC BBI)...")
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

        print("\n✅ Successfully fixed indicator 2.1!")
        print("   - 2.1.1: Fixed composition list format (bullets instead of numbers)")
        print("   - 2.1.2: Removed mov_description, set requires_document_count")
        print("   - 2.1.3: Removed mov_description, set requires_document_count")
        print("   - 2.1.4: Simplified upload instructions, cleaned up checklist items")
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
