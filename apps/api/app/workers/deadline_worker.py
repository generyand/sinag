# Deadline Worker
# Background tasks for handling Phase 1 deadline reminders and auto-submit
#
# Tasks:
# - process_deadline_reminders: Daily task to send 7d/3d/1d reminders
# - process_auto_submit: Hourly task to auto-submit expired DRAFT assessments
#
# All tasks include retry logic to handle transient failures:
# - Max 3 retries with exponential backoff (60s, 120s, 240s)
# - Retries on database connection errors and unexpected exceptions

import logging
from datetime import UTC, datetime
from typing import Any

from celery.exceptions import MaxRetriesExceededError
from sqlalchemy import and_
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified

from app.core.celery_app import celery_app
from app.db.base import SessionLocal
from app.db.enums import AssessmentStatus, NotificationType
from app.db.models import Assessment, User
from app.db.models.system import AssessmentYear
from app.services.notification_service import notification_service

# Configure logging
logger = logging.getLogger(__name__)

# Retry configuration constants
MAX_RETRIES = 3
RETRY_BACKOFF = 60  # Initial backoff in seconds
RETRY_BACKOFF_MAX = 300  # Maximum backoff in seconds

# Batch processing configuration
BATCH_SIZE = 100


# ==================== PROCESS DEADLINE REMINDERS ====================


@celery_app.task(
    bind=True,
    name="deadline.process_deadline_reminders",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def process_deadline_reminders(self: Any) -> dict[str, Any]:
    """
    Daily task to process and send Phase 1 deadline reminders.

    Runs via Celery Beat (daily at 8 AM Philippine time).
    Checks all DRAFT assessments for the active year and sends
    appropriate reminders (7d/3d/1d) if not already sent.

    Returns:
        dict: Summary of reminders sent
    """
    db: Session = SessionLocal()

    try:
        now = datetime.now(UTC)

        # Get the active assessment year with phase1_deadline
        active_year = db.query(AssessmentYear).filter(AssessmentYear.is_active == True).first()

        if not active_year:
            logger.info("No active assessment year found. Skipping deadline reminders.")
            return {"success": True, "message": "No active assessment year", "reminders_sent": 0}

        if not active_year.phase1_deadline:
            logger.info(
                "No phase1_deadline set for year %s. Skipping deadline reminders.",
                active_year.year,
            )
            return {
                "success": True,
                "message": "No phase1_deadline configured",
                "reminders_sent": 0,
            }

        phase1_deadline = active_year.phase1_deadline
        if phase1_deadline.tzinfo is None:
            phase1_deadline = phase1_deadline.replace(tzinfo=UTC)

        # Calculate days until deadline
        time_until_deadline = phase1_deadline - now
        days_remaining = time_until_deadline.days

        logger.info(
            "Processing deadline reminders for year %s. Deadline: %s, Days remaining: %d",
            active_year.year,
            phase1_deadline,
            days_remaining,
        )

        # If deadline has passed, no reminders needed
        if days_remaining < 0:
            logger.info("Phase 1 deadline has passed. No reminders to send.")
            return {
                "success": True,
                "message": "Deadline has passed",
                "reminders_sent": 0,
            }

        # Query DRAFT assessments for the active year
        draft_assessments = (
            db.query(Assessment)
            .options(joinedload(Assessment.blgu_user).joinedload(User.barangay))
            .filter(
                and_(
                    Assessment.assessment_year == active_year.year,
                    Assessment.status == AssessmentStatus.DRAFT,
                    Assessment.auto_submitted_at.is_(None),
                )
            )
            .all()
        )

        logger.info("Found %d DRAFT assessments to check for reminders", len(draft_assessments))

        reminders_sent = {
            "7_days": 0,
            "3_days": 0,
            "1_day": 0,
        }

        # Process assessments in batches
        for i in range(0, len(draft_assessments), BATCH_SIZE):
            batch = draft_assessments[i : i + BATCH_SIZE]

            for assessment in batch:
                try:
                    # Send catch-up reminders if user missed earlier ones
                    # Using separate if statements to ensure users get all applicable reminders

                    # Check and send 7-day reminder (if in 7-day window or missed earlier)
                    if days_remaining <= 7 and assessment.phase1_reminder_7d_sent_at is None:
                        _send_deadline_reminder(
                            db, assessment, 7, NotificationType.DEADLINE_REMINDER_7_DAYS
                        )
                        assessment.phase1_reminder_7d_sent_at = now
                        db.flush()  # Flush immediately to prevent duplicate on retry
                        reminders_sent["7_days"] += 1

                    # Check and send 3-day reminder (if in 3-day window or missed earlier)
                    if days_remaining <= 3 and assessment.phase1_reminder_3d_sent_at is None:
                        _send_deadline_reminder(
                            db, assessment, 3, NotificationType.DEADLINE_REMINDER_3_DAYS
                        )
                        assessment.phase1_reminder_3d_sent_at = now
                        db.flush()
                        reminders_sent["3_days"] += 1

                    # Check and send 1-day reminder (if in 1-day window or missed earlier)
                    if days_remaining <= 1 and assessment.phase1_reminder_1d_sent_at is None:
                        _send_deadline_reminder(
                            db, assessment, 1, NotificationType.DEADLINE_REMINDER_1_DAY
                        )
                        assessment.phase1_reminder_1d_sent_at = now
                        db.flush()
                        reminders_sent["1_day"] += 1

                except Exception as e:
                    logger.error(
                        "Failed to send reminder for assessment %s: %s",
                        assessment.id,
                        str(e),
                    )
                    # Continue with next assessment, don't fail entire batch
                    continue

            # Commit per batch
            db.commit()

        total_sent = sum(reminders_sent.values())
        logger.info(
            "Deadline reminders processed. 7d: %d, 3d: %d, 1d: %d, Total: %d",
            reminders_sent["7_days"],
            reminders_sent["3_days"],
            reminders_sent["1_day"],
            total_sent,
        )

        return {
            "success": True,
            "message": f"Processed deadline reminders for year {active_year.year}",
            "days_remaining": days_remaining,
            "reminders_sent": total_sent,
            "breakdown": reminders_sent,
        }

    except (OperationalError, SQLAlchemyError, ConnectionError, TimeoutError) as e:
        logger.warning(
            "Transient error processing deadline reminders (attempt %d/%d): %s",
            self.request.retries + 1,
            MAX_RETRIES + 1,
            str(e),
        )
        db.rollback()
        raise

    except MaxRetriesExceededError:
        logger.error("Max retries exceeded for deadline reminders processing")
        return {"success": False, "error": "Max retries exceeded"}

    except Exception as e:
        logger.error(
            "Unexpected error processing deadline reminders: %s",
            str(e),
            exc_info=True,
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


def _send_deadline_reminder(
    db: Session,
    assessment: Assessment,
    days_remaining: int,
    notification_type: NotificationType,
) -> None:
    """
    Helper function to send a deadline reminder notification.

    Args:
        db: Database session
        assessment: Assessment to send reminder for
        days_remaining: Number of days until deadline
        notification_type: Type of notification to send
    """
    if not assessment.blgu_user_id:
        logger.warning("Assessment %s has no BLGU user. Skipping reminder.", assessment.id)
        return

    barangay_name = "Unknown Barangay"
    if assessment.blgu_user and assessment.blgu_user.barangay:
        barangay_name = assessment.blgu_user.barangay.name

    day_word = "day" if days_remaining == 1 else "days"

    notification_service.notify_blgu_user(
        db=db,
        notification_type=notification_type,
        title=f"Deadline Reminder: {days_remaining} {day_word} remaining",
        message=f"Your SGLGB assessment for {barangay_name} must be submitted within {days_remaining} {day_word}. Please complete and submit your assessment before the deadline.",
        blgu_user_id=assessment.blgu_user_id,
        assessment_id=assessment.id,
    )

    logger.info(
        "Sent %d-day reminder for assessment %s (%s)",
        days_remaining,
        assessment.id,
        barangay_name,
    )


# ==================== PROCESS AUTO-SUBMIT ====================


@celery_app.task(
    bind=True,
    name="deadline.process_auto_submit",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def process_auto_submit(self: Any) -> dict[str, Any]:
    """
    Hourly task to auto-submit DRAFT assessments when deadline has passed.

    Runs via Celery Beat (hourly).
    Finds all DRAFT assessments where phase1_deadline has passed
    and automatically submits them.

    Returns:
        dict: Summary of auto-submitted assessments
    """
    db: Session = SessionLocal()

    try:
        now = datetime.now(UTC)

        # Get the active assessment year with phase1_deadline
        active_year = db.query(AssessmentYear).filter(AssessmentYear.is_active == True).first()

        if not active_year:
            logger.info("No active assessment year found. Skipping auto-submit.")
            return {"success": True, "message": "No active assessment year", "auto_submitted": 0}

        if not active_year.phase1_deadline:
            logger.info(
                "No phase1_deadline set for year %s. Skipping auto-submit.",
                active_year.year,
            )
            return {
                "success": True,
                "message": "No phase1_deadline configured",
                "auto_submitted": 0,
            }

        phase1_deadline = active_year.phase1_deadline
        if phase1_deadline.tzinfo is None:
            phase1_deadline = phase1_deadline.replace(tzinfo=UTC)

        # Only proceed if deadline has passed
        if now < phase1_deadline:
            logger.info("Phase 1 deadline has not passed yet. No auto-submit needed.")
            return {
                "success": True,
                "message": "Deadline not reached",
                "auto_submitted": 0,
            }

        logger.info(
            "Processing auto-submit for year %s. Deadline was: %s",
            active_year.year,
            phase1_deadline,
        )

        # Query DRAFT assessments that haven't been auto-submitted
        draft_assessments = (
            db.query(Assessment)
            .options(joinedload(Assessment.blgu_user).joinedload(User.barangay))
            .filter(
                and_(
                    Assessment.assessment_year == active_year.year,
                    Assessment.status == AssessmentStatus.DRAFT,
                    Assessment.auto_submitted_at.is_(None),
                )
            )
            .all()
        )

        logger.info("Found %d DRAFT assessments to auto-submit", len(draft_assessments))

        auto_submitted_count = 0

        # Process assessments in batches
        for i in range(0, len(draft_assessments), BATCH_SIZE):
            batch = draft_assessments[i : i + BATCH_SIZE]

            for assessment in batch:
                try:
                    _auto_submit_assessment(db, assessment, now)
                    db.flush()  # Flush immediately to prevent duplicate on retry
                    auto_submitted_count += 1
                except Exception as e:
                    logger.error(
                        "Failed to auto-submit assessment %s: %s",
                        assessment.id,
                        str(e),
                    )
                    # Continue with next assessment, don't fail entire batch
                    continue

            # Commit per batch
            db.commit()

        logger.info("Auto-submitted %d assessments", auto_submitted_count)

        return {
            "success": True,
            "message": f"Auto-submitted {auto_submitted_count} assessments for year {active_year.year}",
            "auto_submitted": auto_submitted_count,
        }

    except (OperationalError, SQLAlchemyError, ConnectionError, TimeoutError) as e:
        logger.warning(
            "Transient error processing auto-submit (attempt %d/%d): %s",
            self.request.retries + 1,
            MAX_RETRIES + 1,
            str(e),
        )
        db.rollback()
        raise

    except MaxRetriesExceededError:
        logger.error("Max retries exceeded for auto-submit processing")
        return {"success": False, "error": "Max retries exceeded"}

    except Exception as e:
        logger.error(
            "Unexpected error processing auto-submit: %s",
            str(e),
            exc_info=True,
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


def _auto_submit_assessment(db: Session, assessment: Assessment, now: datetime) -> None:
    """
    Helper function to auto-submit a single assessment.

    Args:
        db: Database session
        assessment: Assessment to auto-submit
        now: Current timestamp
    """
    barangay_name = "Unknown Barangay"
    if assessment.blgu_user and assessment.blgu_user.barangay:
        barangay_name = assessment.blgu_user.barangay.name

    # Update assessment status
    assessment.status = AssessmentStatus.SUBMITTED
    assessment.submitted_at = now
    assessment.auto_submitted_at = now

    # Submit all 6 governance areas so assessors can see the submission
    # Fix: also update areas that were initialized with "draft" status
    now_iso = now.isoformat()
    area_status = assessment.area_submission_status or {}
    for area_id in range(1, 7):
        area_key = str(area_id)
        existing = area_status.get(area_key, {})
        if existing.get("status") not in ("submitted", "in_review", "approved"):
            area_status[area_key] = {"status": "submitted", "submitted_at": now_iso}
    assessment.area_submission_status = area_status
    flag_modified(assessment, "area_submission_status")

    logger.info(
        "Auto-submitted assessment %s (%s) - Status changed from DRAFT to SUBMITTED",
        assessment.id,
        barangay_name,
    )

    # Send notification to BLGU user
    if assessment.blgu_user_id:
        notification_service.notify_blgu_user(
            db=db,
            notification_type=NotificationType.AUTO_SUBMITTED,
            title="Assessment Auto-Submitted",
            message=f"The submission deadline has passed and your SGLGB assessment for {barangay_name} has been automatically submitted. You can no longer make changes to this assessment.",
            blgu_user_id=assessment.blgu_user_id,
            assessment_id=assessment.id,
        )

        logger.info(
            "Sent AUTO_SUBMITTED notification for assessment %s (%s)",
            assessment.id,
            barangay_name,
        )
