"""
Calculation Schema Pydantic Models

This module defines the Pydantic models for the calculation rule engine.
It supports 6 rule types that can be composed into nested condition groups
to determine Pass/Fail status for auto-calculable indicators.

Rule Types:
- AND_ALL: All conditions must be true
- OR_ANY: At least one condition must be true
- PERCENTAGE_THRESHOLD: Number field must meet threshold (e.g., >= 75%)
- COUNT_THRESHOLD: Count of selected checkboxes must meet threshold
- MATCH_VALUE: Field value must match expected value
- BBI_FUNCTIONALITY_CHECK: Check if BBI is Functional (Epic 4 dependency)
"""

from typing import Literal, Optional, List, Union, Annotated, Any
from pydantic import BaseModel, Field, field_validator


class RuleBase(BaseModel):
    """Base model for all calculation rules with common attributes"""
    rule_type: str = Field(..., description="Discriminator field for rule type")
    description: Optional[str] = Field(None, max_length=500, description="Human-readable description of the rule")

    class Config:
        use_enum_values = True


class AndAllRule(RuleBase):
    """
    AND_ALL Rule: All nested conditions must evaluate to true.
    Used to create compound conditions where every rule must pass.

    Example: "Pass if completion rate >= 80% AND all required documents uploaded"
    """
    rule_type: Literal["AND_ALL"] = "AND_ALL"
    conditions: List["CalculationRule"] = Field(
        ...,
        min_length=2,
        description="List of rules that must all be true"
    )

    @field_validator("conditions")
    @classmethod
    def validate_conditions_not_empty(cls, v):
        if not v or len(v) < 2:
            raise ValueError("AND_ALL rule must have at least 2 conditions")
        return v


class OrAnyRule(RuleBase):
    """
    OR_ANY Rule: At least one nested condition must evaluate to true.
    Used to create alternative conditions where any single rule passing is sufficient.

    Example: "Pass if either completion rate >= 80% OR external validation present"
    """
    rule_type: Literal["OR_ANY"] = "OR_ANY"
    conditions: List["CalculationRule"] = Field(
        ...,
        min_length=2,
        description="List of rules where at least one must be true"
    )

    @field_validator("conditions")
    @classmethod
    def validate_conditions_not_empty(cls, v):
        if not v or len(v) < 2:
            raise ValueError("OR_ANY rule must have at least 2 conditions")
        return v


class PercentageThresholdRule(RuleBase):
    """
    PERCENTAGE_THRESHOLD Rule: Check if a number field meets a percentage threshold.
    Typically used for completion rates, compliance percentages, etc.

    Example: "Pass if completion_rate >= 75"
    """
    rule_type: Literal["PERCENTAGE_THRESHOLD"] = "PERCENTAGE_THRESHOLD"
    field_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="ID of the number field to check (must reference form_schema field)"
    )
    operator: Literal[">=", ">", "<=", "<", "=="] = Field(
        ...,
        description="Comparison operator"
    )
    threshold: float = Field(
        ...,
        ge=0,
        le=100,
        description="Percentage threshold value (0-100)"
    )

    @field_validator("threshold")
    @classmethod
    def validate_threshold_range(cls, v):
        if v < 0 or v > 100:
            raise ValueError("Threshold must be between 0 and 100")
        return v


class CountThresholdRule(RuleBase):
    """
    COUNT_THRESHOLD Rule: Check if the count of selected checkboxes meets a threshold.
    Used to ensure a minimum number of items are selected from a checkbox group.

    Example: "Pass if at least 3 checkboxes selected from required_documents field"
    """
    rule_type: Literal["COUNT_THRESHOLD"] = "COUNT_THRESHOLD"
    field_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="ID of the checkbox_group field to count (must reference form_schema field)"
    )
    operator: Literal[">=", ">", "<=", "<", "=="] = Field(
        ...,
        description="Comparison operator"
    )
    threshold: int = Field(
        ...,
        ge=0,
        description="Minimum/maximum count of selected checkboxes"
    )

    @field_validator("threshold")
    @classmethod
    def validate_threshold_non_negative(cls, v):
        if v < 0:
            raise ValueError("Threshold must be non-negative")
        return v


class MatchValueRule(RuleBase):
    """
    MATCH_VALUE Rule: Check if a field's value matches an expected value.
    Works with text, radio buttons, or any field with discrete values.

    Example: "Pass if status field == 'approved'"
    """
    rule_type: Literal["MATCH_VALUE"] = "MATCH_VALUE"
    field_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="ID of the field to check (must reference form_schema field)"
    )
    operator: Literal["==", "!=", "contains", "not_contains"] = Field(
        ...,
        description="Comparison operator"
    )
    expected_value: Any = Field(
        ...,
        description="Expected value to match (type depends on field type)"
    )


class BBIFunctionalityCheckRule(RuleBase):
    """
    BBI_FUNCTIONALITY_CHECK Rule: Check if a specific BBI is marked as Functional.
    This is a placeholder for Epic 4 BBI integration.

    Example: "Pass if BBI #42 has status == 'Functional'"
    """
    rule_type: Literal["BBI_FUNCTIONALITY_CHECK"] = "BBI_FUNCTIONALITY_CHECK"
    bbi_id: int = Field(
        ...,
        ge=1,
        description="ID of the BBI to check (Epic 4 dependency)"
    )
    expected_status: Literal["Functional", "Non-Functional"] = Field(
        ...,
        description="Expected BBI status"
    )


# Type alias for all rule types using discriminated union
CalculationRule = Annotated[
    Union[
        AndAllRule,
        OrAnyRule,
        PercentageThresholdRule,
        CountThresholdRule,
        MatchValueRule,
        BBIFunctionalityCheckRule,
    ],
    Field(discriminator="rule_type")
]


class ConditionGroup(BaseModel):
    """
    Condition Group: A logical grouping of rules with AND/OR operator.
    Supports nesting for complex logic like: (A AND B) OR (C AND D)
    """
    operator: Literal["AND", "OR"] = Field(
        ...,
        description="Logical operator for combining rules in this group"
    )
    rules: List[CalculationRule] = Field(
        ...,
        min_length=1,
        description="List of rules in this condition group"
    )

    @field_validator("rules")
    @classmethod
    def validate_rules_not_empty(cls, v):
        if not v or len(v) == 0:
            raise ValueError("Condition group must have at least one rule")
        return v


class CalculationSchema(BaseModel):
    """
    Root model for calculation schema.
    Defines the logic tree for determining Pass/Fail status of an indicator.

    The schema consists of condition groups that can be nested to create
    complex evaluation logic. The output_status_on_pass defines what status
    to assign when all conditions evaluate to true.
    """
    condition_groups: List[ConditionGroup] = Field(
        ...,
        min_length=1,
        description="Top-level condition groups (evaluated with implicit AND)"
    )
    output_status_on_pass: Literal["PASS", "FAIL"] = Field(
        default="PASS",
        description="Status to assign when conditions are met (matches ValidationStatus enum)"
    )
    output_status_on_fail: Literal["PASS", "FAIL"] = Field(
        default="FAIL",
        description="Status to assign when conditions are not met (matches ValidationStatus enum)"
    )

    @field_validator("condition_groups")
    @classmethod
    def validate_condition_groups_not_empty(cls, v):
        if not v or len(v) == 0:
            raise ValueError("Calculation schema must have at least one condition group")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "condition_groups": [
                    {
                        "operator": "AND",
                        "rules": [
                            {
                                "rule_type": "PERCENTAGE_THRESHOLD",
                                "field_id": "completion_rate",
                                "operator": ">=",
                                "threshold": 75.0,
                                "description": "Completion rate must be at least 75%"
                            },
                            {
                                "rule_type": "COUNT_THRESHOLD",
                                "field_id": "required_documents",
                                "operator": ">=",
                                "threshold": 3,
                                "description": "At least 3 required documents must be uploaded"
                            }
                        ]
                    }
                ],
                "output_status_on_pass": "PASS",
                "output_status_on_fail": "FAIL"
            }
        }


# Enable forward references for recursive types (AndAllRule and OrAnyRule contain CalculationRule)
AndAllRule.model_rebuild()
OrAnyRule.model_rebuild()
