"""reseed_with_recursive_seeder_for_hierarchical_indicators

Revision ID: 705e8dc66d6a
Revises: 5a77fe4f3db5
Create Date: 2025-11-16 23:10:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "705e8dc66d6a"
down_revision: Union[str, None] = "5a77fe4f3db5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Reseed all indicators with the FIXED recursive seeder that properly handles
    4-level hierarchies like indicator 1.6.

    The previous seeder only handled 2 levels, so container nodes like 1.6.1
    and their children (1.6.1.1, 1.6.1.2, 1.6.1.3) were not created.
    """
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import reseed_indicators

    print("\n🔄 Reseeding indicators with RECURSIVE seeder for hierarchical structure...")

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Reseed ALL 29 indicators with the fixed recursive seeder
        reseed_indicators(ALL_INDICATORS, session)

        print("=" * 80)
        print("✅ Successfully reseeded ALL 29 SGLGB indicators with FULL hierarchical support!")
        print("=" * 80)
        print("\n🎯 Now includes ALL nested levels:")
        print("  1.6 (Parent)")
        print("    ├─ 1.6.1 (Container - NOW CREATED!)")
        print("    │   ├─ 1.6.1.1 Has Barangay-SK Agreement")
        print("    │   ├─ 1.6.1.2 No agreement but has SK account")
        print("    │   └─ 1.6.1.3 No SK Officials/quorum")
        print("    └─ 1.6.2 (Container - NOW CREATED!)")
        print("        ├─ 1.6.2.1 If 5+ SK Officials")
        print("        └─ 1.6.2.2 If 4 or fewer SK Officials")
        print("\n" + "=" * 80)
        print("🎉 All 4-level hierarchies are now properly seeded!")

    except Exception as e:
        print(f"❌ Error reseeding indicators: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove all indicators."""
    op.execute("DELETE FROM checklist_items")
    op.execute("DELETE FROM indicators")
    print("✅ All indicators removed")
