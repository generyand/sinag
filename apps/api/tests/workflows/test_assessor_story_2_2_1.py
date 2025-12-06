# 🧪 Tests for Assessor Story 2.2.1
# Tests for the validation endpoint functionality

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import AssessmentStatus, UserRole, ValidationStatus
from app.db.models.assessment import Assessment, AssessmentResponse, FeedbackComment
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


def create_test_assessment_response(db_session: Session) -> AssessmentResponse:
    """Create a test assessment response for validation testing."""
    # Create test data
    barangay = Barangay(name="Test Barangay")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)

    blgu_user = User(
        email="blgu@test.com",
        name="BLGU User",
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        hashed_password="hashed_password",
    )
    db_session.add(blgu_user)
    db_session.commit()
    db_session.refresh(blgu_user)

    area = GovernanceArea(name="Test Area", code="TA", area_type="Core")
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)

    indicator = Indicator(
        name="Test Indicator",
        governance_area_id=area.id,
        description="Test indicator description",
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

    return response


def test_validate_assessment_response_success(client, db_session):
    """Test successful validation of an assessment response."""
    # Create test data
    response = create_test_assessment_response(db_session)

    # Create assessor user
    assessor = User(
        email="assessor@test.com",
        name="Test Assessor",
        role=UserRole.ASSESSOR,
        governance_area_id=1,  # Assuming area with ID 1 exists
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

    # Test validation request
    validation_data = {
        "validation_status": "Pass",
        "public_comment": "Great work!",
        "internal_note": "This response meets all requirements.",
    }

    response_result = client.post(
        f"/api/v1/assessor/assessment-responses/{response.id}/validate",
        json=validation_data,
    )

    # Assertions
    assert response_result.status_code == 200
    data = response_result.json()
    assert data["success"] is True
    assert data["message"] == "Assessment response validated successfully"
    assert data["assessment_response_id"] == response.id
    assert data["validation_status"] == "Pass"

    # Check that the validation status was updated in the database
    updated_response = (
        db_session.query(AssessmentResponse).filter(AssessmentResponse.id == response.id).first()
    )
    assert updated_response.validation_status == ValidationStatus.PASS

    # Check that feedback comments were created
    feedback_comments = (
        db_session.query(FeedbackComment).filter(FeedbackComment.response_id == response.id).all()
    )
    assert len(feedback_comments) == 2

    # Check public comment
    public_comment = next((fc for fc in feedback_comments if not fc.is_internal_note), None)
    assert public_comment is not None
    assert public_comment.comment == "Great work!"
    assert public_comment.is_internal_note is False

    # Check internal note
    internal_note = next((fc for fc in feedback_comments if fc.is_internal_note), None)
    assert internal_note is not None
    assert internal_note.comment == "This response meets all requirements."
    assert internal_note.is_internal_note is True

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


def test_validate_assessment_response_not_found(client, db_session):
    """Test validation of non-existent assessment response."""
    # Create assessor user
    assessor = User(
        email="assessor2@test.com",
        name="Test Assessor 2",
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

    # Test validation request for non-existent response
    validation_data = {"validation_status": "Pass", "public_comment": "Great work!"}

    response_result = client.post(
        "/api/v1/assessor/assessment-responses/99999/validate", json=validation_data
    )

    # Assertions
    assert response_result.status_code == 200
    data = response_result.json()
    assert data["success"] is False
    assert data["message"] == "Assessment response not found"
    assert data["assessment_response_id"] == 99999

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)
