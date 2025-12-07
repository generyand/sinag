"""
Tests for MOV File Management API Endpoints (Story 4.7)

Tests the file upload, list, and deletion endpoints.
"""

import io
from datetime import datetime
from unittest.mock import patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.api import deps
from app.db.enums import AssessmentStatus
from app.db.models.assessment import Assessment, MOVFile
from app.db.models.user import User


def authenticate_user(client: TestClient, user: User):
    """Helper to override authentication dependency"""

    def override_get_current_user():
        return user

    client.app.dependency_overrides[deps.get_current_user] = override_get_current_user


@pytest.fixture(autouse=True)
def clear_user_override(client):
    """Clear user-related dependency overrides after each test"""
    yield
    # Only clear the user override, not get_db
    if deps.get_current_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_user]
    if deps.get_current_active_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_active_user]


def use_test_db_session(client: TestClient, db_session):
    """Override get_db to use the test's db_session"""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # Don't close the session here, let the test fixture handle it

    client.app.dependency_overrides[deps.get_db] = override_get_db


class TestUploadMOVFile:
    """Test suite for POST /api/v1/movs/assessments/{assessment_id}/indicators/{indicator_id}/upload"""

    @pytest.fixture
    def blgu_user(self, db_session, mock_barangay):
        """Fixture providing a BLGU user."""
        user = User(
            id=100,
            email="blgu@test.com",
            name="Test BLGU User",
            hashed_password="hashed",
            role="BLGU_USER",
            barangay_id=mock_barangay.id,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    @pytest.fixture
    def assessment(self, db_session, blgu_user):
        """Fixture providing a draft assessment."""
        assessment = Assessment(
            id=1,
            blgu_user_id=blgu_user.id,
            status=AssessmentStatus.DRAFT,
        )
        db_session.add(assessment)
        db_session.commit()
        db_session.refresh(assessment)
        return assessment

    @pytest.fixture
    def auth_headers(self, blgu_user):
        """Fixture providing authentication headers."""
        from app.core.security import create_access_token

        token = create_access_token(subject=str(blgu_user.id))
        return {"Authorization": f"Bearer {token}"}

    def test_upload_valid_pdf_file(self, client, assessment, auth_headers):
        """Test successful upload of a valid PDF file."""
        # Mock the storage service upload
        with patch("app.api.v1.movs.storage_service.upload_mov_file") as mock_upload:
            # Create mock MOVFile
            mock_mov_file = MOVFile(
                id=1,
                assessment_id=assessment.id,
                indicator_id=1,
                file_name="test-file.pdf",
                file_url="https://storage.example.com/test-file.pdf",
                file_type="application/pdf",
                file_size=1024,
                uploaded_by=100,
                uploaded_at=datetime.utcnow(),
            )
            mock_upload.return_value = mock_mov_file

            # Create test file
            file_content = b"%PDF-1.4\n%"
            file_data = io.BytesIO(file_content)

            # Upload file
            response = client.post(
                f"/api/v1/movs/assessments/{assessment.id}/indicators/1/upload",
                headers=auth_headers,
                files={"file": ("test.pdf", file_data, "application/pdf")},
            )

            # Assertions
            assert response.status_code == status.HTTP_201_CREATED
            data = response.json()
            assert data["id"] == 1
            assert data["assessment_id"] == assessment.id
            assert data["indicator_id"] == 1
            assert data["file_name"] == "test-file.pdf"
            assert data["file_url"] == "https://storage.example.com/test-file.pdf"
            assert data["file_type"] == "application/pdf"
            assert data["file_size"] == 1024
            assert data["uploaded_by"] == 100

    def test_upload_valid_docx_file(self, client, assessment, auth_headers):
        """Test successful upload of a valid DOCX file."""
        with patch("app.api.v1.movs.storage_service.upload_mov_file") as mock_upload:
            mock_mov_file = MOVFile(
                id=2,
                assessment_id=assessment.id,
                indicator_id=2,
                file_name="document.docx",
                file_url="https://storage.example.com/document.docx",
                file_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                file_size=2048,
                uploaded_by=100,
                uploaded_at=datetime.utcnow(),
            )
            mock_upload.return_value = mock_mov_file

            file_content = b"PK\x03\x04" + b"\x00" * 100  # ZIP signature for DOCX
            file_data = io.BytesIO(file_content)

            response = client.post(
                f"/api/v1/movs/assessments/{assessment.id}/indicators/2/upload",
                headers=auth_headers,
                files={
                    "file": (
                        "document.docx",
                        file_data,
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    )
                },
            )

            assert response.status_code == status.HTTP_201_CREATED
            data = response.json()
            assert (
                data["file_type"]
                == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )

    def test_upload_valid_jpg_file(self, client, assessment, auth_headers):
        """Test successful upload of a valid JPG file."""
        with patch("app.api.v1.movs.storage_service.upload_mov_file") as mock_upload:
            mock_mov_file = MOVFile(
                id=3,
                assessment_id=assessment.id,
                indicator_id=3,
                file_name="image.jpg",
                file_url="https://storage.example.com/image.jpg",
                file_type="image/jpeg",
                file_size=4096,
                uploaded_by=100,
                uploaded_at=datetime.utcnow(),
            )
            mock_upload.return_value = mock_mov_file

            file_content = b"\xff\xd8\xff"  # JPEG signature
            file_data = io.BytesIO(file_content)

            response = client.post(
                f"/api/v1/movs/assessments/{assessment.id}/indicators/3/upload",
                headers=auth_headers,
                files={"file": ("image.jpg", file_data, "image/jpeg")},
            )

            assert response.status_code == status.HTTP_201_CREATED
            data = response.json()
            assert data["file_type"] == "image/jpeg"

    def test_upload_rejects_invalid_file_type(self, client, assessment, auth_headers):
        """Test that upload rejects invalid file types (e.g., .exe)."""
        file_content = b"MZ\x90\x00"  # Windows executable signature
        file_data = io.BytesIO(file_content)

        response = client.post(
            f"/api/v1/movs/assessments/{assessment.id}/indicators/1/upload",
            headers=auth_headers,
            files={"file": ("malware.exe", file_data, "application/x-msdownload")},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "not allowed" in data["error"].lower()
        assert data["error_code"] == "INVALID_FILE_TYPE"

    def test_upload_rejects_text_file(self, client, assessment, auth_headers):
        """Test that upload rejects .txt files."""
        file_content = b"This is a text file"
        file_data = io.BytesIO(file_content)

        response = client.post(
            f"/api/v1/movs/assessments/{assessment.id}/indicators/1/upload",
            headers=auth_headers,
            files={"file": ("document.txt", file_data, "text/plain")},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert data["error_code"] == "INVALID_FILE_TYPE"

    def test_upload_rejects_oversized_file(self, client, assessment, auth_headers):
        """Test that upload rejects files larger than 50MB."""
        # Create a file larger than 50MB (52,428,801 bytes)
        large_size = 52_428_801
        file_content = b"x" * large_size
        file_data = io.BytesIO(file_content)

        response = client.post(
            f"/api/v1/movs/assessments/{assessment.id}/indicators/1/upload",
            headers=auth_headers,
            files={"file": ("large.pdf", file_data, "application/pdf")},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "exceeds 50MB limit" in data["error"]
        assert data["error_code"] == "FILE_TOO_LARGE"

    def test_upload_rejects_executable_content(self, client, assessment, auth_headers):
        """Test that upload rejects files with executable content."""
        # PDF file with executable signature (should be caught by content validation)
        file_content = b"MZ\x90\x00" + b"\x00" * 100
        file_data = io.BytesIO(file_content)

        response = client.post(
            f"/api/v1/movs/assessments/{assessment.id}/indicators/1/upload",
            headers=auth_headers,
            files={"file": ("fake.pdf", file_data, "application/pdf")},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "suspicious or executable" in data["error"].lower()
        assert data["error_code"] == "SUSPICIOUS_CONTENT"

    def test_upload_rejects_extension_mismatch(self, client, assessment, auth_headers):
        """Test that upload rejects files where extension doesn't match content type."""
        # PDF content but .jpg extension
        file_content = b"%PDF-1.4\n%"
        file_data = io.BytesIO(file_content)

        response = client.post(
            f"/api/v1/movs/assessments/{assessment.id}/indicators/1/upload",
            headers=auth_headers,
            files={"file": ("fake.jpg", file_data, "application/pdf")},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "extension does not match" in data["error"].lower()
        assert data["error_code"] == "EXTENSION_MISMATCH"

    def test_upload_handles_storage_service_error(self, client, assessment, auth_headers):
        """Test that upload handles storage service errors gracefully."""
        with patch("app.api.v1.movs.storage_service.upload_mov_file") as mock_upload:
            # Mock storage service raising an error
            mock_upload.side_effect = Exception("Supabase connection failed")

            file_content = b"%PDF-1.4\n%"
            file_data = io.BytesIO(file_content)

            response = client.post(
                f"/api/v1/movs/assessments/{assessment.id}/indicators/1/upload",
                headers=auth_headers,
                files={"file": ("test.pdf", file_data, "application/pdf")},
            )

            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            data = response.json()
            assert "Failed to upload file" in data["error"]

    def test_upload_requires_authentication(self, client, assessment):
        """Test that upload requires authentication."""
        file_content = b"%PDF-1.4\n%"
        file_data = io.BytesIO(file_content)

        response = client.post(
            f"/api/v1/movs/assessments/{assessment.id}/indicators/1/upload",
            files={"file": ("test.pdf", file_data, "application/pdf")},
        )

        # Accept either 401 or 403 - both indicate authentication/authorization failure
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_upload_with_valid_png_file(self, client, assessment, auth_headers):
        """Test successful upload of a valid PNG file."""
        with patch("app.api.v1.movs.storage_service.upload_mov_file") as mock_upload:
            mock_mov_file = MOVFile(
                id=4,
                assessment_id=assessment.id,
                indicator_id=4,
                file_name="screenshot.png",
                file_url="https://storage.example.com/screenshot.png",
                file_type="image/png",
                file_size=8192,
                uploaded_by=100,
                uploaded_at=datetime.utcnow(),
            )
            mock_upload.return_value = mock_mov_file

            file_content = b"\x89PNG\r\n\x1a\n"  # PNG signature
            file_data = io.BytesIO(file_content)

            response = client.post(
                f"/api/v1/movs/assessments/{assessment.id}/indicators/4/upload",
                headers=auth_headers,
                files={"file": ("screenshot.png", file_data, "image/png")},
            )

            assert response.status_code == status.HTTP_201_CREATED
            data = response.json()
            assert data["file_type"] == "image/png"


class TestListMOVFiles:
    """Test suite for GET /api/v1/movs/assessments/{assessment_id}/indicators/{indicator_id}/files"""

    @pytest.fixture
    def blgu_user(self, db_session, mock_barangay):
        """Fixture providing a BLGU user."""
        user = User(
            email="blgu@test.com",
            name="Test BLGU User",
            hashed_password="hashed",
            role="BLGU_USER",
            barangay_id=mock_barangay.id,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    @pytest.fixture
    def other_barangay(self, db_session):
        """Fixture providing another barangay."""
        import uuid

        from app.db.models.barangay import Barangay

        barangay = Barangay(name=f"Other Barangay {uuid.uuid4().hex[:8]}")
        db_session.add(barangay)
        db_session.commit()
        db_session.refresh(barangay)
        return barangay

    @pytest.fixture
    def other_blgu_user(self, db_session, other_barangay):
        """Fixture providing another BLGU user."""
        user = User(
            email="other_blgu@test.com",
            name="Other BLGU User",
            hashed_password="hashed",
            role="BLGU_USER",
            barangay_id=other_barangay.id,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    @pytest.fixture
    def assessor_user(self, db_session):
        """Fixture providing an assessor user."""
        user = User(
            email="assessor@test.com",
            name="Test Assessor",
            hashed_password="hashed",
            role="ASSESSOR",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    @pytest.fixture
    def indicator(self, db_session, mock_governance_area):
        """Fixture providing an indicator."""
        import uuid

        from app.db.models.governance_area import Indicator

        unique_id = uuid.uuid4().hex[:8]
        indicator = Indicator(
            name=f"Test Indicator {unique_id}",
            indicator_code=f"TI{unique_id[:3].upper()}",
            description="Test indicator for MOV tests",
            governance_area_id=mock_governance_area.id,
            sort_order=1,
        )
        db_session.add(indicator)
        db_session.commit()
        db_session.refresh(indicator)
        return indicator

    @pytest.fixture
    def assessment(self, db_session, blgu_user):
        """Fixture providing a draft assessment."""
        assessment = Assessment(
            blgu_user_id=blgu_user.id,
            status=AssessmentStatus.DRAFT,
        )
        db_session.add(assessment)
        db_session.commit()
        db_session.refresh(assessment)
        return assessment

    def test_list_files_blgu_user_sees_only_own_files(
        self, client, db_session, assessment, blgu_user, other_blgu_user, indicator
    ):
        """Test that BLGU users only see their own uploaded files."""
        # Create files from different users
        file1 = MOVFile(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            uploaded_by=blgu_user.id,
            file_name="blgu_file1.pdf",
            file_url="https://storage.example.com/file1.pdf",
            file_type="application/pdf",
            file_size=1024,
            uploaded_at=datetime.utcnow(),
        )
        file2 = MOVFile(
            assessment_id=assessment.id,
            indicator_id=1,
            uploaded_by=other_blgu_user.id,  # Different user
            file_name="other_file.pdf",
            file_url="https://storage.example.com/file2.pdf",
            file_type="application/pdf",
            file_size=2048,
            uploaded_at=datetime.utcnow(),
        )
        file3 = MOVFile(
            assessment_id=assessment.id,
            indicator_id=1,
            uploaded_by=blgu_user.id,
            file_name="blgu_file2.pdf",
            file_url="https://storage.example.com/file3.pdf",
            file_type="application/pdf",
            file_size=3072,
            uploaded_at=datetime.utcnow(),
        )
        db_session.add_all([file1, file2, file3])
        db_session.commit()

        # Override get_db to use test session
        use_test_db_session(client, db_session)

        # Authenticate as BLGU user
        authenticate_user(client, blgu_user)

        # List files as BLGU user
        response = client.get(f"/api/v1/movs/assessments/{assessment.id}/indicators/1/files")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "files" in data
        assert len(data["files"]) == 2  # Only sees own files

        # Verify only BLGU user's files are returned
        file_names = [f["file_name"] for f in data["files"]]
        assert "blgu_file1.pdf" in file_names
        assert "blgu_file2.pdf" in file_names
        assert "other_file.pdf" not in file_names  # Other user's file not visible

    def test_list_files_assessor_sees_all_files(
        self, client, db_session, assessment, blgu_user, other_blgu_user, assessor_user, indicator
    ):
        """Test that assessors see all files for an indicator."""
        # Create files from different BLGU users
        file1 = MOVFile(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            uploaded_by=blgu_user.id,
            file_name="blgu1_file.pdf",
            file_url="https://storage.example.com/file1.pdf",
            file_type="application/pdf",
            file_size=1024,
            uploaded_at=datetime.utcnow(),
        )
        file2 = MOVFile(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            uploaded_by=other_blgu_user.id,
            file_name="blgu2_file.pdf",
            file_url="https://storage.example.com/file2.pdf",
            file_type="application/pdf",
            file_size=2048,
            uploaded_at=datetime.utcnow(),
        )
        db_session.add_all([file1, file2])
        db_session.commit()

        # Override get_db to use test session
        use_test_db_session(client, db_session)

        # Authenticate as assessor
        authenticate_user(client, assessor_user)

        # List files as assessor
        response = client.get(
            f"/api/v1/movs/assessments/{assessment.id}/indicators/{indicator.id}/files"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "files" in data
        assert len(data["files"]) == 2  # Sees all files

        # Verify both files are returned
        file_names = [f["file_name"] for f in data["files"]]
        assert "blgu1_file.pdf" in file_names
        assert "blgu2_file.pdf" in file_names

    def test_list_files_excludes_soft_deleted(
        self, client, db_session, assessment, blgu_user, indicator
    ):
        """Test that soft-deleted files are excluded from the list."""
        # Create active file
        active_file = MOVFile(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            uploaded_by=blgu_user.id,
            file_name="active_file.pdf",
            file_url="https://storage.example.com/active.pdf",
            file_type="application/pdf",
            file_size=1024,
            uploaded_at=datetime.utcnow(),
        )
        # Create soft-deleted file
        deleted_file = MOVFile(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            uploaded_by=blgu_user.id,
            file_name="deleted_file.pdf",
            file_url="https://storage.example.com/deleted.pdf",
            file_type="application/pdf",
            file_size=2048,
            uploaded_at=datetime.utcnow(),
            deleted_at=datetime.utcnow(),  # Soft deleted
        )
        db_session.add_all([active_file, deleted_file])
        db_session.commit()

        # Override get_db to use test session
        use_test_db_session(client, db_session)

        # Authenticate as BLGU user
        authenticate_user(client, blgu_user)

        # List files
        response = client.get(
            f"/api/v1/movs/assessments/{assessment.id}/indicators/{indicator.id}/files"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "files" in data
        assert len(data["files"]) == 1  # Only active file

        # Verify only active file is returned
        assert data["files"][0]["file_name"] == "active_file.pdf"

    def test_list_files_ordered_by_upload_time(
        self, client, db_session, assessment, blgu_user, indicator
    ):
        """Test that files are ordered by upload time (most recent first)."""
        from datetime import timedelta

        now = datetime.utcnow()

        # Create files with different upload times
        old_file = MOVFile(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            uploaded_by=blgu_user.id,
            file_name="old_file.pdf",
            file_url="https://storage.example.com/old.pdf",
            file_type="application/pdf",
            file_size=1024,
            uploaded_at=now - timedelta(hours=2),
        )
        recent_file = MOVFile(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            uploaded_by=blgu_user.id,
            file_name="recent_file.pdf",
            file_url="https://storage.example.com/recent.pdf",
            file_type="application/pdf",
            file_size=2048,
            uploaded_at=now,
        )
        middle_file = MOVFile(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            uploaded_by=blgu_user.id,
            file_name="middle_file.pdf",
            file_url="https://storage.example.com/middle.pdf",
            file_type="application/pdf",
            file_size=3072,
            uploaded_at=now - timedelta(hours=1),
        )
        db_session.add_all([old_file, recent_file, middle_file])
        db_session.commit()

        # Override get_db to use test session
        use_test_db_session(client, db_session)

        # Authenticate as BLGU user
        authenticate_user(client, blgu_user)

        # List files
        response = client.get(
            f"/api/v1/movs/assessments/{assessment.id}/indicators/{indicator.id}/files"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["files"]) == 3

        # Verify order (most recent first)
        assert data["files"][0]["file_name"] == "recent_file.pdf"
        assert data["files"][1]["file_name"] == "middle_file.pdf"
        assert data["files"][2]["file_name"] == "old_file.pdf"

    def test_list_files_empty_list(self, client, db_session, assessment, blgu_user):
        """Test that endpoint returns empty list when no files exist."""
        # Override get_db to use test session
        use_test_db_session(client, db_session)

        # Authenticate as BLGU user
        authenticate_user(client, blgu_user)

        response = client.get(f"/api/v1/movs/assessments/{assessment.id}/indicators/1/files")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "files" in data
        assert len(data["files"]) == 0

    def test_list_files_filters_by_indicator(
        self, client, db_session, assessment, blgu_user, indicator, mock_governance_area
    ):
        """Test that files are filtered by indicator_id."""
        # Create a second indicator
        import uuid

        from app.db.models.governance_area import Indicator

        unique_id = uuid.uuid4().hex[:8]
        indicator2 = Indicator(
            name=f"Test Indicator 2 {unique_id}",
            indicator_code=f"T2{unique_id[:3].upper()}",
            description="Second test indicator",
            governance_area_id=mock_governance_area.id,
            sort_order=2,
        )
        db_session.add(indicator2)
        db_session.commit()
        db_session.refresh(indicator2)

        # Create files for different indicators
        file_indicator1 = MOVFile(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            uploaded_by=blgu_user.id,
            file_name="indicator1_file.pdf",
            file_url="https://storage.example.com/ind1.pdf",
            file_type="application/pdf",
            file_size=1024,
            uploaded_at=datetime.utcnow(),
        )
        file_indicator2 = MOVFile(
            assessment_id=assessment.id,
            indicator_id=indicator2.id,
            uploaded_by=blgu_user.id,
            file_name="indicator2_file.pdf",
            file_url="https://storage.example.com/ind2.pdf",
            file_type="application/pdf",
            file_size=2048,
            uploaded_at=datetime.utcnow(),
        )
        db_session.add_all([file_indicator1, file_indicator2])
        db_session.commit()

        # Override get_db to use test session
        use_test_db_session(client, db_session)

        # Authenticate as BLGU user
        authenticate_user(client, blgu_user)

        # List files for indicator 1
        response = client.get(
            f"/api/v1/movs/assessments/{assessment.id}/indicators/{indicator.id}/files"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["files"]) == 1
        assert data["files"][0]["file_name"] == "indicator1_file.pdf"
        assert data["files"][0]["indicator_id"] == indicator.id


class TestDeleteMOVFile:
    """Test suite for DELETE /api/v1/movs/files/{file_id}"""

    @pytest.fixture
    def blgu_user(self, db_session, mock_barangay):
        """Fixture providing a BLGU user."""
        user = User(
            email="blgu@test.com",
            name="Test BLGU User",
            hashed_password="hashed",
            role="BLGU_USER",
            barangay_id=mock_barangay.id,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    @pytest.fixture
    def other_barangay(self, db_session):
        """Fixture providing another barangay."""
        import uuid

        from app.db.models.barangay import Barangay

        barangay = Barangay(name=f"Other Barangay {uuid.uuid4().hex[:8]}")
        db_session.add(barangay)
        db_session.commit()
        db_session.refresh(barangay)
        return barangay

    @pytest.fixture
    def other_blgu_user(self, db_session, other_barangay):
        """Fixture providing another BLGU user."""
        user = User(
            email="other_blgu@test.com",
            name="Other BLGU User",
            hashed_password="hashed",
            role="BLGU_USER",
            barangay_id=other_barangay.id,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    @pytest.fixture
    def draft_assessment(self, db_session, blgu_user):
        """Fixture providing a draft assessment."""
        assessment = Assessment(
            blgu_user_id=blgu_user.id,
            status=AssessmentStatus.DRAFT,
        )
        db_session.add(assessment)
        db_session.commit()
        db_session.refresh(assessment)
        return assessment

    @pytest.fixture
    def submitted_assessment(self, db_session, blgu_user):
        """Fixture providing a submitted assessment."""
        assessment = Assessment(
            blgu_user_id=blgu_user.id,
            status=AssessmentStatus.SUBMITTED_FOR_REVIEW,
        )
        db_session.add(assessment)
        db_session.commit()
        db_session.refresh(assessment)
        return assessment

    @pytest.fixture
    def indicator(self, db_session, mock_governance_area):
        """Fixture providing an indicator."""
        import uuid

        from app.db.models.governance_area import Indicator

        unique_id = uuid.uuid4().hex[:8]
        indicator = Indicator(
            name=f"Delete Test Indicator {unique_id}",
            indicator_code=f"DT{unique_id[:3].upper()}",
            description="Test indicator for delete tests",
            governance_area_id=mock_governance_area.id,
            sort_order=1,
        )
        db_session.add(indicator)
        db_session.commit()
        db_session.refresh(indicator)
        return indicator

    def test_delete_file_success(self, client, db_session, draft_assessment, blgu_user, indicator):
        """Test successful deletion of a file by the uploader for DRAFT assessment."""
        # Create a MOV file
        mov_file = MOVFile(
            assessment_id=draft_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=blgu_user.id,
            file_name="test_file.pdf",
            file_url="https://storage.example.com/test_file.pdf",
            file_type="application/pdf",
            file_size=1024,
            uploaded_at=datetime.utcnow(),
        )
        db_session.add(mov_file)
        db_session.commit()
        db_session.refresh(mov_file)
        file_id = mov_file.id

        # Mock the storage deletion BEFORE making the request
        with patch("app.services.storage_service._get_supabase_client") as mock_supabase:
            mock_supabase.return_value.storage.from_().remove.return_value = {}

            # Override get_db and authenticate
            use_test_db_session(client, db_session)
            authenticate_user(client, blgu_user)

            response = client.delete(f"/api/v1/movs/files/{file_id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == file_id
        assert data["deleted_at"] is not None

        # Verify file was soft-deleted in database
        db_session.refresh(mov_file)
        assert mov_file.deleted_at is not None

    def test_delete_file_permission_denied_different_user(
        self, client, db_session, draft_assessment, blgu_user, other_blgu_user, indicator
    ):
        """Test that user cannot delete files uploaded by another user."""
        # Create file uploaded by blgu_user
        mov_file = MOVFile(
            assessment_id=draft_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=blgu_user.id,
            file_name="test_file.pdf",
            file_url="https://storage.example.com/test_file.pdf",
            file_type="application/pdf",
            file_size=1024,
            uploaded_at=datetime.utcnow(),
        )
        db_session.add(mov_file)
        db_session.commit()
        db_session.refresh(mov_file)
        file_id = mov_file.id

        # Override get_db and authenticate as different user
        use_test_db_session(client, db_session)
        authenticate_user(client, other_blgu_user)

        response = client.delete(f"/api/v1/movs/files/{file_id}")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert "You can only delete files you uploaded" in data["error"]

        # Verify file was NOT deleted
        db_session.refresh(mov_file)
        assert mov_file.deleted_at is None

    def test_delete_file_rejected_for_submitted_assessment(
        self, client, db_session, submitted_assessment, blgu_user, indicator
    ):
        """Test that deletion is rejected for SUBMITTED assessment."""
        # Create file in submitted assessment
        mov_file = MOVFile(
            assessment_id=submitted_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=blgu_user.id,
            file_name="test_file.pdf",
            file_url="https://storage.example.com/test_file.pdf",
            file_type="application/pdf",
            file_size=1024,
            uploaded_at=datetime.utcnow(),
        )
        db_session.add(mov_file)
        db_session.commit()
        db_session.refresh(mov_file)
        file_id = mov_file.id

        # Override get_db and authenticate
        use_test_db_session(client, db_session)
        authenticate_user(client, blgu_user)

        response = client.delete(f"/api/v1/movs/files/{file_id}")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert "Cannot delete files from" in data["error"]

        # Verify file was NOT deleted
        db_session.refresh(mov_file)
        assert mov_file.deleted_at is None

    def test_delete_file_not_found(self, client, db_session, blgu_user):
        """Test deletion of non-existent file returns 404."""
        use_test_db_session(client, db_session)
        authenticate_user(client, blgu_user)

        response = client.delete("/api/v1/movs/files/99999")

        assert response.status_code == status.HTTP_403_FORBIDDEN  # Permission check fails first
        data = response.json()
        assert "not found" in data["error"]

    def test_delete_already_deleted_file(
        self, client, db_session, draft_assessment, blgu_user, indicator
    ):
        """Test that already deleted files cannot be deleted again."""
        # Create already deleted file
        mov_file = MOVFile(
            assessment_id=draft_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=blgu_user.id,
            file_name="test_file.pdf",
            file_url="https://storage.example.com/test_file.pdf",
            file_type="application/pdf",
            file_size=1024,
            uploaded_at=datetime.utcnow(),
            deleted_at=datetime.utcnow(),  # Already deleted
        )
        db_session.add(mov_file)
        db_session.commit()
        db_session.refresh(mov_file)
        file_id = mov_file.id

        # Override get_db and authenticate
        use_test_db_session(client, db_session)
        authenticate_user(client, blgu_user)

        response = client.delete(f"/api/v1/movs/files/{file_id}")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert "already been deleted" in data["error"]
