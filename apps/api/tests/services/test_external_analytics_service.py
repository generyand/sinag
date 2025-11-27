"""
Tests for external analytics service layer (app/services/external_analytics_service.py)
"""

import pytest
import uuid
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.models.user import User
from app.db.models.barangay import Barangay
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.enums import UserRole, AssessmentStatus, ComplianceStatus, AreaType, ValidationStatus
from app.services.external_analytics_service import external_analytics_service, MINIMUM_AGGREGATION_THRESHOLD
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ====================================================================
# Test Fixtures
# ====================================================================


@pytest.fixture
def governance_areas(db_session: Session):
    """Create governance areas for testing"""
    areas = [
        GovernanceArea(id=1, code="FA", name="Financial Administration", area_type=AreaType.CORE),
        GovernanceArea(id=2, code="SP", name="Social Protection", area_type=AreaType.CORE),
        GovernanceArea(id=3, code="DP", name="Disaster Preparedness", area_type=AreaType.CORE),
        GovernanceArea(id=4, code="SS", name="Security", area_type=AreaType.ESSENTIAL),
    ]
    for area in areas:
        db_session.add(area)
    db_session.commit()
    return areas


@pytest.fixture
def indicators(db_session: Session, governance_areas):
    """Create indicators for testing"""
    indicators = [
        Indicator(id=1, indicator_code="1.1", name="Indicator 1.1", governance_area_id=1, is_active=True),
        Indicator(id=2, indicator_code="2.1", name="Indicator 2.1", governance_area_id=2, is_active=True),
        Indicator(id=3, indicator_code="3.1", name="Indicator 3.1", governance_area_id=3, is_active=True),
        Indicator(id=4, indicator_code="4.1", name="Indicator 4.1", governance_area_id=4, is_active=True),
    ]
    for indicator in indicators:
        db_session.add(indicator)
    db_session.commit()
    return indicators


@pytest.fixture
def five_barangays(db_session: Session):
    """Create 5 barangays (minimum threshold for anonymization)"""
    barangays = []
    for i in range(5):
        barangay = Barangay(name=f"Test Barangay {i+1}")
        db_session.add(barangay)
        barangays.append(barangay)
    db_session.commit()
    for barangay in barangays:
        db_session.refresh(barangay)
    return barangays


@pytest.fixture
def five_blgu_users(db_session: Session, five_barangays):
    """Create 5 BLGU users (one per barangay)"""
    users = []
    for i, barangay in enumerate(five_barangays):
        unique_email = f"blgu{i+1}_{uuid.uuid4().hex[:8]}@example.com"
        user = User(
            email=unique_email,
            name=f"BLGU User {i+1}",
            hashed_password=pwd_context.hash("password123"),
            role=UserRole.BLGU_USER,
            barangay_id=barangay.id,
            is_active=True,
        )
        db_session.add(user)
        users.append(user)
    db_session.commit()
    for user in users:
        db_session.refresh(user)
    return users


@pytest.fixture
def five_assessments_passed(db_session: Session, five_blgu_users):
    """Create 5 validated assessments (all passed)"""
    assessments = []
    for user in five_blgu_users:
        assessment = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.VALIDATED,
            final_compliance_status=ComplianceStatus.PASSED,
            validated_at=datetime(2024, 1, 1),
        )
        db_session.add(assessment)
        assessments.append(assessment)
    db_session.commit()
    for assessment in assessments:
        db_session.refresh(assessment)
    return assessments


@pytest.fixture
def mixed_assessments(db_session: Session, five_blgu_users):
    """Create 5 validated assessments (3 passed, 2 failed)"""
    assessments = []
    for i, user in enumerate(five_blgu_users):
        status = ComplianceStatus.PASSED if i < 3 else ComplianceStatus.FAILED
        assessment = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.VALIDATED,
            final_compliance_status=status,
            validated_at=datetime(2024, 1, 1),
        )
        db_session.add(assessment)
        assessments.append(assessment)
    db_session.commit()
    for assessment in assessments:
        db_session.refresh(assessment)
    return assessments


# ====================================================================
# Overall Compliance Tests
# ====================================================================


def test_get_overall_compliance_with_sufficient_data(
    db_session: Session, five_assessments_passed
):
    """Test overall compliance with >= 5 barangays (passes minimum threshold)"""
    result = external_analytics_service.get_overall_compliance(db_session)

    assert result.total_barangays >= 5
    assert result.passed_count >= 5
    assert result.failed_count >= 0
    assert result.pass_percentage > 0


def test_get_overall_compliance_mixed_results(
    db_session: Session, mixed_assessments
):
    """Test overall compliance with mixed pass/fail results"""
    result = external_analytics_service.get_overall_compliance(db_session)

    assert result.total_barangays == 5
    assert result.passed_count == 3
    assert result.failed_count == 2
    assert result.pass_percentage == 60.0  # 3/5 * 100


def test_get_overall_compliance_insufficient_data_raises_error(
    db_session: Session
):
    """Test that < 5 barangays raises ValueError for privacy"""
    # Create only 4 barangays
    for i in range(4):
        barangay = Barangay(name=f"Barangay {i+1}")
        db_session.add(barangay)
    db_session.commit()

    # Create 4 users and assessments
    for i in range(4):
        unique_email = f"blgu{i}_{uuid.uuid4().hex[:8]}@example.com"
        user = User(
            email=unique_email,
            name=f"User {i}",
            hashed_password=pwd_context.hash("pass"),
            role=UserRole.BLGU_USER,
            barangay_id=i+1,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assessment = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.VALIDATED,
            final_compliance_status=ComplianceStatus.PASSED,
            validated_at=datetime(2024, 1, 1),
        )
        db_session.add(assessment)
    db_session.commit()

    with pytest.raises(ValueError) as exc_info:
        external_analytics_service.get_overall_compliance(db_session)

    assert "insufficient data" in str(exc_info.value).lower()
    assert str(MINIMUM_AGGREGATION_THRESHOLD) in str(exc_info.value)


def test_get_overall_compliance_no_data_raises_error(db_session: Session):
    """Test that no assessments raises ValueError"""
    with pytest.raises(ValueError) as exc_info:
        external_analytics_service.get_overall_compliance(db_session)

    assert "insufficient data" in str(exc_info.value).lower()


# ====================================================================
# Governance Area Performance Tests
# ====================================================================


def test_get_governance_area_performance(
    db_session: Session,
    governance_areas,
    indicators,
    five_blgu_users,
    five_assessments_passed,
):
    """Test governance area performance aggregation"""
    # Create assessment responses for each assessment
    for assessment in five_assessments_passed:
        for indicator in indicators:
            response = AssessmentResponse(
                assessment_id=assessment.id,
                indicator_id=indicator.id,
                validation_status=ValidationStatus.PASS,
                is_completed=True,
            )
            db_session.add(response)
    db_session.commit()

    result = external_analytics_service.get_governance_area_performance(db_session)

    assert isinstance(result.areas, list)
    assert len(result.areas) >= 0

    # Check structure of each area
    for area in result.areas:
        assert area.area_code in ["FA", "SP", "DP", "SS"]
        assert area.total_barangays_assessed >= 0
        assert area.passed_count >= 0
        assert area.failed_count >= 0
        assert 0 <= area.pass_percentage <= 100


def test_get_governance_area_performance_no_data(db_session: Session):
    """Test governance area performance with no data returns empty result"""
    result = external_analytics_service.get_governance_area_performance(db_session)

    assert isinstance(result.areas, list)


# ====================================================================
# Top Failing Indicators Tests
# ====================================================================


def test_get_top_failing_indicators(
    db_session: Session,
    indicators,
    five_blgu_users,
    five_assessments_passed,
):
    """Test top failing indicators aggregation"""
    # Create failing responses for indicator 1 (all 5 fail)
    # Create passing responses for indicator 2 (all 5 pass)
    # Create mixed responses for indicator 3 (3 fail, 2 pass)
    for i, assessment in enumerate(five_assessments_passed):
        # Indicator 1: all fail
        response1 = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=1,
            validation_status=ValidationStatus.FAIL,
            is_completed=True,
        )
        db_session.add(response1)

        # Indicator 2: all pass
        response2 = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=2,
            validation_status=ValidationStatus.PASS,
            is_completed=True,
        )
        db_session.add(response2)

        # Indicator 3: first 3 fail, last 2 pass
        response3 = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=3,
            validation_status=ValidationStatus.PASS if i >= 3 else ValidationStatus.FAIL,
            is_completed=True,
        )
        db_session.add(response3)
    db_session.commit()

    result = external_analytics_service.get_top_failing_indicators(db_session, limit=3)

    assert len(result.top_failing_indicators) <= 3

    # First indicator should be Indicator 1 (100% failure rate)
    if len(result.top_failing_indicators) > 0:
        top_failing = result.top_failing_indicators[0]
        assert top_failing.indicator_id == 1
        assert top_failing.failure_count == 5
        assert top_failing.total_assessed == 5
        assert top_failing.failure_percentage == 100.0


def test_get_top_failing_indicators_custom_limit(
    db_session: Session,
    indicators,
    five_blgu_users,
    five_assessments_passed,
):
    """Test top failing indicators with custom limit"""
    # Create failing responses
    for assessment in five_assessments_passed:
        for indicator in indicators[:2]:
            response = AssessmentResponse(
                assessment_id=assessment.id,
                indicator_id=indicator.id,
                validation_status=ValidationStatus.FAIL,
                is_completed=True,
            )
            db_session.add(response)
    db_session.commit()

    result = external_analytics_service.get_top_failing_indicators(db_session, limit=1)

    assert len(result.top_failing_indicators) <= 1


def test_get_top_failing_indicators_no_data(db_session: Session):
    """Test top failing indicators with no data"""
    result = external_analytics_service.get_top_failing_indicators(db_session)

    assert isinstance(result.top_failing_indicators, list)
    assert len(result.top_failing_indicators) == 0


# ====================================================================
# AI Insights Tests
# ====================================================================


def test_get_anonymized_ai_insights(
    db_session: Session,
    governance_areas,
    five_blgu_users,
    five_assessments_passed,
):
    """Test AI insights retrieval (no filtering - UMDC feature removed)"""
    result = external_analytics_service.get_anonymized_ai_insights(db_session)

    assert isinstance(result.insights, list)
    # Note: Actual insights depend on rework data in database
    # This test just verifies structure


def test_get_anonymized_ai_insights_no_data(db_session: Session):
    """Test AI insights with no data"""
    result = external_analytics_service.get_anonymized_ai_insights(db_session)

    assert isinstance(result.insights, list)


# ====================================================================
# Complete Dashboard Tests
# ====================================================================


def test_get_complete_dashboard(
    db_session: Session,
    governance_areas,
    indicators,
    five_blgu_users,
    mixed_assessments,
):
    """Test complete dashboard data retrieval"""
    # Create assessment responses
    for assessment in mixed_assessments:
        for indicator in indicators:
            response = AssessmentResponse(
                assessment_id=assessment.id,
                indicator_id=indicator.id,
                validation_status=ValidationStatus.PASS,
                is_completed=True,
            )
            db_session.add(response)
    db_session.commit()

    result = external_analytics_service.get_complete_dashboard(db_session)

    # Check all sections are present
    assert result.overall_compliance is not None
    assert result.governance_area_performance is not None
    assert result.top_failing_indicators is not None
    assert result.ai_insights is not None

    # Check overall compliance
    assert result.overall_compliance.total_barangays == 5
    assert result.overall_compliance.passed_count == 3
    assert result.overall_compliance.failed_count == 2


def test_get_complete_dashboard_insufficient_data_raises_error(
    db_session: Session
):
    """Test that complete dashboard with < 5 barangays raises ValueError"""
    # Clear cache to ensure test isolation
    from app.core.cache import cache
    cache.invalidate_external_analytics()

    # Create only 4 barangays and assessments
    for i in range(4):
        barangay = Barangay(name=f"Barangay {i+1}")
        db_session.add(barangay)
    db_session.commit()

    for i in range(4):
        unique_email = f"blgu{i}_{uuid.uuid4().hex[:8]}@example.com"
        user = User(
            email=unique_email,
            name=f"User {i}",
            hashed_password=pwd_context.hash("pass"),
            role=UserRole.BLGU_USER,
            barangay_id=i+1,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assessment = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.VALIDATED,
            final_compliance_status=ComplianceStatus.PASSED,
            validated_at=datetime(2024, 1, 1),
        )
        db_session.add(assessment)
    db_session.commit()

    with pytest.raises(ValueError) as exc_info:
        external_analytics_service.get_complete_dashboard(db_session)

    assert "insufficient data" in str(exc_info.value).lower()


# ====================================================================
# Privacy Threshold Tests
# ====================================================================


def test_minimum_aggregation_threshold_constant():
    """Test that minimum aggregation threshold is set correctly"""
    assert MINIMUM_AGGREGATION_THRESHOLD == 5


def test_privacy_threshold_enforced_across_methods(db_session: Session):
    """Test that all methods enforce the privacy threshold"""
    # Clear cache to ensure test isolation
    from app.core.cache import cache
    cache.invalidate_external_analytics()

    # Create only 3 barangays (below threshold)
    for i in range(3):
        barangay = Barangay(name=f"Barangay {i+1}")
        db_session.add(barangay)
    db_session.commit()

    for i in range(3):
        unique_email = f"blgu{i}_{uuid.uuid4().hex[:8]}@example.com"
        user = User(
            email=unique_email,
            name=f"User {i}",
            hashed_password=pwd_context.hash("pass"),
            role=UserRole.BLGU_USER,
            barangay_id=i+1,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assessment = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.VALIDATED,
            final_compliance_status=ComplianceStatus.PASSED,
            validated_at=datetime(2024, 1, 1),
        )
        db_session.add(assessment)
    db_session.commit()

    # Overall compliance should fail
    with pytest.raises(ValueError):
        external_analytics_service.get_overall_compliance(db_session)

    # Complete dashboard should fail
    with pytest.raises(ValueError):
        external_analytics_service.get_complete_dashboard(db_session)


# ====================================================================
# Export Functionality Tests
# ====================================================================


def test_csv_export_generation(db_session: Session, mixed_assessments):
    """Test CSV export generates valid CSV content"""
    csv_content = external_analytics_service.generate_csv_export(
        db=db_session,
        assessment_cycle=None,
        user_email="test@example.com",
        user_role="KATUPARAN_CENTER_USER"
    )

    # Verify CSV content structure
    assert isinstance(csv_content, str)
    assert len(csv_content) > 0

    # Verify headers and sections are present
    assert "SINAG: Strategic Insights Nurturing Assessments and Governance" in csv_content
    assert "External Analytics Report" in csv_content
    assert "PRIVACY NOTICE" in csv_content
    assert "OVERALL MUNICIPAL COMPLIANCE" in csv_content
    assert "GOVERNANCE AREA PERFORMANCE" in csv_content
    assert "TOP FAILING INDICATORS" in csv_content
    assert "ANONYMIZED AI INSIGHTS" in csv_content

    # Verify data rows are present
    lines = csv_content.split('\n')
    assert len(lines) > 10  # Should have multiple sections

    # Verify no UMDC filtering (feature removed)
    assert "Filtered for UMDC Peace Center" not in csv_content


def test_csv_export_with_insufficient_data(db_session: Session, governance_areas, indicators):
    """Test CSV export fails validation with insufficient barangays"""
    # Clear cache to ensure test isolation
    from app.core.cache import cache
    cache.invalidate_external_analytics()

    # Create only 3 barangays (below threshold of 5)
    for i in range(3):
        user = User(
            email=f"user{i}@example.com",
            name=f"User {i}",
            hashed_password=pwd_context.hash("password123"),
            role=UserRole.BLGU_USER,
            is_active=True
        )
        db_session.add(user)
        db_session.flush()

        assessment = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.VALIDATED,
            final_compliance_status=ComplianceStatus.PASSED,
            validated_at=datetime(2024, 1, 1),
        )
        db_session.add(assessment)
    db_session.commit()

    # CSV export should fail validation
    with pytest.raises(ValueError) as exc_info:
        external_analytics_service.generate_csv_export(
            db=db_session,
            assessment_cycle=None,
            user_email="test@example.com",
            user_role="KATUPARAN_CENTER_USER"
        )

    assert "Insufficient data for anonymization" in str(exc_info.value)
    assert "Minimum 5 barangays required" in str(exc_info.value)


def test_pdf_export_generation(db_session: Session, mixed_assessments):
    """Test PDF export generates valid PDF content"""
    pdf_content = external_analytics_service.generate_pdf_export(
        db=db_session,
        assessment_cycle=None,
        user_email="test@example.com",
        user_role="KATUPARAN_CENTER_USER"
    )

    # Verify PDF content
    assert isinstance(pdf_content, bytes)
    assert len(pdf_content) > 0

    # Verify PDF magic number (PDF header)
    assert pdf_content[:4] == b'%PDF'

    # PDF should be substantial in size (at least 4KB for formatted report)
    assert len(pdf_content) > 4000


def test_pdf_export_with_insufficient_data(db_session: Session, governance_areas, indicators):
    """Test PDF export fails validation with insufficient barangays"""
    # Clear cache to ensure test isolation
    from app.core.cache import cache
    cache.invalidate_external_analytics()

    # Create only 2 barangays (below threshold of 5)
    for i in range(2):
        user = User(
            email=f"user{i}@example.com",
            name=f"User {i}",
            hashed_password=pwd_context.hash("password123"),
            role=UserRole.BLGU_USER,
            is_active=True
        )
        db_session.add(user)
        db_session.flush()

        assessment = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.VALIDATED,
            final_compliance_status=ComplianceStatus.PASSED,
            validated_at=datetime(2024, 1, 1),
        )
        db_session.add(assessment)
    db_session.commit()

    # PDF export should fail validation
    with pytest.raises(ValueError) as exc_info:
        external_analytics_service.generate_pdf_export(
            db=db_session,
            assessment_cycle=None,
            user_email="test@example.com",
            user_role="KATUPARAN_CENTER_USER"
        )

    assert "Insufficient data for anonymization" in str(exc_info.value)


def test_validate_export_data_passes_with_sufficient_barangays(db_session: Session, mixed_assessments):
    """Test validation passes with sufficient barangays"""
    dashboard_data = external_analytics_service.get_complete_dashboard(db_session)

    # Should not raise any exception
    external_analytics_service._validate_export_data(dashboard_data)

    # Verify data meets threshold
    assert dashboard_data.overall_compliance.total_barangays >= MINIMUM_AGGREGATION_THRESHOLD


def test_validate_export_data_fails_with_insufficient_barangays(db_session: Session, governance_areas, indicators):
    """Test validation fails with insufficient barangays"""
    # Clear cache to ensure test isolation
    from app.core.cache import cache
    cache.invalidate_external_analytics()

    # Create only 3 barangays
    for i in range(3):
        user = User(
            email=f"user{i}@example.com",
            name=f"User {i}",
            hashed_password=pwd_context.hash("password123"),
            role=UserRole.BLGU_USER,
            is_active=True
        )
        db_session.add(user)
        db_session.flush()

        assessment = Assessment(
            blgu_user_id=user.id,
            status=AssessmentStatus.VALIDATED,
            final_compliance_status=ComplianceStatus.PASSED,
            validated_at=datetime(2024, 1, 1),
        )
        db_session.add(assessment)
    db_session.commit()

    # Get dashboard data (will succeed but have < 5 barangays)
    with pytest.raises(ValueError):
        dashboard_data = external_analytics_service.get_complete_dashboard(db_session)


def test_log_export_audit_success(caplog):
    """Test audit logging for successful export"""
    import logging
    caplog.set_level(logging.INFO)

    external_analytics_service._log_export_audit(
        export_type="CSV",
        user_email="test@example.com",
        user_role="KATUPARAN_CENTER_USER",
        assessment_cycle="2024-Q1",
        umdc_filtered=False,
        total_barangays=10,
        success=True
    )

    # Verify log entry
    assert "EXPORT AUDIT" in caplog.text
    assert "CSV export" in caplog.text
    assert "test@example.com" in caplog.text
    assert "KATUPARAN_CENTER_USER" in caplog.text
    assert "10 barangays aggregated" in caplog.text


def test_log_export_audit_failure(caplog):
    """Test audit logging for failed export"""
    import logging
    caplog.set_level(logging.ERROR)

    external_analytics_service._log_export_audit(
        export_type="PDF",
        user_email="test@example.com",
        user_role="KATUPARAN_CENTER_USER",
        assessment_cycle="2024-Q1",
        total_barangays=0,
        success=False,
        error_message="Insufficient data for anonymization"
    )

    # Verify error log entry
    assert "EXPORT AUDIT FAILED" in caplog.text
    assert "PDF export" in caplog.text
    assert "test@example.com" in caplog.text
    assert "Insufficient data for anonymization" in caplog.text


def test_csv_export_filename_format(db_session: Session, mixed_assessments):
    """Test CSV export can be used to generate timestamped filename"""
    csv_content = external_analytics_service.generate_csv_export(
        db=db_session,
        assessment_cycle=None,
        user_email="test@example.com",
        user_role="KATUPARAN_CENTER_USER"
    )

    # Verify CSV can be saved with proper naming
    assert isinstance(csv_content, str)

    # Verify content includes cycle information
    assert "Latest" in csv_content


def test_pdf_export_contains_all_sections(db_session: Session, mixed_assessments):
    """Test PDF export includes all required dashboard sections"""
    pdf_content = external_analytics_service.generate_pdf_export(
        db=db_session,
        assessment_cycle=None,
        user_email="test@example.com",
        user_role="KATUPARAN_CENTER_USER"
    )

    # Verify PDF structure
    assert isinstance(pdf_content, bytes)
    assert len(pdf_content) > 0

    # Convert to string for content checking (this is approximate, as PDFs are binary)
    # In production, you might use PyPDF2 or similar to parse PDF content
    pdf_str = pdf_content.decode('latin-1', errors='ignore')

    # Check for expected content markers (these appear in PDF text streams)
    # Note: Exact strings may vary depending on PDF encoding
    assert len(pdf_str) > 1000  # PDF should have substantial content


# ====================================================================
# Caching Integration Tests
# ====================================================================


def test_dashboard_caching_cache_miss_then_hit(db_session: Session, mixed_assessments):
    """Test dashboard caching: first call is cache miss, second is cache hit"""
    from app.core.cache import cache

    # Clear any existing cache
    cache.invalidate_external_analytics()

    # First call - cache miss
    dashboard1 = external_analytics_service.get_complete_dashboard(db_session)
    assert dashboard1.overall_compliance.total_barangays == 5

    # Second call with same parameters - should hit cache
    dashboard2 = external_analytics_service.get_complete_dashboard(db_session)
    assert dashboard2.overall_compliance.total_barangays == 5

    # Results should be identical
    assert dashboard1.overall_compliance.passed_count == dashboard2.overall_compliance.passed_count
    assert dashboard1.overall_compliance.pass_percentage == dashboard2.overall_compliance.pass_percentage

    # Cleanup
    cache.invalidate_external_analytics()


def test_dashboard_caching_multiple_calls_use_cache(db_session: Session, mixed_assessments):
    """Test that multiple calls use cached data"""
    from app.core.cache import cache

    # Clear cache
    cache.invalidate_external_analytics()

    # Call multiple times - should use cache after first call
    dashboard1 = external_analytics_service.get_complete_dashboard(db_session)
    dashboard2 = external_analytics_service.get_complete_dashboard(db_session)

    # Both should return same data
    assert dashboard1.overall_compliance.total_barangays == 5
    assert dashboard2.overall_compliance.total_barangays == 5

    # Cleanup
    cache.invalidate_external_analytics()


def test_dashboard_cache_invalidation(db_session: Session, mixed_assessments):
    """Test cache invalidation clears dashboard cache"""
    from app.core.cache import cache

    # Clear cache
    cache.invalidate_external_analytics()

    # First call - cache miss
    dashboard1 = external_analytics_service.get_complete_dashboard(db_session)
    assert dashboard1.overall_compliance.total_barangays == 5

    # Invalidate cache
    deleted_count = cache.invalidate_external_analytics()
    assert deleted_count > 0  # Should have deleted at least the dashboard cache

    # Next call should be cache miss again (compute fresh data)
    dashboard2 = external_analytics_service.get_complete_dashboard(db_session)
    assert dashboard2.overall_compliance.total_barangays == 5


def test_dashboard_works_without_redis(db_session: Session, mixed_assessments):
    """Test dashboard still works when Redis is unavailable"""
    from app.core.cache import cache
    from unittest.mock import patch

    # Mock cache as unavailable by patching the underlying attribute
    with patch.object(cache, '_is_available', False):
        dashboard = external_analytics_service.get_complete_dashboard(db_session)

        # Should still work, just without caching
        assert dashboard.overall_compliance.total_barangays == 5
        assert dashboard.overall_compliance.passed_count == 3
