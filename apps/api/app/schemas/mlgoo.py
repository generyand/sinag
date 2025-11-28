# 📋 MLGOO Schemas
# Pydantic models for MLGOO (Municipal Local Government Operations Officer) endpoints

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ==================== Request Schemas ====================


class ApproveAssessmentRequest(BaseModel):
    """Request body for approving an assessment."""

    comments: Optional[str] = Field(
        None,
        description="Optional approval comments",
        max_length=2000,
    )


class RecalibrationRequest(BaseModel):
    """Request body for requesting RE-calibration."""

    indicator_ids: List[int] = Field(
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


# ==================== Response Schemas ====================


class ApprovalQueueItem(BaseModel):
    """Single item in the MLGOO approval queue."""

    id: int
    barangay_name: str
    blgu_user_id: Optional[int]
    status: str
    submitted_at: Optional[str]
    validated_at: Optional[str]
    compliance_status: Optional[str]
    overall_score: Optional[float]
    pass_count: int
    fail_count: int
    conditional_count: int
    total_responses: int
    can_recalibrate: bool
    mlgoo_recalibration_count: int
    is_mlgoo_recalibration: bool

    class Config:
        from_attributes = True


class ApprovalQueueResponse(BaseModel):
    """Response for the approval queue endpoint."""

    success: bool
    count: int
    assessments: List[ApprovalQueueItem]


class IndicatorDetailItem(BaseModel):
    """Indicator details within a governance area."""

    response_id: int
    indicator_id: int
    indicator_name: str
    indicator_code: Optional[str]
    validation_status: Optional[str]
    assessor_remarks: Optional[str]
    is_recalibration_target: bool


class GovernanceAreaDetailItem(BaseModel):
    """Governance area details with indicators."""

    id: int
    name: str
    area_type: Optional[str]
    pass_count: int
    fail_count: int
    conditional_count: int
    indicators: List[IndicatorDetailItem]


class AssessmentDetailResponse(BaseModel):
    """Detailed assessment information for MLGOO review."""

    id: int
    barangay_name: str
    cycle_year: Optional[int]
    blgu_user_id: Optional[int]
    blgu_user_name: Optional[str]
    status: str
    submitted_at: Optional[str]
    validated_at: Optional[str]
    compliance_status: Optional[str]
    overall_score: Optional[float]
    area_results: Optional[Dict[str, Any]]
    governance_areas: List[GovernanceAreaDetailItem]
    can_approve: bool
    can_recalibrate: bool
    mlgoo_recalibration_count: int
    is_mlgoo_recalibration: bool
    mlgoo_recalibration_indicator_ids: Optional[List[int]]
    mlgoo_recalibration_comments: Optional[str]
    grace_period_expires_at: Optional[str]
    is_locked_for_deadline: bool

    class Config:
        from_attributes = True


class NotificationResult(BaseModel):
    """Result of notification triggering."""

    success: bool
    message: Optional[str] = None
    error: Optional[str] = None
    task_id: Optional[str] = None


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
    indicator_ids: List[int]
    indicator_names: List[str]
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
