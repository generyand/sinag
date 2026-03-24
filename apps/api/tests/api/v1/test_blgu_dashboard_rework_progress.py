from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import AreaType, AssessmentStatus, UserRole
from app.db.models.assessment import Assessment, AssessmentResponse, MOVFile
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def authenticate_user(client: TestClient, user: User, db_session: Session | None = None):
    def override_get_current_user():
        return user

    client.app.dependency_overrides[deps.get_current_active_user] = override_get_current_user
    client.app.dependency_overrides[deps.get_current_user] = override_get_current_user

    if db_session:

        def override_get_db():
            try:
                yield db_session
            finally:
                pass

        client.app.dependency_overrides[deps.get_db] = override_get_db


def test_dashboard_only_marks_completed_flagged_indicators_as_addressed(
    client: TestClient, db_session: Session
):
    barangay = Barangay(name="Lapla Progress Test")
    db_session.add(barangay)
    db_session.flush()

    user = User(
        email="lapla-progress@example.com",
        name="Lapla BLGU",
        hashed_password=pwd_context.hash("testpassword123"),
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        is_active=True,
        must_change_password=False,
    )
    db_session.add(user)
    db_session.flush()

    governance_area = GovernanceArea(name="Test Area", code="TA", area_type=AreaType.CORE)
    db_session.add(governance_area)
    db_session.flush()

    indicator_complete = Indicator(
        name="Completed flagged indicator",
        governance_area_id=governance_area.id,
        form_schema={},
        indicator_code="1.1.1",
    )
    indicator_incomplete = Indicator(
        name="Incomplete flagged indicator",
        governance_area_id=governance_area.id,
        form_schema={},
        indicator_code="1.1.2",
    )
    db_session.add_all([indicator_complete, indicator_incomplete])
    db_session.flush()

    requested_at = datetime.now(UTC) - timedelta(days=2)
    assessment = Assessment(
        blgu_user_id=user.id,
        status=AssessmentStatus.NEEDS_REWORK,
        rework_count=1,
        rework_requested_at=requested_at,
        area_submission_status={
            str(governance_area.id): {
                "status": "rework",
                "rework_requested_at": requested_at.isoformat(),
            }
        },
    )
    db_session.add(assessment)
    db_session.flush()

    response_complete = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=indicator_complete.id,
        is_completed=True,
        requires_rework=True,
        response_data={},
    )
    response_incomplete = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=indicator_incomplete.id,
        is_completed=False,
        requires_rework=True,
        response_data={},
    )
    db_session.add_all([response_complete, response_incomplete])
    db_session.flush()

    db_session.add_all(
        [
            MOVFile(
                assessment_id=assessment.id,
                indicator_id=indicator_complete.id,
                uploaded_by=user.id,
                file_name="complete.pdf",
                file_url="https://example.com/complete.pdf",
                file_type="application/pdf",
                file_size=123,
                uploaded_at=requested_at + timedelta(hours=1),
            ),
            MOVFile(
                assessment_id=assessment.id,
                indicator_id=indicator_incomplete.id,
                uploaded_by=user.id,
                file_name="incomplete.pdf",
                file_url="https://example.com/incomplete.pdf",
                file_type="application/pdf",
                file_size=123,
                uploaded_at=requested_at + timedelta(hours=1),
            ),
        ]
    )
    db_session.commit()

    authenticate_user(client, user, db_session)
    response = client.get(f"/api/v1/blgu-dashboard/{assessment.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["flagged_indicator_ids"] == [indicator_complete.id, indicator_incomplete.id]
    assert data["addressed_indicator_ids"] == [indicator_complete.id]
