# 🧪 Tests for Assessor Story 2.2.2
# Tests for the assessor-side MOV uploader endpoint functionality

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import AssessmentStatus, UserRole
from app.db.models.assessment import MOV, Assessment, AssessmentResponse
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


def create_test_assessment_response_for_mov(db_session: Session) -> AssessmentResponse:
    """Create a test assessment response for MOV upload testing."""
    # Create test data
    barangay = Barangay(name="Test Barangay MOV")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)

    blgu_user = User(
        email="blgu_mov@test.com",
        name="BLGU User MOV",
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        hashed_password="hashed_password",
    )
    db_session.add(blgu_user)
    db_session.commit()
    db_session.refresh(blgu_user)

    area = GovernanceArea(name="Test Area MOV", code="TA", area_type="Core")
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)

    indicator = Indicator(
        name="Test Indicator MOV",
        governance_area_id=area.id,
        description="Test indicator description for MOV",
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


def test_upload_mov_success(client, db_session):
    """Test successful MOV upload by assessor."""
    # Create test data
    response = create_test_assessment_response_for_mov(db_session)

    # Create assessor user with matching governance area
    assessor = User(
        email="assessor_mov@test.com",
        name="Test Assessor MOV",
        role=UserRole.ASSESSOR,
        governance_area_id=response.indicator.governance_area_id,
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

    # Test MOV upload request
    mov_data = {
        "filename": "test_mov.mp4",
        "original_filename": "original_test_mov.mp4",
        "file_size": 1024000,
        "content_type": "video/mp4",
        "storage_path": "movs/test_mov.mp4",
        "response_id": response.id,
    }

    response_result = client.post(
        f"/api/v1/assessor/assessment-responses/{response.id}/movs",
        json=mov_data,
    )

    # Assertions
    assert response_result.status_code == 200
    data = response_result.json()
    assert data["success"] is True
    assert data["message"] == "MOV uploaded successfully"
    assert data["mov_id"] is not None

    # Check that the MOV was created in the database
    mov = db_session.query(MOV).filter(MOV.id == data["mov_id"]).first()
    assert mov is not None
    assert mov.filename == "test_mov.mp4"
    assert mov.original_filename == "original_test_mov.mp4"
    assert mov.file_size == 1024000
    assert mov.content_type == "video/mp4"
    assert mov.storage_path == "movs/test_mov.mp4"
    assert mov.response_id == response.id

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


def test_upload_mov_response_not_found(client, db_session):
    """Test MOV upload for non-existent assessment response."""
    # Create assessor user
    assessor = User(
        email="assessor_mov2@test.com",
        name="Test Assessor MOV 2",
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

    # Test MOV upload request for non-existent response
    mov_data = {
        "filename": "test_mov.mp4",
        "original_filename": "original_test_mov.mp4",
        "file_size": 1024000,
        "content_type": "video/mp4",
        "storage_path": "movs/test_mov.mp4",
        "response_id": 99999,
    }

    response_result = client.post("/api/v1/assessor/assessment-responses/99999/movs", json=mov_data)

    # Assertions
    assert response_result.status_code == 200
    data = response_result.json()
    assert data["success"] is False
    assert data["message"] == "Assessment response not found"
    assert data["mov_id"] is None

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


def test_upload_mov_access_denied(client, db_session):
    """Test MOV upload access denied for different governance area."""
    # Create test data with unique names
    barangay = Barangay(name="Test Barangay MOV Access")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)

    blgu_user = User(
        email="blgu_mov_access@test.com",
        name="BLGU User MOV Access",
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        hashed_password="hashed_password",
    )
    db_session.add(blgu_user)
    db_session.commit()
    db_session.refresh(blgu_user)

    area = GovernanceArea(name="Test Area MOV Access", code="TA", area_type="Core")
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)

    indicator = Indicator(
        name="Test Indicator MOV Access",
        governance_area_id=area.id,
        description="Test indicator description for MOV Access",
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
    different_area = GovernanceArea(name="Different Area MOV", code="DA", area_type="Essential")
    db_session.add(different_area)
    db_session.commit()
    db_session.refresh(different_area)

    assessor = User(
        email="assessor_mov3@test.com",
        name="Test Assessor MOV 3",
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

    # Test MOV upload request
    mov_data = {
        "filename": "test_mov.mp4",
        "original_filename": "original_test_mov.mp4",
        "file_size": 1024000,
        "content_type": "video/mp4",
        "storage_path": "movs/test_mov.mp4",
        "response_id": response.id,
    }

    response_result = client.post(
        f"/api/v1/assessor/assessment-responses/{response.id}/movs",
        json=mov_data,
    )

    # Assertions
    assert response_result.status_code == 200
    data = response_result.json()
    assert data["success"] is False
    assert (
        data["message"]
        == "Access denied. You can only upload MOVs for responses in your governance area"
    )
    assert data["mov_id"] is None

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


def test_upload_mov_response_id_mismatch(client, db_session):
    """Test MOV upload with mismatched response_id."""
    # Create assessor user
    assessor = User(
        email="assessor_mov4@test.com",
        name="Test Assessor MOV 4",
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

    # Test MOV upload request with mismatched response_id
    mov_data = {
        "filename": "test_mov.mp4",
        "original_filename": "original_test_mov.mp4",
        "file_size": 1024000,
        "content_type": "video/mp4",
        "storage_path": "movs/test_mov.mp4",
        "response_id": 123,  # Different from URL parameter
    }

    response_result = client.post("/api/v1/assessor/assessment-responses/456/movs", json=mov_data)

    # Assertions
    assert response_result.status_code == 200
    data = response_result.json()
    assert data["success"] is False
    assert data["message"] == "MOV response_id does not match URL parameter"
    assert data["mov_id"] is None

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)
