# 📅 Deadline Extensions API Router
# Endpoints for per-assessment deadline extensions

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import UserRole
from app.db.models.user import User
from app.schemas.deadline_extension import (
    DeadlineExtensionCreate,
    DeadlineExtensionListResponse,
    ExtendDeadlineResult,
)
from app.services.deadline_extension_service import deadline_extension_service

router = APIRouter()


@router.post(
    "/assessments/{assessment_id}/extend-deadline",
    response_model=ExtendDeadlineResult,
    tags=["deadline-windows"],
    summary="Extend assessment deadline",
    description="Extend a specific assessment's rework or calibration deadline. MLGOO only.",
)
async def extend_assessment_deadline(
    assessment_id: int,
    data: DeadlineExtensionCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Extend an assessment's rework or calibration deadline.

    Only MLGOO_DILG users can grant deadline extensions.
    This creates an audit record and updates the assessment's deadline fields.

    Args:
        assessment_id: ID of the assessment to extend
        data: Extension request with type, additional days, and reason

    Returns:
        ExtendDeadlineResult: Result with success status and new deadline

    Raises:
        HTTPException 403: If user is not MLGOO_DILG
        HTTPException 400: If assessment not found or no deadline set
    """
    # Only MLGOO_DILG can extend deadlines
    if current_user.role != UserRole.MLGOO_DILG:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only MLGOO-DILG administrators can extend assessment deadlines",
        )

    try:
        return deadline_extension_service.extend_deadline(db, assessment_id, data, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/assessments/{assessment_id}/extensions",
    response_model=DeadlineExtensionListResponse,
    tags=["deadline-windows"],
    summary="Get deadline extensions for assessment",
    description="Get all deadline extensions granted for a specific assessment.",
)
async def get_assessment_extensions(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get all deadline extensions for an assessment.

    Returns the history of all extensions granted for audit purposes.
    Access is restricted to:
    - MLGOO_DILG: Can view all assessments
    - BLGU_USER: Can view their own assessment
    - ASSESSOR/VALIDATOR: Can view assessments they review

    Args:
        assessment_id: ID of the assessment

    Returns:
        DeadlineExtensionListResponse: List of extensions with total count

    Raises:
        HTTPException 403: If user doesn't have access to the assessment
        HTTPException 404: If assessment not found
    """
    from app.db.models.assessment import Assessment

    # Get the assessment to verify ownership/access
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found",
        )

    # Authorization check based on role
    has_access = False

    if current_user.role == UserRole.MLGOO_DILG:
        # MLGOO can view all
        has_access = True
    elif current_user.role == UserRole.BLGU_USER:
        # BLGU can only view their own assessment
        has_access = assessment.blgu_user_id == current_user.id
    elif current_user.role in [UserRole.ASSESSOR, UserRole.VALIDATOR]:
        # Assessors and Validators can view assessments (they need to see deadlines for review)
        has_access = True

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this assessment's extensions",
        )

    return deadline_extension_service.get_extensions_for_assessment(db, assessment_id)
