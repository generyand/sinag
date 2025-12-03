# CapDev (Capacity Development) Schemas
# Pydantic models for AI-powered capacity development insights API

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ============================================================================
# CapDev Insight Component Schemas
# ============================================================================


class GovernanceWeakness(BaseModel):
    """Schema for a governance weakness identified by AI."""

    area_name: str = Field(..., description="Name of the governance area")
    description: str = Field(..., description="Description of the weakness")
    severity: str = Field(
        ..., description="Severity level: high, medium, low"
    )


class CapDevRecommendation(BaseModel):
    """Schema for a specific capacity development recommendation."""

    title: str = Field(..., description="Short title of the recommendation")
    description: str = Field(..., description="Detailed description")
    governance_area: Optional[str] = Field(
        None, description="Related governance area if applicable"
    )
    priority: str = Field(
        "medium", description="Priority level: high, medium, low"
    )
    expected_impact: Optional[str] = Field(
        None, description="Expected impact of implementing this recommendation"
    )


class CapDevNeed(BaseModel):
    """Schema for an identified capacity development need."""

    area: str = Field(..., description="Area requiring development")
    current_gap: str = Field(..., description="Description of the current gap")
    target_state: str = Field(..., description="Desired target state")
    skills_required: Optional[List[str]] = Field(
        None, description="Skills that need to be developed"
    )


class SuggestedIntervention(BaseModel):
    """Schema for a suggested capacity development intervention."""

    intervention_type: str = Field(
        ..., description="Type: training, workshop, mentoring, etc."
    )
    title: str = Field(..., description="Title of the intervention")
    description: str = Field(..., description="Detailed description")
    target_audience: str = Field(
        ..., description="Who should participate"
    )
    estimated_duration: Optional[str] = Field(
        None, description="Estimated duration (e.g., '2 days', '1 week')"
    )
    resources_needed: Optional[List[str]] = Field(
        None, description="Resources required for the intervention"
    )


class PriorityAction(BaseModel):
    """Schema for a priority action item."""

    action: str = Field(..., description="Specific action to be taken")
    responsible_party: str = Field(
        ..., description="Who is responsible for this action"
    )
    timeline: str = Field(
        ..., description="Suggested timeline (immediate, short-term, medium-term)"
    )
    success_indicator: Optional[str] = Field(
        None, description="How to measure success"
    )


# ============================================================================
# CapDev Insights Response Schemas
# ============================================================================


class CapDevInsightsContent(BaseModel):
    """Schema for the content of CapDev insights in a specific language."""

    summary: str = Field(
        ..., description="Executive summary of the CapDev analysis"
    )
    governance_weaknesses: List[GovernanceWeakness] = Field(
        default_factory=list, description="Identified governance weaknesses"
    )
    recommendations: List[CapDevRecommendation] = Field(
        default_factory=list, description="Capacity development recommendations"
    )
    capacity_development_needs: List[CapDevNeed] = Field(
        default_factory=list, description="Identified capacity development needs"
    )
    suggested_interventions: List[SuggestedIntervention] = Field(
        default_factory=list, description="Suggested interventions"
    )
    priority_actions: List[PriorityAction] = Field(
        default_factory=list, description="Priority action items"
    )
    generated_at: Optional[datetime] = Field(
        None, description="When this content was generated"
    )


class CapDevInsightsResponse(BaseModel):
    """Schema for the full CapDev insights response including metadata."""

    model_config = ConfigDict(from_attributes=True)

    assessment_id: int = Field(..., description="ID of the assessment")
    barangay_name: str = Field(..., description="Name of the barangay")
    status: str = Field(
        ..., description="Status of CapDev generation: pending, generating, completed, failed"
    )
    generated_at: Optional[datetime] = Field(
        None, description="When insights were generated"
    )
    available_languages: List[str] = Field(
        default_factory=list, description="Languages available (e.g., ['ceb', 'en'])"
    )
    # Use Dict[str, Any] instead of Dict[str, CapDevInsightsContent] to accept
    # flexible AI-generated content structures (strings, objects, etc.)
    insights: Optional[Dict[str, Any]] = Field(
        None, description="Insights keyed by language code"
    )


class CapDevInsightsByLanguage(BaseModel):
    """Schema for CapDev insights in a specific language."""

    model_config = ConfigDict(from_attributes=True)

    assessment_id: int
    barangay_name: str
    language: str = Field(..., description="Language code: ceb, en, fil")
    # Use Any instead of CapDevInsightsContent to accept flexible AI-generated content
    content: Optional[Any] = None
    status: str = Field(
        ..., description="Status: pending, generating, completed, failed, not_available"
    )
    generated_at: Optional[datetime] = None


# ============================================================================
# CapDev Status Schemas
# ============================================================================


class CapDevStatusResponse(BaseModel):
    """Schema for checking CapDev insights generation status."""

    assessment_id: int
    status: str = Field(
        ..., description="Status: pending, generating, completed, failed"
    )
    generated_at: Optional[datetime] = None
    available_languages: List[str] = Field(default_factory=list)
    message: Optional[str] = None


class CapDevTriggerResponse(BaseModel):
    """Schema for manually triggering CapDev insights generation."""

    success: bool
    message: str
    assessment_id: int
    task_id: Optional[str] = Field(
        None, description="Celery task ID if generation was queued"
    )


# ============================================================================
# Aggregated CapDev Schemas (for Katuparan Center)
# ============================================================================


class AggregatedRecommendation(BaseModel):
    """Schema for an aggregated recommendation across multiple barangays."""

    title: str
    description: str
    frequency: int = Field(
        ..., description="Number of barangays where this recommendation appears"
    )
    governance_area: Optional[str] = None
    priority: str = "medium"


class AggregatedCapDevNeed(BaseModel):
    """Schema for an aggregated capacity development need."""

    area: str
    description: str
    frequency: int = Field(
        ..., description="Number of barangays with this need"
    )
    common_gaps: List[str] = Field(
        default_factory=list, description="Common gaps identified"
    )


class AggregatedCapDevInsights(BaseModel):
    """Schema for aggregated CapDev insights for external stakeholders."""

    model_config = ConfigDict(from_attributes=True)

    total_assessments_analyzed: int = Field(
        ..., description="Number of assessments included in aggregation"
    )
    data_as_of: datetime = Field(
        ..., description="When this aggregation was computed"
    )
    top_recommendations: List[AggregatedRecommendation] = Field(
        default_factory=list, description="Most common recommendations"
    )
    common_capacity_needs: List[AggregatedCapDevNeed] = Field(
        default_factory=list, description="Most common capacity development needs"
    )
    governance_area_summary: Dict[str, Any] = Field(
        default_factory=dict,
        description="Summary of weaknesses by governance area"
    )
    privacy_notice: str = Field(
        default="Data is aggregated and anonymized. Individual barangay data is not disclosed.",
        description="Privacy notice for external stakeholders"
    )
