"""
🧪 Classification Algorithm Tests
Test the "3+1" SGLGB compliance rule with comprehensive edge cases
"""

import pytest

from app.db.enums import AreaType, AssessmentStatus, ComplianceStatus, ValidationStatus
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from app.services.intelligence_service import intelligence_service


@pytest.fixture
def test_data(db_session):
    """Create test data: user, barangay, governance areas, indicators, and assessment"""

    # Clean up any existing data first
    db_session.query(AssessmentResponse).delete()
    db_session.query(Assessment).delete()
    db_session.query(Indicator).delete()
    db_session.query(GovernanceArea).delete()
    db_session.query(User).delete()
    db_session.query(Barangay).delete()
    db_session.commit()

    # Create barangay
    barangay = Barangay(id=1, name="Test Barangay")
    db_session.add(barangay)
    db_session.flush()

    # Create BLGU user
    user = User(
        id=1,
        email="blgu@test.com",
        name="Test BLGU User",
        hashed_password="hashed",
        role="BLGU_USER",
        barangay_id=1,
    )
    db_session.add(user)
    db_session.flush()

    # Create governance areas
    core_areas = [
        {
            "id": 1,
            "name": "Financial Administration and Sustainability",
            "code": "FI",
            "area_type": AreaType.CORE,
        },
        {"id": 2, "name": "Disaster Preparedness", "code": "DI", "area_type": AreaType.CORE},
        {"id": 3, "name": "Safety, Peace and Order", "code": "SA", "area_type": AreaType.CORE},
        {
            "id": 4,
            "name": "Social Protection and Sensitivity",
            "code": "SO",
            "area_type": AreaType.ESSENTIAL,
        },
        {
            "id": 5,
            "name": "Business-Friendliness and Competitiveness",
            "code": "BU",
            "area_type": AreaType.ESSENTIAL,
        },
        {"id": 6, "name": "Environmental Management", "code": "EN", "area_type": AreaType.ESSENTIAL},
    ]

    for area_data in core_areas:
        area = GovernanceArea(**area_data)
        db_session.add(area)

    db_session.flush()

    # Create indicators for each area
    for area_id in range(1, 7):
        for indicator_num in [1, 2]:
            indicator = Indicator(
                id=(area_id - 1) * 2 + indicator_num,
                name=f"Indicator {indicator_num}",
                description="Test indicator",
                form_schema={"type": "object"},
                governance_area_id=area_id,
            )
            db_session.add(indicator)

    db_session.flush()

    # Create assessment
    assessment = Assessment(
        id=1,
        status=AssessmentStatus.VALIDATED,
        blgu_user_id=1,
        rework_count=0,
    )
    db_session.add(assessment)
    db_session.flush()

    return {
        "db_session": db_session,
        "barangay": barangay,
        "user": user,
        "assessment": assessment,
    }


@pytest.mark.parametrize(
    "core_passed,essential_passed,expected",
    [
        # All pass → PASSED
        (3, 3, ComplianceStatus.PASSED),
        # All 3 core pass + 1 essential pass → PASSED
        (3, 1, ComplianceStatus.PASSED),
        # All 3 core pass + 2 essential pass → PASSED
        (3, 2, ComplianceStatus.PASSED),
        # All 3 core pass but 0 essential pass → FAILED
        (3, 0, ComplianceStatus.FAILED),
        # 2 core pass (should fail immediately) + all essential pass → FAILED
        (2, 3, ComplianceStatus.FAILED),
        # 1 core pass + all essential pass → FAILED
        (1, 3, ComplianceStatus.FAILED),
        # 0 core pass + all essential pass → FAILED
        (0, 3, ComplianceStatus.FAILED),
        # All fail → FAILED
        (0, 0, ComplianceStatus.FAILED),
    ],
)
def test_classification_algorithm(test_data, core_passed, essential_passed, expected):
    """
    Test the classification algorithm with various pass/fail combinations.

    This test verifies the "3+1" rule:
    - PASSED: All 3 Core areas pass AND at least 1 Essential area passes
    - FAILED: Any other combination
    """
    db_session = test_data["db_session"]
    assessment = test_data["assessment"]

    # Get all indicators
    indicators = db_session.query(Indicator).all()

    # Get core and essential indicators based on governance area
    core_indicators = [
        ind
        for ind in indicators
        if ind.governance_area.name
        in [
            "Financial Administration and Sustainability",
            "Disaster Preparedness",
            "Safety, Peace and Order",
        ]
    ]
    essential_indicators = [
        ind
        for ind in indicators
        if ind.governance_area.name
        in [
            "Social Protection and Sensitivity",
            "Business-Friendliness and Competitiveness",
            "Environmental Management",
        ]
    ]

    # Create responses: pass first N core indicators, first N essential indicators
    response_id = 1

    # Core responses
    for i, indicator in enumerate(core_indicators):
        status = ValidationStatus.PASS if i < core_passed * 2 else ValidationStatus.FAIL
        response = AssessmentResponse(
            id=response_id,
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            response_data={},
            is_completed=True,
            validation_status=status,
        )
        db_session.add(response)
        response_id += 1

    # Essential responses
    for i, indicator in enumerate(essential_indicators):
        status = ValidationStatus.PASS if i < essential_passed * 2 else ValidationStatus.FAIL
        response = AssessmentResponse(
            id=response_id,
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            response_data={},
            is_completed=True,
            validation_status=status,
        )
        db_session.add(response)
        response_id += 1

    db_session.commit()

    # Run classification
    result = intelligence_service.classify_assessment(db_session, assessment.id)

    # Verify result
    assert result["final_compliance_status"] == expected.value

    # Verify area results are stored
    assert result["area_results"] is not None

    # Verify database updated
    db_session.refresh(assessment)
    assert assessment.final_compliance_status == expected


def test_all_areas_pass(test_data):
    """Test that all 6 areas passing results in PASSED status"""
    db_session = test_data["db_session"]
    assessment = test_data["assessment"]

    indicators = db_session.query(Indicator).all()

    response_id = 1
    for indicator in indicators:
        response = AssessmentResponse(
            id=response_id,
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            response_data={},
            is_completed=True,
            validation_status=ValidationStatus.PASS,
        )
        db_session.add(response)
        response_id += 1

    db_session.commit()

    result = intelligence_service.classify_assessment(db_session, assessment.id)
    assert result["final_compliance_status"] == ComplianceStatus.PASSED.value


def test_all_areas_fail(test_data):
    """Test that all 6 areas failing results in FAILED status"""
    db_session = test_data["db_session"]
    assessment = test_data["assessment"]

    indicators = db_session.query(Indicator).all()

    response_id = 1
    for indicator in indicators:
        response = AssessmentResponse(
            id=response_id,
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            response_data={},
            is_completed=True,
            validation_status=ValidationStatus.FAIL,
        )
        db_session.add(response)
        response_id += 1

    db_session.commit()

    result = intelligence_service.classify_assessment(db_session, assessment.id)
    assert result["final_compliance_status"] == ComplianceStatus.FAILED.value


def test_zero_indicators_treated_as_failed(test_data):
    """Test that areas with zero indicators are treated as failed"""
    db_session = test_data["db_session"]
    assessment = test_data["assessment"]

    # Only create responses for some areas, not all
    indicators = (
        db_session.query(Indicator)
        .filter(
            Indicator.governance_area_id.in_([1, 2, 3])  # Only core areas
        )
        .all()
    )

    response_id = 1
    for indicator in indicators:
        response = AssessmentResponse(
            id=response_id,
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            response_data={},
            is_completed=True,
            validation_status=ValidationStatus.PASS,
        )
        db_session.add(response)
        response_id += 1

    db_session.commit()

    # Even if all 3 core areas pass, since we have 0 essential area responses,
    # this should fail
    result = intelligence_service.classify_assessment(db_session, assessment.id)
    # The 3 core areas should have no indicators, so they fail
    # Essential areas have no indicators, so they fail
    # Result should be FAILED
    assert result["final_compliance_status"] == ComplianceStatus.FAILED.value
