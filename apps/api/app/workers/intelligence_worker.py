# 🧠 Intelligence Worker
# Background tasks for AI-powered insights generation using Gemini API

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.db.base import SessionLocal
from app.db.enums import AssessmentStatus
from app.db.models import Assessment
from app.services.intelligence_service import intelligence_service

# Configure logging
logger = logging.getLogger(__name__)


def _generate_insights_logic(
    assessment_id: int,
    retry_count: int,
    max_retries: int,
    default_retry_delay: int,
    db: Session | None = None,
) -> dict[str, Any]:
    """
    Core logic for generating insights (separated for easier testing).

    Args:
        assessment_id: ID of the assessment
        retry_count: Current retry attempt number
        max_retries: Maximum number of retries allowed
        default_retry_delay: Base delay for exponential backoff
        db: Optional database session (for testing)

    Returns:
        dict: Result of the insight generation process
    """
    needs_cleanup = False
    if db is None:
        db = SessionLocal()
        needs_cleanup = True

    try:
        logger.info(
            "Generating AI insights for assessment %s (attempt %s)",
            assessment_id,
            retry_count + 1,
        )

        # Verify assessment exists and is validated
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            error_msg = f"Assessment {assessment_id} not found"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

        # Check if assessment is validated (required for insights)
        if assessment.status != AssessmentStatus.VALIDATED:
            error_msg = f"Assessment {assessment_id} is not validated. Status: {assessment.status}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

        # Generate insights using intelligence service
        # This method handles caching - checks database first before calling API
        insights = intelligence_service.get_insights_with_caching(db, assessment_id)

        logger.info(
            "Successfully generated AI insights for assessment %s",
            assessment_id,
        )

        return {
            "success": True,
            "assessment_id": assessment_id,
            "insights": insights,
            "message": "AI insights generated successfully",
        }

    except ValueError as e:
        # Don't retry on validation errors
        error_msg = str(e)
        logger.error(
            "Validation error generating insights for assessment %s: %s",
            assessment_id,
            error_msg,
        )
        return {"success": False, "error": error_msg}

    except Exception as e:
        # Log error
        error_msg = str(e)
        logger.error(
            "Error generating insights for assessment %s (attempt %s): %s",
            assessment_id,
            retry_count + 1,
            error_msg,
        )

        # Return error (retry logic handled by Celery task wrapper)
        return {"success": False, "error": error_msg}

    finally:
        if needs_cleanup:
            db.close()


@celery_app.task(
    bind=True,
    name="intelligence.generate_insights_task",
    max_retries=3,
    default_retry_delay=60,  # Start with 60 seconds
)
def generate_insights_task(self: Any, assessment_id: int) -> dict[str, Any]:
    """
    Generate AI-powered insights for an assessment using Gemini API.

    This is a Celery task that runs in the background to handle
    AI insight generation without blocking the main API thread.

    The task:
    1. Calls intelligence_service.get_insights_with_caching()
    2. Which checks cache first, then calls Gemini API if needed
    3. Saves results to ai_recommendations column
    4. Returns success status

    Args:
        assessment_id: ID of the assessment to generate insights for

    Returns:
        dict: Result of the insight generation process
    """
    result = _generate_insights_logic(
        assessment_id, self.request.retries, self.max_retries, self.default_retry_delay
    )

    # If successful, return the result
    if result["success"]:
        return result

    # Handle retry logic for non-validation errors
    if "error" in result:
        # Don't retry on validation errors (ValueError)
        if "not found" in result["error"].lower() or "not validated" in result["error"].lower():
            return result

        # Retry with exponential backoff for other errors
        if self.request.retries < self.max_retries:
            retry_count = self.request.retries + 1
            retry_delay = self.default_retry_delay * (2 ** (retry_count - 1))
            logger.info(
                "Retrying insight generation for assessment %s in %s seconds...",
                assessment_id,
                retry_delay,
            )
            raise self.retry(countdown=retry_delay)

        logger.error(
            "Max retries exceeded for assessment %s. Failing with error: %s",
            assessment_id,
            result["error"],
        )

    return result


def _generate_rework_summary_logic(
    assessment_id: int,
    retry_count: int,
    max_retries: int,
    default_retry_delay: int,
    db: Session | None = None,
) -> dict[str, Any]:
    """
    Core logic for generating rework summary (separated for easier testing).

    Args:
        assessment_id: ID of the assessment
        retry_count: Current retry attempt number
        max_retries: Maximum number of retries allowed
        default_retry_delay: Base delay for exponential backoff
        db: Optional database session (for testing)

    Returns:
        dict: Result of the rework summary generation process
    """
    needs_cleanup = False
    if db is None:
        db = SessionLocal()
        needs_cleanup = True

    try:
        logger.info(
            "Generating rework summary for assessment %s (attempt %s)",
            assessment_id,
            retry_count + 1,
        )

        # Verify assessment exists
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            error_msg = f"Assessment {assessment_id} not found"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

        # Check if assessment needs rework summary generation
        # Generate if: (1) currently in REWORK status, OR (2) has been through rework but missing summary
        needs_generation = assessment.status == AssessmentStatus.REWORK or (
            assessment.rework_count
            and assessment.rework_count > 0
            and not assessment.rework_summary
        )

        if not needs_generation:
            error_msg = (
                f"Assessment {assessment_id} does not need rework summary. "
                f"Status: {assessment.status}, rework_count: {assessment.rework_count}, "
                f"has_summary: {assessment.rework_summary is not None}"
            )
            logger.info(error_msg)
            return {
                "success": True,
                "assessment_id": assessment_id,
                "skipped": True,
                "message": error_msg,
            }

        # Check if summaries already exist for default languages (avoid duplicate generation)
        if assessment.rework_summary:
            # Check if it's the new multi-language format with both ceb and en
            if isinstance(assessment.rework_summary, dict) and "ceb" in assessment.rework_summary:
                logger.info(
                    "Rework summaries already exist for assessment %s, skipping generation",
                    assessment_id,
                )
                return {
                    "success": True,
                    "assessment_id": assessment_id,
                    "skipped": True,
                    "message": "Rework summaries already exist",
                    "rework_summary": assessment.rework_summary,
                }

        # Generate rework summaries in default languages (Bisaya + English)
        summaries = intelligence_service.generate_default_language_summaries(db, assessment_id)

        if not summaries:
            error_msg = f"Failed to generate any language summaries for assessment {assessment_id}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

        # Store the summaries in the database (keyed by language)
        from datetime import UTC, datetime

        assessment.rework_summary = summaries
        assessment.updated_at = datetime.now(UTC)
        db.commit()
        db.refresh(assessment)

        # Invalidate dashboard cache so new AI insights appear immediately
        try:
            from app.core.cache import cache

            deleted = cache.delete_pattern("dashboard_kpis:*")
            if deleted > 0:
                logger.info(
                    "♻️ Dashboard cache invalidated (%d keys) after rework summary for assessment %s",
                    deleted,
                    assessment_id,
                )
        except Exception as cache_error:
            logger.warning(
                "⚠️ Failed to invalidate dashboard cache after rework summary: %s",
                cache_error,
            )

        logger.info(
            "Successfully generated rework summaries for assessment %s in languages: %s",
            assessment_id,
            list(summaries.keys()),
        )

        return {
            "success": True,
            "assessment_id": assessment_id,
            "rework_summary": summaries,
            "languages_generated": list(summaries.keys()),
            "message": "Rework summaries generated successfully",
        }

    except ValueError as e:
        # Don't retry on validation errors
        error_msg = str(e)
        logger.error(
            "Validation error generating rework summary for assessment %s: %s",
            assessment_id,
            error_msg,
        )
        return {"success": False, "error": error_msg}

    except Exception as e:
        # Log error
        error_msg = str(e)
        logger.error(
            "Error generating rework summary for assessment %s (attempt %s): %s",
            assessment_id,
            retry_count + 1,
            error_msg,
        )

        # Return error (retry logic handled by Celery task wrapper)
        return {"success": False, "error": error_msg}

    finally:
        if needs_cleanup:
            db.close()


@celery_app.task(
    bind=True,
    name="intelligence.generate_rework_summary_task",
    max_retries=3,
    default_retry_delay=60,  # Start with 60 seconds
    queue="classification",  # Use classification queue for AI tasks
)
def generate_rework_summary_task(self: Any, assessment_id: int) -> dict[str, Any]:
    """
    Generate AI-powered rework summary for an assessment using Gemini API.

    This is a Celery task that runs in the background to handle
    AI-powered rework summary generation without blocking the main API thread.

    The task:
    1. Calls intelligence_service.generate_rework_summary()
    2. Analyzes assessor feedback (comments + MOV annotations)
    3. Generates comprehensive, actionable summary
    4. Saves results to rework_summary column
    5. Returns success status

    Args:
        assessment_id: ID of the assessment to generate rework summary for

    Returns:
        dict: Result of the rework summary generation process
    """
    result = _generate_rework_summary_logic(
        assessment_id, self.request.retries, self.max_retries, self.default_retry_delay
    )

    # If successful or skipped, return the result
    if result["success"]:
        return result

    # Handle retry logic for non-validation errors
    if "error" in result:
        # Don't retry on validation errors (ValueError)
        if (
            "not found" in result["error"].lower()
            or "not in rework status" in result["error"].lower()
            or "no indicators requiring rework" in result["error"].lower()
        ):
            return result

        # Retry with exponential backoff for other errors
        if self.request.retries < self.max_retries:
            retry_count = self.request.retries + 1
            retry_delay = self.default_retry_delay * (2 ** (retry_count - 1))
            logger.info(
                "Retrying rework summary generation for assessment %s in %s seconds...",
                assessment_id,
                retry_delay,
            )
            raise self.retry(countdown=retry_delay)

        logger.error(
            "Max retries exceeded for assessment %s rework summary. Failing with error: %s",
            assessment_id,
            result["error"],
        )

    return result


def _generate_calibration_summary_logic(
    assessment_id: int,
    governance_area_id: int,
    retry_count: int,
    max_retries: int,
    default_retry_delay: int,
    db: Session | None = None,
) -> dict[str, Any]:
    """
    Core logic for generating calibration summary (separated for easier testing).

    Args:
        assessment_id: ID of the assessment
        governance_area_id: ID of the validator's governance area
        retry_count: Current retry attempt number
        max_retries: Maximum number of retries allowed
        default_retry_delay: Base delay for exponential backoff
        db: Optional database session (for testing)

    Returns:
        dict: Result of the calibration summary generation process
    """
    needs_cleanup = False
    if db is None:
        db = SessionLocal()
        needs_cleanup = True

    try:
        logger.info(
            "Generating calibration summary for assessment %s (governance area %s, attempt %s)",
            assessment_id,
            governance_area_id,
            retry_count + 1,
        )

        # Verify assessment exists
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            error_msg = f"Assessment {assessment_id} not found"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

        # PARALLEL CALIBRATION: Check if summary already exists for THIS governance area
        area_id_key = str(governance_area_id)
        existing_summaries_by_area = assessment.calibration_summaries_by_area or {}
        area_summary_exists = (
            area_id_key in existing_summaries_by_area
            and isinstance(existing_summaries_by_area.get(area_id_key), dict)
            and "ceb" in existing_summaries_by_area.get(area_id_key, {})
        )

        # Check if assessment needs calibration summary generation for this area
        # Generate if: (1) currently in REWORK with calibration flag, OR (2) has been through calibration but missing summary for this area
        needs_generation = (
            assessment.status == AssessmentStatus.REWORK and assessment.is_calibration_rework
        ) or (
            assessment.calibration_count
            and assessment.calibration_count > 0
            and not area_summary_exists
        )

        if not needs_generation:
            error_msg = (
                f"Assessment {assessment_id} does not need calibration summary for area {governance_area_id}. "
                f"Status: {assessment.status}, calibration_count: {assessment.calibration_count}, "
                f"area_summary_exists: {area_summary_exists}"
            )
            logger.info(error_msg)
            return {
                "success": True,
                "assessment_id": assessment_id,
                "skipped": True,
                "message": error_msg,
            }

        # Generate calibration summaries in default languages (Bisaya + English)
        summaries = intelligence_service.generate_default_language_calibration_summaries(
            db, assessment_id, governance_area_id
        )

        if not summaries:
            error_msg = f"Failed to generate any language summaries for assessment {assessment_id}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

        # PARALLEL CALIBRATION: Store summaries in calibration_summaries_by_area
        # Each governance area has its own summary keyed by area ID
        from datetime import UTC, datetime

        if assessment.calibration_summaries_by_area is None:
            assessment.calibration_summaries_by_area = {}

        # Update the specific governance area's summary
        updated_summaries = dict(assessment.calibration_summaries_by_area)
        updated_summaries[area_id_key] = summaries
        assessment.calibration_summaries_by_area = updated_summaries

        # Also store in legacy calibration_summary field for backward compatibility
        # (keeps the most recent single summary)
        assessment.calibration_summary = summaries
        assessment.updated_at = datetime.now(UTC)
        db.commit()
        db.refresh(assessment)

        # Invalidate dashboard cache so new AI insights appear immediately
        try:
            from app.core.cache import cache

            deleted = cache.delete_pattern("dashboard_kpis:*")
            if deleted > 0:
                logger.info(
                    "♻️ Dashboard cache invalidated (%d keys) after calibration summary for assessment %s area %s",
                    deleted,
                    assessment_id,
                    governance_area_id,
                )
        except Exception as cache_error:
            logger.warning(
                "⚠️ Failed to invalidate dashboard cache after calibration summary: %s",
                cache_error,
            )

        logger.info(
            "Successfully generated calibration summaries for assessment %s governance area %s in languages: %s",
            assessment_id,
            governance_area_id,
            list(summaries.keys()),
        )

        return {
            "success": True,
            "assessment_id": assessment_id,
            "governance_area_id": governance_area_id,
            "calibration_summary": summaries,
            "languages_generated": list(summaries.keys()),
            "message": f"Calibration summaries generated successfully for governance area {governance_area_id}",
        }

    except ValueError as e:
        # Don't retry on validation errors
        error_msg = str(e)
        logger.error(
            "Validation error generating calibration summary for assessment %s: %s",
            assessment_id,
            error_msg,
        )
        return {"success": False, "error": error_msg}

    except Exception as e:
        # Log error
        error_msg = str(e)
        logger.error(
            "Error generating calibration summary for assessment %s (attempt %s): %s",
            assessment_id,
            retry_count + 1,
            error_msg,
        )

        # Return error (retry logic handled by Celery task wrapper)
        return {"success": False, "error": error_msg}

    finally:
        if needs_cleanup:
            db.close()


@celery_app.task(
    bind=True,
    name="intelligence.generate_calibration_summary_task",
    max_retries=3,
    default_retry_delay=60,  # Start with 60 seconds
    queue="classification",  # Use classification queue for AI tasks
)
def generate_calibration_summary_task(
    self: Any, assessment_id: int, governance_area_id: int
) -> dict[str, Any]:
    """
    Generate AI-powered calibration summary for an assessment using Gemini API.

    This is a Celery task that runs in the background to handle
    AI-powered calibration summary generation without blocking the main API thread.

    Unlike rework summaries which cover all indicators, calibration summaries
    focus only on indicators in the validator's governance area.

    The task:
    1. Calls intelligence_service.generate_calibration_summary()
    2. Analyzes validator feedback (comments + MOV annotations) for the governance area
    3. Generates comprehensive, actionable summary focused on calibration needs
    4. Saves results to calibration_summary column
    5. Returns success status

    Args:
        assessment_id: ID of the assessment to generate calibration summary for
        governance_area_id: ID of the validator's governance area

    Returns:
        dict: Result of the calibration summary generation process
    """
    result = _generate_calibration_summary_logic(
        assessment_id,
        governance_area_id,
        self.request.retries,
        self.max_retries,
        self.default_retry_delay,
    )

    # If successful or skipped, return the result
    if result["success"]:
        return result

    # Handle retry logic for non-validation errors
    if "error" in result:
        # Don't retry on validation errors (ValueError)
        if (
            "not found" in result["error"].lower()
            or "not in rework status" in result["error"].lower()
            or "not a calibration rework" in result["error"].lower()
            or "no indicators requiring calibration" in result["error"].lower()
        ):
            return result

        # Retry with exponential backoff for other errors
        if self.request.retries < self.max_retries:
            retry_count = self.request.retries + 1
            retry_delay = self.default_retry_delay * (2 ** (retry_count - 1))
            logger.info(
                "Retrying calibration summary generation for assessment %s in %s seconds...",
                assessment_id,
                retry_delay,
            )
            raise self.retry(countdown=retry_delay)

        logger.error(
            "Max retries exceeded for assessment %s calibration summary. Failing with error: %s",
            assessment_id,
            result["error"],
        )

    return result


def _generate_capdev_insights_logic(
    assessment_id: int,
    retry_count: int,
    max_retries: int,
    default_retry_delay: int,
    db: Session | None = None,
) -> dict[str, Any]:
    """
    Core logic for generating CapDev (Capacity Development) insights.

    This is triggered after MLGOO approval to generate comprehensive
    AI-powered capacity development recommendations for the barangay.

    Args:
        assessment_id: ID of the assessment
        retry_count: Current retry attempt number
        max_retries: Maximum number of retries allowed
        default_retry_delay: Base delay for exponential backoff
        db: Optional database session (for testing)

    Returns:
        dict: Result of the CapDev insights generation process
    """
    needs_cleanup = False
    if db is None:
        db = SessionLocal()
        needs_cleanup = True

    try:
        logger.info(
            "Generating CapDev insights for assessment %s (attempt %s)",
            assessment_id,
            retry_count + 1,
        )

        # Verify assessment exists
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            error_msg = f"Assessment {assessment_id} not found"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

        # Check if assessment is MLGOO approved (COMPLETED status with mlgoo_approved_at set)
        if assessment.status != AssessmentStatus.COMPLETED or not assessment.mlgoo_approved_at:
            error_msg = (
                f"Assessment {assessment_id} is not MLGOO approved. Status: {assessment.status}"
            )
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

        # Check if CapDev insights already exist (avoid duplicate generation)
        if assessment.capdev_insights:
            # Check if it's the new multi-language format with both ceb and en
            if isinstance(assessment.capdev_insights, dict) and "ceb" in assessment.capdev_insights:
                logger.info(
                    "CapDev insights already exist for assessment %s, skipping generation",
                    assessment_id,
                )
                return {
                    "success": True,
                    "assessment_id": assessment_id,
                    "skipped": True,
                    "message": "CapDev insights already exist",
                    "capdev_insights": assessment.capdev_insights,
                }

        # Update status to 'generating'
        assessment.capdev_insights_status = "generating"
        db.commit()

        # Generate CapDev insights in default languages (Bisaya + English)
        insights = intelligence_service.generate_default_language_capdev_insights(db, assessment_id)

        if not insights:
            error_msg = f"Failed to generate any CapDev insights for assessment {assessment_id}"
            logger.error(error_msg)
            assessment.capdev_insights_status = "failed"
            db.commit()
            return {"success": False, "error": error_msg}

        # Store the insights in the database (keyed by language)
        from datetime import UTC, datetime

        assessment.capdev_insights = insights
        assessment.capdev_insights_status = "completed"
        assessment.capdev_insights_generated_at = datetime.now(UTC)
        assessment.updated_at = datetime.now(UTC)
        db.commit()
        db.refresh(assessment)

        logger.info(
            "Successfully generated CapDev insights for assessment %s in languages: %s",
            assessment_id,
            list(insights.keys()),
        )

        return {
            "success": True,
            "assessment_id": assessment_id,
            "capdev_insights": insights,
            "languages_generated": list(insights.keys()),
            "message": "CapDev insights generated successfully",
        }

    except ValueError as e:
        # Don't retry on validation errors
        error_msg = str(e)
        logger.error(
            "Validation error generating CapDev insights for assessment %s: %s",
            assessment_id,
            error_msg,
        )
        # Update status to failed
        try:
            assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
            if assessment:
                assessment.capdev_insights_status = "failed"
                db.commit()
        except Exception:
            pass
        return {"success": False, "error": error_msg}

    except Exception as e:
        # Log error
        error_msg = str(e)
        logger.error(
            "Error generating CapDev insights for assessment %s (attempt %s): %s",
            assessment_id,
            retry_count + 1,
            error_msg,
        )

        # Update status to failed on final retry
        if retry_count >= max_retries - 1:
            try:
                assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
                if assessment:
                    assessment.capdev_insights_status = "failed"
                    db.commit()
            except Exception:
                pass

        # Return error (retry logic handled by Celery task wrapper)
        return {"success": False, "error": error_msg}

    finally:
        if needs_cleanup:
            db.close()


@celery_app.task(
    bind=True,
    name="intelligence.generate_capdev_insights_task",
    max_retries=3,
    default_retry_delay=60,  # Start with 60 seconds
    queue="classification",  # Use classification queue for AI tasks
)
def generate_capdev_insights_task(self: Any, assessment_id: int) -> dict[str, Any]:
    """
    Generate AI-powered CapDev (Capacity Development) insights using Gemini API.

    This is a Celery task that runs in the background after MLGOO approval
    to generate comprehensive capacity development recommendations for the barangay.

    The task:
    1. Verifies assessment is MLGOO_APPROVED
    2. Calls intelligence_service.generate_default_language_capdev_insights()
    3. Generates insights analyzing failed indicators, area results, and assessor feedback
    4. Saves results to capdev_insights column (multi-language: ceb, en)
    5. Updates capdev_insights_status and capdev_insights_generated_at
    6. Returns success status

    The generated insights include:
    - Summary of governance weaknesses
    - Actionable recommendations
    - Capacity development needs
    - Suggested interventions
    - Priority actions

    Args:
        assessment_id: ID of the MLGOO-approved assessment

    Returns:
        dict: Result of the CapDev insights generation process
    """
    result = _generate_capdev_insights_logic(
        assessment_id, self.request.retries, self.max_retries, self.default_retry_delay
    )

    # If successful or skipped, return the result
    if result["success"]:
        return result

    # Handle retry logic for non-validation errors
    if "error" in result:
        # Don't retry on validation errors (ValueError)
        if (
            "not found" in result["error"].lower()
            or "not mlgoo approved" in result["error"].lower()
            or "not completed" in result["error"].lower()
        ):
            return result

        # Retry with exponential backoff for other errors
        if self.request.retries < self.max_retries:
            retry_count = self.request.retries + 1
            retry_delay = self.default_retry_delay * (2 ** (retry_count - 1))
            logger.info(
                "Retrying CapDev insights generation for assessment %s in %s seconds...",
                assessment_id,
                retry_delay,
            )
            raise self.retry(countdown=retry_delay)

        logger.error(
            "Max retries exceeded for assessment %s CapDev insights. Failing with error: %s",
            assessment_id,
            result["error"],
        )

    return result
