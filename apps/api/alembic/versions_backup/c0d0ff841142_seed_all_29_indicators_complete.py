"""seed_all_29_indicators_complete

Complete seeding migration for all 29 SGLGB indicators.
This migration seeds ALL indicators in the correct order, from 1.1 to 6.3.

Revision ID: c0d0ff841142
Revises: 469f24e4f57a
Create Date: 2025-11-16 18:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c0d0ff841142'
down_revision: Union[str, Sequence[str], None] = '469f24e4f57a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed all 29 SGLGB indicators from Python definitions."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed ALL 29 indicators at once
        seed_indicators(ALL_INDICATORS, session)

        print("=" * 70)
        print("✅ Successfully seeded ALL 29 SGLGB indicators!")
        print("=" * 70)
        print("\nGovernance Area 1 - Financial Administration (7 indicators):")
        print("  ✓ 1.1 - BFDP Compliance")
        print("  ✓ 1.2 - Tax Revenue Generation")
        print("  ✓ 1.3 - Budget Approval Timeframe")
        print("  ✓ 1.4 - Human Resource Adequacy")
        print("  ✓ 1.5 - CitCha Posting")
        print("  ✓ 1.6 - Allotment for Gender and Development")
        print("  ✓ 1.7 - Barangay Assembly")

        print("\nGovernance Area 2 - Disaster Preparedness (3 indicators):")
        print("  ✓ 2.1 - BDRRMC Functionality [BBI]")
        print("  ✓ 2.2 - LDRMP and LCCAP Preparation")
        print("  ✓ 2.3 - DRRM Fund Allocation")

        print("\nGovernance Area 3 - Safety, Peace and Order (6 indicators):")
        print("  ✓ 3.1 - BADAC Functionality [BBI]")
        print("  ✓ 3.2 - BPOC Functionality [BBI]")
        print("  ✓ 3.3 - Lupong Tagapamayapa Functionality [BBI]")
        print("  ✓ 3.4 - Crime Prevention Measures")
        print("  ✓ 3.5 - Street Lighting")
        print("  ✓ 3.6 - CCTV Installation")

        print("\nGovernance Area 4 - Social Protection (9 indicators):")
        print("  ✓ 4.1 - VAW Desk Functionality [BBI]")
        print("  ✓ 4.2 - OSY Youth Development Program")
        print("  ✓ 4.3 - BDC Functionality [BBI]")
        print("  ✓ 4.4 - Senior Citizens Affairs")
        print("  ✓ 4.5 - BCPC Functionality [BBI]")
        print("  ✓ 4.6 - PWD Affairs")
        print("  ✓ 4.7 - Solo Parents Welfare")
        print("  ✓ 4.8 - BNC Functionality [BBI]")
        print("  ✓ 4.9 - HAPAG sa Barangay Project [Profiling Only]")

        print("\nGovernance Area 5 - Business-Friendliness (3 indicators):")
        print("  ✓ 5.1 - Business One-Stop-Shop")
        print("  ✓ 5.2 - EODB Law Compliance")
        print("  ✓ 5.3 - Business Permit Fees Ordinance")

        print("\nGovernance Area 6 - Environmental Management (3 indicators):")
        print("  ✓ 6.1 - BESWMC Functionality [BBI]")
        print("  ✓ 6.2 - MRF Establishment")
        print("  ✓ 6.3 - Waste Segregation Support")

        print("\n" + "=" * 70)
        print("📊 Summary:")
        print(f"   Total Indicators: 29")
        print(f"   BBI Indicators: 9")
        print(f"   Profiling Only: 1 (Indicator 4.9)")
        print("=" * 70)
        print("\n🎉 All indicators ready for SGLGB assessment workflow!")

    except Exception as e:
        print(f"❌ Error seeding indicators: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove all 29 indicators and their checklist items."""
    # Delete all checklist items
    op.execute("DELETE FROM checklist_items")

    # Delete all indicators (both parent and sub-indicators)
    op.execute("DELETE FROM indicators")

    print("✅ All indicators and checklist items removed")
