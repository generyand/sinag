"""
Security Tests for Malicious MOV File Upload (Epic 4.0 - Story 4.19.24)

Tests security measures against malicious file uploads including:
- Executable content detection
- Path traversal attacks
- File type spoofing
- Extension mismatch detection
"""

import io

from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.db.models.assessment import Assessment
from app.db.models.governance_area import Indicator
from app.db.models.user import User
from app.services.file_validation_service import file_validation_service


class TestMaliciousFileUploadSecurity:
    """Security tests for malicious file upload attempts."""

    def test_reject_executable_content_in_pdf(
        self,
        client: TestClient,
        test_blgu_user: User,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
    ):
        """
        Test that files with executable signatures are rejected,
        even if they have PDF extension.

        Security Risk: Malicious actors may try to upload executables
        disguised as PDFs to exploit vulnerabilities.
        """
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Create a file with PE executable header (Windows .exe) but PDF extension
        executable_content = b"MZ\x90\x00" + b"\x00" * 100  # PE header signature
        file_obj = io.BytesIO(executable_content)

        response = client.post(
            f"/api/v1/assessments/{test_assessment_draft.id}/indicators/{test_indicator.id}/upload",
            headers=headers,
            files={"file": ("malicious.pdf", file_obj, "application/pdf")},
        )

        # Should be rejected
        assert response.status_code == 400
        data = response.json()
        assert (
            "executable" in data.get("error", data.get("detail", "")).lower()
            or "security" in data.get("error", data.get("detail", "")).lower()
        )

    def test_reject_elf_executable_content(
        self,
        client: TestClient,
        test_blgu_user: User,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
    ):
        """
        Test rejection of ELF executables (Linux binaries) disguised as documents.
        """
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # ELF header signature
        elf_content = b"\x7fELF" + b"\x00" * 100
        file_obj = io.BytesIO(elf_content)

        response = client.post(
            f"/api/v1/assessments/{test_assessment_draft.id}/indicators/{test_indicator.id}/upload",
            headers=headers,
            files={"file": ("malicious.pdf", file_obj, "application/pdf")},
        )

        assert response.status_code == 400
        data = response.json()
        assert (
            "executable" in data.get("error", data.get("detail", "")).lower()
            or "security" in data.get("error", data.get("detail", "")).lower()
        )

    def test_sanitize_filename_path_traversal(
        self,
        client: TestClient,
        test_blgu_user: User,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
    ):
        """
        Test that path traversal attempts in filename are sanitized.

        Attack Vector: ../../etc/passwd or ..\\..\\windows\\system32\\config
        """
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Valid PDF content
        pdf_content = b"%PDF-1.4\n%test\n%%EOF"
        file_obj = io.BytesIO(pdf_content)

        # Attempt path traversal in filename
        malicious_filename = "../../etc/passwd.pdf"

        response = client.post(
            f"/api/v1/assessments/{test_assessment_draft.id}/indicators/{test_indicator.id}/upload",
            headers=headers,
            files={"file": (malicious_filename, file_obj, "application/pdf")},
        )

        # Should either reject or sanitize filename
        if response.status_code == 201:
            # Filename should be sanitized (no path traversal)
            data = response.json()
            assert "../" not in data["filename"]
            assert "..\\" not in data["filename"]
            assert "etc" not in data["filename"]
            assert "passwd" in data["filename"]  # Base filename preserved
        else:
            # Or rejected entirely
            assert response.status_code == 400

    def test_reject_null_byte_in_filename(
        self,
        client: TestClient,
        test_blgu_user: User,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
    ):
        """
        Test rejection of filenames with null bytes.

        Attack Vector: file.pdf\x00.exe could bypass some filters
        """
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        pdf_content = b"%PDF-1.4\n%test\n%%EOF"
        file_obj = io.BytesIO(pdf_content)

        # Filename with null byte
        malicious_filename = "document.pdf\x00.exe"

        response = client.post(
            f"/api/v1/assessments/{test_assessment_draft.id}/indicators/{test_indicator.id}/upload",
            headers=headers,
            files={"file": (malicious_filename, file_obj, "application/pdf")},
        )

        # Should either reject or sanitize
        if response.status_code == 201:
            data = response.json()
            assert "\x00" not in data["filename"]
        else:
            assert response.status_code == 400

    def test_reject_script_file_with_valid_extension(
        self,
        client: TestClient,
        test_blgu_user: User,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
    ):
        """
        Test rejection of script files (.sh, .py, .js) even if content type is spoofed.
        """
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Shell script content
        script_content = b"#!/bin/bash\nrm -rf /"
        file_obj = io.BytesIO(script_content)

        response = client.post(
            f"/api/v1/assessments/{test_assessment_draft.id}/indicators/{test_indicator.id}/upload",
            headers=headers,
            files={"file": ("script.sh", file_obj, "application/pdf")},  # Spoofed content type
        )

        assert response.status_code == 400
        data = response.json()
        assert (
            "file type" in data.get("error", data.get("detail", "")).lower()
            or "not supported" in data.get("error", data.get("detail", "")).lower()
        )

    def test_reject_html_file_with_javascript(
        self,
        client: TestClient,
        test_blgu_user: User,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
    ):
        """
        Test rejection of HTML files with potentially malicious JavaScript.
        """
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        html_content = b'<html><script>alert("XSS")</script></html>'
        file_obj = io.BytesIO(html_content)

        response = client.post(
            f"/api/v1/assessments/{test_assessment_draft.id}/indicators/{test_indicator.id}/upload",
            headers=headers,
            files={"file": ("malicious.html", file_obj, "text/html")},
        )

        assert response.status_code == 400

    def test_reject_zip_bomb_attempt(
        self,
        client: TestClient,
        test_blgu_user: User,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
    ):
        """
        Test that excessively large compressed files are rejected.

        Note: DOCX and XLSX are ZIP files. This tests size limits.
        """
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Create file > 50MB
        large_content = b"PK" + b"\x00" * (51 * 1024 * 1024)
        file_obj = io.BytesIO(large_content)

        response = client.post(
            f"/api/v1/assessments/{test_assessment_draft.id}/indicators/{test_indicator.id}/upload",
            headers=headers,
            files={
                "file": (
                    "zipbomb.docx",
                    file_obj,
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
            },
        )

        assert response.status_code == 400
        data = response.json()
        assert (
            "size" in data.get("error", data.get("detail", "")).lower()
            or "large" in data.get("error", data.get("detail", "")).lower()
        )

    def test_extension_mismatch_detection(
        self,
        client: TestClient,
        test_blgu_user: User,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
    ):
        """
        Test that files with mismatched extension and content are rejected.

        Example: PNG file with .pdf extension
        """
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # PNG signature but PDF extension
        png_content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        file_obj = io.BytesIO(png_content)

        response = client.post(
            f"/api/v1/assessments/{test_assessment_draft.id}/indicators/{test_indicator.id}/upload",
            headers=headers,
            files={"file": ("fake.pdf", file_obj, "application/pdf")},
        )

        assert response.status_code == 400
        data = response.json()
        assert (
            "mismatch" in data.get("error", data.get("detail", "")).lower()
            or "content" in data.get("error", data.get("detail", "")).lower()
        )

    def test_reject_php_file(
        self,
        client: TestClient,
        test_blgu_user: User,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
    ):
        """
        Test rejection of PHP files (server-side scripts).
        """
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        php_content = b'<?php system($_GET["cmd"]); ?>'
        file_obj = io.BytesIO(php_content)

        response = client.post(
            f"/api/v1/assessments/{test_assessment_draft.id}/indicators/{test_indicator.id}/upload",
            headers=headers,
            files={"file": ("backdoor.php", file_obj, "application/x-php")},
        )

        assert response.status_code == 400

    def test_reject_svg_with_embedded_javascript(
        self,
        client: TestClient,
        test_blgu_user: User,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
    ):
        """
        Test rejection of SVG files with embedded JavaScript (XSS vector).
        """
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        svg_content = b'<svg><script>alert("XSS")</script></svg>'
        file_obj = io.BytesIO(svg_content)

        response = client.post(
            f"/api/v1/assessments/{test_assessment_draft.id}/indicators/{test_indicator.id}/upload",
            headers=headers,
            files={"file": ("malicious.svg", file_obj, "image/svg+xml")},
        )

        # SVG not in allowed types
        assert response.status_code == 400

    def test_file_validation_service_security_checks(self):
        """
        Unit test for FileValidationService security methods.
        """
        # Test executable detection
        exe_file = io.BytesIO(b"MZ\x90\x00" + b"\x00" * 100)
        is_valid, error = file_validation_service.validate_file(
            exe_file, "test.pdf", "application/pdf"
        )
        assert not is_valid
        assert "executable" in error.lower() or "security" in error.lower()

        # Test ELF detection
        elf_file = io.BytesIO(b"\x7fELF" + b"\x00" * 100)
        is_valid, error = file_validation_service.validate_file(
            elf_file, "test.pdf", "application/pdf"
        )
        assert not is_valid

    def test_reject_double_extension(
        self,
        client: TestClient,
        test_blgu_user: User,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
    ):
        """
        Test handling of double extensions (e.g., file.pdf.exe).
        """
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        pdf_content = b"%PDF-1.4\n%test\n%%EOF"
        file_obj = io.BytesIO(pdf_content)

        response = client.post(
            f"/api/v1/assessments/{test_assessment_draft.id}/indicators/{test_indicator.id}/upload",
            headers=headers,
            files={"file": ("document.pdf.exe", file_obj, "application/pdf")},
        )

        # Should reject or sanitize
        assert response.status_code == 400 or (
            response.status_code == 201 and ".exe" not in response.json()["filename"]
        )

    def test_content_type_spoofing_detection(
        self,
        client: TestClient,
        test_blgu_user: User,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
    ):
        """
        Test that content-type spoofing is detected.

        Send an executable but claim it's a PDF via content-type header.
        """
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Executable content
        exe_content = b"MZ\x90\x00" + b"\x00" * 100
        file_obj = io.BytesIO(exe_content)

        response = client.post(
            f"/api/v1/assessments/{test_assessment_draft.id}/indicators/{test_indicator.id}/upload",
            headers=headers,
            files={"file": ("document.pdf", file_obj, "application/pdf")},  # Spoofed type
        )

        # Should be detected and rejected
        assert response.status_code == 400
        data = response.json()
        assert (
            "executable" in data.get("error", data.get("detail", "")).lower()
            or "security" in data.get("error", data.get("detail", "")).lower()
        )
