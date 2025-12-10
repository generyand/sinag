# 📋 Assessment Schemas
# Pydantic models for assessment-related API requests and responses

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from app.db.enums import AssessmentStatus, ComplianceStatus, MOVStatus

# ============================================================================
# Indicator Schemas
# ============================================================================


class Indicator(BaseModel):
    """Indicator response model for API endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    form_schema: dict[str, Any]
    governance_area_id: int


class IndicatorRead(BaseModel):
    """Recursive indicator schema including nested children."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    form_schema: dict[str, Any]
    governance_area_id: int
    children: list["IndicatorRead"] = []


# ============================================================================
# Assessment Schemas
# ============================================================================


class Assessment(BaseModel):
    """Assessment response model for API endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    status: AssessmentStatus
    blgu_user_id: int
    assessment_year: int  # Year this assessment belongs to
    created_at: datetime
    updated_at: datetime
    submitted_at: datetime | None = None
    validated_at: datetime | None = None
    final_compliance_status: ComplianceStatus | None = None
    area_results: dict[str, Any] | None = None
    ai_recommendations: dict[str, Any] | None = None
    # Rework tracking (Assessor stage)
    rework_requested_at: datetime | None = None
    rework_count: int = 0
    # Calibration tracking (Validator stage)
    calibration_requested_at: datetime | None = None
    calibrated_area_ids: list[int] | None = None
    # MLGOO RE-calibration tracking
    is_mlgoo_recalibration: bool = False
    mlgoo_recalibration_requested_at: datetime | None = None
    mlgoo_recalibration_indicator_ids: list[int] | None = None
    mlgoo_recalibration_comments: str | None = None
    mlgoo_recalibration_count: int = 0


class AssessmentCreate(BaseModel):
    """Schema for creating a new assessment."""

    blgu_user_id: int
    assessment_year: int | None = None  # If not provided, uses active year


class AssessmentUpdate(BaseModel):
    """Schema for updating assessment information."""

    status: AssessmentStatus | None = None


class AssessmentWithResponses(Assessment):
    """Assessment model including all responses."""

    responses: list["AssessmentResponse"] = []


# ============================================================================
# Assessment Response Schemas
# ============================================================================


class AssessmentResponse(BaseModel):
    """AssessmentResponse response model for API endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    response_data: dict[str, Any] | None = None
    is_completed: bool
    requires_rework: bool
    flagged_for_calibration: bool = False
    validation_status: str | None = None
    generated_remark: str | None = None
    assessor_remarks: str | None = None
    assessment_id: int
    indicator_id: int
    created_at: datetime
    updated_at: datetime


class AssessmentResponseCreate(BaseModel):
    """Schema for creating a new assessment response."""

    response_data: dict[str, Any] | None = None
    assessment_id: int
    indicator_id: int


class AssessmentResponseUpdate(BaseModel):
    """Schema for updating assessment response data."""

    response_data: dict[str, Any] | None = None
    is_completed: bool | None = None
    requires_rework: bool | None = None
    flagged_for_calibration: bool | None = None
    validation_status: str | None = None
    assessor_remarks: str | None = None


class AssessmentResponseWithDetails(AssessmentResponse):
    """AssessmentResponse model including related data."""

    indicator: Indicator | None = None
    movs: list["MOV"] = []
    feedback_comments: list["FeedbackComment"] = []


# ============================================================================
# MOV Schemas
# ============================================================================


class MOV(BaseModel):
    """MOV (Means of Verification) response model for API endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    original_filename: str
    file_size: int
    content_type: str
    storage_path: str
    status: MOVStatus
    response_id: int
    uploaded_at: datetime


class MOVCreate(BaseModel):
    """Schema for creating a new MOV."""

    filename: str
    original_filename: str
    file_size: int
    content_type: str
    storage_path: str
    response_id: int
    field_id: str | None = None  # Field identifier for multi-field uploads


class MOVUpdate(BaseModel):
    """Schema for updating MOV information."""

    status: MOVStatus | None = None


# ============================================================================
# Feedback Comment Schemas
# ============================================================================


class FeedbackComment(BaseModel):
    """FeedbackComment response model for API endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    comment: str
    comment_type: str
    response_id: int
    assessor_id: int
    created_at: datetime


class FeedbackCommentCreate(BaseModel):
    """Schema for creating a new feedback comment."""

    comment: str
    comment_type: str = "general"
    response_id: int
    assessor_id: int


class FeedbackCommentUpdate(BaseModel):
    """Schema for updating feedback comment."""

    comment: str | None = None
    comment_type: str | None = None


# ============================================================================
# Comprehensive Assessment Schemas
# ============================================================================


class AssessmentWithIndicators(BaseModel):
    """Complete assessment data including all governance areas and indicators."""

    model_config = ConfigDict(from_attributes=True)

    assessment: Assessment
    governance_areas: list[dict[str, Any]]  # Will include indicators and responses


class IndicatorWithResponse(BaseModel):
    """Indicator with its corresponding response data."""

    model_config = ConfigDict(from_attributes=True)

    indicator: Indicator
    response: AssessmentResponse | None = None
    movs: list[MOV] = []
    feedback_comments: list[FeedbackComment] = []


class GovernanceAreaWithIndicators(BaseModel):
    """Governance area with all its indicators and responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    area_type: str
    indicators: list[IndicatorWithResponse] = []


# ============================================================================
# API Response Schemas
# ============================================================================


class AssessmentListResponse(BaseModel):
    """Schema for paginated assessment list response."""

    model_config = ConfigDict(from_attributes=True)

    assessments: list[Assessment]
    total: int
    page: int
    size: int
    total_pages: int


class AssessmentResponseListResponse(BaseModel):
    """Schema for paginated assessment response list response."""

    model_config = ConfigDict(from_attributes=True)

    responses: list[AssessmentResponseWithDetails]
    total: int
    page: int
    size: int
    total_pages: int


class MOVListResponse(BaseModel):
    """Schema for paginated MOV list response."""

    model_config = ConfigDict(from_attributes=True)

    movs: list[MOV]
    total: int
    page: int
    size: int
    total_pages: int


class FeedbackCommentListResponse(BaseModel):
    """Schema for paginated feedback comment list response."""

    model_config = ConfigDict(from_attributes=True)

    comments: list[FeedbackComment]
    total: int
    page: int
    size: int
    total_pages: int


# ============================================================================
# Validation Schemas
# ============================================================================


class AssessmentSubmissionValidation(BaseModel):
    """Schema for assessment submission validation response."""

    is_valid: bool
    errors: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []


class FormSchemaValidation(BaseModel):
    """Schema for form schema validation."""

    is_valid: bool
    errors: list[str] = []
    warnings: list[str] = []


class SubmissionValidationResult(BaseModel):
    """
    Schema for Epic 5.0 submission validation result.

    Used by SubmissionValidationService to return detailed validation results
    before allowing assessment submission.
    """

    is_valid: bool
    incomplete_indicators: list[str] = []  # List of indicator names/IDs that are incomplete
    missing_movs: list[str] = []  # List of indicator names/IDs missing required MOV files
    error_message: str | None = None


# ============================================================================
# Dashboard Schemas
# ============================================================================


class GovernanceAreaProgress(BaseModel):
    """Progress summary for a governance area."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    area_type: str
    total_indicators: int
    completed_indicators: int
    completion_percentage: float
    requires_rework_count: int


class ProgressSummary(BaseModel):
    """Progress summary with current, total, and percentage."""

    model_config = ConfigDict(from_attributes=True)

    current: int
    total: int
    percentage: float


class AssessmentDashboardStats(BaseModel):
    """Dashboard statistics for assessment progress."""

    model_config = ConfigDict(from_attributes=True)

    # Overall progress
    total_indicators: int
    completed_indicators: int
    completion_percentage: float

    # Progress object
    progress: ProgressSummary

    # Status breakdown
    responses_requiring_rework: int
    responses_with_feedback: int
    responses_with_movs: int

    # Governance area progress
    governance_areas: list[GovernanceAreaProgress]

    # Assessment metadata
    assessment_status: AssessmentStatus
    created_at: datetime
    updated_at: datetime
    submitted_at: datetime | None = None


class IndicatorSummary(BaseModel):
    """Summary of rework required for a single indicator.

    Generated by AI to provide clear, actionable feedback to BLGU users.
    """

    indicator_id: int = Field(..., description="ID of the indicator requiring rework")
    indicator_name: str = Field(
        ..., description="Full name of the indicator (e.g., '1.1 Budget Ordinance')"
    )
    key_issues: list[str] = Field(
        default_factory=list,
        description="List of specific issues identified by the assessor",
    )
    suggested_actions: list[str] = Field(
        default_factory=list,
        description="Actionable steps the BLGU should take to address the issues",
    )
    affected_movs: list[str] = Field(
        default_factory=list,
        description="List of MOV filenames that have annotations or issues",
    )


class CalibrationSummaryResponse(BaseModel):
    """AI-generated comprehensive summary of calibration requirements.

    This schema represents the complete calibration summary provided to BLGU users
    after a validator requests calibration during table validation. Unlike rework
    summaries which cover all indicators, calibration summaries focus only on
    indicators in the validator's governance area that were marked as FAIL (Unmet).
    """

    overall_summary: str = Field(
        ...,
        description="Brief 2-3 sentence overview of the main issues in the governance area",
    )
    governance_area: str | None = Field(
        None, description="Name of the governance area being calibrated"
    )
    governance_area_id: int | None = Field(
        None, description="ID of the governance area being calibrated"
    )
    indicator_summaries: list[IndicatorSummary] = Field(
        default_factory=list,
        description="Detailed summaries for each indicator requiring calibration",
    )
    priority_actions: list[str] = Field(
        default_factory=list,
        description="Top 3 most critical actions the BLGU should prioritize",
        max_length=5,
    )
    estimated_time: str | None = Field(
        None,
        description="Estimated time to complete calibration corrections (e.g., '15-30 minutes')",
    )
    generated_at: datetime = Field(..., description="Timestamp when the summary was generated")
    language: str | None = Field(
        None,
        description="Language code of this summary (ceb=Bisaya, fil=Tagalog, en=English)",
    )


class AssessmentDashboardResponse(BaseModel):
    """Complete dashboard response for assessment overview."""

    model_config = ConfigDict(from_attributes=True)

    assessment_id: int
    blgu_user_id: int
    barangay_name: str
    performance_year: int
    assessment_year: int

    # Status & Workflow
    status: AssessmentStatus
    submitted_at: datetime | None = None
    validated_at: datetime | None = None
    rework_requested_at: datetime | None = None
    rework_count: int = 0

    # Calibration & Rework
    is_calibration_rework: bool = False
    calibration_governance_area_name: str | None = None
    is_mlgoo_recalibration: bool = False
    mlgoo_recalibration_requested_at: datetime | None = None

    # Insights
    ai_summary: CalibrationSummaryResponse | dict[str, Any] | None = None
    ai_summary_available_languages: list[str] = ["ceb", "en"]

    stats: AssessmentDashboardStats
    feedback: list[dict[str, Any]] = []  # Enhanced feedback array with assessor comments
    upcoming_deadlines: list[dict[str, Any]] = []  # Any upcoming deadlines


# ============================================================================
# Dynamic Form Response Schemas (Epic 3.0)
# ============================================================================


class FieldAnswerInput(BaseModel):
    """Input schema for a single field answer."""

    field_id: str
    value: Any  # Can be str, int, bool, list, etc.


class SaveAnswersRequest(BaseModel):
    """Request schema for saving form answers."""

    responses: list[FieldAnswerInput]


class SaveAnswersResponse(BaseModel):
    """Response schema for save answers endpoint."""

    message: str
    assessment_id: int
    indicator_id: int
    saved_count: int


class AnswerResponse(BaseModel):
    """Response schema for a single field answer."""

    field_id: str
    value: Any


class GetAnswersResponse(BaseModel):
    """Response schema for retrieving saved answers."""

    assessment_id: int
    indicator_id: int
    responses: list[AnswerResponse]
    created_at: str | None = None
    updated_at: str | None = None


class IncompleteIndicatorDetail(BaseModel):
    """Nested schema for incomplete indicator details."""

    indicator_id: int
    indicator_title: str
    missing_required_fields: list[str]


class CompletenessValidationResponse(BaseModel):
    """Response schema for completeness validation endpoint."""

    is_complete: bool
    total_indicators: int
    complete_indicators: int
    incomplete_indicators: int
    incomplete_details: list[IncompleteIndicatorDetail]


# ============================================================================
# MOV File Schemas (Epic 4.0)
# ============================================================================


class MOVFileResponse(BaseModel):
    """Response schema for MOV file operations."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    assessment_id: int
    indicator_id: int
    file_name: str
    file_url: str
    file_type: str
    file_size: int
    uploaded_by: int
    uploaded_at: datetime
    deleted_at: datetime | None = None
    field_id: str | None = None

    @field_serializer("uploaded_at", "deleted_at")
    def serialize_datetime(self, dt: datetime | None, _info) -> str | None:
        """Serialize datetime to ISO format with Z suffix for UTC."""
        if dt is None:
            return None
        return dt.isoformat() + "Z"


class MOVFileListResponse(BaseModel):
    """Response schema for listing MOV files."""

    files: list[MOVFileResponse]


class SignedUrlResponse(BaseModel):
    """
    Response schema for signed URL generation.

    Provides a time-limited signed URL for secure access to MOV files
    stored in private Supabase Storage buckets.

    Fields:
        signed_url: A signed URL that provides temporary access to the file.
                   The URL expires after a configurable duration (default: 1 hour).
    """

    signed_url: str


# ============================================================================
# Submission Workflow Schemas (Epic 5.0)
# ============================================================================


class SubmitAssessmentResponse(BaseModel):
    """
    Response schema for assessment submission (Story 5.5).

    Returned when a BLGU user successfully submits an assessment for review.
    The assessment transitions from DRAFT to SUBMITTED and becomes locked.

    Fields:
        success: Whether the submission was successful
        message: Human-readable success message
        assessment_id: ID of the submitted assessment
        submitted_at: Timestamp when the assessment was submitted
    """

    success: bool
    message: str
    assessment_id: int
    submitted_at: datetime


class RequestReworkRequest(BaseModel):
    """
    Request schema for requesting rework on an assessment (Story 5.6).

    Used by assessors/validators to send an assessment back to the BLGU user
    for corrections. Only one rework cycle is allowed per assessment.

    Fields:
        comments: Assessor's feedback explaining what needs to be corrected.
                  Minimum length: 10 characters. This feedback is shown to the
                  BLGU user when they view the assessment in REWORK status.

    Validation:
        - comments field is required and must be at least 10 characters
        - whitespace is automatically trimmed
    """

    comments: str

    @classmethod
    def validate_comments(cls, v):
        """Validate that comments are not empty and have minimum length."""
        if not v or len(v.strip()) < 10:
            raise ValueError("Rework comments must be at least 10 characters long")
        return v.strip()


class RequestReworkResponse(BaseModel):
    """
    Response schema for rework request (Story 5.6).

    Returned when an assessor successfully requests rework on an assessment.
    The assessment transitions from SUBMITTED to REWORK and becomes unlocked
    for the BLGU user to make corrections.

    Fields:
        success: Whether the rework request was successful
        message: Human-readable success message
        assessment_id: ID of the assessment sent back for rework
        rework_count: Current rework count (will be 1 after first rework request)
        rework_requested_at: Timestamp when rework was requested
    """

    success: bool
    message: str
    assessment_id: int
    rework_count: int
    rework_requested_at: datetime


class ResubmitAssessmentResponse(BaseModel):
    """
    Response schema for assessment resubmission (Story 5.7).

    Returned when a BLGU user successfully resubmits an assessment after
    making corrections requested by an assessor. The assessment transitions
    from REWORK back to SUBMITTED and becomes locked again.

    Fields:
        success: Whether the resubmission was successful
        message: Human-readable success message
        assessment_id: ID of the resubmitted assessment
        resubmitted_at: Timestamp when the assessment was resubmitted
        rework_count: Current rework count (remains at 1, not incremented)
    """

    success: bool
    message: str
    assessment_id: int
    resubmitted_at: datetime
    rework_count: int


class SubmissionStatusResponse(BaseModel):
    """
    Response schema for submission status check (Story 5.8).

    Provides comprehensive information about an assessment's submission state,
    including validation status, rework details, and locked state. This allows
    BLGU users to check submission readiness and view rework feedback, while
    allowing assessors to check assessment status before taking action.

    Fields:
        assessment_id: ID of the assessment being checked
        status: Current workflow status (DRAFT, SUBMITTED, IN_REVIEW, REWORK, COMPLETED)
        is_locked: Whether the assessment is locked for editing by BLGU user.
                   Locked when SUBMITTED, IN_REVIEW, or COMPLETED.
        rework_count: Number of times rework has been requested (0 or 1)
        rework_comments: Assessor's feedback if rework was requested (None if no rework)
        rework_requested_at: Timestamp when rework was requested (None if no rework)
        rework_requested_by: ID of the assessor who requested rework (None if no rework)
        validation_result: Current validation status showing incomplete indicators
                           and missing MOV files

    Usage:
        - BLGU users call this endpoint to check what needs completion before submit/resubmit
        - BLGU users view rework feedback from assessors
        - Assessors check assessment status before requesting rework or validating
        - Frontend displays submission readiness indicator with validation errors
    """

    assessment_id: int
    status: AssessmentStatus
    is_locked: bool
    rework_count: int
    rework_comments: str | None = None
    rework_requested_at: datetime | None = None
    rework_requested_by: int | None = None
    validation_result: SubmissionValidationResult


# ============================================================================
# Rework Summary Schemas
# ============================================================================


class ReworkSummaryResponse(BaseModel):
    """AI-generated comprehensive summary of rework requirements.

    This schema represents the complete rework summary provided to BLGU users
    after an assessor requests rework. It includes an overall summary,
    per-indicator breakdowns, and priority actions.
    """

    overall_summary: str = Field(
        ...,
        description="Brief 2-3 sentence overview of the main issues across all indicators",
    )
    indicator_summaries: list[IndicatorSummary] = Field(
        default_factory=list,
        description="Detailed summaries for each indicator requiring rework",
    )
    priority_actions: list[str] = Field(
        default_factory=list,
        description="Top 3-5 most critical actions the BLGU should prioritize",
        max_length=5,
    )
    estimated_time: str | None = Field(
        None,
        description="Estimated time to complete all rework (e.g., '30-45 minutes')",
    )
    generated_at: datetime = Field(..., description="Timestamp when the summary was generated")
    language: str | None = Field(
        None,
        description="Language code of this summary (ceb=Bisaya, fil=Tagalog, en=English)",
    )


# ============================================================================
# Update forward references for nested models
# ============================================================================

AssessmentWithResponses.model_rebuild()
AssessmentResponseWithDetails.model_rebuild()
IndicatorWithResponse.model_rebuild()
IndicatorRead.model_rebuild()
