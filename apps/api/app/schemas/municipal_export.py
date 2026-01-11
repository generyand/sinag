# 📊 Municipal Export Schemas
# Pydantic models for municipal data export API requests and responses

from datetime import datetime

from pydantic import BaseModel, Field

# ============================================================================
# Export Options Schemas
# ============================================================================


class ExportOptions(BaseModel):
    """Schema for export options selection."""

    cycle_id: int | None = Field(None, description="Assessment cycle/year to export")
    include_assessments: bool = Field(True, description="Include assessment submissions and status")
    include_users: bool = Field(False, description="Include BLGU users list")
    include_analytics: bool = Field(True, description="Include compliance rates and statistics")
    include_indicators: bool = Field(False, description="Include indicator-level breakdown")
    include_governance_areas: bool = Field(True, description="Include governance area performance")


class ExportRequest(ExportOptions):
    """Schema for export generation request."""

    pass


# ============================================================================
# Export Data Type Options
# ============================================================================


class ExportDataType(BaseModel):
    """Schema for a single export data type option."""

    key: str = Field(..., description="Data type key")
    label: str = Field(..., description="Display label")
    description: str = Field(..., description="Description of what's included")
    default: bool = Field(False, description="Whether selected by default")


class AvailableCycle(BaseModel):
    """Schema for an available assessment cycle."""

    id: int
    name: str
    year: int
    is_active: bool


class ExportOptionsResponse(BaseModel):
    """Schema for available export options response."""

    data_types: list[ExportDataType]
    cycles: list[AvailableCycle]
    default_cycle_id: int | None = None


# ============================================================================
# Export Status and Response Schemas
# ============================================================================


class ExportSummary(BaseModel):
    """Schema for export summary metadata."""

    generated_at: datetime
    cycle_name: str | None
    cycle_year: int | None
    total_barangays: int
    total_assessments: int
    included_sections: list[str]


class ExportGenerateResponse(BaseModel):
    """Schema for export generation response."""

    success: bool
    message: str
    summary: ExportSummary | None = None
    download_url: str | None = None


# ============================================================================
# Export Data Schemas (for internal use)
# ============================================================================


class AssessmentExportRow(BaseModel):
    """Schema for a single assessment row in export."""

    barangay_name: str
    assessment_id: int
    status: str
    submitted_at: datetime | None
    validated_at: datetime | None
    compliance_status: str | None
    overall_score: float | None
    pass_count: int
    fail_count: int
    conditional_count: int
    governance_areas_passed: int
    total_governance_areas: int


class UserExportRow(BaseModel):
    """Schema for a single user row in export."""

    name: str
    email: str
    role: str
    barangay_name: str | None
    is_active: bool
    created_at: datetime


class GovernanceAreaExportRow(BaseModel):
    """Schema for governance area performance row in export."""

    area_name: str
    area_code: str
    area_type: str  # core or essential
    total_indicators: int
    passed_count: int
    failed_count: int
    pass_rate: float


class IndicatorExportRow(BaseModel):
    """Schema for indicator-level row in export."""

    indicator_code: str
    indicator_name: str
    governance_area: str
    barangay_name: str
    status: str  # PASS, FAIL, CONDITIONAL, NOT_SUBMITTED
    feedback: str | None


class AnalyticsSummaryExport(BaseModel):
    """Schema for analytics summary in export."""

    total_barangays: int
    assessed_barangays: int
    compliant_barangays: int
    non_compliant_barangays: int
    compliance_rate: float
    average_score: float | None
