"""
🧪 Indicator Draft Service Tests
Tests for Phase 6: Draft Auto-Save with Optimistic Locking

Tests:
- Draft creation
- Draft saving with version control
- Optimistic locking
- Draft listing and retrieval
- Lock management
"""

from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException

from app.core.security import get_password_hash
from app.db.enums import UserRole
from app.db.models.governance_area import GovernanceArea, IndicatorDraft
from app.db.models.user import User
from app.services.indicator_draft_service import indicator_draft_service


@pytest.fixture
def test_user(db_session):
    """Create a test MLGOO_DILG user."""
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password=get_password_hash("password"),
        role=UserRole.MLGOO_DILG,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def second_test_user(db_session):
    """Create a second test user."""
    user = User(
        email="test2@example.com",
        name="Test User 2",
        hashed_password=get_password_hash("password"),
        role=UserRole.MLGOO_DILG,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_governance_area(db_session):
    """Create a test governance area."""
    from app.db.enums import AreaType

    area = GovernanceArea(id=1, code="T1", name="Test Governance Area", area_type=AreaType.CORE)
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    return area


class TestDraftCreation:
    """Tests for draft creation."""

    def test_create_draft_basic(self, db_session, test_user, test_governance_area):
        """Test creating a basic draft."""
        draft = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=test_governance_area.id,
            creation_mode="incremental",
            title="Test Draft",
            data=[],
        )

        assert draft is not None
        assert draft.user_id == test_user.id
        assert draft.governance_area_id == test_governance_area.id
        assert draft.creation_mode == "incremental"
        assert draft.title == "Test Draft"
        assert draft.status == "in_progress"
        assert draft.current_step == 1
        assert draft.version == 1
        assert draft.data == []

    def test_create_draft_with_initial_data(self, db_session, test_user, test_governance_area):
        """Test creating a draft with initial data."""
        initial_data = [{"temp_id": "test-1", "name": "Test Indicator"}]

        draft = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=test_governance_area.id,
            creation_mode="bulk_import",
            data=initial_data,
        )

        assert draft.data == initial_data
        assert draft.creation_mode == "bulk_import"

    def test_create_draft_invalid_governance_area(self, db_session, test_user):
        """Test that invalid governance area is rejected."""
        with pytest.raises(HTTPException) as exc_info:
            indicator_draft_service.create_draft(
                db=db_session,
                user_id=test_user.id,
                governance_area_id=9999,  # Invalid
                creation_mode="incremental",
            )

        assert exc_info.value.status_code == 404
        assert "Governance area" in str(exc_info.value.detail)

    def test_create_draft_invalid_user(self, db_session, test_governance_area):
        """Test that invalid user is rejected."""
        with pytest.raises(HTTPException) as exc_info:
            indicator_draft_service.create_draft(
                db=db_session,
                user_id=9999,  # Invalid
                governance_area_id=test_governance_area.id,
                creation_mode="incremental",
            )

        assert exc_info.value.status_code == 404
        assert "User" in str(exc_info.value.detail)


class TestDraftSaving:
    """Tests for draft saving with optimistic locking."""

    def test_save_draft_basic(self, db_session, test_user, test_governance_area):
        """Test basic draft saving."""
        # Create draft
        draft = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=test_governance_area.id,
            creation_mode="incremental",
        )

        # Update draft
        update_data = {
            "current_step": 2,
            "title": "Updated Title",
            "data": [{"temp_id": "new-1", "name": "New Indicator"}],
        }

        updated_draft = indicator_draft_service.save_draft(
            db=db_session,
            draft_id=draft.id,
            user_id=test_user.id,
            update_data=update_data,
            version=draft.version,
        )

        assert updated_draft.current_step == 2
        assert updated_draft.title == "Updated Title"
        assert len(updated_draft.data) == 1
        assert updated_draft.version == 2  # Version incremented

    def test_optimistic_locking_version_conflict(self, db_session, test_user, test_governance_area):
        """Test that version conflicts are detected."""
        # Create draft
        draft = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=test_governance_area.id,
            creation_mode="incremental",
        )

        # First update (version 1 -> 2)
        indicator_draft_service.save_draft(
            db=db_session,
            draft_id=draft.id,
            user_id=test_user.id,
            update_data={"title": "First Update"},
            version=1,
        )

        # Second update with wrong version (should fail)
        with pytest.raises(HTTPException) as exc_info:
            indicator_draft_service.save_draft(
                db=db_session,
                draft_id=draft.id,
                user_id=test_user.id,
                update_data={"title": "Second Update"},
                version=1,  # Wrong version (should be 2)
            )

        assert exc_info.value.status_code == 409
        assert "Version conflict" in str(exc_info.value.detail)

    def test_save_draft_wrong_user(
        self, db_session, test_user, second_test_user, test_governance_area
    ):
        """Test that users can't edit other user's drafts."""
        # Create draft as user 1
        draft = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=test_governance_area.id,
            creation_mode="incremental",
        )

        # Try to update as user 2
        with pytest.raises(HTTPException) as exc_info:
            indicator_draft_service.save_draft(
                db=db_session,
                draft_id=draft.id,
                user_id=second_test_user.id,  # Different user
                update_data={"title": "Hacker Update"},
                version=1,
            )

        assert exc_info.value.status_code == 403
        assert "permission" in str(exc_info.value.detail).lower()


class TestDraftLocking:
    """Tests for draft locking mechanism."""

    def test_lock_acquisition_on_save(self, db_session, test_user, test_governance_area):
        """Test that lock is acquired when saving."""
        draft = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=test_governance_area.id,
            creation_mode="incremental",
        )

        # Save draft (should acquire lock)
        updated_draft = indicator_draft_service.save_draft(
            db=db_session,
            draft_id=draft.id,
            user_id=test_user.id,
            update_data={"title": "Updated"},
            version=1,
        )

        assert updated_draft.lock_token is not None
        assert updated_draft.locked_by_user_id == test_user.id
        assert updated_draft.locked_at is not None

    def test_lock_blocks_other_users(
        self, db_session, test_user, second_test_user, test_governance_area
    ):
        """Test that locked draft blocks other users."""
        # Create draft and lock it
        draft = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=test_governance_area.id,
            creation_mode="incremental",
        )

        # Lock it by saving
        indicator_draft_service.save_draft(
            db=db_session,
            draft_id=draft.id,
            user_id=test_user.id,
            update_data={"title": "Locked"},
            version=1,
        )

        # Manually change owner to test lock blocking
        db_session.query(IndicatorDraft).filter(IndicatorDraft.id == draft.id).update(
            {"user_id": second_test_user.id}
        )
        db_session.commit()

        # Try to save as second user (should be blocked by lock)
        with pytest.raises(HTTPException) as exc_info:
            indicator_draft_service.save_draft(
                db=db_session,
                draft_id=draft.id,
                user_id=second_test_user.id,
                update_data={"title": "Blocked Update"},
                version=2,
            )

        assert exc_info.value.status_code == 423  # Locked
        assert "locked" in str(exc_info.value.detail).lower()

    def test_lock_expiration(self, db_session, test_user, test_governance_area):
        """Test that expired locks are released when a different user tries to save."""
        # Create another user
        other_user = User(
            email="other@test.com",
            name="Other User",
            hashed_password=get_password_hash("password"),
            role=UserRole.MLGOO_DILG,
            is_active=True,
        )
        db_session.add(other_user)
        db_session.commit()
        db_session.refresh(other_user)

        # User 1 creates and locks draft
        draft = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=test_governance_area.id,
            creation_mode="incremental",
        )

        locked_draft = indicator_draft_service.save_draft(
            db=db_session,
            draft_id=draft.id,
            user_id=test_user.id,
            update_data={"title": "Locked by User 1"},
            version=1,
        )

        # Manually set lock time to 31 minutes ago (expired)
        expired_time = datetime.utcnow() - timedelta(minutes=31)
        db_session.query(IndicatorDraft).filter(IndicatorDraft.id == draft.id).update(
            {"locked_at": expired_time}
        )
        db_session.commit()

        # User 2 tries to save (should release expired lock and acquire new one)
        # Change draft ownership to user 2 first so they can save it
        db_session.query(IndicatorDraft).filter(IndicatorDraft.id == draft.id).update(
            {"user_id": other_user.id}
        )
        db_session.commit()

        updated_draft = indicator_draft_service.save_draft(
            db=db_session,
            draft_id=draft.id,
            user_id=other_user.id,
            update_data={"title": "Saved by User 2"},
            version=2,
        )

        # Lock should be renewed by user 2 with new timestamp
        assert updated_draft.lock_token is not None
        assert updated_draft.locked_by_user_id == other_user.id
        assert updated_draft.locked_at != expired_time

    def test_release_lock(self, db_session, test_user, test_governance_area):
        """Test manually releasing a lock."""
        # Create and lock draft
        draft = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=test_governance_area.id,
            creation_mode="incremental",
        )

        locked_draft = indicator_draft_service.save_draft(
            db=db_session,
            draft_id=draft.id,
            user_id=test_user.id,
            update_data={"title": "Locked"},
            version=1,
        )

        # Release lock
        released_draft = indicator_draft_service.release_lock(
            db=db_session, draft_id=draft.id, user_id=test_user.id
        )

        assert released_draft.lock_token is None
        assert released_draft.locked_by_user_id is None
        assert released_draft.locked_at is None

    def test_release_lock_not_holder(
        self, db_session, test_user, second_test_user, test_governance_area
    ):
        """Test that only lock holder can release."""
        # Create draft
        draft = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=test_governance_area.id,
            creation_mode="incremental",
        )

        # Lock it
        indicator_draft_service.save_draft(
            db=db_session,
            draft_id=draft.id,
            user_id=test_user.id,
            update_data={"title": "Locked"},
            version=1,
        )

        # Try to release as different user (change owner first)
        db_session.query(IndicatorDraft).filter(IndicatorDraft.id == draft.id).update(
            {"user_id": second_test_user.id}
        )
        db_session.commit()

        with pytest.raises(HTTPException) as exc_info:
            indicator_draft_service.release_lock(
                db=db_session, draft_id=draft.id, user_id=second_test_user.id
            )

        assert exc_info.value.status_code == 400
        assert "not held by you" in str(exc_info.value.detail).lower()


class TestDraftListing:
    """Tests for draft listing and retrieval."""

    def test_get_user_drafts(self, db_session, test_user, test_governance_area):
        """Test listing user's drafts."""
        # Create multiple drafts
        draft1 = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=test_governance_area.id,
            creation_mode="incremental",
            title="Draft 1",
        )

        draft2 = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=test_governance_area.id,
            creation_mode="bulk_import",
            title="Draft 2",
        )

        # Get user's drafts
        drafts = indicator_draft_service.get_user_drafts(db=db_session, user_id=test_user.id)

        assert len(drafts) == 2
        draft_ids = [d.id for d in drafts]
        assert draft1.id in draft_ids
        assert draft2.id in draft_ids

    def test_get_user_drafts_filtered_by_governance_area(self, db_session, test_user):
        """Test filtering drafts by governance area."""
        from app.db.enums import AreaType

        # Create two governance areas
        area1 = GovernanceArea(id=1, code="T1", name="Area 1", area_type=AreaType.CORE)
        area2 = GovernanceArea(id=2, code="T2", name="Area 2", area_type=AreaType.ESSENTIAL)
        db_session.add_all([area1, area2])
        db_session.commit()

        # Create drafts in different areas
        draft1 = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=area1.id,
            creation_mode="incremental",
        )

        draft2 = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=area2.id,
            creation_mode="incremental",
        )

        # Filter by area 1
        drafts = indicator_draft_service.get_user_drafts(
            db=db_session, user_id=test_user.id, governance_area_id=area1.id
        )

        assert len(drafts) == 1
        assert drafts[0].id == draft1.id

    def test_load_draft(self, db_session, test_user, test_governance_area):
        """Test loading a specific draft."""
        draft = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=test_governance_area.id,
            creation_mode="incremental",
            title="Test Draft",
        )

        # Load draft
        loaded_draft = indicator_draft_service.load_draft(
            db=db_session, draft_id=draft.id, user_id=test_user.id
        )

        assert loaded_draft.id == draft.id
        assert loaded_draft.title == "Test Draft"

    def test_delete_draft(self, db_session, test_user, test_governance_area):
        """Test deleting a draft."""
        draft = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=test_governance_area.id,
            creation_mode="incremental",
        )

        # Delete draft
        indicator_draft_service.delete_draft(db=db_session, draft_id=draft.id, user_id=test_user.id)

        # Verify deleted
        deleted = db_session.query(IndicatorDraft).filter(IndicatorDraft.id == draft.id).first()

        assert deleted is None


class TestLockCleanup:
    """Tests for expired lock cleanup."""

    def test_cleanup_expired_locks(self, db_session, test_user, test_governance_area):
        """Test that cleanup removes expired locks."""
        # Create draft and lock it
        draft = indicator_draft_service.create_draft(
            db=db_session,
            user_id=test_user.id,
            governance_area_id=test_governance_area.id,
            creation_mode="incremental",
        )

        indicator_draft_service.save_draft(
            db=db_session,
            draft_id=draft.id,
            user_id=test_user.id,
            update_data={"title": "Locked"},
            version=1,
        )

        # Set lock time to 31 minutes ago (expired)
        expired_time = datetime.utcnow() - timedelta(minutes=31)
        db_session.query(IndicatorDraft).filter(IndicatorDraft.id == draft.id).update(
            {"locked_at": expired_time}
        )
        db_session.commit()

        # Run cleanup
        cleaned = indicator_draft_service.cleanup_expired_locks(db=db_session)

        assert cleaned == 1

        # Verify lock is released
        updated_draft = (
            db_session.query(IndicatorDraft).filter(IndicatorDraft.id == draft.id).first()
        )

        assert updated_draft.lock_token is None
        assert updated_draft.locked_by_user_id is None
        assert updated_draft.locked_at is None
