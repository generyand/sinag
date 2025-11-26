"""
Tests for notification service layer (app/services/notification_service.py)
"""

import pytest
from datetime import datetime
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock

from app.db.models.user import User
from app.db.models.notification import Notification
from app.db.models.assessment import Assessment
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea
from app.db.enums import UserRole, NotificationType, AssessmentStatus, AreaType
from app.services.notification_service import notification_service
from app.core.security import get_password_hash


# ====================================================================
# Test Fixtures
# ====================================================================


@pytest.fixture
def governance_area(db_session: Session):
    """Create a governance area for testing"""
    ga = GovernanceArea(
        name="Financial Administration",
        code="FA",
        area_type=AreaType.CORE,
    )
    db_session.add(ga)
    db_session.commit()
    db_session.refresh(ga)
    return ga


@pytest.fixture
def barangay(db_session: Session):
    """Create a barangay for testing"""
    brgy = Barangay(name="Test Barangay")
    db_session.add(brgy)
    db_session.commit()
    db_session.refresh(brgy)
    return brgy


@pytest.fixture
def blgu_user(db_session: Session, barangay: Barangay):
    """Create a BLGU user for testing"""
    user = User(
        email="blgu@example.com",
        name="BLGU User",
        hashed_password=get_password_hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def assessor_user(db_session: Session):
    """Create an assessor user for testing"""
    user = User(
        email="assessor@example.com",
        name="Assessor User",
        hashed_password=get_password_hash("password123"),
        role=UserRole.ASSESSOR,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def validator_user(db_session: Session, governance_area: GovernanceArea):
    """Create a validator user for testing"""
    user = User(
        email="validator@example.com",
        name="Validator User",
        hashed_password=get_password_hash("password123"),
        role=UserRole.VALIDATOR,
        validator_area_id=governance_area.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def assessment(db_session: Session, blgu_user: User):
    """Create an assessment for testing"""
    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        status=AssessmentStatus.SUBMITTED,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


# ====================================================================
# Create Notification Tests
# ====================================================================


def test_create_notification_success(
    db_session: Session, blgu_user: User, assessment: Assessment
):
    """Test creating a notification successfully"""
    notification = notification_service.create_notification(
        db=db_session,
        recipient_id=blgu_user.id,
        notification_type=NotificationType.NEW_SUBMISSION,
        title="Test Notification",
        message="This is a test notification",
        assessment_id=assessment.id,
    )

    assert notification is not None
    assert notification.id is not None
    assert notification.recipient_id == blgu_user.id
    assert notification.notification_type == NotificationType.NEW_SUBMISSION
    assert notification.title == "Test Notification"
    assert notification.message == "This is a test notification"
    assert notification.assessment_id == assessment.id
    assert notification.is_read is False
    assert notification.read_at is None


def test_create_notification_with_governance_area(
    db_session: Session,
    blgu_user: User,
    assessment: Assessment,
    governance_area: GovernanceArea,
):
    """Test creating a notification with governance area"""
    notification = notification_service.create_notification(
        db=db_session,
        recipient_id=blgu_user.id,
        notification_type=NotificationType.READY_FOR_VALIDATION,
        title="Ready for Validation",
        message="Assessment is ready for validation",
        assessment_id=assessment.id,
        governance_area_id=governance_area.id,
    )

    assert notification.governance_area_id == governance_area.id


def test_create_notification_without_assessment(db_session: Session, blgu_user: User):
    """Test creating a notification without assessment (system notification)"""
    notification = notification_service.create_notification(
        db=db_session,
        recipient_id=blgu_user.id,
        notification_type=NotificationType.NEW_SUBMISSION,
        title="System Notification",
        message="This is a system notification",
    )

    assert notification.assessment_id is None


# ====================================================================
# Notify Assessors Tests
# ====================================================================


def test_notify_all_active_assessors(
    db_session: Session, assessor_user: User, assessment: Assessment
):
    """Test notifying all active assessors"""
    # Create another assessor
    assessor2 = User(
        email="assessor2@example.com",
        name="Assessor 2",
        hashed_password=get_password_hash("password123"),
        role=UserRole.ASSESSOR,
        is_active=True,
    )
    db_session.add(assessor2)
    db_session.commit()

    notifications = notification_service.notify_all_active_assessors(
        db=db_session,
        notification_type=NotificationType.NEW_SUBMISSION,
        title="New Submission",
        message="A new assessment has been submitted",
        assessment_id=assessment.id,
    )

    assert len(notifications) == 2
    recipient_ids = {n.recipient_id for n in notifications}
    assert assessor_user.id in recipient_ids
    assert assessor2.id in recipient_ids


def test_notify_all_active_assessors_excludes_inactive(
    db_session: Session, assessment: Assessment
):
    """Test that inactive assessors are not notified"""
    # Create active assessor
    active_assessor = User(
        email="active@example.com",
        name="Active Assessor",
        hashed_password=get_password_hash("password123"),
        role=UserRole.ASSESSOR,
        is_active=True,
    )
    db_session.add(active_assessor)

    # Create inactive assessor
    inactive_assessor = User(
        email="inactive@example.com",
        name="Inactive Assessor",
        hashed_password=get_password_hash("password123"),
        role=UserRole.ASSESSOR,
        is_active=False,
    )
    db_session.add(inactive_assessor)
    db_session.commit()

    notifications = notification_service.notify_all_active_assessors(
        db=db_session,
        notification_type=NotificationType.NEW_SUBMISSION,
        title="New Submission",
        message="A new assessment has been submitted",
        assessment_id=assessment.id,
    )

    assert len(notifications) == 1
    assert notifications[0].recipient_id == active_assessor.id


# ====================================================================
# Notify Validators Tests
# ====================================================================


def test_notify_validators_for_governance_area(
    db_session: Session,
    validator_user: User,
    assessment: Assessment,
    governance_area: GovernanceArea,
):
    """Test notifying validators for a specific governance area"""
    notifications = notification_service.notify_validators_for_governance_area(
        db=db_session,
        governance_area_id=governance_area.id,
        notification_type=NotificationType.READY_FOR_VALIDATION,
        title="Ready for Validation",
        message="Assessment is ready for validation",
        assessment_id=assessment.id,
    )

    assert len(notifications) == 1
    assert notifications[0].recipient_id == validator_user.id
    assert notifications[0].governance_area_id == governance_area.id


def test_notify_validators_excludes_other_areas(
    db_session: Session, assessment: Assessment
):
    """Test that validators from other areas are not notified"""
    # Create two governance areas
    ga1 = GovernanceArea(name="Area 1", code="A1", area_type=AreaType.CORE)
    ga2 = GovernanceArea(name="Area 2", code="A2", area_type=AreaType.CORE)
    db_session.add_all([ga1, ga2])
    db_session.commit()

    # Create validators for each area
    validator1 = User(
        email="validator1@example.com",
        name="Validator 1",
        hashed_password=get_password_hash("password123"),
        role=UserRole.VALIDATOR,
        validator_area_id=ga1.id,
        is_active=True,
    )
    validator2 = User(
        email="validator2@example.com",
        name="Validator 2",
        hashed_password=get_password_hash("password123"),
        role=UserRole.VALIDATOR,
        validator_area_id=ga2.id,
        is_active=True,
    )
    db_session.add_all([validator1, validator2])
    db_session.commit()

    # Notify only GA1 validators
    notifications = notification_service.notify_validators_for_governance_area(
        db=db_session,
        governance_area_id=ga1.id,
        notification_type=NotificationType.READY_FOR_VALIDATION,
        title="Ready for Validation",
        message="Assessment is ready",
        assessment_id=assessment.id,
    )

    assert len(notifications) == 1
    assert notifications[0].recipient_id == validator1.id


# ====================================================================
# Notify BLGU User Tests
# ====================================================================


def test_notify_blgu_user(
    db_session: Session, blgu_user: User, assessment: Assessment
):
    """Test notifying BLGU user for an assessment"""
    notification = notification_service.notify_blgu_user(
        db=db_session,
        notification_type=NotificationType.REWORK_REQUESTED,
        title="Rework Requested",
        message="Your assessment needs corrections",
        blgu_user_id=blgu_user.id,
        assessment_id=assessment.id,
    )

    assert notification is not None
    assert notification.recipient_id == blgu_user.id
    assert notification.notification_type == NotificationType.REWORK_REQUESTED


def test_notify_blgu_user_no_blgu(db_session: Session, assessment: Assessment):
    """Test notifying non-existent BLGU user"""
    notification = notification_service.notify_blgu_user(
        db=db_session,
        notification_type=NotificationType.REWORK_REQUESTED,
        title="Rework Requested",
        message="Your assessment needs corrections",
        blgu_user_id=99999,  # Non-existent
        assessment_id=assessment.id,
    )

    # Notification is still created even with non-existent user ID
    assert notification is not None


# ====================================================================
# Notify Specific Validator Tests
# ====================================================================


def test_notify_specific_validator(
    db_session: Session,
    validator_user: User,
    assessment: Assessment,
    governance_area: GovernanceArea,
):
    """Test notifying a specific validator"""
    notification = notification_service.notify_specific_validator(
        db=db_session,
        validator_id=validator_user.id,
        notification_type=NotificationType.CALIBRATION_RESUBMITTED,
        title="Calibration Resubmitted",
        message="BLGU has resubmitted the calibration",
        assessment_id=assessment.id,
        governance_area_id=governance_area.id,
    )

    assert notification is not None
    assert notification.recipient_id == validator_user.id


def test_notify_specific_validator_creates_notification(
    db_session: Session, assessment: Assessment
):
    """Test notifying specific validator creates notification"""
    notification = notification_service.notify_specific_validator(
        db=db_session,
        notification_type=NotificationType.CALIBRATION_RESUBMITTED,
        title="Calibration Resubmitted",
        message="BLGU has resubmitted",
        validator_id=99999,  # Validator ID (service doesn't validate existence)
        assessment_id=assessment.id,
    )

    # Notification is created even with non-validated user ID
    assert notification is not None
    assert notification.notification_type == NotificationType.CALIBRATION_RESUBMITTED


# ====================================================================
# Get Notifications Tests
# ====================================================================


def test_get_user_notifications(db_session: Session, blgu_user: User):
    """Test getting user notifications with pagination"""
    # Create multiple notifications
    for i in range(5):
        notification_service.create_notification(
            db=db_session,
            recipient_id=blgu_user.id,
            notification_type=NotificationType.NEW_SUBMISSION,
            title=f"Notification {i}",
            message=f"Message {i}",
        )

    notifications, total, unread = notification_service.get_user_notifications(
        db=db_session,
        user_id=blgu_user.id,
        skip=0,
        limit=3,
    )

    assert len(notifications) == 3
    assert total == 5
    assert unread == 5


def test_get_user_notifications_unread_only(db_session: Session, blgu_user: User):
    """Test filtering notifications to unread only"""
    # Create 3 notifications
    for i in range(3):
        notification_service.create_notification(
            db=db_session,
            recipient_id=blgu_user.id,
            notification_type=NotificationType.NEW_SUBMISSION,
            title=f"Notification {i}",
            message=f"Message {i}",
        )

    # Mark one as read
    all_notifs, _, _ = notification_service.get_user_notifications(
        db=db_session, user_id=blgu_user.id
    )
    notification_service.mark_as_read(
        db=db_session,
        user_id=blgu_user.id,
        notification_ids=[all_notifs[0].id],
    )

    # Get unread only
    notifications, total, unread = notification_service.get_user_notifications(
        db=db_session,
        user_id=blgu_user.id,
        unread_only=True,
    )

    assert len(notifications) == 2
    assert unread == 2


# ====================================================================
# Mark As Read Tests
# ====================================================================


def test_mark_as_read(db_session: Session, blgu_user: User):
    """Test marking notifications as read"""
    # Create notifications
    notif1 = notification_service.create_notification(
        db=db_session,
        recipient_id=blgu_user.id,
        notification_type=NotificationType.NEW_SUBMISSION,
        title="Notification 1",
        message="Message 1",
    )
    notif2 = notification_service.create_notification(
        db=db_session,
        recipient_id=blgu_user.id,
        notification_type=NotificationType.NEW_SUBMISSION,
        title="Notification 2",
        message="Message 2",
    )

    # Mark first as read
    marked_count = notification_service.mark_as_read(
        db=db_session,
        user_id=blgu_user.id,
        notification_ids=[notif1.id],
    )

    assert marked_count == 1

    # Verify
    db_session.refresh(notif1)
    db_session.refresh(notif2)

    assert notif1.is_read is True
    assert notif1.read_at is not None
    assert notif2.is_read is False


def test_mark_as_read_wrong_user(db_session: Session, blgu_user: User):
    """Test that user can only mark their own notifications"""
    # Create notification for blgu_user
    notif = notification_service.create_notification(
        db=db_session,
        recipient_id=blgu_user.id,
        notification_type=NotificationType.NEW_SUBMISSION,
        title="Notification",
        message="Message",
    )

    # Try to mark with different user ID
    marked_count = notification_service.mark_as_read(
        db=db_session,
        user_id=99999,  # Different user
        notification_ids=[notif.id],
    )

    assert marked_count == 0


def test_mark_all_as_read(db_session: Session, blgu_user: User):
    """Test marking all notifications as read"""
    # Create notifications
    for i in range(5):
        notification_service.create_notification(
            db=db_session,
            recipient_id=blgu_user.id,
            notification_type=NotificationType.NEW_SUBMISSION,
            title=f"Notification {i}",
            message=f"Message {i}",
        )

    # Mark all as read
    marked_count = notification_service.mark_all_as_read(
        db=db_session,
        user_id=blgu_user.id,
    )

    assert marked_count == 5

    # Verify
    unread_count = notification_service.get_unread_count(db_session, blgu_user.id)
    assert unread_count == 0


# ====================================================================
# Count Tests
# ====================================================================


def test_get_unread_count(db_session: Session, blgu_user: User):
    """Test getting unread notification count"""
    # Create 3 notifications
    for i in range(3):
        notification_service.create_notification(
            db=db_session,
            recipient_id=blgu_user.id,
            notification_type=NotificationType.NEW_SUBMISSION,
            title=f"Notification {i}",
            message=f"Message {i}",
        )

    count = notification_service.get_unread_count(db_session, blgu_user.id)
    assert count == 3


def test_get_total_count(db_session: Session, blgu_user: User):
    """Test getting total notification count"""
    # Create 3 notifications
    for i in range(3):
        notification_service.create_notification(
            db=db_session,
            recipient_id=blgu_user.id,
            notification_type=NotificationType.NEW_SUBMISSION,
            title=f"Notification {i}",
            message=f"Message {i}",
        )

    # Mark one as read
    all_notifs, _, _ = notification_service.get_user_notifications(
        db=db_session, user_id=blgu_user.id
    )
    notification_service.mark_as_read(
        db=db_session,
        user_id=blgu_user.id,
        notification_ids=[all_notifs[0].id],
    )

    # Total should still be 3
    total = notification_service.get_total_count(db_session, blgu_user.id)
    assert total == 3


# ====================================================================
# Get Notification By ID Tests
# ====================================================================


def test_get_notification_by_id(db_session: Session, blgu_user: User):
    """Test getting notification by ID"""
    notif = notification_service.create_notification(
        db=db_session,
        recipient_id=blgu_user.id,
        notification_type=NotificationType.NEW_SUBMISSION,
        title="Test",
        message="Test message",
    )

    result = notification_service.get_notification_by_id(
        db=db_session,
        notification_id=notif.id,
        user_id=blgu_user.id,
    )

    assert result is not None
    assert result.id == notif.id


def test_get_notification_by_id_wrong_user(db_session: Session, blgu_user: User):
    """Test that user cannot access other user's notifications"""
    notif = notification_service.create_notification(
        db=db_session,
        recipient_id=blgu_user.id,
        notification_type=NotificationType.NEW_SUBMISSION,
        title="Test",
        message="Test message",
    )

    result = notification_service.get_notification_by_id(
        db=db_session,
        notification_id=notif.id,
        user_id=99999,  # Different user
    )

    assert result is None


def test_get_notification_by_id_not_found(db_session: Session, blgu_user: User):
    """Test getting non-existent notification"""
    result = notification_service.get_notification_by_id(
        db=db_session,
        notification_id=99999,
        user_id=blgu_user.id,
    )

    assert result is None
