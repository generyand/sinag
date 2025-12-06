from unittest.mock import patch

import pytest
from sqlalchemy.orm import Session

from app.db.enums import AreaType, AssessmentStatus, UserRole
from app.db.models import (
    MOV,
    Assessment,
    AssessmentResponse,
    GovernanceArea,
    Indicator,
    User,
)
from app.services.assessment_service import AssessmentService


@pytest.fixture
def setup_assessment_with_mov(db_session: Session):
    """Creates a GovernanceArea, indicator that requires MOV, an assessment response, and one MOV attached."""
    area = GovernanceArea(name="Test GOV AREA for MOV", area_type=AreaType.CORE)
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    indicator = Indicator(
        name="Indicator for MOV Deletion Test",
        description="Test indicator requiring MOV on YES",
        form_schema={
            "type": "object",
            "properties": {"answer": {"type": "string", "enum": ["YES", "NO", "N/A"]}},
            "required": ["answer"],
        },
        governance_area_id=area.id,
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)
    user = User(
        email="movdeltest@test.com",
        name="MovDelTest",
        role=UserRole.BLGU_USER,
        hashed_password="x",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    assessment = Assessment(status=AssessmentStatus.DRAFT, blgu_user_id=user.id)
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    response = AssessmentResponse(
        assessment_id=assessment.id,
        indicator_id=indicator.id,
        response_data={"answer": "YES"},
        is_completed=True,
    )
    db_session.add(response)
    db_session.commit()
    db_session.refresh(response)
    mov = MOV(
        filename="file.pdf",
        original_filename="fileorig.pdf",
        file_size=512,
        content_type="application/pdf",
        storage_path="testbucket/file.pdf",
        response_id=response.id,
    )
    db_session.add(mov)
    db_session.commit()
    db_session.refresh(mov)
    return {
        "user": user,
        "assessment": assessment,
        "indicator": indicator,
        "area": area,
        "response": response,
        "mov": mov,
    }


def test_mov_deletion_updates_completion(db_session, setup_assessment_with_mov):
    svc = AssessmentService()
    context = setup_assessment_with_mov
    mov = context["mov"]
    response = context["response"]

    # Ensure setup: 1 MOV and completed
    assert response.is_completed is True
    assert db_session.query(MOV).filter_by(id=mov.id).first() is not None

    # Patch supabase_admin to fake successful file deletion
    with patch("app.db.base.supabase_admin") as mock_admin:
        bucket = mock_admin.storage.from_.return_value
        bucket.remove.return_value = {}
        ok = svc.delete_mov(db_session, mov.id)
        assert ok
    # DB MOV is deleted
    assert db_session.query(MOV).filter_by(id=mov.id).first() is None
    # Reload response (should be incomplete)
    refreshed = db_session.query(AssessmentResponse).get(response.id)
    assert refreshed.is_completed is False


def test_atomic_deletion_aborts_on_file_failure(db_session, setup_assessment_with_mov):
    svc = AssessmentService()
    context = setup_assessment_with_mov
    mov = context["mov"]
    response = context["response"]
    # Patch supabase_admin to simulate deletion error
    with patch("app.db.base.supabase_admin") as mock_admin:
        bucket = mock_admin.storage.from_.return_value
        bucket.remove.side_effect = Exception("Supabase failure")
        # Transaction abort should not delete MOV or modify response
        with pytest.raises(Exception):
            svc.delete_mov(db_session, mov.id)
        assert db_session.query(MOV).filter_by(id=mov.id).first() is not None
        refreshed = db_session.query(AssessmentResponse).get(response.id)
        assert refreshed.is_completed is True


def test_delete_no_effect_for_nonexistent_mov(db_session):
    svc = AssessmentService()
    assert svc.delete_mov(db_session, 999999) is False
