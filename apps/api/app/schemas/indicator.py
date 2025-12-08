# 📊 Indicator Schemas
# Pydantic models for indicator-related API requests and responses

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.calculation_schema import CalculationSchema
from app.schemas.form_schema import FormSchema
from app.schemas.remark_schema import RemarkSchema


class GovernanceAreaNested(BaseModel):
    """Nested governance area for indicator responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    area_type: str


class IndicatorBase(BaseModel):
    """Base indicator schema with common fields."""

    name: str = Field(..., min_length=3, description="Indicator name (min 3 characters)")
    description: str | None = Field(None, description="Indicator description")
    governance_area_id: int = Field(..., description="ID of governance area")
    parent_id: int | None = Field(
        None, description="Parent indicator ID for hierarchical structure"
    )
    is_active: bool = Field(True, description="Active status")
    is_profiling_only: bool = Field(False, description="Profiling-only flag")
    is_auto_calculable: bool = Field(False, description="Auto-calculable Pass/Fail flag")
    technical_notes_text: str | None = Field(None, description="Technical notes (plain text)")


class IndicatorCreate(IndicatorBase):
    """Schema for creating a new indicator."""

    form_schema: FormSchema | None = Field(
        None, description="Form schema with validated field types"
    )
    calculation_schema: CalculationSchema | None = Field(
        None, description="Calculation schema with validated rules"
    )
    remark_schema: RemarkSchema | None = Field(
        None, description="Remark schema with validated templates"
    )


class IndicatorUpdate(BaseModel):
    """Schema for updating an indicator (all fields optional)."""

    name: str | None = Field(None, min_length=3)
    description: str | None = None
    governance_area_id: int | None = None
    parent_id: int | None = None
    is_active: bool | None = None
    is_profiling_only: bool | None = None
    is_auto_calculable: bool | None = None
    form_schema: FormSchema | None = Field(
        None, description="Form schema with validated field types"
    )
    calculation_schema: CalculationSchema | None = Field(
        None, description="Calculation schema with validated rules"
    )
    remark_schema: RemarkSchema | None = Field(
        None, description="Remark schema with validated templates"
    )
    technical_notes_text: str | None = None


class IndicatorNestedParent(BaseModel):
    """Nested parent indicator (minimal to avoid circular references)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    version: int


class IndicatorResponse(BaseModel):
    """Response schema for indicator endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    version: int
    is_active: bool
    is_profiling_only: bool
    is_auto_calculable: bool
    form_schema: dict[str, Any] | None = Field(None, description="Form schema (JSON)")
    calculation_schema: dict[str, Any] | None = None
    remark_schema: dict[str, Any] | None = None
    technical_notes_text: str | None = None
    governance_area_id: int
    parent_id: int | None = None
    created_at: datetime
    updated_at: datetime

    # Nested relationships
    governance_area: GovernanceAreaNested | None = None
    parent: IndicatorNestedParent | None = None


class UserNested(BaseModel):
    """Nested user for history responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class IndicatorHistoryResponse(BaseModel):
    """Response schema for indicator version history."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    indicator_id: int
    version: int
    name: str
    description: str | None = None
    is_active: bool
    is_auto_calculable: bool
    is_profiling_only: bool
    form_schema: dict[str, Any] | None = Field(None, description="Form schema (JSON)")
    calculation_schema: dict[str, Any] | None = None
    remark_schema: dict[str, Any] | None = None
    technical_notes_text: str | None = None
    governance_area_id: int
    parent_id: int | None = None
    archived_at: datetime
    archived_by: int | None = None

    # Nested relationships
    archived_by_user: UserNested | None = None


class FormSchemaMetadata(BaseModel):
    """Metadata for form schema response."""

    title: str = Field(..., description="Indicator title/name")
    description: str | None = Field(None, description="Indicator description")
    governance_area_name: str | None = Field(None, description="Governance area name")


class FormSchemaResponse(BaseModel):
    """Response schema for GET /indicators/{id}/form-schema endpoint.

    Returns form schema with metadata for BLGU users to complete assessments.
    Does NOT include calculation_schema or remark_schema (assessor-only fields).
    """

    indicator_id: int = Field(..., description="Indicator ID")
    form_schema: dict[str, Any] = Field(..., description="Form schema JSON structure")
    metadata: FormSchemaMetadata = Field(..., description="Indicator metadata")


# =============================================================================
# Hard-Coded Indicator Schemas (Simplified Approach)
# =============================================================================


class ChecklistItemResponse(BaseModel):
    """Response schema for individual checklist items."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: str = Field(..., description="Unique item identifier (e.g., '1_1_1_a')")
    label: str = Field(..., description="Display text (e.g., 'a. Barangay Financial Report')")
    item_type: str = Field(
        default="checkbox",
        description="Type of checklist item (checkbox, info_text, assessment_field, document_count, calculation_field)",
    )
    group_name: str | None = Field(None, description="Group header (e.g., 'ANNUAL REPORT')")
    mov_description: str | None = Field(None, description="Means of Verification description")
    required: bool = Field(..., description="Required for indicator to pass")
    requires_document_count: bool = Field(
        ..., description="Needs document count input from validator"
    )
    display_order: int = Field(..., description="Sort order within indicator")
    option_group: str | None = Field(
        None, description="Option group for OR logic (e.g., 'Option A', 'Option B')"
    )
    field_notes: dict | None = Field(
        None, description="Notes displayed below this field (e.g., CONSIDERATION)"
    )


class SimplifiedIndicatorResponse(BaseModel):
    """Simplified response schema for hard-coded indicators."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    indicator_code: str = Field(..., description="Indicator code (e.g., '1.1', '1.1.1')")
    name: str
    description: str | None = None
    governance_area_id: int
    parent_id: int | None = None
    is_bbi: bool = Field(..., description="Is this a BBI indicator")
    is_active: bool
    validation_rule: str = Field(..., description="Validation strategy")

    # Nested relationships
    governance_area: GovernanceAreaNested | None = None
    checklist_items: list[ChecklistItemResponse] = Field(
        default_factory=list, description="MOV checklist items"
    )
    children: list["SimplifiedIndicatorResponse"] = Field(
        default_factory=list, description="Child indicators"
    )


class IndicatorTreeResponse(BaseModel):
    """Response schema for full indicator tree (parent with all children and checklist items)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    indicator_code: str
    name: str
    description: str | None = None
    governance_area_id: int
    is_bbi: bool
    is_active: bool
    children: list[SimplifiedIndicatorResponse] = Field(
        ..., description="Sub-indicators with checklists"
    )
    governance_area: GovernanceAreaNested | None = None


# Enable forward references for recursive model
SimplifiedIndicatorResponse.model_rebuild()
