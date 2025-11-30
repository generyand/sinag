"""
Tests for user service FK (Foreign Key) existence validation
Tests that the service layer validates validator_area_id and barangay_id references
"""

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models.user import User
from app.db.models.governance_area import GovernanceArea
from app.db.models.barangay import Barangay
from app.db.enums import UserRole
from app.services.user_service import user_service
from app.schemas.user import UserAdminCreate, UserAdminUpdate
from app.core.security import get_password_hash


# ====================================================================
# Test Fixtures
# ====================================================================


@pytest.fixture
def governance_area(db_session: Session):
    """Create a governance area for testing."""
    from app.db.enums import AreaType

    area = GovernanceArea(
        id=1,
        name="Test Governance Area",
        code="FI",
        area_type=AreaType.CORE,
    )
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    return area


@pytest.fixture
def barangay(db_session: Session):
    """Create a barangay for testing."""
    brgy = Barangay(
        id=1,
        name="Test Barangay",
        # Add other required fields as needed
    )
    db_session.add(brgy)
    db_session.commit()
    db_session.refresh(brgy)
    return brgy


@pytest.fixture
def sample_user(db_session: Session, barangay: Barangay):
    """Create a sample user for update tests."""
    user = User(
        email="sample@example.com",
        name="Sample User",
        hashed_password=get_password_hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# ====================================================================
# FK Validation Tests for User Creation
# ====================================================================


class TestCreateUserFKValidation:
    """Test FK validation when creating users."""

    def test_create_validator_with_valid_governance_area(
        self, db_session: Session, governance_area: GovernanceArea
    ):
        """Test creating VALIDATOR with existing governance area succeeds."""
        user_data = UserAdminCreate(
            email="validator@example.com",
            name="Validator User",
            password="ValidPass123",
            role=UserRole.VALIDATOR,
            validator_area_id=governance_area.id,
        )

        result = user_service.create_user_admin(db_session, user_data)

        assert result.id is not None
        assert result.role == UserRole.VALIDATOR
        assert result.validator_area_id == governance_area.id

    def test_create_validator_with_nonexistent_governance_area(
        self, db_session: Session
    ):
        """Test creating VALIDATOR with non-existent governance area fails."""
        user_data = UserAdminCreate(
            email="validator@example.com",
            name="Validator User",
            password="ValidPass123",
            role=UserRole.VALIDATOR,
            validator_area_id=99999,  # Non-existent ID
        )

        with pytest.raises(HTTPException) as exc_info:
            user_service.create_user_admin(db_session, user_data)

        assert exc_info.value.status_code == 400
        assert "Governance area with ID 99999 does not exist" in exc_info.value.detail

    def test_create_blgu_user_with_valid_barangay(
        self, db_session: Session, barangay: Barangay
    ):
        """Test creating BLGU_USER with existing barangay succeeds."""
        user_data = UserAdminCreate(
            email="blgu@example.com",
            name="BLGU User",
            password="ValidPass123",
            role=UserRole.BLGU_USER,
            barangay_id=barangay.id,
        )

        result = user_service.create_user_admin(db_session, user_data)

        assert result.id is not None
        assert result.role == UserRole.BLGU_USER
        assert result.barangay_id == barangay.id

    def test_create_blgu_user_with_nonexistent_barangay(
        self, db_session: Session
    ):
        """Test creating BLGU_USER with non-existent barangay fails."""
        user_data = UserAdminCreate(
            email="blgu@example.com",
            name="BLGU User",
            password="ValidPass123",
            role=UserRole.BLGU_USER,
            barangay_id=99999,  # Non-existent ID
        )

        with pytest.raises(HTTPException) as exc_info:
            user_service.create_user_admin(db_session, user_data)

        assert exc_info.value.status_code == 400
        assert "Barangay with ID 99999 does not exist" in exc_info.value.detail

    def test_create_assessor_does_not_validate_fks(
        self, db_session: Session
    ):
        """Test creating ASSESSOR ignores FK assignments (no validation needed)."""
        user_data = UserAdminCreate(
            email="assessor@example.com",
            name="Assessor User",
            password="ValidPass123",
            role=UserRole.ASSESSOR,
            # No validator_area_id or barangay_id
        )

        result = user_service.create_user_admin(db_session, user_data)

        assert result.id is not None
        assert result.role == UserRole.ASSESSOR
        assert result.validator_area_id is None
        assert result.barangay_id is None

    def test_create_mlgoo_dilg_does_not_validate_fks(
        self, db_session: Session
    ):
        """Test creating MLGOO_DILG ignores FK assignments (no validation needed)."""
        user_data = UserAdminCreate(
            email="admin@example.com",
            name="Admin User",
            password="ValidPass123",
            role=UserRole.MLGOO_DILG,
            # No validator_area_id or barangay_id
        )

        result = user_service.create_user_admin(db_session, user_data)

        assert result.id is not None
        assert result.role == UserRole.MLGOO_DILG
        assert result.validator_area_id is None
        assert result.barangay_id is None


# ====================================================================
# FK Validation Tests for User Updates
# ====================================================================


class TestUpdateUserFKValidation:
    """Test FK validation when updating users."""

    def test_update_user_to_validator_with_valid_governance_area(
        self, db_session: Session, sample_user: User, governance_area: GovernanceArea
    ):
        """Test updating to VALIDATOR with existing governance area succeeds."""
        update_data = UserAdminUpdate(
            role=UserRole.VALIDATOR,
            validator_area_id=governance_area.id,
        )

        result = user_service.update_user_admin(db_session, sample_user.id, update_data)

        assert result is not None
        assert result.role == UserRole.VALIDATOR
        assert result.validator_area_id == governance_area.id
        assert result.barangay_id is None  # Should be cleared

    def test_update_user_to_validator_with_nonexistent_governance_area(
        self, db_session: Session, sample_user: User
    ):
        """Test updating to VALIDATOR with non-existent governance area fails."""
        update_data = UserAdminUpdate(
            role=UserRole.VALIDATOR,
            validator_area_id=99999,  # Non-existent ID
        )

        with pytest.raises(HTTPException) as exc_info:
            user_service.update_user_admin(db_session, sample_user.id, update_data)

        assert exc_info.value.status_code == 400
        assert "Governance area with ID 99999 does not exist" in exc_info.value.detail

    def test_update_validator_area_with_valid_id(
        self, db_session: Session, governance_area: GovernanceArea
    ):
        """Test updating validator_area_id with existing area succeeds."""
        # Create a validator first
        validator = User(
            email="validator@example.com",
            name="Validator User",
            hashed_password=get_password_hash("password123"),
            role=UserRole.VALIDATOR,
            validator_area_id=governance_area.id,
            is_active=True,
        )
        db_session.add(validator)
        db_session.commit()
        db_session.refresh(validator)

        # Create another governance area
        from app.db.enums import AreaType

        new_area = GovernanceArea(
            id=2,
            name="New Governance Area",
            code="SA",
            area_type=AreaType.CORE,
        )
        db_session.add(new_area)
        db_session.commit()

        # Update to new area
        update_data = UserAdminUpdate(validator_area_id=new_area.id)

        result = user_service.update_user_admin(db_session, validator.id, update_data)

        assert result is not None
        assert result.validator_area_id == new_area.id

    def test_update_validator_area_with_nonexistent_id(
        self, db_session: Session, governance_area: GovernanceArea
    ):
        """Test updating validator_area_id with non-existent area fails."""
        # Create a validator first
        validator = User(
            email="validator@example.com",
            name="Validator User",
            hashed_password=get_password_hash("password123"),
            role=UserRole.VALIDATOR,
            validator_area_id=governance_area.id,
            is_active=True,
        )
        db_session.add(validator)
        db_session.commit()
        db_session.refresh(validator)

        # Try to update to non-existent area
        update_data = UserAdminUpdate(validator_area_id=99999)

        with pytest.raises(HTTPException) as exc_info:
            user_service.update_user_admin(db_session, validator.id, update_data)

        assert exc_info.value.status_code == 400
        assert "Governance area with ID 99999 does not exist" in exc_info.value.detail

    def test_update_user_to_blgu_with_valid_barangay(
        self, db_session: Session, barangay: Barangay, governance_area: GovernanceArea
    ):
        """Test updating to BLGU_USER with existing barangay succeeds."""
        # Create a validator first
        validator = User(
            email="validator@example.com",
            name="Validator User",
            hashed_password=get_password_hash("password123"),
            role=UserRole.VALIDATOR,
            validator_area_id=governance_area.id,
            is_active=True,
        )
        db_session.add(validator)
        db_session.commit()
        db_session.refresh(validator)

        # Update to BLGU_USER
        update_data = UserAdminUpdate(
            role=UserRole.BLGU_USER,
            barangay_id=barangay.id,
        )

        result = user_service.update_user_admin(db_session, validator.id, update_data)

        assert result is not None
        assert result.role == UserRole.BLGU_USER
        assert result.barangay_id == barangay.id
        assert result.validator_area_id is None  # Should be cleared

    def test_update_user_to_blgu_with_nonexistent_barangay(
        self, db_session: Session, sample_user: User
    ):
        """Test updating to BLGU_USER with non-existent barangay fails."""
        update_data = UserAdminUpdate(
            role=UserRole.BLGU_USER,
            barangay_id=99999,  # Non-existent ID
        )

        with pytest.raises(HTTPException) as exc_info:
            user_service.update_user_admin(db_session, sample_user.id, update_data)

        assert exc_info.value.status_code == 400
        assert "Barangay with ID 99999 does not exist" in exc_info.value.detail

    def test_update_barangay_with_valid_id(
        self, db_session: Session, sample_user: User
    ):
        """Test updating barangay_id with existing barangay succeeds."""
        # Create another barangay
        new_barangay = Barangay(
            id=2,
            name="New Barangay",
        )
        db_session.add(new_barangay)
        db_session.commit()

        # Update to new barangay
        update_data = UserAdminUpdate(barangay_id=new_barangay.id)

        result = user_service.update_user_admin(db_session, sample_user.id, update_data)

        assert result is not None
        assert result.barangay_id == new_barangay.id

    def test_update_barangay_with_nonexistent_id(
        self, db_session: Session, sample_user: User
    ):
        """Test updating barangay_id with non-existent barangay fails."""
        update_data = UserAdminUpdate(barangay_id=99999)

        with pytest.raises(HTTPException) as exc_info:
            user_service.update_user_admin(db_session, sample_user.id, update_data)

        assert exc_info.value.status_code == 400
        assert "Barangay with ID 99999 does not exist" in exc_info.value.detail


# ====================================================================
# Edge Case FK Validation Tests
# ====================================================================


class TestFKValidationEdgeCases:
    """Test edge cases for FK validation."""

    def test_validator_without_area_initially_then_update_with_valid_area(
        self, db_session: Session, governance_area: GovernanceArea
    ):
        """Test that validator_area_id requirement is checked at service level."""
        # This should fail at service level (validator requires area)
        user_data = UserAdminCreate(
            email="validator@example.com",
            name="Validator User",
            password="ValidPass123",
            role=UserRole.VALIDATOR,
            validator_area_id=None,  # Missing required field
        )

        with pytest.raises(HTTPException) as exc_info:
            user_service.create_user_admin(db_session, user_data)

        assert exc_info.value.status_code == 400
        assert "Governance area is required" in exc_info.value.detail

    def test_blgu_user_without_barangay_initially(
        self, db_session: Session
    ):
        """Test that barangay_id requirement is checked at service level."""
        # This should fail at service level (BLGU_USER requires barangay)
        user_data = UserAdminCreate(
            email="blgu@example.com",
            name="BLGU User",
            password="ValidPass123",
            role=UserRole.BLGU_USER,
            barangay_id=None,  # Missing required field
        )

        with pytest.raises(HTTPException) as exc_info:
            user_service.create_user_admin(db_session, user_data)

        assert exc_info.value.status_code == 400
        assert "Barangay is required" in exc_info.value.detail

    def test_validator_keeps_existing_area_when_not_updated(
        self, db_session: Session, governance_area: GovernanceArea
    ):
        """Test that validator keeps existing area when updating other fields."""
        # Create validator
        validator = User(
            email="validator@example.com",
            name="Validator User",
            hashed_password=get_password_hash("password123"),
            role=UserRole.VALIDATOR,
            validator_area_id=governance_area.id,
            is_active=True,
        )
        db_session.add(validator)
        db_session.commit()
        db_session.refresh(validator)

        # Update only name (validator_area_id not provided in update)
        update_data = UserAdminUpdate(name="Updated Validator Name")

        result = user_service.update_user_admin(db_session, validator.id, update_data)

        assert result is not None
        assert result.name == "Updated Validator Name"
        assert result.validator_area_id == governance_area.id  # Should remain unchanged

    def test_blgu_user_keeps_existing_barangay_when_not_updated(
        self, db_session: Session, sample_user: User, barangay: Barangay
    ):
        """Test that BLGU_USER keeps existing barangay when updating other fields."""
        # Update only name (barangay_id not provided in update)
        update_data = UserAdminUpdate(name="Updated BLGU Name")

        result = user_service.update_user_admin(db_session, sample_user.id, update_data)

        assert result is not None
        assert result.name == "Updated BLGU Name"
        assert result.barangay_id == barangay.id  # Should remain unchanged
