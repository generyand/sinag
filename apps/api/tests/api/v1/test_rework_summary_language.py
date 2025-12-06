"""
Tests for GET /api/v1/assessments/{assessment_id}/rework-summary endpoint
with multi-language support (ceb, fil, en)
"""

import uuid
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import AssessmentStatus, UserRole
from app.db.models.assessment import Assessment
from app.db.models.barangay import Barangay
from app.db.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@pytest.fixture(autouse=True)
def clear_user_overrides(client):
    """Clear user-related dependency overrides after each test"""
    yield
    if deps.get_current_active_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_active_user]


@pytest.fixture
def mock_barangay_for_rework(db_session: Session):
    """Create a mock barangay for rework testing"""
    unique_name = f"Rework Test Barangay {uuid.uuid4().hex[:8]}"
    barangay = Barangay(name=unique_name)
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)
    return barangay


@pytest.fixture
def blgu_user_for_rework(db_session: Session, mock_barangay_for_rework: Barangay):
    """Create a BLGU user with preferred language for testing"""
    unique_email = f"blgu_rework_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="BLGU Rework User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=mock_barangay_for_rework.id,
        preferred_language="ceb",  # Default Bisaya
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def rework_assessment(db_session: Session, blgu_user_for_rework: User):
    """Create an assessment in REWORK status with multi-language summaries"""
    assessment = Assessment(
        blgu_user_id=blgu_user_for_rework.id,
        status=AssessmentStatus.REWORK,
        rework_summary={
            "ceb": {
                "overall_summary": "Kini ang summary sa Bisaya",
                "indicator_summaries": [],
                "priority_actions": ["Aksyon 1", "Aksyon 2"],
                "estimated_time": "2 semana",
                "generated_at": datetime.now().isoformat(),
                "language": "ceb",
            },
            "en": {
                "overall_summary": "This is the English summary",
                "indicator_summaries": [],
                "priority_actions": ["Action 1", "Action 2"],
                "estimated_time": "2 weeks",
                "generated_at": datetime.now().isoformat(),
                "language": "en",
            },
        },
        created_at=datetime.now(),
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


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


# ====================================================================
# GET /api/v1/assessments/{assessment_id}/rework-summary
# Tests for multi-language support
# ====================================================================


def test_get_rework_summary_default_language_uses_user_preference(
    client: TestClient,
    db_session: Session,
    blgu_user_for_rework: User,
    rework_assessment: Assessment,
):
    """Test that default language uses user's preferred_language (Bisaya)"""
    _override_user_and_db(client, blgu_user_for_rework, db_session)

    response = client.get(f"/api/v1/assessments/{rework_assessment.id}/rework-summary")

    assert response.status_code == 200
    data = response.json()

    # Should return Bisaya version (user's preferred language)
    assert data["language"] == "ceb"
    assert data["overall_summary"] == "Kini ang summary sa Bisaya"
    assert data["estimated_time"] == "2 semana"


def test_get_rework_summary_explicit_bisaya_language(
    client: TestClient,
    db_session: Session,
    blgu_user_for_rework: User,
    rework_assessment: Assessment,
):
    """Test requesting Bisaya explicitly via language query parameter"""
    _override_user_and_db(client, blgu_user_for_rework, db_session)

    response = client.get(f"/api/v1/assessments/{rework_assessment.id}/rework-summary?language=ceb")

    assert response.status_code == 200
    data = response.json()

    assert data["language"] == "ceb"
    assert data["overall_summary"] == "Kini ang summary sa Bisaya"
    assert "Aksyon" in data["priority_actions"][0]


def test_get_rework_summary_explicit_english_language(
    client: TestClient,
    db_session: Session,
    blgu_user_for_rework: User,
    rework_assessment: Assessment,
):
    """Test requesting English explicitly via language query parameter"""
    _override_user_and_db(client, blgu_user_for_rework, db_session)

    response = client.get(f"/api/v1/assessments/{rework_assessment.id}/rework-summary?language=en")

    assert response.status_code == 200
    data = response.json()

    assert data["language"] == "en"
    assert data["overall_summary"] == "This is the English summary"
    assert data["estimated_time"] == "2 weeks"


def test_get_rework_summary_tagalog_fallback_behavior(
    client: TestClient,
    db_session: Session,
    blgu_user_for_rework: User,
    rework_assessment: Assessment,
):
    """Test that Tagalog request falls back to available language when fil not cached"""
    _override_user_and_db(client, blgu_user_for_rework, db_session)

    # Request Tagalog when it's not available in the rework_summary
    response = client.get(f"/api/v1/assessments/{rework_assessment.id}/rework-summary?language=fil")

    # The endpoint should return 200 - either with generated fil or fallback to ceb/en
    assert response.status_code == 200
    data = response.json()

    # Should have a language field and overall_summary
    assert "language" in data
    assert "overall_summary" in data
    # The response should be either Tagalog (if generated) or a fallback language
    assert data["language"] in ["fil", "ceb", "en"]


def test_get_rework_summary_invalid_language_code(
    client: TestClient,
    db_session: Session,
    blgu_user_for_rework: User,
    rework_assessment: Assessment,
):
    """Test that invalid language code returns appropriate error"""
    _override_user_and_db(client, blgu_user_for_rework, db_session)

    response = client.get(
        f"/api/v1/assessments/{rework_assessment.id}/rework-summary?language=invalid"
    )

    # Should return an error (implementation dependent)
    # Could be 400, 422, or fallback to default language
    assert response.status_code in [200, 400, 422]


def test_get_rework_summary_unauthorized(
    client: TestClient,
    rework_assessment: Assessment,
):
    """Test that rework summary requires authentication"""
    response = client.get(f"/api/v1/assessments/{rework_assessment.id}/rework-summary")

    assert response.status_code in [401, 403]


def test_get_rework_summary_user_with_tagalog_preference(
    client: TestClient,
    db_session: Session,
    blgu_user_for_rework: User,
    rework_assessment: Assessment,
):
    """Test that user with Tagalog preference gets a response (either fil or fallback)"""
    _override_user_and_db(client, blgu_user_for_rework, db_session)

    # Change user's preferred language to Tagalog
    blgu_user_for_rework.preferred_language = "fil"
    db_session.commit()

    response = client.get(f"/api/v1/assessments/{rework_assessment.id}/rework-summary")

    assert response.status_code == 200
    data = response.json()

    # Should return a valid response (either fil if generated, or fallback to ceb/en)
    assert "language" in data
    assert "overall_summary" in data
    assert data["language"] in ["fil", "ceb", "en"]


def test_get_rework_summary_user_with_english_preference(
    client: TestClient,
    db_session: Session,
    blgu_user_for_rework: User,
    rework_assessment: Assessment,
):
    """Test that user with English preference gets English by default"""
    _override_user_and_db(client, blgu_user_for_rework, db_session)

    # Change user's preferred language to English
    blgu_user_for_rework.preferred_language = "en"
    db_session.commit()

    response = client.get(f"/api/v1/assessments/{rework_assessment.id}/rework-summary")

    assert response.status_code == 200
    data = response.json()

    # Should default to English (user's preferred language)
    assert data["language"] == "en"
    assert data["overall_summary"] == "This is the English summary"


def test_get_rework_summary_language_parameter_overrides_user_preference(
    client: TestClient,
    db_session: Session,
    blgu_user_for_rework: User,
    rework_assessment: Assessment,
):
    """Test that explicit language parameter overrides user preference"""
    _override_user_and_db(client, blgu_user_for_rework, db_session)

    # User prefers Bisaya
    assert blgu_user_for_rework.preferred_language == "ceb"

    # But explicitly request English
    response = client.get(f"/api/v1/assessments/{rework_assessment.id}/rework-summary?language=en")

    assert response.status_code == 200
    data = response.json()

    # Should return English despite user preference
    assert data["language"] == "en"
    assert data["overall_summary"] == "This is the English summary"


def test_get_rework_summary_nonexistent_assessment(
    client: TestClient,
    db_session: Session,
    blgu_user_for_rework: User,
):
    """Test that requesting summary for nonexistent assessment returns 404"""
    _override_user_and_db(client, blgu_user_for_rework, db_session)

    response = client.get("/api/v1/assessments/99999/rework-summary")

    assert response.status_code == 404


def test_get_rework_summary_assessment_not_in_rework_status(
    client: TestClient,
    db_session: Session,
    blgu_user_for_rework: User,
):
    """Test that requesting summary for non-rework assessment returns error"""
    _override_user_and_db(client, blgu_user_for_rework, db_session)

    # Create assessment in DRAFT status
    draft_assessment = Assessment(
        blgu_user_id=blgu_user_for_rework.id,
        status=AssessmentStatus.DRAFT,
        created_at=datetime.now(),
    )
    db_session.add(draft_assessment)
    db_session.commit()
    db_session.refresh(draft_assessment)

    response = client.get(f"/api/v1/assessments/{draft_assessment.id}/rework-summary")

    # Should return an error (400 or 404)
    assert response.status_code in [400, 404]


def test_get_rework_summary_response_structure(
    client: TestClient,
    db_session: Session,
    blgu_user_for_rework: User,
    rework_assessment: Assessment,
):
    """Test that response has correct structure"""
    _override_user_and_db(client, blgu_user_for_rework, db_session)

    response = client.get(f"/api/v1/assessments/{rework_assessment.id}/rework-summary?language=ceb")

    assert response.status_code == 200
    data = response.json()

    # Verify response structure (using correct schema field names)
    assert "language" in data
    assert "overall_summary" in data
    assert "indicator_summaries" in data
    assert "priority_actions" in data
    assert "estimated_time" in data
    assert "generated_at" in data

    # Verify types
    assert isinstance(data["language"], str)
    assert isinstance(data["overall_summary"], str)
    assert isinstance(data["indicator_summaries"], list)
    assert isinstance(data["priority_actions"], list)
    assert isinstance(data["estimated_time"], str)


def test_get_rework_summary_repeated_requests_are_consistent(
    client: TestClient,
    db_session: Session,
    blgu_user_for_rework: User,
    rework_assessment: Assessment,
):
    """Test that repeated requests for same language return consistent results"""
    _override_user_and_db(client, blgu_user_for_rework, db_session)

    # First request for Bisaya
    response1 = client.get(
        f"/api/v1/assessments/{rework_assessment.id}/rework-summary?language=ceb"
    )
    assert response1.status_code == 200

    # Second request for same language
    response2 = client.get(
        f"/api/v1/assessments/{rework_assessment.id}/rework-summary?language=ceb"
    )
    assert response2.status_code == 200

    # Both responses should be identical
    assert response1.json()["overall_summary"] == response2.json()["overall_summary"]
    assert response1.json()["language"] == response2.json()["language"]


def test_get_rework_summary_different_users_same_assessment(
    client: TestClient,
    db_session: Session,
    mock_barangay_for_rework: Barangay,
    rework_assessment: Assessment,
):
    """Test that different users with different language preferences get correct summaries"""
    # Create user with English preference
    unique_email = f"blgu_en_{uuid.uuid4().hex[:8]}@example.com"
    user_en = User(
        email=unique_email,
        name="BLGU English User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=mock_barangay_for_rework.id,
        preferred_language="en",
        is_active=True,
    )
    db_session.add(user_en)
    db_session.commit()
    db_session.refresh(user_en)

    # Update assessment to belong to this user
    rework_assessment.blgu_user_id = user_en.id
    db_session.commit()

    _override_user_and_db(client, user_en, db_session)

    response = client.get(f"/api/v1/assessments/{rework_assessment.id}/rework-summary")

    assert response.status_code == 200
    data = response.json()

    # Should use user's preferred language (English)
    assert data["language"] == "en"
    assert data["overall_summary"] == "This is the English summary"
