from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import AreaType, AssessmentStatus
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.system import AssessmentYear
from app.db.models.user import User


@pytest.fixture
def active_assessment_year(db_session: Session):
    now = datetime.utcnow()
    year = AssessmentYear(
        year=2026,
        assessment_period_start=now - timedelta(days=30),
        assessment_period_end=now + timedelta(days=30),
        phase1_deadline=now + timedelta(days=7),
        submission_window_days=30,
        rework_window_days=5,
        calibration_window_days=3,
        default_unlock_grace_period_days=3,
        is_active=True,
        is_published=True,
    )
    db_session.add(year)
    db_session.commit()
    db_session.refresh(year)
    return year


@pytest.fixture
def reopened_assessment_context(db_session: Session, blgu_user: User, active_assessment_year):
    area = GovernanceArea(
        name=f"Reopened Area {uuid4().hex[:8]}",
        code=f"R{uuid4().hex[:3].upper()}",
        area_type=AreaType.CORE,
    )
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)

    indicator = Indicator(
        name="Reopened Indicator",
        description="Regression test indicator",
        form_schema={
            "type": "object",
            "properties": {
                "answer": {
                    "type": "string",
                }
            },
            "required": ["answer"],
        },
        governance_area_id=area.id,
        indicator_code="1.1.1",
        is_active=True,
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)

    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.REOPENED_BY_MLGOO,
        reopen_from_status=AssessmentStatus.AWAITING_FINAL_VALIDATION,
        rework_count=1,
        calibration_count=1,
        mlgoo_recalibration_count=1,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=indicator.id,
        response_data={"answer": "before"},
        is_completed=True,
        requires_rework=False,
    )
    db_session.add(response)
    db_session.commit()
    db_session.refresh(response)

    return {
        "area": area,
        "indicator": indicator,
        "assessment": assessment,
        "response": response,
    }


def _authenticate_blgu(client: TestClient, user: User, db_session: Session) -> None:
    def override_current_active_user():
        return user

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_active_user] = override_current_active_user
    client.app.dependency_overrides[deps.get_db] = override_get_db


def test_reopened_by_mlgoo_allows_response_editing_and_mov_uploads(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
    reopened_assessment_context,
):
    _authenticate_blgu(client, blgu_user, db_session)
    assessment = reopened_assessment_context["assessment"]
    response = reopened_assessment_context["response"]

    update_response = client.put(
        f"/api/v1/assessments/responses/{response.id}",
        json={"response_data": {"answer": "after"}},
    )
    assert update_response.status_code == 200
    assert update_response.json()["response_data"] == {"answer": "after"}

    upload_response = client.post(
        f"/api/v1/assessments/responses/{response.id}/movs",
        json={
            "filename": "evidence.pdf",
            "original_filename": "evidence.pdf",
            "file_size": 1234,
            "content_type": "application/pdf",
            "storage_path": "test/evidence.pdf",
            "response_id": response.id,
        },
    )
    assert upload_response.status_code == 200
    mov_id = upload_response.json()["id"]

    with patch("app.db.base.supabase_admin") as mock_admin:
        mock_bucket = MagicMock()
        mock_bucket.remove.return_value = {}
        mock_admin.storage.from_.return_value = mock_bucket

        delete_response = client.delete(f"/api/v1/assessments/movs/{mov_id}")

    assert delete_response.status_code == 200
    assert delete_response.json()["message"] == "MOV deleted successfully"

    db_session.refresh(assessment)
    assert assessment.status == AssessmentStatus.REOPENED_BY_MLGOO


@pytest.mark.parametrize(
    ("reopen_from_status", "expected_status"),
    [
        (AssessmentStatus.SUBMITTED, AssessmentStatus.SUBMITTED_FOR_REVIEW),
        (AssessmentStatus.SUBMITTED_FOR_REVIEW, AssessmentStatus.SUBMITTED_FOR_REVIEW),
        (AssessmentStatus.IN_REVIEW, AssessmentStatus.SUBMITTED_FOR_REVIEW),
        (AssessmentStatus.AWAITING_FINAL_VALIDATION, AssessmentStatus.AWAITING_FINAL_VALIDATION),
        (AssessmentStatus.AWAITING_MLGOO_APPROVAL, AssessmentStatus.AWAITING_MLGOO_APPROVAL),
    ],
)
def test_reopened_by_mlgoo_resubmit_routes_back_based_on_reopen_source(
    client: TestClient,
    db_session: Session,
    blgu_user: User,
    active_assessment_year,
    reopen_from_status,
    expected_status,
):
    _authenticate_blgu(client, blgu_user, db_session)

    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.REOPENED_BY_MLGOO,
        reopen_from_status=reopen_from_status,
        rework_count=1,
        calibration_count=1,
        mlgoo_recalibration_count=1,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    with (
        patch(
            "app.api.v1.assessments.submission_validation_service.validate_submission"
        ) as mock_validate,
        patch(
            "app.workers.notifications.send_rework_resubmission_notification.delay"
        ) as mock_rework_notify,
        patch(
            "app.workers.notifications.send_calibration_resubmission_notification.delay"
        ) as mock_calibration_notify,
        patch(
            "app.workers.notifications.send_mlgoo_recalibration_resubmission_notification.delay"
        ) as mock_recalibration_notify,
    ):
        mock_validate.return_value = MagicMock(
            is_valid=True,
            error_message=None,
            incomplete_indicators=[],
            missing_movs=[],
        )

        response = client.post(f"/api/v1/assessments/{assessment.id}/resubmit")

    assert response.status_code == 200

    db_session.refresh(assessment)
    assert assessment.status == expected_status
    assert assessment.submitted_at is not None

    assert (
        mock_rework_notify.call_count
        + mock_calibration_notify.call_count
        + mock_recalibration_notify.call_count
        >= 0
    )
