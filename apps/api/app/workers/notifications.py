# Notification Worker
# Background tasks for handling notifications

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

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


# ==================== NEW SUBMISSION NOTIFICATION ====================


@celery_app.task(bind=True, name="notifications.send_new_submission_notification")
def send_new_submission_notification(self: Any, assessment_id: int) -> Dict[str, Any]:
    """
    Notification #1: BLGU submits assessment -> All active Assessors notified.

    Args:
        assessment_id: ID of the submitted assessment

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

    except Exception as e:
        logger.error(
            "Error sending new submission notification for assessment %s: %s",
            assessment_id,
            str(e),
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== REWORK NOTIFICATION ====================


@celery_app.task(bind=True, name="notifications.send_rework_notification")
def send_rework_notification(self: Any, assessment_id: int) -> Dict[str, Any]:
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

    except Exception as e:
        logger.error(
            "Error sending rework notification for assessment %s: %s",
            assessment_id,
            str(e),
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== REWORK RESUBMISSION NOTIFICATION ====================


@celery_app.task(bind=True, name="notifications.send_rework_resubmission_notification")
def send_rework_resubmission_notification(
    self: Any, assessment_id: int
) -> Dict[str, Any]:
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
            return {"success": False, "error": "Assessment not found"}

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

    except Exception as e:
        logger.error(
            "Error sending rework resubmission notification for assessment %s: %s",
            assessment_id,
            str(e),
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== READY FOR VALIDATION NOTIFICATION ====================


@celery_app.task(bind=True, name="notifications.send_ready_for_validation_notification")
def send_ready_for_validation_notification(
    self: Any, assessment_id: int, governance_area_id: int
) -> Dict[str, Any]:
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
            return {"success": False, "error": "Assessment not found"}

        # Get governance area
        governance_area = (
            db.query(GovernanceArea)
            .filter(GovernanceArea.id == governance_area_id)
            .first()
        )
        governance_area_name = governance_area.name if governance_area else "Unknown Area"

        # Get barangay name
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Create notifications for validators in this governance area
        notifications = notification_service.notify_validators_for_governance_area(
            db=db,
            notification_type=NotificationType.READY_FOR_VALIDATION,
            title=f"Ready for Validation: {barangay_name}",
            message="An assessment is ready for final validation in your governance area.",
            governance_area_id=governance_area_id,
            assessment_id=assessment_id,
        )

        db.commit()

        logger.info(
            "READY_FOR_VALIDATION notification: Assessment %s, Area %s - %d validators notified",
            assessment_id,
            governance_area_name,
            len(notifications),
        )

        return {
            "success": True,
            "message": f"Ready for validation notification sent to {len(notifications)} validator(s)",
            "assessment_id": assessment_id,
            "governance_area_id": governance_area_id,
            "governance_area_name": governance_area_name,
            "barangay_name": barangay_name,
            "notifications_created": len(notifications),
        }

    except Exception as e:
        logger.error(
            "Error sending ready for validation notification for assessment %s: %s",
            assessment_id,
            str(e),
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== CALIBRATION NOTIFICATION ====================


@celery_app.task(bind=True, name="notifications.send_calibration_notification")
def send_calibration_notification(self: Any, assessment_id: int) -> Dict[str, Any]:
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
            return {"success": False, "error": "Assessment not found"}

        if not assessment.blgu_user_id:
            logger.error("Assessment %s has no BLGU user", assessment_id)
            return {"success": False, "error": "BLGU user not found"}

        # Get barangay name
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Get governance area name if calibration_validator_id is set
        governance_area_name = None
        if assessment.calibration_validator_id:
            validator = db.query(User).filter(
                User.id == assessment.calibration_validator_id
            ).first()
            if validator and validator.validator_area:
                governance_area_name = validator.validator_area.name

        # Create notification for BLGU user
        title = f"Calibration Required: {governance_area_name}" if governance_area_name else "Calibration Required"
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

    except Exception as e:
        logger.error(
            "Error sending calibration notification for assessment %s: %s",
            assessment_id,
            str(e),
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== CALIBRATION RESUBMISSION NOTIFICATION ====================


@celery_app.task(
    bind=True, name="notifications.send_calibration_resubmission_notification"
)
def send_calibration_resubmission_notification(
    self: Any, assessment_id: int, validator_id: int
) -> Dict[str, Any]:
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

        # Get governance area ID
        governance_area_id = validator.validator_area_id

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

    except Exception as e:
        logger.error(
            "Error sending calibration resubmission notification for assessment %s: %s",
            assessment_id,
            str(e),
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== VALIDATION COMPLETE NOTIFICATION ====================


@celery_app.task(bind=True, name="notifications.send_validation_complete_notification")
def send_validation_complete_notification(
    self: Any, assessment_id: int
) -> Dict[str, Any]:
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
            blgu_notification = notification_service.notify_blgu_user(
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

    except Exception as e:
        logger.error(
            "Error processing validation complete notification for assessment %s: %s",
            assessment_id,
            str(e),
        )
        db.rollback()
        return {"success": False, "error": str(e)}

    finally:
        db.close()


# ==================== DEADLINE EXTENSION NOTIFICATION ====================


@celery_app.task(bind=True, name="notifications.send_deadline_extension_notification")
def send_deadline_extension_notification(
    self: Any,
    barangay_id: int,
    indicator_ids: List[int],
    new_deadline: str,
    reason: str,
    created_by_user_id: int,
    db: Optional[Session] = None,
) -> Dict[str, Any]:
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
