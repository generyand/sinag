"""
Tests for CapDev (Capacity Development) API endpoints (app/api/v1/capdev.py)

Tests the AI-powered capacity development insights API including:
- Access control (MLGOO & BLGU)
- Insights retrieval and caching
- Multi-language support
- Status checking
- Admin regeneration
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


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture(autouse=True)
def clear_user_overrides(client):
    """Clear user-related dependency overrides after each test"""
    yield
    if deps.get_current_active_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_active_user]
    if deps.get_current_admin_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_admin_user]


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
def blgu_barangay(db_session: Session):
    """Create a test barangay"""
    unique_name = f"Test Barangay {uuid.uuid4().hex[:8]}"
    barangay = Barangay(name=unique_name)
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)
    return barangay


@pytest.fixture
def blgu_user(db_session: Session, blgu_barangay: Barangay):
    """Create a BLGU user for testing"""
    unique_email = f"blgu_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="BLGU User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=blgu_barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def other_blgu_user(db_session: Session):
    """Create a different BLGU user for access control testing"""
    unique_email = f"other_blgu_{uuid.uuid4().hex[:8]}@example.com"
    unique_barangay = f"Other Barangay {uuid.uuid4().hex[:8]}"

    # Create separate barangay
    barangay = Barangay(name=unique_barangay)
    db_session.add(barangay)
    db_session.commit()

    user = User(
        email=unique_email,
        name="Other BLGU User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def completed_assessment(db_session: Session, blgu_user: User):
    """Create a completed, MLGOO-approved assessment"""
    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        status=AssessmentStatus.COMPLETED,
        mlgoo_approved_by=1,  # Assume MLGOO user 1
        mlgoo_approved_at=datetime(2024, 1, 1, 12, 0, 0),
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


@pytest.fixture
def completed_assessment_with_capdev(db_session: Session, blgu_user: User):
    """Create a completed assessment with CapDev insights already generated"""
    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        status=AssessmentStatus.COMPLETED,
        mlgoo_approved_by=1,
        mlgoo_approved_at=datetime(2024, 1, 1, 12, 0, 0),
        capdev_insights={
            "ceb": {
                "summary": "Test Bisaya summary",
                "governance_weaknesses": [
                    {
                        "area_name": "Financial Administration",
                        "description": "Weak budgeting process",
                        "severity": "high",
                    }
                ],
                "recommendations": [
                    {
                        "title": "Improve budgeting",
                        "description": "Implement better budget tracking",
                        "governance_area": "Financial Administration",
                        "priority": "high",
                    }
                ],
                "capacity_development_needs": [
                    {
                        "area": "Financial Management",
                        "current_gap": "Lack of accounting skills",
                        "target_state": "Proficient in basic accounting",
                    }
                ],
                "suggested_interventions": [
                    {
                        "intervention_type": "training",
                        "title": "Accounting Basics",
                        "description": "2-day workshop on accounting",
                        "target_audience": "BLGU officials",
                    }
                ],
                "priority_actions": [
                    {
                        "action": "Hire accountant",
                        "responsible_party": "BLGU",
                        "timeline": "short-term",
                    }
                ],
                "generated_at": "2024-01-01T12:00:00",
            },
            "en": {
                "summary": "Test English summary",
                "governance_weaknesses": [],
                "recommendations": [],
                "capacity_development_needs": [],
                "suggested_interventions": [],
                "priority_actions": [],
                "generated_at": "2024-01-01T12:00:00",
            },
        },
        capdev_insights_status="completed",
        capdev_insights_generated_at=datetime(2024, 1, 1, 12, 30, 0),
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


@pytest.fixture
def pending_capdev_assessment(db_session: Session, blgu_user: User):
    """Create an assessment with pending CapDev generation"""
    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        status=AssessmentStatus.COMPLETED,
        mlgoo_approved_by=1,
        mlgoo_approved_at=datetime(2024, 1, 1, 12, 0, 0),
        capdev_insights=None,
        capdev_insights_status="pending",
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


@pytest.fixture
def draft_assessment(db_session: Session, blgu_user: User):
    """Create a draft assessment (not MLGOO approved)"""
    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        status=AssessmentStatus.DRAFT,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


def _override_user_and_db(client, user: User, db_session: Session):
    """Override authentication and database dependencies"""

    def _override_current_active_user():
        return user

    def _override_current_admin_user():
        if user.role != UserRole.MLGOO_DILG:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Requires admin privileges",
            )
        return user

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_active_user] = _override_current_active_user
    client.app.dependency_overrides[deps.get_current_admin_user] = _override_current_admin_user
    client.app.dependency_overrides[deps.get_db] = _override_get_db


# ============================================================================
# GET /api/v1/capdev/assessments/{assessment_id} - Get CapDev Insights
# ============================================================================


def test_get_capdev_insights_success_mlgoo(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test MLGOO can retrieve CapDev insights"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get(f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["assessment_id"] == completed_assessment_with_capdev.id
    assert data["status"] == "completed"
    assert data["available_languages"] == ["ceb", "en"]
    assert "insights" in data
    assert "ceb" in data["insights"]
    assert "en" in data["insights"]
    assert data["insights"]["ceb"]["summary"] == "Test Bisaya summary"


def test_get_capdev_insights_success_blgu_own_assessment(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test BLGU can retrieve their own CapDev insights"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.get(f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["assessment_id"] == completed_assessment_with_capdev.id
    assert data["status"] == "completed"


def test_get_capdev_insights_forbidden_blgu_other_assessment(
    client: TestClient,
    db_session: Session,
    other_blgu_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test BLGU cannot retrieve another BLGU's CapDev insights"""
    _override_user_and_db(client, other_blgu_user, db_session)

    response = client.get(f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}")

    assert response.status_code == 403
    error_msg = response.json().get("error", response.json().get("detail", ""))
    assert "only access CapDev insights for your own assessment" in error_msg


def test_get_capdev_insights_not_found(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test 404 when assessment not found"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/capdev/assessments/99999")

    assert response.status_code == 404
    error_msg = response.json().get("error", response.json().get("detail", ""))
    assert "not found" in error_msg


def test_get_capdev_insights_not_mlgoo_approved(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    draft_assessment: Assessment,
):
    """Test 400 when assessment not MLGOO approved"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get(f"/api/v1/capdev/assessments/{draft_assessment.id}")

    assert response.status_code == 400
    error_msg = response.json().get("error", response.json().get("detail", ""))
    assert "only available after MLGOO approval" in error_msg


def test_get_capdev_insights_returns_barangay_name(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment_with_capdev: Assessment,
    blgu_barangay: Barangay,
):
    """Test that response includes barangay name"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get(f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["barangay_name"] == blgu_barangay.name


# ============================================================================
# GET /api/v1/capdev/assessments/{assessment_id}/language/{language} - Get by Language
# ============================================================================


def test_get_capdev_insights_by_language_ceb(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test retrieving insights in Bisaya language"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get(
        f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}/language/ceb"
    )

    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "ceb"
    assert data["status"] == "completed"
    assert data["content"]["summary"] == "Test Bisaya summary"
    assert len(data["content"]["recommendations"]) == 1


def test_get_capdev_insights_by_language_en(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test retrieving insights in English language"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get(
        f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}/language/en"
    )

    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "en"
    assert data["status"] == "completed"
    assert data["content"]["summary"] == "Test English summary"


def test_get_capdev_insights_by_language_invalid_language(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test 400 for invalid language code"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get(
        f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}/language/invalid"
    )

    assert response.status_code == 400
    error_msg = response.json().get("error", response.json().get("detail", ""))
    assert "Invalid language" in error_msg


def test_get_capdev_insights_by_language_not_available(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test status='not_available' when language doesn't exist"""
    _override_user_and_db(client, mlgoo_user, db_session)

    # Request Filipino which doesn't exist in this assessment
    response = client.get(
        f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}/language/fil"
    )

    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "fil"
    assert data["status"] == "not_available"
    assert data["content"] is None


def test_get_capdev_insights_by_language_blgu_access_control(
    client: TestClient,
    db_session: Session,
    other_blgu_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test BLGU cannot access another BLGU's insights by language"""
    _override_user_and_db(client, other_blgu_user, db_session)

    response = client.get(
        f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}/language/ceb"
    )

    assert response.status_code == 403


# ============================================================================
# GET /api/v1/capdev/assessments/{assessment_id}/status - Get Status
# ============================================================================


def test_get_capdev_status_completed(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test status endpoint for completed insights"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get(
        f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}/status"
    )

    assert response.status_code == 200
    data = response.json()
    assert data["assessment_id"] == completed_assessment_with_capdev.id
    assert data["status"] == "completed"
    assert data["available_languages"] == ["ceb", "en"]
    assert "available in 2 language(s)" in data["message"]


def test_get_capdev_status_pending(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    pending_capdev_assessment: Assessment,
):
    """Test status endpoint for pending insights"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get(f"/api/v1/capdev/assessments/{pending_capdev_assessment.id}/status")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pending"
    assert "queued and will start soon" in data["message"]


def test_get_capdev_status_not_generated(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment: Assessment,
):
    """Test status endpoint when insights not yet generated"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get(f"/api/v1/capdev/assessments/{completed_assessment.id}/status")

    assert response.status_code == 200
    data = response.json()
    # Status might be None or "not_generated"
    assert data["status"] in ["not_generated", None]


def test_get_capdev_status_blgu_own_assessment(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test BLGU can check status of their own assessment"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.get(
        f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}/status"
    )

    assert response.status_code == 200


def test_get_capdev_status_blgu_forbidden(
    client: TestClient,
    db_session: Session,
    other_blgu_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test BLGU cannot check status of another BLGU's assessment"""
    _override_user_and_db(client, other_blgu_user, db_session)

    response = client.get(
        f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}/status"
    )

    assert response.status_code == 403


# ============================================================================
# POST /api/v1/capdev/assessments/{assessment_id}/regenerate - Regenerate (MLGOO only)
# ============================================================================


def test_regenerate_capdev_insights_mlgoo_only(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test that only MLGOO can regenerate insights"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.post(
        f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}/regenerate"
    )

    assert response.status_code == 403


def test_regenerate_capdev_insights_requires_force_if_exists(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test regeneration requires force=true if insights already exist"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.post(
        f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}/regenerate"
    )

    assert response.status_code == 400
    error_msg = response.json().get("error", response.json().get("detail", ""))
    assert "already exist" in error_msg
    assert "force=true" in error_msg


def test_regenerate_capdev_insights_not_mlgoo_approved(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    draft_assessment: Assessment,
):
    """Test cannot regenerate for assessment not MLGOO approved"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.post(f"/api/v1/capdev/assessments/{draft_assessment.id}/regenerate")

    assert response.status_code == 400
    error_msg = response.json().get("error", response.json().get("detail", ""))
    assert "not MLGOO approved" in error_msg


def test_regenerate_capdev_insights_assessment_not_found(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test 404 when assessment not found"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.post("/api/v1/capdev/assessments/99999/regenerate")

    assert response.status_code == 404


# ============================================================================
# POST /api/v1/capdev/assessments/{assessment_id}/generate-language/{language} - Add Language
# ============================================================================


def test_generate_capdev_language_mlgoo_only(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test that only MLGOO can generate additional languages"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.post(
        f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}/generate-language/fil"
    )

    assert response.status_code == 403


def test_generate_capdev_language_invalid_language(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test 400 for invalid language code"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.post(
        f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}/generate-language/invalid"
    )

    assert response.status_code == 400
    error_msg = response.json().get("error", response.json().get("detail", ""))
    assert "Invalid language" in error_msg


def test_generate_capdev_language_already_exists(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test cannot generate language that already exists"""
    _override_user_and_db(client, mlgoo_user, db_session)

    # Try to generate 'ceb' which already exists
    response = client.post(
        f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}/generate-language/ceb"
    )

    assert response.status_code == 400
    error_msg = response.json().get("error", response.json().get("detail", ""))
    assert "already exist for language" in error_msg


def test_generate_capdev_language_not_mlgoo_approved(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    draft_assessment: Assessment,
):
    """Test cannot generate language for assessment not MLGOO approved"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.post(
        f"/api/v1/capdev/assessments/{draft_assessment.id}/generate-language/fil"
    )

    assert response.status_code == 400
    error_msg = response.json().get("error", response.json().get("detail", ""))
    assert "not MLGOO approved" in error_msg


# ============================================================================
# Schema Validation Tests
# ============================================================================


def test_capdev_insights_response_schema_validation(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test that response matches CapDevInsightsResponse schema"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get(f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}")

    assert response.status_code == 200
    data = response.json()

    # Validate top-level fields
    assert "assessment_id" in data
    assert "barangay_name" in data
    assert "status" in data
    assert "available_languages" in data
    assert "insights" in data

    # Validate insights structure
    insights = data["insights"]
    assert isinstance(insights, dict)

    # Validate CapDevInsightsContent structure for Bisaya
    ceb_content = insights["ceb"]
    assert "summary" in ceb_content
    assert "governance_weaknesses" in ceb_content
    assert "recommendations" in ceb_content
    assert "capacity_development_needs" in ceb_content
    assert "suggested_interventions" in ceb_content
    assert "priority_actions" in ceb_content

    # Validate GovernanceWeakness schema
    if ceb_content["governance_weaknesses"]:
        weakness = ceb_content["governance_weaknesses"][0]
        assert "area_name" in weakness
        assert "description" in weakness
        assert "severity" in weakness

    # Validate CapDevRecommendation schema
    if ceb_content["recommendations"]:
        rec = ceb_content["recommendations"][0]
        assert "title" in rec
        assert "description" in rec
        assert "priority" in rec

    # Validate CapDevNeed schema
    if ceb_content["capacity_development_needs"]:
        need = ceb_content["capacity_development_needs"][0]
        assert "area" in need
        assert "current_gap" in need
        assert "target_state" in need


def test_capdev_status_response_schema_validation(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test that status response matches CapDevStatusResponse schema"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get(
        f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}/status"
    )

    assert response.status_code == 200
    data = response.json()

    # Validate required fields
    assert "assessment_id" in data
    assert "status" in data
    assert "available_languages" in data
    assert isinstance(data["available_languages"], list)


# ============================================================================
# Integration Tests with Database State
# ============================================================================


def test_capdev_insights_persisted_correctly(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test that insights from database are correctly returned via API"""
    _override_user_and_db(client, mlgoo_user, db_session)

    # Fetch via API
    response = client.get(f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}")

    assert response.status_code == 200
    data = response.json()

    # Verify it matches what's in the database
    db_session.refresh(completed_assessment_with_capdev)
    assert (
        data["insights"]["ceb"]["summary"]
        == completed_assessment_with_capdev.capdev_insights["ceb"]["summary"]
    )


def test_generated_at_timestamp_included(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment_with_capdev: Assessment,
):
    """Test that generated_at timestamp is included in response"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get(f"/api/v1/capdev/assessments/{completed_assessment_with_capdev.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["generated_at"] is not None


# ============================================================================
# Edge Cases
# ============================================================================


def test_capdev_insights_empty_capdev_insights_field(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment: Assessment,
):
    """Test handling of assessment with None capdev_insights"""
    _override_user_and_db(client, mlgoo_user, db_session)

    # Ensure capdev_insights is None
    completed_assessment.capdev_insights = None
    db_session.commit()

    response = client.get(f"/api/v1/capdev/assessments/{completed_assessment.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["available_languages"] == []
    assert data["insights"] is None


def test_capdev_insights_malformed_json(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessment: Assessment,
):
    """Test handling of malformed capdev_insights JSON"""
    _override_user_and_db(client, mlgoo_user, db_session)

    # Set malformed insights
    completed_assessment.capdev_insights = {"invalid": "structure"}
    db_session.commit()

    response = client.get(f"/api/v1/capdev/assessments/{completed_assessment.id}")

    # Should still return 200, just with unexpected structure
    assert response.status_code == 200


def test_unauthorized_access_no_token(client: TestClient):
    """Test that endpoints require authentication"""
    response = client.get("/api/v1/capdev/assessments/1")

    # Should be 401 or 403 depending on auth setup
    assert response.status_code in [401, 403]
