#!/usr/bin/env python3
"""
Manual Test Script: Trigger Rework Summary Generation

This script allows you to manually trigger the AI-powered rework summary
generation for a specific assessment ID. Useful for testing without going
through the full workflow.

Usage:
    python scripts/test_rework_summary_generation.py <assessment_id>

Example:
    python scripts/test_rework_summary_generation.py 1
"""

import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.celery_app import celery_app
from app.workers.intelligence_worker import generate_rework_summary_task
from app.db.base import SessionLocal
from app.db.models.assessment import Assessment
from app.db.enums import AssessmentStatus


def check_assessment(assessment_id: int):
    """Check if assessment exists and is in valid state for rework summary."""
    db = SessionLocal()
    try:
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            print(f"❌ Error: Assessment {assessment_id} not found")
            return False

        print(f"✓ Assessment {assessment_id} found")
        print(f"  Status: {assessment.status.value}")
        print(f"  BLGU User ID: {assessment.blgu_user_id}")
        print(f"  Rework Count: {assessment.rework_count}")
        print(f"  Has Existing Summary: {assessment.rework_summary is not None}")

        if assessment.status != AssessmentStatus.REWORK:
            print(f"⚠️  Warning: Assessment status is not REWORK (current: {assessment.status.value})")
            print("   The task will still run but may not be appropriate")

        # Check for feedback
        responses_with_rework = sum(1 for r in assessment.responses if r.requires_rework)
        print(f"  Responses requiring rework: {responses_with_rework}")

        if responses_with_rework == 0:
            print("⚠️  Warning: No responses marked for rework")
            print("   The summary generation may fail or be empty")

        return True

    finally:
        db.close()


def trigger_generation(assessment_id: int, force: bool = False):
    """Trigger rework summary generation for the specified assessment."""
    print(f"\n🔄 Triggering rework summary generation for assessment {assessment_id}...")

    try:
        # Queue the Celery task
        result = generate_rework_summary_task.delay(assessment_id)

        print(f"✓ Task queued successfully!")
        print(f"  Task ID: {result.id}")
        print(f"  Task Name: intelligence.generate_rework_summary_task")
        print(f"\n📊 Monitor progress in Celery worker logs")
        print(f"   Expected completion: 5-15 seconds")

        # Wait for result (optional)
        print(f"\n⏳ Waiting for task to complete (timeout: 30s)...")
        try:
            task_result = result.get(timeout=30)

            if task_result.get("success"):
                print(f"✅ Success! Rework summary generated")
                if task_result.get("skipped"):
                    print(f"   (Skipped: {task_result.get('message')})")
                else:
                    print(f"   Summary has {len(task_result['rework_summary']['indicator_summaries'])} indicator(s)")
                    print(f"   Overall summary: {task_result['rework_summary']['overall_summary'][:100]}...")
            else:
                print(f"❌ Failed: {task_result.get('error', 'Unknown error')}")

        except Exception as e:
            print(f"⏰ Task is still running in background (timeout reached)")
            print(f"   Check Celery logs or database after a few moments")

    except Exception as e:
        print(f"❌ Error triggering task: {str(e)}")
        return False

    return True


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/test_rework_summary_generation.py <assessment_id>")
        print("\nExample:")
        print("  python scripts/test_rework_summary_generation.py 1")
        sys.exit(1)

    try:
        assessment_id = int(sys.argv[1])
    except ValueError:
        print(f"❌ Error: Invalid assessment ID '{sys.argv[1]}' (must be an integer)")
        sys.exit(1)

    force = "--force" in sys.argv

    print("=" * 60)
    print("🧪 Rework Summary Generation Test")
    print("=" * 60)
    print()

    # Check assessment
    if not check_assessment(assessment_id):
        print("\n❌ Assessment check failed. Aborting.")
        sys.exit(1)

    # Trigger generation
    if trigger_generation(assessment_id, force):
        print("\n" + "=" * 60)
        print("✅ Task triggered successfully!")
        print("=" * 60)
        print("\n📋 Next steps:")
        print("1. Check Celery worker logs for progress")
        print("2. Verify in database:")
        print(f"   SELECT rework_summary FROM assessments WHERE id = {assessment_id};")
        print("3. Test API endpoint:")
        print(f"   curl http://localhost:8000/api/v1/assessments/{assessment_id}/rework-summary")
        print("4. Check frontend:")
        print(f"   http://localhost:3000/blgu/rework-summary?assessment={assessment_id}")
    else:
        print("\n❌ Task trigger failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
