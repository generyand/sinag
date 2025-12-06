# 🧪 Access Control Tests
# Tests for MLGOO_DILG role-based access control middleware

from fastapi import status
from fastapi.testclient import TestClient

from app.core.security import create_access_token


class TestAccessControl:
    """Test suite for access control middleware."""

    def test_mlgoo_dilg_can_access_admin_endpoints(
        self, client: TestClient, mlgoo_user, db_session
    ):
        """Test that MLGOO_DILG users can access admin endpoints."""
        # Create token for MLGOO user
        token = create_access_token(str(mlgoo_user.id))

        # Access admin endpoint
        response = client.get(
            "/api/v1/admin/system/status",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["data"]["admin_user"] == mlgoo_user.email

    def test_non_mlgoo_user_denied_access(self, client: TestClient, blgu_user, db_session):
        """Test that non-MLGOO_DILG users are denied access to admin endpoints."""
        # Create token for BLGU user
        token = create_access_token(str(blgu_user.id))

        # Try to access admin endpoint
        response = client.get(
            "/api/v1/admin/system/status",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert "not enough permissions" in data["detail"].lower()

    def test_validator_denied_access(self, client: TestClient, validator_user, db_session):
        """Test that VALIDATOR users are denied access to admin endpoints."""
        # Create token for VALIDATOR user
        token = create_access_token(str(validator_user.id))

        # Try to access admin endpoint
        response = client.get(
            "/api/v1/admin/system/status",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert "not enough permissions" in data["detail"].lower()

    def test_assessor_denied_access(self, client: TestClient, assessor_user, db_session):
        """Test that ASSESSOR users are denied access to admin endpoints."""
        # Create token for ASSESSOR user
        token = create_access_token(str(assessor_user.id))

        # Try to access admin endpoint
        response = client.get(
            "/api/v1/admin/system/status",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert "not enough permissions" in data["detail"].lower()

    def test_unauthenticated_request_denied(self, client: TestClient):
        """Test that unauthenticated requests are denied."""
        response = client.get("/api/v1/admin/system/status")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_invalid_token_denied(self, client: TestClient):
        """Test that invalid tokens are denied."""
        response = client.get(
            "/api/v1/admin/system/status",
            headers={"Authorization": "Bearer invalid_token_xyz"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_audit_logs_endpoint_requires_mlgoo(self, client: TestClient, blgu_user, db_session):
        """Test that audit logs endpoint requires MLGOO_DILG role."""
        # Create token for BLGU user
        token = create_access_token(str(blgu_user.id))

        # Try to access audit logs
        response = client.get(
            "/api/v1/admin/audit-logs",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_mlgoo_can_access_audit_logs(self, client: TestClient, mlgoo_user, db_session):
        """Test that MLGOO_DILG users can access audit logs."""
        # Create token for MLGOO user
        token = create_access_token(str(mlgoo_user.id))

        # Access audit logs endpoint
        response = client.get(
            "/api/v1/admin/audit-logs",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "total" in data

    def test_inactive_mlgoo_user_denied(self, client: TestClient, mlgoo_user, db_session):
        """Test that inactive MLGOO_DILG users are denied access."""
        # Deactivate user
        mlgoo_user.is_active = False
        db_session.commit()

        # Create token
        token = create_access_token(str(mlgoo_user.id))

        # Try to access admin endpoint
        response = client.get(
            "/api/v1/admin/system/status",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "inactive user" in data["detail"].lower()
