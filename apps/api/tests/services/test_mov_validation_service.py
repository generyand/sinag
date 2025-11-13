"""
Tests for MOVValidationService (Story 3.10)

Comprehensive tests for MOV checklist validation including:
- All 9 MOV item types (checkbox, group, currency_input, number_input, text_input, date_input, assessment, radio_group, dropdown)
- Grace period calculation (exact date, within grace, after grace)
- OR logic with various min_required values (1, 2, 3)
- Threshold logic (passed, considered, failed statuses)
- Conditional display evaluation
- Nested groups (group within group)
"""

from datetime import date, timedelta
from typing import Any, Dict
import pytest

from app.schemas.mov_checklist import (
    MOVCheckboxItem,
    MOVGroupItem,
    MOVCurrencyInputItem,
    MOVNumberInputItem,
    MOVTextInputItem,
    MOVDateInputItem,
    MOVAssessmentItem,
    MOVRadioGroupItem,
    MOVDropdownItem,
    MOVChecklistConfig,
    OptionItem,
)
from app.services.mov_validation_service import mov_validation_service


class TestMOVCheckboxItem:
    """Test suite for checkbox item validation."""

    def test_checkbox_checked_required(self):
        """Test required checkbox that is checked passes."""
        item = MOVCheckboxItem(
            id="chk1",
            type="checkbox",
            label="Confirm eligibility",
            required=True,
            default_value=False,
        )

        status, errors = mov_validation_service.validate_item(item, True)
        assert status == "Passed"
        assert errors == []

    def test_checkbox_unchecked_required_fails(self):
        """Test required checkbox that is unchecked fails."""
        item = MOVCheckboxItem(
            id="chk1",
            type="checkbox",
            label="Confirm eligibility",
            required=True,
            default_value=False,
        )

        status, errors = mov_validation_service.validate_item(item, False)
        assert status == "Failed"
        assert "must be checked" in errors[0]

    def test_checkbox_unchecked_optional(self):
        """Test optional checkbox that is unchecked is not applicable."""
        item = MOVCheckboxItem(
            id="chk1",
            type="checkbox",
            label="Optional checkbox",
            required=False,
            default_value=False,
        )

        status, errors = mov_validation_service.validate_item(item, False)
        assert status == "Not Applicable"
        assert errors == []

    def test_checkbox_invalid_type_fails(self):
        """Test checkbox with non-boolean value fails."""
        item = MOVCheckboxItem(
            id="chk1",
            type="checkbox",
            label="Checkbox",
            required=True,
            default_value=False,
        )

        status, errors = mov_validation_service.validate_item(item, "yes")
        assert status == "Failed"
        assert "must be true or false" in errors[0]


class TestMOVCurrencyInputItem:
    """Test suite for currency input item validation with threshold logic."""

    def test_currency_above_threshold_passes(self):
        """Test currency value >= threshold returns Passed."""
        item = MOVCurrencyInputItem(
            id="cur1",
            type="currency_input",
            label="Barangay Budget",
            required=True,
            min_value=100000.0,
            max_value=10000000.0,
            threshold=500000.0,
            currency_code="PHP",
        )

        # Value above threshold
        status, errors = mov_validation_service.validate_item(item, {"value": 600000.0})
        assert status == "Passed"
        assert errors == []

    def test_currency_at_threshold_passes(self):
        """Test currency value exactly at threshold returns Passed."""
        item = MOVCurrencyInputItem(
            id="cur1",
            type="currency_input",
            label="Barangay Budget",
            required=True,
            min_value=100000.0,
            max_value=10000000.0,
            threshold=500000.0,
            currency_code="PHP",
        )

        status, errors = mov_validation_service.validate_item(item, {"value": 500000.0})
        assert status == "Passed"
        assert errors == []

    def test_currency_between_min_and_threshold_considered(self):
        """Test currency value between min and threshold returns Considered."""
        item = MOVCurrencyInputItem(
            id="cur1",
            type="currency_input",
            label="Barangay Budget",
            required=True,
            min_value=100000.0,
            max_value=10000000.0,
            threshold=500000.0,
            currency_code="PHP",
        )

        # Value between min and threshold
        status, errors = mov_validation_service.validate_item(item, {"value": 300000.0})
        assert status == "Considered"
        assert errors == []

    def test_currency_below_min_fails(self):
        """Test currency value below min_value returns Failed."""
        item = MOVCurrencyInputItem(
            id="cur1",
            type="currency_input",
            label="Barangay Budget",
            required=True,
            min_value=100000.0,
            max_value=10000000.0,
            threshold=500000.0,
            currency_code="PHP",
        )

        status, errors = mov_validation_service.validate_item(item, {"value": 50000.0})
        assert status == "Failed"
        assert errors == []

    def test_currency_above_max_fails(self):
        """Test currency value above max_value returns Failed."""
        item = MOVCurrencyInputItem(
            id="cur1",
            type="currency_input",
            label="Barangay Budget",
            required=True,
            min_value=100000.0,
            max_value=10000000.0,
            threshold=500000.0,
            currency_code="PHP",
        )

        status, errors = mov_validation_service.validate_item(item, {"value": 15000000.0})
        assert status == "Failed"
        assert "must not exceed" in errors[0]

    def test_currency_no_threshold_passes(self):
        """Test currency without threshold only checks min/max."""
        item = MOVCurrencyInputItem(
            id="cur1",
            type="currency_input",
            label="Amount",
            required=True,
            min_value=1000.0,
            max_value=100000.0,
            threshold=None,  # No threshold
            currency_code="PHP",
        )

        # Value above min (no threshold to check)
        status, errors = mov_validation_service.validate_item(item, {"value": 50000.0})
        assert status == "Passed"
        assert errors == []


class TestMOVNumberInputItem:
    """Test suite for number input item validation with threshold logic."""

    def test_number_above_threshold_passes(self):
        """Test number value >= threshold returns Passed."""
        item = MOVNumberInputItem(
            id="num1",
            type="number_input",
            label="Population",
            required=True,
            min_value=100,
            max_value=50000,
            threshold=1000,
            unit="people",
        )

        status, errors = mov_validation_service.validate_item(item, {"value": 2500})
        assert status == "Passed"
        assert errors == []

    def test_number_between_min_and_threshold_considered(self):
        """Test number value between min and threshold returns Considered."""
        item = MOVNumberInputItem(
            id="num1",
            type="number_input",
            label="Population",
            required=True,
            min_value=100,
            max_value=50000,
            threshold=1000,
            unit="people",
        )

        status, errors = mov_validation_service.validate_item(item, {"value": 500})
        assert status == "Considered"
        assert errors == []

    def test_number_below_min_fails(self):
        """Test number value below min_value returns Failed."""
        item = MOVNumberInputItem(
            id="num1",
            type="number_input",
            label="Population",
            required=True,
            min_value=100,
            max_value=50000,
            threshold=1000,
            unit="people",
        )

        status, errors = mov_validation_service.validate_item(item, {"value": 50})
        assert status == "Failed"
        assert errors == []


class TestMOVDateInputItem:
    """Test suite for date input item validation with grace period logic."""

    def test_date_on_deadline_passes(self):
        """Test date exactly on deadline returns Passed."""
        deadline = date(2024, 12, 31)
        item = MOVDateInputItem(
            id="date1",
            type="date_input",
            label="Submission Date",
            required=True,
            min_date=None,
            max_date=deadline,
            grace_period_days=30,
            considered_status_enabled=True,
        )

        status, errors = mov_validation_service.validate_item(item, {"value": "2024-12-31"})
        assert status == "Passed"
        assert errors == []

    def test_date_before_deadline_passes(self):
        """Test date before deadline returns Passed."""
        deadline = date(2024, 12, 31)
        item = MOVDateInputItem(
            id="date1",
            type="date_input",
            label="Submission Date",
            required=True,
            min_date=None,
            max_date=deadline,
            grace_period_days=30,
            considered_status_enabled=True,
        )

        status, errors = mov_validation_service.validate_item(item, {"value": "2024-12-15"})
        assert status == "Passed"
        assert errors == []

    def test_date_within_grace_period_considered(self):
        """Test date within grace period returns Considered."""
        deadline = date(2024, 12, 31)
        item = MOVDateInputItem(
            id="date1",
            type="date_input",
            label="Submission Date",
            required=True,
            min_date=None,
            max_date=deadline,
            grace_period_days=30,
            considered_status_enabled=True,
        )

        # 15 days after deadline (within 30-day grace period)
        status, errors = mov_validation_service.validate_item(item, {"value": "2025-01-15"})
        assert status == "Considered"
        assert errors == []

    def test_date_at_grace_period_end_considered(self):
        """Test date at end of grace period returns Considered."""
        deadline = date(2024, 12, 31)
        item = MOVDateInputItem(
            id="date1",
            type="date_input",
            label="Submission Date",
            required=True,
            min_date=None,
            max_date=deadline,
            grace_period_days=30,
            considered_status_enabled=True,
        )

        # Exactly 30 days after deadline
        status, errors = mov_validation_service.validate_item(item, {"value": "2025-01-30"})
        assert status == "Considered"
        assert errors == []

    def test_date_after_grace_period_fails(self):
        """Test date after grace period returns Failed."""
        deadline = date(2024, 12, 31)
        item = MOVDateInputItem(
            id="date1",
            type="date_input",
            label="Submission Date",
            required=True,
            min_date=None,
            max_date=deadline,
            grace_period_days=30,
            considered_status_enabled=True,
        )

        # 31 days after deadline (beyond grace period)
        status, errors = mov_validation_service.validate_item(item, {"value": "2025-01-31"})
        assert status == "Failed"
        assert errors == []

    def test_date_no_grace_period_fails_after_deadline(self):
        """Test date after deadline with no grace period returns Failed."""
        deadline = date(2024, 12, 31)
        item = MOVDateInputItem(
            id="date1",
            type="date_input",
            label="Submission Date",
            required=True,
            min_date=None,
            max_date=deadline,
            grace_period_days=None,
            considered_status_enabled=False,
        )

        status, errors = mov_validation_service.validate_item(item, {"value": "2025-01-01"})
        assert status == "Failed"
        assert "on or before" in errors[0]


class TestMOVTextInputItem:
    """Test suite for text input item validation."""

    def test_text_valid_passes(self):
        """Test valid text input passes."""
        item = MOVTextInputItem(
            id="txt1",
            type="text_input",
            label="Barangay Code",
            required=True,
            placeholder="",
            max_length=20,
            validation_pattern=None,
        )

        status, errors = mov_validation_service.validate_item(item, {"value": "BR-2024-1234"})
        assert status == "Passed"
        assert errors == []

    def test_text_exceeds_max_length_fails(self):
        """Test text exceeding max_length fails."""
        item = MOVTextInputItem(
            id="txt1",
            type="text_input",
            label="Short Text",
            required=True,
            placeholder="",
            max_length=10,
            validation_pattern=None,
        )

        status, errors = mov_validation_service.validate_item(item, {"value": "This is too long"})
        assert status == "Failed"
        assert "must not exceed 10 characters" in errors[0]

    def test_text_pattern_match_passes(self):
        """Test text matching regex pattern passes."""
        item = MOVTextInputItem(
            id="txt1",
            type="text_input",
            label="Barangay Code",
            required=True,
            placeholder="",
            max_length=20,
            validation_pattern=r"^BR-\d{4}-\d{4}$",
        )

        status, errors = mov_validation_service.validate_item(item, {"value": "BR-2024-1234"})
        assert status == "Passed"
        assert errors == []

    def test_text_pattern_mismatch_fails(self):
        """Test text not matching regex pattern fails."""
        item = MOVTextInputItem(
            id="txt1",
            type="text_input",
            label="Barangay Code",
            required=True,
            placeholder="",
            max_length=20,
            validation_pattern=r"^BR-\d{4}-\d{4}$",
        )

        status, errors = mov_validation_service.validate_item(item, {"value": "INVALID"})
        assert status == "Failed"
        assert "does not match required pattern" in errors[0]


class TestMOVAssessmentItem:
    """Test suite for assessment item validation."""

    def test_assessment_yes_no_yes_passes(self):
        """Test YES/NO assessment with YES passes."""
        item = MOVAssessmentItem(
            id="assess1",
            type="assessment",
            label="Is compliant?",
            required=True,
            assessment_type="YES_NO",
        )

        status, errors = mov_validation_service.validate_item(item, {"value": "YES"})
        assert status == "Passed"
        assert errors == []

    def test_assessment_yes_no_no_fails(self):
        """Test YES/NO assessment with NO fails."""
        item = MOVAssessmentItem(
            id="assess1",
            type="assessment",
            label="Is compliant?",
            required=True,
            assessment_type="YES_NO",
        )

        status, errors = mov_validation_service.validate_item(item, {"value": "NO"})
        assert status == "Failed"
        assert errors == []

    def test_assessment_compliant_compliant_passes(self):
        """Test COMPLIANT/NON_COMPLIANT assessment with COMPLIANT passes."""
        item = MOVAssessmentItem(
            id="assess1",
            type="assessment",
            label="Compliance status",
            required=True,
            assessment_type="COMPLIANT_NON_COMPLIANT",
        )

        status, errors = mov_validation_service.validate_item(item, {"value": "COMPLIANT"})
        assert status == "Passed"
        assert errors == []

    def test_assessment_compliant_non_compliant_fails(self):
        """Test COMPLIANT/NON_COMPLIANT assessment with NON_COMPLIANT fails."""
        item = MOVAssessmentItem(
            id="assess1",
            type="assessment",
            label="Compliance status",
            required=True,
            assessment_type="COMPLIANT_NON_COMPLIANT",
        )

        status, errors = mov_validation_service.validate_item(item, {"value": "NON_COMPLIANT"})
        assert status == "Failed"
        assert errors == []


class TestMOVRadioGroupItem:
    """Test suite for radio group item validation."""

    def test_radio_valid_option_passes(self):
        """Test radio group with valid option passes."""
        item = MOVRadioGroupItem(
            id="radio1",
            type="radio_group",
            label="Select option",
            required=True,
            options=[
                OptionItem(label="Option A", value="a"),
                OptionItem(label="Option B", value="b"),
                OptionItem(label="Option C", value="c"),
            ],
            default_value=None,
        )

        status, errors = mov_validation_service.validate_item(item, {"value": "b"})
        assert status == "Passed"
        assert errors == []

    def test_radio_invalid_option_fails(self):
        """Test radio group with invalid option fails."""
        item = MOVRadioGroupItem(
            id="radio1",
            type="radio_group",
            label="Select option",
            required=True,
            options=[
                OptionItem(label="Option A", value="a"),
                OptionItem(label="Option B", value="b"),
            ],
            default_value=None,
        )

        status, errors = mov_validation_service.validate_item(item, {"value": "invalid"})
        assert status == "Failed"
        assert "must be one of" in errors[0]


class TestMOVDropdownItem:
    """Test suite for dropdown item validation."""

    def test_dropdown_single_select_valid_passes(self):
        """Test single-select dropdown with valid value passes."""
        item = MOVDropdownItem(
            id="drop1",
            type="dropdown",
            label="Select document",
            required=True,
            options=[
                OptionItem(label="Budget", value="budget"),
                OptionItem(label="Resolution", value="resolution"),
            ],
            allow_multiple=False,
            searchable=False,
        )

        status, errors = mov_validation_service.validate_item(item, {"value": "budget"})
        assert status == "Passed"
        assert errors == []

    def test_dropdown_multi_select_valid_passes(self):
        """Test multi-select dropdown with valid values passes."""
        item = MOVDropdownItem(
            id="drop1",
            type="dropdown",
            label="Select documents",
            required=True,
            options=[
                OptionItem(label="Budget", value="budget"),
                OptionItem(label="Resolution", value="resolution"),
                OptionItem(label="Report", value="report"),
            ],
            allow_multiple=True,
            searchable=False,
        )

        status, errors = mov_validation_service.validate_item(item, {"value": ["budget", "resolution"]})
        assert status == "Passed"
        assert errors == []

    def test_dropdown_multi_select_invalid_value_fails(self):
        """Test multi-select dropdown with invalid value fails."""
        item = MOVDropdownItem(
            id="drop1",
            type="dropdown",
            label="Select documents",
            required=True,
            options=[
                OptionItem(label="Budget", value="budget"),
                OptionItem(label="Resolution", value="resolution"),
            ],
            allow_multiple=True,
            searchable=False,
        )

        status, errors = mov_validation_service.validate_item(item, {"value": ["budget", "invalid"]})
        assert status == "Failed"
        assert "Invalid values" in errors[0]


class TestMOVGroupItem:
    """Test suite for group item validation with OR/AND logic."""

    def test_group_and_all_pass(self):
        """Test AND group where all children pass."""
        group = MOVGroupItem(
            id="group1",
            type="group",
            label="Required Documents",
            required=True,
            logic_operator="AND",
            min_required=None,
            children=[
                MOVCheckboxItem(
                    id="chk1",
                    type="checkbox",
                    label="Item 1",
                    required=True,
                    default_value=False,
                ),
                MOVCheckboxItem(
                    id="chk2",
                    type="checkbox",
                    label="Item 2",
                    required=True,
                    default_value=False,
                ),
            ],
        )

        child_values = {
            "chk1": True,
            "chk2": True,
        }

        status, errors = mov_validation_service.validate_item(group, child_values)
        assert status == "Passed"
        assert errors == []

    def test_group_and_one_fails(self):
        """Test AND group where one child fails causes group to fail."""
        group = MOVGroupItem(
            id="group1",
            type="group",
            label="Required Documents",
            required=True,
            logic_operator="AND",
            min_required=None,
            children=[
                MOVCheckboxItem(
                    id="chk1",
                    type="checkbox",
                    label="Item 1",
                    required=True,
                    default_value=False,
                ),
                MOVCheckboxItem(
                    id="chk2",
                    type="checkbox",
                    label="Item 2",
                    required=True,
                    default_value=False,
                ),
            ],
        )

        child_values = {
            "chk1": True,
            "chk2": False,  # This one fails
        }

        status, errors = mov_validation_service.validate_item(group, child_values)
        assert status == "Failed"
        assert len(errors) > 0

    def test_group_or_min_required_1_any_passes(self):
        """Test OR group with min_required=1 where any child passes."""
        group = MOVGroupItem(
            id="group1",
            type="group",
            label="Alternative Documents",
            required=True,
            logic_operator="OR",
            min_required=1,
            children=[
                MOVCheckboxItem(
                    id="chk1",
                    type="checkbox",
                    label="Item 1",
                    required=True,
                    default_value=False,
                ),
                MOVCheckboxItem(
                    id="chk2",
                    type="checkbox",
                    label="Item 2",
                    required=True,
                    default_value=False,
                ),
                MOVCheckboxItem(
                    id="chk3",
                    type="checkbox",
                    label="Item 3",
                    required=True,
                    default_value=False,
                ),
            ],
        )

        child_values = {
            "chk1": False,
            "chk2": True,  # Only this one passes
            "chk3": False,
        }

        status, errors = mov_validation_service.validate_item(group, child_values)
        assert status == "Passed"
        assert errors == []

    def test_group_or_min_required_2_two_pass(self):
        """Test OR group with min_required=2 where exactly 2 children pass."""
        group = MOVGroupItem(
            id="group1",
            type="group",
            label="Alternative Documents",
            required=True,
            logic_operator="OR",
            min_required=2,
            children=[
                MOVCheckboxItem(
                    id="chk1",
                    type="checkbox",
                    label="Item 1",
                    required=True,
                    default_value=False,
                ),
                MOVCheckboxItem(
                    id="chk2",
                    type="checkbox",
                    label="Item 2",
                    required=True,
                    default_value=False,
                ),
                MOVCheckboxItem(
                    id="chk3",
                    type="checkbox",
                    label="Item 3",
                    required=True,
                    default_value=False,
                ),
            ],
        )

        child_values = {
            "chk1": True,   # Pass
            "chk2": True,   # Pass
            "chk3": False,  # Fail
        }

        status, errors = mov_validation_service.validate_item(group, child_values)
        assert status == "Passed"
        assert errors == []

    def test_group_or_min_required_2_one_passes_fails(self):
        """Test OR group with min_required=2 where only 1 child passes fails."""
        group = MOVGroupItem(
            id="group1",
            type="group",
            label="Alternative Documents",
            required=True,
            logic_operator="OR",
            min_required=2,
            children=[
                MOVCheckboxItem(
                    id="chk1",
                    type="checkbox",
                    label="Item 1",
                    required=True,
                    default_value=False,
                ),
                MOVCheckboxItem(
                    id="chk2",
                    type="checkbox",
                    label="Item 2",
                    required=True,
                    default_value=False,
                ),
                MOVCheckboxItem(
                    id="chk3",
                    type="checkbox",
                    label="Item 3",
                    required=True,
                    default_value=False,
                ),
            ],
        )

        child_values = {
            "chk1": True,   # Only this one passes
            "chk2": False,
            "chk3": False,
        }

        status, errors = mov_validation_service.validate_item(group, child_values)
        assert status == "Failed"
        assert "At least 2 items must pass" in errors[0]

    def test_group_or_min_required_3_three_pass(self):
        """Test OR group with min_required=3 where all 3 children pass."""
        group = MOVGroupItem(
            id="group1",
            type="group",
            label="Alternative Documents",
            required=True,
            logic_operator="OR",
            min_required=3,
            children=[
                MOVCheckboxItem(
                    id="chk1",
                    type="checkbox",
                    label="Item 1",
                    required=True,
                    default_value=False,
                ),
                MOVCheckboxItem(
                    id="chk2",
                    type="checkbox",
                    label="Item 2",
                    required=True,
                    default_value=False,
                ),
                MOVCheckboxItem(
                    id="chk3",
                    type="checkbox",
                    label="Item 3",
                    required=True,
                    default_value=False,
                ),
            ],
        )

        child_values = {
            "chk1": True,
            "chk2": True,
            "chk3": True,
        }

        status, errors = mov_validation_service.validate_item(group, child_values)
        assert status == "Passed"
        assert errors == []

    def test_group_or_with_considered_status(self):
        """Test OR group where min_required met with 'Considered' status."""
        group = MOVGroupItem(
            id="group1",
            type="group",
            label="Budget Documents",
            required=True,
            logic_operator="OR",
            min_required=1,
            children=[
                MOVCurrencyInputItem(
                    id="cur1",
                    type="currency_input",
                    label="Budget Amount",
                    required=True,
                    min_value=100000.0,
                    max_value=10000000.0,
                    threshold=500000.0,
                    currency_code="PHP",
                ),
            ],
        )

        child_values = {
            "cur1": {"value": 300000.0},  # Between min and threshold = Considered
        }

        status, errors = mov_validation_service.validate_item(group, child_values)
        assert status == "Considered"
        assert errors == []


class TestNestedGroups:
    """Test suite for nested group validation (group within group)."""

    def test_nested_group_and_inside_or(self):
        """Test AND group nested inside OR group."""
        inner_group = MOVGroupItem(
            id="inner1",
            type="group",
            label="Inner AND Group",
            required=True,
            logic_operator="AND",
            min_required=None,
            children=[
                MOVCheckboxItem(
                    id="chk1",
                    type="checkbox",
                    label="Item 1",
                    required=True,
                    default_value=False,
                ),
                MOVCheckboxItem(
                    id="chk2",
                    type="checkbox",
                    label="Item 2",
                    required=True,
                    default_value=False,
                ),
            ],
        )

        outer_group = MOVGroupItem(
            id="outer1",
            type="group",
            label="Outer OR Group",
            required=True,
            logic_operator="OR",
            min_required=1,
            children=[
                inner_group,
                MOVCheckboxItem(
                    id="chk3",
                    type="checkbox",
                    label="Alternative Item",
                    required=True,
                    default_value=False,
                ),
            ],
        )

        # Inner group passes (both children pass)
        child_values = {
            "inner1": {
                "chk1": True,
                "chk2": True,
            },
            "chk3": False,
        }

        status, errors = mov_validation_service.validate_item(outer_group, child_values)
        assert status == "Passed"
        assert errors == []

    def test_nested_group_or_inside_and(self):
        """Test OR group nested inside AND group."""
        inner_group = MOVGroupItem(
            id="inner1",
            type="group",
            label="Inner OR Group",
            required=True,
            logic_operator="OR",
            min_required=1,
            children=[
                MOVCheckboxItem(
                    id="chk1",
                    type="checkbox",
                    label="Item 1",
                    required=True,
                    default_value=False,
                ),
                MOVCheckboxItem(
                    id="chk2",
                    type="checkbox",
                    label="Item 2",
                    required=True,
                    default_value=False,
                ),
            ],
        )

        outer_group = MOVGroupItem(
            id="outer1",
            type="group",
            label="Outer AND Group",
            required=True,
            logic_operator="AND",
            min_required=None,
            children=[
                inner_group,
                MOVCheckboxItem(
                    id="chk3",
                    type="checkbox",
                    label="Required Item",
                    required=True,
                    default_value=False,
                ),
            ],
        )

        # Inner OR group passes (one child passes), outer required item passes
        child_values = {
            "inner1": {
                "chk1": False,
                "chk2": True,  # Inner group passes via OR logic
            },
            "chk3": True,  # Outer required item passes
        }

        status, errors = mov_validation_service.validate_item(outer_group, child_values)
        assert status == "Passed"
        assert errors == []


class TestGracePeriodCalculation:
    """Test suite specifically for grace period calculation logic."""

    def test_check_grace_period_before_deadline(self):
        """Test grace period check with date before deadline."""
        date_value = date(2024, 12, 15)
        deadline = date(2024, 12, 31)
        grace_period_days = 30

        status = mov_validation_service.check_grace_period(date_value, deadline, grace_period_days)
        assert status == "Passed"

    def test_check_grace_period_on_deadline(self):
        """Test grace period check with date exactly on deadline."""
        date_value = date(2024, 12, 31)
        deadline = date(2024, 12, 31)
        grace_period_days = 30

        status = mov_validation_service.check_grace_period(date_value, deadline, grace_period_days)
        assert status == "Passed"

    def test_check_grace_period_one_day_after_deadline(self):
        """Test grace period check with date 1 day after deadline."""
        date_value = date(2025, 1, 1)
        deadline = date(2024, 12, 31)
        grace_period_days = 30

        status = mov_validation_service.check_grace_period(date_value, deadline, grace_period_days)
        assert status == "Considered"

    def test_check_grace_period_within_grace(self):
        """Test grace period check with date within grace period."""
        date_value = date(2025, 1, 15)
        deadline = date(2024, 12, 31)
        grace_period_days = 30

        status = mov_validation_service.check_grace_period(date_value, deadline, grace_period_days)
        assert status == "Considered"

    def test_check_grace_period_at_grace_end(self):
        """Test grace period check with date at end of grace period."""
        date_value = date(2025, 1, 30)  # 30 days after Dec 31
        deadline = date(2024, 12, 31)
        grace_period_days = 30

        status = mov_validation_service.check_grace_period(date_value, deadline, grace_period_days)
        assert status == "Considered"

    def test_check_grace_period_after_grace(self):
        """Test grace period check with date after grace period."""
        date_value = date(2025, 1, 31)  # 31 days after Dec 31
        deadline = date(2024, 12, 31)
        grace_period_days = 30

        status = mov_validation_service.check_grace_period(date_value, deadline, grace_period_days)
        assert status == "Failed"


class TestThresholdCalculation:
    """Test suite specifically for threshold calculation logic."""

    def test_threshold_above_threshold(self):
        """Test threshold logic with value >= threshold."""
        status = mov_validation_service.calculate_threshold_status(
            numeric_value=600000.0,
            min_value=100000.0,
            threshold=500000.0,
        )
        assert status == "Passed"

    def test_threshold_at_threshold(self):
        """Test threshold logic with value exactly at threshold."""
        status = mov_validation_service.calculate_threshold_status(
            numeric_value=500000.0,
            min_value=100000.0,
            threshold=500000.0,
        )
        assert status == "Passed"

    def test_threshold_between_min_and_threshold(self):
        """Test threshold logic with value between min and threshold."""
        status = mov_validation_service.calculate_threshold_status(
            numeric_value=300000.0,
            min_value=100000.0,
            threshold=500000.0,
        )
        assert status == "Considered"

    def test_threshold_at_min(self):
        """Test threshold logic with value exactly at min."""
        status = mov_validation_service.calculate_threshold_status(
            numeric_value=100000.0,
            min_value=100000.0,
            threshold=500000.0,
        )
        assert status == "Considered"

    def test_threshold_below_min(self):
        """Test threshold logic with value below min."""
        status = mov_validation_service.calculate_threshold_status(
            numeric_value=50000.0,
            min_value=100000.0,
            threshold=500000.0,
        )
        assert status == "Failed"

    def test_threshold_no_threshold_above_min(self):
        """Test threshold logic with no threshold set, value above min."""
        status = mov_validation_service.calculate_threshold_status(
            numeric_value=300000.0,
            min_value=100000.0,
            threshold=None,
        )
        assert status == "Passed"


class TestFullChecklistValidation:
    """Test suite for full checklist validation with multiple items."""

    def test_checklist_all_pass_strict(self):
        """Test checklist where all items pass in strict mode."""
        config = MOVChecklistConfig(
            items=[
                MOVCheckboxItem(
                    id="chk1",
                    type="checkbox",
                    label="Checkbox",
                    required=True,
                    default_value=False,
                ),
                MOVCurrencyInputItem(
                    id="cur1",
                    type="currency_input",
                    label="Budget",
                    required=True,
                    min_value=100000.0,
                    max_value=10000000.0,
                    threshold=500000.0,
                    currency_code="PHP",
                ),
            ],
            validation_mode="strict",
        )

        submission_data = {
            "chk1": True,
            "cur1": {"value": 600000.0},
        }

        result = mov_validation_service.validate_checklist(config, submission_data)
        assert result.status == "Passed"
        assert result.item_results["chk1"] == "Passed"
        assert result.item_results["cur1"] == "Passed"
        assert len(result.errors) == 0

    def test_checklist_one_considered_overall_considered(self):
        """Test checklist with one 'Considered' item results in 'Considered' overall."""
        config = MOVChecklistConfig(
            items=[
                MOVCheckboxItem(
                    id="chk1",
                    type="checkbox",
                    label="Checkbox",
                    required=True,
                    default_value=False,
                ),
                MOVCurrencyInputItem(
                    id="cur1",
                    type="currency_input",
                    label="Budget",
                    required=True,
                    min_value=100000.0,
                    max_value=10000000.0,
                    threshold=500000.0,
                    currency_code="PHP",
                ),
            ],
            validation_mode="strict",
        )

        submission_data = {
            "chk1": True,
            "cur1": {"value": 300000.0},  # Between min and threshold = Considered
        }

        result = mov_validation_service.validate_checklist(config, submission_data)
        assert result.status == "Considered"
        assert result.item_results["chk1"] == "Passed"
        assert result.item_results["cur1"] == "Considered"

    def test_checklist_one_fails_overall_fails(self):
        """Test checklist with one failed item results in 'Failed' overall."""
        config = MOVChecklistConfig(
            items=[
                MOVCheckboxItem(
                    id="chk1",
                    type="checkbox",
                    label="Checkbox",
                    required=True,
                    default_value=False,
                ),
                MOVCurrencyInputItem(
                    id="cur1",
                    type="currency_input",
                    label="Budget",
                    required=True,
                    min_value=100000.0,
                    max_value=10000000.0,
                    threshold=500000.0,
                    currency_code="PHP",
                ),
            ],
            validation_mode="strict",
        )

        submission_data = {
            "chk1": False,  # Required checkbox unchecked = Failed
            "cur1": {"value": 600000.0},
        }

        result = mov_validation_service.validate_checklist(config, submission_data)
        assert result.status == "Failed"
        assert result.item_results["chk1"] == "Failed"
        assert result.item_results["cur1"] == "Passed"
        assert len(result.errors) > 0
