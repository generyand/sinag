import os
import sys

sys.path.insert(0, os.getcwd())

from app.db.session import SessionLocal

from app.db.models.assessment import Indicator

db = SessionLocal()
try:
    indicators = db.query(Indicator).all()

    print("=== ALL INDICATORS ===\n")
    old_format_ids = []

    for ind in indicators:
        form_schema = ind.form_schema

        # Determine format
        if isinstance(form_schema, dict):
            if (
                "type" in form_schema
                and "fields" not in form_schema
                and "sections" not in form_schema
            ):
                format_type = "OLD (JSON Schema - Epic 1.0/2.0)"
                old_format_ids.append(ind.id)
            elif "sections" in form_schema and "fields" not in form_schema:
                format_type = "Epic 3.0 (sections-based)"
            elif "fields" in form_schema:
                format_type = "Epic 4.0 (fields-based)"
            else:
                format_type = "UNKNOWN"
        else:
            format_type = "INVALID"

        print(f"ID: {ind.id}")
        print(f"Code: {ind.code}")
        print(f"Name: {ind.name}")
        print(f"Format: {format_type}")
        print(f"Governance Area ID: {ind.governance_area_id}")
        print("-" * 60)

    print("\n=== SUMMARY ===")
    print(f"Total indicators: {len(indicators)}")
    print(f"Old format indicators to delete: {len(old_format_ids)}")
    if old_format_ids:
        print(f"Old format IDs: {old_format_ids}")
finally:
    db.close()
