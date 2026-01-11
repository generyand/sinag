# 📊 External Analytics Schemas
# Pydantic models for external stakeholder analytics (Katuparan Center)
# These schemas provide aggregated, anonymized SGLGB data for research purposes


from pydantic import BaseModel, ConfigDict, Field


class OverallComplianceResponse(BaseModel):
    """
    Municipal-wide SGLGB compliance statistics.

    All data is aggregated across all barangays to prevent identification
    of individual barangay performance.
    """

    model_config = ConfigDict(from_attributes=True)

    total_barangays: int = Field(description="Total number of barangays assessed")
    passed_count: int = Field(description="Number of barangays that passed SGLGB")
    failed_count: int = Field(description="Number of barangays that failed SGLGB")
    pass_percentage: float = Field(description="Percentage of barangays that passed (0-100)")
    fail_percentage: float = Field(description="Percentage of barangays that failed (0-100)")
    assessment_cycle: str | None = Field(None, description="Assessment cycle identifier")


class GovernanceAreaPerformance(BaseModel):
    """
    Aggregated performance for a single governance area.

    Shows pass/fail rates at the area level without revealing individual
    barangay data.
    """

    model_config = ConfigDict(from_attributes=True)

    area_code: str = Field(description="Governance area code (e.g., 'FA', 'DM')")
    area_name: str = Field(description="Full governance area name")
    area_type: str = Field(description="Core or Essential")
    total_barangays_assessed: int = Field(description="Number of barangays assessed in this area")
    passed_count: int = Field(description="Number of barangays that passed this area")
    failed_count: int = Field(description="Number of barangays that failed this area")
    pass_percentage: float = Field(description="Percentage that passed this area (0-100)")
    fail_percentage: float = Field(description="Percentage that failed this area (0-100)")
    indicator_count: int = Field(description="Total number of indicators in this area")
    indicators_breakdown: list[dict] | None = Field(
        None, description="Breakdown showing % of barangays passing each indicator"
    )


class GovernanceAreaPerformanceResponse(BaseModel):
    """Response containing all governance area performance data."""

    model_config = ConfigDict(from_attributes=True)

    areas: list[GovernanceAreaPerformance] = Field(
        description="Performance data for all 6 governance areas"
    )


class TopFailingIndicator(BaseModel):
    """
    Information about a frequently failed indicator.

    Aggregated across all barangays to identify systemic weaknesses.
    """

    model_config = ConfigDict(from_attributes=True)

    indicator_id: int = Field(description="Indicator ID")
    indicator_code: str = Field(description="Indicator code (e.g., '1.1', '3.2')")
    indicator_name: str = Field(description="Full indicator name")
    governance_area_code: str = Field(description="Associated governance area")
    failure_count: int = Field(description="Number of barangays that failed this indicator")
    total_assessed: int = Field(description="Total barangays assessed on this indicator")
    failure_percentage: float = Field(description="Percentage of barangays that failed (0-100)")


class TopFailingIndicatorsResponse(BaseModel):
    """Response containing the top 5 most frequently failed indicators."""

    model_config = ConfigDict(from_attributes=True)

    top_failing_indicators: list[TopFailingIndicator] = Field(
        description="Top 5 indicators with highest failure rates"
    )


class AnonymizedInsight(BaseModel):
    """
    Anonymized AI-generated insight or recommendation.

    Aggregated across multiple assessments without attribution to specific barangays.
    """

    model_config = ConfigDict(from_attributes=True)

    governance_area_code: str = Field(description="Associated governance area")
    governance_area_name: str = Field(description="Full governance area name")
    theme: str = Field(
        description="Common theme (e.g., 'Budget Transparency', 'Disaster Preparedness')"
    )
    insight_summary: str = Field(description="Aggregated insight text")
    frequency: int = Field(description="Number of assessments this theme appeared in")
    priority: str | None = Field(None, description="Priority level: High, Medium, Low")


class AnonymizedAIInsightsResponse(BaseModel):
    """
    Response containing aggregated AI insights for Katuparan Center research.
    """

    model_config = ConfigDict(from_attributes=True)

    insights: list[AnonymizedInsight] = Field(description="Aggregated AI-generated insights")
    total_assessments_analyzed: int = Field(
        description="Total number of assessments used to generate these insights"
    )


class BBIFunctionalityDistribution(BaseModel):
    """
    Aggregated functionality distribution for a single BBI type.

    Shows the count and percentage of barangays at each functionality tier
    without revealing individual barangay identities.
    """

    model_config = ConfigDict(from_attributes=True)

    bbi_abbreviation: str = Field(description="BBI abbreviation (e.g., 'BDRRMC', 'BADAC')")
    bbi_name: str = Field(description="Full BBI name")
    governance_area_code: str = Field(description="Associated governance area code")
    highly_functional_count: int = Field(
        description="Count of barangays at 75-100% (Highly Functional)"
    )
    moderately_functional_count: int = Field(
        description="Count of barangays at 50-74% (Moderately Functional)"
    )
    low_functional_count: int = Field(description="Count of barangays at 1-49% (Low Functional)")
    non_functional_count: int = Field(description="Count of barangays at 0% (Non-Functional)")
    total_assessed: int = Field(description="Total number of barangays assessed for this BBI")
    highly_functional_percentage: float = Field(description="Percentage highly functional (0-100)")
    moderately_functional_percentage: float = Field(
        description="Percentage moderately functional (0-100)"
    )
    low_functional_percentage: float = Field(description="Percentage low functional (0-100)")
    non_functional_percentage: float = Field(description="Percentage non-functional (0-100)")


class BBIFunctionalityTrendsResponse(BaseModel):
    """
    Aggregated BBI functionality trends for Katuparan Center research.

    Shows functionality distribution across all BBI types, adhering to privacy
    constraints (minimum 5 barangays required).
    """

    model_config = ConfigDict(from_attributes=True)

    bbis: list[BBIFunctionalityDistribution] = Field(
        description="Functionality distribution for each BBI type"
    )
    total_barangays_assessed: int = Field(description="Total unique barangays with BBI data")
    assessment_year: int | None = Field(None, description="Assessment year filter (if applied)")


class AnonymizedBarangayStatus(BaseModel):
    """
    Anonymized status for a single barangay in the heatmap.

    Uses anonymous identifiers instead of actual barangay names to protect privacy.
    """

    model_config = ConfigDict(from_attributes=True)

    anonymous_id: str = Field(description="Anonymous identifier (e.g., 'Barangay A', 'Barangay B')")
    status: str = Field(description="Status: 'pass', 'fail', or 'in_progress'")


class GeographicHeatmapResponse(BaseModel):
    """
    Anonymized geographic data for heatmap visualization.

    Provides status data for visualization without revealing individual
    barangay identities. Map rendering uses anonymous identifiers.
    """

    model_config = ConfigDict(from_attributes=True)

    barangays: list[AnonymizedBarangayStatus] = Field(
        description="Anonymized status for each barangay"
    )
    summary: dict = Field(
        description="Summary counts: pass_count, fail_count, in_progress_count, not_started_count"
    )
    total_barangays: int = Field(description="Total number of barangays in the municipality")


class ExternalAnalyticsDashboardResponse(BaseModel):
    """
    Complete dashboard data for external stakeholders.

    This combines all analytics sections into a single response for
    efficient data loading.
    """

    model_config = ConfigDict(from_attributes=True)

    overall_compliance: OverallComplianceResponse
    governance_area_performance: GovernanceAreaPerformanceResponse
    top_failing_indicators: TopFailingIndicatorsResponse
    ai_insights: AnonymizedAIInsightsResponse
    bbi_trends: BBIFunctionalityTrendsResponse | None = Field(
        None, description="BBI functionality trends (optional, may be null if no BBI data)"
    )
    data_disclaimer: str = Field(
        default="This data is aggregated and anonymized. Individual barangay performance cannot be identified.",
        description="Privacy disclaimer",
    )
