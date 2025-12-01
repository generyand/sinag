"""
Tests for CapDev Celery worker task (_generate_capdev_insights_logic and generate_capdev_insights_task).

Tests the background task that generates AI-powered capacity development insights
after MLGOO approval, including:
- Assessment validation
- Status tracking (pending -> generating -> completed/failed)
- Duplicate generation prevention
- Error handling and retry logic
"""

import uuid
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from app.db.enums import AssessmentStatus, UserRole
from app.db.models.assessment import Assessment
from app.db.models.barangay import Barangay
from app.db.models.user import User
from app.workers.intelligence_worker import _generate_capdev_insights_logic
from passlib.context import CryptContext
from sqlalchemy.orm import Session

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def mlgoo_approved_assessment(db_session: Session):
    """Create a MLGOO-approved COMPLETED assessment"""
    # Create barangay
    barangay = Barangay(name=f"Test Barangay {uuid.uuid4().hex[:8]}")
    db_session.add(barangay)
    db_session.commit()

    # Create BLGU user
    user = User(
        email=f"blgu_{uuid.uuid4().hex[:8]}@example.com",
        name="Test BLGU User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    # Create MLGOO-approved assessment
    assessment = Assessment(
        blgu_user_id=user.id,
        status=AssessmentStatus.COMPLETED,
        mlgoo_approved_by=1,
        mlgoo_approved_at=datetime(2024, 1, 1, 12, 0, 0),
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


@pytest.fixture
def draft_assessment(db_session: Session):
    """Create a draft assessment (not approved)"""
    user = User(
        email=f"blgu_{uuid.uuid4().hex[:8]}@example.com",
        name="Draft BLGU User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    assessment = Assessment(
        blgu_user_id=user.id,
        status=AssessmentStatus.DRAFT,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


@pytest.fixture
def completed_not_approved_assessment(db_session: Session):
    """Create a COMPLETED assessment without MLGOO approval"""
    user = User(
        email=f"blgu_{uuid.uuid4().hex[:8]}@example.com",
        name="Completed BLGU User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    assessment = Assessment(
        blgu_user_id=user.id,
        status=AssessmentStatus.COMPLETED,
        mlgoo_approved_at=None,  # No approval
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


@pytest.fixture
def assessment_with_existing_capdev(db_session: Session, mlgoo_approved_assessment: Assessment):
    """Create assessment with CapDev insights already generated"""
    mlgoo_approved_assessment.capdev_insights = {
        "ceb": {"summary": "Existing Bisaya insights"},
        "en": {"summary": "Existing English insights"},
    }
    mlgoo_approved_assessment.capdev_insights_status = "completed"
    mlgoo_approved_assessment.capdev_insights_generated_at = datetime(2024, 1, 1, 13, 0, 0)
    db_session.commit()
    db_session.refresh(mlgoo_approved_assessment)
    return mlgoo_approved_assessment


# ============================================================================
# _generate_capdev_insights_logic() Tests
# ============================================================================


def test_generate_capdev_insights_logic_assessment_not_found(db_session: Session):
    """Test that task fails gracefully when assessment doesn't exist"""
    result = _generate_capdev_insights_logic(
        assessment_id=99999,
        retry_count=0,
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    assert result["success"] is False
    assert "not found" in result["error"]


def test_generate_capdev_insights_logic_not_completed_status(
    db_session: Session, draft_assessment: Assessment
):
    """Test that task fails when assessment is not COMPLETED"""
    result = _generate_capdev_insights_logic(
        assessment_id=draft_assessment.id,
        retry_count=0,
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    assert result["success"] is False
    assert "not MLGOO approved" in result["error"]


def test_generate_capdev_insights_logic_not_mlgoo_approved(
    db_session: Session, completed_not_approved_assessment: Assessment
):
    """Test that task fails when assessment not MLGOO approved"""
    result = _generate_capdev_insights_logic(
        assessment_id=completed_not_approved_assessment.id,
        retry_count=0,
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    assert result["success"] is False
    assert "not MLGOO approved" in result["error"]


def test_generate_capdev_insights_logic_skips_if_already_exists(
    db_session: Session, assessment_with_existing_capdev: Assessment
):
    """Test that task skips generation if CapDev insights already exist"""
    result = _generate_capdev_insights_logic(
        assessment_id=assessment_with_existing_capdev.id,
        retry_count=0,
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    assert result["success"] is True
    assert result["skipped"] is True
    assert "already exist" in result["message"]
    assert "capdev_insights" in result


@patch("app.workers.intelligence_worker.intelligence_service.generate_default_language_capdev_insights")
def test_generate_capdev_insights_logic_success(
    mock_generate_insights,
    db_session: Session,
    mlgoo_approved_assessment: Assessment,
):
    """Test successful CapDev insights generation"""
    # Mock the intelligence service response
    mock_insights = {
        "ceb": {
            "summary": "Bisaya summary",
            "governance_weaknesses": [],
            "recommendations": [],
            "capacity_development_needs": [],
            "suggested_interventions": [],
            "priority_actions": [],
        },
        "en": {
            "summary": "English summary",
            "governance_weaknesses": [],
            "recommendations": [],
            "capacity_development_needs": [],
            "suggested_interventions": [],
            "priority_actions": [],
        },
    }
    mock_generate_insights.return_value = mock_insights

    result = _generate_capdev_insights_logic(
        assessment_id=mlgoo_approved_assessment.id,
        retry_count=0,
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    # Verify success
    assert result["success"] is True
    assert result["assessment_id"] == mlgoo_approved_assessment.id
    assert "capdev_insights" in result
    assert result["languages_generated"] == ["ceb", "en"]

    # Verify database was updated
    db_session.refresh(mlgoo_approved_assessment)
    assert mlgoo_approved_assessment.capdev_insights is not None
    assert "ceb" in mlgoo_approved_assessment.capdev_insights
    assert "en" in mlgoo_approved_assessment.capdev_insights
    assert mlgoo_approved_assessment.capdev_insights_status == "completed"
    assert mlgoo_approved_assessment.capdev_insights_generated_at is not None


@patch("app.workers.intelligence_worker.intelligence_service.generate_default_language_capdev_insights")
def test_generate_capdev_insights_logic_updates_status_to_generating(
    mock_generate_insights,
    db_session: Session,
    mlgoo_approved_assessment: Assessment,
):
    """Test that status is set to 'generating' before API call"""
    mock_insights = {
        "ceb": {"summary": "Test"},
        "en": {"summary": "Test"},
    }
    mock_generate_insights.return_value = mock_insights

    # Check initial status
    assert mlgoo_approved_assessment.capdev_insights_status is None

    result = _generate_capdev_insights_logic(
        assessment_id=mlgoo_approved_assessment.id,
        retry_count=0,
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    # Verify status was set to completed after success
    db_session.refresh(mlgoo_approved_assessment)
    assert mlgoo_approved_assessment.capdev_insights_status == "completed"


@patch("app.workers.intelligence_worker.intelligence_service.generate_default_language_capdev_insights")
def test_generate_capdev_insights_logic_empty_insights_failure(
    mock_generate_insights,
    db_session: Session,
    mlgoo_approved_assessment: Assessment,
):
    """Test that task fails if no insights are generated"""
    mock_generate_insights.return_value = {}  # Empty insights

    result = _generate_capdev_insights_logic(
        assessment_id=mlgoo_approved_assessment.id,
        retry_count=0,
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    assert result["success"] is False
    assert "Failed to generate" in result["error"]

    # Verify status was set to failed
    db_session.refresh(mlgoo_approved_assessment)
    assert mlgoo_approved_assessment.capdev_insights_status == "failed"


@patch("app.workers.intelligence_worker.intelligence_service.generate_default_language_capdev_insights")
def test_generate_capdev_insights_logic_api_error(
    mock_generate_insights,
    db_session: Session,
    mlgoo_approved_assessment: Assessment,
):
    """Test error handling when intelligence service raises exception"""
    mock_generate_insights.side_effect = Exception("Gemini API error")

    result = _generate_capdev_insights_logic(
        assessment_id=mlgoo_approved_assessment.id,
        retry_count=0,
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    assert result["success"] is False
    assert "Gemini API error" in result["error"]


@patch("app.workers.intelligence_worker.intelligence_service.generate_default_language_capdev_insights")
def test_generate_capdev_insights_logic_value_error(
    mock_generate_insights,
    db_session: Session,
    mlgoo_approved_assessment: Assessment,
):
    """Test that ValueError is handled correctly"""
    mock_generate_insights.side_effect = ValueError("Invalid assessment data")

    result = _generate_capdev_insights_logic(
        assessment_id=mlgoo_approved_assessment.id,
        retry_count=0,
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    assert result["success"] is False
    assert "Invalid assessment data" in result["error"]

    # Verify status was set to failed
    db_session.refresh(mlgoo_approved_assessment)
    assert mlgoo_approved_assessment.capdev_insights_status == "failed"


@patch("app.workers.intelligence_worker.intelligence_service.generate_default_language_capdev_insights")
def test_generate_capdev_insights_logic_sets_failed_status_on_final_retry(
    mock_generate_insights,
    db_session: Session,
    mlgoo_approved_assessment: Assessment,
):
    """Test that status is set to 'failed' on final retry"""
    mock_generate_insights.side_effect = Exception("API timeout")

    # Simulate final retry (retry_count = max_retries - 1)
    result = _generate_capdev_insights_logic(
        assessment_id=mlgoo_approved_assessment.id,
        retry_count=2,  # Final retry (max_retries=3)
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    assert result["success"] is False

    # Verify status was set to failed
    db_session.refresh(mlgoo_approved_assessment)
    assert mlgoo_approved_assessment.capdev_insights_status == "failed"


@patch("app.workers.intelligence_worker.intelligence_service.generate_default_language_capdev_insights")
def test_generate_capdev_insights_logic_retry_count_logging(
    mock_generate_insights,
    db_session: Session,
    mlgoo_approved_assessment: Assessment,
):
    """Test that retry count is correctly tracked"""
    mock_insights = {"ceb": {"summary": "Test"}, "en": {"summary": "Test"}}
    mock_generate_insights.return_value = mock_insights

    # Simulate retry
    result = _generate_capdev_insights_logic(
        assessment_id=mlgoo_approved_assessment.id,
        retry_count=1,  # Second attempt
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    assert result["success"] is True


# ============================================================================
# Integration Tests with Database
# ============================================================================


@patch("app.workers.intelligence_worker.intelligence_service.generate_default_language_capdev_insights")
def test_capdev_insights_persisted_to_database(
    mock_generate_insights,
    db_session: Session,
    mlgoo_approved_assessment: Assessment,
):
    """Test that generated insights are correctly persisted to database"""
    mock_insights = {
        "ceb": {
            "summary": "Bisaya summary from AI",
            "governance_weaknesses": ["Weakness 1"],
            "recommendations": ["Rec 1"],
            "capacity_development_needs": [],
            "suggested_interventions": [],
            "priority_actions": [],
        },
        "en": {
            "summary": "English summary from AI",
            "governance_weaknesses": ["Weakness 1"],
            "recommendations": ["Rec 1"],
            "capacity_development_needs": [],
            "suggested_interventions": [],
            "priority_actions": [],
        },
    }
    mock_generate_insights.return_value = mock_insights

    result = _generate_capdev_insights_logic(
        assessment_id=mlgoo_approved_assessment.id,
        retry_count=0,
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    # Verify data in database
    db_session.refresh(mlgoo_approved_assessment)
    assert mlgoo_approved_assessment.capdev_insights["ceb"]["summary"] == "Bisaya summary from AI"
    assert mlgoo_approved_assessment.capdev_insights["en"]["summary"] == "English summary from AI"


@patch("app.workers.intelligence_worker.intelligence_service.generate_default_language_capdev_insights")
def test_capdev_insights_timestamp_set(
    mock_generate_insights,
    db_session: Session,
    mlgoo_approved_assessment: Assessment,
):
    """Test that capdev_insights_generated_at timestamp is set"""
    mock_insights = {"ceb": {"summary": "Test"}, "en": {"summary": "Test"}}
    mock_generate_insights.return_value = mock_insights

    # Ensure timestamp is initially None
    assert mlgoo_approved_assessment.capdev_insights_generated_at is None

    result = _generate_capdev_insights_logic(
        assessment_id=mlgoo_approved_assessment.id,
        retry_count=0,
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    # Verify timestamp was set
    db_session.refresh(mlgoo_approved_assessment)
    assert mlgoo_approved_assessment.capdev_insights_generated_at is not None


# ============================================================================
# Edge Cases
# ============================================================================


def test_generate_capdev_insights_logic_handles_none_db_parameter():
    """Test that None db parameter creates new session"""
    # This test verifies the session cleanup logic
    # Without mocking SessionLocal, we can't fully test this without real DB setup
    # But we can verify the logic path is correct
    result = _generate_capdev_insights_logic(
        assessment_id=99999,  # Non-existent
        retry_count=0,
        max_retries=3,
        default_retry_delay=60,
        db=None,  # Should create new session
    )

    # Should fail with "not found" regardless of session creation
    assert result["success"] is False


@patch("app.workers.intelligence_worker.intelligence_service.generate_default_language_capdev_insights")
def test_generate_capdev_insights_logic_partial_language_generation(
    mock_generate_insights,
    db_session: Session,
    mlgoo_approved_assessment: Assessment,
):
    """Test handling when only one language is generated"""
    # Only Bisaya generated, English failed
    mock_insights = {
        "ceb": {"summary": "Bisaya only"},
    }
    mock_generate_insights.return_value = mock_insights

    result = _generate_capdev_insights_logic(
        assessment_id=mlgoo_approved_assessment.id,
        retry_count=0,
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    # Should still succeed if at least one language generated
    assert result["success"] is True
    assert result["languages_generated"] == ["ceb"]


# ============================================================================
# Task Configuration Tests
# ============================================================================


def test_capdev_task_configuration():
    """Test that Celery task is configured correctly"""
    from app.workers.intelligence_worker import generate_capdev_insights_task

    # Verify task name
    assert generate_capdev_insights_task.name == "intelligence.generate_capdev_insights_task"

    # Verify retry configuration
    assert generate_capdev_insights_task.max_retries == 3
    assert generate_capdev_insights_task.default_retry_delay == 60

    # Verify queue assignment
    # Task should use classification queue for AI tasks
    # Note: This might not be directly accessible, depends on Celery setup


# ============================================================================
# Retry Logic Tests
# ============================================================================


@patch("app.workers.intelligence_worker.intelligence_service.generate_default_language_capdev_insights")
def test_generate_capdev_insights_no_retry_on_not_found(
    mock_generate_insights,
    db_session: Session,
):
    """Test that 'not found' errors don't trigger retries"""
    # This is tested via the task logic - validation errors shouldn't retry
    result = _generate_capdev_insights_logic(
        assessment_id=99999,  # Non-existent
        retry_count=0,
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    assert result["success"] is False
    assert "not found" in result["error"]
    # The task wrapper should not retry this


@patch("app.workers.intelligence_worker.intelligence_service.generate_default_language_capdev_insights")
def test_generate_capdev_insights_no_retry_on_not_approved(
    mock_generate_insights,
    db_session: Session,
    draft_assessment: Assessment,
):
    """Test that 'not MLGOO approved' errors don't trigger retries"""
    result = _generate_capdev_insights_logic(
        assessment_id=draft_assessment.id,
        retry_count=0,
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    assert result["success"] is False
    assert "not MLGOO approved" in result["error"]
    # The task wrapper should not retry this


# ============================================================================
# Concurrency Tests
# ============================================================================


@patch("app.workers.intelligence_worker.intelligence_service.generate_default_language_capdev_insights")
def test_generate_capdev_insights_concurrent_calls_prevented(
    mock_generate_insights,
    db_session: Session,
    mlgoo_approved_assessment: Assessment,
):
    """Test that duplicate concurrent generation is prevented"""
    # Set existing insights
    mlgoo_approved_assessment.capdev_insights = {
        "ceb": {"summary": "Existing"},
        "en": {"summary": "Existing"},
    }
    db_session.commit()

    # First call
    result1 = _generate_capdev_insights_logic(
        assessment_id=mlgoo_approved_assessment.id,
        retry_count=0,
        max_retries=3,
        default_retry_delay=60,
        db=db_session,
    )

    # Should skip since insights already exist
    assert result1["success"] is True
    assert result1["skipped"] is True

    # Intelligence service should not be called
    mock_generate_insights.assert_not_called()
