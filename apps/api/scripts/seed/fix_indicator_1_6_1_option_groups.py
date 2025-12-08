"""
Fix option_group labels for indicator 1.6.1 in the form_schema.

The option groups were incorrectly labeled as "option_2", "option_5", "option_7"
instead of "Option 1", "Option 2", "Option 3".

Run: python -m scripts.seed.fix_indicator_1_6_1_option_groups
"""

import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.db.base import SessionLocal
from app.db.models.governance_area import Indicator


def fix_indicator_1_6_1_option_groups(db: Session) -> bool:
    """
    Fix the option_group labels in indicator 1.6.1's form_schema.

    Maps:
    - "option_2" -> "Option 1"
    - "option_5" -> "Option 2"
    - "option_7" -> "Option 3"
    """
    # Find indicator 1.6.1
    indicator = db.query(Indicator).filter(Indicator.indicator_code == "1.6.1").first()

    if not indicator:
        print("ERROR: Indicator 1.6.1 not found!")
        return False

    if not indicator.form_schema:
        print("ERROR: Indicator 1.6.1 has no form_schema!")
        return False

    print(f"Found indicator 1.6.1: {indicator.name}")
    print(f"Current form_schema has {len(indicator.form_schema.get('fields', []))} fields")

    # Mapping from wrong to correct option group labels
    option_group_mapping = {
        "option_2": "Option 1",
        "option_5": "Option 2",
        "option_7": "Option 3",
    }

    # Update fields in form_schema
    fields = indicator.form_schema.get("fields", [])
    updated_count = 0

    for field in fields:
        old_option_group = field.get("option_group")
        if old_option_group in option_group_mapping:
            new_option_group = option_group_mapping[old_option_group]
            print(
                f"  Updating field '{field.get('field_id', 'unknown')}': "
                f"'{old_option_group}' -> '{new_option_group}'"
            )
            field["option_group"] = new_option_group
            updated_count += 1

    if updated_count == 0:
        print("No fields needed updating (option groups may already be correct)")
        return True

    # Force SQLAlchemy to detect the change
    flag_modified(indicator, "form_schema")

    # Commit the changes
    db.commit()

    print(f"\nUpdated {updated_count} fields in indicator 1.6.1 form_schema")
    return True


def main():
    """Main entry point."""
    print("=" * 60)
    print("Fixing option_group labels for indicator 1.6.1")
    print("=" * 60)

    db = SessionLocal()
    try:
        success = fix_indicator_1_6_1_option_groups(db)
        if success:
            print("\n✅ Fix completed successfully!")
        else:
            print("\n❌ Fix failed!")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
