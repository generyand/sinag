import io
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import AreaType, AssessmentStatus, UserRole
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.system import AssessmentYear
from app.db.models.user import User


@pytest.fixture(autouse=True)
def clear_overrides(client: TestClient):
    yield
    client.app.dependency_overrides.clear()


def authenticate(client: TestClient, db_session: Session, user: User):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    def override_get_current_user():
        return user

    client.app.dependency_overrides[deps.get_db] = override_get_db
    client.app.dependency_overrides[deps.get_current_user] = override_get_current_user
    client.app.dependency_overrides[deps.get_current_active_user] = override_get_current_user
    client.app.dependency_overrides[deps.get_current_admin_user] = override_get_current_user


def get_error_message(response) -> str:
    payload = response.json()
    return payload.get("detail") or payload.get("error") or ""


@pytest.fixture
def blgu_user(db_session: Session, mock_barangay: Barangay):
    user = User(
        email="blgu.lock@test.com",
        name="BLGU Lock Tester",
        hashed_password="hashed",
        role=UserRole.BLGU_USER,
        barangay_id=mock_barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def mlgoo_user(db_session: Session):
    user = User(
        email="mlgoo.api.lock@test.com",
        name="MLGOO API Lock Tester",
        hashed_password="hashed",
        role=UserRole.MLGOO_DILG,
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
        default_unlock_grace_period_days=4,
        is_active=True,
        is_published=True,
    )
    db_session.add(year)
    db_session.commit()
    db_session.refresh(year)
    return year


@pytest.fixture
def governance_area(db_session: Session):
    area = GovernanceArea(
        name="Lock Test Area",
        code="LT",
        area_type=AreaType.CORE,
    )
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    return area


@pytest.fixture
def indicator(db_session: Session, governance_area: GovernanceArea):
    indicator = Indicator(
        name="Lock Test Indicator",
        description="Test indicator",
        governance_area_id=governance_area.id,
        indicator_code="1.1.1",
        form_schema={"fields": [{"field_id": "field_a", "type": "text"}]},
        is_active=True,
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)
    return indicator


@pytest.fixture
def locked_assessment(db_session: Session, blgu_user: User, active_assessment_year: AssessmentYear):
    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.DRAFT,
        is_locked_for_deadline=True,
        lock_reason="deadline_expired",
        locked_at=datetime.utcnow(),
        rework_count=1,
        calibration_count=1,
        mlgoo_recalibration_count=1,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


@pytest.fixture
def unlocked_assessment(
    db_session: Session, blgu_user: User, active_assessment_year: AssessmentYear
):
    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.REWORK,
        is_locked_for_deadline=False,
        grace_period_expires_at=datetime.utcnow() + timedelta(days=1),
        rework_count=1,
        calibration_count=1,
        mlgoo_recalibration_count=1,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


@pytest.fixture
def assessment_response(db_session: Session, locked_assessment: Assessment, indicator: Indicator):
    response = AssessmentResponse(
        assessment_id=locked_assessment.id,
        indicator_id=indicator.id,
        response_data={"field_a": "before"},
        is_completed=False,
        requires_rework=False,
    )
    db_session.add(response)
    db_session.commit()
    db_session.refresh(response)
    return response


def test_locked_assessment_rejects_response_updates(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
    assessment_response: AssessmentResponse,
):
    authenticate(client, db_session, blgu_user)

    response = client.put(
        f"/api/v1/assessments/responses/{assessment_response.id}",
        json={"response_data": {"field_a": "after"}},
    )

    assert response.status_code == 403
    assert "locked" in get_error_message(response).lower()


def test_locked_assessment_rejects_submission(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
    locked_assessment: Assessment,
):
    authenticate(client, db_session, blgu_user)

    response = client.post(f"/api/v1/assessments/{locked_assessment.id}/submit")

    assert response.status_code == 403
    assert "locked" in get_error_message(response).lower()


def test_locked_assessment_rejects_legacy_mov_upload(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
    assessment_response: AssessmentResponse,
):
    authenticate(client, db_session, blgu_user)

    response = client.post(
        f"/api/v1/assessments/responses/{assessment_response.id}/movs",
        json={
            "filename": "test.pdf",
            "original_filename": "test.pdf",
            "file_size": 100,
            "content_type": "application/pdf",
            "storage_path": "test/path.pdf",
            "response_id": assessment_response.id,
        },
    )

    assert response.status_code == 403
    assert "locked" in get_error_message(response).lower()


def test_locked_assessment_rejects_indicator_mov_upload(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
    locked_assessment: Assessment,
    indicator: Indicator,
):
    authenticate(client, db_session, blgu_user)

    with (
        patch("app.api.v1.movs.file_validation_service.validate_file") as mock_validate,
        patch("app.api.v1.movs.storage_service.upload_mov_file") as mock_upload,
    ):
        mock_validate.return_value = SimpleNamespace(
            success=True, error_message=None, error_code=None
        )

        response = client.post(
            f"/api/v1/movs/assessments/{locked_assessment.id}/indicators/{indicator.id}/upload",
            files={"file": ("test.pdf", io.BytesIO(b"%PDF-1.4\n%"), "application/pdf")},
        )

    assert response.status_code == 403
    assert "locked" in get_error_message(response).lower()
    mock_upload.assert_not_called()


def test_mlgoo_unlock_uses_default_grace_period_without_changing_status(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    locked_assessment: Assessment,
):
    authenticate(client, db_session, mlgoo_user)

    previous_status = locked_assessment.status
    previous_rework_count = locked_assessment.rework_count
    previous_calibration_count = locked_assessment.calibration_count
    previous_mlgoo_recalibration_count = locked_assessment.mlgoo_recalibration_count

    response = client.post(f"/api/v1/mlgoo/assessments/{locked_assessment.id}/unlock", json={})

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["status"] == previous_status.value
    assert payload["default_grace_period_days"] == 4

    db_session.refresh(locked_assessment)
    assert locked_assessment.status == previous_status
    assert locked_assessment.is_locked_for_deadline is False
    assert locked_assessment.rework_count == previous_rework_count
    assert locked_assessment.calibration_count == previous_calibration_count
    assert locked_assessment.mlgoo_recalibration_count == previous_mlgoo_recalibration_count
    assert locked_assessment.grace_period_set_by == mlgoo_user.id


def test_mlgoo_manual_lock_keeps_status_and_counters(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    unlocked_assessment: Assessment,
):
    authenticate(client, db_session, mlgoo_user)

    previous_status = unlocked_assessment.status
    previous_rework_count = unlocked_assessment.rework_count
    previous_calibration_count = unlocked_assessment.calibration_count
    previous_mlgoo_recalibration_count = unlocked_assessment.mlgoo_recalibration_count

    response = client.post(f"/api/v1/mlgoo/assessments/{unlocked_assessment.id}/lock", json={})

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["status"] == previous_status.value
    assert payload["lock_reason"] == "mlgoo_manual_lock"

    db_session.refresh(unlocked_assessment)
    assert unlocked_assessment.status == previous_status
    assert unlocked_assessment.is_locked_for_deadline is True
    assert unlocked_assessment.rework_count == previous_rework_count
    assert unlocked_assessment.calibration_count == previous_calibration_count
    assert unlocked_assessment.mlgoo_recalibration_count == previous_mlgoo_recalibration_count


def test_mlgoo_unlock_is_idempotent_when_assessment_is_already_open(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    unlocked_assessment: Assessment,
):
    authenticate(client, db_session, mlgoo_user)

    original_expiry = unlocked_assessment.grace_period_expires_at
    original_status = unlocked_assessment.status

    response = client.post(
        f"/api/v1/mlgoo/assessments/{unlocked_assessment.id}/unlock",
        json={"extend_grace_period_days": 7},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["message"] == "Assessment is already open for BLGU editing"

    db_session.refresh(unlocked_assessment)
    assert unlocked_assessment.status == original_status
    assert unlocked_assessment.grace_period_expires_at == original_expiry
    assert unlocked_assessment.is_locked_for_deadline is False


def test_mlgoo_manual_lock_is_idempotent_when_assessment_is_already_locked(
    client: TestClient,
    db_session: Session,
    mlgoo_user: User,
    locked_assessment: Assessment,
):
    authenticate(client, db_session, mlgoo_user)

    original_locked_at = locked_assessment.locked_at
    original_reason = locked_assessment.lock_reason
    original_status = locked_assessment.status

    response = client.post(f"/api/v1/mlgoo/assessments/{locked_assessment.id}/lock", json={})

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["message"] == "Assessment is already locked for BLGU editing"

    db_session.refresh(locked_assessment)
    assert locked_assessment.status == original_status
    assert locked_assessment.lock_reason == original_reason
    assert locked_assessment.locked_at == original_locked_at
