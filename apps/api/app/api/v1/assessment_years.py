# 📅 Assessment Years API Routes
# API endpoints for managing unified assessment year configurations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_mlgoo_dilg
from app.db.models.user import User
from app.schemas.assessment_year import (
    AccessibleYearsResponse,
    ActivateYearResponse,
    AssessmentYearCreate,
    AssessmentYearListResponse,
    AssessmentYearResponse,
    AssessmentYearSimple,
    AssessmentYearUpdate,
    PublishYearResponse,
)
from app.services.assessment_year_service import assessment_year_service

router = APIRouter()


# =============================================================================
# Year List Endpoints
# =============================================================================


@router.get(
    "/",
    response_model=AssessmentYearListResponse,
    tags=["assessment-years"],
    summary="List all assessment years",
    description="Retrieve all assessment years. MLGOO sees all, others see published only.",
)
async def list_years(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get all assessment years.

    **Access Control:**
    - MLGOO_DILG: Sees all years (published and unpublished)
    - Other roles: See only published years

    **Returns:**
    - List of assessment years
    - Currently active year (if any)
    """
    from app.db.enums import UserRole

    include_unpublished = current_user.role == UserRole.MLGOO_DILG
    return assessment_year_service.list_years(db, include_unpublished=include_unpublished)


@router.get(
    "/accessible",
    response_model=AccessibleYearsResponse,
    tags=["assessment-years"],
    summary="Get accessible years for current user",
    description="Get years the current user can access based on their role.",
)
async def get_accessible_years(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get assessment years accessible to the current user.

    **Access Rules:**
    - MLGOO_DILG: All years (published and unpublished)
    - KATUPARAN_CENTER_USER: All published years
    - BLGU_USER: All years they have assessments for
    - ASSESSOR/VALIDATOR: Current active year only

    **Returns:**
    - List of accessible year numbers
    - Active year (if accessible)
    - User role
    """
    return assessment_year_service.get_accessible_years(db, current_user)


@router.get(
    "/simple",
    response_model=list[AssessmentYearSimple],
    tags=["assessment-years"],
    summary="Get simplified year list for dropdowns",
    description="Get simplified year data suitable for dropdowns and selectors.",
)
async def get_simple_years(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get simplified year list for UI dropdowns.

    Returns minimal data (year, is_active, is_published) for efficient
    rendering in dropdown selectors.

    **Access Control:**
    - MLGOO_DILG: Sees all years
    - Other roles: See only published years
    """
    from app.db.enums import UserRole

    include_unpublished = current_user.role == UserRole.MLGOO_DILG
    years = assessment_year_service.get_all_years(db, include_unpublished=include_unpublished)
    return [AssessmentYearSimple.model_validate(y) for y in years]


# =============================================================================
# Active Year Endpoints
# =============================================================================


@router.get(
    "/active",
    response_model=AssessmentYearResponse,
    tags=["assessment-years"],
    summary="Get the currently active year",
    description="Retrieve the currently active assessment year configuration.",
)
async def get_active_year(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get the currently active assessment year.

    **Returns:**
    - Currently active AssessmentYear

    **Raises:**
    - 404 if no active year exists
    """
    year_record = assessment_year_service.get_active_year(db)

    if not year_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active assessment year found. Please contact an administrator.",
        )

    return AssessmentYearResponse.model_validate(year_record)


@router.get(
    "/active/number",
    tags=["assessment-years"],
    summary="Get current year number",
    description="Get just the current assessment year number.",
)
async def get_active_year_number(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """
    Get the current assessment year number.

    **Returns:**
    - year: Current assessment year (e.g., 2025)
    - previous_year: Year before current (e.g., 2024)

    **Raises:**
    - 404 if no active year exists
    """
    try:
        year = assessment_year_service.get_active_year_number(db)
        return {"year": year, "previous_year": year - 1}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# =============================================================================
# Individual Year Endpoints
# =============================================================================


@router.get(
    "/{year}",
    response_model=AssessmentYearResponse,
    tags=["assessment-years"],
    summary="Get year by number",
    description="Retrieve a specific assessment year configuration.",
)
async def get_year(
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a specific assessment year by year number.

    **Access Control:**
    - MLGOO_DILG: Can view any year (published or unpublished)
    - Other roles: Can only view published years

    **Returns:**
    - AssessmentYear for the specified year

    **Raises:**
    - 404 if year not found or not accessible
    """
    from app.db.enums import UserRole

    year_record = assessment_year_service.get_year_by_number(db, year)

    if not year_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment year {year} not found.",
        )

    # Authorization: non-MLGOO users can only see published years
    if current_user.role != UserRole.MLGOO_DILG and not year_record.is_published:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment year {year} not found.",
        )

    return AssessmentYearResponse.model_validate(year_record)


# =============================================================================
# Year Management Endpoints (MLGOO Only)
# =============================================================================


@router.post(
    "/",
    response_model=AssessmentYearResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["assessment-years"],
    summary="Create new assessment year",
    description="Create a new assessment year configuration. Requires MLGOO_DILG role.",
)
async def create_year(
    data: AssessmentYearCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Create a new assessment year.

    **Authentication:** Requires MLGOO_DILG role.

    **Request Body:**
    - year: The assessment year (e.g., 2025)
    - assessment_period_start: Start of the assessment period
    - assessment_period_end: End of the assessment period
    - phase1_deadline: Optional Phase 1 deadline
    - rework_deadline: Optional rework deadline
    - phase2_deadline: Optional Phase 2 deadline
    - calibration_deadline: Optional calibration deadline
    - description: Optional description

    **Returns:**
    - Created AssessmentYear

    **Raises:**
    - 400 if year already exists
    """
    try:
        year_record = assessment_year_service.create_year(
            db=db,
            data=data,
            created_by_id=int(current_user.id),
        )
        return AssessmentYearResponse.model_validate(year_record)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch(
    "/{year}",
    response_model=AssessmentYearResponse,
    tags=["assessment-years"],
    summary="Update assessment year",
    description="Update an existing assessment year configuration. Requires MLGOO_DILG role.",
)
async def update_year(
    year: int,
    data: AssessmentYearUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Update an existing assessment year.

    **Authentication:** Requires MLGOO_DILG role.

    **Returns:**
    - Updated AssessmentYear

    **Raises:**
    - 404 if year not found
    """
    try:
        year_record = assessment_year_service.update_year(db=db, year=year, data=data)
        return AssessmentYearResponse.model_validate(year_record)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.delete(
    "/{year}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["assessment-years"],
    summary="Delete assessment year",
    description="Delete an assessment year. Only allowed if not active and has no linked assessments. Requires MLGOO_DILG role.",
)
async def delete_year(
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Delete an assessment year.

    **Authentication:** Requires MLGOO_DILG role.

    **Restrictions:**
    - Cannot delete active year
    - Cannot delete year with linked assessments

    **Raises:**
    - 400 if year is active or has linked assessments
    - 404 if year not found
    """
    try:
        assessment_year_service.delete_year(db, year)
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )


# =============================================================================
# Year Activation Endpoints (MLGOO Only)
# =============================================================================


@router.post(
    "/{year}/activate",
    response_model=ActivateYearResponse,
    tags=["assessment-years"],
    summary="Activate assessment year",
    description="Activate a specific assessment year. Deactivates the currently active one. Requires MLGOO_DILG role.",
)
async def activate_year(
    year: int,
    create_assessments: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Activate a specific assessment year.

    This will:
    1. Deactivate the currently active year (if any)
    2. Activate the specified year
    3. Optionally trigger bulk assessment creation for all BLGU users

    **Authentication:** Requires MLGOO_DILG role.

    **Query Parameters:**
    - create_assessments: Whether to create DRAFT assessments for all BLGUs (default: true)

    **Returns:**
    - Activation result with previous active year info

    **Raises:**
    - 404 if year not found
    """
    try:
        return assessment_year_service.activate_year(
            db=db,
            year=year,
            activated_by_id=int(current_user.id),
            create_bulk_assessments=create_assessments,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.post(
    "/{year}/deactivate",
    response_model=AssessmentYearResponse,
    tags=["assessment-years"],
    summary="Deactivate assessment year",
    description="Deactivate a specific assessment year. Requires MLGOO_DILG role.",
)
async def deactivate_year(
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Deactivate a specific assessment year.

    **Authentication:** Requires MLGOO_DILG role.

    **Warning:** This will leave the system without an active year.
    Consider activating another year instead.

    **Returns:**
    - Deactivated AssessmentYear

    **Raises:**
    - 400 if year is not active
    - 404 if year not found
    """
    try:
        year_record = assessment_year_service.deactivate_year(
            db=db,
            year=year,
            deactivated_by_id=int(current_user.id),
        )
        return AssessmentYearResponse.model_validate(year_record)
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )


# =============================================================================
# Year Publication Endpoints (MLGOO Only)
# =============================================================================


@router.post(
    "/{year}/publish",
    response_model=PublishYearResponse,
    tags=["assessment-years"],
    summary="Publish assessment year",
    description="Publish an assessment year for external visibility. Requires MLGOO_DILG role.",
)
async def publish_year(
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Publish an assessment year.

    Published years are visible to Katuparan Center users.

    **Authentication:** Requires MLGOO_DILG role.

    **Returns:**
    - Publication result

    **Raises:**
    - 404 if year not found
    """
    try:
        return assessment_year_service.publish_year(db, year)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.post(
    "/{year}/unpublish",
    response_model=PublishYearResponse,
    tags=["assessment-years"],
    summary="Unpublish assessment year",
    description="Unpublish an assessment year. Requires MLGOO_DILG role.",
)
async def unpublish_year(
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Unpublish an assessment year.

    Unpublished years are hidden from Katuparan Center users.

    **Authentication:** Requires MLGOO_DILG role.

    **Returns:**
    - Publication result

    **Raises:**
    - 404 if year not found
    """
    try:
        return assessment_year_service.unpublish_year(db, year)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# =============================================================================
# Utility Endpoints
# =============================================================================


@router.get(
    "/{year}/phase",
    tags=["assessment-years"],
    summary="Get current phase for year",
    description="Get the current assessment phase based on deadlines.",
)
async def get_year_phase(
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """
    Get the current assessment phase for a specific year.

    **Returns:**
    - phase: Current phase name
    - year: The year queried
    - is_within_period: Whether current time is within assessment period

    Possible phases:
    - pre_assessment: Before assessment period starts
    - phase1: Initial submission phase
    - rework: Rework submission phase
    - phase2: Final submission phase
    - calibration: Calibration/validation phase
    - completed: After assessment period ends
    - unknown: Year not found
    """
    phase = assessment_year_service.get_current_phase(db, year)
    is_within_period = assessment_year_service.is_within_assessment_period(db, year)

    return {
        "phase": phase,
        "year": year,
        "is_within_period": is_within_period,
    }
