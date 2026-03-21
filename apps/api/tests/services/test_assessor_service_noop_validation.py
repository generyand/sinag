from datetime import datetime

from app.db.enums import AssessmentStatus, UserRole, ValidationStatus
from app.db.models.assessment import Assessment, AssessmentResponse, FeedbackComment
from app.db.models.barangay import Barangay
from app.db.models.governance_area import Indicator
from app.db.models.system import AssessmentYear
from app.db.models.user import User
from app.services.assessment_activity_service import assessment_activity_service
from app.services.assessor_service import assessor_service


def create_validation_context(db_session, mock_governance_area):
    assessment_year = AssessmentYear(
        year=2025,
        assessment_period_start=datetime(2025, 1, 1),
        assessment_period_end=datetime(2025, 12, 31),
        is_active=True,
        is_published=True,
    )
    db_session.add(assessment_year)
    db_session.commit()

    barangay = Barangay(name="No-op Barangay")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)

    blgu_user = User(
        email="noop-blgu@test.com",
        name="No-op BLGU User",
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        hashed_password="hashed_password",
        is_active=True,
    )
    db_session.add(blgu_user)
    db_session.commit()
    db_session.refresh(blgu_user)

    indicator = Indicator(
        name="No-op Indicator",
        governance_area_id=mock_governance_area.id,
        description="Indicator for no-op validation tests",
        form_schema={"type": "object", "properties": {}},
        indicator_code="1.1.1",
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)

    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=2025,
        status=AssessmentStatus.SUBMITTED,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=indicator.id,
        is_completed=True,
        response_data={"blgu_answer": "kept"},
    )
    db_session.add(response)
    db_session.commit()
    db_session.refresh(response)

    return response


def test_validate_assessment_response_noop_skips_writes_and_activity(
    db_session, mock_governance_area, validator_user, monkeypatch
):
    response = create_validation_context(db_session, mock_governance_area)

    response.validation_status = ValidationStatus.PASS
    response.flagged_for_calibration = True
    response.assessor_remarks = "Validator private remark"
    response.response_data = {"blgu_answer": "kept", "validator_val_item_1": True}
    db_session.add(response)
    db_session.commit()
    db_session.refresh(response)

    existing_comment = FeedbackComment(
        comment="Validator public comment",
        comment_type="validation",
        response_id=response.id,
        assessor_id=validator_user.id,
        is_internal_note=False,
    )
    db_session.add(existing_comment)
    db_session.commit()
    db_session.refresh(existing_comment)

    commit_calls = 0
    original_commit = db_session.commit

    def counting_commit():
        nonlocal commit_calls
        commit_calls += 1
        return original_commit()

    activity_calls = 0

    def counting_activity_log(*args, **kwargs):
        nonlocal activity_calls
        activity_calls += 1
        return None

    monkeypatch.setattr(db_session, "commit", counting_commit)
    monkeypatch.setattr(
        assessment_activity_service, "log_indicator_activity", counting_activity_log
    )

    result = assessor_service.validate_assessment_response(
        db=db_session,
        response_id=response.id,
        assessor=validator_user,
        validation_status=ValidationStatus.PASS,
        public_comment="Validator public comment",
        assessor_remarks="Validator private remark",
        response_data={"validator_val_item_1": True},
        flagged_for_calibration=True,
    )

    assert result["success"] is True
    assert result["message"] == "Assessment response validated successfully"
    assert result["assessment_response_id"] == response.id
    assert result["validation_status"] == ValidationStatus.PASS

    assert commit_calls == 0
    assert activity_calls == 0

    db_session.refresh(response)
    assert response.validation_status == ValidationStatus.PASS
    assert response.flagged_for_calibration is True
    assert response.assessor_remarks == "Validator private remark"
    assert response.response_data == {"blgu_answer": "kept", "validator_val_item_1": True}

    comments = (
        db_session.query(FeedbackComment)
        .filter(FeedbackComment.response_id == response.id)
        .order_by(FeedbackComment.id.asc())
        .all()
    )
    assert len(comments) == 1
    assert comments[0].id == existing_comment.id
    assert comments[0].comment == "Validator public comment"


def test_validate_assessment_response_comment_clear_is_not_treated_as_noop(
    db_session, mock_governance_area, validator_user, monkeypatch
):
    response = create_validation_context(db_session, mock_governance_area)

    response.validation_status = ValidationStatus.PASS
    response.assessor_remarks = "Validator private remark"
    db_session.add(response)
    db_session.commit()
    db_session.refresh(response)

    existing_comment = FeedbackComment(
        comment="Validator public comment",
        comment_type="validation",
        response_id=response.id,
        assessor_id=validator_user.id,
        is_internal_note=False,
    )
    db_session.add(existing_comment)
    db_session.commit()

    commit_calls = 0
    original_commit = db_session.commit

    def counting_commit():
        nonlocal commit_calls
        commit_calls += 1
        return original_commit()

    activity_calls = 0

    def counting_activity_log(*args, **kwargs):
        nonlocal activity_calls
        activity_calls += 1
        return None

    monkeypatch.setattr(db_session, "commit", counting_commit)
    monkeypatch.setattr(
        assessment_activity_service, "log_indicator_activity", counting_activity_log
    )

    assessor_service.validate_assessment_response(
        db=db_session,
        response_id=response.id,
        assessor=validator_user,
        validation_status=ValidationStatus.PASS,
        public_comment="",
        assessor_remarks="Validator private remark",
    )

    assert commit_calls == 2
    assert activity_calls == 1

    comments = (
        db_session.query(FeedbackComment).filter(FeedbackComment.response_id == response.id).all()
    )
    assert comments == []


def test_get_assessor_queue_does_not_count_false_only_checklist_data_as_reviewed(
    db_session, mock_governance_area
):
    response = create_validation_context(db_session, mock_governance_area)

    assessor = User(
        email="queue-assessor@test.com",
        name="Queue Assessor",
        role=UserRole.ASSESSOR,
        assessor_area_id=mock_governance_area.id,
        hashed_password="hashed_password",
        is_active=True,
    )
    db_session.add(assessor)
    db_session.commit()
    db_session.refresh(assessor)

    assessment = response.assessment
    assessment.submitted_at = datetime(2025, 2, 1)
    assessment.area_submission_status = {
        str(mock_governance_area.id): {
            "status": "submitted",
            "submitted_at": "2025-02-01T00:00:00Z",
        }
    }
    response.response_data = {
        "blgu_answer": "kept",
        "assessor_val_item_1": False,
        "assessor_val_item_2": "",
    }
    db_session.add_all([assessment, response])
    db_session.commit()

    queue = assessor_service.get_assessor_queue(db_session, assessor, assessment_year=2025)

    assert len(queue) == 1
    assert queue[0]["reviewed_count"] == 0
    assert queue[0]["total_count"] == 1
    assert queue[0]["area_progress"] == 0


def test_assessor_validation_round_trip_persists_and_returns_latest_values(
    db_session, mock_governance_area
):
    response = create_validation_context(db_session, mock_governance_area)

    assessor = User(
        email="roundtrip-assessor@test.com",
        name="Roundtrip Assessor",
        role=UserRole.ASSESSOR,
        assessor_area_id=mock_governance_area.id,
        hashed_password="hashed_password",
        is_active=True,
    )
    db_session.add(assessor)
    db_session.commit()
    db_session.refresh(assessor)

    response.response_data = {
        "blgu_answer": "kept",
        "assessor_val_item_1": True,
        "assessor_val_item_2": "111",
    }
    db_session.add(
        FeedbackComment(
            comment="Old assessor feedback",
            comment_type="validation",
            response_id=response.id,
            assessor_id=assessor.id,
            is_internal_note=False,
        )
    )
    db_session.commit()
    db_session.refresh(response)

    save_result = assessor_service.validate_assessment_response(
        db=db_session,
        response_id=response.id,
        assessor=assessor,
        public_comment="New assessor feedback",
        response_data={
            "assessor_val_item_1": False,
            "assessor_val_item_2": "456",
        },
    )

    assert save_result["success"] is True

    details = assessor_service.get_assessment_details_for_assessor(
        db=db_session,
        assessment_id=response.assessment_id,
        assessor=assessor,
    )

    assert details["success"] is True
    saved_response = next(
        item for item in details["assessment"]["responses"] if item["id"] == response.id
    )

    assert saved_response["response_data"]["assessor_val_item_1"] is False
    assert saved_response["response_data"]["assessor_val_item_2"] == "456"
    assert saved_response["feedback_comments"][0]["comment"] == "New assessor feedback"
