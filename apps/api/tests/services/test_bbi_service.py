"""
Tests for BBI service layer (app/services/bbi_service.py)
"""

from typing import List

import pytest
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.db.models.bbi import BBI, BBIResult
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.enums import BBIStatus, ValidationStatus, AssessmentStatus
from app.services.bbi_service import bbi_service


# ====================================================================
# Test Fixtures
# ====================================================================


@pytest.fixture
def sample_governance_area(db_session: Session):
    """Create a sample governance area for testing"""
    from app.db.enums import AreaType

    area = GovernanceArea(
        name="Test Governance Area",
        area_type=AreaType.CORE,
    )
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    return area


@pytest.fixture
def sample_indicators(db_session: Session, sample_governance_area: GovernanceArea):
    """Create sample indicators for testing"""
    indicators = []
    for i in range(1, 4):
        indicator = Indicator(
            name=f"Test Indicator {i}",
            description=f"Description for indicator {i}",
            governance_area_id=sample_governance_area.id,
        )
        db_session.add(indicator)
        indicators.append(indicator)
    db_session.commit()
    for indicator in indicators:
        db_session.refresh(indicator)
    return indicators


@pytest.fixture
def sample_bbi(db_session: Session, sample_governance_area: GovernanceArea):
    """Create a sample BBI for testing"""
    bbi = BBI(
        name="Test BBI",
        abbreviation="TBBI",
        description="A test BBI for unit testing",
        governance_area_id=sample_governance_area.id,
        mapping_rules={
            "operator": "AND",
            "conditions": [
                {"indicator_id": 1, "required_status": "Pass"},
                {"indicator_id": 2, "required_status": "Pass"},
            ],
        },
        is_active=True,
    )
    db_session.add(bbi)
    db_session.commit()
    db_session.refresh(bbi)
    return bbi


@pytest.fixture
def sample_assessment(db_session: Session, mock_blgu_user):
    """Create a sample assessment for testing"""
    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        status=AssessmentStatus.VALIDATED,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


@pytest.fixture
def sample_assessment_responses(
    db_session: Session, sample_assessment: Assessment, sample_indicators
):
    """Create sample assessment responses for testing"""
    responses = []
    statuses = [ValidationStatus.PASS, ValidationStatus.PASS, ValidationStatus.FAIL]
    for indicator, status in zip(sample_indicators, statuses):
        response = AssessmentResponse(
            assessment_id=sample_assessment.id,
            indicator_id=indicator.id,
            validation_status=status,
        )
        db_session.add(response)
        responses.append(response)
    db_session.commit()
    for response in responses:
        db_session.refresh(response)
    return responses


# ====================================================================
# CRUD Operation Tests
# ====================================================================


def test_create_bbi_success(db_session: Session, sample_governance_area: GovernanceArea):
    """Test successful BBI creation"""
    bbi_data = {
        "name": "Health Workers Association",
        "abbreviation": "HWA",
        "description": "Association of health workers",
        "governance_area_id": sample_governance_area.id,
    }

    result = bbi_service.create_bbi(db_session, bbi_data)

    assert result is not None
    assert result.name == "Health Workers Association"
    assert result.abbreviation == "HWA"
    assert result.governance_area_id == sample_governance_area.id
    assert result.is_active is True


def test_create_bbi_invalid_governance_area(db_session: Session):
    """Test BBI creation with invalid governance area"""
    bbi_data = {
        "name": "Test BBI",
        "abbreviation": "TB",
        "governance_area_id": 99999,  # Non-existent
    }

    with pytest.raises(HTTPException) as exc_info:
        bbi_service.create_bbi(db_session, bbi_data)

    assert exc_info.value.status_code == 404
    assert "not found" in str(exc_info.value.detail).lower()


def test_create_bbi_duplicate_name(
    db_session: Session, sample_bbi: BBI, sample_governance_area: GovernanceArea
):
    """Test BBI creation with duplicate name in same governance area"""
    bbi_data = {
        "name": sample_bbi.name,  # Duplicate name
        "abbreviation": "DIFFERENT",
        "governance_area_id": sample_governance_area.id,
    }

    with pytest.raises(HTTPException) as exc_info:
        bbi_service.create_bbi(db_session, bbi_data)

    assert exc_info.value.status_code == 400
    assert "already exists" in str(exc_info.value.detail).lower()


def test_create_bbi_duplicate_abbreviation(
    db_session: Session, sample_bbi: BBI, sample_governance_area: GovernanceArea
):
    """Test BBI creation with duplicate abbreviation in same governance area"""
    bbi_data = {
        "name": "Different Name",
        "abbreviation": sample_bbi.abbreviation,  # Duplicate abbreviation
        "governance_area_id": sample_governance_area.id,
    }

    with pytest.raises(HTTPException) as exc_info:
        bbi_service.create_bbi(db_session, bbi_data)

    assert exc_info.value.status_code == 400
    assert "already exists" in str(exc_info.value.detail).lower()


def test_get_bbi_success(db_session: Session, sample_bbi: BBI):
    """Test getting BBI by ID"""
    result = bbi_service.get_bbi(db_session, sample_bbi.id)

    assert result is not None
    assert result.id == sample_bbi.id
    assert result.name == sample_bbi.name


def test_get_bbi_not_found(db_session: Session):
    """Test getting non-existent BBI returns None"""
    result = bbi_service.get_bbi(db_session, 99999)

    assert result is None


def test_list_bbis_all(db_session: Session, sample_bbi: BBI):
    """Test listing all BBIs"""
    result = bbi_service.list_bbis(db_session)

    assert len(result) >= 1
    assert any(b.id == sample_bbi.id for b in result)


def test_list_bbis_filter_by_governance_area(
    db_session: Session, sample_bbi: BBI, sample_governance_area: GovernanceArea
):
    """Test listing BBIs filtered by governance area"""
    result = bbi_service.list_bbis(
        db_session, governance_area_id=sample_governance_area.id
    )

    assert len(result) >= 1
    assert all(b.governance_area_id == sample_governance_area.id for b in result)


def test_list_bbis_filter_by_active_status(db_session: Session, sample_bbi: BBI):
    """Test listing BBIs filtered by active status"""
    result = bbi_service.list_bbis(db_session, is_active=True)

    assert len(result) >= 1
    assert all(b.is_active is True for b in result)


def test_list_bbis_pagination(db_session: Session, sample_governance_area: GovernanceArea):
    """Test BBI list pagination"""
    # Create multiple BBIs
    for i in range(5):
        bbi = BBI(
            name=f"BBI {i}",
            abbreviation=f"B{i}",
            governance_area_id=sample_governance_area.id,
        )
        db_session.add(bbi)
    db_session.commit()

    # Test pagination
    result_page1 = bbi_service.list_bbis(db_session, skip=0, limit=2)
    result_page2 = bbi_service.list_bbis(db_session, skip=2, limit=2)

    assert len(result_page1) == 2
    assert len(result_page2) == 2
    assert result_page1[0].id != result_page2[0].id


def test_update_bbi_success(db_session: Session, sample_bbi: BBI):
    """Test successful BBI update"""
    update_data = {
        "name": "Updated BBI Name",
        "description": "Updated description",
    }

    result = bbi_service.update_bbi(db_session, sample_bbi.id, update_data)

    assert result.name == "Updated BBI Name"
    assert result.description == "Updated description"
    assert result.abbreviation == sample_bbi.abbreviation  # Unchanged


def test_update_bbi_not_found(db_session: Session):
    """Test updating non-existent BBI raises exception"""
    update_data = {"name": "New Name"}

    with pytest.raises(HTTPException) as exc_info:
        bbi_service.update_bbi(db_session, 99999, update_data)

    assert exc_info.value.status_code == 404


def test_update_bbi_duplicate_name(
    db_session: Session, sample_governance_area: GovernanceArea
):
    """Test updating BBI with duplicate name raises exception"""
    # Create two BBIs
    bbi1 = BBI(
        name="BBI One",
        abbreviation="B1",
        governance_area_id=sample_governance_area.id,
    )
    bbi2 = BBI(
        name="BBI Two",
        abbreviation="B2",
        governance_area_id=sample_governance_area.id,
    )
    db_session.add_all([bbi1, bbi2])
    db_session.commit()

    # Try to update bbi2 to have same name as bbi1
    with pytest.raises(HTTPException) as exc_info:
        bbi_service.update_bbi(db_session, bbi2.id, {"name": "BBI One"})

    assert exc_info.value.status_code == 400
    assert "already exists" in str(exc_info.value.detail).lower()


def test_update_bbi_mapping_rules(db_session: Session, sample_bbi: BBI):
    """Test updating BBI mapping rules"""
    new_mapping_rules = {
        "operator": "OR",
        "conditions": [
            {"indicator_id": 1, "required_status": "Pass"},
            {"indicator_id": 3, "required_status": "Fail"},
        ],
    }

    result = bbi_service.update_bbi(
        db_session, sample_bbi.id, {"mapping_rules": new_mapping_rules}
    )

    assert result.mapping_rules == new_mapping_rules
    assert result.mapping_rules["operator"] == "OR"
    assert len(result.mapping_rules["conditions"]) == 2


def test_update_bbi_invalid_mapping_rules(db_session: Session, sample_bbi: BBI):
    """Test updating BBI with invalid mapping rules"""
    with pytest.raises(HTTPException) as exc_info:
        bbi_service.update_bbi(
            db_session, sample_bbi.id, {"mapping_rules": "not a dict"}
        )

    assert exc_info.value.status_code == 400
    assert "valid JSON object" in str(exc_info.value.detail)


def test_deactivate_bbi_success(db_session: Session, sample_bbi: BBI):
    """Test successful BBI deactivation"""
    assert sample_bbi.is_active is True

    result = bbi_service.deactivate_bbi(db_session, sample_bbi.id)

    assert result.is_active is False
    assert result.id == sample_bbi.id


def test_deactivate_bbi_not_found(db_session: Session):
    """Test deactivating non-existent BBI raises exception"""
    with pytest.raises(HTTPException) as exc_info:
        bbi_service.deactivate_bbi(db_session, 99999)

    assert exc_info.value.status_code == 404


# ====================================================================
# BBI Status Calculation Tests
# ====================================================================


def test_calculate_bbi_status_functional_and_operator(
    db_session: Session,
    sample_bbi: BBI,
    sample_assessment: Assessment,
    sample_indicators,
):
    """Test BBI status calculation with AND operator (all conditions pass)"""
    # Create responses where indicators 1 and 2 pass (matching mapping rules)
    for i, indicator in enumerate(sample_indicators[:2]):
        response = AssessmentResponse(
            assessment_id=sample_assessment.id,
            indicator_id=indicator.id,
            validation_status=ValidationStatus.PASS,
        )
        db_session.add(response)
    db_session.commit()

    result = bbi_service.calculate_bbi_status(
        db_session, sample_bbi.id, sample_assessment.id
    )

    assert result == BBIStatus.FUNCTIONAL


def test_calculate_bbi_status_non_functional_and_operator(
    db_session: Session,
    sample_bbi: BBI,
    sample_assessment: Assessment,
    sample_indicators,
):
    """Test BBI status calculation with AND operator (one condition fails)"""
    # Create responses where indicator 1 passes but indicator 2 fails
    response1 = AssessmentResponse(
        assessment_id=sample_assessment.id,
        indicator_id=sample_indicators[0].id,
        validation_status=ValidationStatus.PASS,
    )
    response2 = AssessmentResponse(
        assessment_id=sample_assessment.id,
        indicator_id=sample_indicators[1].id,
        validation_status=ValidationStatus.FAIL,
    )
    db_session.add_all([response1, response2])
    db_session.commit()

    result = bbi_service.calculate_bbi_status(
        db_session, sample_bbi.id, sample_assessment.id
    )

    assert result == BBIStatus.NON_FUNCTIONAL


def test_calculate_bbi_status_or_operator(
    db_session: Session,
    sample_governance_area: GovernanceArea,
    sample_assessment: Assessment,
    sample_indicators,
):
    """Test BBI status calculation with OR operator"""
    # Create BBI with OR operator
    bbi = BBI(
        name="OR Test BBI",
        abbreviation="ORTBBI",
        governance_area_id=sample_governance_area.id,
        mapping_rules={
            "operator": "OR",
            "conditions": [
                {"indicator_id": sample_indicators[0].id, "required_status": "Pass"},
                {"indicator_id": sample_indicators[1].id, "required_status": "Pass"},
            ],
        },
    )
    db_session.add(bbi)
    db_session.commit()
    db_session.refresh(bbi)

    # Only first indicator passes
    response = AssessmentResponse(
        assessment_id=sample_assessment.id,
        indicator_id=sample_indicators[0].id,
        validation_status=ValidationStatus.PASS,
    )
    db_session.add(response)
    db_session.commit()

    result = bbi_service.calculate_bbi_status(db_session, bbi.id, sample_assessment.id)

    assert result == BBIStatus.FUNCTIONAL


def test_calculate_bbi_status_no_mapping_rules(
    db_session: Session,
    sample_governance_area: GovernanceArea,
    sample_assessment: Assessment,
):
    """Test BBI status defaults to NON_FUNCTIONAL when no mapping rules"""
    bbi = BBI(
        name="No Rules BBI",
        abbreviation="NRBBI",
        governance_area_id=sample_governance_area.id,
        mapping_rules=None,
    )
    db_session.add(bbi)
    db_session.commit()
    db_session.refresh(bbi)

    result = bbi_service.calculate_bbi_status(db_session, bbi.id, sample_assessment.id)

    assert result == BBIStatus.NON_FUNCTIONAL


def test_calculate_bbi_status_bbi_not_found(db_session: Session, sample_assessment: Assessment):
    """Test calculating status for non-existent BBI raises exception"""
    with pytest.raises(HTTPException) as exc_info:
        bbi_service.calculate_bbi_status(db_session, 99999, sample_assessment.id)

    assert exc_info.value.status_code == 404


def test_calculate_bbi_status_assessment_not_found(db_session: Session, sample_bbi: BBI):
    """Test calculating status for non-existent assessment raises exception"""
    with pytest.raises(HTTPException) as exc_info:
        bbi_service.calculate_bbi_status(db_session, sample_bbi.id, 99999)

    assert exc_info.value.status_code == 404


def test_calculate_all_bbi_statuses(
    db_session: Session,
    sample_governance_area: GovernanceArea,
    sample_assessment: Assessment,
    sample_indicators,
):
    """Test calculating all BBI statuses for an assessment"""
    # Create multiple BBIs
    bbi1 = BBI(
        name="BBI One",
        abbreviation="B1",
        governance_area_id=sample_governance_area.id,
        mapping_rules={
            "operator": "AND",
            "conditions": [
                {"indicator_id": sample_indicators[0].id, "required_status": "Pass"}
            ],
        },
        is_active=True,
    )
    bbi2 = BBI(
        name="BBI Two",
        abbreviation="B2",
        governance_area_id=sample_governance_area.id,
        mapping_rules={
            "operator": "AND",
            "conditions": [
                {"indicator_id": sample_indicators[1].id, "required_status": "Pass"}
            ],
        },
        is_active=True,
    )
    db_session.add_all([bbi1, bbi2])
    db_session.commit()

    # Add assessment responses
    response1 = AssessmentResponse(
        assessment_id=sample_assessment.id,
        indicator_id=sample_indicators[0].id,
        validation_status=ValidationStatus.PASS,
    )
    response2 = AssessmentResponse(
        assessment_id=sample_assessment.id,
        indicator_id=sample_indicators[1].id,
        validation_status=ValidationStatus.FAIL,
    )
    db_session.add_all([response1, response2])
    db_session.commit()

    results = bbi_service.calculate_all_bbi_statuses(db_session, sample_assessment.id)

    assert len(results) >= 2
    # BBI1 should be functional (indicator 0 passes)
    # BBI2 should be non-functional (indicator 1 fails)
    assert any(r.bbi_id == bbi1.id and r.status == BBIStatus.FUNCTIONAL for r in results)
    assert any(r.bbi_id == bbi2.id and r.status == BBIStatus.NON_FUNCTIONAL for r in results)


def test_calculate_all_bbi_statuses_skips_inactive(
    db_session: Session,
    sample_governance_area: GovernanceArea,
    sample_assessment: Assessment,
    sample_indicators,
):
    """Test that calculate_all_bbi_statuses only processes active BBIs"""
    # Create active and inactive BBIs
    bbi_active = BBI(
        name="Active BBI",
        abbreviation="ABBI",
        governance_area_id=sample_governance_area.id,
        mapping_rules={
            "operator": "AND",
            "conditions": [
                {"indicator_id": sample_indicators[0].id, "required_status": "Pass"}
            ],
        },
        is_active=True,
    )
    bbi_inactive = BBI(
        name="Inactive BBI",
        abbreviation="IBBI",
        governance_area_id=sample_governance_area.id,
        mapping_rules={
            "operator": "AND",
            "conditions": [
                {"indicator_id": sample_indicators[1].id, "required_status": "Pass"}
            ],
        },
        is_active=False,
    )
    db_session.add_all([bbi_active, bbi_inactive])
    db_session.commit()

    # Add assessment response
    response = AssessmentResponse(
        assessment_id=sample_assessment.id,
        indicator_id=sample_indicators[0].id,
        validation_status=ValidationStatus.PASS,
    )
    db_session.add(response)
    db_session.commit()

    results = bbi_service.calculate_all_bbi_statuses(db_session, sample_assessment.id)

    # Only active BBI should have result
    bbi_ids = [r.bbi_id for r in results]
    assert bbi_active.id in bbi_ids
    assert bbi_inactive.id not in bbi_ids


def test_get_bbi_results(
    db_session: Session, sample_bbi: BBI, sample_assessment: Assessment
):
    """Test getting BBI results for an assessment"""
    # Create a BBI result
    bbi_result = BBIResult(
        bbi_id=sample_bbi.id,
        assessment_id=sample_assessment.id,
        status=BBIStatus.FUNCTIONAL,
        calculation_details={"test": "data"},
    )
    db_session.add(bbi_result)
    db_session.commit()

    results = bbi_service.get_bbi_results(db_session, sample_assessment.id)

    assert len(results) == 1
    assert results[0].bbi_id == sample_bbi.id
    assert results[0].status == BBIStatus.FUNCTIONAL


def test_evaluate_mapping_rules_empty_conditions(db_session: Session):
    """Test that empty conditions return False"""
    mapping_rules = {"operator": "AND", "conditions": []}
    indicator_statuses = {}

    result = bbi_service._evaluate_mapping_rules(mapping_rules, indicator_statuses)

    assert result is False


def test_evaluate_mapping_rules_unknown_operator(db_session: Session):
    """Test that unknown operator defaults to AND logic"""
    mapping_rules = {
        "operator": "XOR",  # Unknown operator
        "conditions": [
            {"indicator_id": 1, "required_status": "Pass"},
            {"indicator_id": 2, "required_status": "Pass"},
        ],
    }
    indicator_statuses = {1: "Pass", 2: "Fail"}

    result = bbi_service._evaluate_mapping_rules(mapping_rules, indicator_statuses)

    # Should default to AND, so result is False (not all pass)
    assert result is False


# ====================================================================
# BBI Compliance Rate Calculation Tests (DILG MC 2024-417)
# ====================================================================


class TestGetComplianceRating:
    """Tests for the _get_compliance_rating method (3-tier system)."""

    def test_highly_functional_at_75_percent(self):
        """Test that 75% returns HIGHLY_FUNCTIONAL"""
        result = bbi_service._get_compliance_rating(75.0)
        assert result == BBIStatus.HIGHLY_FUNCTIONAL

    def test_highly_functional_at_100_percent(self):
        """Test that 100% returns HIGHLY_FUNCTIONAL"""
        result = bbi_service._get_compliance_rating(100.0)
        assert result == BBIStatus.HIGHLY_FUNCTIONAL

    def test_highly_functional_at_80_percent(self):
        """Test that 80% returns HIGHLY_FUNCTIONAL"""
        result = bbi_service._get_compliance_rating(80.0)
        assert result == BBIStatus.HIGHLY_FUNCTIONAL

    def test_moderately_functional_at_50_percent(self):
        """Test that 50% returns MODERATELY_FUNCTIONAL"""
        result = bbi_service._get_compliance_rating(50.0)
        assert result == BBIStatus.MODERATELY_FUNCTIONAL

    def test_moderately_functional_at_74_percent(self):
        """Test that 74% returns MODERATELY_FUNCTIONAL"""
        result = bbi_service._get_compliance_rating(74.0)
        assert result == BBIStatus.MODERATELY_FUNCTIONAL

    def test_moderately_functional_at_60_percent(self):
        """Test that 60% returns MODERATELY_FUNCTIONAL"""
        result = bbi_service._get_compliance_rating(60.0)
        assert result == BBIStatus.MODERATELY_FUNCTIONAL

    def test_low_functional_at_49_percent(self):
        """Test that 49% returns LOW_FUNCTIONAL"""
        result = bbi_service._get_compliance_rating(49.0)
        assert result == BBIStatus.LOW_FUNCTIONAL

    def test_low_functional_at_0_percent(self):
        """Test that 0% returns LOW_FUNCTIONAL"""
        result = bbi_service._get_compliance_rating(0.0)
        assert result == BBIStatus.LOW_FUNCTIONAL

    def test_low_functional_at_25_percent(self):
        """Test that 25% returns LOW_FUNCTIONAL"""
        result = bbi_service._get_compliance_rating(25.0)
        assert result == BBIStatus.LOW_FUNCTIONAL

    def test_boundary_74_99_is_moderately_functional(self):
        """Test boundary case: 74.99% should be MODERATELY_FUNCTIONAL"""
        result = bbi_service._get_compliance_rating(74.99)
        assert result == BBIStatus.MODERATELY_FUNCTIONAL

    def test_boundary_49_99_is_low_functional(self):
        """Test boundary case: 49.99% should be LOW_FUNCTIONAL"""
        result = bbi_service._get_compliance_rating(49.99)
        assert result == BBIStatus.LOW_FUNCTIONAL


class TestIsChecklistItemSatisfied:
    """Tests for the _is_checklist_item_satisfied method."""

    def test_boolean_true_satisfied(self, db_session: Session):
        """Test that boolean True value satisfies item"""
        from app.db.models.governance_area import ChecklistItem

        item = ChecklistItem(
            item_id="test_item",
            label="Test Item",
            item_type="checkbox",
            required=True,
        )
        response_data = {"test_item": True}

        result = bbi_service._is_checklist_item_satisfied(item, response_data)
        assert result is True

    def test_boolean_false_not_satisfied(self, db_session: Session):
        """Test that boolean False value does not satisfy item"""
        from app.db.models.governance_area import ChecklistItem

        item = ChecklistItem(
            item_id="test_item",
            label="Test Item",
            item_type="checkbox",
            required=True,
        )
        response_data = {"test_item": False}

        result = bbi_service._is_checklist_item_satisfied(item, response_data)
        assert result is False

    def test_string_true_satisfied(self, db_session: Session):
        """Test that string 'true' value satisfies item"""
        from app.db.models.governance_area import ChecklistItem

        item = ChecklistItem(
            item_id="test_item",
            label="Test Item",
            item_type="checkbox",
            required=True,
        )
        response_data = {"test_item": "true"}

        result = bbi_service._is_checklist_item_satisfied(item, response_data)
        assert result is True

    def test_string_yes_satisfied(self, db_session: Session):
        """Test that string 'yes' value satisfies item"""
        from app.db.models.governance_area import ChecklistItem

        item = ChecklistItem(
            item_id="test_item",
            label="Test Item",
            item_type="checkbox",
            required=True,
        )
        response_data = {"test_item": "yes"}

        result = bbi_service._is_checklist_item_satisfied(item, response_data)
        assert result is True

    def test_yes_no_pattern_yes_satisfied(self, db_session: Session):
        """Test YES/NO pattern with _yes=True satisfies item"""
        from app.db.models.governance_area import ChecklistItem

        item = ChecklistItem(
            item_id="test_item",
            label="Test Item",
            item_type="assessment_field",
            required=True,
        )
        response_data = {"test_item_yes": True, "test_item_no": False}

        result = bbi_service._is_checklist_item_satisfied(item, response_data)
        assert result is True

    def test_yes_no_pattern_no_not_satisfied(self, db_session: Session):
        """Test YES/NO pattern with _no=True does not satisfy item"""
        from app.db.models.governance_area import ChecklistItem

        item = ChecklistItem(
            item_id="test_item",
            label="Test Item",
            item_type="assessment_field",
            required=True,
        )
        response_data = {"test_item_yes": False, "test_item_no": True}

        result = bbi_service._is_checklist_item_satisfied(item, response_data)
        assert result is False

    def test_info_text_always_satisfied(self, db_session: Session):
        """Test that info_text items are always satisfied"""
        from app.db.models.governance_area import ChecklistItem

        item = ChecklistItem(
            item_id="info_item",
            label="Information text",
            item_type="info_text",
            required=False,
        )
        response_data = {}  # No response needed for info_text

        result = bbi_service._is_checklist_item_satisfied(item, response_data)
        assert result is True

    def test_document_count_with_value_satisfied(self, db_session: Session):
        """Test that document_count with value satisfies item"""
        from app.db.models.governance_area import ChecklistItem

        item = ChecklistItem(
            item_id="doc_count",
            label="Document count",
            item_type="document_count",
            required=True,
        )
        response_data = {"doc_count": 5}

        result = bbi_service._is_checklist_item_satisfied(item, response_data)
        assert result is True

    def test_document_count_empty_not_satisfied(self, db_session: Session):
        """Test that document_count with empty value does not satisfy item"""
        from app.db.models.governance_area import ChecklistItem

        item = ChecklistItem(
            item_id="doc_count",
            label="Document count",
            item_type="document_count",
            required=True,
        )
        response_data = {"doc_count": 0}

        result = bbi_service._is_checklist_item_satisfied(item, response_data)
        assert result is False

    def test_missing_item_not_satisfied(self, db_session: Session):
        """Test that missing response data does not satisfy item"""
        from app.db.models.governance_area import ChecklistItem

        item = ChecklistItem(
            item_id="test_item",
            label="Test Item",
            item_type="checkbox",
            required=True,
        )
        response_data = {}  # No response for this item

        result = bbi_service._is_checklist_item_satisfied(item, response_data)
        assert result is False


class TestCalculateBbiComplianceIntegration:
    """Integration tests for calculate_bbi_compliance with database."""

    @pytest.fixture
    def bbi_indicator(
        self, db_session: Session, sample_governance_area: GovernanceArea
    ):
        """Create a BBI indicator with is_bbi=True"""
        indicator = Indicator(
            name="Barangay Development Council",
            indicator_code="2.1",
            description="BDC indicator",
            governance_area_id=sample_governance_area.id,
            is_bbi=True,
            is_active=True,
        )
        db_session.add(indicator)
        db_session.commit()
        db_session.refresh(indicator)
        return indicator

    @pytest.fixture
    def bbi_sub_indicators(
        self, db_session: Session, bbi_indicator: Indicator, sample_governance_area: GovernanceArea
    ):
        """Create sub-indicators for the BBI indicator"""
        sub_indicators = []
        for i, name in enumerate(["Structure", "Meetings", "Plans"], start=1):
            sub_indicator = Indicator(
                name=name,
                indicator_code=f"2.1.{i}",
                description=f"{name} sub-indicator",
                governance_area_id=sample_governance_area.id,
                parent_id=bbi_indicator.id,
                is_active=True,
                sort_order=i,
            )
            db_session.add(sub_indicator)
            sub_indicators.append(sub_indicator)
        db_session.commit()
        for si in sub_indicators:
            db_session.refresh(si)
        return sub_indicators

    def test_compliance_100_percent_all_pass(
        self,
        db_session: Session,
        bbi_indicator: Indicator,
        bbi_sub_indicators: List[Indicator],
        sample_assessment: Assessment,
    ):
        """Test 100% compliance when all sub-indicators pass"""
        # Create passing responses for all sub-indicators
        for sub_indicator in bbi_sub_indicators:
            response = AssessmentResponse(
                assessment_id=sample_assessment.id,
                indicator_id=sub_indicator.id,
                validation_status=ValidationStatus.PASS,
                response_data={},
            )
            db_session.add(response)
        db_session.commit()

        result = bbi_service.calculate_bbi_compliance(
            db_session, sample_assessment.id, bbi_indicator
        )

        assert result["compliance_percentage"] == 100.0
        assert result["compliance_rating"] == BBIStatus.HIGHLY_FUNCTIONAL.value
        assert result["sub_indicators_passed"] == 3
        assert result["sub_indicators_total"] == 3

    def test_compliance_66_percent_two_of_three_pass(
        self,
        db_session: Session,
        bbi_indicator: Indicator,
        bbi_sub_indicators: List[Indicator],
        sample_assessment: Assessment,
    ):
        """Test ~66% compliance when 2 of 3 sub-indicators pass"""
        # Create responses: 2 pass, 1 fail
        for i, sub_indicator in enumerate(bbi_sub_indicators):
            response = AssessmentResponse(
                assessment_id=sample_assessment.id,
                indicator_id=sub_indicator.id,
                validation_status=ValidationStatus.PASS if i < 2 else ValidationStatus.FAIL,
                response_data={},
            )
            db_session.add(response)
        db_session.commit()

        result = bbi_service.calculate_bbi_compliance(
            db_session, sample_assessment.id, bbi_indicator
        )

        assert result["compliance_percentage"] == pytest.approx(66.67, rel=0.01)
        assert result["compliance_rating"] == BBIStatus.MODERATELY_FUNCTIONAL.value
        assert result["sub_indicators_passed"] == 2
        assert result["sub_indicators_total"] == 3

    def test_compliance_33_percent_one_of_three_pass(
        self,
        db_session: Session,
        bbi_indicator: Indicator,
        bbi_sub_indicators: List[Indicator],
        sample_assessment: Assessment,
    ):
        """Test ~33% compliance when 1 of 3 sub-indicators pass"""
        # Create responses: 1 pass, 2 fail
        for i, sub_indicator in enumerate(bbi_sub_indicators):
            response = AssessmentResponse(
                assessment_id=sample_assessment.id,
                indicator_id=sub_indicator.id,
                validation_status=ValidationStatus.PASS if i == 0 else ValidationStatus.FAIL,
                response_data={},
            )
            db_session.add(response)
        db_session.commit()

        result = bbi_service.calculate_bbi_compliance(
            db_session, sample_assessment.id, bbi_indicator
        )

        assert result["compliance_percentage"] == pytest.approx(33.33, rel=0.01)
        assert result["compliance_rating"] == BBIStatus.LOW_FUNCTIONAL.value
        assert result["sub_indicators_passed"] == 1
        assert result["sub_indicators_total"] == 3

    def test_compliance_0_percent_all_fail(
        self,
        db_session: Session,
        bbi_indicator: Indicator,
        bbi_sub_indicators: List[Indicator],
        sample_assessment: Assessment,
    ):
        """Test 0% compliance when all sub-indicators fail"""
        # Create failing responses for all sub-indicators
        for sub_indicator in bbi_sub_indicators:
            response = AssessmentResponse(
                assessment_id=sample_assessment.id,
                indicator_id=sub_indicator.id,
                validation_status=ValidationStatus.FAIL,
                response_data={},
            )
            db_session.add(response)
        db_session.commit()

        result = bbi_service.calculate_bbi_compliance(
            db_session, sample_assessment.id, bbi_indicator
        )

        assert result["compliance_percentage"] == 0.0
        assert result["compliance_rating"] == BBIStatus.LOW_FUNCTIONAL.value
        assert result["sub_indicators_passed"] == 0
        assert result["sub_indicators_total"] == 3

    def test_compliance_no_sub_indicators_single_indicator(
        self,
        db_session: Session,
        bbi_indicator: Indicator,
        sample_assessment: Assessment,
    ):
        """Test compliance for BBI with no sub-indicators (single indicator)"""
        # Note: We don't create bbi_sub_indicators fixture here
        # Create a passing response for the BBI indicator itself
        response = AssessmentResponse(
            assessment_id=sample_assessment.id,
            indicator_id=bbi_indicator.id,
            validation_status=ValidationStatus.PASS,
            response_data={},
        )
        db_session.add(response)
        db_session.commit()

        result = bbi_service.calculate_bbi_compliance(
            db_session, sample_assessment.id, bbi_indicator
        )

        assert result["compliance_percentage"] == 100.0
        assert result["compliance_rating"] == BBIStatus.HIGHLY_FUNCTIONAL.value
        assert result["sub_indicators_passed"] == 1
        assert result["sub_indicators_total"] == 1
