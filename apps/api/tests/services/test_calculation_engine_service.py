"""
Tests for Calculation Engine Service

Tests the calculation engine's ability to execute calculation schemas and
determine Pass/Fail/Conditional status for auto-calculable indicators.

Covers:
- All 6 rule types (AND_ALL, OR_ANY, PERCENTAGE_THRESHOLD, COUNT_THRESHOLD, MATCH_VALUE, BBI_FUNCTIONALITY_CHECK)
- Nested condition groups with AND/OR operators
- Remark generation from remark schemas
- Error handling for invalid schemas and missing data
"""

from app.db.enums import ValidationStatus
from app.services.calculation_engine_service import (
    calculation_engine_service,
)


class TestCalculationEngineService:
    """Test suite for CalculationEngineService"""

    def test_percentage_threshold_rule_pass(self):
        """Test PERCENTAGE_THRESHOLD rule when threshold is met"""
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "completion_rate",
                            "operator": ">=",
                            "threshold": 75.0,
                        }
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        response_data = {"completion_rate": 80.0}

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.PASS

    def test_percentage_threshold_rule_fail(self):
        """Test PERCENTAGE_THRESHOLD rule when threshold is not met"""
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "completion_rate",
                            "operator": ">=",
                            "threshold": 75.0,
                        }
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        response_data = {"completion_rate": 60.0}

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.FAIL

    def test_count_threshold_rule_with_list(self):
        """Test COUNT_THRESHOLD rule with list of selected items"""
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "COUNT_THRESHOLD",
                            "field_id": "selected_documents",
                            "operator": ">=",
                            "threshold": 3,
                        }
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        response_data = {"selected_documents": ["doc1", "doc2", "doc3", "doc4"]}

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.PASS

    def test_count_threshold_rule_with_dict(self):
        """Test COUNT_THRESHOLD rule with dict of checkbox values"""
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "COUNT_THRESHOLD",
                            "field_id": "checkboxes",
                            "operator": ">=",
                            "threshold": 2,
                        }
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        response_data = {"checkboxes": {"option1": True, "option2": True, "option3": False}}

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.PASS

    def test_match_value_rule_equals(self):
        """Test MATCH_VALUE rule with == operator"""
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "MATCH_VALUE",
                            "field_id": "status",
                            "operator": "==",
                            "expected_value": "approved",
                        }
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        response_data = {"status": "approved"}

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.PASS

    def test_match_value_rule_not_equals(self):
        """Test MATCH_VALUE rule with != operator"""
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "MATCH_VALUE",
                            "field_id": "status",
                            "operator": "!=",
                            "expected_value": "pending",
                        }
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        response_data = {"status": "approved"}

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.PASS

    def test_match_value_rule_contains(self):
        """Test MATCH_VALUE rule with contains operator"""
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "MATCH_VALUE",
                            "field_id": "description",
                            "operator": "contains",
                            "expected_value": "complete",
                        }
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        response_data = {"description": "Task is complete and verified"}

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.PASS

    def test_and_all_rule(self):
        """Test AND_ALL rule with nested conditions"""
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "AND_ALL",
                            "conditions": [
                                {
                                    "rule_type": "PERCENTAGE_THRESHOLD",
                                    "field_id": "completion_rate",
                                    "operator": ">=",
                                    "threshold": 75.0,
                                },
                                {
                                    "rule_type": "COUNT_THRESHOLD",
                                    "field_id": "documents",
                                    "operator": ">=",
                                    "threshold": 3,
                                },
                            ],
                        }
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        # Both conditions met
        response_data = {"completion_rate": 80.0, "documents": ["doc1", "doc2", "doc3"]}

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.PASS

    def test_and_all_rule_one_fails(self):
        """Test AND_ALL rule when one condition fails"""
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "AND_ALL",
                            "conditions": [
                                {
                                    "rule_type": "PERCENTAGE_THRESHOLD",
                                    "field_id": "completion_rate",
                                    "operator": ">=",
                                    "threshold": 75.0,
                                },
                                {
                                    "rule_type": "COUNT_THRESHOLD",
                                    "field_id": "documents",
                                    "operator": ">=",
                                    "threshold": 3,
                                },
                            ],
                        }
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        # First condition met, second fails
        response_data = {
            "completion_rate": 80.0,
            "documents": ["doc1", "doc2"],  # Only 2 documents
        }

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.FAIL

    def test_or_any_rule(self):
        """Test OR_ANY rule with nested conditions"""
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "OR_ANY",
                            "conditions": [
                                {
                                    "rule_type": "PERCENTAGE_THRESHOLD",
                                    "field_id": "completion_rate",
                                    "operator": ">=",
                                    "threshold": 75.0,
                                },
                                {
                                    "rule_type": "MATCH_VALUE",
                                    "field_id": "override",
                                    "operator": "==",
                                    "expected_value": "approved",
                                },
                            ],
                        }
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        # First condition fails, but second passes
        response_data = {"completion_rate": 60.0, "override": "approved"}

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.PASS

    def test_bbi_functionality_check(self):
        """Test BBI_FUNCTIONALITY_CHECK rule"""
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "BBI_FUNCTIONALITY_CHECK",
                            "bbi_id": 1,
                            "expected_status": "Functional",
                        }
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        response_data = {}
        bbi_statuses = {1: "Functional"}

        result = calculation_engine_service.execute_calculation(
            calculation_schema, response_data, bbi_statuses
        )

        assert result == ValidationStatus.PASS

    def test_multiple_condition_groups_and_operator(self):
        """Test multiple condition groups with implicit AND"""
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "completion_rate",
                            "operator": ">=",
                            "threshold": 75.0,
                        }
                    ],
                },
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "COUNT_THRESHOLD",
                            "field_id": "documents",
                            "operator": ">=",
                            "threshold": 2,
                        }
                    ],
                },
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        # Both groups pass
        response_data = {"completion_rate": 80.0, "documents": ["doc1", "doc2"]}

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.PASS

    def test_missing_field_returns_fail(self):
        """Test that missing required field returns FAIL"""
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "completion_rate",
                            "operator": ">=",
                            "threshold": 75.0,
                        }
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        response_data = {}  # Missing field

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.FAIL

    def test_null_calculation_schema_returns_fail(self):
        """Test that null calculation schema returns FAIL"""
        result = calculation_engine_service.execute_calculation(None, {"some_field": "value"})

        assert result == ValidationStatus.FAIL

    def test_get_remark_for_status_pass(self):
        """Test remark generation for Pass status"""
        remark_schema = {
            "Pass": "Indicator meets all requirements",
            "Fail": "Indicator does not meet requirements",
            "Conditional": "Indicator partially meets requirements",
        }

        remark = calculation_engine_service.get_remark_for_status(
            remark_schema, ValidationStatus.PASS
        )

        assert remark == "Indicator meets all requirements"

    def test_get_remark_for_status_fail(self):
        """Test remark generation for Fail status"""
        remark_schema = {
            "Pass": "Indicator meets all requirements",
            "Fail": "Indicator does not meet requirements",
            "Conditional": "Indicator partially meets requirements",
        }

        remark = calculation_engine_service.get_remark_for_status(
            remark_schema, ValidationStatus.FAIL
        )

        assert remark == "Indicator does not meet requirements"

    def test_get_remark_missing_schema(self):
        """Test remark generation when schema is missing"""
        remark = calculation_engine_service.get_remark_for_status(None, ValidationStatus.PASS)

        assert remark is None

    def test_get_remark_missing_status_key(self):
        """Test remark generation when status key is missing"""
        remark_schema = {
            "Pass": "Indicator meets all requirements",
            "Fail": "Indicator does not meet requirements",
            # Missing "Conditional"
        }

        remark = calculation_engine_service.get_remark_for_status(
            remark_schema, ValidationStatus.CONDITIONAL
        )

        assert remark is None

    def test_complex_nested_logic(self):
        """Test complex nested logic: (A AND B) OR (C AND D)"""
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "OR",
                    "rules": [
                        {
                            "rule_type": "AND_ALL",
                            "conditions": [
                                {
                                    "rule_type": "PERCENTAGE_THRESHOLD",
                                    "field_id": "rate_a",
                                    "operator": ">=",
                                    "threshold": 80.0,
                                },
                                {
                                    "rule_type": "COUNT_THRESHOLD",
                                    "field_id": "docs_a",
                                    "operator": ">=",
                                    "threshold": 3,
                                },
                            ],
                        },
                        {
                            "rule_type": "AND_ALL",
                            "conditions": [
                                {
                                    "rule_type": "MATCH_VALUE",
                                    "field_id": "override",
                                    "operator": "==",
                                    "expected_value": "approved",
                                },
                                {
                                    "rule_type": "PERCENTAGE_THRESHOLD",
                                    "field_id": "rate_b",
                                    "operator": ">=",
                                    "threshold": 50.0,
                                },
                            ],
                        },
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        # First AND group fails, but second AND group passes
        response_data = {
            "rate_a": 75.0,  # Below threshold
            "docs_a": ["d1", "d2", "d3"],
            "override": "approved",
            "rate_b": 60.0,
        }

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.PASS
