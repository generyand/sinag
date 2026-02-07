"""
BLGU Dashboard Schemas

Pydantic schemas for BLGU dashboard API responses.

IMPORTANT: These schemas show COMPLETION status only (complete/incomplete).
Compliance status (PASS/FAIL/CONDITIONAL) is NEVER exposed to BLGU users.
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

# ============================================================================
# BBI (Barangay-Based Institutions) Compliance Schemas
# Based on DILG MC 2024-417 guidelines
# ============================================================================


class SubIndicatorResult(BaseModel):
    """Individual sub-indicator result within a BBI."""

    code: str = Field(..., description="Sub-indicator code")
    name: str = Field(..., description="Sub-indicator name")
    passed: bool = Field(..., description="Whether the sub-indicator passed")
    validation_rule: str | None = Field(None, description="Validation rule applied")
    checklist_summary: dict[str, Any] | None = Field(
        None, description="Summary of checklist items if applicable"
    )


class BBIComplianceResult(BaseModel):
    """
    Individual BBI compliance result.

    Compliance ratings per DILG MC 2024-417:
    - HIGHLY_FUNCTIONAL: 75-100%
    - MODERATELY_FUNCTIONAL: 50-74%
    - LOW_FUNCTIONAL: <50%
    """

    bbi_id: int = Field(..., description="BBI ID")
    bbi_name: str = Field(..., description="Full BBI name")
    bbi_abbreviation: str = Field(..., description="BBI abbreviation (e.g., BDRRMC, BCPC)")
    governance_area_id: int = Field(..., description="Associated governance area ID")
    governance_area_name: str | None = Field(None, description="Governance area name")
    assessment_id: int = Field(..., description="Assessment ID")
    compliance_percentage: float = Field(..., description="Compliance percentage (0-100)")
    compliance_rating: str = Field(
        ...,
        description="Rating: HIGHLY_FUNCTIONAL, MODERATELY_FUNCTIONAL, or LOW_FUNCTIONAL",
    )
    sub_indicators_passed: int = Field(..., description="Number of sub-indicators passed")
    sub_indicators_total: int = Field(..., description="Total number of sub-indicators")
    sub_indicator_results: list[SubIndicatorResult] = Field(
        default_factory=list, description="Detailed results for each sub-indicator"
    )
    calculation_date: str = Field(
        ..., description="Date when calculation was performed (ISO format)"
    )


class BBIComplianceSummary(BaseModel):
    """Summary statistics for BBI compliance."""

    total_bbis: int = Field(..., description="Total number of BBIs evaluated")
    highly_functional_count: int = Field(
        ..., description="Number of BBIs rated as Highly Functional (75%+)"
    )
    moderately_functional_count: int = Field(
        ..., description="Number of BBIs rated as Moderately Functional (50-74%)"
    )
    low_functional_count: int = Field(
        ..., description="Number of BBIs rated as Low Functional (<50%)"
    )
    average_compliance_percentage: float = Field(
        ..., description="Average compliance percentage across all BBIs"
    )


class BBIComplianceData(BaseModel):
    """
    Complete BBI compliance data for a BLGU assessment.

    Contains individual BBI results and summary statistics.
    Only populated when assessment status is COMPLETED.
    """

    assessment_id: int = Field(..., description="Assessment ID")
    barangay_id: int | None = Field(None, description="Barangay ID")
    barangay_name: str | None = Field(None, description="Barangay name")
    bbi_results: list[BBIComplianceResult] = Field(
        default_factory=list, description="Individual BBI compliance results"
    )
    summary: BBIComplianceSummary = Field(..., description="Summary statistics")
    calculated_at: str = Field(..., description="Timestamp when data was calculated (ISO format)")


class AISummaryIndicator(BaseModel):
    """Individual indicator summary within an AI-generated summary."""

    indicator_id: int = Field(..., description="Indicator ID")
    indicator_name: str = Field(..., description="Indicator name")
    key_issues: list[str] = Field(
        default_factory=list, description="Key issues identified by assessor/validator"
    )
    suggested_actions: list[str] = Field(
        default_factory=list, description="Suggested actions to address the issues"
    )
    affected_movs: list[str] = Field(
        default_factory=list, description="List of MOV filenames with issues"
    )


class AISummary(BaseModel):
    """
    AI-generated summary for rework or calibration.

    Provides overall guidance and per-indicator breakdowns to help
    BLGU users understand what needs to be fixed.
    """

    overall_summary: str = Field(..., description="Brief 2-3 sentence overview of the main issues")
    governance_area: str | None = Field(
        None, description="Name of the governance area (only for calibration)"
    )
    governance_area_id: int | None = Field(
        None, description="ID of the governance area (only for calibration)"
    )
    indicator_summaries: list[AISummaryIndicator] = Field(
        default_factory=list, description="Detailed summaries for each indicator"
    )
    priority_actions: list[str] = Field(
        default_factory=list, description="Top 3-5 priority actions to address first"
    )
    estimated_time: str | None = Field(
        None,
        description="Estimated time to complete corrections (e.g., '30-45 minutes')",
    )
    generated_at: datetime | None = Field(
        None, description="Timestamp when the summary was generated"
    )
    language: str | None = Field(
        None,
        description="Language code of this summary (ceb=Bisaya, fil=Tagalog, en=English)",
    )
    summary_type: Literal["rework", "calibration"] = Field(
        ...,
        description="Type of summary: 'rework' (assessor) or 'calibration' (validator)",
    )


class AreaAssessorStatus(BaseModel):
    """
    Assessor status for a single governance area.

    Shows BLGU users which assessors have reviewed their assessment per area.
    """

    governance_area_id: int = Field(..., description="Governance area ID (1-6)")
    governance_area_name: str = Field(..., description="Governance area name")
    assessor_name: str | None = Field(
        None, description="Name of the assessor assigned to this area (null if none assigned)"
    )
    is_assessed: bool = Field(
        ...,
        description="True if assessor has approved this area, False if still pending or not yet reviewed",
    )
    status: str | None = Field(
        None,
        description="Area submission status: 'approved', 'rework', 'submitted', 'in_review', or null if pending",
    )


class IndicatorItem(BaseModel):
    """
    Individual indicator with completion status.

    Used within GovernanceAreaGroup to show indicator-level completion tracking.
    """

    indicator_id: int = Field(..., description="Indicator ID")
    indicator_name: str = Field(..., description="Indicator name")
    is_complete: bool = Field(
        ...,
        description="Completion status: True if all required fields filled, False otherwise",
    )
    response_id: int | None = Field(
        None,
        description="Assessment response ID for this indicator (null if no response yet)",
    )


class GovernanceAreaGroup(BaseModel):
    """
    Group of indicators within a governance area.

    Organizes indicators by their governance area for better navigation.
    """

    governance_area_id: int = Field(..., description="Governance area ID")
    governance_area_name: str = Field(..., description="Governance area name")
    indicators: list[IndicatorItem] = Field(
        ..., description="List of indicators in this governance area"
    )


class IndicatorNavigationItem(BaseModel):
    """
    Navigation item for a single indicator.

    Provides all information needed for frontend navigation including
    route path, completion status, and governance area grouping.
    """

    indicator_id: int = Field(..., description="Indicator ID")
    title: str = Field(..., description="Indicator title/name")
    completion_status: Literal["complete", "incomplete"] = Field(
        ..., description="Completion status: 'complete' or 'incomplete'"
    )
    route_path: str = Field(
        ...,
        description="Frontend route path for navigation (e.g., /blgu/assessment/123/indicator/456)",
    )
    governance_area_name: str = Field(..., description="Name of the governance area")
    governance_area_id: int = Field(..., description="ID of the governance area")


class ReworkComment(BaseModel):
    """
    Assessor feedback comment for rework.

    Only shown when assessment status is NEEDS_REWORK.
    Internal assessor notes are excluded.
    """

    comment: str = Field(..., description="Assessor feedback comment")
    comment_type: str = Field(..., description="Type of comment (general, specific issue, etc.)")
    indicator_id: int = Field(..., description="Indicator this comment applies to")
    indicator_name: str = Field(..., description="Name of the indicator")
    created_at: str | None = Field(
        None, description="Timestamp when comment was created (ISO format)"
    )


class BLGUDashboardResponse(BaseModel):
    """
    Response schema for BLGU dashboard endpoint.

    Provides completion tracking metrics and navigation data for BLGU users.

    SECURITY NOTE: This schema only exposes COMPLETION status (complete/incomplete).
    Compliance status (PASS/FAIL/CONDITIONAL) is never included.

    Epic 5.0 fields: status, rework_count, rework_requested_at, rework_requested_by
    """

    assessment_id: int = Field(..., description="Assessment ID")

    # Phase 1 Deadline tracking fields
    phase1_deadline: datetime | None = Field(
        None, description="Phase 1 submission deadline (from active assessment year)"
    )
    days_until_deadline: int | None = Field(
        None,
        description="Days remaining until Phase 1 deadline (negative if past). "
        "Only populated for DRAFT assessments.",
    )
    deadline_urgency_level: Literal["normal", "warning", "urgent", "critical", "expired"] | None = (
        Field(
            None,
            description="Urgency level based on days remaining: "
            "normal (>7 days), warning (4-7 days), urgent (2-3 days), "
            "critical (<=1 day), expired (deadline passed). "
            "Only populated for DRAFT assessments.",
        )
    )
    is_auto_submitted: bool = Field(
        default=False,
        description="True if assessment was automatically submitted at deadline",
    )
    auto_submitted_at: datetime | None = Field(
        None, description="Timestamp when assessment was auto-submitted (if applicable)"
    )

    # Epic 5.0: Assessment status and rework tracking
    status: str = Field(
        ...,
        description="Assessment status (DRAFT, SUBMITTED, IN_REVIEW, REWORK, COMPLETED)",
    )
    rework_count: int = Field(..., description="Number of times rework has been requested (0 or 1)")
    rework_requested_at: str | None = Field(
        None, description="Timestamp when rework was requested (ISO format)"
    )
    rework_requested_by: int | None = Field(
        None, description="User ID of assessor who requested rework"
    )

    # Calibration tracking (Phase 2 Validator workflow)
    is_calibration_rework: bool = Field(
        default=False,
        description="If True, BLGU should submit back to Validator (not Assessor). "
        "Set when Validator calibrates the assessment.",
    )
    calibration_validator_id: int | None = Field(
        None,
        description="Legacy: ID of the Validator who requested calibration (null if regular rework). "
        "For parallel calibration, use calibration_governance_areas instead.",
    )
    calibration_governance_area_id: int | None = Field(
        None,
        description="Legacy: ID of the governance area that was calibrated (null if regular rework). "
        "For parallel calibration, use calibration_governance_areas instead.",
    )
    calibration_governance_area_name: str | None = Field(
        None,
        description="Legacy: Name of the governance area that was calibrated (null if regular rework). "
        "For parallel calibration, use calibration_governance_areas instead.",
    )
    # PARALLEL CALIBRATION: Multiple validators can request calibration simultaneously
    pending_calibrations_count: int = Field(
        default=0, description="Number of pending calibration requests from validators"
    )
    calibration_governance_areas: list[dict[str, Any]] | None = Field(
        None,
        description="List of all pending calibration requests. Each item contains: "
        "governance_area_id, governance_area_name, validator_name, requested_at, approved",
    )
    ai_summaries_by_area: list[dict[str, Any]] | None = Field(
        None,
        description="AI summaries grouped by governance area for parallel calibration. "
        "Each item contains governance_area_id, governance_area, overall_summary, "
        "indicator_summaries, priority_actions, estimated_time",
    )

    total_indicators: int = Field(..., description="Total number of indicators in the assessment")
    completed_indicators: int = Field(
        ..., description="Number of indicators with all required fields filled"
    )
    incomplete_indicators: int = Field(
        ..., description="Number of indicators with missing required fields"
    )
    completion_percentage: float = Field(
        ..., description="Percentage of indicators completed (0.0 to 100.0)"
    )
    governance_areas: list[GovernanceAreaGroup] = Field(
        ..., description="Indicators grouped by governance area"
    )
    area_assessor_status: list[AreaAssessorStatus] | None = Field(
        None,
        description="Status of assessor reviews per governance area. "
        "Shows which assessors have assessed/approved each area. "
        "Only populated when assessment is SUBMITTED or beyond.",
    )
    rework_comments: list[ReworkComment] | None = Field(
        None,
        description="Assessor feedback comments if assessment needs rework (null otherwise)",
    )
    mov_annotations_by_indicator: dict[int, list[dict[str, Any]]] | None = Field(
        None,
        description="MOV annotations grouped by indicator ID - shows which MOVs assessor highlighted/commented on (null if no annotations)",
    )

    # Epic 5.0: Track which rework indicators have been addressed by BLGU
    addressed_indicator_ids: list[int] | None = Field(
        None,
        description="List of indicator IDs that have been addressed after rework was requested. "
        "An indicator is considered 'addressed' when BLGU uploads new MOV files after rework_requested_at. "
        "Use this (not is_complete) to determine if an indicator is 'Fixed' in the rework workflow.",
    )

    # AI-generated summary for rework/calibration guidance
    ai_summary: AISummary | None = Field(
        None,
        description="AI-generated summary with overall guidance, per-indicator breakdowns, and priority actions. "
        "Only populated when assessment is in REWORK status. Use the language query parameter to get summary in different languages.",
    )
    ai_summary_available_languages: list[str] | None = Field(
        None,
        description="List of language codes for which AI summaries are available (e.g., ['ceb', 'en']). "
        "Tagalog ('fil') is generated on-demand if requested.",
    )

    # MLGOO RE-calibration tracking (distinct from Validator calibration)
    # Used when MLGOO determines validator was too strict and unlocks specific indicators
    is_mlgoo_recalibration: bool = Field(
        default=False,
        description="If True, this is an MLGOO RE-calibration (not regular rework or validator calibration). "
        "BLGU should only address the specific indicators in mlgoo_recalibration_indicator_ids.",
    )
    mlgoo_recalibration_indicator_ids: list[int] | None = Field(
        None,
        description="List of indicator IDs that MLGOO has unlocked for RE-calibration. "
        "Only these indicators need to be addressed by BLGU.",
    )
    mlgoo_recalibration_mov_file_ids: list[dict[str, Any]] | None = Field(
        None,
        description="List of MOV file IDs flagged by MLGOO for re-upload. "
        "Each item contains mov_file_id and optional comment.",
    )
    mlgoo_recalibration_comments: str | None = Field(
        None, description="MLGOO's comments explaining why RE-calibration is needed."
    )
    mlgoo_recalibration_count: int = Field(
        default=0,
        description="Number of times MLGOO has requested RE-calibration (max 1).",
    )

    # Timeline dates for phase progression tracking
    submitted_at: str | None = Field(
        None, description="Timestamp when assessment was first submitted (ISO format)"
    )
    validated_at: str | None = Field(
        None, description="Timestamp when final validation was completed (ISO format)"
    )
    rework_submitted_at: str | None = Field(
        None,
        description="Timestamp when BLGU resubmitted after rework (ISO format). "
        "If set, the Resubmit button should be disabled.",
    )
    calibration_submitted_at: str | None = Field(
        None,
        description="Timestamp when BLGU resubmitted after calibration (ISO format). "
        "If set, the Submit Calibration button should be disabled.",
    )

    # Verdict fields - ONLY populated when status is COMPLETED
    # IMPORTANT: These are intentionally null until assessment is finalized
    # to prevent BLGU users from seeing Pass/Fail status prematurely
    final_compliance_status: str | None = Field(
        None,
        description="Final SGLGB compliance status: 'Passed' or 'Failed'. "
        "Only populated when status is COMPLETED.",
    )
    area_results: list[dict[str, Any]] | None = Field(
        None,
        description="Results breakdown by governance area. Each item contains: "
        "area_id, area_name, area_type (Core/Essential), passed (bool), "
        "total_indicators, passed_indicators, failed_indicators. "
        "Only populated when status is COMPLETED.",
    )
    ai_recommendations: dict[str, Any] | None = Field(
        None,
        description="AI-generated CapDev recommendations grouped by governance area. "
        "Only populated when status is COMPLETED.",
    )

    # BBI Compliance - ONLY populated when status is COMPLETED
    bbi_compliance: BBIComplianceData | None = Field(
        None,
        description="BBI (Barangay-Based Institutions) compliance data with individual "
        "results and summary statistics. Only populated when status is COMPLETED.",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "assessment_id": 123,
                "total_indicators": 45,
                "completed_indicators": 30,
                "incomplete_indicators": 15,
                "completion_percentage": 66.67,
                "governance_areas": [
                    {
                        "governance_area_id": 1,
                        "governance_area_name": "Financial Administration and Sustainability",
                        "indicators": [
                            {
                                "indicator_id": 101,
                                "indicator_name": "Local Revenue Generation",
                                "is_complete": True,
                                "response_id": 501,
                            },
                            {
                                "indicator_id": 102,
                                "indicator_name": "Budget Preparation",
                                "is_complete": False,
                                "response_id": 502,
                            },
                        ],
                    }
                ],
                "rework_comments": [
                    {
                        "comment": "Please provide additional documentation for the budget allocation.",
                        "comment_type": "specific issue",
                        "indicator_id": 102,
                        "indicator_name": "Budget Preparation",
                        "created_at": "2025-01-15T10:30:00",
                    }
                ],
            }
        }
