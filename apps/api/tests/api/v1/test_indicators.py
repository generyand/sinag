"""
Tests for indicators API endpoints (app/api/v1/indicators.py)
"""

import uuid

import pytest
from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import AreaType, UserRole
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@pytest.fixture(autouse=True)
def clear_user_overrides(client):
    """Clear user-related dependency overrides after each test, preserving DB override"""
    yield
    # After test, clear only user-related overrides, keep DB override
    if deps.get_current_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_user]
    if deps.require_mlgoo_dilg in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.require_mlgoo_dilg]


@pytest.fixture
def admin_user(db_session: Session):
    """Create an admin user for testing"""
    unique_email = f"admin_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="Admin User",
        hashed_password=pwd_context.hash("adminpass123"),
        role=UserRole.MLGOO_DILG,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def assessor_user(db_session: Session):
    """Create an assessor user for testing (non-admin)"""
    unique_email = f"assessor_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="Assessor User",
        hashed_password=pwd_context.hash("assessorpass123"),
        role=UserRole.ASSESSOR,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def governance_area(db_session: Session):
    """Create a governance area for testing"""
    unique_code = uuid.uuid4().hex[:2].upper()
    area = GovernanceArea(
        name=f"Test Area {uuid.uuid4().hex[:8]}",
        code=unique_code,
        area_type=AreaType.CORE,
    )
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    return area


@pytest.fixture
def test_indicator(db_session: Session, governance_area: GovernanceArea):
    """Create a test indicator"""
    indicator = Indicator(
        name=f"Test Indicator {uuid.uuid4().hex[:8]}",
        description="Test indicator description",
        version=1,
        is_active=True,
        is_auto_calculable=False,
        is_profiling_only=False,
        form_schema={
            "fields": [
                {
                    "field_id": "test_field",
                    "field_type": "text",
                    "label": "Test Field",
                    "required": True,
                    "is_means_of_verification": False,
                }
            ]
        },
        governance_area_id=governance_area.id,
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)
    return indicator


def _override_admin_and_db(client, admin_user: User, db_session: Session):
    """Override authentication and database dependencies for admin users"""

    def _override_current_user():
        return admin_user

    def _override_mlgoo_dilg():
        return admin_user

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_user] = _override_current_user
    client.app.dependency_overrides[deps.require_mlgoo_dilg] = _override_mlgoo_dilg
    client.app.dependency_overrides[deps.get_db] = _override_get_db


def _override_user_and_db(client, user: User, db_session: Session):
    """Override authentication and database dependencies for non-admin users"""

    def _override_current_user():
        return user

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_user] = _override_current_user
    client.app.dependency_overrides[deps.get_db] = _override_get_db


# ====================================================================
# POST /api/v1/indicators - Create Indicator
# ====================================================================


def test_create_indicator_success(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    governance_area: GovernanceArea,
):
    """Test creating a new indicator as admin"""
    _override_admin_and_db(client, admin_user, db_session)

    payload = {
        "name": "New Test Indicator",
        "description": "A new indicator for testing",
        "governance_area_id": governance_area.id,
        "is_active": True,
        "is_auto_calculable": False,
        "is_profiling_only": False,
        "form_schema": {
            "fields": [
                {
                    "field_id": "test_field_1",
                    "field_type": "text_input",
                    "label": "Test Field",
                    "required": True,
                }
            ]
        },
    }

    response = client.post("/api/v1/indicators", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Test Indicator"
    assert data["description"] == "A new indicator for testing"
    assert data["version"] == 1
    assert data["is_active"] is True
    assert data["governance_area_id"] == governance_area.id
    assert "id" in data


def test_create_indicator_unauthorized(client: TestClient, governance_area: GovernanceArea):
    """Test that creating indicator requires admin authentication"""
    payload = {
        "name": "Unauthorized Indicator",
        "governance_area_id": governance_area.id,
    }

    response = client.post("/api/v1/indicators", json=payload)

    assert response.status_code in [401, 403]


def test_create_indicator_non_admin(
    client: TestClient,
    db_session: Session,
    assessor_user: User,
    governance_area: GovernanceArea,
):
    """Test that non-admin users cannot create indicators"""
    _override_user_and_db(client, assessor_user, db_session)

    payload = {
        "name": "Forbidden Indicator",
        "governance_area_id": governance_area.id,
    }

    response = client.post("/api/v1/indicators", json=payload)

    assert response.status_code in [401, 403]


def test_create_indicator_invalid_governance_area(
    client: TestClient, db_session: Session, admin_user: User
):
    """Test creating indicator with non-existent governance area"""
    _override_admin_and_db(client, admin_user, db_session)

    payload = {
        "name": "Invalid Area Indicator",
        "governance_area_id": 99999,  # Non-existent ID
    }

    response = client.post("/api/v1/indicators", json=payload)

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# ====================================================================
# GET /api/v1/indicators - List Indicators
# ====================================================================


def test_list_indicators_success(
    client: TestClient, db_session: Session, admin_user: User, test_indicator: Indicator
):
    """Test listing all indicators"""
    _override_admin_and_db(client, admin_user, db_session)

    response = client.get("/api/v1/indicators")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # Find our test indicator
    found = any(ind["id"] == test_indicator.id for ind in data)
    assert found is True


def test_list_indicators_with_filters(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    test_indicator: Indicator,
    governance_area: GovernanceArea,
):
    """Test listing indicators with governance_area_id filter"""
    _override_admin_and_db(client, admin_user, db_session)

    response = client.get(f"/api/v1/indicators?governance_area_id={governance_area.id}")

    assert response.status_code == 200
    data = response.json()
    # All returned indicators should have the same governance_area_id
    for indicator in data:
        assert indicator["governance_area_id"] == governance_area.id


def test_list_indicators_pagination(
    client: TestClient, db_session: Session, admin_user: User, test_indicator: Indicator
):
    """Test pagination parameters"""
    _override_admin_and_db(client, admin_user, db_session)

    response = client.get("/api/v1/indicators?skip=0&limit=1")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 1


# ====================================================================
# GET /api/v1/indicators/{indicator_id} - Get Indicator by ID
# ====================================================================


def test_get_indicator_by_id_success(
    client: TestClient, db_session: Session, admin_user: User, test_indicator: Indicator
):
    """Test getting a single indicator by ID"""
    _override_admin_and_db(client, admin_user, db_session)

    response = client.get(f"/api/v1/indicators/{test_indicator.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_indicator.id
    assert data["name"] == test_indicator.name
    assert data["version"] == test_indicator.version


def test_get_indicator_not_found(client: TestClient, db_session: Session, admin_user: User):
    """Test getting non-existent indicator returns 404"""
    _override_admin_and_db(client, admin_user, db_session)

    response = client.get("/api/v1/indicators/99999")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# ====================================================================
# PUT /api/v1/indicators/{indicator_id} - Update Indicator
# ====================================================================


def test_update_indicator_metadata_only(
    client: TestClient, db_session: Session, admin_user: User, test_indicator: Indicator
):
    """Test updating indicator metadata (no version change)"""
    _override_admin_and_db(client, admin_user, db_session)

    original_version = test_indicator.version

    payload = {
        "name": "Updated Indicator Name",
        "description": "Updated description",
    }

    response = client.put(f"/api/v1/indicators/{test_indicator.id}", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Indicator Name"
    assert data["description"] == "Updated description"
    assert data["version"] == original_version  # Version should NOT change


def test_update_indicator_schema_triggers_versioning(
    client: TestClient, db_session: Session, admin_user: User, test_indicator: Indicator
):
    """Test updating schema fields triggers version increment"""
    _override_admin_and_db(client, admin_user, db_session)

    original_version = test_indicator.version

    payload = {
        "form_schema": {
            "fields": [
                {
                    "field_id": "new_field",
                    "field_type": "number_input",
                    "label": "New Number Field",
                    "required": True,
                }
            ]
        },
    }

    response = client.put(f"/api/v1/indicators/{test_indicator.id}", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["version"] == original_version + 1  # Version should increment
    assert data["form_schema"]["fields"][0]["field_id"] == "new_field"


def test_update_indicator_unauthorized(client: TestClient, test_indicator: Indicator):
    """Test that updating indicator requires admin authentication"""
    payload = {"name": "Unauthorized Update"}

    response = client.put(f"/api/v1/indicators/{test_indicator.id}", json=payload)

    assert response.status_code in [401, 403]


def test_update_indicator_not_found(client: TestClient, db_session: Session, admin_user: User):
    """Test updating non-existent indicator returns 404"""
    _override_admin_and_db(client, admin_user, db_session)

    payload = {"name": "Ghost Indicator"}

    response = client.put("/api/v1/indicators/99999", json=payload)

    assert response.status_code == 404


# ====================================================================
# DELETE /api/v1/indicators/{indicator_id} - Deactivate Indicator
# ====================================================================


def test_deactivate_indicator_success(
    client: TestClient, db_session: Session, admin_user: User, test_indicator: Indicator
):
    """Test deactivating an indicator (soft delete)"""
    _override_admin_and_db(client, admin_user, db_session)

    response = client.delete(f"/api/v1/indicators/{test_indicator.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is False
    assert data["id"] == test_indicator.id


def test_deactivate_indicator_unauthorized(client: TestClient, test_indicator: Indicator):
    """Test that deactivating indicator requires admin authentication"""
    response = client.delete(f"/api/v1/indicators/{test_indicator.id}")

    assert response.status_code in [401, 403]


def test_deactivate_indicator_not_found(client: TestClient, db_session: Session, admin_user: User):
    """Test deactivating non-existent indicator returns 404"""
    _override_admin_and_db(client, admin_user, db_session)

    response = client.delete("/api/v1/indicators/99999")

    assert response.status_code == 404


# ====================================================================
# GET /api/v1/indicators/{indicator_id}/history - Get Version History
# ====================================================================


def test_get_indicator_history_success(
    client: TestClient, db_session: Session, admin_user: User, test_indicator: Indicator
):
    """Test getting indicator version history"""
    _override_admin_and_db(client, admin_user, db_session)

    # First update to create history
    client.put(
        f"/api/v1/indicators/{test_indicator.id}",
        json={
            "form_schema": {
                "fields": [
                    {
                        "field_id": "updated_field",
                        "field_type": "text_input",
                        "label": "Updated Field",
                        "required": True,
                    }
                ]
            }
        },
    )

    # Get history
    response = client.get(f"/api/v1/indicators/{test_indicator.id}/history")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Should have at least one archived version after update
    assert len(data) >= 1


def test_get_indicator_history_not_found(client: TestClient, db_session: Session, admin_user: User):
    """Test getting history for non-existent indicator returns 404"""
    _override_admin_and_db(client, admin_user, db_session)

    response = client.get("/api/v1/indicators/99999/history")

    assert response.status_code == 404


# ====================================================================
# GET /api/v1/indicators/{indicator_id}/form-schema - Get Form Schema
# ====================================================================


def test_get_form_schema_success(
    client: TestClient, db_session: Session, admin_user: User, test_indicator: Indicator
):
    """Test successfully retrieving form schema for an indicator"""
    _override_admin_and_db(client, admin_user, db_session)

    response = client.get(f"/api/v1/indicators/{test_indicator.id}/form-schema")

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "indicator_id" in data
    assert "form_schema" in data
    assert "metadata" in data

    # Verify indicator_id matches
    assert data["indicator_id"] == test_indicator.id

    # Verify form_schema contains fields
    assert isinstance(data["form_schema"], dict)
    assert "fields" in data["form_schema"]
    assert isinstance(data["form_schema"]["fields"], list)
    assert len(data["form_schema"]["fields"]) > 0

    # Verify metadata
    metadata = data["metadata"]
    assert metadata["title"] == test_indicator.name
    assert metadata["description"] == test_indicator.description
    assert "governance_area_name" in metadata


def test_get_form_schema_with_blgu_user(
    client: TestClient, db_session: Session, test_indicator: Indicator
):
    """Test BLGU users can access form schemas (all barangays complete all governance areas)"""
    # Create a BLGU user
    from app.db.models.barangay import Barangay

    barangay = Barangay(
        name=f"Test Barangay {uuid.uuid4().hex[:8]}",
    )
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)

    blgu_user = User(
        email=f"blgu_{uuid.uuid4().hex[:8]}@example.com",
        name="BLGU User",
        hashed_password=pwd_context.hash("blgupass123"),
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        is_active=True,
    )
    db_session.add(blgu_user)
    db_session.commit()
    db_session.refresh(blgu_user)

    _override_user_and_db(client, blgu_user, db_session)

    response = client.get(f"/api/v1/indicators/{test_indicator.id}/form-schema")

    assert response.status_code == 200
    data = response.json()
    assert data["indicator_id"] == test_indicator.id
    assert "form_schema" in data


def test_get_form_schema_with_assessor(
    client: TestClient,
    db_session: Session,
    assessor_user: User,
    test_indicator: Indicator,
):
    """Test assessors can access form schemas"""
    _override_user_and_db(client, assessor_user, db_session)

    response = client.get(f"/api/v1/indicators/{test_indicator.id}/form-schema")

    assert response.status_code == 200
    data = response.json()
    assert data["indicator_id"] == test_indicator.id
    assert "form_schema" in data


def test_get_form_schema_not_found(client: TestClient, db_session: Session, admin_user: User):
    """Test getting form schema for non-existent indicator returns 404"""
    _override_admin_and_db(client, admin_user, db_session)

    response = client.get("/api/v1/indicators/99999/form-schema")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_form_schema_unauthorized(client: TestClient, test_indicator: Indicator):
    """Test that accessing form schema requires authentication"""
    response = client.get(f"/api/v1/indicators/{test_indicator.id}/form-schema")

    assert response.status_code in [401, 403]


def test_get_form_schema_with_complex_schema(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    governance_area: GovernanceArea,
):
    """Test form schema retrieval with complex multi-field schema"""
    # Create indicator with complex form schema
    complex_indicator = Indicator(
        name=f"Complex Indicator {uuid.uuid4().hex[:8]}",
        description="Complex multi-field indicator",
        version=1,
        is_active=True,
        is_auto_calculable=False,
        is_profiling_only=False,
        form_schema={
            "fields": [
                {
                    "field_id": "text_field",
                    "field_type": "text_input",
                    "label": "Text Input",
                    "required": True,
                    "help_text": "Enter text",
                },
                {
                    "field_id": "number_field",
                    "field_type": "number_input",
                    "label": "Number Input",
                    "required": True,
                    "min_value": 0,
                    "max_value": 100,
                },
                {
                    "field_id": "date_field",
                    "field_type": "date_picker",
                    "label": "Date Picker",
                    "required": False,
                },
                {
                    "field_id": "radio_field",
                    "field_type": "radio_button",
                    "label": "Radio Button",
                    "required": True,
                    "options": [
                        {"value": "yes", "label": "Yes"},
                        {"value": "no", "label": "No"},
                    ],
                },
            ]
        },
        governance_area_id=governance_area.id,
    )
    db_session.add(complex_indicator)
    db_session.commit()
    db_session.refresh(complex_indicator)

    _override_admin_and_db(client, admin_user, db_session)

    response = client.get(f"/api/v1/indicators/{complex_indicator.id}/form-schema")

    assert response.status_code == 200
    data = response.json()

    # Verify all fields are present
    fields = data["form_schema"]["fields"]
    assert len(fields) == 4

    # Verify field IDs
    field_ids = [f["field_id"] for f in fields]
    assert "text_field" in field_ids
    assert "number_field" in field_ids
    assert "date_field" in field_ids
    assert "radio_field" in field_ids

    # Verify specific field properties
    number_field = next(f for f in fields if f["field_id"] == "number_field")
    assert number_field["min_value"] == 0
    assert number_field["max_value"] == 100

    radio_field = next(f for f in fields if f["field_id"] == "radio_field")
    assert len(radio_field["options"]) == 2


def test_get_form_schema_excludes_calculation_schema(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    governance_area: GovernanceArea,
):
    """Test that form schema endpoint does NOT include calculation_schema (assessor-only)"""
    # Create indicator with both form_schema and calculation_schema
    indicator_with_calc = Indicator(
        name=f"Indicator with Calc {uuid.uuid4().hex[:8]}",
        description="Indicator with calculation schema",
        version=1,
        is_active=True,
        is_auto_calculable=True,
        is_profiling_only=False,
        form_schema={
            "fields": [
                {
                    "field_id": "score",
                    "field_type": "number_input",
                    "label": "Score",
                    "required": True,
                }
            ]
        },
        calculation_schema={"rules": [{"condition": "score >= 80", "result": "PASS"}]},
        governance_area_id=governance_area.id,
    )
    db_session.add(indicator_with_calc)
    db_session.commit()
    db_session.refresh(indicator_with_calc)

    _override_admin_and_db(client, admin_user, db_session)

    response = client.get(f"/api/v1/indicators/{indicator_with_calc.id}/form-schema")

    assert response.status_code == 200
    data = response.json()

    # Verify form_schema is included
    assert "form_schema" in data
    assert "fields" in data["form_schema"]

    # Verify calculation_schema is NOT included
    assert "calculation_schema" not in data
    # Also check it's not nested in form_schema
    assert "calculation_schema" not in data["form_schema"]
