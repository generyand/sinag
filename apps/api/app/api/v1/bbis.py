# 🏛️ BBI API Routes
# Endpoints for BBI (Barangay-based Institutions) management
# Updated: 4-tier compliance rating system (DILG MC 2024-417)

import math
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.api import deps
from app.db.enums import BBIStatus
from app.db.models.assessment import Assessment
from app.db.models.barangay import Barangay
from app.db.models.user import User
from app.schemas.bbi import (
    AssessmentBBIComplianceResponse,
    BarangayBBIComplianceResponse,
    BBIComplianceResult,
    BBIComplianceSummary,
    BBICreate,
    BBIResponse,
    BBIResultResponse,
    BBIUpdate,
    BBIWithGovernanceArea,
    SubIndicatorResult,
    TestBBICalculationRequest,
    TestBBICalculationResponse,
)
from app.services.bbi_service import bbi_service

router = APIRouter()


# ============================================================================
# Response Models
# ============================================================================


class BBIListResponse(BaseModel):
    """Response model for paginated BBI list."""

    bbis: list[BBIWithGovernanceArea]
    total: int
    page: int
    size: int
    total_pages: int


# ============================================================================
# BBI CRUD Endpoints
# ============================================================================


@router.post("/", response_model=BBIResponse, status_code=status.HTTP_201_CREATED, tags=["bbis"])
async def create_bbi(
    bbi_create: BBICreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Create a new BBI.

    Requires admin privileges (MLGOO_DILG role).

    The BBI will be created with the provided name, abbreviation, description,
    and governance area. Optionally, mapping_rules can be provided to define
    how indicator statuses map to BBI functionality status.
    """
    bbi = bbi_service.create_bbi(
        db,
        {
            "name": bbi_create.name,
            "abbreviation": bbi_create.abbreviation,
            "description": bbi_create.description,
            "governance_area_id": bbi_create.governance_area_id,
            "mapping_rules": bbi_create.mapping_rules,
        },
    )
    return bbi


@router.get("/", response_model=BBIListResponse, tags=["bbis"])
async def list_bbis(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    governance_area_id: int | None = Query(None, description="Filter by governance area ID"),
    is_active: bool | None = Query(None, description="Filter by active status"),
):
    """
    Get paginated list of BBIs with optional filtering.

    Accessible by all authenticated users.

    Filters:
    - governance_area_id: Filter BBIs by governance area
    - is_active: Filter by active/inactive status
    """
    skip = (page - 1) * size

    # Get total count for pagination
    all_bbis = bbi_service.list_bbis(
        db,
        governance_area_id=governance_area_id,
        is_active=is_active,
        skip=0,
        limit=10000,  # Get all for counting
    )
    total = len(all_bbis)

    # Get paginated results
    bbis = bbi_service.list_bbis(
        db,
        governance_area_id=governance_area_id,
        is_active=is_active,
        skip=skip,
        limit=size,
    )

    total_pages = math.ceil(total / size) if total > 0 else 0

    return BBIListResponse(bbis=bbis, total=total, page=page, size=size, total_pages=total_pages)


@router.get("/{bbi_id}", response_model=BBIWithGovernanceArea, tags=["bbis"])
async def get_bbi(
    bbi_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Get BBI details by ID.

    Accessible by all authenticated users.

    Returns the BBI with its full configuration including mapping_rules
    and associated governance area information.
    """
    bbi = bbi_service.get_bbi(db, bbi_id)
    if not bbi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"BBI with ID {bbi_id} not found",
        )
    return bbi


@router.put("/{bbi_id}", response_model=BBIResponse, tags=["bbis"])
async def update_bbi(
    bbi_id: int,
    bbi_update: BBIUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Update a BBI.

    Requires admin privileges (MLGOO_DILG role).

    Allows updating BBI metadata (name, abbreviation, description)
    and mapping_rules configuration.
    """
    # Convert Pydantic model to dict, excluding None values
    update_data = bbi_update.model_dump(exclude_none=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    bbi = bbi_service.update_bbi(db, bbi_id, update_data)
    return bbi


@router.delete("/{bbi_id}", response_model=BBIResponse, tags=["bbis"])
async def deactivate_bbi(
    bbi_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Deactivate a BBI (soft delete).

    Requires admin privileges (MLGOO_DILG role).

    Sets the BBI's is_active flag to False. The BBI will no longer
    be included in active BBI calculations but its data is preserved.
    """
    bbi = bbi_service.deactivate_bbi(db, bbi_id)
    return bbi


# ============================================================================
# BBI Testing & Calculation Endpoints
# ============================================================================


@router.post("/test-calculation", response_model=TestBBICalculationResponse, tags=["bbis"])
async def test_bbi_calculation(
    request: TestBBICalculationRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Test BBI calculation logic without saving to database.

    Requires admin privileges (MLGOO_DILG role).

    This endpoint allows testing mapping_rules against sample indicator
    statuses to preview the resulting BBI status (Functional/Non-Functional)
    before saving the configuration.

    Request body:
    - mapping_rules: The mapping rules configuration to test
    - indicator_statuses: Sample indicator statuses (indicator_id -> "Pass"/"Fail")

    Returns:
    - predicted_status: The calculated BBI status
    - evaluation_details: Details of how the calculation was performed
    """
    try:
        # Use the service's evaluation method
        is_functional = bbi_service._evaluate_mapping_rules(
            request.mapping_rules, request.indicator_statuses
        )

        from app.db.enums import BBIStatus

        # Use HIGHLY_FUNCTIONAL for backward compatibility (replaces old FUNCTIONAL in 4-tier system)
        predicted_status = (
            BBIStatus.HIGHLY_FUNCTIONAL if is_functional else BBIStatus.NON_FUNCTIONAL
        )

        # Build evaluation details
        operator = request.mapping_rules.get("operator", "AND")
        conditions = request.mapping_rules.get("conditions", [])

        condition_results = []
        for condition in conditions:
            indicator_id = condition.get("indicator_id")
            required_status = condition.get("required_status")
            actual_status = request.indicator_statuses.get(indicator_id, "Unknown")

            condition_results.append(
                {
                    "indicator_id": indicator_id,
                    "required_status": required_status,
                    "actual_status": actual_status,
                    "matches": actual_status == required_status,
                }
            )

        evaluation_details = {
            "operator": operator,
            "conditions_evaluated": len(conditions),
            "condition_results": condition_results,
            "logic": f"Using {operator} logic: "
            + (
                "all conditions must match"
                if operator == "AND"
                else "at least one condition must match"
            ),
        }

        return TestBBICalculationResponse(
            predicted_status=predicted_status, evaluation_details=evaluation_details
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error evaluating mapping rules: {str(e)}",
        )


# ============================================================================
# BBI Results Endpoints
# ============================================================================


@router.get(
    "/results/assessment/{assessment_id}",
    response_model=list[BBIResultResponse],
    tags=["bbis"],
)
async def get_assessment_bbi_results(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Get all BBI results for a specific assessment.

    Accessible by all authenticated users.

    Returns the calculated BBI statuses (Functional/Non-Functional)
    for all BBIs in the context of a completed assessment.
    """
    bbi_results = bbi_service.get_bbi_results(db, assessment_id)
    return bbi_results


# ============================================================================
# BBI Compliance Endpoints (DILG MC 2024-417)
# ============================================================================


@router.get(
    "/compliance/assessment/{assessment_id}",
    response_model=AssessmentBBIComplianceResponse,
    tags=["bbis"],
)
async def get_assessment_bbi_compliance(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Get BBI compliance data for a specific assessment (DILG MC 2024-417).

    Accessible by all authenticated users.

    Returns the compliance rate and 4-tier rating for all BBI indicators:
    - HIGHLY_FUNCTIONAL: 75% - 100% compliance
    - MODERATELY_FUNCTIONAL: 50% - 74% compliance
    - LOW_FUNCTIONAL: 1% - 49% compliance
    - NON_FUNCTIONAL: 0% compliance

    Includes detailed sub-indicator pass/fail breakdown for each BBI.
    """
    # Get assessment with barangay info
    assessment = (
        db.query(Assessment)
        .options(joinedload(Assessment.blgu_user).joinedload(User.barangay))
        .filter(Assessment.id == assessment_id)
        .first()
    )
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with ID {assessment_id} not found",
        )

    # Get barangay info
    barangay_name = None
    barangay_id = None
    if assessment.blgu_user and assessment.blgu_user.barangay_id:
        barangay_id = assessment.blgu_user.barangay_id
        if assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

    # Get existing BBI results
    bbi_results = bbi_service.get_bbi_results(db, assessment_id)

    if not bbi_results:
        # Calculate compliance if not yet done
        bbi_results = bbi_service.calculate_all_bbi_compliance(db, assessment)

    # Transform results to compliance response format
    compliance_results = []
    highly_functional_count = 0
    moderately_functional_count = 0
    low_functional_count = 0
    non_functional_count = 0
    total_percentage = 0.0

    for result in bbi_results:
        # Get BBI and governance area info
        bbi = result.bbi
        governance_area_name = bbi.governance_area.name if bbi.governance_area else None
        indicator_code = result.indicator.indicator_code if result.indicator else None

        # Parse sub_indicator_results
        sub_results = []
        if result.sub_indicator_results:
            for sr in result.sub_indicator_results:
                sub_results.append(
                    SubIndicatorResult(
                        code=sr.get("code", ""),
                        name=sr.get("name", ""),
                        passed=sr.get("passed", False),
                        validation_rule=sr.get("validation_rule"),
                        checklist_summary=sr.get("checklist_summary"),
                    )
                )

        compliance_result = BBIComplianceResult(
            bbi_id=result.bbi_id,
            bbi_name=bbi.name,
            bbi_abbreviation=bbi.abbreviation,
            indicator_code=indicator_code,
            governance_area_id=bbi.governance_area_id,
            governance_area_name=governance_area_name,
            assessment_id=assessment_id,
            barangay_id=result.barangay_id,
            assessment_year=result.assessment_year,
            compliance_percentage=result.compliance_percentage,
            compliance_rating=result.compliance_rating,
            sub_indicators_passed=result.sub_indicators_passed,
            sub_indicators_total=result.sub_indicators_total,
            sub_indicator_results=sub_results,
            calculated_at=result.calculated_at,
        )
        compliance_results.append(compliance_result)

        # Update counts based on 4-tier rating
        rating = result.compliance_rating
        if rating == BBIStatus.HIGHLY_FUNCTIONAL.value:
            highly_functional_count += 1
        elif rating == BBIStatus.MODERATELY_FUNCTIONAL.value:
            moderately_functional_count += 1
        elif rating == BBIStatus.LOW_FUNCTIONAL.value:
            low_functional_count += 1
        elif rating == BBIStatus.NON_FUNCTIONAL.value:
            non_functional_count += 1

        total_percentage += result.compliance_percentage

    # Calculate summary
    total_bbis = len(compliance_results)
    avg_percentage = (total_percentage / total_bbis) if total_bbis > 0 else 0.0

    summary = BBIComplianceSummary(
        total_bbis=total_bbis,
        highly_functional_count=highly_functional_count,
        moderately_functional_count=moderately_functional_count,
        low_functional_count=low_functional_count,
        non_functional_count=non_functional_count,
        average_compliance_percentage=round(avg_percentage, 2),
    )

    # Use the most recent calculated_at from results
    latest_calculated_at = max(
        (r.calculated_at for r in bbi_results if r.calculated_at),
        default=datetime.utcnow(),
    )

    return AssessmentBBIComplianceResponse(
        assessment_id=assessment_id,
        barangay_id=barangay_id or 0,
        barangay_name=barangay_name,
        assessment_year=assessment.assessment_year,
        bbi_results=compliance_results,
        summary=summary,
        calculated_at=latest_calculated_at,
    )


@router.post(
    "/compliance/calculate/{assessment_id}",
    response_model=AssessmentBBIComplianceResponse,
    tags=["bbis"],
)
async def calculate_assessment_bbi_compliance(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Calculate/recalculate BBI compliance for an assessment.

    Requires admin privileges (MLGOO_DILG role).

    This endpoint calculates compliance rates for all BBI indicators based on
    validator decisions (AssessmentResponse.validation_status) and stores
    the results in the database.

    4-tier rating system (DILG MC 2024-417):
    - HIGHLY_FUNCTIONAL: 75% - 100% compliance
    - MODERATELY_FUNCTIONAL: 50% - 74% compliance
    - LOW_FUNCTIONAL: 1% - 49% compliance
    - NON_FUNCTIONAL: 0% compliance

    Use this endpoint to:
    - Calculate compliance for a newly finalized assessment
    - Recalculate compliance if validator decisions have changed
    """
    # Get assessment with BLGU user info
    assessment = (
        db.query(Assessment)
        .options(joinedload(Assessment.blgu_user).joinedload(User.barangay))
        .filter(Assessment.id == assessment_id)
        .first()
    )
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with ID {assessment_id} not found",
        )

    # Calculate compliance
    bbi_results = bbi_service.calculate_all_bbi_compliance(db, assessment)
    db.commit()  # Commit after calculation

    # Get barangay info
    barangay_name = None
    barangay_id = None
    if assessment.blgu_user and assessment.blgu_user.barangay_id:
        barangay_id = assessment.blgu_user.barangay_id
        if assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

    # Transform results
    compliance_results = []
    highly_functional_count = 0
    moderately_functional_count = 0
    low_functional_count = 0
    non_functional_count = 0
    total_percentage = 0.0

    for result in bbi_results:
        bbi = result.bbi
        governance_area_name = bbi.governance_area.name if bbi.governance_area else None
        indicator_code = result.indicator.indicator_code if result.indicator else None

        sub_results = []
        if result.sub_indicator_results:
            for sr in result.sub_indicator_results:
                sub_results.append(
                    SubIndicatorResult(
                        code=sr.get("code", ""),
                        name=sr.get("name", ""),
                        passed=sr.get("passed", False),
                        validation_rule=sr.get("validation_rule"),
                        checklist_summary=sr.get("checklist_summary"),
                    )
                )

        compliance_result = BBIComplianceResult(
            bbi_id=result.bbi_id,
            bbi_name=bbi.name,
            bbi_abbreviation=bbi.abbreviation,
            indicator_code=indicator_code,
            governance_area_id=bbi.governance_area_id,
            governance_area_name=governance_area_name,
            assessment_id=assessment_id,
            barangay_id=result.barangay_id,
            assessment_year=result.assessment_year,
            compliance_percentage=result.compliance_percentage,
            compliance_rating=result.compliance_rating,
            sub_indicators_passed=result.sub_indicators_passed,
            sub_indicators_total=result.sub_indicators_total,
            sub_indicator_results=sub_results,
            calculated_at=result.calculated_at,
        )
        compliance_results.append(compliance_result)

        # Update counts based on 4-tier rating
        rating = result.compliance_rating
        if rating == BBIStatus.HIGHLY_FUNCTIONAL.value:
            highly_functional_count += 1
        elif rating == BBIStatus.MODERATELY_FUNCTIONAL.value:
            moderately_functional_count += 1
        elif rating == BBIStatus.LOW_FUNCTIONAL.value:
            low_functional_count += 1
        elif rating == BBIStatus.NON_FUNCTIONAL.value:
            non_functional_count += 1

        total_percentage += result.compliance_percentage

    total_bbis = len(compliance_results)
    avg_percentage = (total_percentage / total_bbis) if total_bbis > 0 else 0.0

    summary = BBIComplianceSummary(
        total_bbis=total_bbis,
        highly_functional_count=highly_functional_count,
        moderately_functional_count=moderately_functional_count,
        low_functional_count=low_functional_count,
        non_functional_count=non_functional_count,
        average_compliance_percentage=round(avg_percentage, 2),
    )

    # Use the most recent calculated_at from results
    latest_calculated_at = max(
        (r.calculated_at for r in bbi_results if r.calculated_at),
        default=datetime.utcnow(),
    )

    return AssessmentBBIComplianceResponse(
        assessment_id=assessment_id,
        barangay_id=barangay_id or 0,
        barangay_name=barangay_name,
        assessment_year=assessment.assessment_year,
        bbi_results=compliance_results,
        summary=summary,
        calculated_at=latest_calculated_at,
    )


@router.get(
    "/compliance/barangay/{barangay_id}",
    response_model=BarangayBBIComplianceResponse,
    tags=["bbis"],
)
async def get_barangay_bbi_compliance(
    barangay_id: int,
    year: int = Query(..., description="Assessment year"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Get BBI compliance data for a specific barangay and year.

    Accessible by all authenticated users.

    Returns the compliance rate and 4-tier rating for all BBI indicators:
    - HIGHLY_FUNCTIONAL: 75% - 100% compliance
    - MODERATELY_FUNCTIONAL: 50% - 74% compliance
    - LOW_FUNCTIONAL: 1% - 49% compliance
    - NON_FUNCTIONAL: 0% compliance
    """
    # Get barangay info
    barangay = db.query(Barangay).filter(Barangay.id == barangay_id).first()
    if not barangay:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Barangay with ID {barangay_id} not found",
        )

    # Get BBI compliance summary
    summary_data = bbi_service.get_bbi_compliance_summary(db, barangay_id, year)

    # Build summary
    summary = BBIComplianceSummary(
        total_bbis=summary_data["total_bbis"],
        highly_functional_count=summary_data["highly_functional_count"],
        moderately_functional_count=summary_data["moderately_functional_count"],
        low_functional_count=summary_data["low_functional_count"],
        non_functional_count=summary_data["non_functional_count"],
        average_compliance_percentage=round(
            sum(r.get("compliance_percentage", 0) for r in summary_data["bbi_results"])
            / len(summary_data["bbi_results"])
            if summary_data["bbi_results"]
            else 0.0,
            2,
        ),
    )

    return BarangayBBIComplianceResponse(
        barangay_id=barangay_id,
        barangay_name=barangay.name,
        assessment_year=year,
        bbi_results=summary_data["bbi_results"],
        summary=summary,
    )
