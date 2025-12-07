# 📅 Year Configuration API Routes
# API endpoints for managing assessment year configurations and year placeholder resolution

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_mlgoo_dilg, get_current_active_user
from app.core.year_resolver import YearPlaceholderResolver
from app.db.models.user import User
from app.schemas.year_config import (
    AssessmentIndicatorSnapshotResponse,
    AssessmentYearConfigCreate,
    AssessmentYearConfigListResponse,
    AssessmentYearConfigResponse,
    AssessmentYearConfigUpdate,
    ResolveSchemaRequest,
    ResolveSchemaResponse,
    ResolveTextRequest,
    ResolveTextResponse,
    YearPlaceholderInfo,
    YearResolutionPreview,
)
from app.services.year_config_service import (
    indicator_snapshot_service,
    year_config_service,
)

router = APIRouter()


# =============================================================================
# Assessment Year Configuration Endpoints
# =============================================================================


@router.get(
    "/configs",
    response_model=AssessmentYearConfigListResponse,
    tags=["year-config"],
    summary="List all assessment year configurations",
    description="Retrieve all assessment year configurations (historical and current). Requires MLGOO_DILG role.",
)
async def list_year_configs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Get all assessment year configurations.

    **Authentication:** Requires MLGOO_DILG role.

    **Returns:**
    - List of all assessment year configurations
    - Currently active assessment year (if any)
    """
    configs = year_config_service.get_all_configs(db)
    active_config = year_config_service.get_active_config(db)

    return AssessmentYearConfigListResponse(
        configs=[AssessmentYearConfigResponse.model_validate(c) for c in configs],
        active_year=active_config.current_assessment_year if active_config else None,
    )


@router.get(
    "/current",
    response_model=AssessmentYearConfigResponse,
    tags=["year-config"],
    summary="Get current active year configuration",
    description="Retrieve the currently active assessment year configuration.",
)
async def get_current_year_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get the currently active assessment year configuration.

    **Authentication:** Requires any authenticated user.

    **Returns:**
    - Currently active AssessmentYearConfig

    **Raises:**
    - 404 if no active configuration exists
    """
    config = year_config_service.get_active_config(db)

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active assessment year configuration found. Please contact an administrator.",
        )

    return AssessmentYearConfigResponse.model_validate(config)


@router.get(
    "/current-year",
    tags=["year-config"],
    summary="Get current assessment year",
    description="Get just the current assessment year number.",
)
async def get_current_year(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """
    Get the current assessment year.

    **Authentication:** Requires any authenticated user.

    **Returns:**
    - Current assessment year (e.g., {"year": 2025})

    **Raises:**
    - 404 if no active configuration exists
    """
    try:
        year = year_config_service.get_current_year(db)
        return {"year": year, "previous_year": year - 1}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.post(
    "/configs",
    response_model=AssessmentYearConfigResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["year-config"],
    summary="Create new assessment year configuration",
    description="Create a new assessment year configuration. Requires MLGOO_DILG role.",
)
async def create_year_config(
    config_data: AssessmentYearConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Create a new assessment year configuration.

    **Authentication:** Requires MLGOO_DILG role.

    **Request Body:**
    - `current_assessment_year`: The assessment year (e.g., 2025)
    - `assessment_period_start`: Start of the assessment period
    - `assessment_period_end`: End of the assessment period
    - `description`: Optional description
    - `activate`: Whether to activate immediately (default: false)

    **Returns:**
    - Created AssessmentYearConfig

    **Raises:**
    - 400 if configuration for this year already exists
    """
    try:
        config = year_config_service.create_year_config(
            db=db,
            year=config_data.current_assessment_year,
            period_start=config_data.assessment_period_start,
            period_end=config_data.assessment_period_end,
            description=config_data.description,
            activate=config_data.activate,
            activated_by_id=current_user.id if config_data.activate else None,
        )
        return AssessmentYearConfigResponse.model_validate(config)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/configs/{config_id}/activate",
    response_model=AssessmentYearConfigResponse,
    tags=["year-config"],
    summary="Activate assessment year configuration",
    description="Activate a specific assessment year configuration. Deactivates the currently active one. Requires MLGOO_DILG role.",
)
async def activate_year_config(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Activate a specific assessment year configuration.

    This will:
    1. Deactivate the currently active configuration (if any)
    2. Activate the specified configuration

    **Authentication:** Requires MLGOO_DILG role.

    **Returns:**
    - Activated AssessmentYearConfig

    **Raises:**
    - 404 if configuration not found
    """
    try:
        config = year_config_service.activate_year_config(
            db=db,
            config_id=config_id,
            activated_by_id=current_user.id,
        )
        return AssessmentYearConfigResponse.model_validate(config)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.patch(
    "/configs/{config_id}",
    response_model=AssessmentYearConfigResponse,
    tags=["year-config"],
    summary="Update assessment year configuration",
    description="Update an existing assessment year configuration. Requires MLGOO_DILG role.",
)
async def update_year_config(
    config_id: int,
    config_data: AssessmentYearConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Update an existing assessment year configuration.

    **Authentication:** Requires MLGOO_DILG role.

    **Returns:**
    - Updated AssessmentYearConfig

    **Raises:**
    - 404 if configuration not found
    """
    try:
        config = year_config_service.update_year_config(
            db=db,
            config_id=config_id,
            period_start=config_data.assessment_period_start,
            period_end=config_data.assessment_period_end,
            description=config_data.description,
        )
        return AssessmentYearConfigResponse.model_validate(config)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# =============================================================================
# Year Placeholder Resolution Endpoints
# =============================================================================


@router.get(
    "/placeholders",
    response_model=YearResolutionPreview,
    tags=["year-config"],
    summary="Get year placeholder preview",
    description="Preview all available year placeholders and their resolved values.",
)
async def get_placeholder_preview(
    assessment_year: Optional[int] = Query(
        None, description="Specific year for preview (uses active config if not provided)"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a preview of all available year placeholders and their resolved values.

    **Authentication:** Requires any authenticated user.

    **Query Parameters:**
    - `assessment_year`: Optional specific year (uses active config if not provided)

    **Returns:**
    - List of all placeholders with descriptions and example values
    """
    # Determine the year to use
    if assessment_year is None:
        try:
            assessment_year = year_config_service.get_current_year(db)
        except ValueError:
            # Default to current calendar year if no config exists
            assessment_year = datetime.now().year

    resolver = YearPlaceholderResolver(assessment_year)

    placeholders = [
        YearPlaceholderInfo(
            placeholder="{CURRENT_YEAR}",
            description="Current assessment year",
            example_value=str(resolver.current_year),
        ),
        YearPlaceholderInfo(
            placeholder="{PREVIOUS_YEAR}",
            description="Year before the current assessment year",
            example_value=str(resolver.previous_year),
        ),
        YearPlaceholderInfo(
            placeholder="{JAN_OCT_CURRENT_YEAR}",
            description="January to October of current year",
            example_value=f"January to October {resolver.current_year}",
        ),
        YearPlaceholderInfo(
            placeholder="{JUL_SEP_CURRENT_YEAR}",
            description="July to September of current year",
            example_value=f"July-September {resolver.current_year}",
        ),
        YearPlaceholderInfo(
            placeholder="{Q1_Q3_CURRENT_YEAR}",
            description="1st to 3rd quarter of current year",
            example_value=f"1st to 3rd quarter of CY {resolver.current_year}",
        ),
        YearPlaceholderInfo(
            placeholder="{DEC_31_CURRENT_YEAR}",
            description="December 31 of current year",
            example_value=f"December 31, {resolver.current_year}",
        ),
        YearPlaceholderInfo(
            placeholder="{DEC_31_PREVIOUS_YEAR}",
            description="December 31 of previous year",
            example_value=f"December 31, {resolver.previous_year}",
        ),
        YearPlaceholderInfo(
            placeholder="{CY_CURRENT_YEAR}",
            description="Calendar Year prefix with current year",
            example_value=f"CY {resolver.current_year}",
        ),
        YearPlaceholderInfo(
            placeholder="{CY_PREVIOUS_YEAR}",
            description="Calendar Year prefix with previous year",
            example_value=f"CY {resolver.previous_year}",
        ),
        YearPlaceholderInfo(
            placeholder="{MARCH_CURRENT_YEAR}",
            description="March of current year",
            example_value=f"March {resolver.current_year}",
        ),
        YearPlaceholderInfo(
            placeholder="{OCT_31_CURRENT_YEAR}",
            description="October 31 of current year",
            example_value=f"October 31, {resolver.current_year}",
        ),
    ]

    return YearResolutionPreview(
        assessment_year=assessment_year,
        previous_year=assessment_year - 1,
        placeholders=placeholders,
    )


@router.post(
    "/resolve-text",
    response_model=ResolveTextResponse,
    tags=["year-config"],
    summary="Resolve year placeholders in text",
    description="Resolve all year placeholders in a text string.",
)
async def resolve_text(
    request: ResolveTextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Resolve year placeholders in a text string.

    **Authentication:** Requires any authenticated user.

    **Request Body:**
    - `text`: Text containing year placeholders
    - `assessment_year`: Optional specific year (uses active config if not provided)

    **Returns:**
    - Original and resolved text with the year used
    """
    # Determine the year to use
    assessment_year = request.assessment_year
    if assessment_year is None:
        try:
            assessment_year = year_config_service.get_current_year(db)
        except ValueError:
            assessment_year = datetime.now().year

    resolver = YearPlaceholderResolver(assessment_year)
    resolved_text = resolver.resolve_string(request.text) or request.text
    placeholders_found = resolver.find_placeholders(request.text)

    return ResolveTextResponse(
        original_text=request.text,
        resolved_text=resolved_text,
        assessment_year=assessment_year,
        placeholders_found=placeholders_found,
    )


@router.post(
    "/resolve-schema",
    response_model=ResolveSchemaResponse,
    tags=["year-config"],
    summary="Resolve year placeholders in schema",
    description="Resolve all year placeholders in a schema dictionary.",
)
async def resolve_schema(
    request: ResolveSchemaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Resolve year placeholders in a schema dictionary.

    **Authentication:** Requires any authenticated user.

    **Request Body:**
    - `schema_data`: Schema dictionary containing year placeholders
    - `assessment_year`: Optional specific year (uses active config if not provided)

    **Returns:**
    - Original and resolved schema with the year used
    """
    # Determine the year to use
    assessment_year = request.assessment_year
    if assessment_year is None:
        try:
            assessment_year = year_config_service.get_current_year(db)
        except ValueError:
            assessment_year = datetime.now().year

    resolver = YearPlaceholderResolver(assessment_year)
    resolved_schema = resolver.resolve_schema(request.schema_data) or request.schema_data

    return ResolveSchemaResponse(
        original_schema=request.schema_data,
        resolved_schema=resolved_schema,
        assessment_year=assessment_year,
    )


# =============================================================================
# Indicator Snapshot Endpoints
# =============================================================================


@router.get(
    "/assessments/{assessment_id}/snapshots",
    response_model=list[AssessmentIndicatorSnapshotResponse],
    tags=["year-config"],
    summary="Get indicator snapshots for assessment",
    description="Get all indicator snapshots for a specific assessment.",
)
async def get_assessment_snapshots(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get all indicator snapshots for a specific assessment.

    These snapshots represent the exact indicator definitions (with resolved
    year placeholders) that were valid at the time the assessment was submitted.

    **Authentication:** Requires any authenticated user.

    **Returns:**
    - List of AssessmentIndicatorSnapshot records
    """
    snapshots = indicator_snapshot_service.get_snapshots_for_assessment(db, assessment_id)
    return [AssessmentIndicatorSnapshotResponse.model_validate(s) for s in snapshots]


@router.get(
    "/assessments/{assessment_id}/snapshots/{indicator_id}",
    response_model=AssessmentIndicatorSnapshotResponse,
    tags=["year-config"],
    summary="Get specific indicator snapshot",
    description="Get a specific indicator snapshot for an assessment.",
)
async def get_indicator_snapshot(
    assessment_id: int,
    indicator_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get a specific indicator snapshot for an assessment.

    **Authentication:** Requires any authenticated user.

    **Returns:**
    - AssessmentIndicatorSnapshot for the specified indicator

    **Raises:**
    - 404 if snapshot not found
    """
    snapshot = indicator_snapshot_service.get_snapshot_for_indicator(
        db, assessment_id, indicator_id
    )

    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No snapshot found for indicator {indicator_id} in assessment {assessment_id}",
        )

    return AssessmentIndicatorSnapshotResponse.model_validate(snapshot)
