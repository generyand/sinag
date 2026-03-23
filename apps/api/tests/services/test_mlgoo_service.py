from datetime import UTC, datetime, timedelta

import pytest

from app.db.enums import AssessmentStatus
from app.db.models.assessment import Assessment
from app.db.models.assessment_activity import AssessmentActivity
from app.db.models.system import AssessmentYear
from app.db.models.user import User
from app.services.mlgoo_service import mlgoo_service


@pytest.fixture
def active_assessment_year(db_session):
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
def assessment(db_session, mock_blgu_user, active_assessment_year):
    now = datetime.now(UTC)
    item = Assessment(
        blgu_user_id=mock_blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.AWAITING_FINAL_VALIDATION,
        is_locked_for_deadline=False,
        locked_at=None,
        lock_reason=None,
        grace_period_expires_at=now + timedelta(days=1),
        rework_count=1,
        calibration_count=1,
        mlgoo_recalibration_count=1,
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    return item


@pytest.mark.parametrize(
    "source_status",
    [
        AssessmentStatus.SUBMITTED,
        AssessmentStatus.SUBMITTED_FOR_REVIEW,
        AssessmentStatus.IN_REVIEW,
        AssessmentStatus.AWAITING_FINAL_VALIDATION,
        AssessmentStatus.AWAITING_MLGOO_APPROVAL,
    ],
)
def test_reopen_submission_moves_allowed_status_to_reopened_by_mlgoo(
    db_session,
    mlgoo_user: User,
    assessment: Assessment,
    source_status,
):
    assessment.status = source_status
    before_locked_at = assessment.locked_at
    before_lock_reason = assessment.lock_reason
    before_is_locked_for_deadline = assessment.is_locked_for_deadline
    before_grace_period_expires_at = assessment.grace_period_expires_at
    before_rework_count = assessment.rework_count
    before_calibration_count = assessment.calibration_count
    before_mlgoo_recalibration_count = assessment.mlgoo_recalibration_count
    db_session.commit()

    updated = mlgoo_service.reopen_submission(
        db_session,
        assessment_id=assessment.id,
        mlgoo_user=mlgoo_user,
        reason="Accidental submission before completion",
    )

    db_session.refresh(assessment)

    assert updated["status"] == AssessmentStatus.REOPENED_BY_MLGOO.value
    assert assessment.status == AssessmentStatus.REOPENED_BY_MLGOO
    assert assessment.reopen_from_status == source_status
    assert assessment.reopen_reason == "Accidental submission before completion"
    assert assessment.reopened_by == mlgoo_user.id
    assert assessment.reopened_at is not None
    assert assessment.locked_at == before_locked_at
    assert assessment.lock_reason == before_lock_reason
    assert assessment.is_locked_for_deadline == before_is_locked_for_deadline
    assert assessment.grace_period_expires_at == before_grace_period_expires_at
    assert assessment.rework_count == before_rework_count
    assert assessment.calibration_count == before_calibration_count
    assert assessment.mlgoo_recalibration_count == before_mlgoo_recalibration_count

    activity = (
        db_session.query(AssessmentActivity)
        .filter(AssessmentActivity.assessment_id == assessment.id)
        .order_by(AssessmentActivity.id.desc())
        .first()
    )
    assert activity is not None
    assert activity.action == "reopened_by_mlgoo"
    assert activity.from_status == source_status.value
    assert activity.to_status == AssessmentStatus.REOPENED_BY_MLGOO.value
    assert activity.user_id == mlgoo_user.id
    assert activity.extra_data["reason"] == "Accidental submission before completion"


def test_reopen_submission_rejects_forbidden_source_state(
    db_session,
    mlgoo_user: User,
    assessment: Assessment,
):
    assessment.status = AssessmentStatus.DRAFT
    db_session.commit()

    with pytest.raises(ValueError, match="cannot be reopened"):
        mlgoo_service.reopen_submission(
            db_session,
            assessment_id=assessment.id,
            mlgoo_user=mlgoo_user,
            reason="Accidental submission before completion",
        )


def test_reopen_submission_rejects_effective_deadline_lock(
    db_session,
    mlgoo_user: User,
    assessment: Assessment,
):
    assessment.status = AssessmentStatus.SUBMITTED
    assessment.is_locked_for_deadline = True
    assessment.lock_reason = "deadline_expired"
    assessment.locked_at = datetime.utcnow()
    db_session.commit()

    with pytest.raises(ValueError, match="Unlock it first before reopening"):
        mlgoo_service.reopen_submission(
            db_session,
            assessment_id=assessment.id,
            mlgoo_user=mlgoo_user,
            reason="Accidental submission before completion",
        )

    db_session.refresh(assessment)
    assert assessment.status == AssessmentStatus.SUBMITTED


@pytest.mark.parametrize("reason", ["", "   "])
def test_reopen_submission_requires_non_empty_reason(
    db_session,
    mlgoo_user: User,
    assessment: Assessment,
    reason,
):
    assessment.status = AssessmentStatus.AWAITING_FINAL_VALIDATION
    db_session.commit()

    with pytest.raises(ValueError, match="Reason is required"):
        mlgoo_service.reopen_submission(
            db_session,
            assessment_id=assessment.id,
            mlgoo_user=mlgoo_user,
            reason=reason,
        )
