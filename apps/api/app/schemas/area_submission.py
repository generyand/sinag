# 📋 Area Submission Schemas
# Pydantic models for per-area submission in the workflow restructuring

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Area status values
AreaStatusType = Literal["draft", "submitted", "in_review", "rework", "approved"]


class AreaStatus(BaseModel):
    """Status details for a single governance area."""

    status: AreaStatusType
    submitted_at: datetime | None = None
    approved_at: datetime | None = None
    rework_requested_at: datetime | None = None
    rework_comments: str | None = None
    resubmitted_at: datetime | None = None
    assessor_id: int | None = None
    is_resubmission: bool = False


class AreaSubmissionStatusResponse(BaseModel):
    """Response schema for area submission status."""

    model_config = ConfigDict(from_attributes=True)

    area_submission_status: dict[str, AreaStatus | dict]
    area_assessor_approved: dict[str, bool]
    all_areas_approved: bool
    rework_round_used: bool
    calibration_round_used: bool
    areas_in_rework: list[int] = Field(default_factory=list)
    areas_pending_review: list[int] = Field(default_factory=list)


class SubmitAreaRequest(BaseModel):
    """Request schema for submitting a governance area for review."""

    pass  # No additional data needed, area_id comes from path param


class AreaReworkRequest(BaseModel):
    """Request schema for assessor requesting rework on their governance area."""

    comments: str = Field(..., min_length=1, max_length=2000)


class AreaApproveRequest(BaseModel):
    """Request schema for assessor approving their governance area."""

    pass  # No additional data needed, area_id comes from path param


class AreaSubmissionResponse(BaseModel):
    """Response schema after submitting/resubmitting an area."""

    model_config = ConfigDict(from_attributes=True)

    success: bool
    message: str
    assessment_id: int
    governance_area_id: int
    new_status: AreaStatusType


class AreaActionResponse(BaseModel):
    """Response schema for area approval or rework request."""

    model_config = ConfigDict(from_attributes=True)

    success: bool
    message: str
    assessment_id: int
    governance_area_id: int
    new_status: AreaStatusType
    all_areas_approved: bool = False
    assessment_status: str | None = None  # Overall assessment status


class CompiledReworkSummary(BaseModel):
    """Summary of all areas requiring rework (compiled from all 6 assessors)."""

    model_config = ConfigDict(from_attributes=True)

    areas: list[dict]  # List of areas with rework details
    rework_round_used: bool
    total_areas_in_rework: int


class AreaReworkInfoResponse(BaseModel):
    """
    Information about a governance area that was sent for rework by an assessor.

    Used in the MLGOO submissions list to show which assessors flagged areas for rework.
    """

    model_config = ConfigDict(from_attributes=True)

    governance_area_id: int = Field(..., ge=1, le=6, description="Governance area ID (1-6)")
    governance_area_name: str = Field(..., description="Human-readable governance area name")
    assessor_id: int = Field(..., description="ID of the assessor who sent for rework")
    assessor_name: str = Field(..., description="Name of the assessor who sent for rework")
    rework_requested_at: datetime | None = Field(
        None, description="Timestamp when rework was requested"
    )
    rework_comments: str | None = Field(None, description="Comments from the assessor")
