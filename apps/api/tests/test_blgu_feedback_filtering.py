from datetime import datetime

from fastapi.testclient import TestClient  # type: ignore[reportMissingImports]

from app.api import deps
from app.api.v1 import assessments as assessments_module
from app.db.base import SessionLocal
from app.db.enums import AreaType, AssessmentStatus, UserRole
from app.db.models import (
    Assessment,
    AssessmentResponse,
    FeedbackComment,
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


def create_user_and_assessment(db):
    import time

    timestamp = int(time.time() * 1000000)  # microseconds for uniqueness

    # Create governance area first
    gov_area = GovernanceArea(
        name=f"Test Governance Area {timestamp}",
        area_type=AreaType.CORE,
    )
    db.add(gov_area)
    db.flush()

    blgu = User(
        email=f"blgu_{timestamp}@example.com",
        name="BLGU User",
        role=UserRole.BLGU_USER,
        hashed_password="hashed_password",
        is_active=True,
    )
    db.add(blgu)
    db.flush()

    ind = Indicator(
        name=f"Test Indicator {timestamp}",
        description="Desc",
        form_schema={"type": "object", "properties": {}},
        governance_area_id=gov_area.id,
    )
    db.add(ind)
    db.flush()

    assessment = Assessment(
        blgu_user_id=blgu.id,
        status=AssessmentStatus.NEEDS_REWORK,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(assessment)
    db.flush()

    response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=ind.id,
        response_data={},
        is_completed=False,
        requires_rework=True,
    )
    db.add(response)
    db.flush()

    assessor = User(
        email=f"assessor_{timestamp}@example.com",
        name="Assessor",
        role=UserRole.ASSESSOR,
        hashed_password="hashed_password",
        is_active=True,
    )
    db.add(assessor)
    db.flush()

    public_c = FeedbackComment(
        comment="Public feedback",
        comment_type="validation",
        response_id=response.id,
        assessor_id=assessor.id,
        is_internal_note=False,
    )
    internal_c = FeedbackComment(
        comment="Internal note",
        comment_type="internal_note",
        response_id=response.id,
        assessor_id=assessor.id,
        is_internal_note=True,
    )
    db.add(public_c)
    db.add(internal_c)
    db.commit()
    return blgu


def test_blgu_does_not_receive_internal_notes():
    client = TestClient(app)
    with next(override_get_db()) as db:
        blgu = create_user_and_assessment(db)

        # Override dependencies
        def _override_current_blgu_user():
            return blgu

        def _override_get_db():
            try:
                yield db
            finally:
                pass

        client.app.dependency_overrides[assessments_module.get_current_blgu_user] = (
            _override_current_blgu_user
        )
        client.app.dependency_overrides[deps.get_db] = _override_get_db

        # Test the dashboard endpoint which is simpler and doesn't trigger sample indicator creation
        r2 = client.get("/api/v1/assessments/dashboard")
        assert r2.status_code == 200
        dash = r2.json()
        feedback = dash.get("feedback", [])
        comments = [f.get("comment") for f in feedback]
        assert "Public feedback" in comments
        assert "Internal note" not in comments

        # Clear overrides
        client.app.dependency_overrides.clear()
