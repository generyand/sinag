"""
Reseed ALL indicators from Python definitions.
This script clears and reseeds indicators for all governance areas (1-6).

Run this after updating indicator definition files with year placeholders.
"""

import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.db.base import SessionLocal
from app.indicators.definitions import ALL_INDICATORS
from app.indicators.seeder import reseed_indicators


def main():
    """Reseed all indicators from Python definitions"""
    db = SessionLocal()
    try:
        print("🌱 Reseeding ALL indicators from Python definitions...")
        print(f"   Found {len(ALL_INDICATORS)} indicator definitions")

        # Reseed (clear + seed) all indicators
        reseed_indicators(ALL_INDICATORS, db)

        print("✅ Indicator reseeding complete!")

        # Verify what was created
        from app.db.models.governance_area import Indicator

        for area_id in range(1, 7):
            indicators = (
                db.query(Indicator)
                .filter(
                    Indicator.governance_area_id == area_id,
                    Indicator.parent_id.is_(None),  # Only root indicators
                )
                .all()
            )
            print(f"\nGovernance Area {area_id}: {len(indicators)} root indicators")
            for ind in indicators:
                print(f"  - {ind.indicator_code}: {ind.name[:60]}...")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback

        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
