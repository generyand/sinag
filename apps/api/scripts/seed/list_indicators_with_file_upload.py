#!/usr/bin/env python3
"""
List all indicators grouped by whether they have file upload fields.
Helps identify which indicators to use for testing Epic 4.0.
"""

from app.db.base import SessionLocal
from app.db.models.governance_area import GovernanceArea, Indicator


def list_indicators_by_file_upload():
    db = SessionLocal()

    try:
        # Get all governance areas
        gov_areas = db.query(GovernanceArea).all()

        print("=" * 80)
        print("📊 INDICATORS WITH FILE UPLOAD FIELDS (Epic 4.0)")
        print("=" * 80)
        print()

        total_with_upload = 0
        total_without_upload = 0

        for gov_area in gov_areas:
            indicators = (
                db.query(Indicator).filter(Indicator.governance_area_id == gov_area.id).all()
            )

            with_upload = []
            without_upload = []

            for ind in indicators:
                if not ind.form_schema:
                    without_upload.append(ind)
                    continue

                sections = ind.form_schema.get("sections", [])
                has_file_upload = False

                for section in sections:
                    fields = section.get("fields", [])
                    for field in fields:
                        if field.get("field_type") == "file_upload":
                            has_file_upload = True
                            break
                    if has_file_upload:
                        break

                if has_file_upload:
                    with_upload.append(ind)
                else:
                    without_upload.append(ind)

            # Print governance area header
            print(f"📁 {gov_area.name}")
            print(f"   Total indicators: {len(indicators)}")

            # Print indicators WITH file upload
            if with_upload:
                print(f"\n   ✅ WITH file_upload field ({len(with_upload)}):")
                for ind in with_upload:
                    print(f"      • ID {ind.id:3d}: {ind.name}")
                    print(
                        f"        URL: http://localhost:3000/blgu/assessment/68/indicator/{ind.id}"
                    )
                total_with_upload += len(with_upload)

            # Print indicators WITHOUT file upload (collapsed)
            if without_upload:
                print(f"\n   ❌ WITHOUT file_upload field ({len(without_upload)})")
                total_without_upload += len(without_upload)

            print()

        print("=" * 80)
        print("📈 SUMMARY")
        print("=" * 80)
        print(f"✅ Indicators with file_upload: {total_with_upload}")
        print(f"❌ Indicators without file_upload: {total_without_upload}")
        print(f"📊 Total indicators: {total_with_upload + total_without_upload}")
        print()

        if total_with_upload > 0:
            print("🎯 QUICK LINKS TO TEST:")
            print()
            all_indicators = db.query(Indicator).all()
            for ind in all_indicators:
                if ind.form_schema:
                    sections = ind.form_schema.get("sections", [])
                    for section in sections:
                        for field in section.get("fields", []):
                            if field.get("field_type") == "file_upload":
                                print(f"   • {ind.name}")
                                print(
                                    f"     http://localhost:3000/blgu/assessment/68/indicator/{ind.id}"
                                )
                                print()
                                break

    finally:
        db.close()


if __name__ == "__main__":
    list_indicators_by_file_upload()
