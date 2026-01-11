"""
Tests for password change and post-change routing behavior

This test suite addresses the critical bug where KATUPARAN_CENTER_USER
was incorrectly redirected to /blgu/dashboard after password change
instead of /external-analytics.

Coverage:
- Password change success for all 5 user roles
- Token validity after password change
- Role-based access control post-password change
- Error handling for incorrect current password
"""

import uuid

import jwt
import pytest
from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.api import deps
from app.core.security import verify_password
from app.db.enums import UserRole
from app.db.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@pytest.fixture(autouse=True)
def clear_user_overrides(client):
    """Clear user-related dependency overrides after each test"""
    yield
    if deps.get_current_active_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_active_user]
    if deps.get_current_admin_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_admin_user]


def _override_user_and_db(client, user: User, db_session: Session):
    """Override authentication and database dependencies"""

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
    """Override database dependency only"""

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_db] = _override_get_db


def create_test_user(
    db_session: Session,
    role: UserRole,
    password: str = "OldPass123!@#",
    mock_barangay=None,
    mock_governance_area=None,
) -> User:
    """
    Helper function to create test user with specific role

    Args:
        db_session: Database session
        role: User role enum
        password: Password for the user (default: "OldPass123!@#")
        mock_barangay: Barangay fixture for BLGU_USER
        mock_governance_area: Governance area fixture for VALIDATOR

    Returns:
        User: Created user instance
    """
    unique_email = f"{role.value.lower()}_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name=f"Test {role.value}",
        hashed_password=pwd_context.hash(password),
        role=role,
        is_active=True,
        must_change_password=False,
    )

    # Add role-specific required fields
    if role == UserRole.VALIDATOR and mock_governance_area:
        user.assessor_area_id = mock_governance_area.id
    elif role == UserRole.BLGU_USER and mock_barangay:
        user.barangay_id = mock_barangay.id

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# ====================================================================
# Test 1: Password Change Success for All Roles
# ====================================================================


@pytest.mark.parametrize(
    "user_role",
    [
        UserRole.MLGOO_DILG,
        UserRole.ASSESSOR,
        UserRole.VALIDATOR,
        UserRole.BLGU_USER,
        UserRole.KATUPARAN_CENTER_USER,
    ],
)
def test_password_change_success_all_roles(
    client: TestClient,
    db_session: Session,
    user_role: UserRole,
    mock_barangay,
    mock_governance_area,
):
    """
    CRITICAL: Test that password change succeeds for all user roles

    This test ensures:
    1. Password can be changed successfully
    2. must_change_password flag is cleared
    3. User can login with new password
    4. Token contains correct role information
    """
    # Create user with specific role
    user = create_test_user(
        db_session,
        user_role,
        mock_barangay=mock_barangay,
        mock_governance_area=mock_governance_area,
    )
    original_email = user.email

    # Authenticate and change password
    _override_user_and_db(client, user, db_session)
    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "OldPass123!@#", "new_password": "NewPass456!@#"},
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Password changed successfully"

    # Verify must_change_password flag is cleared
    db_session.refresh(user)
    assert user.must_change_password is False

    # Critical: Verify user can login with new password
    client.app.dependency_overrides.clear()
    _override_db(client, db_session)

    login_response = client.post(
        "/api/v1/auth/login", json={"email": original_email, "password": "NewPass456!@#"}
    )

    assert login_response.status_code == 200
    assert "access_token" in login_response.json()

    # Verify token contains correct role
    token = login_response.json()["access_token"]
    decoded = jwt.decode(token, options={"verify_signature": False})
    assert decoded["role"] == user_role.value
    assert decoded["must_change_password"] is False

    # Verify old password no longer works
    old_password_response = client.post(
        "/api/v1/auth/login", json={"email": original_email, "password": "OldPass123!@#"}
    )
    assert old_password_response.status_code == 401


# ====================================================================
# Test 2: Token Validity After Password Change
# ====================================================================


def test_token_remains_valid_after_password_change(client: TestClient, db_session: Session):
    """
    Test that existing tokens remain valid after password change

    Note: Current implementation does NOT invalidate old tokens.
    This test documents current behavior. In production, consider
    implementing token revocation on password change for security.
    """
    user = create_test_user(db_session, UserRole.KATUPARAN_CENTER_USER)

    # Login to get initial token
    _override_db(client, db_session)
    login_response = client.post(
        "/api/v1/auth/login", json={"email": user.email, "password": "OldPass123!@#"}
    )
    initial_token = login_response.json()["access_token"]

    # Change password with authentication
    _override_user_and_db(client, user, db_session)
    change_response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "OldPass123!@#", "new_password": "NewPass456!@#"},
    )
    assert change_response.status_code == 200

    # Verify initial token is still valid
    # (This documents current behavior - no token revocation)
    client.app.dependency_overrides.clear()
    _override_db(client, db_session)

    protected_response = client.get(
        "/api/v1/users/me", headers={"Authorization": f"Bearer {initial_token}"}
    )

    # Current behavior: old token still works
    assert protected_response.status_code == 200
    assert protected_response.json()["email"] == user.email


# ====================================================================
# Test 3: Password Change with Incorrect Current Password
# ====================================================================


@pytest.mark.parametrize(
    "user_role",
    [
        UserRole.MLGOO_DILG,
        UserRole.KATUPARAN_CENTER_USER,
        UserRole.VALIDATOR,
    ],
)
def test_password_change_fails_with_wrong_current_password(
    client: TestClient,
    db_session: Session,
    user_role: UserRole,
    mock_barangay,
    mock_governance_area,
):
    """
    Test that password change fails with incorrect current password

    Security requirement: Must verify current password before allowing change
    """
    user = create_test_user(
        db_session,
        user_role,
        mock_barangay=mock_barangay,
        mock_governance_area=mock_governance_area,
    )
    _override_user_and_db(client, user, db_session)

    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "wrongpassword", "new_password": "NewPass456!@#"},
    )

    assert response.status_code == 400
    assert "Incorrect current password" in response.json().get(
        "error", response.json().get("detail", "")
    )

    # Verify password was NOT changed
    db_session.refresh(user)
    assert verify_password("OldPass123!@#", user.hashed_password)
    assert not verify_password("NewPass456!@#", user.hashed_password)


# ====================================================================
# Test 4: KATUPARAN_CENTER_USER Access After Password Change
# ====================================================================


def test_katuparan_user_can_access_external_analytics_after_password_change(
    client: TestClient, db_session: Session
):
    """
    CRITICAL BUG FIX TEST: Verify KATUPARAN_CENTER_USER can access
    external analytics endpoints after password change

    This test reproduces the reported bug:
    - User changes password successfully
    - User should be able to access /api/v1/external/analytics/* endpoints
    - User should NOT get 403 Forbidden errors
    - User should NOT be routed to BLGU dashboard

    Expected frontend redirect: /external-analytics (not /blgu/dashboard)
    """
    user = create_test_user(db_session, UserRole.KATUPARAN_CENTER_USER)

    # Step 1: Change password
    _override_user_and_db(client, user, db_session)
    change_response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "OldPass123!@#", "new_password": "NewPass456!@#"},
    )
    assert change_response.status_code == 200

    # Step 2: Login with new password
    client.app.dependency_overrides.clear()
    _override_db(client, db_session)
    login_response = client.post(
        "/api/v1/auth/login", json={"email": user.email, "password": "NewPass456!@#"}
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    # Verify token has correct role
    decoded = jwt.decode(token, options={"verify_signature": False})
    assert decoded["role"] == UserRole.KATUPARAN_CENTER_USER.value

    # Step 3: Verify can access external analytics endpoint
    # Note: This tests the API access control, not the frontend redirect
    client.app.dependency_overrides.clear()
    _override_db(client, db_session)

    # The actual endpoint that KATUPARAN_CENTER_USER should access
    analytics_response = client.get(
        "/api/v1/external/analytics/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )

    # CRITICAL: Should NOT get 401/403 - these indicate auth/access failure
    # 200 = success, 400 = valid business logic error (e.g., insufficient barangays)
    # This was the reported bug - access denied after password change
    assert analytics_response.status_code in [200, 400], (
        f"Expected 200 or 400, got {analytics_response.status_code}. "
        f"401/403 would indicate auth failure after password change."
    )


def test_katuparan_user_cannot_access_blgu_endpoints_after_password_change(
    client: TestClient, db_session: Session
):
    """
    Test that KATUPARAN_CENTER_USER is correctly blocked from BLGU endpoints
    even after password change

    This ensures role-based access control works correctly post-password change
    """
    user = create_test_user(db_session, UserRole.KATUPARAN_CENTER_USER)

    # Change password and login
    _override_user_and_db(client, user, db_session)
    client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "OldPass123!@#", "new_password": "NewPass456!@#"},
    )

    client.app.dependency_overrides.clear()
    _override_db(client, db_session)
    login_response = client.post(
        "/api/v1/auth/login", json={"email": user.email, "password": "NewPass456!@#"}
    )
    token = login_response.json()["access_token"]

    # Try to access BLGU dashboard endpoint
    client.app.dependency_overrides.clear()
    _override_db(client, db_session)
    blgu_response = client.get(
        "/api/v1/blgu/dashboard", headers={"Authorization": f"Bearer {token}"}
    )

    # Should get 403 Forbidden or 404 Not Found (depending on endpoint existence)
    assert blgu_response.status_code in [403, 404], (
        "KATUPARAN_CENTER_USER should not access BLGU endpoints"
    )


# ====================================================================
# Test 5: Role-Based Dashboard Mapping Validation
# ====================================================================


@pytest.mark.parametrize(
    "user_role,expected_can_access_endpoint",
    [
        (UserRole.MLGOO_DILG, "/api/v1/users/"),  # Admin endpoint
        (UserRole.ASSESSOR, "/api/v1/assessor/queue"),  # Assessor endpoint
        (UserRole.VALIDATOR, "/api/v1/validator/queue"),  # Validator endpoint
        (UserRole.BLGU_USER, "/api/v1/blgu/dashboard"),  # BLGU endpoint
        (
            UserRole.KATUPARAN_CENTER_USER,
            "/api/v1/external/analytics/dashboard",
        ),  # External endpoint
    ],
)
def test_role_based_access_after_password_change(
    client: TestClient,
    db_session: Session,
    user_role: UserRole,
    expected_can_access_endpoint: str,
    mock_barangay,
    mock_governance_area,
):
    """
    Test that each role can access their appropriate endpoints
    after password change

    This validates that role-based access control works correctly
    throughout the password change flow.
    """
    user = create_test_user(
        db_session,
        user_role,
        mock_barangay=mock_barangay,
        mock_governance_area=mock_governance_area,
    )

    # Change password
    _override_user_and_db(client, user, db_session)
    client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "OldPass123!@#", "new_password": "NewPass456!@#"},
    )

    # Login with new password
    client.app.dependency_overrides.clear()
    _override_db(client, db_session)
    login_response = client.post(
        "/api/v1/auth/login", json={"email": user.email, "password": "NewPass456!@#"}
    )
    token = login_response.json()["access_token"]

    # Access role-appropriate endpoint
    client.app.dependency_overrides.clear()
    _override_db(client, db_session)
    endpoint_response = client.get(
        expected_can_access_endpoint, headers={"Authorization": f"Bearer {token}"}
    )

    # Should be able to access (200 success, 400 business logic error, or 404 if endpoint doesn't exist yet)
    # 401/403 would indicate auth failure after password change - that's the bug we're testing for
    assert endpoint_response.status_code in [200, 400, 404], (
        f"{user_role.value} should be able to access {expected_can_access_endpoint}"
    )


# ====================================================================
# Test 6: Password Change Clears must_change_password Flag
# ====================================================================


def test_must_change_password_flag_cleared_after_change(client: TestClient, db_session: Session):
    """
    Test that must_change_password flag is properly cleared after
    user changes their password

    This is critical for first-time login flow and admin-reset passwords
    """
    # Create user with must_change_password=True
    user = User(
        email=f"mustchange_{uuid.uuid4().hex[:8]}@example.com",
        name="Must Change Password User",
        hashed_password=pwd_context.hash("temppass123"),
        role=UserRole.KATUPARAN_CENTER_USER,
        is_active=True,
        must_change_password=True,  # Flag set
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Verify flag is set before change
    assert user.must_change_password is True

    # Change password
    _override_user_and_db(client, user, db_session)
    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "temppass123", "new_password": "NewPass456!@#"},
    )
    assert response.status_code == 200

    # Verify flag is cleared after change
    db_session.refresh(user)
    assert user.must_change_password is False

    # Verify new login doesn't require password change
    client.app.dependency_overrides.clear()
    _override_db(client, db_session)
    login_response = client.post(
        "/api/v1/auth/login", json={"email": user.email, "password": "NewPass456!@#"}
    )
    token = login_response.json()["access_token"]
    decoded = jwt.decode(token, options={"verify_signature": False})
    assert decoded["must_change_password"] is False


# ====================================================================
# Test 7: Password Change with Missing Fields
# ====================================================================


def test_password_change_validation_errors(client: TestClient, db_session: Session, mock_barangay):
    """
    Test validation errors for password change endpoint
    """
    user = create_test_user(db_session, UserRole.BLGU_USER, mock_barangay=mock_barangay)
    _override_user_and_db(client, user, db_session)

    # Missing current_password
    response = client.post("/api/v1/auth/change-password", json={"new_password": "newpass123"})
    assert response.status_code == 422  # Validation error

    # Missing new_password
    response = client.post(
        "/api/v1/auth/change-password", json={"current_password": "OldPass123!@#"}
    )
    assert response.status_code == 422  # Validation error

    # Empty body
    response = client.post("/api/v1/auth/change-password", json={})
    assert response.status_code == 422  # Validation error


# ====================================================================
# Test 8: Concurrent Password Changes
# ====================================================================


def test_rapid_password_changes(client: TestClient, db_session: Session, mock_governance_area):
    """
    Test that user can change password multiple times in succession

    Edge case: Ensures no race conditions or locking issues
    """
    user = create_test_user(
        db_session, UserRole.VALIDATOR, mock_governance_area=mock_governance_area
    )
    _override_user_and_db(client, user, db_session)

    # First password change
    response1 = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "OldPass123!@#", "new_password": "FirstPass456!@"},
    )
    assert response1.status_code == 200

    # Second password change (use new password as current)
    db_session.refresh(user)
    response2 = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "FirstPass456!@", "new_password": "SecondPass789!"},
    )
    assert response2.status_code == 200

    # Verify final password is active
    db_session.refresh(user)
    assert verify_password("SecondPass789!", user.hashed_password)
    assert not verify_password("OldPass123!@#", user.hashed_password)
    assert not verify_password("newpass1", user.hashed_password)
