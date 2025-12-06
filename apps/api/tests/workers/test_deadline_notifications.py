"""
Tests for deadline extension notification worker (app/workers/notifications.py)

This test suite covers the send_deadline_extension_notification Celery task.
"""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.enums import UserRole
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from app.workers.notifications import send_deadline_extension_notification

# ====================================================================
# Test Fixtures
# ====================================================================


@pytest.fixture
def sample_barangay(db_session: Session):
    """Create a sample barangay for testing"""
    barangay = Barangay(name="Test Barangay Notification")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)
    return barangay


@pytest.fixture
def sample_governance_area(db_session: Session):
    """Create a sample governance area for testing"""
    from app.db.enums import AreaType

    area = GovernanceArea(
        name="Test Area Notification",
        area_type=AreaType.CORE,
    )
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    return area


@pytest.fixture
def sample_indicator(db_session: Session, sample_governance_area):
    """Create a sample indicator for testing"""
    indicator = Indicator(
        name="Test Indicator Notification",
        description="Test indicator",
        governance_area_id=sample_governance_area.id,
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)
    return indicator


@pytest.fixture
def sample_indicator_2(db_session: Session, sample_governance_area):
    """Create a second sample indicator for testing"""
    indicator = Indicator(
        name="Test Indicator Notification 2",
        description="Second test indicator",
        governance_area_id=sample_governance_area.id,
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)
    return indicator


@pytest.fixture
def admin_user(db_session: Session):
    """Create an admin user for testing"""
    user = User(
        email="admin_notif@test.com",
        name="Test Admin Notification",
        hashed_password=get_password_hash("adminpass123"),
        role=UserRole.MLGOO_DILG,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def blgu_user(db_session: Session, sample_barangay):
    """Create a BLGU user for testing"""
    user = User(
        email="blgu_notif@test.com",
        name="Test BLGU User Notification",
        hashed_password=get_password_hash("blgupass123"),
        role=UserRole.BLGU_USER,
        barangay_id=sample_barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def blgu_user_2(db_session: Session, sample_barangay):
    """Create a second BLGU user for testing"""
    user = User(
        email="blgu_notif2@test.com",
        name="Test BLGU User 2 Notification",
        hashed_password=get_password_hash("blgupass123"),
        role=UserRole.BLGU_USER,
        barangay_id=sample_barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# ====================================================================
# Notification Task Tests
# ====================================================================


def test_send_deadline_extension_notification_success(
    db_session: Session,
    sample_barangay,
    sample_indicator,
    admin_user,
    blgu_user,
):
    """Test successful deadline extension notification"""
    new_deadline = (datetime.now(UTC) + timedelta(days=30)).isoformat()

    result = send_deadline_extension_notification(
        barangay_id=sample_barangay.id,
        indicator_ids=[sample_indicator.id],
        new_deadline=new_deadline,
        reason="Extension requested due to natural disaster",
        created_by_user_id=admin_user.id,
        db=db_session,
    )

    assert result["success"] is True
    assert "sent successfully" in result["message"]
    assert result["notification_details"]["barangay_id"] == sample_barangay.id
    assert result["notification_details"]["barangay_name"] == sample_barangay.name
    assert result["notification_details"]["indicator_count"] == 1
    assert sample_indicator.name in result["notification_details"]["indicator_names"]
    assert result["notification_details"]["reason"] == "Extension requested due to natural disaster"
    assert result["notification_details"]["granted_by"] == admin_user.name
    assert len(result["notification_details"]["blgu_users_notified"]) == 1
    assert result["notification_details"]["blgu_users_notified"][0]["email"] == blgu_user.email


def test_send_deadline_extension_notification_multiple_indicators(
    db_session: Session,
    sample_barangay,
    sample_indicator,
    sample_indicator_2,
    admin_user,
    blgu_user,
):
    """Test notification with multiple indicators"""
    new_deadline = (datetime.now(UTC) + timedelta(days=30)).isoformat()

    result = send_deadline_extension_notification(
        barangay_id=sample_barangay.id,
        indicator_ids=[sample_indicator.id, sample_indicator_2.id],
        new_deadline=new_deadline,
        reason="Multiple indicators extended",
        created_by_user_id=admin_user.id,
        db=db_session,
    )

    assert result["success"] is True
    assert result["notification_details"]["indicator_count"] == 2
    assert sample_indicator.name in result["notification_details"]["indicator_names"]
    assert sample_indicator_2.name in result["notification_details"]["indicator_names"]


def test_send_deadline_extension_notification_multiple_blgu_users(
    db_session: Session,
    sample_barangay,
    sample_indicator,
    admin_user,
    blgu_user,
    blgu_user_2,
):
    """Test notification to multiple BLGU users"""
    new_deadline = (datetime.now(UTC) + timedelta(days=30)).isoformat()

    result = send_deadline_extension_notification(
        barangay_id=sample_barangay.id,
        indicator_ids=[sample_indicator.id],
        new_deadline=new_deadline,
        reason="Test multiple users",
        created_by_user_id=admin_user.id,
        db=db_session,
    )

    assert result["success"] is True
    assert len(result["notification_details"]["blgu_users_notified"]) == 2
    user_emails = [u["email"] for u in result["notification_details"]["blgu_users_notified"]]
    assert blgu_user.email in user_emails
    assert blgu_user_2.email in user_emails


def test_send_deadline_extension_notification_barangay_not_found(
    db_session: Session,
    sample_indicator,
    admin_user,
):
    """Test notification with non-existent barangay"""
    new_deadline = (datetime.now(UTC) + timedelta(days=30)).isoformat()

    result = send_deadline_extension_notification(
        barangay_id=99999,
        indicator_ids=[sample_indicator.id],
        new_deadline=new_deadline,
        reason="Test",
        created_by_user_id=admin_user.id,
        db=db_session,
    )

    assert result["success"] is False
    assert "Barangay" in result["error"]
    assert "not found" in result["error"]


def test_send_deadline_extension_notification_indicators_not_found(
    db_session: Session,
    sample_barangay,
    admin_user,
    blgu_user,
):
    """Test notification with non-existent indicators"""
    new_deadline = (datetime.now(UTC) + timedelta(days=30)).isoformat()

    result = send_deadline_extension_notification(
        barangay_id=sample_barangay.id,
        indicator_ids=[99999, 99998],
        new_deadline=new_deadline,
        reason="Test",
        created_by_user_id=admin_user.id,
        db=db_session,
    )

    assert result["success"] is False
    assert "Indicators not found" in result["error"]


def test_send_deadline_extension_notification_no_blgu_users(
    db_session: Session,
    sample_barangay,
    sample_indicator,
    admin_user,
):
    """Test notification when no BLGU users exist for barangay"""
    new_deadline = (datetime.now(UTC) + timedelta(days=30)).isoformat()

    result = send_deadline_extension_notification(
        barangay_id=sample_barangay.id,
        indicator_ids=[sample_indicator.id],
        new_deadline=new_deadline,
        reason="Test no users",
        created_by_user_id=admin_user.id,
        db=db_session,
    )

    assert result["success"] is True
    assert "No BLGU users to notify" in result["message"]
    assert result["barangay"] == sample_barangay.name


def test_send_deadline_extension_notification_admin_user_not_found(
    db_session: Session,
    sample_barangay,
    sample_indicator,
    blgu_user,
):
    """Test notification when admin user not found (should use default)"""
    new_deadline = (datetime.now(UTC) + timedelta(days=30)).isoformat()

    result = send_deadline_extension_notification(
        barangay_id=sample_barangay.id,
        indicator_ids=[sample_indicator.id],
        new_deadline=new_deadline,
        reason="Test",
        created_by_user_id=99999,  # Non-existent admin
        db=db_session,
    )

    assert result["success"] is True
    assert result["notification_details"]["granted_by"] == "System Administrator"


def test_send_deadline_extension_notification_formats_deadline_correctly(
    db_session: Session,
    sample_barangay,
    sample_indicator,
    admin_user,
    blgu_user,
):
    """Test that deadline is formatted correctly for display"""
    new_deadline = datetime(2025, 12, 31, 23, 59, 59).isoformat()

    result = send_deadline_extension_notification(
        barangay_id=sample_barangay.id,
        indicator_ids=[sample_indicator.id],
        new_deadline=new_deadline,
        reason="Test formatting",
        created_by_user_id=admin_user.id,
        db=db_session,
    )

    assert result["success"] is True
    formatted = result["notification_details"]["new_deadline"]
    # Should be in format like "December 31, 2025 at 11:59 PM"
    assert "December" in formatted or "2025" in formatted
    assert result["notification_details"]["new_deadline"] is not None


def test_send_deadline_extension_notification_includes_message(
    db_session: Session,
    sample_barangay,
    sample_indicator,
    admin_user,
    blgu_user,
):
    """Test that notification includes a formatted message"""
    new_deadline = (datetime.now(UTC) + timedelta(days=30)).isoformat()

    result = send_deadline_extension_notification(
        barangay_id=sample_barangay.id,
        indicator_ids=[sample_indicator.id],
        new_deadline=new_deadline,
        reason="Testing message",
        created_by_user_id=admin_user.id,
        db=db_session,
    )

    assert result["success"] is True
    message = result["notification_details"]["message"]
    assert "Good news!" in message
    assert sample_barangay.name in message
    assert "extended" in message.lower()
    assert "Testing message" in message


def test_send_deadline_extension_notification_handles_timezone_aware_deadlines(
    db_session: Session,
    sample_barangay,
    sample_indicator,
    admin_user,
    blgu_user,
):
    """Test that notification handles timezone-aware datetime strings"""
    # Test with timezone-aware datetime (isoformat already includes timezone info)
    new_deadline_utc = (datetime.now(UTC) + timedelta(days=30)).isoformat()

    result = send_deadline_extension_notification(
        barangay_id=sample_barangay.id,
        indicator_ids=[sample_indicator.id],
        new_deadline=new_deadline_utc,
        reason="Test timezone",
        created_by_user_id=admin_user.id,
        db=db_session,
    )

    assert result["success"] is True
    assert result["notification_details"]["new_deadline"] is not None


def test_send_deadline_extension_notification_only_active_blgu_users(
    db_session: Session,
    sample_barangay,
    sample_indicator,
    admin_user,
    blgu_user,
):
    """Test that only active BLGU users receive notifications"""
    # Create an inactive BLGU user
    inactive_user = User(
        email="inactive_blgu@test.com",
        name="Inactive BLGU User",
        hashed_password=get_password_hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=sample_barangay.id,
        is_active=False,  # Inactive
    )
    db_session.add(inactive_user)
    db_session.commit()

    new_deadline = (datetime.now(UTC) + timedelta(days=30)).isoformat()

    result = send_deadline_extension_notification(
        barangay_id=sample_barangay.id,
        indicator_ids=[sample_indicator.id],
        new_deadline=new_deadline,
        reason="Test active users only",
        created_by_user_id=admin_user.id,
        db=db_session,
    )

    assert result["success"] is True
    # Should only have the active user
    assert len(result["notification_details"]["blgu_users_notified"]) == 1
    assert result["notification_details"]["blgu_users_notified"][0]["email"] == blgu_user.email
