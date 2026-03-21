from datetime import UTC, datetime

import pytest

from app.db.base import Base
from app.db.enums import AreaType, AssessmentStatus, UserRole, ValidationStatus
from app.db.models import Assessment, AssessmentResponse, GovernanceArea, Indicator, User
from app.db.models.system import AssessmentYear
from app.services.assessor_service import assessor_service


@pytest.fixture(autouse=True)
def cleanup_tables_after_test(db_session):
    yield
    for table in reversed(Base.metadata.sorted_tables):
        db_session.execute(table.delete())
    db_session.commit()


def create_active_assessment_year(db_session, year: int = 2025) -> AssessmentYear:
    assessment_year = AssessmentYear(
        year=year,
        assessment_period_start=datetime(year, 1, 1, tzinfo=UTC),
        assessment_period_end=datetime(year, 12, 31, tzinfo=UTC),
        is_active=True,
        is_published=True,
    )
    db_session.add(assessment_year)
    db_session.commit()
    db_session.refresh(assessment_year)
    return assessment_year


def create_governance_area_with_indicator(
    db_session, area_id: int = 1
) -> tuple[GovernanceArea, Indicator]:
    area = GovernanceArea(
        id=area_id,
        code=f"T{area_id}",
        name=f"Governance Area {area_id}",
        area_type=AreaType.CORE,
    )
    indicator = Indicator(
        name=f"Indicator {area_id}",
        description="Test indicator",
        form_schema={"type": "object", "properties": {}},
        governance_area_id=area_id,
    )
    db_session.add(area)
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(area)
    db_session.refresh(indicator)
    return area, indicator


def create_blgu_user(db_session, suffix: str) -> User:
    user = User(
        email=f"blgu-{suffix}@example.com",
        name=f"BLGU {suffix}",
        hashed_password="hashed",
        role=UserRole.BLGU_USER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_get_analytics_includes_in_progress_validator_work_without_reviewed_by(db_session):
    create_active_assessment_year(db_session, 2025)
    _, indicator = create_governance_area_with_indicator(db_session, area_id=1)

    validator = User(
        email="validator@example.com",
        name="Validator",
        hashed_password="hashed",
        role=UserRole.VALIDATOR,
        is_active=True,
    )
    db_session.add(validator)
    db_session.commit()
    db_session.refresh(validator)

    blgu_user = create_blgu_user(db_session, "validator-flow")

    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=2025,
        status=AssessmentStatus.AWAITING_FINAL_VALIDATION,
        submitted_at=datetime(2025, 3, 1, tzinfo=UTC),
        reviewed_by=None,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=indicator.id,
        response_data={},
        is_completed=True,
        validation_status=ValidationStatus.PASS,
        updated_at=datetime(2025, 3, 2, tzinfo=UTC),
    )
    db_session.add(response)
    db_session.commit()

    analytics = assessor_service.get_analytics(db_session, validator)

    assert analytics["overview"]["total_assessed"] == 1
    assert analytics["workflow"]["total_reviewed"] == 1
    assert analytics["assessment_period"] == "SGLGB 2025"


def test_get_analytics_includes_active_assessor_area_work_in_per_area_workflow(db_session):
    create_active_assessment_year(db_session, 2025)
    _, indicator = create_governance_area_with_indicator(db_session, area_id=1)

    assessor = User(
        email="assessor@example.com",
        name="Assessor",
        hashed_password="hashed",
        role=UserRole.ASSESSOR,
        assessor_area_id=1,
        is_active=True,
    )
    db_session.add(assessor)
    db_session.commit()
    db_session.refresh(assessor)

    blgu_user = create_blgu_user(db_session, "assessor-flow")

    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=2025,
        status=AssessmentStatus.DRAFT,
        submitted_at=datetime(2025, 4, 1, tzinfo=UTC),
        area_submission_status={"1": {"status": "in_review"}},
        reviewed_by=None,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=indicator.id,
        response_data={},
        is_completed=True,
        validation_status=ValidationStatus.PASS,
        updated_at=datetime(2025, 4, 2, tzinfo=UTC),
    )
    db_session.add(response)
    db_session.commit()

    analytics = assessor_service.get_analytics(db_session, assessor)

    assert analytics["overview"]["total_assessed"] == 1
    assert analytics["workflow"]["total_reviewed"] == 1
    assert analytics["assessment_period"] == "SGLGB 2025"
