# 📊 External Analytics API Endpoints
# Read-only API for external stakeholders (Katuparan Center)
# All endpoints return aggregated, anonymized data for research purposes

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_external_user, get_db
from app.db.models.user import User
from app.schemas.external_analytics import (
    AnonymizedAIInsightsResponse,
    ExternalAnalyticsDashboardResponse,
    GovernanceAreaPerformanceResponse,
    OverallComplianceResponse,
    TopFailingIndicatorsResponse,
)
from app.services.external_analytics_service import external_analytics_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/external/analytics", tags=["external-analytics"])


@router.get(
    "/overall",
    response_model=OverallComplianceResponse,
    summary="Get Overall Municipal Compliance",
    description="Returns aggregated SGLGB compliance statistics for all barangays. Data is anonymized and cannot be used to identify individual barangay performance.",
)
async def get_overall_compliance(
    assessment_cycle: str | None = Query(
        None, description="Assessment cycle filter (defaults to most recent)"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_external_user),
):
    """
    Get municipal-wide SGLGB compliance statistics.

    **Access:** KATUPARAN_CENTER_USER

    **Privacy:** All data is aggregated across all barangays. Individual barangay
    performance cannot be identified.

    Args:
        assessment_cycle: Optional cycle identifier
        db: Database session
        current_user: Authenticated external user

    Returns:
        OverallComplianceResponse with pass/fail counts and percentages

    Raises:
        400: If insufficient data for anonymization (< 5 barangays)
    """
    try:
        logger.info(
            f"External user {current_user.email} ({current_user.role}) "
            f"requesting overall compliance (cycle: {assessment_cycle or 'latest'})"
        )

        result = external_analytics_service.get_overall_compliance(db, assessment_cycle)

        return result

    except ValueError as e:
        # Insufficient data for anonymization
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Error getting overall compliance: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving compliance data",
        )


@router.get(
    "/governance-areas",
    response_model=GovernanceAreaPerformanceResponse,
    summary="Get Governance Area Performance",
    description="Returns aggregated pass/fail rates for all 6 governance areas, including indicator-level breakdowns.",
)
async def get_governance_area_performance(
    assessment_cycle: str | None = Query(None, description="Assessment cycle filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_external_user),
):
    """
    Get aggregated performance for all governance areas.

    **Access:** KATUPARAN_CENTER_USER

    **Privacy:** Data is aggregated at the area level. Individual barangay
    performance is not disclosed.

    Args:
        assessment_cycle: Optional cycle identifier
        db: Database session
        current_user: Authenticated external user

    Returns:
        GovernanceAreaPerformanceResponse with area-level statistics
    """
    try:
        logger.info(
            f"External user {current_user.email} ({current_user.role}) "
            f"requesting governance area performance (cycle: {assessment_cycle or 'latest'})"
        )

        result = external_analytics_service.get_governance_area_performance(db, assessment_cycle)

        return result

    except Exception as e:
        logger.error(f"Error getting governance area performance: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving governance area data",
        )


@router.get(
    "/top-failing-indicators",
    response_model=TopFailingIndicatorsResponse,
    summary="Get Top 5 Failing Indicators",
    description="Returns the 5 indicators with the highest failure rates across all barangays, highlighting systemic weaknesses.",
)
async def get_top_failing_indicators(
    assessment_cycle: str | None = Query(None, description="Assessment cycle filter"),
    limit: int = Query(5, ge=1, le=10, description="Number of top failing indicators to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_external_user),
):
    """
    Get the top N most frequently failed indicators.

    **Access:** KATUPARAN_CENTER_USER

    **Privacy:** Aggregated across all barangays to identify common challenges.

    Args:
        assessment_cycle: Optional cycle identifier
        limit: Number of indicators to return (1-10, default 5)
        db: Database session
        current_user: Authenticated external user

    Returns:
        TopFailingIndicatorsResponse with top failing indicators
    """
    try:
        logger.info(
            f"External user {current_user.email} ({current_user.role}) "
            f"requesting top {limit} failing indicators (cycle: {assessment_cycle or 'latest'})"
        )

        result = external_analytics_service.get_top_failing_indicators(db, assessment_cycle, limit)

        return result

    except Exception as e:
        logger.error(f"Error getting top failing indicators: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving failing indicators",
        )


@router.get(
    "/ai-insights/summary",
    response_model=AnonymizedAIInsightsResponse,
    summary="Get Anonymized AI Insights",
    description="Returns aggregated AI-generated recommendations and capacity development needs for research purposes.",
)
async def get_ai_insights_summary(
    assessment_cycle: str | None = Query(None, description="Assessment cycle filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_external_user),
):
    """
    Get aggregated, anonymized AI-generated insights.

    **Access:** KATUPARAN_CENTER_USER

    **Privacy:** Insights are generalized across multiple assessments without
    attribution to specific barangays.

    Args:
        assessment_cycle: Optional cycle identifier
        db: Database session
        current_user: Authenticated external user

    Returns:
        AnonymizedAIInsightsResponse with aggregated insights
    """
    try:
        logger.info(
            f"External user {current_user.email} ({current_user.role}) "
            f"requesting AI insights (cycle: {assessment_cycle or 'latest'})"
        )

        result = external_analytics_service.get_anonymized_ai_insights(db, assessment_cycle)

        return result

    except Exception as e:
        logger.error(f"Error getting AI insights: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving AI insights",
        )


@router.get(
    "/dashboard",
    response_model=ExternalAnalyticsDashboardResponse,
    summary="Get Complete Dashboard Data",
    description="Returns all dashboard sections in a single response (overall compliance, governance areas, top failing indicators, AI insights). Optimized for dashboard loading.",
)
async def get_complete_dashboard(
    assessment_cycle: str | None = Query(None, description="Assessment cycle filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_external_user),
):
    """
    Get all external analytics dashboard data in one request.

    This is the primary endpoint used by the external analytics dashboard.
    It combines all sections for efficient data loading.

    **Access:** KATUPARAN_CENTER_USER

    **Privacy:** All data is aggregated and anonymized.

    Args:
        assessment_cycle: Optional cycle identifier
        db: Database session
        current_user: Authenticated external user

    Returns:
        ExternalAnalyticsDashboardResponse with all dashboard sections

    Raises:
        400: If insufficient data for anonymization
    """
    try:
        logger.info(
            f"External user {current_user.email} ({current_user.role}) "
            f"requesting complete dashboard (cycle: {assessment_cycle or 'latest'})"
        )

        result = external_analytics_service.get_complete_dashboard(db, assessment_cycle)

        return result

    except ValueError as e:
        # Insufficient data for anonymization
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Error getting complete dashboard: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving dashboard data",
        )


@router.get(
    "/export/csv",
    summary="Export Analytics as CSV",
    description="Download aggregated analytics data as CSV file. All data is anonymized and aggregated.",
    response_class=Response,
)
async def export_csv(
    assessment_cycle: str | None = Query(None, description="Assessment cycle filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_external_user),
):
    """
    Export external analytics data as CSV file.

    **Access:** KATUPARAN_CENTER_USER

    **Privacy:** All data is aggregated and anonymized.

    Args:
        assessment_cycle: Optional cycle identifier
        db: Database session
        current_user: Authenticated external user

    Returns:
        CSV file download with aggregated analytics data

    Raises:
        400: If insufficient data for anonymization
    """
    from datetime import datetime

    try:
        logger.info(
            f"External user {current_user.email} ({current_user.role}) "
            f"requesting CSV export (cycle: {assessment_cycle or 'latest'})"
        )

        # Generate CSV content
        csv_content = external_analytics_service.generate_csv_export(
            db=db,
            assessment_cycle=assessment_cycle,
            user_email=current_user.email,
            user_role=current_user.role.value,
        )

        # Create filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"sinag_external_analytics_{timestamp}.csv"

        # Return CSV file
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "text/csv; charset=utf-8",
            },
        )

    except ValueError as e:
        # Insufficient data for anonymization
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Error generating CSV export: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while generating CSV export",
        )


@router.get(
    "/export/pdf",
    summary="Export Analytics as PDF",
    description="Download aggregated analytics data as PDF file. All data is anonymized and aggregated with professional formatting.",
    response_class=Response,
)
async def export_pdf(
    assessment_cycle: str | None = Query(None, description="Assessment cycle filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_external_user),
):
    """
    Export external analytics data as PDF file.

    **Access:** KATUPARAN_CENTER_USER

    **Privacy:** All data is aggregated and anonymized.

    Args:
        assessment_cycle: Optional cycle identifier
        db: Database session
        current_user: Authenticated external user

    Returns:
        PDF file download with aggregated analytics data

    Raises:
        400: If insufficient data for anonymization
    """
    from datetime import datetime

    try:
        logger.info(
            f"External user {current_user.email} ({current_user.role}) "
            f"requesting PDF export (cycle: {assessment_cycle or 'latest'})"
        )

        # Generate PDF content
        pdf_content = external_analytics_service.generate_pdf_export(
            db=db,
            assessment_cycle=assessment_cycle,
            user_email=current_user.email,
            user_role=current_user.role.value,
        )

        # Create filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"sinag_external_analytics_{timestamp}.pdf"

        # Return PDF file
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "application/pdf",
            },
        )

    except ValueError as e:
        # Insufficient data for anonymization
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Error generating PDF export: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while generating PDF export",
        )
