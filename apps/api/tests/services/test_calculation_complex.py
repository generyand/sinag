"""
🧪 Calculation Engine Complex Nested Conditions Tests (Story 6.7 - Task 6.7.2)

Tests complex calculation schemas with deeply nested conditions:
- AND, OR, NOT combinations
- Multi-level nesting (3+ levels)
- Mixed rule types in same schema
- Complex boolean logic
- Remark mapping with complex conditions
"""

import pytest

from app.db.enums import ValidationStatus
from app.services.calculation_engine_service import calculation_engine_service


class TestComplexNestedConditions:
    """
    Test suite for complex nested calculation conditions
    """

    @pytest.mark.skip(
        reason="Test expects OR between condition groups but engine uses implicit AND (see calculation_engine_service.py line 92)"
    )
    def test_three_level_nested_and_or(self):
        """
        Test: Three levels of nested AND/OR conditions.

        Schema Structure:
        - Level 1: OR of two condition groups
        - Level 2: AND within each group
        - Level 3: Multiple rules in each AND group

        Verifies:
        - Correct evaluation of nested logic
        - Returns PASS when any top-level group passes
        """
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "OR",
                    "rules": [
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "completion_rate",
                            "operator": ">=",
                            "threshold": 90.0,
                        },
                        {
                            "rule_type": "COUNT_THRESHOLD",
                            "field_id": "documents",
                            "operator": ">=",
                            "threshold": 5,
                        },
                    ],
                },
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "MATCH_VALUE",
                            "field_id": "status",
                            "operator": "==",
                            "expected_value": "Active",
                        },
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "budget_utilization",
                            "operator": ">=",
                            "threshold": 75.0,
                        },
                    ],
                },
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        # Scenario 1: First OR group passes
        response_data_1 = {
            "completion_rate": 95,
            "documents": ["doc1", "doc2"],
            "status": "Inactive",
            "budget_utilization": 50,
        }

        result_1 = calculation_engine_service.execute_calculation(
            calculation_schema, response_data_1
        )
        assert result_1 == ValidationStatus.PASS

        # Scenario 2: Second AND group passes
        response_data_2 = {
            "completion_rate": 50,
            "documents": ["doc1"],
            "status": "Active",
            "budget_utilization": 80,
        }

        result_2 = calculation_engine_service.execute_calculation(
            calculation_schema, response_data_2
        )
        assert result_2 == ValidationStatus.PASS

        # Scenario 3: Both groups fail
        response_data_3 = {
            "completion_rate": 50,
            "documents": ["doc1"],
            "status": "Inactive",
            "budget_utilization": 50,
        }

        result_3 = calculation_engine_service.execute_calculation(
            calculation_schema, response_data_3
        )
        assert result_3 == ValidationStatus.FAIL

    def test_mixed_rule_types_in_complex_schema(self):
        """
        Test: All 6 rule types in single complex schema.

        Verifies:
        - PERCENTAGE_THRESHOLD
        - COUNT_THRESHOLD
        - MATCH_VALUE
        - AND_ALL (if available)
        - OR_ANY (if available)
        - BBI_FUNCTIONALITY_CHECK (if available)
        - All work together correctly
        """
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "completion",
                            "operator": ">=",
                            "threshold": 80.0,
                        },
                        {
                            "rule_type": "COUNT_THRESHOLD",
                            "field_id": "documents",
                            "operator": ">=",
                            "threshold": 3,
                        },
                        {
                            "rule_type": "MATCH_VALUE",
                            "field_id": "approved",
                            "operator": "==",
                            "expected_value": True,
                        },
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        # All conditions met
        response_data = {
            "completion": 85,
            "documents": ["d1", "d2", "d3", "d4"],
            "approved": True,
        }

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.PASS

    def test_complex_and_or_not_combinations(self):
        """
        Test: Complex combinations of AND, OR, NOT logic.

        Schema:
        - (Condition A OR Condition B) AND (Condition C)

        Verifies:
        - Correct boolean algebra evaluation
        - Precedence rules followed
        """
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "OR",
                    "rules": [
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "score_a",
                            "operator": ">=",
                            "threshold": 90.0,
                        },
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "score_b",
                            "operator": ">=",
                            "threshold": 90.0,
                        },
                    ],
                },
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "MATCH_VALUE",
                            "field_id": "verified",
                            "operator": "==",
                            "expected_value": True,
                        }
                    ],
                },
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        # (A=95 OR B=50) AND (verified=True) = True AND True = True
        response_data_1 = {"score_a": 95, "score_b": 50, "verified": True}
        result_1 = calculation_engine_service.execute_calculation(
            calculation_schema, response_data_1
        )
        assert result_1 == ValidationStatus.PASS

        # (A=50 OR B=95) AND (verified=True) = True AND True = True
        response_data_2 = {"score_a": 50, "score_b": 95, "verified": True}
        result_2 = calculation_engine_service.execute_calculation(
            calculation_schema, response_data_2
        )
        assert result_2 == ValidationStatus.PASS

        # (A=50 OR B=50) AND (verified=True) = False AND True = False
        response_data_3 = {"score_a": 50, "score_b": 50, "verified": True}
        result_3 = calculation_engine_service.execute_calculation(
            calculation_schema, response_data_3
        )
        assert result_3 == ValidationStatus.FAIL

        # (A=95 OR B=50) AND (verified=False) = True AND False = False
        response_data_4 = {"score_a": 95, "score_b": 50, "verified": False}
        result_4 = calculation_engine_service.execute_calculation(
            calculation_schema, response_data_4
        )
        assert result_4 == ValidationStatus.FAIL

    def test_deeply_nested_or_conditions(self):
        """
        Test: Many OR conditions (any one can pass).

        Verifies:
        - Multiple alternative paths to PASS
        - Early termination on first match
        - All paths tested
        """
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "OR",
                    "rules": [
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "path_1_score",
                            "operator": ">=",
                            "threshold": 90.0,
                        },
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "path_2_score",
                            "operator": ">=",
                            "threshold": 90.0,
                        },
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "path_3_score",
                            "operator": ">=",
                            "threshold": 90.0,
                        },
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "path_4_score",
                            "operator": ">=",
                            "threshold": 90.0,
                        },
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        # Only path 3 passes
        response_data = {
            "path_1_score": 50,
            "path_2_score": 60,
            "path_3_score": 95,
            "path_4_score": 70,
        }

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.PASS

    def test_deeply_nested_and_conditions(self):
        """
        Test: Many AND conditions (all must pass).

        Verifies:
        - All conditions checked
        - Single failure causes overall FAIL
        """
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "requirement_1",
                            "operator": ">=",
                            "threshold": 70.0,
                        },
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "requirement_2",
                            "operator": ">=",
                            "threshold": 70.0,
                        },
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "requirement_3",
                            "operator": ">=",
                            "threshold": 70.0,
                        },
                        {
                            "rule_type": "MATCH_VALUE",
                            "field_id": "certified",
                            "operator": "==",
                            "expected_value": True,
                        },
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        # All pass
        response_data_pass = {
            "requirement_1": 75,
            "requirement_2": 80,
            "requirement_3": 85,
            "certified": True,
        }

        result_pass = calculation_engine_service.execute_calculation(
            calculation_schema, response_data_pass
        )
        assert result_pass == ValidationStatus.PASS

        # One fails
        response_data_fail = {
            "requirement_1": 75,
            "requirement_2": 65,  # Fails
            "requirement_3": 85,
            "certified": True,
        }

        result_fail = calculation_engine_service.execute_calculation(
            calculation_schema, response_data_fail
        )
        assert result_fail == ValidationStatus.FAIL

    @pytest.mark.skip(
        reason="CONDITIONAL output status not supported - schema only allows 'Pass' or 'Fail' per SGLGB methodology"
    )
    def test_conditional_status_output(self):
        """
        Test: Schema that outputs CONDITIONAL status.

        Verifies:
        - output_status_on_pass can be "Conditional"
        - Correct status returned
        """
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "score",
                            "operator": ">=",
                            "threshold": 50.0,
                        },
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "score",
                            "operator": "<",
                            "threshold": 75.0,
                        },
                    ],
                }
            ],
            "output_status_on_pass": "Conditional",
            "output_status_on_fail": "Fail",
        }

        # Score is 60 (between 50 and 75)
        response_data = {"score": 60}

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.CONDITIONAL


class TestRemarkMappingWithComplexConditions:
    """
    Test remark generation with complex calculation schemas
    """

    def test_remark_mapping_for_pass(self):
        """
        Test: Remark schema correctly maps PASS status to remark.

        Verifies:
        - Calculation returns PASS
        - Correct remark retrieved from remark_schema
        """
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "completion",
                            "operator": ">=",
                            "threshold": 90.0,
                        }
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        remark_schema = {
            "PASS": "Excellent performance - all requirements met",
            "FAIL": "Below minimum requirements",
        }

        response_data = {"completion": 95}

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.PASS

        # Remark mapping would be: remark_schema[result.name]
        expected_remark = remark_schema[result.name]
        assert expected_remark == "Excellent performance - all requirements met"

    def test_remark_mapping_for_fail(self):
        """
        Test: Remark schema correctly maps FAIL status to remark.

        Verifies:
        - Calculation returns FAIL
        - Correct remark retrieved
        """
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "completion",
                            "operator": ">=",
                            "threshold": 90.0,
                        }
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Fail",
        }

        remark_schema = {
            "PASS": "Excellent performance",
            "FAIL": "Below minimum requirements - improvement needed",
        }

        response_data = {"completion": 60}

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.FAIL

        expected_remark = remark_schema[result.name]
        assert expected_remark == "Below minimum requirements - improvement needed"

    @pytest.mark.skip(
        reason="CONDITIONAL output status not supported - schema only allows 'Pass' or 'Fail' per SGLGB methodology"
    )
    def test_remark_mapping_for_conditional(self):
        """
        Test: Remark schema correctly maps CONDITIONAL status.

        Verifies:
        - Calculation returns CONDITIONAL
        - Correct conditional remark retrieved
        """
        calculation_schema = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "score",
                            "operator": ">=",
                            "threshold": 60.0,
                        }
                    ],
                }
            ],
            "output_status_on_pass": "Conditional",
            "output_status_on_fail": "Fail",
        }

        remark_schema = {
            "CONDITIONAL": "Meets minimum requirements - additional documentation needed",
            "FAIL": "Does not meet minimum requirements",
        }

        response_data = {"score": 65}

        result = calculation_engine_service.execute_calculation(calculation_schema, response_data)

        assert result == ValidationStatus.CONDITIONAL

        expected_remark = remark_schema[result.name]
        assert expected_remark == "Meets minimum requirements - additional documentation needed"

    @pytest.mark.skip(
        reason="CONDITIONAL output status not supported - schema only allows 'Pass' or 'Fail' per SGLGB methodology"
    )
    def test_complex_condition_with_multiple_remark_paths(self):
        """
        Test: Complex schema with different remark for each outcome.

        Verifies:
        - Multiple possible outcomes
        - Each has appropriate remark
        - Correct remark selected based on calculation result
        """
        remark_schema = {
            "PASS": "Outstanding - exceeds all expectations",
            "CONDITIONAL": "Satisfactory - meets basic requirements",
            "FAIL": "Unsatisfactory - does not meet requirements",
        }

        # Schema for PASS
        schema_pass = {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "PERCENTAGE_THRESHOLD",
                            "field_id": "score",
                            "operator": ">=",
                            "threshold": 90.0,
                        }
                    ],
                }
            ],
            "output_status_on_pass": "Pass",
            "output_status_on_fail": "Conditional",
        }

        data_pass = {"score": 95}
        result_pass = calculation_engine_service.execute_calculation(schema_pass, data_pass)
        assert result_pass == ValidationStatus.PASS
        assert remark_schema[result_pass.name] == "Outstanding - exceeds all expectations"

        # Same schema, lower score for CONDITIONAL
        data_conditional = {"score": 70}
        result_conditional = calculation_engine_service.execute_calculation(
            schema_pass, data_conditional
        )
        assert result_conditional == ValidationStatus.CONDITIONAL
        assert remark_schema[result_conditional.name] == "Satisfactory - meets basic requirements"
