"""
Tests for deadline management service (app/services/deadline_service.py)

This test suite covers:
- Assessment cycle creation and management
- Deadline override operations
- Deadline status tracking
- CSV export functionality
"""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.enums import AssessmentStatus, UserRole
from app.db.models.admin import AssessmentCycle
from app.db.models.assessment import Assessment
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from app.services.deadline_service import DeadlineStatusType, deadline_service

# ====================================================================
# Test Fixtures
# ====================================================================


@pytest.fixture
def sample_barangay(db_session: Session):
    """Create a sample barangay for testing"""
    barangay = Barangay(name="Test Barangay Alpha")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)
    return barangay


@pytest.fixture
def sample_barangay_2(db_session: Session):
    """Create a second sample barangay for testing"""
    barangay = Barangay(name="Test Barangay Beta")
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)
    return barangay


@pytest.fixture
def sample_governance_area(db_session: Session):
    """Create a sample governance area for testing"""
    from app.db.enums import AreaType

    area = GovernanceArea(
        name="Test Governance Area",
        code="TG",
        area_type=AreaType.CORE,
    )
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    return area


@pytest.fixture
def sample_indicator(db_session: Session, sample_governance_area):
    """Create a sample indicator for testing"""
    indicator = Indicator(
        name="Test Indicator 1",
        description="Test indicator for deadline management",
        governance_area_id=sample_governance_area.id,
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)
    return indicator


@pytest.fixture
def sample_indicator_2(db_session: Session, sample_governance_area):
    """Create a second sample indicator for testing"""
    indicator = Indicator(
        name="Test Indicator 2",
        description="Second test indicator",
        governance_area_id=sample_governance_area.id,
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)
    return indicator


@pytest.fixture
def admin_user(db_session: Session):
    """Create an admin user for testing"""
    user = User(
        email="admin@test.com",
        name="Test Admin",
        hashed_password=get_password_hash("adminpass123"),
        role=UserRole.MLGOO_DILG,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def blgu_user(db_session: Session, sample_barangay):
    """Create a BLGU user for testing"""
    user = User(
        email="blgu@test.com",
        name="Test BLGU User",
        hashed_password=get_password_hash("blgupass123"),
        role=UserRole.BLGU_USER,
        barangay_id=sample_barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_cycle(db_session: Session):
    """Create a sample assessment cycle"""
    now = datetime.now(UTC)
    cycle = AssessmentCycle(
        name="Test Cycle 2025",
        year=2025,
        phase1_deadline=now + timedelta(days=30),
        rework_deadline=now + timedelta(days=45),
        phase2_deadline=now + timedelta(days=60),
        calibration_deadline=now + timedelta(days=90),
        is_active=True,
    )
    db_session.add(cycle)
    db_session.commit()
    db_session.refresh(cycle)
    return cycle


# ====================================================================
# Assessment Cycle Creation Tests
# ====================================================================


def test_create_assessment_cycle_success(db_session: Session):
    """Test creating a valid assessment cycle"""
    now = datetime.now(UTC)

    cycle = deadline_service.create_assessment_cycle(
        db=db_session,
        name="SGLGB 2025",
        year=2025,
        phase1_deadline=now + timedelta(days=30),
        rework_deadline=now + timedelta(days=45),
        phase2_deadline=now + timedelta(days=60),
        calibration_deadline=now + timedelta(days=90),
    )

    assert cycle.id is not None
    assert cycle.name == "SGLGB 2025"
    assert cycle.year == 2025
    assert cycle.is_active is True


def test_create_assessment_cycle_deactivates_existing(db_session: Session):
    """Test that creating a new cycle deactivates the previous active cycle"""
    now = datetime.now(UTC)

    # Create first cycle
    cycle1 = deadline_service.create_assessment_cycle(
        db=db_session,
        name="SGLGB 2024",
        year=2024,
        phase1_deadline=now + timedelta(days=30),
        rework_deadline=now + timedelta(days=45),
        phase2_deadline=now + timedelta(days=60),
        calibration_deadline=now + timedelta(days=90),
    )

    assert cycle1.is_active is True

    # Create second cycle
    cycle2 = deadline_service.create_assessment_cycle(
        db=db_session,
        name="SGLGB 2025",
        year=2025,
        phase1_deadline=now + timedelta(days=30),
        rework_deadline=now + timedelta(days=45),
        phase2_deadline=now + timedelta(days=60),
        calibration_deadline=now + timedelta(days=90),
    )

    # Refresh cycle1 to get updated state
    db_session.refresh(cycle1)

    assert cycle1.is_active is False
    assert cycle2.is_active is True


def test_create_assessment_cycle_invalid_chronology(db_session: Session):
    """Test that creating a cycle with invalid deadline order raises ValueError"""
    now = datetime.now(UTC)

    with pytest.raises(ValueError, match="chronological order"):
        deadline_service.create_assessment_cycle(
            db=db_session,
            name="Invalid Cycle",
            year=2025,
            phase1_deadline=now + timedelta(days=60),  # Wrong order
            rework_deadline=now + timedelta(days=30),
            phase2_deadline=now + timedelta(days=45),
            calibration_deadline=now + timedelta(days=90),
        )


# ====================================================================
# Get Active Cycle Tests
# ====================================================================


def test_get_active_cycle_success(db_session: Session, sample_cycle):
    """Test getting the active assessment cycle"""
    active_cycle = deadline_service.get_active_cycle(db_session)

    assert active_cycle is not None
    assert active_cycle.id == sample_cycle.id
    assert active_cycle.is_active is True


def test_get_active_cycle_no_active(db_session: Session):
    """Test getting active cycle when none exists"""
    active_cycle = deadline_service.get_active_cycle(db_session)

    assert active_cycle is None


# ====================================================================
# Update Cycle Tests
# ====================================================================


def test_update_cycle_name_and_year(db_session: Session, sample_cycle):
    """Test updating cycle name and year"""
    updated_cycle = deadline_service.update_cycle(
        db=db_session,
        cycle_id=sample_cycle.id,
        name="Updated Cycle Name",
        year=2026,
    )

    assert updated_cycle.name == "Updated Cycle Name"
    assert updated_cycle.year == 2026
    # Deadlines should remain unchanged
    assert updated_cycle.phase1_deadline == sample_cycle.phase1_deadline


def test_update_cycle_deadlines_before_start(db_session: Session):
    """Test updating deadlines for a cycle that hasn't started"""
    now = datetime.now(UTC)
    future = now + timedelta(days=100)

    # Create cycle with deadlines in the future
    cycle = deadline_service.create_assessment_cycle(
        db=db_session,
        name="Future Cycle",
        year=2026,
        phase1_deadline=future + timedelta(days=30),
        rework_deadline=future + timedelta(days=45),
        phase2_deadline=future + timedelta(days=60),
        calibration_deadline=future + timedelta(days=90),
    )

    # Update deadlines
    updated_cycle = deadline_service.update_cycle(
        db=db_session,
        cycle_id=cycle.id,
        phase1_deadline=future + timedelta(days=35),
        rework_deadline=future + timedelta(days=50),
        phase2_deadline=future + timedelta(days=65),
        calibration_deadline=future + timedelta(days=95),
    )

    # Compare timestamps, converting both to UTC and removing microseconds
    expected_deadline = future + timedelta(days=35)
    assert updated_cycle.phase1_deadline.replace(microsecond=0) == expected_deadline.replace(
        tzinfo=None, microsecond=0
    )


def test_update_cycle_deadlines_after_start_fails(db_session: Session):
    """Test that updating deadlines after cycle starts raises ValueError"""
    now = datetime.now(UTC)
    past = now - timedelta(days=10)

    # Create cycle that has already started (phase1_deadline is in the past)
    cycle = AssessmentCycle(
        name="Started Cycle",
        year=2025,
        phase1_deadline=past,  # This is in the past, so cycle has started
        rework_deadline=now + timedelta(days=15),
        phase2_deadline=now + timedelta(days=30),
        calibration_deadline=now + timedelta(days=60),
        is_active=True,
    )
    db_session.add(cycle)
    db_session.commit()
    db_session.refresh(cycle)

    # Attempt to update deadlines should fail because phase1 has already passed
    with pytest.raises(ValueError, match="already started"):
        deadline_service.update_cycle(
            db=db_session,
            cycle_id=cycle.id,
            phase1_deadline=now + timedelta(days=40),
            rework_deadline=now + timedelta(days=55),
            phase2_deadline=now + timedelta(days=70),
            calibration_deadline=now + timedelta(days=100),
        )


def test_update_cycle_not_found(db_session: Session):
    """Test updating non-existent cycle raises ValueError"""
    with pytest.raises(ValueError, match="not found"):
        deadline_service.update_cycle(
            db=db_session,
            cycle_id=99999,
            name="Invalid",
        )


# ====================================================================
# Deadline Override Tests
# ====================================================================


def test_apply_deadline_override_success(
    db_session: Session,
    sample_cycle,
    sample_barangay,
    sample_indicator,
    admin_user,
):
    """Test successfully applying a deadline override"""
    new_deadline = datetime.now(UTC) + timedelta(days=100)

    override = deadline_service.apply_deadline_override(
        db=db_session,
        cycle_id=sample_cycle.id,
        barangay_id=sample_barangay.id,
        indicator_id=sample_indicator.id,
        new_deadline=new_deadline,
        reason="Extension requested due to natural disaster",
        created_by_user_id=admin_user.id,
    )

    assert override.id is not None
    assert override.cycle_id == sample_cycle.id
    assert override.barangay_id == sample_barangay.id
    assert override.indicator_id == sample_indicator.id
    # Compare timestamps, converting both to UTC and removing microseconds
    assert override.new_deadline.replace(microsecond=0) == new_deadline.replace(
        tzinfo=None, microsecond=0
    )
    assert override.reason == "Extension requested due to natural disaster"
    assert override.created_by == admin_user.id


def test_apply_deadline_override_past_deadline_fails(
    db_session: Session,
    sample_cycle,
    sample_barangay,
    sample_indicator,
    admin_user,
):
    """Test that setting deadline in the past raises ValueError"""
    past_deadline = datetime.now(UTC) - timedelta(days=1)

    with pytest.raises(ValueError, match="must be in the future"):
        deadline_service.apply_deadline_override(
            db=db_session,
            cycle_id=sample_cycle.id,
            barangay_id=sample_barangay.id,
            indicator_id=sample_indicator.id,
            new_deadline=past_deadline,
            reason="Invalid past deadline",
            created_by_user_id=admin_user.id,
        )


def test_apply_deadline_override_invalid_cycle(
    db_session: Session,
    sample_barangay,
    sample_indicator,
    admin_user,
):
    """Test that invalid cycle ID raises ValueError"""
    new_deadline = datetime.now(UTC) + timedelta(days=100)

    with pytest.raises(ValueError, match="cycle.*not found"):
        deadline_service.apply_deadline_override(
            db=db_session,
            cycle_id=99999,
            barangay_id=sample_barangay.id,
            indicator_id=sample_indicator.id,
            new_deadline=new_deadline,
            reason="Invalid cycle",
            created_by_user_id=admin_user.id,
        )


def test_apply_deadline_override_invalid_barangay(
    db_session: Session,
    sample_cycle,
    sample_indicator,
    admin_user,
):
    """Test that invalid barangay ID raises ValueError"""
    new_deadline = datetime.now(UTC) + timedelta(days=100)

    with pytest.raises(ValueError, match="Barangay.*not found"):
        deadline_service.apply_deadline_override(
            db=db_session,
            cycle_id=sample_cycle.id,
            barangay_id=99999,
            indicator_id=sample_indicator.id,
            new_deadline=new_deadline,
            reason="Invalid barangay",
            created_by_user_id=admin_user.id,
        )


def test_apply_deadline_override_invalid_indicator(
    db_session: Session,
    sample_cycle,
    sample_barangay,
    admin_user,
):
    """Test that invalid indicator ID raises ValueError"""
    new_deadline = datetime.now(UTC) + timedelta(days=100)

    with pytest.raises(ValueError, match="Indicator.*not found"):
        deadline_service.apply_deadline_override(
            db=db_session,
            cycle_id=sample_cycle.id,
            barangay_id=sample_barangay.id,
            indicator_id=99999,
            new_deadline=new_deadline,
            reason="Invalid indicator",
            created_by_user_id=admin_user.id,
        )


# ====================================================================
# Get Deadline Overrides Tests
# ====================================================================


def test_get_deadline_overrides_no_filters(
    db_session: Session,
    sample_cycle,
    sample_barangay,
    sample_indicator,
    admin_user,
):
    """Test getting all deadline overrides without filters"""
    # Create multiple overrides
    new_deadline = datetime.now(UTC) + timedelta(days=100)

    override1 = deadline_service.apply_deadline_override(
        db=db_session,
        cycle_id=sample_cycle.id,
        barangay_id=sample_barangay.id,
        indicator_id=sample_indicator.id,
        new_deadline=new_deadline,
        reason="First override",
        created_by_user_id=admin_user.id,
    )

    overrides = deadline_service.get_deadline_overrides(db=db_session)

    assert len(overrides) >= 1
    assert any(o.id == override1.id for o in overrides)


def test_get_deadline_overrides_filter_by_cycle(
    db_session: Session,
    sample_cycle,
    sample_barangay,
    sample_indicator,
    admin_user,
):
    """Test filtering overrides by cycle ID"""
    new_deadline = datetime.now(UTC) + timedelta(days=100)

    override = deadline_service.apply_deadline_override(
        db=db_session,
        cycle_id=sample_cycle.id,
        barangay_id=sample_barangay.id,
        indicator_id=sample_indicator.id,
        new_deadline=new_deadline,
        reason="Cycle filter test",
        created_by_user_id=admin_user.id,
    )

    overrides = deadline_service.get_deadline_overrides(
        db=db_session,
        cycle_id=sample_cycle.id,
    )

    assert len(overrides) >= 1
    assert all(o.cycle_id == sample_cycle.id for o in overrides)


def test_get_deadline_overrides_filter_by_barangay(
    db_session: Session,
    sample_cycle,
    sample_barangay,
    sample_barangay_2,
    sample_indicator,
    admin_user,
):
    """Test filtering overrides by barangay ID"""
    new_deadline = datetime.now(UTC) + timedelta(days=100)

    # Create override for barangay 1
    override1 = deadline_service.apply_deadline_override(
        db=db_session,
        cycle_id=sample_cycle.id,
        barangay_id=sample_barangay.id,
        indicator_id=sample_indicator.id,
        new_deadline=new_deadline,
        reason="Barangay 1 override",
        created_by_user_id=admin_user.id,
    )

    # Create override for barangay 2
    override2 = deadline_service.apply_deadline_override(
        db=db_session,
        cycle_id=sample_cycle.id,
        barangay_id=sample_barangay_2.id,
        indicator_id=sample_indicator.id,
        new_deadline=new_deadline,
        reason="Barangay 2 override",
        created_by_user_id=admin_user.id,
    )

    # Filter by barangay 1
    overrides = deadline_service.get_deadline_overrides(
        db=db_session,
        barangay_id=sample_barangay.id,
    )

    assert len(overrides) >= 1
    assert all(o.barangay_id == sample_barangay.id for o in overrides)
    assert override1.id in [o.id for o in overrides]
    assert override2.id not in [o.id for o in overrides]


def test_get_deadline_overrides_filter_by_indicator(
    db_session: Session,
    sample_cycle,
    sample_barangay,
    sample_indicator,
    sample_indicator_2,
    admin_user,
):
    """Test filtering overrides by indicator ID"""
    new_deadline = datetime.now(UTC) + timedelta(days=100)

    # Create override for indicator 1
    override1 = deadline_service.apply_deadline_override(
        db=db_session,
        cycle_id=sample_cycle.id,
        barangay_id=sample_barangay.id,
        indicator_id=sample_indicator.id,
        new_deadline=new_deadline,
        reason="Indicator 1 override",
        created_by_user_id=admin_user.id,
    )

    # Create override for indicator 2
    override2 = deadline_service.apply_deadline_override(
        db=db_session,
        cycle_id=sample_cycle.id,
        barangay_id=sample_barangay.id,
        indicator_id=sample_indicator_2.id,
        new_deadline=new_deadline,
        reason="Indicator 2 override",
        created_by_user_id=admin_user.id,
    )

    # Filter by indicator 1
    overrides = deadline_service.get_deadline_overrides(
        db=db_session,
        indicator_id=sample_indicator.id,
    )

    assert len(overrides) >= 1
    assert all(o.indicator_id == sample_indicator.id for o in overrides)
    assert override1.id in [o.id for o in overrides]
    assert override2.id not in [o.id for o in overrides]


# ====================================================================
# CSV Export Tests
# ====================================================================


def test_export_overrides_to_csv_success(
    db_session: Session,
    sample_cycle,
    sample_barangay,
    sample_indicator,
    admin_user,
):
    """Test exporting deadline overrides to CSV"""
    new_deadline = datetime.now(UTC) + timedelta(days=100)

    override = deadline_service.apply_deadline_override(
        db=db_session,
        cycle_id=sample_cycle.id,
        barangay_id=sample_barangay.id,
        indicator_id=sample_indicator.id,
        new_deadline=new_deadline,
        reason="CSV export test",
        created_by_user_id=admin_user.id,
    )

    csv_output = deadline_service.export_overrides_to_csv(db=db_session)

    assert csv_output is not None
    assert "Override ID" in csv_output
    assert "Barangay Name" in csv_output
    assert "Indicator Name" in csv_output
    assert sample_barangay.name in csv_output
    assert sample_indicator.name in csv_output
    assert admin_user.email in csv_output


def test_export_overrides_to_csv_with_filters(
    db_session: Session,
    sample_cycle,
    sample_barangay,
    sample_indicator,
    admin_user,
):
    """Test exporting filtered overrides to CSV"""
    new_deadline = datetime.now(UTC) + timedelta(days=100)

    override = deadline_service.apply_deadline_override(
        db=db_session,
        cycle_id=sample_cycle.id,
        barangay_id=sample_barangay.id,
        indicator_id=sample_indicator.id,
        new_deadline=new_deadline,
        reason="Filtered CSV export test",
        created_by_user_id=admin_user.id,
    )

    csv_output = deadline_service.export_overrides_to_csv(
        db=db_session,
        cycle_id=sample_cycle.id,
        barangay_id=sample_barangay.id,
    )

    assert csv_output is not None
    assert sample_barangay.name in csv_output


def test_export_overrides_to_csv_empty(db_session: Session):
    """Test exporting CSV when no overrides exist"""
    csv_output = deadline_service.export_overrides_to_csv(db=db_session)

    # Should still have headers
    assert csv_output is not None
    assert "Override ID" in csv_output


# ====================================================================
# Deadline Status Tests
# ====================================================================


def test_get_deadline_status_basic(
    db_session: Session,
    sample_cycle,
    sample_barangay,
):
    """Test getting basic deadline status"""
    status_results = deadline_service.get_deadline_status(db=db_session)

    assert len(status_results) >= 1
    assert any(s["barangay_id"] == sample_barangay.id for s in status_results)


def test_determine_phase_status_pending(db_session: Session, sample_cycle):
    """Test phase status when deadline hasn't passed and no submission"""
    now = datetime.now(UTC)
    future_deadline = now + timedelta(days=30)

    status = deadline_service._determine_phase_status(
        assessments=[],
        deadline=future_deadline,
        now=now,
        phase="phase1",
    )

    assert status["status"] == DeadlineStatusType.PENDING.value


def test_determine_phase_status_overdue(db_session: Session, sample_cycle):
    """Test phase status when deadline passed and no submission"""
    now = datetime.now(UTC)
    past_deadline = now - timedelta(days=10)

    status = deadline_service._determine_phase_status(
        assessments=[],
        deadline=past_deadline,
        now=now,
        phase="phase1",
    )

    assert status["status"] == DeadlineStatusType.OVERDUE.value


@pytest.mark.skip(reason="Requires full Assessment submission workflow not yet implemented")
def test_determine_phase_status_submitted_on_time(
    db_session: Session,
    sample_cycle,
    blgu_user,
    sample_indicator,
):
    """Test phase status when submitted before deadline

    NOTE: This test is skipped because it requires the full Assessment submission
    workflow to be implemented. The Assessment model doesn't directly link to indicators;
    that relationship is through AssessmentResponse. Once the assessment submission
    feature is complete, this test can be re-enabled with proper fixtures.
    """
    now = datetime.now(UTC)
    deadline = now + timedelta(days=30)
    submitted_at = now - timedelta(days=5)

    # Create a submitted assessment
    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        indicator_id=sample_indicator.id,
        status=AssessmentStatus.SUBMITTED_FOR_REVIEW,
        submitted_at=submitted_at,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    status = deadline_service._determine_phase_status(
        assessments=[assessment],
        deadline=deadline,
        now=now,
        phase="phase1",
    )

    assert status["status"] == DeadlineStatusType.SUBMITTED_ON_TIME.value


@pytest.mark.skip(reason="Requires full Assessment submission workflow not yet implemented")
def test_determine_phase_status_submitted_late(
    db_session: Session,
    sample_cycle,
    blgu_user,
    sample_indicator,
):
    """Test phase status when submitted after deadline

    NOTE: This test is skipped because it requires the full Assessment submission
    workflow to be implemented. The Assessment model doesn't directly link to indicators;
    that relationship is through AssessmentResponse. Once the assessment submission
    feature is complete, this test can be re-enabled with proper fixtures.
    """
    now = datetime.now(UTC)
    deadline = now - timedelta(days=10)
    submitted_at = now - timedelta(days=5)

    # Create a late submission
    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        indicator_id=sample_indicator.id,
        status=AssessmentStatus.SUBMITTED_FOR_REVIEW,
        submitted_at=submitted_at,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    status = deadline_service._determine_phase_status(
        assessments=[assessment],
        deadline=deadline,
        now=now,
        phase="phase1",
    )

    assert status["status"] == DeadlineStatusType.SUBMITTED_LATE.value
