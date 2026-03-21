from datetime import UTC, datetime, timedelta

import pytest

from app.db.enums import AssessmentStatus, UserRole
from app.db.models.assessment import Assessment
from app.db.models.system import AssessmentYear
from app.db.models.user import User
from app.services.assessment_lock_service import assessment_lock_service


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
def mlgoo_user(db_session):
    user = User(
        email="mlgoo.lock@test.com",
        name="MLGOO Lock Tester",
        hashed_password="hashed",
        role=UserRole.MLGOO_DILG,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_process_expired_deadlines_locks_without_advancing_status(
    db_session, mock_blgu_user, active_assessment_year
):
    now = datetime.now(UTC)
    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.DRAFT,
        rework_count=1,
        calibration_count=1,
        mlgoo_recalibration_count=1,
    )
    db_session.add(assessment)
    db_session.commit()

    result = assessment_lock_service.process_expired_assessment_locks(db_session, now=now)

    db_session.refresh(assessment)

    assert result["deadline_locked"] == 1
    assert result["grace_relocked"] == 0
    assert assessment.status == AssessmentStatus.DRAFT
    assert assessment.is_locked_for_deadline is True
    assert assessment.lock_reason == "deadline_expired"
    assert assessment.auto_submitted_at is None
    assert assessment.rework_count == 1
    assert assessment.calibration_count == 1
    assert assessment.mlgoo_recalibration_count == 1


def test_process_expired_grace_period_relocks_without_changing_status(
    db_session, mock_blgu_user, active_assessment_year
):
    now = datetime.now(UTC)
    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.REWORK,
        is_locked_for_deadline=False,
        grace_period_expires_at=now - timedelta(minutes=5),
        rework_count=1,
        calibration_count=1,
        mlgoo_recalibration_count=1,
    )
    db_session.add(assessment)
    db_session.commit()

    result = assessment_lock_service.process_expired_assessment_locks(db_session, now=now)

    db_session.refresh(assessment)

    assert result["deadline_locked"] == 0
    assert result["grace_relocked"] == 1
    assert assessment.status == AssessmentStatus.REWORK
    assert assessment.is_locked_for_deadline is True
    assert assessment.lock_reason == "grace_period_expired"
    assert assessment.rework_count == 1
    assert assessment.calibration_count == 1
    assert assessment.mlgoo_recalibration_count == 1


def test_unlock_assessment_uses_year_default_grace_period(
    db_session, mock_blgu_user, mlgoo_user, active_assessment_year
):
    now = datetime.now(UTC)
    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.REWORK,
        is_locked_for_deadline=True,
        lock_reason="deadline_expired",
        locked_at=now - timedelta(hours=1),
        rework_count=1,
        calibration_count=1,
        mlgoo_recalibration_count=1,
    )
    db_session.add(assessment)
    db_session.commit()

    expires_at = assessment_lock_service.get_default_unlock_expiry(db_session, assessment, now=now)
    assessment_lock_service.unlock_for_blgu(
        db_session,
        assessment,
        mlgoo_user=mlgoo_user,
        grace_period_expires_at=expires_at,
        now=now,
    )
    db_session.commit()
    db_session.refresh(assessment)

    assert assessment.status == AssessmentStatus.REWORK
    assert assessment.is_locked_for_deadline is False
    assert assessment.lock_reason is None
    assert assessment.unlocked_by == mlgoo_user.id
    assert assessment.grace_period_set_by == mlgoo_user.id
    assert assessment.unlocked_at == now.replace(tzinfo=None)
    assert assessment.grace_period_expires_at == expires_at.replace(tzinfo=None)
    assert assessment.rework_count == 1
    assert assessment.calibration_count == 1
    assert assessment.mlgoo_recalibration_count == 1


def test_manual_lock_clears_active_unlock_without_changing_status(
    db_session, mock_blgu_user, mlgoo_user, active_assessment_year
):
    now = datetime.now(UTC)
    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.REWORK,
        is_locked_for_deadline=False,
        grace_period_expires_at=now + timedelta(days=2),
        rework_count=1,
        calibration_count=1,
        mlgoo_recalibration_count=1,
    )
    db_session.add(assessment)
    db_session.commit()

    assessment_lock_service.lock_for_blgu(
        db_session,
        assessment,
        reason="mlgoo_manual_lock",
        locked_at=now,
        actor=mlgoo_user,
        clear_grace_period=True,
    )
    db_session.commit()
    db_session.refresh(assessment)

    assert assessment.status == AssessmentStatus.REWORK
    assert assessment.is_locked_for_deadline is True
    assert assessment.lock_reason == "mlgoo_manual_lock"
    assert assessment.locked_at == now.replace(tzinfo=None)
    assert assessment.grace_period_expires_at is None
    assert assessment.rework_count == 1
    assert assessment.calibration_count == 1
    assert assessment.mlgoo_recalibration_count == 1
