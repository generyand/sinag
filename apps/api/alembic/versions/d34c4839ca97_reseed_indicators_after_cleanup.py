"""reseed_indicators_after_cleanup

Revision ID: d34c4839ca97
Revises: aeb45a3bea3b
Create Date: 2025-11-16 22:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd34c4839ca97'
down_revision: Union[str, None] = 'aeb45a3bea3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed all 29 SGLGB indicators with the new hierarchical structure."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed ALL 29 indicators at once (now with hierarchical 1.6)
        seed_indicators(ALL_INDICATORS, session)

        print("=" * 70)
        print("✅ Successfully seeded ALL 29 SGLGB indicators with hierarchical structure!")
        print("=" * 70)
        print("\n🆕 Updated Indicator 1.6 - Release of SK Funds:")
        print("  1.6 (Parent)")
        print("    ├─ 1.6.1 (Container)")
        print("    │   ├─ 1.6.1.1 Has Barangay-SK Agreement")
        print("    │   ├─ 1.6.1.2 No agreement but has SK account")
        print("    │   └─ 1.6.1.3 No SK Officials/quorum")
        print("    └─ 1.6.2 (Container)")
        print("        ├─ 1.6.2.1 If 5+ SK Officials")
        print("        └─ 1.6.2.2 If 4 or fewer SK Officials")
        print("\n" + "=" * 70)
        print("🎉 All indicators ready with new hierarchical structure!")

    except Exception as e:
        print(f"❌ Error seeding indicators: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove all indicators."""
    op.execute("DELETE FROM checklist_items")
    op.execute("DELETE FROM indicators")
    print("✅ All indicators removed")
