from types import SimpleNamespace
from typing import Any, cast

from app.services.compliance_service import ComplianceService


def make_report_indicator(code: str = "4.1.6") -> SimpleNamespace:
    code_safe = code.replace(".", "_")
    return SimpleNamespace(
        indicator_code=code,
        validation_rule="SHARED_PLUS_OR_LOGIC",
        mov_checklist_items=[
            {
                "item_id": f"{code_safe}_report",
                "item_type": "checkbox",
                "required": True,
            },
            {
                "item_id": f"{code_safe}_option_a",
                "item_type": "assessment_field",
                "required": False,
            },
            {
                "item_id": f"{code_safe}_option_b",
                "item_type": "assessment_field",
                "required": False,
            },
        ],
    )


def make_response(response_data: dict) -> SimpleNamespace:
    return SimpleNamespace(response_data=response_data)


def test_report_or_indicator_is_complete_when_physical_yes_and_financial_no():
    service = ComplianceService()
    indicator = make_report_indicator("4.1.6")
    response = make_response(
        {
            "validator_val_4_1_6_report": True,
            "validator_val_4_1_6_option_a_yes": True,
            "validator_val_4_1_6_option_b_no": True,
        }
    )

    is_complete, has_any_checked = service._is_checklist_complete(
        db=SimpleNamespace(),
        indicator=cast(Any, indicator),
        response=cast(Any, response),
    )

    assert is_complete is True
    assert has_any_checked is True


def test_report_or_indicator_is_complete_when_physical_no_and_financial_yes():
    service = ComplianceService()
    indicator = make_report_indicator("4.1.6")
    response = make_response(
        {
            "validator_val_4_1_6_report": True,
            "validator_val_4_1_6_option_a_no": True,
            "validator_val_4_1_6_option_b_yes": True,
        }
    )

    is_complete, has_any_checked = service._is_checklist_complete(
        db=SimpleNamespace(),
        indicator=cast(Any, indicator),
        response=cast(Any, response),
    )

    assert is_complete is True
    assert has_any_checked is True


def test_report_or_indicator_is_incomplete_when_physical_and_financial_are_no():
    service = ComplianceService()
    indicator = make_report_indicator("4.1.6")
    response = make_response(
        {
            "validator_val_4_1_6_report": True,
            "validator_val_4_1_6_option_a_no": True,
            "validator_val_4_1_6_option_b_no": True,
        }
    )

    is_complete, has_any_checked = service._is_checklist_complete(
        db=SimpleNamespace(),
        indicator=cast(Any, indicator),
        response=cast(Any, response),
    )

    assert is_complete is False
    assert has_any_checked is True


def test_non_report_indicator_still_fails_fast_on_any_no_answer():
    service = ComplianceService()
    indicator = SimpleNamespace(
        indicator_code="2.2.1",
        validation_rule="ALL_ITEMS_REQUIRED",
        mov_checklist_items=[
            {
                "item_id": "2_2_1_a",
                "item_type": "assessment_field",
                "required": True,
            }
        ],
    )
    response = make_response({"validator_val_2_2_1_a_no": True})

    is_complete, has_any_checked = service._is_checklist_complete(
        db=SimpleNamespace(),
        indicator=cast(Any, indicator),
        response=cast(Any, response),
    )

    assert is_complete is False
    assert has_any_checked is True
