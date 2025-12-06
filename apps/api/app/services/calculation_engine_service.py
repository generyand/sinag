"""
Calculation Engine Service

This service executes calculation schemas to determine Pass/Fail/Conditional status
for auto-calculable indicators. It evaluates calculation rules against response data
and returns the appropriate validation status.

The calculation engine supports 6 rule types:
- AND_ALL: All conditions must be true
- OR_ANY: At least one condition must be true
- PERCENTAGE_THRESHOLD: Number field must meet threshold
- COUNT_THRESHOLD: Count of selected items must meet threshold
- MATCH_VALUE: Field value must match expected value
- BBI_FUNCTIONALITY_CHECK: Check BBI functionality status

Usage:
    from app.services.calculation_engine_service import calculation_engine_service

    status = calculation_engine_service.execute_calculation(
        calculation_schema=indicator.calculation_schema,
        response_data=assessment_response.response_data
    )
"""

import logging
from typing import Any

from app.db.enums import ValidationStatus
from app.schemas.calculation_schema import (
    AndAllRule,
    BBIFunctionalityCheckRule,
    CalculationRule,
    CalculationSchema,
    ConditionGroup,
    CountThresholdRule,
    MatchValueRule,
    OrAnyRule,
    PercentageThresholdRule,
)

logger = logging.getLogger(__name__)


class CalculationEngineError(Exception):
    """Custom exception for calculation engine errors"""

    pass


class CalculationEngineService:
    """
    Service for executing calculation schemas and determining validation status.

    This service is the core of the auto-calculation feature, evaluating complex
    rule trees to determine if an indicator response passes compliance checks.
    """

    def __init__(self):
        """Initialize the calculation engine service"""
        self.logger = logging.getLogger(__name__)

    def execute_calculation(
        self,
        calculation_schema: dict[str, Any] | None,
        response_data: dict[str, Any] | None,
        bbi_statuses: dict[int, str] | None = None,
    ) -> ValidationStatus:
        """
        Execute a calculation schema against response data.

        Args:
            calculation_schema: The calculation schema dict to evaluate
            response_data: The assessment response data dict
            bbi_statuses: Optional dict mapping BBI IDs to their status (for BBI_FUNCTIONALITY_CHECK)

        Returns:
            ValidationStatus enum (PASS, FAIL, or CONDITIONAL)

        Raises:
            CalculationEngineError: If the schema is invalid or evaluation fails
        """
        # Handle null/missing inputs
        if not calculation_schema:
            self.logger.warning("No calculation schema provided, returning FAIL")
            return ValidationStatus.FAIL

        if response_data is None:
            response_data = {}

        try:
            # Parse and validate the calculation schema using Pydantic
            schema_obj = CalculationSchema(**calculation_schema)

            # Evaluate all condition groups (implicit AND between groups)
            all_groups_pass = True
            for group in schema_obj.condition_groups:
                group_result = self._evaluate_condition_group(
                    group, response_data, bbi_statuses or {}
                )
                if not group_result:
                    all_groups_pass = False
                    break

            # Return appropriate status based on evaluation result
            if all_groups_pass:
                return (
                    ValidationStatus.PASS
                    if schema_obj.output_status_on_pass == "PASS"
                    else ValidationStatus.FAIL
                )
            else:
                return (
                    ValidationStatus.FAIL
                    if schema_obj.output_status_on_fail == "FAIL"
                    else ValidationStatus.PASS
                )

        except Exception as e:
            self.logger.error(f"Error executing calculation schema: {str(e)}", exc_info=True)
            raise CalculationEngineError(f"Failed to execute calculation schema: {str(e)}")

    def _evaluate_condition_group(
        self,
        group: ConditionGroup,
        response_data: dict[str, Any],
        bbi_statuses: dict[int, str],
    ) -> bool:
        """
        Evaluate a condition group (list of rules with AND/OR operator).

        Args:
            group: The condition group to evaluate
            response_data: The assessment response data
            bbi_statuses: BBI ID to status mapping

        Returns:
            True if the group condition is satisfied, False otherwise
        """
        results = []

        for rule in group.rules:
            rule_result = self._evaluate_rule(rule, response_data, bbi_statuses)
            results.append(rule_result)

        # Apply group operator
        if group.operator == "AND":
            return all(results)
        elif group.operator == "OR":
            return any(results)
        else:
            raise CalculationEngineError(f"Invalid group operator: {group.operator}")

    def _evaluate_rule(
        self,
        rule: CalculationRule,
        response_data: dict[str, Any],
        bbi_statuses: dict[int, str],
    ) -> bool:
        """
        Evaluate a single calculation rule.

        Args:
            rule: The calculation rule to evaluate
            response_data: The assessment response data
            bbi_statuses: BBI ID to status mapping

        Returns:
            True if the rule condition is satisfied, False otherwise
        """
        if isinstance(rule, AndAllRule):
            return self._evaluate_and_all_rule(rule, response_data, bbi_statuses)
        elif isinstance(rule, OrAnyRule):
            return self._evaluate_or_any_rule(rule, response_data, bbi_statuses)
        elif isinstance(rule, PercentageThresholdRule):
            return self._evaluate_percentage_threshold_rule(rule, response_data)
        elif isinstance(rule, CountThresholdRule):
            return self._evaluate_count_threshold_rule(rule, response_data)
        elif isinstance(rule, MatchValueRule):
            return self._evaluate_match_value_rule(rule, response_data)
        elif isinstance(rule, BBIFunctionalityCheckRule):
            return self._evaluate_bbi_functionality_rule(rule, bbi_statuses)
        else:
            raise CalculationEngineError(f"Unknown rule type: {type(rule)}")

    def _evaluate_and_all_rule(
        self,
        rule: AndAllRule,
        response_data: dict[str, Any],
        bbi_statuses: dict[int, str],
    ) -> bool:
        """
        Evaluate an AND_ALL rule - all nested conditions must be true.

        Args:
            rule: The AND_ALL rule to evaluate
            response_data: The assessment response data
            bbi_statuses: BBI ID to status mapping

        Returns:
            True if all conditions are satisfied, False otherwise
        """
        results = []
        for condition in rule.conditions:
            result = self._evaluate_rule(condition, response_data, bbi_statuses)
            results.append(result)

        return all(results)

    def _evaluate_or_any_rule(
        self,
        rule: OrAnyRule,
        response_data: dict[str, Any],
        bbi_statuses: dict[int, str],
    ) -> bool:
        """
        Evaluate an OR_ANY rule - at least one nested condition must be true.

        Args:
            rule: The OR_ANY rule to evaluate
            response_data: The assessment response data
            bbi_statuses: BBI ID to status mapping

        Returns:
            True if at least one condition is satisfied, False otherwise
        """
        results = []
        for condition in rule.conditions:
            result = self._evaluate_rule(condition, response_data, bbi_statuses)
            results.append(result)

        return any(results)

    def _evaluate_percentage_threshold_rule(
        self, rule: PercentageThresholdRule, response_data: dict[str, Any]
    ) -> bool:
        """
        Evaluate a PERCENTAGE_THRESHOLD rule.

        Args:
            rule: The percentage threshold rule to evaluate
            response_data: The assessment response data

        Returns:
            True if the field value meets the threshold, False otherwise
        """
        # Get field value from response data
        field_value = response_data.get(rule.field_id)

        # Handle missing or null values
        if field_value is None:
            self.logger.warning(f"Field '{rule.field_id}' not found in response data or is null")
            return False

        # Convert to float for comparison
        try:
            numeric_value = float(field_value)
        except (ValueError, TypeError):
            self.logger.error(f"Field '{rule.field_id}' value '{field_value}' is not numeric")
            return False

        # Evaluate based on operator
        return self._compare_values(numeric_value, rule.operator, rule.threshold)

    def _evaluate_count_threshold_rule(
        self, rule: CountThresholdRule, response_data: dict[str, Any]
    ) -> bool:
        """
        Evaluate a COUNT_THRESHOLD rule - count selected checkboxes.

        Args:
            rule: The count threshold rule to evaluate
            response_data: The assessment response data

        Returns:
            True if the count meets the threshold, False otherwise
        """
        # Get field value from response data
        field_value = response_data.get(rule.field_id)

        # Handle missing or null values
        if field_value is None:
            self.logger.warning(f"Field '{rule.field_id}' not found in response data or is null")
            return False

        # Count selected items
        count = 0
        if isinstance(field_value, list):
            # Count items in list (checkbox group returns list of selected values)
            count = len(field_value)
        elif isinstance(field_value, dict):
            # Count True values in dict (alternative checkbox format)
            count = sum(1 for v in field_value.values() if v is True)
        elif isinstance(field_value, (int, float)):
            # Already a count
            count = int(field_value)
        else:
            self.logger.error(
                f"Field '{rule.field_id}' value is not a valid count type: {type(field_value)}"
            )
            return False

        # Evaluate based on operator
        return self._compare_values(count, rule.operator, rule.threshold)

    def _evaluate_match_value_rule(
        self, rule: MatchValueRule, response_data: dict[str, Any]
    ) -> bool:
        """
        Evaluate a MATCH_VALUE rule - check if field matches expected value.

        Args:
            rule: The match value rule to evaluate
            response_data: The assessment response data

        Returns:
            True if the field value matches the expected value, False otherwise
        """
        # Get field value from response data
        field_value = response_data.get(rule.field_id)

        # Handle missing values
        if field_value is None:
            self.logger.warning(f"Field '{rule.field_id}' not found in response data or is null")
            return False

        # Evaluate based on operator
        if rule.operator == "==":
            return field_value == rule.expected_value
        elif rule.operator == "!=":
            return field_value != rule.expected_value
        elif rule.operator == "contains":
            # Check if expected_value is contained in field_value (string or list)
            if isinstance(field_value, str):
                return str(rule.expected_value) in field_value
            elif isinstance(field_value, list):
                return rule.expected_value in field_value
            else:
                return False
        elif rule.operator == "not_contains":
            # Check if expected_value is NOT contained in field_value
            if isinstance(field_value, str):
                return str(rule.expected_value) not in field_value
            elif isinstance(field_value, list):
                return rule.expected_value not in field_value
            else:
                return True
        else:
            raise CalculationEngineError(f"Invalid operator for MATCH_VALUE: {rule.operator}")

    def _evaluate_bbi_functionality_rule(
        self, rule: BBIFunctionalityCheckRule, bbi_statuses: dict[int, str]
    ) -> bool:
        """
        Evaluate a BBI_FUNCTIONALITY_CHECK rule.

        Args:
            rule: The BBI functionality check rule to evaluate
            bbi_statuses: Dict mapping BBI IDs to their functionality status

        Returns:
            True if the BBI has the expected status, False otherwise
        """
        # Get BBI status
        bbi_status = bbi_statuses.get(rule.bbi_id)

        if bbi_status is None:
            self.logger.warning(f"BBI ID {rule.bbi_id} not found in BBI statuses")
            return False

        # Compare with expected status
        return bbi_status == rule.expected_status

    def _compare_values(self, actual: float, operator: str, expected: float) -> bool:
        """
        Compare two numeric values using the specified operator.

        Args:
            actual: The actual value
            operator: The comparison operator (>=, >, <=, <, ==)
            expected: The expected value

        Returns:
            True if the comparison is satisfied, False otherwise
        """
        if operator == ">=":
            return actual >= expected
        elif operator == ">":
            return actual > expected
        elif operator == "<=":
            return actual <= expected
        elif operator == "<":
            return actual < expected
        elif operator == "==":
            return actual == expected
        else:
            raise CalculationEngineError(f"Invalid comparison operator: {operator}")

    def get_remark_for_status(
        self, remark_schema: dict[str, str] | None, status: ValidationStatus
    ) -> str | None:
        """
        Get the appropriate remark template for a given validation status.

        Args:
            remark_schema: Dict mapping status values to remark templates
            status: The validation status (PASS, FAIL, CONDITIONAL)

        Returns:
            Remark string for the status, or None if not found
        """
        if not remark_schema:
            return None

        # Map ValidationStatus enum to remark schema keys
        status_key = status.value  # "PASS", "FAIL", or "CONDITIONAL"

        return remark_schema.get(status_key)


# Singleton instance for use across the application
calculation_engine_service = CalculationEngineService()
