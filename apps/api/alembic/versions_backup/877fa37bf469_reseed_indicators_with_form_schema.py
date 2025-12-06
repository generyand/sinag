"""reseed_indicators_with_form_schema

Revision ID: 877fa37bf469
Revises: cc04769d7a0a
Create Date: 2025-11-16 23:23:26.285262

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "877fa37bf469"
down_revision: Union[str, Sequence[str], None] = "cc04769d7a0a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Reseed all indicators with form_schema generated from checklist items."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import clear_indicators, seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("\n" + "=" * 70)
        print("🔄 Reseeding indicators with form_schema from checklist items...")
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

        print("\n✅ Successfully reseeded all 29 SGLGB indicators with form_schema!")
        print("=" * 70)

    except Exception as e:
        print(f"\n❌ Error reseeding indicators: {e}")
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
