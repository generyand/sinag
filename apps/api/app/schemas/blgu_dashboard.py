"""
BLGU Dashboard Schemas

Pydantic schemas for BLGU dashboard API responses.

IMPORTANT: These schemas show COMPLETION status only (complete/incomplete).
Compliance status (PASS/FAIL/CONDITIONAL) is NEVER exposed to BLGU users.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class AISummaryIndicator(BaseModel):
    """Individual indicator summary within an AI-generated summary."""

    indicator_id: int = Field(..., description="Indicator ID")
    indicator_name: str = Field(..., description="Indicator name")
    key_issues: List[str] = Field(
        default_factory=list, description="Key issues identified by assessor/validator"
    )
    suggested_actions: List[str] = Field(
        default_factory=list, description="Suggested actions to address the issues"
    )
    affected_movs: List[str] = Field(
        default_factory=list, description="List of MOV filenames with issues"
    )


class AISummary(BaseModel):
    """
    AI-generated summary for rework or calibration.

    Provides overall guidance and per-indicator breakdowns to help
    BLGU users understand what needs to be fixed.
    """

    overall_summary: str = Field(
        ..., description="Brief 2-3 sentence overview of the main issues"
    )
    governance_area: Optional[str] = Field(
        None, description="Name of the governance area (only for calibration)"
    )
    governance_area_id: Optional[int] = Field(
        None, description="ID of the governance area (only for calibration)"
    )
    indicator_summaries: List[AISummaryIndicator] = Field(
        default_factory=list, description="Detailed summaries for each indicator"
    )
    priority_actions: List[str] = Field(
        default_factory=list, description="Top 3-5 priority actions to address first"
    )
    estimated_time: Optional[str] = Field(
        None, description="Estimated time to complete corrections (e.g., '30-45 minutes')"
    )
    generated_at: Optional[datetime] = Field(
        None, description="Timestamp when the summary was generated"
    )
    language: Optional[str] = Field(
        None, description="Language code of this summary (ceb=Bisaya, fil=Tagalog, en=English)"
    )
    summary_type: Literal["rework", "calibration"] = Field(
        ..., description="Type of summary: 'rework' (assessor) or 'calibration' (validator)"
    )


class IndicatorItem(BaseModel):
    """
    Individual indicator with completion status.

    Used within GovernanceAreaGroup to show indicator-level completion tracking.
    """

    indicator_id: int = Field(..., description="Indicator ID")
    indicator_name: str = Field(..., description="Indicator name")
    is_complete: bool = Field(
        ..., description="Completion status: True if all required fields filled, False otherwise"
    )
    response_id: Optional[int] = Field(None, description="Assessment response ID for this indicator (null if no response yet)")


class GovernanceAreaGroup(BaseModel):
    """
    Group of indicators within a governance area.

    Organizes indicators by their governance area for better navigation.
    """

    governance_area_id: int = Field(..., description="Governance area ID")
    governance_area_name: str = Field(..., description="Governance area name")
    indicators: List[IndicatorItem] = Field(
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
        ..., description="Frontend route path for navigation (e.g., /blgu/assessment/123/indicator/456)"
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
    created_at: Optional[str] = Field(None, description="Timestamp when comment was created (ISO format)")


class BLGUDashboardResponse(BaseModel):
    """
    Response schema for BLGU dashboard endpoint.

    Provides completion tracking metrics and navigation data for BLGU users.

    SECURITY NOTE: This schema only exposes COMPLETION status (complete/incomplete).
    Compliance status (PASS/FAIL/CONDITIONAL) is never included.

    Epic 5.0 fields: status, rework_count, rework_requested_at, rework_requested_by
    """

    assessment_id: int = Field(..., description="Assessment ID")

    # Epic 5.0: Assessment status and rework tracking
    status: str = Field(..., description="Assessment status (DRAFT, SUBMITTED, IN_REVIEW, REWORK, COMPLETED)")
    rework_count: int = Field(..., description="Number of times rework has been requested (0 or 1)")
    rework_requested_at: Optional[str] = Field(None, description="Timestamp when rework was requested (ISO format)")
    rework_requested_by: Optional[int] = Field(None, description="User ID of assessor who requested rework")

    # Calibration tracking (Phase 2 Validator workflow)
    is_calibration_rework: bool = Field(
        default=False,
        description="If True, BLGU should submit back to Validator (not Assessor). "
        "Set when Validator calibrates the assessment."
    )
    calibration_validator_id: Optional[int] = Field(
        None,
        description="Legacy: ID of the Validator who requested calibration (null if regular rework). "
        "For parallel calibration, use calibration_governance_areas instead."
    )
    calibration_governance_area_id: Optional[int] = Field(
        None,
        description="Legacy: ID of the governance area that was calibrated (null if regular rework). "
        "For parallel calibration, use calibration_governance_areas instead."
    )
    calibration_governance_area_name: Optional[str] = Field(
        None,
        description="Legacy: Name of the governance area that was calibrated (null if regular rework). "
        "For parallel calibration, use calibration_governance_areas instead."
    )
    # PARALLEL CALIBRATION: Multiple validators can request calibration simultaneously
    pending_calibrations_count: int = Field(
        default=0,
        description="Number of pending calibration requests from validators"
    )
    calibration_governance_areas: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="List of all pending calibration requests. Each item contains: "
        "governance_area_id, governance_area_name, validator_name, requested_at, approved"
    )
    ai_summaries_by_area: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="AI summaries grouped by governance area for parallel calibration. "
        "Each item contains governance_area_id, governance_area, overall_summary, "
        "indicator_summaries, priority_actions, estimated_time"
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
    governance_areas: List[GovernanceAreaGroup] = Field(
        ..., description="Indicators grouped by governance area"
    )
    rework_comments: Optional[List[ReworkComment]] = Field(
        None, description="Assessor feedback comments if assessment needs rework (null otherwise)"
    )
    mov_annotations_by_indicator: Optional[Dict[int, List[Dict[str, Any]]]] = Field(
        None, description="MOV annotations grouped by indicator ID - shows which MOVs assessor highlighted/commented on (null if no annotations)"
    )

    # AI-generated summary for rework/calibration guidance
    ai_summary: Optional[AISummary] = Field(
        None,
        description="AI-generated summary with overall guidance, per-indicator breakdowns, and priority actions. "
        "Only populated when assessment is in REWORK status. Use the language query parameter to get summary in different languages."
    )
    ai_summary_available_languages: Optional[List[str]] = Field(
        None,
        description="List of language codes for which AI summaries are available (e.g., ['ceb', 'en']). "
        "Tagalog ('fil') is generated on-demand if requested."
    )

    # Timeline dates for phase progression tracking
    submitted_at: Optional[str] = Field(
        None,
        description="Timestamp when assessment was first submitted (ISO format)"
    )
    validated_at: Optional[str] = Field(
        None,
        description="Timestamp when final validation was completed (ISO format)"
    )

    # Verdict fields - ONLY populated when status is COMPLETED
    # IMPORTANT: These are intentionally null until assessment is finalized
    # to prevent BLGU users from seeing Pass/Fail status prematurely
    final_compliance_status: Optional[str] = Field(
        None,
        description="Final SGLGB compliance status: 'Passed' or 'Failed'. "
        "Only populated when status is COMPLETED."
    )
    area_results: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="Results breakdown by governance area. Each item contains: "
        "area_id, area_name, area_type (Core/Essential), passed (bool), "
        "total_indicators, passed_indicators, failed_indicators. "
        "Only populated when status is COMPLETED."
    )
    ai_recommendations: Optional[Dict[str, Any]] = Field(
        None,
        description="AI-generated CapDev recommendations grouped by governance area. "
        "Only populated when status is COMPLETED."
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
