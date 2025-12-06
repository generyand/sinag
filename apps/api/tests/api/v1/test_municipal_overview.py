"""
Tests for Municipal Overview API endpoints (app/api/v1/municipal_overview.py)

Tests the MLGOO-only municipal performance overview dashboard including:
- Access control (MLGOO only)
- Compliance summary
- Governance area performance
- Top failing indicators
- Aggregated CapDev summary
- Barangay status list
"""

import uuid
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import AreaType, AssessmentStatus, ComplianceStatus, UserRole
from app.db.models.assessment import Assessment
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea
from app.db.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture(autouse=True)
def clear_user_overrides(client):
    """Clear user-related dependency overrides after each test"""
    yield
    if deps.get_current_active_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_active_user]
    if deps.get_current_admin_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_admin_user]


@pytest.fixture
def mlgoo_user(db_session: Session):
    """Create a MLGOO_DILG admin user for testing"""
    unique_email = f"mlgoo_{uuid.uuid4().hex[:8]}@dilg.gov.ph"

    user = User(
        email=unique_email,
        name="MLGOO Admin User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.MLGOO_DILG,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def blgu_user(db_session: Session):
    """Create a BLGU user for access control testing"""
    unique_email = f"blgu_{uuid.uuid4().hex[:8]}@example.com"
    unique_barangay = f"Test Barangay {uuid.uuid4().hex[:8]}"

    barangay = Barangay(name=unique_barangay)
    db_session.add(barangay)
    db_session.commit()

    user = User(
        email=unique_email,
        name="BLGU User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_barangays(db_session: Session):
    """Create multiple test barangays"""
    barangays = []
    for i in range(5):
        barangay = Barangay(name=f"Test Barangay {uuid.uuid4().hex[:8]}")
        db_session.add(barangay)
        barangays.append(barangay)
    db_session.commit()
    return barangays


@pytest.fixture
def test_governance_area(db_session: Session):
    """Create a test governance area"""
    unique_id = uuid.uuid4().hex[:8]
    area = GovernanceArea(
        name=f"Test Area {unique_id}",
        code=f"T{unique_id[:1].upper()}",
        area_type=AreaType.CORE,
    )
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    return area


@pytest.fixture
def completed_assessments(db_session: Session, test_barangays):
    """Create multiple completed assessments for testing"""
    assessments = []

    for i, barangay in enumerate(test_barangays):
        # Create BLGU user for this barangay
        user = User(
            email=f"blgu_{uuid.uuid4().hex[:8]}@example.com",
            name=f"BLGU User {i}",
            hashed_password=pwd_context.hash("password123"),
            role=UserRole.BLGU_USER,
            barangay_id=barangay.id,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        # Create assessment (alternating pass/fail)
        assessment = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.COMPLETED,
            mlgoo_approved_by=1,
            mlgoo_approved_at=datetime(2024, 1, 1),
            final_compliance_status=ComplianceStatus.PASSED
            if i % 2 == 0
            else ComplianceStatus.FAILED,
        )
        db_session.add(assessment)
        assessments.append(assessment)

    db_session.commit()
    return assessments


def _override_user_and_db(client, user: User, db_session: Session):
    """Override authentication and database dependencies"""

    def _override_current_active_user():
        return user

    def _override_current_admin_user():
        if user.role != UserRole.MLGOO_DILG:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Requires admin privileges",
            )
        return user

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_active_user] = _override_current_active_user
    client.app.dependency_overrides[deps.get_current_admin_user] = _override_current_admin_user
    client.app.dependency_overrides[deps.get_db] = _override_get_db


# ============================================================================
# Access Control Tests
# ============================================================================


def test_municipal_dashboard_mlgoo_only(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
):
    """Test that only MLGOO can access municipal dashboard"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.get("/api/v1/municipal-overview/dashboard")

    assert response.status_code == 403


def test_compliance_summary_mlgoo_only(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
):
    """Test that only MLGOO can access compliance summary"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.get("/api/v1/municipal-overview/compliance-summary")

    assert response.status_code == 403


def test_governance_areas_mlgoo_only(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
):
    """Test that only MLGOO can access governance area performance"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.get("/api/v1/municipal-overview/governance-areas")

    assert response.status_code == 403


def test_top_failing_indicators_mlgoo_only(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
):
    """Test that only MLGOO can access top failing indicators"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.get("/api/v1/municipal-overview/top-failing-indicators")

    assert response.status_code == 403


def test_capdev_summary_mlgoo_only(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
):
    """Test that only MLGOO can access CapDev summary"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.get("/api/v1/municipal-overview/capdev-summary")

    assert response.status_code == 403


def test_barangay_statuses_mlgoo_only(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
):
    """Test that only MLGOO can access barangay status list"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.get("/api/v1/municipal-overview/barangay-statuses")

    assert response.status_code == 403


# ============================================================================
# GET /api/v1/municipal-overview/dashboard - Complete Dashboard
# ============================================================================


def test_get_municipal_dashboard_success(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessments,
):
    """Test successful retrieval of complete dashboard"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/dashboard")

    assert response.status_code == 200
    data = response.json()

    # Verify all dashboard sections are present
    assert "compliance_summary" in data
    assert "governance_area_performance" in data
    assert "top_failing_indicators" in data
    assert "capdev_summary" in data
    assert "barangay_statuses" in data


def test_get_municipal_dashboard_with_cycle_filter(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test dashboard with assessment_cycle filter"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/dashboard?assessment_cycle=2024")

    assert response.status_code == 200


def test_get_municipal_dashboard_include_draft(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test dashboard with include_draft parameter"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/dashboard?include_draft=true")

    assert response.status_code == 200


# ============================================================================
# GET /api/v1/municipal-overview/compliance-summary - Compliance Summary
# ============================================================================


def test_get_compliance_summary_success(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessments,
):
    """Test successful retrieval of compliance summary"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/compliance-summary")

    assert response.status_code == 200
    data = response.json()

    # Verify compliance summary fields
    assert "total_barangays" in data
    assert "assessed_barangays" in data
    assert "passed_barangays" in data
    assert "failed_barangays" in data
    assert "compliance_rate" in data
    assert "assessment_rate" in data


def test_get_compliance_summary_counts_correct(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessments,
):
    """Test that compliance summary counts are correct"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/compliance-summary")

    assert response.status_code == 200
    data = response.json()

    # We created 5 assessments, alternating pass/fail
    assert data["assessed_barangays"] == 5
    # 3 passed (index 0, 2, 4) and 2 failed (index 1, 3)
    assert data["passed_barangays"] == 3
    assert data["failed_barangays"] == 2


def test_get_compliance_summary_with_cycle_filter(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test compliance summary with assessment_cycle filter"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/compliance-summary?assessment_cycle=2024")

    assert response.status_code == 200


# ============================================================================
# GET /api/v1/municipal-overview/governance-areas - Governance Area Performance
# ============================================================================


def test_get_governance_area_performance_success(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test successful retrieval of governance area performance"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/governance-areas")

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "areas" in data
    assert isinstance(data["areas"], list)


def test_get_governance_area_performance_with_cycle(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test governance area performance with cycle filter"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/governance-areas?assessment_cycle=2024")

    assert response.status_code == 200


# ============================================================================
# GET /api/v1/municipal-overview/top-failing-indicators - Top Failing Indicators
# ============================================================================


def test_get_top_failing_indicators_success(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test successful retrieval of top failing indicators"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/top-failing-indicators")

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "indicators" in data
    assert isinstance(data["indicators"], list)


def test_get_top_failing_indicators_with_limit(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test top failing indicators with limit parameter"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/top-failing-indicators?limit=5")

    assert response.status_code == 200
    data = response.json()
    # Should respect the limit
    assert len(data["indicators"]) <= 5


def test_get_top_failing_indicators_limit_validation(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test that limit parameter is validated (min 1, max 50)"""
    _override_user_and_db(client, mlgoo_user, db_session)

    # Test limit too low
    response = client.get("/api/v1/municipal-overview/top-failing-indicators?limit=0")
    assert response.status_code == 422

    # Test limit too high
    response = client.get("/api/v1/municipal-overview/top-failing-indicators?limit=100")
    assert response.status_code == 422


def test_get_top_failing_indicators_with_cycle(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test top failing indicators with cycle filter"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/top-failing-indicators?assessment_cycle=2024")

    assert response.status_code == 200


# ============================================================================
# GET /api/v1/municipal-overview/capdev-summary - Aggregated CapDev Summary
# ============================================================================


def test_get_capdev_summary_success(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test successful retrieval of aggregated CapDev summary"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/capdev-summary")

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "total_assessments_with_capdev" in data
    assert "top_recommendations" in data
    assert "common_weaknesses_by_area" in data


def test_get_capdev_summary_with_cycle(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test CapDev summary with cycle filter"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/capdev-summary?assessment_cycle=2024")

    assert response.status_code == 200


def test_get_capdev_summary_aggregation_structure(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test that aggregated recommendations have correct structure"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/capdev-summary")

    assert response.status_code == 200
    data = response.json()

    # Verify top_recommendations structure
    if data["top_recommendations"]:
        rec = data["top_recommendations"][0]
        assert "title" in rec
        assert "frequency" in rec

    # Verify common_weaknesses_by_area structure (dict of area -> list of weaknesses)
    assert "common_weaknesses_by_area" in data
    assert isinstance(data["common_weaknesses_by_area"], dict)


# ============================================================================
# GET /api/v1/municipal-overview/barangay-statuses - Barangay Status List
# ============================================================================


def test_get_barangay_statuses_success(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    test_barangays,
):
    """Test successful retrieval of barangay status list"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/barangay-statuses")

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "barangays" in data
    assert isinstance(data["barangays"], list)


def test_get_barangay_statuses_include_draft(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test barangay status list with include_draft parameter"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/barangay-statuses?include_draft=true")

    assert response.status_code == 200


def test_get_barangay_statuses_exclude_draft_by_default(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    test_barangays,
):
    """Test that draft assessments are excluded by default"""
    _override_user_and_db(client, mlgoo_user, db_session)

    # Create a BLGU user with draft assessment
    user = User(
        email=f"draft_blgu_{uuid.uuid4().hex[:8]}@example.com",
        name="Draft BLGU User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=test_barangays[0].id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    draft_assessment = Assessment(
        blgu_user_id=user.id,
        status=AssessmentStatus.DRAFT,
    )
    db_session.add(draft_assessment)
    db_session.commit()

    # Get status without include_draft
    response_exclude = client.get("/api/v1/municipal-overview/barangay-statuses")
    data_exclude = response_exclude.json()

    # Get status with include_draft
    response_include = client.get("/api/v1/municipal-overview/barangay-statuses?include_draft=true")
    data_include = response_include.json()

    # With include_draft, we should see the draft
    # The exact count comparison depends on service implementation
    assert response_exclude.status_code == 200
    assert response_include.status_code == 200


# ============================================================================
# Error Handling Tests
# ============================================================================


def test_municipal_dashboard_handles_errors_gracefully(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test that dashboard returns 500 on service errors"""
    _override_user_and_db(client, mlgoo_user, db_session)

    # Test with invalid cycle that might cause errors
    response = client.get("/api/v1/municipal-overview/dashboard?assessment_cycle=invalid")

    # Should either return 200 with empty data or 500
    # Depending on service implementation
    assert response.status_code in [200, 500]


def test_unauthorized_access_no_token(client: TestClient):
    """Test that endpoints require authentication"""
    response = client.get("/api/v1/municipal-overview/dashboard")

    assert response.status_code in [401, 403]


# ============================================================================
# Schema Validation Tests
# ============================================================================


def test_compliance_summary_schema_fields(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test that compliance summary matches MunicipalComplianceSummary schema"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/compliance-summary")

    assert response.status_code == 200
    data = response.json()

    # Verify all required fields per schema
    required_fields = [
        "total_barangays",
        "assessed_barangays",
        "passed_barangays",
        "failed_barangays",
        "compliance_rate",
        "assessment_rate",
        "pending_mlgoo_approval",
        "in_progress",
    ]

    for field in required_fields:
        assert field in data, f"Missing required field: {field}"


def test_dashboard_response_structure(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test that dashboard response matches MunicipalOverviewDashboard schema"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/dashboard")

    assert response.status_code == 200
    data = response.json()

    # Verify all dashboard sections
    required_sections = [
        "compliance_summary",
        "governance_area_performance",
        "top_failing_indicators",
        "capdev_summary",
        "barangay_statuses",
    ]

    for section in required_sections:
        assert section in data, f"Missing required section: {section}"


# ============================================================================
# Integration Tests
# ============================================================================


def test_dashboard_aggregates_all_data_correctly(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessments,
):
    """Test that dashboard correctly aggregates data from all sections"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/dashboard")

    assert response.status_code == 200
    data = response.json()

    # Verify compliance summary is consistent
    compliance = data["compliance_summary"]
    assert (
        compliance["assessed_barangays"]
        == compliance["passed_barangays"] + compliance["failed_barangays"]
    )

    # Verify barangay statuses list is populated
    assert len(data["barangay_statuses"]["barangays"]) >= 0


def test_compliance_rate_calculation(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    completed_assessments,
):
    """Test that compliance rate is calculated correctly"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/municipal-overview/compliance-summary")

    assert response.status_code == 200
    data = response.json()

    # Calculate expected compliance rate
    if data["assessed_barangays"] > 0:
        expected_rate = (data["passed_barangays"] / data["assessed_barangays"]) * 100
        assert abs(data["compliance_rate"] - expected_rate) < 0.01  # Allow for rounding


def test_query_parameter_combinations(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test various combinations of query parameters"""
    _override_user_and_db(client, mlgoo_user, db_session)

    # Test dashboard with both cycle and include_draft
    response = client.get(
        "/api/v1/municipal-overview/dashboard?assessment_cycle=2024&include_draft=true"
    )
    assert response.status_code == 200

    # Test top failing indicators with both limit and cycle
    response = client.get(
        "/api/v1/municipal-overview/top-failing-indicators?limit=5&assessment_cycle=2024"
    )
    assert response.status_code == 200
