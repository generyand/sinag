"""
📋 MOV Checklist Schema Definitions

Pydantic schemas for 9 MOV (Means of Verification) item types
aligned with Indicator Builder Specification v1.4.

MOV Item Types:
1. checkbox - Simple yes/no verification
2. group - Logical grouping with OR logic support
3. currency_input - PHP monetary values with threshold validation
4. number_input - Numeric values with min/max/threshold
5. text_input - Free text fields
6. date_input - Date fields with grace period handling
7. assessment - YES/NO radio for validator judgment
8. radio_group - Single selection from options
9. dropdown - Dropdown selection
"""

from datetime import date
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field, field_validator


# =============================================================================
# Common Base Schemas
# =============================================================================


class DisplayCondition(BaseModel):
    """
    Conditional display logic for MOV items.

    Example: Show item only if another field equals specific value.
    {
        "field_id": "has_budget",
        "operator": "equals",
        "value": true
    }
    """
    field_id: str = Field(..., description="ID of field to check")
    operator: Literal["equals", "not_equals", "contains", "greater_than", "less_than"] = Field(
        ..., description="Comparison operator"
    )
    value: Any = Field(..., description="Value to compare against")


class OptionItem(BaseModel):
    """Option for radio groups and dropdowns."""
    label: str = Field(..., min_length=1, description="Display label for option")
    value: str = Field(..., description="Value submitted when option selected")


class MOVItemBase(BaseModel):
    """Base schema for all MOV item types with common fields."""

    id: str = Field(..., description="Unique identifier for this MOV item")
    type: str = Field(..., description="MOV item type discriminator")
    label: str = Field(..., min_length=1, max_length=500, description="Label displayed to validator")
    required: bool = Field(default=True, description="Whether this item must be completed")
    help_text: Optional[str] = Field(None, max_length=1000, description="Help text for validators")
    display_condition: Optional[DisplayCondition] = Field(
        None, description="Conditional display logic"
    )


# =============================================================================
# MOV Item Type Schemas (9 Types)
# =============================================================================


class MOVCheckboxItem(MOVItemBase):
    """
    Simple checkbox for yes/no verification.

    Example: "BFR signed and stamped by C/M Accountant"
    """
    type: Literal["checkbox"] = "checkbox"
    default_value: bool = Field(default=False, description="Default checked state")


class MOVGroupItem(MOVItemBase):
    """
    Logical grouping with OR logic support.

    Used to group related items where only some need to pass (OR logic).
    Example: "Posted CY 2023 financial documents (any 5 of 7)"
    """
    type: Literal["group"] = "group"
    logic_operator: Literal["AND", "OR"] = Field(
        default="AND", description="How to combine child validations"
    )
    min_required: Optional[int] = Field(
        None, ge=1, description="Minimum items required to pass (for OR logic)"
    )
    children: List["MOVItem"] = Field(
        default_factory=list, description="Child MOV items in this group"
    )

    @field_validator("min_required")
    @classmethod
    def validate_min_required(cls, v, info):
        """Ensure min_required is set for OR logic."""
        logic_operator = info.data.get("logic_operator")
        if logic_operator == "OR" and v is None:
            raise ValueError("min_required must be set when logic_operator is OR")
        if logic_operator == "AND" and v is not None:
            raise ValueError("min_required should not be set when logic_operator is AND")
        return v


class MOVCurrencyInputItem(MOVItemBase):
    """
    Currency input with threshold validation for "Considered" status.

    Example: "Annual budget amount (threshold: ₱500,000 for 'Passed')"
    Validation Logic:
    - value >= threshold → "Passed"
    - min_value <= value < threshold → "Considered"
    - value < min_value → "Failed"
    """
    type: Literal["currency_input"] = "currency_input"
    min_value: Optional[float] = Field(None, description="Minimum acceptable value")
    max_value: Optional[float] = Field(None, description="Maximum acceptable value")
    threshold: Optional[float] = Field(
        None, description="Threshold for 'Passed' vs 'Considered' status"
    )
    currency_code: Literal["PHP"] = Field(
        default="PHP", description="Currency code (PHP only for now)"
    )

    @field_validator("max_value")
    @classmethod
    def validate_max_value(cls, v, info):
        """Ensure max_value > min_value."""
        min_value = info.data.get("min_value")
        if v is not None and min_value is not None and v <= min_value:
            raise ValueError("max_value must be greater than min_value")
        return v


class MOVNumberInputItem(MOVItemBase):
    """
    Numeric input with threshold validation and optional unit.

    Example: "Trees planted this year (threshold: 100)"
    """
    type: Literal["number_input"] = "number_input"
    min_value: Optional[float] = Field(None, description="Minimum acceptable value")
    max_value: Optional[float] = Field(None, description="Maximum acceptable value")
    threshold: Optional[float] = Field(
        None, description="Threshold for 'Passed' vs 'Considered' status"
    )
    unit: Optional[str] = Field(None, max_length=50, description="Unit label (e.g., 'trees', 'kg')")

    @field_validator("max_value")
    @classmethod
    def validate_max_value(cls, v, info):
        """Ensure max_value > min_value."""
        min_value = info.data.get("min_value")
        if v is not None and min_value is not None and v <= min_value:
            raise ValueError("max_value must be greater than min_value")
        return v


class MOVTextInputItem(MOVItemBase):
    """
    Free text input with optional validation pattern.

    Example: "Barangay Resolution Number"
    """
    type: Literal["text_input"] = "text_input"
    placeholder: Optional[str] = Field(None, max_length=200, description="Placeholder text")
    max_length: Optional[int] = Field(None, ge=1, le=10000, description="Maximum character count")
    validation_pattern: Optional[str] = Field(
        None, description="Regex pattern for validation (e.g., for resolution numbers)"
    )


class MOVDateInputItem(MOVItemBase):
    """
    Date input with grace period handling.

    Example: "Appropriation Ordinance approval date (grace period: 90 days)"
    Validation Logic:
    - date on or before deadline → "Passed"
    - date within grace period → "Considered"
    - date after grace period → "Failed"
    """
    type: Literal["date_input"] = "date_input"
    min_date: Optional[date] = Field(None, description="Earliest acceptable date")
    max_date: Optional[date] = Field(None, description="Latest acceptable date (deadline)")
    grace_period_days: Optional[int] = Field(
        None, ge=0, description="Grace period in days after deadline"
    )
    considered_status_enabled: bool = Field(
        default=True, description="Whether to use 'Considered' status for grace period"
    )

    @field_validator("grace_period_days")
    @classmethod
    def validate_grace_period(cls, v, info):
        """Ensure grace period is set when considered status is enabled."""
        considered_enabled = info.data.get("considered_status_enabled")
        if considered_enabled and v is None:
            raise ValueError(
                "grace_period_days must be set when considered_status_enabled is True"
            )
        return v


class MOVAssessmentItem(MOVItemBase):
    """
    YES/NO radio for validator judgment.

    Semantically different from RadioGroupItem - used for validator's assessment
    of compliance rather than data collection.

    Example: "BDRRMC is organized and functional (Assessor judgment)"
    """
    type: Literal["assessment"] = "assessment"
    assessment_type: Literal["YES_NO", "COMPLIANT_NON_COMPLIANT"] = Field(
        default="YES_NO", description="Type of assessment judgment"
    )


class MOVRadioGroupItem(MOVItemBase):
    """
    Single selection radio button group.

    Example: "Type of business permit: [New, Renewal, Amendment]"
    """
    type: Literal["radio_group"] = "radio_group"
    options: List[OptionItem] = Field(..., min_length=2, description="Radio button options")
    default_value: Optional[str] = Field(None, description="Default selected option value")

    @field_validator("options")
    @classmethod
    def validate_unique_values(cls, v):
        """Ensure option values are unique."""
        values = [opt.value for opt in v]
        if len(values) != len(set(values)):
            raise ValueError("Option values must be unique")
        return v


class MOVDropdownItem(MOVItemBase):
    """
    Dropdown selection with optional multi-select and search.

    Example: "Select required documents: [Dropdown with 20+ options, searchable]"
    """
    type: Literal["dropdown"] = "dropdown"
    options: List[OptionItem] = Field(..., min_length=1, description="Dropdown options")
    allow_multiple: bool = Field(
        default=False, description="Allow selecting multiple options"
    )
    searchable: bool = Field(
        default=False, description="Enable search functionality for large option lists"
    )

    @field_validator("options")
    @classmethod
    def validate_unique_values(cls, v):
        """Ensure option values are unique."""
        values = [opt.value for opt in v]
        if len(values) != len(set(values)):
            raise ValueError("Option values must be unique")
        return v


# =============================================================================
# Discriminated Union and Config
# =============================================================================


# Discriminated union of all MOV item types
MOVItem = Union[
    MOVCheckboxItem,
    MOVGroupItem,
    MOVCurrencyInputItem,
    MOVNumberInputItem,
    MOVTextInputItem,
    MOVDateInputItem,
    MOVAssessmentItem,
    MOVRadioGroupItem,
    MOVDropdownItem,
]

# Update forward references for recursive types
MOVGroupItem.model_rebuild()


class MOVChecklistConfig(BaseModel):
    """
    Complete MOV checklist configuration for an indicator.

    Stored in Indicator.mov_checklist_items JSONB field.
    """
    items: List[MOVItem] = Field(default_factory=list, description="List of MOV items")
    validation_mode: Literal["strict", "lenient"] = Field(
        default="strict",
        description="Validation mode: 'strict' requires all items, 'lenient' allows partial completion"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "items": [
                    {
                        "id": "item-1",
                        "type": "checkbox",
                        "label": "Barangay Financial Report posted",
                        "required": True,
                        "default_value": False,
                    },
                    {
                        "id": "item-2",
                        "type": "group",
                        "label": "Posted CY 2023 financial documents (any 5 of 7)",
                        "required": True,
                        "logic_operator": "OR",
                        "min_required": 5,
                        "children": [
                            {
                                "id": "item-2-1",
                                "type": "checkbox",
                                "label": "a) Barangay Financial Report",
                                "required": False,
                                "default_value": False,
                            },
                            {
                                "id": "item-2-2",
                                "type": "checkbox",
                                "label": "b) Barangay Budget",
                                "required": False,
                                "default_value": False,
                            },
                        ],
                    },
                    {
                        "id": "item-3",
                        "type": "currency_input",
                        "label": "Annual budget amount",
                        "required": True,
                        "min_value": 100000.0,
                        "threshold": 500000.0,
                        "currency_code": "PHP",
                    },
                    {
                        "id": "item-4",
                        "type": "date_input",
                        "label": "Appropriation Ordinance approval date",
                        "required": True,
                        "max_date": "2022-12-31",
                        "grace_period_days": 90,
                        "considered_status_enabled": True,
                    },
                ],
                "validation_mode": "strict",
            }
        }


# =============================================================================
# Validation Status Enum
# =============================================================================


class MOVValidationStatus(BaseModel):
    """Result of MOV checklist validation."""

    status: Literal["Passed", "Considered", "Failed", "Not Applicable", "Pending"] = Field(
        ..., description="Overall validation status"
    )
    item_results: Dict[str, str] = Field(
        default_factory=dict, description="Validation status for each item by ID"
    )
    errors: List[str] = Field(
        default_factory=list, description="List of validation error messages"
    )
    warnings: List[str] = Field(
        default_factory=list, description="List of validation warning messages"
    )
