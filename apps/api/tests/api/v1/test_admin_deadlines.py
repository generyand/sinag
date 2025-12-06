"""
Tests for Admin Deadline Management API endpoints (app/api/v1/admin.py)

Focus on deadline override CSV export endpoint.
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import UserRole
from app.db.models.admin import AssessmentCycle, DeadlineOverride
from app.db.models.barangay import Barangay
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
    if deps.get_db in client.app.dependency_overrides:
        del client.app.dependency_overrides[deps.get_db]


def setup_admin_auth(client: TestClient, admin_user: User, db_session: Session):
    """Helper function to set up authentication for admin user and database session"""

    def override_get_current_user():
        return admin_user

    def override_get_current_admin():
        return admin_user

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_active_user] = override_get_current_user
    client.app.dependency_overrides[deps.get_current_admin_user] = override_get_current_admin
    client.app.dependency_overrides[deps.get_db] = override_get_db


@pytest.fixture
def admin_user(db_session: Session):
    """Create an admin user for testing"""
    unique_email = f"admin_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="Admin User Deadlines",
        hashed_password=pwd_context.hash("adminpass123"),
        role=UserRole.MLGOO_DILG,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def non_admin_user(db_session: Session):
    """Create a non-admin user for testing"""
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="Regular User Deadlines",
        hashed_password=pwd_context.hash("userpass123"),
        role=UserRole.BLGU_USER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def barangay(db_session: Session):
    """Create a barangay for testing"""
    barangay = Barangay(name=f"Test Barangay {uuid.uuid4().hex[:8]}")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)
    return barangay


@pytest.fixture
def governance_area(db_session: Session):
    """Create a governance area for testing"""
    from app.db.enums import AreaType

    area = GovernanceArea(
        name=f"Test Governance Area {uuid.uuid4().hex[:8]}",
        area_type=AreaType.CORE,
    )
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    return area


@pytest.fixture
def indicator(db_session: Session, governance_area: GovernanceArea):
    """Create an indicator for testing"""
    indicator = Indicator(
        name=f"Test Indicator {uuid.uuid4().hex[:8]}",
        description="Test indicator",
        governance_area_id=governance_area.id,
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)
    return indicator


@pytest.fixture
def assessment_cycle(db_session: Session):
    """Create an assessment cycle for testing"""
    now = datetime.now(UTC)
    cycle = AssessmentCycle(
        name=f"Test Cycle {uuid.uuid4().hex[:8]}",
        year=2025,
        phase1_deadline=now + timedelta(days=30),
        rework_deadline=now + timedelta(days=45),
        phase2_deadline=now + timedelta(days=60),
        calibration_deadline=now + timedelta(days=90),
        is_active=True,
    )
    db_session.add(cycle)
    db_session.commit()
    db_session.refresh(cycle)
    return cycle


@pytest.fixture
def deadline_override(
    db_session: Session,
    assessment_cycle: AssessmentCycle,
    barangay: Barangay,
    indicator: Indicator,
    admin_user: User,
):
    """Create a deadline override for testing"""
    override = DeadlineOverride(
        cycle_id=assessment_cycle.id,
        barangay_id=barangay.id,
        indicator_id=indicator.id,
        created_by=admin_user.id,
        original_deadline=assessment_cycle.phase2_deadline,
        new_deadline=datetime.now(UTC) + timedelta(days=100),
        reason="Test override for CSV export",
    )
    db_session.add(override)
    db_session.commit()
    db_session.refresh(override)
    return override


# ====================================================================
# CSV Export Tests
# ====================================================================


def test_export_deadline_overrides_csv_success(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    deadline_override: DeadlineOverride,
):
    """Test successful CSV export of deadline overrides"""
    setup_admin_auth(client, admin_user, db_session)

    # Make request
    response = client.get("/api/v1/admin/deadlines/overrides/export")

    # Assertions
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert "attachment" in response.headers["content-disposition"]
    assert "deadline_overrides_" in response.headers["content-disposition"]

    # Check CSV content
    csv_content = response.text
    assert "Override ID" in csv_content
    assert "Barangay Name" in csv_content
    assert "Indicator Name" in csv_content
    assert "Original Deadline" in csv_content
    assert "New Deadline" in csv_content
    assert "Extension Duration (Days)" in csv_content
    assert "Reason" in csv_content
    assert "Created By" in csv_content


def test_export_deadline_overrides_csv_with_cycle_filter(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    assessment_cycle: AssessmentCycle,
    deadline_override: DeadlineOverride,
):
    """Test CSV export with cycle filter"""
    setup_admin_auth(client, admin_user, db_session)

    # Make request with cycle filter
    response = client.get(
        f"/api/v1/admin/deadlines/overrides/export?cycle_id={assessment_cycle.id}"
    )

    # Assertions
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"

    # Check that override is included
    csv_content = response.text
    assert deadline_override.reason in csv_content


def test_export_deadline_overrides_csv_with_barangay_filter(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    barangay: Barangay,
    deadline_override: DeadlineOverride,
):
    """Test CSV export with barangay filter"""
    setup_admin_auth(client, admin_user, db_session)

    # Make request with barangay filter
    response = client.get(f"/api/v1/admin/deadlines/overrides/export?barangay_id={barangay.id}")

    # Assertions
    assert response.status_code == 200
    csv_content = response.text
    assert barangay.name in csv_content


def test_export_deadline_overrides_csv_with_indicator_filter(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    indicator: Indicator,
    deadline_override: DeadlineOverride,
):
    """Test CSV export with indicator filter"""
    setup_admin_auth(client, admin_user, db_session)

    # Make request with indicator filter
    response = client.get(f"/api/v1/admin/deadlines/overrides/export?indicator_id={indicator.id}")

    # Assertions
    assert response.status_code == 200
    csv_content = response.text
    assert indicator.name in csv_content


def test_export_deadline_overrides_csv_with_multiple_filters(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    assessment_cycle: AssessmentCycle,
    barangay: Barangay,
    indicator: Indicator,
    deadline_override: DeadlineOverride,
):
    """Test CSV export with multiple filters combined"""
    setup_admin_auth(client, admin_user, db_session)

    # Make request with all filters
    response = client.get(
        f"/api/v1/admin/deadlines/overrides/export"
        f"?cycle_id={assessment_cycle.id}"
        f"&barangay_id={barangay.id}"
        f"&indicator_id={indicator.id}"
    )

    # Assertions
    assert response.status_code == 200
    csv_content = response.text
    assert deadline_override.reason in csv_content


def test_export_deadline_overrides_csv_empty(
    client: TestClient,
    db_session: Session,
    admin_user: User,
):
    """Test CSV export when no overrides exist"""
    setup_admin_auth(client, admin_user, db_session)

    # Make request with non-existent cycle filter
    response = client.get("/api/v1/admin/deadlines/overrides/export?cycle_id=99999")

    # Assertions
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"

    # Should still have headers
    csv_content = response.text
    assert "Override ID" in csv_content
    # Count lines - should only have header row (plus potential empty line)
    lines = csv_content.strip().split("\n")
    assert len(lines) == 1  # Just the header


def test_export_deadline_overrides_csv_unauthorized(
    client: TestClient,
    db_session: Session,
    non_admin_user: User,
):
    """Test that non-admin users cannot export CSV"""

    # Override with non-admin user (should fail auth check)
    def override_get_current_user():
        return non_admin_user

    client.app.dependency_overrides[deps.get_current_active_user] = override_get_current_user

    # Make request
    response = client.get("/api/v1/admin/deadlines/overrides/export")

    # Should fail because non-admin user doesn't have MLGOO_DILG role
    assert response.status_code in [401, 403]


def test_export_deadline_overrides_csv_contains_correct_data(
    client: TestClient,
    db_session: Session,
    admin_user: User,
    barangay: Barangay,
    indicator: Indicator,
    deadline_override: DeadlineOverride,
):
    """Test that CSV contains all expected data fields"""
    setup_admin_auth(client, admin_user, db_session)

    # Make request
    response = client.get("/api/v1/admin/deadlines/overrides/export")

    # Assertions
    assert response.status_code == 200
    csv_content = response.text

    # Check all required fields are present
    assert barangay.name in csv_content
    assert indicator.name in csv_content
    assert deadline_override.reason in csv_content
    assert admin_user.email in csv_content
    assert str(deadline_override.id) in csv_content


def test_export_deadline_overrides_csv_filename_includes_timestamp(
    client: TestClient,
    db_session: Session,
    admin_user: User,
):
    """Test that exported CSV filename includes timestamp"""
    setup_admin_auth(client, admin_user, db_session)

    # Make request
    response = client.get("/api/v1/admin/deadlines/overrides/export")

    # Assertions
    assert response.status_code == 200

    # Check filename format in Content-Disposition header
    content_disposition = response.headers["content-disposition"]
    assert "filename=deadline_overrides_" in content_disposition
    assert ".csv" in content_disposition
