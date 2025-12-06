"""
Manual script to seed/update indicators for areas 2-6
Run this to ensure the new indicator structure is applied.
"""

import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.db.base import SessionLocal
from app.services.indicator_service import indicator_service


def main():
    """Manually trigger indicator seeding for areas 2-6"""
    db = SessionLocal()
    try:
        print("🌱 Seeding indicators for governance areas 2-6...")
        indicator_service.seed_areas_2_to_6_indicators(db)
        print("✅ Indicator seeding complete!")

        # Verify what was created
        from app.db.models.governance_area import Indicator

        for area_id in range(2, 7):
            indicators = db.query(Indicator).filter(Indicator.governance_area_id == area_id).all()
            print(f"\nArea {area_id} indicators:")
            for ind in indicators:
                print(f"  - {ind.name}")
                print(f"    ID: {ind.id}")
                if ind.form_schema:
                    props = ind.form_schema.get("properties", {})
                    section_key = f"section_{area_id}_1"
                    if section_key in props:
                        print(f"    ✓ Has nested structure: {section_key}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback

        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
