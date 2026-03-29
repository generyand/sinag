#!/usr/bin/env python3
"""
Preview or backfill indicator snapshots for legacy assessments.

Default mode is preview-only:
- prints the target assessment
- prints the year-based indicator set that would be snapshotted
- does not write any data

Use `--apply` to create snapshots for the assessment when none exist.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import or_

from app.db.base import SessionLocal
from app.db.models.assessment import Assessment
from app.db.models.barangay import Barangay
from app.db.models.governance_area import Indicator
from app.db.models.system import AssessmentIndicatorSnapshot
from app.db.models.user import User
from app.services.year_config_service import indicator_snapshot_service


def build_snapshot_backfill_preview(
    assessment: dict[str, Any],
    indicator_ids: list[int],
    indicator_codes: list[str],
) -> dict[str, Any]:
    """Build a preview payload for a single assessment snapshot backfill."""
    snapshot_count = int(assessment.get("snapshot_count") or 0)
    expected_indicator_count = len(indicator_ids)
    return {
        "assessment_id": assessment["assessment_id"],
        "barangay_name": assessment.get("barangay_name"),
        "assessment_year": assessment["assessment_year"],
        "status": assessment["status"],
        "snapshot_count": snapshot_count,
        "expected_indicator_count": expected_indicator_count,
        "indicator_ids": indicator_ids,
        "indicator_codes": indicator_codes,
        "needs_backfill": snapshot_count != expected_indicator_count,
    }


def _load_assessment(db, assessment_id: int) -> dict[str, Any] | None:
    row = (
        db.query(
            Assessment.id.label("assessment_id"),
            Assessment.assessment_year,
            Assessment.status,
            Barangay.name.label("barangay_name"),
        )
        .join(User, User.id == Assessment.blgu_user_id)
        .outerjoin(Barangay, Barangay.id == User.barangay_id)
        .filter(Assessment.id == assessment_id)
        .first()
    )
    if not row:
        return None

    snapshot_count = (
        db.query(AssessmentIndicatorSnapshot)
        .filter(AssessmentIndicatorSnapshot.assessment_id == assessment_id)
        .count()
    )

    return {
        "assessment_id": row.assessment_id,
        "assessment_year": row.assessment_year,
        "status": row.status.value if hasattr(row.status, "value") else str(row.status),
        "barangay_name": row.barangay_name,
        "snapshot_count": snapshot_count,
    }


def _get_year_based_indicator_set(db, assessment_year: int) -> tuple[list[int], list[str]]:
    indicators = (
        db.query(Indicator)
        .filter(
            Indicator.parent_id.isnot(None),
            Indicator.is_active == True,
            or_(
                Indicator.effective_from_year.is_(None),
                Indicator.effective_from_year <= assessment_year,
            ),
            or_(
                Indicator.effective_to_year.is_(None),
                Indicator.effective_to_year >= assessment_year,
            ),
        )
        .order_by(Indicator.sort_order, Indicator.indicator_code, Indicator.id)
        .all()
    )
    return [indicator.id for indicator in indicators], [
        indicator.indicator_code for indicator in indicators
    ]


def preview_or_backfill(assessment_id: int, apply: bool) -> int:
    db = SessionLocal()
    try:
        assessment = _load_assessment(db, assessment_id)
        if not assessment:
            print(f"Assessment {assessment_id} not found.")
            return 1

        indicator_ids, indicator_codes = _get_year_based_indicator_set(
            db, assessment["assessment_year"]
        )
        preview = build_snapshot_backfill_preview(
            assessment=assessment,
            indicator_ids=indicator_ids,
            indicator_codes=indicator_codes,
        )

        print(json.dumps(preview, indent=2, sort_keys=True))

        if not preview["needs_backfill"]:
            print("\nAssessment already has matching snapshot coverage. No action needed.")
            return 0

        if not apply:
            print("\n[DRY RUN] No changes written. Re-run with --apply to persist.")
            return 0

        indicator_snapshot_service.create_snapshot_for_assessment(
            db=db,
            assessment_id=assessment_id,
            indicator_ids=indicator_ids,
            assessment_year=assessment["assessment_year"],
        )
        db.commit()
        print("\nSnapshot backfill applied successfully.")
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Preview or backfill indicator snapshots for legacy assessments."
    )
    parser.add_argument("--assessment-id", type=int, required=True, help="Target assessment id.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist snapshots instead of previewing the backfill.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    return preview_or_backfill(assessment_id=args.assessment_id, apply=args.apply)


if __name__ == "__main__":
    raise SystemExit(main())
