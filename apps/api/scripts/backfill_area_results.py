#!/usr/bin/env python3
"""
Backfill area_results for assessments that are missing this data.

This script fixes completed assessments that don't have area_results populated,
which can happen if they were migrated or manually marked as completed.

Usage:
    cd apps/api
    python scripts/backfill_area_results.py

    # Dry run (preview only):
    python scripts/backfill_area_results.py --dry-run
"""

import argparse
import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.database import SessionLocal
from sqlalchemy.orm import Session

from app.db.models.assessment import Assessment, AssessmentStatus
from app.services.intelligence_service import intelligence_service


def backfill_area_results(dry_run: bool = False) -> None:
    """Backfill area_results for assessments missing this data."""
    db: Session = SessionLocal()

    try:
        # Find assessments that are completed but missing area_results
        assessments = (
            db.query(Assessment)
            .filter(
                Assessment.status.in_(
                    [
                        AssessmentStatus.COMPLETED,
                        AssessmentStatus.AWAITING_MLGOO_APPROVAL,
                        AssessmentStatus.AWAITING_FINAL_VALIDATION,
                    ]
                ),
                Assessment.area_results.is_(None),
            )
            .all()
        )

        print(f"Found {len(assessments)} assessments missing area_results")

        for assessment in assessments:
            barangay_name = assessment.barangay.name if assessment.barangay else "Unknown"
            print(f"\nProcessing: Assessment #{assessment.id} - {barangay_name}")
            print(f"  Status: {assessment.status.value}")
            print(f"  Current area_results: {assessment.area_results}")

            if dry_run:
                print("  [DRY RUN] Would run classification...")
                continue

            try:
                result = intelligence_service.classify_assessment(db, assessment.id)
                print(f"  ✓ Classification complete: {result.get('compliance_status', 'N/A')}")
                print(f"  ✓ Area results: {result.get('area_results', {})}")
            except Exception as e:
                print(f"  ✗ Error: {e}")
                db.rollback()
                continue

        if not dry_run:
            db.commit()
            print(f"\n✓ Successfully backfilled {len(assessments)} assessments")
        else:
            print(f"\n[DRY RUN] Would have backfilled {len(assessments)} assessments")

    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill area_results for assessments")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without making them",
    )
    args = parser.parse_args()

    backfill_area_results(dry_run=args.dry_run)
