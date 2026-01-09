"""
Compliance Overview API Endpoints

Endpoints for assessor compliance overview functionality.
After workflow restructuring: ASSESSORs are area-specific, VALIDATORs are system-wide.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
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

    **Permissions**: Assessor only (shows only their assigned governance area)
    """,
)
async def get_compliance_overview(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_assessor_user),
) -> ComplianceOverviewResponse:
    """
    Get compliance overview for an assessment.

    Args:
        assessment_id: ID of the assessment
        db: Database session
        current_assessor: Current authenticated assessor

    Returns:
        ComplianceOverviewResponse with compliance data grouped by governance area
    """
    try:
        return compliance_service.get_compliance_overview(
            db=db,
            assessment_id=assessment_id,
            assessor=current_assessor,
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
