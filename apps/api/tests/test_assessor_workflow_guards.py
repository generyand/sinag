from datetime import datetime

from fastapi.testclient import TestClient  # type: ignore[reportMissingImports]

from app.api import deps
from app.db.base import SessionLocal
from app.db.enums import AreaType, AssessmentStatus, UserRole, ValidationStatus
from app.db.models import (
    Assessment,
    AssessmentResponse,
    GovernanceArea,
    Indicator,
    User,
)
from main import app


def override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[deps.get_db] = override_get_db


def seed_assessment(
    db,
    status=AssessmentStatus.SUBMITTED_FOR_REVIEW,
    rework_count=0,
    reviewed=True,
    has_fail=False,
):
    import time

    timestamp = int(time.time() * 1000000)  # microseconds for uniqueness

    # Create governance area first
    gov_area = GovernanceArea(
        name=f"Test Governance Area {timestamp}",
        area_type=AreaType.CORE,
    )
    db.add(gov_area)
    db.flush()

    assessor = User(
        email=f"assessor2_{timestamp}@example.com",
        name="Assessor2",
        role=UserRole.ASSESSOR,
        hashed_password="hashed_password",
        is_active=True,
    )
    blgu = User(
        email=f"blgu2_{timestamp}@example.com",
        name="BLGU2",
        role=UserRole.BLGU_USER,
        hashed_password="hashed_password",
        is_active=True,
    )
    db.add_all([assessor, blgu])
    db.flush()

    ind = Indicator(
        name=f"Ind A {timestamp}",
        description="",
        form_schema={"type": "object", "properties": {}},
        governance_area_id=gov_area.id,
    )
    db.add(ind)
    db.flush()

    a = Assessment(
        blgu_user_id=blgu.id,
        status=status,
        rework_count=rework_count,
        submitted_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(a)
    db.flush()

    r = AssessmentResponse(
        assessment_id=a.id,
        indicator_id=ind.id,
        response_data={},
        is_completed=False,
        requires_rework=False,
        validation_status=(
            ValidationStatus.FAIL if has_fail else (ValidationStatus.PASS if reviewed else None)
        ),
    )
    db.add(r)
    db.commit()
    return assessor, a


def test_rework_only_allowed_once_and_requires_fail_and_reviewed():
    client = TestClient(app)

    # Test 1: First rework allowed
    with next(override_get_db()) as db:
        assessor, a = seed_assessment(
            db,
            status=AssessmentStatus.SUBMITTED_FOR_REVIEW,
            rework_count=0,
            reviewed=True,
            has_fail=True,
        )
        assessment_id = a.id

        # Override dependencies
        def _override_current_area_assessor_user():
            return assessor

        def _override_get_db():
            try:
                yield db
            finally:
                pass

        client.app.dependency_overrides[deps.get_current_area_assessor_user_http] = (
            _override_current_area_assessor_user
        )
        client.app.dependency_overrides[deps.get_db] = _override_get_db

        r1 = client.post(f"/api/v1/assessor/assessments/{assessment_id}/rework")
        assert r1.status_code in (200, 201)

        # Second rework blocked (same assessment)
        r2 = client.post(f"/api/v1/assessor/assessments/{assessment_id}/rework")
        assert r2.status_code == 400

        # Clear overrides
        client.app.dependency_overrides.clear()

    # Test 2: Fresh assessment with no Fail should block rework
    with next(override_get_db()) as db:
        assessor2, a2 = seed_assessment(
            db,
            status=AssessmentStatus.SUBMITTED_FOR_REVIEW,
            rework_count=0,
            reviewed=True,
            has_fail=False,
        )
        assessment_id2 = a2.id

        def _override_current_area_assessor_user2():
            return assessor2

        def _override_get_db2():
            try:
                yield db
            finally:
                pass

        client.app.dependency_overrides[deps.get_current_area_assessor_user_http] = (
            _override_current_area_assessor_user2
        )
        client.app.dependency_overrides[deps.get_db] = _override_get_db2

        r3 = client.post(f"/api/v1/assessor/assessments/{assessment_id2}/rework")
        assert r3.status_code == 400

        client.app.dependency_overrides.clear()

    # Test 3: Fresh assessment with unreviewed indicators should block rework
    with next(override_get_db()) as db:
        # Use reviewed=False and has_fail=False to get validation_status=None (unreviewed)
        assessor3, a3 = seed_assessment(
            db,
            status=AssessmentStatus.SUBMITTED_FOR_REVIEW,
            rework_count=0,
            reviewed=False,
            has_fail=False,
        )
        assessment_id3 = a3.id

        def _override_current_area_assessor_user3():
            return assessor3

        def _override_get_db3():
            try:
                yield db
            finally:
                pass

        client.app.dependency_overrides[deps.get_current_area_assessor_user_http] = (
            _override_current_area_assessor_user3
        )
        client.app.dependency_overrides[deps.get_db] = _override_get_db3

        r4 = client.post(f"/api/v1/assessor/assessments/{assessment_id3}/rework")
        assert r4.status_code == 400

        client.app.dependency_overrides.clear()


def test_finalize_rules_first_submission_vs_rework():
    client = TestClient(app)

    # Test 1: First submission with Fail should block finalize
    with next(override_get_db()) as db:
        assessor, a = seed_assessment(
            db,
            status=AssessmentStatus.SUBMITTED_FOR_REVIEW,
            rework_count=0,
            reviewed=True,
            has_fail=True,
        )
        assessment_id = a.id

        def _override_current_area_assessor_user():
            return assessor

        def _override_get_db():
            try:
                yield db
            finally:
                pass

        client.app.dependency_overrides[deps.get_current_area_assessor_user_http] = (
            _override_current_area_assessor_user
        )
        client.app.dependency_overrides[deps.get_db] = _override_get_db

        r1 = client.post(f"/api/v1/assessor/assessments/{assessment_id}/finalize")
        assert r1.status_code == 400

        client.app.dependency_overrides.clear()

    # Test 2: Needs Rework (after rework) should allow finalize even if Fail
    with next(override_get_db()) as db:
        assessor2, a2 = seed_assessment(
            db,
            status=AssessmentStatus.NEEDS_REWORK,
            rework_count=1,
            reviewed=True,
            has_fail=True,
        )
        assessment_id2 = a2.id

        def _override_current_area_assessor_user2():
            return assessor2

        def _override_get_db2():
            try:
                yield db
            finally:
                pass

        client.app.dependency_overrides[deps.get_current_area_assessor_user_http] = (
            _override_current_area_assessor_user2
        )
        client.app.dependency_overrides[deps.get_db] = _override_get_db2

        r2 = client.post(f"/api/v1/assessor/assessments/{assessment_id2}/finalize")
        assert r2.status_code in (200, 201)

        client.app.dependency_overrides.clear()
