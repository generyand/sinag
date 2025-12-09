# 🏛️ BBI Schemas
# Pydantic models for BBI-related API requests and responses

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.db.enums import BBIStatus

# ============================================================================
# BBI Schemas
# ============================================================================


class BBIBase(BaseModel):
    """Base BBI schema with common fields."""

    name: str = Field(..., description="BBI name")
    abbreviation: str = Field(..., description="BBI abbreviation")
    description: str | None = Field(None, description="BBI description")
    governance_area_id: int = Field(..., description="ID of the governance area")


class BBICreate(BBIBase):
    """Schema for creating a new BBI."""

    mapping_rules: dict[str, Any] | None = Field(
        None,
        description="JSON mapping rules for BBI functionality calculation",
    )


class BBIUpdate(BaseModel):
    """Schema for updating BBI information."""

    name: str | None = Field(None, description="BBI name")
    abbreviation: str | None = Field(None, description="BBI abbreviation")
    description: str | None = Field(None, description="BBI description")
    mapping_rules: dict[str, Any] | None = Field(
        None,
        description="JSON mapping rules for BBI functionality calculation",
    )


class BBIResponse(BBIBase):
    """BBI response model for API endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    mapping_rules: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime


class BBIWithGovernanceArea(BBIResponse):
    """BBI response with nested governance area information."""

    governance_area: "GovernanceAreaSummary"


# ============================================================================
# BBI Result Schemas
# ============================================================================


class BBIResultBase(BaseModel):
    """Base BBI result schema with common fields."""

    bbi_id: int = Field(..., description="BBI ID")
    assessment_id: int = Field(..., description="Assessment ID")


class BBIResultResponse(BBIResultBase):
    """BBI result response model for API endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    # Direct links for efficient queries
    barangay_id: int = Field(..., description="Barangay ID")
    assessment_year: int = Field(..., description="Assessment year")
    indicator_id: int | None = Field(None, description="Parent BBI indicator ID")

    # Compliance fields (DILG MC 2024-417 - 4-tier system)
    compliance_percentage: float = Field(..., description="Compliance rate 0-100%")
    compliance_rating: str = Field(
        ...,
        description="4-tier rating: HIGHLY_FUNCTIONAL, MODERATELY_FUNCTIONAL, LOW_FUNCTIONAL, NON_FUNCTIONAL",
    )
    sub_indicators_passed: int = Field(..., description="Number of sub-indicators that passed")
    sub_indicators_total: int = Field(..., description="Total number of sub-indicators evaluated")
    sub_indicator_results: list[dict[str, Any]] | None = Field(
        None, description="Detailed pass/fail results for each sub-indicator"
    )
    calculated_at: datetime = Field(..., description="When the compliance was calculated")


class BBIResultWithBBI(BBIResultResponse):
    """BBI result with nested BBI information."""

    bbi: BBIResponse


class BBIResultWithBarangay(BBIResultResponse):
    """BBI result with nested barangay and BBI information."""

    bbi: BBIResponse
    barangay_name: str | None = Field(None, description="Barangay name")


# ============================================================================
# BBI Compliance Schemas (DILG MC 2024-417)
# ============================================================================


class SubIndicatorResult(BaseModel):
    """Result for a single sub-indicator in BBI compliance calculation."""

    code: str = Field(..., description="Sub-indicator code (e.g., '2.1.1')")
    name: str = Field(..., description="Sub-indicator name (e.g., 'Structure')")
    passed: bool = Field(..., description="Whether the sub-indicator passed")
    validation_rule: str | None = Field(
        None,
        description="Validation rule used (ALL_ITEMS_REQUIRED or ANY_ITEM_REQUIRED)",
    )
    checklist_summary: dict[str, Any] | None = Field(
        None, description="Summary of checklist item results"
    )


class BBIComplianceResult(BaseModel):
    """Complete compliance result for a single BBI."""

    model_config = ConfigDict(from_attributes=True)

    bbi_id: int = Field(..., description="BBI ID")
    bbi_name: str = Field(..., description="BBI name")
    bbi_abbreviation: str = Field(..., description="BBI abbreviation (indicator code)")
    indicator_code: str | None = Field(None, description="Original indicator code (e.g., 2.1)")
    governance_area_id: int = Field(..., description="Governance area ID")
    governance_area_name: str | None = Field(None, description="Governance area name")
    assessment_id: int = Field(..., description="Assessment ID")
    barangay_id: int = Field(..., description="Barangay ID")
    assessment_year: int = Field(..., description="Assessment year")
    compliance_percentage: float = Field(..., description="Compliance rate 0-100%")
    compliance_rating: str = Field(
        ...,
        description="4-tier rating: HIGHLY_FUNCTIONAL, MODERATELY_FUNCTIONAL, LOW_FUNCTIONAL, NON_FUNCTIONAL",
    )
    sub_indicators_passed: int = Field(..., description="Number of sub-indicators that passed")
    sub_indicators_total: int = Field(..., description="Total number of sub-indicators evaluated")
    sub_indicator_results: list[SubIndicatorResult] = Field(
        ..., description="Detailed pass/fail results for each sub-indicator"
    )
    calculated_at: datetime = Field(..., description="When the compliance was calculated")


class BBIComplianceSummary(BaseModel):
    """Summary statistics for BBI compliance."""

    total_bbis: int = Field(..., description="Total number of BBIs evaluated")
    highly_functional_count: int = Field(
        ..., description="Number of BBIs with HIGHLY_FUNCTIONAL rating (75-100%)"
    )
    moderately_functional_count: int = Field(
        ..., description="Number of BBIs with MODERATELY_FUNCTIONAL rating (50-74%)"
    )
    low_functional_count: int = Field(
        ..., description="Number of BBIs with LOW_FUNCTIONAL rating (1-49%)"
    )
    non_functional_count: int = Field(
        0, description="Number of BBIs with NON_FUNCTIONAL rating (0%)"
    )
    average_compliance_percentage: float = Field(
        ..., description="Average compliance percentage across all BBIs"
    )


class AssessmentBBIComplianceResponse(BaseModel):
    """Complete BBI compliance response for an assessment."""

    assessment_id: int = Field(..., description="Assessment ID")
    barangay_id: int = Field(..., description="Barangay ID")
    barangay_name: str | None = Field(None, description="Barangay name")
    assessment_year: int = Field(..., description="Assessment year")
    bbi_results: list[BBIComplianceResult] = Field(
        ..., description="Compliance results for each BBI"
    )
    summary: BBIComplianceSummary = Field(..., description="Summary statistics for BBI compliance")
    calculated_at: datetime = Field(..., description="When the compliance was calculated")


class BarangayBBIComplianceResponse(BaseModel):
    """BBI compliance response for a specific barangay and year."""

    barangay_id: int = Field(..., description="Barangay ID")
    barangay_name: str | None = Field(None, description="Barangay name")
    assessment_year: int = Field(..., description="Assessment year")
    bbi_results: list[dict[str, Any]] = Field(..., description="Compliance results for each BBI")
    summary: BBIComplianceSummary = Field(..., description="Summary statistics for BBI compliance")


# ============================================================================
# Municipality BBI Analytics Schemas
# ============================================================================


class BBIInfo(BaseModel):
    """Basic BBI information."""

    bbi_id: int = Field(..., description="BBI ID")
    abbreviation: str = Field(..., description="BBI abbreviation (e.g., BDRRMC)")
    name: str = Field(..., description="Full BBI name")
    indicator_code: str | None = Field(None, description="Indicator code (e.g., 2.1)")


class BBIStatusInfo(BaseModel):
    """BBI status for a single barangay-BBI combination."""

    rating: str = Field(..., description="4-tier rating")
    percentage: float = Field(..., description="Compliance percentage")


class BarangayBBIStatus(BaseModel):
    """BBI statuses for a single barangay."""

    barangay_id: int = Field(..., description="Barangay ID")
    barangay_name: str = Field(..., description="Barangay name")
    bbi_statuses: dict[str, BBIStatusInfo] = Field(
        ..., description="BBI abbreviation -> status mapping"
    )


class BarangayDistributionItem(BaseModel):
    """Barangay info within a distribution category."""

    barangay_id: int = Field(..., description="Barangay ID")
    barangay_name: str = Field(..., description="Barangay name")
    percentage: float = Field(..., description="Compliance percentage")


class BBIDistribution(BaseModel):
    """Distribution of functionality levels for a single BBI."""

    highly_functional: list[BarangayDistributionItem] = Field(
        default_factory=list, description="Barangays with HIGHLY_FUNCTIONAL rating"
    )
    moderately_functional: list[BarangayDistributionItem] = Field(
        default_factory=list, description="Barangays with MODERATELY_FUNCTIONAL rating"
    )
    low_functional: list[BarangayDistributionItem] = Field(
        default_factory=list, description="Barangays with LOW_FUNCTIONAL rating"
    )
    non_functional: list[BarangayDistributionItem] = Field(
        default_factory=list, description="Barangays with NON_FUNCTIONAL rating"
    )


class MunicipalityBBIAnalyticsSummary(BaseModel):
    """Summary statistics for municipality-wide BBI analytics."""

    total_barangays: int = Field(..., description="Total number of barangays with BBI data")
    total_bbis: int = Field(..., description="Total number of BBIs tracked")
    overall_highly_functional: int = Field(
        ..., description="Total HIGHLY_FUNCTIONAL ratings across all BBIs"
    )
    overall_moderately_functional: int = Field(
        ..., description="Total MODERATELY_FUNCTIONAL ratings across all BBIs"
    )
    overall_low_functional: int = Field(
        ..., description="Total LOW_FUNCTIONAL ratings across all BBIs"
    )
    overall_non_functional: int = Field(
        ..., description="Total NON_FUNCTIONAL ratings across all BBIs"
    )


class MunicipalityBBIAnalyticsResponse(BaseModel):
    """Complete municipality-wide BBI analytics response for MLGOO reports."""

    assessment_year: int = Field(..., description="Assessment year")
    bbis: list[BBIInfo] = Field(..., description="List of BBIs with their info")
    barangays: list[BarangayBBIStatus] = Field(
        ..., description="List of barangays with their BBI statuses"
    )
    bbi_distributions: dict[str, BBIDistribution] = Field(
        ..., description="BBI abbreviation -> distribution mapping for donut charts"
    )
    summary: MunicipalityBBIAnalyticsSummary = Field(
        ..., description="Summary statistics"
    )


# ============================================================================
# Supporting Schemas
# ============================================================================


class GovernanceAreaSummary(BaseModel):
    """Summary of governance area for nested relationships."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


# ============================================================================
# Test Calculation Schemas
# ============================================================================


class TestBBICalculationRequest(BaseModel):
    """Request schema for testing BBI calculation logic."""

    mapping_rules: dict[str, Any] = Field(
        ...,
        description="Mapping rules to test",
    )
    indicator_statuses: dict[int, str] = Field(
        ...,
        description="Sample indicator statuses (indicator_id -> Pass/Fail)",
    )


class TestBBICalculationResponse(BaseModel):
    """Response schema for BBI calculation test."""

    predicted_status: BBIStatus = Field(
        ...,
        description="Predicted BBI status based on test inputs",
    )
    evaluation_details: dict[str, Any] = Field(
        ...,
        description="Details of how the calculation was performed",
    )
