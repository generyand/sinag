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
    """Request body for requesting RE-calibration."""

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
        description="New validation status: Pass, Fail, or Conditional",
        pattern="^(Pass|Fail|Conditional)$",
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


class IndicatorDetailItem(BaseModel):
    """Indicator details within a governance area."""

    response_id: int
    indicator_id: int
    indicator_name: str
    indicator_code: str | None
    validation_status: str | None
    assessor_remarks: str | None
    is_recalibration_target: bool
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
    mlgoo_recalibration_count: int
    is_mlgoo_recalibration: bool
    mlgoo_recalibration_indicator_ids: list[int] | None
    mlgoo_recalibration_comments: str | None
    grace_period_expires_at: str | None
    is_locked_for_deadline: bool

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
    """Response for RE-calibration request."""

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
