"""
Compliance Overview Schemas

Pydantic schemas for the Compliance Overview feature.
"""

from typing import Literal

from pydantic import BaseModel


class SubIndicatorStatus(BaseModel):
    """Status of a single sub-indicator (3-level)."""

    indicator_id: int
    indicator_code: str
    name: str
    response_id: int | None = None  # Assessment response ID for override API
    validation_status: Literal["PASS", "FAIL", "CONDITIONAL"] | None = (
        None  # Actual confirmed status
    )
    recommended_status: Literal["PASS", "FAIL"] | None = (
        None  # Auto-calculated recommendation (glow)
    )
    has_checklist_data: bool = False  # True if validator has checked any checklist items


class ParentIndicatorCompliance(BaseModel):
    """Compliance summary for a parent indicator (2-level)."""

    indicator_id: int
    indicator_code: str
    name: str
    is_bbi: bool

    # Sub-indicator stats
    sub_indicators_total: int
    sub_indicators_passed: int
    sub_indicators_failed: int
    sub_indicators_pending: int

    # BBI-specific (only if is_bbi=True)
    bbi_functionality_level: str | None = None  # HIGHLY_FUNCTIONAL, etc.
    bbi_abbreviation: str | None = None

    # Non-BBI (only if is_bbi=False)
    compliance_status: Literal["MET", "UNMET"] | None = None

    # All sub-indicators validated?
    all_validated: bool

    # List of sub-indicators
    sub_indicators: list[SubIndicatorStatus]


class GovernanceAreaCompliance(BaseModel):
    """Compliance summary for a governance area."""

    governance_area_id: int
    governance_area_name: str
    governance_area_code: str
    indicators: list[ParentIndicatorCompliance]


class ComplianceOverviewResponse(BaseModel):
    """Full compliance overview for an assessment."""

    assessment_id: int
    barangay_name: str
    assessment_year: int
    assessment_status: str
    all_sub_indicators_validated: bool  # Master flag for enabling buttons
    governance_areas: list[GovernanceAreaCompliance]
