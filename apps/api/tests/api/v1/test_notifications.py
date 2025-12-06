"""
Tests for notification API endpoints (app/api/v1/notifications.py)
"""

import uuid

import pytest
from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import AreaType, AssessmentStatus, NotificationType, UserRole
from app.db.models.assessment import Assessment
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea
from app.db.models.notification import Notification
from app.db.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ====================================================================
# Test Fixtures
# ====================================================================


@pytest.fixture(autouse=True)
def clear_user_overrides(client):
    """Clear user-related dependency overrides after each test"""
    yield
    if deps.get_current_active_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_active_user]


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
    unique_name = f"Test Barangay {uuid.uuid4().hex[:8]}"
    brgy = Barangay(name=unique_name)
    db_session.add(brgy)
    db_session.commit()
    db_session.refresh(brgy)
    return brgy


@pytest.fixture
def test_user(db_session: Session, barangay: Barangay):
    """Create a test user for notifications"""
    unique_email = f"notif_test_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="Notification Test User",
        hashed_password=pwd_context.hash("testpassword123"),
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def other_user(db_session: Session):
    """Create another user for access control tests"""
    unique_email = f"other_user_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="Other User",
        hashed_password=pwd_context.hash("testpassword123"),
        role=UserRole.BLGU_USER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def assessment(db_session: Session, test_user: User):
    """Create an assessment for testing"""
    assessment = Assessment(
        blgu_user_id=test_user.id,
        status=AssessmentStatus.SUBMITTED,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


def _override_user_and_db(client, user: User, db_session: Session):
    """Override authentication and database dependencies for testing"""

    def _override_current_active_user():
        return user

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_active_user] = _override_current_active_user
    client.app.dependency_overrides[deps.get_db] = _override_get_db


def create_test_notification(
    db_session: Session,
    user_id: int,
    title: str = "Test Notification",
    message: str = "Test message",
    notification_type: NotificationType = NotificationType.NEW_SUBMISSION,
    assessment_id: int = None,
    governance_area_id: int = None,
    is_read: bool = False,
):
    """Helper to create test notifications"""
    notification = Notification(
        recipient_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        assessment_id=assessment_id,
        governance_area_id=governance_area_id,
        is_read=is_read,
    )
    db_session.add(notification)
    db_session.commit()
    db_session.refresh(notification)
    return notification


# ====================================================================
# GET /notifications Tests
# ====================================================================


def test_get_notifications_success(client: TestClient, db_session: Session, test_user: User):
    """Test getting user notifications"""
    _override_user_and_db(client, test_user, db_session)

    # Create notifications
    for i in range(3):
        create_test_notification(db_session, test_user.id, title=f"Notification {i}")

    response = client.get("/api/v1/notifications/")
    assert response.status_code == 200

    data = response.json()
    assert "notifications" in data
    assert "total" in data
    assert "unread_count" in data
    assert len(data["notifications"]) == 3
    assert data["total"] == 3
    assert data["unread_count"] == 3


def test_get_notifications_pagination(client: TestClient, db_session: Session, test_user: User):
    """Test notifications pagination"""
    _override_user_and_db(client, test_user, db_session)

    # Create 10 notifications
    for i in range(10):
        create_test_notification(db_session, test_user.id, title=f"Notification {i}")

    # Get first page
    response = client.get("/api/v1/notifications/?skip=0&limit=3")
    assert response.status_code == 200

    data = response.json()
    assert len(data["notifications"]) == 3
    assert data["total"] == 10


def test_get_notifications_unread_only(client: TestClient, db_session: Session, test_user: User):
    """Test filtering unread notifications"""
    _override_user_and_db(client, test_user, db_session)

    # Create mixed notifications
    create_test_notification(db_session, test_user.id, title="Read", is_read=True)
    create_test_notification(db_session, test_user.id, title="Unread 1", is_read=False)
    create_test_notification(db_session, test_user.id, title="Unread 2", is_read=False)

    response = client.get("/api/v1/notifications/?unread_only=true")
    assert response.status_code == 200

    data = response.json()
    assert len(data["notifications"]) == 2
    assert data["unread_count"] == 2


def test_get_notifications_empty(client: TestClient, db_session: Session, test_user: User):
    """Test getting notifications when none exist"""
    _override_user_and_db(client, test_user, db_session)

    response = client.get("/api/v1/notifications/")
    assert response.status_code == 200

    data = response.json()
    assert len(data["notifications"]) == 0
    assert data["total"] == 0
    assert data["unread_count"] == 0


def test_get_notifications_only_own(
    client: TestClient, db_session: Session, test_user: User, other_user: User
):
    """Test that users only see their own notifications"""
    _override_user_and_db(client, test_user, db_session)

    # Create notifications for both users
    create_test_notification(db_session, test_user.id, title="My notification")
    create_test_notification(db_session, other_user.id, title="Other notification")

    response = client.get("/api/v1/notifications/")
    assert response.status_code == 200

    data = response.json()
    assert len(data["notifications"]) == 1
    assert data["notifications"][0]["title"] == "My notification"


# ====================================================================
# GET /notifications/count Tests
# ====================================================================


def test_get_notification_count(client: TestClient, db_session: Session, test_user: User):
    """Test getting notification count"""
    _override_user_and_db(client, test_user, db_session)

    # Create notifications
    create_test_notification(db_session, test_user.id, is_read=False)
    create_test_notification(db_session, test_user.id, is_read=False)
    create_test_notification(db_session, test_user.id, is_read=True)

    response = client.get("/api/v1/notifications/count")
    assert response.status_code == 200

    data = response.json()
    assert data["unread_count"] == 2
    assert data["total"] == 3


def test_get_notification_count_empty(client: TestClient, db_session: Session, test_user: User):
    """Test getting notification count when none exist"""
    _override_user_and_db(client, test_user, db_session)

    response = client.get("/api/v1/notifications/count")
    assert response.status_code == 200

    data = response.json()
    assert data["unread_count"] == 0
    assert data["total"] == 0


# ====================================================================
# POST /notifications/mark-read Tests
# ====================================================================


def test_mark_notifications_read(client: TestClient, db_session: Session, test_user: User):
    """Test marking specific notifications as read"""
    _override_user_and_db(client, test_user, db_session)

    # Create notifications
    notif1 = create_test_notification(db_session, test_user.id, title="Notif 1")
    notif2 = create_test_notification(db_session, test_user.id, title="Notif 2")
    notif3 = create_test_notification(db_session, test_user.id, title="Notif 3")

    # Mark first two as read
    response = client.post(
        "/api/v1/notifications/mark-read",
        json={"notification_ids": [notif1.id, notif2.id]},
    )
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["marked_count"] == 2

    # Verify
    db_session.refresh(notif1)
    db_session.refresh(notif2)
    db_session.refresh(notif3)

    assert notif1.is_read is True
    assert notif2.is_read is True
    assert notif3.is_read is False


def test_mark_notifications_read_already_read(
    client: TestClient, db_session: Session, test_user: User
):
    """Test marking already read notifications (idempotent)"""
    _override_user_and_db(client, test_user, db_session)

    notif = create_test_notification(db_session, test_user.id, is_read=True)

    response = client.post(
        "/api/v1/notifications/mark-read",
        json={"notification_ids": [notif.id]},
    )
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["marked_count"] == 0  # Already read


def test_mark_notifications_read_other_user(
    client: TestClient, db_session: Session, test_user: User, other_user: User
):
    """Test that users cannot mark other users' notifications"""
    _override_user_and_db(client, test_user, db_session)

    # Create notification for other user
    notif = create_test_notification(db_session, other_user.id)

    response = client.post(
        "/api/v1/notifications/mark-read",
        json={"notification_ids": [notif.id]},
    )
    assert response.status_code == 200

    data = response.json()
    assert data["marked_count"] == 0  # Not marked (not owned)

    # Verify not marked
    db_session.refresh(notif)
    assert notif.is_read is False


# ====================================================================
# POST /notifications/mark-all-read Tests
# ====================================================================


def test_mark_all_notifications_read(client: TestClient, db_session: Session, test_user: User):
    """Test marking all notifications as read"""
    _override_user_and_db(client, test_user, db_session)

    # Create notifications
    for i in range(5):
        create_test_notification(db_session, test_user.id, title=f"Notif {i}")

    response = client.post("/api/v1/notifications/mark-all-read")
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["marked_count"] == 5

    # Verify all are read
    count_response = client.get("/api/v1/notifications/count")
    assert count_response.json()["unread_count"] == 0


def test_mark_all_notifications_read_empty(
    client: TestClient, db_session: Session, test_user: User
):
    """Test marking all when none exist"""
    _override_user_and_db(client, test_user, db_session)

    response = client.post("/api/v1/notifications/mark-all-read")
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["marked_count"] == 0


def test_mark_all_only_affects_own(
    client: TestClient, db_session: Session, test_user: User, other_user: User
):
    """Test that mark all only affects user's own notifications"""
    _override_user_and_db(client, test_user, db_session)

    # Create notifications for both users
    create_test_notification(db_session, test_user.id, title="My notif")
    other_notif = create_test_notification(db_session, other_user.id, title="Other notif")

    response = client.post("/api/v1/notifications/mark-all-read")
    assert response.status_code == 200

    data = response.json()
    assert data["marked_count"] == 1

    # Verify other user's notification is still unread
    db_session.refresh(other_notif)
    assert other_notif.is_read is False


# ====================================================================
# GET /notifications/{notification_id} Tests
# ====================================================================


def test_get_notification_by_id(
    client: TestClient, db_session: Session, test_user: User, assessment: Assessment
):
    """Test getting a single notification by ID"""
    _override_user_and_db(client, test_user, db_session)

    notif = create_test_notification(
        db_session,
        test_user.id,
        title="Test Notification",
        message="Test message",
        assessment_id=assessment.id,
    )

    response = client.get(f"/api/v1/notifications/{notif.id}")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == notif.id
    assert data["title"] == "Test Notification"
    assert data["message"] == "Test message"


def test_get_notification_by_id_not_found(client: TestClient, db_session: Session, test_user: User):
    """Test getting non-existent notification"""
    _override_user_and_db(client, test_user, db_session)

    response = client.get("/api/v1/notifications/99999")
    assert response.status_code == 404


def test_get_notification_by_id_other_user(
    client: TestClient, db_session: Session, test_user: User, other_user: User
):
    """Test that users cannot access other users' notifications"""
    _override_user_and_db(client, test_user, db_session)

    # Create notification for other user
    notif = create_test_notification(db_session, other_user.id)

    response = client.get(f"/api/v1/notifications/{notif.id}")
    assert response.status_code == 404  # Not found (access denied)


def test_get_notification_with_enriched_data(
    client: TestClient,
    db_session: Session,
    test_user: User,
    assessment: Assessment,
    governance_area: GovernanceArea,
):
    """Test that notification includes enriched data"""
    _override_user_and_db(client, test_user, db_session)

    notif = create_test_notification(
        db_session,
        test_user.id,
        assessment_id=assessment.id,
        governance_area_id=governance_area.id,
    )

    response = client.get(f"/api/v1/notifications/{notif.id}")
    assert response.status_code == 200

    data = response.json()
    assert data["governance_area_name"] == "Financial Administration"


# ====================================================================
# Authentication Tests
# ====================================================================


def test_get_notifications_unauthenticated(client: TestClient):
    """Test that unauthenticated users cannot access notifications"""
    # Clear any overrides
    client.app.dependency_overrides.clear()

    response = client.get("/api/v1/notifications/")
    assert response.status_code == 401


def test_get_notification_count_unauthenticated(client: TestClient):
    """Test that unauthenticated users cannot access count"""
    client.app.dependency_overrides.clear()

    response = client.get("/api/v1/notifications/count")
    assert response.status_code == 401


def test_mark_read_unauthenticated(client: TestClient):
    """Test that unauthenticated users cannot mark as read"""
    client.app.dependency_overrides.clear()

    response = client.post(
        "/api/v1/notifications/mark-read",
        json={"notification_ids": [1]},
    )
    assert response.status_code == 401
