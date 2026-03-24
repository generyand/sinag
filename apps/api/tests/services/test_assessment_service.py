from datetime import datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.api.v1.assessments import submit_for_calibration_review
from app.db.enums import AreaType, AssessmentStatus, ValidationStatus
from app.db.models.assessment import (
    Assessment,
    AssessmentResponse,
    FeedbackComment,
    MOVAnnotation,
    MOVFile,
)
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.system import AssessmentYear
from app.services.assessment_service import assessment_service


@pytest.fixture
def active_assessment_year(db_session):
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


def _noop(*args, **kwargs):
    return None


@pytest.fixture
def calibration_history_context(db_session, blgu_user, validator_user, active_assessment_year):
    calibrated_area = GovernanceArea(
        name=f"Calibrated Area {uuid4().hex[:8]}",
        code=f"C{uuid4().hex[:3].upper()}",
        area_type=AreaType.CORE,
    )
    preserved_area = GovernanceArea(
        name=f"Preserved Area {uuid4().hex[:8]}",
        code=f"P{uuid4().hex[:3].upper()}",
        area_type=AreaType.ESSENTIAL,
    )
    db_session.add_all([calibrated_area, preserved_area])
    db_session.commit()
    db_session.refresh(calibrated_area)
    db_session.refresh(preserved_area)

    calibrated_indicator = Indicator(
        name="Calibrated Indicator",
        description="Indicator sent for validator calibration",
        form_schema={
            "type": "object",
            "properties": {"answer": {"type": "string"}},
            "required": ["answer"],
        },
        governance_area_id=calibrated_area.id,
        indicator_code="2.2.1",
        is_active=True,
    )
    preserved_indicator = Indicator(
        name="Preserved Indicator",
        description="Indicator not part of calibration cycle",
        form_schema={
            "type": "object",
            "properties": {"answer": {"type": "string"}},
            "required": ["answer"],
        },
        governance_area_id=preserved_area.id,
        indicator_code="3.3.1",
        is_active=True,
    )
    db_session.add_all([calibrated_indicator, preserved_indicator])
    db_session.commit()
    db_session.refresh(calibrated_indicator)
    db_session.refresh(preserved_indicator)

    requested_at = datetime.utcnow() - timedelta(hours=2)
    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.REWORK,
        is_calibration_rework=True,
        calibrated_area_ids=[calibrated_area.id],
        pending_calibrations=[
            {
                "governance_area_id": calibrated_area.id,
                "validator_id": validator_user.id,
                "requested_at": requested_at.isoformat() + "Z",
                "approved": False,
            }
        ],
        calibration_requested_at=requested_at,
        submitted_at=datetime.utcnow() - timedelta(days=1),
        calibration_count=1,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    calibrated_response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=calibrated_indicator.id,
        response_data={
            "answer": "calibrated answer",
            "validator_val_checkbox": True,
            "validator_val_note": "Needs refreshed MOV",
        },
        is_completed=True,
        requires_rework=True,
        validation_status=ValidationStatus.FAIL,
        validator_review_cycle=1,
    )
    preserved_response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=preserved_indicator.id,
        response_data={
            "answer": "preserved answer",
            "validator_val_checkbox": True,
            "validator_val_note": "Already reviewed",
        },
        is_completed=True,
        requires_rework=False,
        validation_status=ValidationStatus.PASS,
        validator_review_cycle=1,
    )
    db_session.add_all([calibrated_response, preserved_response])
    db_session.commit()
    db_session.refresh(calibrated_response)
    db_session.refresh(preserved_response)

    calibrated_mov = MOVFile(
        assessment_id=assessment.id,
        indicator_id=calibrated_indicator.id,
        uploaded_by=blgu_user.id,
        file_name="calibrated.pdf",
        file_url="https://example.com/calibrated.pdf",
        file_type="application/pdf",
        file_size=1024,
        uploaded_at=requested_at + timedelta(minutes=5),
    )
    preserved_mov = MOVFile(
        assessment_id=assessment.id,
        indicator_id=preserved_indicator.id,
        uploaded_by=blgu_user.id,
        file_name="preserved.pdf",
        file_url="https://example.com/preserved.pdf",
        file_type="application/pdf",
        file_size=2048,
        uploaded_at=requested_at - timedelta(minutes=5),
    )
    db_session.add_all([calibrated_mov, preserved_mov])
    db_session.commit()
    db_session.refresh(calibrated_mov)
    db_session.refresh(preserved_mov)

    calibrated_comment = FeedbackComment(
        response_id=calibrated_response.id,
        assessor_id=validator_user.id,
        comment="Please replace the attachment for this cycle.",
        comment_type="validation",
        is_internal_note=False,
        review_cycle=1,
        created_at=requested_at + timedelta(minutes=1),
    )
    preserved_comment = FeedbackComment(
        response_id=preserved_response.id,
        assessor_id=validator_user.id,
        comment="Already validated in prior cycle.",
        comment_type="validation",
        is_internal_note=False,
        review_cycle=1,
        created_at=requested_at - timedelta(minutes=10),
    )
    calibrated_annotation = MOVAnnotation(
        mov_file_id=calibrated_mov.id,
        assessor_id=validator_user.id,
        annotation_type="pdfRect",
        page=0,
        rect={"x": 0.1, "y": 0.1, "w": 0.2, "h": 0.2},
        rects=None,
        comment="Focus on the highlighted section.",
        review_cycle=1,
    )
    preserved_annotation = MOVAnnotation(
        mov_file_id=preserved_mov.id,
        assessor_id=validator_user.id,
        annotation_type="pdfRect",
        page=0,
        rect={"x": 0.3, "y": 0.3, "w": 0.1, "h": 0.1},
        rects=None,
        comment="Previous cycle annotation should remain visible in history.",
        review_cycle=1,
    )
    db_session.add_all(
        [
            calibrated_comment,
            preserved_comment,
            calibrated_annotation,
            preserved_annotation,
        ]
    )
    db_session.commit()

    return {
        "assessment": assessment,
        "calibrated_response": calibrated_response,
        "preserved_response": preserved_response,
    }


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
def test_submit_assessment_routes_reopened_by_mlgoo_by_source_status(
    db_session,
    blgu_user,
    active_assessment_year,
    monkeypatch,
    reopen_from_status,
    expected_status,
):
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

    monkeypatch.setattr(
        "app.services.submission_validation_service.submission_validation_service.validate_submission",
        lambda *args, **kwargs: SimpleNamespace(
            is_valid=True,
            error_message=None,
            incomplete_indicators=[],
            missing_movs=[],
        ),
    )
    monkeypatch.setattr(
        "app.services.year_config_service.indicator_snapshot_service.create_snapshot_for_assessment",
        lambda *args, **kwargs: [],
    )
    monkeypatch.setattr(
        "app.workers.notifications.send_new_submission_notification.delay",
        _noop,
        raising=False,
    )
    monkeypatch.setattr(
        "app.workers.notifications.send_rework_resubmission_notification.delay",
        _noop,
        raising=False,
    )
    monkeypatch.setattr(
        "app.workers.notifications.send_calibration_resubmission_notification.delay",
        _noop,
        raising=False,
    )
    monkeypatch.setattr(
        "app.workers.notifications.send_mlgoo_recalibration_resubmission_notification.delay",
        _noop,
        raising=False,
    )

    result = assessment_service.submit_assessment(db_session, assessment.id)

    db_session.refresh(assessment)

    assert result.is_valid is True
    assert assessment.status == expected_status
    assert assessment.submitted_at is not None


def test_calibration_resubmission_preserves_non_calibrated_validator_state(
    db_session,
    blgu_user,
    calibration_history_context,
):
    assessment = calibration_history_context["assessment"]
    preserved_response = calibration_history_context["preserved_response"]

    with pytest.MonkeyPatch.context() as monkeypatch:
        monkeypatch.setattr(
            "app.workers.notifications.send_calibration_resubmission_notification.delay",
            _noop,
            raising=False,
        )
        response = submit_for_calibration_review(
            assessment_id=assessment.id,
            current_user=blgu_user,
            db=db_session,
        )

    assert response.success is True
    assert response.assessment_id == assessment.id

    db_session.refresh(assessment)
    db_session.refresh(preserved_response)

    assert assessment.status == AssessmentStatus.AWAITING_FINAL_VALIDATION
    assert assessment.is_calibration_rework is False
    assert preserved_response.validation_status == ValidationStatus.PASS
    assert preserved_response.validator_review_cycle == 1
    assert preserved_response.validator_review_history in (None, [])
    assert preserved_response.response_data["answer"] == "preserved answer"
    assert preserved_response.response_data["validator_val_checkbox"] is True
    assert preserved_response.response_data["validator_val_note"] == "Already reviewed"

    comments = (
        db_session.query(FeedbackComment)
        .filter(FeedbackComment.response_id == preserved_response.id)
        .all()
    )
    assert len(comments) == 1
    assert comments[0].review_cycle == 1

    annotations = (
        db_session.query(MOVAnnotation)
        .join(MOVFile)
        .filter(MOVFile.indicator_id == preserved_response.indicator_id)
        .all()
    )
    assert len(annotations) == 1
    assert annotations[0].review_cycle == 1


def test_calibration_resubmission_preserves_calibrated_validator_history(
    db_session,
    blgu_user,
    calibration_history_context,
):
    assessment = calibration_history_context["assessment"]
    calibrated_response = calibration_history_context["calibrated_response"]

    with pytest.MonkeyPatch.context() as monkeypatch:
        monkeypatch.setattr(
            "app.workers.notifications.send_calibration_resubmission_notification.delay",
            _noop,
            raising=False,
        )
        response = submit_for_calibration_review(
            assessment_id=assessment.id,
            current_user=blgu_user,
            db=db_session,
        )

    assert response.success is True
    assert response.assessment_id == assessment.id

    db_session.refresh(calibrated_response)

    assert calibrated_response.validation_status is None
    assert calibrated_response.requires_rework is False
    assert calibrated_response.validator_review_cycle == 2
    assert calibrated_response.response_data == {"answer": "calibrated answer"}
    assert calibrated_response.validator_review_history is not None
    assert len(calibrated_response.validator_review_history) == 1
    assert calibrated_response.validator_review_history[0]["review_cycle"] == 1
    assert calibrated_response.validator_review_history[0]["validation_status"] == "FAIL"
    assert calibrated_response.validator_review_history[0]["validator_response_data"] == {
        "validator_val_checkbox": True,
        "validator_val_note": "Needs refreshed MOV",
    }

    comments = (
        db_session.query(FeedbackComment)
        .filter(FeedbackComment.response_id == calibrated_response.id)
        .order_by(FeedbackComment.id.asc())
        .all()
    )
    assert len(comments) == 1
    assert comments[0].comment == "Please replace the attachment for this cycle."
    assert comments[0].review_cycle == 1

    annotations = (
        db_session.query(MOVAnnotation)
        .join(MOVFile)
        .filter(MOVFile.indicator_id == calibrated_response.indicator_id)
        .order_by(MOVAnnotation.id.asc())
        .all()
    )
    assert len(annotations) == 1
    assert annotations[0].comment == "Focus on the highlighted section."
    assert annotations[0].review_cycle == 1
