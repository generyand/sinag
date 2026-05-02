#!/usr/bin/env python3
"""
Recalculate stored SGLGB results from current indicator validation statuses.

By default this script is a dry run. Use --apply to update assessments.
Every apply run writes a JSON backup first. Use --restore BACKUP_FILE to restore
the computed fields from that backup.

Examples:
    cd apps/api
    uv run python scripts/recalculate_sglgb_results.py --barangay Labon
    uv run python scripts/recalculate_sglgb_results.py --barangay Labon --apply
    uv run python scripts/recalculate_sglgb_results.py --restore backups/sglgb-result-backups/...
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session, joinedload

# Add the app directory to the path when run as a script from apps/api.
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.base import SessionLocal
from app.db.enums import AssessmentStatus, ComplianceStatus
from app.db.models.assessment import Assessment
from app.db.models.barangay import Barangay
from app.db.models.bbi import BBIResult
from app.db.models.user import User
from app.services.bbi_service import bbi_service
from app.services.intelligence_service import intelligence_service

BACKUP_DIR = Path(__file__).resolve().parent.parent / "backups" / "sglgb-result-backups"
DEFAULT_STATUSES = [AssessmentStatus.COMPLETED, AssessmentStatus.AWAITING_MLGOO_APPROVAL]


def enum_value(value: Any) -> Any:
    return value.value if hasattr(value, "value") else value


def iso_or_none(value: Any) -> str | None:
    return value.isoformat() if value is not None else None


def status_from_backup(value: str | None) -> ComplianceStatus | None:
    return ComplianceStatus(value) if value else None


def build_bbi_backup(result: BBIResult) -> dict[str, Any]:
    return {
        "id": result.id,
        "barangay_id": result.barangay_id,
        "assessment_year": result.assessment_year,
        "assessment_id": result.assessment_id,
        "bbi_id": result.bbi_id,
        "indicator_id": result.indicator_id,
        "compliance_percentage": result.compliance_percentage,
        "compliance_rating": result.compliance_rating,
        "sub_indicators_passed": result.sub_indicators_passed,
        "sub_indicators_total": result.sub_indicators_total,
        "sub_indicator_results": result.sub_indicator_results,
        "calculated_at": iso_or_none(result.calculated_at),
    }


def build_assessment_backup(
    assessment: Assessment,
    barangay_name: str,
    bbi_results: list[BBIResult],
) -> dict[str, Any]:
    return {
        "assessment_id": assessment.id,
        "barangay_name": barangay_name,
        "assessment_year": assessment.assessment_year,
        "status": enum_value(assessment.status),
        "final_compliance_status": enum_value(assessment.final_compliance_status),
        "area_results": assessment.area_results,
        "updated_at": iso_or_none(assessment.updated_at),
        "bbi_results": [build_bbi_backup(result) for result in bbi_results],
    }


def build_recalculation_preview(
    assessment_id: int,
    barangay_name: str,
    old_final_status: str | None,
    old_area_results: dict[str, Any] | None,
    new_result: dict[str, Any],
) -> dict[str, Any]:
    new_final_status = new_result.get("final_compliance_status")
    new_area_results = new_result.get("area_results")
    final_status_changed = old_final_status != new_final_status
    area_results_changed = (old_area_results or {}) != (new_area_results or {})

    return {
        "assessment_id": assessment_id,
        "barangay_name": barangay_name,
        "old_final_compliance_status": old_final_status,
        "new_final_compliance_status": new_final_status,
        "final_status_changed": final_status_changed,
        "area_results_changed": area_results_changed,
        "changed": final_status_changed or area_results_changed,
        "old_area_results": old_area_results,
        "new_area_results": new_area_results,
    }


def barangay_name_for(assessment: Assessment) -> str:
    if assessment.blgu_user and assessment.blgu_user.barangay:
        return assessment.blgu_user.barangay.name
    return "Unknown"


def get_bbi_results(db: Session, assessment_id: int) -> list[BBIResult]:
    return (
        db.query(BBIResult)
        .filter(BBIResult.assessment_id == assessment_id)
        .order_by(BBIResult.id)
        .all()
    )


def query_assessments(args: argparse.Namespace, db: Session) -> list[Assessment]:
    query = db.query(Assessment).options(joinedload(Assessment.blgu_user).joinedload(User.barangay))

    if args.assessment_id:
        query = query.filter(Assessment.id.in_(args.assessment_id))
    else:
        statuses = [AssessmentStatus(status) for status in args.status]
        query = query.filter(Assessment.status.in_(statuses))

    if args.year:
        query = query.filter(Assessment.assessment_year == args.year)

    if args.barangay:
        query = query.join(Assessment.blgu_user).join(User.barangay)
        query = query.filter(Barangay.name.ilike(f"%{args.barangay}%"))

    return query.order_by(Assessment.id).all()


def calculate_result(db: Session, assessment: Assessment, persist: bool) -> dict[str, Any]:
    if persist:
        bbi_service.calculate_all_bbi_compliance(db, assessment)
        return intelligence_service.classify_assessment(db, assessment.id)

    savepoint = db.begin_nested()
    try:
        bbi_service.calculate_all_bbi_compliance(db, assessment)
        area_results = intelligence_service.get_all_area_results(db, assessment.id)
        compliance_status = intelligence_service.determine_compliance_status(db, assessment.id)
        return {
            "success": True,
            "assessment_id": assessment.id,
            "final_compliance_status": compliance_status.value,
            "area_results": area_results,
        }
    finally:
        savepoint.rollback()
        db.expire_all()


def write_backup(backup_entries: list[dict[str, Any]], backup_dir: Path = BACKUP_DIR) -> Path:
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    path = backup_dir / f"sglgb-results-backup-{timestamp}.json"
    payload = {
        "created_at": datetime.now(UTC).isoformat(),
        "kind": "sglgb_results_recalculation_backup",
        "assessments": backup_entries,
    }
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    return path


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)


def restore_from_backup(db: Session, backup_path: Path) -> int:
    payload = json.loads(backup_path.read_text(encoding="utf-8"))
    entries = payload.get("assessments", [])

    for entry in entries:
        assessment = db.query(Assessment).filter(Assessment.id == entry["assessment_id"]).first()
        if not assessment:
            print(f"Skipping missing assessment {entry['assessment_id']}")
            continue

        assessment.final_compliance_status = status_from_backup(entry["final_compliance_status"])
        assessment.area_results = entry["area_results"]
        if entry.get("updated_at"):
            assessment.updated_at = parse_datetime(entry["updated_at"])

        backup_bbi_ids = {result["id"] for result in entry.get("bbi_results", [])}
        current_results = get_bbi_results(db, assessment.id)
        for current in current_results:
            if current.id not in backup_bbi_ids:
                db.delete(current)

        for result_data in entry.get("bbi_results", []):
            result = db.query(BBIResult).filter(BBIResult.id == result_data["id"]).first()
            if not result:
                result = BBIResult(id=result_data["id"])
                db.add(result)

            result.barangay_id = result_data["barangay_id"]
            result.assessment_year = result_data["assessment_year"]
            result.assessment_id = result_data["assessment_id"]
            result.bbi_id = result_data["bbi_id"]
            result.indicator_id = result_data["indicator_id"]
            result.compliance_percentage = result_data["compliance_percentage"]
            result.compliance_rating = result_data["compliance_rating"]
            result.sub_indicators_passed = result_data["sub_indicators_passed"]
            result.sub_indicators_total = result_data["sub_indicators_total"]
            result.sub_indicator_results = result_data["sub_indicator_results"]
            if result_data.get("calculated_at"):
                result.calculated_at = parse_datetime(result_data["calculated_at"])

    db.commit()
    return len(entries)


def recalculate(args: argparse.Namespace, db: Session) -> int:
    assessments = query_assessments(args, db)
    if not assessments:
        print("No matching assessments found.")
        return 0

    print(f"Found {len(assessments)} matching assessment(s).")
    backup_entries = [
        build_assessment_backup(
            assessment=assessment,
            barangay_name=barangay_name_for(assessment),
            bbi_results=get_bbi_results(db, assessment.id),
        )
        for assessment in assessments
    ]

    backup_path = None
    if args.apply:
        backup_path = write_backup(backup_entries, Path(args.backup_dir))
        print(f"Backup written before changes: {backup_path}")

    changed_count = 0
    for assessment in assessments:
        old_final_status = enum_value(assessment.final_compliance_status)
        old_area_results = assessment.area_results
        barangay_name = barangay_name_for(assessment)
        result = calculate_result(db, assessment, persist=args.apply)
        preview = build_recalculation_preview(
            assessment_id=assessment.id,
            barangay_name=barangay_name,
            old_final_status=old_final_status,
            old_area_results=old_area_results,
            new_result=result,
        )

        if preview["changed"]:
            changed_count += 1

        marker = "CHANGED" if preview["changed"] else "unchanged"
        print(
            f"[{marker}] Assessment {assessment.id} ({barangay_name}): "
            f"{preview['old_final_compliance_status']} -> "
            f"{preview['new_final_compliance_status']}"
        )
        if args.verbose or preview["area_results_changed"]:
            print(f"  old areas: {preview['old_area_results']}")
            print(f"  new areas: {preview['new_area_results']}")

    if not args.apply:
        print("Dry run only. Re-run with --apply to write changes.")
    else:
        print(f"Updated {len(assessments)} assessment(s); {changed_count} changed verdict data.")
        print(
            f"Restore command: uv run python scripts/recalculate_sglgb_results.py --restore {backup_path}"
        )

    return changed_count


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Recalculate stored SGLGB final verdicts and area results."
    )
    parser.add_argument("--barangay", help="Filter by barangay name, e.g. Labon")
    parser.add_argument(
        "--assessment-id", type=int, action="append", help="Assessment ID to process"
    )
    parser.add_argument("--year", type=int, help="Assessment year to process")
    parser.add_argument(
        "--status",
        action="append",
        default=None,
        help="Assessment status to include. Can be passed multiple times.",
    )
    parser.add_argument("--apply", action="store_true", help="Write recalculated results")
    parser.add_argument(
        "--backup-dir",
        default=str(BACKUP_DIR),
        help="Directory where apply-mode backups are written",
    )
    parser.add_argument("--restore", type=Path, help="Restore computed fields from a backup JSON")
    parser.add_argument("--verbose", action="store_true", help="Print area result details")
    return parser


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.status is None:
        args.status = [status.value for status in DEFAULT_STATUSES]
    return args


def main() -> None:
    args = parse_args()

    db: Session = SessionLocal()
    try:
        if args.restore:
            if args.apply:
                raise SystemExit("--restore cannot be combined with --apply")
            restored = restore_from_backup(db, args.restore)
            print(f"Restored {restored} assessment(s) from {args.restore}")
            return

        recalculate(args, db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
