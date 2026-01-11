"""
Tests for FileValidationService (Story 4.4)

Tests file validation functionality including:
- Valid file types (PDF, JPG, PNG only)
- Invalid file types (EXE, ZIP, SH, DOCX, XLSX, MP4)
- File size validation (50MB limit)
- File content security checks
"""

import io

import pytest
from fastapi import UploadFile

from app.services.file_validation_service import FileValidationService


class TestFileValidationService:
    """Test suite for FileValidationService."""

    @pytest.fixture
    def service(self):
        """Fixture providing FileValidationService instance."""
        return FileValidationService()

    # Test 1: Valid file types (Task 4.4.7) - Only PDF and images
    @pytest.mark.parametrize(
        "filename,content_type,content",
        [
            ("test.pdf", "application/pdf", b"%PDF-1.4\n%"),
            ("test.jpg", "image/jpeg", b"\xff\xd8\xff"),
            ("test.png", "image/png", b"\x89PNG\r\n\x1a\n"),
        ],
    )
    def test_valid_file_types(self, service, filename, content_type, content):
        """Test that all allowed file types pass validation."""
        file_data = io.BytesIO(content)
        upload_file = UploadFile(
            filename=filename, file=file_data, headers={"content-type": content_type}
        )

        result = service.validate_file_type(upload_file)

        assert result.success is True
        assert result.error_message is None
        assert result.error_code is None

    # Test 2: Invalid file types (Task 4.4.8) - including DOCX, XLSX, MP4
    @pytest.mark.parametrize(
        "filename,content_type",
        [
            ("malware.exe", "application/x-msdownload"),
            ("archive.zip", "application/zip"),
            ("script.sh", "application/x-sh"),
            ("text.txt", "text/plain"),
            ("python.py", "text/x-python"),
            # DOCX, XLSX, and MP4 are no longer allowed
            (
                "document.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ),
            (
                "spreadsheet.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ),
            ("video.mp4", "video/mp4"),
        ],
    )
    def test_invalid_file_types(self, service, filename, content_type):
        """Test that invalid file types fail validation."""
        file_data = io.BytesIO(b"test content")
        upload_file = UploadFile(
            filename=filename, file=file_data, headers={"content-type": content_type}
        )

        result = service.validate_file_type(upload_file)

        assert result.success is False
        assert result.error_message is not None
        assert "not allowed" in result.error_message.lower()
        assert result.error_code == "INVALID_FILE_TYPE"

    # Test 3: Oversized files (Task 4.4.9)
    def test_file_too_large(self, service):
        """Test that files exceeding 50MB fail validation."""
        # Create a file larger than 50MB (52,428,800 bytes)
        large_size = 52_428_801  # 50MB + 1 byte
        file_data = io.BytesIO(b"x" * large_size)
        upload_file = UploadFile(
            filename="large.pdf",
            file=file_data,
            headers={"content-type": "application/pdf"},
        )

        result = service.validate_file_size(upload_file)

        assert result.success is False
        assert result.error_message is not None
        assert "exceeds 50MB limit" in result.error_message
        assert result.error_code == "FILE_TOO_LARGE"

    def test_file_within_size_limit(self, service):
        """Test that files within 50MB pass validation."""
        # Create a file just under 50MB
        file_data = io.BytesIO(b"x" * 1024)  # 1KB file
        upload_file = UploadFile(
            filename="small.pdf",
            file=file_data,
            headers={"content-type": "application/pdf"},
        )

        result = service.validate_file_size(upload_file)

        assert result.success is True
        assert result.error_message is None
        assert result.error_code is None

    # Test 4: File content security checks
    def test_extension_mismatch(self, service):
        """Test that file extension must match declared MIME type."""
        # PDF content but .jpg extension
        file_data = io.BytesIO(b"%PDF-1.4\n%")
        upload_file = UploadFile(
            filename="fake.jpg",
            file=file_data,
            headers={"content-type": "application/pdf"},
        )

        result = service.validate_file_content(upload_file)

        assert result.success is False
        assert result.error_message is not None
        assert "extension does not match" in result.error_message.lower()
        assert result.error_code == "EXTENSION_MISMATCH"

    def test_executable_signature_detection(self, service):
        """Test that executable signatures are detected."""
        # Windows executable signature (MZ)
        file_data = io.BytesIO(b"MZ\x90\x00")
        upload_file = UploadFile(
            filename="malware.pdf",
            file=file_data,
            headers={"content-type": "application/pdf"},
        )

        result = service.validate_file_content(upload_file)

        assert result.success is False
        assert result.error_message is not None
        assert "suspicious or executable" in result.error_message.lower()
        assert result.error_code == "SUSPICIOUS_CONTENT"

    def test_zip_signature_is_rejected(self, service):
        """Test that ZIP signature is rejected (DOCX/XLSX no longer allowed)."""
        # ZIP archives with PK signature should now be rejected
        file_data = io.BytesIO(b"PK\x03\x04" + b"\x00" * 100)
        upload_file = UploadFile(
            filename="archive.zip",
            file=file_data,
            headers={"content-type": "application/zip"},
        )

        result = service.validate_file_content(upload_file)

        assert result.success is False
        assert result.error_code == "SUSPICIOUS_CONTENT"

    def test_unknown_file_type(self, service):
        """Test that files with unknown MIME type fail validation."""
        file_data = io.BytesIO(b"test")
        upload_file = UploadFile(filename="test.unknown", file=file_data)

        result = service.validate_file_type(upload_file)

        assert result.success is False
        assert result.error_code in ["UNKNOWN_FILE_TYPE", "INVALID_FILE_TYPE"]

    # Test 5: Complete validation flow
    def test_validate_file_all_checks(self, service):
        """Test that validate_file() runs all validation checks."""
        # Valid PDF file
        file_data = io.BytesIO(b"%PDF-1.4\n%")
        upload_file = UploadFile(
            filename="valid.pdf",
            file=file_data,
            headers={"content-type": "application/pdf"},
        )

        result = service.validate_file(upload_file)

        assert result.success is True
        assert result.error_message is None
        assert result.error_code is None

    def test_validate_file_fails_on_first_error(self, service):
        """Test that validate_file() stops at first validation error."""
        # Invalid file type - should fail on type check
        file_data = io.BytesIO(b"test content")
        upload_file = UploadFile(
            filename="test.txt",
            file=file_data,
            headers={"content-type": "text/plain"},
        )

        result = service.validate_file(upload_file)

        assert result.success is False
        assert result.error_code == "INVALID_FILE_TYPE"

    def test_jpeg_file_with_alternate_extension(self, service):
        """Test that JPEG files can use both .jpg and .jpeg extensions."""
        for ext in [".jpg", ".jpeg"]:
            file_data = io.BytesIO(b"\xff\xd8\xff")
            upload_file = UploadFile(
                filename=f"image{ext}",
                file=file_data,
                headers={"content-type": "image/jpeg"},
            )

            result = service.validate_file_content(upload_file)

            assert result.success is True
            assert result.error_message is None

    def test_case_insensitive_extension_matching(self, service):
        """Test that extension matching is case-insensitive."""
        file_data = io.BytesIO(b"%PDF-1.4\n%")
        upload_file = UploadFile(
            filename="test.PDF",  # Uppercase extension
            file=file_data,
            headers={"content-type": "application/pdf"},
        )

        result = service.validate_file_content(upload_file)

        assert result.success is True
        assert result.error_message is None


class TestFileValidationServiceSingleton:
    """Test the singleton instance export (Task 4.4.10)."""

    def test_singleton_instance_exists(self):
        """Test that file_validation_service singleton is exported."""
        from app.services.file_validation_service import file_validation_service

        assert file_validation_service is not None
        assert isinstance(file_validation_service, FileValidationService)

    def test_singleton_instance_is_reusable(self):
        """Test that the singleton instance can be used multiple times."""
        from app.services.file_validation_service import file_validation_service

        # First validation
        file_data1 = io.BytesIO(b"%PDF-1.4\n%")
        upload_file1 = UploadFile(
            filename="test1.pdf",
            file=file_data1,
            headers={"content-type": "application/pdf"},
        )
        result1 = file_validation_service.validate_file_type(upload_file1)

        # Second validation
        file_data2 = io.BytesIO(b"%PDF-1.4\n%")
        upload_file2 = UploadFile(
            filename="test2.pdf",
            file=file_data2,
            headers={"content-type": "application/pdf"},
        )
        result2 = file_validation_service.validate_file_type(upload_file2)

        assert result1.success is True
        assert result2.success is True
