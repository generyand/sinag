# 📊 Assessment Activity Schemas
# Pydantic models for assessment activity API requests and responses

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ActivityAction(str, Enum):
    """Enum for assessment activity actions."""

    CREATED = "created"
    SUBMITTED = "submitted"
    REVIEW_STARTED = "review_started"
    REWORK_REQUESTED = "rework_requested"
    REWORK_SUBMITTED = "rework_submitted"
    REVIEW_COMPLETED = "review_completed"
    VALIDATION_STARTED = "validation_started"
    CALIBRATION_REQUESTED = "calibration_requested"
    CALIBRATION_SUBMITTED = "calibration_submitted"
    VALIDATION_COMPLETED = "validation_completed"
    APPROVED = "approved"
    RECALIBRATION_REQUESTED = "recalibration_requested"
    RECALIBRATION_SUBMITTED = "recalibration_submitted"
    COMPLETED = "completed"


# ============================================================================
# Assessment Activity Schemas
# ============================================================================


class AssessmentActivityBase(BaseModel):
    """Base assessment activity schema with common fields."""

    action: str = Field(..., description="Activity action type")
    from_status: str | None = Field(None, description="Status before action")
    to_status: str | None = Field(None, description="Status after action")
    extra_data: dict[str, Any] | None = Field(None, description="Additional context")
    description: str | None = Field(None, description="Human-readable description")


class AssessmentActivityCreate(AssessmentActivityBase):
    """Schema for creating an assessment activity (internal use)."""

    assessment_id: int
    user_id: int | None = None


class AssessmentActivityResponse(AssessmentActivityBase):
    """Schema for assessment activity API responses."""

    id: int
    assessment_id: int
    user_id: int | None
    created_at: datetime

    # User details (joined from User table)
    user_email: str | None = None
    user_name: str | None = None

    # Assessment details (joined from Assessment table)
    barangay_name: str | None = None
    assessment_year: int | None = None

    model_config = ConfigDict(from_attributes=True)


class AssessmentActivityListResponse(BaseModel):
    """Schema for paginated assessment activity list."""

    items: list[AssessmentActivityResponse]
    total: int
    skip: int
    limit: int


class AssessmentActivityFilters(BaseModel):
    """Schema for assessment activity filtering parameters."""

    assessment_id: int | None = None
    user_id: int | None = None
    barangay_id: int | None = None
    action: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    skip: int = 0
    limit: int = 100


# ============================================================================
# Assessment Timeline Schema (for single assessment history view)
# ============================================================================


class AssessmentTimelineItem(BaseModel):
    """Schema for a single item in assessment timeline."""

    id: int
    action: str
    from_status: str | None
    to_status: str | None
    description: str | None
    extra_data: dict[str, Any] | None
    created_at: datetime

    # User who performed action
    user_id: int | None
    user_email: str | None
    user_name: str | None
    user_role: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AssessmentTimelineResponse(BaseModel):
    """Schema for complete assessment timeline."""

    assessment_id: int
    barangay_name: str
    current_status: str
    timeline: list[AssessmentTimelineItem]


# ============================================================================
# Activity Summary Schema (for dashboard/overview)
# ============================================================================


class ActivitySummary(BaseModel):
    """Schema for activity summary statistics."""

    total_activities: int
    submissions_count: int
    approvals_count: int
    rework_requests_count: int
    calibrations_count: int

    # Recent activity counts (last 7 days, 30 days)
    last_7_days: int
    last_30_days: int


class ActivityByActionCount(BaseModel):
    """Schema for activity count by action type."""

    action: str
    count: int
    label: str  # Human-readable label


class ActivityCountsResponse(BaseModel):
    """Schema for activity counts response."""

    summary: ActivitySummary
    by_action: list[ActivityByActionCount]
