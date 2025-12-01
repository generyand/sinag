# 📊 External Analytics Schemas
# Pydantic models for external stakeholder analytics (Katuparan Center)
# These schemas provide aggregated, anonymized SGLGB data for research purposes

from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional


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
    assessment_cycle: Optional[str] = Field(None, description="Assessment cycle identifier")


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
    indicators_breakdown: Optional[List[dict]] = Field(
        None,
        description="Breakdown showing % of barangays passing each indicator"
    )


class GovernanceAreaPerformanceResponse(BaseModel):
    """Response containing all governance area performance data."""

    model_config = ConfigDict(from_attributes=True)

    areas: List[GovernanceAreaPerformance] = Field(description="Performance data for all 6 governance areas")


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

    top_failing_indicators: List[TopFailingIndicator] = Field(
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
    theme: str = Field(description="Common theme (e.g., 'Budget Transparency', 'Disaster Preparedness')")
    insight_summary: str = Field(description="Aggregated insight text")
    frequency: int = Field(description="Number of assessments this theme appeared in")
    priority: Optional[str] = Field(None, description="Priority level: High, Medium, Low")


class AnonymizedAIInsightsResponse(BaseModel):
    """
    Response containing aggregated AI insights for Katuparan Center research.
    """

    model_config = ConfigDict(from_attributes=True)

    insights: List[AnonymizedInsight] = Field(description="Aggregated AI-generated insights")
    total_assessments_analyzed: int = Field(
        description="Total number of assessments used to generate these insights"
    )


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
    data_disclaimer: str = Field(
        default="This data is aggregated and anonymized. Individual barangay performance cannot be identified.",
        description="Privacy disclaimer"
    )
