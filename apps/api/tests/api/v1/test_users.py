"""
Tests for users API endpoints (app/api/v1/users.py)
"""

import uuid

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
def admin_user(db_session: Session):
    """Create an admin user for testing"""
    unique_email = f"admin_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="Admin User",
        hashed_password=pwd_context.hash("AdminPass123!"),
        role=UserRole.MLGOO_DILG,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def blgu_user(db_session: Session, mock_barangay):
    """Create a BLGU user for testing"""
    unique_email = f"blgu_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="BLGU User",
        hashed_password=pwd_context.hash("BlguPass123!"),
        role=UserRole.BLGU_USER,
        barangay_id=mock_barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def assessor_user(db_session: Session):
    """Create an assessor user for testing"""
    unique_email = f"assessor_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="Assessor User",
        hashed_password=pwd_context.hash("AssessorPass123!"),
        role=UserRole.ASSESSOR,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _override_user_and_db(client, user: User, db_session: Session):
    """Override authentication and database dependencies for admin users"""

    def _override_current_active_user():
        return user

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_active_user] = _override_current_active_user
    # Only override admin dependency if user is actually an admin
    if user.role == UserRole.MLGOO_DILG:
        client.app.dependency_overrides[deps.get_current_admin_user] = _override_current_active_user
    client.app.dependency_overrides[deps.get_db] = _override_get_db


# ====================================================================
# GET /api/v1/users/me - Get Current User
# ====================================================================


def test_get_current_user_success(client: TestClient, db_session: Session, blgu_user: User):
    """Test getting current user information"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.get("/api/v1/users/me")

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == blgu_user.email
    assert data["name"] == "BLGU User"
    assert data["role"] == UserRole.BLGU_USER.value


def test_get_current_user_unauthorized(client: TestClient):
    """Test that getting current user requires authentication"""
    response = client.get("/api/v1/users/me")

    # Expect 401 or 403 depending on setup (matching analytics test pattern)
    assert response.status_code in [401, 403]


# ====================================================================
# PUT /api/v1/users/me - Update Current User
# ====================================================================


def test_update_current_user_success(client: TestClient, blgu_user: User, db_session: Session):
    """Test updating current user profile"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.put(
        "/api/v1/users/me",
        json={"name": "Updated BLGU Name"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated BLGU Name"
    assert data["email"] == blgu_user.email  # Email shouldn't change

    # Verify in database
    db_session.refresh(blgu_user)
    assert blgu_user.name == "Updated BLGU Name"


def test_update_current_user_unauthorized(client: TestClient):
    """Test that updating current user requires authentication"""
    response = client.put("/api/v1/users/me", json={"name": "New Name"})

    # Expect 401 or 403 depending on setup (matching analytics test pattern)
    assert response.status_code in [401, 403]


# ====================================================================
# PATCH /api/v1/users/me/language - Update Language Preference
# ====================================================================


def test_update_language_preference_success_ceb(
    client: TestClient, blgu_user: User, db_session: Session
):
    """Test updating language preference to Bisaya (ceb)"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.patch("/api/v1/users/me/language?language=ceb")

    assert response.status_code == 200
    data = response.json()
    assert data["preferred_language"] == "ceb"

    # Verify in database
    db_session.refresh(blgu_user)
    assert blgu_user.preferred_language == "ceb"


def test_update_language_preference_success_fil(
    client: TestClient, blgu_user: User, db_session: Session
):
    """Test updating language preference to Tagalog (fil)"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.patch("/api/v1/users/me/language?language=fil")

    assert response.status_code == 200
    data = response.json()
    assert data["preferred_language"] == "fil"

    # Verify in database
    db_session.refresh(blgu_user)
    assert blgu_user.preferred_language == "fil"


def test_update_language_preference_success_en(
    client: TestClient, blgu_user: User, db_session: Session
):
    """Test updating language preference to English (en)"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.patch("/api/v1/users/me/language?language=en")

    assert response.status_code == 200
    data = response.json()
    assert data["preferred_language"] == "en"

    # Verify in database
    db_session.refresh(blgu_user)
    assert blgu_user.preferred_language == "en"


def test_update_language_preference_invalid_code(
    client: TestClient, blgu_user: User, db_session: Session
):
    """Test that invalid language code is rejected"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.patch("/api/v1/users/me/language?language=invalid")

    # FastAPI query validation should reject invalid pattern
    assert response.status_code == 422  # Unprocessable Entity


def test_update_language_preference_empty_string(
    client: TestClient, blgu_user: User, db_session: Session
):
    """Test that empty string is rejected as language code"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.patch("/api/v1/users/me/language?language=")

    # FastAPI query validation should reject empty string
    assert response.status_code == 422  # Unprocessable Entity


def test_update_language_preference_missing_query_param(
    client: TestClient, blgu_user: User, db_session: Session
):
    """Test that missing language query parameter is rejected"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.patch("/api/v1/users/me/language")

    # FastAPI should require the query parameter
    assert response.status_code == 422  # Unprocessable Entity


def test_update_language_preference_unauthorized(client: TestClient):
    """Test that updating language preference requires authentication"""
    response = client.patch("/api/v1/users/me/language?language=en")

    # Expect 401 or 403 depending on setup
    assert response.status_code in [401, 403]


def test_update_language_preference_persists_across_requests(
    client: TestClient, blgu_user: User, db_session: Session
):
    """Test that language preference persists in database"""
    _override_user_and_db(client, blgu_user, db_session)

    # Update to Tagalog
    response1 = client.patch("/api/v1/users/me/language?language=fil")
    assert response1.status_code == 200

    # Get current user to verify persistence
    response2 = client.get("/api/v1/users/me")
    assert response2.status_code == 200
    data = response2.json()
    assert data["preferred_language"] == "fil"


def test_update_language_preference_different_roles(
    client: TestClient, db_session: Session, admin_user: User, assessor_user: User
):
    """Test that all user roles can update their language preference"""
    # Test admin user
    _override_user_and_db(client, admin_user, db_session)
    response1 = client.patch("/api/v1/users/me/language?language=en")
    assert response1.status_code == 200
    assert response1.json()["preferred_language"] == "en"

    # Test assessor user
    _override_user_and_db(client, assessor_user, db_session)
    response2 = client.patch("/api/v1/users/me/language?language=fil")
    assert response2.status_code == 200
    assert response2.json()["preferred_language"] == "fil"


# ====================================================================
# GET /api/v1/users/ - Get Users List (Admin Only)
# ====================================================================


def test_get_users_list_as_admin(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    blgu_user: User,
    assessor_user: User,
):
    """Test admin can get list of users"""
    _override_user_and_db(client, admin_user, db_session)

    response = client.get("/api/v1/users/")

    assert response.status_code == 200
    data = response.json()
    assert "users" in data
    assert "total" in data
    assert data["total"] >= 3  # At least 3 users (admin, blgu, assessor)


def test_get_users_list_with_pagination(client: TestClient, db_session: Session, admin_user: User):
    """Test user list pagination"""
    _override_user_and_db(client, admin_user, db_session)

    response = client.get("/api/v1/users/?page=1&size=2")

    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["size"] == 2
    assert len(data["users"]) <= 2


def test_get_users_list_with_search(
    client: TestClient, db_session: Session, admin_user: User, blgu_user: User
):
    """Test searching users by name or email"""
    _override_user_and_db(client, admin_user, db_session)

    response = client.get("/api/v1/users/?search=BLGU")

    assert response.status_code == 200
    data = response.json()
    # Should find the BLGU user
    assert any(user["email"] == blgu_user.email for user in data["users"])


def test_get_users_list_with_role_filter(
    client: TestClient, db_session: Session, admin_user: User, blgu_user: User
):
    """Test filtering users by role"""
    _override_user_and_db(client, admin_user, db_session)

    response = client.get(f"/api/v1/users/?role={UserRole.BLGU_USER.value}")

    assert response.status_code == 200
    data = response.json()
    # All returned users should be BLGU users
    assert all(user["role"] == UserRole.BLGU_USER.value for user in data["users"])


def test_get_users_list_forbidden_for_non_admin(
    client: TestClient, db_session: Session, blgu_user: User
):
    """Test that non-admin users cannot get user list"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.get("/api/v1/users/")

    assert response.status_code == 403  # Forbidden


def test_get_users_list_unauthorized(client: TestClient):
    """Test that user list requires authentication"""
    response = client.get("/api/v1/users/")

    # Expect 401 or 403 depending on setup (matching analytics test pattern)
    assert response.status_code in [401, 403]


# ====================================================================
# POST /api/v1/users/ - Create User (Admin Only)
# ====================================================================


def test_create_user_as_admin(
    client: TestClient, db_session: Session, admin_user: User, mock_barangay
):
    """Test admin can create new users"""
    _override_user_and_db(client, admin_user, db_session)

    unique_email = f"newuser_{uuid.uuid4().hex[:8]}@example.com"
    user_data = {
        "email": unique_email,
        "name": "New User",
        "password": "NewPassword123!",
        "role": UserRole.BLGU_USER.value,
        "barangay_id": mock_barangay.id,  # Required for BLGU_USER role
    }

    response = client.post("/api/v1/users/", json=user_data)

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == unique_email
    assert data["name"] == "New User"
    assert data["role"] == UserRole.BLGU_USER.value

    # Verify user exists in database
    new_user = db_session.query(User).filter(User.email == unique_email).first()
    assert new_user is not None
    assert new_user.is_active is True


def test_create_user_forbidden_for_non_admin(
    client: TestClient, db_session: Session, blgu_user: User
):
    """Test that non-admin users cannot create users"""
    _override_user_and_db(client, blgu_user, db_session)

    user_data = {
        "email": "newuser@example.com",
        "name": "New User",
        "password": "NewPassword123!",
        "role": UserRole.BLGU_USER.value,
        "barangay_id": 1,  # Required for BLGU_USER role
    }

    response = client.post("/api/v1/users/", json=user_data)

    assert response.status_code == 403


def test_create_user_unauthorized(client: TestClient):
    """Test that creating user requires authentication"""
    user_data = {
        "email": "newuser@example.com",
        "name": "New User",
        "password": "NewPassword123!",
        "role": UserRole.BLGU_USER.value,
        "barangay_id": 1,  # Required for BLGU_USER role
    }

    response = client.post("/api/v1/users/", json=user_data)

    # Expect 401 or 403 depending on setup (matching analytics test pattern)
    assert response.status_code in [401, 403]


# ====================================================================
# GET /api/v1/users/{user_id} - Get User by ID (Admin Only)
# ====================================================================


def test_get_user_by_id_as_admin(
    client: TestClient, db_session: Session, admin_user: User, blgu_user: User
):
    """Test admin can get user by ID"""
    _override_user_and_db(client, admin_user, db_session)

    response = client.get(f"/api/v1/users/{blgu_user.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == blgu_user.id
    assert data["email"] == blgu_user.email


def test_get_user_by_id_not_found(client: TestClient, db_session: Session, admin_user: User):
    """Test getting non-existent user returns 404"""
    _override_user_and_db(client, admin_user, db_session)

    response = client.get("/api/v1/users/99999")

    assert response.status_code == 404


def test_get_user_by_id_forbidden_for_non_admin(
    client: TestClient, db_session: Session, blgu_user: User, admin_user: User
):
    """Test that non-admin users cannot get user by ID"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.get(f"/api/v1/users/{admin_user.id}")

    assert response.status_code == 403


# ====================================================================
# PUT /api/v1/users/{user_id} - Update User (Admin Only)
# ====================================================================


def test_update_user_by_id_as_admin(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    blgu_user: User,
):
    """Test admin can update user by ID"""
    _override_user_and_db(client, admin_user, db_session)

    response = client.put(
        f"/api/v1/users/{blgu_user.id}",
        json={"name": "Updated BLGU Name", "role": UserRole.BLGU_USER.value},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated BLGU Name"

    # Verify in database
    db_session.refresh(blgu_user)
    assert blgu_user.name == "Updated BLGU Name"


def test_update_user_by_id_not_found(client: TestClient, db_session: Session, admin_user: User):
    """Test updating non-existent user returns 404"""
    _override_user_and_db(client, admin_user, db_session)

    response = client.put(
        "/api/v1/users/99999",
        json={"name": "New Name"},
    )

    assert response.status_code == 404


def test_update_user_by_id_forbidden_for_non_admin(
    client: TestClient, db_session: Session, blgu_user: User, assessor_user: User
):
    """Test that non-admin users cannot update other users"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.put(
        f"/api/v1/users/{assessor_user.id}",
        json={"name": "Hacked Name"},
    )

    assert response.status_code == 403


# ====================================================================
# DELETE /api/v1/users/{user_id} - Deactivate User (Admin Only)
# ====================================================================


def test_deactivate_user_as_admin(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    blgu_user: User,
):
    """Test admin can deactivate user"""
    _override_user_and_db(client, admin_user, db_session)

    response = client.delete(f"/api/v1/users/{blgu_user.id}")

    assert response.status_code == 200

    # Verify user is deactivated in database
    db_session.refresh(blgu_user)
    assert blgu_user.is_active is False


def test_deactivate_user_cannot_deactivate_self(
    client: TestClient, db_session: Session, admin_user: User
):
    """Test admin cannot deactivate their own account"""
    _override_user_and_db(client, admin_user, db_session)

    response = client.delete(f"/api/v1/users/{admin_user.id}")

    assert response.status_code == 400
    assert "Cannot deactivate your own account" in response.json().get(
        "error", response.json().get("detail", "")
    )


def test_deactivate_user_not_found(client: TestClient, db_session: Session, admin_user: User):
    """Test deactivating non-existent user returns 404"""
    _override_user_and_db(client, admin_user, db_session)

    response = client.delete("/api/v1/users/99999")

    assert response.status_code == 404


def test_deactivate_user_forbidden_for_non_admin(
    client: TestClient, db_session: Session, blgu_user: User, assessor_user: User
):
    """Test that non-admin users cannot deactivate users"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.delete(f"/api/v1/users/{assessor_user.id}")

    assert response.status_code == 403


# ====================================================================
# POST /api/v1/users/{user_id}/activate - Activate User (Admin Only)
# ====================================================================


def test_activate_user_as_admin(
    client: TestClient, db_session: Session, admin_user: User, mock_barangay
):
    """Test admin can activate inactive user"""
    # Create inactive user
    unique_email = f"inactive_{uuid.uuid4().hex[:8]}@example.com"
    inactive_user = User(
        email=unique_email,
        name="Inactive User",
        hashed_password=pwd_context.hash("TestPassword123!"),
        role=UserRole.BLGU_USER,
        barangay_id=mock_barangay.id,
        is_active=False,
    )
    db_session.add(inactive_user)
    db_session.commit()
    db_session.refresh(inactive_user)

    _override_user_and_db(client, admin_user, db_session)

    response = client.post(f"/api/v1/users/{inactive_user.id}/activate")

    assert response.status_code == 200

    # Verify user is activated
    db_session.refresh(inactive_user)
    assert inactive_user.is_active is True


def test_activate_user_not_found(client: TestClient, db_session: Session, admin_user: User):
    """Test activating non-existent user returns 404"""
    _override_user_and_db(client, admin_user, db_session)

    response = client.post("/api/v1/users/99999/activate")

    assert response.status_code == 404


def test_activate_user_forbidden_for_non_admin(
    client: TestClient, db_session: Session, blgu_user: User, assessor_user: User
):
    """Test that non-admin users cannot activate users"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.post(f"/api/v1/users/{assessor_user.id}/activate")

    assert response.status_code == 403


# ====================================================================
# POST /api/v1/users/{user_id}/reset-password - Reset Password (Admin Only)
# ====================================================================


def test_reset_user_password_as_admin(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    blgu_user: User,
):
    """Test admin can reset user password"""
    _override_user_and_db(client, admin_user, db_session)

    response = client.post(
        f"/api/v1/users/{blgu_user.id}/reset-password",
        json={"new_password": "ResetPassword123!"},
    )

    assert response.status_code == 200
    assert "Password reset successfully" in response.json()["message"]

    # Verify must_change_password is set to True
    db_session.refresh(blgu_user)
    assert blgu_user.must_change_password is True


def test_reset_user_password_not_found(client: TestClient, db_session: Session, admin_user: User):
    """Test resetting password for non-existent user returns 404"""
    _override_user_and_db(client, admin_user, db_session)

    response = client.post(
        "/api/v1/users/99999/reset-password",
        json={"new_password": "NewPassword123!"},
    )

    assert response.status_code == 404


def test_reset_user_password_forbidden_for_non_admin(
    client: TestClient, db_session: Session, blgu_user: User, assessor_user: User
):
    """Test that non-admin users cannot reset passwords"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.post(
        f"/api/v1/users/{assessor_user.id}/reset-password",
        json={"new_password": "NewPassword123!"},
    )

    assert response.status_code == 403


# ====================================================================
# GET /api/v1/users/stats/dashboard - Get User Stats (Admin Only)
# ====================================================================


def test_get_user_stats_as_admin(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    blgu_user: User,
    assessor_user: User,
):
    """Test admin can get user statistics"""
    _override_user_and_db(client, admin_user, db_session)

    response = client.get("/api/v1/users/stats/dashboard")

    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert data["total_users"] >= 3


def test_get_user_stats_forbidden_for_non_admin(
    client: TestClient, db_session: Session, blgu_user: User
):
    """Test that non-admin users cannot get user stats"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.get("/api/v1/users/stats/dashboard")

    assert response.status_code == 403


def test_get_user_stats_unauthorized(client: TestClient):
    """Test that user stats requires authentication"""
    response = client.get("/api/v1/users/stats/dashboard")

    # Expect 401 or 403 depending on setup (matching analytics test pattern)
    assert response.status_code in [401, 403]


# ====================================================================
# Role-Based User Creation Tests (Epic 8.0)
# ====================================================================


def test_create_validator_user_with_area_assignment(
    client: TestClient, db_session: Session, admin_user: User, mock_governance_area
):
    """Test creating VALIDATOR user with required validator_area_id"""
    _override_user_and_db(client, admin_user, db_session)

    unique_email = f"validator_{uuid.uuid4().hex[:8]}@example.com"
    user_data = {
        "email": unique_email,
        "name": "Validator User",
        "password": "ValidatorPass123!",
        "role": UserRole.VALIDATOR.value,
        "validator_area_id": mock_governance_area.id,  # Required for VALIDATOR role
    }

    response = client.post("/api/v1/users/", json=user_data)

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == unique_email
    assert data["role"] == UserRole.VALIDATOR.value
    assert data["validator_area_id"] == mock_governance_area.id

    # Verify in database
    new_user = db_session.query(User).filter(User.email == unique_email).first()
    assert new_user is not None
    assert new_user.validator_area_id == mock_governance_area.id
    assert new_user.barangay_id is None


def test_create_validator_user_without_area_fails(
    client: TestClient, db_session: Session, admin_user: User
):
    """Test creating VALIDATOR user without validator_area_id fails validation"""
    _override_user_and_db(client, admin_user, db_session)

    unique_email = f"validator_{uuid.uuid4().hex[:8]}@example.com"
    user_data = {
        "email": unique_email,
        "name": "Validator User",
        "password": "ValidatorPass123!",
        "role": UserRole.VALIDATOR.value,
        # validator_area_id is missing
    }

    response = client.post("/api/v1/users/", json=user_data)

    assert response.status_code == 400
    detail_lower = response.json().get("error", response.json().get("detail", "")).lower()
    assert "governance area" in detail_lower and "validator" in detail_lower


def test_create_assessor_user_no_assignment_required(
    client: TestClient, db_session: Session, admin_user: User
):
    """Test creating ASSESSOR user requires no barangay or area assignment"""
    _override_user_and_db(client, admin_user, db_session)

    unique_email = f"assessor_{uuid.uuid4().hex[:8]}@example.com"
    user_data = {
        "email": unique_email,
        "name": "Assessor User",
        "password": "AssessorPass123!",
        "role": UserRole.ASSESSOR.value,
        # No barangay_id or validator_area_id
    }

    response = client.post("/api/v1/users/", json=user_data)

    assert response.status_code == 200
    data = response.json()
    assert data["role"] == UserRole.ASSESSOR.value
    assert data.get("barangay_id") is None
    assert data.get("validator_area_id") is None


def test_create_assessor_with_validator_area_clears_it(
    client: TestClient, db_session: Session, admin_user: User
):
    """Test creating ASSESSOR user with validator_area_id silently clears it"""
    _override_user_and_db(client, admin_user, db_session)

    unique_email = f"assessor_{uuid.uuid4().hex[:8]}@example.com"
    user_data = {
        "email": unique_email,
        "name": "Assessor User",
        "password": "AssessorPass123!",
        "role": UserRole.ASSESSOR.value,
        "validator_area_id": 1,  # Should be cleared for ASSESSOR
    }

    response = client.post("/api/v1/users/", json=user_data)

    assert response.status_code == 200
    data = response.json()
    assert data["role"] == UserRole.ASSESSOR.value
    assert data.get("validator_area_id") is None  # Should be cleared

    # Verify in database
    new_user = db_session.query(User).filter(User.email == unique_email).first()
    assert new_user is not None
    assert new_user.validator_area_id is None


def test_create_mlgoo_dilg_user_no_assignment_required(
    client: TestClient, db_session: Session, admin_user: User
):
    """Test creating MLGOO_DILG user requires no assignments"""
    _override_user_and_db(client, admin_user, db_session)

    unique_email = f"mlgoo_{uuid.uuid4().hex[:8]}@example.com"
    user_data = {
        "email": unique_email,
        "name": "MLGOO DILG User",
        "password": "MlgooPass123!",
        "role": UserRole.MLGOO_DILG.value,
        # No assignments
    }

    response = client.post("/api/v1/users/", json=user_data)

    assert response.status_code == 200
    data = response.json()
    assert data["role"] == UserRole.MLGOO_DILG.value
    assert data.get("barangay_id") is None
    assert data.get("validator_area_id") is None


def test_create_blgu_user_requires_barangay(
    client: TestClient, db_session: Session, admin_user: User, mock_barangay
):
    """Test creating BLGU_USER requires barangay_id"""
    _override_user_and_db(client, admin_user, db_session)

    unique_email = f"blgu_{uuid.uuid4().hex[:8]}@example.com"
    user_data = {
        "email": unique_email,
        "name": "BLGU User",
        "password": "BlguPass123!",
        "role": UserRole.BLGU_USER.value,
        "barangay_id": mock_barangay.id,
    }

    response = client.post("/api/v1/users/", json=user_data)

    assert response.status_code == 200
    data = response.json()
    assert data["barangay_id"] == mock_barangay.id
    assert data.get("validator_area_id") is None


def test_create_duplicate_email_fails(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    blgu_user: User,
    mock_barangay,
):
    """Test creating user with duplicate email fails"""
    _override_user_and_db(client, admin_user, db_session)

    user_data = {
        "email": blgu_user.email,  # Duplicate email
        "name": "Another User",
        "password": "Password123!",
        "role": UserRole.BLGU_USER.value,
        "barangay_id": mock_barangay.id,
    }

    response = client.post("/api/v1/users/", json=user_data)

    assert response.status_code == 400
    assert "email" in response.json().get("error", response.json().get("detail", "")).lower()


# ====================================================================
# Role Change Tests (Epic 8.0)
# ====================================================================


def test_update_user_role_from_blgu_to_validator(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    blgu_user: User,
    mock_governance_area,
):
    """Test changing user from BLGU_USER to VALIDATOR clears barangay_id and sets validator_area_id"""
    _override_user_and_db(client, admin_user, db_session)

    # Verify initial state
    assert blgu_user.role == UserRole.BLGU_USER
    assert blgu_user.barangay_id is not None

    response = client.put(
        f"/api/v1/users/{blgu_user.id}",
        json={
            "role": UserRole.VALIDATOR.value,
            "validator_area_id": mock_governance_area.id,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["role"] == UserRole.VALIDATOR.value
    assert data["validator_area_id"] == mock_governance_area.id
    assert data.get("barangay_id") is None

    # Verify in database
    db_session.refresh(blgu_user)
    assert blgu_user.role == UserRole.VALIDATOR
    assert blgu_user.validator_area_id == mock_governance_area.id
    assert blgu_user.barangay_id is None


def test_update_user_role_from_validator_to_assessor(
    client: TestClient, db_session: Session, admin_user: User, mock_governance_area
):
    """Test changing user from VALIDATOR to ASSESSOR clears validator_area_id"""
    _override_user_and_db(client, admin_user, db_session)

    # Create validator user
    unique_email = f"validator_{uuid.uuid4().hex[:8]}@example.com"
    validator = User(
        email=unique_email,
        name="Validator User",
        hashed_password=pwd_context.hash("TestPassword123!"),
        role=UserRole.VALIDATOR,
        validator_area_id=mock_governance_area.id,
        is_active=True,
    )
    db_session.add(validator)
    db_session.commit()
    db_session.refresh(validator)

    # Change role to ASSESSOR
    response = client.put(
        f"/api/v1/users/{validator.id}",
        json={
            "role": UserRole.ASSESSOR.value,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["role"] == UserRole.ASSESSOR.value
    assert data.get("validator_area_id") is None

    # Verify in database
    db_session.refresh(validator)
    assert validator.role == UserRole.ASSESSOR
    assert validator.validator_area_id is None


def test_update_user_role_from_assessor_to_blgu(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    assessor_user: User,
    mock_barangay,
):
    """Test changing user from ASSESSOR to BLGU_USER requires barangay_id"""
    _override_user_and_db(client, admin_user, db_session)

    response = client.put(
        f"/api/v1/users/{assessor_user.id}",
        json={
            "role": UserRole.BLGU_USER.value,
            "barangay_id": mock_barangay.id,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["role"] == UserRole.BLGU_USER.value
    assert data["barangay_id"] == mock_barangay.id

    # Verify in database
    db_session.refresh(assessor_user)
    assert assessor_user.role == UserRole.BLGU_USER
    assert assessor_user.barangay_id == mock_barangay.id


# ====================================================================
# Access Control Tests (Epic 8.0)
# ====================================================================


def test_only_mlgoo_dilg_can_access_user_management(
    client: TestClient, db_session: Session, assessor_user: User, mock_barangay
):
    """Test that only MLGOO_DILG role can access user management endpoints"""
    _override_user_and_db(client, assessor_user, db_session)

    # Try to access user list
    response = client.get("/api/v1/users/")
    assert response.status_code == 403

    # Try to create user
    response = client.post(
        "/api/v1/users/",
        json={
            "email": "test@example.com",
            "name": "Test",
            "password": "Password123!",
            "role": UserRole.BLGU_USER.value,
            "barangay_id": mock_barangay.id,
        },
    )
    assert response.status_code == 403


def test_validator_cannot_access_user_management(
    client: TestClient, db_session: Session, mock_governance_area
):
    """Test that VALIDATOR role cannot access user management endpoints"""
    # Create validator user
    unique_email = f"validator_{uuid.uuid4().hex[:8]}@example.com"
    validator = User(
        email=unique_email,
        name="Validator User",
        hashed_password=pwd_context.hash("TestPassword123!"),
        role=UserRole.VALIDATOR,
        validator_area_id=mock_governance_area.id,
        is_active=True,
    )
    db_session.add(validator)
    db_session.commit()
    db_session.refresh(validator)

    _override_user_and_db(client, validator, db_session)

    # Try to access user list
    response = client.get("/api/v1/users/")
    assert response.status_code == 403
