"""
Tests for FastAPI dependency functions (app/api/deps.py)
"""

import uuid

import pytest
from fastapi import HTTPException
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.api.deps import get_current_external_user
from app.db.enums import UserRole
from app.db.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ====================================================================
# Test Fixtures
# ====================================================================


@pytest.fixture
def katuparan_user(db_session: Session):
    """Create a Katuparan Center user for testing"""
    unique_email = f"katuparan_{uuid.uuid4().hex[:8]}@sulop.gov.ph"

    user = User(
        email=unique_email,
        name="Katuparan Center User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.KATUPARAN_CENTER_USER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def mlgoo_user(db_session: Session):
    """Create a MLGOO_DILG admin user for testing"""
    unique_email = f"mlgoo_{uuid.uuid4().hex[:8]}@dilg.gov.ph"

    user = User(
        email=unique_email,
        name="MLGOO Admin User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.MLGOO_DILG,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def validator_user(db_session: Session):
    """Create a Validator user for testing"""
    from app.db.enums import AreaType
    from app.db.models.governance_area import GovernanceArea

    unique_email = f"validator_{uuid.uuid4().hex[:8]}@dilg.gov.ph"

    # Create governance area first
    unique_code = uuid.uuid4().hex[:2].upper()
    governance_area = GovernanceArea(
        name=f"Test Governance Area {uuid.uuid4().hex[:8]}",
        code=unique_code,
        area_type=AreaType.CORE,
    )
    db_session.add(governance_area)
    db_session.commit()
    db_session.refresh(governance_area)

    user = User(
        email=unique_email,
        name="Validator User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.VALIDATOR,
        validator_area_id=governance_area.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def assessor_user(db_session: Session):
    """Create an Assessor user for testing"""
    unique_email = f"assessor_{uuid.uuid4().hex[:8]}@dilg.gov.ph"

    user = User(
        email=unique_email,
        name="Assessor User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.ASSESSOR,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def blgu_user(db_session: Session):
    """Create a BLGU user for testing"""
    from app.db.models.barangay import Barangay

    unique_email = f"blgu_{uuid.uuid4().hex[:8]}@example.com"

    # Create barangay first
    barangay = Barangay(name=f"Test Barangay {uuid.uuid4().hex[:8]}")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)

    user = User(
        email=unique_email,
        name="BLGU User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# ====================================================================
# get_current_external_user Tests
# ====================================================================


@pytest.mark.asyncio
async def test_get_current_external_user_allows_katuparan_center_user(
    katuparan_user: User,
):
    """Test that KATUPARAN_CENTER_USER role is allowed"""
    result = await get_current_external_user(current_user=katuparan_user)

    assert result.id == katuparan_user.id
    assert result.role == UserRole.KATUPARAN_CENTER_USER


@pytest.mark.asyncio
async def test_get_current_external_user_denies_mlgoo_dilg(mlgoo_user: User):
    """Test that MLGOO_DILG role is denied access"""
    with pytest.raises(HTTPException) as exc_info:
        await get_current_external_user(current_user=mlgoo_user)

    assert exc_info.value.status_code == 403
    assert "Not enough permissions" in exc_info.value.detail
    assert "External stakeholder access required" in exc_info.value.detail


@pytest.mark.asyncio
async def test_get_current_external_user_denies_validator(validator_user: User):
    """Test that VALIDATOR role is denied access"""
    with pytest.raises(HTTPException) as exc_info:
        await get_current_external_user(current_user=validator_user)

    assert exc_info.value.status_code == 403
    assert "Not enough permissions" in exc_info.value.detail


@pytest.mark.asyncio
async def test_get_current_external_user_denies_assessor(assessor_user: User):
    """Test that ASSESSOR role is denied access"""
    with pytest.raises(HTTPException) as exc_info:
        await get_current_external_user(current_user=assessor_user)

    assert exc_info.value.status_code == 403
    assert "Not enough permissions" in exc_info.value.detail


@pytest.mark.asyncio
async def test_get_current_external_user_denies_blgu_user(blgu_user: User):
    """Test that BLGU_USER role is denied access"""
    with pytest.raises(HTTPException) as exc_info:
        await get_current_external_user(current_user=blgu_user)

    assert exc_info.value.status_code == 403
    assert "Not enough permissions" in exc_info.value.detail


@pytest.mark.asyncio
async def test_get_current_external_user_only_allows_katuparan_center_user(
    db_session: Session,
):
    """Test that only KATUPARAN_CENTER_USER role is allowed (comprehensive test)"""
    # Test all roles except KATUPARAN_CENTER_USER should be denied
    denied_roles = [
        UserRole.MLGOO_DILG,
        UserRole.VALIDATOR,
        UserRole.ASSESSOR,
        UserRole.BLGU_USER,
    ]

    for role in denied_roles:
        unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
        user = User(
            email=unique_email,
            name=f"Test User {role.value}",
            hashed_password=pwd_context.hash("password123"),
            role=role,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        with pytest.raises(HTTPException) as exc_info:
            await get_current_external_user(current_user=user)

        assert exc_info.value.status_code == 403, f"Role {role.value} should be denied"
        assert "Not enough permissions" in exc_info.value.detail

    # Clean up after test
    db_session.rollback()


# ====================================================================
# UMDC Role Removal Verification Tests
# ====================================================================


def test_umdc_peace_center_user_role_does_not_exist():
    """Test that UMDC_PEACE_CENTER_USER role no longer exists in UserRole enum"""
    # Verify UMDC_PEACE_CENTER_USER is not in UserRole enum
    role_values = [role.value for role in UserRole]
    assert "UMDC_PEACE_CENTER_USER" not in role_values

    # Verify only expected roles exist
    expected_roles = [
        "MLGOO_DILG",
        "VALIDATOR",
        "ASSESSOR",
        "BLGU_USER",
        "KATUPARAN_CENTER_USER",
    ]
    assert set(role_values) == set(expected_roles)


def test_katuparan_center_user_role_exists():
    """Test that KATUPARAN_CENTER_USER role exists in UserRole enum"""
    assert hasattr(UserRole, "KATUPARAN_CENTER_USER")
    assert UserRole.KATUPARAN_CENTER_USER.value == "KATUPARAN_CENTER_USER"
