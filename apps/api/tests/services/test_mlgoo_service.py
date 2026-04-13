from datetime import UTC, datetime, timedelta

import pytest

from app.db.enums import AreaType, AssessmentStatus
from app.db.models.assessment import (
    MOV_UPLOAD_ORIGIN_BLGU,
    MOV_UPLOAD_ORIGIN_VALIDATOR,
    Assessment,
    AssessmentResponse,
    FeedbackComment,
    MOVFile,
)
from app.db.models.assessment_activity import AssessmentActivity
from app.db.models.governance_area import GovernanceArea, Indicator
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


def test_reopen_submission_resets_area_submission_state(
    db_session,
    mlgoo_user: User,
    assessment: Assessment,
):
    assessment.status = AssessmentStatus.SUBMITTED_FOR_REVIEW
    assessment.area_submission_status = {
        "1": {
            "status": "submitted",
            "submitted_at": datetime.utcnow().isoformat(),
            "assessor_id": 101,
        },
        "2": {
            "status": "approved",
            "submitted_at": datetime.utcnow().isoformat(),
            "approved_at": datetime.utcnow().isoformat(),
            "assessor_id": 102,
        },
        "3": {
            "status": "in_review",
            "submitted_at": datetime.utcnow().isoformat(),
            "assessor_id": 103,
        },
        "4": {
            "status": "submitted",
            "submitted_at": datetime.utcnow().isoformat(),
        },
        "5": {
            "status": "submitted",
            "submitted_at": datetime.utcnow().isoformat(),
        },
        "6": {
            "status": "submitted",
            "submitted_at": datetime.utcnow().isoformat(),
        },
    }
    assessment.area_assessor_approved = {
        "1": False,
        "2": True,
        "3": False,
        "4": False,
        "5": False,
        "6": False,
    }
    db_session.commit()

    mlgoo_service.reopen_submission(
        db_session,
        assessment_id=assessment.id,
        mlgoo_user=mlgoo_user,
        reason="Needs barangay edits before review resumes",
    )

    db_session.refresh(assessment)

    assert assessment.status == AssessmentStatus.REOPENED_BY_MLGOO
    assert assessment.area_assessor_approved == {
        "1": False,
        "2": False,
        "3": False,
        "4": False,
        "5": False,
        "6": False,
    }
    assert assessment.area_submission_status is not None
    assert set(assessment.area_submission_status.keys()) == {"1", "2", "3", "4", "5", "6"}
    for area_payload in assessment.area_submission_status.values():
        assert area_payload["status"] == "draft"
        assert "submitted_at" not in area_payload
        assert "approved_at" not in area_payload
        assert "assessor_id" not in area_payload


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


def test_get_assessment_details_keeps_all_mov_files_for_indicator_with_upload_origin(
    db_session,
    mlgoo_user: User,
    mock_blgu_user: User,
    active_assessment_year: AssessmentYear,
    mock_governance_area,
):
    parent_indicator = Indicator(
        name="Parent Indicator",
        indicator_code="1",
        governance_area_id=mock_governance_area.id,
        sort_order=1,
        description="Parent indicator",
    )
    db_session.add(parent_indicator)
    db_session.flush()

    indicator = Indicator(
        name="Child Indicator",
        indicator_code="1.1",
        governance_area_id=mock_governance_area.id,
        parent_id=parent_indicator.id,
        sort_order=1,
        description="Child indicator",
    )
    db_session.add(indicator)
    db_session.flush()

    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.AWAITING_MLGOO_APPROVAL,
    )
    db_session.add(assessment)
    db_session.flush()

    response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=indicator.id,
        response_data={},
        is_completed=True,
    )
    db_session.add(response)
    db_session.flush()

    first_file = MOVFile(
        assessment_id=assessment.id,
        indicator_id=indicator.id,
        uploaded_by=mock_blgu_user.id,
        upload_origin=MOV_UPLOAD_ORIGIN_BLGU,
        file_name="barangay-proof.pdf",
        file_url="https://example.com/barangay-proof.pdf",
        file_type="application/pdf",
        file_size=100,
        uploaded_at=datetime(2026, 3, 10, tzinfo=UTC),
        field_id="proof",
    )
    second_file = MOVFile(
        assessment_id=assessment.id,
        indicator_id=indicator.id,
        uploaded_by=mlgoo_user.id,
        upload_origin=MOV_UPLOAD_ORIGIN_VALIDATOR,
        file_name="validator-proof.pdf",
        file_url="https://example.com/validator-proof.pdf",
        file_type="application/pdf",
        file_size=120,
        uploaded_at=datetime(2026, 3, 11, tzinfo=UTC),
        field_id="proof",
    )
    db_session.add_all([first_file, second_file])
    db_session.commit()

    details = mlgoo_service.get_assessment_details(
        db=db_session,
        assessment_id=assessment.id,
        mlgoo_user=mlgoo_user,
    )

    returned_indicator = details["governance_areas"][0]["indicators"][0]
    mov_files = returned_indicator["mov_files"]

    assert [mov["file_name"] for mov in mov_files] == [
        "barangay-proof.pdf",
        "validator-proof.pdf",
    ]
    assert [mov["upload_origin"] for mov in mov_files] == [
        MOV_UPLOAD_ORIGIN_BLGU,
        MOV_UPLOAD_ORIGIN_VALIDATOR,
    ]


def test_get_assessment_details_keeps_cumulative_assessor_progress_after_rework_resubmission(
    db_session,
    mlgoo_user: User,
    mock_blgu_user: User,
    active_assessment_year: AssessmentYear,
    mock_governance_area,
):
    from app.db.enums import UserRole, ValidationStatus

    assessor = User(
        email="progress-assessor@test.gov.ph",
        name="Progress Assessor",
        hashed_password="test",
        role=UserRole.ASSESSOR,
        assessor_area_id=mock_governance_area.id,
        is_active=True,
    )
    db_session.add(assessor)
    db_session.flush()

    parent = Indicator(
        name="Progress Parent",
        indicator_code="P",
        governance_area_id=mock_governance_area.id,
        sort_order=0,
        description="Parent grouping",
    )
    db_session.add(parent)
    db_session.flush()

    indicators = []
    for index in range(1, 10):
        indicator = Indicator(
            name=f"Progress Indicator {index}",
            indicator_code=f"1.{index}",
            governance_area_id=mock_governance_area.id,
            parent_id=parent.id,
            sort_order=index,
            description=f"Indicator {index}",
        )
        db_session.add(indicator)
        indicators.append(indicator)
    db_session.flush()

    rework_requested_at = datetime(2026, 4, 10, 8, 0, 0)
    resubmitted_at = datetime(2026, 4, 11, 9, 0, 0)
    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.SUBMITTED_FOR_REVIEW,
        rework_count=1,
        rework_requested_at=rework_requested_at,
        area_submission_status={
            str(mock_governance_area.id): {
                "status": "submitted",
                "assessor_id": assessor.id,
                "submitted_at": resubmitted_at.isoformat(),
                "resubmitted_after_rework": True,
            }
        },
        area_assessor_approved={str(mock_governance_area.id): False},
    )
    db_session.add(assessment)
    db_session.flush()

    for index, indicator in enumerate(indicators, start=1):
        is_rework_indicator = index == 9
        reviewed_at = resubmitted_at - timedelta(hours=2)
        response = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            response_data={"assessor_val_status": "complete"},
            is_completed=not is_rework_indicator,
            requires_rework=is_rework_indicator,
            validation_status=ValidationStatus.PASS if not is_rework_indicator else None,
            updated_at=reviewed_at,
        )
        db_session.add(response)

    db_session.commit()

    details = mlgoo_service.get_assessment_details(
        db=db_session,
        assessment_id=assessment.id,
        mlgoo_user=mlgoo_user,
    )

    [area_progress] = [
        area
        for area in details["assessment_progress"]["governance_areas"]
        if area["governance_area_id"] == mock_governance_area.id
    ]

    assert area_progress["total_indicators"] == 9
    assert area_progress["assessor"]["reviewed_indicators"] == 8
    assert area_progress["assessor"]["total_indicators"] == 9
    assert area_progress["assessor"]["progress_percent"] == 89
    assert area_progress["assessor"]["status"] == "in_progress"


def test_get_assessment_details_preserves_sent_for_rework_status_with_counted_progress(
    db_session,
    mlgoo_user: User,
    mock_blgu_user: User,
    active_assessment_year: AssessmentYear,
    mock_governance_area,
):
    from app.db.enums import ValidationStatus

    parent = Indicator(
        name="Rework Parent",
        indicator_code="RW",
        governance_area_id=mock_governance_area.id,
        sort_order=0,
        description="Parent grouping",
    )
    db_session.add(parent)
    db_session.flush()

    reviewed_indicator = Indicator(
        name="Reviewed Indicator",
        indicator_code="1.1",
        governance_area_id=mock_governance_area.id,
        parent_id=parent.id,
        sort_order=1,
        description="Reviewed indicator",
    )
    rework_indicator = Indicator(
        name="Rework Indicator",
        indicator_code="1.2",
        governance_area_id=mock_governance_area.id,
        parent_id=parent.id,
        sort_order=2,
        description="Rework indicator",
    )
    db_session.add_all([reviewed_indicator, rework_indicator])
    db_session.flush()

    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.SUBMITTED_FOR_REVIEW,
        rework_count=1,
        area_submission_status={str(mock_governance_area.id): {"status": "rework"}},
        area_assessor_approved={str(mock_governance_area.id): False},
    )
    db_session.add(assessment)
    db_session.flush()

    db_session.add_all(
        [
            AssessmentResponse(
                assessment_id=assessment.id,
                indicator_id=reviewed_indicator.id,
                response_data={"assessor_val_status": "complete"},
                is_completed=True,
                validation_status=ValidationStatus.PASS,
                updated_at=datetime(2026, 4, 10, 8, 0, 0),
            ),
            AssessmentResponse(
                assessment_id=assessment.id,
                indicator_id=rework_indicator.id,
                response_data={"assessor_val_status": "complete"},
                is_completed=False,
                requires_rework=True,
                updated_at=datetime(2026, 4, 10, 8, 0, 0),
            ),
        ]
    )
    db_session.commit()

    details = mlgoo_service.get_assessment_details(
        db=db_session,
        assessment_id=assessment.id,
        mlgoo_user=mlgoo_user,
    )

    [area_progress] = [
        area
        for area in details["assessment_progress"]["governance_areas"]
        if area["governance_area_id"] == mock_governance_area.id
    ]

    assert area_progress["assessor"]["status"] == "sent_for_rework"
    assert area_progress["assessor"]["reviewed_indicators"] == 1
    assert area_progress["assessor"]["total_indicators"] == 2
    assert area_progress["assessor"]["progress_percent"] == 50


def test_get_assessment_details_supports_legacy_rework_resubmission_flag(
    db_session,
    mlgoo_user: User,
    mock_blgu_user: User,
    active_assessment_year: AssessmentYear,
    mock_governance_area,
):
    parent = Indicator(
        name="Legacy Parent",
        indicator_code="LG",
        governance_area_id=mock_governance_area.id,
        sort_order=0,
        description="Parent grouping",
    )
    db_session.add(parent)
    db_session.flush()

    indicator = Indicator(
        name="Legacy Rework Indicator",
        indicator_code="1.1",
        governance_area_id=mock_governance_area.id,
        parent_id=parent.id,
        sort_order=1,
        description="Legacy rework indicator",
    )
    db_session.add(indicator)
    db_session.flush()

    resubmitted_at = datetime(2026, 4, 11, 9, 0, 0)
    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.SUBMITTED_FOR_REVIEW,
        rework_count=1,
        area_submission_status={
            str(mock_governance_area.id): {
                "status": "submitted",
                "submitted_at": resubmitted_at.isoformat(),
                "is_resubmission": True,
            }
        },
        area_assessor_approved={str(mock_governance_area.id): False},
    )
    db_session.add(assessment)
    db_session.flush()

    db_session.add(
        AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            response_data={"assessor_val_status": "complete"},
            is_completed=True,
            requires_rework=True,
            updated_at=resubmitted_at + timedelta(minutes=1),
        )
    )
    db_session.commit()

    details = mlgoo_service.get_assessment_details(
        db=db_session,
        assessment_id=assessment.id,
        mlgoo_user=mlgoo_user,
    )

    [area_progress] = [
        area
        for area in details["assessment_progress"]["governance_areas"]
        if area["governance_area_id"] == mock_governance_area.id
    ]

    assert area_progress["assessor"]["reviewed_indicators"] == 1
    assert area_progress["assessor"]["progress_percent"] == 100
    assert area_progress["assessor"]["status"] == "reviewed"


def test_get_assessment_details_keeps_mlgoo_recalibration_target_pending_until_later_validation(
    db_session,
    mlgoo_user: User,
    mock_blgu_user: User,
    active_assessment_year: AssessmentYear,
    mock_governance_area,
):
    from app.db.enums import ValidationStatus

    parent = Indicator(
        name="Recalibration Parent",
        indicator_code="R",
        governance_area_id=mock_governance_area.id,
        sort_order=0,
        description="Parent grouping",
    )
    db_session.add(parent)
    db_session.flush()

    reviewed_indicator = Indicator(
        name="Reviewed Indicator",
        indicator_code="1.1",
        governance_area_id=mock_governance_area.id,
        parent_id=parent.id,
        sort_order=1,
        description="Reviewed indicator",
    )
    recalibration_indicator = Indicator(
        name="Recalibration Indicator",
        indicator_code="1.2",
        governance_area_id=mock_governance_area.id,
        parent_id=parent.id,
        sort_order=2,
        description="Recalibration indicator",
    )
    db_session.add_all([reviewed_indicator, recalibration_indicator])
    db_session.flush()

    recalibration_submitted_at = datetime(2026, 4, 11, 9, 0, 0)
    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.AWAITING_MLGOO_APPROVAL,
        is_mlgoo_recalibration=True,
        mlgoo_recalibration_indicator_ids=[recalibration_indicator.id],
        mlgoo_recalibration_requested_at=datetime(2026, 4, 10, 8, 0, 0),
        mlgoo_recalibration_submitted_at=recalibration_submitted_at,
    )
    db_session.add(assessment)
    db_session.flush()

    db_session.add_all(
        [
            AssessmentResponse(
                assessment_id=assessment.id,
                indicator_id=reviewed_indicator.id,
                response_data={"assessor_val_status": "complete"},
                is_completed=True,
                validation_status=ValidationStatus.PASS,
                updated_at=recalibration_submitted_at - timedelta(hours=2),
            ),
            AssessmentResponse(
                assessment_id=assessment.id,
                indicator_id=recalibration_indicator.id,
                response_data={"assessor_val_status": "complete"},
                is_completed=True,
                validation_status=ValidationStatus.PASS,
                updated_at=recalibration_submitted_at,
            ),
        ]
    )
    db_session.commit()

    details = mlgoo_service.get_assessment_details(
        db=db_session,
        assessment_id=assessment.id,
        mlgoo_user=mlgoo_user,
    )

    [area_progress] = [
        area
        for area in details["assessment_progress"]["governance_areas"]
        if area["governance_area_id"] == mock_governance_area.id
    ]
    [target_indicator] = [
        indicator
        for area in details["governance_areas"]
        for indicator in area["indicators"]
        if indicator["indicator_id"] == recalibration_indicator.id
    ]

    assert area_progress["validator"]["reviewed_indicators"] == 1
    assert area_progress["validator"]["total_indicators"] == 2
    assert area_progress["validator"]["progress_percent"] == 50
    assert target_indicator["validator_reviewed"] is False


def test_get_assessment_details_summarizes_all_rework_and_calibration_requesters(
    db_session,
    mlgoo_user: User,
    mock_blgu_user: User,
    active_assessment_year: AssessmentYear,
):
    from app.db.enums import UserRole

    financial_area = GovernanceArea(
        id=101,
        name="Financial Administration and Sustainability",
        code="FI",
        area_type=AreaType.CORE,
    )
    social_area = GovernanceArea(
        id=102,
        name="Social Protection and Sensitivity",
        code="SP",
        area_type=AreaType.CORE,
    )
    peace_area = GovernanceArea(
        id=103,
        name="Peace and Order",
        code="PO",
        area_type=AreaType.ESSENTIAL,
    )
    db_session.add_all([financial_area, social_area, peace_area])
    db_session.flush()

    financial_assessor = User(
        email="financial.assessor@test.gov.ph",
        name="Assessor - Financial Admin",
        hashed_password="test",
        role=UserRole.ASSESSOR,
        assessor_area_id=financial_area.id,
        is_active=True,
    )
    social_assessor = User(
        email="social.assessor@test.gov.ph",
        name="Assessor - Social Protection",
        hashed_password="test",
        role=UserRole.ASSESSOR,
        assessor_area_id=social_area.id,
        is_active=True,
    )
    validator = User(
        email="validator.one@test.gov.ph",
        name="Validator 1",
        hashed_password="test",
        role=UserRole.VALIDATOR,
        is_active=True,
    )
    db_session.add_all([financial_assessor, social_assessor, validator])
    db_session.flush()

    indicators = [
        Indicator(
            name="Financial Indicator",
            indicator_code="1.6.1",
            governance_area_id=financial_area.id,
            sort_order=1,
            description="Financial",
        ),
        Indicator(
            name="Social Indicator",
            indicator_code="4.5.5",
            governance_area_id=social_area.id,
            sort_order=1,
            description="Social",
        ),
        Indicator(
            name="Validator Indicator",
            indicator_code="5.1.2",
            governance_area_id=peace_area.id,
            sort_order=1,
            description="Validator",
        ),
    ]
    db_session.add_all(indicators)
    db_session.flush()

    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        assessment_year=active_assessment_year.year,
        status=AssessmentStatus.REWORK,
        rework_count=1,
        rework_requested_at=datetime(2026, 4, 11, 9, 30, 0),
        calibration_requested_at=datetime(2026, 4, 11, 13, 30, 0),
        is_calibration_rework=True,
        calibration_validator_id=validator.id,
        area_submission_status={
            str(financial_area.id): {
                "status": "rework",
                "rework_requested_at": "2026-04-11T09:30:00",
                "assessor_id": financial_assessor.id,
                "rework_comments": "Financial documents need revision.",
                "rework_used": True,
            },
            str(social_area.id): {
                "status": "rework",
                "rework_requested_at": "2026-04-11T10:15:00",
                "assessor_id": social_assessor.id,
                "rework_comments": "Social protection evidence needs updates.",
                "rework_used": True,
            },
        },
        pending_calibrations=[
            {
                "validator_id": validator.id,
                "governance_area_id": peace_area.id,
                "requested_at": "2026-04-11T13:30:00+00:00",
                "comments": "Validator requires more supporting evidence.",
                "approved": False,
            }
        ],
    )
    db_session.add(assessment)
    db_session.flush()

    responses = [
        AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=indicators[0].id,
            requires_rework=True,
            is_completed=False,
            response_data={"answer": "financial"},
        ),
        AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=indicators[1].id,
            requires_rework=True,
            is_completed=False,
            response_data={"answer": "social"},
        ),
        AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=indicators[2].id,
            requires_rework=True,
            is_completed=False,
            response_data={"answer": "validator"},
        ),
    ]
    db_session.add_all(responses)
    db_session.flush()

    db_session.add_all(
        [
            FeedbackComment(
                response_id=responses[0].id,
                assessor_id=financial_assessor.id,
                comment="Please update the supporting resolution.",
                comment_type="validation",
            ),
            FeedbackComment(
                response_id=responses[1].id,
                assessor_id=social_assessor.id,
                comment="Missing supporting social protection documents.",
                comment_type="validation",
            ),
        ]
    )
    db_session.commit()

    details = mlgoo_service.get_assessment_details(
        db=db_session,
        assessment_id=assessment.id,
        mlgoo_user=mlgoo_user,
    )

    summary = details["rework_calibration_summary"]
    requester_names = [item["requester_name"] for item in summary["requesters"]]
    indicator_statuses = {
        item["indicator_code"]: item["status"] for item in summary["rework_indicators"]
    }

    assert requester_names == [
        "Assessor - Financial Admin",
        "Assessor - Social Protection",
        "Validator 1",
    ]
    assert [item["request_type"] for item in summary["requesters"]] == [
        "rework",
        "rework",
        "calibration",
    ]
    assert [item["requested_at"] for item in summary["requesters"]] == [
        "2026-04-11T09:30:00Z",
        "2026-04-11T10:15:00Z",
        "2026-04-11T13:30:00Z",
    ]
    assert len(summary["rework_indicators"]) == 3
    assert indicator_statuses == {
        "1.6.1": "rework",
        "4.5.5": "rework",
        "5.1.2": "calibration",
    }
