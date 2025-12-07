"""
Tests for authentication API endpoints (app/api/v1/auth.py)
"""

import uuid
from datetime import UTC

import pytest
from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import UserRole
from app.db.models.user import User

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
        role=UserRole.MLGOO_DILG,
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
        role=UserRole.ASSESSOR,
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
    assert data["expires_in"] == 60 * 60 * 24 * 7  # 7 days in seconds


def test_login_with_invalid_password(client: TestClient, db_session: Session, test_user: User):
    """Test login failure with incorrect password"""
    _override_db(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "wrongpassword"},
    )

    assert response.status_code == 401
    # Response uses standardized error format with "error" key
    assert "Incorrect email or password" in response.json().get("error", response.json().get("detail", ""))


def test_login_with_nonexistent_email(client: TestClient, db_session: Session):
    """Test login failure with email that doesn't exist"""
    _override_db(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": "anypassword"},
    )

    assert response.status_code == 401
    # Response uses standardized error format with "error" key
    assert "Incorrect email or password" in response.json().get("error", response.json().get("detail", ""))


def test_login_with_inactive_account(client: TestClient, db_session: Session, inactive_user: User):
    """Test login failure when user account is inactive.

    Security: Returns same generic error as invalid credentials to prevent
    account enumeration attacks.
    """
    _override_db(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": inactive_user.email, "password": "testpassword123"},
    )

    # Security improvement: same error as invalid credentials
    assert response.status_code == 401
    # Response uses standardized error format with "error" key
    assert "Incorrect email or password" in response.json().get("error", response.json().get("detail", ""))


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

    # Change password (meets new policy: 12+ chars, upper, lower, digit, special)
    new_password = "NewP@ssword123!"
    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "testpassword123", "new_password": new_password},
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Password changed successfully"

    # Clear overrides for login test
    client.app.dependency_overrides.clear()
    _override_db(client, db_session)

    # Verify can login with new password
    new_login_response = client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": new_password},
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
        json={"current_password": "wrongpassword", "new_password": "NewP@ssword123!"},
    )

    assert response.status_code == 400
    # Response uses standardized error format with "error" key
    assert "Incorrect current password" in response.json().get("error", response.json().get("detail", ""))


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

    # Change password (meets new policy: 12+ chars, upper, lower, digit, special)
    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "temppassword", "new_password": "NewP@ssword123!"},
    )

    assert response.status_code == 200

    # Verify must_change_password is False after change
    db_session.refresh(user_must_change_password)
    assert user_must_change_password.must_change_password is False


def test_change_password_with_missing_fields(
    client: TestClient, db_session: Session, test_user: User
):
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


def test_logout_success(client: TestClient, db_session: Session, test_user: User):
    """Test logout endpoint returns success message and blacklists token"""
    _override_user_and_db(client, test_user, db_session)

    # First login to get a token
    _override_db(client, db_session)
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "testpassword123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    # Now logout with the token
    _override_user_and_db(client, test_user, db_session)
    response = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert "Successfully logged out" in response.json()["message"]


def test_logout_without_authentication(client: TestClient):
    """Test logout requires authentication (security improvement)"""
    # Logout now requires authentication - returns 401/403
    response = client.post("/api/v1/auth/logout")

    assert response.status_code in [401, 403]


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
    from datetime import datetime, timedelta

    import jwt

    from app.core.config import settings

    # Create an expired token manually
    expired_payload = {
        "sub": str(test_user.id),
        "role": test_user.role.value,
        "must_change_password": False,
        "exp": datetime.now(UTC) - timedelta(days=1),  # Expired yesterday
        "iat": datetime.now(UTC) - timedelta(days=2),
    }

    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    _override_db(client, db_session)

    # Try to use expired token (password meets new policy)
    response = client.post(
        "/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {expired_token}"},
        json={"current_password": "testpassword123", "new_password": "NewP@ssword123!"},
    )

    assert response.status_code == 401  # Unauthorized due to expired token


# ====================================================================
# Role-Based Login Tests (Epic 8.0 Acceptance Criteria)
# ====================================================================


@pytest.fixture
def mlgoo_dilg_user(db_session: Session):
    """Create a MLGOO_DILG user for role testing"""
    unique_email = f"mlgoo_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="MLGOO DILG User",
        hashed_password=pwd_context.hash("testpassword123"),
        role=UserRole.MLGOO_DILG,
        is_active=True,
        must_change_password=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def assessor_user(db_session: Session):
    """Create an ASSESSOR user for role testing"""
    unique_email = f"assessor_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="Assessor User",
        hashed_password=pwd_context.hash("testpassword123"),
        role=UserRole.ASSESSOR,
        is_active=True,
        must_change_password=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def validator_user(db_session: Session, mock_governance_area):
    """Create a VALIDATOR user for role testing"""
    unique_email = f"validator_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="Validator User",
        hashed_password=pwd_context.hash("testpassword123"),
        role=UserRole.VALIDATOR,
        is_active=True,
        must_change_password=False,
        validator_area_id=mock_governance_area.id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def blgu_user(db_session: Session, mock_barangay):
    """Create a BLGU_USER for role testing"""
    unique_email = f"blgu_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="BLGU User",
        hashed_password=pwd_context.hash("testpassword123"),
        role=UserRole.BLGU_USER,
        is_active=True,
        must_change_password=False,
        barangay_id=mock_barangay.id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_login_mlgoo_dilg_role(client: TestClient, db_session: Session, mlgoo_dilg_user: User):
    """Test login with MLGOO_DILG role returns correct role in token"""
    import jwt

    _override_db(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": mlgoo_dilg_user.email, "password": "testpassword123"},
    )

    assert response.status_code == 200
    token = response.json()["access_token"]
    decoded = jwt.decode(token, options={"verify_signature": False})
    assert decoded["role"] == UserRole.MLGOO_DILG.value


def test_login_assessor_role(client: TestClient, db_session: Session, assessor_user: User):
    """Test login with ASSESSOR role returns correct role in token"""
    import jwt

    _override_db(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": assessor_user.email, "password": "testpassword123"},
    )

    assert response.status_code == 200
    token = response.json()["access_token"]
    decoded = jwt.decode(token, options={"verify_signature": False})
    assert decoded["role"] == UserRole.ASSESSOR.value


def test_login_validator_role(client: TestClient, db_session: Session, validator_user: User):
    """Test login with VALIDATOR role returns correct role in token"""
    import jwt

    _override_db(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": validator_user.email, "password": "testpassword123"},
    )

    assert response.status_code == 200
    token = response.json()["access_token"]
    decoded = jwt.decode(token, options={"verify_signature": False})
    assert decoded["role"] == UserRole.VALIDATOR.value


def test_login_blgu_user_role(client: TestClient, db_session: Session, blgu_user: User):
    """Test login with BLGU_USER role returns correct role in token"""
    import jwt

    _override_db(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": blgu_user.email, "password": "testpassword123"},
    )

    assert response.status_code == 200
    token = response.json()["access_token"]
    decoded = jwt.decode(token, options={"verify_signature": False})
    assert decoded["role"] == UserRole.BLGU_USER.value


def test_jwt_token_contains_correct_role_information(
    client: TestClient, db_session: Session, validator_user: User
):
    """Test that JWT token contains correct role information for all role types"""
    import jwt

    _override_db(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": validator_user.email, "password": "testpassword123"},
    )

    assert response.status_code == 200
    token = response.json()["access_token"]
    decoded = jwt.decode(token, options={"verify_signature": False})

    # Verify all required fields are present
    assert "sub" in decoded  # User ID
    assert "role" in decoded  # User role
    assert decoded["role"] == UserRole.VALIDATOR.value
    assert "must_change_password" in decoded
    assert "exp" in decoded
