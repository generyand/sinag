# Municipal Offices API Routes
# Endpoints for municipal office management

import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models.user import User
from app.schemas.municipal_office import (
    MunicipalOfficeCreate,
    MunicipalOfficeListResponse,
    MunicipalOfficeResponse,
    MunicipalOfficesByArea,
    MunicipalOfficeUpdate,
    MunicipalOfficeWithGovernanceArea,
)
from app.services.municipal_office_service import municipal_office_service

router = APIRouter()


# ============================================================================
# CRUD Endpoints
# ============================================================================


@router.post(
    "/",
    response_model=MunicipalOfficeResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["municipal-offices"],
    summary="Create new municipal office",
    description="Create a new municipal office. Requires MLGOO_DILG role.",
)
async def create_municipal_office(
    office_create: MunicipalOfficeCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Create a new municipal office.

    Requires admin privileges (MLGOO_DILG role).
    """
    office = municipal_office_service.create_municipal_office(
        db,
        office_create.model_dump(),
        current_user=current_user,
    )
    return office


@router.get(
    "/",
    response_model=MunicipalOfficeListResponse,
    tags=["municipal-offices"],
    summary="List municipal offices",
    description="Get paginated list of municipal offices. Accessible by all authenticated users.",
)
async def list_municipal_offices(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    governance_area_id: int | None = Query(None, description="Filter by governance area ID"),
    is_active: bool | None = Query(None, description="Filter by active status"),
):
    """
    Get paginated list of municipal offices.

    Accessible by all authenticated users.
    """
    skip = (page - 1) * size

    # Get total count
    total = municipal_office_service.count_municipal_offices(
        db,
        governance_area_id=governance_area_id,
        is_active=is_active,
    )

    # Get paginated results
    offices = municipal_office_service.list_municipal_offices(
        db,
        governance_area_id=governance_area_id,
        is_active=is_active,
        skip=skip,
        limit=size,
    )

    total_pages = math.ceil(total / size) if total > 0 else 0

    return MunicipalOfficeListResponse(
        offices=offices,
        total=total,
        page=page,
        size=size,
        total_pages=total_pages,
    )


@router.get(
    "/grouped",
    response_model=list[MunicipalOfficesByArea],
    tags=["municipal-offices"],
    summary="Get offices grouped by area",
    description="Get municipal offices grouped by governance area. Useful for displaying offices organized by area.",
)
async def get_offices_grouped_by_area(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    is_active: bool | None = Query(True, description="Filter by active status"),
):
    """
    Get municipal offices grouped by governance area.

    Useful for displaying offices organized by their governance area.
    """
    return municipal_office_service.get_offices_grouped_by_area(db, is_active=is_active)


@router.get(
    "/{office_id}",
    response_model=MunicipalOfficeWithGovernanceArea,
    tags=["municipal-offices"],
    summary="Get municipal office",
    description="Get municipal office details by ID. Accessible by all authenticated users.",
)
async def get_municipal_office(
    office_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Get municipal office details by ID.

    Accessible by all authenticated users.
    """
    office = municipal_office_service.get_municipal_office(db, office_id)
    if not office:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Municipal office with ID {office_id} not found",
        )
    return office


@router.put(
    "/{office_id}",
    response_model=MunicipalOfficeResponse,
    tags=["municipal-offices"],
    summary="Update municipal office",
    description="Update a municipal office. Requires MLGOO_DILG role.",
)
async def update_municipal_office(
    office_id: int,
    office_update: MunicipalOfficeUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Update a municipal office.

    Requires admin privileges (MLGOO_DILG role).
    """
    update_data = office_update.model_dump(exclude_none=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    office = municipal_office_service.update_municipal_office(
        db, office_id, update_data, current_user=current_user
    )
    return office


@router.delete(
    "/{office_id}",
    response_model=MunicipalOfficeResponse,
    tags=["municipal-offices"],
    summary="Deactivate municipal office",
    description="Deactivate a municipal office (soft delete). Requires MLGOO_DILG role.",
)
async def deactivate_municipal_office(
    office_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Deactivate a municipal office (soft delete).

    Requires admin privileges (MLGOO_DILG role).
    """
    office = municipal_office_service.deactivate_municipal_office(
        db, office_id, current_user=current_user
    )
    return office
