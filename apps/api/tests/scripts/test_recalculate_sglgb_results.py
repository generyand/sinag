from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

from app.db.enums import ComplianceStatus

SCRIPT_PATH = (
    Path(__file__).resolve().parent.parent.parent / "scripts" / "recalculate_sglgb_results.py"
)


def _load_script_module():
    spec = spec_from_file_location("recalculate_sglgb_results", SCRIPT_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_build_assessment_backup_stores_restorable_result_fields():
    module = _load_script_module()

    assessment = type(
        "AssessmentStub",
        (),
        {
            "id": 42,
            "assessment_year": 2025,
            "status": type("Status", (), {"value": "COMPLETED"})(),
            "final_compliance_status": ComplianceStatus.PASSED,
            "area_results": {"Financial Administration": "Passed"},
            "updated_at": None,
        },
    )()
    bbi_result = type(
        "BBIResultStub",
        (),
        {
            "id": 9,
            "barangay_id": 3,
            "assessment_year": 2025,
            "assessment_id": 42,
            "bbi_id": 7,
            "indicator_id": 100,
            "compliance_percentage": 50.0,
            "compliance_rating": "MODERATELY_FUNCTIONAL",
            "sub_indicators_passed": 2,
            "sub_indicators_total": 4,
            "sub_indicator_results": {"1": "PASS"},
            "calculated_at": None,
        },
    )()

    result = module.build_assessment_backup(
        assessment=assessment,
        barangay_name="Labon",
        bbi_results=[bbi_result],
    )

    assert result["assessment_id"] == 42
    assert result["barangay_name"] == "Labon"
    assert result["final_compliance_status"] == "PASSED"
    assert result["area_results"] == {"Financial Administration": "Passed"}
    assert result["bbi_results"][0]["compliance_rating"] == "MODERATELY_FUNCTIONAL"


def test_build_recalculation_preview_flags_changed_verdict_and_areas():
    module = _load_script_module()

    result = module.build_recalculation_preview(
        assessment_id=42,
        barangay_name="Labon",
        old_final_status="PASSED",
        old_area_results={"Financial Administration": "Passed"},
        new_result={
            "final_compliance_status": "FAILED",
            "area_results": {"Financial Administration": "Failed"},
        },
    )

    assert result["changed"] is True
    assert result["final_status_changed"] is True
    assert result["area_results_changed"] is True
    assert result["old_final_compliance_status"] == "PASSED"
    assert result["new_final_compliance_status"] == "FAILED"


def test_parse_args_uses_explicit_statuses_without_appending_defaults():
    module = _load_script_module()

    args = module.parse_args(["--status", "COMPLETED"])

    assert args.status == ["COMPLETED"]
