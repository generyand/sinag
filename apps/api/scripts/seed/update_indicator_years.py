"""
Update existing indicators to use year placeholders instead of hardcoded years.
This script updates in-place without deleting/recreating indicators.

Run this after updating indicator definition files with year placeholders.
"""

import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session

from app.db.base import SessionLocal
from app.db.models.governance_area import ChecklistItem, Indicator
from app.indicators.base import Indicator as IndicatorDef
from app.indicators.base import SubIndicator
from app.indicators.definitions import ALL_INDICATORS


def find_indicator_def(
    indicator_code: str, indicators: list[IndicatorDef | SubIndicator]
) -> IndicatorDef | SubIndicator | None:
    """Find indicator definition by code in the nested structure"""
    for ind_def in indicators:
        if ind_def.code == indicator_code:
            return ind_def
        # Check children recursively
        if hasattr(ind_def, 'children') and ind_def.children:
            result = find_indicator_def(indicator_code, ind_def.children)
            if result:
                return result
    return None


def update_indicator_from_def(
    db_indicator: Indicator,
    indicator_def: IndicatorDef | SubIndicator,
    db: Session,
) -> bool:
    """Update a database indicator from its Python definition"""
    changed = False

    # Update name if different
    if db_indicator.name != indicator_def.name:
        print(f"    Updating name: {db_indicator.name[:40]}... -> {indicator_def.name[:40]}...")
        db_indicator.name = indicator_def.name
        changed = True

    # Update description if different (for root indicators)
    if hasattr(indicator_def, 'description') and indicator_def.description:
        if db_indicator.description != indicator_def.description:
            db_indicator.description = indicator_def.description
            changed = True

    # Update checklist items
    if hasattr(indicator_def, 'checklist_items') and indicator_def.checklist_items:
        for item_def in indicator_def.checklist_items:
            # Find the matching checklist item by item_id
            db_item = db.query(ChecklistItem).filter(
                ChecklistItem.indicator_id == db_indicator.id,
                ChecklistItem.item_id == item_def.id
            ).first()

            if db_item:
                # Update label if different
                if db_item.label != item_def.label:
                    print(f"      Updating checklist item {item_def.id}: {item_def.label[:30]}...")
                    db_item.label = item_def.label
                    changed = True

                # Update mov_description if different
                if db_item.mov_description != item_def.mov_description:
                    db_item.mov_description = item_def.mov_description
                    changed = True

                # Update option_group if different
                item_def_option_group = getattr(item_def, 'option_group', None)
                if db_item.option_group != item_def_option_group:
                    print(f"      Updating option_group for {item_def.id}: {db_item.option_group} -> {item_def_option_group}")
                    db_item.option_group = item_def_option_group
                    changed = True

                # Update display_order if different
                item_def_display_order = getattr(item_def, 'display_order', None)
                if item_def_display_order is not None and db_item.display_order != item_def_display_order:
                    print(f"      Updating display_order for {item_def.id}: {db_item.display_order} -> {item_def_display_order}")
                    db_item.display_order = item_def_display_order
                    changed = True

    return changed


def main():
    """Update all indicators to use year placeholders"""
    db = SessionLocal()
    try:
        print("📅 Updating indicator year placeholders...")

        # Get all indicators from database
        db_indicators = db.query(Indicator).all()
        print(f"   Found {len(db_indicators)} indicators in database")

        updated_count = 0
        not_found = []

        for db_indicator in db_indicators:
            # Find the matching Python definition
            indicator_def = find_indicator_def(db_indicator.indicator_code, ALL_INDICATORS)

            if indicator_def:
                if update_indicator_from_def(db_indicator, indicator_def, db):
                    updated_count += 1
            else:
                not_found.append(db_indicator.indicator_code)

        # Commit all changes
        db.commit()

        print("\n✅ Update complete!")
        print(f"   Updated: {updated_count} indicators")
        if not_found:
            print(f"   Not found in definitions (skipped): {len(not_found)}")
            for code in not_found[:5]:  # Show first 5
                print(f"     - {code}")
            if len(not_found) > 5:
                print(f"     ... and {len(not_found) - 5} more")

        # Verify some updates
        print("\n📋 Sample verification (first 3 indicators with year placeholders):")
        sample = db.query(Indicator).filter(
            Indicator.name.contains("{")
        ).limit(3).all()

        if sample:
            for ind in sample:
                print(f"   - {ind.indicator_code}: {ind.name[:60]}...")
        else:
            print("   No indicators with placeholders found in database.")
            print("   (Placeholders may not have been in the Python definitions)")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
