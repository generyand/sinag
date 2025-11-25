"""
BLGU Dashboard Schemas

Pydantic schemas for BLGU dashboard API responses.

IMPORTANT: These schemas show COMPLETION status only (complete/incomplete).
Compliance status (PASS/FAIL/CONDITIONAL) is NEVER exposed to BLGU users.
"""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


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
        description="ID of the Validator who requested calibration (null if regular rework)"
    )
    calibration_governance_area_id: Optional[int] = Field(
        None,
        description="ID of the governance area that was calibrated (null if regular rework)"
    )
    calibration_governance_area_name: Optional[str] = Field(
        None,
        description="Name of the governance area that was calibrated (null if regular rework)"
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
