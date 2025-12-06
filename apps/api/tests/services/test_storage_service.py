"""
Tests for StorageService (Story 4.5)

Tests file upload functionality for MOV files including:
- Unique filename generation
- Storage path construction
- File upload to Supabase Storage
- Database record creation
- Transaction rollback on errors
"""

import io
from datetime import datetime
from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.db.models.assessment import MOVFile
from app.services.storage_service import StorageService


class TestStorageServiceFilenameGeneration:
    """Test unique filename generation (Task 4.5.2)."""

    @pytest.fixture
    def service(self):
        """Fixture providing StorageService instance."""
        return StorageService()

    @pytest.mark.parametrize(
        "original,expected_pattern",
        [
            ("test.pdf", r"^[0-9a-f-]{36}_test\.pdf$"),
            ("My Document.docx", r"^[0-9a-f-]{36}_My Document\.docx$"),
            ("file with spaces.jpg", r"^[0-9a-f-]{36}_file with spaces\.jpg$"),
            (
                "../../etc/passwd",
                r"^[0-9a-f-]{36}_____etc_passwd$",
            ),  # 5 underscores: . . / etc / passwd
            ("file/with/slashes.png", r"^[0-9a-f-]{36}_file_with_slashes\.png$"),
            (
                "file\\with\\backslashes.xlsx",
                r"^[0-9a-f-]{36}_file_with_backslashes\.xlsx$",
            ),
            ("file..with..dots.txt", r"^[0-9a-f-]{36}_file_with_dots\.txt$"),
            ("", r"^[0-9a-f-]{36}_file$"),
            ("   ", r"^[0-9a-f-]{36}_file$"),
        ],
    )
    def test_generate_unique_filename(self, service, original, expected_pattern):
        """Test that unique filenames are generated correctly with sanitization."""
        import re

        result = service._generate_unique_filename(original)

        # Check that result matches expected pattern
        assert re.match(expected_pattern, result), (
            f"Filename '{result}' doesn't match pattern '{expected_pattern}'"
        )

        # Verify UUID portion is valid
        uuid_part = result.split("_")[0]
        try:
            UUID(uuid_part)
        except ValueError:
            pytest.fail(f"Invalid UUID in filename: {uuid_part}")

    def test_generate_unique_filename_creates_different_uuids(self, service):
        """Test that multiple calls create different UUIDs."""
        filename1 = service._generate_unique_filename("test.pdf")
        filename2 = service._generate_unique_filename("test.pdf")

        assert filename1 != filename2, "Each call should generate a unique filename"

        # Extract UUIDs
        uuid1 = filename1.split("_")[0]
        uuid2 = filename2.split("_")[0]

        assert uuid1 != uuid2, "UUIDs should be different"


class TestStorageServicePathGeneration:
    """Test storage path generation (Task 4.5.3)."""

    @pytest.fixture
    def service(self):
        """Fixture providing StorageService instance."""
        return StorageService()

    @pytest.mark.parametrize(
        "assessment_id,indicator_id,filename,expected",
        [
            (1, 10, "test.pdf", "1/10/test.pdf"),
            (123, 456, "document.docx", "123/456/document.docx"),
            (1, 1, "file_with_uuid_prefix.jpg", "1/1/file_with_uuid_prefix.jpg"),
        ],
    )
    def test_get_storage_path(self, service, assessment_id, indicator_id, filename, expected):
        """Test that storage paths are constructed correctly."""
        result = service._get_storage_path(assessment_id, indicator_id, filename)

        assert result == expected, f"Expected '{expected}', got '{result}'"


class TestStorageServiceFileUpload:
    """Test file upload functionality (Tasks 4.5.4-4.5.6)."""

    @pytest.fixture
    def service(self):
        """Fixture providing StorageService instance."""
        return StorageService()

    @pytest.fixture
    def mock_supabase_client(self):
        """Fixture providing mocked Supabase client."""
        mock_client = MagicMock()
        # Mock successful upload
        mock_client.storage.from_().upload.return_value = {"path": "mocked/path"}
        mock_client.storage.from_().get_public_url.return_value = (
            "https://storage.supabase.co/mov-files/1/1/test.pdf"
        )
        return mock_client

    @pytest.fixture
    def mock_db_session(self):
        """Fixture providing mocked database session."""
        return MagicMock(spec=Session)

    def test_upload_mov_file_success(
        self, service, mock_supabase_client, mock_db_session, db_session
    ):
        """Test successful file upload with valid file (Task 4.5.7)."""
        # Create a real PDF file
        file_data = io.BytesIO(b"%PDF-1.4\n%")
        upload_file = UploadFile(
            filename="test.pdf",
            file=file_data,
            headers={"content-type": "application/pdf"},
        )

        # Mock the Supabase client
        with patch(
            "app.services.storage_service._get_supabase_client",
            return_value=mock_supabase_client,
        ):
            # Call upload_mov_file
            result = service.upload_mov_file(
                db=db_session,
                file=upload_file,
                assessment_id=1,
                indicator_id=10,
                user_id=1,
            )

            # Verify result is a MOVFile instance
            assert isinstance(result, MOVFile)
            assert result.assessment_id == 1
            assert result.indicator_id == 10
            assert result.uploaded_by == 1
            assert result.file_type == "application/pdf"
            assert result.file_size == 10  # Length of b"%PDF-1.4\n%"
            assert result.file_name.endswith("_test.pdf")
            assert result.file_url.startswith("https://storage.supabase.co")

            # Verify file was uploaded to Supabase
            mock_supabase_client.storage.from_.assert_called()
            mock_supabase_client.storage.from_().upload.assert_called_once()

    def test_upload_mov_file_handles_supabase_failure(
        self, service, mock_supabase_client, mock_db_session
    ):
        """Test that upload handles Supabase upload failure (Task 4.5.8)."""
        # Create a test file
        file_data = io.BytesIO(b"%PDF-1.4\n%")
        upload_file = UploadFile(
            filename="test.pdf",
            file=file_data,
            headers={"content-type": "application/pdf"},
        )

        # Mock Supabase upload failure
        mock_supabase_client.storage.from_().upload.side_effect = Exception(
            "Supabase connection error"
        )

        with patch(
            "app.services.storage_service._get_supabase_client",
            return_value=mock_supabase_client,
        ):
            # Verify that upload raises exception
            with pytest.raises(Exception) as exc_info:
                service.upload_mov_file(
                    db=mock_db_session,
                    file=upload_file,
                    assessment_id=1,
                    indicator_id=10,
                    user_id=1,
                )

            assert "File upload to storage failed" in str(exc_info.value)

            # Verify no database record was created (mock not called)
            mock_db_session.add.assert_not_called()
            mock_db_session.commit.assert_not_called()

    def test_upload_mov_file_handles_database_failure_with_rollback(
        self, service, mock_supabase_client, mock_db_session
    ):
        """Test that database failure triggers storage rollback."""
        # Create a test file
        file_data = io.BytesIO(b"%PDF-1.4\n%")
        upload_file = UploadFile(
            filename="test.pdf",
            file=file_data,
            headers={"content-type": "application/pdf"},
        )

        # Mock successful Supabase upload but database failure
        mock_db_session.commit.side_effect = Exception("Database connection error")

        with patch(
            "app.services.storage_service._get_supabase_client",
            return_value=mock_supabase_client,
        ):
            # Verify that upload raises exception
            with pytest.raises(Exception) as exc_info:
                service.upload_mov_file(
                    db=mock_db_session,
                    file=upload_file,
                    assessment_id=1,
                    indicator_id=10,
                    user_id=1,
                )

            assert "Database operation failed" in str(exc_info.value)

            # Verify that Supabase delete was called to rollback
            mock_supabase_client.storage.from_().remove.assert_called_once()

    def test_save_mov_file_record(self, service, db_session):
        """Test saving MOVFile record to database (Task 4.5.5)."""
        # Call the private method directly
        result = service._save_mov_file_record(
            db=db_session,
            file_url="https://storage.supabase.co/mov-files/1/10/test.pdf",
            file_name="uuid_test.pdf",
            file_type="application/pdf",
            file_size=1024,
            assessment_id=1,
            indicator_id=10,
            user_id=1,
        )

        # Verify result
        assert isinstance(result, MOVFile)
        assert result.id is not None  # Database generated ID
        assert result.assessment_id == 1
        assert result.indicator_id == 10
        assert result.uploaded_by == 1
        assert result.file_name == "uuid_test.pdf"
        assert result.file_url == "https://storage.supabase.co/mov-files/1/10/test.pdf"
        assert result.file_type == "application/pdf"
        assert result.file_size == 1024
        assert result.uploaded_at is not None
        assert result.deleted_at is None

        # Verify record was persisted to database
        db_session.refresh(result)
        assert result.id is not None

    def test_upload_mov_file_with_no_filename(self, service, mock_supabase_client, db_session):
        """Test that upload handles files with no filename."""
        # Create file with no filename
        file_data = io.BytesIO(b"%PDF-1.4\n%")
        upload_file = UploadFile(
            filename=None,  # No filename
            file=file_data,
            headers={"content-type": "application/pdf"},
        )

        with patch(
            "app.services.storage_service._get_supabase_client",
            return_value=mock_supabase_client,
        ):
            result = service.upload_mov_file(
                db=db_session,
                file=upload_file,
                assessment_id=1,
                indicator_id=10,
                user_id=1,
            )

            # Should use default filename "file"
            assert result.file_name.endswith("_file")

    def test_upload_mov_file_with_no_content_type(self, service, mock_supabase_client, db_session):
        """Test that upload handles files with no content type."""
        # Create file with no content type (don't pass headers parameter)
        file_data = io.BytesIO(b"some data")
        upload_file = UploadFile(filename="test.bin", file=file_data)
        # UploadFile.content_type defaults to None when no headers provided

        with patch(
            "app.services.storage_service._get_supabase_client",
            return_value=mock_supabase_client,
        ):
            result = service.upload_mov_file(
                db=db_session,
                file=upload_file,
                assessment_id=1,
                indicator_id=10,
                user_id=1,
            )

            # Should use default content type
            assert result.file_type == "application/octet-stream"


class TestStorageServiceFileDeletion:
    """Test file deletion functionality (Story 4.6)."""

    @pytest.fixture
    def service(self):
        """Fixture providing StorageService instance."""
        return StorageService()

    @pytest.fixture
    def mock_supabase_client(self):
        """Fixture providing mocked Supabase client."""
        mock_client = MagicMock()
        # Mock successful deletion
        mock_client.storage.from_().remove.return_value = {}
        return mock_client

    def test_delete_mov_file_success_with_draft_assessment(
        self, service, mock_supabase_client, db_session, mock_assessment, mock_blgu_user
    ):
        """Test successful deletion by BLGU user for DRAFT assessment (Task 4.6.4)."""
        from app.db.enums import AreaType, AssessmentStatus
        from app.db.models.governance_area import GovernanceArea, Indicator

        # Ensure assessment is in DRAFT status
        mock_assessment.status = AssessmentStatus.DRAFT
        db_session.commit()

        # Create indicator
        governance_area = GovernanceArea(name="Test Area", code="TA", area_type=AreaType.CORE)
        db_session.add(governance_area)
        db_session.flush()

        indicator = Indicator(
            name="Test Indicator", governance_area_id=governance_area.id, form_schema={}
        )
        db_session.add(indicator)
        db_session.flush()

        # Create MOVFile
        from app.db.models.assessment import MOVFile

        mov_file = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=mock_blgu_user.id,
            file_name="test.pdf",
            file_url="https://storage.supabase.co/mov-files/1/1/test.pdf",
            file_type="application/pdf",
            file_size=1024,
        )
        db_session.add(mov_file)
        db_session.commit()

        file_id = mov_file.id

        # Mock Supabase client
        with patch(
            "app.services.storage_service._get_supabase_client",
            return_value=mock_supabase_client,
        ):
            # Delete the file
            result = service.delete_mov_file(
                db=db_session, file_id=file_id, user_id=mock_blgu_user.id
            )

            # Verify soft delete
            assert result.deleted_at is not None
            assert result.id == file_id

            # Verify Supabase deletion was called
            mock_supabase_client.storage.from_().remove.assert_called_once()

    def test_delete_mov_file_rejects_submitted_assessment(
        self, service, db_session, mock_assessment, mock_blgu_user
    ):
        """Test that deletion is rejected for SUBMITTED assessment (Task 4.6.5)."""
        from fastapi import HTTPException

        from app.db.enums import AreaType, AssessmentStatus
        from app.db.models.governance_area import GovernanceArea, Indicator

        # Set assessment to SUBMITTED_FOR_REVIEW status
        mock_assessment.status = AssessmentStatus.SUBMITTED_FOR_REVIEW
        db_session.commit()

        # Create indicator
        governance_area = GovernanceArea(name="Test Area", code="TA", area_type=AreaType.CORE)
        db_session.add(governance_area)
        db_session.flush()

        indicator = Indicator(
            name="Test Indicator", governance_area_id=governance_area.id, form_schema={}
        )
        db_session.add(indicator)
        db_session.flush()

        # Create MOVFile
        from app.db.models.assessment import MOVFile

        mov_file = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=mock_blgu_user.id,
            file_name="test.pdf",
            file_url="https://storage.supabase.co/mov-files/1/1/test.pdf",
            file_type="application/pdf",
            file_size=1024,
        )
        db_session.add(mov_file)
        db_session.commit()

        file_id = mov_file.id

        # Attempt to delete - should raise HTTPException
        with pytest.raises(HTTPException) as exc_info:
            service.delete_mov_file(db=db_session, file_id=file_id, user_id=mock_blgu_user.id)

        assert exc_info.value.status_code == 403
        assert "Cannot delete files from" in exc_info.value.detail

        # Verify file was NOT deleted
        db_session.refresh(mov_file)
        assert mov_file.deleted_at is None

    def test_delete_mov_file_rejects_different_user(
        self, service, db_session, mock_assessment, mock_blgu_user
    ):
        """Test that user can only delete their own files (Task 4.6.6)."""
        from fastapi import HTTPException

        from app.db.enums import AreaType, AssessmentStatus
        from app.db.models.governance_area import GovernanceArea, Indicator
        from app.db.models.user import User

        # Ensure assessment is in DRAFT status
        mock_assessment.status = AssessmentStatus.DRAFT
        db_session.commit()

        # Create another user
        other_user = User(
            email="other@example.com",
            name="Other User",
            hashed_password="hashed",
            role="BLGU_USER",
        )
        db_session.add(other_user)
        db_session.flush()

        # Create indicator
        governance_area = GovernanceArea(name="Test Area", code="TA", area_type=AreaType.CORE)
        db_session.add(governance_area)
        db_session.flush()

        indicator = Indicator(
            name="Test Indicator", governance_area_id=governance_area.id, form_schema={}
        )
        db_session.add(indicator)
        db_session.flush()

        # Create MOVFile uploaded by mock_blgu_user
        from app.db.models.assessment import MOVFile

        mov_file = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=mock_blgu_user.id,  # Uploaded by mock_blgu_user
            file_name="test.pdf",
            file_url="https://storage.supabase.co/mov-files/1/1/test.pdf",
            file_type="application/pdf",
            file_size=1024,
        )
        db_session.add(mov_file)
        db_session.commit()

        file_id = mov_file.id

        # Attempt to delete with different user - should raise HTTPException
        with pytest.raises(HTTPException) as exc_info:
            service.delete_mov_file(db=db_session, file_id=file_id, user_id=other_user.id)

        assert exc_info.value.status_code == 403
        assert "You can only delete files you uploaded" in exc_info.value.detail

        # Verify file was NOT deleted
        db_session.refresh(mov_file)
        assert mov_file.deleted_at is None

    def test_delete_mov_file_allows_needs_rework(
        self, service, mock_supabase_client, db_session, mock_assessment, mock_blgu_user
    ):
        """Test that deletion is allowed for NEEDS_REWORK assessment."""
        from app.db.enums import AreaType, AssessmentStatus
        from app.db.models.governance_area import GovernanceArea, Indicator

        # Set assessment to NEEDS_REWORK status
        mock_assessment.status = AssessmentStatus.NEEDS_REWORK
        db_session.commit()

        # Create indicator
        governance_area = GovernanceArea(name="Test Area", code="TA", area_type=AreaType.CORE)
        db_session.add(governance_area)
        db_session.flush()

        indicator = Indicator(
            name="Test Indicator", governance_area_id=governance_area.id, form_schema={}
        )
        db_session.add(indicator)
        db_session.flush()

        # Create MOVFile
        from app.db.models.assessment import MOVFile

        mov_file = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=mock_blgu_user.id,
            file_name="test.pdf",
            file_url="https://storage.supabase.co/mov-files/1/1/test.pdf",
            file_type="application/pdf",
            file_size=1024,
        )
        db_session.add(mov_file)
        db_session.commit()

        file_id = mov_file.id

        # Mock Supabase client
        with patch(
            "app.services.storage_service._get_supabase_client",
            return_value=mock_supabase_client,
        ):
            # Delete the file - should succeed
            result = service.delete_mov_file(
                db=db_session, file_id=file_id, user_id=mock_blgu_user.id
            )

            # Verify soft delete
            assert result.deleted_at is not None

    def test_delete_mov_file_rejects_already_deleted(
        self, service, db_session, mock_assessment, mock_blgu_user
    ):
        """Test that already deleted files cannot be deleted again."""
        from fastapi import HTTPException

        from app.db.enums import AreaType, AssessmentStatus
        from app.db.models.governance_area import GovernanceArea, Indicator

        # Ensure assessment is in DRAFT status
        mock_assessment.status = AssessmentStatus.DRAFT
        db_session.commit()

        # Create indicator
        governance_area = GovernanceArea(name="Test Area", code="TA", area_type=AreaType.CORE)
        db_session.add(governance_area)
        db_session.flush()

        indicator = Indicator(
            name="Test Indicator", governance_area_id=governance_area.id, form_schema={}
        )
        db_session.add(indicator)
        db_session.flush()

        # Create MOVFile that is already soft deleted
        from app.db.models.assessment import MOVFile

        mov_file = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=mock_blgu_user.id,
            file_name="test.pdf",
            file_url="https://storage.supabase.co/mov-files/1/1/test.pdf",
            file_type="application/pdf",
            file_size=1024,
            deleted_at=datetime.utcnow(),  # Already deleted
        )
        db_session.add(mov_file)
        db_session.commit()

        file_id = mov_file.id

        # Attempt to delete - should raise HTTPException
        with pytest.raises(HTTPException) as exc_info:
            service.delete_mov_file(db=db_session, file_id=file_id, user_id=mock_blgu_user.id)

        assert exc_info.value.status_code == 403
        assert "already been deleted" in exc_info.value.detail

    def test_delete_file_from_storage_handles_errors_gracefully(
        self, service, mock_supabase_client
    ):
        """Test that storage deletion errors don't crash the service."""
        # Mock Supabase failure
        mock_supabase_client.storage.from_().remove.side_effect = Exception("Connection error")

        with patch(
            "app.services.storage_service._get_supabase_client",
            return_value=mock_supabase_client,
        ):
            # Should return False instead of raising
            result = service._delete_file_from_storage("test/path/file.pdf")
            assert result is False


class TestStorageServiceSingleton:
    """Test that singleton instance is exported."""

    def test_singleton_instance_exists(self):
        """Test that storage_service singleton is exported."""
        from app.services.storage_service import storage_service

        assert storage_service is not None
        assert isinstance(storage_service, StorageService)

    def test_singleton_bucket_name_constant(self):
        """Test that MOV_FILES_BUCKET constant is correct."""
        from app.services.storage_service import storage_service

        assert storage_service.MOV_FILES_BUCKET == "mov-files"
