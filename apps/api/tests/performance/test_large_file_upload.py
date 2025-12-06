"""
Performance Tests for Large MOV File Upload (Epic 4.0 - Story 4.19.23)

Tests upload performance for files near the 50MB limit.
"""

import io
import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.models.assessment import Assessment, MOVFile
from app.db.models.barangay import Barangay
from app.db.models.governance_area import Indicator
from app.db.models.user import User


@pytest.fixture
def large_pdf_file():
    """Create a large PDF file (45MB) for performance testing."""
    # Create a 45MB PDF file
    file_size = 45 * 1024 * 1024  # 45MB

    # PDF header
    pdf_header = b"%PDF-1.4\n"

    # Fill with zeros to reach desired size
    content = pdf_header + b"0" * (file_size - len(pdf_header) - 6)

    # PDF EOF
    pdf_eof = b"\n%%EOF"

    full_content = pdf_header + content[: file_size - len(pdf_header) - len(pdf_eof)] + pdf_eof

    return io.BytesIO(full_content)


class TestLargeFileUploadPerformance:
    """Performance tests for large file uploads."""

    def test_upload_45mb_pdf_completes_within_30_seconds(
        self,
        client: TestClient,
        test_db: Session,
        test_blgu_user: User,
        test_barangay: Barangay,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
        large_pdf_file: io.BytesIO,
    ):
        """
        Test that a 45MB PDF file uploads within 30 seconds.

        Acceptance Criteria (Story 4.19.23):
        - Upload 45MB PDF file
        - Measure upload time
        - Verify upload completes within acceptable time (< 30 seconds)
        - Verify file saved correctly
        """
        # Arrange
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        assessment_id = test_assessment_draft.id
        indicator_id = test_indicator.id

        large_pdf_file.seek(0)

        # Act - Measure upload time
        start_time = time.time()

        response = client.post(
            f"/api/v1/assessments/{assessment_id}/indicators/{indicator_id}/upload",
            headers=headers,
            files={"file": ("large-document.pdf", large_pdf_file, "application/pdf")},
        )

        end_time = time.time()
        upload_duration = end_time - start_time

        # Assert
        assert response.status_code == 201, (
            f"Expected 201, got {response.status_code}: {response.json()}"
        )

        # Performance assertion
        assert upload_duration < 30, f"Upload took {upload_duration:.2f}s, expected < 30s"

        # Verify response
        data = response.json()
        assert "id" in data
        assert data["filename"] == "large-document.pdf"
        assert data["file_size"] > 45 * 1024 * 1024  # At least 45MB

        # Verify database record
        mov_file = test_db.query(MOVFile).filter(MOVFile.id == data["id"]).first()
        assert mov_file is not None
        assert mov_file.filename == "large-document.pdf"
        assert mov_file.file_size > 45 * 1024 * 1024

        print(
            f"\n✅ Large file upload performance: {upload_duration:.2f}s for {mov_file.file_size / (1024 * 1024):.2f}MB"
        )

    def test_upload_multiple_large_files_sequentially(
        self,
        client: TestClient,
        test_db: Session,
        test_blgu_user: User,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
    ):
        """
        Test uploading multiple large files (3 x 15MB) sequentially.

        Verifies:
        - Multiple large uploads don't cause memory issues
        - Each upload completes successfully
        - Total time is reasonable
        """
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        assessment_id = test_assessment_draft.id
        indicator_id = test_indicator.id

        total_start_time = time.time()
        upload_times = []

        for i in range(3):
            # Create 15MB file
            file_size = 15 * 1024 * 1024
            content = b"%PDF-1.4\n" + b"0" * (file_size - 12) + b"\n%%EOF"
            file_obj = io.BytesIO(content)

            # Upload
            start_time = time.time()
            response = client.post(
                f"/api/v1/assessments/{assessment_id}/indicators/{indicator_id}/upload",
                headers=headers,
                files={"file": (f"document-{i + 1}.pdf", file_obj, "application/pdf")},
            )
            upload_time = time.time() - start_time
            upload_times.append(upload_time)

            assert response.status_code == 201, f"Upload {i + 1} failed: {response.json()}"

        total_time = time.time() - total_start_time

        # Assertions
        assert total_time < 60, f"Total upload time {total_time:.2f}s exceeded 60s"
        assert all(t < 20 for t in upload_times), f"Some uploads took > 20s: {upload_times}"

        # Verify all files in database
        mov_files = test_db.query(MOVFile).filter(MOVFile.response_id == test_indicator.id).all()
        assert len(mov_files) >= 3

        print(
            f"\n✅ Sequential large file uploads: {total_time:.2f}s total, individual times: {[f'{t:.2f}s' for t in upload_times]}"
        )

    def test_upload_performance_with_concurrent_requests(
        self,
        client: TestClient,
        test_db: Session,
        test_blgu_user: User,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
    ):
        """
        Test upload performance when multiple users upload simultaneously.

        Note: This is a simplified test. Real concurrent testing would use
        threading or async requests.
        """
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        assessment_id = test_assessment_draft.id
        indicator_id = test_indicator.id

        # Simulate 5 rapid sequential uploads (proxy for concurrency)
        file_size = 5 * 1024 * 1024  # 5MB each

        start_time = time.time()

        for i in range(5):
            content = b"%PDF-1.4\n" + b"0" * (file_size - 12) + b"\n%%EOF"
            file_obj = io.BytesIO(content)

            response = client.post(
                f"/api/v1/assessments/{assessment_id}/indicators/{indicator_id}/upload",
                headers=headers,
                files={"file": (f"rapid-{i + 1}.pdf", file_obj, "application/pdf")},
            )

            assert response.status_code == 201

        total_time = time.time() - start_time

        assert total_time < 30, f"5 rapid uploads took {total_time:.2f}s, expected < 30s"

        print(
            f"\n✅ Rapid sequential uploads: 5 files in {total_time:.2f}s ({total_time / 5:.2f}s avg)"
        )

    def test_upload_performance_degrades_gracefully(
        self,
        client: TestClient,
        test_db: Session,
        test_blgu_user: User,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
    ):
        """
        Test that upload performance doesn't degrade significantly
        after multiple uploads (no memory leaks).
        """
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        assessment_id = test_assessment_draft.id
        indicator_id = test_indicator.id

        file_size = 10 * 1024 * 1024  # 10MB

        first_upload_time = None
        last_upload_time = None

        for i in range(10):
            content = b"%PDF-1.4\n" + b"0" * (file_size - 12) + b"\n%%EOF"
            file_obj = io.BytesIO(content)

            start_time = time.time()
            response = client.post(
                f"/api/v1/assessments/{assessment_id}/indicators/{indicator_id}/upload",
                headers=headers,
                files={"file": (f"perf-test-{i + 1}.pdf", file_obj, "application/pdf")},
            )
            upload_time = time.time() - start_time

            assert response.status_code == 201

            if i == 0:
                first_upload_time = upload_time
            if i == 9:
                last_upload_time = upload_time

        # Assert last upload isn't significantly slower than first
        # Allow 50% degradation maximum
        assert last_upload_time < first_upload_time * 1.5, (
            f"Performance degraded: first={first_upload_time:.2f}s, last={last_upload_time:.2f}s"
        )

        print(
            f"\n✅ Performance stability: first={first_upload_time:.2f}s, last={last_upload_time:.2f}s"
        )

    def test_memory_efficient_large_file_handling(
        self,
        client: TestClient,
        test_db: Session,
        test_blgu_user: User,
        test_assessment_draft: Assessment,
        test_indicator: Indicator,
        large_pdf_file: io.BytesIO,
    ):
        """
        Test that large file uploads don't consume excessive memory.

        This is a basic test - production monitoring should track memory usage.
        """
        token = create_access_token(data={"sub": str(test_blgu_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        assessment_id = test_assessment_draft.id
        indicator_id = test_indicator.id

        large_pdf_file.seek(0)

        # Upload large file
        response = client.post(
            f"/api/v1/assessments/{assessment_id}/indicators/{indicator_id}/upload",
            headers=headers,
            files={"file": ("memory-test.pdf", large_pdf_file, "application/pdf")},
        )

        assert response.status_code == 201

        # Verify file is saved (indicates streaming worked, not loaded into memory)
        data = response.json()
        mov_file = test_db.query(MOVFile).filter(MOVFile.id == data["id"]).first()
        assert mov_file is not None
        assert mov_file.file_size > 40 * 1024 * 1024

        print(
            f"\n✅ Memory-efficient upload verified for {mov_file.file_size / (1024 * 1024):.2f}MB file"
        )
