"""
Integration tests for Phase 6: Hierarchical Indicator Creation

Tests the indicator draft workflow and bulk creation endpoints with:
- Draft CRUD operations
- Optimistic locking with version control
- Bulk hierarchical indicator creation with topological sorting
- Draft status management
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.models.governance_area import GovernanceArea
from app.db.models.user import User


@pytest.mark.integration
class TestIndicatorDrafts:
    """Test suite for indicator draft management endpoints."""

    def test_create_indicator_draft(
        self,
        client: TestClient,
        db_session: Session,
        auth_headers_mlgoo: dict,
        governance_area: GovernanceArea,
    ):
        """Test creating a new indicator draft."""
        draft_data = {
            "governance_area_id": governance_area.id,
            "creation_mode": "incremental",
            "title": "Test Draft - Financial Indicators",
            "data": []
        }

        response = client.post(
            "/api/v1/indicators/drafts",
            headers=auth_headers_mlgoo,
            json=draft_data
        )

        assert response.status_code == 201
        draft = response.json()
        assert draft["title"] == "Test Draft - Financial Indicators"
        assert draft["status"] == "draft"
        assert draft["version"] == 1
        assert draft["governance_area_id"] == governance_area.id
        assert draft["creation_mode"] == "incremental"
        assert "id" in draft
        assert "created_at" in draft

    def test_list_indicator_drafts(
        self,
        client: TestClient,
        db_session: Session,
        auth_headers_mlgoo: dict,
        governance_area: GovernanceArea,
    ):
        """Test listing user's indicator drafts."""
        # Create a draft first
        draft_data = {
            "governance_area_id": governance_area.id,
            "creation_mode": "incremental",
            "title": "Test Draft for Listing",
            "data": []
        }
        create_response = client.post(
            "/api/v1/indicators/drafts",
            headers=auth_headers_mlgoo,
            json=draft_data
        )
        assert create_response.status_code == 201

        # List drafts
        response = client.get(
            "/api/v1/indicators/drafts",
            headers=auth_headers_mlgoo
        )

        assert response.status_code == 200
        drafts = response.json()
        assert isinstance(drafts, list)
        assert len(drafts) >= 1
        assert any(d["title"] == "Test Draft for Listing" for d in drafts)

    def test_get_specific_draft(
        self,
        client: TestClient,
        db_session: Session,
        auth_headers_mlgoo: dict,
        governance_area: GovernanceArea,
    ):
        """Test retrieving a specific draft by ID."""
        # Create a draft first
        draft_data = {
            "governance_area_id": governance_area.id,
            "creation_mode": "incremental",
            "title": "Specific Draft Test",
            "data": []
        }
        create_response = client.post(
            "/api/v1/indicators/drafts",
            headers=auth_headers_mlgoo,
            json=draft_data
        )
        assert create_response.status_code == 201
        draft_id = create_response.json()["id"]

        # Get the specific draft
        response = client.get(
            f"/api/v1/indicators/drafts/{draft_id}",
            headers=auth_headers_mlgoo
        )

        assert response.status_code == 200
        draft = response.json()
        assert draft["id"] == draft_id
        assert draft["title"] == "Specific Draft Test"
        assert "last_accessed_at" in draft

    def test_update_draft_with_optimistic_locking(
        self,
        client: TestClient,
        db_session: Session,
        auth_headers_mlgoo: dict,
        governance_area: GovernanceArea,
    ):
        """Test updating a draft with optimistic locking."""
        # Create a draft
        draft_data = {
            "governance_area_id": governance_area.id,
            "creation_mode": "incremental",
            "title": "Draft to Update",
            "data": []
        }
        create_response = client.post(
            "/api/v1/indicators/drafts",
            headers=auth_headers_mlgoo,
            json=draft_data
        )
        assert create_response.status_code == 201
        draft = create_response.json()
        draft_id = draft["id"]
        initial_version = draft["version"]

        # Update the draft with correct version
        update_data = {
            "current_step": 2,
            "title": "Draft to Update (Modified)",
            "data": [
                {
                    "temp_id": "temp-001",
                    "name": "1.1 Budget Planning",
                    "description": "Test indicator for budget planning"
                }
            ],
            "version": initial_version
        }

        response = client.put(
            f"/api/v1/indicators/drafts/{draft_id}",
            headers=auth_headers_mlgoo,
            json=update_data
        )

        assert response.status_code == 200
        updated_draft = response.json()
        assert updated_draft["version"] == initial_version + 1
        assert updated_draft["title"] == "Draft to Update (Modified)"
        assert updated_draft["current_step"] == 2
        assert len(updated_draft["data"]) == 1
        assert updated_draft["data"][0]["temp_id"] == "temp-001"

    def test_optimistic_locking_version_conflict(
        self,
        client: TestClient,
        db_session: Session,
        auth_headers_mlgoo: dict,
        governance_area: GovernanceArea,
    ):
        """Test that optimistic locking detects version conflicts."""
        # Create a draft
        draft_data = {
            "governance_area_id": governance_area.id,
            "creation_mode": "incremental",
            "title": "Draft for Conflict Test",
            "data": []
        }
        create_response = client.post(
            "/api/v1/indicators/drafts",
            headers=auth_headers_mlgoo,
            json=draft_data
        )
        assert create_response.status_code == 201
        draft_id = create_response.json()["id"]

        # First update (succeeds)
        update_data_1 = {
            "title": "First Update",
            "version": 1
        }
        response_1 = client.put(
            f"/api/v1/indicators/drafts/{draft_id}",
            headers=auth_headers_mlgoo,
            json=update_data_1
        )
        assert response_1.status_code == 200
        assert response_1.json()["version"] == 2

        # Second update with stale version (should fail)
        update_data_2 = {
            "title": "This should fail",
            "version": 1  # Stale version
        }
        response_2 = client.put(
            f"/api/v1/indicators/drafts/{draft_id}",
            headers=auth_headers_mlgoo,
            json=update_data_2
        )

        assert response_2.status_code == 409  # Conflict
        assert "version" in response_2.json()["detail"].lower()


@pytest.mark.integration
class TestBulkIndicatorCreation:
    """Test suite for bulk hierarchical indicator creation."""

    def test_bulk_create_hierarchical_indicators(
        self,
        client: TestClient,
        db_session: Session,
        auth_headers_mlgoo: dict,
        governance_area: GovernanceArea,
    ):
        """Test bulk creation of hierarchical indicators with parent-child relationships."""
        # Create a simple hierarchy: parent -> child1, child2
        bulk_data = {
            "governance_area_id": governance_area.id,
            "indicators": [
                {
                    "temp_id": "temp-parent",
                    "parent_temp_id": None,
                    "order": 1,
                    "name": "1.1 Test Parent Indicator",
                    "description": "Parent indicator for testing",
                    "is_active": True,
                    "is_auto_calculable": False,
                    "is_profiling_only": False,
                    "governance_area_id": governance_area.id
                },
                {
                    "temp_id": "temp-child-1",
                    "parent_temp_id": "temp-parent",
                    "order": 1,
                    "name": "1.1.1 Test Child Indicator 1",
                    "description": "First child indicator",
                    "is_active": True,
                    "is_auto_calculable": False,
                    "is_profiling_only": False,
                    "governance_area_id": governance_area.id
                },
                {
                    "temp_id": "temp-child-2",
                    "parent_temp_id": "temp-parent",
                    "order": 2,
                    "name": "1.1.2 Test Child Indicator 2",
                    "description": "Second child indicator",
                    "is_active": True,
                    "is_auto_calculable": False,
                    "is_profiling_only": False,
                    "governance_area_id": governance_area.id
                }
            ]
        }

        response = client.post(
            "/api/v1/indicators/bulk",
            headers=auth_headers_mlgoo,
            json=bulk_data
        )

        assert response.status_code == 201
        result = response.json()

        # Verify the response structure
        assert "created" in result
        assert "temp_id_mapping" in result
        assert len(result["created"]) == 3

        # Verify temp_id mapping
        temp_id_mapping = result["temp_id_mapping"]
        assert "temp-parent" in temp_id_mapping
        assert "temp-child-1" in temp_id_mapping
        assert "temp-child-2" in temp_id_mapping

        # Verify parent-child relationships
        created_indicators = result["created"]
        parent_indicator = next(ind for ind in created_indicators if ind["name"] == "1.1 Test Parent Indicator")
        child_1 = next(ind for ind in created_indicators if ind["name"] == "1.1.1 Test Child Indicator 1")
        child_2 = next(ind for ind in created_indicators if ind["name"] == "1.1.2 Test Child Indicator 2")

        assert parent_indicator["parent_id"] is None
        assert child_1["parent_id"] == parent_indicator["id"]
        assert child_2["parent_id"] == parent_indicator["id"]
        assert child_1["order"] == 1
        assert child_2["order"] == 2

    def test_bulk_create_validates_topological_order(
        self,
        client: TestClient,
        db_session: Session,
        auth_headers_mlgoo: dict,
        governance_area: GovernanceArea,
    ):
        """Test that bulk creation handles dependencies correctly via topological sorting."""
        # Create indicators in intentionally wrong order (children before parent)
        bulk_data = {
            "governance_area_id": governance_area.id,
            "indicators": [
                {
                    "temp_id": "temp-child",
                    "parent_temp_id": "temp-parent",
                    "order": 1,
                    "name": "1.1.1 Child (defined first)",
                    "description": "Child defined before parent",
                    "is_active": True,
                    "is_auto_calculable": False,
                    "is_profiling_only": False,
                    "governance_area_id": governance_area.id
                },
                {
                    "temp_id": "temp-parent",
                    "parent_temp_id": None,
                    "order": 1,
                    "name": "1.1 Parent (defined second)",
                    "description": "Parent defined after child",
                    "is_active": True,
                    "is_auto_calculable": False,
                    "is_profiling_only": False,
                    "governance_area_id": governance_area.id
                }
            ]
        }

        response = client.post(
            "/api/v1/indicators/bulk",
            headers=auth_headers_mlgoo,
            json=bulk_data
        )

        # Should succeed because topological sorting handles the dependency order
        assert response.status_code == 201
        result = response.json()
        assert len(result["created"]) == 2

        # Verify relationships are correct regardless of input order
        created_indicators = result["created"]
        parent = next(ind for ind in created_indicators if "Parent" in ind["name"])
        child = next(ind for ind in created_indicators if "Child" in ind["name"])

        assert parent["parent_id"] is None
        assert child["parent_id"] == parent["id"]

    def test_bulk_create_empty_indicators_list(
        self,
        client: TestClient,
        db_session: Session,
        auth_headers_mlgoo: dict,
        governance_area: GovernanceArea,
    ):
        """Test that bulk creation rejects empty indicators list."""
        bulk_data = {
            "governance_area_id": governance_area.id,
            "indicators": []
        }

        response = client.post(
            "/api/v1/indicators/bulk",
            headers=auth_headers_mlgoo,
            json=bulk_data
        )

        # Should return 422 validation error for empty list
        assert response.status_code == 422

    def test_bulk_create_requires_mlgoo_role(
        self,
        client: TestClient,
        db_session: Session,
        auth_headers_blgu: dict,
        governance_area: GovernanceArea,
    ):
        """Test that bulk creation is restricted to MLGOO_DILG role."""
        bulk_data = {
            "governance_area_id": governance_area.id,
            "indicators": [
                {
                    "temp_id": "temp-001",
                    "parent_temp_id": None,
                    "order": 1,
                    "name": "1.1 Test Indicator",
                    "description": "Test",
                    "is_active": True,
                    "is_auto_calculable": False,
                    "is_profiling_only": False,
                    "governance_area_id": governance_area.id
                }
            ]
        }

        response = client.post(
            "/api/v1/indicators/bulk",
            headers=auth_headers_blgu,  # BLGU user, not MLGOO
            json=bulk_data
        )

        # Should return 403 Forbidden
        assert response.status_code == 403
