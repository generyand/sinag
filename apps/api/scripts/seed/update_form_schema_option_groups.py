"""
Remove option_group from form_schema JSON for all indicators except 1.6.1.

The form_schema JSONB column contains UI schema data that includes option_group
values which control dropdown/accordion grouping in the frontend. This script
removes those option_group values while keeping the validation logic intact.

Indicator 1.6.1 is excluded because it needs the Option 1/2/3 dropdown UI.
"""

import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session
from app.db.base import SessionLocal
from app.db.models.governance_area import Indicator


def remove_option_groups_from_form_schema(db: Session) -> int:
    """
    Remove option_group from form_schema fields for all indicators except 1.6.1.

    Returns the count of updated indicators.
    """
    # Get all indicators with form_schema
    indicators = db.query(Indicator).filter(Indicator.form_schema.isnot(None)).all()

    updated_count = 0

    for indicator in indicators:
        # Skip indicator 1.6.1 (needs dropdown UI for Option 1/2/3)
        if indicator.indicator_code == "1.6.1":
            print(f"  Skipping {indicator.indicator_code} (keeps dropdown UI)")
            continue

        # Check if form_schema has fields with option_group
        form_schema = indicator.form_schema
        if not form_schema or 'fields' not in form_schema:
            continue

        fields = form_schema.get('fields', [])
        has_option_group = any(
            f.get('option_group') for f in fields if isinstance(f, dict)
        )

        if not has_option_group:
            continue

        # Remove option_group from all fields
        modified = False
        for field in fields:
            if isinstance(field, dict) and 'option_group' in field:
                if field['option_group'] is not None:
                    print(f"  Removing option_group from {indicator.indicator_code}: {field.get('field_id')} = {field['option_group']}")
                    field['option_group'] = None
                    modified = True

        if modified:
            # Force SQLAlchemy to detect the change by using flag_modified
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(indicator, 'form_schema')
            updated_count += 1

    return updated_count


def main():
    print("🔄 Removing option_group from form_schema JSON...")

    db = SessionLocal()
    try:
        updated_count = remove_option_groups_from_form_schema(db)
        db.commit()

        print(f"\n✅ Update complete!")
        print(f"   Updated: {updated_count} indicators")

        # Verify the update
        print("\n📋 Verification (indicators with remaining option_group in form_schema):")
        indicators = db.query(Indicator).filter(Indicator.form_schema.isnot(None)).all()
        remaining_count = 0
        for indicator in indicators:
            form_schema = indicator.form_schema
            if form_schema and 'fields' in form_schema:
                fields_with_og = [
                    f.get('field_id') for f in form_schema['fields']
                    if isinstance(f, dict) and f.get('option_group')
                ]
                if fields_with_og:
                    print(f"   - {indicator.indicator_code}: {len(fields_with_og)} fields with option_group")
                    remaining_count += len(fields_with_og)

        if remaining_count == 0:
            print("   None (all option_group values removed except from excluded indicators)")

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
