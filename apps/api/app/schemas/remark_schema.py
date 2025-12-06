"""
Remark Schema Pydantic Models

This module defines the Pydantic models for the remark generation system.
It allows MLGOO users to define conditional remarks that are automatically
generated based on assessment results.

Remark Structure:
- Conditional remarks: Different templates based on Pass/Fail status
- Default remark: Fallback template if no conditions match
- Template placeholders: Dynamic values from assessment data
"""

from pydantic import BaseModel, Field


class ConditionalRemark(BaseModel):
    """
    Conditional Remark: A remark template that is used when a specific condition is met.

    Conditions can be:
    - "pass": Use this template when indicator passes
    - "fail": Use this template when indicator fails

    Templates support Jinja2 placeholders for dynamic content:
    - {{ indicator_name }}: Name of the indicator
    - {{ field_name }}: Value from form fields
    - {{ score }}: Numeric score (if applicable)
    - {{ status }}: Pass/Fail status
    """

    condition: str = Field(
        ...,
        description="Condition when this remark should be used (e.g., 'pass', 'fail')",
        min_length=1,
        max_length=50,
    )
    template: str = Field(
        ...,
        description="Jinja2 template for the remark with placeholder support",
        min_length=1,
        max_length=2000,
    )
    description: str | None = Field(
        None,
        max_length=500,
        description="Human-readable description of when this remark is used",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "condition": "pass",
                "template": "{{ indicator_name }} has been successfully completed with a score of {{ score }}%.",
                "description": "Remark for passing assessments",
            }
        }


class RemarkSchema(BaseModel):
    """
    Root model for remark schema.

    Defines the remark generation logic for an indicator, including
    conditional remarks based on Pass/Fail status and a default fallback.

    Evaluation Logic:
    1. Check indicator status (Pass/Fail)
    2. Find matching conditional remark
    3. If no match, use default_template
    4. Render template with assessment data
    """

    conditional_remarks: list[ConditionalRemark] = Field(
        default_factory=list,
        description="List of conditional remark templates",
    )
    default_template: str = Field(
        ...,
        description="Default remark template used when no conditions match",
        min_length=1,
        max_length=2000,
    )

    class Config:
        json_schema_extra = {
            "example": {
                "conditional_remarks": [
                    {
                        "condition": "pass",
                        "template": "Congratulations! {{ indicator_name }} has been successfully completed.",
                        "description": "Success message",
                    },
                    {
                        "condition": "fail",
                        "template": "{{ indicator_name }} requires improvement. Please review the feedback provided.",
                        "description": "Failure message",
                    },
                ],
                "default_template": "{{ indicator_name }} assessment is under review.",
            }
        }
