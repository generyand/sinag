# 🧭 Assessor API Routes
# Endpoints for assessor-specific functionality (secure queue, validation actions)


from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import UserRole
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
from app.schemas.assessor import (
    MOVAssessorFeedbackResponse,
    MOVAssessorFeedbackUpdate,
    ReviewHistoryDetail,
    ReviewHistoryResponse,
)
from app.schemas.municipal_insights import MunicipalOverviewDashboard
from app.services import annotation_service, assessor_service, intelligence_service

router = APIRouter()


@router.get("/queue", response_model=list[AssessorQueueItem], tags=["assessor"])
async def get_assessor_queue(
    year: int | None = Query(
        None,
        description="Filter by assessment year (e.g., 2024, 2025). Defaults to active year.",
        ge=2020,
        le=2100,
    ),
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Get the assessor's secure submissions queue.

    Returns a list of submissions filtered by the assessor's governance area
    and optionally by assessment year.
    """
    return assessor_service.get_assessor_queue(
        db=db, assessor=current_assessor, assessment_year=year
    )


@router.get("/stats", tags=["assessor"])
async def get_assessor_stats(
    year: int | None = Query(
        None,
        description="Filter by assessment year (e.g., 2024, 2025). Defaults to active year.",
        ge=2020,
        le=2100,
    ),
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Get statistics for the assessor/validator.

    For area-specific assessors (after workflow restructuring), returns:
    - validated_count: Number of assessments where the assessor has completed their governance area

    For system-wide validators, returns:
    - validated_count: 0 (not applicable)
    """
    validated_count = 0

    # For area-specific assessors, count completed assessments
    if current_assessor.assessor_area_id is not None:
        validated_count = assessor_service.get_assessor_completed_count(
            db=db, assessor=current_assessor, assessment_year=year
        )

    return {
        "validated_count": validated_count,
    }


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
    - If validation_status is FAIL or CONDITIONAL, a non-empty public_comment is recommended
    - Comments are enforced at finalization, not on draft saves
    """
    # Backend validation: REMOVED for draft saves
    # Comments for FAIL/CONDITIONAL are checked during finalization instead
    # This allows validators to save drafts without writing comments immediately

    result = assessor_service.validate_assessment_response(
        db=db,
        response_id=response_id,
        assessor=current_assessor,
        validation_status=validation_data.validation_status,
        public_comment=validation_data.public_comment,
        assessor_remarks=validation_data.assessor_remarks,
        response_data=validation_data.response_data,
        flagged_for_calibration=validation_data.flagged_for_calibration,
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
    filename: str | None = Form(None, description="Optional custom filename"),
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
    "/assessments/{assessment_id}/calibrate",
    tags=["assessor"],
)
async def submit_for_calibration(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_validator: User = Depends(deps.get_current_area_assessor_user_http),
):
    """
    Submit assessment for calibration (Validators only).

    After workflow restructuring: Validators are system-wide.
    Calibration sends the assessment back to BLGU for corrections on flagged indicators.
    Only 1 calibration round is allowed per assessment.

    Requirements:
    - User must be a Validator (system-wide role after restructuring)
    - Assessment must be in AWAITING_FINAL_VALIDATION status
    - At least one indicator must have feedback (comments or MOV annotations)
    - Calibration round must not have been used already

    The validator must have permission to review assessments (system-wide access).
    """
    try:
        result = assessor_service.submit_for_calibration(
            db=db, assessment_id=assessment_id, validator=current_validator
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
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
    import logging

    logger = logging.getLogger(__name__)
    logger.info(
        f"[FINALIZE ROUTE] Starting finalize for assessment {assessment_id}, assessor {current_assessor.id}"
    )

    try:
        result = assessor_service.finalize_assessment(
            db=db, assessment_id=assessment_id, assessor=current_assessor
        )
        logger.info(f"[FINALIZE ROUTE] Success for assessment {assessment_id}")
        return result
    except ValueError as e:
        from fastapi import HTTPException

        logger.error(f"[FINALIZE ERROR] ValueError caught for assessment {assessment_id}")
        logger.error(f"[FINALIZE ERROR] Message: {str(e)}")
        logger.error(f"[FINALIZE ERROR] Type: {type(e).__name__}")
        logger.error(f"[FINALIZE ERROR] Module: {e.__class__.__module__}")
        # Log potentially helpful attributes if available (e.g., from library-specific errors)
        if hasattr(e, "message"):
            logger.error(f"[FINALIZE ERROR] e.message: {getattr(e, 'message')}")
        if hasattr(e, "details"):
            logger.error(f"[FINALIZE ERROR] e.details: {getattr(e, 'details')}")

        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        from fastapi import HTTPException

        logger.error(f"[FINALIZE ROUTE] PermissionError for assessment {assessment_id}: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(
            f"[FINALIZE ROUTE] Unexpected error for assessment {assessment_id}: {type(e).__name__} ({e.__class__.__module__}): {str(e)}",
            exc_info=True,
        )
        raise


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
        result = intelligence_service.classify_assessment(db=db, assessment_id=assessment_id)
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
        analytics_data = assessor_service.get_analytics(db=db, assessor=current_assessor)
        return AssessorAnalyticsResponse(**analytics_data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve analytics: {str(e)}",
        )


@router.get(
    "/dashboard",
    response_model=MunicipalOverviewDashboard,
    tags=["assessor"],
)
async def get_validator_dashboard(
    year: int | None = Query(
        None,
        description="Assessment year filter (e.g., 2024, 2025). Defaults to active year.",
        ge=2020,
        le=2100,
    ),
    include_draft: bool = Query(
        False, description="Whether to include draft assessments in barangay list"
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Get comprehensive dashboard data for assessors and validators.

    **For VALIDATORS (system-wide access):**
    - See ALL assessments across all 6 governance areas
    - Aggregated compliance summary, area performance, failing indicators
    - Allows validators to coordinate offline within their cluster

    **For ASSESSORS (area-specific access):**
    - See assessments filtered by their assigned governance area
    - Area-specific analytics mirroring the MLGOO municipal overview

    **Access:** VALIDATOR role OR ASSESSOR role with area assignment

    Returns all dashboard sections in a single request:
    - Compliance summary (pass/fail counts, rates)
    - Governance area performance
    - Top failing indicators
    - Aggregated CapDev summary
    - Barangay status list

    Args:
        year: Optional year filter (e.g., 2024, 2025)
        include_draft: Include draft assessments in barangay list
        db: Database session
        current_user: Authenticated assessor user

    Returns:
        Assessor dashboard with all sections filtered by governance area
    """
    try:
        # Validators have system-wide access (assessor_area_id = None)
        # Assessors have area-specific access (assessor_area_id = 1-6)
        is_validator = current_user.role == UserRole.VALIDATOR
        is_assessor = (
            current_user.role == UserRole.ASSESSOR and current_user.assessor_area_id is not None
        )

        if not (is_validator or is_assessor):
            raise HTTPException(
                status_code=403,
                detail="This endpoint is only available for validators or assessors with an assigned governance area",
            )

        dashboard = assessor_service.get_validator_dashboard(
            db=db, validator=current_user, year=year, include_draft=include_draft
        )

        return dashboard

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve validator dashboard: {str(e)}",
        )


# ============================================================================
# Review History Endpoints
# ============================================================================


@router.get(
    "/history",
    response_model=ReviewHistoryResponse,
    tags=["assessor"],
)
async def get_review_history(
    year: int | None = Query(
        None,
        description="Filter by assessment year (e.g., 2024, 2025). Defaults to active year.",
        ge=2020,
        le=2100,
    ),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    date_from: str | None = Query(
        None, description="Filter by completion date >= date_from (ISO format)"
    ),
    date_to: str | None = Query(
        None, description="Filter by completion date <= date_to (ISO format)"
    ),
    outcome: str | None = Query(
        None, pattern="^(PASSED|FAILED)$", description="Filter by final compliance status"
    ),
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Get paginated review history for the current assessor/validator.

    Returns COMPLETED assessments that the user has reviewed:
    - Assessors: Assessments where reviewed_by matches the current user
    - Validators: Completed assessments in their governance area

    Each item includes summary counts (pass/fail/conditional indicators)
    without loading full indicator details (for performance).
    """
    from datetime import datetime

    # Parse date strings to datetime objects
    parsed_date_from = None
    parsed_date_to = None
    if date_from:
        try:
            parsed_date_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use ISO format.")
    if date_to:
        try:
            parsed_date_to = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format. Use ISO format.")

    try:
        result = assessor_service.get_review_history(
            db=db,
            user=current_assessor,
            assessment_year=year,
            page=page,
            page_size=page_size,
            date_from=parsed_date_from,
            date_to=parsed_date_to,
            outcome=outcome,
        )
        return ReviewHistoryResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve review history: {str(e)}",
        )


@router.get(
    "/history/{assessment_id}",
    response_model=ReviewHistoryDetail,
    tags=["assessor"],
)
async def get_review_history_detail(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_area_assessor_user),
):
    """
    Get detailed per-indicator decisions for a specific completed assessment.

    Used when user expands a row to see inline indicator details including:
    - Validation status (Pass/Fail/Conditional) per indicator
    - Feedback comments given
    - Calibration flags
    - MOV counts

    Access control:
    - Assessors can only view assessments they reviewed (reviewed_by == user.id)
    - Validators can view assessments in their governance area
    """
    result = assessor_service.get_review_history_detail(
        db=db,
        user=current_assessor,
        assessment_id=assessment_id,
    )

    if not result.get("success", True):
        if result.get("message") == "Assessment not found":
            raise HTTPException(status_code=404, detail=result["message"])
        elif result.get("message") == "Access denied":
            raise HTTPException(status_code=403, detail=result["message"])
        else:
            raise HTTPException(status_code=400, detail=result.get("message", "Unknown error"))

    # Remove the 'success' and 'message' fields before creating the Pydantic model
    # They are used for error handling but not part of the response schema
    response_data = {k: v for k, v in result.items() if k not in ("success", "message")}

    return ReviewHistoryDetail(**response_data)


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
            status_code=400, detail="MOV file ID in URL does not match annotation data"
        )

    try:
        annotation = annotation_service.create_annotation(
            db=db, annotation_data=annotation_data, assessor_id=current_assessor.id
        )
        return annotation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create annotation: {str(e)}")


@router.get(
    "/movs/{mov_file_id}/annotations",
    response_model=list[AnnotationResponse],
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
        annotations = annotation_service.get_annotations_for_mov(db=db, mov_file_id=mov_file_id)
        return annotations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve annotations: {str(e)}")


@router.get(
    "/assessments/{assessment_id}/annotations",
    response_model=list[AnnotationResponse],
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
            db=db, assessment_id=assessment_id
        )
        return annotations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve annotations: {str(e)}")


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
            assessor_id=current_assessor.id,
        )

        if not annotation:
            raise HTTPException(
                status_code=404,
                detail="Annotation not found or you don't have permission to update it",
            )

        return annotation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update annotation: {str(e)}")


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
            db=db, annotation_id=annotation_id, assessor_id=current_assessor.id
        )

        if not success:
            raise HTTPException(
                status_code=404,
                detail="Annotation not found or you don't have permission to delete it",
            )

        return {"success": True, "message": "Annotation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete annotation: {str(e)}")


# =============================================================================
# Per-MOV Assessor Feedback Endpoints (Epic 6.0)
# =============================================================================


@router.patch(
    "/movs/{mov_file_id}/feedback",
    response_model=MOVAssessorFeedbackResponse,
    tags=["assessor"],
    summary="Update per-MOV assessor feedback",
)
async def update_mov_assessor_feedback(
    mov_file_id: int,
    feedback: MOVAssessorFeedbackUpdate,
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_assessor_or_validator),
):
    """
    Update MOV notes and flag for a specific MOV file.

    Assessors and validators maintain separate fields:
    - Assessor: notes + rework flag
    - Validator: notes + calibration flag

    **Path Parameters:**
    - mov_file_id: ID of the MOV file to update

    **Request Body:**
    - assessor_notes / flagged_for_rework (assessor fields)
    - validator_notes / flagged_for_calibration (validator fields)

    **Returns:** Updated MOV assessor feedback

    **Raises:**
    - 404: MOV file not found
    - 403: User not authorized to update this MOV
    """
    try:
        result = assessor_service.update_mov_assessor_feedback(
            db=db,
            mov_file_id=mov_file_id,
            reviewer=current_assessor,
            assessor_notes=feedback.assessor_notes,
            flagged_for_rework=feedback.flagged_for_rework,
            validator_notes=feedback.validator_notes,
            flagged_for_calibration=feedback.flagged_for_calibration,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update MOV feedback: {str(e)}")


@router.get(
    "/movs/{mov_file_id}/feedback",
    response_model=MOVAssessorFeedbackResponse,
    tags=["assessor"],
    summary="Get per-MOV assessor feedback",
)
async def get_mov_assessor_feedback(
    mov_file_id: int,
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_assessor_or_validator),
):
    """
    Get MOV feedback for a specific MOV file.

    Returns assessor and validator note/flag fields for the specified MOV file.

    **Path Parameters:**
    - mov_file_id: ID of the MOV file

    **Returns:** MOV assessor feedback data

    **Raises:**
    - 404: MOV file not found
    """
    try:
        result = assessor_service.get_mov_assessor_feedback(
            db=db,
            mov_file_id=mov_file_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get MOV feedback: {str(e)}")


# =============================================================================
# Per-Area Approval and Rework Endpoints (Workflow Restructuring)
# =============================================================================


@router.post(
    "/assessments/{assessment_id}/areas/{governance_area_id}/approve",
    tags=["assessor"],
    summary="Approve governance area",
)
async def approve_governance_area(
    assessment_id: int,
    governance_area_id: int,
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_assessor_user),
):
    """
    Assessor approves their assigned governance area.

    After workflow restructuring, assessors are area-specific (6 users for 6 areas).
    Each assessor can only approve their assigned governance area.

    When all 6 areas are approved, the assessment moves to AWAITING_FINAL_VALIDATION.

    **Path Parameters:**
    - assessment_id: ID of the assessment
    - governance_area_id: ID of the governance area (1-6)

    **Returns:** Success status, new area status, and whether all areas are approved

    **Raises:**
    - 403: User not authorized for this governance area
    - 404: Assessment not found
    - 400: Area cannot be approved (wrong status)
    """
    try:
        result = assessor_service.approve_area(
            db=db,
            assessment_id=assessment_id,
            governance_area_id=governance_area_id,
            assessor=current_assessor,
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve area: {str(e)}")


@router.post(
    "/assessments/{assessment_id}/areas/{governance_area_id}/rework",
    tags=["assessor"],
    summary="Send governance area for rework",
)
async def send_area_for_rework(
    assessment_id: int,
    governance_area_id: int,
    comments: str = Form(..., min_length=1, max_length=2000),
    db: Session = Depends(deps.get_db),
    current_assessor: User = Depends(deps.get_current_assessor_user),
):
    """
    Assessor sends their assigned governance area back for rework.

    After workflow restructuring, assessors are area-specific (6 users for 6 areas).
    Each assessor can only request rework for their assigned governance area.

    All 6 assessors' rework requests are compiled into a single rework round.
    The BLGU sees all rework requests together and fixes everything in one pass.

    **Path Parameters:**
    - assessment_id: ID of the assessment
    - governance_area_id: ID of the governance area (1-6)

    **Form Data:**
    - comments: Rework comments explaining what needs to be fixed

    **Returns:** Success status and new area status

    **Raises:**
    - 403: User not authorized for this governance area
    - 404: Assessment not found
    - 400: Rework not allowed (wrong status or rework round already used)
    """
    try:
        result = assessor_service.send_area_for_rework(
            db=db,
            assessment_id=assessment_id,
            governance_area_id=governance_area_id,
            assessor=current_assessor,
            comments=comments,
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send area for rework: {str(e)}")
