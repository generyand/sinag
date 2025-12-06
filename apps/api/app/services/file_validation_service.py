"""
File Validation Service (Story 4.4)

Provides file validation functionality for the MOV upload system.
Validates file types, sizes, and performs basic security checks.
"""

import mimetypes

from fastapi import UploadFile

from app.schemas.system import ValidationResult


class FileValidationService:
    """
    Service for validating uploaded MOV files.

    Validates:
    - File type (PDF, DOCX, XLSX, JPG, PNG, MP4)
    - File size (max 50MB)
    - Basic security checks (file extension matches MIME type, no executable content)
    """

    # Maximum file size: 50MB in bytes
    MAX_FILE_SIZE = 52_428_800  # 50 * 1024 * 1024

    # Allowed MIME types
    ALLOWED_MIME_TYPES = {
        "application/pdf",  # PDF
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # DOCX
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # XLSX
        "image/jpeg",  # JPG
        "image/png",  # PNG
        "video/mp4",  # MP4
    }

    # Mapping of MIME types to expected file extensions
    MIME_TO_EXTENSIONS = {
        "application/pdf": {".pdf"},
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {".docx"},
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {".xlsx"},
        "image/jpeg": {".jpg", ".jpeg"},
        "image/png": {".png"},
        "video/mp4": {".mp4"},
    }

    # Executable file signatures (magic bytes) to reject
    EXECUTABLE_SIGNATURES = [
        b"MZ",  # DOS/Windows executable
        b"\x7fELF",  # Linux ELF executable
        b"#!",  # Shell script
        b"PK\x03\x04",  # ZIP archive (could contain malware, use with caution)
    ]

    def __init__(self):
        """Initialize the FileValidationService."""
        pass

    def validate_file_type(self, file: UploadFile) -> ValidationResult:
        """
        Validate that the uploaded file has an allowed MIME type.

        Args:
            file: FastAPI UploadFile object

        Returns:
            ValidationResult with success=True if valid, or error details if invalid
        """
        # Get content type from upload
        content_type = file.content_type

        if not content_type and file.filename:
            # Fallback: guess MIME type from filename
            guessed_type, _ = mimetypes.guess_type(file.filename)
            content_type = guessed_type

        if not content_type:
            return ValidationResult(
                success=False,
                error_message="Unable to determine file type",
                error_code="UNKNOWN_FILE_TYPE",
            )

        if content_type not in self.ALLOWED_MIME_TYPES:
            return ValidationResult(
                success=False,
                error_message=f"File type '{content_type}' is not allowed. Allowed types: PDF, DOCX, XLSX, JPG, PNG, MP4.",
                error_code="INVALID_FILE_TYPE",
            )

        return ValidationResult(success=True)

    def validate_file_size(self, file: UploadFile) -> ValidationResult:
        """
        Validate that the uploaded file size does not exceed the maximum limit.

        Args:
            file: FastAPI UploadFile object

        Returns:
            ValidationResult with success=True if valid, or error details if invalid
        """
        # Get file size by seeking to end
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning

        if file_size > self.MAX_FILE_SIZE:
            size_mb = file_size / (1024 * 1024)
            return ValidationResult(
                success=False,
                error_message=f"File size ({size_mb:.2f}MB) exceeds 50MB limit",
                error_code="FILE_TOO_LARGE",
            )

        return ValidationResult(success=True)

    def validate_file_content(self, file: UploadFile) -> ValidationResult:
        """
        Perform basic security checks on file content.

        Checks:
        - File extension matches declared MIME type
        - File does not contain executable signatures

        Args:
            file: FastAPI UploadFile object

        Returns:
            ValidationResult with success=True if valid, or error details if invalid
        """
        # Check extension matches MIME type
        content_type = file.content_type
        if not content_type and file.filename:
            guessed_type, _ = mimetypes.guess_type(file.filename)
            content_type = guessed_type

        if content_type and content_type in self.MIME_TO_EXTENSIONS and file.filename:
            filename_lower = file.filename.lower()
            expected_extensions = self.MIME_TO_EXTENSIONS[content_type]

            has_valid_extension = any(filename_lower.endswith(ext) for ext in expected_extensions)

            if not has_valid_extension:
                return ValidationResult(
                    success=False,
                    error_message=f"File extension does not match declared type '{content_type}'",
                    error_code="EXTENSION_MISMATCH",
                )

        # Read first 8 bytes to check for executable signatures
        file.file.seek(0)
        header = file.file.read(8)
        file.file.seek(0)  # Reset to beginning

        for signature in self.EXECUTABLE_SIGNATURES:
            if header.startswith(signature):
                # Special case: DOCX and XLSX are ZIP files, allow PK signature for them
                if signature == b"PK\x03\x04":
                    if content_type in {
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    }:
                        continue  # Allow ZIP signature for Office files

                return ValidationResult(
                    success=False,
                    error_message="File contains suspicious or executable content",
                    error_code="SUSPICIOUS_CONTENT",
                )

        return ValidationResult(success=True)

    def validate_file(self, file: UploadFile) -> ValidationResult:
        """
        Perform all validation checks on an uploaded file.

        Runs validation in order:
        1. File type validation
        2. File size validation
        3. File content/security validation

        Args:
            file: FastAPI UploadFile object

        Returns:
            ValidationResult with success=True if all checks pass,
            or first error encountered
        """
        # Validate file type
        type_result = self.validate_file_type(file)
        if not type_result.success:
            return type_result

        # Validate file size
        size_result = self.validate_file_size(file)
        if not size_result.success:
            return size_result

        # Validate file content/security
        content_result = self.validate_file_content(file)
        if not content_result.success:
            return content_result

        # All validations passed
        return ValidationResult(success=True)


# Singleton instance for use in routers
file_validation_service = FileValidationService()
