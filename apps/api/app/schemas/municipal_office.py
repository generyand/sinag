# Municipal Office Schemas
# Pydantic models for municipal office API requests and responses

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# ============================================================================
# Base Schema
# ============================================================================


class MunicipalOfficeBase(BaseModel):
    """Base municipal office schema with common fields."""

    name: str = Field(..., min_length=1, max_length=100, description="Full office name")
    abbreviation: str = Field(
        ..., min_length=1, max_length=20, description="Office abbreviation (e.g., MBO, LDRRMO)"
    )
    description: str | None = Field(None, description="Office description")
    governance_area_id: int = Field(
        ..., description="ID of the governance area this office belongs to"
    )
    contact_person: str | None = Field(None, max_length=100, description="Contact person name")
    contact_number: str | None = Field(None, max_length=20, description="Contact phone number")
    contact_email: EmailStr | None = Field(None, description="Contact email address")


# ============================================================================
# Create/Update Schemas
# ============================================================================


class MunicipalOfficeCreate(MunicipalOfficeBase):
    """Schema for creating a new municipal office."""

    pass


class MunicipalOfficeUpdate(BaseModel):
    """Schema for updating municipal office information."""

    name: str | None = Field(None, min_length=1, max_length=100, description="Full office name")
    abbreviation: str | None = Field(
        None, min_length=1, max_length=20, description="Office abbreviation"
    )
    description: str | None = Field(None, description="Office description")
    contact_person: str | None = Field(None, max_length=100, description="Contact person name")
    contact_number: str | None = Field(None, max_length=20, description="Contact phone number")
    contact_email: EmailStr | None = Field(None, description="Contact email address")
    is_active: bool | None = Field(None, description="Active status")


# ============================================================================
# Response Schemas
# ============================================================================


class GovernanceAreaSummary(BaseModel):
    """Summary of governance area for nested relationships."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    area_type: str


class MunicipalOfficeResponse(BaseModel):
    """Municipal office response model for API endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    abbreviation: str
    description: str | None = None
    governance_area_id: int
    contact_person: str | None = None
    contact_number: str | None = None
    contact_email: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class MunicipalOfficeWithGovernanceArea(MunicipalOfficeResponse):
    """Municipal office response with nested governance area information."""

    governance_area: GovernanceAreaSummary


# ============================================================================
# List Response Schema
# ============================================================================


class MunicipalOfficeListResponse(BaseModel):
    """Response model for paginated municipal office list."""

    offices: list[MunicipalOfficeWithGovernanceArea]
    total: int
    page: int
    size: int
    total_pages: int


# ============================================================================
# Grouped Response Schema (for frontend display)
# ============================================================================


class MunicipalOfficesByArea(BaseModel):
    """Municipal offices grouped by governance area."""

    governance_area_id: int
    governance_area_name: str
    governance_area_code: str
    area_type: str
    offices: list[MunicipalOfficeResponse]
