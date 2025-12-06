# Municipal Insights Schemas
# Pydantic models for the MLGOO Municipal Performance Overview dashboard

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

# ============================================================================
# Compliance Summary Schemas
# ============================================================================


class MunicipalComplianceSummary(BaseModel):
    """Schema for municipal-wide compliance statistics."""

    total_barangays: int = Field(..., description="Total number of barangays in the municipality")
    assessed_barangays: int = Field(
        ..., description="Number of barangays with completed assessments"
    )
    passed_barangays: int = Field(..., description="Number of barangays that passed SGLGB")
    failed_barangays: int = Field(..., description="Number of barangays that failed SGLGB")
    compliance_rate: float = Field(
        ..., description="Percentage of assessed barangays that passed (0-100)"
    )
    assessment_rate: float = Field(
        ..., description="Percentage of barangays that have been assessed (0-100)"
    )
    pending_mlgoo_approval: int = Field(
        ..., description="Number of assessments awaiting MLGOO approval"
    )
    in_progress: int = Field(
        ..., description="Number of assessments in progress (draft/submitted/rework)"
    )


# ============================================================================
# Governance Area Performance Schemas
# ============================================================================


class GovernanceAreaPerformance(BaseModel):
    """Schema for performance data of a single governance area."""

    id: int = Field(..., description="Governance area ID")
    name: str = Field(..., description="Governance area name")
    area_type: str = Field(..., description="Area type: CORE or ESSENTIAL")
    total_indicators: int = Field(..., description="Total number of indicators in this area")
    passed_count: int = Field(..., description="Number of barangays that passed this area")
    failed_count: int = Field(..., description="Number of barangays that failed this area")
    pass_rate: float = Field(
        ..., description="Percentage of barangays that passed this area (0-100)"
    )
    common_weaknesses: list[str] = Field(
        default_factory=list, description="Common weaknesses identified in this area"
    )


class GovernanceAreaPerformanceList(BaseModel):
    """Schema for list of governance area performance data."""

    areas: list[GovernanceAreaPerformance] = Field(
        default_factory=list, description="Performance data for each governance area"
    )
    core_areas_pass_rate: float = Field(..., description="Average pass rate across core areas")
    essential_areas_pass_rate: float = Field(
        ..., description="Average pass rate across essential areas"
    )


# ============================================================================
# Top Failing Indicators Schemas
# ============================================================================


class FailingIndicator(BaseModel):
    """Schema for a frequently failed indicator."""

    indicator_id: int = Field(..., description="Indicator ID")
    indicator_code: str = Field(..., description="Indicator code (e.g., GA1-01)")
    indicator_name: str = Field(..., description="Indicator name")
    governance_area: str = Field(
        ..., description="Name of the governance area this indicator belongs to"
    )
    governance_area_id: int = Field(..., description="Governance area ID")
    fail_count: int = Field(..., description="Number of barangays that failed this indicator")
    total_assessed: int = Field(..., description="Total barangays assessed for this indicator")
    fail_rate: float = Field(..., description="Percentage of barangays that failed (0-100)")
    common_issues: list[str] = Field(
        default_factory=list, description="Common issues identified for this indicator"
    )


class TopFailingIndicatorsList(BaseModel):
    """Schema for list of top failing indicators."""

    indicators: list[FailingIndicator] = Field(
        default_factory=list, description="Top failing indicators"
    )
    total_indicators_assessed: int = Field(
        ..., description="Total number of unique indicators assessed"
    )


# ============================================================================
# Aggregated CapDev Summary Schemas
# ============================================================================


class AggregatedCapDevSummary(BaseModel):
    """Schema for aggregated capacity development needs across all barangays."""

    total_assessments_with_capdev: int = Field(
        ..., description="Number of assessments with CapDev insights generated"
    )
    top_recommendations: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Most frequently recommended capacity development actions",
    )
    common_weaknesses_by_area: dict[str, list[str]] = Field(
        default_factory=dict, description="Common weaknesses grouped by governance area"
    )
    priority_interventions: list[dict[str, Any]] = Field(
        default_factory=list,
        description="High-priority interventions suggested across barangays",
    )
    skills_gap_analysis: dict[str, int] = Field(
        default_factory=dict,
        description="Frequency of skills mentioned as needing development",
    )


# ============================================================================
# Barangay Status Schemas
# ============================================================================


class BarangayAssessmentStatus(BaseModel):
    """Schema for a single barangay's assessment status."""

    barangay_id: int = Field(..., description="Barangay ID")
    barangay_name: str = Field(..., description="Barangay name")
    assessment_id: int | None = Field(None, description="Assessment ID if exists")
    status: str = Field(..., description="Assessment status")
    compliance_status: str | None = Field(
        None, description="Final compliance status: PASSED or FAILED"
    )
    submitted_at: datetime | None = Field(None, description="When assessment was submitted")
    mlgoo_approved_at: datetime | None = Field(
        None, description="When MLGOO approved the assessment"
    )
    overall_score: float | None = Field(None, description="Overall pass rate percentage")
    has_capdev_insights: bool = Field(
        False, description="Whether CapDev insights have been generated"
    )
    capdev_status: str | None = Field(None, description="CapDev insights generation status")


class BarangayStatusList(BaseModel):
    """Schema for list of barangay assessment statuses."""

    barangays: list[BarangayAssessmentStatus] = Field(
        default_factory=list, description="Status of each barangay"
    )
    total_count: int = Field(..., description="Total number of barangays")


# ============================================================================
# Municipal Overview Dashboard Response
# ============================================================================


class MunicipalOverviewDashboard(BaseModel):
    """Schema for the complete municipal overview dashboard data."""

    model_config = ConfigDict(from_attributes=True)

    # Summary statistics
    compliance_summary: MunicipalComplianceSummary = Field(
        ..., description="Municipal-wide compliance statistics"
    )

    # Governance area performance
    governance_area_performance: GovernanceAreaPerformanceList = Field(
        ..., description="Performance breakdown by governance area"
    )

    # Top failing indicators
    top_failing_indicators: TopFailingIndicatorsList = Field(
        ..., description="Most frequently failed indicators"
    )

    # Aggregated CapDev summary
    capdev_summary: AggregatedCapDevSummary = Field(
        ..., description="Aggregated capacity development needs"
    )

    # Barangay status list
    barangay_statuses: BarangayStatusList = Field(
        ..., description="Assessment status of each barangay"
    )

    # Metadata
    generated_at: datetime = Field(..., description="When this dashboard data was generated")
    assessment_cycle: str | None = Field(None, description="Assessment cycle filter if applied")


# ============================================================================
# Filter and Query Schemas
# ============================================================================


class MunicipalOverviewFilter(BaseModel):
    """Schema for filtering municipal overview data."""

    assessment_cycle: str | None = Field(None, description="Filter by assessment cycle")
    governance_area_id: int | None = Field(None, description="Filter by specific governance area")
    compliance_status: str | None = Field(
        None, description="Filter by compliance status: PASSED or FAILED"
    )
    include_draft: bool = Field(False, description="Whether to include draft assessments")


# ============================================================================
# Export Schemas
# ============================================================================


class MunicipalExportRequest(BaseModel):
    """Schema for requesting municipal data export."""

    format: str = Field(..., description="Export format: csv or pdf")
    include_sections: list[str] = Field(
        default_factory=lambda: [
            "compliance_summary",
            "governance_areas",
            "indicators",
            "capdev",
        ],
        description="Sections to include in export",
    )
    assessment_cycle: str | None = Field(None, description="Filter by assessment cycle")


class MunicipalExportResponse(BaseModel):
    """Schema for export response."""

    success: bool
    message: str
    filename: str | None = None
    download_url: str | None = None
