"""
Test suite for Assessment model (Story 5.3.7)

Tests verify that the Assessment model:
- Has all rework tracking columns with correct types
- Status field uses the updated AssessmentStatus enum
- rework_count validation rejects values > 1
- Relationship to User for rework_requested_by loads correctly
- can_request_rework property returns correct boolean based on status and rework_count
- is_locked property returns correct boolean based on status
"""

from datetime import datetime

import pytest
from sqlalchemy.orm import Session

from app.db.enums import AssessmentStatus, UserRole
from app.db.models.assessment import Assessment
from app.db.models.user import User


class TestAssessmentModelReworkFields:
    """Test suite for Assessment model rework tracking fields."""

    def test_assessment_has_rework_columns(self, db_session: Session):
        """Test that Assessment model has all rework tracking columns."""
        # Create a test user for blgu_user_id
        user = User(
            email="test_blgu@example.com",
            hashed_password="hashed",
            name="Test BLGU",
            role=UserRole.BLGU_USER,
        )
        db_session.add(user)
        db_session.commit()

        # Create assessment with rework fields
        assessment = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.DRAFT,
            rework_count=0,
            rework_requested_at=None,
            rework_requested_by=None,
            rework_comments=None,
        )
        db_session.add(assessment)
        db_session.commit()

        # Verify all rework columns exist and can be set
        assert assessment.rework_count == 0
        assert assessment.rework_requested_at is None
        assert assessment.rework_requested_by is None
        assert assessment.rework_comments is None

        # Cleanup
        db_session.delete(assessment)
        db_session.delete(user)
        db_session.commit()

    def test_assessment_status_uses_new_enum(self, db_session: Session):
        """Test that Assessment.status accepts new AssessmentStatus enum values."""
        # Create a test user
        user = User(
            email="test_blgu2@example.com",
            hashed_password="hashed",
            name="Test BLGU 2",
            role=UserRole.BLGU_USER,
        )
        db_session.add(user)
        db_session.commit()

        # Test all new Epic 5.0 status values
        new_statuses = [
            AssessmentStatus.DRAFT,
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.IN_REVIEW,
            AssessmentStatus.REWORK,
            AssessmentStatus.COMPLETED,
        ]

        created_assessments = []

        for status in new_statuses:
            assessment = Assessment(
                blgu_user_id=user.id,
                status=status,
            )
            db_session.add(assessment)
            db_session.commit()
            created_assessments.append(assessment)

            # Verify status was set correctly
            assert assessment.status == status, f"Status should be {status}"

        # Cleanup
        for assessment in created_assessments:
            db_session.delete(assessment)
        db_session.delete(user)
        db_session.commit()

    def test_rework_count_validation_rejects_values_greater_than_one(self, db_session: Session):
        """Test that @validates('rework_count') raises ValueError if value > 1."""
        user = User(
            email="test_blgu3@example.com",
            hashed_password="hashed",
            name="Test BLGU 3",
            role=UserRole.BLGU_USER,
        )
        db_session.add(user)
        db_session.commit()

        # Try to create assessment with rework_count = 2 (should fail)
        with pytest.raises(ValueError) as exc_info:
            assessment = Assessment(
                blgu_user_id=user.id,
                status=AssessmentStatus.DRAFT,
                rework_count=2,
            )
            db_session.add(assessment)
            db_session.flush()

        assert "cannot exceed 1" in str(exc_info.value).lower()
        db_session.rollback()

        # Cleanup
        db_session.delete(user)
        db_session.commit()

    def test_rework_count_validation_rejects_negative_values(self, db_session: Session):
        """Test that @validates('rework_count') raises ValueError if value < 0."""
        user = User(
            email="test_blgu4@example.com",
            hashed_password="hashed",
            name="Test BLGU 4",
            role=UserRole.BLGU_USER,
        )
        db_session.add(user)
        db_session.commit()

        # Try to create assessment with negative rework_count (should fail)
        with pytest.raises(ValueError) as exc_info:
            assessment = Assessment(
                blgu_user_id=user.id,
                status=AssessmentStatus.DRAFT,
                rework_count=-1,
            )
            db_session.add(assessment)
            db_session.flush()

        assert "cannot be negative" in str(exc_info.value).lower()
        db_session.rollback()

        # Cleanup
        db_session.delete(user)
        db_session.commit()

    def test_rework_count_validation_accepts_zero_and_one(self, db_session: Session):
        """Test that rework_count validation accepts valid values 0 and 1."""
        user = User(
            email="test_blgu5@example.com",
            hashed_password="hashed",
            name="Test BLGU 5",
            role=UserRole.BLGU_USER,
        )
        db_session.add(user)
        db_session.commit()

        # Create assessment with rework_count = 0 (should work)
        assessment_0 = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.DRAFT,
            rework_count=0,
        )
        db_session.add(assessment_0)
        db_session.commit()
        assert assessment_0.rework_count == 0

        # Create assessment with rework_count = 1 (should work)
        assessment_1 = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.REWORK,
            rework_count=1,
        )
        db_session.add(assessment_1)
        db_session.commit()
        assert assessment_1.rework_count == 1

        # Cleanup
        db_session.delete(assessment_0)
        db_session.delete(assessment_1)
        db_session.delete(user)
        db_session.commit()

    def test_rework_requester_relationship_loads(self, db_session: Session):
        """Test that the rework_requester relationship loads the User correctly."""
        # Create BLGU user
        blgu_user = User(
            email="test_blgu6@example.com",
            hashed_password="hashed",
            name="Test BLGU 6",
            role=UserRole.BLGU_USER,
        )
        db_session.add(blgu_user)
        db_session.commit()

        # Create assessor user
        assessor = User(
            email="test_assessor@example.com",
            hashed_password="hashed",
            name="Test Assessor",
            role=UserRole.ASSESSOR,
        )
        db_session.add(assessor)
        db_session.commit()

        # Create assessment with rework requested by assessor
        assessment = Assessment(
            blgu_user_id=blgu_user.id,
            status=AssessmentStatus.REWORK,
            rework_count=1,
            rework_requested_by=assessor.id,
            rework_requested_at=datetime.utcnow(),
            rework_comments="Please provide more documentation",
        )
        db_session.add(assessment)
        db_session.commit()

        # Load the assessment and verify relationship
        loaded_assessment = db_session.query(Assessment).filter_by(id=assessment.id).first()
        assert loaded_assessment is not None
        assert loaded_assessment.rework_requester is not None
        assert loaded_assessment.rework_requester.id == assessor.id
        assert loaded_assessment.rework_requester.name == "Test Assessor"

        # Cleanup
        db_session.delete(assessment)
        db_session.delete(assessor)
        db_session.delete(blgu_user)
        db_session.commit()

    def test_can_request_rework_property_true_when_submitted_and_no_rework(
        self, db_session: Session
    ):
        """Test that can_request_rework returns True when status is SUBMITTED and rework_count < 1."""
        user = User(
            email="test_blgu7@example.com",
            hashed_password="hashed",
            name="Test BLGU 7",
            role=UserRole.BLGU_USER,
        )
        db_session.add(user)
        db_session.commit()

        assessment = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.SUBMITTED,
            rework_count=0,
        )
        db_session.add(assessment)
        db_session.commit()

        assert assessment.can_request_rework is True, (
            "can_request_rework should be True when SUBMITTED and rework_count = 0"
        )

        # Cleanup
        db_session.delete(assessment)
        db_session.delete(user)
        db_session.commit()

    def test_can_request_rework_property_false_when_rework_already_used(self, db_session: Session):
        """Test that can_request_rework returns False when rework_count >= 1."""
        user = User(
            email="test_blgu8@example.com",
            hashed_password="hashed",
            name="Test BLGU 8",
            role=UserRole.BLGU_USER,
        )
        db_session.add(user)
        db_session.commit()

        assessment = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.SUBMITTED,
            rework_count=1,  # Rework already used
        )
        db_session.add(assessment)
        db_session.commit()

        assert assessment.can_request_rework is False, (
            "can_request_rework should be False when rework_count >= 1"
        )

        # Cleanup
        db_session.delete(assessment)
        db_session.delete(user)
        db_session.commit()

    def test_can_request_rework_property_false_when_not_submitted(self, db_session: Session):
        """Test that can_request_rework returns False when status is not SUBMITTED."""
        user = User(
            email="test_blgu9@example.com",
            hashed_password="hashed",
            name="Test BLGU 9",
            role=UserRole.BLGU_USER,
        )
        db_session.add(user)
        db_session.commit()

        # Test various non-SUBMITTED statuses
        non_submitted_statuses = [
            AssessmentStatus.DRAFT,
            AssessmentStatus.IN_REVIEW,
            AssessmentStatus.REWORK,
            AssessmentStatus.COMPLETED,
        ]

        for status in non_submitted_statuses:
            assessment = Assessment(
                blgu_user_id=user.id,
                status=status,
                rework_count=0,
            )
            db_session.add(assessment)
            db_session.commit()

            assert assessment.can_request_rework is False, (
                f"can_request_rework should be False when status is {status}"
            )

            db_session.delete(assessment)
            db_session.commit()

        # Cleanup
        db_session.delete(user)
        db_session.commit()

    def test_is_locked_property_true_for_locked_statuses(self, db_session: Session):
        """Test that is_locked returns True for SUBMITTED, IN_REVIEW, COMPLETED statuses."""
        user = User(
            email="test_blgu10@example.com",
            hashed_password="hashed",
            name="Test BLGU 10",
            role=UserRole.BLGU_USER,
        )
        db_session.add(user)
        db_session.commit()

        locked_statuses = [
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.IN_REVIEW,
            AssessmentStatus.COMPLETED,
        ]

        for status in locked_statuses:
            assessment = Assessment(
                blgu_user_id=user.id,
                status=status,
            )
            db_session.add(assessment)
            db_session.commit()

            assert assessment.is_locked is True, f"is_locked should be True when status is {status}"

            db_session.delete(assessment)
            db_session.commit()

        # Cleanup
        db_session.delete(user)
        db_session.commit()

    def test_is_locked_property_false_for_unlocked_statuses(self, db_session: Session):
        """Test that is_locked returns False for DRAFT and REWORK statuses."""
        user = User(
            email="test_blgu11@example.com",
            hashed_password="hashed",
            name="Test BLGU 11",
            role=UserRole.BLGU_USER,
        )
        db_session.add(user)
        db_session.commit()

        unlocked_statuses = [
            AssessmentStatus.DRAFT,
            AssessmentStatus.REWORK,
        ]

        for status in unlocked_statuses:
            assessment = Assessment(
                blgu_user_id=user.id,
                status=status,
            )
            db_session.add(assessment)
            db_session.commit()

            assert assessment.is_locked is False, (
                f"is_locked should be False when status is {status}"
            )

            db_session.delete(assessment)
            db_session.commit()

        # Cleanup
        db_session.delete(user)
        db_session.commit()

    def test_complete_rework_workflow(self, db_session: Session):
        """Test a complete rework workflow using the model properties."""
        # Create users
        blgu_user = User(
            email="test_blgu12@example.com",
            hashed_password="hashed",
            name="Test BLGU 12",
            role=UserRole.BLGU_USER,
        )
        assessor = User(
            email="test_assessor2@example.com",
            hashed_password="hashed",
            name="Test Assessor 2",
            role=UserRole.ASSESSOR,
        )
        db_session.add_all([blgu_user, assessor])
        db_session.commit()

        # Step 1: Create assessment in DRAFT (unlocked)
        assessment = Assessment(
            blgu_user_id=blgu_user.id,
            status=AssessmentStatus.DRAFT,
            rework_count=0,
        )
        db_session.add(assessment)
        db_session.commit()

        assert assessment.is_locked is False, "DRAFT should be unlocked"
        assert assessment.can_request_rework is False, "Can't request rework on DRAFT"

        # Step 2: BLGU submits (locked)
        assessment.status = AssessmentStatus.SUBMITTED
        db_session.commit()

        assert assessment.is_locked is True, "SUBMITTED should be locked"
        assert assessment.can_request_rework is True, "Should be able to request rework"

        # Step 3: Assessor requests rework
        assessment.status = AssessmentStatus.REWORK
        assessment.rework_count = 1
        assessment.rework_requested_by = assessor.id
        assessment.rework_requested_at = datetime.utcnow()
        assessment.rework_comments = "Please provide additional documentation"
        db_session.commit()

        assert assessment.is_locked is False, "REWORK should be unlocked"
        assert assessment.can_request_rework is False, "Already used rework cycle"

        # Step 4: BLGU resubmits (locked again)
        assessment.status = AssessmentStatus.SUBMITTED
        db_session.commit()

        assert assessment.is_locked is True, "Resubmitted should be locked"
        assert assessment.can_request_rework is False, "No more rework allowed (count = 1)"

        # Step 5: Assessor moves to IN_REVIEW
        assessment.status = AssessmentStatus.IN_REVIEW
        db_session.commit()

        assert assessment.is_locked is True, "IN_REVIEW should be locked"

        # Step 6: Assessor completes
        assessment.status = AssessmentStatus.COMPLETED
        db_session.commit()

        assert assessment.is_locked is True, "COMPLETED should be locked"

        # Cleanup
        db_session.delete(assessment)
        db_session.delete(assessor)
        db_session.delete(blgu_user)
        db_session.commit()
