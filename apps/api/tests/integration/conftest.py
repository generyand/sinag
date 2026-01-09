"""
🧪 Integration Test Fixtures
Comprehensive fixtures for backend API integration testing (Epic 6.0 - Story 6.3)
"""

import uuid
from datetime import datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import pwd_context
from app.db.enums import (
    AreaType,
    AssessmentStatus,
    UserRole,
    ValidationStatus,
)
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User

# ============================================================================
# User Fixtures with Authentication
# ============================================================================


@pytest.fixture
def test_blgu_user(db_session: Session, mock_barangay: Barangay) -> User:
    """
    Create a BLGU user for integration tests.
    Returns user with plaintext password for authentication testing.
    """
    unique_email = f"blgu_integration_{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="Integration Test BLGU User",
        hashed_password=pwd_context.hash("testpassword123"),
        role=UserRole.BLGU_USER,
        barangay_id=mock_barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Store plaintext password for authentication
    user.plain_password = "testpassword123"
    return user


@pytest.fixture
def test_assessor_user(db_session: Session) -> User:
    """
    Create an ASSESSOR user for integration tests.
    Returns user with plaintext password for authentication testing.
    """
    unique_email = f"assessor_integration_{uuid.uuid4().hex[:8]}@dilg.gov.ph"

    user = User(
        email=unique_email,
        name="Integration Test Assessor",
        hashed_password=pwd_context.hash("testpassword123"),
        role=UserRole.ASSESSOR,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Store plaintext password for authentication
    user.plain_password = "testpassword123"
    return user


@pytest.fixture
def test_validator_user(db_session: Session, governance_area: GovernanceArea) -> User:
    """
    Create a VALIDATOR user for integration tests.
    Returns user with plaintext password for authentication testing.
    """
    unique_email = f"validator_integration_{uuid.uuid4().hex[:8]}@dilg.gov.ph"

    user = User(
        email=unique_email,
        name="Integration Test Validator",
        hashed_password=pwd_context.hash("testpassword123"),
        role=UserRole.VALIDATOR,
        assessor_area_id=governance_area.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Store plaintext password for authentication
    user.plain_password = "testpassword123"
    return user


@pytest.fixture
def test_mlgoo_user(db_session: Session) -> User:
    """
    Create an MLGOO_DILG admin user for integration tests.
    Returns user with plaintext password for authentication testing.
    """
    unique_email = f"mlgoo_integration_{uuid.uuid4().hex[:8]}@dilg.gov.ph"

    user = User(
        email=unique_email,
        name="Integration Test MLGOO Admin",
        hashed_password=pwd_context.hash("testpassword123"),
        role=UserRole.MLGOO_DILG,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Store plaintext password for authentication
    user.plain_password = "testpassword123"
    return user


# ============================================================================
# Authentication Helper Fixtures
# ============================================================================


def _override_db_for_auth(client: TestClient, db_session: Session):
    """Override database dependency to use the test's database session"""
    from app.api.deps import get_db

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture
def auth_headers_blgu(
    client: TestClient, db_session: Session, test_blgu_user: User
) -> dict[str, str]:
    """Get authentication headers for BLGU user."""
    _override_db_for_auth(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_blgu_user.email,
            "password": test_blgu_user.plain_password,
        },
    )
    assert response.status_code == 200, f"Auth failed: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_assessor(
    client: TestClient, db_session: Session, test_assessor_user: User
) -> dict[str, str]:
    """Get authentication headers for ASSESSOR user."""
    _override_db_for_auth(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_assessor_user.email,
            "password": test_assessor_user.plain_password,
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_validator(
    client: TestClient, db_session: Session, test_validator_user: User
) -> dict[str, str]:
    """Get authentication headers for VALIDATOR user."""
    _override_db_for_auth(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_validator_user.email,
            "password": test_validator_user.plain_password,
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_mlgoo(
    client: TestClient, db_session: Session, test_mlgoo_user: User
) -> dict[str, str]:
    """Get authentication headers for MLGOO admin user."""
    _override_db_for_auth(client, db_session)

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_mlgoo_user.email,
            "password": test_mlgoo_user.plain_password,
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ============================================================================
# Test Data Fixtures
# ============================================================================


@pytest.fixture
def governance_area(db_session: Session) -> GovernanceArea:
    """Create a governance area for integration tests."""
    unique_name = f"Test Governance Area {uuid.uuid4().hex[:8]}"

    area = GovernanceArea(
        name=unique_name,
        code=unique_name[-2:].upper(),
        area_type=AreaType.CORE,
    )
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    return area


@pytest.fixture
def test_indicator(db_session: Session, governance_area: GovernanceArea) -> Indicator:
    """
    Create a test indicator with form_schema for integration tests.
    """
    indicator = Indicator(
        name="Test Indicator for Integration",
        description="Integration test indicator",
        governance_area_id=governance_area.id,
        form_schema={
            "fields": [
                {
                    "field_id": "test_text_field",
                    "label": "Test Text Field",
                    "field_type": "text_input",
                    "required": True,
                },
                {
                    "field_id": "test_number_field",
                    "label": "Test Number Field",
                    "field_type": "number_input",
                    "required": True,
                    "min_value": 0,
                    "max_value": 100,
                },
                {
                    "field_id": "test_radio_field",
                    "label": "Test Radio Field",
                    "field_type": "radio_button",
                    "required": True,
                    "options": [
                        {"label": "Option A", "value": "option_a"},
                        {"label": "Option B", "value": "option_b"},
                        {"label": "Option C", "value": "option_c"},
                    ],
                },
            ]
        },
        calculation_schema={
            "rule_type": "AND_ALL",
            "conditions": [
                {
                    "field": "test_number_field",
                    "operator": ">=",
                    "value": 50,
                }
            ],
        },
        remark_schema={
            "PASS": "Test indicator passed",
            "FAIL": "Test indicator failed",
        },
        is_active=True,
        is_auto_calculable=True,
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)
    return indicator


@pytest.fixture
def test_assessment_data() -> dict[str, Any]:
    """
    Provide sample assessment response data for testing.
    """
    return {
        "test_text_field": "Sample text response",
        "test_number_field": 75,
        "test_select_field": "Option B",
    }


@pytest.fixture
def test_draft_assessment(db_session: Session, test_blgu_user: User) -> Assessment:
    """
    Create a DRAFT assessment for integration tests.
    """
    assessment = Assessment(
        blgu_user_id=test_blgu_user.id,
        status=AssessmentStatus.DRAFT,
        rework_count=0,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


@pytest.fixture
def test_submitted_assessment(db_session: Session, test_blgu_user: User) -> Assessment:
    """
    Create a SUBMITTED assessment for integration tests.
    """
    assessment = Assessment(
        blgu_user_id=test_blgu_user.id,
        status=AssessmentStatus.SUBMITTED,
        rework_count=0,
        submitted_at=datetime.utcnow(),
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


@pytest.fixture
def test_rework_assessment(
    db_session: Session, test_blgu_user: User, test_assessor_user: User
) -> Assessment:
    """
    Create a REWORK assessment for integration tests.
    """
    assessment = Assessment(
        blgu_user_id=test_blgu_user.id,
        status=AssessmentStatus.REWORK,
        rework_count=1,
        rework_requested_at=datetime.utcnow(),
        rework_requested_by=test_assessor_user.id,
        rework_comments="Please update the following items:\n- Item 1\n- Item 2",
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


@pytest.fixture
def test_assessment_with_responses(
    db_session: Session,
    test_draft_assessment: Assessment,
    test_indicator: Indicator,
    test_assessment_data: dict[str, Any],
) -> Assessment:
    """
    Create an assessment with saved responses for integration tests.
    """
    response = AssessmentResponse(
        assessment_id=test_draft_assessment.id,
        indicator_id=test_indicator.id,
        response_data=test_assessment_data,
        validation_status=ValidationStatus.PASS,
        generated_remark="Test indicator passed",
        is_completed=True,
    )
    db_session.add(response)
    db_session.commit()
    db_session.refresh(test_draft_assessment)
    return test_draft_assessment
