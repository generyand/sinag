# 🧾 Assessor Schemas
# Pydantic models for assessor-related API responses/requests

from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.db.enums import ValidationStatus


class AssessorQueueItem(BaseModel):
    assessment_id: int
    barangay_name: str
    submission_date: datetime | None
    status: str  # Per-area status for assessors (SUBMITTED, IN_REVIEW, REWORK, APPROVED)
    updated_at: datetime
    area_progress: int = 0  # Progress percentage (0-100) of indicators reviewed

    # Per-area fields (for area-specific assessors)
    governance_area_id: int | None = None
    governance_area_name: str | None = None
    area_status: str | None = None  # draft, submitted, in_review, rework, approved

    # NEW: Global assessment status (for reference)
    global_status: str | None = None  # Overall assessment status

    # NEW: Submission type for Issue #5
    submission_type: str | None = None  # first_submission, rework_pending, rework_resubmission
    is_resubmission: bool = False

    # Compiled rework info (for BLGU visibility)
    areas_in_rework: list[int] | None = None
    rework_round_used: bool = False
    rework_submitted_at: datetime | None = None

    # Calibration fields
    is_calibration_rework: bool = False
    pending_calibrations_count: int = 0

    class Config:
        from_attributes = True


class ValidationRequest(BaseModel):
    """Request schema for validating an assessment response."""

    validation_status: ValidationStatus | None = (
        None  # Optional for assessors, required for validators
    )
    public_comment: str | None = None
    assessor_remarks: str | None = None
    response_data: dict[str, Any] | None = None  # Allow assessors to update checklist data
    flagged_for_calibration: bool | None = None  # Toggle to flag indicator for calibration


class ValidationResponse(BaseModel):
    """Response schema for validation endpoint."""

    success: bool
    message: str
    assessment_response_id: int
    validation_status: ValidationStatus | None = None
    has_mov_annotations: bool = False


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
# MOV Annotation Schemas
# ============================================================================


class PdfRect(BaseModel):
    """Rectangle coordinates for PDF/image annotations (percentages for responsive rendering)."""

    x: float
    y: float
    w: float
    h: float


class AnnotationCreate(BaseModel):
    """Request schema for creating a new annotation."""

    mov_file_id: int
    annotation_type: str  # 'pdfRect' or 'imageRect'
    page: int  # 0-indexed page number
    rect: PdfRect  # Primary rectangle
    rects: list[PdfRect] | None = None  # Multi-line rectangles for PDFs
    comment: str


class AnnotationUpdate(BaseModel):
    """Request schema for updating an annotation."""

    comment: str | None = None


class AnnotationResponse(BaseModel):
    """Response schema for annotation data."""

    id: int
    mov_file_id: int
    assessor_id: int
    annotation_type: str
    page: int
    rect: PdfRect
    rects: list[PdfRect] | None = None
    comment: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


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


# ============================================================================
# Review History Schemas
# ============================================================================


class ReviewHistoryFeedbackComment(BaseModel):
    """Feedback comment for review history detail."""

    id: int
    comment: str
    assessor_name: str
    assessor_role: str | None = None
    created_at: datetime
    is_internal_note: bool = False


class ReviewHistoryIndicator(BaseModel):
    """Per-indicator decision data for expandable rows in review history."""

    indicator_id: int
    indicator_code: str
    indicator_name: str
    governance_area_name: str | None = None
    validation_status: ValidationStatus | None = None
    assessor_remarks: str | None = None
    flagged_for_calibration: bool = False
    requires_rework: bool = False
    feedback_comments: list[ReviewHistoryFeedbackComment] = []
    has_mov_annotations: bool = False
    mov_count: int = 0


class ReviewHistoryItem(BaseModel):
    """Single review history entry for the list view."""

    assessment_id: int
    barangay_name: str
    municipality_name: str | None = None
    governance_area_name: str | None = None  # For validators - their assigned area
    submitted_at: datetime | None = None
    completed_at: datetime | None = None  # validated_at or mlgoo_approved_at
    final_compliance_status: str | None = None  # PASSED/FAILED
    rework_count: int = 0
    calibration_count: int = 0
    was_reworked: bool = False
    was_calibrated: bool = False
    indicator_count: int = 0
    pass_count: int = 0
    fail_count: int = 0
    conditional_count: int = 0

    class Config:
        from_attributes = True


class ReviewHistoryDetail(BaseModel):
    """Detailed review history with per-indicator data for expansion."""

    assessment_id: int
    assessment_year: int
    barangay_name: str
    municipality_name: str | None = None
    governance_area_name: str | None = None
    submitted_at: datetime | None = None
    completed_at: datetime | None = None
    final_compliance_status: str | None = None
    rework_comments: str | None = None
    calibration_comments: str | None = None
    indicators: list[ReviewHistoryIndicator] = []


class ReviewHistoryResponse(BaseModel):
    """Paginated review history response."""

    items: list[ReviewHistoryItem]
    total: int
    page: int
    page_size: int
    has_more: bool
