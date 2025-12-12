# 🛠️ Assessor Service
# Business logic for assessor features

import logging
from datetime import datetime, timedelta
from typing import Any

from fastapi import UploadFile
from sqlalchemy.orm import Session, joinedload, selectinload

logger = logging.getLogger(__name__)

from app.core.year_resolver import get_year_resolver
from app.db.enums import AssessmentStatus, ComplianceStatus, UserRole, ValidationStatus
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

        **Validators** (users with validator_area_id):
        - See assessments in AWAITING_FINAL_VALIDATION status (ready for validation)
        - ALSO see assessments in REWORK status if they haven't calibrated their area yet
          (parallel calibration support - other validators may have requested calibration
          but this validator can still validate or request calibration for their area)
        - Filtered by their assigned governance area
        - These are assessments where assessor clicked "Finalize Validation"

        **Assessors** (users without validator_area_id):
        - See assessments in SUBMITTED, IN_REVIEW, REWORK statuses
        - System-wide access (all governance areas)
        - These are assessments ready for initial review

        Args:
            db: Database session
            assessor: Current assessor/validator user
            assessment_year: Optional year filter. Defaults to active year.

        Includes barangay name, submission date, status, and last updated.
        """
        # Get active year if not specified
        if assessment_year is None:
            from app.services.assessment_year_service import assessment_year_service

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

        # Validators: Filter by governance area AND show assessments they can work on
        # - AWAITING_FINAL_VALIDATION: Ready for validation
        # - REWORK with is_calibration_rework=True: Parallel calibration in progress,
        #   validator can still validate their area if they haven't calibrated it yet
        # IMPORTANT: Check role explicitly - assessors should NOT be filtered by governance area
        is_validator = (
            assessor.role == UserRole.VALIDATOR and assessor.validator_area_id is not None
        )
        if is_validator:
            query = query.filter(
                Indicator.governance_area_id == assessor.validator_area_id,
                Assessment.status.in_(
                    [
                        AssessmentStatus.AWAITING_FINAL_VALIDATION,
                        AssessmentStatus.REWORK,  # Include for parallel calibration
                    ]
                ),
            )
        # Assessors: Show assessments ready for initial review
        else:
            query = query.filter(
                Assessment.status.in_(
                    [
                        AssessmentStatus.SUBMITTED,
                        AssessmentStatus.IN_REVIEW,
                        AssessmentStatus.REWORK,
                        AssessmentStatus.SUBMITTED_FOR_REVIEW,  # Legacy status support
                        AssessmentStatus.NEEDS_REWORK,  # Legacy status support
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
            # For validators: Skip assessments where they've already completed their governance area
            # or where they have a pending calibration request (waiting for BLGU)
            if is_validator:
                # PARALLEL CALIBRATION: Check if validator has pending calibration for this assessment
                # If they already requested calibration, don't show until BLGU resubmits
                pending_calibrations = a.pending_calibrations or []
                has_pending_calibration = any(
                    pc.get("governance_area_id") == assessor.validator_area_id
                    and not pc.get("approved", False)
                    for pc in pending_calibrations
                )
                if has_pending_calibration:
                    continue  # Skip - validator waiting for BLGU to fix and resubmit

                # For REWORK status: Only show if is_calibration_rework AND validator hasn't calibrated their area
                # This handles parallel calibration - validator can still validate/calibrate their area
                if a.status == AssessmentStatus.REWORK:
                    if not a.is_calibration_rework:
                        # Regular assessor rework - validators shouldn't see this
                        continue

                    # Check if this validator's area has already been calibrated
                    calibrated_areas = a.calibrated_area_ids or []
                    if assessor.validator_area_id in calibrated_areas:
                        continue  # Skip - validator already used their calibration for this area

                # Get all responses in the validator's governance area for this assessment
                validator_area_responses = [
                    r
                    for r in a.responses
                    if r.indicator and r.indicator.governance_area_id == assessor.validator_area_id
                ]

                # If all responses in their area have validation_status, skip this assessment
                # (the validator has already completed their work on this assessment)
                if validator_area_responses:
                    all_validated = all(
                        r.validation_status is not None for r in validator_area_responses
                    )
                    if all_validated:
                        continue  # Skip this assessment - validator already done

            barangay_name = getattr(getattr(a.blgu_user, "barangay", None), "name", "-")

            # Add extra info for parallel calibration
            pending_count = len(a.pending_calibrations or []) if a.is_calibration_rework else 0

            # Calculate area progress based on reviewed indicators
            if is_validator:
                # Validator: progress based on their governance area
                area_responses = [
                    r
                    for r in a.responses
                    if r.indicator and r.indicator.governance_area_id == assessor.validator_area_id
                ]
                reviewed_count = sum(1 for r in area_responses if r.validation_status is not None)
                total_count = len(area_responses)
            else:
                # Assessor: progress based on all indicators with response_data filled
                area_responses = a.responses
                reviewed_count = sum(
                    1
                    for r in area_responses
                    if r.response_data is not None and r.response_data != {}
                )
                total_count = len(area_responses)

            area_progress = round((reviewed_count / total_count * 100) if total_count > 0 else 0)

            items.append(
                {
                    "assessment_id": a.id,
                    "barangay_name": barangay_name,
                    "submission_date": a.submitted_at,
                    "status": a.status.value if hasattr(a.status, "value") else str(a.status),
                    "updated_at": a.updated_at,
                    "is_calibration_rework": a.is_calibration_rework,
                    "pending_calibrations_count": pending_count,
                    "area_progress": area_progress,
                }
            )

        # For validators, add completed count as metadata
        # This is used for the "Reviewed by You" KPI
        if is_validator and len(items) == 0:
            # If queue is empty, check if there are completed assessments
            # This helps show progress even when queue is empty
            pass

        return items

    def get_validator_completed_count(
        self, db: Session, validator: User, assessment_year: int | None = None
    ) -> int:
        """
        Count assessments where the validator has completed their governance area validation.

        This includes:
        - Assessments still in AWAITING_FINAL_VALIDATION (waiting for other validators)
        - Assessments in COMPLETED status

        Args:
            db: Database session
            validator: Validator user
            assessment_year: Optional year filter. Defaults to active year.

        Returns the count of assessments where all indicators in the validator's
        governance area have validation_status set.
        """
        if validator.validator_area_id is None:
            return 0

        # Get active year if not specified
        if assessment_year is None:
            from app.services.assessment_year_service import assessment_year_service

            assessment_year = assessment_year_service.get_active_year_number(db)

        # Query assessments that are either awaiting validation or completed
        # PERFORMANCE FIX: Add governance_area eager loading
        query = (
            db.query(Assessment)
            .join(AssessmentResponse, AssessmentResponse.assessment_id == Assessment.id)
            .join(Indicator, Indicator.id == AssessmentResponse.indicator_id)
            .options(
                selectinload(Assessment.responses)
                .joinedload(AssessmentResponse.indicator)
                .joinedload(Indicator.governance_area)
            )
            .filter(
                Indicator.governance_area_id == validator.validator_area_id,
                Assessment.status.in_(
                    [
                        AssessmentStatus.AWAITING_FINAL_VALIDATION,
                        AssessmentStatus.COMPLETED,
                    ]
                ),
                Assessment.submitted_at.isnot(None),
            )
        )

        # Filter by assessment year
        if assessment_year:
            query = query.filter(Assessment.assessment_year == assessment_year)

        assessments = query.distinct(Assessment.id).all()

        # Count assessments where all responses in validator's area are validated
        completed_count = 0
        for assessment in assessments:
            validator_area_responses = [
                r
                for r in assessment.responses
                if r.indicator and r.indicator.governance_area_id == validator.validator_area_id
            ]

            if validator_area_responses:
                all_validated = all(
                    r.validation_status is not None for r in validator_area_responses
                )
                if all_validated:
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

        # Save public comment if provided
        if public_comment:
            public_feedback = FeedbackComment(
                comment=public_comment,
                comment_type="validation",
                response_id=response_id,
                assessor_id=assessor.id,
                is_internal_note=False,
            )
            db.add(public_feedback)

        db.commit()

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

        # Verify the assessor has permission to upload MOVs for this response
        # - If assessor has validator_area_id: Check if indicator belongs to that area
        # - If assessor has no validator_area_id: Grant access (system-wide)
        indicator = db.query(Indicator).filter(Indicator.id == response.indicator_id).first()

        if not indicator:
            return {
                "success": False,
                "message": "Indicator not found for this response",
                "mov_id": None,
            }

        # Check governance area permission only if assessor has validator_area_id
        if assessor.validator_area_id is not None:
            if indicator.governance_area_id != assessor.validator_area_id:
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

        # Verify the assessor has permission to upload MOVs for this response
        # - If assessor has validator_area_id: Check if indicator belongs to that area
        # - If assessor has no validator_area_id: Grant access (system-wide)
        indicator = db.query(Indicator).filter(Indicator.id == response.indicator_id).first()

        if not indicator:
            return {
                "success": False,
                "message": "Indicator not found for this response",
                "mov_id": None,
                "storage_path": None,
                "mov": None,
            }

        # Check governance area permission only if assessor has validator_area_id
        if assessor.validator_area_id is not None:
            if indicator.governance_area_id != assessor.validator_area_id:
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

        # Verify the assessor has permission to view this assessment
        # - If assessor has validator_area_id: Check if indicators belong to that area
        # - If assessor has no validator_area_id: Grant access (system-wide)
        has_permission = False

        if assessor.validator_area_id is None:
            # Assessor with no validator_area_id has system-wide access
            has_permission = True
        elif assessment.responses:
            # Check if any response's indicator belongs to the assessor's governance area
            for response in assessment.responses:
                if response.indicator.governance_area_id == assessor.validator_area_id:
                    has_permission = True
                    break
        else:
            # For assessments with no responses, allow access if assessor has area assigned
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
                "rework_count": assessment.rework_count,
                "calibration_count": assessment.calibration_count,
                "calibrated_area_ids": assessment.calibrated_area_ids or [],
                "calibration_requested_at": assessment.calibration_requested_at.isoformat() + "Z"
                if assessment.calibration_requested_at
                else None,
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
        is_validator_role = assessor.role == UserRole.VALIDATOR
        should_filter = is_validator_role and assessor.validator_area_id is not None

        self.logger.info(
            f"[ASSESSOR DEBUG] User {assessor.id} ({assessor.email}): "
            f"role={assessor.role}, validator_area_id={assessor.validator_area_id}, "
            f"total_responses_in_assessment={len(assessment.responses)}, "
            f"total_indicators={len(all_indicators)}, should_filter={should_filter}"
        )

        # Process ALL indicators (not just responses)
        for indicator in all_indicators:
            # Only filter by governance area for VALIDATOR role users
            if should_filter:
                if indicator.governance_area_id != assessor.validator_area_id:
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
                    "technical_notes": (
                        year_resolver.resolve_string(indicator.description)
                        if year_resolver
                        else indicator.description
                    )
                    or "No technical notes available",
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
            }
            # DEBUG: Log requires_rework status
            self.logger.info(
                f"[ASSESSOR VIEW] Indicator {indicator.id} ({indicator.name}): "
                f"has_response={response is not None}, requires_rework={requires_rework}, "
                f"is_completed={response.is_completed if response else False}"
            )
            assessment_data["assessment"]["responses"].append(response_data)

        return assessment_data

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

        # CRITICAL: Validators (Phase 2) should NOT use this endpoint - they use Calibration
        is_validator = assessor.validator_area_id is not None
        if is_validator:
            raise ValueError(
                "Validators cannot send for Rework. Use Calibration for minor corrections in Phase 2."
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

                self.logger.info(
                    f"[SEND REWORK] Cleared checklist data for response {response.id} (indicator {response.indicator_id})"
                )

        db.commit()
        db.refresh(assessment)

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

        PARALLEL CALIBRATION SUPPORT:
        Multiple validators from different governance areas can request calibration
        simultaneously. The BLGU sees a combined summary of all calibration requests
        and fixes everything before submitting once. Each validator's calibration
        request is tracked independently in pending_calibrations.

        Calibration is used by Validators to send ONLY their governance area
        indicators back to BLGU for corrections. Unlike Rework (which affects
        all indicators), Calibration only affects indicators in the validator's
        assigned governance area.

        Args:
            db: Database session
            assessment_id: ID of the assessment to calibrate
            validator: The validator performing the action (must have validator_area_id)

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

        # CRITICAL: Only Validators can submit for calibration
        is_validator = validator.validator_area_id is not None
        if not is_validator:
            raise PermissionError(
                "Only Validators can submit for calibration. Assessors should use 'Send for Rework' instead."
            )

        # Must be in AWAITING_FINAL_VALIDATION or REWORK status (REWORK allows parallel calibration)
        # REWORK status means another validator already requested calibration - we can add ours
        if assessment.status not in [
            AssessmentStatus.AWAITING_FINAL_VALIDATION,
            AssessmentStatus.REWORK,
        ]:
            raise ValueError(
                "Calibration is only allowed when assessment is in AWAITING_FINAL_VALIDATION or REWORK status"
            )

        # Get responses in validator's governance area
        validator_area_responses = [
            response
            for response in assessment.responses
            if response.indicator
            and response.indicator.governance_area_id == validator.validator_area_id
        ]

        if not validator_area_responses:
            raise ValueError(
                f"No indicators found in your assigned governance area (ID: {validator.validator_area_id})"
            )

        # Check if THIS governance area has already been calibrated (max 1 per area)
        calibrated_areas = assessment.calibrated_area_ids or []
        if validator.validator_area_id in calibrated_areas:
            raise ValueError(
                "Calibration has already been used for your governance area. "
                "Only one calibration is allowed per governance area."
            )

        # Check if this validator already has a pending calibration for this area
        pending_calibrations = assessment.pending_calibrations or []
        existing_pending = [
            pc
            for pc in pending_calibrations
            if pc.get("governance_area_id") == validator.validator_area_id
        ]
        if existing_pending:
            raise ValueError(
                "You already have a pending calibration request for this governance area. "
                "Wait for BLGU to resubmit before requesting another calibration."
            )

        # Validator must have at least one indicator flagged for calibration
        # Check for flagged indicators in validator's area responses
        flagged_responses = [r for r in validator_area_responses if r.flagged_for_calibration]

        if not flagged_responses:
            raise ValueError(
                "At least one indicator in your governance area must be flagged for calibration. "
                "Use the 'Flag for Calibration' toggle on indicators that need corrections."
            )

        # Get governance area name for the response
        governance_area = (
            db.query(GovernanceArea)
            .filter(GovernanceArea.id == validator.validator_area_id)
            .first()
        )
        governance_area_name = governance_area.name if governance_area else "Unknown"

        # PARALLEL CALIBRATION: Add to pending_calibrations list
        calibration_request = {
            "validator_id": validator.id,
            "validator_name": validator.name,
            "governance_area_id": validator.validator_area_id,
            "governance_area_name": governance_area_name,
            "requested_at": datetime.utcnow().isoformat(),
            "approved": False,  # Will be set to True when BLGU resubmits
        }

        if assessment.pending_calibrations is None:
            assessment.pending_calibrations = []
        assessment.pending_calibrations = assessment.pending_calibrations + [calibration_request]
        # CRITICAL: Flag the JSON column as modified so SQLAlchemy detects the change
        from sqlalchemy.orm.attributes import flag_modified

        flag_modified(assessment, "pending_calibrations")

        # Update assessment status to REWORK if not already
        # First calibration request changes status, subsequent ones keep it in REWORK
        is_first_calibration = assessment.status == AssessmentStatus.AWAITING_FINAL_VALIDATION
        assessment.status = AssessmentStatus.REWORK

        if is_first_calibration:
            # First calibration request - set initial timestamps
            assessment.rework_requested_at = datetime.utcnow()
            assessment.calibration_requested_at = datetime.utcnow()
        # Note: Don't update rework_requested_at for subsequent calibrations to preserve original timestamp

        assessment.rework_requested_by = validator.id
        # Note: Do NOT increment rework_count for calibration - it's a separate mechanism

        # Set calibration flags so BLGU knows to submit back to Validator (not Assessor)
        assessment.is_calibration_rework = True
        # Legacy field - keep for backward compatibility but parallel calibration uses pending_calibrations
        assessment.calibration_validator_id = validator.id
        assessment.calibration_count += 1  # Legacy: still increment for backwards compatibility

        # Track which governance area has been calibrated (per-area limit)
        if assessment.calibrated_area_ids is None:
            assessment.calibrated_area_ids = []
        assessment.calibrated_area_ids = assessment.calibrated_area_ids + [
            validator.validator_area_id
        ]

        # Mark ONLY indicators flagged for calibration for rework
        # These are the indicators the BLGU needs to correct and re-upload
        calibrated_count = 0
        calibrated_indicator_ids = []
        for response in validator_area_responses:
            # Only mark indicators that are flagged for calibration
            if response.flagged_for_calibration:
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
        # Summary is stored per governance area in calibration_summaries_by_area
        summary_result = {"success": False, "skipped": True}
        try:
            from app.workers.intelligence_worker import (
                generate_calibration_summary_task,
            )

            summary_task = generate_calibration_summary_task.delay(
                assessment_id, validator.validator_area_id
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

        # Calculate total pending calibrations for response
        total_pending = len(assessment.pending_calibrations)

        return {
            "success": True,
            "message": f"Assessment submitted for calibration. {calibrated_count} indicator(s) in {governance_area_name} marked for correction.",
            "assessment_id": assessment_id,
            "new_status": assessment.status.value,
            "governance_area": governance_area_name,
            "governance_area_id": validator.validator_area_id,
            "calibrated_indicators_count": calibrated_count,
            "calibrated_indicator_ids": calibrated_indicator_ids,
            "total_pending_calibrations": total_pending,
            "is_parallel_calibration": total_pending > 1,
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

        # Determine if this is Phase 1 (Assessor) or Phase 2 (Validator)
        is_validator = assessor.validator_area_id is not None

        # [DEBUG] Start
        self.logger.info(f"[FINALIZE DEBUG] Starting finalize for {assessment_id}")

        if is_validator:
            # ===== PHASE 2: VALIDATORS (Table Validation) =====
            self.logger.info("[FINALIZE DEBUG] Phase 2: Validator check")
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

            # Must be in AWAITING_FINAL_VALIDATION or REWORK status
            # REWORK status is allowed for parallel calibration: another validator may have
            # requested calibration for their area, but this validator can still finalize their area
            if assessment.status not in [
                AssessmentStatus.AWAITING_FINAL_VALIDATION,
                AssessmentStatus.REWORK,
            ]:
                raise ValueError(
                    "Validators can only finalize assessments in AWAITING_FINAL_VALIDATION or REWORK status"
                )

            # Validators only review indicators in their assigned governance area
            # Filter responses to only those in validator's governance area
            validator_area_responses = [
                response
                for response in assessment.responses
                if response.indicator
                and response.indicator.governance_area_id == assessor.validator_area_id
            ]

            if not validator_area_responses:
                raise ValueError(
                    f"No indicators found in validator's assigned governance area (ID: {assessor.validator_area_id})"
                )

            # Check if all responses in validator's area have validation_status set
            unreviewed_responses = [
                response.id
                for response in validator_area_responses
                if response.validation_status is None
            ]

            if unreviewed_responses:
                raise ValueError(
                    f"Cannot finalize. Unreviewed response IDs in your governance area: {unreviewed_responses}"
                )

            # Check if ALL governance areas have been validated
            # (All responses across all areas should have validation_status)
            # IMPORTANT: Query the database directly to avoid stale data from eager loading.
            # This prevents a race condition where two validators finalize concurrently
            # and the last one doesn't see the other's committed validation_status values.
            unvalidated_count = (
                db.query(AssessmentResponse)
                .filter(
                    AssessmentResponse.assessment_id == assessment_id,
                    AssessmentResponse.validation_status.is_(None),
                )
                .count()
            )
            all_responses_validated = unvalidated_count == 0

            if all_responses_validated:
                # All governance areas validated - move to AWAITING_MLGOO_APPROVAL
                # Validators CAN finalize even with FAIL indicators (that's the final result)
                # MLGOO Chairman will review and approve this final result
                assessment.status = AssessmentStatus.AWAITING_MLGOO_APPROVAL
            else:
                # This validator's area is done, but other areas still pending
                # Keep status as AWAITING_FINAL_VALIDATION
                # Note: The validation_status is already saved per indicator
                pass

        else:
            # ===== PHASE 1: ASSESSORS (Table Assessment) =====
            # Can finalize from SUBMITTED_FOR_REVIEW, IN_REVIEW, REWORK, or SUBMITTED statuses
            # SUBMITTED status occurs when BLGU resubmits after rework
            if assessment.status not in (
                AssessmentStatus.SUBMITTED_FOR_REVIEW,
                AssessmentStatus.IN_REVIEW,
                AssessmentStatus.REWORK,
                AssessmentStatus.SUBMITTED,
            ):
                raise ValueError("Cannot finalize assessment in its current status")

            # For assessors: Check if ALL responses have checklist data or comments
            # (Assessors fill checklists/comments, not validation_status)
            unreviewed_responses = []
            for response in assessment.responses:
                response_data = response.response_data or {}

                # Check for assessor validation data (assessor_val_ prefix)
                has_assessor_checklist = any(
                    key.startswith("assessor_val_") for key in response_data.keys()
                )

                # Check for feedback comments in the feedback_comments relationship
                has_feedback_comments = len(response.feedback_comments) > 0

                # Debug logging for each response
                self.logger.info(
                    f"[FINALIZE CHECK] Response {response.id}: "
                    f"has_assessor_checklist={has_assessor_checklist}, "
                    f"has_feedback_comments={has_feedback_comments}, "
                    f"response_data_keys={list(response_data.keys())}"
                )

                # Response must have either checklist data or feedback comments
                if not (has_assessor_checklist or has_feedback_comments):
                    unreviewed_responses.append(response.id)

            if unreviewed_responses:
                self.logger.error(
                    f"[FINALIZE FAILED] Cannot finalize assessment {assessment_id}. "
                    f"Unreviewed response IDs: {unreviewed_responses}"
                )
                raise ValueError(
                    f"Cannot finalize assessment. Unreviewed response IDs: {unreviewed_responses}"
                )

            # All assessor reviews complete - move to Phase 2 (Table Validation)
            assessment.status = AssessmentStatus.AWAITING_FINAL_VALIDATION
            # Track which assessor completed the review
            assessment.reviewed_by = assessor.id

            # IMPORTANT: Keep ALL assessor checklist data for validators to review
            # Validators need to see what the assessor marked, even for reworked indicators
            # They can override the assessor's decisions if needed
            # DO NOT clear validation_status or checklist data here

            # HOWEVER, we MUST clear the 'requires_rework' flag.
            # If the assessor is finalizing, it means they are satisfied with the current state (or waived issues).
            # If we don't clear this, these flags will persist and cause "Zombie Rework" items
            # to appear if the assessment is later returned for Calibration (Phase 2).
            for response in assessment.responses:
                response.requires_rework = False

        self.logger.info("[FINALIZE DEBUG] Validation checks passed. Committing to DB...")

        # Set validated_at timestamp
        assessment.validated_at = (
            db.query(Assessment).filter(Assessment.id == assessment_id).first().updated_at
        )
        # Note: updated_at is automatically handled by SQLAlchemy's onupdate

        db.commit()
        db.refresh(assessment)
        self.logger.info("[FINALIZE DEBUG] DB Commit success")

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
                )

                # Queue the notification task to run in the background
                task = send_ready_for_mlgoo_approval_notification.delay(assessment_id)
                notification_result = {
                    "success": True,
                    "message": "Ready for MLGOO approval notification queued successfully",
                    "task_id": task.id,
                }
                self.logger.info(
                    f"Triggered ready-for-MLGOO-approval notification for assessment {assessment_id}"
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
        if assessor.validator_area_id is not None:
            governance_area = (
                db.query(GovernanceArea)
                .filter(GovernanceArea.id == assessor.validator_area_id)
                .first()
            )
            governance_area_name = governance_area.name if governance_area else "Unknown"

        # Get assessments based on assessor's governance area assignment
        # - If assessor has validator_area_id: Filter by that governance area
        # - If assessor has no validator_area_id: Show all assessments (system-wide)
        query = (
            db.query(Assessment)
            .join(AssessmentResponse, AssessmentResponse.assessment_id == Assessment.id)
            .join(Indicator, Indicator.id == AssessmentResponse.indicator_id)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                joinedload(Assessment.responses).joinedload(AssessmentResponse.indicator),
            )
        )

        # Filter by governance area only if assessor has validator_area_id
        if assessor.validator_area_id is not None:
            query = query.filter(Indicator.governance_area_id == assessor.validator_area_id)

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
                # Filter by governance area only if assessor has validator_area_id
                if assessor.validator_area_id is not None:
                    if response.indicator.governance_area_id != assessor.validator_area_id:
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
        from sqlalchemy import func, case

        # Get active year if not specified
        if assessment_year is None:
            from app.services.assessment_year_service import assessment_year_service

            assessment_year = assessment_year_service.get_active_year_number(db)

        # Determine if user is a validator
        is_validator = (
            user.role == UserRole.VALIDATOR and user.validator_area_id is not None
        )

        # Base query for COMPLETED assessments
        if is_validator:
            # Validators: Show assessments with responses in their governance area
            # Use a subquery to get distinct assessment IDs first to avoid PostgreSQL DISTINCT ON issues
            assessment_ids_subquery = (
                db.query(Assessment.id)
                .join(AssessmentResponse, AssessmentResponse.assessment_id == Assessment.id)
                .join(Indicator, Indicator.id == AssessmentResponse.indicator_id)
                .filter(
                    Assessment.status == AssessmentStatus.COMPLETED,
                    Indicator.governance_area_id == user.validator_area_id,
                )
                .distinct()
                .subquery()
            )
            query = db.query(Assessment).filter(
                Assessment.id.in_(db.query(assessment_ids_subquery.c.id))
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
            .order_by(
                func.coalesce(Assessment.mlgoo_approved_at, Assessment.validated_at).desc()
            )
            .offset(offset)
            .limit(page_size)
            .all()
        )

        # Get validator's governance area name if applicable
        governance_area_name = None
        if is_validator:
            area = db.query(GovernanceArea).filter(GovernanceArea.id == user.validator_area_id).first()
            if area:
                governance_area_name = area.name

        # Build response items
        items = []
        for assessment in assessments:
            # Get barangay info
            barangay_name = "Unknown"
            municipality_name = None  # Barangay model doesn't have municipality field
            if assessment.blgu_user and assessment.blgu_user.barangay:
                barangay_name = assessment.blgu_user.barangay.name

            # Count validation statuses for this assessment
            # For validators, only count indicators in their governance area
            pass_count = 0
            fail_count = 0
            conditional_count = 0
            indicator_count = 0

            for response in assessment.responses:
                # For validators, filter by governance area
                if is_validator and response.indicator:
                    if response.indicator.governance_area_id != user.validator_area_id:
                        continue

                indicator_count += 1
                if response.validation_status == ValidationStatus.PASS:
                    pass_count += 1
                elif response.validation_status == ValidationStatus.FAIL:
                    fail_count += 1
                elif response.validation_status == ValidationStatus.CONDITIONAL:
                    conditional_count += 1

            # Determine completion date
            completed_at = assessment.mlgoo_approved_at or assessment.validated_at

            items.append({
                "assessment_id": assessment.id,
                "barangay_name": barangay_name,
                "municipality_name": municipality_name,
                "governance_area_name": governance_area_name,
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
            })

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
        is_validator = (
            user.role == UserRole.VALIDATOR and user.validator_area_id is not None
        )

        if is_validator:
            # Validators must have responses in their governance area
            has_access = any(
                r.indicator and r.indicator.governance_area_id == user.validator_area_id
                for r in assessment.responses
            )
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

        # Get validator's governance area name if applicable
        governance_area_name = None
        if is_validator:
            area = db.query(GovernanceArea).filter(GovernanceArea.id == user.validator_area_id).first()
            if area:
                governance_area_name = area.name

        # Build indicator list
        indicators = []
        for response in assessment.responses:
            # For validators, filter by governance area
            if is_validator and response.indicator:
                if response.indicator.governance_area_id != user.validator_area_id:
                    continue

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

                feedback_comments.append({
                    "id": fc.id,
                    "comment": fc.comment,
                    "assessor_name": assessor_name,
                    "assessor_role": assessor_role,
                    "created_at": fc.created_at,
                    "is_internal_note": fc.is_internal_note or False,
                })

            # Sort comments by date (newest first)
            feedback_comments.sort(key=lambda x: x["created_at"], reverse=True)

            # Check for MOV annotations - MOV files are at assessment level with indicator_id
            has_mov_annotations = False
            indicator_mov_files = [
                mf for mf in (assessment.mov_files or [])
                if mf.indicator_id == indicator.id and mf.deleted_at is None
            ]
            mov_count = len(indicator_mov_files)
            for mov_file in indicator_mov_files:
                if hasattr(mov_file, 'annotations') and mov_file.annotations:
                    has_mov_annotations = True
                    break

            # Get indicator's governance area name
            indicator_area_name = None
            if indicator.governance_area:
                indicator_area_name = indicator.governance_area.name

            indicators.append({
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
            })

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


assessor_service = AssessorService()
