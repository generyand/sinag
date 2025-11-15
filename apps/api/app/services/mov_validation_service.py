"""
🔍 MOV Validation Service

Service for validating MOV (Means of Verification) checklists with support for:
- Grace periods (date validation with "Considered" status)
- OR logic (group validation with min_required)
- Thresholds (currency/number validation with "Passed" vs "Considered")
- Conditional display (show/hide items based on other field values)

Aligned with Indicator Builder Specification v1.4.
"""

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Literal, Optional, Union

from app.schemas.mov_checklist import (
    MOVAssessmentItem,
    MOVCheckboxItem,
    MOVChecklistConfig,
    MOVCurrencyInputItem,
    MOVDateInputItem,
    MOVDropdownItem,
    MOVGroupItem,
    MOVItem,
    MOVNumberInputItem,
    MOVRadioGroupItem,
    MOVTextInputItem,
    MOVValidationStatus,
)

ValidationStatusType = Literal["Passed", "Considered", "Failed", "Not Applicable", "Pending"]


class MOVValidationService:
    """
    Service for validating MOV checklists against submission data.

    Implements validation logic for all 9 MOV item types with support for:
    - Grace period handling for date inputs
    - OR logic and min_required for group items
    - Threshold-based "Considered" status for currency/number inputs
    - Conditional display logic
    """

    def validate_checklist(
        self,
        checklist_config: MOVChecklistConfig,
        submission_data: Dict[str, Any],
    ) -> MOVValidationStatus:
        """
        Validate entire MOV checklist against submission data.

        Args:
            checklist_config: MOV checklist configuration from indicator
            submission_data: Dictionary of submitted values keyed by item ID

        Returns:
            MOVValidationStatus with overall status and per-item results

        Example submission_data:
            {
                "item-1": True,
                "item-2": {"value": 500000.0},
                "item-3": {"value": "2022-12-15"}
            }
        """
        item_results: Dict[str, str] = {}
        errors: List[str] = []
        warnings: List[str] = []

        # Validate each item
        for item in checklist_config.items:
            item_id = item.id
            submitted_value = submission_data.get(item_id)

            # Check display condition
            if item.display_condition and not self.evaluate_display_condition(
                item.display_condition, submission_data
            ):
                item_results[item_id] = "Not Applicable"
                continue

            # Validate item
            status, item_errors = self.validate_item(item, submitted_value)
            item_results[item_id] = status

            if item_errors:
                errors.extend([f"{item.label}: {err}" for err in item_errors])

        # Calculate overall status
        overall_status = self._calculate_overall_status(
            item_results, checklist_config.validation_mode
        )

        return MOVValidationStatus(
            status=overall_status,
            item_results=item_results,
            errors=errors,
            warnings=warnings,
        )

    def validate_item(
        self,
        item: MOVItem,
        value: Any,
    ) -> tuple[ValidationStatusType, List[str]]:
        """
        Validate a single MOV item.

        Args:
            item: MOV item configuration
            value: Submitted value for this item

        Returns:
            Tuple of (status, list of error messages)
        """
        errors: List[str] = []

        # Handle missing value for required items
        if item.required and (value is None or value == ""):
            return "Pending", ["This field is required"]

        # Handle optional items with no value
        if not item.required and (value is None or value == ""):
            return "Not Applicable", []

        # Dispatch to type-specific validation
        if isinstance(item, MOVCheckboxItem):
            return self._validate_checkbox(item, value)
        elif isinstance(item, MOVGroupItem):
            return self._validate_group(item, value)
        elif isinstance(item, MOVCurrencyInputItem):
            return self._validate_currency_input(item, value)
        elif isinstance(item, MOVNumberInputItem):
            return self._validate_number_input(item, value)
        elif isinstance(item, MOVTextInputItem):
            return self._validate_text_input(item, value)
        elif isinstance(item, MOVDateInputItem):
            return self._validate_date_input(item, value)
        elif isinstance(item, MOVAssessmentItem):
            return self._validate_assessment(item, value)
        elif isinstance(item, MOVRadioGroupItem):
            return self._validate_radio_group(item, value)
        elif isinstance(item, MOVDropdownItem):
            return self._validate_dropdown(item, value)
        else:
            return "Failed", [f"Unknown item type: {item.type}"]

    def evaluate_display_condition(
        self,
        condition: Any,
        context: Dict[str, Any],
    ) -> bool:
        """
        Evaluate conditional display logic.

        Args:
            condition: DisplayCondition object
            context: Submission data context

        Returns:
            True if condition is met (item should be displayed)
        """
        field_value = context.get(condition.field_id)

        if condition.operator == "equals":
            return field_value == condition.value
        elif condition.operator == "not_equals":
            return field_value != condition.value
        elif condition.operator == "contains":
            if isinstance(field_value, (list, str)):
                return condition.value in field_value
            return False
        elif condition.operator == "greater_than":
            try:
                return float(field_value) > float(condition.value)
            except (TypeError, ValueError):
                return False
        elif condition.operator == "less_than":
            try:
                return float(field_value) < float(condition.value)
            except (TypeError, ValueError):
                return False

        return True

    def check_grace_period(
        self,
        date_value: date,
        deadline: date,
        grace_period_days: int,
    ) -> ValidationStatusType:
        """
        Calculate validation status with grace period handling.

        Grace Period Logic:
        - date on or before deadline → "Passed"
        - date within grace period (deadline < date <= deadline + grace) → "Considered"
        - date after grace period → "Failed"

        Args:
            date_value: Date being validated
            deadline: Maximum acceptable date (deadline)
            grace_period_days: Grace period in days after deadline

        Returns:
            Validation status: "Passed", "Considered", or "Failed"
        """
        if date_value <= deadline:
            return "Passed"

        grace_end = deadline + timedelta(days=grace_period_days)

        if date_value <= grace_end:
            return "Considered"

        return "Failed"

    def calculate_threshold_status(
        self,
        numeric_value: float,
        min_value: Optional[float],
        threshold: Optional[float],
    ) -> ValidationStatusType:
        """
        Calculate validation status for threshold-based items.

        Threshold Logic:
        - value >= threshold → "Passed"
        - min_value <= value < threshold → "Considered"
        - value < min_value → "Failed"

        Args:
            numeric_value: Value being validated
            min_value: Minimum acceptable value
            threshold: Threshold for "Passed" status

        Returns:
            Validation status: "Passed", "Considered", or "Failed"
        """
        # If threshold is set and value meets it → Passed
        if threshold is not None and numeric_value >= threshold:
            return "Passed"

        # If min_value is set and value is below it → Failed
        if min_value is not None and numeric_value < min_value:
            return "Failed"

        # Value is between min_value and threshold (or threshold not set) → Considered
        if threshold is not None:
            return "Considered"

        # No threshold set, value meets min_value → Passed
        return "Passed"

    def evaluate_group(
        self,
        group_item: MOVGroupItem,
        child_values: Dict[str, Any],
    ) -> tuple[ValidationStatusType, List[str]]:
        """
        Evaluate group item with OR/AND logic and min_required.

        OR Logic:
        - If min_required = 1: Pass if ANY child passes
        - If min_required > 1: Pass if at least N children pass

        AND Logic:
        - All children must pass

        Args:
            group_item: Group item configuration
            child_values: Dictionary of values for child items

        Returns:
            Tuple of (status, list of error messages)
        """
        child_statuses: List[ValidationStatusType] = []
        all_errors: List[str] = []

        # Validate each child
        for child in group_item.children:
            child_value = child_values.get(child.id)
            status, errors = self.validate_item(child, child_value)
            child_statuses.append(status)
            all_errors.extend(errors)

        # OR logic
        if group_item.logic_operator == "OR":
            min_required = group_item.min_required or 1
            passed_count = sum(1 for s in child_statuses if s == "Passed")
            considered_count = sum(1 for s in child_statuses if s in ["Passed", "Considered"])

            if passed_count >= min_required:
                return "Passed", []
            elif considered_count >= min_required:
                return "Considered", []
            else:
                return "Failed", [f"At least {min_required} items must pass"]

        # AND logic (default)
        else:
            if all(s == "Passed" for s in child_statuses):
                return "Passed", []
            elif any(s == "Failed" for s in child_statuses):
                return "Failed", all_errors
            elif any(s == "Considered" for s in child_statuses):
                return "Considered", []
            elif any(s == "Pending" for s in child_statuses):
                return "Pending", all_errors
            else:
                return "Not Applicable", []

    # =============================================================================
    # Private Validation Methods (Type-Specific)
    # =============================================================================

    def _validate_checkbox(
        self,
        item: MOVCheckboxItem,
        value: Any,
    ) -> tuple[ValidationStatusType, List[str]]:
        """Validate checkbox item (simple yes/no)."""
        if not isinstance(value, bool):
            return "Failed", ["Value must be true or false"]

        # For required checkboxes, value must be True
        if item.required and not value:
            return "Failed", ["This checkbox must be checked"]

        return "Passed" if value else "Not Applicable", []

    def _validate_group(
        self,
        item: MOVGroupItem,
        value: Any,
    ) -> tuple[ValidationStatusType, List[str]]:
        """Validate group item with OR/AND logic."""
        # Value should be a dict of child values keyed by child ID
        if not isinstance(value, dict):
            return "Failed", ["Group value must be a dictionary of child values"]

        return self.evaluate_group(item, value)

    def _validate_currency_input(
        self,
        item: MOVCurrencyInputItem,
        value: Any,
    ) -> tuple[ValidationStatusType, List[str]]:
        """Validate currency input with threshold logic."""
        # Extract numeric value (value might be {"value": 500000.0} or just 500000.0)
        numeric_value = value.get("value") if isinstance(value, dict) else value

        try:
            numeric_value = float(numeric_value)
        except (TypeError, ValueError):
            return "Failed", ["Value must be a valid number"]

        # Check max_value constraint
        if item.max_value is not None and numeric_value > item.max_value:
            return "Failed", [f"Value must not exceed ₱{item.max_value:,.2f}"]

        # Apply threshold logic
        status = self.calculate_threshold_status(
            numeric_value,
            item.min_value,
            item.threshold,
        )

        return status, []

    def _validate_number_input(
        self,
        item: MOVNumberInputItem,
        value: Any,
    ) -> tuple[ValidationStatusType, List[str]]:
        """Validate number input with threshold logic."""
        # Extract numeric value
        numeric_value = value.get("value") if isinstance(value, dict) else value

        try:
            numeric_value = float(numeric_value)
        except (TypeError, ValueError):
            return "Failed", ["Value must be a valid number"]

        # Check max_value constraint
        if item.max_value is not None and numeric_value > item.max_value:
            return "Failed", [f"Value must not exceed {item.max_value}"]

        # Apply threshold logic
        status = self.calculate_threshold_status(
            numeric_value,
            item.min_value,
            item.threshold,
        )

        return status, []

    def _validate_text_input(
        self,
        item: MOVTextInputItem,
        value: Any,
    ) -> tuple[ValidationStatusType, List[str]]:
        """Validate text input with regex pattern."""
        # Extract text value
        text_value = value.get("value") if isinstance(value, dict) else value

        if not isinstance(text_value, str):
            return "Failed", ["Value must be a string"]

        # Check max_length
        if item.max_length is not None and len(text_value) > item.max_length:
            return "Failed", [f"Text must not exceed {item.max_length} characters"]

        # Check validation pattern (regex)
        if item.validation_pattern:
            import re

            if not re.match(item.validation_pattern, text_value):
                return "Failed", ["Text does not match required pattern"]

        return "Passed", []

    def _validate_date_input(
        self,
        item: MOVDateInputItem,
        value: Any,
    ) -> tuple[ValidationStatusType, List[str]]:
        """Validate date input with grace period logic."""
        # Extract date value
        date_value = value.get("value") if isinstance(value, dict) else value

        # Parse date string to date object
        if isinstance(date_value, str):
            try:
                date_value = datetime.strptime(date_value, "%Y-%m-%d").date()
            except ValueError:
                return "Failed", ["Invalid date format (use YYYY-MM-DD)"]
        elif isinstance(date_value, datetime):
            date_value = date_value.date()
        elif not isinstance(date_value, date):
            return "Failed", ["Value must be a valid date"]

        # Check min_date
        if item.min_date and date_value < item.min_date:
            return "Failed", [f"Date must be on or after {item.min_date}"]

        # Apply grace period logic if max_date is set
        if item.max_date:
            if item.considered_status_enabled and item.grace_period_days:
                status = self.check_grace_period(
                    date_value,
                    item.max_date,
                    item.grace_period_days,
                )
                return status, []
            else:
                # No grace period - simple comparison
                if date_value <= item.max_date:
                    return "Passed", []
                else:
                    return "Failed", [f"Date must be on or before {item.max_date}"]

        return "Passed", []

    def _validate_assessment(
        self,
        item: MOVAssessmentItem,
        value: Any,
    ) -> tuple[ValidationStatusType, List[str]]:
        """Validate assessment item (validator judgment)."""
        # Extract assessment value
        assessment_value = value.get("value") if isinstance(value, dict) else value

        if item.assessment_type == "YES_NO":
            if assessment_value not in ["YES", "NO"]:
                return "Failed", ["Value must be YES or NO"]
            return "Passed" if assessment_value == "YES" else "Failed", []
        elif item.assessment_type == "COMPLIANT_NON_COMPLIANT":
            if assessment_value not in ["COMPLIANT", "NON_COMPLIANT"]:
                return "Failed", ["Value must be COMPLIANT or NON_COMPLIANT"]
            return "Passed" if assessment_value == "COMPLIANT" else "Failed", []

        return "Failed", ["Invalid assessment type"]

    def _validate_radio_group(
        self,
        item: MOVRadioGroupItem,
        value: Any,
    ) -> tuple[ValidationStatusType, List[str]]:
        """Validate radio group item (single selection)."""
        # Extract selected value
        selected_value = value.get("value") if isinstance(value, dict) else value

        # Check if selected value is valid option
        valid_values = [opt.value for opt in item.options]
        if selected_value not in valid_values:
            return "Failed", [f"Value must be one of: {', '.join(valid_values)}"]

        return "Passed", []

    def _validate_dropdown(
        self,
        item: MOVDropdownItem,
        value: Any,
    ) -> tuple[ValidationStatusType, List[str]]:
        """Validate dropdown item (single or multiple selection)."""
        # Extract selected value(s)
        selected_value = value.get("value") if isinstance(value, dict) else value

        valid_values = [opt.value for opt in item.options]

        if item.allow_multiple:
            # Multi-select: value should be a list
            if not isinstance(selected_value, list):
                return "Failed", ["Value must be a list for multi-select dropdown"]

            invalid_values = [v for v in selected_value if v not in valid_values]
            if invalid_values:
                return "Failed", [f"Invalid values: {', '.join(invalid_values)}"]

        else:
            # Single-select: value should be a string
            if selected_value not in valid_values:
                return "Failed", [f"Value must be one of: {', '.join(valid_values)}"]

        return "Passed", []

    def _calculate_overall_status(
        self,
        item_results: Dict[str, str],
        validation_mode: Literal["strict", "lenient"],
    ) -> ValidationStatusType:
        """
        Calculate overall checklist validation status.

        Strict mode: All items must pass
        Lenient mode: At least one failure-free path through required items

        Args:
            item_results: Dictionary of item statuses by ID
            validation_mode: "strict" or "lenient"

        Returns:
            Overall validation status
        """
        statuses = list(item_results.values())

        # If any item is Pending, overall is Pending
        if "Pending" in statuses:
            return "Pending"

        # If any item is Failed, overall is Failed
        if "Failed" in statuses:
            return "Failed"

        # If all items passed, overall is Passed
        if all(s == "Passed" for s in statuses):
            return "Passed"

        # If any item is Considered (and none failed), overall is Considered
        if "Considered" in statuses:
            return "Considered"

        # All items are Not Applicable
        if all(s == "Not Applicable" for s in statuses):
            return "Not Applicable"

        # Default to Pending if unclear
        return "Pending"


# =============================================================================
# Singleton Instance
# =============================================================================

mov_validation_service = MOVValidationService()
