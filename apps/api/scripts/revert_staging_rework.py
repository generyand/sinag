#!/usr/bin/env python3
"""
Revert Rework Progress Script for STAGING

This script reverts all rework progress for ALL BLGUs on ALL governance areas.

What it does:
1. Reverts area status from "rework" or "submitted" (after rework) back to "submitted"/"in_review"
2. Removes resubmitted files uploaded after rework request (soft delete)
3. Resets rework count back to 0 for each area
4. Preserves assessor notes (FeedbackComment records)
5. Resets global rework flags if all areas reverted

⚠️ WARNING: Only run in STAGING environment!
"""

import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.db.base import SessionLocal
from app.db.enums import AssessmentStatus
from app.db.models.assessment import Assessment, MOVFile


def get_rework_timestamp(area_data: dict) -> datetime | None:
    """Extract rework_requested_at timestamp from area data."""
    rework_timestamp_str = area_data.get("rework_requested_at")
    if not rework_timestamp_str:
        return None

    try:
        # Parse ISO format timestamp
        if isinstance(rework_timestamp_str, str):
            # Handle both with and without timezone
            if rework_timestamp_str.endswith("Z"):
                rework_timestamp_str = rework_timestamp_str[:-1] + "+00:00"
            return datetime.fromisoformat(rework_timestamp_str.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None

    return None


def revert_assessment_rework(db: Session, assessment: Assessment) -> dict:
    """
    Revert rework progress for a single assessment.

    Returns:
        dict with statistics about what was reverted
    """
    stats = {
        "assessment_id": assessment.id,
        "areas_reverted": 0,
        "files_deleted": 0,
        "areas_affected": [],
        "global_rework_reset": False,
    }

    if not assessment.area_submission_status:
        return stats

    areas_in_rework = []

    # Process each governance area (1-6)
    for area_id in range(1, 7):
        area_key = str(area_id)
        area_data = assessment.area_submission_status.get(area_key, {})

        if not isinstance(area_data, dict):
            continue

        area_status = area_data.get("status", "draft")

        # Check if this area is in rework or was resubmitted after rework
        is_in_rework = area_status == "rework"
        is_resubmitted = area_status in ("submitted", "in_review") and area_data.get(
            "resubmitted_after_rework", False
        )
        has_rework_used = area_data.get("rework_used", False)

        if not (is_in_rework or is_resubmitted or has_rework_used):
            # This area doesn't need reversion
            continue

        areas_in_rework.append(area_id)
        stats["areas_affected"].append(area_id)

        # Get rework timestamp to identify files uploaded after rework
        rework_timestamp = get_rework_timestamp(area_data)

        # Revert area status
        # If it was "rework", change to "submitted" (as if assessor never sent for rework)
        # If it was "submitted" after rework, change to "submitted" (remove resubmission flags)
        if area_status == "rework":
            area_data["status"] = "submitted"
        elif is_resubmitted:
            # Remove resubmission flags but keep status as "submitted" or "in_review"
            area_data.pop("resubmitted_after_rework", None)
            area_data.pop("resubmitted_at", None)
            area_data.pop("is_resubmission", None)

        # Reset rework flags
        area_data["rework_used"] = False
        area_data.pop("rework_requested_at", None)
        area_data.pop("rework_comments", None)
        area_data.pop("assessor_id", None)  # Remove assessor who requested rework

        # Update the area data in assessment
        assessment.area_submission_status[area_key] = area_data
        flag_modified(assessment, "area_submission_status")

        stats["areas_reverted"] += 1

        # Delete files uploaded after rework request (soft delete)
        if rework_timestamp:
            # Get all MOV files for this assessment
            mov_files = (
                db.query(MOVFile)
                .filter(
                    MOVFile.assessment_id == assessment.id,
                    MOVFile.deleted_at.is_(None),  # Only non-deleted files
                )
                .all()
            )

            for mov_file in mov_files:
                # Check if file was uploaded after rework request
                if mov_file.uploaded_at and mov_file.uploaded_at >= rework_timestamp:
                    # Soft delete the file
                    mov_file.deleted_at = datetime.utcnow()
                    stats["files_deleted"] += 1

    # Reset global rework flags if all areas were reverted
    if stats["areas_reverted"] > 0:
        # Check if assessment status needs to be updated
        if assessment.status == AssessmentStatus.REWORK:
            # Check if any area is still in rework
            has_any_rework = any(
                isinstance(data, dict) and data.get("status") == "rework"
                for data in (assessment.area_submission_status or {}).values()
            )

            if not has_any_rework:
                # All rework areas have been reverted
                # Determine correct status based on per-area workflow:
                # - DRAFT if not all 6 areas are submitted
                # - SUBMITTED if all 6 areas are submitted
                all_areas_submitted = True
                for check_area_id in range(1, 7):
                    check_area_key = str(check_area_id)
                    check_area_data = assessment.area_submission_status.get(check_area_key, {})
                    check_area_status = (
                        check_area_data.get("status", "draft")
                        if isinstance(check_area_data, dict)
                        else "draft"
                    )
                    if check_area_status == "draft":
                        all_areas_submitted = False
                        break

                if all_areas_submitted:
                    assessment.status = AssessmentStatus.SUBMITTED
                else:
                    # Per-area workflow: Keep as DRAFT until all areas submitted
                    assessment.status = AssessmentStatus.DRAFT

                assessment.rework_requested_at = None
                assessment.rework_requested_by = None
                assessment.rework_comments = None

        # Reset global rework count and flags
        assessment.rework_count = 0
        assessment.rework_round_used = False
        assessment.rework_submitted_at = None

        stats["global_rework_reset"] = True

    return stats


def main():
    """Main function to revert all rework progress."""
    print("=" * 80)
    print("STAGING REWORK REVERT SCRIPT")
    print("=" * 80)
    print()
    print("⚠️  WARNING: This script will revert rework progress for ALL assessments!")
    print("⚠️  Only run this in STAGING environment!")
    print()

    # Ask for confirmation
    response = input("Are you sure you want to proceed? (yes/no): ").strip().lower()
    if response != "yes":
        print("Aborted.")
        return

    print()
    print("Connecting to database...")
    db: Session = SessionLocal()

    try:
        # Get all assessments that have rework progress
        print("Finding assessments with rework progress...")

        assessments_with_rework = []

        # Query all assessments
        all_assessments = db.query(Assessment).all()

        for assessment in all_assessments:
            if not assessment.area_submission_status:
                continue

            # Check if any area has rework
            has_rework = False
            for area_id in range(1, 7):
                area_key = str(area_id)
                area_data = assessment.area_submission_status.get(area_key, {})
                if isinstance(area_data, dict):
                    area_status = area_data.get("status", "draft")
                    is_resubmitted = area_data.get("resubmitted_after_rework", False)
                    has_rework_used = area_data.get("rework_used", False)

                    if area_status == "rework" or is_resubmitted or has_rework_used:
                        has_rework = True
                        break

            if has_rework:
                assessments_with_rework.append(assessment)

        print(f"Found {len(assessments_with_rework)} assessment(s) with rework progress.")
        print()

        if len(assessments_with_rework) == 0:
            print("No assessments with rework progress found. Nothing to revert.")
            return

        # Show summary
        print("Summary of assessments to revert:")
        for assessment in assessments_with_rework:
            barangay_name = "Unknown"
            if assessment.blgu_user and assessment.blgu_user.barangay:
                barangay_name = assessment.blgu_user.barangay.name
            print(f"  - Assessment {assessment.id} ({barangay_name})")
        print()

        # Confirm again
        response = input("Proceed with revert? (yes/no): ").strip().lower()
        if response != "yes":
            print("Aborted.")
            return

        print()
        print("Reverting rework progress...")
        print()

        # Revert each assessment
        total_stats = {
            "assessments_processed": 0,
            "total_areas_reverted": 0,
            "total_files_deleted": 0,
        }

        for assessment in assessments_with_rework:
            stats = revert_assessment_rework(db, assessment)

            total_stats["assessments_processed"] += 1
            total_stats["total_areas_reverted"] += stats["areas_reverted"]
            total_stats["total_files_deleted"] += stats["files_deleted"]

            barangay_name = "Unknown"
            if assessment.blgu_user and assessment.blgu_user.barangay:
                barangay_name = assessment.blgu_user.barangay.name

            print(f"✅ Assessment {assessment.id} ({barangay_name}):")
            print(
                f"   - Areas reverted: {stats['areas_reverted']} (Areas: {', '.join(map(str, stats['areas_affected']))})"
            )
            print(f"   - Files deleted: {stats['files_deleted']}")
            if stats["global_rework_reset"]:
                print("   - Global rework flags reset")
            print()

        # Commit all changes
        print("Committing changes to database...")
        db.commit()
        print("✅ Changes committed successfully!")
        print()

        # Print final summary
        print("=" * 80)
        print("REVERT COMPLETE")
        print("=" * 80)
        print(f"Assessments processed: {total_stats['assessments_processed']}")
        print(f"Total areas reverted: {total_stats['total_areas_reverted']}")
        print(f"Total files deleted: {total_stats['total_files_deleted']}")
        print()
        print("✅ All rework progress has been reverted.")
        print("✅ Assessor notes have been preserved.")
        print("✅ Files uploaded after rework have been soft-deleted.")
        print()
        print("Next steps:")
        print("1. Verify the changes in STAGING")
        print("2. Test that per-area rework works correctly")
        print("3. Deploy the new implementation")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
