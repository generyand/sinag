"""
Tests for user service layer (app/services/user_service.py)
"""

import pytest
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.db.models.user import User
from app.db.enums import UserRole
from app.services.user_service import user_service
from app.schemas.user import UserAdminCreate, UserAdminUpdate, UserUpdate
from app.core.security import get_password_hash, verify_password


# ====================================================================
# Test Fixtures
# ====================================================================


@pytest.fixture
def sample_user(db_session: Session):
    """Create a sample user for testing"""
    user = User(
        email="sample@example.com",
        name="Sample User",
        hashed_password=get_password_hash("password123"),
        role=UserRole.BLGU_USER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session: Session):
    """Create an admin user for testing"""
    user = User(
        email="admin@example.com",
        name="Admin User",
        hashed_password=get_password_hash("adminpass123"),
        role=UserRole.MLGOO_DILG,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def inactive_user(db_session: Session):
    """Create an inactive user for testing"""
    user = User(
        email="inactive@example.com",
        name="Inactive User",
        hashed_password=get_password_hash("password123"),
        role=UserRole.BLGU_USER,
        is_active=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# ====================================================================
# Get User Tests
# ====================================================================


def test_get_user_by_id_success(db_session: Session, sample_user: User):
    """Test getting user by ID"""
    result = user_service.get_user_by_id(db_session, sample_user.id)

    assert result is not None
    assert result.id == sample_user.id
    assert result.email == "sample@example.com"


def test_get_user_by_id_not_found(db_session: Session):
    """Test getting non-existent user returns None"""
    result = user_service.get_user_by_id(db_session, 99999)

    assert result is None


def test_get_user_by_email_success(db_session: Session, sample_user: User):
    """Test getting user by email"""
    result = user_service.get_user_by_email(db_session, "sample@example.com")

    assert result is not None
    assert result.id == sample_user.id
    assert result.email == "sample@example.com"


def test_get_user_by_email_not_found(db_session: Session):
    """Test getting user by non-existent email returns None"""
    result = user_service.get_user_by_email(db_session, "nonexistent@example.com")

    assert result is None


# ====================================================================
# Get Users List Tests
# ====================================================================


def test_get_users_returns_all_users(
    db_session: Session, sample_user: User, admin_user: User
):
    """Test getting list of all users"""
    users, total = user_service.get_users(db_session)

    assert total >= 2
    assert len(users) >= 2
    emails = [user.email for user in users]
    assert "sample@example.com" in emails
    assert "admin@example.com" in emails


def test_get_users_with_pagination(
    db_session: Session, sample_user: User, admin_user: User
):
    """Test user list pagination"""
    users, total = user_service.get_users(db_session, skip=0, limit=1)

    assert total >= 2
    assert len(users) == 1


def test_get_users_with_search_by_name(db_session: Session, sample_user: User):
    """Test searching users by name"""
    users, total = user_service.get_users(db_session, search="Sample")

    assert total >= 1
    assert any(user.name == "Sample User" for user in users)


def test_get_users_with_search_by_email(db_session: Session, admin_user: User):
    """Test searching users by email"""
    users, total = user_service.get_users(db_session, search="admin")

    assert total >= 1
    assert any(user.email == "admin@example.com" for user in users)


def test_get_users_with_role_filter(db_session: Session, admin_user: User):
    """Test filtering users by role"""
    users, total = user_service.get_users(
        db_session, role=UserRole.MLGOO_DILG.value
    )

    assert total >= 1
    assert all(user.role == UserRole.MLGOO_DILG for user in users)


def test_get_users_with_active_filter(
    db_session: Session, sample_user: User, inactive_user: User
):
    """Test filtering users by active status"""
    # Get only active users
    active_users, active_total = user_service.get_users(db_session, is_active=True)
    assert all(user.is_active for user in active_users)

    # Get only inactive users
    inactive_users, inactive_total = user_service.get_users(db_session, is_active=False)
    assert all(not user.is_active for user in inactive_users)
    assert any(user.email == "inactive@example.com" for user in inactive_users)


def test_get_users_with_combined_filters(db_session: Session):
    """Test combining multiple filters"""
    # Create test data
    blgu1 = User(
        email="blgu1@example.com",
        name="Active BLGU",
        hashed_password=get_password_hash("pass"),
        role=UserRole.BLGU_USER,
        is_active=True,
    )
    blgu2 = User(
        email="blgu2@example.com",
        name="Inactive BLGU",
        hashed_password=get_password_hash("pass"),
        role=UserRole.BLGU_USER,
        is_active=False,
    )
    db_session.add_all([blgu1, blgu2])
    db_session.commit()

    # Search for active BLGU users
    users, total = user_service.get_users(
        db_session, role=UserRole.BLGU_USER.value, is_active=True, search="BLGU"
    )

    assert all(user.role == UserRole.BLGU_USER for user in users)
    assert all(user.is_active for user in users)
    assert all("BLGU" in user.name for user in users)


# ====================================================================
# Create User Tests
# ====================================================================


def test_create_user_admin_success(db_session: Session):
    """Test creating a new user with admin privileges"""
    user_data = UserAdminCreate(
        email="newuser@example.com",
        name="New User",
        password="password123",
        role=UserRole.BLGU_USER,
        barangay_id=1,  # Required for BLGU_USER role
    )

    result = user_service.create_user_admin(db_session, user_data)

    assert result.id is not None
    assert result.email == "newuser@example.com"
    assert result.name == "New User"
    assert result.role == UserRole.BLGU_USER
    assert result.is_active is True
    assert verify_password("password123", result.hashed_password)


def test_create_user_admin_duplicate_email_raises_error(
    db_session: Session, sample_user: User
):
    """Test that creating user with duplicate email raises error"""
    user_data = UserAdminCreate(
        email="sample@example.com",  # Duplicate
        name="Another User",
        password="password123",
        role=UserRole.BLGU_USER,
    )

    with pytest.raises(HTTPException) as exc_info:
        user_service.create_user_admin(db_session, user_data)

    assert exc_info.value.status_code == 400
    assert "Email already registered" in exc_info.value.detail


def test_create_user_admin_validator_requires_validator_area(
    db_session: Session
):
    """Test that creating Validator requires validator_area_id"""
    user_data = UserAdminCreate(
        email="validator@example.com",
        name="Validator User",
        password="password123",
        role=UserRole.VALIDATOR,
        validator_area_id=None,  # Missing required field
    )

    with pytest.raises(HTTPException) as exc_info:
        user_service.create_user_admin(db_session, user_data)

    assert exc_info.value.status_code == 400
    assert "Governance area is required" in exc_info.value.detail


def test_create_user_admin_sets_validator_area_null_for_non_validators(
    db_session: Session
):
    """Test that validator_area_id is set to null for non-validator roles"""
    user_data = UserAdminCreate(
        email="blgu@example.com",
        name="BLGU User",
        password="password123",
        role=UserRole.BLGU_USER,
        validator_area_id=1,  # This should be ignored
        barangay_id=1,  # Required for BLGU_USER role
    )

    result = user_service.create_user_admin(db_session, user_data)

    assert result.validator_area_id is None


def test_create_katuparan_center_user_without_assignments(db_session: Session):
    """Test creating Katuparan Center user without validator_area_id or barangay_id"""
    user_data = UserAdminCreate(
        email="katuparan@sulop.gov.ph",
        name="Katuparan Center User",
        password="password123",
        role=UserRole.KATUPARAN_CENTER_USER,
    )

    result = user_service.create_user_admin(db_session, user_data)

    assert result.id is not None
    assert result.email == "katuparan@sulop.gov.ph"
    assert result.role == UserRole.KATUPARAN_CENTER_USER
    assert result.validator_area_id is None
    assert result.barangay_id is None
    assert result.is_active is True


def test_create_katuparan_center_user_clears_assignments(db_session: Session):
    """Test that creating Katuparan Center user clears any provided assignments"""
    user_data = UserAdminCreate(
        email="katuparan2@sulop.gov.ph",
        name="Katuparan Center User 2",
        password="password123",
        role=UserRole.KATUPARAN_CENTER_USER,
        validator_area_id=1,  # Should be cleared
        barangay_id=1,  # Should be cleared
    )

    result = user_service.create_user_admin(db_session, user_data)

    assert result.role == UserRole.KATUPARAN_CENTER_USER
    assert result.validator_area_id is None
    assert result.barangay_id is None


# ====================================================================
# Update User Tests
# ====================================================================


def test_update_user_success(db_session: Session, sample_user: User):
    """Test updating user information"""
    update_data = UserUpdate(name="Updated Name")

    result = user_service.update_user(db_session, sample_user.id, update_data)

    assert result is not None
    assert result.name == "Updated Name"
    assert result.email == "sample@example.com"  # Unchanged


def test_update_user_not_found(db_session: Session):
    """Test updating non-existent user returns None"""
    update_data = UserUpdate(name="New Name")

    result = user_service.update_user(db_session, 99999, update_data)

    assert result is None


def test_update_user_email_uniqueness_check(
    db_session: Session, sample_user: User, admin_user: User
):
    """Test that updating email checks for uniqueness"""
    update_data = UserUpdate(email="admin@example.com")  # Already exists

    with pytest.raises(HTTPException) as exc_info:
        user_service.update_user(db_session, sample_user.id, update_data)

    assert exc_info.value.status_code == 400
    assert "Email already registered" in exc_info.value.detail


def test_update_user_admin_success(db_session: Session, sample_user: User):
    """Test updating user with admin privileges"""
    # sample_user is BLGU_USER, so needs barangay_id
    sample_user.barangay_id = 1
    db_session.commit()

    # Just update name without changing role
    update_data = UserAdminUpdate(
        name="Admin Updated Name"
    )

    result = user_service.update_user_admin(db_session, sample_user.id, update_data)

    assert result is not None
    assert result.name == "Admin Updated Name"
    assert result.role == UserRole.BLGU_USER  # Role should remain unchanged


def test_update_user_admin_not_found(db_session: Session):
    """Test updating non-existent user with admin method returns None"""
    update_data = UserAdminUpdate(name="New Name")

    result = user_service.update_user_admin(db_session, 99999, update_data)

    assert result is None


def test_update_user_admin_validator_requires_validator_area(
    db_session: Session, sample_user: User
):
    """Test that changing to Validator role requires validator_area_id"""
    # User doesn't have validator_area_id and we're not providing one
    update_data = UserAdminUpdate(role=UserRole.VALIDATOR)

    with pytest.raises(HTTPException) as exc_info:
        user_service.update_user_admin(db_session, sample_user.id, update_data)

    assert exc_info.value.status_code == 400
    assert "Governance area is required" in exc_info.value.detail


def test_update_user_admin_clears_barangay_for_validator(
    db_session: Session, sample_user: User
):
    """Test that changing to Validator role clears barangay_id"""
    # Give user a barangay_id first
    sample_user.barangay_id = 1
    db_session.commit()

    update_data = UserAdminUpdate(
        role=UserRole.VALIDATOR, validator_area_id=1
    )

    result = user_service.update_user_admin(db_session, sample_user.id, update_data)

    assert result.role == UserRole.VALIDATOR
    assert result.barangay_id is None


def test_update_user_admin_clears_validator_area_for_non_validator(
    db_session: Session
):
    """Test that changing from Validator to other role clears validator_area_id"""
    # Create a validator with governance area
    validator = User(
        email="validator@example.com",
        name="Validator",
        hashed_password=get_password_hash("pass"),
        role=UserRole.VALIDATOR,
        validator_area_id=1,
        is_active=True,
    )
    db_session.add(validator)
    db_session.commit()
    db_session.refresh(validator)

    update_data = UserAdminUpdate(
        role=UserRole.BLGU_USER,
        barangay_id=1  # Required for BLGU_USER role
    )

    result = user_service.update_user_admin(db_session, validator.id, update_data)

    assert result.role == UserRole.BLGU_USER
    assert result.validator_area_id is None


def test_update_user_to_katuparan_center_clears_assignments(
    db_session: Session, sample_user: User
):
    """Test that changing to Katuparan Center role clears both assignments"""
    # Give user both assignments
    sample_user.validator_area_id = 1
    sample_user.barangay_id = 1
    db_session.commit()

    update_data = UserAdminUpdate(role=UserRole.KATUPARAN_CENTER_USER)

    result = user_service.update_user_admin(db_session, sample_user.id, update_data)

    assert result.role == UserRole.KATUPARAN_CENTER_USER
    assert result.validator_area_id is None
    assert result.barangay_id is None


# ====================================================================
# Deactivate/Activate User Tests
# ====================================================================


def test_deactivate_user_success(db_session: Session, sample_user: User):
    """Test deactivating a user"""
    result = user_service.deactivate_user(db_session, sample_user.id)

    assert result is not None
    assert result.is_active is False


def test_deactivate_user_not_found(db_session: Session):
    """Test deactivating non-existent user returns None"""
    result = user_service.deactivate_user(db_session, 99999)

    assert result is None


def test_activate_user_success(db_session: Session, inactive_user: User):
    """Test activating an inactive user"""
    result = user_service.activate_user(db_session, inactive_user.id)

    assert result is not None
    assert result.is_active is True


def test_activate_user_not_found(db_session: Session):
    """Test activating non-existent user returns None"""
    result = user_service.activate_user(db_session, 99999)

    assert result is None


# ====================================================================
# Password Management Tests
# ====================================================================


def test_change_password_success(db_session: Session, sample_user: User):
    """Test changing user password"""
    result = user_service.change_password(
        db_session, sample_user.id, "password123", "newpassword456"
    )

    assert result is True

    # Verify new password works
    db_session.refresh(sample_user)
    assert verify_password("newpassword456", sample_user.hashed_password)
    assert sample_user.must_change_password is False


def test_change_password_incorrect_current_password(
    db_session: Session, sample_user: User
):
    """Test changing password with wrong current password fails"""
    result = user_service.change_password(
        db_session, sample_user.id, "wrongpassword", "newpassword456"
    )

    assert result is False


def test_change_password_user_not_found(db_session: Session):
    """Test changing password for non-existent user returns False"""
    result = user_service.change_password(
        db_session, 99999, "oldpass", "newpass"
    )

    assert result is False


def test_reset_password_success(db_session: Session, sample_user: User):
    """Test admin resetting user password"""
    result = user_service.reset_password(
        db_session, sample_user.id, "resetpassword123"
    )

    assert result is not None

    # Verify new password works
    db_session.refresh(sample_user)
    assert verify_password("resetpassword123", sample_user.hashed_password)
    assert sample_user.must_change_password is True


def test_reset_password_user_not_found(db_session: Session):
    """Test resetting password for non-existent user returns None"""
    result = user_service.reset_password(db_session, 99999, "newpass")

    assert result is None


# ====================================================================
# Get User Stats Tests
# ====================================================================


def test_get_user_stats(
    db_session: Session, sample_user: User, inactive_user: User, admin_user: User
):
    """Test getting user statistics"""
    stats = user_service.get_user_stats(db_session)

    assert "total_users" in stats
    assert "active_users" in stats
    assert "inactive_users" in stats
    assert "users_need_password_change" in stats
    assert "users_by_role" in stats

    assert stats["total_users"] >= 3
    assert stats["active_users"] >= 2  # sample_user and admin_user
    assert stats["inactive_users"] >= 1  # inactive_user


def test_get_user_stats_tracks_password_change_requirement(db_session: Session):
    """Test that stats correctly count users needing password change"""
    # Create user who must change password
    user_needs_change = User(
        email="needschange@example.com",
        name="Needs Change",
        hashed_password=get_password_hash("temp"),
        role=UserRole.BLGU_USER,
        is_active=True,
        must_change_password=True,
    )
    db_session.add(user_needs_change)
    db_session.commit()

    stats = user_service.get_user_stats(db_session)

    assert stats["users_need_password_change"] >= 1


def test_get_user_stats_users_by_role(
    db_session: Session, sample_user: User, admin_user: User
):
    """Test that stats correctly count users by role"""
    stats = user_service.get_user_stats(db_session)

    assert UserRole.BLGU_USER in stats["users_by_role"]
    assert UserRole.MLGOO_DILG in stats["users_by_role"]
    assert stats["users_by_role"][UserRole.BLGU_USER] >= 1
    assert stats["users_by_role"][UserRole.MLGOO_DILG] >= 1


def test_get_user_stats_empty_database(db_session: Session):
    """Test getting stats from empty database"""
    stats = user_service.get_user_stats(db_session)

    assert stats["total_users"] == 0
    assert stats["active_users"] == 0
    assert stats["inactive_users"] == 0
    assert stats["users_need_password_change"] == 0
    assert stats["users_by_role"] == {}
