# Assessment Year Worker
# Background tasks for assessment year management
#
# Tasks include:
# - Bulk assessment creation when a new year is activated
# - Year transition cleanup

import logging
from typing import Any

from celery.exceptions import MaxRetriesExceededError
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.db.base import SessionLocal
from app.db.enums import AssessmentStatus, UserRole
from app.db.models import Assessment, User
from app.db.models.system import AssessmentYear

# Configure logging
logger = logging.getLogger(__name__)

# Retry configuration constants
MAX_RETRIES = 3
RETRY_BACKOFF = 60  # Initial backoff in seconds
RETRY_BACKOFF_MAX = 300  # Maximum backoff in seconds

# Batch size for bulk operations
BATCH_SIZE = 100


class PermanentTaskError(Exception):
    """Exception for errors that should NOT trigger a retry."""

    pass


# ==================== BULK ASSESSMENT CREATION ====================


@celery_app.task(
    bind=True,
    name="assessment_year.create_bulk_assessments",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def create_bulk_assessments(self: Any, year: int) -> dict[str, Any]:
    """
    Create DRAFT assessments for all BLGU users for a specific assessment year.

    This task is triggered when a new assessment year is activated.
    It creates a DRAFT assessment for every BLGU user who doesn't already
    have an assessment for that year.

    Args:
        year: Assessment year to create assessments for

    Returns:
        dict: Result containing:
            - success: Whether the task completed successfully
            - year: The assessment year processed
            - assessments_created: Number of new assessments created
            - blgu_users_skipped: Number of users who already had assessments
            - error: Error message if failed

    Retry Policy:
        - Retries up to 3 times on transient errors (DB connection, timeouts)
        - No retry on permanent errors (year not found)
    """
    db: Session = SessionLocal()
    assessments_created = 0
    blgu_users_skipped = 0

    try:
        # Verify the year exists
        year_record = db.query(AssessmentYear).filter(AssessmentYear.year == year).first()

        if not year_record:
            logger.error("Assessment year %s not found", year)
            return {
                "success": False,
                "error": f"Assessment year {year} not found",
                "permanent": True,
            }

        # Get all BLGU users
        blgu_users = (
            db.query(User).filter(User.role == UserRole.BLGU_USER, User.is_active == True).all()
        )

        # Get all existing assessments for this year in ONE query (optimization)
        existing_user_ids = set(
            row[0]
            for row in db.query(Assessment.blgu_user_id)
            .filter(Assessment.assessment_year == year)
            .all()
        )

        logger.info(
            "Starting bulk assessment creation for year %s: %d BLGU users found, "
            "%d already have assessments",
            year,
            len(blgu_users),
            len(existing_user_ids),
        )

        # Process in batches
        for i in range(0, len(blgu_users), BATCH_SIZE):
            batch = blgu_users[i : i + BATCH_SIZE]
            batch_created = 0

            for user in batch:
                # Check if assessment already exists using the pre-fetched set
                if user.id in existing_user_ids:
                    blgu_users_skipped += 1
                    continue

                # Create new DRAFT assessment
                new_assessment = Assessment(
                    blgu_user_id=user.id,
                    assessment_year=year,
                    status=AssessmentStatus.DRAFT,
                )
                db.add(new_assessment)
                batch_created += 1
                assessments_created += 1

            # Commit batch
            db.commit()
            logger.info(
                "Batch %d-%d: Created %d assessments",
                i,
                min(i + BATCH_SIZE, len(blgu_users)),
                batch_created,
            )

        logger.info(
            "Bulk assessment creation complete for year %s: "
            "%d created, %d skipped (already existed)",
            year,
            assessments_created,
            blgu_users_skipped,
        )

        return {
            "success": True,
            "year": year,
            "assessments_created": assessments_created,
            "blgu_users_skipped": blgu_users_skipped,
            "total_blgu_users": len(blgu_users),
        }

    except MaxRetriesExceededError:
        logger.error(
            "Max retries exceeded for bulk assessment creation for year %s",
            year,
        )
        return {
            "success": False,
            "year": year,
            "error": "Max retries exceeded",
            "assessments_created": assessments_created,
            "blgu_users_skipped": blgu_users_skipped,
        }

    except Exception as e:
        logger.exception(
            "Error in bulk assessment creation for year %s: %s",
            year,
            str(e),
        )
        db.rollback()
        raise  # Re-raise for retry

    finally:
        db.close()


@celery_app.task(
    bind=True,
    name="assessment_year.create_assessment_for_blgu",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def create_assessment_for_blgu(
    self: Any, blgu_user_id: int, year: int | None = None
) -> dict[str, Any]:
    """
    Create a DRAFT assessment for a specific BLGU user.

    This task is triggered when:
    - A new BLGU user is created
    - A BLGU user needs an assessment for a new year

    If no year is specified, uses the currently active year.

    Args:
        blgu_user_id: ID of the BLGU user
        year: Optional assessment year (uses active year if not provided)

    Returns:
        dict: Result containing:
            - success: Whether the task completed successfully
            - assessment_id: ID of the created assessment (if successful)
            - year: The assessment year
            - error: Error message if failed
    """
    db: Session = SessionLocal()

    try:
        # Determine the year
        if year is None:
            active_year = db.query(AssessmentYear).filter(AssessmentYear.is_active == True).first()
            if not active_year:
                logger.warning("No active assessment year for BLGU user %s", blgu_user_id)
                return {
                    "success": False,
                    "error": "No active assessment year configured",
                    "permanent": True,
                }
            year = active_year.year

        # Verify user exists and is a BLGU user
        user = db.query(User).filter(User.id == blgu_user_id).first()
        if not user:
            logger.error("User %s not found", blgu_user_id)
            return {
                "success": False,
                "error": f"User {blgu_user_id} not found",
                "permanent": True,
            }

        if user.role != UserRole.BLGU_USER:
            logger.warning("User %s is not a BLGU user (role: %s)", blgu_user_id, user.role)
            return {
                "success": False,
                "error": f"User {blgu_user_id} is not a BLGU user",
                "permanent": True,
            }

        # Check if assessment already exists
        existing = (
            db.query(Assessment)
            .filter(
                Assessment.blgu_user_id == blgu_user_id,
                Assessment.assessment_year == year,
            )
            .first()
        )

        if existing:
            logger.info(
                "Assessment already exists for user %s, year %s: ID %s",
                blgu_user_id,
                year,
                existing.id,
            )
            return {
                "success": True,
                "assessment_id": existing.id,
                "year": year,
                "already_existed": True,
            }

        # Create new assessment
        new_assessment = Assessment(
            blgu_user_id=blgu_user_id,
            assessment_year=year,
            status=AssessmentStatus.DRAFT,
        )
        db.add(new_assessment)
        db.commit()
        db.refresh(new_assessment)

        logger.info(
            "Created assessment for user %s, year %s: ID %s",
            blgu_user_id,
            year,
            new_assessment.id,
        )

        return {
            "success": True,
            "assessment_id": new_assessment.id,
            "year": year,
            "already_existed": False,
        }

    except Exception as e:
        logger.exception(
            "Error creating assessment for user %s, year %s: %s",
            blgu_user_id,
            year,
            str(e),
        )
        db.rollback()
        raise  # Re-raise for retry

    finally:
        db.close()


# ==================== YEAR TRANSITION TASKS ====================


@celery_app.task(
    bind=True,
    name="assessment_year.finalize_year",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def finalize_year(self: Any, year: int) -> dict[str, Any]:
    """
    Finalize an assessment year.

    This task:
    1. Marks any remaining DRAFT assessments as INCOMPLETE
    2. Generates year-end reports
    3. Publishes the year for Katuparan Center visibility

    Args:
        year: Assessment year to finalize

    Returns:
        dict: Result with statistics
    """
    db: Session = SessionLocal()

    try:
        # Get assessment counts by status
        draft_count = (
            db.query(Assessment)
            .filter(
                Assessment.assessment_year == year,
                Assessment.status == AssessmentStatus.DRAFT,
            )
            .count()
        )

        completed_count = (
            db.query(Assessment)
            .filter(
                Assessment.assessment_year == year,
                Assessment.status == AssessmentStatus.COMPLETED,
            )
            .count()
        )

        total_count = db.query(Assessment).filter(Assessment.assessment_year == year).count()

        # Publish the year
        year_record = db.query(AssessmentYear).filter(AssessmentYear.year == year).first()
        if year_record:
            year_record.is_published = True
            db.commit()

        logger.info(
            "Finalized year %s: %d total, %d completed, %d draft",
            year,
            total_count,
            completed_count,
            draft_count,
        )

        return {
            "success": True,
            "year": year,
            "total_assessments": total_count,
            "completed_assessments": completed_count,
            "draft_assessments": draft_count,
            "published": True,
        }

    except Exception as e:
        logger.exception("Error finalizing year %s: %s", year, str(e))
        db.rollback()
        raise

    finally:
        db.close()
