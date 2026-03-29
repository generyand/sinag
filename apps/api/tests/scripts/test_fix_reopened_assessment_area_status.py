from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

SCRIPT_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "scripts"
    / "fix_reopened_assessment_area_status.py"
)


def _load_script_module():
    spec = spec_from_file_location("fix_reopened_assessment_area_status", SCRIPT_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_build_reopened_area_reset_preserves_allowed_flags_and_resets_workflow_state():
    module = _load_script_module()

    current_area_status = {
        "1": {"status": "submitted", "rework_used": True},
        "2": {"status": "approved", "calibration_used": True},
        "3": "submitted",
    }
    current_area_approved = {"1": True, "2": True, "3": False}

    result = module.build_reopened_area_reset(current_area_status, current_area_approved)

    assert result["needs_repair"] is True
    assert result["area_submission_status"] == {
        "1": {"status": "draft", "rework_used": True},
        "2": {"status": "draft", "calibration_used": True},
        "3": {"status": "draft"},
        "4": {"status": "draft"},
        "5": {"status": "draft"},
        "6": {"status": "draft"},
    }
    assert result["area_assessor_approved"] == {
        "1": False,
        "2": False,
        "3": False,
        "4": False,
        "5": False,
        "6": False,
    }
    assert result["details"]["malformed"] == [{"area": "3", "type": "str", "value": "submitted"}]
    assert result["details"]["non_draft"] == [
        {"area": "1", "status": "submitted"},
        {"area": "2", "status": "approved"},
    ]
