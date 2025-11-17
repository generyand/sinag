# 🧾 Assessor Schemas
# Pydantic models for assessor-related API responses/requests

from datetime import datetime
from typing import Any

from app.db.enums import ValidationStatus
from pydantic import BaseModel


class AssessorQueueItem(BaseModel):
    assessment_id: int
    barangay_name: str
    submission_date: datetime | None
    status: str
    updated_at: datetime

    class Config:
        from_attributes = True


class ValidationRequest(BaseModel):
    """Request schema for validating an assessment response."""

    validation_status: ValidationStatus
    public_comment: str | None = None
    internal_note: str | None = None
    assessor_remarks: str | None = None


class ValidationResponse(BaseModel):
    """Response schema for validation endpoint."""

    success: bool
    message: str
    assessment_response_id: int
    validation_status: ValidationStatus


class MOVUploadResponse(BaseModel):
    """Response schema for MOV upload endpoint."""

    model_config = {"arbitrary_types_allowed": True, "validate_assignment": False}

    success: bool
    message: str
    mov_id: int | None = None
    storage_path: str | None = None
    mov: Any | None = None  # MOV entity as dict - use Any to completely bypass validation


class AssessmentDetailsResponse(BaseModel):
    """Response schema for assessment details endpoint."""

    success: bool
    message: str | None = None
    assessment_id: int | None = None
    assessment: dict | None = None


# ============================================================================
# Analytics Schemas
# ============================================================================


class PerformanceOverview(BaseModel):
    """Performance overview metrics for assessor analytics."""

    total_assessed: int
    passed: int
    failed: int
    pass_rate: float
    trend_series: list[dict[str, int | str]] = []  # Time series data for trends


class SystemicWeakness(BaseModel):
    """Systemic weakness/hotspot information."""

    indicator: str
    indicator_id: int | None = None
    failed_count: int
    barangays: list[str]
    reason: str | None = None  # Reason for underperformance


class WorkflowMetrics(BaseModel):
    """Workflow metrics for assessor analytics."""

    avg_time_to_first_review: float  # Average days to first review
    avg_rework_cycle_time: float  # Average days for rework cycle
    total_reviewed: int
    rework_rate: float  # Percentage
    counts_by_status: dict[str, int] = {}  # Counts by assessment status


class AssessorAnalyticsResponse(BaseModel):
    """Response schema for assessor analytics endpoint."""

    overview: PerformanceOverview
    hotspots: list[SystemicWeakness]
    workflow: WorkflowMetrics
    assessment_period: str | None = None
    governance_area_name: str | None = None
