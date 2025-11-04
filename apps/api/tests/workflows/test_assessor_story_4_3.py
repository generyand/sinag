# 🧪 Tests for Assessor Story 4.3: Assessor Analytics Endpoint
# Tests for the GET /api/v1/assessor/analytics endpoint

import pytest
from datetime import datetime, timedelta
from app.api import deps
from app.db.enums import AssessmentStatus, ComplianceStatus, UserRole, ValidationStatus
from app.db.models.assessment import Assessment, AssessmentResponse, FeedbackComment
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from fastapi.testclient import TestClient
from main import app
from sqlalchemy.orm import Session


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


def create_test_assessor_with_area(db_session: Session) -> User:
    """Create a test assessor user with governance area."""
    area = GovernanceArea(name="Test Governance Area Analytics", area_type="Core")
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)

    assessor = User(
        email="assessor_analytics@test.com",
        name="Test Assessor Analytics",
        role=UserRole.AREA_ASSESSOR,
        governance_area_id=area.id,
        hashed_password="hashed_password",
    )
    db_session.add(assessor)
    db_session.commit()
    db_session.refresh(assessor)

    return assessor


def create_test_assessment_with_responses(
    db_session: Session,
    governance_area_id: int,
    status: AssessmentStatus,
    compliance_status: ComplianceStatus | None = None,
    num_responses: int = 3,
    validation_statuses: list[ValidationStatus | None] | None = None,
) -> Assessment:
    """Create a test assessment with responses for analytics testing."""
    import time
    # Use timestamp to ensure unique barangay names and emails
    timestamp = int(time.time() * 1000000)  # microseconds for uniqueness
    barangay = Barangay(name=f"Test Barangay Analytics {governance_area_id} {timestamp}")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)

    blgu_user = User(
        email=f"blgu_analytics_{governance_area_id}_{timestamp}@test.com",
        name=f"BLGU User Analytics {governance_area_id}",
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        hashed_password="hashed_password",
    )
    db_session.add(blgu_user)
    db_session.commit()
    db_session.refresh(blgu_user)

    indicator = Indicator(
        name=f"Test Indicator Analytics {governance_area_id}",
        governance_area_id=governance_area_id,
        description="Test indicator for analytics",
        form_schema={"type": "object", "properties": {}},
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)

    # Calculate submission time (for trend series testing)
    submitted_at = datetime.utcnow() - timedelta(days=30)

    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        status=status,
        final_compliance_status=compliance_status,
        submitted_at=submitted_at,
        validated_at=datetime.utcnow() if status == AssessmentStatus.VALIDATED else None,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    # Create responses with validation statuses
    validation_statuses = validation_statuses or [None] * num_responses
    for i, val_status in enumerate(validation_statuses[:num_responses]):
        response = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            is_completed=True,
            response_data={"test": f"data_{i}"},
            validation_status=val_status,
            updated_at=datetime.utcnow() if val_status else submitted_at,
        )
        db_session.add(response)
    db_session.commit()
    db_session.refresh(assessment)

    return assessment


def test_get_analytics_success(client, db_session):
    """Test successful retrieval of assessor analytics."""
    assessor = create_test_assessor_with_area(db_session)

    # Create multiple assessments with different statuses
    assessment1 = create_test_assessment_with_responses(
        db_session,
        assessor.governance_area_id,
        AssessmentStatus.VALIDATED,
        ComplianceStatus.PASSED,
        3,
        [ValidationStatus.PASS, ValidationStatus.PASS, ValidationStatus.PASS],
    )
    assessment2 = create_test_assessment_with_responses(
        db_session,
        assessor.governance_area_id,
        AssessmentStatus.VALIDATED,
        ComplianceStatus.FAILED,
        2,
        [ValidationStatus.FAIL, ValidationStatus.FAIL],
    )
    assessment3 = create_test_assessment_with_responses(
        db_session,
        assessor.governance_area_id,
        AssessmentStatus.SUBMITTED_FOR_REVIEW,
        None,
        2,
        [ValidationStatus.PASS, None],
    )

    # Override dependencies
    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    # Test analytics request
    response = client.get("/api/v1/assessor/analytics")

    # Assertions
    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "overview" in data
    assert "hotspots" in data
    assert "workflow" in data
    assert "assessment_period" in data
    assert "governance_area_name" in data

    # Verify overview data
    overview = data["overview"]
    assert "total_assessed" in overview
    assert "passed" in overview
    assert "failed" in overview
    assert "pass_rate" in overview
    assert "trend_series" in overview

    # Verify workflow data
    workflow = data["workflow"]
    assert "avg_time_to_first_review" in workflow
    assert "avg_rework_cycle_time" in workflow
    assert "total_reviewed" in workflow
    assert "rework_rate" in workflow
    assert "counts_by_status" in workflow

    # Verify hotspots is a list
    assert isinstance(data["hotspots"], list)

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


def test_get_analytics_overview_calculations(client, db_session):
    """Test that overview metrics are calculated correctly."""
    assessor = create_test_assessor_with_area(db_session)

    # Create assessments with known compliance statuses
    create_test_assessment_with_responses(
        db_session,
        assessor.governance_area_id,
        AssessmentStatus.VALIDATED,
        ComplianceStatus.PASSED,
        2,
        [ValidationStatus.PASS, ValidationStatus.PASS],
    )
    create_test_assessment_with_responses(
        db_session,
        assessor.governance_area_id,
        AssessmentStatus.VALIDATED,
        ComplianceStatus.FAILED,
        2,
        [ValidationStatus.FAIL, ValidationStatus.FAIL],
    )

    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    response = client.get("/api/v1/assessor/analytics")

    assert response.status_code == 200
    data = response.json()

    overview = data["overview"]
    assert overview["total_assessed"] == 2
    assert overview["passed"] == 1
    assert overview["failed"] == 1
    assert overview["pass_rate"] == 50.0  # 1/2 * 100

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


def test_get_analytics_hotspots(client, db_session):
    """Test that hotspots identify top underperforming indicators."""
    assessor = create_test_assessor_with_area(db_session)

    # Create indicator that will fail
    indicator = Indicator(
        name="Failing Indicator",
        governance_area_id=assessor.governance_area_id,
        description="Indicator that fails",
        form_schema={"type": "object", "properties": {}},
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)

    # Create multiple assessments with failures on this indicator
    for i in range(3):
        assessment = create_test_assessment_with_responses(
            db_session,
            assessor.governance_area_id,
            AssessmentStatus.VALIDATED,
            ComplianceStatus.FAILED,
            1,
            [ValidationStatus.FAIL],
        )
        # Update response to use the failing indicator
        response = assessment.responses[0]
        response.indicator_id = indicator.id
        db_session.commit()

    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    response = client.get("/api/v1/assessor/analytics")

    assert response.status_code == 200
    data = response.json()

    # Verify hotspots contain the failing indicator
    hotspots = data["hotspots"]
    assert len(hotspots) > 0
    assert any(hotspot["indicator"] == "Failing Indicator" for hotspot in hotspots)

    # Find the failing indicator hotspot
    failing_hotspot = next(
        (h for h in hotspots if h["indicator"] == "Failing Indicator"), None
    )
    assert failing_hotspot is not None
    assert failing_hotspot["failed_count"] >= 3
    assert "barangays" in failing_hotspot
    assert isinstance(failing_hotspot["barangays"], list)

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


def test_get_analytics_workflow_metrics(client, db_session):
    """Test that workflow metrics are calculated correctly."""
    assessor = create_test_assessor_with_area(db_session)

    # Create assessment with rework
    assessment = create_test_assessment_with_responses(
        db_session,
        assessor.governance_area_id,
        AssessmentStatus.VALIDATED,
        ComplianceStatus.PASSED,
        2,
        [ValidationStatus.PASS, ValidationStatus.PASS],
    )
    assessment.rework_count = 1
    assessment.submitted_at = datetime.utcnow() - timedelta(days=5)
    assessment.validated_at = datetime.utcnow()
    db_session.commit()

    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    response = client.get("/api/v1/assessor/analytics")

    assert response.status_code == 200
    data = response.json()

    workflow = data["workflow"]
    assert workflow["total_reviewed"] >= 1
    assert workflow["rework_rate"] >= 0
    assert "counts_by_status" in workflow
    assert isinstance(workflow["counts_by_status"], dict)

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


def test_get_analytics_trend_series(client, db_session):
    """Test that trend series contains last 6 months of data."""
    assessor = create_test_assessor_with_area(db_session)

    # Create assessments with different submission dates
    for i in range(3):
        assessment = create_test_assessment_with_responses(
            db_session,
            assessor.governance_area_id,
            AssessmentStatus.SUBMITTED_FOR_REVIEW,
            None,
            1,
            [ValidationStatus.PASS],
        )
        # Set submission date to different months
        assessment.submitted_at = datetime.utcnow() - timedelta(days=30 * (i + 1))
        db_session.commit()

    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    response = client.get("/api/v1/assessor/analytics")

    assert response.status_code == 200
    data = response.json()

    trend_series = data["overview"]["trend_series"]
    assert len(trend_series) == 6  # Should have 6 months

    # Verify structure of trend series items
    for item in trend_series:
        assert "month" in item
        assert "assessed" in item
        assert isinstance(item["month"], str)
        assert isinstance(item["assessed"], int)

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


def test_get_analytics_empty_data(client, db_session):
    """Test analytics endpoint with no assessments."""
    assessor = create_test_assessor_with_area(db_session)

    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    response = client.get("/api/v1/assessor/analytics")

    assert response.status_code == 200
    data = response.json()

    # Verify empty data returns zero/default values
    assert data["overview"]["total_assessed"] == 0
    assert data["overview"]["passed"] == 0
    assert data["overview"]["failed"] == 0
    assert data["overview"]["pass_rate"] == 0.0
    assert len(data["hotspots"]) == 0
    assert data["workflow"]["total_reviewed"] == 0
    assert data["workflow"]["rework_rate"] == 0.0

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


def test_get_analytics_filters_by_governance_area(client, db_session):
    """Test that analytics only include assessments from assessor's governance area."""
    assessor = create_test_assessor_with_area(db_session)

    # Create another governance area
    other_area = GovernanceArea(name="Other Governance Area", area_type="Essential")
    db_session.add(other_area)
    db_session.commit()
    db_session.refresh(other_area)

    # Create assessment in assessor's area
    assessment1 = create_test_assessment_with_responses(
        db_session,
        assessor.governance_area_id,
        AssessmentStatus.VALIDATED,
        ComplianceStatus.PASSED,
        1,
        [ValidationStatus.PASS],
    )

    # Create assessment in different area
    assessment2 = create_test_assessment_with_responses(
        db_session,
        other_area.id,
        AssessmentStatus.VALIDATED,
        ComplianceStatus.PASSED,
        1,
        [ValidationStatus.PASS],
    )

    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    response = client.get("/api/v1/assessor/analytics")

    assert response.status_code == 200
    data = response.json()

    # Should only include assessment from assessor's governance area
    assert data["overview"]["total_assessed"] == 1
    assert data["governance_area_name"] == "Test Governance Area Analytics"

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)


def test_get_analytics_compliance_status_fallback(client, db_session):
    """Test that analytics fall back to validation status when compliance status not set."""
    assessor = create_test_assessor_with_area(db_session)

    # Create assessment without compliance status but with validation statuses
    assessment = create_test_assessment_with_responses(
        db_session,
        assessor.governance_area_id,
        AssessmentStatus.SUBMITTED_FOR_REVIEW,
        None,  # No compliance status
        3,
        [ValidationStatus.PASS, ValidationStatus.PASS, ValidationStatus.FAIL],
    )

    def _override_current_area_assessor_user():
        return assessor

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_area_assessor_user] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    response = client.get("/api/v1/assessor/analytics")

    assert response.status_code == 200
    data = response.json()

    # Should count based on validation status (2 Pass > 1 Fail = Passed)
    assert data["overview"]["total_assessed"] == 1
    assert data["overview"]["passed"] >= 1  # Majority passes

    # Cleanup
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)

