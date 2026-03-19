from datetime import UTC, datetime

from app.db.models.system import AssessmentYear
from app.schemas.assessment_year import AssessmentYearUpdate
from app.services.assessment_year_service import assessment_year_service


def test_update_year_persists_deadline_window_days(db_session):
    year_record = AssessmentYear(
        year=2032,
        assessment_period_start=datetime(2032, 1, 1, tzinfo=UTC),
        assessment_period_end=datetime(2032, 12, 31, tzinfo=UTC),
        submission_window_days=60,
        rework_window_days=5,
        calibration_window_days=3,
        is_active=False,
        is_published=False,
    )
    db_session.add(year_record)
    db_session.commit()

    updated = assessment_year_service.update_year(
        db_session,
        year=2032,
        data=AssessmentYearUpdate(
            submission_window_days=75,
            rework_window_days=8,
            calibration_window_days=10,
        ),
    )

    assert updated.submission_window_days == 75
    assert updated.rework_window_days == 8
    assert updated.calibration_window_days == 10

    db_session.refresh(year_record)
    assert year_record.submission_window_days == 75
    assert year_record.rework_window_days == 8
    assert year_record.calibration_window_days == 10
