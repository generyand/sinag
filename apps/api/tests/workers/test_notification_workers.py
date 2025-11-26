"""
Tests for notification Celery workers (app/workers/notifications.py)
"""

import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session

from app.db.models.user import User
from app.db.models.notification import Notification
from app.db.models.assessment import Assessment
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea
from app.db.enums import UserRole, NotificationType, AssessmentStatus, AreaType
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
# send_new_submission_notification Tests
# ====================================================================


def test_send_new_submission_notification_success(
    db_session: Session, assessment: Assessment, assessor_user: User, barangay: Barangay
):
    """Test successful new submission notification"""
    from app.workers.notifications import send_new_submission_notification

    # Save IDs before patching (to avoid DetachedInstanceError)
    assessment_id = assessment.id
    barangay_name = barangay.name

    # Patch SessionLocal to return our test session
    with patch("app.workers.notifications.SessionLocal", return_value=db_session):
        result = send_new_submission_notification(assessment_id)

    assert result["success"] is True
    assert result["assessment_id"] == assessment_id
    assert result["barangay_name"] == barangay_name
    assert result["notifications_created"] >= 1

    # Verify notification was created
    notifications = (
        db_session.query(Notification)
        .filter(
            Notification.assessment_id == assessment_id,
            Notification.notification_type == NotificationType.NEW_SUBMISSION,
        )
        .all()
    )
    assert len(notifications) >= 1


def test_send_new_submission_notification_assessment_not_found(db_session: Session):
    """Test notification when assessment doesn't exist"""
    from app.workers.notifications import send_new_submission_notification

    with patch("app.workers.notifications.SessionLocal", return_value=db_session):
        result = send_new_submission_notification(99999)

    assert result["success"] is False
    assert "not found" in result["error"].lower()


def test_send_new_submission_notification_no_assessors(
    db_session: Session, assessment: Assessment, barangay: Barangay
):
    """Test notification when no assessors exist"""
    from app.workers.notifications import send_new_submission_notification

    assessment_id = assessment.id

    with patch("app.workers.notifications.SessionLocal", return_value=db_session):
        result = send_new_submission_notification(assessment_id)

    # Should succeed but with 0 notifications
    assert result["success"] is True
    assert result["notifications_created"] == 0


# ====================================================================
# send_rework_notification Tests
# ====================================================================


def test_send_rework_notification_success(
    db_session: Session, assessment: Assessment, blgu_user: User, barangay: Barangay
):
    """Test successful rework notification"""
    from app.workers.notifications import send_rework_notification

    assessment_id = assessment.id
    blgu_user_id = blgu_user.id

    with patch("app.workers.notifications.SessionLocal", return_value=db_session):
        result = send_rework_notification(assessment_id)

    assert result["success"] is True
    assert result["assessment_id"] == assessment_id

    # Verify notification was created for BLGU user
    notification = (
        db_session.query(Notification)
        .filter(
            Notification.recipient_id == blgu_user_id,
            Notification.notification_type == NotificationType.REWORK_REQUESTED,
        )
        .first()
    )
    assert notification is not None


def test_send_rework_notification_assessment_not_found(db_session: Session):
    """Test rework notification when assessment doesn't exist"""
    from app.workers.notifications import send_rework_notification

    with patch("app.workers.notifications.SessionLocal", return_value=db_session):
        result = send_rework_notification(99999)

    assert result["success"] is False


# ====================================================================
# send_rework_resubmission_notification Tests
# ====================================================================


def test_send_rework_resubmission_notification_success(
    db_session: Session, assessment: Assessment, assessor_user: User, barangay: Barangay
):
    """Test successful rework resubmission notification"""
    from app.workers.notifications import send_rework_resubmission_notification

    assessment_id = assessment.id

    with patch("app.workers.notifications.SessionLocal", return_value=db_session):
        result = send_rework_resubmission_notification(assessment_id)

    assert result["success"] is True
    assert result["assessment_id"] == assessment_id

    # Verify notification was created for assessors
    notifications = (
        db_session.query(Notification)
        .filter(
            Notification.assessment_id == assessment_id,
            Notification.notification_type == NotificationType.REWORK_RESUBMITTED,
        )
        .all()
    )
    assert len(notifications) >= 1


def test_send_rework_resubmission_notification_assessment_not_found(db_session: Session):
    """Test resubmission notification when assessment doesn't exist"""
    from app.workers.notifications import send_rework_resubmission_notification

    with patch("app.workers.notifications.SessionLocal", return_value=db_session):
        result = send_rework_resubmission_notification(99999)

    assert result["success"] is False


# ====================================================================
# send_ready_for_validation_notification Tests
# ====================================================================


def test_send_ready_for_validation_notification_success(
    db_session: Session,
    assessment: Assessment,
    validator_user: User,
    governance_area: GovernanceArea,
    barangay: Barangay,
):
    """Test successful ready for validation notification"""
    from app.workers.notifications import send_ready_for_validation_notification

    assessment_id = assessment.id
    governance_area_id = governance_area.id
    validator_user_id = validator_user.id

    with patch("app.workers.notifications.SessionLocal", return_value=db_session):
        result = send_ready_for_validation_notification(
            assessment_id, governance_area_id
        )

    assert result["success"] is True
    assert result["assessment_id"] == assessment_id
    assert result["governance_area_id"] == governance_area_id

    # Verify notification was created for validator
    notification = (
        db_session.query(Notification)
        .filter(
            Notification.recipient_id == validator_user_id,
            Notification.notification_type == NotificationType.READY_FOR_VALIDATION,
        )
        .first()
    )
    assert notification is not None


def test_send_ready_for_validation_notification_no_validators(
    db_session: Session, assessment: Assessment, governance_area: GovernanceArea
):
    """Test notification when no validators for the area"""
    from app.workers.notifications import send_ready_for_validation_notification

    assessment_id = assessment.id
    governance_area_id = governance_area.id

    with patch("app.workers.notifications.SessionLocal", return_value=db_session):
        result = send_ready_for_validation_notification(
            assessment_id, governance_area_id
        )

    # Should succeed but with 0 notifications
    assert result["success"] is True
    assert result["notifications_created"] == 0


# ====================================================================
# send_calibration_notification Tests
# ====================================================================


def test_send_calibration_notification_success(
    db_session: Session,
    assessment: Assessment,
    blgu_user: User,
    governance_area: GovernanceArea,
    barangay: Barangay,
):
    """Test successful calibration notification"""
    from app.workers.notifications import send_calibration_notification

    assessment_id = assessment.id
    blgu_user_id = blgu_user.id

    with patch("app.workers.notifications.SessionLocal", return_value=db_session):
        result = send_calibration_notification(assessment_id)

    assert result["success"] is True
    assert result["assessment_id"] == assessment_id

    # Verify notification was created for BLGU user
    notification = (
        db_session.query(Notification)
        .filter(
            Notification.recipient_id == blgu_user_id,
            Notification.notification_type == NotificationType.CALIBRATION_REQUESTED,
        )
        .first()
    )
    assert notification is not None


def test_send_calibration_notification_assessment_not_found(db_session: Session):
    """Test calibration notification when assessment doesn't exist"""
    from app.workers.notifications import send_calibration_notification

    with patch("app.workers.notifications.SessionLocal", return_value=db_session):
        result = send_calibration_notification(99999)

    assert result["success"] is False


# ====================================================================
# send_calibration_resubmission_notification Tests
# ====================================================================


def test_send_calibration_resubmission_notification_success(
    db_session: Session,
    assessment: Assessment,
    validator_user: User,
    governance_area: GovernanceArea,
    barangay: Barangay,
):
    """Test successful calibration resubmission notification"""
    from app.workers.notifications import send_calibration_resubmission_notification

    # Update assessment to have calibration tracking
    assessment.is_calibration_rework = True
    assessment.calibration_validator_id = validator_user.id
    db_session.commit()

    assessment_id = assessment.id
    validator_user_id = validator_user.id

    with patch("app.workers.notifications.SessionLocal", return_value=db_session):
        result = send_calibration_resubmission_notification(
            assessment_id, validator_user_id
        )

    assert result["success"] is True
    assert result["assessment_id"] == assessment_id

    # Verify notification was created for validator
    notification = (
        db_session.query(Notification)
        .filter(
            Notification.recipient_id == validator_user_id,
            Notification.notification_type == NotificationType.CALIBRATION_RESUBMITTED,
        )
        .first()
    )
    assert notification is not None


def test_send_calibration_resubmission_notification_validator_not_found(
    db_session: Session, assessment: Assessment
):
    """Test resubmission notification when validator doesn't exist"""
    from app.workers.notifications import send_calibration_resubmission_notification

    assessment_id = assessment.id

    with patch("app.workers.notifications.SessionLocal", return_value=db_session):
        result = send_calibration_resubmission_notification(assessment_id, 99999)

    assert result["success"] is False


def test_send_calibration_resubmission_notification_assessment_not_found(
    db_session: Session, validator_user: User
):
    """Test resubmission notification when assessment doesn't exist"""
    from app.workers.notifications import send_calibration_resubmission_notification

    validator_user_id = validator_user.id

    with patch("app.workers.notifications.SessionLocal", return_value=db_session):
        result = send_calibration_resubmission_notification(99999, validator_user_id)

    assert result["success"] is False


# ====================================================================
# Error Handling Tests
# ====================================================================


def test_worker_handles_database_error(db_session: Session, assessment: Assessment):
    """Test that workers handle database errors gracefully"""
    from app.workers.notifications import send_new_submission_notification

    # Mock a database error
    with patch("app.workers.notifications.SessionLocal") as mock_session:
        mock_db = MagicMock()
        mock_db.query.side_effect = Exception("Database connection error")
        mock_session.return_value = mock_db

        result = send_new_submission_notification(assessment.id)

    assert result["success"] is False
    assert "error" in result
