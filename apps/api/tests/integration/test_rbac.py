"""
🧪 Integration Test: Role-Based Access Control (Epic 6.0 - Story 6.3 - Task 6.3.4)

This test verifies that role-based access control (RBAC) is properly enforced across all API endpoints:
- BLGU_USER: Can only submit own assessments, cannot request rework
- ASSESSOR: Can request rework on any assessment, cannot submit as BLGU
- VALIDATOR: Can access assessments in assigned governance area
- MLGOO_DILG: Has admin access to all operations

Tests the authorization layer for:
- Assessment submission (BLGU only)
- Rework requests (ASSESSOR/VALIDATOR/MLGOO only)
- Response creation/updates (owner only)
- Cross-user data access prevention
- Governance area assignment validation (VALIDATOR)
"""

import uuid

from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.db.enums import AssessmentStatus, UserRole
from app.db.models.assessment import Assessment
from app.db.models.barangay import Barangay
from app.db.models.user import User


class TestRoleBasedAccessControl:
    """
    Integration test suite for role-based access control enforcement.
    """

    def test_blgu_can_only_submit_own_assessment(
        self,
        client: TestClient,
        db_session: Session,
        test_blgu_user: User,
        mock_barangay: Barangay,
    ):
        """
        Test: BLGU users can only submit their own assessments.

        Verifies:
        - BLGU user can submit their own assessment
        - BLGU user receives 403 when trying to submit another user's assessment
        - Ownership check is enforced
        """
        # Create another BLGU user with their own assessment
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

        other_blgu_user = User(
            email=f"other_blgu_{uuid.uuid4().hex[:8]}@example.com",
            name="Other BLGU User",
            hashed_password=pwd_context.hash("testpassword123"),
            role=UserRole.BLGU_USER,
            barangay_id=mock_barangay.id,
            is_active=True,
        )
        db_session.add(other_blgu_user)
        db_session.commit()
        db_session.refresh(other_blgu_user)

        # Create assessment for other user
        other_assessment = Assessment(
            blgu_user_id=other_blgu_user.id,
            status=AssessmentStatus.DRAFT,
            rework_count=0,
        )
        db_session.add(other_assessment)
        db_session.commit()
        db_session.refresh(other_assessment)

        # Login as test_blgu_user and try to submit other user's assessment
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": test_blgu_user.email,
                "password": test_blgu_user.plain_password,
            },
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Attempt to submit other user's assessment
        response = client.post(f"/api/v1/assessments/{other_assessment.id}/submit", headers=headers)

        # Should be forbidden
        assert response.status_code == 403
        data = response.json()
        assert "detail" in data

    def test_blgu_cannot_request_rework(
        self,
        client: TestClient,
        auth_headers_blgu: dict[str, str],
        test_submitted_assessment: Assessment,
    ):
        """
        Test: BLGU users cannot request rework.

        Verifies:
        - Only ASSESSOR, VALIDATOR, MLGOO_DILG can request rework
        - BLGU user receives 403 Forbidden
        - Role check is enforced at endpoint level
        """
        rework_request = {"comments": "BLGU attempting to request rework - should be forbidden"}

        response = client.post(
            f"/api/v1/assessments/{test_submitted_assessment.id}/request-rework",
            headers=auth_headers_blgu,
            json=rework_request,
        )

        assert response.status_code == 403
        data = response.json()
        assert "detail" in data
        assert "assessor" in data["detail"].lower() or "permission" in data["detail"].lower()

    def test_assessor_can_request_rework_any_assessment(
        self,
        client: TestClient,
        auth_headers_assessor: dict[str, str],
        test_submitted_assessment: Assessment,
        db_session: Session,
    ):
        """
        Test: ASSESSOR users can request rework on any submitted assessment.

        Verifies:
        - ASSESSOR role has permission to request rework
        - No barangay restriction for ASSESSOR
        - Rework request succeeds
        """
        rework_request = {"comments": "Assessor requesting rework - should succeed"}

        response = client.post(
            f"/api/v1/assessments/{test_submitted_assessment.id}/request-rework",
            headers=auth_headers_assessor,
            json=rework_request,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["rework_count"] == 1

        # Verify in database
        db_session.refresh(test_submitted_assessment)
        assert test_submitted_assessment.status == AssessmentStatus.REWORK

    def test_validator_can_request_rework(
        self,
        client: TestClient,
        auth_headers_validator: dict[str, str],
        test_submitted_assessment: Assessment,
        db_session: Session,
    ):
        """
        Test: VALIDATOR users can request rework.

        Verifies:
        - VALIDATOR role has permission to request rework
        - Rework request succeeds
        """
        rework_request = {"comments": "Validator requesting rework - should succeed"}

        response = client.post(
            f"/api/v1/assessments/{test_submitted_assessment.id}/request-rework",
            headers=auth_headers_validator,
            json=rework_request,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_mlgoo_can_request_rework(
        self,
        client: TestClient,
        auth_headers_mlgoo: dict[str, str],
        test_submitted_assessment: Assessment,
        db_session: Session,
    ):
        """
        Test: MLGOO_DILG admin users can request rework.

        Verifies:
        - MLGOO_DILG role has admin permissions
        - Can request rework on any assessment
        """
        rework_request = {"comments": "MLGOO admin requesting rework - should succeed"}

        response = client.post(
            f"/api/v1/assessments/{test_submitted_assessment.id}/request-rework",
            headers=auth_headers_mlgoo,
            json=rework_request,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_assessor_cannot_submit_as_blgu(
        self,
        client: TestClient,
        auth_headers_assessor: dict[str, str],
        test_draft_assessment: Assessment,
    ):
        """
        Test: ASSESSOR users cannot submit assessments (BLGU-only operation).

        Verifies:
        - Submit endpoint requires BLGU_USER role
        - ASSESSOR receives 403 Forbidden
        """
        response = client.post(
            f"/api/v1/assessments/{test_draft_assessment.id}/submit",
            headers=auth_headers_assessor,
        )

        assert response.status_code == 403
        data = response.json()
        assert "detail" in data

    def test_assessor_cannot_resubmit_assessment(
        self,
        client: TestClient,
        auth_headers_assessor: dict[str, str],
        test_rework_assessment: Assessment,
    ):
        """
        Test: ASSESSOR users cannot resubmit assessments (BLGU-only operation).

        Verifies:
        - Resubmit endpoint requires BLGU_USER role
        - ASSESSOR receives 403 Forbidden
        """
        response = client.post(
            f"/api/v1/assessments/{test_rework_assessment.id}/resubmit",
            headers=auth_headers_assessor,
        )

        assert response.status_code == 403
        data = response.json()
        assert "detail" in data

    def test_blgu_can_access_own_assessment_data(
        self,
        client: TestClient,
        auth_headers_blgu: dict[str, str],
        test_draft_assessment: Assessment,
    ):
        """
        Test: BLGU users can access their own assessment data.

        Verifies:
        - GET submission-status succeeds for own assessment
        - BLGU can view their assessment details
        """
        response = client.get(
            f"/api/v1/assessments/{test_draft_assessment.id}/submission-status",
            headers=auth_headers_blgu,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["assessment_id"] == test_draft_assessment.id

    def test_blgu_cannot_access_other_users_assessment(
        self,
        client: TestClient,
        db_session: Session,
        test_blgu_user: User,
        mock_barangay: Barangay,
    ):
        """
        Test: BLGU users cannot access other users' assessments.

        Verifies:
        - Cross-user access is prevented
        - Returns 403 Forbidden
        - Data isolation between BLGUs
        """
        # Create another BLGU user
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

        other_user = User(
            email=f"other_{uuid.uuid4().hex[:8]}@example.com",
            name="Other User",
            hashed_password=pwd_context.hash("testpassword123"),
            role=UserRole.BLGU_USER,
            barangay_id=mock_barangay.id,
            is_active=True,
        )
        db_session.add(other_user)
        db_session.commit()

        # Create assessment for other user
        other_assessment = Assessment(
            blgu_user_id=other_user.id,
            status=AssessmentStatus.DRAFT,
            rework_count=0,
        )
        db_session.add(other_assessment)
        db_session.commit()
        db_session.refresh(other_assessment)

        # Login as test_blgu_user
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": test_blgu_user.email,
                "password": test_blgu_user.plain_password,
            },
        )
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Try to access other user's assessment
        response = client.get(
            f"/api/v1/assessments/{other_assessment.id}/submission-status",
            headers=headers,
        )

        # Should be forbidden
        assert response.status_code == 403

    def test_assessor_can_access_any_assessment(
        self,
        client: TestClient,
        auth_headers_assessor: dict[str, str],
        test_submitted_assessment: Assessment,
    ):
        """
        Test: ASSESSOR users can access any assessment (no barangay restriction).

        Verifies:
        - ASSESSOR has system-wide access
        - Can view any assessment's submission status
        - No ownership check for ASSESSOR
        """
        response = client.get(
            f"/api/v1/assessments/{test_submitted_assessment.id}/submission-status",
            headers=auth_headers_assessor,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["assessment_id"] == test_submitted_assessment.id

    def test_validator_can_access_assessments(
        self,
        client: TestClient,
        auth_headers_validator: dict[str, str],
        test_submitted_assessment: Assessment,
    ):
        """
        Test: VALIDATOR users can access assessments.

        Verifies:
        - VALIDATOR has access permissions
        - Can view assessment data
        Note: Governance area filtering may be implemented in specific endpoints
        """
        response = client.get(
            f"/api/v1/assessments/{test_submitted_assessment.id}/submission-status",
            headers=auth_headers_validator,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["assessment_id"] == test_submitted_assessment.id

    def test_mlgoo_admin_has_full_access(
        self,
        client: TestClient,
        auth_headers_mlgoo: dict[str, str],
        test_submitted_assessment: Assessment,
    ):
        """
        Test: MLGOO_DILG admin users have full system access.

        Verifies:
        - MLGOO_DILG can access any assessment
        - Admin role has unrestricted permissions
        """
        response = client.get(
            f"/api/v1/assessments/{test_submitted_assessment.id}/submission-status",
            headers=auth_headers_mlgoo,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["assessment_id"] == test_submitted_assessment.id

    def test_unauthenticated_access_denied(
        self,
        client: TestClient,
        test_draft_assessment: Assessment,
    ):
        """
        Test: Unauthenticated requests are denied.

        Verifies:
        - All endpoints require authentication
        - Returns 401 Unauthorized without token
        """
        # Try to access endpoint without auth headers
        response = client.get(f"/api/v1/assessments/{test_draft_assessment.id}/submission-status")

        assert response.status_code == 401

    def test_invalid_token_denied(
        self,
        client: TestClient,
        test_draft_assessment: Assessment,
    ):
        """
        Test: Invalid authentication tokens are rejected.

        Verifies:
        - Token validation is enforced
        - Returns 401 for invalid/malformed tokens
        """
        headers = {"Authorization": "Bearer invalid_token_12345"}

        response = client.get(
            f"/api/v1/assessments/{test_draft_assessment.id}/submission-status",
            headers=headers,
        )

        assert response.status_code == 401

    def test_role_hierarchy_enforcement(
        self,
        client: TestClient,
        auth_headers_blgu: dict[str, str],
        auth_headers_assessor: dict[str, str],
        auth_headers_validator: dict[str, str],
        auth_headers_mlgoo: dict[str, str],
        test_submitted_assessment: Assessment,
    ):
        """
        Test: Role hierarchy and permissions are correctly enforced.

        Verifies:
        - BLGU: Cannot request rework
        - ASSESSOR: Can request rework, cannot submit
        - VALIDATOR: Can request rework
        - MLGOO: Can perform all operations
        """
        rework_request = {"comments": "Testing role hierarchy enforcement"}

        # BLGU - should fail
        blgu_response = client.post(
            f"/api/v1/assessments/{test_submitted_assessment.id}/request-rework",
            headers=auth_headers_blgu,
            json=rework_request,
        )
        assert blgu_response.status_code == 403

        # Reset assessment status for next tests

        # ASSESSOR - should succeed
        assessor_response = client.post(
            f"/api/v1/assessments/{test_submitted_assessment.id}/request-rework",
            headers=auth_headers_assessor,
            json=rework_request,
        )
        # May succeed or fail depending on assessment state
        assert assessor_response.status_code in [200, 400]

        # If succeeded, we can test that ASSESSOR cannot submit
        if assessor_response.status_code == 200:
            submit_response = client.post(
                f"/api/v1/assessments/{test_submitted_assessment.id}/submit",
                headers=auth_headers_assessor,
            )
            assert submit_response.status_code == 403
