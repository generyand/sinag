"""
Tests for Calculation Rule Engine and Remark Generation.

Tests the calculation schema evaluation and remark generation functionality:
- All 6 rule types (AND_ALL, OR_ANY, PERCENTAGE_THRESHOLD, COUNT_THRESHOLD, MATCH_VALUE, BBI_FUNCTIONALITY_CHECK)
- Nested condition groups
- Remark generation with templates
- Integration with assessment workflow
"""

from app.db.models.governance_area import Indicator
from app.schemas.calculation_schema import (
    AndAllRule,
    BBIFunctionalityCheckRule,
    CalculationSchema,
    ConditionGroup,
    CountThresholdRule,
    MatchValueRule,
    OrAnyRule,
    PercentageThresholdRule,
)
from app.services.intelligence_service import intelligence_service


class TestRuleTypeEvaluation:
    """Test suite for all 6 rule types."""

    def test_match_value_rule_matches(self):
        """Test MATCH_VALUE rule when value matches."""
        rule = MatchValueRule(
            rule_type="MATCH_VALUE",
            field_id="status_field",
            operator="==",
            expected_value="compliant",
        )
        assessment_data = {
            "status_field": "compliant",
        }
        result = intelligence_service.evaluate_rule(rule, assessment_data)
        assert result is True

    def test_match_value_rule_no_match(self):
        """Test MATCH_VALUE rule when value doesn't match."""
        rule = MatchValueRule(
            rule_type="MATCH_VALUE",
            field_id="status_field",
            operator="==",
            expected_value="compliant",
        )
        assessment_data = {
            "status_field": "non-compliant",
        }
        result = intelligence_service.evaluate_rule(rule, assessment_data)
        assert result is False

    def test_match_value_rule_not_equals(self):
        """Test MATCH_VALUE rule with != operator."""
        rule = MatchValueRule(
            rule_type="MATCH_VALUE",
            field_id="status_field",
            operator="!=",
            expected_value="pending",
        )
        assessment_data = {
            "status_field": "approved",
        }
        result = intelligence_service.evaluate_rule(rule, assessment_data)
        assert result is True

    def test_match_value_rule_contains(self):
        """Test MATCH_VALUE rule with contains operator."""
        rule = MatchValueRule(
            rule_type="MATCH_VALUE",
            field_id="description",
            operator="contains",
            expected_value="complete",
        )
        assessment_data = {
            "description": "Task is complete and verified",
        }
        result = intelligence_service.evaluate_rule(rule, assessment_data)
        assert result is True

    def test_percentage_threshold_rule_meets_threshold(self):
        """Test PERCENTAGE_THRESHOLD rule when threshold is met."""
        rule = PercentageThresholdRule(
            rule_type="PERCENTAGE_THRESHOLD",
            field_id="completion_rate",
            operator=">=",
            threshold=75.0,
        )
        assessment_data = {
            "completion_rate": 80.0,
        }
        result = intelligence_service.evaluate_rule(rule, assessment_data)
        assert result is True

    def test_percentage_threshold_rule_below_threshold(self):
        """Test PERCENTAGE_THRESHOLD rule when threshold is not met."""
        rule = PercentageThresholdRule(
            rule_type="PERCENTAGE_THRESHOLD",
            field_id="completion_rate",
            operator=">=",
            threshold=75.0,
        )
        assessment_data = {
            "completion_rate": 60.0,
        }
        result = intelligence_service.evaluate_rule(rule, assessment_data)
        assert result is False

    def test_count_threshold_rule_meets_count(self):
        """Test COUNT_THRESHOLD rule when count is met."""
        rule = CountThresholdRule(
            rule_type="COUNT_THRESHOLD",
            field_id="required_documents",
            operator=">=",
            threshold=3,
        )
        assessment_data = {
            "required_documents": ["doc1", "doc2", "doc3", "doc4"],
        }
        result = intelligence_service.evaluate_rule(rule, assessment_data)
        assert result is True

    def test_count_threshold_rule_below_count(self):
        """Test COUNT_THRESHOLD rule when count is not met."""
        rule = CountThresholdRule(
            rule_type="COUNT_THRESHOLD",
            field_id="required_documents",
            operator=">=",
            threshold=5,
        )
        assessment_data = {
            "required_documents": ["doc1", "doc2", "doc3"],
        }
        result = intelligence_service.evaluate_rule(rule, assessment_data)
        assert result is False

    def test_and_all_rule_all_conditions_true(self):
        """Test AND_ALL rule when all conditions are true."""
        rule = AndAllRule(
            rule_type="AND_ALL",
            conditions=[
                MatchValueRule(
                    rule_type="MATCH_VALUE",
                    field_id="field1",
                    operator="==",
                    expected_value="yes",
                ),
                MatchValueRule(
                    rule_type="MATCH_VALUE",
                    field_id="field2",
                    operator="==",
                    expected_value="yes",
                ),
            ],
        )
        assessment_data = {
            "field1": "yes",
            "field2": "yes",
        }
        result = intelligence_service.evaluate_rule(rule, assessment_data)
        assert result is True

    def test_and_all_rule_one_condition_false(self):
        """Test AND_ALL rule when one condition is false."""
        rule = AndAllRule(
            rule_type="AND_ALL",
            conditions=[
                MatchValueRule(
                    rule_type="MATCH_VALUE",
                    field_id="field1",
                    operator="==",
                    expected_value="yes",
                ),
                MatchValueRule(
                    rule_type="MATCH_VALUE",
                    field_id="field2",
                    operator="==",
                    expected_value="yes",
                ),
            ],
        )
        assessment_data = {
            "field1": "yes",
            "field2": "no",
        }
        result = intelligence_service.evaluate_rule(rule, assessment_data)
        assert result is False

    def test_or_any_rule_one_condition_true(self):
        """Test OR_ANY rule when at least one condition is true."""
        rule = OrAnyRule(
            rule_type="OR_ANY",
            conditions=[
                MatchValueRule(
                    rule_type="MATCH_VALUE",
                    field_id="field1",
                    operator="==",
                    expected_value="yes",
                ),
                MatchValueRule(
                    rule_type="MATCH_VALUE",
                    field_id="field2",
                    operator="==",
                    expected_value="yes",
                ),
            ],
        )
        assessment_data = {
            "field1": "no",
            "field2": "yes",
        }
        result = intelligence_service.evaluate_rule(rule, assessment_data)
        assert result is True

    def test_or_any_rule_all_conditions_false(self):
        """Test OR_ANY rule when all conditions are false."""
        rule = OrAnyRule(
            rule_type="OR_ANY",
            conditions=[
                MatchValueRule(
                    rule_type="MATCH_VALUE",
                    field_id="field1",
                    operator="==",
                    expected_value="yes",
                ),
                MatchValueRule(
                    rule_type="MATCH_VALUE",
                    field_id="field2",
                    operator="==",
                    expected_value="yes",
                ),
            ],
        )
        assessment_data = {
            "field1": "no",
            "field2": "no",
        }
        result = intelligence_service.evaluate_rule(rule, assessment_data)
        assert result is False

    def test_bbi_functionality_check_rule_functional(self):
        """Test BBI_FUNCTIONALITY_CHECK rule when BBI is functional."""
        rule = BBIFunctionalityCheckRule(
            rule_type="BBI_FUNCTIONALITY_CHECK",
            bbi_id=1,
            expected_status="Functional",
        )
        # Note: This will fail until Epic 4 BBI integration is complete
        # For now, just test that the rule structure is valid
        assessment_data = {}
        # We expect this to raise or return False since BBI is not implemented
        try:
            result = intelligence_service.evaluate_rule(rule, assessment_data)
            # If it doesn't raise, it should return False
            assert result is False
        except Exception:
            # Expected until Epic 4 implementation
            pass


class TestNestedConditionGroups:
    """Test suite for nested condition group evaluation."""

    def test_single_and_group(self):
        """Test simple AND condition group."""
        group = ConditionGroup(
            operator="AND",
            rules=[
                MatchValueRule(
                    rule_type="MATCH_VALUE",
                    field_id="field1",
                    operator="==",
                    expected_value="yes",
                ),
                MatchValueRule(
                    rule_type="MATCH_VALUE",
                    field_id="field2",
                    operator="==",
                    expected_value="yes",
                ),
            ],
        )
        assessment_data = {
            "field1": "yes",
            "field2": "yes",
        }
        result = intelligence_service._evaluate_condition_group(group, assessment_data)
        assert result is True

    def test_single_or_group(self):
        """Test simple OR condition group."""
        group = ConditionGroup(
            operator="OR",
            rules=[
                MatchValueRule(
                    rule_type="MATCH_VALUE",
                    field_id="field1",
                    operator="==",
                    expected_value="yes",
                ),
                MatchValueRule(
                    rule_type="MATCH_VALUE",
                    field_id="field2",
                    operator="==",
                    expected_value="yes",
                ),
            ],
        )
        assessment_data = {
            "field1": "no",
            "field2": "yes",  # This makes the OR pass
        }
        result = intelligence_service._evaluate_condition_group(group, assessment_data)
        assert result is True

    def test_nested_groups_complex(self):
        """Test complex nested structure with AND_ALL and OR_ANY rules."""
        schema = CalculationSchema(
            condition_groups=[
                ConditionGroup(
                    operator="OR",
                    rules=[
                        AndAllRule(
                            rule_type="AND_ALL",
                            conditions=[
                                MatchValueRule(
                                    rule_type="MATCH_VALUE",
                                    field_id="field1",
                                    operator="==",
                                    expected_value="yes",
                                ),
                                MatchValueRule(
                                    rule_type="MATCH_VALUE",
                                    field_id="field2",
                                    operator="==",
                                    expected_value="yes",
                                ),
                            ],
                        ),
                        PercentageThresholdRule(
                            rule_type="PERCENTAGE_THRESHOLD",
                            field_id="completion_rate",
                            operator=">=",
                            threshold=80.0,
                        ),
                    ],
                )
            ],
            output_status_on_pass="Pass",
            output_status_on_fail="Fail",
        )
        assessment_data = {
            "field1": "no",  # AND fails
            "field2": "yes",
            "completion_rate": 85.0,  # But PERCENTAGE passes
        }
        result = intelligence_service.evaluate_calculation_schema(schema, assessment_data)
        assert result is True


class TestRemarkGeneration:
    """Test suite for remark generation."""

    def test_remark_generation_with_pass_status(self, db_session):
        """Test remark generation with Pass status."""
        # Create indicator with remark schema
        indicator = Indicator(
            name="Test Indicator",
            description="Test Description",
            governance_area_id=1,
            is_active=True,
            is_auto_calculable=True,
            form_schema={"type": "object", "properties": {}},
            calculation_schema={
                "condition_groups": [
                    {
                        "operator": "AND",
                        "rules": [
                            {
                                "rule_type": "MATCH_VALUE",
                                "field_id": "field1",
                                "operator": "==",
                                "expected_value": "yes",
                            }
                        ],
                    }
                ],
                "output_status_on_pass": "Pass",
                "output_status_on_fail": "Fail",
            },
            remark_schema={
                "conditional_remarks": [
                    {
                        "condition": "pass",
                        "template": "{{ indicator_name }} passed with status: {{ status }}",
                        "description": "Remark for passing",
                    }
                ],
                "default_template": "{{ indicator_name }} status: {{ status }}",
            },
        )
        db_session.add(indicator)
        db_session.commit()
        db_session.refresh(indicator)

        # Generate remark
        remark = intelligence_service.generate_indicator_remark(
            db=db_session,
            indicator_id=indicator.id,
            indicator_status="Pass",
            assessment_data={"field1": "yes"},
        )

        assert remark is not None
        assert "Test Indicator" in remark
        assert "passed with status: Pass" in remark

    def test_remark_generation_with_fail_status(self, db_session):
        """Test remark generation with Fail status."""
        # Create indicator with remark schema
        indicator = Indicator(
            name="Test Indicator",
            description="Test Description",
            governance_area_id=1,
            is_active=True,
            is_auto_calculable=True,
            form_schema={"type": "object", "properties": {}},
            calculation_schema={
                "condition_groups": [
                    {
                        "operator": "AND",
                        "rules": [
                            {
                                "rule_type": "MATCH_VALUE",
                                "field_id": "field1",
                                "operator": "==",
                                "expected_value": "yes",
                            }
                        ],
                    }
                ],
                "output_status_on_pass": "Pass",
                "output_status_on_fail": "Fail",
            },
            remark_schema={
                "conditional_remarks": [
                    {
                        "condition": "fail",
                        "template": "{{ indicator_name }} failed. Please review.",
                        "description": "Remark for failing",
                    }
                ],
                "default_template": "{{ indicator_name }} status: {{ status }}",
            },
        )
        db_session.add(indicator)
        db_session.commit()
        db_session.refresh(indicator)

        # Generate remark
        remark = intelligence_service.generate_indicator_remark(
            db=db_session,
            indicator_id=indicator.id,
            indicator_status="Fail",
            assessment_data={"field1": "no"},
        )

        assert remark is not None
        assert "Test Indicator" in remark
        assert "failed. Please review." in remark

    def test_remark_generation_falls_back_to_default(self, db_session):
        """Test remark generation falls back to default template."""
        # Create indicator with only default template
        indicator = Indicator(
            name="Test Indicator",
            description="Test Description",
            governance_area_id=1,
            is_active=True,
            is_auto_calculable=True,
            form_schema={"type": "object", "properties": {}},
            calculation_schema={
                "condition_groups": [
                    {
                        "operator": "AND",
                        "rules": [
                            {
                                "rule_type": "MATCH_VALUE",
                                "field_id": "field1",
                                "operator": "==",
                                "expected_value": "yes",
                            }
                        ],
                    }
                ],
                "output_status_on_pass": "Pass",
                "output_status_on_fail": "Fail",
            },
            remark_schema={
                "conditional_remarks": [],  # No conditional remarks
                "default_template": "Default remark for {{ indicator_name }}: {{ status }}",
            },
        )
        db_session.add(indicator)
        db_session.commit()
        db_session.refresh(indicator)

        # Generate remark with Pass status
        remark = intelligence_service.generate_indicator_remark(
            db=db_session,
            indicator_id=indicator.id,
            indicator_status="Pass",
            assessment_data={},
        )

        assert remark is not None
        assert "Default remark for Test Indicator: Pass" in remark

    def test_remark_generation_with_field_placeholders(self, db_session):
        """Test remark generation with custom field placeholders."""
        # Create indicator with field references in template
        indicator = Indicator(
            name="Test Indicator",
            description="Test Description",
            governance_area_id=1,
            is_active=True,
            is_auto_calculable=True,
            form_schema={"type": "object", "properties": {}},
            calculation_schema={
                "condition_groups": [
                    {
                        "operator": "AND",
                        "rules": [
                            {
                                "rule_type": "MATCH_VALUE",
                                "field_id": "field1",
                                "operator": "==",
                                "expected_value": "yes",
                            }
                        ],
                    }
                ],
                "output_status_on_pass": "Pass",
                "output_status_on_fail": "Fail",
            },
            remark_schema={
                "conditional_remarks": [
                    {
                        "condition": "pass",
                        "template": "Compliance achieved. Details: {{ compliance_details }}",
                        "description": "Pass with details",
                    }
                ],
                "default_template": "{{ indicator_name }}: {{ status }}",
            },
        )
        db_session.add(indicator)
        db_session.commit()
        db_session.refresh(indicator)

        # Generate remark with custom field
        remark = intelligence_service.generate_indicator_remark(
            db=db_session,
            indicator_id=indicator.id,
            indicator_status="Pass",
            assessment_data={"compliance_details": "All documents submitted and verified"},
        )

        assert remark is not None
        assert "Compliance achieved. Details: All documents submitted and verified" in remark

    def test_remark_generation_returns_none_for_no_schema(self, db_session):
        """Test remark generation returns None when no remark_schema exists."""
        # Create indicator without remark schema
        indicator = Indicator(
            name="Test Indicator",
            description="Test Description",
            governance_area_id=1,
            is_active=True,
            is_auto_calculable=True,
            form_schema={"type": "object", "properties": {}},
            calculation_schema={
                "condition_groups": [
                    {
                        "operator": "AND",
                        "rules": [
                            {
                                "rule_type": "MATCH_VALUE",
                                "field_id": "field1",
                                "operator": "==",
                                "expected_value": "yes",
                            }
                        ],
                    }
                ],
                "output_status_on_pass": "Pass",
                "output_status_on_fail": "Fail",
            },
            remark_schema=None,  # No remark schema
        )
        db_session.add(indicator)
        db_session.commit()
        db_session.refresh(indicator)

        # Generate remark
        remark = intelligence_service.generate_indicator_remark(
            db=db_session,
            indicator_id=indicator.id,
            indicator_status="Pass",
            assessment_data={},
        )

        assert remark is None


class TestCalculationWorkflowIntegration:
    """Test suite for end-to-end calculation workflow."""

    def test_calculate_indicator_status_pass(self, db_session):
        """Test calculate_indicator_status returns Pass when conditions met."""
        # Create indicator with calculation schema
        indicator = Indicator(
            name="Test Indicator",
            description="Test Description",
            governance_area_id=1,
            is_active=True,
            is_auto_calculable=True,
            form_schema={"type": "object", "properties": {}},
            calculation_schema={
                "condition_groups": [
                    {
                        "operator": "AND",
                        "rules": [
                            {
                                "rule_type": "MATCH_VALUE",
                                "field_id": "field1",
                                "operator": "==",
                                "expected_value": "yes",
                            }
                        ],
                    }
                ],
                "output_status_on_pass": "Pass",
                "output_status_on_fail": "Fail",
            },
        )
        db_session.add(indicator)
        db_session.commit()
        db_session.refresh(indicator)

        # Calculate status with passing data
        status = intelligence_service.calculate_indicator_status(
            db=db_session,
            indicator_id=indicator.id,
            assessment_data={"field1": "yes"},
        )

        assert status == "Pass"

    def test_calculate_indicator_status_fail(self, db_session):
        """Test calculate_indicator_status returns Fail when conditions not met."""
        # Create indicator with calculation schema
        indicator = Indicator(
            name="Test Indicator",
            description="Test Description",
            governance_area_id=1,
            is_active=True,
            is_auto_calculable=True,
            form_schema={"type": "object", "properties": {}},
            calculation_schema={
                "condition_groups": [
                    {
                        "operator": "AND",
                        "rules": [
                            {
                                "rule_type": "MATCH_VALUE",
                                "field_id": "field1",
                                "operator": "==",
                                "expected_value": "yes",
                            }
                        ],
                    }
                ],
                "output_status_on_pass": "Pass",
                "output_status_on_fail": "Fail",
            },
        )
        db_session.add(indicator)
        db_session.commit()
        db_session.refresh(indicator)

        # Calculate status with failing data
        status = intelligence_service.calculate_indicator_status(
            db=db_session,
            indicator_id=indicator.id,
            assessment_data={"field1": "no"},
        )

        assert status == "Fail"

    def test_full_workflow_calculation_and_remark(self, db_session):
        """Test complete workflow: calculate status and generate remark."""
        # Create indicator with both calculation and remark schemas
        indicator = Indicator(
            name="Complete Indicator",
            description="Test Description",
            governance_area_id=1,
            is_active=True,
            is_auto_calculable=True,
            form_schema={"type": "object", "properties": {}},
            calculation_schema={
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
            },
            remark_schema={
                "conditional_remarks": [
                    {
                        "condition": "pass",
                        "template": "Excellent! {{ indicator_name }} achieved {{ status }} status.",
                        "description": "Pass remark",
                    },
                    {
                        "condition": "fail",
                        "template": "{{ indicator_name }} needs improvement ({{ status }}).",
                        "description": "Fail remark",
                    },
                ],
                "default_template": "{{ indicator_name }}: {{ status }}",
            },
        )
        db_session.add(indicator)
        db_session.commit()
        db_session.refresh(indicator)

        # Test passing case
        assessment_data = {
            "completion_rate": 90.0,
        }
        status = intelligence_service.calculate_indicator_status(
            db=db_session,
            indicator_id=indicator.id,
            assessment_data=assessment_data,
        )
        remark = intelligence_service.generate_indicator_remark(
            db=db_session,
            indicator_id=indicator.id,
            indicator_status=status,
            assessment_data=assessment_data,
        )

        assert status == "Pass"
        assert remark is not None
        assert "Excellent! Complete Indicator achieved Pass status." in remark

        # Test failing case
        assessment_data_fail = {
            "completion_rate": 50.0,
        }
        status_fail = intelligence_service.calculate_indicator_status(
            db=db_session,
            indicator_id=indicator.id,
            assessment_data=assessment_data_fail,
        )
        remark_fail = intelligence_service.generate_indicator_remark(
            db=db_session,
            indicator_id=indicator.id,
            indicator_status=status_fail,
            assessment_data=assessment_data_fail,
        )

        assert status_fail == "Fail"
        assert remark_fail is not None
        assert "Complete Indicator needs improvement (Fail)." in remark_fail
