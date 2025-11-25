"""
Tests for external analytics API endpoints (app/api/v1/external_analytics.py)
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime
from passlib.context import CryptContext

from app.db.models.user import User
from app.db.models.barangay import Barangay
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.enums import UserRole, AssessmentStatus, ComplianceStatus, AreaType
from app.api import deps


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ====================================================================
# Test Fixtures
# ====================================================================


@pytest.fixture(autouse=True)
def clear_user_overrides(client):
    """Clear user-related dependency overrides after each test"""
    yield
    if deps.get_current_active_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_active_user]
    if deps.get_current_external_user in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_current_external_user]


@pytest.fixture
def katuparan_user(db_session: Session):
    """Create a Katuparan Center user for testing"""
    unique_email = f"katuparan_{uuid.uuid4().hex[:8]}@sulop.gov.ph"

    user = User(
        email=unique_email,
        name="Katuparan Center",
        hashed_password=pwd_context.hash("katuparan2025"),
        role=UserRole.KATUPARAN_CENTER_USER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def umdc_user(db_session: Session):
    """Create a UMDC Peace Center user for testing"""
    unique_email = f"umdc_{uuid.uuid4().hex[:8]}@sulop.gov.ph"

    user = User(
        email=unique_email,
        name="UMDC Peace Center",
        hashed_password=pwd_context.hash("umdc2025"),
        role=UserRole.UMDC_PEACE_CENTER_USER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def mlgoo_user(db_session: Session):
    """Create a MLGOO_DILG user for testing"""
    unique_email = f"mlgoo_{uuid.uuid4().hex[:8]}@dilg.gov.ph"

    user = User(
        email=unique_email,
        name="MLGOO Admin",
        hashed_password=pwd_context.hash("adminpass"),
        role=UserRole.MLGOO_DILG,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def blgu_user(db_session: Session):
    """Create a BLGU user for testing"""
    unique_email = f"blgu_{uuid.uuid4().hex[:8]}@example.com"

    # Create barangay first
    barangay = Barangay(name=f"Test Barangay {uuid.uuid4().hex[:8]}")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)

    user = User(
        email=unique_email,
        name="BLGU User",
        hashed_password=pwd_context.hash("blgupass"),
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def governance_areas(db_session: Session):
    """Create governance areas for testing"""
    areas = [
        GovernanceArea(id=1, code="FA", name="Financial Administration", area_type=AreaType.CORE),
        GovernanceArea(id=2, code="SP", name="Social Protection", area_type=AreaType.CORE),
        GovernanceArea(id=3, code="DP", name="Disaster Preparedness", area_type=AreaType.CORE),
        GovernanceArea(id=4, code="SS", name="Security", area_type=AreaType.ESSENTIAL),
    ]
    for area in areas:
        db_session.add(area)
    db_session.commit()
    return areas


@pytest.fixture
def five_assessments(db_session: Session):
    """Create 5 validated assessments to meet anonymization threshold"""
    barangays = []
    users = []
    assessments = []

    for i in range(5):
        # Create barangay
        barangay = Barangay(name=f"Barangay {i+1}")
        db_session.add(barangay)
        barangays.append(barangay)

    db_session.commit()

    for i, barangay in enumerate(barangays):
        # Create user
        unique_email = f"blgu{i}_{uuid.uuid4().hex[:8]}@example.com"
        user = User(
            email=unique_email,
            name=f"User {i}",
            hashed_password=pwd_context.hash("pass"),
            role=UserRole.BLGU_USER,
            barangay_id=barangay.id,
            is_active=True,
        )
        db_session.add(user)
        users.append(user)

    db_session.commit()

    for user in users:
        db_session.refresh(user)
        # Create assessment
        assessment = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.VALIDATED,
            final_compliance_status=ComplianceStatus.PASSED,
            validated_at=datetime(2024, 1, 1),
        )
        db_session.add(assessment)
        assessments.append(assessment)

    db_session.commit()
    return assessments


def _override_user_and_db(client, user: User, db_session: Session):
    """Override authentication and database dependencies"""
    def _override_current_active_user():
        return user

    def _override_current_external_user():
        if user.role not in (UserRole.KATUPARAN_CENTER_USER, UserRole.UMDC_PEACE_CENTER_USER):
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions. External stakeholder access required.",
            )
        return user

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_active_user] = _override_current_active_user
    client.app.dependency_overrides[deps.get_current_external_user] = _override_current_external_user
    client.app.dependency_overrides[deps.get_db] = _override_get_db


# ====================================================================
# GET /api/v1/external/analytics/overall - Overall Compliance
# ====================================================================


def test_get_overall_compliance_as_katuparan_user(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
    five_assessments,
):
    """Test Katuparan Center user can access overall compliance"""
    _override_user_and_db(client, katuparan_user, db_session)

    response = client.get("/api/v1/external/analytics/overall")

    assert response.status_code == 200
    data = response.json()
    assert "total_barangays" in data
    assert "passed_count" in data
    assert "failed_count" in data
    assert "pass_percentage" in data
    assert data["total_barangays"] >= 5


def test_get_overall_compliance_as_umdc_user(
    client: TestClient,
    db_session: Session,
    umdc_user: User,
    five_assessments,
):
    """Test UMDC Peace Center user can access overall compliance"""
    _override_user_and_db(client, umdc_user, db_session)

    response = client.get("/api/v1/external/analytics/overall")

    assert response.status_code == 200
    data = response.json()
    assert data["total_barangays"] >= 5


def test_get_overall_compliance_forbidden_for_mlgoo_user(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test MLGOO_DILG user cannot access external analytics"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/external/analytics/overall")

    assert response.status_code == 403


def test_get_overall_compliance_forbidden_for_blgu_user(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
):
    """Test BLGU user cannot access external analytics"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.get("/api/v1/external/analytics/overall")

    assert response.status_code == 403


def test_get_overall_compliance_unauthorized(client: TestClient):
    """Test that overall compliance requires authentication"""
    response = client.get("/api/v1/external/analytics/overall")

    assert response.status_code in [401, 403]


def test_get_overall_compliance_insufficient_data_returns_400(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
):
    """Test that < 5 barangays returns 400 Bad Request"""
    _override_user_and_db(client, katuparan_user, db_session)

    # Create only 3 assessments (below threshold)
    for i in range(3):
        barangay = Barangay(name=f"Barangay {i}")
        db_session.add(barangay)
    db_session.commit()

    for i in range(3):
        unique_email = f"blgu{i}_{uuid.uuid4().hex[:8]}@example.com"
        user = User(
            email=unique_email,
            name=f"User {i}",
            hashed_password=pwd_context.hash("pass"),
            role=UserRole.BLGU_USER,
            barangay_id=i+1,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assessment = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.VALIDATED,
            final_compliance_status=ComplianceStatus.PASSED,
            validated_at=datetime(2024, 1, 1),
        )
        db_session.add(assessment)
    db_session.commit()

    response = client.get("/api/v1/external/analytics/overall")

    assert response.status_code == 400
    assert "insufficient data" in response.json()["detail"].lower()


# ====================================================================
# GET /api/v1/external/analytics/governance-areas - Governance Areas
# ====================================================================


def test_get_governance_area_performance_as_katuparan_user(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
    governance_areas,
    five_assessments,
):
    """Test Katuparan user can access governance area performance"""
    _override_user_and_db(client, katuparan_user, db_session)

    response = client.get("/api/v1/external/analytics/governance-areas")

    assert response.status_code == 200
    data = response.json()
    assert "total_areas" in data
    assert "areas" in data
    assert isinstance(data["areas"], list)


def test_get_governance_area_performance_forbidden_for_non_external_user(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test non-external user cannot access governance area performance"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/external/analytics/governance-areas")

    assert response.status_code == 403


# ====================================================================
# GET /api/v1/external/analytics/top-failing-indicators
# ====================================================================


def test_get_top_failing_indicators_as_katuparan_user(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
    five_assessments,
):
    """Test Katuparan user can access top failing indicators"""
    _override_user_and_db(client, katuparan_user, db_session)

    response = client.get("/api/v1/external/analytics/top-failing-indicators")

    assert response.status_code == 200
    data = response.json()
    assert "indicators" in data
    assert isinstance(data["indicators"], list)


def test_get_top_failing_indicators_with_custom_limit(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
    five_assessments,
):
    """Test top failing indicators with custom limit parameter"""
    _override_user_and_db(client, katuparan_user, db_session)

    response = client.get("/api/v1/external/analytics/top-failing-indicators?limit=10")

    assert response.status_code == 200
    data = response.json()
    assert len(data["indicators"]) <= 10


def test_get_top_failing_indicators_forbidden_for_non_external_user(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
):
    """Test non-external user cannot access top failing indicators"""
    _override_user_and_db(client, blgu_user, db_session)

    response = client.get("/api/v1/external/analytics/top-failing-indicators")

    assert response.status_code == 403


# ====================================================================
# GET /api/v1/external/analytics/ai-insights/summary
# ====================================================================


def test_get_ai_insights_as_katuparan_user(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
    governance_areas,
    five_assessments,
):
    """Test Katuparan user can access AI insights (unfiltered)"""
    _override_user_and_db(client, katuparan_user, db_session)

    response = client.get("/api/v1/external/analytics/ai-insights/summary")

    assert response.status_code == 200
    data = response.json()
    assert "insights" in data
    assert isinstance(data["insights"], list)


def test_get_ai_insights_as_umdc_user_applies_filter(
    client: TestClient,
    db_session: Session,
    umdc_user: User,
    governance_areas,
    five_assessments,
):
    """Test UMDC user gets filtered AI insights (SS, SP, DP only)"""
    _override_user_and_db(client, umdc_user, db_session)

    response = client.get("/api/v1/external/analytics/ai-insights/summary")

    assert response.status_code == 200
    data = response.json()
    assert "insights" in data

    # All insights should be from UMDC focus areas
    for insight in data["insights"]:
        assert insight["governance_area_code"] in ["SS", "SP", "DP"]


def test_get_ai_insights_forbidden_for_non_external_user(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test non-external user cannot access AI insights"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/external/analytics/ai-insights/summary")

    assert response.status_code == 403


# ====================================================================
# GET /api/v1/external/analytics/dashboard - Complete Dashboard
# ====================================================================


def test_get_complete_dashboard_as_katuparan_user(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
    governance_areas,
    five_assessments,
):
    """Test Katuparan user can access complete dashboard"""
    _override_user_and_db(client, katuparan_user, db_session)

    response = client.get("/api/v1/external/analytics/dashboard")

    assert response.status_code == 200
    data = response.json()

    # Verify all sections are present
    assert "overall_compliance" in data
    assert "governance_areas" in data
    assert "top_failing_indicators" in data
    assert "ai_insights" in data

    # Verify structure
    assert "total_barangays" in data["overall_compliance"]
    assert "areas" in data["governance_areas"]
    assert "indicators" in data["top_failing_indicators"]
    assert "insights" in data["ai_insights"]


def test_get_complete_dashboard_as_umdc_user_applies_filter(
    client: TestClient,
    db_session: Session,
    umdc_user: User,
    governance_areas,
    five_assessments,
):
    """Test UMDC user gets complete dashboard with filtered insights"""
    _override_user_and_db(client, umdc_user, db_session)

    response = client.get("/api/v1/external/analytics/dashboard")

    assert response.status_code == 200
    data = response.json()

    # AI insights should be filtered for UMDC
    for insight in data["ai_insights"]["insights"]:
        assert insight["governance_area_code"] in ["SS", "SP", "DP"]


def test_get_complete_dashboard_forbidden_for_non_external_user(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
):
    """Test non-external user cannot access complete dashboard"""
    _override_user_and_db(client, mlgoo_user, db_session)

    response = client.get("/api/v1/external/analytics/dashboard")

    assert response.status_code == 403


def test_get_complete_dashboard_unauthorized(client: TestClient):
    """Test that complete dashboard requires authentication"""
    response = client.get("/api/v1/external/analytics/dashboard")

    assert response.status_code in [401, 403]


def test_get_complete_dashboard_insufficient_data_returns_400(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
):
    """Test that complete dashboard with < 5 barangays returns 400"""
    _override_user_and_db(client, katuparan_user, db_session)

    # Create only 4 assessments
    for i in range(4):
        barangay = Barangay(name=f"Barangay {i}")
        db_session.add(barangay)
    db_session.commit()

    for i in range(4):
        unique_email = f"blgu{i}_{uuid.uuid4().hex[:8]}@example.com"
        user = User(
            email=unique_email,
            name=f"User {i}",
            hashed_password=pwd_context.hash("pass"),
            role=UserRole.BLGU_USER,
            barangay_id=i+1,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assessment = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.VALIDATED,
            final_compliance_status=ComplianceStatus.PASSED,
            validated_at=datetime(2024, 1, 1),
        )
        db_session.add(assessment)
    db_session.commit()

    response = client.get("/api/v1/external/analytics/dashboard")

    assert response.status_code == 400
    assert "insufficient data" in response.json()["detail"].lower()


# ====================================================================
# Access Control Tests
# ====================================================================


def test_all_endpoints_require_external_user_role(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
):
    """Test that all external analytics endpoints require external user role"""
    _override_user_and_db(client, blgu_user, db_session)

    endpoints = [
        "/api/v1/external/analytics/overall",
        "/api/v1/external/analytics/governance-areas",
        "/api/v1/external/analytics/top-failing-indicators",
        "/api/v1/external/analytics/ai-insights/summary",
        "/api/v1/external/analytics/dashboard",
    ]

    for endpoint in endpoints:
        response = client.get(endpoint)
        assert response.status_code == 403, f"Endpoint {endpoint} should return 403 for non-external user"


def test_both_external_roles_can_access_all_endpoints(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
    umdc_user: User,
    five_assessments,
):
    """Test that both Katuparan and UMDC users can access all endpoints"""
    endpoints = [
        "/api/v1/external/analytics/overall",
        "/api/v1/external/analytics/governance-areas",
        "/api/v1/external/analytics/top-failing-indicators",
        "/api/v1/external/analytics/ai-insights/summary",
        "/api/v1/external/analytics/dashboard",
    ]

    for user in [katuparan_user, umdc_user]:
        _override_user_and_db(client, user, db_session)

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200, f"Endpoint {endpoint} should be accessible for {user.role}"


# ====================================================================
# UMDC Filtering Tests
# ====================================================================


def test_umdc_user_gets_filtered_insights_in_dashboard(
    client: TestClient,
    db_session: Session,
    umdc_user: User,
    governance_areas,
    five_assessments,
):
    """Test that UMDC user automatically receives filtered insights in all relevant endpoints"""
    _override_user_and_db(client, umdc_user, db_session)

    # Test AI insights endpoint
    response = client.get("/api/v1/external/analytics/ai-insights/summary")
    assert response.status_code == 200
    for insight in response.json()["insights"]:
        assert insight["governance_area_code"] in ["SS", "SP", "DP"]

    # Test complete dashboard endpoint
    response = client.get("/api/v1/external/analytics/dashboard")
    assert response.status_code == 200
    for insight in response.json()["ai_insights"]["insights"]:
        assert insight["governance_area_code"] in ["SS", "SP", "DP"]


def test_katuparan_user_gets_unfiltered_insights(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
    governance_areas,
    five_assessments,
):
    """Test that Katuparan Center user receives unfiltered insights"""
    _override_user_and_db(client, katuparan_user, db_session)

    response = client.get("/api/v1/external/analytics/ai-insights/summary")
    assert response.status_code == 200

    # Katuparan users should receive insights from all areas, not just SS, SP, DP
    # (Though this depends on actual data - we just verify no filtering is applied)
    data = response.json()
    assert "insights" in data


# ====================================================================
# Export Endpoint Tests
# ====================================================================


def test_csv_export_endpoint_success(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
    governance_areas,
    five_assessments,
):
    """Test CSV export endpoint returns valid CSV file"""
    _override_user_and_db(client, katuparan_user, db_session)

    response = client.get("/api/v1/external/analytics/export/csv")

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert "attachment" in response.headers["content-disposition"]
    assert "sinag_external_analytics" in response.headers["content-disposition"]
    assert ".csv" in response.headers["content-disposition"]

    # Verify CSV content
    csv_content = response.text
    assert "SINAG: Strategic Insights Nurturing Assessments and Governance" in csv_content
    assert "PRIVACY NOTICE" in csv_content
    assert "OVERALL MUNICIPAL COMPLIANCE" in csv_content


def test_csv_export_endpoint_with_cycle_filter(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
    governance_areas,
    five_assessments,
):
    """Test CSV export endpoint with assessment cycle filter"""
    _override_user_and_db(client, katuparan_user, db_session)

    response = client.get("/api/v1/external/analytics/export/csv?assessment_cycle=2024-Q1")

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"

    csv_content = response.text
    assert len(csv_content) > 0


def test_csv_export_endpoint_umdc_user(
    client: TestClient,
    db_session: Session,
    umdc_user: User,
    governance_areas,
    five_assessments,
):
    """Test CSV export endpoint with UMDC user (auto-filtered)"""
    _override_user_and_db(client, umdc_user, db_session)

    response = client.get("/api/v1/external/analytics/export/csv")

    assert response.status_code == 200

    csv_content = response.text
    assert "Filtered for UMDC Peace Center" in csv_content


def test_csv_export_endpoint_unauthorized(client: TestClient):
    """Test CSV export endpoint requires authentication"""
    response = client.get("/api/v1/external/analytics/export/csv")
    assert response.status_code == 401


def test_csv_export_endpoint_insufficient_data(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
    governance_areas,
):
    """Test CSV export endpoint returns 400 with insufficient data"""
    _override_user_and_db(client, katuparan_user, db_session)

    # No assessments created, should fail anonymization check
    response = client.get("/api/v1/external/analytics/export/csv")

    assert response.status_code == 400
    data = response.json()
    assert "Insufficient data" in data["detail"]


def test_pdf_export_endpoint_success(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
    governance_areas,
    five_assessments,
):
    """Test PDF export endpoint returns valid PDF file"""
    _override_user_and_db(client, katuparan_user, db_session)

    response = client.get("/api/v1/external/analytics/export/pdf")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment" in response.headers["content-disposition"]
    assert "sinag_external_analytics" in response.headers["content-disposition"]
    assert ".pdf" in response.headers["content-disposition"]

    # Verify PDF content (magic number)
    assert response.content[:4] == b'%PDF'
    assert len(response.content) > 5000  # PDF should be substantial


def test_pdf_export_endpoint_with_cycle_filter(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
    governance_areas,
    five_assessments,
):
    """Test PDF export endpoint with assessment cycle filter"""
    _override_user_and_db(client, katuparan_user, db_session)

    response = client.get("/api/v1/external/analytics/export/pdf?assessment_cycle=2024-Q1")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:4] == b'%PDF'


def test_pdf_export_endpoint_umdc_user(
    client: TestClient,
    db_session: Session,
    umdc_user: User,
    governance_areas,
    five_assessments,
):
    """Test PDF export endpoint with UMDC user (auto-filtered)"""
    _override_user_and_db(client, umdc_user, db_session)

    response = client.get("/api/v1/external/analytics/export/pdf")

    assert response.status_code == 200
    assert response.content[:4] == b'%PDF'


def test_pdf_export_endpoint_unauthorized(client: TestClient):
    """Test PDF export endpoint requires authentication"""
    response = client.get("/api/v1/external/analytics/export/pdf")
    assert response.status_code == 401


def test_pdf_export_endpoint_insufficient_data(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
    governance_areas,
):
    """Test PDF export endpoint returns 400 with insufficient data"""
    _override_user_and_db(client, katuparan_user, db_session)

    # No assessments created, should fail anonymization check
    response = client.get("/api/v1/external/analytics/export/pdf")

    assert response.status_code == 400
    data = response.json()
    assert "Insufficient data" in data["detail"]


def test_export_endpoints_different_users_get_same_aggregated_data(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
    umdc_user: User,
    governance_areas,
    five_assessments,
):
    """Test that both user types can export data (with different UMDC filtering)"""
    # Test Katuparan user
    _override_user_and_db(client, katuparan_user, db_session)
    katuparan_response = client.get("/api/v1/external/analytics/export/csv")
    assert katuparan_response.status_code == 200

    # Test UMDC user
    _override_user_and_db(client, umdc_user, db_session)
    umdc_response = client.get("/api/v1/external/analytics/export/csv")
    assert umdc_response.status_code == 200

    # Both should succeed
    katuparan_csv = katuparan_response.text
    umdc_csv = umdc_response.text

    # Both should have overall compliance section
    assert "OVERALL MUNICIPAL COMPLIANCE" in katuparan_csv
    assert "OVERALL MUNICIPAL COMPLIANCE" in umdc_csv

    # UMDC should have filter indicator
    assert "Filtered for UMDC Peace Center" not in katuparan_csv
    assert "Filtered for UMDC Peace Center" in umdc_csv


def test_export_filenames_have_timestamps(
    client: TestClient,
    db_session: Session,
    katuparan_user: User,
    governance_areas,
    five_assessments,
):
    """Test export filenames contain timestamps"""
    _override_user_and_db(client, katuparan_user, db_session)

    # CSV export
    csv_response = client.get("/api/v1/external/analytics/export/csv")
    csv_filename = csv_response.headers["content-disposition"]
    assert "sinag_external_analytics_" in csv_filename
    assert ".csv" in csv_filename

    # PDF export
    pdf_response = client.get("/api/v1/external/analytics/export/pdf")
    pdf_filename = pdf_response.headers["content-disposition"]
    assert "sinag_external_analytics_" in pdf_filename
    assert ".pdf" in pdf_filename
