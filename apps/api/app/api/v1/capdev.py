# CapDev (Capacity Development) API Endpoints
# API for AI-powered capacity development insights for barangays

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_active_user, get_current_admin_user, get_db
from app.db.enums import AssessmentStatus, UserRole
from app.db.models.assessment import Assessment
from app.db.models.user import User
from app.schemas.capdev import (
    CapDevInsightsByLanguage,
    CapDevInsightsResponse,
    CapDevStatusResponse,
    CapDevTriggerResponse,
)
from app.services.intelligence_service import intelligence_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/capdev", tags=["capdev"])


# ============================================================================
# CapDev Insights Endpoints (MLGOO & BLGU Access)
# ============================================================================


@router.get(
    "/assessments/{assessment_id}",
    response_model=CapDevInsightsResponse,
    summary="Get CapDev Insights for Assessment",
    description="Returns AI-powered capacity development insights for a specific assessment. Available after MLGOO approval.",
)
async def get_capdev_insights(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get CapDev insights for a specific assessment.

    **Access:**
    - MLGOO_DILG: Can access all assessments
    - BLGU_USER: Can only access their own assessment

    Args:
        assessment_id: ID of the assessment
        db: Database session
        current_user: Authenticated user

    Returns:
        CapDevInsightsResponse with insights in all available languages
    """
    # Get assessment with barangay info
    assessment = (
        db.query(Assessment)
        .options(joinedload(Assessment.blgu_user).joinedload(User.barangay))
        .filter(Assessment.id == assessment_id)
        .first()
    )

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )

    # Access control: BLGU can only see their own assessment
    if current_user.role == UserRole.BLGU_USER:
        if assessment.blgu_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access CapDev insights for your own assessment",
            )

    # Check if assessment is MLGOO approved
    if assessment.status != AssessmentStatus.COMPLETED or not assessment.mlgoo_approved_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CapDev insights are only available after MLGOO approval",
        )

    # Get barangay name
    barangay_name = "Unknown Barangay"
    if assessment.blgu_user and assessment.blgu_user.barangay:
        barangay_name = assessment.blgu_user.barangay.name

    # Build response
    status_str = assessment.capdev_insights_status or "not_generated"
    available_languages = []
    insights_dict = None

    if assessment.capdev_insights and isinstance(assessment.capdev_insights, dict):
        available_languages = list(assessment.capdev_insights.keys())
        insights_dict = assessment.capdev_insights

    logger.info(
        f"User {current_user.email} accessed CapDev insights for assessment {assessment_id}"
    )

    # Try to build the response, handling validation errors for malformed data
    try:
        return CapDevInsightsResponse(
            assessment_id=assessment_id,
            barangay_name=barangay_name,
            status=status_str,
            generated_at=assessment.capdev_insights_generated_at,
            available_languages=available_languages,
            insights=insights_dict,
        )
    except Exception as e:
        logger.warning(
            f"Failed to validate CapDev insights for assessment {assessment_id}: {str(e)}"
        )
        # Return response with insights as None if validation fails
        return CapDevInsightsResponse(
            assessment_id=assessment_id,
            barangay_name=barangay_name,
            status="failed",
            generated_at=assessment.capdev_insights_generated_at,
            available_languages=[],
            insights=None,
        )


@router.get(
    "/assessments/{assessment_id}/language/{language}",
    response_model=CapDevInsightsByLanguage,
    summary="Get CapDev Insights in Specific Language",
    description="Returns CapDev insights for a specific assessment in a specific language.",
)
async def get_capdev_insights_by_language(
    assessment_id: int,
    language: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get CapDev insights in a specific language.

    **Access:**
    - MLGOO_DILG: Can access all assessments
    - BLGU_USER: Can only access their own assessment

    Args:
        assessment_id: ID of the assessment
        language: Language code (ceb, en, fil)
        db: Database session
        current_user: Authenticated user

    Returns:
        CapDevInsightsByLanguage with insights in the requested language
    """
    # Validate language
    valid_languages = ["ceb", "en", "fil"]
    if language not in valid_languages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid language. Must be one of: {', '.join(valid_languages)}",
        )

    # Get assessment with barangay info
    assessment = (
        db.query(Assessment)
        .options(joinedload(Assessment.blgu_user).joinedload(User.barangay))
        .filter(Assessment.id == assessment_id)
        .first()
    )

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )

    # Access control
    if current_user.role == UserRole.BLGU_USER:
        if assessment.blgu_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access CapDev insights for your own assessment",
            )

    # Check if assessment is MLGOO approved
    if assessment.status != AssessmentStatus.COMPLETED or not assessment.mlgoo_approved_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CapDev insights are only available after MLGOO approval",
        )

    # Get barangay name
    barangay_name = "Unknown Barangay"
    if assessment.blgu_user and assessment.blgu_user.barangay:
        barangay_name = assessment.blgu_user.barangay.name

    # Get insights for the specific language
    content = None
    status_str = assessment.capdev_insights_status or "not_generated"

    if assessment.capdev_insights and isinstance(assessment.capdev_insights, dict):
        if language in assessment.capdev_insights:
            content = assessment.capdev_insights[language]
            status_str = "completed"
        else:
            status_str = "not_available"

    return CapDevInsightsByLanguage(
        assessment_id=assessment_id,
        barangay_name=barangay_name,
        language=language,
        content=content,
        status=status_str,
        generated_at=assessment.capdev_insights_generated_at,
    )


@router.get(
    "/assessments/{assessment_id}/status",
    response_model=CapDevStatusResponse,
    summary="Get CapDev Generation Status",
    description="Check the status of CapDev insights generation for an assessment.",
)
async def get_capdev_status(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get the status of CapDev insights generation.

    **Access:**
    - MLGOO_DILG: Can access all assessments
    - BLGU_USER: Can only access their own assessment

    Args:
        assessment_id: ID of the assessment
        db: Database session
        current_user: Authenticated user

    Returns:
        CapDevStatusResponse with current generation status
    """
    # Get assessment
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )

    # Access control
    if current_user.role == UserRole.BLGU_USER:
        if assessment.blgu_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only check CapDev status for your own assessment",
            )

    # Build status response
    status_str = assessment.capdev_insights_status or "not_generated"
    available_languages = []
    message = None

    if assessment.capdev_insights and isinstance(assessment.capdev_insights, dict):
        available_languages = list(assessment.capdev_insights.keys())

    # Add helpful messages based on status
    if status_str == "pending":
        message = "CapDev insights generation is queued and will start soon"
    elif status_str == "generating":
        message = "CapDev insights are currently being generated"
    elif status_str == "completed":
        message = f"CapDev insights available in {len(available_languages)} language(s)"
    elif status_str == "failed":
        message = "CapDev insights generation failed. Please contact support."
    elif status_str == "not_generated":
        if assessment.status != AssessmentStatus.COMPLETED:
            message = "CapDev insights will be generated after MLGOO approval"
        else:
            message = "CapDev insights have not been generated yet"

    return CapDevStatusResponse(
        assessment_id=assessment_id,
        status=status_str,
        generated_at=assessment.capdev_insights_generated_at,
        available_languages=available_languages,
        message=message,
    )


# ============================================================================
# Admin Endpoints (MLGOO Only)
# ============================================================================


@router.post(
    "/assessments/{assessment_id}/regenerate",
    response_model=CapDevTriggerResponse,
    summary="Regenerate CapDev Insights",
    description="Manually trigger regeneration of CapDev insights for an assessment. MLGOO only.",
)
async def regenerate_capdev_insights(
    assessment_id: int,
    force: bool = Query(False, description="Force regeneration even if insights exist"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Manually trigger CapDev insights regeneration.

    **Access:** MLGOO_DILG only

    This endpoint allows MLGOO to manually trigger regeneration of CapDev insights,
    for example if the AI model has been updated or if there was an error.

    Args:
        assessment_id: ID of the assessment
        force: If True, regenerate even if insights already exist
        db: Database session
        current_user: Authenticated admin user

    Returns:
        CapDevTriggerResponse with task ID if generation was queued
    """
    # Get assessment
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )

    # Check if assessment is MLGOO approved
    if assessment.status != AssessmentStatus.COMPLETED or not assessment.mlgoo_approved_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate CapDev insights for an assessment that is not MLGOO approved",
        )

    # Check if insights already exist and force is not set
    if assessment.capdev_insights and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CapDev insights already exist. Use force=true to regenerate.",
        )

    # Clear existing insights if forcing regeneration
    if force:
        assessment.capdev_insights = None
        assessment.capdev_insights_status = "pending"
        assessment.capdev_insights_generated_at = None
        db.commit()

    # Queue the Celery task
    try:
        from app.workers.intelligence_worker import generate_capdev_insights_task

        assessment.capdev_insights_status = "pending"
        db.commit()

        task = generate_capdev_insights_task.delay(assessment_id)

        logger.info(
            f"MLGOO {current_user.email} triggered CapDev regeneration for assessment {assessment_id} "
            f"(task_id: {task.id}, force: {force})"
        )

        return CapDevTriggerResponse(
            success=True,
            message="CapDev insights regeneration has been queued",
            assessment_id=assessment_id,
            task_id=task.id,
        )

    except Exception as e:
        logger.error(f"Failed to queue CapDev regeneration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue CapDev insights regeneration: {str(e)}",
        )


@router.post(
    "/assessments/{assessment_id}/generate-language/{language}",
    response_model=CapDevTriggerResponse,
    summary="Generate CapDev Insights in Additional Language",
    description="Generate CapDev insights in a new language for an assessment. MLGOO only.",
)
async def generate_capdev_language(
    assessment_id: int,
    language: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Generate CapDev insights in an additional language.

    **Access:** MLGOO_DILG only

    This endpoint allows adding insights in a new language (e.g., Filipino)
    to an existing set of insights.

    Args:
        assessment_id: ID of the assessment
        language: Language code (ceb, en, fil)
        db: Database session
        current_user: Authenticated admin user

    Returns:
        CapDevTriggerResponse indicating success
    """
    # Validate language
    valid_languages = ["ceb", "en", "fil"]
    if language not in valid_languages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid language. Must be one of: {', '.join(valid_languages)}",
        )

    # Get assessment
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )

    # Check if assessment is MLGOO approved
    if assessment.status != AssessmentStatus.COMPLETED or not assessment.mlgoo_approved_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate CapDev insights for an assessment that is not MLGOO approved",
        )

    # Check if language already exists
    if assessment.capdev_insights and language in assessment.capdev_insights:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CapDev insights already exist for language '{language}'",
        )

    # Generate insights for the specific language using the service directly
    try:
        # Call for side effects (caching), result not needed here
        intelligence_service.get_capdev_insights_with_caching(db, assessment_id, language)

        logger.info(
            f"MLGOO {current_user.email} generated CapDev insights in {language} "
            f"for assessment {assessment_id}"
        )

        return CapDevTriggerResponse(
            success=True,
            message=f"CapDev insights generated successfully in {language}",
            assessment_id=assessment_id,
            task_id=None,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to generate CapDev insights in {language}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate CapDev insights: {str(e)}",
        )
