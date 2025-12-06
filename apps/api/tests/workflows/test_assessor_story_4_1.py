# 🧪 Tests for Assessor Story 4.1: Supabase Integration
# Tests for the storage_service.py functionality

import io
from unittest.mock import MagicMock, PropertyMock, patch

import pytest
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.db.enums import AssessmentStatus, UserRole
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from app.services.storage_service import StorageService, _get_supabase_client


@pytest.fixture
def storage_service_instance():
    """Create a fresh StorageService instance for testing."""
    return StorageService()


@pytest.fixture
def mock_supabase_client():
    """Create a mock Supabase client for testing."""
    mock_client = MagicMock()
    mock_storage = MagicMock()
    mock_bucket = MagicMock()

    # Configure the storage chain: client.storage.from_("movs").upload()
    mock_bucket.upload.return_value = {"path": "test_path", "id": "test_id"}
    mock_storage.from_.return_value = mock_bucket
    mock_client.storage = mock_storage

    return mock_client


def create_test_assessment_response_for_storage(
    db_session: Session,
) -> AssessmentResponse:
    """Create a test assessment response for storage testing."""
    # Create test data
    barangay = Barangay(name="Test Barangay Storage")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)

    blgu_user = User(
        email="blgu_storage@test.com",
        name="BLGU User Storage",
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        hashed_password="hashed_password",
    )
    db_session.add(blgu_user)
    db_session.commit()
    db_session.refresh(blgu_user)

    area = GovernanceArea(name="Test Area Storage", area_type="Core")
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)

    indicator = Indicator(
        name="Test Indicator Storage",
        governance_area_id=area.id,
        description="Test indicator description for storage",
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


def test_get_supabase_client_not_configured(monkeypatch):
    """Test that _get_supabase_client raises ValueError when Supabase is not configured."""
    from app.core.config import settings

    # Temporarily remove Supabase config
    original_url = settings.SUPABASE_URL
    original_key = settings.SUPABASE_SERVICE_ROLE_KEY

    monkeypatch.setattr(settings, "SUPABASE_URL", "")
    monkeypatch.setattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "")

    # Reset the global client by importing and resetting
    import app.services.storage_service as storage_module

    storage_module._supabase_client = None

    try:
        with pytest.raises(ValueError, match="Supabase storage not configured"):
            _get_supabase_client()
    finally:
        # Restore original values and reset client
        monkeypatch.setattr(settings, "SUPABASE_URL", original_url)
        monkeypatch.setattr(settings, "SUPABASE_SERVICE_ROLE_KEY", original_key)
        storage_module._supabase_client = None


@patch("app.services.storage_service._get_supabase_client")
def test_upload_mov_success(
    mock_get_client,
    storage_service_instance,
    mock_supabase_client,
    db_session,
):
    """Test successful MOV upload to Supabase Storage."""
    # Setup
    mock_get_client.return_value = mock_supabase_client
    response = create_test_assessment_response_for_storage(db_session)

    # Create a mock file
    file_content = b"fake video content"
    mock_file = UploadFile(
        filename="test_video.mp4",
        file=io.BytesIO(file_content),
    )
    # Use PropertyMock to set content_type (read-only property)
    type(mock_file).content_type = PropertyMock(return_value="video/mp4")

    # Execute
    result = storage_service_instance.upload_mov(
        file=mock_file, response_id=response.id, db=db_session
    )

    # Assertions
    assert "storage_path" in result
    assert result["storage_path"].startswith(
        f"assessment-{response.assessment_id}/response-{response.id}/"
    )
    assert result["file_size"] == len(file_content)
    assert result["content_type"] == "video/mp4"
    assert result["filename"] is not None
    assert "original_filename" in result

    # Verify Supabase upload was called
    mock_supabase_client.storage.from_.assert_called_once_with("movs")
    mock_bucket = mock_supabase_client.storage.from_.return_value
    mock_bucket.upload.assert_called_once()


@patch("app.services.storage_service._get_supabase_client")
def test_upload_mov_response_not_found(
    mock_get_client,
    storage_service_instance,
    mock_supabase_client,
    db_session,
):
    """Test upload fails when assessment response not found."""
    mock_get_client.return_value = mock_supabase_client

    mock_file = UploadFile(
        filename="test_video.mp4",
        file=io.BytesIO(b"fake content"),
    )

    with pytest.raises(ValueError, match="Assessment response .* not found"):
        storage_service_instance.upload_mov(file=mock_file, response_id=99999, db=db_session)


@patch("app.services.storage_service._get_supabase_client")
def test_upload_mov_sanitizes_filename(
    mock_get_client,
    storage_service_instance,
    mock_supabase_client,
    db_session,
):
    """Test that filenames are sanitized to prevent path traversal."""
    mock_get_client.return_value = mock_supabase_client
    response = create_test_assessment_response_for_storage(db_session)

    # Create a file with dangerous filename
    dangerous_filename = "../../../etc/passwd.mp4"
    mock_file = UploadFile(
        filename=dangerous_filename,
        file=io.BytesIO(b"fake content"),
    )

    result = storage_service_instance.upload_mov(
        file=mock_file, response_id=response.id, db=db_session
    )

    # Verify filename was sanitized (slashes and dots replaced)
    assert "../" not in result["storage_path"]
    assert ".." not in result["filename"]
    assert "/" not in result["filename"]


@patch("app.services.storage_service._get_supabase_client")
def test_upload_mov_adds_timestamp(
    mock_get_client,
    storage_service_instance,
    mock_supabase_client,
    db_session,
):
    """Test that uploaded filenames include a timestamp for uniqueness."""
    mock_get_client.return_value = mock_supabase_client
    response = create_test_assessment_response_for_storage(db_session)

    mock_file = UploadFile(
        filename="test.mp4",
        file=io.BytesIO(b"fake content"),
    )

    result = storage_service_instance.upload_mov(
        file=mock_file, response_id=response.id, db=db_session
    )

    # Verify filename has timestamp prefix (format: timestamp-filename)
    filename_parts = result["filename"].split("-", 1)
    assert len(filename_parts) == 2
    assert filename_parts[0].isdigit()  # Should be numeric timestamp
    assert filename_parts[1] == "test.mp4"


@patch("app.services.storage_service._get_supabase_client")
def test_upload_mov_storage_path_format(
    mock_get_client,
    storage_service_instance,
    mock_supabase_client,
    db_session,
):
    """Test that storage paths follow the expected format."""
    mock_get_client.return_value = mock_supabase_client
    response = create_test_assessment_response_for_storage(db_session)

    mock_file = UploadFile(
        filename="document.pdf",
        file=io.BytesIO(b"fake pdf content"),
    )
    # Use PropertyMock to set content_type (read-only property)
    type(mock_file).content_type = PropertyMock(return_value="application/pdf")

    result = storage_service_instance.upload_mov(
        file=mock_file, response_id=response.id, db=db_session
    )

    # Verify storage path format: assessment-{id}/response-{id}/{filename}
    expected_prefix = f"assessment-{response.assessment_id}/response-{response.id}/"
    assert result["storage_path"].startswith(expected_prefix)

    # Verify the file options include content type
    mock_bucket = mock_supabase_client.storage.from_.return_value
    call_args = mock_bucket.upload.call_args
    assert "file_options" in call_args.kwargs
    assert call_args.kwargs["file_options"]["content-type"] == "application/pdf"


@patch("app.services.storage_service._get_supabase_client")
def test_upload_mov_handles_missing_filename(
    mock_get_client,
    storage_service_instance,
    mock_supabase_client,
    db_session,
):
    """Test upload works when filename is not provided."""
    mock_get_client.return_value = mock_supabase_client
    response = create_test_assessment_response_for_storage(db_session)

    # Create file without filename
    mock_file = UploadFile(
        file=io.BytesIO(b"fake content"),
    )
    # Use PropertyMock for read-only properties
    type(mock_file).filename = PropertyMock(return_value=None)
    type(mock_file).content_type = PropertyMock(return_value=None)

    result = storage_service_instance.upload_mov(
        file=mock_file, response_id=response.id, db=db_session
    )

    # Should use default filename
    assert result["filename"] is not None
    assert result["original_filename"] is not None
    assert result["content_type"] == "application/octet-stream"  # Default


@patch("app.services.storage_service._get_supabase_client")
def test_upload_mov_handles_supabase_error(
    mock_get_client,
    storage_service_instance,
    mock_supabase_client,
    db_session,
):
    """Test upload handles Supabase storage errors gracefully."""
    mock_get_client.return_value = mock_supabase_client
    response = create_test_assessment_response_for_storage(db_session)

    # Configure mock to raise error
    mock_bucket = mock_supabase_client.storage.from_.return_value
    mock_bucket.upload.side_effect = Exception("Supabase connection error")

    mock_file = UploadFile(
        filename="test.mp4",
        file=io.BytesIO(b"fake content"),
    )

    with pytest.raises(Exception, match="Supabase connection error"):
        storage_service_instance.upload_mov(file=mock_file, response_id=response.id, db=db_session)


@patch("app.services.storage_service._get_supabase_client")
def test_upload_mov_handles_supabase_error_response(
    mock_get_client,
    storage_service_instance,
    mock_supabase_client,
    db_session,
):
    """Test upload handles Supabase error responses in result dict."""
    mock_get_client.return_value = mock_supabase_client
    response = create_test_assessment_response_for_storage(db_session)

    # Configure mock to return error dict
    mock_bucket = mock_supabase_client.storage.from_.return_value
    mock_bucket.upload.return_value = {"error": "Bucket not found"}

    mock_file = UploadFile(
        filename="test.mp4",
        file=io.BytesIO(b"fake content"),
    )

    with pytest.raises(Exception, match="Supabase upload error"):
        storage_service_instance.upload_mov(file=mock_file, response_id=response.id, db=db_session)
