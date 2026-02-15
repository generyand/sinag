# 📋 MLGOO Schemas
# Pydantic models for MLGOO (Municipal Local Government Operations Officer) endpoints

from typing import Any

from pydantic import BaseModel, Field

# ==================== Request Schemas ====================


class ApproveAssessmentRequest(BaseModel):
    """Request body for approving an assessment."""

    comments: str | None = Field(
        None,
        description="Optional approval comments",
        max_length=2000,
    )


class RecalibrationRequest(BaseModel):
    """Request body for requesting RE-calibration (legacy - indicator level)."""

    indicator_ids: list[int] = Field(
        ...,
        description="List of indicator IDs to RE-calibrate",
        min_length=1,
    )
    comments: str = Field(
        ...,
        description="Explanation for why RE-calibration is needed",
        min_length=10,
        max_length=2000,
    )


class MOVFileRecalibrationItem(BaseModel):
    """Single MOV file flagged for recalibration."""

    mov_file_id: int = Field(..., description="ID of the MOV file to recalibrate")
    comment: str | None = Field(
        None,
        description="Optional comment explaining why this file needs recalibration",
        max_length=500,
    )


class RecalibrationByMovRequest(BaseModel):
    """Request body for requesting RE-calibration by specific MOV files."""

    mov_files: list[MOVFileRecalibrationItem] = Field(
        ...,
        description="List of MOV files to flag for recalibration",
        min_length=1,
    )
    overall_comments: str = Field(
        ...,
        description="Overall explanation for why RE-calibration is needed",
        min_length=10,
        max_length=2000,
    )


class UnlockAssessmentRequest(BaseModel):
    """Request body for unlocking a deadline-locked assessment."""

    extend_grace_period_days: int = Field(
        default=3,
        description="Number of days to extend the grace period",
        ge=1,
        le=30,
    )


class IndicatorValidationUpdate(BaseModel):
    """Single indicator validation status update."""

    indicator_id: int = Field(..., description="ID of the indicator to update")
    validation_status: str = Field(
        ...,
        description="New validation status: PASS, FAIL, or CONDITIONAL",
        pattern="^(PASS|FAIL|CONDITIONAL|Pass|Fail|Conditional)$",
    )
    remarks: str | None = Field(
        None,
        description="Optional remarks for the validation decision",
        max_length=2000,
    )


class UpdateRecalibrationValidationRequest(BaseModel):
    """Request body for updating validation status of recalibration target indicators."""

    indicator_updates: list[IndicatorValidationUpdate] = Field(
        ...,
        description="List of indicator validation status updates",
        min_length=1,
    )
    comments: str | None = Field(
        None,
        description="Optional overall comments from MLGOO",
        max_length=2000,
    )


class OverrideValidationStatusRequest(BaseModel):
    """Request body for MLGOO to override any indicator's validation status."""

    validation_status: str = Field(
        ...,
        description="New validation status: PASS, FAIL, or CONDITIONAL",
        pattern="^(PASS|FAIL|CONDITIONAL)$",
    )
    remarks: str | None = Field(
        None,
        description="Optional remarks explaining the override decision",
        max_length=2000,
    )


# ==================== Response Schemas ====================


class ApprovalQueueItem(BaseModel):
    """Single item in the MLGOO approval queue."""

    id: int
    barangay_name: str
    blgu_user_id: int | None
    status: str
    submitted_at: str | None
    validated_at: str | None
    compliance_status: str | None
    overall_score: float | None
    pass_count: int
    fail_count: int
    conditional_count: int
    total_responses: int
    can_recalibrate: bool
    mlgoo_recalibration_count: int
    is_mlgoo_recalibration: bool
    governance_areas_passed: int
    total_governance_areas: int

    class Config:
        from_attributes = True


class ApprovalQueueResponse(BaseModel):
    """Response for the approval queue endpoint."""

    success: bool
    count: int
    assessments: list[ApprovalQueueItem]


class MOVFileItem(BaseModel):
    """MOV file details for indicator review."""

    id: int
    file_name: str
    file_url: str
    file_type: str
    file_size: int
    field_id: str | None = None
    uploaded_at: str | None = None


class MOVAnnotationItem(BaseModel):
    """MOV annotation details for feedback display."""

    id: int
    mov_file_id: int
    mov_filename: str
    mov_file_type: str
    annotation_type: str  # 'pdfRect' or 'imageRect'
    page: int | None = None
    rect: dict[str, Any] | None = None
    rects: list[dict[str, Any]] | None = None
    comment: str
    assessor_id: int
    assessor_name: str
    created_at: str | None


class FeedbackCommentItem(BaseModel):
    """Feedback comment from assessor/validator."""

    id: int
    comment: str
    comment_type: str
    assessor_id: int
    assessor_name: str
    created_at: str | None


class ReworkCalibrationIndicatorItem(BaseModel):
    """Indicator with rework/calibration feedback details."""

    indicator_id: int
    indicator_name: str
    indicator_code: str | None
    governance_area_id: int
    governance_area_name: str
    status: str  # 'rework' or 'calibration' or 'mlgoo_recalibration'
    validation_status: str | None
    feedback_comments: list[FeedbackCommentItem] = Field(default_factory=list)
    mov_annotations: list[MOVAnnotationItem] = Field(default_factory=list)


class PendingCalibrationItem(BaseModel):
    """Details of a pending calibration request."""

    validator_id: int
    validator_name: str
    governance_area_id: int
    governance_area_name: str
    requested_at: str | None
    comments: str | None = None


class ReworkCalibrationSummary(BaseModel):
    """Summary of all rework/calibration requests for an assessment."""

    has_rework: bool = False
    has_calibration: bool = False
    has_mlgoo_recalibration: bool = False
    # Assessor rework info
    rework_requested_by_id: int | None = None
    rework_requested_by_name: str | None = None
    rework_comments: str | None = None
    # Validator calibration info
    calibration_validator_id: int | None = None
    calibration_validator_name: str | None = None
    calibration_comments: str | None = None
    # Pending calibrations (parallel calibration support)
    pending_calibrations: list[PendingCalibrationItem] = Field(default_factory=list)
    # Indicators being reworked/calibrated with their feedback
    rework_indicators: list[ReworkCalibrationIndicatorItem] = Field(default_factory=list)


class IndicatorDetailItem(BaseModel):
    """Indicator details within a governance area."""

    response_id: int | None  # None for indicators without uploaded MOVs (no response yet)
    indicator_id: int
    indicator_name: str
    indicator_code: str | None
    validation_status: str | None
    assessor_remarks: str | None
    is_completed: bool  # Completion status (form filled + required MOVs uploaded)
    assessor_reviewed: bool = False  # True when assessor checklist values were saved
    validator_reviewed: bool = False  # True when validator set PASS/FAIL/CONDITIONAL
    is_recalibration_target: bool  # True if MLGOO flagged for recalibration
    requires_rework: bool = False  # True if assessor flagged for rework
    flagged_for_calibration: bool = False  # True if validator flagged for calibration
    mov_files: list[MOVFileItem] = Field(default_factory=list)


class GovernanceAreaDetailItem(BaseModel):
    """Governance area details with indicators."""

    id: int
    name: str
    area_type: str | None
    pass_count: int
    fail_count: int
    conditional_count: int
    indicators: list[IndicatorDetailItem]


class AssessorProgressItem(BaseModel):
    """Assessor progress details for a governance area."""

    assessor_id: int | None
    assessor_name: str | None
    status: str  # pending, in_progress, reviewed, sent_for_rework
    progress_percent: int = Field(ge=0, le=100)
    label: str


class ValidatorProgressItem(BaseModel):
    """Validator progress details for a governance area."""

    validator_ids: list[int] = Field(default_factory=list)
    validator_names: list[str] = Field(default_factory=list)
    status: str  # pending, in_progress, reviewed
    reviewed_indicators: int = Field(default=0, ge=0)
    total_indicators: int = Field(default=0, ge=0)
    progress_percent: int = Field(ge=0, le=100)
    label: str


class GovernanceAreaAssessmentProgressItem(BaseModel):
    """Combined assessor + validator progress for one governance area."""

    governance_area_id: int
    governance_area_name: str
    total_indicators: int = Field(ge=0)
    assessor: AssessorProgressItem
    validator: ValidatorProgressItem


class AssessmentProgressOverview(BaseModel):
    """Progress summary used by MLGOO Assessment Progress tab."""

    active_assessors_count: int = Field(default=0, ge=0)
    active_validators_count: int = Field(default=0, ge=0)
    assessors_completed_count: int = Field(default=0, ge=0)
    validators_completed_count: int = Field(default=0, ge=0)
    governance_areas: list[GovernanceAreaAssessmentProgressItem] = Field(default_factory=list)


class AssessmentDetailResponse(BaseModel):
    """Detailed assessment information for MLGOO review."""

    id: int
    barangay_name: str
    cycle_year: int | None
    blgu_user_id: int | None
    blgu_user_name: str | None
    status: str
    submitted_at: str | None
    validated_at: str | None
    compliance_status: str | None
    overall_score: float | None
    area_results: dict[str, Any] | None
    governance_areas: list[GovernanceAreaDetailItem]
    can_approve: bool
    can_recalibrate: bool
    # Rework tracking (Assessor stage)
    rework_requested_at: str | None
    rework_submitted_at: str | None  # When BLGU resubmitted after rework
    rework_count: int
    # Calibration tracking (Validator stage)
    calibration_requested_at: str | None
    calibration_submitted_at: str | None  # When BLGU resubmitted after calibration
    # MLGOO RE-calibration tracking
    mlgoo_recalibration_count: int
    is_mlgoo_recalibration: bool
    mlgoo_recalibration_requested_at: str | None
    mlgoo_recalibration_submitted_at: str | None  # When BLGU resubmitted after MLGOO RE-calibration
    mlgoo_recalibration_indicator_ids: list[int] | None
    mlgoo_recalibration_mov_file_ids: list[dict[str, Any]] | None
    mlgoo_recalibration_comments: str | None
    # MLGOO approval
    mlgoo_approved_at: str | None
    grace_period_expires_at: str | None
    is_locked_for_deadline: bool
    # Rework/Calibration summary (detailed info for display)
    rework_calibration_summary: ReworkCalibrationSummary | None = None
    # Assessor/Validator progress (for MLGOO "Assessment Progress" tab)
    assessment_progress: AssessmentProgressOverview | None = None

    class Config:
        from_attributes = True


class NotificationResult(BaseModel):
    """Result of notification triggering."""

    success: bool
    message: str | None = None
    error: str | None = None
    task_id: str | None = None


class ApproveAssessmentResponse(BaseModel):
    """Response for assessment approval."""

    success: bool
    message: str
    assessment_id: int
    barangay_name: str
    status: str
    approved_by: str
    approved_at: str
    notification_result: NotificationResult


class RecalibrationResponse(BaseModel):
    """Response for RE-calibration request (indicator level)."""

    success: bool
    message: str
    assessment_id: int
    barangay_name: str
    status: str
    indicator_ids: list[int]
    indicator_names: list[str]
    comments: str
    requested_by: str
    requested_at: str
    grace_period_expires_at: str
    recalibration_count: int
    notification_result: NotificationResult


class FlaggedMovFileItem(BaseModel):
    """Flagged MOV file details in response."""

    mov_file_id: int
    file_name: str
    indicator_id: int
    indicator_code: str | None
    indicator_name: str
    comment: str | None


class RecalibrationByMovResponse(BaseModel):
    """Response for RE-calibration request (MOV file level)."""

    success: bool
    message: str
    assessment_id: int
    barangay_name: str
    status: str
    flagged_mov_files: list[FlaggedMovFileItem]
    overall_comments: str
    requested_by: str
    requested_at: str
    grace_period_expires_at: str
    recalibration_count: int
    notification_result: NotificationResult


class UnlockAssessmentResponse(BaseModel):
    """Response for unlocking an assessment."""

    success: bool
    message: str
    assessment_id: int
    barangay_name: str
    status: str
    grace_period_expires_at: str
    unlocked_by: str


class UpdatedIndicatorItem(BaseModel):
    """Updated indicator information."""

    indicator_id: int
    indicator_name: str
    previous_status: str | None
    new_status: str
    remarks: str | None


class UpdateRecalibrationValidationResponse(BaseModel):
    """Response for updating recalibration target validation statuses."""

    success: bool
    message: str
    assessment_id: int
    barangay_name: str
    updated_indicators: list[UpdatedIndicatorItem]
    updated_by: str
    updated_at: str


class OverrideValidationStatusResponse(BaseModel):
    """Response for MLGOO validation status override."""

    success: bool
    message: str
    response_id: int
    indicator_id: int
    indicator_name: str
    indicator_code: str | None
    previous_status: str | None
    new_status: str
    remarks: str | None
    updated_by: str
    updated_at: str


class SendReminderResponse(BaseModel):
    """Response for sending a submission reminder."""

    success: bool
    message: str
    assessment_id: int
    barangay_name: str
    blgu_user_email: str | None
    sent_by: str
    sent_at: str
    email_sent: bool
