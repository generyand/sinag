# 📅 Assessment Year Configuration Schemas
# Pydantic models for assessment year configuration API requests/responses

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# =============================================================================
# Assessment Year Configuration Schemas
# =============================================================================


class AssessmentYearConfigBase(BaseModel):
    """Base schema for assessment year configuration."""

    current_assessment_year: int = Field(
        ..., ge=2020, le=2100, description="Assessment year (e.g., 2025)"
    )
    assessment_period_start: datetime = Field(
        ..., description="Start of the assessment period"
    )
    assessment_period_end: datetime = Field(
        ..., description="End of the assessment period"
    )
    description: Optional[str] = Field(
        None, max_length=500, description="Optional description for this configuration"
    )


class AssessmentYearConfigCreate(AssessmentYearConfigBase):
    """Schema for creating a new assessment year configuration."""

    activate: bool = Field(
        False, description="Whether to activate this configuration immediately"
    )


class AssessmentYearConfigUpdate(BaseModel):
    """Schema for updating an assessment year configuration."""

    assessment_period_start: Optional[datetime] = Field(
        None, description="New start of the assessment period"
    )
    assessment_period_end: Optional[datetime] = Field(
        None, description="New end of the assessment period"
    )
    description: Optional[str] = Field(
        None, max_length=500, description="New description"
    )


class UserNested(BaseModel):
    """Nested user schema for config responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class AssessmentYearConfigResponse(BaseModel):
    """Response schema for assessment year configuration."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    current_assessment_year: int
    assessment_period_start: datetime
    assessment_period_end: datetime
    is_active: bool
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    activated_at: Optional[datetime] = None
    deactivated_at: Optional[datetime] = None

    # Nested user relationships
    activated_by: Optional[UserNested] = None
    deactivated_by: Optional[UserNested] = None


class AssessmentYearConfigListResponse(BaseModel):
    """Response schema for listing assessment year configurations."""

    configs: list[AssessmentYearConfigResponse]
    active_year: Optional[int] = Field(
        None, description="Currently active assessment year"
    )


# =============================================================================
# Assessment Indicator Snapshot Schemas
# =============================================================================


class AssessmentIndicatorSnapshotResponse(BaseModel):
    """Response schema for assessment indicator snapshots."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    assessment_id: int
    indicator_id: int
    indicator_version: int
    assessment_year: int

    # Indicator identity
    indicator_code: Optional[str] = None
    name: str
    description: Optional[str] = None

    # Indicator flags
    is_active: bool
    is_auto_calculable: bool
    is_profiling_only: bool
    is_bbi: bool
    validation_rule: str

    # Resolved schemas (with year placeholders replaced)
    form_schema_resolved: Optional[dict[str, Any]] = None
    calculation_schema_resolved: Optional[dict[str, Any]] = None
    remark_schema_resolved: Optional[dict[str, Any]] = None
    technical_notes_resolved: Optional[str] = None

    # Resolved checklist items
    checklist_items_resolved: Optional[list[dict[str, Any]]] = None

    # Hierarchy info
    governance_area_id: int
    parent_id: Optional[int] = None

    created_at: datetime


class AssessmentSnapshotSummary(BaseModel):
    """Summary schema for assessment snapshots."""

    assessment_id: int
    assessment_year: int
    snapshot_count: int = Field(
        ..., description="Number of indicator snapshots for this assessment"
    )
    created_at: datetime


# =============================================================================
# Year Placeholder Resolution Schemas
# =============================================================================


class YearPlaceholderInfo(BaseModel):
    """Information about available year placeholders."""

    placeholder: str = Field(..., description="Placeholder syntax (e.g., {CURRENT_YEAR})")
    description: str = Field(..., description="Description of what this placeholder resolves to")
    example_value: str = Field(..., description="Example resolved value for current year")


class YearResolutionPreview(BaseModel):
    """Preview of year placeholder resolution for a given year."""

    assessment_year: int = Field(..., description="The assessment year used for resolution")
    previous_year: int = Field(..., description="The previous year (assessment_year - 1)")
    placeholders: list[YearPlaceholderInfo] = Field(
        ..., description="List of all available placeholders with resolved values"
    )


class ResolveTextRequest(BaseModel):
    """Request schema for resolving year placeholders in text."""

    text: str = Field(..., description="Text containing year placeholders to resolve")
    assessment_year: Optional[int] = Field(
        None, description="Specific year for resolution (uses active config if not provided)"
    )


class ResolveTextResponse(BaseModel):
    """Response schema for resolved text."""

    original_text: str
    resolved_text: str
    assessment_year: int
    placeholders_found: list[str] = Field(
        ..., description="List of placeholders that were resolved"
    )


class ResolveSchemaRequest(BaseModel):
    """Request schema for resolving year placeholders in a schema."""

    schema_data: dict[str, Any] = Field(
        ..., description="Schema dictionary containing year placeholders"
    )
    assessment_year: Optional[int] = Field(
        None, description="Specific year for resolution (uses active config if not provided)"
    )


class ResolveSchemaResponse(BaseModel):
    """Response schema for resolved schema."""

    original_schema: dict[str, Any]
    resolved_schema: dict[str, Any]
    assessment_year: int
