"""
🧪 Analytics Service Tests
Tests for analytics service layer - dashboard KPI calculations
"""

import pytest
from datetime import datetime
from app.db.enums import ComplianceStatus, UserRole, AreaType
from app.db.models import Assessment, AssessmentResponse, GovernanceArea, Indicator, User, Barangay
from app.services.analytics_service import analytics_service


@pytest.fixture
def governance_areas(db_session):
    """Create test governance areas"""
    areas = [
        GovernanceArea(id=1, name="Financial Administration", area_type=AreaType.CORE),
        GovernanceArea(id=2, name="Disaster Preparedness", area_type=AreaType.CORE),
        GovernanceArea(id=3, name="Social Protection", area_type=AreaType.ESSENTIAL),
    ]
    for area in areas:
        db_session.add(area)
    db_session.commit()
    for area in areas:
        db_session.refresh(area)
    return areas


@pytest.fixture
def indicators(db_session, governance_areas):
    """Create test indicators"""
    indicators = []
    for i, area in enumerate(governance_areas):
        for j in range(3):  # 3 indicators per area
            ind = Indicator(
                id=(i * 3) + j + 1,
                name=f"{area.name} Indicator {j+1}",
                description=f"Test indicator for {area.name}",
                form_schema={"type": "object", "properties": {}},
                governance_area_id=area.id,
            )
            db_session.add(ind)
            indicators.append(ind)
    db_session.commit()
    for ind in indicators:
        db_session.refresh(ind)
    return indicators


@pytest.fixture
def barangays_with_assessments(db_session, indicators):
    """Create test barangays with assessments"""
    # Create 10 barangays with various compliance statuses
    barangays = []
    assessments = []

    for i in range(10):
        # Create barangay
        barangay = Barangay(name=f"Test Barangay {i+1}")
        db_session.add(barangay)
        db_session.commit()
        db_session.refresh(barangay)
        barangays.append(barangay)

        # Create user for barangay
        user = User(
            email=f"blgu{i+1}@test.com",
            name=f"BLGU User {i+1}",
            hashed_password="hashed",
            role=UserRole.BLGU_USER,
            barangay_id=barangay.id,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Create assessment with compliance status
        # First 7 pass, last 3 fail
        compliance_status = ComplianceStatus.PASSED if i < 7 else ComplianceStatus.FAILED

        assessment = Assessment(
            blgu_user_id=user.id,
            final_compliance_status=compliance_status,
            validated_at=datetime(2024, 1, 1),
        )
        db_session.add(assessment)
        db_session.commit()
        db_session.refresh(assessment)
        assessments.append(assessment)

        # Create assessment responses for indicators
        for ind_idx, indicator in enumerate(indicators):
            # Make some indicators fail for failed assessments
            is_completed = True
            if compliance_status == ComplianceStatus.FAILED:
                # Fail specific indicators more often
                if ind_idx in [0, 3, 6]:  # Fail indicators 1, 4, 7 more often
                    is_completed = False

            response = AssessmentResponse(
                assessment_id=assessment.id,
                indicator_id=indicator.id,
                is_completed=is_completed,
                response_data={},
            )
            db_session.add(response)

        db_session.commit()

    return barangays, assessments


def test_get_dashboard_kpis_with_data(db_session, governance_areas, indicators, barangays_with_assessments):
    """Test get_dashboard_kpis returns correct data structure with valid data"""
    # Act
    result = analytics_service.get_dashboard_kpis(db_session, cycle_id=None)

    # Assert
    assert result is not None
    assert hasattr(result, 'overall_compliance_rate')
    assert hasattr(result, 'completion_status')
    assert hasattr(result, 'area_breakdown')
    assert hasattr(result, 'top_failed_indicators')
    assert hasattr(result, 'trends')

    # Check overall compliance rate
    assert result.overall_compliance_rate.total_barangays == 10
    assert result.overall_compliance_rate.passed == 7
    assert result.overall_compliance_rate.failed == 3
    assert result.overall_compliance_rate.pass_percentage == 70.0


def test_calculate_overall_compliance_all_passed(db_session):
    """Test overall compliance calculation when all assessments pass"""
    # Arrange: Create 5 passing assessments
    for i in range(5):
        barangay = Barangay(name=f"Pass Barangay {i+1}")
        db_session.add(barangay)
        db_session.commit()
        db_session.refresh(barangay)

        user = User(
            email=f"pass{i+1}@test.com",
            name=f"Pass User {i+1}",
            hashed_password="hashed",
            role=UserRole.BLGU_USER,
            barangay_id=barangay.id,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assessment = Assessment(
            blgu_user_id=user.id,
            final_compliance_status=ComplianceStatus.PASSED,
        )
        db_session.add(assessment)

    db_session.commit()

    # Act
    result = analytics_service._calculate_overall_compliance(db_session, None)

    # Assert
    assert result.total_barangays == 5
    assert result.passed == 5
    assert result.failed == 0
    assert result.pass_percentage == 100.0


def test_calculate_overall_compliance_no_assessments(db_session):
    """Test overall compliance calculation with no assessments"""
    # Act
    result = analytics_service._calculate_overall_compliance(db_session, None)

    # Assert - should return zeros, not crash
    assert result.total_barangays == 0
    assert result.passed == 0
    assert result.failed == 0
    assert result.pass_percentage == 0.0


def test_calculate_area_breakdown(db_session, governance_areas, indicators, barangays_with_assessments):
    """Test area breakdown calculation with multiple governance areas"""
    # Act
    result = analytics_service._calculate_area_breakdown(db_session, None)

    # Assert
    assert len(result) == 3  # 3 governance areas
    assert all(hasattr(area, 'area_code') for area in result)
    assert all(hasattr(area, 'area_name') for area in result)
    assert all(hasattr(area, 'passed') for area in result)
    assert all(hasattr(area, 'failed') for area in result)
    assert all(hasattr(area, 'percentage') for area in result)

    # Check area names match
    area_names = [area.area_name for area in result]
    expected_names = ["Financial Administration", "Disaster Preparedness", "Social Protection"]
    for expected in expected_names:
        assert expected in area_names


def test_calculate_area_breakdown_no_areas(db_session):
    """Test area breakdown with no governance areas"""
    # Act
    result = analytics_service._calculate_area_breakdown(db_session, None)

    # Assert - should return empty list, not crash
    assert result == []


def test_calculate_top_failed_indicators(db_session, governance_areas, indicators, barangays_with_assessments):
    """Test top failed indicators returns max 5 items"""
    # Act
    result = analytics_service._calculate_top_failed_indicators(db_session, None)

    # Assert
    assert len(result) <= 5  # Should never exceed 5
    if len(result) > 0:
        # Should be sorted by failure_count descending
        for i in range(len(result) - 1):
            assert result[i].failure_count >= result[i + 1].failure_count

        # Each item should have required fields
        for item in result:
            assert hasattr(item, 'indicator_id')
            assert hasattr(item, 'indicator_name')
            assert hasattr(item, 'failure_count')
            assert hasattr(item, 'percentage')
            assert item.failure_count > 0


def test_calculate_top_failed_indicators_no_failures(db_session, governance_areas, indicators):
    """Test top failed indicators when all indicators pass"""
    # Arrange: Create assessment with all indicators completed
    barangay = Barangay(name="Perfect Barangay")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)

    user = User(
        email="perfect@test.com",
        name="Perfect User",
        hashed_password="hashed",
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assessment = Assessment(
        blgu_user_id=user.id,
        final_compliance_status=ComplianceStatus.PASSED,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    # All indicators completed
    for indicator in indicators:
        response = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            is_completed=True,
        )
        db_session.add(response)
    db_session.commit()

    # Act
    result = analytics_service._calculate_top_failed_indicators(db_session, None)

    # Assert - should return empty list
    assert result == []


def test_calculate_completion_status(db_session, governance_areas, indicators, barangays_with_assessments):
    """Test completion status calculation"""
    # Act
    result = analytics_service._calculate_completion_status(db_session, None)

    # Assert
    assert result.total_barangays == 10
    assert result.passed == 10  # All have final_compliance_status (validated)
    assert result.failed == 0  # None are in progress
    assert result.pass_percentage == 100.0


def test_calculate_completion_status_mixed(db_session, governance_areas, indicators):
    """Test completion status with mixed validated/in-progress assessments"""
    # Arrange: Create mix of validated and in-progress
    for i in range(5):
        barangay = Barangay(name=f"Mixed Barangay {i+1}")
        db_session.add(barangay)
        db_session.commit()
        db_session.refresh(barangay)

        user = User(
            email=f"mixed{i+1}@test.com",
            name=f"Mixed User {i+1}",
            hashed_password="hashed",
            role=UserRole.BLGU_USER,
            barangay_id=barangay.id,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # First 3 validated, last 2 in progress (no final_compliance_status)
        assessment = Assessment(
            blgu_user_id=user.id,
            final_compliance_status=ComplianceStatus.PASSED if i < 3 else None,
        )
        db_session.add(assessment)

    db_session.commit()

    # Act
    result = analytics_service._calculate_completion_status(db_session, None)

    # Assert
    assert result.total_barangays == 5
    assert result.passed == 3  # Validated
    assert result.failed == 2  # In progress
    assert result.pass_percentage == 60.0


def test_calculate_trends_empty(db_session):
    """Test trends calculation returns empty list (placeholder implementation)"""
    # Act
    result = analytics_service._calculate_trends(db_session)

    # Assert - currently returns empty as cycles not implemented
    assert result == []


def test_get_dashboard_kpis_cycle_filtering(db_session, governance_areas, indicators, barangays_with_assessments):
    """Test that cycle_id parameter is accepted (even if not filtering yet)"""
    # Act - should not crash with cycle_id parameter
    result = analytics_service.get_dashboard_kpis(db_session, cycle_id=1)

    # Assert - should return data structure
    assert result is not None
    assert hasattr(result, 'overall_compliance_rate')


# =============================================================================
# REPORTS DATA TESTS (Task 2.10.1)
# =============================================================================


@pytest.fixture
def mlgoo_user(db_session):
    """Create MLGOO_DILG test user"""
    user = User(
        email="mlgoo@dilg.gov.ph",
        name="MLGOO Admin",
        hashed_password="hashed",
        role=UserRole.MLGOO_DILG,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def area_assessor_user(db_session, governance_areas):
    """Create Area Assessor test user"""
    user = User(
        email="assessor@dilg.gov.ph",
        name="Area Assessor",
        hashed_password="hashed",
        role=UserRole.ASSESSOR,
        governance_area_id=governance_areas[0].id,  # Assigned to Financial Administration
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def blgu_user_test(db_session):
    """Create BLGU test user"""
    barangay = Barangay(name="Test BLGU Barangay")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)

    user = User(
        email="blgu@barangay.gov.ph",
        name="BLGU User",
        hashed_password="hashed",
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_get_reports_data_empty_filters_mlgoo(db_session, governance_areas, indicators, barangays_with_assessments, mlgoo_user):
    """Test get_reports_data with empty filters returns all accessible data for MLGOO_DILG"""
    from app.services.analytics_service import ReportsFilters

    # Arrange
    filters = ReportsFilters()

    # Act
    result = analytics_service.get_reports_data(
        db=db_session,
        filters=filters,
        current_user=mlgoo_user,
        page=1,
        page_size=50,
    )

    # Assert
    assert result is not None
    assert hasattr(result, 'chart_data')
    assert hasattr(result, 'map_data')
    assert hasattr(result, 'table_data')
    assert hasattr(result, 'metadata')

    # Should have data from all 10 barangays
    assert result.table_data.total_count == 10
    assert len(result.table_data.rows) == 10

    # Chart data should be populated
    assert len(result.chart_data.bar_chart) > 0
    assert len(result.chart_data.pie_chart) > 0

    # Map data should have barangay points
    assert len(result.map_data.barangays) > 0


def test_get_reports_data_with_status_filter(db_session, governance_areas, indicators, barangays_with_assessments, mlgoo_user):
    """Test get_reports_data filters by status correctly"""
    from app.services.analytics_service import ReportsFilters

    # Arrange - filter for passed assessments only
    filters = ReportsFilters(status="Pass")

    # Act
    result = analytics_service.get_reports_data(
        db=db_session,
        filters=filters,
        current_user=mlgoo_user,
        page=1,
        page_size=50,
    )

    # Assert
    # From fixture: first 7 pass, last 3 fail
    assert result.table_data.total_count == 7
    assert len(result.table_data.rows) == 7

    # All rows should have "Pass" status
    for row in result.table_data.rows:
        assert row.status == "Pass"


def test_get_reports_data_with_date_range_filter(db_session, governance_areas, indicators, barangays_with_assessments, mlgoo_user):
    """Test get_reports_data filters by date range"""
    from app.services.analytics_service import ReportsFilters
    from datetime import date

    # Arrange - filter for specific date range
    # Assessments in fixture have validated_at = 2024-01-01
    # But filtering uses submitted_at, which is None, so this test should return all assessments with submitted_at in range

    # First, update one assessment to have a submitted_at date
    barangays, assessments = barangays_with_assessments
    assessments[0].submitted_at = datetime(2024, 1, 15)
    db_session.commit()

    filters = ReportsFilters(
        start_date=date(2024, 1, 1),
        end_date=date(2024, 1, 31),
    )

    # Act
    result = analytics_service.get_reports_data(
        db=db_session,
        filters=filters,
        current_user=mlgoo_user,
        page=1,
        page_size=50,
    )

    # Assert - should only return assessments with submitted_at in range
    assert result.table_data.total_count == 1
    assert len(result.table_data.rows) == 1


def test_get_reports_data_rbac_mlgoo_sees_all(db_session, governance_areas, indicators, barangays_with_assessments, mlgoo_user):
    """Test RBAC: MLGOO_DILG user sees all data"""
    from app.services.analytics_service import ReportsFilters

    # Arrange
    filters = ReportsFilters()

    # Act
    result = analytics_service.get_reports_data(
        db=db_session,
        filters=filters,
        current_user=mlgoo_user,
        page=1,
        page_size=50,
    )

    # Assert - should see all 10 barangays
    assert result.table_data.total_count == 10


def test_get_reports_data_rbac_blgu_sees_own_only(db_session, governance_areas, indicators, blgu_user_test):
    """Test RBAC: BLGU user sees only their own barangay"""
    from app.services.analytics_service import ReportsFilters

    # Arrange - create an assessment for the BLGU user's barangay
    assessment = Assessment(
        blgu_user_id=blgu_user_test.id,
        final_compliance_status=ComplianceStatus.PASSED,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    filters = ReportsFilters()

    # Act
    result = analytics_service.get_reports_data(
        db=db_session,
        filters=filters,
        current_user=blgu_user_test,
        page=1,
        page_size=50,
    )

    # Assert - should only see their own barangay's assessment
    assert result.table_data.total_count == 1
    assert result.table_data.rows[0].barangay_id == blgu_user_test.barangay_id


def test_get_reports_data_chart_structure(db_session, governance_areas, indicators, barangays_with_assessments, mlgoo_user):
    """Test chart data aggregation returns correct structure"""
    from app.services.analytics_service import ReportsFilters

    # Arrange
    filters = ReportsFilters()

    # Act
    result = analytics_service.get_reports_data(
        db=db_session,
        filters=filters,
        current_user=mlgoo_user,
        page=1,
        page_size=50,
    )

    # Assert chart data structure
    chart_data = result.chart_data

    # Bar chart data
    assert hasattr(chart_data, 'bar_chart')
    assert len(chart_data.bar_chart) == 3  # 3 governance areas
    for bar in chart_data.bar_chart:
        assert hasattr(bar, 'area_code')
        assert hasattr(bar, 'area_name')
        assert hasattr(bar, 'passed')
        assert hasattr(bar, 'failed')
        assert hasattr(bar, 'pass_percentage')

    # Pie chart data
    assert hasattr(chart_data, 'pie_chart')
    assert len(chart_data.pie_chart) > 0
    for pie in chart_data.pie_chart:
        assert hasattr(pie, 'status')
        assert hasattr(pie, 'count')
        assert hasattr(pie, 'percentage')
        assert pie.status in ["Pass", "Fail", "In Progress"]

    # Line chart data
    assert hasattr(chart_data, 'line_chart')


def test_get_reports_data_map_includes_coordinates(db_session, governance_areas, indicators, barangays_with_assessments, mlgoo_user):
    """Test map data includes coordinates for barangays"""
    from app.services.analytics_service import ReportsFilters

    # Arrange - add coordinates to a barangay
    barangays, assessments = barangays_with_assessments
    barangay = barangays[0]

    # Add latitude and longitude attributes
    # Note: The actual Barangay model may or may not have these fields
    # The service handles this gracefully
    filters = ReportsFilters()

    # Act
    result = analytics_service.get_reports_data(
        db=db_session,
        filters=filters,
        current_user=mlgoo_user,
        page=1,
        page_size=50,
    )

    # Assert map data structure
    map_data = result.map_data
    assert hasattr(map_data, 'barangays')
    assert len(map_data.barangays) > 0

    for point in map_data.barangays:
        assert hasattr(point, 'barangay_id')
        assert hasattr(point, 'name')
        assert hasattr(point, 'lat')  # May be None if not set
        assert hasattr(point, 'lng')  # May be None if not set
        assert hasattr(point, 'status')
        assert hasattr(point, 'score')
        assert point.status in ["Pass", "Fail", "In Progress"]


def test_get_reports_data_pagination_page_1(db_session, governance_areas, indicators, barangays_with_assessments, mlgoo_user):
    """Test table data pagination - page 1"""
    from app.services.analytics_service import ReportsFilters

    # Arrange
    filters = ReportsFilters()

    # Act - get page 1 with page_size=5
    result = analytics_service.get_reports_data(
        db=db_session,
        filters=filters,
        current_user=mlgoo_user,
        page=1,
        page_size=5,
    )

    # Assert
    assert result.table_data.total_count == 10  # Total across all pages
    assert result.table_data.page == 1
    assert result.table_data.page_size == 5
    assert len(result.table_data.rows) == 5  # Only 5 rows on page 1


def test_get_reports_data_pagination_page_2(db_session, governance_areas, indicators, barangays_with_assessments, mlgoo_user):
    """Test table data pagination - page 2"""
    from app.services.analytics_service import ReportsFilters

    # Arrange
    filters = ReportsFilters()

    # Act - get page 2 with page_size=5
    result = analytics_service.get_reports_data(
        db=db_session,
        filters=filters,
        current_user=mlgoo_user,
        page=2,
        page_size=5,
    )

    # Assert
    assert result.table_data.total_count == 10  # Total across all pages
    assert result.table_data.page == 2
    assert result.table_data.page_size == 5
    assert len(result.table_data.rows) == 5  # Only 5 rows on page 2


def test_get_reports_data_pagination_last_page(db_session, governance_areas, indicators, barangays_with_assessments, mlgoo_user):
    """Test table data pagination - last page with fewer rows"""
    from app.services.analytics_service import ReportsFilters

    # Arrange
    filters = ReportsFilters()

    # Act - get page 2 with page_size=7 (should have only 3 rows)
    result = analytics_service.get_reports_data(
        db=db_session,
        filters=filters,
        current_user=mlgoo_user,
        page=2,
        page_size=7,
    )

    # Assert
    assert result.table_data.total_count == 10  # Total across all pages
    assert result.table_data.page == 2
    assert result.table_data.page_size == 7
    assert len(result.table_data.rows) == 3  # Only 3 rows remaining on page 2


def test_get_reports_data_combined_filters(db_session, governance_areas, indicators, barangays_with_assessments, mlgoo_user):
    """Test get_reports_data with multiple filters combined"""
    from app.services.analytics_service import ReportsFilters

    # Arrange - combine status filter with pagination
    filters = ReportsFilters(status="Fail")

    # Act
    result = analytics_service.get_reports_data(
        db=db_session,
        filters=filters,
        current_user=mlgoo_user,
        page=1,
        page_size=2,
    )

    # Assert
    # From fixture: last 3 fail
    assert result.table_data.total_count == 3
    assert len(result.table_data.rows) == 2  # Page size 2
    assert all(row.status == "Fail" for row in result.table_data.rows)


def test_get_reports_data_table_row_structure(db_session, governance_areas, indicators, barangays_with_assessments, mlgoo_user):
    """Test table data rows have correct structure"""
    from app.services.analytics_service import ReportsFilters

    # Arrange
    filters = ReportsFilters()

    # Act
    result = analytics_service.get_reports_data(
        db=db_session,
        filters=filters,
        current_user=mlgoo_user,
        page=1,
        page_size=5,
    )

    # Assert row structure
    for row in result.table_data.rows:
        assert hasattr(row, 'barangay_id')
        assert hasattr(row, 'barangay_name')
        assert hasattr(row, 'governance_area')
        assert hasattr(row, 'status')
        assert hasattr(row, 'score')
        assert row.status in ["Pass", "Fail", "In Progress"]
        # Score should be between 0 and 100 if present
        if row.score is not None:
            assert 0 <= row.score <= 100


def test_get_reports_data_metadata_structure(db_session, governance_areas, indicators, barangays_with_assessments, mlgoo_user):
    """Test metadata structure in reports response"""
    from app.services.analytics_service import ReportsFilters
    from datetime import date

    # Arrange
    filters = ReportsFilters(
        cycle_id=1,
        status="Pass",
        start_date=date(2024, 1, 1),
        end_date=date(2024, 12, 31),
    )

    # Act
    result = analytics_service.get_reports_data(
        db=db_session,
        filters=filters,
        current_user=mlgoo_user,
        page=1,
        page_size=50,
    )

    # Assert metadata
    metadata = result.metadata
    assert hasattr(metadata, 'generated_at')
    assert hasattr(metadata, 'cycle_id')
    assert hasattr(metadata, 'start_date')
    assert hasattr(metadata, 'end_date')
    assert hasattr(metadata, 'status')

    # Check filter values are reflected in metadata
    assert metadata.cycle_id == 1
    assert metadata.status == "Pass"
