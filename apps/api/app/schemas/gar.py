# GAR (Governance Assessment Report) Schemas
# Pydantic models for GAR API responses

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.schemas.bbi import AssessmentBBIComplianceResponse


class GARChecklistItem(BaseModel):
    """Single checklist item (MOV) with validation result."""

    item_id: str = Field(..., description="Unique item identifier (e.g., '1_1_1_a')")
    label: str = Field(..., description="Display text (e.g., 'Barangay Financial Report')")
    item_type: str = Field(
        ..., description="Item type: checkbox, info_text, assessment_field, document_count, calculation_field"
    )
    group_name: Optional[str] = Field(None, description="Group header (e.g., 'ANNUAL REPORT')")
    validation_result: Optional[str] = Field(
        None, description="Validation result: 'met', 'considered', 'unmet', or null"
    )
    display_order: int = Field(0, description="Sort order within indicator")


class GARIndicator(BaseModel):
    """Single indicator with its checklist items and validation status."""

    indicator_id: int = Field(..., description="Database ID of the indicator")
    indicator_code: str = Field(..., description="Indicator code (e.g., '1.1', '1.1.1')")
    indicator_name: str = Field(..., description="Indicator name/description")
    validation_status: Optional[str] = Field(
        None, description="Overall validation status: 'Pass', 'Fail', 'Conditional', or null"
    )
    checklist_items: List[GARChecklistItem] = Field(
        default_factory=list, description="List of checklist items under this indicator"
    )
    is_header: bool = Field(
        False, description="True if this is a container/header indicator (e.g., '1.1' parent of '1.1.1')"
    )
    indent_level: int = Field(0, description="Indentation level for display (0=root, 1=sub, 2=sub-sub)")


class GARGovernanceArea(BaseModel):
    """Single governance area with all its indicators."""

    area_id: int = Field(..., description="Database ID of the governance area")
    area_code: str = Field(..., description="Area code (e.g., 'FI', 'DI', 'SA')")
    area_name: str = Field(..., description="Full area name (e.g., 'Financial Administration and Sustainability')")
    area_type: str = Field(..., description="'Core' or 'Essential'")
    area_number: int = Field(..., description="Area number for display (1-6)")
    indicators: List[GARIndicator] = Field(default_factory=list, description="List of indicators in this area")
    overall_result: Optional[str] = Field(None, description="Overall area result: 'Passed' or 'Failed'")
    met_count: int = Field(0, description="Number of indicators with 'met' status")
    considered_count: int = Field(0, description="Number of indicators with 'considered' status")
    unmet_count: int = Field(0, description="Number of indicators with 'unmet' status")


class GARSummaryItem(BaseModel):
    """Summary table row for a governance area."""

    area_name: str = Field(..., description="Governance area name")
    area_type: str = Field(..., description="'Core' or 'Essential'")
    result: Optional[str] = Field(None, description="'Passed' or 'Failed'")


class GARResponse(BaseModel):
    """Complete GAR response for a single assessment."""

    assessment_id: int = Field(..., description="Database ID of the assessment")
    barangay_name: str = Field(..., description="Name of the barangay")
    municipality: str = Field("Sulop", description="Municipality name")
    province: str = Field("Davao del Sur", description="Province name")
    cycle_year: str = Field(..., description="Assessment cycle (e.g., 'CY 2025 SGLGB (PY 2024)')")
    governance_areas: List[GARGovernanceArea] = Field(
        default_factory=list, description="List of governance areas with indicators"
    )
    summary: List[GARSummaryItem] = Field(default_factory=list, description="Summary table data")
    bbi_compliance: Optional[AssessmentBBIComplianceResponse] = Field(
        None, description="BBI compliance data per DILG MC 2024-417"
    )
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="Report generation timestamp")


class GARAssessmentListItem(BaseModel):
    """Assessment item for GAR selection dropdown."""

    assessment_id: int = Field(..., description="Database ID of the assessment")
    barangay_name: str = Field(..., description="Name of the barangay")
    status: str = Field(..., description="Assessment status")
    submitted_at: Optional[datetime] = Field(None, description="Submission timestamp")
    validated_at: Optional[datetime] = Field(None, description="Validation completion timestamp")


class GARAssessmentListResponse(BaseModel):
    """Response for listing assessments available for GAR."""

    assessments: List[GARAssessmentListItem] = Field(default_factory=list, description="List of completed assessments")
    total: int = Field(0, description="Total count of assessments")
