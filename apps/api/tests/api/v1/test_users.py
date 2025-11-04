"""
Tests for users API endpoints (app/api/v1/users.py)
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
def admin_user(db_session: Session):
    """Create an admin user for testing"""
    unique_email = f"admin_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="Admin User",
        hashed_password=pwd_context.hash("adminpass123"),
        role=UserRole.SUPERADMIN,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def blgu_user(db_session: Session):
    """Create a BLGU user for testing"""
    unique_email = f"blgu_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="BLGU User",
        hashed_password=pwd_context.hash("blgupass123"),
        role=UserRole.BLGU_USER,
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
        hashed_password=pwd_context.hash("assessorpass123"),
        role=UserRole.AREA_ASSESSOR,
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
    if user.role == UserRole.SUPERADMIN:
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


def test_update_current_user_success(
    client: TestClient, blgu_user: User, db_session: Session
):
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


def test_get_users_list_with_pagination(
    client: TestClient, db_session: Session, admin_user: User
):
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

    response = client.get(f"/api/v1/users/?search=BLGU")

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
    client: TestClient, db_session: Session, admin_user: User
):
    """Test admin can create new users"""
    _override_user_and_db(client, admin_user, db_session)

    unique_email = f"newuser_{uuid.uuid4().hex[:8]}@example.com"
    user_data = {
        "email": unique_email,
        "name": "New User",
        "password": "newpassword123",
        "role": UserRole.BLGU_USER.value,
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
        "password": "newpassword123",
        "role": UserRole.BLGU_USER.value,
    }

    response = client.post("/api/v1/users/", json=user_data)

    assert response.status_code == 403


def test_create_user_unauthorized(client: TestClient):
    """Test that creating user requires authentication"""
    user_data = {
        "email": "newuser@example.com",
        "name": "New User",
        "password": "newpassword123",
        "role": UserRole.BLGU_USER.value,
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
    assert "Cannot deactivate your own account" in response.json()["detail"]


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
    client: TestClient, db_session: Session, admin_user: User
):
    """Test admin can activate inactive user"""
    # Create inactive user
    unique_email = f"inactive_{uuid.uuid4().hex[:8]}@example.com"
    inactive_user = User(
        email=unique_email,
        name="Inactive User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
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
        params={"new_password": "resetpassword123"},
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
        params={"new_password": "newpass123"},
    )

    assert response.status_code == 404


def test_reset_user_password_forbidden_for_non_admin(
    client: TestClient, db_session: Session, blgu_user: User, assessor_user: User
):
    """Test that non-admin users cannot reset passwords"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.post(
        f"/api/v1/users/{assessor_user.id}/reset-password",
        params={"new_password": "newpass123"},
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
