#!/usr/bin/env python3
"""
Clean up test/dummy data from the database.

This script removes:
- Test governance areas (with random number names)
- Duplicate/test indicators (Ind A, Test Indicator, etc.)
- Keeps only production indicators

Usage:
    python cleanup_test_data.py --dry-run   # Preview what will be deleted
    python cleanup_test_data.py --confirm   # Actually delete the data
"""

import sys
from app.db.base import SessionLocal
from app.db.models.governance_area import Indicator, GovernanceArea
from sqlalchemy import text


def cleanup_test_governance_areas(db, dry_run=True):
    """Remove test governance areas with random number names."""
    test_areas = db.query(GovernanceArea).filter(
        GovernanceArea.name.like('%Test Governance Area%')
    ).all()

    print(f"\n{'[DRY RUN] ' if dry_run else ''}🗑️  Test Governance Areas to delete: {len(test_areas)}")

    for area in test_areas:
        # Count indicators in this area
        indicators = db.query(Indicator).filter(
            Indicator.governance_area_id == area.id
        ).all()

        print(f"   - {area.name} (ID: {area.id}) - {len(indicators)} indicator(s)")

        if not dry_run:
            # Delete related records first to avoid foreign key constraints
            for indicator in indicators:
                # Delete from all related tables
                db.execute(
                    text("DELETE FROM indicators_history WHERE indicator_id = :indicator_id"),
                    {"indicator_id": indicator.id}
                )
                db.execute(
                    text("DELETE FROM assessment_responses WHERE indicator_id = :indicator_id"),
                    {"indicator_id": indicator.id}
                )
                # Delete the indicator
                db.delete(indicator)

            # Delete the governance area
            db.delete(area)

    return len(test_areas)


def cleanup_duplicate_indicators(db, dry_run=True):
    """Remove duplicate/test indicators."""
    # Patterns to identify test indicators
    test_patterns = [
        'Ind A',
        'Test Indicator',
        'TEST',
        'test',
        'Asnari'
    ]

    # Keep these specific indicators (production + our test indicator)
    keep_ids = [278]  # MOV Upload Test Indicator

    indicators_to_delete = []

    for pattern in test_patterns:
        indicators = db.query(Indicator).filter(
            Indicator.name.like(f'%{pattern}%')
        ).all()

        for ind in indicators:
            if ind.id not in keep_ids and ind not in indicators_to_delete:
                indicators_to_delete.append(ind)

    print(f"\n{'[DRY RUN] ' if dry_run else ''}🗑️  Duplicate/Test Indicators to delete: {len(indicators_to_delete)}")

    for ind in indicators_to_delete:
        gov_area = db.query(GovernanceArea).filter(
            GovernanceArea.id == ind.governance_area_id
        ).first()
        gov_area_name = gov_area.name if gov_area else "Unknown"

        print(f"   - ID {ind.id}: {ind.name} (in {gov_area_name})")

        if not dry_run:
            # Delete from all related tables
            db.execute(
                text("DELETE FROM indicators_history WHERE indicator_id = :indicator_id"),
                {"indicator_id": ind.id}
            )
            db.execute(
                text("DELETE FROM assessment_responses WHERE indicator_id = :indicator_id"),
                {"indicator_id": ind.id}
            )
            # Delete the indicator
            db.delete(ind)

    return len(indicators_to_delete)


def cleanup_empty_governance_areas(db, dry_run=True):
    """Remove governance areas with no indicators."""
    all_areas = db.query(GovernanceArea).all()
    empty_areas = []

    for area in all_areas:
        indicator_count = db.query(Indicator).filter(
            Indicator.governance_area_id == area.id
        ).count()

        if indicator_count == 0:
            empty_areas.append(area)

    print(f"\n{'[DRY RUN] ' if dry_run else ''}🗑️  Empty Governance Areas to delete: {len(empty_areas)}")

    for area in empty_areas:
        print(f"   - {area.name} (ID: {area.id})")

        if not dry_run:
            db.delete(area)

    return len(empty_areas)


def show_what_will_remain(db):
    """Show what will remain after cleanup."""
    print("\n" + "=" * 80)
    print("✅ DATA THAT WILL REMAIN")
    print("=" * 80)

    # Get all governance areas
    areas = db.query(GovernanceArea).all()

    total_indicators = 0

    for area in areas:
        # Skip test areas
        if 'Test Governance Area' in area.name:
            continue

        indicators = db.query(Indicator).filter(
            Indicator.governance_area_id == area.id
        ).all()

        # Filter out test indicators
        real_indicators = [
            ind for ind in indicators
            if not any(pattern in ind.name for pattern in ['Ind A', 'Test Indicator', 'TEST', 'test', 'Asnari'])
            or ind.id == 278  # Keep our test indicator
        ]

        if real_indicators:
            print(f"\n📁 {area.name}")
            print(f"   Indicators: {len(real_indicators)}")

            for ind in real_indicators:
                # Check if has file upload
                has_upload = False
                if ind.form_schema:
                    sections = ind.form_schema.get('sections', [])
                    for section in sections:
                        for field in section.get('fields', []):
                            if field.get('field_type') == 'file_upload':
                                has_upload = True
                                break

                upload_marker = " 📤" if has_upload else ""
                print(f"      • ID {ind.id}: {ind.name}{upload_marker}")

            total_indicators += len(real_indicators)

    print(f"\n📊 Total indicators remaining: {total_indicators}")


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python cleanup_test_data.py --dry-run   # Preview what will be deleted")
        print("  python cleanup_test_data.py --confirm   # Actually delete the data")
        sys.exit(1)

    mode = sys.argv[1]
    dry_run = mode != '--confirm'

    if dry_run:
        print("=" * 80)
        print("🔍 DRY RUN MODE - No data will be deleted")
        print("=" * 80)
    else:
        print("=" * 80)
        print("⚠️  DELETION MODE - Data will be permanently deleted!")
        print("=" * 80)
        print("\nAre you sure you want to continue? Type 'yes' to confirm: ", end='')
        confirmation = input().strip().lower()
        if confirmation != 'yes':
            print("❌ Aborted")
            sys.exit(0)

    db = SessionLocal()

    try:
        # Step 1: Clean up test governance areas
        test_areas_count = cleanup_test_governance_areas(db, dry_run)

        # Step 2: Clean up duplicate/test indicators
        test_indicators_count = cleanup_duplicate_indicators(db, dry_run)

        # Step 3: Clean up empty governance areas
        empty_areas_count = cleanup_empty_governance_areas(db, dry_run)

        # Show summary
        print("\n" + "=" * 80)
        print(f"{'[DRY RUN] ' if dry_run else ''}📊 CLEANUP SUMMARY")
        print("=" * 80)
        print(f"Test Governance Areas: {test_areas_count}")
        print(f"Duplicate/Test Indicators: {test_indicators_count}")
        print(f"Empty Governance Areas: {empty_areas_count}")
        print(f"Total items: {test_areas_count + test_indicators_count + empty_areas_count}")

        if not dry_run:
            # Commit the changes
            db.commit()
            print("\n✅ Data successfully deleted!")
        else:
            print("\n💡 Run with --confirm to actually delete this data")

        # Show what will remain
        show_what_will_remain(db)

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
