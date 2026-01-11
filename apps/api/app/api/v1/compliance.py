"""
Compliance Overview API Endpoints

Endpoints for assessor compliance overview functionality.
After workflow restructuring: ASSESSORs are area-specific, VALIDATORs are system-wide.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import UserRole
from app.db.models.user import User
from app.schemas.compliance import ComplianceOverviewResponse
from app.services.compliance_service import compliance_service

router = APIRouter()


@router.get(
    "/assessments/{assessment_id}/compliance-overview",
    response_model=ComplianceOverviewResponse,
    tags=["compliance"],
    summary="Get compliance overview for an assessment",
    description="""
    Get compliance overview for an assessment.

    Returns parent indicators (2-level) grouped by governance area,
    with sub-indicator (3-level) validation status summaries.

    **Business Logic:**
    - **Non-BBI indicators**: Parent is MET only if ALL sub-indicators have PASS status
    - **BBI indicators**: Uses count-based thresholds to determine functionality level

    **Permissions**:
    - **Assessor**: Shows only their assigned governance area
    - **Validator**: Shows all governance areas (system-wide access)
    """,
)
async def get_compliance_overview(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_assessor_or_validator),
) -> ComplianceOverviewResponse:
    """
    Get compliance overview for an assessment.

    Args:
        assessment_id: ID of the assessment
        db: Database session
        current_user: Current authenticated assessor or validator

    Returns:
        ComplianceOverviewResponse with compliance data grouped by governance area
    """
    try:
        # Only pass assessor for ASSESSOR role (area-specific filtering)
        # VALIDATOR role gets all areas (system-wide access)
        assessor_filter = current_user if current_user.role == UserRole.ASSESSOR else None

        return compliance_service.get_compliance_overview(
            db=db,
            assessment_id=assessment_id,
            assessor=assessor_filter,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get compliance overview: {str(e)}",
        )
