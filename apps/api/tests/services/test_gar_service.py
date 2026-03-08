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

    indicator_row = next(
        i for i in gar_data.governance_areas[0].indicators if i.indicator_id == indicator.id
    )
    assert "{CY_CURRENT_YEAR}" not in indicator_row.indicator_name
    assert "CY 2026" in indicator_row.indicator_name

    assert indicator_row.checklist_items
    checklist_label = indicator_row.checklist_items[0].label
    assert "{CY_CURRENT_YEAR}" not in checklist_label
    assert "CY 2026" in checklist_label
