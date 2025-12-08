# 📅 Assessment Year Schemas
# Pydantic models for unified assessment year API requests/responses
# This replaces the separate AssessmentYearConfig and AssessmentCycle schemas

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# =============================================================================
# Nested Schemas
# =============================================================================


class UserNested(BaseModel):
    """Nested user schema for year responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


# =============================================================================
# Assessment Year Schemas
# =============================================================================


class AssessmentYearBase(BaseModel):
    """Base schema for assessment year."""

    year: int = Field(..., ge=2020, le=2100, description="Assessment year (e.g., 2025)")
    assessment_period_start: datetime = Field(..., description="Start of the assessment period")
    assessment_period_end: datetime = Field(..., description="End of the assessment period")
    phase1_deadline: datetime | None = Field(None, description="Phase 1 submission deadline")
    rework_deadline: datetime | None = Field(None, description="Rework submission deadline")
    phase2_deadline: datetime | None = Field(None, description="Phase 2 submission deadline")
    calibration_deadline: datetime | None = Field(
        None, description="Calibration/validation deadline"
    )
    description: str | None = Field(
        None, max_length=500, description="Optional description for this year"
    )


class AssessmentYearCreate(AssessmentYearBase):
    """Schema for creating a new assessment year."""

    pass


class AssessmentYearUpdate(BaseModel):
    """Schema for updating an assessment year."""

    assessment_period_start: datetime | None = Field(
        None, description="New start of the assessment period"
    )
    assessment_period_end: datetime | None = Field(
        None, description="New end of the assessment period"
    )
    phase1_deadline: datetime | None = Field(None, description="Phase 1 submission deadline")
    rework_deadline: datetime | None = Field(None, description="Rework submission deadline")
    phase2_deadline: datetime | None = Field(None, description="Phase 2 submission deadline")
    calibration_deadline: datetime | None = Field(
        None, description="Calibration/validation deadline"
    )
    description: str | None = Field(None, max_length=500, description="New description")


class AssessmentYearResponse(BaseModel):
    """Response schema for assessment year."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    year: int
    assessment_period_start: datetime
    assessment_period_end: datetime
    phase1_deadline: datetime | None = None
    rework_deadline: datetime | None = None
    phase2_deadline: datetime | None = None
    calibration_deadline: datetime | None = None
    is_active: bool
    is_published: bool
    description: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    activated_at: datetime | None = None
    deactivated_at: datetime | None = None

    # Nested user relationships
    activated_by: UserNested | None = None
    deactivated_by: UserNested | None = None


class AssessmentYearListResponse(BaseModel):
    """Response schema for listing assessment years."""

    years: list[AssessmentYearResponse]
    active_year: int | None = Field(None, description="Currently active assessment year")


class AssessmentYearSimple(BaseModel):
    """Simplified assessment year response (for dropdowns, etc.)."""

    model_config = ConfigDict(from_attributes=True)

    year: int
    is_active: bool
    is_published: bool


# =============================================================================
# Year Activation Schemas
# =============================================================================


class ActivateYearRequest(BaseModel):
    """Request schema for activating an assessment year."""

    pass  # No additional fields needed, year is in URL path


class ActivateYearResponse(BaseModel):
    """Response schema for year activation."""

    success: bool
    message: str
    year: int
    activated_at: datetime
    previous_active_year: int | None = Field(
        None, description="The year that was deactivated (if any)"
    )
    assessments_created: int | None = Field(
        None,
        description="Number of assessments created for BLGU users (if bulk creation triggered)",
    )


class PublishYearRequest(BaseModel):
    """Request schema for publishing an assessment year."""

    pass  # No additional fields needed, year is in URL path


class PublishYearResponse(BaseModel):
    """Response schema for year publication."""

    success: bool
    message: str
    year: int
    is_published: bool


# =============================================================================
# Accessible Years Schema
# =============================================================================


class AccessibleYearsResponse(BaseModel):
    """Response schema for accessible years based on user role."""

    years: list[int] = Field(..., description="List of year numbers accessible to the current user")
    active_year: int | None = Field(None, description="Currently active year (if accessible)")
    role: str = Field(..., description="User role that determined access")
