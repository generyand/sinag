# 🎯 MLGOO Router
# API endpoints for MLGOO (Municipal Local Government Operations Officer) features
# Handles final approval workflow, RE-calibration, and grace period management


from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models.user import User
from app.schemas.mlgoo import (
    ApprovalQueueItem,
    ApprovalQueueResponse,
    ApproveAssessmentRequest,
    ApproveAssessmentResponse,
    AssessmentDetailResponse,
    OverrideValidationStatusRequest,
    OverrideValidationStatusResponse,
    RecalibrationByMovRequest,
    RecalibrationByMovResponse,
    RecalibrationRequest,
    RecalibrationResponse,
    UnlockAssessmentRequest,
    UnlockAssessmentResponse,
    UpdateRecalibrationValidationRequest,
    UpdateRecalibrationValidationResponse,
)
from app.services.mlgoo_service import mlgoo_service

router = APIRouter()


# ==================== Approval Queue ====================


@router.get(
    "/approval-queue",
    response_model=ApprovalQueueResponse,
    summary="Get MLGOO Approval Queue",
    description=(
        "Get list of assessments awaiting MLGOO final approval.\n\n"
        "**Access:** Requires MLGOO_DILG role.\n\n"
        "Returns assessments in AWAITING_MLGOO_APPROVAL status that have been "
        "validated by all governance area validators and are ready for final approval."
    ),
    tags=["mlgoo"],
    responses={
        200: {"description": "Approval queue retrieved successfully"},
        403: {"description": "Not enough permissions (MLGOO_DILG role required)"},
    },
)
async def get_approval_queue(
    include_completed: bool = Query(
        False,
        description="Include recently completed assessments in the list",
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Get assessments awaiting MLGOO final approval.

    This endpoint returns all assessments that have completed validation
    by all governance areas and are now awaiting MLGOO's final approval.
    """
    assessments = mlgoo_service.get_approval_queue(
        db=db,
        mlgoo_user=current_user,
        include_completed=include_completed,
    )

    return ApprovalQueueResponse(
        success=True,
        count=len(assessments),
        assessments=[ApprovalQueueItem(**a) for a in assessments],
    )


# ==================== Assessment Details ====================


@router.get(
    "/assessments/{assessment_id}",
    response_model=AssessmentDetailResponse,
    summary="Get Assessment Details for MLGOO Review",
    description=(
        "Get detailed assessment information for MLGOO review.\n\n"
        "**Access:** Requires MLGOO_DILG role.\n\n"
        "Returns comprehensive assessment data including all governance areas, "
        "indicator validation statuses, and RE-calibration information."
    ),
    tags=["mlgoo"],
    responses={
        200: {"description": "Assessment details retrieved successfully"},
        403: {"description": "Not enough permissions (MLGOO_DILG role required)"},
        404: {"description": "Assessment not found"},
    },
)
async def get_assessment_details(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Get detailed assessment information for MLGOO review.

    Returns all governance areas with their indicators and validation statuses,
    allowing MLGOO to review the full assessment before approval.
    """
    try:
        details = mlgoo_service.get_assessment_details(
            db=db,
            assessment_id=assessment_id,
            mlgoo_user=current_user,
        )
        return AssessmentDetailResponse(**details)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# ==================== Approve Assessment ====================


@router.post(
    "/assessments/{assessment_id}/approve",
    response_model=ApproveAssessmentResponse,
    summary="Approve Assessment",
    description=(
        "Approve an assessment and move it to COMPLETED status.\n\n"
        "**Access:** Requires MLGOO_DILG role.\n\n"
        "This is the final step in the assessment workflow. Once approved, "
        "the assessment is officially complete and the BLGU is notified.\n\n"
        "**Requirements:**\n"
        "- Assessment must be in AWAITING_MLGOO_APPROVAL status\n"
        "- All governance areas must have been validated"
    ),
    tags=["mlgoo"],
    responses={
        200: {"description": "Assessment approved successfully"},
        400: {"description": "Assessment cannot be approved in its current state"},
        403: {"description": "Not enough permissions (MLGOO_DILG role required)"},
        404: {"description": "Assessment not found"},
    },
)
async def approve_assessment(
    assessment_id: int,
    request: ApproveAssessmentRequest | None = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Approve an assessment and move it to COMPLETED status.

    This marks the assessment as officially complete. The BLGU will be
    notified of the approval.
    """
    try:
        comments = request.comments if request else None
        result = mlgoo_service.approve_assessment(
            db=db,
            assessment_id=assessment_id,
            mlgoo_user=current_user,
            comments=comments,
        )
        return ApproveAssessmentResponse(**result)
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )


# ==================== Request RE-calibration ====================


@router.post(
    "/assessments/{assessment_id}/recalibrate",
    response_model=RecalibrationResponse,
    summary="Request RE-calibration",
    description=(
        "Request RE-calibration for specific indicators.\n\n"
        "**Access:** Requires MLGOO_DILG role.\n\n"
        "MLGOO can request RE-calibration when they believe the Validator "
        "was too strict on certain indicators. This sends the assessment "
        "back to BLGU for corrections.\n\n"
        "**Important:**\n"
        "- RE-calibration can only be requested ONCE per assessment\n"
        "- Must specify which indicators need RE-calibration\n"
        "- Comments explaining the reason are required\n"
        "- A 3-day grace period is automatically set for BLGU to respond"
    ),
    tags=["mlgoo"],
    responses={
        200: {"description": "RE-calibration requested successfully"},
        400: {"description": "Invalid request or RE-calibration not allowed"},
        403: {"description": "Not enough permissions (MLGOO_DILG role required)"},
        404: {"description": "Assessment not found"},
    },
)
async def request_recalibration(
    assessment_id: int,
    request: RecalibrationRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Request RE-calibration for specific indicators.

    This allows MLGOO to override Validator decisions they believe were
    too strict. The assessment goes back to BLGU for targeted corrections.
    """
    try:
        result = mlgoo_service.request_recalibration(
            db=db,
            assessment_id=assessment_id,
            mlgoo_user=current_user,
            indicator_ids=request.indicator_ids,
            comments=request.comments,
        )
        return RecalibrationResponse(**result)
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )


# ==================== Request RE-calibration by MOV Files ====================


@router.post(
    "/assessments/{assessment_id}/recalibrate-by-mov",
    response_model=RecalibrationByMovResponse,
    summary="Request RE-calibration by MOV Files",
    description=(
        "Request RE-calibration for specific MOV files.\n\n"
        "**Access:** Requires MLGOO_DILG role.\n\n"
        "MLGOO can flag specific MOV files that need to be re-uploaded by BLGU. "
        "This is more granular than indicator-level recalibration - only the "
        "flagged files need to be resubmitted.\n\n"
        "**Important:**\n"
        "- RE-calibration can only be requested ONCE per assessment\n"
        "- Must specify which MOV files need recalibration\n"
        "- Optional comment per file for specific feedback\n"
        "- Overall comments explaining the reason are required\n"
        "- A 3-day grace period is automatically set for BLGU to respond"
    ),
    tags=["mlgoo"],
    responses={
        200: {"description": "RE-calibration requested successfully"},
        400: {"description": "Invalid request or RE-calibration not allowed"},
        403: {"description": "Not enough permissions (MLGOO_DILG role required)"},
        404: {"description": "Assessment not found"},
    },
)
async def request_recalibration_by_mov(
    assessment_id: int,
    request: RecalibrationByMovRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Request RE-calibration for specific MOV files.

    This allows MLGOO to flag specific files that need to be resubmitted
    instead of entire indicators. BLGU only needs to fix the flagged files.
    """
    try:
        # Convert Pydantic models to dicts for the service
        mov_files = [
            {"mov_file_id": item.mov_file_id, "comment": item.comment} for item in request.mov_files
        ]
        result = mlgoo_service.request_recalibration_by_mov(
            db=db,
            assessment_id=assessment_id,
            mlgoo_user=current_user,
            mov_files=mov_files,
            overall_comments=request.overall_comments,
        )
        return RecalibrationByMovResponse(**result)
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )


# ==================== Unlock Assessment ====================


@router.post(
    "/assessments/{assessment_id}/unlock",
    response_model=UnlockAssessmentResponse,
    summary="Unlock Deadline-Locked Assessment",
    description=(
        "Unlock an assessment that was locked due to deadline expiry.\n\n"
        "**Access:** Requires MLGOO_DILG role.\n\n"
        "When a BLGU misses their grace period deadline, their assessment "
        "is automatically locked. MLGOO can unlock it and grant additional "
        "time for the BLGU to complete their corrections.\n\n"
        "**Default behavior:**\n"
        "- Unlocks the assessment\n"
        "- Extends grace period by 3 days (configurable)"
    ),
    tags=["mlgoo"],
    responses={
        200: {"description": "Assessment unlocked successfully"},
        400: {"description": "Assessment is not locked"},
        403: {"description": "Not enough permissions (MLGOO_DILG role required)"},
        404: {"description": "Assessment not found"},
    },
)
async def unlock_assessment(
    assessment_id: int,
    request: UnlockAssessmentRequest | None = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Unlock an assessment that was locked due to deadline expiry.

    This allows MLGOO to give BLGUs additional time when they miss
    their deadlines.
    """
    try:
        extend_days = request.extend_grace_period_days if request else 3
        result = mlgoo_service.unlock_assessment(
            db=db,
            assessment_id=assessment_id,
            mlgoo_user=current_user,
            extend_grace_period_days=extend_days,
        )
        return UnlockAssessmentResponse(**result)
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )


# ==================== Update Recalibration Validation Status ====================


@router.patch(
    "/assessments/{assessment_id}/recalibration-validation",
    response_model=UpdateRecalibrationValidationResponse,
    summary="Update Validation Status of Recalibration Targets",
    description=(
        "Update the validation status of recalibration target indicators.\n\n"
        "**Access:** Requires MLGOO_DILG role.\n\n"
        "After a BLGU resubmits their MOVs for recalibration target indicators, "
        "MLGOO can review and update the validation status (Pass, Fail, Conditional) "
        "before approving the assessment.\n\n"
        "**Important:**\n"
        "- Only recalibration target indicators can be updated\n"
        "- Assessment must be in AWAITING_MLGOO_APPROVAL status\n"
        "- This does NOT automatically approve the assessment - call approve endpoint separately"
    ),
    tags=["mlgoo"],
    responses={
        200: {"description": "Validation statuses updated successfully"},
        400: {"description": "Invalid request or validation update not allowed"},
        403: {"description": "Not enough permissions (MLGOO_DILG role required)"},
        404: {"description": "Assessment not found"},
    },
)
async def update_recalibration_validation(
    assessment_id: int,
    request: UpdateRecalibrationValidationRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Update validation status of recalibration target indicators.

    After BLGU resubmits MOVs, MLGOO can change the validation status
    of the targeted indicators before final approval.
    """
    try:
        # Convert Pydantic models to dicts for service
        indicator_updates = [
            {
                "indicator_id": u.indicator_id,
                "validation_status": u.validation_status,
                "remarks": u.remarks,
            }
            for u in request.indicator_updates
        ]

        result = mlgoo_service.update_recalibration_validation(
            db=db,
            assessment_id=assessment_id,
            mlgoo_user=current_user,
            indicator_updates=indicator_updates,
            comments=request.comments,
        )
        return UpdateRecalibrationValidationResponse(**result)
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )


# ==================== Override Validation Status ====================


@router.patch(
    "/assessment-responses/{response_id}/override-status",
    response_model=OverrideValidationStatusResponse,
    summary="Override Validation Status",
    description=(
        "Override the validation status of any assessment response.\n\n"
        "**Access:** Requires MLGOO_DILG role.\n\n"
        "MLGOO has the authority to override any indicator's validation status "
        "when reviewing assessments awaiting their approval. This allows MLGOO to "
        "correct validation decisions they believe were incorrect.\n\n"
        "**Requirements:**\n"
        "- Assessment must be in AWAITING_MLGOO_APPROVAL status\n"
        "- Valid validation status: PASS, FAIL, or CONDITIONAL"
    ),
    tags=["mlgoo"],
    responses={
        200: {"description": "Validation status overridden successfully"},
        400: {"description": "Invalid request or override not allowed"},
        403: {"description": "Not enough permissions (MLGOO_DILG role required)"},
        404: {"description": "Assessment response not found"},
    },
)
async def override_validation_status(
    response_id: int,
    request: OverrideValidationStatusRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Override the validation status of any assessment response.

    This allows MLGOO to directly change the validation status (PASS/FAIL/CONDITIONAL)
    of any indicator when reviewing an assessment awaiting their approval.
    """
    try:
        result = mlgoo_service.override_validation_status(
            db=db,
            response_id=response_id,
            mlgoo_user=current_user,
            validation_status=request.validation_status,
            remarks=request.remarks,
        )
        return OverrideValidationStatusResponse(**result)
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )
