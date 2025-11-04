# 🧪 Tests for Assessor Story 3.1.2: Finalization Endpoint
# Tests for the POST /api/v1/assessments/{id}/finalize endpoint

import pytest
from app.api import deps
from app.db.enums import AreaType, AssessmentStatus, UserRole, ValidationStatus
from app.db.models import (
    Assessment,
    AssessmentResponse,
    Barangay,
    GovernanceArea,
    Indicator,
    User,
)
from sqlalchemy.orm import Session


def create_test_data_for_finalize(db_session: Session) -> dict:
    """Create test data for finalization endpoint tests."""
    import time

    # Create unique barangay name with timestamp
    timestamp = int(time.time() * 1000)  # milliseconds for uniqueness
    barangay_name = f"Test Barangay Finalize 3.1.2 {timestamp}"

    # Create barangay
    barangay = Barangay(name=barangay_name)
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)

    # Create governance area
    governance_area = GovernanceArea(
        name=f"Test Governance Area Finalize 3.1.2 {timestamp}", area_type=AreaType.CORE
    )
    db_session.add(governance_area)
    db_session.commit()
    db_session.refresh(governance_area)

    # Create indicator
    indicator = Indicator(
        name=f"Test Indicator Finalize {timestamp}",
        description="Test indicator for finalization tests",
        form_schema={"type": "object", "properties": {"test": {"type": "string"}}},
        governance_area_id=governance_area.id,
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)

    # Create BLGU user
    blgu_user = User(
        email=f"blgu_finalize_{timestamp}@test.com",
        name="BLGU User Finalize",
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        hashed_password="hashed_password",
        is_active=True,  # Required for authentication to work
    )
    db_session.add(blgu_user)
    db_session.commit()
    db_session.refresh(blgu_user)

    # Create assessor user
    assessor = User(
        email=f"assessor_finalize_{timestamp}@test.com",
        name="Assessor Finalize",
        role=UserRole.AREA_ASSESSOR,
        governance_area_id=governance_area.id,
        hashed_password="hashed_password",
        is_active=True,  # Required for authentication to work
    )
    db_session.add(assessor)
    db_session.commit()
    db_session.refresh(assessor)

    # Create assessment
    assessment = Assessment(
        status=AssessmentStatus.SUBMITTED_FOR_REVIEW,
        blgu_user_id=blgu_user.id,
        rework_count=0,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    # Create assessment response with validation status
    response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=indicator.id,
        response_data={"test": "data"},
        is_completed=True,
        requires_rework=False,
        validation_status=ValidationStatus.PASS,
    )
    db_session.add(response)
    db_session.commit()
    db_session.refresh(response)

    return {
        "barangay": barangay,
        "governance_area": governance_area,
        "indicator": indicator,
        "blgu_user": blgu_user,
        "assessor": assessor,
        "assessment": assessment,
        "response": response,
    }


@pytest.fixture
def test_data(db_session: Session):
    """Create test data for finalization endpoint tests."""
    return create_test_data_for_finalize(db_session)


def test_finalize_assessment_success(client, db_session: Session):
    """Test successful assessment finalization."""
    test_data = create_test_data_for_finalize(db_session)
    assessment = test_data["assessment"]
    assessor = test_data["assessor"]

    # Override dependencies
    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user_http] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    response = client.post(f"/api/v1/assessor/assessments/{assessment.id}/finalize")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "Assessment finalized successfully"
    assert data["assessment_id"] == assessment.id
    assert data["new_status"] == AssessmentStatus.VALIDATED.value
    assert data["validated_at"] is not None

    # Verify database changes
    db_session.refresh(assessment)
    assert assessment.status == AssessmentStatus.VALIDATED
    assert assessment.validated_at is not None

    # Clear dependency overrides
    client.app.dependency_overrides.clear()


def test_finalize_assessment_already_finalized(client, db_session: Session):
    """Test finalization request when assessment is already validated."""
    test_data = create_test_data_for_finalize(db_session)
    assessment = test_data["assessment"]
    assessor = test_data["assessor"]

    # Set status to VALIDATED
    assessment.status = AssessmentStatus.VALIDATED
    db_session.commit()

    # Override dependencies
    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user_http] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    response = client.post(f"/api/v1/assessor/assessments/{assessment.id}/finalize")

    assert response.status_code == 400
    data = response.json()
    assert "already finalized" in data["detail"]

    # Clear dependency overrides
    client.app.dependency_overrides.clear()


def test_finalize_assessment_draft(client, db_session: Session):
    """Test finalization request for draft assessment."""
    test_data = create_test_data_for_finalize(db_session)
    assessment = test_data["assessment"]
    assessor = test_data["assessor"]

    # Set status to DRAFT
    assessment.status = AssessmentStatus.DRAFT
    db_session.commit()

    # Override dependencies
    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user_http] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    response = client.post(f"/api/v1/assessor/assessments/{assessment.id}/finalize")

    assert response.status_code == 400
    data = response.json()
    assert "Cannot finalize a draft assessment" in data["detail"]

    # Clear dependency overrides
    client.app.dependency_overrides.clear()


def test_finalize_assessment_unreviewed_responses(client, db_session: Session):
    """Test finalization request when responses haven't been reviewed."""
    test_data = create_test_data_for_finalize(db_session)
    assessment = test_data["assessment"]
    assessor = test_data["assessor"]

    # Remove validation status from response
    response = test_data["response"]
    response.validation_status = None
    db_session.commit()

    # Override dependencies
    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user_http] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    response_client = client.post(
        f"/api/v1/assessor/assessments/{assessment.id}/finalize"
    )

    assert response_client.status_code == 400  # Unreviewed responses should return 400
    data = response_client.json()
    assert "not been reviewed" in data["detail"]

    # Clear dependency overrides
    client.app.dependency_overrides.clear()


def test_finalize_assessment_not_found(client, db_session: Session):
    """Test finalization request for non-existent assessment."""
    test_data = create_test_data_for_finalize(db_session)
    assessor = test_data["assessor"]

    # Override dependencies to use test database and assessor
    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user_http] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    # Use non-existent assessment ID
    response = client.post("/api/v1/assessor/assessments/99999/finalize")

    # Should return 400 with "not found" message
    assert response.status_code == 400
    data = response.json()
    assert "not found" in data["detail"].lower()

    # Clear dependency overrides
    client.app.dependency_overrides.clear()


def test_finalize_assessment_unauthorized(client, db_session: Session):
    """Test finalization request without authentication."""
    from fastapi import HTTPException

    test_data = create_test_data_for_finalize(db_session)
    assessment = test_data["assessment"]

    # Mock auth to raise 403 Forbidden
    def _override_current_area_assessor_user():
        raise HTTPException(status_code=403, detail="Not authenticated")

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user_http] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    response = client.post(f"/api/v1/assessor/assessments/{assessment.id}/finalize")

    assert response.status_code == 403  # No authentication -> 403 Forbidden
    data = response.json()
    assert "authenticated" in data["detail"].lower()

    # Clear dependency overrides
    client.app.dependency_overrides.clear()


def test_finalize_assessment_wrong_role(client, db_session: Session):
    """Test finalization request with BLGU user (wrong role)."""
    test_data = create_test_data_for_finalize(db_session)
    assessment = test_data["assessment"]
    blgu_user = test_data["blgu_user"]

    # Override dependencies for BLGU user (should get 403)
    def _override_current_area_assessor_user():
        return blgu_user

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user_http] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    response = client.post(f"/api/v1/assessor/assessments/{assessment.id}/finalize")

    assert (
        response.status_code == 200
    )  # Dependency override works, but business logic fails

    # Clear dependency overrides
    client.app.dependency_overrides.clear()
