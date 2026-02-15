# 🛠️ Assessor Service
# Business logic for assessor features

import logging
from datetime import datetime, timedelta
from typing import Any

from fastapi import UploadFile
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload, selectinload

logger = logging.getLogger(__name__)

from app.core.year_resolver import get_year_resolver
from app.db.enums import AreaType, AssessmentStatus, ComplianceStatus, UserRole, ValidationStatus
from app.db.models.assessment import (
    MOV as MOVModel,  # SQLAlchemy model - alias to avoid conflict
)
from app.db.models.assessment import (
    Assessment,
    AssessmentResponse,
    FeedbackComment,
    MOVAnnotation,
    MOVFile,
)
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from app.schemas.assessment import MOVCreate  # Pydantic schema
from app.services.assessment_activity_service import assessment_activity_service
from app.services.assessment_year_service import assessment_year_service
from app.services.storage_service import storage_service


class AssessorService:
    def __init__(self):
        """Initialize the assessor service"""
        self.logger = logging.getLogger(__name__)

    def get_assessor_queue(
        self, db: Session, assessor: User, assessment_year: int | None = None
    ) -> list[dict]:
        """
        Return submissions filtered by user role, governance area, and assessment year.

        After workflow restructuring:

        **Assessors** (users with assessor_area_id - area-specific, 6 users):
        - See assessments where their governance area is submitted/in_review
        - Filtered by their assigned governance area
        - Can request REWORK for their area
        - These are assessments ready for area-specific review

        **Validators** (users without assessor_area_id - system-wide, 3 users):
        - See assessments in AWAITING_FINAL_VALIDATION status (all 6 areas approved)
        - System-wide access (all governance areas)
        - Can request CALIBRATION
        - ALSO see assessments in REWORK status if they haven't calibrated yet
          (parallel calibration support)

        Args:
            db: Database session
            assessor: Current assessor/validator user
            assessment_year: Optional year filter. Defaults to active year.

        Includes barangay name, submission date, status, and last updated.
        """
        # Get active year if not specified
        if assessment_year is None:
            assessment_year = assessment_year_service.get_active_year_number(db)

        # Base query with eager loading to prevent N+1 queries
        # PERFORMANCE FIX: Load governance_area to avoid lazy loading in loop
        # FIX: Use LEFT OUTER JOIN so assessments with no responses still appear
        # (prevents filtering out empty/incomplete submissions)
        query = (
            db.query(Assessment)
            .outerjoin(AssessmentResponse, AssessmentResponse.assessment_id == Assessment.id)
            .outerjoin(Indicator, Indicator.id == AssessmentResponse.indicator_id)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                selectinload(Assessment.responses)
                .joinedload(AssessmentResponse.indicator)
                .joinedload(Indicator.governance_area),
            )
        )

        # Filter by assessment year (always applied - defaults to active year above)
        if assessment_year:
            query = query.filter(Assessment.assessment_year == assessment_year)

        # After workflow restructuring:
        # - ASSESSOR: Area-specific (has assessor_area_id), reviews their assigned area
        # - VALIDATOR: System-wide, reviews assessments where ALL 6 areas are approved
        is_assessor = assessor.role == UserRole.ASSESSOR and assessor.assessor_area_id is not None
        is_validator = assessor.role == UserRole.VALIDATOR

        if is_assessor:
            # Assessors: Show assessments where their area might be ready for review
            # NOTE: We removed Indicator.governance_area_id filter here because:
            # 1. Assessments with no responses would have NULL indicator_id, excluding them
            # 2. Assessments with responses only in other areas would be excluded
            # 3. The proper filtering by area status happens below in the Python loop
            #
            # CRITICAL FIX: Include DRAFT status for per-area workflow
            # In per-area workflow, overall status stays DRAFT until ALL 6 areas are submitted
            # But individual areas can be submitted while status is still DRAFT
            # The Python loop below filters by per-area status to show only relevant assessments
            query = query.filter(
                Assessment.status.in_(
                    [
                        AssessmentStatus.DRAFT,  # Per-area workflow: status stays DRAFT until all areas submitted
                        AssessmentStatus.SUBMITTED,
                        AssessmentStatus.IN_REVIEW,
                        AssessmentStatus.REWORK,
                        AssessmentStatus.SUBMITTED_FOR_REVIEW,  # Legacy status support
                        AssessmentStatus.NEEDS_REWORK,  # Legacy status support
                    ]
                ),
            )
        elif is_validator:
            # Validators: System-wide access
            # Show assessments in AWAITING_FINAL_VALIDATION (all 6 areas approved)
            # ALSO show REWORK ONLY if it's a calibration rework (validator-initiated)
            # Do NOT show assessor-initiated rework (is_calibration_rework = False)
            query = query.filter(
                or_(
                    Assessment.status == AssessmentStatus.AWAITING_FINAL_VALIDATION,
                    and_(
                        Assessment.status == AssessmentStatus.REWORK,
                        Assessment.is_calibration_rework == True,  # noqa: E712 - SQLAlchemy requires ==
                    ),
                ),
            )
        else:
            # Fallback: Show submitted assessments (shouldn't reach here normally)
            query = query.filter(
                Assessment.status.in_(
                    [
                        AssessmentStatus.SUBMITTED,
                        AssessmentStatus.IN_REVIEW,
                        AssessmentStatus.REWORK,
                    ]
                )
            )

        # Apply remaining filters
        assessments = (
            query.filter(
                # Only include true submissions (must have been submitted)
                Assessment.submitted_at.isnot(None),
            )
            .distinct(Assessment.id)
            .order_by(Assessment.id, Assessment.updated_at.desc())
            .all()
        )

        items = []
        for a in assessments:
            # For assessors: Skip assessments where their area is already approved/in_review by them
            if is_assessor:
                # Check area status - if already approved, skip
                area_status = a.get_area_status(assessor.assessor_area_id)
                if area_status == "approved":
                    continue  # Skip - assessor already approved their area

                # Per-area submission workflow logic:
                # Distinguish between legacy workflow and new per-area workflow
                has_per_area_tracking = bool(a.area_submission_status)

                if has_per_area_tracking:
                    # NEW PER-AREA WORKFLOW: area_submission_status is populated
                    # Only show assessments where THIS assessor's area is submitted/in_review/rework
                    # Skip if the assessor's specific area is still "draft" (not submitted yet)
                    if area_status == "draft":
                        continue  # Skip - BLGU hasn't submitted THIS area yet
                else:
                    # LEGACY WORKFLOW: area_submission_status is None/empty
                    # This handles older assessments submitted before per-area tracking was implemented
                    # Only skip if the overall assessment is NOT in a submitted/rework status
                    if area_status == "draft" and a.status not in (
                        AssessmentStatus.SUBMITTED,
                        AssessmentStatus.SUBMITTED_FOR_REVIEW,
                        AssessmentStatus.IN_REVIEW,
                        AssessmentStatus.REWORK,  # Include REWORK - reverted assessments
                        AssessmentStatus.NEEDS_REWORK,  # Legacy rework status
                    ):
                        continue  # Skip - BLGU hasn't submitted yet (legacy mode)

            # For validators: Check calibration status
            if is_validator:
                # PARALLEL CALIBRATION: Check if validator has pending calibration for this assessment
                # If they already requested calibration, don't show until BLGU resubmits
                # (Validators are now system-wide, so check across all areas)
                pass  # Validators see all assessments in AWAITING_FINAL_VALIDATION status

            barangay_name = getattr(getattr(a.blgu_user, "barangay", None), "name", "-")

            # Add extra info for parallel calibration
            pending_count = len(a.pending_calibrations or []) if a.is_calibration_rework else 0

            # Calculate area progress based on reviewed indicators
            if is_assessor:
                # Assessor: progress based on their governance area
                area_responses = [
                    r
                    for r in a.responses
                    if r.indicator and r.indicator.governance_area_id == assessor.assessor_area_id
                ]
                # Only count responses with actual assessor validation data (assessor_val_* keys)
                # Not just any non-empty response_data (e.g., assessor_manual_rework_flag alone doesn't count)
                reviewed_count = sum(
                    1
                    for r in area_responses
                    if r.response_data
                    and any(k.startswith("assessor_val_") for k in r.response_data.keys())
                )
                total_count = len(area_responses)
            else:
                # Validator: progress based on all indicators (system-wide)
                area_responses = a.responses
                reviewed_count = sum(1 for r in area_responses if r.validation_status is not None)
                total_count = len(area_responses)

            area_progress = round((reviewed_count / total_count * 100) if total_count > 0 else 0)

            # Calculate re-review progress for rework/calibration resubmissions
            # This tracks how many indicators have been re-reviewed AFTER BLGU resubmitted
            re_review_progress = 0

            # For assessors: extract area_data once for reuse in re_review_progress and submission_type
            area_data: dict[str, Any] = {}
            if is_assessor and a.area_submission_status:
                area_data = a.area_submission_status.get(str(assessor.assessor_area_id), {})

            # Determine if this area is a rework resubmission
            # Check both flags for robustness (handles data from before resubmitted_after_rework fix)
            is_area_rework_resubmission = area_data.get(
                "resubmitted_after_rework", False
            ) or area_data.get("is_resubmission", False)

            if is_assessor:
                # Use the area's submitted_at timestamp if it was resubmitted after rework
                if is_area_rework_resubmission:
                    resubmit_timestamp_str = area_data.get("submitted_at")
                    if resubmit_timestamp_str:
                        # Parse the ISO timestamp
                        try:
                            resubmit_timestamp = datetime.fromisoformat(
                                resubmit_timestamp_str.replace("Z", "+00:00")
                            )
                            # Make it timezone-naive for comparison (DB stores naive timestamps)
                            resubmit_timestamp = resubmit_timestamp.replace(tzinfo=None)
                            re_reviewed_count = sum(
                                1
                                for r in area_responses
                                if r.response_data
                                and any(
                                    k.startswith("assessor_val_") for k in r.response_data.keys()
                                )
                                and r.updated_at
                                and r.updated_at >= resubmit_timestamp
                            )
                            re_review_progress = round(
                                (re_reviewed_count / total_count * 100) if total_count > 0 else 0
                            )
                        except (ValueError, TypeError) as e:
                            logger.warning(
                                f"Failed to parse submitted_at timestamp for assessment {a.id}, "
                                f"area {assessor.assessor_area_id}: {e}"
                            )
            else:
                # Validator: use calibration_submitted_at for progress tracking
                if a.calibration_submitted_at is not None:
                    re_reviewed_count = sum(
                        1
                        for r in area_responses
                        if r.validation_status is not None
                        and r.updated_at
                        and r.updated_at >= a.calibration_submitted_at
                    )
                    re_review_progress = round(
                        (re_reviewed_count / total_count * 100) if total_count > 0 else 0
                    )

            # FIX Issue #4: Return per-area status for assessors instead of global status
            # This ensures each assessor only sees status relevant to their governance area
            if is_assessor:
                # Get the area-specific status for the assessor's assigned area
                area_status = a.get_area_status(assessor.assessor_area_id)

                # Map area status to display-friendly status
                # - "draft" or "submitted" without area-specific rework = "SUBMITTED" (awaiting review)
                # - "in_review" = "IN_REVIEW"
                # - "rework" = "REWORK" (only for THIS area)
                # - "approved" = "APPROVED" (assessor completed their review)
                if area_status == "rework":
                    display_status = "REWORK"
                elif area_status == "approved":
                    display_status = "APPROVED"
                elif area_status == "in_review":
                    display_status = "IN_REVIEW"
                else:
                    # For "draft" or "submitted", show as SUBMITTED (awaiting review)
                    display_status = "SUBMITTED"
            else:
                # Validators see global status (all areas are approved at this point)
                display_status = a.status.value if hasattr(a.status, "value") else str(a.status)
                area_status = None  # Not applicable for validators

            # Determine submission type: first submission or rework resubmission
            # This helps differentiate between brand new submissions vs reworked ones
            # FIX: Use per-area status for assessors instead of global rework_round_used flag
            # This ensures each assessor only sees "rework_pending" for their own area
            if is_assessor:
                # For assessors: reuse is_area_rework_resubmission computed earlier
                if is_area_rework_resubmission:
                    # BLGU has resubmitted for this area after rework request
                    submission_type = "rework_resubmission"
                elif area_status == "rework":
                    # Assessor has sent this area for rework, awaiting BLGU resubmission
                    submission_type = "rework_pending"
                else:
                    submission_type = "first_submission"
            else:
                # For validators: use calibration status (not assessor rework)
                # Validators request "calibration" which is tracked separately
                if a.calibration_submitted_at is not None:
                    # BLGU has resubmitted after calibration request
                    submission_type = "rework_resubmission"
                elif a.is_calibration_rework:
                    # Validator has requested calibration, awaiting BLGU resubmission
                    submission_type = "rework_pending"
                else:
                    submission_type = "first_submission"

            items.append(
                {
                    "assessment_id": a.id,
                    "barangay_name": barangay_name,
                    "submission_date": a.submitted_at,
                    # FIX: Use per-area status for assessors, global status for validators
                    "status": display_status,
                    # NEW: Include raw area status for frontend filtering
                    "area_status": area_status,
                    # NEW: Include global assessment status for reference
                    "global_status": a.status.value
                    if hasattr(a.status, "value")
                    else str(a.status),
                    "updated_at": a.updated_at,
                    "is_calibration_rework": a.is_calibration_rework,
                    "pending_calibrations_count": pending_count,
                    "area_progress": area_progress,
                    "reviewed_count": reviewed_count,
                    "total_count": total_count,
                    # NEW: Re-review progress for rework resubmissions
                    "re_review_progress": re_review_progress,
                    # NEW: Submission type for Issue #5 (distinguish first vs rework)
                    "submission_type": submission_type,
                    # NEW: Rework-related fields for better context
                    "rework_round_used": a.rework_round_used,
                    "rework_submitted_at": a.rework_submitted_at,
                    # Per-area rework tracking: True if THIS assessor's area has used its rework round
                    "my_area_rework_used": area_data.get("rework_used", False)
                    if is_assessor
                    else False,
                }
            )

        # For validators, add completed count as metadata
        # This is used for the "Reviewed by You" KPI
        if is_validator and len(items) == 0:
            # If queue is empty, check if there are completed assessments
            # This helps show progress even when queue is empty
            pass

        return items

    def get_assessor_completed_count(
        self, db: Session, assessor: User, assessment_year: int | None = None
    ) -> int:
        """
        Count assessments where the assessor has approved their governance area.

        After workflow restructuring, assessors are area-specific (6 users for 6 areas).
        This counts assessments where the assessor's assigned area is approved.

        Args:
            db: Database session
            assessor: Assessor user (must have assessor_area_id)
            assessment_year: Optional year filter. Defaults to active year.

        Returns the count of assessments where the assessor's area is approved.
        """
        if assessor.assessor_area_id is None:
            return 0

        # Get active year if not specified
        if assessment_year is None:
            assessment_year = assessment_year_service.get_active_year_number(db)

        # Query all submitted assessments
        query = db.query(Assessment).filter(
            Assessment.status.in_(
                [
                    AssessmentStatus.SUBMITTED,
                    AssessmentStatus.IN_REVIEW,
                    AssessmentStatus.AWAITING_FINAL_VALIDATION,
                    AssessmentStatus.COMPLETED,
                ]
            ),
            Assessment.submitted_at.isnot(None),
        )

        # Filter by assessment year
        if assessment_year:
            query = query.filter(Assessment.assessment_year == assessment_year)

        assessments = query.all()

        # Count assessments where the assessor's area is approved
        completed_count = 0
        for assessment in assessments:
            area_status = assessment.get_area_status(assessor.assessor_area_id)
            if area_status == "approved":
                completed_count += 1

        return completed_count

    def validate_assessment_response(
        self,
        db: Session,
        response_id: int,
        assessor: User,
        validation_status: ValidationStatus | None = None,
        public_comment: str | None = None,
        assessor_remarks: str | None = None,
        response_data: dict | None = None,
        flagged_for_calibration: bool | None = None,
    ) -> dict:
        """
        Validate an assessment response and save feedback comments.

        Args:
            db: Database session
            response_id: ID of the assessment response to validate
            assessor: The assessor performing the validation
            validation_status: The validation status (Pass/Fail/Conditional) - optional for assessors
            public_comment: Public comment visible to BLGU user
            assessor_remarks: Remarks from assessor for validators to review
            response_data: Optional checklist/form data to save
            flagged_for_calibration: Toggle to flag indicator for calibration (validators only)

        Returns:
            dict: Success status and details
        """
        logger.debug(
            "validate_assessment_response called: response_id=%s, validation_status=%s, "
            "public_comment=%s, assessor_remarks=%s, response_data=%s",
            response_id,
            validation_status,
            public_comment,
            assessor_remarks,
            response_data,
        )

        # Get the assessment response
        response = db.query(AssessmentResponse).filter(AssessmentResponse.id == response_id).first()

        if not response:
            return {
                "success": False,
                "message": "Assessment response not found",
                "assessment_response_id": response_id,
                "validation_status": validation_status,
            }

        logger.debug("response.response_data BEFORE update: %s", response.response_data)

        # Update the validation status only if provided (validators only)
        if validation_status is not None:
            response.validation_status = validation_status

        # Update assessor remarks if provided
        if assessor_remarks is not None:
            response.assessor_remarks = assessor_remarks

        # Update flagged_for_calibration if provided (validators only)
        # This flag allows validators to explicitly mark indicators for calibration
        # independent of the Met/Unmet compliance status
        if flagged_for_calibration is not None:
            response.flagged_for_calibration = flagged_for_calibration

        # Update response_data if provided (for checklist data)
        # IMPORTANT: Merge with existing BLGU data, don't overwrite!
        if response_data is not None:
            logger.debug("Merging response_data. New validation data: %s", response_data)

            # Get existing BLGU response data or empty dict
            existing_data = response.response_data or {}
            logger.debug("Existing BLGU response_data: %s", existing_data)

            # Merge: Assessor validation data takes precedence for matching keys
            # This preserves BLGU's assessment answers while adding assessor's validation checklist
            merged_data = {**existing_data, **response_data}

            response.response_data = merged_data
            logger.debug("response.response_data AFTER merge: %s", response.response_data)

        # Generate remark if indicator has calculation_schema and remark_schema
        # DISABLED TEMPORARILY: Causing "Unable to add filesystem" crash on some environments
        # if response.indicator.calculation_schema and response.is_completed:
        #     try:
        #         from app.services.intelligence_service import intelligence_service
        #
        #         # Calculate indicator status based on response data
        #         indicator_status = intelligence_service.calculate_indicator_status(
        #             db=db,
        #             indicator_id=response.indicator_id,
        #             assessment_data=response.response_data or {},
        #         )
        #
        #         # Generate remark
        #         generated_remark = intelligence_service.generate_indicator_remark(
        #             db=db,
        #             indicator_id=response.indicator_id,
        #             indicator_status=indicator_status,
        #             assessment_data=response.response_data or {},
        #         )
        #
        #         if generated_remark:
        #             response.generated_remark = generated_remark
        #     except Exception as e:
        #         # Log error but don't fail the validation
        #         print(f"Failed to generate remark for response {response_id}: {str(e)}")

        db.commit()

        # Save or clear public comment
        if public_comment is not None:
            # Always delete existing validation comments from this assessor first
            # to prevent row accumulation (each save used to append a new row)
            db.query(FeedbackComment).filter(
                FeedbackComment.response_id == response_id,
                FeedbackComment.assessor_id == assessor.id,
                FeedbackComment.comment_type == "validation",
                FeedbackComment.is_internal_note == False,  # noqa: E712
            ).delete()

            if public_comment.strip():
                # Create new comment
                public_feedback = FeedbackComment(
                    comment=public_comment,
                    comment_type="validation",
                    response_id=response_id,
                    assessor_id=assessor.id,
                    is_internal_note=False,
                )
                db.add(public_feedback)

        db.commit()

        # Log indicator-level activity for more specific tracking
        try:
            # Import ActivityAction here to avoid circular dependency with assessment_activity schemas
            from app.schemas.assessment_activity import ActivityAction

            # Get indicator details for logging
            indicator = response.indicator
            governance_area = indicator.governance_area if indicator else None

            # Get barangay name from the assessment's BLGU user
            assessment = response.assessment
            barangay_name = None
            if assessment and assessment.blgu_user and assessment.blgu_user.barangay:
                barangay_name = assessment.blgu_user.barangay.name

            # Resolve year placeholders in indicator name (e.g., {JUL_TO_SEP_CURRENT_YEAR})
            indicator_name = indicator.name if indicator else "Unknown"
            if indicator_name and assessment:
                year_resolver = get_year_resolver(db, assessment.assessment_year)
                indicator_name = year_resolver.resolve_string(indicator_name) or indicator_name

            # Determine if user is a validator or assessor using explicit role check
            # Validators (VALIDATOR role) have system-wide access; assessors are area-specific
            is_validator = assessor.role == UserRole.VALIDATOR
            action = (
                ActivityAction.INDICATOR_VALIDATED.value
                if is_validator
                else ActivityAction.INDICATOR_REVIEWED.value
            )

            assessment_activity_service.log_indicator_activity(
                db=db,
                assessment_id=response.assessment_id,
                indicator_id=indicator.id if indicator else 0,
                indicator_code=indicator.indicator_code
                if indicator and indicator.indicator_code
                else "N/A",
                indicator_name=indicator_name,
                action=action,
                user_id=assessor.id,
                governance_area_id=governance_area.id if governance_area else None,
                governance_area_name=governance_area.name if governance_area else None,
                extra_data={
                    "validation_status": validation_status.value if validation_status else None,
                    "has_remarks": bool(assessor_remarks),
                    "has_public_comment": bool(public_comment),
                    "flagged_for_calibration": flagged_for_calibration,
                    "barangay_name": barangay_name,
                    "reviewer_type": "validator" if is_validator else "assessor",
                },
            )
        except Exception as e:
            # Don't fail the validation if logging fails
            self.logger.warning(f"Failed to log indicator review activity: {e}")

        return {
            "success": True,
            "message": "Assessment response validated successfully",
            "assessment_response_id": response_id,
            "validation_status": validation_status,
        }

    def create_mov_for_assessor(self, db: Session, mov_create: MOVCreate, assessor: User) -> dict:
        """
        Create a MOV (Means of Verification) for an assessment response.

        This method allows assessors to upload MOVs for assessment responses
        they are reviewing. It validates that the assessor has permission
        to upload MOVs for the specific assessment response.

        Args:
            db: Database session
            mov_create: MOV creation data
            assessor: The assessor performing the upload

        Returns:
            dict: Success status and MOV details
        """
        # Get the assessment response
        response = (
            db.query(AssessmentResponse)
            .filter(AssessmentResponse.id == mov_create.response_id)
            .first()
        )

        if not response:
            return {
                "success": False,
                "message": "Assessment response not found",
                "mov_id": None,
            }

        # Verify the user has permission to upload MOVs for this response
        # - If ASSESSOR (has assessor_area_id): Check if indicator belongs to that area
        # - If VALIDATOR (no assessor_area_id): Grant access (system-wide)
        indicator = db.query(Indicator).filter(Indicator.id == response.indicator_id).first()

        if not indicator:
            return {
                "success": False,
                "message": "Indicator not found for this response",
                "mov_id": None,
            }

        # Check governance area permission only for Assessors (area-specific)
        if assessor.role == UserRole.ASSESSOR and assessor.assessor_area_id is not None:
            if indicator.governance_area_id != assessor.assessor_area_id:
                return {
                    "success": False,
                    "message": "Access denied. You can only upload MOVs for responses in your governance area",
                    "mov_id": None,
                }

        # Create the MOV
        db_mov = MOVModel(  # Use SQLAlchemy model, not Pydantic schema
            filename=mov_create.filename,
            original_filename=mov_create.original_filename,
            file_size=mov_create.file_size,
            content_type=mov_create.content_type,
            storage_path=mov_create.storage_path,
            response_id=mov_create.response_id,
        )

        db.add(db_mov)
        db.commit()
        db.refresh(db_mov)

        return {
            "success": True,
            "message": "MOV uploaded successfully",
            "mov_id": db_mov.id,
        }

    def upload_mov_file_for_assessor(
        self,
        db: Session,
        file: UploadFile,
        response_id: int,
        assessor: User,
        custom_filename: str | None = None,
    ) -> dict:
        """
        Upload a MOV file to Supabase Storage and create MOV record.

        This method handles the complete flow of uploading a file:
        1. Validates assessor permissions
        2. Uploads file to Supabase Storage via storage_service
        3. Creates MOV record marked as "Uploaded by Assessor"
        4. Returns complete MOV upload response

        Args:
            db: Database session
            file: The uploaded file (FastAPI UploadFile)
            response_id: The ID of the assessment response this MOV belongs to
            assessor: The assessor performing the upload
            custom_filename: Optional custom filename (if not provided, uses file.filename)

        Returns:
            dict: Success status, MOV details, storage path, and MOV entity
        """
        # Get the assessment response
        response = db.query(AssessmentResponse).filter(AssessmentResponse.id == response_id).first()

        if not response:
            return {
                "success": False,
                "message": "Assessment response not found",
                "mov_id": None,
                "storage_path": None,
                "mov": None,
            }

        # Verify the user has permission to upload MOVs for this response
        # - If ASSESSOR (has assessor_area_id): Check if indicator belongs to that area
        # - If VALIDATOR (no assessor_area_id): Grant access (system-wide)
        indicator = db.query(Indicator).filter(Indicator.id == response.indicator_id).first()

        if not indicator:
            return {
                "success": False,
                "message": "Indicator not found for this response",
                "mov_id": None,
                "storage_path": None,
                "mov": None,
            }

        # Check governance area permission only for Assessors (area-specific)
        if assessor.role == UserRole.ASSESSOR and assessor.assessor_area_id is not None:
            if indicator.governance_area_id != assessor.assessor_area_id:
                return {
                    "success": False,
                    "message": "Access denied. You can only upload MOVs for responses in your governance area",
                    "mov_id": None,
                    "storage_path": None,
                    "mov": None,
                }

        # Upload file to Supabase Storage via storage_service
        try:
            upload_result = storage_service.upload_mov(file=file, response_id=response_id, db=db)
        except ValueError as e:
            return {
                "success": False,
                "message": f"Upload failed: {str(e)}",
                "mov_id": None,
                "storage_path": None,
                "mov": None,
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Storage upload error: {str(e)}",
                "mov_id": None,
                "storage_path": None,
                "mov": None,
            }

        # Create the MOV record marked as "Uploaded by Assessor"
        # Note: The filename stored uses the original filename from the upload,
        # but we document in comments that this was uploaded by assessor
        stored_filename = upload_result["filename"]
        original_filename = custom_filename or upload_result["original_filename"]

        db_mov = MOVModel(  # Use SQLAlchemy model, not Pydantic schema
            filename=stored_filename,
            original_filename=original_filename,
            file_size=upload_result["file_size"],
            content_type=upload_result["content_type"],
            storage_path=upload_result["storage_path"],
            response_id=response_id,
            # Status defaults to UPLOADED
            # This MOV is marked as "Uploaded by Assessor" via the storage path
            # pattern: assessment-{assessment_id}/response-{response_id}/
            # and by the fact that this endpoint is assessor-only
        )

        db.add(db_mov)
        db.commit()
        db.refresh(db_mov)

        # Convert MOV to dict for response
        mov_dict = {
            "id": db_mov.id,
            "filename": db_mov.filename,
            "original_filename": db_mov.original_filename,
            "file_size": db_mov.file_size,
            "content_type": db_mov.content_type,
            "storage_path": db_mov.storage_path,
            "status": db_mov.status.value
            if hasattr(db_mov.status, "value")
            else str(db_mov.status),
            "response_id": db_mov.response_id,
            "uploaded_at": db_mov.uploaded_at.isoformat() + "Z",
        }

        return {
            "success": True,
            "message": "MOV uploaded successfully by assessor",
            "mov_id": db_mov.id,
            "storage_path": upload_result["storage_path"],
            "mov": mov_dict,
        }

    def get_assessment_details_for_assessor(
        self, db: Session, assessment_id: int, assessor: User
    ) -> dict:
        """
        Get detailed assessment data for assessor review.

        Returns full assessment details including:
        - Assessment metadata and status
        - BLGU user information
        - All responses with indicators
        - MOVs for each response
        - Feedback comments
        - Technical notes for each indicator

        Args:
            db: Database session
            assessment_id: ID of the assessment to retrieve
            assessor: The assessor requesting the data

        Returns:
            dict: Assessment details or error information
        """
        # Get the assessment with all related data
        # PERFORMANCE FIX: Eager load assessor on feedback_comments to prevent N+1
        # NOTE: Use a single selectinload for responses with subqueryload for nested relations
        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                # Single selectinload for responses, then branch out with subqueryload
                selectinload(Assessment.responses).options(
                    selectinload(AssessmentResponse.indicator).options(
                        selectinload(Indicator.governance_area),
                        selectinload(Indicator.checklist_items),
                        selectinload(Indicator.children),
                    ),
                    selectinload(AssessmentResponse.feedback_comments).selectinload(
                        FeedbackComment.assessor
                    ),
                ),
                # Epic 4.0: Load MOV files from the new mov_files table with annotations
                selectinload(Assessment.mov_files).selectinload(MOVFile.annotations),
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            return {
                "success": False,
                "message": "Assessment not found",
                "assessment_id": assessment_id,
            }

        # Verify the user has permission to view this assessment
        # After workflow restructuring:
        # - VALIDATOR (system-wide): Has no assessor_area_id, can view all assessments
        # - ASSESSOR (area-specific): Has assessor_area_id, can only view assessments with indicators in their area
        has_permission = False

        if assessor.assessor_area_id is None:
            # VALIDATOR: No area assignment means system-wide access
            has_permission = True
        elif assessment.responses:
            # ASSESSOR: Check if any response's indicator belongs to their governance area
            for response in assessment.responses:
                if response.indicator.governance_area_id == assessor.assessor_area_id:
                    has_permission = True
                    break
        else:
            # For assessments with no responses, allow access if user has area assigned
            has_permission = True

        if not has_permission:
            return {
                "success": False,
                "message": "Access denied. You can only view assessments in your governance area",
                "assessment_id": assessment_id,
            }

        # Build the response data
        assessment_data = {
            "success": True,
            "assessment": {
                "id": assessment.id,
                "status": assessment.status.value,
                "created_at": assessment.created_at.isoformat() + "Z",
                "updated_at": assessment.updated_at.isoformat() + "Z",
                "submitted_at": assessment.submitted_at.isoformat() + "Z"
                if assessment.submitted_at
                else None,
                "validated_at": assessment.validated_at.isoformat() + "Z"
                if assessment.validated_at
                else None,
                "rework_requested_at": assessment.rework_requested_at.isoformat() + "Z"
                if assessment.rework_requested_at
                else None,
                "auto_submitted_at": assessment.auto_submitted_at.isoformat() + "Z"
                if assessment.auto_submitted_at
                else None,
                "rework_count": assessment.rework_count,
                "rework_round_used": assessment.rework_round_used,
                "calibration_count": assessment.calibration_count,
                "calibrated_area_ids": assessment.calibrated_area_ids or [],
                "calibration_requested_at": assessment.calibration_requested_at.isoformat() + "Z"
                if assessment.calibration_requested_at
                else None,
                # Per-area status tracking (for disabling buttons when area is rework/approved)
                "area_submission_status": assessment.area_submission_status or {},
                "area_assessor_approved": assessment.area_assessor_approved or {},
                # Assessor's own area status (for quick lookup)
                "my_area_status": assessment.get_area_status(assessor.assessor_area_id)
                if assessor.assessor_area_id
                else None,
                # Per-area rework tracking: True if THIS assessor's area has used its rework round
                "my_area_rework_used": (assessment.area_submission_status or {})
                .get(str(assessor.assessor_area_id), {})
                .get("rework_used", False)
                if assessor.assessor_area_id
                else False,
                "blgu_user": {
                    "id": assessment.blgu_user.id,
                    "name": assessment.blgu_user.name,
                    "email": assessment.blgu_user.email,
                    "barangay": {
                        "id": assessment.blgu_user.barangay.id,
                        "name": assessment.blgu_user.barangay.name,
                    }
                    if assessment.blgu_user.barangay
                    else None,
                },
                "responses": [],
            },
        }

        # Log rework filtering info for debugging
        if assessment.rework_requested_at:
            self.logger.info(
                f"[ASSESSOR REWORK FILTER] Assessment {assessment_id} has rework_requested_at: {assessment.rework_requested_at}. "
                f"Assessor will only see files uploaded AFTER this timestamp."
            )

        # Initialize year placeholder resolver for resolving dynamic year placeholders
        # Use the assessment's year so historical assessments show correct dates
        try:
            year_resolver = get_year_resolver(db, year=assessment.assessment_year)
        except ValueError:
            # If no active assessment year config, skip resolution (use raw values)
            year_resolver = None
            self.logger.warning(
                "[YEAR RESOLVER] No active assessment year found, using raw indicator values"
            )

        # IMPORTANT: Fetch ALL leaf indicators (not just those with responses)
        # This ensures assessors see all 86 indicators, even if BLGU hasn't filled them all
        all_indicators = (
            db.query(Indicator)
            .options(
                selectinload(Indicator.governance_area),
                selectinload(Indicator.checklist_items),
                selectinload(Indicator.children),
            )
            .filter(
                # Only get leaf indicators (no children) - these are the ones that need responses
                ~Indicator.id.in_(
                    db.query(Indicator.parent_id).filter(Indicator.parent_id.isnot(None))
                )
            )
            .order_by(Indicator.governance_area_id, Indicator.indicator_code)
            .all()
        )

        # Create a lookup map of existing responses by indicator_id
        response_lookup = {r.indicator_id: r for r in assessment.responses}

        # CRITICAL: Create empty AssessmentResponse records for indicators without responses
        # This ensures assessors can select and review ALL indicators, even those where
        # BLGU didn't upload any files. Without this, the frontend can't track selection
        # because responses returned with id=None can't be properly selected.
        existing_indicator_ids = set(response_lookup.keys())
        created_responses = 0

        for indicator in all_indicators:
            if indicator.id not in existing_indicator_ids:
                # Create empty response in database
                empty_response = AssessmentResponse(
                    assessment_id=assessment_id,
                    indicator_id=indicator.id,
                    response_data={},
                    is_completed=False,  # No files = incomplete
                    requires_rework=False,
                )
                db.add(empty_response)
                db.flush()  # Flush to get the ID
                response_lookup[indicator.id] = empty_response
                created_responses += 1

        if created_responses > 0:
            db.commit()
            self.logger.info(
                f"[ASSESSOR VIEW] Created {created_responses} empty responses for indicators "
                f"without responses (assessment {assessment_id})"
            )

        # Determine filtering based on user role
        # After workflow restructuring: ASSESSORs are area-specific, VALIDATORs are system-wide
        # - ASSESSOR: Filter to only show their assigned governance area
        # - VALIDATOR: Show all governance areas (system-wide)
        is_assessor_role = assessor.role == UserRole.ASSESSOR
        should_filter = is_assessor_role and assessor.assessor_area_id is not None

        self.logger.info(
            f"[ASSESSOR DEBUG] User {assessor.id} ({assessor.email}): "
            f"role={assessor.role}, assessor_area_id={assessor.assessor_area_id}, "
            f"total_responses_in_assessment={len(assessment.responses)}, "
            f"total_indicators={len(all_indicators)}, should_filter={should_filter}"
        )

        # Process ALL indicators (not just responses)
        for indicator in all_indicators:
            # Filter by governance area for ASSESSOR role users (area-specific)
            if should_filter:
                if indicator.governance_area_id != assessor.assessor_area_id:
                    continue

            # Get existing response for this indicator (may be None if BLGU hasn't filled it yet)
            response = response_lookup.get(indicator.id)

            # Get all MOV files for this indicator (before filtering)
            all_movs_for_indicator = [
                mov
                for mov in assessment.mov_files
                if mov.indicator_id == indicator.id and mov.deleted_at is None
            ]

            # Get requires_rework status (False if no response exists)
            requires_rework = response.requires_rework if response else False

            # ALWAYS LOG: Debug filtering logic
            self.logger.info(
                f"[MOV FILTER DEBUG] Indicator {indicator.id}: "
                f"has_response={response is not None}, requires_rework={requires_rework}, "
                f"assessment_status={assessment.status}, "
                f"rework_requested_at={assessment.rework_requested_at}, "
                f"total_movs={len(all_movs_for_indicator)}"
            )

            # GHOST REWORK FILTER (Same as BLGU Dashboard):
            # During calibration (Phase 2), ignore stale 'requires_rework' flags from Phase 1
            # unless the indicator belongs to the currently calibrated governance area.
            is_calibration_rework = assessment.is_calibration_rework or (
                assessment.status == AssessmentStatus.REWORK and assessment.pending_calibrations
            )
            effective_requires_rework = requires_rework

            if is_calibration_rework and effective_requires_rework:
                # Find active calibration governance area
                calibration_ga_id = None
                if assessment.pending_calibrations:
                    for pc in assessment.pending_calibrations:
                        if not pc.get("approved", False):
                            calibration_ga_id = pc.get("governance_area_id")
                            break

                # If we found an active calibration area, and this indicator is NOT in it,
                # then this is a "Ghost Rework" flag - ignore it.
                if (
                    calibration_ga_id is not None
                    and indicator.governance_area_id != calibration_ga_id
                ):
                    effective_requires_rework = False
                    self.logger.info(
                        f"[GHOST REWORK FIX] Ignoring stale rework flag for Indicator {indicator.id} "
                        f"(Area {indicator.governance_area_id} != Calibration Area {calibration_ga_id})"
                    )

            # Apply rework filtering based on assessment status and EFFECTIVE rework flag:
            # - If status is AWAITING_FINAL_VALIDATION: Rework cycle is COMPLETE - show all files for validators
            # - If status is REWORK or SUBMITTED_FOR_REVIEW and requires_rework = True: Show only new files for assessor review
            # - Otherwise: Show all files

            if assessment.status == AssessmentStatus.AWAITING_FINAL_VALIDATION:
                # Rework cycle is complete - validators see ALL files including rejected ones
                # Rejected files are marked with is_rejected=True for frontend to display separately

                rework_timestamp = assessment.rework_requested_at
                calibration_timestamp = assessment.calibration_requested_at

                # Use the most recent rework timestamp
                effective_timestamp = calibration_timestamp or rework_timestamp

                if effective_timestamp:
                    # Get file IDs that have annotations (rejected files)
                    rejected_file_ids = set()
                    for mov in all_movs_for_indicator:
                        if mov.annotations and len(mov.annotations) > 0:
                            # This file has annotations - check if it was uploaded before rework
                            if mov.uploaded_at < effective_timestamp:
                                rejected_file_ids.add(mov.id)

                    # Check if there are newer files (replacements) for this indicator
                    has_new_uploads = any(
                        mov.uploaded_at >= effective_timestamp for mov in all_movs_for_indicator
                    )

                    if rejected_file_ids and has_new_uploads:
                        # Mark rejected files but don't filter them out - validators need to see them
                        # Store rejected_file_ids for use when building the movs array
                        self.logger.info(
                            f"[VALIDATOR VIEW] Indicator {indicator.id}: "
                            f"Marking {len(rejected_file_ids)} rejected file(s) with annotations, "
                            f"total {len(all_movs_for_indicator)} file(s)"
                        )
                    else:
                        # No rejected files or no replacements - clear the set
                        rejected_file_ids = set()

                    # For validators, show ALL files (filtered_movs = all)
                    # The rejected_file_ids set will be used to mark files as rejected
                    filtered_movs = all_movs_for_indicator
                else:
                    # No rework happened - show all files
                    filtered_movs = all_movs_for_indicator
                    rejected_file_ids = set()
            elif (
                effective_requires_rework
                and assessment.rework_requested_at
                and assessment.status
                in [
                    AssessmentStatus.REWORK,
                    AssessmentStatus.SUBMITTED_FOR_REVIEW,
                    AssessmentStatus.SUBMITTED,
                ]
            ):
                # Assessor reviewing reworked indicator - show ALL files
                # Mark old files as rejected so frontend can display them separately
                self.logger.info(
                    f"[ASSESSOR REWORK VIEW] Assessment {assessment.id}, Indicator {indicator.id}: "
                    f"rework_requested_at={assessment.rework_requested_at}, status={assessment.status}"
                )

                rework_timestamp = assessment.rework_requested_at

                # Identify old files (uploaded before rework) as "rejected"
                rejected_file_ids = set()
                new_files_count = 0

                for mov in all_movs_for_indicator:
                    is_old = mov.uploaded_at < rework_timestamp
                    is_new = mov.uploaded_at >= rework_timestamp

                    if is_new:
                        new_files_count += 1

                    # Old files are "rejected" if there are new replacements
                    # or if they have annotations
                    if is_old:
                        has_annotations = mov.annotations and len(mov.annotations) > 0
                        rejected_file_ids.add(mov.id)
                        self.logger.info(
                            f"  - OLD File: {mov.file_name}, "
                            f"uploaded_at={mov.uploaded_at}, "
                            f"has_annotations={has_annotations}, marked_as_rejected=True"
                        )
                    else:
                        self.logger.info(
                            f"  - NEW File: {mov.file_name}, uploaded_at={mov.uploaded_at}"
                        )

                # Show ALL files (new + old) - frontend will display old files in "Rejected" section
                filtered_movs = all_movs_for_indicator

                # Log results for debugging
                self.logger.info(
                    f"[ASSESSOR REWORK VIEW] Indicator {indicator.id}: "
                    f"Total {len(all_movs_for_indicator)} MOVs, {new_files_count} new, "
                    f"{len(rejected_file_ids)} old/rejected"
                )
            else:
                # Show all files for other cases
                filtered_movs = all_movs_for_indicator
                rejected_file_ids = set()  # No rejected files for non-validator views

                if assessment.rework_requested_at and requires_rework is False:
                    self.logger.info(
                        f"[FILTER] Indicator {indicator.id} (requires_rework=False): "
                        f"Showing all {len(filtered_movs)} MOVs (indicator already passed)"
                    )

            # Build response data - handle case where response is None (indicator not answered yet)
            response_data = {
                "id": response.id if response else None,
                "is_completed": response.is_completed if response else False,
                "requires_rework": effective_requires_rework,
                "flagged_for_calibration": response.flagged_for_calibration if response else False,
                "validation_status": response.validation_status.value
                if response and response.validation_status
                else None,
                "response_data": response.response_data if response else {},
                "created_at": response.created_at.isoformat() + "Z" if response else None,
                "updated_at": response.updated_at.isoformat() + "Z" if response else None,
                "indicator": {
                    "id": indicator.id,
                    # Resolve year placeholders in indicator name
                    "name": year_resolver.resolve_string(indicator.name)
                    if year_resolver
                    else indicator.name,
                    "code": indicator.indicator_code,
                    "indicator_code": indicator.indicator_code,
                    # Resolve year placeholders in description
                    "description": year_resolver.resolve_string(indicator.description)
                    if year_resolver
                    else indicator.description,
                    # Resolve year placeholders in form_schema (deep resolution)
                    "form_schema": year_resolver.resolve_schema(indicator.form_schema)
                    if year_resolver
                    else indicator.form_schema,
                    "validation_rule": indicator.validation_rule,
                    "remark_schema": indicator.remark_schema,
                    "governance_area": {
                        "id": indicator.governance_area.id,
                        "name": indicator.governance_area.name,
                        "code": indicator.governance_area.code,
                        "area_type": indicator.governance_area.area_type.value,
                    },
                    # Technical notes - resolve year placeholders
                    # Return None if no description to let frontend hide the section
                    "technical_notes": (
                        year_resolver.resolve_string(indicator.description)
                        if year_resolver
                        else indicator.description
                    )
                    or None,
                    # Checklist items for validation - resolve year placeholders in labels
                    "checklist_items": [
                        {
                            "id": item.id,
                            "item_id": item.item_id,
                            # Resolve year placeholders in checklist item label
                            "label": year_resolver.resolve_string(item.label)
                            if year_resolver
                            else item.label,
                            "item_type": item.item_type,
                            "group_name": item.group_name,
                            # Resolve year placeholders in mov_description
                            "mov_description": year_resolver.resolve_string(item.mov_description)
                            if year_resolver
                            else item.mov_description,
                            "required": item.required,
                            "requires_document_count": item.requires_document_count,
                            "display_order": item.display_order,
                            "option_group": item.option_group,
                            # Resolve year placeholders in field_notes
                            "field_notes": year_resolver.resolve_dict(item.field_notes)
                            if year_resolver
                            else item.field_notes,
                        }
                        for item in sorted(
                            indicator.checklist_items,
                            key=lambda x: x.display_order,
                        )
                    ],
                },
                "movs": [
                    {
                        "id": mov_file.id,
                        "filename": mov_file.file_name,
                        "original_filename": mov_file.file_name,
                        "file_size": mov_file.file_size,
                        "content_type": mov_file.file_type,
                        "storage_path": mov_file.file_url,
                        "status": "uploaded",  # MOVFile doesn't have status field
                        "uploaded_at": mov_file.uploaded_at.isoformat() + "Z"
                        if mov_file.uploaded_at
                        else None,
                        "field_id": mov_file.field_id,
                        # File-level annotation flag for granular rework tracking
                        "has_annotations": len(mov_file.annotations) > 0,
                        # Validator view: Mark rejected files (files with annotations that were replaced)
                        "is_rejected": mov_file.id in rejected_file_ids,
                    }
                    # Use the filtered_movs list created above (already filtered by rework timestamp)
                    for mov_file in filtered_movs
                ],
                "feedback_comments": [
                    {
                        "id": comment.id,
                        "comment": comment.comment,
                        "comment_type": comment.comment_type,
                        "is_internal_note": comment.is_internal_note,
                        "created_at": comment.created_at.isoformat() + "Z",
                        "assessor": {
                            "id": comment.assessor.id,
                            "name": comment.assessor.name,
                            "email": comment.assessor.email,
                            "role": comment.assessor.role.value if comment.assessor.role else None,
                        }
                        if comment.assessor
                        else None,
                    }
                    for comment in (response.feedback_comments if response else [])
                ],
                "has_mov_annotations": any(
                    len(mov.annotations) > 0 for mov in all_movs_for_indicator
                ),
                # List of MOV file IDs that have annotations (for file-level rework tracking)
                "annotated_mov_file_ids": [
                    mov.id for mov in all_movs_for_indicator if len(mov.annotations) > 0
                ],
                # List of MOV file IDs explicitly flagged for rework (toggle ON)
                "flagged_mov_file_ids": [
                    mov.id for mov in all_movs_for_indicator if mov.flagged_for_rework
                ],
            }
            # DEBUG: Log requires_rework status
            self.logger.info(
                f"[ASSESSOR VIEW] Indicator {indicator.id} ({indicator.name}): "
                f"has_response={response is not None}, requires_rework={requires_rework}, "
                f"is_completed={response.is_completed if response else False}"
            )
            assessment_data["assessment"]["responses"].append(response_data)

        return assessment_data

    # ==========================================================================
    # Per-Area Approval and Rework Methods (Workflow Restructuring)
    # ==========================================================================

    def approve_area(
        self,
        db: Session,
        assessment_id: int,
        governance_area_id: int,
        assessor: User,
    ) -> dict:
        """
        Assessor approves their assigned governance area.

        After workflow restructuring, assessors are area-specific (6 users for 6 areas).
        Each assessor can only approve their assigned governance area.

        When all 6 areas are approved, the assessment moves to AWAITING_FINAL_VALIDATION.

        Args:
            db: Database session
            assessment_id: Assessment ID
            governance_area_id: Governance area ID to approve
            assessor: Assessor user (must have matching assessor_area_id)

        Returns:
            Response dict with success status and area info

        Raises:
            ValueError: If assessment not found or area cannot be approved
            PermissionError: If assessor doesn't have permission for this area
        """
        from sqlalchemy.orm.attributes import flag_modified

        # Validate assessor has the correct area assignment
        if assessor.assessor_area_id != governance_area_id:
            raise PermissionError(
                f"You can only approve your assigned governance area (ID: {assessor.assessor_area_id})"
            )

        # Get the assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Verify assessment is in a valid status for area approval
        # Valid statuses: DRAFT (per-area workflow), SUBMITTED, SUBMITTED_FOR_REVIEW, IN_REVIEW, REWORK
        # DRAFT is included because in per-area workflow, overall status stays DRAFT
        # until ALL 6 areas are submitted, but individual areas can be submitted early
        valid_statuses = (
            AssessmentStatus.DRAFT,
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.SUBMITTED_FOR_REVIEW,
            AssessmentStatus.IN_REVIEW,
            AssessmentStatus.REWORK,
            AssessmentStatus.NEEDS_REWORK,
        )
        if assessment.status not in valid_statuses:
            raise ValueError(
                f"Assessment is in '{assessment.status.value}' status. "
                f"Area approval is only allowed for assessments in DRAFT, SUBMITTED, "
                f"SUBMITTED_FOR_REVIEW, IN_REVIEW, or REWORK status."
            )

        # Check current area status
        area_status = assessment.get_area_status(governance_area_id)

        # Prevent approving an area that genuinely hasn't been submitted yet
        # (global DRAFT + area "draft" means BLGU hasn't submitted this area)
        if assessment.status == AssessmentStatus.DRAFT and area_status == "draft":
            raise ValueError(
                "This governance area has not been submitted yet. "
                "The BLGU must submit this area before it can be approved."
            )

        if area_status == "approved":
            return {
                "success": True,
                "message": "Area is already approved",
                "assessment_id": assessment_id,
                "governance_area_id": governance_area_id,
                "new_status": "approved",
                "all_areas_approved": assessment.all_areas_approved(),
                "assessment_status": assessment.status.value,
            }

        # Allow "draft" status because area_submission_status may not be initialized yet
        # When assessment is SUBMITTED but area hasn't been explicitly tracked,
        # get_area_status() returns "draft" - this is valid for approval
        # Also allow "rework" status if BLGU has resubmitted - detected by:
        # 1. resubmitted_after_rework flag in area_submission_status
        # 2. rework_submitted_at timestamp on assessment
        # 3. Assessment is in SUBMITTED/SUBMITTED_FOR_REVIEW status (implies resubmission for old data)
        area_data = (assessment.area_submission_status or {}).get(str(governance_area_id), {})
        has_resubmitted_flag = area_data.get("resubmitted_after_rework", False)
        has_rework_submitted_at = assessment.rework_submitted_at is not None
        # For old data: if assessment is in SUBMITTED/SUBMITTED_FOR_REVIEW but area is "rework",
        # it means BLGU resubmitted but area_status wasn't updated (old code bug)
        assessment_implies_resubmission = assessment.status in (
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.SUBMITTED_FOR_REVIEW,
        )

        if area_status not in ("draft", "submitted", "in_review"):
            # Allow approval if area was in rework but BLGU has resubmitted
            if area_status == "rework" and (
                has_resubmitted_flag or has_rework_submitted_at or assessment_implies_resubmission
            ):
                self.logger.info(
                    f"Allowing approval for area {governance_area_id} in 'rework' status "
                    f"because BLGU has resubmitted (resubmitted_after_rework={has_resubmitted_flag}, "
                    f"rework_submitted_at={assessment.rework_submitted_at}, "
                    f"assessment_status={assessment.status.value})"
                )
            else:
                raise ValueError(
                    f"Area is in '{area_status}' status. Can only approve areas in 'draft', 'submitted', or 'in_review' status. "
                    f"If the BLGU has resubmitted, please ensure the area status has been updated."
                )

        # Get governance area name
        governance_area = (
            db.query(GovernanceArea).filter(GovernanceArea.id == governance_area_id).first()
        )
        governance_area_name = governance_area.name if governance_area else "Unknown"

        # Update area status to approved
        area_key = str(governance_area_id)
        if assessment.area_submission_status is None:
            assessment.area_submission_status = {}
        if assessment.area_assessor_approved is None:
            assessment.area_assessor_approved = {}

        now = datetime.utcnow()
        existing_area_data = assessment.area_submission_status.get(area_key, {})
        assessment.area_submission_status[area_key] = {
            **existing_area_data,
            "status": "approved",
            "approved_at": now.isoformat(),
            "assessor_id": assessor.id,
        }
        assessment.area_assessor_approved[area_key] = True
        flag_modified(assessment, "area_submission_status")
        flag_modified(assessment, "area_assessor_approved")

        # Check if all 6 areas are now approved
        if assessment.all_areas_approved():
            # Move assessment to AWAITING_FINAL_VALIDATION
            assessment.status = AssessmentStatus.AWAITING_FINAL_VALIDATION
            self.logger.info(
                f"All 6 areas approved for assessment {assessment_id}. "
                f"Moving to AWAITING_FINAL_VALIDATION."
            )

        db.commit()

        # Send per-area approval notification to BLGU
        try:
            from app.services.notification_service import notification_service

            is_post_rework = area_status == "rework" and (
                has_resubmitted_flag or has_rework_submitted_at or assessment_implies_resubmission
            )
            notification_service.queue_per_area_approval_notification(
                db=db,
                assessment=assessment,
                governance_area_id=governance_area_id,
                governance_area_name=governance_area_name,
                assessor=assessor,
                is_post_rework=is_post_rework,
            )
            db.commit()
        except Exception as e:
            # Don't fail the approval if notification fails
            self.logger.warning(f"Failed to queue per-area approval notification: {e}")

        self.logger.info(
            f"Assessor {assessor.id} approved area {governance_area_id} ({governance_area_name}) "
            f"for assessment {assessment_id}"
        )

        return {
            "success": True,
            "message": f"Area '{governance_area_name}' approved",
            "assessment_id": assessment_id,
            "governance_area_id": governance_area_id,
            "new_status": "approved",
            "all_areas_approved": assessment.all_areas_approved(),
            "assessment_status": assessment.status.value,
        }

    def send_area_for_rework(
        self,
        db: Session,
        assessment_id: int,
        governance_area_id: int,
        assessor: User,
        comments: str,
    ) -> dict:
        """
        Assessor sends their assigned governance area back for rework.

        After workflow restructuring, assessors are area-specific (6 users for 6 areas).
        Each assessor can only send their assigned governance area for rework.

        All 6 assessors' rework requests are compiled into a single rework round.
        The BLGU sees all rework requests together and fixes everything in one pass.

        Args:
            db: Database session
            assessment_id: Assessment ID
            governance_area_id: Governance area ID to send for rework
            assessor: Assessor user (must have matching assessor_area_id)
            comments: Rework comments explaining what needs to be fixed

        Returns:
            Response dict with success status and area info

        Raises:
            ValueError: If assessment not found or rework not allowed
            PermissionError: If assessor doesn't have permission for this area
        """
        from sqlalchemy.orm.attributes import flag_modified

        # Validate assessor has the correct area assignment
        if assessor.assessor_area_id != governance_area_id:
            raise PermissionError(
                f"You can only request rework for your assigned governance area (ID: {assessor.assessor_area_id})"
            )

        # Get the assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Verify assessment is in a valid status for area rework request
        # Valid statuses: DRAFT (per-area workflow), SUBMITTED, SUBMITTED_FOR_REVIEW, IN_REVIEW
        # DRAFT is included because in per-area workflow, overall status stays DRAFT
        # until ALL 6 areas are submitted, but individual areas can be submitted early
        # Note: REWORK status means rework was already requested globally
        valid_statuses = (
            AssessmentStatus.DRAFT,
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.SUBMITTED_FOR_REVIEW,
            AssessmentStatus.IN_REVIEW,
        )
        if assessment.status not in valid_statuses:
            raise ValueError(
                f"Assessment is in '{assessment.status.value}' status. "
                f"Area rework request is only allowed for assessments in DRAFT, SUBMITTED, "
                f"SUBMITTED_FOR_REVIEW, or IN_REVIEW status."
            )

        # Check if rework round has already been used FOR THIS AREA (per-area rework logic)
        # Each of the 6 governance areas gets its own independent rework round
        area_key = str(governance_area_id)
        area_data = (assessment.area_submission_status or {}).get(area_key, {})
        if area_data.get("rework_used", False):
            raise ValueError(
                "Rework round has already been used for this governance area. "
                "Each area is only allowed one rework round."
            )

        # Check current area status
        area_status = assessment.get_area_status(governance_area_id)

        # Prevent rework on an area that genuinely hasn't been submitted yet
        # (global DRAFT + area "draft" means BLGU hasn't submitted this area)
        if assessment.status == AssessmentStatus.DRAFT and area_status == "draft":
            raise ValueError(
                "This governance area has not been submitted yet. "
                "The BLGU must submit this area before it can be sent for rework."
            )

        if area_status == "rework":
            raise ValueError("Area is already in rework status")

        # Allow "draft" status because area_submission_status may not be initialized yet
        # When assessment is SUBMITTED but area hasn't been explicitly tracked,
        # get_area_status() returns "draft" - this is valid for rework request
        if area_status not in ("draft", "submitted", "in_review"):
            raise ValueError(
                f"Area is in '{area_status}' status. Can only request rework for areas in 'draft', 'submitted', or 'in_review' status."
            )

        # Get governance area name
        governance_area = (
            db.query(GovernanceArea).filter(GovernanceArea.id == governance_area_id).first()
        )
        governance_area_name = governance_area.name if governance_area else "Unknown"

        # Update area status to rework
        # Note: area_key is already defined above when checking per-area rework usage
        if assessment.area_submission_status is None:
            assessment.area_submission_status = {}

        now = datetime.utcnow()
        # Preserve existing area data and add/update rework fields
        existing_area_data = assessment.area_submission_status.get(area_key, {})
        assessment.area_submission_status[area_key] = {
            **existing_area_data,  # Preserve any existing data
            "status": "rework",
            "rework_requested_at": now.isoformat(),
            "rework_comments": comments,
            "assessor_id": assessor.id,
            "rework_used": True,  # Mark this area's rework round as used
        }
        flag_modified(assessment, "area_submission_status")

        # Keep global rework_round_used for backward compatibility (analytics/statistics)
        # Note: The actual per-area rework blocking is now done via area_data["rework_used"]
        # This global flag just indicates that at least one area has used its rework round
        if not assessment.rework_round_used:
            assessment.rework_round_used = True
            flag_modified(assessment, "rework_round_used")

        # FIX Issue #3: Do NOT immediately change global assessment status!
        # The assessor is only flagging their area for rework - other assessors may still
        # be reviewing or approving their areas. We only change global status when:
        # 1. Assessor formally submits via send_assessment_for_rework(), OR
        # 2. All areas have made their decision (all approved or at least one rework)
        #
        # Per user request: Send per-area notifications immediately, not waiting for all 6 assessors.
        # This enables faster turnaround for BLGUs.

        # Check if all areas have made a decision (approved or rework)
        all_areas_decided = True
        any_rework = False
        for area_id in range(1, 7):  # 6 governance areas
            area_data = assessment.area_submission_status.get(str(area_id), {})
            status = area_data.get("status", "draft") if isinstance(area_data, dict) else "draft"
            if status in ("draft", "submitted", "in_review"):
                all_areas_decided = False
            if status == "rework":
                any_rework = True

        # Only update global status if ALL areas have made their decision
        if all_areas_decided and any_rework:
            if assessment.status != AssessmentStatus.REWORK:
                assessment.status = AssessmentStatus.REWORK
                assessment.rework_requested_at = now
                assessment.rework_requested_by = assessor.id
                self.logger.info(
                    f"All 6 areas decided, at least one needs rework. "
                    f"Moving assessment {assessment_id} to REWORK status."
                )
        elif all_areas_decided and not any_rework:
            # All areas approved, move to validation
            if assessment.status != AssessmentStatus.AWAITING_FINAL_VALIDATION:
                assessment.status = AssessmentStatus.AWAITING_FINAL_VALIDATION
                self.logger.info(
                    f"All 6 areas approved. Moving assessment {assessment_id} to AWAITING_FINAL_VALIDATION."
                )

        db.commit()

        # Per user request: Send per-area notification immediately
        # This triggers notification to BLGU for this specific area's rework
        try:
            from app.services.notification_service import notification_service

            # Queue immediate per-area rework notification
            notification_service.queue_per_area_rework_notification(
                db=db,
                assessment=assessment,
                governance_area_id=governance_area_id,
                governance_area_name=governance_area_name,
                assessor=assessor,
                comments=comments,
            )
            self.logger.info(
                f"Queued per-area rework notification for area {governance_area_id} ({governance_area_name}) "
                f"to BLGU for assessment {assessment_id}"
            )
        except Exception as e:
            # Don't fail the rework request if notification fails
            self.logger.warning(f"Failed to queue per-area rework notification: {e}")

        self.logger.info(
            f"Assessor {assessor.id} flagged area {governance_area_id} ({governance_area_name}) for rework "
            f"for assessment {assessment_id}. Global status: {assessment.status.value}"
        )

        return {
            "success": True,
            "message": f"Area '{governance_area_name}' flagged for rework",
            "assessment_id": assessment_id,
            "governance_area_id": governance_area_id,
            "new_status": "rework",
            "all_areas_approved": assessment.all_areas_approved(),
            "all_areas_decided": all_areas_decided,
            "assessment_status": assessment.status.value,
            # NEW: Include per-area notification info
            "notification_sent": True,
        }

    def send_assessment_for_rework(self, db: Session, assessment_id: int, assessor: User) -> dict:
        """
        Phase 1 (Table Assessment): Send assessment back to BLGU user for rework.

        This is ONLY used by Assessors in Phase 1 (Table Assessment).
        Validators in Phase 2 use "Calibration" instead, not Rework.

        Args:
            db: Database session
            assessment_id: ID of the assessment to send for rework
            assessor: The assessor performing the action (Phase 1)

        Returns:
            dict: Result of the rework operation

        Raises:
            ValueError: If assessment not found or rework not allowed
            PermissionError: If assessor doesn't have permission (validators cannot use this)
        """
        # Get the assessment
        assessment = (
            db.query(Assessment)
            .options(joinedload(Assessment.blgu_user).joinedload(User.barangay))
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # After workflow restructuring:
        # - ASSESSOR (area-specific with assessor_area_id): Can request REWORK for their area
        # - VALIDATOR (system-wide, no area): Should NOT use this - they use Calibration
        is_assessor = assessor.role == UserRole.ASSESSOR and assessor.assessor_area_id is not None
        if not is_assessor:
            raise ValueError(
                "Only Assessors can send for Rework. Validators use Calibration for quality review."
            )

        # Check if rework is allowed (rework_count must be 0 - only ONE rework cycle)
        if assessment.rework_count != 0:
            raise ValueError("Assessment has already been sent for rework. Cannot send again.")

        # Enforce PRD: Only allow rework from Submitted status
        # Accept both SUBMITTED and SUBMITTED_FOR_REVIEW (legacy) statuses
        if assessment.status not in [
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.SUBMITTED_FOR_REVIEW,
        ]:
            raise ValueError("Rework is only allowed when assessment is Submitted for Review")

        # Phase 1 Assessors: Must have at least one indicator with:
        # 1. MOV annotations (file-level feedback)
        # 2. Manual "Flag for Rework" toggle enabled
        # NOTE: Comments alone are notes and don't trigger rework

        # Check for MOV annotations
        mov_file_ids = [mf.id for mf in assessment.mov_files]
        has_annotations = False
        if mov_file_ids:
            annotation_count = (
                db.query(MOVAnnotation).filter(MOVAnnotation.mov_file_id.in_(mov_file_ids)).count()
            )
            has_annotations = annotation_count > 0

        # Check for manual rework flags in response_data
        has_manual_rework_flag = any(
            response.response_data
            and response.response_data.get("assessor_manual_rework_flag") is True
            for response in assessment.responses
        )

        if not has_annotations and not has_manual_rework_flag:
            raise ValueError(
                "At least one indicator must be flagged for rework. "
                "Toggle 'Flag for Rework' on indicators that need BLGU to re-upload files, "
                "or add annotations on specific MOV files."
            )

        # Update assessment status and rework count
        assessment.status = AssessmentStatus.REWORK
        assessment.rework_count = 1
        assessment.rework_requested_at = datetime.utcnow()
        assessment.rework_requested_by = assessor.id
        # Note: updated_at is automatically handled by SQLAlchemy's onupdate

        # Calculate per-assessment rework deadline based on year's window configuration
        try:
            year_config = assessment_year_service.get_year_by_number(db, assessment.assessment_year)
            if year_config and year_config.rework_window_days:
                assessment.per_assessment_rework_deadline = (
                    assessment.rework_requested_at + timedelta(days=year_config.rework_window_days)
                )
                # Also set grace_period_expires_at for consistency with existing deadline logic
                assessment.grace_period_expires_at = assessment.per_assessment_rework_deadline
                self.logger.info(
                    f"[SEND REWORK] Set rework deadline: {assessment.per_assessment_rework_deadline} "
                    f"({year_config.rework_window_days} days from now)"
                )
        except Exception as e:
            self.logger.warning(f"Failed to calculate rework deadline: {e}")

        # Get all MOV annotations for this assessment to check for indicator-level feedback
        mov_file_ids = [mf.id for mf in assessment.mov_files]
        annotations_by_indicator = {}

        if mov_file_ids:
            all_annotations = (
                db.query(MOVAnnotation).filter(MOVAnnotation.mov_file_id.in_(mov_file_ids)).all()
            )

            # Group annotations by indicator_id
            for annotation in all_annotations:
                # Get the MOV file to find its indicator_id
                mov_file = next(
                    (mf for mf in assessment.mov_files if mf.id == annotation.mov_file_id),
                    None,
                )
                if mov_file:
                    indicator_id = mov_file.indicator_id
                    if indicator_id not in annotations_by_indicator:
                        annotations_by_indicator[indicator_id] = []
                    annotations_by_indicator[indicator_id].append(annotation)

        # Mark responses requiring rework based on:
        # 1. MOV annotations (always triggers rework - file-level feedback)
        # 2. Manual "Flag for Rework" toggle (assessor_manual_rework_flag in response_data)
        # NOTE: Comments alone do NOT trigger rework - only annotations or explicit flag
        flagged_indicators: list[dict] = []  # Track indicators for activity logging
        for response in assessment.responses:
            has_mov_annotations = (
                response.indicator_id in annotations_by_indicator
                and len(annotations_by_indicator[response.indicator_id]) > 0
            )

            # Check for manual rework flag in response_data
            has_manual_rework_flag = (
                response.response_data
                and response.response_data.get("assessor_manual_rework_flag") is True
            )

            # Mark for rework if assessor flagged it (via annotations OR manual toggle)
            # Comments alone are just notes - they don't require re-upload
            # CRITICAL: Also reset is_completed to False so BLGU must re-complete the indicator
            if has_mov_annotations or has_manual_rework_flag:
                response.requires_rework = True
                response.is_completed = False

                # CRITICAL: Clear validation_status and checklist data immediately
                # This ensures assessors start with clean checklists when BLGU resubmits
                response.validation_status = None

                # Clear assessor checklist data (assessor_val_ prefix)
                if response.response_data:
                    response.response_data = {
                        k: v
                        for k, v in response.response_data.items()
                        if not k.startswith("assessor_val_")
                    }

                # Track indicator for individual logging
                flagged_indicators.append(
                    {
                        "response": response,
                        "has_annotations": has_mov_annotations,
                        "has_manual_flag": has_manual_rework_flag,
                    }
                )

                self.logger.info(
                    f"[SEND REWORK] Cleared checklist data for response {response.id} (indicator {response.indicator_id})"
                )

        db.commit()
        db.refresh(assessment)

        # Get barangay name for activity logging
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Log activity: Rework requested
        try:
            assessment_activity_service.log_activity(
                db=db,
                assessment_id=assessment_id,
                action="rework_requested",
                user_id=assessor.id,  # type: ignore
                from_status=AssessmentStatus.SUBMITTED_FOR_REVIEW.value,
                to_status=AssessmentStatus.REWORK.value,
                extra_data={
                    "barangay_name": barangay_name,
                    "has_annotations": has_annotations,
                    "has_manual_rework_flag": has_manual_rework_flag,
                },
                description=f"Rework requested by {assessor.name}",
            )

            # Log individual indicator-level activities for each flagged indicator
            from app.schemas.assessment_activity import ActivityAction

            for flagged in flagged_indicators:
                response = flagged["response"]
                indicator = response.indicator
                if indicator:
                    governance_area = indicator.governance_area
                    assessment_activity_service.log_indicator_activity(
                        db=db,
                        assessment_id=assessment_id,
                        indicator_id=indicator.id,
                        indicator_code=indicator.indicator_code,
                        indicator_name=indicator.name,  # SQLAlchemy model uses 'name'
                        action=ActivityAction.INDICATOR_FLAGGED_REWORK.value,
                        user_id=assessor.id,  # type: ignore
                        governance_area_id=governance_area.id if governance_area else None,
                        governance_area_name=governance_area.name if governance_area else None,
                        extra_data={
                            "barangay_name": barangay_name,
                            "has_annotations": flagged["has_annotations"],
                            "has_manual_flag": flagged["has_manual_flag"],
                            "flagged_by": assessor.name,
                        },
                    )
        except Exception as e:
            self.logger.error(f"Failed to log rework activity: {e}")

        # Invalidate dashboard cache immediately so status changes are visible
        try:
            from app.core.cache import cache

            cache.delete_pattern("dashboard_kpis:*")
            self.logger.info(
                f"[SEND REWORK] Dashboard cache invalidated for assessment {assessment_id}"
            )
        except Exception as cache_error:
            self.logger.warning(f"Failed to invalidate dashboard cache: {cache_error}")

        # Trigger AI rework summary generation asynchronously using Celery
        summary_result = {"success": False, "skipped": True}
        try:
            from app.workers.intelligence_worker import generate_rework_summary_task

            # Queue the summary generation task to run in the background
            summary_task = generate_rework_summary_task.delay(assessment_id)
            summary_result = {
                "success": True,
                "message": "Rework summary generation queued successfully",
                "task_id": summary_task.id,
            }
        except Exception as e:
            # Log the error but don't fail the rework operation
            logger.error(
                f"Failed to queue rework summary generation for assessment {assessment_id}: {e}",
                exc_info=True,
            )
            summary_result = {"success": False, "error": str(e)}

        # Trigger notification asynchronously using Celery
        try:
            from app.workers.notifications import send_rework_notification

            # Queue the notification task to run in the background
            task = send_rework_notification.delay(assessment_id)
            notification_result = {
                "success": True,
                "message": "Rework notification queued successfully",
                "task_id": task.id,
            }
        except Exception as e:
            # Log the error but don't fail the rework operation
            logger.error("Failed to queue notification", exc_info=True)
            notification_result = {"success": False, "error": str(e)}

        return {
            "success": True,
            "message": "Assessment sent for rework successfully",
            "assessment_id": assessment_id,
            "new_status": assessment.status.value,
            "rework_count": assessment.rework_count,
            "summary_generation_result": summary_result,
            "notification_result": notification_result,
        }

    def submit_for_calibration(self, db: Session, assessment_id: int, validator: User) -> dict:
        """
        Phase 2 (Table Validation): Submit assessment for calibration.

        After workflow restructuring:
        - VALIDATOR is system-wide (3 users, no area assignment)
        - CALIBRATION is limited to 1 round per assessment (tracked by calibration_round_used)
        - Validators review ALL governance areas and can flag indicators for calibration

        Calibration is used by Validators to send flagged indicators back to BLGU
        for corrections. This affects ALL governance areas (not just one).

        Args:
            db: Database session
            assessment_id: ID of the assessment to calibrate
            validator: The validator performing the action (system-wide, no area required)

        Returns:
            dict: Result of the calibration operation

        Raises:
            ValueError: If assessment not found or calibration not allowed
            PermissionError: If user is not a validator
        """
        # Get the assessment
        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                selectinload(Assessment.responses).joinedload(AssessmentResponse.indicator),
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # CRITICAL: Only Validators (system-wide) can submit for calibration
        is_validator = validator.role == UserRole.VALIDATOR
        if not is_validator:
            raise PermissionError(
                "Only Validators can submit for calibration. Assessors should use 'Send for Rework' instead."
            )

        # Must be in AWAITING_FINAL_VALIDATION status (all 6 areas approved by assessors)
        if assessment.status != AssessmentStatus.AWAITING_FINAL_VALIDATION:
            raise ValueError(
                "Calibration is only allowed when assessment is in AWAITING_FINAL_VALIDATION status "
                "(after all 6 governance areas are approved by assessors)"
            )

        # Validator must have at least one indicator flagged for calibration
        flagged_responses = [r for r in assessment.responses if r.flagged_for_calibration]

        if not flagged_responses:
            raise ValueError(
                "At least one indicator must be flagged for calibration. "
                "Use the 'Flag for Calibration' toggle on indicators that need corrections."
            )

        # Get the governance area IDs of the flagged indicators
        requested_area_ids: set[int] = set(
            r.indicator.governance_area_id
            for r in flagged_responses
            if r.indicator is not None and r.indicator.governance_area_id is not None
        )

        # Check if any of these areas have ALREADY been calibrated (per-area calibration logic)
        # Each governance area can only be calibrated ONCE
        already_calibrated = set(assessment.calibrated_area_ids or [])
        areas_already_used = requested_area_ids.intersection(already_calibrated)

        if areas_already_used:
            # Get area names for better error message
            area_names = []
            for area_id in areas_already_used:
                area = db.query(GovernanceArea).filter(GovernanceArea.id == area_id).first()
                area_names.append(area.name if area else f"Area {area_id}")
            raise ValueError(
                f"Calibration has already been used for the following governance area(s): {', '.join(area_names)}. "
                f"Each governance area can only be calibrated once."
            )

        # CRITICAL: Flag the JSON column as modified so SQLAlchemy detects the change

        # Update assessment status to REWORK
        assessment.status = AssessmentStatus.REWORK
        assessment.rework_requested_at = datetime.utcnow()
        assessment.calibration_requested_at = datetime.utcnow()

        # Calculate per-assessment calibration deadline based on year's window configuration
        try:
            year_config = assessment_year_service.get_year_by_number(db, assessment.assessment_year)
            if year_config and year_config.calibration_window_days:
                assessment.per_assessment_calibration_deadline = (
                    assessment.calibration_requested_at
                    + timedelta(days=year_config.calibration_window_days)
                )
                # Also set grace_period_expires_at for consistency with existing deadline logic
                assessment.grace_period_expires_at = assessment.per_assessment_calibration_deadline
                self.logger.info(
                    f"[CALIBRATION] Set calibration deadline: {assessment.per_assessment_calibration_deadline} "
                    f"({year_config.calibration_window_days} days from now)"
                )
        except Exception as e:
            self.logger.warning(f"Failed to calculate calibration deadline: {e}")

        assessment.rework_requested_by = validator.id
        # Note: Do NOT increment rework_count for calibration - it's a separate mechanism

        # Set calibration flags so BLGU knows to submit back to Validator (not Assessor)
        assessment.is_calibration_rework = True
        assessment.calibration_validator_id = validator.id
        assessment.calibration_count += 1  # Legacy: still increment for backwards compatibility
        # Keep global calibration_round_used for backward compatibility (analytics/statistics)
        # Note: The actual per-area calibration blocking is done via calibrated_area_ids
        # This global flag just indicates that at least one area has been calibrated
        if not assessment.calibration_round_used:
            assessment.calibration_round_used = True

        # Update calibrated_area_ids by APPENDING the governance area IDs of flagged indicators
        # This is CRITICAL for:
        # 1. Per-area calibration tracking - each area can only be calibrated ONCE
        # 2. submit_for_calibration_review to properly clear feedback_comments
        # - The cleanup logic at assessments.py:1668 filters by: r.indicator.governance_area_id in calibrated_area_ids
        from sqlalchemy.orm.attributes import flag_modified

        # Note: requested_area_ids and already_calibrated are calculated above in the per-area validation check
        new_calibrated_area_ids: list[int] = list(requested_area_ids)

        # Append to existing calibrated_area_ids (reuse already_calibrated set from validation check)
        all_calibrated = already_calibrated.union(requested_area_ids)
        assessment.calibrated_area_ids = sorted(all_calibrated)  # Sort for consistent ordering
        flag_modified(assessment, "calibrated_area_ids")  # Ensure SQLAlchemy tracks the JSON change
        self.logger.info(
            f"[CALIBRATION] Updated calibrated_area_ids: {assessment.calibrated_area_ids} "
            f"(newly calibrated: {new_calibrated_area_ids})"
        )

        # Mark flagged indicators for rework
        # These are the indicators the BLGU needs to correct and re-upload
        calibrated_count = 0
        calibrated_indicator_ids = []
        for response in flagged_responses:
            response.requires_rework = True
            response.is_completed = False

            # Clear validation_status for this indicator so validator can re-validate after BLGU fixes it
            response.validation_status = None

            # Reset the flag after processing
            response.flagged_for_calibration = False

            # Clear validator checklist data (assessor_val_ and validator_val_ prefixes)
            if response.response_data:
                response.response_data = {
                    k: v
                    for k, v in response.response_data.items()
                    if not k.startswith("assessor_val_") and not k.startswith("validator_val_")
                }

            calibrated_count += 1
            calibrated_indicator_ids.append(response.indicator_id)
            self.logger.info(
                f"[CALIBRATION] Marked response {response.id} (indicator {response.indicator_id}) for calibration - was flagged"
            )

        db.commit()
        db.refresh(assessment)

        # Get barangay name for activity logging
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Log activity: Calibration requested
        try:
            assessment_activity_service.log_activity(
                db=db,
                assessment_id=assessment_id,
                action="calibration_requested",
                user_id=validator.id,  # type: ignore
                from_status=AssessmentStatus.AWAITING_FINAL_VALIDATION.value,
                to_status=AssessmentStatus.REWORK.value,
                extra_data={
                    "barangay_name": barangay_name,
                    "calibrated_indicator_ids": calibrated_indicator_ids,
                    "calibrated_count": calibrated_count,
                },
                description=f"Calibration requested by {validator.name} for {calibrated_count} indicator(s)",
            )

            # Log individual indicator-level activities for each calibrated indicator
            from app.schemas.assessment_activity import ActivityAction

            for response in flagged_responses:
                indicator = response.indicator
                if indicator:
                    governance_area = indicator.governance_area
                    assessment_activity_service.log_indicator_activity(
                        db=db,
                        assessment_id=assessment_id,
                        indicator_id=indicator.id,
                        indicator_code=indicator.indicator_code,
                        indicator_name=indicator.name,  # SQLAlchemy model uses 'name'
                        action=ActivityAction.INDICATOR_FLAGGED_CALIBRATION.value,
                        user_id=validator.id,  # type: ignore
                        governance_area_id=governance_area.id if governance_area else None,
                        governance_area_name=governance_area.name if governance_area else None,
                        extra_data={
                            "barangay_name": barangay_name,
                            "flagged_by": validator.name,
                        },
                    )
        except Exception as e:
            self.logger.error(f"Failed to log calibration activity: {e}")

        # Invalidate dashboard cache immediately so calibration status is visible
        try:
            from app.core.cache import cache

            cache.delete_pattern("dashboard_kpis:*")
            self.logger.info(
                f"[CALIBRATION] Dashboard cache invalidated for assessment {assessment_id}"
            )
        except Exception as cache_error:
            self.logger.warning(f"Failed to invalidate dashboard cache: {cache_error}")

        # Trigger notification asynchronously using Celery
        notification_result = {"success": False, "skipped": True}
        try:
            from app.workers.notifications import send_calibration_notification

            # Queue the calibration notification task (Notification #5)
            task = send_calibration_notification.delay(assessment_id)
            notification_result = {
                "success": True,
                "message": "Calibration notification queued successfully",
                "task_id": task.id,
            }
        except Exception as e:
            logger.error("Failed to queue calibration notification", exc_info=True)
            notification_result = {"success": False, "error": str(e)}

        # Trigger AI calibration summary generation asynchronously using Celery
        summary_result = {"success": False, "skipped": True}
        try:
            from app.workers.intelligence_worker import (
                generate_calibration_summary_task,
            )

            # Validators are system-wide, so generate summary for all calibrated indicators
            summary_task = generate_calibration_summary_task.delay(
                assessment_id,
                None,  # No governance_area_id since validators are system-wide
            )
            summary_result = {
                "success": True,
                "message": "Calibration summary generation queued successfully",
                "task_id": summary_task.id,
            }
        except Exception as e:
            logger.error(
                f"Failed to queue calibration summary generation for assessment {assessment_id}: {e}",
                exc_info=True,
            )
            summary_result = {"success": False, "error": str(e)}

        return {
            "success": True,
            "message": f"Assessment submitted for calibration. {calibrated_count} indicator(s) marked for correction.",
            "assessment_id": assessment_id,
            "new_status": assessment.status.value,
            "calibrated_indicators_count": calibrated_count,
            "calibrated_indicator_ids": calibrated_indicator_ids,
            "notification_result": notification_result,
            "summary_result": summary_result,
        }

    def finalize_assessment(self, db: Session, assessment_id: int, assessor: User) -> dict:
        """
        Phase 1 (Assessors): Pass assessment to Phase 2 (Table Validation).
        Phase 2 (Validators): Finalize assessment with final P/F/C statuses.

        - Assessors (Phase 1): If all Pass/Conditional, move to AWAITING_FINAL_VALIDATION
        - Validators (Phase 2): Set final P/F/C statuses, then move to COMPLETED

        Args:
            db: Database session
            assessment_id: ID of the assessment to finalize
            assessor: The user performing the action (assessor or validator)

        Returns:
            dict: Result of the finalization operation

        Raises:
            ValueError: If assessment not found or cannot be finalized
        """
        # Get the assessment
        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                selectinload(Assessment.responses).joinedload(AssessmentResponse.indicator),
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Check if assessment can be finalized
        if assessment.status == AssessmentStatus.COMPLETED:
            raise ValueError("Assessment has already been completed")

        if assessment.status == AssessmentStatus.DRAFT:
            raise ValueError("Cannot finalize a draft assessment")

        # After workflow restructuring:
        # - ASSESSOR (Phase 1): Area-specific (has assessor_area_id)
        # - VALIDATOR (Phase 2): System-wide (no area required)
        is_assessor = assessor.role == UserRole.ASSESSOR
        is_validator = assessor.role == UserRole.VALIDATOR

        # [DEBUG] Start
        self.logger.info(f"[FINALIZE DEBUG] Starting finalize for {assessment_id}")

        if is_validator:
            # ===== PHASE 2: VALIDATORS (Table Validation) =====
            # After workflow restructuring: Validators are SYSTEM-WIDE (review all areas)
            self.logger.info("[FINALIZE DEBUG] Phase 2: Validator check (system-wide)")

            # Handle cases where finalization is called on an already-processed assessment
            if assessment.status == AssessmentStatus.AWAITING_MLGOO_APPROVAL:
                # Assessment already fully validated - return success (idempotent)
                return {
                    "success": True,
                    "message": "Assessment already fully validated and awaiting MLGOO approval",
                    "assessment_id": assessment_id,
                    "new_status": assessment.status.value,
                    "already_finalized": True,
                }

            # Must be in AWAITING_FINAL_VALIDATION status (all 6 areas approved by assessors)
            if assessment.status != AssessmentStatus.AWAITING_FINAL_VALIDATION:
                raise ValueError(
                    "Validators can only finalize assessments in AWAITING_FINAL_VALIDATION status"
                )

            # Validators review ALL indicators (system-wide)
            # Check if all responses have validation_status set
            unreviewed_responses = [
                response.id
                for response in assessment.responses
                if response.validation_status is None
            ]

            if unreviewed_responses:
                raise ValueError(
                    f"Cannot finalize. Unreviewed response IDs: {unreviewed_responses}"
                )

            # All responses validated - move to AWAITING_MLGOO_APPROVAL
            # Validators CAN finalize even with FAIL indicators (that's the final result)
            # MLGOO Chairman will review and approve this final result
            assessment.status = AssessmentStatus.AWAITING_MLGOO_APPROVAL

        elif is_assessor:
            # ===== PHASE 1: ASSESSORS (Per-Area Approval) =====
            # After workflow restructuring (Jan 2026), assessors are area-specific.
            # Each of the 6 assessors reviews their assigned governance area and uses
            # the per-area approve endpoint: POST /assessments/{id}/areas/{area_id}/approve
            #
            # The legacy finalize_assessment() endpoint should NOT be used by assessors
            # as it would bypass the per-area approval workflow and create inconsistent state.
            #
            # When all 6 areas are approved via approve_area(), the assessment automatically
            # transitions to AWAITING_FINAL_VALIDATION for the validator to review.
            self.logger.warning(
                f"[FINALIZE BLOCKED] Assessor {assessor.id} attempted to use legacy "
                f"finalize_assessment() for assessment {assessment_id}. "
                f"Assessors should use approve_area() endpoint instead."
            )
            raise ValueError(
                "Assessors should use the per-area approval endpoint. "
                "Please use POST /assessor/assessments/{id}/areas/{area_id}/approve "
                "to approve your governance area."
            )

        self.logger.info("[FINALIZE DEBUG] Validation checks passed. Committing to DB...")

        # Set validated_at timestamp
        current_db_assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        assessment.validated_at = (
            current_db_assessment.updated_at if current_db_assessment else datetime.utcnow()
        )
        # Note: updated_at is automatically handled by SQLAlchemy's onupdate

        db.commit()
        db.refresh(assessment)
        self.logger.info("[FINALIZE DEBUG] DB Commit success")

        # Get barangay name for activity logging
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Log activity: Review completed (assessor) or Validation completed (validator)
        try:
            if not is_validator and assessment.status == AssessmentStatus.AWAITING_FINAL_VALIDATION:
                # Assessor completed review
                assessment_activity_service.log_activity(
                    db=db,
                    assessment_id=assessment_id,
                    action="review_completed",
                    user_id=assessor.id,  # type: ignore
                    from_status=AssessmentStatus.SUBMITTED_FOR_REVIEW.value,
                    to_status=AssessmentStatus.AWAITING_FINAL_VALIDATION.value,
                    extra_data={"barangay_name": barangay_name},
                    description=f"Review completed by {assessor.name}",
                )
            elif is_validator and assessment.status == AssessmentStatus.AWAITING_MLGOO_APPROVAL:
                # All validators completed validation
                assessment_activity_service.log_activity(
                    db=db,
                    assessment_id=assessment_id,
                    action="validation_completed",
                    user_id=assessor.id,  # type: ignore
                    from_status=AssessmentStatus.AWAITING_FINAL_VALIDATION.value,
                    to_status=AssessmentStatus.AWAITING_MLGOO_APPROVAL.value,
                    extra_data={
                        "barangay_name": barangay_name,
                        "assessor_area_id": assessor.assessor_area_id,
                    },
                    description=f"Validation completed by {assessor.name}",
                )
        except Exception as e:
            self.logger.error(f"Failed to log finalize activity: {e}")

        # Notification #4: If assessor finalized (moved to AWAITING_FINAL_VALIDATION),
        # notify validators for all governance areas in the assessment
        if not is_validator and assessment.status == AssessmentStatus.AWAITING_FINAL_VALIDATION:
            try:
                from app.workers.notifications import (
                    send_ready_for_validation_notification,
                )

                # Get unique governance areas from assessment responses
                governance_area_ids = set(
                    response.indicator.governance_area_id
                    for response in assessment.responses
                    if response.indicator and response.indicator.governance_area_id
                )

                for ga_id in governance_area_ids:
                    send_ready_for_validation_notification.delay(assessment_id, ga_id)

                self.logger.info(
                    f"Triggered ready-for-validation notifications for assessment {assessment_id} "
                    f"to {len(governance_area_ids)} governance area(s)"
                )
            except Exception as e:
                self.logger.error(f"Failed to queue ready-for-validation notification: {e}")

        # Run classification algorithm synchronously
        # This must complete in <5 seconds to ensure real-time user experience
        self.logger.info("[FINALIZE DEBUG] Importing/Running classification...")
        from app.services.intelligence_service import intelligence_service

        try:
            classification_result = intelligence_service.classify_assessment(db, assessment_id)
        except Exception as e:
            # Log the error but don't fail the finalization operation
            logger.error("Failed to run classification", exc_info=True)
            classification_result = {"success": False, "error": str(e)}

        # Calculate BBI statuses for all active BBIs
        from app.services.bbi_service import bbi_service

        try:
            bbi_results = bbi_service.calculate_all_bbi_statuses(db, assessment_id)
            bbi_calculation_result = {
                "success": True,
                "message": f"Calculated {len(bbi_results)} BBI statuses",
                "bbi_count": len(bbi_results),
            }
        except Exception as e:
            # Log the error but don't fail the finalization operation
            logger.error("Failed to calculate BBI statuses", exc_info=True)
            bbi_calculation_result = {"success": False, "error": str(e)}

        # Notification #7: If validator completed ALL governance areas (status = AWAITING_MLGOO_APPROVAL),
        # notify MLGOO users for final approval
        notification_result = {
            "success": False,
            "message": "Not triggered - assessment not ready for MLGOO approval",
        }
        if assessment.status == AssessmentStatus.AWAITING_MLGOO_APPROVAL:
            try:
                from app.workers.notifications import (
                    send_ready_for_mlgoo_approval_notification,
                    send_validation_complete_notification,
                )

                # Queue MLGOO notification
                task = send_ready_for_mlgoo_approval_notification.delay(assessment_id)

                # Queue BLGU notification
                is_post_calibration = assessment.calibration_count > 0
                send_validation_complete_notification.delay(
                    assessment_id, is_post_calibration=is_post_calibration
                )

                notification_result = {
                    "success": True,
                    "message": "Ready for MLGOO approval and validation complete notifications queued",
                    "task_id": task.id,
                }
                self.logger.info(
                    f"Triggered ready-for-MLGOO-approval and validation-complete notifications "
                    f"for assessment {assessment_id} (post_calibration={is_post_calibration})"
                )
            except Exception as e:
                # Log the error but don't fail the finalization operation
                self.logger.error(f"Failed to queue notification: {e}")
                notification_result = {"success": False, "error": str(e)}

        return {
            "success": True,
            "message": "Assessment review completed and sent to validator for final validation",
            "assessment_id": assessment_id,
            "new_status": assessment.status.value,
            "validated_at": assessment.validated_at.isoformat() + "Z"
            if assessment.validated_at
            else None,
            "classification_result": classification_result,
            "bbi_calculation_result": bbi_calculation_result,
            "notification_result": notification_result,
        }

    def get_analytics(self, db: Session, assessor: User) -> dict[str, Any]:
        """
        Get analytics data for the assessor's governance area.

        Calculates:
        - Overview: Performance metrics (total assessed, passed, failed, pass rate, trends)
        - Hotspots: Top underperforming indicators with affected barangays
        - Workflow: Counts by status, average review times, rework metrics

        Args:
            db: Database session
            assessor: The assessor requesting analytics

        Returns:
            dict: Analytics data structured for AssessorAnalyticsResponse
        """
        # Get governance area name
        governance_area_name = "All Areas"  # Default for assessors without area assignment
        if assessor.assessor_area_id is not None:
            governance_area = (
                db.query(GovernanceArea)
                .filter(GovernanceArea.id == assessor.assessor_area_id)
                .first()
            )
            governance_area_name = governance_area.name if governance_area else "Unknown"

        # Get assessments based on assessor's governance area assignment
        # - If assessor has assessor_area_id: Filter by that governance area
        # - If assessor has no assessor_area_id: Show all assessments (system-wide)
        query = (
            db.query(Assessment)
            .join(AssessmentResponse, AssessmentResponse.assessment_id == Assessment.id)
            .join(Indicator, Indicator.id == AssessmentResponse.indicator_id)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                joinedload(Assessment.responses).joinedload(AssessmentResponse.indicator),
            )
        )

        # Filter by governance area only if assessor has assessor_area_id
        if assessor.assessor_area_id is not None:
            query = query.filter(Indicator.governance_area_id == assessor.assessor_area_id)

        # Filter assessments by the current assessor (those reviewed by them)
        assessments = (
            query.filter(
                Assessment.status.in_(
                    [
                        AssessmentStatus.SUBMITTED_FOR_REVIEW,
                        AssessmentStatus.NEEDS_REWORK,
                        AssessmentStatus.VALIDATED,
                        AssessmentStatus.AWAITING_FINAL_VALIDATION,  # Include assessor-completed assessments
                    ]
                ),
                Assessment.reviewed_by
                == assessor.id,  # Only count assessments reviewed by THIS assessor
            )
            .distinct(Assessment.id)
            .all()
        )

        # Calculate overview (performance metrics)
        total_assessed = len(assessments)
        passed = sum(1 for a in assessments if a.final_compliance_status == ComplianceStatus.PASSED)
        failed = sum(1 for a in assessments if a.final_compliance_status == ComplianceStatus.FAILED)
        # If compliance status not set, count based on validation status
        # An assessment passes if majority of responses are Pass
        if total_assessed > 0:
            assessments_without_compliance = [
                a for a in assessments if a.final_compliance_status is None
            ]
            for a in assessments_without_compliance:
                if a.responses:
                    pass_count = sum(
                        1 for r in a.responses if r.validation_status == ValidationStatus.PASS
                    )
                    fail_count = sum(
                        1 for r in a.responses if r.validation_status == ValidationStatus.FAIL
                    )
                    if pass_count > fail_count:
                        passed += 1
                    elif fail_count > 0:
                        failed += 1

        pass_rate = (passed / total_assessed * 100) if total_assessed > 0 else 0.0

        # Simple trend series: last 6 months of assessment submissions
        # This is a minimal implementation - can be extended with more granular data
        trend_series = []
        if assessments:
            # Group by month (simplified - just show last 6 months)
            current_date = datetime.utcnow()
            for i in range(6):
                month_date = current_date - timedelta(days=30 * (5 - i))
                month_assessed = sum(
                    1
                    for a in assessments
                    if a.submitted_at
                    and a.submitted_at.year == month_date.year
                    and a.submitted_at.month == month_date.month
                )
                trend_series.append(
                    {
                        "month": month_date.strftime("%Y-%m"),
                        "assessed": month_assessed,
                    }
                )

        # Calculate hotspots (top underperforming indicators)
        # Find indicators with most failures (validation_status = Fail)
        indicator_failures: dict[int, dict[str, Any]] = {}
        barangay_failures: dict[int, list[str]] = {}

        for assessment in assessments:
            barangay_name = getattr(
                getattr(assessment.blgu_user, "barangay", None), "name", "Unknown"
            )
            for response in assessment.responses:
                # Filter by governance area only if assessor has assessor_area_id
                if assessor.assessor_area_id is not None:
                    if response.indicator.governance_area_id != assessor.assessor_area_id:
                        continue

                if response.validation_status == ValidationStatus.FAIL:
                    indicator_id = response.indicator.id
                    indicator_name = response.indicator.name

                    if indicator_id not in indicator_failures:
                        indicator_failures[indicator_id] = {
                            "indicator": indicator_name,
                            "failed_count": 0,
                            "barangays": [],
                        }
                        barangay_failures[indicator_id] = []

                    indicator_failures[indicator_id]["failed_count"] += 1
                    if barangay_name not in barangay_failures[indicator_id]:
                        barangay_failures[indicator_id].append(barangay_name)
                        indicator_failures[indicator_id]["barangays"].append(barangay_name)

        # Convert to list and sort by failed_count (top 10)
        hotspots_list = [
            {
                "indicator": data["indicator"],
                "indicator_id": indicator_id,
                "failed_count": data["failed_count"],
                "barangays": data["barangays"],
                "reason": None,  # Can be extended with feedback comments analysis
            }
            for indicator_id, data in sorted(
                indicator_failures.items(),
                key=lambda x: x[1]["failed_count"],
                reverse=True,
            )[:10]
        ]

        # Calculate workflow metrics
        total_reviewed = sum(
            1
            for a in assessments
            if a.status == AssessmentStatus.VALIDATED
            or any(r.validation_status is not None for r in a.responses)
        )

        # Calculate average time to first review
        review_times = []
        for assessment in assessments:
            if assessment.submitted_at:
                # Find first validation timestamp from responses
                first_validation = None
                for response in assessment.responses:
                    if response.validation_status is not None:
                        # Use updated_at as proxy for validation time
                        if first_validation is None or response.updated_at < first_validation:
                            first_validation = response.updated_at

                if first_validation:
                    time_diff = (first_validation - assessment.submitted_at).total_seconds() / (
                        24 * 3600
                    )  # Convert to days
                    if time_diff > 0:
                        review_times.append(time_diff)

        avg_time_to_first_review = sum(review_times) / len(review_times) if review_times else 0.0

        # Calculate rework cycle time
        rework_times = []
        rework_count = 0
        for assessment in assessments:
            if assessment.rework_count > 0:
                rework_count += 1
                # Simplified: estimate rework cycle time from status transitions
                # Time from submission to validation (if validated after rework)
                if (
                    assessment.submitted_at
                    and assessment.validated_at
                    and assessment.validated_at > assessment.submitted_at
                ):
                    time_diff = (
                        assessment.validated_at - assessment.submitted_at
                    ).total_seconds() / (24 * 3600)
                    rework_times.append(time_diff)

        avg_rework_cycle_time = sum(rework_times) / len(rework_times) if rework_times else 0.0

        rework_rate = (rework_count / total_assessed * 100) if total_assessed > 0 else 0.0

        # Counts by status
        counts_by_status: dict[str, int] = {}
        for status in AssessmentStatus:
            count = sum(1 for a in assessments if a.status == status)
            if count > 0:
                counts_by_status[status.value] = count

        # Build response
        return {
            "overview": {
                "total_assessed": total_assessed,
                "passed": passed,
                "failed": failed,
                "pass_rate": round(pass_rate, 2),
                "trend_series": trend_series,
            },
            "hotspots": hotspots_list,
            "workflow": {
                "avg_time_to_first_review": round(avg_time_to_first_review, 1),
                "avg_rework_cycle_time": round(avg_rework_cycle_time, 1),
                "total_reviewed": total_reviewed,
                "rework_rate": round(rework_rate, 2),
                "counts_by_status": counts_by_status,
            },
            "assessment_period": "SGLGB 2024",  # Can be made dynamic
            "governance_area_name": governance_area_name,
        }

    # =========================================================================
    # Review History Methods
    # =========================================================================

    def get_review_history(
        self,
        db: Session,
        user: User,
        assessment_year: int | None = None,
        page: int = 1,
        page_size: int = 20,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        outcome: str | None = None,
    ) -> dict:
        """
        Get paginated review history for assessors and validators.

        Shows COMPLETED assessments that the user has reviewed:
        - Assessors: Assessments where reviewed_by == user.id
        - Validators: Assessments with responses in their governance area

        Args:
            db: Database session
            user: Current user (assessor or validator)
            assessment_year: Optional year filter (defaults to active year)
            page: Page number (1-indexed)
            page_size: Items per page (max 100)
            date_from: Filter by completion date >= date_from
            date_to: Filter by completion date <= date_to
            outcome: Filter by final_compliance_status (PASSED/FAILED)

        Returns:
            Paginated list of review history items with summary counts
        """
        from sqlalchemy import func

        # Get active year if not specified
        if assessment_year is None:
            assessment_year = assessment_year_service.get_active_year_number(db)

        # Determine if user is a validator (system-wide access, assessor_area_id = NULL)
        is_validator = user.role == UserRole.VALIDATOR

        # Base query for COMPLETED assessments
        if is_validator:
            # Validators: System-wide access - show ALL completed assessments
            # This allows validators working in clusters to coordinate offline
            query = db.query(Assessment).filter(
                Assessment.status == AssessmentStatus.COMPLETED,
            )
        else:
            # Assessors: Show assessments they reviewed (reviewed_by == user.id)
            query = db.query(Assessment).filter(
                Assessment.status == AssessmentStatus.COMPLETED,
                Assessment.reviewed_by == user.id,
            )

        # Apply year filter
        if assessment_year:
            query = query.filter(Assessment.assessment_year == assessment_year)

        # Apply date filters (on completed_at which is mlgoo_approved_at or validated_at)
        if date_from:
            query = query.filter(
                func.coalesce(Assessment.mlgoo_approved_at, Assessment.validated_at) >= date_from
            )
        if date_to:
            query = query.filter(
                func.coalesce(Assessment.mlgoo_approved_at, Assessment.validated_at) <= date_to
            )

        # Apply outcome filter
        if outcome:
            query = query.filter(Assessment.final_compliance_status == outcome)

        # Get total count before pagination
        total = query.count()

        # Apply pagination and ordering (most recent first)
        offset = (page - 1) * page_size
        assessments = (
            query.options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                selectinload(Assessment.responses).joinedload(AssessmentResponse.indicator),
            )
            .order_by(func.coalesce(Assessment.mlgoo_approved_at, Assessment.validated_at).desc())
            .offset(offset)
            .limit(page_size)
            .all()
        )

        # Validators have system-wide access, no governance area filtering needed

        # Build response items
        items = []
        for assessment in assessments:
            # Get barangay info
            barangay_name = "Unknown"
            municipality_name = None  # Barangay model doesn't have municipality field
            if assessment.blgu_user and assessment.blgu_user.barangay:
                barangay_name = assessment.blgu_user.barangay.name

            # Count validation statuses for this assessment
            # Validators see ALL indicators (system-wide access)
            # Assessors also see all indicators (they reviewed the whole assessment)
            pass_count = 0
            fail_count = 0
            conditional_count = 0
            indicator_count = 0

            for response in assessment.responses:
                indicator_count += 1
                if response.validation_status == ValidationStatus.PASS:
                    pass_count += 1
                elif response.validation_status == ValidationStatus.FAIL:
                    fail_count += 1
                elif response.validation_status == ValidationStatus.CONDITIONAL:
                    conditional_count += 1

            # Determine completion date
            completed_at = assessment.mlgoo_approved_at or assessment.validated_at

            items.append(
                {
                    "assessment_id": assessment.id,
                    "barangay_name": barangay_name,
                    "municipality_name": municipality_name,
                    "governance_area_name": None,  # System-wide access, no specific area
                    "submitted_at": assessment.submitted_at,
                    "completed_at": completed_at,
                    "final_compliance_status": assessment.final_compliance_status,
                    "rework_count": assessment.rework_count or 0,
                    "calibration_count": len(assessment.calibrated_area_ids or []),
                    "was_reworked": (assessment.rework_count or 0) > 0,
                    "was_calibrated": len(assessment.calibrated_area_ids or []) > 0,
                    "indicator_count": indicator_count,
                    "pass_count": pass_count,
                    "fail_count": fail_count,
                    "conditional_count": conditional_count,
                }
            )

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_more": (page * page_size) < total,
        }

    def get_review_history_detail(
        self,
        db: Session,
        user: User,
        assessment_id: int,
    ) -> dict:
        """
        Get detailed per-indicator decisions for a specific completed assessment.

        Used when user expands a row to see inline indicator details.

        Args:
            db: Database session
            user: Current user (assessor or validator)
            assessment_id: The assessment to get details for

        Returns:
            Detailed indicator data including validation status, comments, etc.
        """
        # Load assessment with all related data
        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                selectinload(Assessment.responses)
                .joinedload(AssessmentResponse.indicator)
                .joinedload(Indicator.governance_area),
                selectinload(Assessment.responses)
                .selectinload(AssessmentResponse.feedback_comments)
                .joinedload(FeedbackComment.assessor),
                # Load MOV files at assessment level (they have indicator_id for filtering)
                selectinload(Assessment.mov_files),
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            return {"success": False, "message": "Assessment not found"}

        # Verify access
        is_validator = user.role == UserRole.VALIDATOR

        if is_validator:
            # Validators have system-wide access to all completed assessments
            has_access = assessment.status == AssessmentStatus.COMPLETED
        else:
            # Assessors must be the reviewer
            has_access = assessment.reviewed_by == user.id

        if not has_access:
            return {"success": False, "message": "Access denied"}

        # Get barangay info
        barangay_name = "Unknown"
        municipality_name = None  # Barangay model doesn't have municipality field
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Validators have system-wide access, no area filtering needed
        governance_area_name = None  # Not applicable for system-wide validators

        # Build indicator list (all indicators for validators, all indicators for assessors)
        indicators = []
        for response in assessment.responses:
            indicator = response.indicator
            if not indicator:
                continue

            # Build feedback comments list
            feedback_comments = []
            for fc in response.feedback_comments or []:
                assessor_name = "Unknown"
                assessor_role = None
                if fc.assessor:
                    assessor_name = fc.assessor.email or fc.assessor.full_name or "Unknown"
                    assessor_role = fc.assessor.role.value if fc.assessor.role else None

                feedback_comments.append(
                    {
                        "id": fc.id,
                        "comment": fc.comment,
                        "assessor_name": assessor_name,
                        "assessor_role": assessor_role,
                        "created_at": fc.created_at,
                        "is_internal_note": fc.is_internal_note or False,
                    }
                )

            # Sort comments by date (newest first)
            feedback_comments.sort(key=lambda x: x["created_at"], reverse=True)

            # Check for MOV annotations - MOV files are at assessment level with indicator_id
            has_mov_annotations = False
            indicator_mov_files = [
                mf
                for mf in (assessment.mov_files or [])
                if mf.indicator_id == indicator.id and mf.deleted_at is None
            ]
            mov_count = len(indicator_mov_files)
            for mov_file in indicator_mov_files:
                if hasattr(mov_file, "annotations") and mov_file.annotations:
                    has_mov_annotations = True
                    break

            # Get indicator's governance area name
            indicator_area_name = None
            if indicator.governance_area:
                indicator_area_name = indicator.governance_area.name

            indicators.append(
                {
                    "indicator_id": indicator.id,
                    "indicator_code": indicator.indicator_code or "",
                    "indicator_name": indicator.name or "",
                    "governance_area_name": indicator_area_name,
                    "validation_status": response.validation_status,
                    "assessor_remarks": response.assessor_remarks,
                    "flagged_for_calibration": response.flagged_for_calibration or False,
                    "requires_rework": response.requires_rework or False,
                    "feedback_comments": feedback_comments,
                    "has_mov_annotations": has_mov_annotations,
                    "mov_count": mov_count,
                }
            )

        # Sort indicators by code
        indicators.sort(key=lambda x: x["indicator_code"])

        # Completion date
        completed_at = assessment.mlgoo_approved_at or assessment.validated_at

        return {
            "success": True,
            "assessment_id": assessment.id,
            "assessment_year": assessment.assessment_year,
            "barangay_name": barangay_name,
            "municipality_name": municipality_name,
            "governance_area_name": governance_area_name,
            "submitted_at": assessment.submitted_at,
            "completed_at": completed_at,
            "final_compliance_status": assessment.final_compliance_status,
            "rework_comments": assessment.rework_comments,
            "calibration_comments": None,  # Could add if needed
            "indicators": indicators,
        }

    def get_validator_dashboard(
        self, db: Session, validator: User, year: int | None = None, include_draft: bool = False
    ) -> dict[str, Any]:
        """
        Get comprehensive validator dashboard data.

        Validators have system-wide access and can see ALL assessments across
        all governance areas. This allows validators working in clusters to
        coordinate offline and share workload.

        Args:
            db: Database session
            validator: The validator user (system-wide access)
            year: Optional year filter
            include_draft: Include draft assessments

        Returns:
            dict: Dashboard data with all assessments (system-wide)
        """

        from app.db.models.barangay import Barangay
        from app.db.models.governance_area import GovernanceArea

        # Validators have system-wide access - no area filtering
        # Get all governance areas for reference
        governance_areas = db.query(GovernanceArea).all()
        governance_area_map = {ga.id: ga for ga in governance_areas}

        # Base query for ALL assessments (system-wide access for validators)
        # PERFORMANCE: Eager load relationships to prevent N+1 queries
        base_query = db.query(Assessment).options(
            joinedload(Assessment.blgu_user).joinedload(User.barangay),
            selectinload(Assessment.responses).joinedload(AssessmentResponse.indicator),
        )

        # Apply year filter
        if year is not None:
            base_query = base_query.filter(Assessment.assessment_year == year)

        # Get ALL assessments (system-wide access for validators)
        all_assessments = base_query.all()

        # =====================================================================
        # Compliance Summary (system-wide for validators)
        # =====================================================================

        # Count total barangays (all in municipality)
        total_barangays = db.query(func.count(Barangay.id)).scalar() or 0

        # Get completed assessments
        completed_assessments = [
            a for a in all_assessments if a.status == AssessmentStatus.COMPLETED
        ]

        # Calculate pass/fail based on final_compliance_status (system-wide)
        passed_count = sum(
            1 for a in completed_assessments if a.final_compliance_status == ComplianceStatus.PASSED
        )
        failed_count = sum(
            1 for a in completed_assessments if a.final_compliance_status == ComplianceStatus.FAILED
        )

        assessed_count = len(completed_assessments)
        compliance_rate = (passed_count / assessed_count * 100) if assessed_count > 0 else 0.0
        assessment_rate = (assessed_count / total_barangays * 100) if total_barangays > 0 else 0.0

        # Count pending and in-progress
        pending_mlgoo = sum(
            1 for a in all_assessments if a.status == AssessmentStatus.AWAITING_MLGOO_APPROVAL
        )
        in_progress_statuses = [
            AssessmentStatus.DRAFT,
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.IN_REVIEW,
            AssessmentStatus.REWORK,
            AssessmentStatus.AWAITING_FINAL_VALIDATION,
        ]
        in_progress = sum(1 for a in all_assessments if a.status in in_progress_statuses)

        # Workflow breakdown
        status_counts = {
            AssessmentStatus.DRAFT: 0,
            AssessmentStatus.SUBMITTED: 0,
            AssessmentStatus.IN_REVIEW: 0,
            AssessmentStatus.REWORK: 0,
            AssessmentStatus.AWAITING_FINAL_VALIDATION: 0,
            AssessmentStatus.AWAITING_MLGOO_APPROVAL: 0,
            AssessmentStatus.COMPLETED: 0,
        }
        for assessment in all_assessments:
            if assessment.status in status_counts:
                status_counts[assessment.status] += 1

        # Calculate stalled and rework metrics
        stalled_threshold = datetime.utcnow() - timedelta(days=14)
        stalled_count = 0
        rework_count = 0
        for assessment in all_assessments:
            last_update = assessment.updated_at or assessment.created_at
            if last_update and last_update < stalled_threshold:
                if assessment.status not in [AssessmentStatus.COMPLETED]:
                    stalled_count += 1
            if assessment.rework_count > 0:
                rework_count += 1

        rework_rate = (rework_count / len(all_assessments) * 100) if all_assessments else 0.0

        compliance_summary = {
            "total_barangays": total_barangays,
            "assessed_barangays": assessed_count,
            "passed_barangays": passed_count,
            "failed_barangays": failed_count,
            "compliance_rate": compliance_rate,
            "assessment_rate": assessment_rate,
            "pending_mlgoo_approval": pending_mlgoo,
            "in_progress": in_progress,
            "workflow_breakdown": {
                "not_started": total_barangays - len(all_assessments),
                "draft": status_counts[AssessmentStatus.DRAFT],
                "submitted": status_counts[AssessmentStatus.SUBMITTED],
                "in_review": status_counts[AssessmentStatus.IN_REVIEW],
                "rework": status_counts[AssessmentStatus.REWORK],
                "awaiting_validation": status_counts[AssessmentStatus.AWAITING_FINAL_VALIDATION],
                "awaiting_approval": status_counts[AssessmentStatus.AWAITING_MLGOO_APPROVAL],
                "completed": status_counts[AssessmentStatus.COMPLETED],
            },
            "stalled_assessments": stalled_count,
            "rework_rate": rework_rate,
            "weighted_progress": 0.0,  # Can calculate if needed
        }

        # =====================================================================
        # Governance Area Performance (all areas - system-wide for validators)
        # =====================================================================

        # Calculate performance per governance area
        area_performance_list = []
        core_pass_rates = []
        essential_pass_rates = []

        for ga in governance_areas:
            area_indicators = (
                db.query(func.count(Indicator.id))
                .filter(Indicator.governance_area_id == ga.id)
                .scalar()
                or 0
            )

            # Count pass/fail for this area across all completed assessments
            area_passed = 0
            area_failed = 0
            for assessment in completed_assessments:
                area_responses = [
                    r for r in assessment.responses if r.indicator.governance_area_id == ga.id
                ]
                if area_responses:
                    pass_count = sum(
                        1 for r in area_responses if r.validation_status == ValidationStatus.PASS
                    )
                    fail_count = sum(
                        1 for r in area_responses if r.validation_status == ValidationStatus.FAIL
                    )
                    if pass_count > fail_count:
                        area_passed += 1
                    elif fail_count > 0:
                        area_failed += 1

            area_total = area_passed + area_failed
            area_pass_rate = (area_passed / area_total * 100) if area_total > 0 else 0.0

            area_performance_list.append(
                {
                    "id": ga.id,
                    "name": ga.name,
                    "area_type": ga.area_type.value if ga.area_type else "CORE",
                    "total_indicators": area_indicators,
                    "passed_count": area_passed,
                    "failed_count": area_failed,
                    "pass_rate": area_pass_rate,
                    "common_weaknesses": [],
                }
            )

            if ga.area_type == AreaType.CORE:
                core_pass_rates.append(area_pass_rate)
            else:
                essential_pass_rates.append(area_pass_rate)

        governance_area_performance = {
            "areas": area_performance_list,
            "core_areas_pass_rate": sum(core_pass_rates) / len(core_pass_rates)
            if core_pass_rates
            else 0.0,
            "essential_areas_pass_rate": sum(essential_pass_rates) / len(essential_pass_rates)
            if essential_pass_rates
            else 0.0,
        }

        # =====================================================================
        # Top Failing Indicators (all areas - system-wide for validators)
        # =====================================================================

        indicator_failures: dict[int, dict[str, Any]] = {}
        for assessment in all_assessments:
            for response in assessment.responses:
                indicator_id = response.indicator.id
                ga = governance_area_map.get(response.indicator.governance_area_id)
                ga_name = ga.name if ga else "Unknown"

                if response.validation_status == ValidationStatus.FAIL:
                    if indicator_id not in indicator_failures:
                        indicator_failures[indicator_id] = {
                            "indicator_id": indicator_id,
                            "indicator_code": response.indicator.indicator_code,
                            "indicator_name": response.indicator.name,
                            "governance_area_id": response.indicator.governance_area_id,
                            "governance_area": ga_name,
                            "fail_count": 0,
                            "total_assessed": 0,
                            "fail_rate": 0.0,
                            "common_issues": [],
                        }
                    indicator_failures[indicator_id]["fail_count"] += 1
                    indicator_failures[indicator_id]["total_assessed"] += 1
                elif response.validation_status == ValidationStatus.PASS:
                    if indicator_id not in indicator_failures:
                        indicator_failures[indicator_id] = {
                            "indicator_id": indicator_id,
                            "indicator_code": response.indicator.indicator_code,
                            "indicator_name": response.indicator.name,
                            "governance_area_id": response.indicator.governance_area_id,
                            "governance_area": ga_name,
                            "fail_count": 0,
                            "total_assessed": 0,
                            "fail_rate": 0.0,
                            "common_issues": [],
                        }
                    indicator_failures[indicator_id]["total_assessed"] += 1

        # Calculate fail rates and sort
        for data in indicator_failures.values():
            if data["total_assessed"] > 0:
                data["fail_rate"] = (data["fail_count"] / data["total_assessed"]) * 100

        top_failing = sorted(
            indicator_failures.values(), key=lambda x: x["fail_count"], reverse=True
        )[:10]

        top_failing_indicators = {
            "indicators": top_failing,
            "total_indicators_assessed": len(indicator_failures),
        }

        # =====================================================================
        # CapDev Summary (minimal for now)
        # =====================================================================

        capdev_summary = {
            "total_assessments_with_capdev": 0,
            "top_recommendations": [],
            "common_weaknesses_by_area": {},
            "priority_interventions": [],
            "skills_gap_analysis": {},
        }

        # =====================================================================
        # Barangay Status List (all assessments - system-wide for validators)
        # =====================================================================

        barangay_list = []
        for assessment in all_assessments:
            if not include_draft and assessment.status == AssessmentStatus.DRAFT:
                continue

            barangay = (
                assessment.blgu_user.barangay
                if assessment.blgu_user and assessment.blgu_user.barangay
                else None
            )
            barangay_id = barangay.id if barangay else 0
            barangay_name = barangay.name if barangay else "Unknown"

            # Calculate overall compliance (system-wide)
            all_responses = assessment.responses
            total_pass_count = sum(
                1 for r in all_responses if r.validation_status == ValidationStatus.PASS
            )

            # Use assessment's final_compliance_status if available
            compliance_status = (
                assessment.final_compliance_status.value
                if assessment.final_compliance_status
                else None
            )

            # Count governance areas passed
            areas_passed = 0
            for ga in governance_areas:
                ga_responses = [r for r in all_responses if r.indicator.governance_area_id == ga.id]
                if ga_responses:
                    ga_pass = sum(
                        1 for r in ga_responses if r.validation_status == ValidationStatus.PASS
                    )
                    ga_fail = sum(
                        1 for r in ga_responses if r.validation_status == ValidationStatus.FAIL
                    )
                    if ga_pass > ga_fail:
                        areas_passed += 1

            barangay_list.append(
                {
                    "barangay_id": barangay_id,
                    "barangay_name": barangay_name,
                    "assessment_id": assessment.id,
                    "status": assessment.status.value,
                    "compliance_status": compliance_status,
                    "submitted_at": assessment.submitted_at,
                    "mlgoo_approved_at": assessment.mlgoo_approved_at,
                    "overall_score": None,
                    "has_capdev_insights": False,
                    "capdev_status": None,
                    "governance_areas_passed": areas_passed,
                    "total_governance_areas": len(governance_areas),
                    "pass_count": total_pass_count,
                    "conditional_count": 0,
                    "total_responses": len(all_responses),
                }
            )

        barangay_statuses = {
            "barangays": barangay_list,
            "total_count": len(barangay_list),
        }

        # Return dashboard data
        return {
            "compliance_summary": compliance_summary,
            "governance_area_performance": governance_area_performance,
            "top_failing_indicators": top_failing_indicators,
            "capdev_summary": capdev_summary,
            "barangay_statuses": barangay_statuses,
            "generated_at": datetime.utcnow(),
            "assessment_cycle": f"SGLGB {year}" if year else None,
        }

    # =========================================================================
    # Per-MOV Assessor Feedback Methods (Epic 6.0)
    # =========================================================================

    def update_mov_assessor_feedback(
        self,
        db: Session,
        mov_file_id: int,
        assessor_id: int,
        assessor_notes: str | None = None,
        flagged_for_rework: bool | None = None,
    ) -> dict:
        """
        Update assessor notes and rework flag for a specific MOV file.

        The rework flag auto-toggles ON when notes are added (if not explicitly set).
        Assessors can manually toggle it OFF even if notes exist.

        Args:
            db: Database session
            mov_file_id: ID of the MOV file to update
            assessor_id: ID of the assessor making the update
            assessor_notes: Optional general notes about this MOV
            flagged_for_rework: Optional flag indicating MOV needs rework

        Returns:
            dict with updated MOV feedback data

        Raises:
            ValueError: If MOV file not found
        """
        # Get the MOV file
        mov_file = db.query(MOVFile).filter(MOVFile.id == mov_file_id).first()

        if not mov_file:
            raise ValueError(f"MOV file {mov_file_id} not found")

        # Update assessor notes if provided
        if assessor_notes is not None:
            mov_file.assessor_notes = assessor_notes if assessor_notes.strip() else None

        # Determine flagged_for_rework value
        # If explicitly set, use that value
        # Otherwise, auto-toggle ON if notes were just added (and not empty)
        if flagged_for_rework is not None:
            new_flag_value = flagged_for_rework
        elif assessor_notes is not None and assessor_notes.strip():
            # Auto-toggle ON when notes are added
            new_flag_value = True
        else:
            # Keep existing value
            new_flag_value = mov_file.flagged_for_rework

        # Update flag and tracking fields
        if new_flag_value != mov_file.flagged_for_rework:
            mov_file.flagged_for_rework = new_flag_value
            if new_flag_value:
                mov_file.flagged_by_assessor_id = assessor_id
                mov_file.flagged_at = datetime.utcnow()
            else:
                # Keep the flagged_by info for history, just clear the flag
                mov_file.flagged_at = None

        db.commit()
        db.refresh(mov_file)

        return {
            "mov_file_id": mov_file.id,
            "assessor_notes": mov_file.assessor_notes,
            "flagged_for_rework": mov_file.flagged_for_rework,
            "flagged_by_assessor_id": mov_file.flagged_by_assessor_id,
            "flagged_at": mov_file.flagged_at,
        }

    def get_mov_assessor_feedback(
        self,
        db: Session,
        mov_file_id: int,
    ) -> dict:
        """
        Get assessor feedback for a specific MOV file.

        Args:
            db: Database session
            mov_file_id: ID of the MOV file

        Returns:
            dict with MOV feedback data

        Raises:
            ValueError: If MOV file not found
        """
        mov_file = db.query(MOVFile).filter(MOVFile.id == mov_file_id).first()

        if not mov_file:
            raise ValueError(f"MOV file {mov_file_id} not found")

        return {
            "mov_file_id": mov_file.id,
            "assessor_notes": mov_file.assessor_notes,
            "flagged_for_rework": mov_file.flagged_for_rework,
            "flagged_by_assessor_id": mov_file.flagged_by_assessor_id,
            "flagged_at": mov_file.flagged_at,
        }


assessor_service = AssessorService()
