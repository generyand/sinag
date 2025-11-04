"""
Tests for authentication API endpoints (app/api/v1/auth.py)
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.db.models.user import User
from app.db.enums import UserRole
from app.api import deps


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@pytest.fixture(autouse=True)
def clear_user_overrides(client):
    """Clear user-related dependency overrides after each test, preserving DB override"""
    yield
    # After test, clear only user-related overrides, keep DB override
    if deps.get_current_active_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_active_user]
    if deps.get_current_admin_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_admin_user]


@pytest.fixture
def test_user(db_session: Session):
    """Create a test user for authentication tests"""
    unique_email = f"auth_test_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="Auth Test User",
        hashed_password=pwd_context.hash("testpassword123"),
        role=UserRole.SUPERADMIN,
        is_active=True,
        must_change_password=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def inactive_user(db_session: Session):
    """Create an inactive user for testing"""
    unique_email = f"inactive_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="Inactive User",
        hashed_password=pwd_context.hash("testpassword123"),
        role=UserRole.BLGU_USER,
        is_active=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def user_must_change_password(db_session: Session):
    """Create a user who must change password"""
    unique_email = f"mustchange_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="Must Change Password User",
        hashed_password=pwd_context.hash("temppassword"),
        role=UserRole.AREA_ASSESSOR,
        is_active=True,
        must_change_password=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


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


def _override_db(client, db_session: Session):
    """Override database dependency for testing"""
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_db] = _override_get_db


# ====================================================================
# Login Endpoint Tests
# ====================================================================


def test_login_with_valid_credentials(client: TestClient, db_session: Session, test_user: User):
    """Test successful login with valid email and password"""
    _override_db(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "testpassword123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "expires_in" in data
    assert data["expires_in"] == 60 * 24 * 8 * 60  # 8 days in seconds


def test_login_with_invalid_password(client: TestClient, db_session: Session, test_user: User):
    """Test login failure with incorrect password"""
    _override_db(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "wrongpassword"},
    )

    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_with_nonexistent_email(client: TestClient, db_session: Session):
    """Test login failure with email that doesn't exist"""
    _override_db(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": "anypassword"},
    )

    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_with_inactive_account(client: TestClient, db_session: Session, inactive_user: User):
    """Test login failure when user account is inactive"""
    _override_db(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": inactive_user.email, "password": "testpassword123"},
    )

    assert response.status_code == 400
    assert "Inactive user account" in response.json()["detail"]


def test_login_with_missing_fields(client: TestClient):
    """Test login failure when required fields are missing"""
    # Missing password
    response = client.post("/api/v1/auth/login", json={"email": "test@example.com"})
    assert response.status_code == 422  # Validation error

    # Missing email
    response = client.post("/api/v1/auth/login", json={"password": "password123"})
    assert response.status_code == 422  # Validation error

    # Empty body
    response = client.post("/api/v1/auth/login", json={})
    assert response.status_code == 422  # Validation error


def test_login_with_must_change_password_flag(
    client: TestClient, db_session: Session, user_must_change_password: User
):
    """Test that login succeeds even when must_change_password is True"""
    _override_db(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": user_must_change_password.email, "password": "temppassword"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    # The token should contain must_change_password flag for frontend to handle


# ====================================================================
# Change Password Endpoint Tests
# ====================================================================


def test_change_password_success(client: TestClient, db_session: Session, test_user: User):
    """Test successful password change"""
    _override_user_and_db(client, test_user, db_session)

    # Change password
    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "testpassword123", "new_password": "newpassword456"},
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Password changed successfully"

    # Clear overrides for login test
    client.app.dependency_overrides.clear()
    _override_db(client, db_session)

    # Verify can login with new password
    new_login_response = client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "newpassword456"},
    )
    assert new_login_response.status_code == 200

    # Verify old password no longer works
    old_login_response = client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "testpassword123"},
    )
    assert old_login_response.status_code == 401


def test_change_password_with_incorrect_current_password(
    client: TestClient, db_session: Session, test_user: User
):
    """Test password change failure with wrong current password"""
    _override_user_and_db(client, test_user, db_session)

    # Attempt to change password with wrong current password
    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "wrongpassword", "new_password": "newpassword456"},
    )

    assert response.status_code == 400
    assert "Incorrect current password" in response.json()["detail"]


def test_change_password_unauthorized_without_token(client: TestClient):
    """Test password change requires authentication"""
    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "oldpass", "new_password": "newpass"},
    )

    # Expect 401 or 403 depending on setup (matching analytics test pattern)
    assert response.status_code in [401, 403]


def test_change_password_resets_must_change_password_flag(
    client: TestClient, user_must_change_password: User, db_session: Session
):
    """Test that changing password sets must_change_password to False"""
    # Verify must_change_password is True before change
    assert user_must_change_password.must_change_password is True

    _override_user_and_db(client, user_must_change_password, db_session)

    # Change password
    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "temppassword", "new_password": "newpassword123"},
    )

    assert response.status_code == 200

    # Verify must_change_password is False after change
    db_session.refresh(user_must_change_password)
    assert user_must_change_password.must_change_password is False


def test_change_password_with_missing_fields(client: TestClient, db_session: Session, test_user: User):
    """Test password change validation errors"""
    _override_user_and_db(client, test_user, db_session)

    # Missing current_password
    response = client.post(
        "/api/v1/auth/change-password",
        json={"new_password": "newpass123"},
    )
    assert response.status_code == 422  # Validation error

    # Missing new_password
    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "testpassword123"},
    )
    assert response.status_code == 422  # Validation error


# ====================================================================
# Logout Endpoint Tests
# ====================================================================


def test_logout_success(client: TestClient):
    """Test logout endpoint returns success message"""
    # Note: Current implementation is a placeholder
    response = client.post("/api/v1/auth/logout")

    assert response.status_code == 200
    assert "Successfully logged out" in response.json()["message"]


def test_logout_without_authentication(client: TestClient):
    """Test logout works even without authentication (placeholder behavior)"""
    # Current implementation doesn't require authentication
    response = client.post("/api/v1/auth/logout")

    assert response.status_code == 200


# ====================================================================
# Token Validation Tests
# ====================================================================


def test_token_contains_user_information(client: TestClient, db_session: Session, test_user: User):
    """Test that JWT token contains necessary user information"""
    import jwt

    _override_db(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "testpassword123"},
    )

    assert response.status_code == 200
    token = response.json()["access_token"]

    # Decode token (without verification for testing purposes)
    decoded = jwt.decode(token, options={"verify_signature": False})

    assert "sub" in decoded  # User ID
    assert "role" in decoded  # User role
    assert "must_change_password" in decoded  # Password change flag
    assert "exp" in decoded  # Expiration time


def test_expired_token_rejected(client: TestClient, db_session: Session, test_user: User):
    """Test that expired tokens are rejected"""
    import jwt
    from datetime import datetime, timedelta
    from app.core.config import settings

    # Create an expired token manually
    expired_payload = {
        "sub": str(test_user.id),
        "role": test_user.role.value,
        "must_change_password": False,
        "exp": datetime.utcnow() - timedelta(days=1),  # Expired yesterday
    }

    expired_token = jwt.encode(
        expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )

    _override_db(client, db_session)

    # Try to use expired token
    response = client.post(
        "/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {expired_token}"},
        json={"current_password": "testpassword123", "new_password": "newpass"},
    )

    assert response.status_code == 401  # Unauthorized due to expired token
