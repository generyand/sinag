"""
Tests for BBI API endpoints (app/api/v1/bbis.py)
"""

import uuid

import pytest
from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import (
    AreaType,
    AssessmentStatus,
    BBIStatus,
    UserRole,
    ValidationStatus,
)
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.bbi import BBI, BBIResult
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@pytest.fixture(autouse=True)
def clear_user_overrides(client):
    """Clear user-related dependency overrides after each test"""
    yield
    if deps.get_current_active_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_active_user]
    if deps.get_current_admin_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_admin_user]


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
def governance_area(db_session: Session):
    """Create a governance area for testing"""
    area = GovernanceArea(
        name=f"Test Governance Area {uuid.uuid4().hex[:8]}",
        code=uuid.uuid4().hex[:2].upper(),
        area_type=AreaType.CORE,
    )
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    return area


@pytest.fixture
def indicators(db_session: Session, governance_area: GovernanceArea):
    """Create test indicators"""
    indicators = []
    for i in range(1, 4):
        indicator = Indicator(
            name=f"Test Indicator {i}",
            description=f"Description {i}",
            governance_area_id=governance_area.id,
        )
        db_session.add(indicator)
        indicators.append(indicator)
    db_session.commit()
    for indicator in indicators:
        db_session.refresh(indicator)
    return indicators


@pytest.fixture
def sample_bbi(db_session: Session, governance_area: GovernanceArea):
    """Create a sample BBI for testing"""
    bbi = BBI(
        name="Test BBI",
        abbreviation="TBBI",
        description="Test BBI description",
        governance_area_id=governance_area.id,
        mapping_rules={
            "operator": "AND",
            "conditions": [
                {"indicator_id": 1, "required_status": "Pass"},
                {"indicator_id": 2, "required_status": "Pass"},
            ],
        },
        is_active=True,
    )
    db_session.add(bbi)
    db_session.commit()
    db_session.refresh(bbi)
    return bbi


def _override_admin(client, user: User, db_session: Session):
    """Override authentication and database dependencies for admin users"""

    def _override_current_active_user():
        return user

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_active_user] = _override_current_active_user
    client.app.dependency_overrides[deps.get_current_admin_user] = _override_current_active_user
    client.app.dependency_overrides[deps.get_db] = _override_get_db


# ====================================================================
# POST /api/v1/bbis - Create BBI
# ====================================================================
# Note: BBI creation tests removed - BBIs are seeded/hardcoded in production
# ====================================================================


# ====================================================================
# GET /api/v1/bbis - List BBIs
# ====================================================================


def test_list_bbis_success(
    client: TestClient, db_session: Session, admin_user: User, sample_bbi: BBI
):
    """Test listing all BBIs"""
    _override_admin(client, admin_user, db_session)

    response = client.get("/api/v1/bbis/")

    assert response.status_code == 200
    data = response.json()
    assert "bbis" in data
    assert "total" in data
    assert data["total"] >= 1
    assert any(item["id"] == sample_bbi.id for item in data["bbis"])


def test_list_bbis_filter_by_governance_area(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    sample_bbi: BBI,
    governance_area: GovernanceArea,
):
    """Test listing BBIs filtered by governance area"""
    _override_admin(client, admin_user, db_session)

    response = client.get(f"/api/v1/bbis/?governance_area_id={governance_area.id}")

    assert response.status_code == 200
    data = response.json()
    assert all(item["governance_area_id"] == governance_area.id for item in data["bbis"])


def test_list_bbis_filter_by_active_status(
    client: TestClient, db_session: Session, admin_user: User, sample_bbi: BBI
):
    """Test listing BBIs filtered by active status"""
    _override_admin(client, admin_user, db_session)

    response = client.get("/api/v1/bbis/?is_active=true")

    assert response.status_code == 200
    data = response.json()
    assert all(item["is_active"] is True for item in data["bbis"])


def test_list_bbis_pagination(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    governance_area: GovernanceArea,
):
    """Test BBI list pagination"""
    _override_admin(client, admin_user, db_session)

    # Create multiple BBIs
    for i in range(5):
        bbi = BBI(
            name=f"BBI {i} {uuid.uuid4().hex[:8]}",
            abbreviation=f"B{i}",
            governance_area_id=governance_area.id,
        )
        db_session.add(bbi)
    db_session.commit()

    # Get first page
    response = client.get("/api/v1/bbis/?page=1&size=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["bbis"]) == 2

    # Get second page
    response = client.get("/api/v1/bbis/?page=2&size=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["bbis"]) == 2


# ====================================================================
# GET /api/v1/bbis/{bbi_id} - Get BBI Details
# ====================================================================


def test_get_bbi_success(
    client: TestClient, db_session: Session, admin_user: User, sample_bbi: BBI
):
    """Test getting BBI details"""
    _override_admin(client, admin_user, db_session)

    response = client.get(f"/api/v1/bbis/{sample_bbi.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == sample_bbi.id
    assert data["name"] == sample_bbi.name
    assert "governance_area" in data


def test_get_bbi_not_found(client: TestClient, db_session: Session, admin_user: User):
    """Test getting non-existent BBI"""
    _override_admin(client, admin_user, db_session)

    response = client.get("/api/v1/bbis/99999")

    assert response.status_code == 404


# ====================================================================
# PUT /api/v1/bbis/{bbi_id} - Update BBI
# ====================================================================


def test_update_bbi_success(
    client: TestClient, db_session: Session, admin_user: User, sample_bbi: BBI
):
    """Test successful BBI update"""
    _override_admin(client, admin_user, db_session)

    response = client.put(
        f"/api/v1/bbis/{sample_bbi.id}",
        json={
            "name": "Updated BBI Name",
            "description": "Updated description",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated BBI Name"
    assert data["description"] == "Updated description"


def test_update_bbi_unauthorized(client: TestClient, sample_bbi: BBI):
    """Test BBI update without authentication"""
    response = client.put(
        f"/api/v1/bbis/{sample_bbi.id}",
        json={"name": "Updated Name"},
    )

    # Unauthenticated requests should return 401
    assert response.status_code == 401


def test_update_bbi_not_found(client: TestClient, db_session: Session, admin_user: User):
    """Test updating non-existent BBI"""
    _override_admin(client, admin_user, db_session)

    response = client.put(
        "/api/v1/bbis/99999",
        json={"name": "Updated Name"},
    )

    assert response.status_code == 404


def test_update_bbi_mapping_rules(
    client: TestClient, db_session: Session, admin_user: User, sample_bbi: BBI
):
    """Test updating BBI mapping rules"""
    _override_admin(client, admin_user, db_session)

    new_mapping_rules = {
        "operator": "OR",
        "conditions": [
            {"indicator_id": 1, "required_status": "Pass"},
            {"indicator_id": 3, "required_status": "Fail"},
        ],
    }

    response = client.put(
        f"/api/v1/bbis/{sample_bbi.id}",
        json={"mapping_rules": new_mapping_rules},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["mapping_rules"]["operator"] == "OR"
    assert len(data["mapping_rules"]["conditions"]) == 2


# ====================================================================
# DELETE /api/v1/bbis/{bbi_id} - Deactivate BBI
# ====================================================================


def test_deactivate_bbi_success(
    client: TestClient, db_session: Session, admin_user: User, sample_bbi: BBI
):
    """Test successful BBI deactivation"""
    _override_admin(client, admin_user, db_session)

    assert sample_bbi.is_active is True

    response = client.delete(f"/api/v1/bbis/{sample_bbi.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is False


def test_deactivate_bbi_unauthorized(client: TestClient, sample_bbi: BBI):
    """Test BBI deactivation without authentication"""
    response = client.delete(f"/api/v1/bbis/{sample_bbi.id}")

    # Unauthenticated requests should return 401
    assert response.status_code == 401


def test_deactivate_bbi_not_found(client: TestClient, db_session: Session, admin_user: User):
    """Test deactivating non-existent BBI"""
    _override_admin(client, admin_user, db_session)

    response = client.delete("/api/v1/bbis/99999")

    assert response.status_code == 404


# ====================================================================
# POST /api/v1/bbis/test-calculation - Test BBI Calculation
# ====================================================================


def test_test_calculation_functional(client: TestClient, db_session: Session, admin_user: User):
    """Test BBI calculation endpoint"""
    _override_admin(client, admin_user, db_session)

    response = client.post(
        "/api/v1/bbis/test-calculation",
        json={
            "mapping_rules": {
                "operator": "AND",
                "conditions": [
                    {"indicator_id": 1, "required_status": "Pass"},
                    {"indicator_id": 2, "required_status": "Pass"},
                ],
            },
            "indicator_statuses": {
                "1": "Pass",
                "2": "Pass",
            },
        },
    )

    assert response.status_code == 200
    data = response.json()
    # Verify response structure
    assert "predicted_status" in data
    assert data["predicted_status"] == "FUNCTIONAL"


def test_test_calculation_non_functional(client: TestClient, db_session: Session, admin_user: User):
    """Test BBI calculation endpoint with non-functional result"""
    _override_admin(client, admin_user, db_session)

    response = client.post(
        "/api/v1/bbis/test-calculation",
        json={
            "mapping_rules": {
                "operator": "AND",
                "conditions": [
                    {"indicator_id": 1, "required_status": "Pass"},
                    {"indicator_id": 2, "required_status": "Pass"},
                ],
            },
            "indicator_statuses": {
                "1": "Pass",
                "2": "Fail",  # One fails
            },
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "predicted_status" in data
    assert data["predicted_status"] == "NON_FUNCTIONAL"


def test_test_calculation_or_operator(client: TestClient, db_session: Session, admin_user: User):
    """Test BBI calculation endpoint with OR operator"""
    _override_admin(client, admin_user, db_session)

    response = client.post(
        "/api/v1/bbis/test-calculation",
        json={
            "mapping_rules": {
                "operator": "OR",
                "conditions": [
                    {"indicator_id": 1, "required_status": "Pass"},
                    {"indicator_id": 2, "required_status": "Pass"},
                ],
            },
            "indicator_statuses": {
                "1": "Pass",
                "2": "Fail",  # One passes, OR logic
            },
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "predicted_status" in data
    assert data["predicted_status"] == "FUNCTIONAL"


# ====================================================================
# GET /api/v1/bbis/results/assessment/{assessment_id} - Get BBI Results
# ====================================================================


def test_get_bbi_results_success(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    sample_bbi: BBI,
    mock_blgu_user,
):
    """Test getting BBI results for an assessment"""
    _override_admin(client, admin_user, db_session)

    # Create assessment
    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        status=AssessmentStatus.VALIDATED,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    # Create BBI result
    bbi_result = BBIResult(
        bbi_id=sample_bbi.id,
        assessment_id=assessment.id,
        status=BBIStatus.FUNCTIONAL,
        calculation_details={"test": "data"},
    )
    db_session.add(bbi_result)
    db_session.commit()

    response = client.get(f"/api/v1/bbis/results/assessment/{assessment.id}")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["bbi_id"] == sample_bbi.id
    assert data[0]["status"] == "FUNCTIONAL"


def test_get_bbi_results_no_results(
    client: TestClient, db_session: Session, admin_user: User, mock_blgu_user
):
    """Test getting BBI results for assessment with no results"""
    _override_admin(client, admin_user, db_session)

    # Create assessment without BBI results
    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        status=AssessmentStatus.VALIDATED,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    response = client.get(f"/api/v1/bbis/results/assessment/{assessment.id}")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


# ====================================================================
# BBI Compliance Endpoints (DILG MC 2024-417)
# ====================================================================


@pytest.fixture
def bbi_indicator(db_session: Session, governance_area: GovernanceArea):
    """Create a BBI indicator with is_bbi=True for compliance testing"""
    indicator = Indicator(
        name="Barangay Development Council",
        indicator_code="2.1",
        description="BDC indicator",
        governance_area_id=governance_area.id,
        is_bbi=True,
        is_active=True,
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)
    return indicator


@pytest.fixture
def bbi_sub_indicators(
    db_session: Session, bbi_indicator: Indicator, governance_area: GovernanceArea
):
    """Create sub-indicators for the BBI indicator"""
    sub_indicators = []
    for i, name in enumerate(["Structure", "Meetings", "Plans"], start=1):
        sub_indicator = Indicator(
            name=name,
            indicator_code=f"2.1.{i}",
            description=f"{name} sub-indicator",
            governance_area_id=governance_area.id,
            parent_id=bbi_indicator.id,
            is_active=True,
            sort_order=i,
        )
        db_session.add(sub_indicator)
        sub_indicators.append(sub_indicator)
    db_session.commit()
    for si in sub_indicators:
        db_session.refresh(si)
    return sub_indicators


def test_get_assessment_bbi_compliance_success(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    mock_blgu_user,
    governance_area: GovernanceArea,
    bbi_indicator: Indicator,
    bbi_sub_indicators,
):
    """Test getting BBI compliance data for an assessment"""
    _override_admin(client, admin_user, db_session)

    # Create assessment
    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        status=AssessmentStatus.VALIDATED,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    # Create passing responses for sub-indicators
    for sub_indicator in bbi_sub_indicators:
        response = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=sub_indicator.id,
            validation_status=ValidationStatus.PASS,
            response_data={},
        )
        db_session.add(response)
    db_session.commit()

    response = client.get(f"/api/v1/bbis/compliance/assessment/{assessment.id}")

    assert response.status_code == 200
    data = response.json()
    assert "assessment_id" in data
    assert data["assessment_id"] == assessment.id
    assert "bbi_results" in data
    assert "summary" in data
    assert "calculated_at" in data


def test_get_assessment_bbi_compliance_not_found(
    client: TestClient, db_session: Session, admin_user: User
):
    """Test getting BBI compliance for non-existent assessment"""
    _override_admin(client, admin_user, db_session)

    response = client.get("/api/v1/bbis/compliance/assessment/99999")

    assert response.status_code == 404


def test_get_assessment_bbi_compliance_summary_structure(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    mock_blgu_user,
    governance_area: GovernanceArea,
    bbi_indicator: Indicator,
    bbi_sub_indicators,
):
    """Test that BBI compliance summary has correct structure"""
    _override_admin(client, admin_user, db_session)

    # Create assessment
    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        status=AssessmentStatus.VALIDATED,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    # Create responses (2 pass, 1 fail = 66% = MODERATELY_FUNCTIONAL)
    for i, sub_indicator in enumerate(bbi_sub_indicators):
        response = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=sub_indicator.id,
            validation_status=ValidationStatus.PASS if i < 2 else ValidationStatus.FAIL,
            response_data={},
        )
        db_session.add(response)
    db_session.commit()

    response = client.get(f"/api/v1/bbis/compliance/assessment/{assessment.id}")

    assert response.status_code == 200
    data = response.json()

    # Check summary structure
    summary = data["summary"]
    assert "total_bbis" in summary
    assert "highly_functional_count" in summary
    assert "moderately_functional_count" in summary
    assert "low_functional_count" in summary
    assert "average_compliance_percentage" in summary


def test_calculate_assessment_bbi_compliance_success(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    mock_blgu_user,
    governance_area: GovernanceArea,
    bbi_indicator: Indicator,
    bbi_sub_indicators,
):
    """Test calculating BBI compliance for an assessment"""
    _override_admin(client, admin_user, db_session)

    # Create assessment
    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        status=AssessmentStatus.VALIDATED,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    # Create all passing responses (100% = HIGHLY_FUNCTIONAL)
    for sub_indicator in bbi_sub_indicators:
        response = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=sub_indicator.id,
            validation_status=ValidationStatus.PASS,
            response_data={},
        )
        db_session.add(response)
    db_session.commit()

    response = client.post(f"/api/v1/bbis/compliance/calculate/{assessment.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["assessment_id"] == assessment.id
    assert "bbi_results" in data
    assert len(data["bbi_results"]) >= 1


def test_calculate_assessment_bbi_compliance_not_found(
    client: TestClient, db_session: Session, admin_user: User
):
    """Test calculating BBI compliance for non-existent assessment"""
    _override_admin(client, admin_user, db_session)

    response = client.post("/api/v1/bbis/compliance/calculate/99999")

    assert response.status_code == 404


def test_calculate_assessment_bbi_compliance_unauthorized(
    client: TestClient, db_session: Session, mock_blgu_user
):
    """Test that calculate compliance requires admin privileges"""

    # Override with non-admin user
    def _override_regular_user():
        return mock_blgu_user

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_active_user] = _override_regular_user
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    # Create assessment
    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        status=AssessmentStatus.VALIDATED,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    response = client.post(f"/api/v1/bbis/compliance/calculate/{assessment.id}")

    # Should be unauthorized (403) since we're not admin
    assert response.status_code == 403


def test_get_assessment_bbi_compliance_result_structure(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    mock_blgu_user,
    governance_area: GovernanceArea,
    bbi_indicator: Indicator,
    bbi_sub_indicators,
):
    """Test that BBI compliance results have correct structure per DILG MC 2024-417"""
    _override_admin(client, admin_user, db_session)

    # Create assessment
    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        status=AssessmentStatus.VALIDATED,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    # Create responses
    for sub_indicator in bbi_sub_indicators:
        response = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=sub_indicator.id,
            validation_status=ValidationStatus.PASS,
            response_data={},
        )
        db_session.add(response)
    db_session.commit()

    response = client.get(f"/api/v1/bbis/compliance/assessment/{assessment.id}")

    assert response.status_code == 200
    data = response.json()

    # Check result structure
    if data["bbi_results"]:
        result = data["bbi_results"][0]
        assert "bbi_id" in result
        assert "bbi_name" in result
        assert "bbi_abbreviation" in result
        assert "compliance_percentage" in result
        assert "compliance_rating" in result
        assert "sub_indicators_passed" in result
        assert "sub_indicators_total" in result

        # Verify rating is one of the valid values
        valid_ratings = [
            "HIGHLY_FUNCTIONAL",
            "MODERATELY_FUNCTIONAL",
            "LOW_FUNCTIONAL",
            "FUNCTIONAL",
            "NON_FUNCTIONAL",
        ]
        assert result["compliance_rating"] in valid_ratings
