# 📚 Lookups API Routes
# Endpoints for fetching data from lookup tables like
# governance areas, barangays, and user roles.


from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import UserRole
from app.schemas import lookups as lookup_schema
from app.services.barangay_service import barangay_service
from app.services.governance_area_service import governance_area_service

router = APIRouter()

# Human-readable labels and descriptions for user roles
USER_ROLE_OPTIONS = [
    lookup_schema.UserRoleOption(
        value=UserRole.MLGOO_DILG,
        label="MLGOO-DILG (Admin)",
        description="System administrator with full access to all features",
    ),
    lookup_schema.UserRoleOption(
        value=UserRole.VALIDATOR,
        label="Validator",
        description="DILG validator assigned to specific governance areas",
    ),
    lookup_schema.UserRoleOption(
        value=UserRole.ASSESSOR,
        label="Assessor",
        description="DILG assessor who can work with any barangay",
    ),
    lookup_schema.UserRoleOption(
        value=UserRole.BLGU_USER,
        label="BLGU User",
        description="Barangay-level user who submits assessments",
    ),
    lookup_schema.UserRoleOption(
        value=UserRole.KATUPARAN_CENTER_USER,
        label="Katuparan Center User",
        description="External user with read-only access to aggregated analytics for research",
    ),
]


@router.get(
    "/governance-areas",
    response_model=list[lookup_schema.GovernanceArea],
)
def get_all_governance_areas(
    db: Session = Depends(deps.get_db),
):
    """
    Retrieve all governance areas.
    Accessible by all authenticated users.
    """
    return governance_area_service.get_all_governance_areas(db)


@router.get(
    "/barangays",
    response_model=list[lookup_schema.Barangay],
)
def get_all_barangays(
    db: Session = Depends(deps.get_db),
):
    """
    Retrieve all barangays.
    Accessible by all authenticated users.
    """
    return barangay_service.get_all_barangays(db)


@router.get(
    "/roles",
    response_model=list[lookup_schema.UserRoleOption],
)
def get_all_roles():
    """
    Retrieve all available user roles with their labels and descriptions.
    Accessible by all authenticated users.
    Used for populating role dropdowns in user management forms.
    """
    return USER_ROLE_OPTIONS
