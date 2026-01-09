# Notification Worker
# Background tasks for handling notifications
#
# All notification tasks include retry logic to handle transient failures:
# - Max 3 retries with exponential backoff (60s, 120s, 240s)
# - Retries on database connection errors and unexpected exceptions
# - No retry on permanent failures (e.g., assessment not found)

import logging
from datetime import datetime
from typing import Any

from celery.exceptions import MaxRetriesExceededError
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.db.base import SessionLocal
from app.db.enums import NotificationType
from app.db.models import Assessment, User
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea, Indicator
from app.services.notification_service import notification_service

# Configure logging
logger = logging.getLogger(__name__)

# Retry configuration constants
MAX_RETRIES = 3
RETRY_BACKOFF = 60  # Initial backoff in seconds
RETRY_BACKOFF_MAX = 300  # Maximum backoff in seconds


class PermanentTaskError(Exception):
    """Exception for errors that should NOT trigger a retry (e.g., resource not found)."""

    pass


# ==================== NEW SUBMISSION NOTIFICATION ====================


@celery_app.task(
    bind=True,
    name="notifications.send_new_submission_notification",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def send_new_submission_notification(self: Any, assessment_id: int) -> dict[str, Any]:
    """
    Notification #1: BLGU submits assessment -> All active Assessors notified.

    Args:
        assessment_id: ID of the submitted assessment

    Returns:
        dict: Result of the notification process

    Retry Policy:
        - Retries up to 3 times on transient errors (DB connection, timeouts)
        - No retry on permanent errors (assessment not found)
    """
    db: Session = SessionLocal()

    try:
        # Get the assessment with BLGU user details
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            # Permanent error - don't retry
            logger.error("Assessment %s not found", assessment_id)
            return {"success": False, "error": "Assessment not found", "permanent": True}

        # Get barangay name
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Create notifications for all active assessors
        notifications = notification_service.notify_all_active_assessors(
            db=db,
            notification_type=NotificationType.NEW_SUBMISSION,
            title=f"New Submission: {barangay_name}",
            message="A new SGLGB assessment has been submitted for review.",
            assessment_id=assessment_id,
            exclude_user_id=assessment.blgu_user_id,  # Don't notify the submitter
        )

        db.commit()

        logger.info(
            "NEW_SUBMISSION notification: Assessment %s from %s - %d assessors notified",
            assessment_id,
            barangay_name,
            len(notifications),
        )

        return {
            "success": True,
            "message": f"New submission notification sent to {len(notifications)} assessor(s)",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "notifications_created": len(notifications),
        }

    except (OperationalError, SQLAlchemyError, ConnectionError, TimeoutError) as e:
        # Transient errors - let Celery handle retry via autoretry_for
        logger.warning(
            "Transient error in new submission notification for assessment %s (attempt %d/%d): %s",
            assessment_id,
            self.request.retries + 1,
            MAX_RETRIES + 1,
            str(e),
        )
        db.rollback()
        raise  # Re-raise to trigger Celery retry

    except MaxRetriesExceededError:
        logger.error(
            "Max retries exceeded for new submission notification - assessment %s",
            assessment_id,
        )
        return {"success": False, "error": "Max retries exceeded", "assessment_id": assessment_id}

    except Exception as e:
        logger.error(
            "Unexpected error sending new submission notification for assessment %s: %s",
            assessment_id,
            str(e),
            exc_info=True,
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== REWORK NOTIFICATION ====================


@celery_app.task(
    bind=True,
    name="notifications.send_rework_notification",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def send_rework_notification(self: Any, assessment_id: int) -> dict[str, Any]:
    """
    Notification #2: Assessor sends rework -> BLGU user notified.

    Args:
        assessment_id: ID of the assessment that needs rework

    Returns:
        dict: Result of the notification process
    """
    db: Session = SessionLocal()

    try:
        # Get the assessment with BLGU user details
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            logger.error("Assessment %s not found", assessment_id)
            return {"success": False, "error": "Assessment not found", "permanent": True}

        if not assessment.blgu_user_id:
            logger.error("Assessment %s has no BLGU user", assessment_id)
            return {"success": False, "error": "BLGU user not found", "permanent": True}

        # Get barangay name
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Create notification for BLGU user
        notification = notification_service.notify_blgu_user(
            db=db,
            notification_type=NotificationType.REWORK_REQUESTED,
            title="Assessment Needs Revision",
            message="Your SGLGB assessment requires revisions. Please review the assessor feedback and resubmit.",
            blgu_user_id=assessment.blgu_user_id,
            assessment_id=assessment_id,
        )

        db.commit()

        logger.info(
            "REWORK_REQUESTED notification: Assessment %s for %s - BLGU user notified",
            assessment_id,
            barangay_name,
        )

        return {
            "success": True,
            "message": "Rework notification sent successfully",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "notification_id": notification.id,
        }

    except (OperationalError, SQLAlchemyError, ConnectionError, TimeoutError) as e:
        logger.warning(
            "Transient error in rework notification for assessment %s (attempt %d/%d): %s",
            assessment_id,
            self.request.retries + 1,
            MAX_RETRIES + 1,
            str(e),
        )
        db.rollback()
        raise

    except MaxRetriesExceededError:
        logger.error("Max retries exceeded for rework notification - assessment %s", assessment_id)
        return {"success": False, "error": "Max retries exceeded", "assessment_id": assessment_id}

    except Exception as e:
        logger.error(
            "Unexpected error sending rework notification for assessment %s: %s",
            assessment_id,
            str(e),
            exc_info=True,
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== REWORK RESUBMISSION NOTIFICATION ====================


@celery_app.task(
    bind=True,
    name="notifications.send_rework_resubmission_notification",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def send_rework_resubmission_notification(self: Any, assessment_id: int) -> dict[str, Any]:
    """
    Notification #3: BLGU resubmits after rework -> All active Assessors notified.

    Args:
        assessment_id: ID of the resubmitted assessment

    Returns:
        dict: Result of the notification process
    """
    db: Session = SessionLocal()

    try:
        # Get the assessment with BLGU user details
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            logger.error("Assessment %s not found", assessment_id)
            return {"success": False, "error": "Assessment not found", "permanent": True}

        # Get barangay name
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Create notifications for all active assessors
        notifications = notification_service.notify_all_active_assessors(
            db=db,
            notification_type=NotificationType.REWORK_RESUBMITTED,
            title=f"Rework Resubmission: {barangay_name}",
            message="The assessment has been resubmitted after addressing the requested revisions.",
            assessment_id=assessment_id,
            exclude_user_id=assessment.blgu_user_id,
        )

        db.commit()

        logger.info(
            "REWORK_RESUBMITTED notification: Assessment %s from %s - %d assessors notified",
            assessment_id,
            barangay_name,
            len(notifications),
        )

        return {
            "success": True,
            "message": f"Rework resubmission notification sent to {len(notifications)} assessor(s)",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "notifications_created": len(notifications),
        }

    except (OperationalError, SQLAlchemyError, ConnectionError, TimeoutError) as e:
        logger.warning(
            "Transient error in rework resubmission notification for assessment %s (attempt %d/%d): %s",
            assessment_id,
            self.request.retries + 1,
            MAX_RETRIES + 1,
            str(e),
        )
        db.rollback()
        raise

    except MaxRetriesExceededError:
        logger.error(
            "Max retries exceeded for rework resubmission notification - assessment %s",
            assessment_id,
        )
        return {"success": False, "error": "Max retries exceeded", "assessment_id": assessment_id}

    except Exception as e:
        logger.error(
            "Unexpected error sending rework resubmission notification for assessment %s: %s",
            assessment_id,
            str(e),
            exc_info=True,
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== READY FOR VALIDATION NOTIFICATION ====================


@celery_app.task(
    bind=True,
    name="notifications.send_ready_for_validation_notification",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def send_ready_for_validation_notification(
    self: Any, assessment_id: int, governance_area_id: int
) -> dict[str, Any]:
    """
    Notification #4: Assessor finalizes -> Validator(s) for governance area notified.

    Args:
        assessment_id: ID of the finalized assessment
        governance_area_id: ID of the governance area to notify validators for

    Returns:
        dict: Result of the notification process
    """
    db: Session = SessionLocal()

    try:
        # Get the assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            logger.error("Assessment %s not found", assessment_id)
            return {"success": False, "error": "Assessment not found", "permanent": True}

        # Get governance area
        governance_area = (
            db.query(GovernanceArea).filter(GovernanceArea.id == governance_area_id).first()
        )
        governance_area_name = governance_area.name if governance_area else "Unknown Area"

        # Get barangay name
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Create notifications for assessors in this governance area
        # After workflow restructuring: ASSESSORs are area-specific, VALIDATORs are system-wide
        notifications = notification_service.notify_assessors_for_governance_area(
            db=db,
            notification_type=NotificationType.READY_FOR_VALIDATION,
            title=f"Ready for Review: {barangay_name}",
            message="An assessment is ready for review in your governance area.",
            governance_area_id=governance_area_id,
            assessment_id=assessment_id,
        )

        db.commit()

        logger.info(
            "READY_FOR_VALIDATION notification: Assessment %s, Area %s - %d assessors notified",
            assessment_id,
            governance_area_name,
            len(notifications),
        )

        return {
            "success": True,
            "message": f"Ready for review notification sent to {len(notifications)} assessor(s)",
            "assessment_id": assessment_id,
            "governance_area_id": governance_area_id,
            "governance_area_name": governance_area_name,
            "barangay_name": barangay_name,
            "notifications_created": len(notifications),
        }

    except (OperationalError, SQLAlchemyError, ConnectionError, TimeoutError) as e:
        logger.warning(
            "Transient error in ready for validation notification for assessment %s (attempt %d/%d): %s",
            assessment_id,
            self.request.retries + 1,
            MAX_RETRIES + 1,
            str(e),
        )
        db.rollback()
        raise

    except MaxRetriesExceededError:
        logger.error(
            "Max retries exceeded for ready for validation notification - assessment %s",
            assessment_id,
        )
        return {"success": False, "error": "Max retries exceeded", "assessment_id": assessment_id}

    except Exception as e:
        logger.error(
            "Unexpected error sending ready for validation notification for assessment %s: %s",
            assessment_id,
            str(e),
            exc_info=True,
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== CALIBRATION NOTIFICATION ====================


@celery_app.task(
    bind=True,
    name="notifications.send_calibration_notification",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def send_calibration_notification(self: Any, assessment_id: int) -> dict[str, Any]:
    """
    Notification #5: Validator requests calibration -> BLGU user notified.

    Args:
        assessment_id: ID of the assessment requiring calibration

    Returns:
        dict: Result of the notification process
    """
    db: Session = SessionLocal()

    try:
        # Get the assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            logger.error("Assessment %s not found", assessment_id)
            return {"success": False, "error": "Assessment not found", "permanent": True}

        if not assessment.blgu_user_id:
            logger.error("Assessment %s has no BLGU user", assessment_id)
            return {"success": False, "error": "BLGU user not found", "permanent": True}

        # Get barangay name
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Get governance area name if calibration_validator_id is set
        governance_area_name = None
        if assessment.calibration_validator_id:
            validator = (
                db.query(User).filter(User.id == assessment.calibration_validator_id).first()
            )
            if validator and validator.validator_area:
                governance_area_name = validator.validator_area.name

        # Create notification for BLGU user
        title = (
            f"Calibration Required: {governance_area_name}"
            if governance_area_name
            else "Calibration Required"
        )
        notification = notification_service.notify_blgu_user(
            db=db,
            notification_type=NotificationType.CALIBRATION_REQUESTED,
            title=title,
            message="The validator has requested calibration. Please review the feedback and make the necessary corrections.",
            blgu_user_id=assessment.blgu_user_id,
            assessment_id=assessment_id,
        )

        db.commit()

        logger.info(
            "CALIBRATION_REQUESTED notification: Assessment %s for %s - BLGU user notified",
            assessment_id,
            barangay_name,
        )

        return {
            "success": True,
            "message": "Calibration notification sent successfully",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "notification_id": notification.id,
        }

    except (OperationalError, SQLAlchemyError, ConnectionError, TimeoutError) as e:
        logger.warning(
            "Transient error in calibration notification for assessment %s (attempt %d/%d): %s",
            assessment_id,
            self.request.retries + 1,
            MAX_RETRIES + 1,
            str(e),
        )
        db.rollback()
        raise

    except MaxRetriesExceededError:
        logger.error(
            "Max retries exceeded for calibration notification - assessment %s", assessment_id
        )
        return {"success": False, "error": "Max retries exceeded", "assessment_id": assessment_id}

    except Exception as e:
        logger.error(
            "Unexpected error sending calibration notification for assessment %s: %s",
            assessment_id,
            str(e),
            exc_info=True,
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== CALIBRATION RESUBMISSION NOTIFICATION ====================


@celery_app.task(
    bind=True,
    name="notifications.send_calibration_resubmission_notification",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def send_calibration_resubmission_notification(
    self: Any, assessment_id: int, validator_id: int
) -> dict[str, Any]:
    """
    Notification #6: BLGU resubmits after calibration -> Same Validator notified.

    Args:
        assessment_id: ID of the resubmitted assessment
        validator_id: ID of the validator who requested calibration

    Returns:
        dict: Result of the notification process
    """
    db: Session = SessionLocal()

    try:
        # Get the assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            logger.error("Assessment %s not found", assessment_id)
            return {"success": False, "error": "Assessment not found"}

        # Get validator
        validator = db.query(User).filter(User.id == validator_id).first()

        if not validator:
            logger.error("Validator %s not found", validator_id)
            return {"success": False, "error": "Validator not found"}

        # Get barangay name
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Get governance area ID from assessment context (validators are now system-wide)
        governance_area_id = (
            None  # Validators don't have area assignments after workflow restructuring
        )

        # Create notification for the specific validator
        notification = notification_service.notify_specific_validator(
            db=db,
            notification_type=NotificationType.CALIBRATION_RESUBMITTED,
            title=f"Calibration Resubmission: {barangay_name}",
            message="The assessment has been resubmitted after calibration. Please review the updated indicators.",
            validator_id=validator_id,
            assessment_id=assessment_id,
            governance_area_id=governance_area_id,
        )

        db.commit()

        logger.info(
            "CALIBRATION_RESUBMITTED notification: Assessment %s from %s - Validator %s notified",
            assessment_id,
            barangay_name,
            validator.name,
        )

        return {
            "success": True,
            "message": "Calibration resubmission notification sent successfully",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "validator_id": validator_id,
            "validator_name": validator.name,
            "notification_id": notification.id,
        }

    except (OperationalError, SQLAlchemyError, ConnectionError, TimeoutError) as e:
        logger.warning(
            "Transient error in calibration resubmission notification for assessment %s (attempt %d/%d): %s",
            assessment_id,
            self.request.retries + 1,
            MAX_RETRIES + 1,
            str(e),
        )
        db.rollback()
        raise

    except MaxRetriesExceededError:
        logger.error(
            "Max retries exceeded for calibration resubmission notification - assessment %s",
            assessment_id,
        )
        return {"success": False, "error": "Max retries exceeded", "assessment_id": assessment_id}

    except Exception as e:
        logger.error(
            "Unexpected error sending calibration resubmission notification for assessment %s: %s",
            assessment_id,
            str(e),
            exc_info=True,
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== VALIDATION COMPLETE NOTIFICATION ====================


@celery_app.task(
    bind=True,
    name="notifications.send_validation_complete_notification",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def send_validation_complete_notification(self: Any, assessment_id: int) -> dict[str, Any]:
    """
    Send notification to MLGOO users and BLGU user when assessment validation is complete.

    Notification #7: Validator completes validation -> MLGOO and BLGU notified

    Args:
        assessment_id: ID of the validated assessment

    Returns:
        dict: Result of the notification process
    """
    db: Session = SessionLocal()

    try:
        # Get the assessment with BLGU user details
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            logger.error("Assessment %s not found", assessment_id)
            return {"success": False, "error": "Assessment not found"}

        # Get barangay name
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        notifications_created = 0

        # Notify all MLGOO users
        mlgoo_notifications = notification_service.notify_all_mlgoo_users(
            db=db,
            notification_type=NotificationType.VALIDATION_COMPLETED,
            title=f"Validation Complete: {barangay_name}",
            message="The SGLGB assessment has been fully validated and is now complete.",
            assessment_id=assessment_id,
        )
        notifications_created += len(mlgoo_notifications)

        # Notify BLGU user
        if assessment.blgu_user_id:
            notification_service.notify_blgu_user(
                db=db,
                notification_type=NotificationType.VALIDATION_COMPLETED,
                title="Assessment Validated!",
                message="Congratulations! Your SGLGB assessment has been fully validated and is now complete.",
                blgu_user_id=assessment.blgu_user_id,
                assessment_id=assessment_id,
            )
            notifications_created += 1

        db.commit()

        logger.info(
            "VALIDATION_COMPLETED notification: Assessment %s for %s - %d users notified",
            assessment_id,
            barangay_name,
            notifications_created,
        )

        return {
            "success": True,
            "message": f"Validation complete notification sent to {notifications_created} user(s)",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "notifications_created": notifications_created,
        }

    except (OperationalError, SQLAlchemyError, ConnectionError, TimeoutError) as e:
        logger.warning(
            "Transient error in validation complete notification for assessment %s (attempt %d/%d): %s",
            assessment_id,
            self.request.retries + 1,
            MAX_RETRIES + 1,
            str(e),
        )
        db.rollback()
        raise

    except MaxRetriesExceededError:
        logger.error(
            "Max retries exceeded for validation complete notification - assessment %s",
            assessment_id,
        )
        return {"success": False, "error": "Max retries exceeded", "assessment_id": assessment_id}

    except Exception as e:
        logger.error(
            "Unexpected error processing validation complete notification for assessment %s: %s",
            assessment_id,
            str(e),
            exc_info=True,
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== DEADLINE EXTENSION NOTIFICATION ====================


@celery_app.task(
    bind=True,
    name="notifications.send_deadline_extension_notification",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def send_deadline_extension_notification(
    self: Any,
    barangay_id: int,
    indicator_ids: list[int],
    new_deadline: str,
    reason: str,
    created_by_user_id: int,
    db: Session | None = None,
) -> dict[str, Any]:
    """
    Send notification to BLGU users when deadline is extended.

    Args:
        barangay_id: ID of the barangay receiving the extension
        indicator_ids: List of indicator IDs with extended deadlines
        new_deadline: New deadline datetime (ISO format string)
        reason: Reason for the deadline extension
        created_by_user_id: ID of the admin who created the extension
        db: Optional database session (primarily for testing)

    Returns:
        dict: Result of the notification process
    """
    # Use provided session or create new one
    db_provided = db is not None
    if not db_provided:
        db = SessionLocal()

    try:
        # Get the barangay
        barangay = db.query(Barangay).filter(Barangay.id == barangay_id).first()

        if not barangay:
            logger.error("Barangay %s not found", barangay_id)
            return {"success": False, "error": "Barangay not found"}

        # Get the indicators
        indicators = db.query(Indicator).filter(Indicator.id.in_(indicator_ids)).all()

        if not indicators:
            logger.error("No indicators found for IDs: %s", indicator_ids)
            return {"success": False, "error": "Indicators not found"}

        # Get BLGU users for this barangay
        blgu_users = (
            db.query(User)
            .filter(
                User.barangay_id == barangay_id,
                User.role == "BLGU_USER",
                User.is_active == True,
            )
            .all()
        )

        if not blgu_users:
            logger.warning(
                "No BLGU users found for barangay %s. No notifications sent.",
                barangay_id,
            )
            return {
                "success": True,
                "message": "No BLGU users to notify",
                "barangay": barangay.name,
            }

        # Get the admin user who created the extension
        admin_user = db.query(User).filter(User.id == created_by_user_id).first()
        admin_name = admin_user.name if admin_user else "System Administrator"

        # Format the deadline for display
        deadline_dt = datetime.fromisoformat(new_deadline.replace("Z", "+00:00"))
        formatted_deadline = deadline_dt.strftime("%B %d, %Y at %I:%M %p")

        # Get indicator names
        indicator_names = [ind.name for ind in indicators]

        # Log the notification
        logger.info(
            "DEADLINE EXTENSION NOTIFICATION: Barangay %s (%s) - %d indicators extended to %s",
            barangay.name,
            barangay_id,
            len(indicators),
            formatted_deadline,
        )

        notification_details = {
            "barangay_id": barangay_id,
            "barangay_name": barangay.name,
            "indicator_count": len(indicators),
            "indicator_names": indicator_names,
            "new_deadline": formatted_deadline,
            "reason": reason,
            "granted_by": admin_name,
            "blgu_users_notified": [
                {"name": user.name, "email": user.email} for user in blgu_users
            ],
            "message": f"Good news! The deadline for {len(indicators)} indicator(s) in {barangay.name} has been extended to {formatted_deadline}. Reason: {reason}",
        }

        logger.info("Deadline extension notification details: %s", notification_details)

        return {
            "success": True,
            "message": f"Deadline extension notification sent successfully to {len(blgu_users)} BLGU user(s)",
            "notification_details": notification_details,
        }

    except Exception as e:
        logger.error(
            "Error sending deadline extension notification for barangay %s: %s",
            barangay_id,
            str(e),
        )
        return {"success": False, "error": str(e)}

    finally:
        # Only close the session if we created it (not provided for testing)
        if not db_provided:
            db.close()


# ==================== READY FOR MLGOO APPROVAL NOTIFICATION ====================


@celery_app.task(
    bind=True,
    name="notifications.send_ready_for_mlgoo_approval_notification",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def send_ready_for_mlgoo_approval_notification(self: Any, assessment_id: int) -> dict[str, Any]:
    """
    Notification #8: All Validators complete -> MLGOO notified for final approval.

    Sent when all governance areas have been validated and the assessment
    moves to AWAITING_MLGOO_APPROVAL status.

    Args:
        assessment_id: ID of the assessment ready for MLGOO approval

    Returns:
        dict: Result of the notification process
    """
    db: Session = SessionLocal()

    try:
        # Get the assessment with BLGU user details
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            logger.error("Assessment %s not found", assessment_id)
            return {"success": False, "error": "Assessment not found"}

        # Get barangay name
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Notify all MLGOO users
        notifications = notification_service.notify_all_mlgoo_users(
            db=db,
            notification_type=NotificationType.READY_FOR_MLGOO_APPROVAL,
            title=f"Ready for Final Approval: {barangay_name}",
            message="The SGLGB assessment has been validated by all governance areas and is ready for your final approval.",
            assessment_id=assessment_id,
        )

        db.commit()

        logger.info(
            "READY_FOR_MLGOO_APPROVAL notification: Assessment %s for %s - %d MLGOO users notified",
            assessment_id,
            barangay_name,
            len(notifications),
        )

        return {
            "success": True,
            "message": f"Ready for MLGOO approval notification sent to {len(notifications)} user(s)",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "notifications_created": len(notifications),
        }

    except (OperationalError, SQLAlchemyError, ConnectionError, TimeoutError) as e:
        logger.warning(
            "Transient error in ready for MLGOO approval notification for assessment %s (attempt %d/%d): %s",
            assessment_id,
            self.request.retries + 1,
            MAX_RETRIES + 1,
            str(e),
        )
        db.rollback()
        raise

    except MaxRetriesExceededError:
        logger.error(
            "Max retries exceeded for ready for MLGOO approval notification - assessment %s",
            assessment_id,
        )
        return {"success": False, "error": "Max retries exceeded", "assessment_id": assessment_id}

    except Exception as e:
        logger.error(
            "Unexpected error sending ready for MLGOO approval notification for assessment %s: %s",
            assessment_id,
            str(e),
            exc_info=True,
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== MLGOO RECALIBRATION NOTIFICATION ====================


@celery_app.task(
    bind=True,
    name="notifications.send_mlgoo_recalibration_notification",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def send_mlgoo_recalibration_notification(self: Any, assessment_id: int) -> dict[str, Any]:
    """
    Notification #9: MLGOO requests RE-calibration -> BLGU notified.

    Sent when MLGOO determines the validator was too strict and requests
    RE-calibration for specific indicators.

    Args:
        assessment_id: ID of the assessment requiring RE-calibration

    Returns:
        dict: Result of the notification process
    """
    db: Session = SessionLocal()

    try:
        # Get the assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            logger.error("Assessment %s not found", assessment_id)
            return {"success": False, "error": "Assessment not found"}

        if not assessment.blgu_user_id:
            logger.error("Assessment %s has no BLGU user", assessment_id)
            return {"success": False, "error": "BLGU user not found"}

        # Get barangay name
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Create notification for BLGU user
        notification = notification_service.notify_blgu_user(
            db=db,
            notification_type=NotificationType.MLGOO_RECALIBRATION_REQUESTED,
            title="RE-calibration Requested by MLGOO",
            message="The MLGOO Chairman has requested RE-calibration for specific indicators. Please review the feedback and make corrections.",
            blgu_user_id=assessment.blgu_user_id,
            assessment_id=assessment_id,
        )

        db.commit()

        logger.info(
            "MLGOO_RECALIBRATION_REQUESTED notification: Assessment %s for %s - BLGU user notified",
            assessment_id,
            barangay_name,
        )

        return {
            "success": True,
            "message": "MLGOO RE-calibration notification sent successfully",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "notification_id": notification.id,
        }

    except (OperationalError, SQLAlchemyError, ConnectionError, TimeoutError) as e:
        logger.warning(
            "Transient error in MLGOO recalibration notification for assessment %s (attempt %d/%d): %s",
            assessment_id,
            self.request.retries + 1,
            MAX_RETRIES + 1,
            str(e),
        )
        db.rollback()
        raise

    except MaxRetriesExceededError:
        logger.error(
            "Max retries exceeded for MLGOO recalibration notification - assessment %s",
            assessment_id,
        )
        return {"success": False, "error": "Max retries exceeded", "assessment_id": assessment_id}

    except Exception as e:
        logger.error(
            "Unexpected error sending MLGOO RE-calibration notification for assessment %s: %s",
            assessment_id,
            str(e),
            exc_info=True,
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== ASSESSMENT APPROVED NOTIFICATION ====================


@celery_app.task(
    bind=True,
    name="notifications.send_assessment_approved_notification",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def send_assessment_approved_notification(self: Any, assessment_id: int) -> dict[str, Any]:
    """
    Notification #10: MLGOO approves assessment -> BLGU notified.

    Sent when MLGOO gives final approval and assessment moves to COMPLETED.

    Args:
        assessment_id: ID of the approved assessment

    Returns:
        dict: Result of the notification process
    """
    db: Session = SessionLocal()

    try:
        # Get the assessment with BLGU user details
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            logger.error("Assessment %s not found", assessment_id)
            return {"success": False, "error": "Assessment not found"}

        # Get barangay name
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        notifications_created = 0

        # Notify BLGU user
        if assessment.blgu_user_id:
            notification_service.notify_blgu_user(
                db=db,
                notification_type=NotificationType.ASSESSMENT_APPROVED,
                title="Assessment Approved!",
                message="Congratulations! Your SGLGB assessment has been approved by the MLGOO Chairman and is now officially complete.",
                blgu_user_id=assessment.blgu_user_id,
                assessment_id=assessment_id,
            )
            notifications_created += 1

        db.commit()

        logger.info(
            "ASSESSMENT_APPROVED notification: Assessment %s for %s - BLGU user notified",
            assessment_id,
            barangay_name,
        )

        return {
            "success": True,
            "message": f"Assessment approved notification sent to {notifications_created} user(s)",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "notifications_created": notifications_created,
        }

    except (OperationalError, SQLAlchemyError, ConnectionError, TimeoutError) as e:
        logger.warning(
            "Transient error in assessment approved notification for assessment %s (attempt %d/%d): %s",
            assessment_id,
            self.request.retries + 1,
            MAX_RETRIES + 1,
            str(e),
        )
        db.rollback()
        raise

    except MaxRetriesExceededError:
        logger.error(
            "Max retries exceeded for assessment approved notification - assessment %s",
            assessment_id,
        )
        return {"success": False, "error": "Max retries exceeded", "assessment_id": assessment_id}

    except Exception as e:
        logger.error(
            "Unexpected error sending assessment approved notification for assessment %s: %s",
            assessment_id,
            str(e),
            exc_info=True,
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== GRACE PERIOD WARNING NOTIFICATION ====================


@celery_app.task(
    bind=True,
    name="notifications.send_grace_period_warning_notification",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def send_grace_period_warning_notification(
    self: Any, assessment_id: int, hours_remaining: int
) -> dict[str, Any]:
    """
    Notification #11: Grace period expiring soon -> BLGU warned.

    Sent when the grace period is about to expire (e.g., 24 hours remaining).

    Args:
        assessment_id: ID of the assessment with expiring grace period
        hours_remaining: Number of hours remaining until deadline

    Returns:
        dict: Result of the notification process
    """
    db: Session = SessionLocal()

    try:
        # Get the assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            logger.error("Assessment %s not found", assessment_id)
            return {"success": False, "error": "Assessment not found"}

        if not assessment.blgu_user_id:
            logger.error("Assessment %s has no BLGU user", assessment_id)
            return {"success": False, "error": "BLGU user not found"}

        # Get barangay name
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Create notification for BLGU user
        notification = notification_service.notify_blgu_user(
            db=db,
            notification_type=NotificationType.GRACE_PERIOD_WARNING,
            title=f"Deadline Warning: {hours_remaining} Hours Remaining",
            message=f"Your assessment grace period expires in {hours_remaining} hours. Please complete your corrections before the deadline to avoid being locked out.",
            blgu_user_id=assessment.blgu_user_id,
            assessment_id=assessment_id,
        )

        db.commit()

        logger.info(
            "GRACE_PERIOD_WARNING notification: Assessment %s for %s - %d hours remaining",
            assessment_id,
            barangay_name,
            hours_remaining,
        )

        return {
            "success": True,
            "message": "Grace period warning notification sent successfully",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "hours_remaining": hours_remaining,
            "notification_id": notification.id,
        }

    except (OperationalError, SQLAlchemyError, ConnectionError, TimeoutError) as e:
        logger.warning(
            "Transient error in grace period warning notification for assessment %s (attempt %d/%d): %s",
            assessment_id,
            self.request.retries + 1,
            MAX_RETRIES + 1,
            str(e),
        )
        db.rollback()
        raise

    except MaxRetriesExceededError:
        logger.error(
            "Max retries exceeded for grace period warning notification - assessment %s",
            assessment_id,
        )
        return {"success": False, "error": "Max retries exceeded", "assessment_id": assessment_id}

    except Exception as e:
        logger.error(
            "Unexpected error sending grace period warning notification for assessment %s: %s",
            assessment_id,
            str(e),
            exc_info=True,
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== DEADLINE EXPIRED LOCKED NOTIFICATION ====================


@celery_app.task(
    bind=True,
    name="notifications.send_deadline_expired_notification",
    autoretry_for=(OperationalError, SQLAlchemyError, ConnectionError, TimeoutError),
    retry_backoff=RETRY_BACKOFF,
    retry_backoff_max=RETRY_BACKOFF_MAX,
    max_retries=MAX_RETRIES,
    retry_jitter=True,
)
def send_deadline_expired_notification(self: Any, assessment_id: int) -> dict[str, Any]:
    """
    Notification #12: Grace period expired -> BLGU locked, MLGOO notified.

    Sent when the grace period expires, locking the BLGU from further edits
    and notifying MLGOO to decide what to do.

    Args:
        assessment_id: ID of the locked assessment

    Returns:
        dict: Result of the notification process
    """
    db: Session = SessionLocal()

    try:
        # Get the assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

        if not assessment:
            logger.error("Assessment %s not found", assessment_id)
            return {"success": False, "error": "Assessment not found"}

        # Get barangay name
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        notifications_created = 0

        # Notify BLGU user that they are locked out
        if assessment.blgu_user_id:
            notification_service.notify_blgu_user(
                db=db,
                notification_type=NotificationType.DEADLINE_EXPIRED_LOCKED,
                title="Assessment Deadline Expired",
                message="The grace period for your assessment has expired. Your assessment is now locked. Please contact MLGOO for further instructions.",
                blgu_user_id=assessment.blgu_user_id,
                assessment_id=assessment_id,
            )
            notifications_created += 1

        # Notify all MLGOO users about the expired deadline
        mlgoo_notifications = notification_service.notify_all_mlgoo_users(
            db=db,
            notification_type=NotificationType.DEADLINE_EXPIRED_LOCKED,
            title=f"Deadline Expired: {barangay_name}",
            message=f"The grace period for {barangay_name}'s assessment has expired. The BLGU is now locked. Please review and take appropriate action.",
            assessment_id=assessment_id,
        )
        notifications_created += len(mlgoo_notifications)

        db.commit()

        logger.info(
            "DEADLINE_EXPIRED_LOCKED notification: Assessment %s for %s - %d users notified",
            assessment_id,
            barangay_name,
            notifications_created,
        )

        return {
            "success": True,
            "message": f"Deadline expired notification sent to {notifications_created} user(s)",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "notifications_created": notifications_created,
        }

    except (OperationalError, SQLAlchemyError, ConnectionError, TimeoutError) as e:
        logger.warning(
            "Transient error in deadline expired notification for assessment %s (attempt %d/%d): %s",
            assessment_id,
            self.request.retries + 1,
            MAX_RETRIES + 1,
            str(e),
        )
        db.rollback()
        raise

    except MaxRetriesExceededError:
        logger.error(
            "Max retries exceeded for deadline expired notification - assessment %s", assessment_id
        )
        return {"success": False, "error": "Max retries exceeded", "assessment_id": assessment_id}

    except Exception as e:
        logger.error(
            "Unexpected error sending deadline expired notification for assessment %s: %s",
            assessment_id,
            str(e),
            exc_info=True,
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()
