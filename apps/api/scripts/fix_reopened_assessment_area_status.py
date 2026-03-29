#!/usr/bin/env python3
"""
Repair per-area submission state for assessments reopened by MLGOO.

This script is intentionally preview-first:
- default mode prints what would change
- `--apply` persists the repair

The repair only resets per-area submission workflow metadata:
- `area_submission_status` -> draft for areas 1..6
- `area_assessor_approved` -> false for areas 1..6

Assessment answers, MOV files, and reopen metadata are left untouched.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.base import SessionLocal
from app.db.enums import AssessmentStatus
from app.db.models.assessment import TOTAL_GOVERNANCE_AREAS, Assessment
from app.db.models.barangay import Barangay
from app.db.models.user import User

PRESERVED_FLAGS = {"rework_used", "calibration_used"}


def build_reopened_area_reset(
    area_submission_status: dict[str, Any] | None,
    area_assessor_approved: dict[str, Any] | None,
) -> dict[str, Any]:
    """Build the normalized draft state for a reopened assessment."""
    current_status = area_submission_status or {}
    current_approved = area_assessor_approved or {}

    details: dict[str, list[Any]] = {
        "non_draft": [],
        "malformed": [],
        "missing": [],
        "preserved_flags": [],
    }
    next_status: dict[str, dict[str, Any]] = {}
    next_approved: dict[str, bool] = {}
    needs_repair = False

    for area_id in range(1, TOTAL_GOVERNANCE_AREAS + 1):
        key = str(area_id)
        preserved: dict[str, Any] = {}

        if key not in current_status:
            details["missing"].append(key)
            payload: dict[str, Any] = {}
            needs_repair = True
        else:
            raw_payload = current_status.get(key)
            if not isinstance(raw_payload, dict):
                details["malformed"].append(
                    {"area": key, "type": type(raw_payload).__name__, "value": raw_payload}
                )
                payload = {}
                needs_repair = True
            else:
                payload = raw_payload
                status = payload.get("status", "draft")
                if status != "draft":
                    details["non_draft"].append({"area": key, "status": status})
                    needs_repair = True

                preserved = {flag: payload[flag] for flag in PRESERVED_FLAGS if flag in payload}
                if preserved:
                    details["preserved_flags"].append({"area": key, **preserved})

        if current_approved.get(key) is True:
            needs_repair = True

        next_status[key] = {"status": "draft", **preserved}
        next_approved[key] = False

    if current_status != next_status or current_approved != next_approved:
        needs_repair = True

    return {
        "needs_repair": needs_repair,
        "area_submission_status": next_status,
        "area_assessor_approved": next_approved,
        "details": details,
    }


def fix_reopened_assessment_area_status(assessment_id: int, apply: bool) -> int:
    """Preview or repair one reopened assessment."""
    db = SessionLocal()

    try:
        assessment = (
            db.query(Assessment)
            .join(User, User.id == Assessment.blgu_user_id)
            .outerjoin(Barangay, Barangay.id == User.barangay_id)
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            print(f"Assessment {assessment_id} not found.")
            return 1

        print(f"Assessment ID: {assessment.id}")
        print(f"Status: {assessment.status.value}")
        print(
            f"Reopen From: {assessment.reopen_from_status.value if assessment.reopen_from_status else 'N/A'}"
        )
        print(
            f"Reopened At: {assessment.reopened_at.isoformat() if assessment.reopened_at else 'N/A'}"
        )
        print(f"BLGU User ID: {assessment.blgu_user_id}")

        if assessment.status != AssessmentStatus.REOPENED_BY_MLGOO:
            print("Assessment is not in REOPENED_BY_MLGOO status. No repair applied.")
            return 1

        repair = build_reopened_area_reset(
            assessment.area_submission_status,
            assessment.area_assessor_approved,
        )

        print("\nCurrent area_submission_status:")
        print(json.dumps(assessment.area_submission_status or {}, indent=2, sort_keys=True))
        print("\nCurrent area_assessor_approved:")
        print(json.dumps(assessment.area_assessor_approved or {}, indent=2, sort_keys=True))
        print("\nDetected anomalies:")
        print(json.dumps(repair["details"], indent=2, sort_keys=True))

        if not repair["needs_repair"]:
            print("\nAssessment is already clean. No changes needed.")
            return 0

        print("\nRepaired area_submission_status:")
        print(json.dumps(repair["area_submission_status"], indent=2, sort_keys=True))
        print("\nRepaired area_assessor_approved:")
        print(json.dumps(repair["area_assessor_approved"], indent=2, sort_keys=True))

        if not apply:
            print("\n[DRY RUN] No changes written. Re-run with --apply to persist.")
            return 0

        assessment.area_submission_status = repair["area_submission_status"]
        assessment.area_assessor_approved = repair["area_assessor_approved"]
        db.commit()

        print("\nRepair applied successfully.")
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Repair per-area submission state for MLGOO-reopened assessments."
    )
    parser.add_argument(
        "--assessment-id",
        type=int,
        help="Target a single reopened assessment.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist the repair instead of previewing it.",
    )
    args = parser.parse_args()

    if args.apply and args.assessment_id is None:
        parser.error("--assessment-id is required when using --apply")

    return args


def main() -> int:
    args = parse_args()
    if args.assessment_id is None:
        print("--assessment-id is required for this script.")
        return 1
    return fix_reopened_assessment_area_status(assessment_id=args.assessment_id, apply=args.apply)


if __name__ == "__main__":
    raise SystemExit(main())
