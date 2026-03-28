from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import AssessmentStatus, UserRole
from app.db.models.assessment import Assessment
from app.db.models.barangay import Barangay
from app.db.models.system import AssessmentYear
from app.db.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@pytest.fixture(autouse=True)
def clear_user_overrides(client):
    yield
    client.app.dependency_overrides.clear()


@pytest.fixture
def mlgoo_admin(db_session: Session):
    user = User(
        email=f"mlgoo_{uuid4().hex[:8]}@dilg.gov.ph",
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
def blgu_barangay(db_session: Session):
    barangay = Barangay(name=f"MLGOO Reopen Barangay {uuid4().hex[:8]}")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)
    return barangay


@pytest.fixture
def blgu_user(db_session: Session, blgu_barangay: Barangay):
    user = User(
        email=f"blgu_{uuid4().hex[:8]}@example.com",
        name="BLGU User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=blgu_barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def active_assessment_year(db_session: Session):
    now = datetime.now(UTC)
    year = AssessmentYear(
        year=2026,
        assessment_period_start=now - timedelta(days=90),
        assessment_period_end=now + timedelta(days=90),
        phase1_deadline=now - timedelta(days=1),
        submission_window_days=60,
        rework_window_days=5,
        calibration_window_days=3,
        default_unlock_grace_period_days=5,
        is_active=True,
        is_published=True,
    )
    db_session.add(year)
    db_session.commit()
    db_session.refresh(year)
    return year


@pytest.fixture
def reopenable_assessment(
    db_session: Session, blgu_user: User, active_assessment_year: AssessmentYear
):
    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.AWAITING_FINAL_VALIDATION,
        is_locked_for_deadline=False,
        locked_at=None,
        lock_reason=None,
        grace_period_expires_at=datetime.utcnow() + timedelta(days=1),
        rework_count=1,
        calibration_count=1,
        mlgoo_recalibration_count=1,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


def override_user_and_db(client: TestClient, user: User, db_session: Session):
    def override_current_active_user():
        return user

    def override_current_admin_user():
        if user.role != UserRole.MLGOO_DILG:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Requires admin privileges",
            )
        return user

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_active_user] = override_current_active_user
    client.app.dependency_overrides[deps.get_current_admin_user] = override_current_admin_user
    client.app.dependency_overrides[deps.get_db] = override_get_db


def test_reopen_submission_success(
    client: TestClient,
    db_session: Session,
    mlgoo_admin: User,
    reopenable_assessment: Assessment,
):
    override_user_and_db(client, mlgoo_admin, db_session)

    response = client.post(
        f"/api/v1/mlgoo/assessments/{reopenable_assessment.id}/reopen",
        json={"reason": "Accidental submission before completion"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == AssessmentStatus.REOPENED_BY_MLGOO.value
    assert data["reopen_from_status"] == AssessmentStatus.AWAITING_FINAL_VALIDATION.value
    assert data["reopen_reason"] == "Accidental submission before completion"
    assert data["reopened_by"] == mlgoo_admin.name
    assert data["reopened_at"]


def test_reopen_submission_rejects_forbidden_source_state(
    client: TestClient,
    db_session: Session,
    mlgoo_admin: User,
    reopenable_assessment: Assessment,
):
    override_user_and_db(client, mlgoo_admin, db_session)
    reopenable_assessment.status = AssessmentStatus.DRAFT
    db_session.commit()

    response = client.post(
        f"/api/v1/mlgoo/assessments/{reopenable_assessment.id}/reopen",
        json={"reason": "Accidental submission before completion"},
    )

    assert response.status_code == 400
    assert "cannot be reopened" in response.json()["error"].lower()


def test_reopen_submission_rejects_deadline_locked_assessment(
    client: TestClient,
    db_session: Session,
    mlgoo_admin: User,
    reopenable_assessment: Assessment,
):
    override_user_and_db(client, mlgoo_admin, db_session)
    reopenable_assessment.is_locked_for_deadline = True
    reopenable_assessment.lock_reason = "deadline_expired"
    reopenable_assessment.locked_at = datetime.utcnow()
    db_session.commit()

    response = client.post(
        f"/api/v1/mlgoo/assessments/{reopenable_assessment.id}/reopen",
        json={"reason": "Accidental submission before completion"},
    )

    assert response.status_code == 400
    assert "unlock it first" in response.json()["error"].lower()


def test_reopen_submission_rejects_blank_reason(
    client: TestClient,
    db_session: Session,
    mlgoo_admin: User,
    reopenable_assessment: Assessment,
):
    override_user_and_db(client, mlgoo_admin, db_session)

    response = client.post(
        f"/api/v1/mlgoo/assessments/{reopenable_assessment.id}/reopen",
        json={"reason": "   "},
    )

    assert response.status_code == 422
    assert response.json()["error_code"] == "VALIDATION_ERROR"
    assert "reason" in response.json()["errors"][0]["field"].lower()


def test_reopen_submission_returns_404_for_missing_assessment(
    client: TestClient,
    db_session: Session,
    mlgoo_admin: User,
):
    override_user_and_db(client, mlgoo_admin, db_session)

    response = client.post(
        "/api/v1/mlgoo/assessments/999999/reopen",
        json={"reason": "Accidental submission before completion"},
    )

    assert response.status_code == 404
    assert response.json()["error_code"] == "NOT_FOUND"


def test_reopen_submission_is_forbidden_for_non_mlgoo_users(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
    reopenable_assessment: Assessment,
):
    override_user_and_db(client, blgu_user, db_session)

    response = client.post(
        f"/api/v1/mlgoo/assessments/{reopenable_assessment.id}/reopen",
        json={"reason": "Accidental submission before completion"},
    )

    assert response.status_code == 403
