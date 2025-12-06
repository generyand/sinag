# Municipal Overview API Endpoints
# API for MLGOO Municipal Performance Overview Dashboard

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user, get_db
from app.db.models.user import User
from app.schemas.municipal_insights import (
    AggregatedCapDevSummary,
    BarangayStatusList,
    GovernanceAreaPerformanceList,
    MunicipalComplianceSummary,
    MunicipalOverviewDashboard,
    TopFailingIndicatorsList,
)
from app.services.municipal_analytics_service import municipal_analytics_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/municipal-overview", tags=["municipal-overview"])


# ============================================================================
# Dashboard Endpoints (MLGOO Only)
# ============================================================================


@router.get(
    "/dashboard",
    response_model=MunicipalOverviewDashboard,
    summary="Get Complete Municipal Overview Dashboard",
    description="Returns all dashboard sections for the MLGOO municipal performance overview.",
)
async def get_municipal_dashboard(
    assessment_cycle: str | None = Query(
        None, description="Assessment cycle filter (defaults to most recent)"
    ),
    include_draft: bool = Query(
        False, description="Whether to include draft assessments in barangay list"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get complete municipal overview dashboard data.

    **Access:** MLGOO_DILG only

    Returns all dashboard sections in a single request:
    - Compliance summary (pass/fail counts, rates)
    - Governance area performance breakdown
    - Top failing indicators
    - Aggregated CapDev summary
    - Barangay status list

    Args:
        assessment_cycle: Optional cycle identifier
        include_draft: Include draft assessments in barangay list
        db: Database session
        current_user: Authenticated admin user

    Returns:
        MunicipalOverviewDashboard with all sections
    """
    try:
        logger.info(
            f"MLGOO {current_user.email} requesting municipal overview dashboard "
            f"(cycle: {assessment_cycle or 'latest'})"
        )

        dashboard = municipal_analytics_service.get_municipal_overview_dashboard(
            db, assessment_cycle, include_draft
        )

        return dashboard

    except Exception as e:
        logger.error(f"Error generating municipal dashboard: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while generating the dashboard",
        )


# ============================================================================
# Individual Section Endpoints
# ============================================================================


@router.get(
    "/compliance-summary",
    response_model=MunicipalComplianceSummary,
    summary="Get Compliance Summary",
    description="Returns municipal-wide compliance statistics.",
)
async def get_compliance_summary(
    assessment_cycle: str | None = Query(None, description="Assessment cycle filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get municipal-wide compliance summary.

    **Access:** MLGOO_DILG only

    Returns:
    - Total barangays
    - Assessed/passed/failed counts
    - Compliance and assessment rates
    - Pending MLGOO approval count
    - In-progress count
    """
    try:
        return municipal_analytics_service.get_compliance_summary(db, assessment_cycle)
    except Exception as e:
        logger.error(f"Error getting compliance summary: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving compliance summary",
        )


@router.get(
    "/governance-areas",
    response_model=GovernanceAreaPerformanceList,
    summary="Get Governance Area Performance",
    description="Returns performance breakdown by governance area.",
)
async def get_governance_area_performance(
    assessment_cycle: str | None = Query(None, description="Assessment cycle filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get governance area performance breakdown.

    **Access:** MLGOO_DILG only

    Returns pass/fail counts and rates for each governance area,
    along with common weaknesses identified from CapDev insights.
    """
    try:
        return municipal_analytics_service.get_governance_area_performance(db, assessment_cycle)
    except Exception as e:
        logger.error(f"Error getting governance area performance: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving governance area performance",
        )


@router.get(
    "/top-failing-indicators",
    response_model=TopFailingIndicatorsList,
    summary="Get Top Failing Indicators",
    description="Returns the most frequently failed indicators across all assessments.",
)
async def get_top_failing_indicators(
    limit: int = Query(10, ge=1, le=50, description="Maximum number of indicators"),
    assessment_cycle: str | None = Query(None, description="Assessment cycle filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get top failing indicators.

    **Access:** MLGOO_DILG only

    Returns the most frequently failed indicators with:
    - Fail counts and rates
    - Associated governance area
    - Common issues from assessor remarks
    """
    try:
        return municipal_analytics_service.get_top_failing_indicators(db, limit, assessment_cycle)
    except Exception as e:
        logger.error(f"Error getting top failing indicators: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving top failing indicators",
        )


@router.get(
    "/capdev-summary",
    response_model=AggregatedCapDevSummary,
    summary="Get Aggregated CapDev Summary",
    description="Returns aggregated capacity development needs across all barangays.",
)
async def get_capdev_summary(
    assessment_cycle: str | None = Query(None, description="Assessment cycle filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get aggregated capacity development summary.

    **Access:** MLGOO_DILG only

    Aggregates CapDev insights from all completed assessments:
    - Top recommendations (most frequent across barangays)
    - Common weaknesses by governance area
    - Priority interventions
    - Skills gap analysis
    """
    try:
        return municipal_analytics_service.get_aggregated_capdev_summary(db, assessment_cycle)
    except Exception as e:
        logger.error(f"Error getting CapDev summary: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving CapDev summary",
        )


@router.get(
    "/barangay-statuses",
    response_model=BarangayStatusList,
    summary="Get Barangay Status List",
    description="Returns assessment status for all barangays.",
)
async def get_barangay_statuses(
    include_draft: bool = Query(False, description="Include draft assessments"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get assessment status for all barangays.

    **Access:** MLGOO_DILG only

    Returns the current assessment status for each barangay including:
    - Assessment status (draft, submitted, completed, etc.)
    - Compliance status (passed/failed)
    - Submission and approval dates
    - CapDev insights availability
    """
    try:
        return municipal_analytics_service.get_barangay_status_list(db, include_draft)
    except Exception as e:
        logger.error(f"Error getting barangay statuses: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving barangay statuses",
        )
