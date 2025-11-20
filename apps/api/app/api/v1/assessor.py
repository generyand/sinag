# 🧭 Assessor API Routes
# Endpoints for assessor-specific functionality (secure queue, validation actions)

from typing import List, Optional

from app.api import deps
from app.db.models.user import User
from app.schemas import (
    AnnotationCreate,
    AnnotationResponse,
    AnnotationUpdate,
    AssessmentDetailsResponse,
    AssessorAnalyticsResponse,
    AssessorQueueItem,
    MOVCreate,
    MOVUploadResponse,
    ValidationRequest,
    ValidationResponse,
)
from app.services import annotation_service, assessor_service, intelligence_service
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/queue", response_model=List[AssessorQueueItem], tags=["assessor"])
async def get_assessor_queue(
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Get the assessor's secure submissions queue.

    Returns a list of submissions filtered by the assessor's governance area.
    """
    return assessor_service.get_assessor_queue(db=db, assessor=current_assessor)


@router.post(
    "/assessment-responses/{response_id}/validate",
    response_model=ValidationResponse,
    tags=["assessor"],
)
async def validate_assessment_response(
    response_id: int,
    validation_data: ValidationRequest,
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Validate an assessment response.

    Accepts validation status (Pass/Fail/Conditional), public comment, assessor remarks, and optional response_data.
    Saves public comment to the feedback_comments table.
    Assessor remarks are saved to the assessment_response for validators to review.
    Response data (checklist) is saved to assessment_response.response_data if provided.

    Validation Rules:
    - If validation_status is FAIL or CONDITIONAL, a non-empty public_comment is required
    """
    # Backend validation: FAIL/CONDITIONAL status requires public comment
    from app.db.enums import ValidationStatus

    if validation_data.validation_status in [ValidationStatus.FAIL, ValidationStatus.CONDITIONAL]:
        if not validation_data.public_comment or not validation_data.public_comment.strip():
            raise HTTPException(
                status_code=400,
                detail=f"A public comment is required when setting status to {validation_data.validation_status.value}. "
                       "This ensures BLGUs receive clear, actionable feedback for improvement."
            )

    result = assessor_service.validate_assessment_response(
        db=db,
        response_id=response_id,
        assessor=current_assessor,
        validation_status=validation_data.validation_status,
        public_comment=validation_data.public_comment,
        assessor_remarks=validation_data.assessor_remarks,
        response_data=validation_data.response_data,
    )

    return ValidationResponse(**result)


@router.post(
    "/assessment-responses/{response_id}/movs",
    response_model=MOVUploadResponse,
    tags=["assessor"],
)
async def upload_mov_for_assessor(
    response_id: int,
    mov_data: MOVCreate,
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Upload a MOV (Means of Verification) for an assessment response.

    Allows assessors to upload MOVs for assessment responses they are reviewing.
    The assessor must have permission to review responses in the same governance
    area as the assessment response's indicator.

    Note: The actual file upload to Supabase Storage should be handled by the
    frontend before calling this endpoint. This endpoint is for JSON-based uploads.
    For multipart file uploads, use the /movs/upload endpoint.
    """
    # Verify the MOV is for the correct response
    if mov_data.response_id != response_id:
        return MOVUploadResponse(
            success=False,
            message="MOV response_id does not match URL parameter",
            mov_id=None,
        )

    result = assessor_service.create_mov_for_assessor(
        db=db, mov_create=mov_data, assessor=current_assessor
    )

    return MOVUploadResponse(**result)


@router.post(
    "/assessment-responses/{response_id}/movs/upload",
    response_model=MOVUploadResponse,
    tags=["assessor"],
)
async def upload_mov_file_for_assessor(
    response_id: int,
    file: UploadFile = File(..., description="The MOV file to upload"),
    filename: Optional[str] = Form(None, description="Optional custom filename"),
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Upload a MOV file via multipart/form-data for an assessment response.

    This endpoint accepts a file upload and handles the complete flow:
    1. Validates assessor permissions (using existing firewall in deps.py)
    2. Uploads file to Supabase Storage via storage_service
    3. Creates MOV record marked as "Uploaded by Assessor"
    4. Returns MOVUploadResponse with stored path and MOV entity

    The assessor must have permission to review responses in the same governance
    area as the assessment response's indicator. Existing JSON-based BLGU MOV
    endpoints remain unchanged.

    Args:
        response_id: The ID of the assessment response
        file: The file to upload (multipart/form-data)
        filename: Optional custom filename (if not provided, uses file.filename)

    Returns:
        MOVUploadResponse with success status, storage path, and MOV entity
    """
    try:
        result = assessor_service.upload_mov_file_for_assessor(
            db=db,
            file=file,
            response_id=response_id,
            assessor=current_assessor,
            custom_filename=filename,
        )

        # Return result dict directly - FastAPI will serialize it according to response_model
        # Using dict return to avoid Pydantic validation issues with nested MOV dict
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload MOV file: {str(e)}",
        )


@router.get(
    "/assessments/{assessment_id}",
    response_model=AssessmentDetailsResponse,
    tags=["assessor"],
)
async def get_assessment_details(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Get detailed assessment data for assessor review.

    Returns full assessment details including:
    - Assessment metadata and status
    - BLGU user information and barangay details
    - All responses with indicators and technical notes
    - MOVs (Means of Verification) for each response
    - Feedback comments from assessors

    The assessor must have permission to view assessments in their
    governance area. Technical notes are included for each indicator
    to provide guidance during the review process.
    """
    result = assessor_service.get_assessment_details_for_assessor(
        db=db, assessment_id=assessment_id, assessor=current_assessor
    )

    return AssessmentDetailsResponse(**result)


@router.post(
    "/assessments/{assessment_id}/rework",
    tags=["assessor"],
)
async def send_assessment_for_rework(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user_http),
):
    """
    Send assessment back to BLGU user for rework.

    Changes the assessment status to 'Needs Rework' and triggers a notification
    to the BLGU user. This endpoint fails with a 403 error if the assessment's
    rework_count is not 0 (meaning it has already been sent for rework).

    The assessor must have permission to review assessments in their governance area.
    """
    try:
        result = assessor_service.send_assessment_for_rework(
            db=db, assessment_id=assessment_id, assessor=current_assessor
        )
        return result
    except ValueError as e:
        from fastapi import HTTPException

        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail=str(e))


@router.post(
    "/assessments/{assessment_id}/finalize",
    tags=["assessor"],
)
async def finalize_assessment(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user_http),
):
    """
    Finalize assessment validation, permanently locking it.

    Changes the assessment status to 'Validated', permanently locking the assessment
    from further edits by either the BLGU or the Assessor. This action can only be
    performed if all assessment responses have been reviewed (have a validation status).

    The assessor must have permission to review assessments in their governance area.
    """
    try:
        result = assessor_service.finalize_assessment(
            db=db, assessment_id=assessment_id, assessor=current_assessor
        )
        return result
    except ValueError as e:
        from fastapi import HTTPException

        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail=str(e))


@router.post(
    "/assessments/{assessment_id}/classify",
    tags=["assessor"],
)
async def classify_assessment(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Manually trigger the classification algorithm for an assessment.

    Applies the "3+1" SGLGB compliance rule to determine if the barangay
    has passed or failed the assessment. This endpoint is primarily for
    testing purposes - classification automatically runs during finalization.

    The assessor must have permission to review assessments in their governance area.
    """
    try:
        result = intelligence_service.classify_assessment(
            db=db, assessment_id=assessment_id
        )
        return result
    except ValueError as e:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        from fastapi import HTTPException

        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")


@router.get(
    "/analytics",
    response_model=AssessorAnalyticsResponse,
    tags=["assessor"],
)
async def get_assessor_analytics(
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Get analytics data for the assessor's governance area.

    Returns comprehensive analytics including:
    - Overview: Performance metrics with totals, pass/fail counts, pass rate, and trend series
    - Hotspots: Top underperforming indicators/areas with affected barangays and reasons
    - Workflow: Counts/durations by status, average review times, and rework metrics

    The analytics are calculated using existing assessment and response data
    filtered by the assessor's governance area. This endpoint provides a minimal
    implementation that can be extended as the UI grows.
    """
    try:
        analytics_data = assessor_service.get_analytics(
            db=db, assessor=current_assessor
        )
        return AssessorAnalyticsResponse(**analytics_data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve analytics: {str(e)}",
        )


# ============================================================================
# MOV Annotation Endpoints
# ============================================================================


@router.post(
    "/movs/{mov_file_id}/annotations",
    response_model=AnnotationResponse,
    tags=["assessor"],
)
async def create_annotation(
    mov_file_id: int,
    annotation_data: AnnotationCreate,
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Create a new annotation on a MOV file.

    Allows assessors to add highlights and comments on PDF and image MOV files.
    Supports both single-line and multi-line text selections for PDFs, and
    rectangle annotations for images.
    """
    # Verify the mov_file_id matches the annotation data
    if annotation_data.mov_file_id != mov_file_id:
        raise HTTPException(
            status_code=400,
            detail="MOV file ID in URL does not match annotation data"
        )

    try:
        annotation = annotation_service.create_annotation(
            db=db,
            annotation_data=annotation_data,
            assessor_id=current_assessor.id
        )
        return annotation
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create annotation: {str(e)}"
        )


@router.get(
    "/movs/{mov_file_id}/annotations",
    response_model=List[AnnotationResponse],
    tags=["assessor"],
)
async def get_annotations_for_mov(
    mov_file_id: int,
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Get all annotations for a specific MOV file.

    Returns all annotations (highlights and comments) that the assessor has
    made on the specified MOV file, ordered by creation time.
    """
    try:
        annotations = annotation_service.get_annotations_for_mov(
            db=db,
            mov_file_id=mov_file_id
        )
        return annotations
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve annotations: {str(e)}"
        )


@router.get(
    "/assessments/{assessment_id}/annotations",
    response_model=List[AnnotationResponse],
    tags=["assessor"],
)
async def get_annotations_for_assessment(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Get all annotations for all MOV files in an assessment.

    Returns all annotations across all MOV files in the assessment,
    ordered by creation time.
    """
    try:
        annotations = annotation_service.get_annotations_for_assessment(
            db=db,
            assessment_id=assessment_id
        )
        return annotations
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve annotations: {str(e)}"
        )


@router.patch(
    "/annotations/{annotation_id}",
    response_model=AnnotationResponse,
    tags=["assessor"],
)
async def update_annotation(
    annotation_id: int,
    annotation_data: AnnotationUpdate,
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Update an existing annotation.

    Allows the assessor to edit the comment text of their own annotations.
    Assessors can only update annotations they created.
    """
    try:
        annotation = annotation_service.update_annotation(
            db=db,
            annotation_id=annotation_id,
            annotation_data=annotation_data,
            assessor_id=current_assessor.id
        )

        if not annotation:
            raise HTTPException(
                status_code=404,
                detail="Annotation not found or you don't have permission to update it"
            )

        return annotation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update annotation: {str(e)}"
        )


@router.delete(
    "/annotations/{annotation_id}",
    tags=["assessor"],
)
async def delete_annotation(
    annotation_id: int,
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Delete an annotation.

    Removes the annotation from the MOV file. Assessors can only delete
    annotations they created.
    """
    try:
        success = annotation_service.delete_annotation(
            db=db,
            annotation_id=annotation_id,
            assessor_id=current_assessor.id
        )

        if not success:
            raise HTTPException(
                status_code=404,
                detail="Annotation not found or you don't have permission to delete it"
            )

        return {"success": True, "message": "Annotation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete annotation: {str(e)}"
        )
