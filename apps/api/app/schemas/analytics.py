# 📊 Analytics Schemas
# Pydantic models for analytics and dashboard-related API requests and responses

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

# ============================================================================
# Dashboard KPI Schemas
# ============================================================================


class ComplianceRate(BaseModel):
    """Overall compliance rate statistics."""

    model_config = ConfigDict(from_attributes=True)

    total_barangays: int = Field(..., description="Total number of barangays assessed")
    passed: int = Field(..., description="Number of barangays that passed")
    failed: int = Field(..., description="Number of barangays that failed")
    pass_percentage: float = Field(..., description="Percentage of barangays that passed", ge=0, le=100)


class AreaBreakdown(BaseModel):
    """Compliance breakdown by governance area."""

    model_config = ConfigDict(from_attributes=True)

    area_code: str = Field(..., description="Governance area code")
    area_name: str = Field(..., description="Governance area name")
    passed: int = Field(..., description="Number of barangays that passed this area")
    failed: int = Field(..., description="Number of barangays that failed this area")
    percentage: float = Field(..., description="Pass percentage for this area", ge=0, le=100)


class FailedIndicator(BaseModel):
    """Indicator with high failure rate."""

    model_config = ConfigDict(from_attributes=True)

    indicator_id: int = Field(..., description="Unique identifier for the indicator")
    indicator_name: str = Field(..., description="Name of the indicator")
    failure_count: int = Field(..., description="Number of times this indicator failed")
    percentage: float = Field(..., description="Failure rate as percentage", ge=0, le=100)


class BarangayRanking(BaseModel):
    """Barangay ranking based on compliance score."""

    model_config = ConfigDict(from_attributes=True)

    barangay_id: int = Field(..., description="Unique identifier for the barangay")
    barangay_name: str = Field(..., description="Name of the barangay")
    score: float = Field(..., description="Compliance score (0-100)", ge=0, le=100)
    rank: int = Field(..., description="Ranking position", ge=1)


class TrendData(BaseModel):
    """Historical trend data for a cycle."""

    model_config = ConfigDict(from_attributes=True)

    cycle_id: int = Field(..., description="Assessment cycle identifier")
    cycle_name: str = Field(..., description="Name of the assessment cycle")
    pass_rate: float = Field(..., description="Pass rate for this cycle", ge=0, le=100)
    date: datetime = Field(..., description="Date of the cycle")


class DashboardKPIResponse(BaseModel):
    """Complete dashboard KPI response containing all metrics."""

    model_config = ConfigDict(from_attributes=True)

    overall_compliance_rate: ComplianceRate = Field(..., description="Overall pass/fail statistics")
    completion_status: ComplianceRate = Field(..., description="Completion status of assessments")
    area_breakdown: List[AreaBreakdown] = Field(
        default_factory=list,
        description="Compliance breakdown by governance area"
    )
    top_failed_indicators: List[FailedIndicator] = Field(
        default_factory=list,
        description="Top 5 most frequently failed indicators",
        max_length=5
    )
    barangay_rankings: List[BarangayRanking] = Field(
        default_factory=list,
        description="Barangays ranked by compliance score"
    )
    trends: List[TrendData] = Field(
        default_factory=list,
        description="Historical trend data across cycles",
        max_length=3
    )


# ============================================================================
# Reports Page Schemas
# ============================================================================


class BarChartData(BaseModel):
    """Bar chart data for pass/fail rates by governance area."""

    model_config = ConfigDict(from_attributes=True)

    area_code: str = Field(..., description="Governance area code")
    area_name: str = Field(..., description="Governance area name")
    passed: int = Field(..., description="Number of barangays that passed")
    failed: int = Field(..., description="Number of barangays that failed")
    pass_percentage: float = Field(..., description="Pass rate percentage", ge=0, le=100)


class PieChartData(BaseModel):
    """Pie chart data for overall compliance status distribution."""

    model_config = ConfigDict(from_attributes=True)

    status: str = Field(..., description="Status label (Pass/Fail/In Progress)")
    count: int = Field(..., description="Number of barangays in this status", ge=0)
    percentage: float = Field(..., description="Percentage of total", ge=0, le=100)


class ChartData(BaseModel):
    """Container for all chart visualizations."""

    model_config = ConfigDict(from_attributes=True)

    bar_chart: List[BarChartData] = Field(
        default_factory=list,
        description="Bar chart data showing pass/fail rates by governance area"
    )
    pie_chart: List[PieChartData] = Field(
        default_factory=list,
        description="Pie chart data showing overall status distribution"
    )
    line_chart: List[TrendData] = Field(
        default_factory=list,
        description="Line chart data showing trends over cycles"
    )


class BarangayMapPoint(BaseModel):
    """Geographic data point for a barangay on the map."""

    model_config = ConfigDict(from_attributes=True)

    barangay_id: int = Field(..., description="Unique identifier for the barangay")
    name: str = Field(..., description="Barangay name")
    lat: Optional[float] = Field(None, description="Latitude coordinate")
    lng: Optional[float] = Field(None, description="Longitude coordinate")
    status: str = Field(..., description="Compliance status (Pass/Fail/In Progress)")
    score: Optional[float] = Field(None, description="Compliance score", ge=0, le=100)


class MapData(BaseModel):
    """Geographic map data for barangays."""

    model_config = ConfigDict(from_attributes=True)

    barangays: List[BarangayMapPoint] = Field(
        default_factory=list,
        description="List of barangays with geographic coordinates and status"
    )


class AssessmentRow(BaseModel):
    """Single row in the assessment data table."""

    model_config = ConfigDict(from_attributes=True)

    barangay_id: int = Field(..., description="Unique identifier for the barangay")
    barangay_name: str = Field(..., description="Name of the barangay")
    governance_area: str = Field(..., description="Governance area code")
    status: str = Field(..., description="Assessment status (Pass/Fail/In Progress)")
    score: Optional[float] = Field(None, description="Compliance score", ge=0, le=100)


class TableData(BaseModel):
    """Paginated table data for assessments."""

    model_config = ConfigDict(from_attributes=True)

    rows: List[AssessmentRow] = Field(
        default_factory=list,
        description="List of assessment rows for the current page"
    )
    total_count: int = Field(..., description="Total number of assessments matching filters", ge=0)
    page: int = Field(..., description="Current page number", ge=1)
    page_size: int = Field(..., description="Number of rows per page", ge=1, le=100)


class ReportMetadata(BaseModel):
    """Metadata about the generated report."""

    model_config = ConfigDict(from_attributes=True)

    generated_at: datetime = Field(..., description="Timestamp when the report was generated")
    cycle_id: Optional[int] = Field(None, description="Filter: Assessment cycle ID")
    start_date: Optional[datetime] = Field(None, description="Filter: Start date")
    end_date: Optional[datetime] = Field(None, description="Filter: End date")
    governance_areas: Optional[List[str]] = Field(None, description="Filter: Governance area codes")
    barangay_ids: Optional[List[int]] = Field(None, description="Filter: Barangay IDs")
    status: Optional[str] = Field(None, description="Filter: Status filter")


class ReportsDataResponse(BaseModel):
    """Complete reports page response with all visualizations and data."""

    model_config = ConfigDict(from_attributes=True)

    chart_data: ChartData = Field(..., description="Data for bar, pie, and line charts")
    map_data: MapData = Field(..., description="Geographic map data for barangays")
    table_data: TableData = Field(..., description="Paginated table data for assessments")
    metadata: ReportMetadata = Field(..., description="Report generation metadata and applied filters")
