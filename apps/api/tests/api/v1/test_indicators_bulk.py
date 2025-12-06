"""
🧪 Indicator Bulk & Draft API Endpoint Tests
Tests for Phase 6: Hierarchical Indicator Creation

Tests:
- POST /api/v1/indicators/bulk (bulk creation)
- POST /api/v1/indicators/reorder (reordering)
- Draft CRUD endpoints
"""

from uuid import uuid4

import pytest

from app.core.security import get_password_hash
from app.db.enums import UserRole
from app.db.models.governance_area import GovernanceArea
from app.db.models.user import User


@pytest.fixture
def admin_user(db_session):
    """Create an admin user for testing."""
    user = User(
        email="admin@test.com",
        name="Admin User",
        hashed_password=get_password_hash("password"),
        role=UserRole.MLGOO_DILG,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(client, admin_user, db_session):
    """Get authentication headers."""
    # Ensure the user is committed and visible to the test client
    db_session.commit()
    db_session.refresh(admin_user)

    login_response = client.post(
        "/api/v1/auth/login", json={"email": admin_user.email, "password": "password"}
    )

    if login_response.status_code != 200:
        # For debugging: print the error
        print(f"Login failed: {login_response.status_code} - {login_response.text}")
        # Return None instead of asserting to see what happens in tests
        return None

    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def governance_area(db_session):
    """Create a test governance area."""
    from app.db.enums import AreaType

    area = GovernanceArea(id=1, code="T1", name="Test Area", area_type=AreaType.CORE)
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    return area


class TestBulkCreationEndpoint:
    """Tests for POST /api/v1/indicators/bulk."""

    def test_bulk_create_success(self, client, auth_headers, governance_area):
        """Test successful bulk creation."""
        payload = {
            "governance_area_id": governance_area.id,
            "indicators": [
                {
                    "temp_id": "parent-1",
                    "parent_temp_id": None,
                    "order": 1,
                    "name": "Parent Indicator",
                    "description": "Parent",
                    "is_active": True,
                    "is_auto_calculable": False,
                    "is_profiling_only": False,
                    "governance_area_id": governance_area.id,
                },
                {
                    "temp_id": "child-1",
                    "parent_temp_id": "parent-1",
                    "order": 1,
                    "name": "Child Indicator",
                    "description": "Child",
                    "is_active": True,
                    "is_auto_calculable": False,
                    "is_profiling_only": False,
                    "governance_area_id": governance_area.id,
                },
            ],
        }

        response = client.post("/api/v1/indicators/bulk", headers=auth_headers, json=payload)

        assert response.status_code == 201
        data = response.json()

        assert "created" in data
        assert "temp_id_mapping" in data
        assert "errors" in data

        assert len(data["created"]) == 2
        assert len(data["errors"]) == 0
        assert "parent-1" in data["temp_id_mapping"]
        assert "child-1" in data["temp_id_mapping"]

    def test_bulk_create_requires_auth(self, client, governance_area):
        """Test that bulk creation requires authentication."""
        payload = {"governance_area_id": governance_area.id, "indicators": []}

        response = client.post("/api/v1/indicators/bulk", json=payload)

        # HTTPBearer returns 403 when no credentials provided
        assert response.status_code == 403

    def test_bulk_create_requires_mlgoo_role(self, client, db_session, governance_area):
        """Test that bulk creation requires MLGOO_DILG role."""
        # Create a non-admin user
        blgu_user = User(
            email="blgu@test.com",
            name="BLGU User",
            hashed_password=get_password_hash("password"),
            role=UserRole.BLGU_USER,
            is_active=True,
        )
        db_session.add(blgu_user)
        db_session.commit()

        # Login as BLGU user
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": blgu_user.email, "password": "password"},
        )
        blgu_token = login_response.json()["access_token"]

        payload = {"governance_area_id": governance_area.id, "indicators": []}

        response = client.post(
            "/api/v1/indicators/bulk",
            headers={"Authorization": f"Bearer {blgu_token}"},
            json=payload,
        )

        assert response.status_code == 403

    def test_bulk_create_invalid_governance_area(self, client, auth_headers):
        """Test bulk creation with invalid governance area."""
        payload = {
            "governance_area_id": 9999,
            "indicators": [
                {
                    "temp_id": "test-1",
                    "parent_temp_id": None,
                    "order": 1,
                    "name": "Test Indicator",
                    "governance_area_id": 9999,
                    "is_active": True,
                    "is_auto_calculable": False,
                    "is_profiling_only": False,
                }
            ],
        }

        response = client.post("/api/v1/indicators/bulk", headers=auth_headers, json=payload)

        assert response.status_code == 404
        assert "Governance area" in response.json()["detail"]


class TestReorderEndpoint:
    """Tests for POST /api/v1/indicators/reorder."""

    def test_reorder_requires_auth(self, client):
        """Test that reorder requires authentication."""
        payload = {"indicators": []}

        response = client.post("/api/v1/indicators/reorder", json=payload)

        # HTTPBearer returns 403 when no credentials provided
        assert response.status_code == 403

    def test_reorder_requires_mlgoo_role(self, client, db_session):
        """Test that reorder requires MLGOO_DILG role."""
        # Create BLGU user
        blgu_user = User(
            email="blgu@test.com",
            name="BLGU User",
            hashed_password=get_password_hash("password"),
            role=UserRole.BLGU_USER,
            is_active=True,
        )
        db_session.add(blgu_user)
        db_session.commit()

        # Login
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": blgu_user.email, "password": "password"},
        )
        blgu_token = login_response.json()["access_token"]

        payload = {"indicators": []}

        response = client.post(
            "/api/v1/indicators/reorder",
            headers={"Authorization": f"Bearer {blgu_token}"},
            json=payload,
        )

        assert response.status_code == 403


class TestDraftCRUDEndpoints:
    """Tests for draft CRUD endpoints."""

    def test_create_draft(self, client, auth_headers, governance_area):
        """Test POST /api/v1/indicators/drafts."""
        payload = {
            "governance_area_id": governance_area.id,
            "creation_mode": "incremental",
            "title": "Test Draft",
            "data": [],
        }

        response = client.post("/api/v1/indicators/drafts", headers=auth_headers, json=payload)

        assert response.status_code == 201
        data = response.json()

        assert "id" in data
        assert data["governance_area_id"] == governance_area.id
        assert data["creation_mode"] == "incremental"
        assert data["title"] == "Test Draft"
        assert data["status"] == "in_progress"
        assert data["version"] == 1

    def test_list_drafts(self, client, auth_headers, governance_area):
        """Test GET /api/v1/indicators/drafts."""
        # Create a draft first
        create_response = client.post(
            "/api/v1/indicators/drafts",
            headers=auth_headers,
            json={
                "governance_area_id": governance_area.id,
                "creation_mode": "incremental",
                "title": "Draft 1",
            },
        )
        assert create_response.status_code == 201

        # List drafts
        response = client.get("/api/v1/indicators/drafts", headers=auth_headers)

        assert response.status_code == 200
        drafts = response.json()

        assert len(drafts) >= 1
        assert drafts[0]["title"] == "Draft 1"

    def test_get_draft_by_id(self, client, auth_headers, governance_area):
        """Test GET /api/v1/indicators/drafts/{draft_id}."""
        # Create draft
        create_response = client.post(
            "/api/v1/indicators/drafts",
            headers=auth_headers,
            json={
                "governance_area_id": governance_area.id,
                "creation_mode": "incremental",
                "title": "Get Test Draft",
            },
        )
        draft_id = create_response.json()["id"]

        # Get draft
        response = client.get(f"/api/v1/indicators/drafts/{draft_id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert data["id"] == draft_id
        assert data["title"] == "Get Test Draft"

    def test_update_draft(self, client, auth_headers, governance_area):
        """Test PUT /api/v1/indicators/drafts/{draft_id}."""
        # Create draft
        create_response = client.post(
            "/api/v1/indicators/drafts",
            headers=auth_headers,
            json={
                "governance_area_id": governance_area.id,
                "creation_mode": "incremental",
                "title": "Original Title",
            },
        )
        draft = create_response.json()

        # Update draft
        update_payload = {
            "title": "Updated Title",
            "current_step": 2,
            "version": draft["version"],  # Required for optimistic locking
        }

        response = client.put(
            f"/api/v1/indicators/drafts/{draft['id']}",
            headers=auth_headers,
            json=update_payload,
        )

        assert response.status_code == 200
        updated_draft = response.json()

        assert updated_draft["title"] == "Updated Title"
        assert updated_draft["current_step"] == 2
        assert updated_draft["version"] == 2  # Version incremented

    def test_update_draft_version_conflict(self, client, auth_headers, governance_area):
        """Test that version conflicts are detected."""
        # Create draft
        create_response = client.post(
            "/api/v1/indicators/drafts",
            headers=auth_headers,
            json={
                "governance_area_id": governance_area.id,
                "creation_mode": "incremental",
            },
        )
        draft = create_response.json()

        # First update (version 1 -> 2)
        client.put(
            f"/api/v1/indicators/drafts/{draft['id']}",
            headers=auth_headers,
            json={"title": "First Update", "version": 1},
        )

        # Second update with wrong version (should fail)
        response = client.put(
            f"/api/v1/indicators/drafts/{draft['id']}",
            headers=auth_headers,
            json={"title": "Second Update", "version": 1},  # Wrong version
        )

        assert response.status_code == 409
        assert "conflict" in response.json()["detail"].lower()

    def test_delete_draft(self, client, auth_headers, governance_area):
        """Test DELETE /api/v1/indicators/drafts/{draft_id}."""
        # Create draft
        create_response = client.post(
            "/api/v1/indicators/drafts",
            headers=auth_headers,
            json={
                "governance_area_id": governance_area.id,
                "creation_mode": "incremental",
            },
        )
        draft_id = create_response.json()["id"]

        # Delete draft
        response = client.delete(f"/api/v1/indicators/drafts/{draft_id}", headers=auth_headers)

        assert response.status_code == 204

        # Verify deleted
        get_response = client.get(f"/api/v1/indicators/drafts/{draft_id}", headers=auth_headers)
        assert get_response.status_code == 404

    def test_release_lock(self, client, auth_headers, governance_area):
        """Test POST /api/v1/indicators/drafts/{draft_id}/release-lock."""
        # Create and lock draft
        create_response = client.post(
            "/api/v1/indicators/drafts",
            headers=auth_headers,
            json={
                "governance_area_id": governance_area.id,
                "creation_mode": "incremental",
            },
        )
        draft = create_response.json()

        # Update to acquire lock
        client.put(
            f"/api/v1/indicators/drafts/{draft['id']}",
            headers=auth_headers,
            json={"title": "Locked", "version": 1},
        )

        # Release lock
        response = client.post(
            f"/api/v1/indicators/drafts/{draft['id']}/release-lock",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        assert data["lock_token"] is None
        assert data["locked_by_user_id"] is None
        assert data["locked_at"] is None

    def test_draft_endpoints_require_auth(self, client, governance_area):
        """Test that all draft endpoints require authentication."""
        dummy_uuid = str(uuid4())

        # HTTPBearer returns 403 when no credentials provided
        # Create
        response = client.post("/api/v1/indicators/drafts", json={})
        assert response.status_code == 403

        # List
        response = client.get("/api/v1/indicators/drafts")
        assert response.status_code == 403

        # Get
        response = client.get(f"/api/v1/indicators/drafts/{dummy_uuid}")
        assert response.status_code == 403

        # Update
        response = client.put(f"/api/v1/indicators/drafts/{dummy_uuid}", json={})
        assert response.status_code == 403

        # Delete
        response = client.delete(f"/api/v1/indicators/drafts/{dummy_uuid}")
        assert response.status_code == 403

        # Release lock
        response = client.post(f"/api/v1/indicators/drafts/{dummy_uuid}/release-lock")
        assert response.status_code == 403
