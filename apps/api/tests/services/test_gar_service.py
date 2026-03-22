from datetime import datetime

from app.core.security import pwd_context
from app.db.enums import AreaType, AssessmentStatus, UserRole, ValidationStatus
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.barangay import Barangay
from app.db.models.governance_area import ChecklistItem, GovernanceArea, Indicator
from app.db.models.system import AssessmentYear
from app.db.models.user import User
from app.services.gar_service import gar_service


def test_get_gar_data_resolves_year_placeholders(db_session):
    """SNG-6: GAR export data must not leak raw year placeholders."""
    assessment_year_value = 2026

    assessment_year = AssessmentYear(
        year=assessment_year_value,
        assessment_period_start=datetime(2026, 1, 1),
        assessment_period_end=datetime(2026, 10, 31),
        is_active=True,
        is_published=True,
    )
    db_session.add(assessment_year)

    barangay = Barangay(name="SNG-6 Barangay")
    db_session.add(barangay)
    db_session.flush()

    blgu_user = User(
        email="sng6.blgu@example.com",
        name="SNG-6 BLGU",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        is_active=True,
    )
    db_session.add(blgu_user)
    db_session.flush()

    governance_area = GovernanceArea(
        name="SNG-6 Financial Area",
        code="FI",
        area_type=AreaType.CORE,
    )
    db_session.add(governance_area)
    db_session.flush()

    indicator = Indicator(
        name="Posted the following {CY_CURRENT_YEAR} financial documents in the BFDP board",
        description="SNG-6 indicator",
        indicator_code="1.1",
        governance_area_id=governance_area.id,
        sort_order=1,
    )
    db_session.add(indicator)
    db_session.flush()

    checklist_item = ChecklistItem(
        indicator_id=indicator.id,
        item_id="1_1_1_a",
        label="Barangay financial report covering {CY_CURRENT_YEAR}",
        item_type="checkbox",
        display_order=1,
        is_profiling_only=False,
    )
    db_session.add(checklist_item)
    db_session.flush()

    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=assessment_year_value,
        status=AssessmentStatus.COMPLETED,
    )
    db_session.add(assessment)
    db_session.flush()

    response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=indicator.id,
        validation_status=ValidationStatus.PASS,
        response_data={"validator_val_1_1_1_a": True},
        is_completed=True,
    )
    db_session.add(response)
    db_session.commit()

    gar_data = gar_service.get_gar_data(db_session, assessment.id)
    assert gar_data.cycle_year == "CY 2027 SGLGB (PY 2026)"

    indicator_row = next(
        i for i in gar_data.governance_areas[0].indicators if i.indicator_id == indicator.id
    )
    assert "{CY_CURRENT_YEAR}" not in indicator_row.indicator_name
    assert "CY 2026" in indicator_row.indicator_name

    assert indicator_row.checklist_items
    checklist_label = indicator_row.checklist_items[0].label
    assert "{CY_CURRENT_YEAR}" not in checklist_label
    assert "CY 2026" in checklist_label


def test_get_gar_data_uses_assessment_year_for_cycle_header(db_session):
    """BGAR header should derive CY/PY from the assessment's stored year."""
    prior_year = AssessmentYear(
        year=2025,
        assessment_period_start=datetime(2025, 1, 1),
        assessment_period_end=datetime(2025, 10, 31),
        is_active=False,
        is_published=True,
    )
    active_year = AssessmentYear(
        year=2026,
        assessment_period_start=datetime(2026, 1, 1),
        assessment_period_end=datetime(2026, 10, 31),
        is_active=True,
        is_published=True,
    )
    db_session.add_all([prior_year, active_year])

    barangay = Barangay(name="BGAR Active Year Barangay")
    db_session.add(barangay)
    db_session.flush()

    blgu_user = User(
        email="bgar.active.year@example.com",
        name="BGAR Active Year BLGU",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        is_active=True,
    )
    db_session.add(blgu_user)
    db_session.flush()

    governance_area = GovernanceArea(
        name="BGAR Active Year Area",
        code="FI",
        area_type=AreaType.CORE,
    )
    db_session.add(governance_area)
    db_session.flush()

    indicator = Indicator(
        name="Prior-year assessment indicator",
        description="BGAR header precedence test",
        indicator_code="1.1",
        governance_area_id=governance_area.id,
        sort_order=1,
    )
    db_session.add(indicator)
    db_session.flush()

    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=2025,
        status=AssessmentStatus.COMPLETED,
    )
    db_session.add(assessment)
    db_session.flush()

    response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=indicator.id,
        validation_status=ValidationStatus.PASS,
        response_data={},
        is_completed=True,
    )
    db_session.add(response)
    db_session.commit()

    gar_data = gar_service.get_gar_data(db_session, assessment.id)

    assert gar_data.cycle_year == "CY 2026 SGLGB (PY 2025)"


def test_get_gar_data_uses_assessment_year_without_active_year(db_session):
    """BGAR header should not depend on an active year configuration."""
    prior_year = AssessmentYear(
        year=2025,
        assessment_period_start=datetime(2025, 1, 1),
        assessment_period_end=datetime(2025, 10, 31),
        is_active=False,
        is_published=True,
    )
    db_session.add(prior_year)
    db_session.flush()

    barangay = Barangay(name="BGAR Fallback Barangay")
    db_session.add(barangay)
    db_session.flush()

    blgu_user = User(
        email="bgar.fallback@example.com",
        name="BGAR Fallback BLGU",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        is_active=True,
    )
    db_session.add(blgu_user)
    db_session.flush()

    governance_area = GovernanceArea(
        name="BGAR Fallback Area",
        code="FI",
        area_type=AreaType.CORE,
    )
    db_session.add(governance_area)
    db_session.flush()

    indicator = Indicator(
        name="Fallback assessment indicator",
        description="BGAR fallback test",
        indicator_code="1.1",
        governance_area_id=governance_area.id,
        sort_order=1,
    )
    db_session.add(indicator)
    db_session.flush()

    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=2025,
        status=AssessmentStatus.COMPLETED,
    )
    db_session.add(assessment)
    db_session.flush()

    response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=indicator.id,
        validation_status=ValidationStatus.PASS,
        response_data={},
        is_completed=True,
    )
    db_session.add(response)
    db_session.commit()

    gar_data = gar_service.get_gar_data(db_session, assessment.id)

    assert gar_data.cycle_year == "CY 2026 SGLGB (PY 2025)"


def test_get_gar_data_uses_stored_area_results_for_overall_result(db_session):
    """SNG-8: GAR should use persisted area_results as verdict source when available."""
    assessment_year_value = 2026

    assessment_year = AssessmentYear(
        year=assessment_year_value,
        assessment_period_start=datetime(2026, 1, 1),
        assessment_period_end=datetime(2026, 10, 31),
        is_active=True,
        is_published=True,
    )
    db_session.add(assessment_year)

    barangay = Barangay(name="SNG-8 Barangay")
    db_session.add(barangay)
    db_session.flush()

    blgu_user = User(
        email="sng8.blgu@example.com",
        name="SNG-8 BLGU",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        is_active=True,
    )
    db_session.add(blgu_user)
    db_session.flush()

    governance_area = GovernanceArea(
        name="SNG-8 Governance Area",
        code="FI",
        area_type=AreaType.CORE,
    )
    db_session.add(governance_area)
    db_session.flush()

    indicator = Indicator(
        name="SNG-8 Indicator",
        description="SNG-8 indicator",
        indicator_code="1.1",
        governance_area_id=governance_area.id,
        sort_order=1,
    )
    db_session.add(indicator)
    db_session.flush()

    checklist_item = ChecklistItem(
        indicator_id=indicator.id,
        item_id="1_1_1_a",
        label="SNG-8 checklist item",
        item_type="checkbox",
        display_order=1,
        is_profiling_only=False,
    )
    db_session.add(checklist_item)
    db_session.flush()

    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=assessment_year_value,
        status=AssessmentStatus.COMPLETED,
        area_results={governance_area.name: "Failed"},
    )
    db_session.add(assessment)
    db_session.flush()

    response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=indicator.id,
        validation_status=ValidationStatus.PASS,
        response_data={"validator_val_1_1_1_a": True},
        is_completed=True,
    )
    db_session.add(response)
    db_session.commit()

    gar_data = gar_service.get_gar_data(db_session, assessment.id)

    assert gar_data.governance_areas[0].overall_result == "Failed"
    assert gar_data.summary[0].result == "Failed"


def test_get_gar_data_sets_non_blank_overall_result_when_statuses_are_partial(db_session):
    """SNG-8: GAR area verdict should not be blank even with partially missing indicator statuses."""
    assessment_year_value = 2026

    assessment_year = AssessmentYear(
        year=assessment_year_value,
        assessment_period_start=datetime(2026, 1, 1),
        assessment_period_end=datetime(2026, 10, 31),
        is_active=True,
        is_published=True,
    )
    db_session.add(assessment_year)

    barangay = Barangay(name="SNG-8 Partial Barangay")
    db_session.add(barangay)
    db_session.flush()

    blgu_user = User(
        email="sng8.partial@example.com",
        name="SNG-8 Partial",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        is_active=True,
    )
    db_session.add(blgu_user)
    db_session.flush()

    governance_area = GovernanceArea(
        name="SNG-8 Partial Area",
        code="DI",
        area_type=AreaType.CORE,
    )
    db_session.add(governance_area)
    db_session.flush()

    indicator_with_status = Indicator(
        name="Indicator With Status",
        description="Has PASS status",
        indicator_code="2.1",
        governance_area_id=governance_area.id,
        sort_order=1,
    )
    indicator_without_status = Indicator(
        name="Indicator Without Status",
        description="No response row",
        indicator_code="2.2",
        governance_area_id=governance_area.id,
        sort_order=2,
    )
    db_session.add_all([indicator_with_status, indicator_without_status])
    db_session.flush()

    checklist_item = ChecklistItem(
        indicator_id=indicator_with_status.id,
        item_id="2_1_1_a",
        label="Minimum requirement",
        item_type="checkbox",
        display_order=1,
        is_profiling_only=False,
    )
    db_session.add(checklist_item)
    db_session.flush()

    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=assessment_year_value,
        status=AssessmentStatus.COMPLETED,
    )
    db_session.add(assessment)
    db_session.flush()

    response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=indicator_with_status.id,
        validation_status=ValidationStatus.PASS,
        response_data={"validator_val_2_1_1_a": True},
        is_completed=True,
    )
    db_session.add(response)
    db_session.commit()

    gar_data = gar_service.get_gar_data(db_session, assessment.id)

    assert gar_data.governance_areas[0].overall_result == "Passed"
    assert gar_data.summary[0].result == "Passed"
