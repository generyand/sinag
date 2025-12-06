"""fix_indicator_2_1_1_composition_list

Revision ID: 3f8a8aba2f76
Revises: aea5c0b4c76a
Create Date: 2025-11-17 00:45:09.737146

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "3f8a8aba2f76"
down_revision: Union[str, Sequence[str], None] = "aea5c0b4c76a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix indicator 2.1.1 composition list format to prevent form parsing issues."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Fixing indicator 2.1.1 (BDRRMC Structure) composition list format...")
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

        print("\n✅ Successfully fixed indicator 2.1.1!")
        print("   - Changed numbered list (1., 2., 3.) to bullets (-) to prevent form parsing")
        print("   - Removed mov_description fields")
        print("   - Set requires_document_count=False for upload checkbox")
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
