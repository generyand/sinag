# 📅 Deadline Extension Schemas
# Pydantic models for assessment-level deadline extensions

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# =============================================================================
# Request Schemas
# =============================================================================


class DeadlineExtensionCreate(BaseModel):
    """Request schema for extending an assessment's deadline."""

    extension_type: Literal["rework", "calibration"] = Field(
        ..., description="Type of deadline to extend"
    )
    additional_days: int = Field(
        ..., ge=1, le=30, description="Number of days to add to the deadline"
    )
    reason: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="Required justification for the extension",
    )


# =============================================================================
# Response Schemas
# =============================================================================


class UserNested(BaseModel):
    """Nested user schema for extension responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class DeadlineExtensionResponse(BaseModel):
    """Response schema for a deadline extension."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    assessment_id: int
    extension_type: str
    original_deadline: datetime
    new_deadline: datetime
    additional_days: int
    reason: str
    created_at: datetime

    # Who granted the extension
    extender: UserNested | None = None


class ExtendDeadlineResult(BaseModel):
    """Result of extending a deadline."""

    success: bool = Field(..., description="Whether the extension was successful")
    message: str = Field(..., description="Human-readable result message")
    extension: DeadlineExtensionResponse = Field(..., description="The created extension record")
    new_deadline: datetime = Field(..., description="The new deadline after extension")


class DeadlineExtensionListResponse(BaseModel):
    """Response for listing deadline extensions."""

    extensions: list[DeadlineExtensionResponse] = Field(
        ..., description="List of extensions for the assessment"
    )
    total: int = Field(..., description="Total number of extensions")
