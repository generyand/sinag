from datetime import datetime

import pytest
from fastapi import HTTPException

from app.api import deps
from app.db.enums import AreaType, AssessmentStatus, UserRole
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User


def create_user(
    db,
    *,
    role: UserRole,
    governance_area=None,
    barangay=None,
    name="User",
    email="u@example.com",
):
    user = User(
        email=email,
        name=name,
        role=role,
        governance_area=governance_area,
        barangay=barangay,
        hashed_password="x",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_assessment_with_indicator(
    db, *, blgu_user: User, indicator: Indicator, status: AssessmentStatus
):
    a = Assessment(blgu_user_id=blgu_user.id, submitted_at=datetime.utcnow())
    db.add(a)
    db.commit()
    db.refresh(a)

    # Explicitly set the status after creation to override the default
    a.status = status
    db.commit()
    db.refresh(a)

    ar = AssessmentResponse(assessment_id=a.id, indicator_id=indicator.id, is_completed=True)
    db.add(ar)
    db.commit()
    return a


class DummyCreds:
    def __init__(self, token: str):
        self.credentials = token


@pytest.mark.asyncio
async def test_get_current_area_assessor_user_requires_role_and_area(db_session, monkeypatch):
    # Arrange: create governance area and users
    area = GovernanceArea(id=1, code="T1", name="Core A", area_type=AreaType.CORE)
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)

    assessor_no_area = create_user(
        db_session,
        role=UserRole.ASSESSOR,
        governance_area=None,
        name="Assessor No Area",
        email="a1@example.com",
    )
    not_assessor = create_user(
        db_session,
        role=UserRole.BLGU_USER,
        governance_area=None,
        name="BLGU",
        email="b1@example.com",
    )
    assessor_ok = create_user(
        db_session,
        role=UserRole.ASSESSOR,
        governance_area=area,
        name="Assessor A",
        email="a2@example.com",
    )

    # Monkeypatch token verification to return user id from provided token
    monkeypatch.setattr("app.core.security.verify_token", lambda token: {"sub": int(token)})

    # Act + Assert: wrong role -> 403
    with pytest.raises(HTTPException) as e1:
        await deps.get_current_area_assessor_user(current_user=not_assessor, db=db_session)
    assert e1.value.status_code == 403

    # Missing governance area -> 403
    with pytest.raises(HTTPException) as e2:
        await deps.get_current_area_assessor_user(current_user=assessor_no_area, db=db_session)
    assert e2.value.status_code == 403

    # Valid assessor with area -> returns user with loaded area
    user = await deps.get_current_area_assessor_user(current_user=assessor_ok, db=db_session)
    assert user.id == assessor_ok.id
    assert user.governance_area is not None


def test_get_assessor_queue_filters_by_governance_area(client, db_session, monkeypatch):
    # Arrange: setup two areas and indicators
    area_a = GovernanceArea(name="Area A", code="AA", area_type=AreaType.CORE)
    area_b = GovernanceArea(name="Area B", code="AB", area_type=AreaType.ESSENTIAL)
    db_session.add_all([area_a, area_b])
    db_session.commit()
    db_session.refresh(area_a)
    db_session.refresh(area_b)

    ind_a = Indicator(name="Ind A", description="", form_schema={}, governance_area_id=area_a.id)
    ind_b = Indicator(name="Ind B", description="", form_schema={}, governance_area_id=area_b.id)
    db_session.add_all([ind_a, ind_b])
    db_session.commit()
    db_session.refresh(ind_a)
    db_session.refresh(ind_b)

    # Create assessor tied to area A
    assessor_a = create_user(
        db_session,
        role=UserRole.ASSESSOR,
        governance_area=area_a,
        name="Assessor A",
        email="assessor@example.com",
    )

    # Create BLGU users and assessments in different areas
    blgu_a = create_user(
        db_session, role=UserRole.BLGU_USER, name="BLGU A", email="blgua@example.com"
    )
    blgu_b = create_user(
        db_session, role=UserRole.BLGU_USER, name="BLGU B", email="blgub@example.com"
    )

    a1 = create_assessment_with_indicator(
        db_session,
        blgu_user=blgu_a,
        indicator=ind_a,
        status=AssessmentStatus.SUBMITTED_FOR_REVIEW,
    )
    a2 = create_assessment_with_indicator(
        db_session,
        blgu_user=blgu_b,
        indicator=ind_b,
        status=AssessmentStatus.SUBMITTED_FOR_REVIEW,
    )

    # Override dependencies to inject our assessor user and use the same DB session
    def _override_current_area_assessor_user():
        return assessor_a

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass  # Don't close the session, let the test handle it

    client.app.dependency_overrides[deps.get_current_area_assessor_user] = (
        _override_current_area_assessor_user
    )
    client.app.dependency_overrides[deps.get_db] = _override_get_db

    # Act
    resp = client.get("/api/v1/assessor/queue")

    # Cleanup overrides
    client.app.dependency_overrides.pop(deps.get_current_area_assessor_user, None)
    client.app.dependency_overrides.pop(deps.get_db, None)

    # Assert
    assert resp.status_code == 200
    data = resp.json()
    ids = {item["assessment_id"] for item in data}
    assert a1.id in ids
    assert a2.id not in ids
