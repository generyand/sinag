# 🧪 Tests for Assessor Story 2.2.3
# Tests for the assessor assessment details endpoint functionality

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import AssessmentStatus, UserRole
from app.db.models.assessment import (
    MOV,
    Assessment,
    AssessmentResponse,
    FeedbackComment,
)
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


def create_test_assessment_for_details(db_session: Session) -> Assessment:
    """Create a test assessment with responses for details testing."""
    # Create test data
    barangay = Barangay(name="Test Barangay Details")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)

    blgu_user = User(
        email="blgu_details@test.com",
        name="BLGU User Details",
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        hashed_password="hashed_password",
    )
    db_session.add(blgu_user)
    db_session.commit()
    db_session.refresh(blgu_user)

    area = GovernanceArea(name="Test Area Details", area_type="Core")
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)

    indicator = Indicator(
        name="Test Indicator Details",
        governance_area_id=area.id,
        description="Test indicator description with technical notes",
        form_schema={"type": "object", "properties": {}},
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)

    assessment = Assessment(blgu_user_id=blgu_user.id, status=AssessmentStatus.SUBMITTED_FOR_REVIEW)
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=indicator.id,
        is_completed=True,
        response_data={"test": "data"},
    )
    db_session.add(response)
    db_session.commit()
    db_session.refresh(response)

    # Add a MOV to the response
    mov = MOV(
        filename="test_mov.mp4",
        original_filename="original_test_mov.mp4",
        file_size=1024000,
        content_type="video/mp4",
        storage_path="movs/test_mov.mp4",
        response_id=response.id,
    )
    db_session.add(mov)
    db_session.commit()
    db_session.refresh(mov)

    # Add a feedback comment
    assessor_user = User(
        email="assessor_details@test.com",
        name="Test Assessor Details",
        role=UserRole.ASSESSOR,
        governance_area_id=area.id,
        hashed_password="hashed_password",
    )
    db_session.add(assessor_user)
    db_session.commit()
    db_session.refresh(assessor_user)

    feedback = FeedbackComment(
        comment="Test feedback comment",
        comment_type="validation",
        response_id=response.id,
        assessor_id=assessor_user.id,
        is_internal_note=False,
    )
    db_session.add(feedback)
    db_session.commit()
    db_session.refresh(feedback)

    return assessment


def test_get_assessment_details_success(client, db_session):
    """Test successful retrieval of assessment details."""
    # Create test data
    assessment = create_test_assessment_for_details(db_session)

    # Create assessor user with matching governance area
    assessor = User(
        email="assessor_details2@test.com",
        name="Test Assessor Details 2",
        role=UserRole.ASSESSOR,
        governance_area_id=assessment.responses[0].indicator.governance_area_id,
        hashed_password="hashed_password",
    )
    db_session.add(assessor)
    db_session.commit()
    db_session.refresh(assessor)

    # Override dependencies
    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    # Test assessment details request
    response_result = client.get(f"/api/v1/assessor/assessments/{assessment.id}")

    # Assertions
    assert response_result.status_code == 200
    data = response_result.json()
    assert data["success"] is True
    assert data["assessment"] is not None

    # Check assessment data
    assessment_data = data["assessment"]
    assert assessment_data["id"] == assessment.id
    assert assessment_data["status"] == AssessmentStatus.SUBMITTED_FOR_REVIEW.value
    assert assessment_data["blgu_user"]["name"] == "BLGU User Details"
    assert assessment_data["blgu_user"]["barangay"]["name"] == "Test Barangay Details"

    # Check responses data
    assert len(assessment_data["responses"]) == 1
    response_data = assessment_data["responses"][0]
    assert response_data["is_completed"] is True
    assert response_data["response_data"] == {"test": "data"}

    # Check indicator data with technical notes
    indicator_data = response_data["indicator"]
    assert indicator_data["name"] == "Test Indicator Details"
    assert indicator_data["description"] == "Test indicator description with technical notes"
    assert indicator_data["technical_notes"] == "Test indicator description with technical notes"
    assert indicator_data["governance_area"]["name"] == "Test Area Details"

    # Check MOVs data
    assert len(response_data["movs"]) == 1
    mov_data = response_data["movs"][0]
    assert mov_data["filename"] == "test_mov.mp4"
    assert mov_data["original_filename"] == "original_test_mov.mp4"
    assert mov_data["file_size"] == 1024000

    # Check feedback comments
    assert len(response_data["feedback_comments"]) == 1
    feedback_data = response_data["feedback_comments"][0]
    assert feedback_data["comment"] == "Test feedback comment"
    assert feedback_data["is_internal_note"] is False
    assert feedback_data["assessor"]["name"] == "Test Assessor Details"

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


def test_get_assessment_details_not_found(client, db_session):
    """Test assessment details request for non-existent assessment."""
    # Create assessor user
    assessor = User(
        email="assessor_details3@test.com",
        name="Test Assessor Details 3",
        role=UserRole.ASSESSOR,
        governance_area_id=1,
        hashed_password="hashed_password",
    )
    db_session.add(assessor)
    db_session.commit()
    db_session.refresh(assessor)

    # Override dependencies
    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    # Test assessment details request for non-existent assessment
    response_result = client.get("/api/v1/assessor/assessments/99999")

    # Assertions
    assert response_result.status_code == 200
    data = response_result.json()
    assert data["success"] is False
    assert data["message"] == "Assessment not found"
    assert data["assessment_id"] == 99999
    assert data["assessment"] is None

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


def test_get_assessment_details_access_denied(client, db_session):
    """Test assessment details access denied for different governance area."""
    # Create test data with unique names
    barangay = Barangay(name="Test Barangay Details Access")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)

    blgu_user = User(
        email="blgu_details_access@test.com",
        name="BLGU User Details Access",
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        hashed_password="hashed_password",
    )
    db_session.add(blgu_user)
    db_session.commit()
    db_session.refresh(blgu_user)

    area = GovernanceArea(name="Test Area Details Access", area_type="Core")
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)

    indicator = Indicator(
        name="Test Indicator Details Access",
        governance_area_id=area.id,
        description="Test indicator description with technical notes",
        form_schema={"type": "object", "properties": {}},
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)

    assessment = Assessment(blgu_user_id=blgu_user.id, status=AssessmentStatus.SUBMITTED_FOR_REVIEW)
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=indicator.id,
        is_completed=True,
        response_data={"test": "data"},
    )
    db_session.add(response)
    db_session.commit()
    db_session.refresh(response)

    # Create assessor user with different governance area
    different_area = GovernanceArea(name="Different Area Details", area_type="Essential")
    db_session.add(different_area)
    db_session.commit()
    db_session.refresh(different_area)

    assessor = User(
        email="assessor_details4@test.com",
        name="Test Assessor Details 4",
        role=UserRole.ASSESSOR,
        governance_area_id=different_area.id,  # Different governance area
        hashed_password="hashed_password",
    )
    db_session.add(assessor)
    db_session.commit()
    db_session.refresh(assessor)

    # Override dependencies
    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    # Test assessment details request
    response_result = client.get(f"/api/v1/assessor/assessments/{assessment.id}")

    # Assertions
    assert response_result.status_code == 200
    data = response_result.json()
    assert data["success"] is False
    assert data["message"] == "Access denied. You can only view assessments in your governance area"
    assert data["assessment_id"] == assessment.id
    assert data["assessment"] is None

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


def test_get_assessment_details_empty_responses(client, db_session):
    """Test assessment details with no responses."""
    # Create test data with no responses
    barangay = Barangay(name="Test Barangay Empty")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)

    blgu_user = User(
        email="blgu_empty@test.com",
        name="BLGU User Empty",
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        hashed_password="hashed_password",
    )
    db_session.add(blgu_user)
    db_session.commit()
    db_session.refresh(blgu_user)

    area = GovernanceArea(name="Test Area Empty", area_type="Core")
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)

    assessment = Assessment(blgu_user_id=blgu_user.id, status=AssessmentStatus.DRAFT)
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    # Create assessor user
    assessor = User(
        email="assessor_empty@test.com",
        name="Test Assessor Empty",
        role=UserRole.ASSESSOR,
        governance_area_id=area.id,
        hashed_password="hashed_password",
    )
    db_session.add(assessor)
    db_session.commit()
    db_session.refresh(assessor)

    # Override dependencies
    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    # Test assessment details request
    response_result = client.get(f"/api/v1/assessor/assessments/{assessment.id}")

    # Assertions
    assert response_result.status_code == 200
    data = response_result.json()
    assert data["success"] is True
    assert data["assessment"] is not None
    assert data["assessment"]["id"] == assessment.id
    assert data["assessment"]["status"] == AssessmentStatus.DRAFT.value
    assert len(data["assessment"]["responses"]) == 0  # No responses

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)
