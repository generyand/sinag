# Notification Service
# Business logic for notification management

import logging
from datetime import datetime
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.enums import NotificationType, UserRole
from app.db.models.assessment import Assessment
from app.db.models.governance_area import GovernanceArea
from app.db.models.notification import Notification
from app.db.models.user import User
from app.schemas.notification import NotificationResponse
from app.services.email_service import email_service

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Business logic for notification management.

    Follows fat service pattern - handles all notification operations including:
    - Creating notifications (in-app and email)
    - Bulk notifications to user groups (assessors, validators)
    - Retrieving and paginating notifications
    - Marking notifications as read
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    # ==================== CREATION METHODS ====================

    def create_notification(
        self,
        db: Session,
        recipient_id: int,
        notification_type: NotificationType,
        title: str,
        message: str,
        assessment_id: int | None = None,
        governance_area_id: int | None = None,
        send_email: bool = True,
    ) -> Notification:
        """
        Create a single notification record and optionally send email.

        Args:
            db: Database session
            recipient_id: User ID of the notification recipient
            notification_type: Type of notification
            title: Short notification title
            message: Full notification message
            assessment_id: Related assessment ID (optional)
            governance_area_id: Related governance area ID (optional)
            send_email: Whether to send email notification

        Returns:
            Created Notification object
        """
        # Create notification record
        notification = Notification(
            recipient_id=recipient_id,
            notification_type=notification_type,
            title=title,
            message=message,
            assessment_id=assessment_id,
            governance_area_id=governance_area_id,
            is_read=False,
            email_sent=False,
            created_at=datetime.utcnow(),
        )
        db.add(notification)
        db.flush()  # Get ID without committing

        # Send email if requested and configured
        if send_email and email_service.is_configured():
            recipient = db.query(User).filter(User.id == recipient_id).first()
            if recipient and recipient.email:
                try:
                    # Build email context
                    context = self._build_email_context(db, assessment_id, governance_area_id)

                    subject, html_body, text_body = email_service.build_notification_email(
                        notification_type=notification_type,
                        recipient_name=recipient.name,
                        context=context,
                    )

                    result = email_service.send_email(
                        to_email=recipient.email,
                        subject=subject,
                        body_html=html_body,
                        body_text=text_body,
                    )

                    if result.get("success"):
                        notification.email_sent = True
                        notification.email_sent_at = datetime.utcnow()

                except Exception as e:
                    self.logger.error(f"Failed to send notification email: {e}")

        return notification

    def notify_all_active_assessors(
        self,
        db: Session,
        notification_type: NotificationType,
        title: str,
        message: str,
        assessment_id: int,
        exclude_user_id: int | None = None,
    ) -> list[Notification]:
        """
        Send notification to ALL active assessors.

        Assessors don't have governance area assignments, so all active
        assessors receive new submission notifications.

        Args:
            db: Database session
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            assessment_id: Related assessment ID
            exclude_user_id: User ID to exclude (e.g., the submitting user)

        Returns:
            List of created Notification objects
        """
        # Get all active assessors
        query = db.query(User).filter(
            User.role == UserRole.ASSESSOR,
            User.is_active == True,
        )

        if exclude_user_id:
            query = query.filter(User.id != exclude_user_id)

        assessors = query.all()

        notifications = []
        for assessor in assessors:
            notification = self.create_notification(
                db=db,
                recipient_id=assessor.id,
                notification_type=notification_type,
                title=title,
                message=message,
                assessment_id=assessment_id,
            )
            notifications.append(notification)

        self.logger.info(
            f"Created {len(notifications)} notifications for assessors "
            f"(type: {notification_type.value})"
        )
        return notifications

    def notify_assessors_for_governance_area(
        self,
        db: Session,
        notification_type: NotificationType,
        title: str,
        message: str,
        governance_area_id: int,
        assessment_id: int,
    ) -> list[Notification]:
        """
        Send notification to assessors assigned to a specific governance area.

        After workflow restructuring: ASSESSORs are area-specific (not VALIDATORs).
        VALIDATORs are now system-wide.

        Args:
            db: Database session
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            governance_area_id: Governance area to find assessors for
            assessment_id: Related assessment ID

        Returns:
            List of created Notification objects
        """
        # Get assessors for this governance area (area-specific after workflow restructuring)
        assessors = (
            db.query(User)
            .filter(
                User.role == UserRole.ASSESSOR,
                User.assessor_area_id == governance_area_id,
                User.is_active == True,
            )
            .all()
        )

        notifications = []
        for assessor in assessors:
            notification = self.create_notification(
                db=db,
                recipient_id=assessor.id,
                notification_type=notification_type,
                title=title,
                message=message,
                assessment_id=assessment_id,
                governance_area_id=governance_area_id,
            )
            notifications.append(notification)

        self.logger.info(
            f"Created {len(notifications)} notifications for assessors "
            f"in governance area {governance_area_id}"
        )
        return notifications

    def notify_blgu_user(
        self,
        db: Session,
        notification_type: NotificationType,
        title: str,
        message: str,
        blgu_user_id: int,
        assessment_id: int,
    ) -> Notification:
        """
        Send notification to a specific BLGU user.

        Args:
            db: Database session
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            blgu_user_id: BLGU user ID
            assessment_id: Related assessment ID

        Returns:
            Created Notification object
        """
        return self.create_notification(
            db=db,
            recipient_id=blgu_user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            assessment_id=assessment_id,
        )

    def send_submission_reminder(
        self,
        db: Session,
        assessment_id: int,
    ) -> Notification | None:
        """
        Send a submission reminder to the BLGU user associated with an assessment.

        This is used by MLGOO to manually remind BLGUs to complete their submissions.

        Args:
            db: Database session
            assessment_id: Assessment ID

        Returns:
            Created Notification object or None if assessment not found
        """
        assessment = (
            db.query(Assessment)
            .options(joinedload(Assessment.blgu_user).joinedload(User.barangay))
            .filter(Assessment.id == assessment_id)
            .first()
        )
        if not assessment:
            return None

        if not assessment.blgu_user_id:
            return None

        # Get barangay name for the notification message
        barangay_name = "your barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        return self.create_notification(
            db=db,
            recipient_id=assessment.blgu_user_id,
            notification_type=NotificationType.SUBMISSION_REMINDER,
            title="Reminder: Complete Your Assessment",
            message=f"This is a friendly reminder from MLGOO-DILG to complete the SGLGB assessment for {barangay_name}.",
            assessment_id=assessment_id,
            send_email=True,
        )

    def queue_per_area_rework_notification(
        self,
        db: Session,
        assessment: Assessment,
        governance_area_id: int,
        governance_area_name: str,
        assessor: User,
        comments: str,
    ) -> Notification | None:
        """
        Send immediate per-area rework notification to BLGU.

        This enables faster turnaround - BLGUs are notified immediately when
        an assessor flags their governance area for rework, rather than waiting
        for all 6 assessors to complete their reviews.

        Args:
            db: Database session
            assessment: Assessment object
            governance_area_id: Governance area flagged for rework
            governance_area_name: Name of the governance area
            assessor: Assessor who requested the rework
            comments: Rework comments from assessor

        Returns:
            Created Notification object or None if BLGU user not found
        """
        if not assessment.blgu_user_id:
            self.logger.warning(
                f"Cannot send per-area rework notification: Assessment {assessment.id} has no BLGU user"
            )
            return None

        # Get barangay name for the notification message
        barangay_name = "your barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Build notification message with area-specific details
        title = f"Rework Required: {governance_area_name}"
        message = (
            f"The assessor for '{governance_area_name}' has flagged your {barangay_name} submission for rework. "
            f"Please review the feedback and make the necessary corrections.\n\n"
            f"Assessor Comments: {comments}"
        )

        notification = self.create_notification(
            db=db,
            recipient_id=assessment.blgu_user_id,
            notification_type=NotificationType.REWORK_REQUESTED,
            title=title,
            message=message,
            assessment_id=assessment.id,
            governance_area_id=governance_area_id,
            send_email=True,
        )

        self.logger.info(
            f"Sent per-area rework notification for area {governance_area_id} ({governance_area_name}) "
            f"to BLGU user {assessment.blgu_user_id} for assessment {assessment.id}"
        )

        return notification

    def queue_per_area_approval_notification(
        self,
        db: Session,
        assessment: Any,
        governance_area_id: int,
        governance_area_name: str,
        assessor: Any,
        is_post_rework: bool = False,
    ) -> "Notification | None":
        """
        Send immediate per-area approval notification to BLGU.

        Notifies the BLGU user when an assessor approves their governance area,
        both for initial assessments and post-rework resubmissions.

        Args:
            db: Database session
            assessment: Assessment object
            governance_area_id: Governance area that was approved
            governance_area_name: Name of the governance area
            assessor: Assessor who approved the area
            is_post_rework: Whether this approval is after a rework resubmission

        Returns:
            Created Notification object or None if BLGU user not found
        """
        if not assessment.blgu_user_id:
            self.logger.warning(
                f"Cannot send per-area approval notification: Assessment {assessment.id} has no BLGU user"
            )
            return None

        if is_post_rework:
            title = f"Area Approved (After Rework): {governance_area_name}"
            message = (
                f"The assessor has reviewed your rework submission for '{governance_area_name}' "
                f"and approved it."
            )
        else:
            title = f"Area Approved: {governance_area_name}"
            message = (
                f"The assessor for '{governance_area_name}' has completed their review "
                f"and approved it."
            )

        notification = self.create_notification(
            db=db,
            recipient_id=assessment.blgu_user_id,
            notification_type=NotificationType.AREA_ASSESSED,
            title=title,
            message=message,
            assessment_id=assessment.id,
            governance_area_id=governance_area_id,
            send_email=True,
        )

        self.logger.info(
            f"Sent per-area approval notification for area {governance_area_id} ({governance_area_name}) "
            f"to BLGU user {assessment.blgu_user_id} for assessment {assessment.id} "
            f"(post_rework={is_post_rework})"
        )

        return notification

    def notify_specific_validator(
        self,
        db: Session,
        notification_type: NotificationType,
        title: str,
        message: str,
        validator_id: int,
        assessment_id: int,
        governance_area_id: int | None = None,
    ) -> Notification:
        """
        Send notification to a specific validator (for calibration resubmissions).

        Args:
            db: Database session
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            validator_id: Validator user ID
            assessment_id: Related assessment ID
            governance_area_id: Related governance area ID

        Returns:
            Created Notification object
        """
        return self.create_notification(
            db=db,
            recipient_id=validator_id,
            notification_type=notification_type,
            title=title,
            message=message,
            assessment_id=assessment_id,
            governance_area_id=governance_area_id,
        )

    def notify_all_mlgoo_users(
        self,
        db: Session,
        notification_type: NotificationType,
        title: str,
        message: str,
        assessment_id: int,
    ) -> list[Notification]:
        """
        Send notification to ALL active MLGOO_DILG users.

        MLGOO users are notified when assessments are fully validated and complete.

        Args:
            db: Database session
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            assessment_id: Related assessment ID

        Returns:
            List of created Notification objects
        """
        # Get all active MLGOO users
        mlgoo_users = (
            db.query(User)
            .filter(
                User.role == UserRole.MLGOO_DILG,
                User.is_active == True,
            )
            .all()
        )

        notifications = []
        for user in mlgoo_users:
            notification = self.create_notification(
                db=db,
                recipient_id=user.id,
                notification_type=notification_type,
                title=title,
                message=message,
                assessment_id=assessment_id,
            )
            notifications.append(notification)

        self.logger.info(
            f"Created {len(notifications)} notifications for MLGOO users "
            f"(type: {notification_type.value})"
        )
        return notifications

    def notify_all_validators(
        self,
        db: Session,
        notification_type: NotificationType,
        title: str,
        message: str,
        assessment_id: int,
    ) -> list[Notification]:
        """
        Send notification to ALL active VALIDATOR users.

        Validators are system-wide (not area-specific) and are notified when:
        - Assessments are ready for final validation
        - BLGU resubmits after MLGOO recalibration (needs Validator re-review)

        Args:
            db: Database session
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            assessment_id: Related assessment ID

        Returns:
            List of created Notification objects
        """
        # Get all active Validators (system-wide, not area-specific)
        validators = (
            db.query(User)
            .filter(
                User.role == UserRole.VALIDATOR,
                User.is_active == True,
            )
            .all()
        )

        notifications = []
        for user in validators:
            notification = self.create_notification(
                db=db,
                recipient_id=user.id,
                notification_type=notification_type,
                title=title,
                message=message,
                assessment_id=assessment_id,
            )
            notifications.append(notification)

        self.logger.info(
            f"Created {len(notifications)} notifications for Validators "
            f"(type: {notification_type.value})"
        )
        return notifications

    # ==================== RETRIEVAL METHODS ====================

    def get_user_notifications(
        self,
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
        unread_only: bool = False,
    ) -> tuple[list[NotificationResponse], int, int]:
        """
        Get notifications for a user with pagination and enriched data.

        Args:
            db: Database session
            user_id: User ID to get notifications for
            skip: Number of records to skip (pagination)
            limit: Maximum records to return
            unread_only: If True, only return unread notifications

        Returns:
            Tuple of (notifications, total_count, unread_count)
        """
        # Base query
        query = db.query(Notification).filter(Notification.recipient_id == user_id)

        if unread_only:
            query = query.filter(Notification.is_read == False)

        # Get total count
        total = query.count()

        # Get unread count (always)
        unread_count = (
            db.query(Notification)
            .filter(
                Notification.recipient_id == user_id,
                Notification.is_read == False,
            )
            .count()
        )

        # Get paginated results ordered by created_at desc
        notifications = (
            query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
        )

        # Enrich with related data
        enriched = []
        for notification in notifications:
            response = NotificationResponse.model_validate(notification)

            # Add assessment barangay name
            if notification.assessment_id:
                assessment = (
                    db.query(Assessment).filter(Assessment.id == notification.assessment_id).first()
                )
                if assessment and assessment.blgu_user and assessment.blgu_user.barangay:
                    response.assessment_barangay_name = assessment.blgu_user.barangay.name

            # Add governance area name
            if notification.governance_area_id:
                area = (
                    db.query(GovernanceArea)
                    .filter(GovernanceArea.id == notification.governance_area_id)
                    .first()
                )
                if area:
                    response.governance_area_name = area.name

            enriched.append(response)

        return enriched, total, unread_count

    def get_unread_count(self, db: Session, user_id: int) -> int:
        """
        Get unread notification count for a user.
        Optimized for polling - minimal query.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Number of unread notifications
        """
        return (
            db.query(func.count(Notification.id))
            .filter(
                Notification.recipient_id == user_id,
                Notification.is_read == False,
            )
            .scalar()
        )

    def get_total_count(self, db: Session, user_id: int) -> int:
        """
        Get total notification count for a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Total number of notifications
        """
        return (
            db.query(func.count(Notification.id))
            .filter(Notification.recipient_id == user_id)
            .scalar()
        )

    def get_notification_by_id(
        self, db: Session, notification_id: int, user_id: int
    ) -> Notification | None:
        """
        Get a single notification by ID (with ownership verification).

        Args:
            db: Database session
            notification_id: Notification ID
            user_id: User ID (for ownership check)

        Returns:
            Notification object or None if not found/not owned
        """
        return (
            db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.recipient_id == user_id,
            )
            .first()
        )

    # ==================== UPDATE METHODS ====================

    def mark_as_read(self, db: Session, user_id: int, notification_ids: list[int]) -> int:
        """
        Mark specific notifications as read.

        Args:
            db: Database session
            user_id: User ID (for ownership verification)
            notification_ids: List of notification IDs to mark

        Returns:
            Number of notifications marked as read
        """
        result = (
            db.query(Notification)
            .filter(
                Notification.id.in_(notification_ids),
                Notification.recipient_id == user_id,
                Notification.is_read == False,
            )
            .update(
                {
                    Notification.is_read: True,
                    Notification.read_at: datetime.utcnow(),
                },
                synchronize_session=False,
            )
        )
        db.commit()
        return result

    def mark_all_as_read(self, db: Session, user_id: int) -> int:
        """
        Mark all notifications as read for a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Number of notifications marked as read
        """
        result = (
            db.query(Notification)
            .filter(
                Notification.recipient_id == user_id,
                Notification.is_read == False,
            )
            .update(
                {
                    Notification.is_read: True,
                    Notification.read_at: datetime.utcnow(),
                },
                synchronize_session=False,
            )
        )
        db.commit()
        return result

    # ==================== HELPER METHODS ====================

    def _build_email_context(
        self,
        db: Session,
        assessment_id: int | None,
        governance_area_id: int | None,
    ) -> dict:
        """
        Build email template context from related entities.

        Args:
            db: Database session
            assessment_id: Assessment ID
            governance_area_id: Governance area ID

        Returns:
            Dict with context values for email template
        """
        context = {
            "barangay_name": "Unknown Barangay",
            "governance_area_name": "Unknown Area",
            "assessment_id": assessment_id,
        }

        if assessment_id:
            assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
            if assessment and assessment.blgu_user and assessment.blgu_user.barangay:
                context["barangay_name"] = assessment.blgu_user.barangay.name

        if governance_area_id:
            area = db.query(GovernanceArea).filter(GovernanceArea.id == governance_area_id).first()
            if area:
                context["governance_area_name"] = area.name

        return context


# Singleton instance
notification_service = NotificationService()
