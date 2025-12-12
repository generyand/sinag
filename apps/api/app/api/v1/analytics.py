# 📊 Analytics API Routes
# Endpoints for analytics and dashboard data

import logging
import warnings
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.orm import Session

from app.api import deps
from app.core.cache import cache
from app.db.enums import UserRole
from app.db.models.user import User
from app.schemas.analytics import (
    DashboardKPIResponse,
    RefreshAnalysisResponse,
    ReportsDataResponse,
)
from app.services.analytics_service import ReportsFilters, analytics_service

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_current_mlgoo_dilg_user(
    current_user: User = Depends(deps.get_current_active_user),
) -> User:
    """
    Get the current authenticated MLGOO-DILG user.

    Restricts access to users with MLGOO_DILG role.

    Args:
        current_user: Current active user from get_current_active_user dependency

    Returns:
        User: Current MLGOO-DILG user

    Raises:
        HTTPException: If user doesn't have MLGOO-DILG privileges
    """
    if current_user.role != UserRole.MLGOO_DILG:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. MLGOO-DILG access required.",
        )
    return current_user


@router.get(
    "/dashboard",
    response_model=DashboardKPIResponse,
    tags=["analytics"],
    summary="Get Dashboard KPIs",
    description=(
        "Retrieve all dashboard Key Performance Indicators (KPIs) for the MLGOO-DILG dashboard.\n\n"
        "**KPIs included:**\n"
        "- Overall compliance rate (pass/fail statistics)\n"
        "- Completion status (validated vs in-progress assessments)\n"
        "- Area breakdown (compliance by governance area)\n"
        "- Top 5 failed indicators\n"
        "- Barangay rankings by compliance score\n"
        "- Historical trends across cycles\n\n"
        "**Filtering:**\n"
        "- `year`: Filter by assessment year (e.g., 2024, 2025). Defaults to active year.\n\n"
        "**Access:** Requires MLGOO_DILG role."
    ),
    responses={
        200: {
            "description": "Dashboard KPIs retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "overall_compliance_rate": {
                            "total_barangays": 50,
                            "passed": 35,
                            "failed": 15,
                            "pass_percentage": 70.0,
                        },
                        "completion_status": {
                            "total_barangays": 50,
                            "passed": 40,
                            "failed": 10,
                            "pass_percentage": 80.0,
                        },
                        "area_breakdown": [
                            {
                                "area_code": "GA-1",
                                "area_name": "Financial Administration",
                                "passed": 30,
                                "failed": 20,
                                "percentage": 60.0,
                            }
                        ],
                        "top_failed_indicators": [
                            {
                                "indicator_id": 5,
                                "indicator_name": "Budget Transparency",
                                "failure_count": 25,
                                "percentage": 50.0,
                            }
                        ],
                        "barangay_rankings": [
                            {
                                "barangay_id": 1,
                                "barangay_name": "Barangay 1",
                                "score": 95.5,
                                "rank": 1,
                            }
                        ],
                        "trends": [
                            {
                                "cycle_id": 1,
                                "cycle_name": "2024 Q1",
                                "pass_rate": 65.0,
                                "date": "2024-01-01T00:00:00",
                            }
                        ],
                    }
                }
            },
        },
        401: {"description": "Not authenticated"},
        403: {"description": "Not enough permissions (MLGOO_DILG role required)"},
    },
)
async def get_dashboard(
    cycle_id: int | None = Query(
        None,
        description="[DEPRECATED] Assessment cycle ID. Use 'year' parameter instead.",
    ),
    year: int | None = Query(
        None,
        description="Assessment year (e.g., 2024, 2025). Defaults to active year if not provided.",
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_current_mlgoo_dilg_user),
) -> DashboardKPIResponse:
    """
    Get dashboard KPIs for MLGOO-DILG dashboard.

    Retrieves comprehensive analytics including compliance rates, area breakdowns,
    failed indicators, barangay rankings, and historical trends.

    Args:
        cycle_id: [DEPRECATED] Use year parameter instead
        year: Optional assessment year (defaults to active year)
        db: Database session
        current_user: Current authenticated MLGOO-DILG user

    Returns:
        DashboardKPIResponse: Complete dashboard KPI data

    Raises:
        HTTPException: 401 if not authenticated, 403 if insufficient permissions
    """
    # Log deprecation warning if cycle_id is used
    if cycle_id is not None:
        warnings.warn(
            "The 'cycle_id' parameter is deprecated and will be removed in a future version. "
            "Use the 'year' parameter instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        logger.warning(
            "DEPRECATED: 'cycle_id' parameter used in /analytics/dashboard. "
            "Use 'year' parameter instead. cycle_id=%s",
            cycle_id,
        )

    try:
        dashboard_kpis = analytics_service.get_dashboard_kpis(db, assessment_year=year)
        return dashboard_kpis
    except Exception:
        logger.error("Failed to retrieve dashboard KPIs", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard KPIs. Please try again later.",
        )


@router.post(
    "/dashboard/refresh-analysis",
    response_model=RefreshAnalysisResponse,
    tags=["analytics"],
    summary="Refresh Dashboard AI Analysis",
    description=(
        "Refresh the AI-generated analysis for the dashboard, including top rework/calibration reasons.\n\n"
        "This endpoint invalidates the cached dashboard data and recalculates the AI-generated\n"
        "analysis from the latest assessment data.\n\n"
        "**Use cases:**\n"
        "- After new rework/calibration summaries have been generated\n"
        "- When cached data appears stale or incomplete\n"
        "- To force fresh analysis of recent assessments\n\n"
        "**Access:** Requires MLGOO_DILG role."
    ),
    responses={
        200: {
            "description": "Analysis refreshed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Dashboard analysis refreshed successfully",
                        "cache_invalidated": True,
                        "top_rework_reasons": {
                            "reasons": [
                                {
                                    "reason": "Missing MOV documents",
                                    "count": 5,
                                    "source": "rework",
                                    "governance_area": None,
                                }
                            ],
                            "total_rework_assessments": 10,
                            "total_calibration_assessments": 5,
                            "generated_by_ai": True,
                        },
                    }
                }
            },
        },
        401: {"description": "Not authenticated"},
        403: {"description": "Not enough permissions (MLGOO_DILG role required)"},
    },
)
async def refresh_dashboard_analysis(
    year: int | None = Query(
        None,
        description="Assessment year to refresh analysis for. Defaults to active year.",
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_current_mlgoo_dilg_user),
) -> RefreshAnalysisResponse:
    """
    Refresh the AI-generated dashboard analysis.

    Invalidates the dashboard cache and recalculates the top rework/calibration
    reasons from the latest assessment data.

    Args:
        year: Optional assessment year (defaults to active year)
        db: Database session
        current_user: Current authenticated MLGOO-DILG user

    Returns:
        RefreshAnalysisResponse with updated analysis data

    Raises:
        HTTPException: 401 if not authenticated, 403 if insufficient permissions
    """
    try:
        # Get active year if not specified
        if year is None:
            from app.services.assessment_year_service import assessment_year_service

            year = assessment_year_service.get_active_year_number(db)

        # Invalidate ALL dashboard cache keys (pattern match for consistency with worker)
        # This ensures we clear all cached data including year_all, year_2025, etc.
        cache_invalidated_count = cache.delete_pattern("dashboard_kpis:*")

        logger.info(
            f"♻️  Dashboard analysis refresh requested by user {current_user.id} "
            f"for year {year}. Cache keys invalidated: {cache_invalidated_count}"
        )

        # Recalculate the top rework reasons
        top_rework_reasons = analytics_service.calculate_top_rework_reasons(db, year)

        return RefreshAnalysisResponse(
            message="Dashboard analysis refreshed successfully",
            cache_invalidated=cache_invalidated_count > 0,
            top_rework_reasons=top_rework_reasons,
        )
    except Exception:
        logger.error("Failed to refresh dashboard analysis", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh dashboard analysis. Please try again later.",
        )


@router.get(
    "/reports",
    response_model=ReportsDataResponse,
    tags=["analytics"],
    summary="Get Reports Data with Filters",
    description=(
        "Retrieve comprehensive reports data with flexible filtering and role-based access.\n\n"
        "**Data included:**\n"
        "- Chart data (bar chart, pie chart, line chart)\n"
        "- Geographic map data with barangay coordinates\n"
        "- Paginated table data for assessments\n"
        "- Report metadata (generation timestamp, applied filters)\n\n"
        "**Filters:**\n"
        "- `year`: Filter by assessment year (e.g., 2024, 2025)\n"
        "- `start_date`, `end_date`: Filter by date range\n"
        "- `governance_area`: Filter by governance area codes (can specify multiple)\n"
        "- `barangay_id`: Filter by barangay IDs (can specify multiple)\n"
        "- `status`: Filter by assessment status (Pass/Fail/In Progress)\n"
        "- `page`, `page_size`: Pagination controls for table data\n\n"
        "**RBAC:**\n"
        "- MLGOO_DILG: See all data\n"
        "- ASSESSOR: See only assigned governance area\n"
        "- VALIDATOR: See only assigned governance area\n"
        "- BLGU_USER: See only own barangay\n\n"
        "**Access:** Requires authentication."
    ),
    responses={
        200: {
            "description": "Reports data retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "chart_data": {
                            "bar_chart": [
                                {
                                    "area_code": "GA-1",
                                    "area_name": "Financial Administration",
                                    "passed": 20,
                                    "failed": 5,
                                    "pass_percentage": 80.0,
                                }
                            ],
                            "pie_chart": [
                                {"status": "Pass", "count": 30, "percentage": 60.0},
                                {"status": "Fail", "count": 15, "percentage": 30.0},
                                {
                                    "status": "In Progress",
                                    "count": 5,
                                    "percentage": 10.0,
                                },
                            ],
                            "line_chart": [
                                {
                                    "cycle_id": 1,
                                    "cycle_name": "January 2025",
                                    "pass_rate": 65.0,
                                    "date": "2025-01-01T00:00:00",
                                }
                            ],
                        },
                        "map_data": {
                            "barangays": [
                                {
                                    "barangay_id": 1,
                                    "name": "Barangay 1",
                                    "lat": 8.0556,
                                    "lng": 123.8854,
                                    "status": "Pass",
                                    "score": 95.5,
                                }
                            ]
                        },
                        "table_data": {
                            "rows": [
                                {
                                    "barangay_id": 1,
                                    "barangay_name": "Barangay 1",
                                    "governance_area": "Financial Administration",
                                    "status": "Pass",
                                    "score": 95.5,
                                }
                            ],
                            "total_count": 50,
                            "page": 1,
                            "page_size": 50,
                        },
                        "metadata": {
                            "generated_at": "2025-01-15T10:30:00",
                            "cycle_id": None,
                            "start_date": None,
                            "end_date": None,
                            "governance_areas": None,
                            "barangay_ids": None,
                            "status": None,
                        },
                    }
                }
            },
        },
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient permissions"},
    },
)
async def get_reports(
    year: int | None = Query(
        None,
        description="Filter by assessment year (e.g., 2024, 2025). Defaults to active year.",
        ge=2020,
        le=2100,
        examples=[2025],
    ),
    start_date: date | None = Query(
        None,
        description="Filter by start date (inclusive)",
        examples=["2025-01-01"],
    ),
    end_date: date | None = Query(
        None,
        description="Filter by end date (inclusive)",
        examples=["2025-12-31"],
    ),
    governance_area: list[str] | None = Query(
        None,
        description="Filter by governance area codes (e.g., 'GA-1', 'GA-2'). Can specify multiple.",
        examples=[["GA-1", "GA-2"]],
    ),
    barangay_id: list[int] | None = Query(
        None,
        description="Filter by barangay IDs. Can specify multiple.",
        examples=[[1, 2, 3]],
    ),
    status: str | None = Query(
        None,
        description="Filter by assessment status",
        examples=["Pass"],
        pattern="^(Pass|Fail|In Progress)$",
    ),
    page: int = Query(
        1,
        description="Page number for table data (1-indexed)",
        ge=1,
        examples=[1],
    ),
    page_size: int = Query(
        50,
        description="Number of rows per page for table data",
        ge=1,
        le=100,
        examples=[50],
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> ReportsDataResponse:
    """
    Get comprehensive reports data with filtering and RBAC.

    Retrieves chart data (bar, pie, line), geographic map data, and
    paginated table data based on the provided filters and user's role.

    Args:
        year: Optional assessment year (defaults to active year)
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        governance_area: Optional list of governance area codes
        barangay_id: Optional list of barangay IDs
        status: Optional status filter (Pass/Fail/In Progress)
        page: Page number for table pagination
        page_size: Number of rows per page
        db: Database session
        current_user: Current authenticated user

    Returns:
        ReportsDataResponse: Complete reports data with all visualizations

    Raises:
        HTTPException: 401 if not authenticated, 403 if insufficient permissions,
                      500 if data retrieval fails
    """
    try:
        # Build filters
        filters = ReportsFilters(
            assessment_year=year,
            start_date=start_date,
            end_date=end_date,
            governance_area_codes=governance_area,
            barangay_ids=barangay_id,
            status=status,
        )

        # Get reports data with RBAC
        reports_data = analytics_service.get_reports_data(
            db=db,
            filters=filters,
            current_user=current_user,
            page=page,
            page_size=page_size,
        )

        return reports_data
    except Exception:
        logger.error("Failed to retrieve reports data", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve reports data. Please try again later.",
        )
