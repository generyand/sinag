from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

from app.db.enums import AssessmentStatus

SCRIPT_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "scripts"
    / "backfill_assessment_indicator_snapshots.py"
)


def _load_script_module():
    spec = spec_from_file_location("backfill_assessment_indicator_snapshots", SCRIPT_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_build_snapshot_backfill_preview_detects_missing_snapshots():
    module = _load_script_module()

    assessment = {
        "assessment_id": 20,
        "assessment_year": 2025,
        "status": AssessmentStatus.REOPENED_BY_MLGOO.value,
        "barangay_name": "Tagolilong",
        "snapshot_count": 0,
    }

    result = module.build_snapshot_backfill_preview(
        assessment=assessment,
        indicator_ids=[101, 102, 103],
        indicator_codes=["4.1.1", "4.1.2", "4.1.3"],
    )

    assert result == {
        "assessment_id": 20,
        "barangay_name": "Tagolilong",
        "assessment_year": 2025,
        "status": AssessmentStatus.REOPENED_BY_MLGOO.value,
        "snapshot_count": 0,
        "expected_indicator_count": 3,
        "indicator_ids": [101, 102, 103],
        "indicator_codes": ["4.1.1", "4.1.2", "4.1.3"],
        "needs_backfill": True,
    }


def test_build_snapshot_backfill_preview_noops_when_snapshot_count_matches():
    module = _load_script_module()

    assessment = {
        "assessment_id": 18,
        "assessment_year": 2025,
        "status": AssessmentStatus.SUBMITTED_FOR_REVIEW.value,
        "barangay_name": "Poblacion",
        "snapshot_count": 84,
    }

    result = module.build_snapshot_backfill_preview(
        assessment=assessment,
        indicator_ids=list(range(1, 85)),
        indicator_codes=[f"code-{i}" for i in range(1, 85)],
    )

    assert result["needs_backfill"] is False
    assert result["expected_indicator_count"] == 84
    assert result["snapshot_count"] == 84
