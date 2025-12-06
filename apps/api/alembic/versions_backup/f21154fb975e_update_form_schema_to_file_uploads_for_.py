"""update_form_schema_to_file_uploads_for_blgu

Revision ID: f21154fb975e
Revises: 3975f3ead333
Create Date: 2025-11-16 23:32:25.887379

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f21154fb975e"
down_revision: Union[str, Sequence[str], None] = "3975f3ead333"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update form_schema to use file_upload fields for BLGU users."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Updating indicators with file_upload fields for BLGU users...")
        print("=" * 70)

        # Delete assessment data first (foreign key constraints)
        print("🧹 Deleting assessment data...")
        op.execute("DELETE FROM movs")
        op.execute("DELETE FROM assessment_responses")
        op.execute("DELETE FROM bbi_results")
        op.execute("DELETE FROM assessments")

        # Clear and reseed indicators
        print("🔄 Reseeding indicators with file upload fields...")
        clear_indicators(session)
        seed_indicators(ALL_INDICATORS, session)

        print("\n✅ Successfully updated all 29 SGLGB indicators with file_upload fields!")
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
