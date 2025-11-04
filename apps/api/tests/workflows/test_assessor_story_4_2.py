# 🧪 Tests for Assessor Story 4.2: MOV Upload Endpoint (Multipart)
# Tests for the POST /api/v1/assessor/assessment-responses/{response_id}/movs/upload endpoint

import io
import pytest
from unittest.mock import patch, MagicMock
from app.api import deps
from app.db.enums import AssessmentStatus, UserRole, MOVStatus
from app.db.models.assessment import Assessment, AssessmentResponse, MOV
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from fastapi.testclient import TestClient
from main import app
from sqlalchemy.orm import Session


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


def create_test_assessment_response_for_multipart_upload(
    db_session: Session,
) -> AssessmentResponse:
    """Create a test assessment response for multipart upload testing."""
    # Create test data
    barangay = Barangay(name="Test Barangay Multipart")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)

    blgu_user = User(
        email="blgu_multipart@test.com",
        name="BLGU User Multipart",
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        hashed_password="hashed_password",
    )
    db_session.add(blgu_user)
    db_session.commit()
    db_session.refresh(blgu_user)

    area = GovernanceArea(name="Test Area Multipart", area_type="Core")
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)

    indicator = Indicator(
        name="Test Indicator Multipart",
        governance_area_id=area.id,
        description="Test indicator description for multipart upload",
        form_schema={"type": "object", "properties": {}},
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)

    assessment = Assessment(
        blgu_user_id=blgu_user.id, status=AssessmentStatus.SUBMITTED_FOR_REVIEW
    )
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


@patch("app.services.assessor_service.storage_service.upload_mov")
def test_upload_mov_file_multipart_success(
    mock_storage_upload,
    client,
    db_session,
):
    """Test successful multipart MOV file upload by assessor."""
    # Create test data
    response = create_test_assessment_response_for_multipart_upload(db_session)

    # Create assessor user with matching governance area
    assessor = User(
        email="assessor_multipart@test.com",
        name="Test Assessor Multipart",
        role=UserRole.AREA_ASSESSOR,
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

    # Mock storage service response (must match what storage_service.upload_mov returns)
    mock_storage_upload.return_value = {
        "storage_path": f"assessment-{response.assessment_id}/response-{response.id}/123-test_video.mp4",
        "file_size": 1024000,
        "content_type": "video/mp4",
        "filename": "123-test_video.mp4",
        "original_filename": "test_video.mp4",
    }
    
    # Note: The assessor_service will create the MOV in DB and return mov_dict with id, status, uploaded_at
    # So we don't need to mock that part - it will be created in the database

    # Create multipart form data
    file_content = b"fake video content for testing"
    files = {"file": ("test_video.mp4", io.BytesIO(file_content), "video/mp4")}
    data = {"filename": "custom_filename.mp4"}

    # Test multipart upload request
    response_result = client.post(
        f"/api/v1/assessor/assessment-responses/{response.id}/movs/upload",
        files=files,
        data=data,
    )

    # Assertions
    assert response_result.status_code == 200, f"Expected 200, got {response_result.status_code}. Response: {response_result.json() if response_result.status_code != 200 else 'OK'}"
    data_result = response_result.json()
    assert data_result["success"] is True
    assert data_result["message"] == "MOV uploaded successfully by assessor"
    assert data_result["mov_id"] is not None
    assert data_result["storage_path"] is not None
    assert "mov" in data_result

    # Verify MOV was created in database
    mov = db_session.query(MOV).filter(MOV.id == data_result["mov_id"]).first()
    assert mov is not None
    assert mov.filename == "123-test_video.mp4"
    assert mov.original_filename == "custom_filename.mp4"  # Custom filename used
    assert mov.file_size == 1024000
    assert mov.content_type == "video/mp4"
    assert mov.response_id == response.id
    assert mov.status == MOVStatus.UPLOADED

    # Verify storage service was called with correct parameters
    mock_storage_upload.assert_called_once()
    call_kwargs = mock_storage_upload.call_args.kwargs
    assert call_kwargs["response_id"] == response.id
    assert call_kwargs["db"] == db_session

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


@patch("app.services.assessor_service.storage_service.upload_mov")
def test_upload_mov_file_without_custom_filename(
    mock_storage_upload,
    client,
    db_session,
):
    """Test multipart upload without custom filename (uses file.filename)."""
    response = create_test_assessment_response_for_multipart_upload(db_session)

    assessor = User(
        email="assessor_multipart2@test.com",
        name="Test Assessor Multipart 2",
        role=UserRole.AREA_ASSESSOR,
        governance_area_id=response.indicator.governance_area_id,
        hashed_password="hashed_password",
    )
    db_session.add(assessor)
    db_session.commit()
    db_session.refresh(assessor)

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

    mock_storage_upload.return_value = {
        "storage_path": f"assessment-{response.assessment_id}/response-{response.id}/456-original_file.pdf",
        "file_size": 2048,
        "content_type": "application/pdf",
        "filename": "456-original_file.pdf",
        "original_filename": "original_file.pdf",
    }

    files = {"file": ("original_file.pdf", io.BytesIO(b"pdf content"), "application/pdf")}
    # No filename in data - should use file.filename

    response_result = client.post(
        f"/api/v1/assessor/assessment-responses/{response.id}/movs/upload",
        files=files,
    )

    assert response_result.status_code == 200
    data_result = response_result.json()
    assert data_result["success"] is True

    # Verify original filename was used
    mov = db_session.query(MOV).filter(MOV.id == data_result["mov_id"]).first()
    assert mov.original_filename == "original_file.pdf"

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


@patch("app.services.assessor_service.storage_service.upload_mov")
def test_upload_mov_file_response_not_found(
    mock_storage_upload,
    client,
    db_session,
):
    """Test multipart upload for non-existent assessment response."""
    assessor = User(
        email="assessor_multipart3@test.com",
        name="Test Assessor Multipart 3",
        role=UserRole.AREA_ASSESSOR,
        governance_area_id=1,
        hashed_password="hashed_password",
    )
    db_session.add(assessor)
    db_session.commit()
    db_session.refresh(assessor)

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

    files = {"file": ("test.mp4", io.BytesIO(b"content"), "video/mp4")}

    response_result = client.post(
        "/api/v1/assessor/assessment-responses/99999/movs/upload",
        files=files,
    )

    assert response_result.status_code == 200
    data_result = response_result.json()
    assert data_result["success"] is False
    assert data_result["message"] == "Assessment response not found"
    assert data_result["mov_id"] is None

    # Storage service should not be called if response not found
    mock_storage_upload.assert_not_called()

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


@patch("app.services.assessor_service.storage_service.upload_mov")
def test_upload_mov_file_access_denied(
    mock_storage_upload,
    client,
    db_session,
):
    """Test multipart upload access denied for different governance area."""
    response = create_test_assessment_response_for_multipart_upload(db_session)

    # Create assessor with different governance area
    different_area = GovernanceArea(name="Different Area Multipart", area_type="Essential")
    db_session.add(different_area)
    db_session.commit()
    db_session.refresh(different_area)

    assessor = User(
        email="assessor_multipart4@test.com",
        name="Test Assessor Multipart 4",
        role=UserRole.AREA_ASSESSOR,
        governance_area_id=different_area.id,  # Different governance area
        hashed_password="hashed_password",
    )
    db_session.add(assessor)
    db_session.commit()
    db_session.refresh(assessor)

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

    files = {"file": ("test.mp4", io.BytesIO(b"content"), "video/mp4")}

    response_result = client.post(
        f"/api/v1/assessor/assessment-responses/{response.id}/movs/upload",
        files=files,
    )

    assert response_result.status_code == 200
    data_result = response_result.json()
    assert data_result["success"] is False
    assert (
        data_result["message"]
        == "Access denied. You can only upload MOVs for responses in your governance area"
    )
    assert data_result["mov_id"] is None

    # Storage service should not be called if access denied
    mock_storage_upload.assert_not_called()

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


@patch("app.services.assessor_service.storage_service.upload_mov")
def test_upload_mov_file_storage_error(
    mock_storage_upload,
    client,
    db_session,
):
    """Test multipart upload handles storage service errors."""
    response = create_test_assessment_response_for_multipart_upload(db_session)

    assessor = User(
        email="assessor_multipart5@test.com",
        name="Test Assessor Multipart 5",
        role=UserRole.AREA_ASSESSOR,
        governance_area_id=response.indicator.governance_area_id,
        hashed_password="hashed_password",
    )
    db_session.add(assessor)
    db_session.commit()
    db_session.refresh(assessor)

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

    # Mock storage service to raise ValueError
    mock_storage_upload.side_effect = ValueError("Assessment response not found in storage")

    files = {"file": ("test.mp4", io.BytesIO(b"content"), "video/mp4")}

    response_result = client.post(
        f"/api/v1/assessor/assessment-responses/{response.id}/movs/upload",
        files=files,
    )

    assert response_result.status_code == 200
    data_result = response_result.json()
    assert data_result["success"] is False
    assert "Upload failed" in data_result["message"]
    assert data_result["mov_id"] is None

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


@patch("app.services.assessor_service.storage_service.upload_mov")
def test_upload_mov_file_storage_exception(
    mock_storage_upload,
    client,
    db_session,
):
    """Test multipart upload handles general storage exceptions."""
    response = create_test_assessment_response_for_multipart_upload(db_session)

    assessor = User(
        email="assessor_multipart6@test.com",
        name="Test Assessor Multipart 6",
        role=UserRole.AREA_ASSESSOR,
        governance_area_id=response.indicator.governance_area_id,
        hashed_password="hashed_password",
    )
    db_session.add(assessor)
    db_session.commit()
    db_session.refresh(assessor)

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

    # Mock storage service to raise general Exception
    mock_storage_upload.side_effect = Exception("Network error")

    files = {"file": ("test.mp4", io.BytesIO(b"content"), "video/mp4")}

    response_result = client.post(
        f"/api/v1/assessor/assessment-responses/{response.id}/movs/upload",
        files=files,
    )

    assert response_result.status_code == 200
    data_result = response_result.json()
    assert data_result["success"] is False
    assert "Storage upload error" in data_result["message"]
    assert data_result["mov_id"] is None

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


@patch("app.services.storage_service.storage_service.upload_mov")
def test_upload_mov_file_missing_file(
    mock_storage_upload,
    client,
    db_session,
):
    """Test multipart upload fails when file is missing."""
    response = create_test_assessment_response_for_multipart_upload(db_session)

    assessor = User(
        email="assessor_multipart7@test.com",
        name="Test Assessor Multipart 7",
        role=UserRole.AREA_ASSESSOR,
        governance_area_id=response.indicator.governance_area_id,
        hashed_password="hashed_password",
    )
    db_session.add(assessor)
    db_session.commit()
    db_session.refresh(assessor)

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

    # Request without file field
    response_result = client.post(
        f"/api/v1/assessor/assessment-responses/{response.id}/movs/upload",
    )

    # FastAPI should return validation error for missing required file
    assert response_result.status_code == 422

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)

