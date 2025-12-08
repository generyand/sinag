"""
Update date_input fields to not be required for BLGU users.

This script updates the form_schema for indicators that have date_input fields,
changing them from required=True to required=False.

Run this after updating indicator definition files.
"""

import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.db.base import SessionLocal
from app.db.models.governance_area import Indicator
from app.indicators.definitions import ALL_INDICATORS
from app.indicators.seeder import _generate_form_schema_from_checklist


def get_all_sub_indicators(indicator_def):
    """Recursively get all sub-indicators from an indicator definition."""
    subs = []
    for child in indicator_def.children or []:
        subs.append(child)
        # Sub-indicators don't have nested children in current structure
    return subs


def main():
    """Update form_schema for indicators with date_input fields"""
    db = SessionLocal()

    # List of indicator codes that have date_input fields
    # These are the sub-indicators that need updating
    affected_indicators = [
        "1.3.1",  # indicator_1_3.py
        "1.4.1",  # indicator_1_4.py
        "2.1.1",  # indicator_2_1.py
        "3.1.1",
        "3.1.2",
        "3.1.3",
        "3.1.4",  # indicator_3_1.py
        "3.2.1",  # indicator_3_2.py
        "4.6.1",  # indicator_4_6.py
        "6.1.1",  # indicator_6_1.py
        "6.3.1",  # indicator_6_3.py
    ]

    try:
        print("🔧 Updating date_input fields to required=False...")

        # Build a map of code -> definition from Python definitions
        code_to_def = {}
        for indicator in ALL_INDICATORS:
            for sub in get_all_sub_indicators(indicator):
                code_to_def[sub.code] = sub

        updated_count = 0

        for code in affected_indicators:
            # Find the indicator in the database
            db_indicator = db.query(Indicator).filter(Indicator.indicator_code == code).first()

            if not db_indicator:
                print(f"⚠️  Indicator {code} not found in database")
                continue

            # Get the Python definition
            if code not in code_to_def:
                print(f"⚠️  Definition for {code} not found")
                continue

            sub_def = code_to_def[code]

            # Generate new form_schema from the updated definition
            if sub_def.checklist_items or sub_def.upload_instructions:
                new_form_schema = _generate_form_schema_from_checklist(
                    sub_def.checklist_items,
                    sub_def.upload_instructions,
                    sub_def.validation_rule,
                    sub_def.notes,
                )

                # Update the database record
                db_indicator.form_schema = new_form_schema
                print(f"✅ Updated {code}: {db_indicator.name[:50]}...")
                updated_count += 1

        db.commit()
        print(f"\n🎉 Updated {updated_count} indicators successfully!")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback

        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
