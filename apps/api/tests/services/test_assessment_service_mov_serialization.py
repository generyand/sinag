from datetime import UTC, datetime

from app.db.models.assessment import MOV_UPLOAD_ORIGIN_VALIDATOR, MOVFile
from app.services.assessment_service import assessment_service


def test_serialize_mov_file_includes_upload_origin():
    mov_file = MOVFile(
        assessment_id=1,
        indicator_id=2,
        uploaded_by=3,
        upload_origin=MOV_UPLOAD_ORIGIN_VALIDATOR,
        file_name="validator-evidence.pdf",
        file_url="https://storage.example.com/validator-evidence.pdf",
        file_type="application/pdf",
        file_size=4096,
        uploaded_at=datetime(2026, 1, 2, tzinfo=UTC),
    )

    serialized = assessment_service._serialize_mov_file(mov_file)

    assert serialized["upload_origin"] == MOV_UPLOAD_ORIGIN_VALIDATOR
