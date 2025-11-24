# 🛠️ Assessor Service
# Business logic for assessor features

from datetime import datetime, timedelta
from typing import Any, Dict, List
import logging

from app.db.enums import AssessmentStatus, ComplianceStatus, ValidationStatus
from app.db.models.assessment import (
    MOV as MOVModel,  # SQLAlchemy model - alias to avoid conflict
    Assessment,
    AssessmentResponse,
    FeedbackComment,
)
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from app.schemas.assessment import MOVCreate  # Pydantic schema
from app.services.storage_service import storage_service
from fastapi import UploadFile
from sqlalchemy.orm import Session, joinedload, selectinload


class AssessorService:
    def __init__(self):
        """Initialize the assessor service"""
        self.logger = logging.getLogger(__name__)

    def get_assessor_queue(self, db: Session, assessor: User) -> List[dict]:
        """
        Return submissions filtered by user role and governance area.

        **Validators** (users with validator_area_id):
        - See only assessments in AWAITING_FINAL_VALIDATION status
        - Filtered by their assigned governance area
        - These are assessments where assessor clicked "Finalize Validation"

        **Assessors** (users without validator_area_id):
        - See assessments in SUBMITTED, IN_REVIEW, REWORK statuses
        - System-wide access (all governance areas)
        - These are assessments ready for initial review

        Includes barangay name, submission date, status, and last updated.
        """
        # Base query
        query = (
            db.query(Assessment)
            .join(AssessmentResponse, AssessmentResponse.assessment_id == Assessment.id)
            .join(Indicator, Indicator.id == AssessmentResponse.indicator_id)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                selectinload(Assessment.responses).joinedload(AssessmentResponse.indicator)
            )
        )

        # Validators: Filter by governance area AND only show finalized assessments
        # Exclude assessments where the validator has already completed their governance area
        if assessor.validator_area_id is not None:
            query = query.filter(
                Indicator.governance_area_id == assessor.validator_area_id,
                Assessment.status == AssessmentStatus.AWAITING_FINAL_VALIDATION
            )
        # Assessors: Show assessments ready for initial review
        else:
            query = query.filter(
                Assessment.status.in_([
                    AssessmentStatus.SUBMITTED,
                    AssessmentStatus.IN_REVIEW,
                    AssessmentStatus.REWORK,
                    AssessmentStatus.SUBMITTED_FOR_REVIEW,  # Legacy status support
                    AssessmentStatus.NEEDS_REWORK,  # Legacy status support
                ])
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
            if assessor.validator_area_id is not None:
                # Get all responses in the validator's governance area for this assessment
                validator_area_responses = [
                    r for r in a.responses
                    if r.indicator and r.indicator.governance_area_id == assessor.validator_area_id
                ]

                # If all responses in their area have validation_status, skip this assessment
                # (the validator has already completed their work on this assessment)
                if validator_area_responses:
                    all_validated = all(
                        r.validation_status is not None
                        for r in validator_area_responses
                    )
                    if all_validated:
                        continue  # Skip this assessment - validator already done

            barangay_name = getattr(getattr(a.blgu_user, "barangay", None), "name", "-")
            items.append(
                {
                    "assessment_id": a.id,
                    "barangay_name": barangay_name,
                    "submission_date": a.submitted_at,
                    "status": a.status.value
                    if hasattr(a.status, "value")
                    else str(a.status),
                    "updated_at": a.updated_at,
                }
            )

        # For validators, add completed count as metadata
        # This is used for the "Reviewed by You" KPI
        if assessor.validator_area_id is not None and len(items) == 0:
            # If queue is empty, check if there are completed assessments
            # This helps show progress even when queue is empty
            pass

        return items

    def get_validator_completed_count(self, db: Session, validator: User) -> int:
        """
        Count assessments where the validator has completed their governance area validation.

        This includes:
        - Assessments still in AWAITING_FINAL_VALIDATION (waiting for other validators)
        - Assessments in COMPLETED status

        Returns the count of assessments where all indicators in the validator's
        governance area have validation_status set.
        """
        if validator.validator_area_id is None:
            return 0

        # Query assessments that are either awaiting validation or completed
        assessments = (
            db.query(Assessment)
            .join(AssessmentResponse, AssessmentResponse.assessment_id == Assessment.id)
            .join(Indicator, Indicator.id == AssessmentResponse.indicator_id)
            .options(
                selectinload(Assessment.responses).joinedload(AssessmentResponse.indicator)
            )
            .filter(
                Indicator.governance_area_id == validator.validator_area_id,
                Assessment.status.in_([
                    AssessmentStatus.AWAITING_FINAL_VALIDATION,
                    AssessmentStatus.COMPLETED
                ]),
                Assessment.submitted_at.isnot(None)
            )
            .distinct(Assessment.id)
            .all()
        )

        # Count assessments where all responses in validator's area are validated
        completed_count = 0
        for assessment in assessments:
            validator_area_responses = [
                r for r in assessment.responses
                if r.indicator and r.indicator.governance_area_id == validator.validator_area_id
            ]

            if validator_area_responses:
                all_validated = all(
                    r.validation_status is not None
                    for r in validator_area_responses
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

        Returns:
            dict: Success status and details
        """
        print(f"=== BACKEND: validate_assessment_response for response_id={response_id} ===")
        print(f"validation_status: {validation_status}")
        print(f"public_comment: {public_comment}")
        print(f"assessor_remarks: {assessor_remarks}")
        print(f"response_data: {response_data}")

        # Get the assessment response
        response = (
            db.query(AssessmentResponse)
            .filter(AssessmentResponse.id == response_id)
            .first()
        )

        if not response:
            return {
                "success": False,
                "message": "Assessment response not found",
                "assessment_response_id": response_id,
                "validation_status": validation_status,
            }

        print(f"Current response.response_data BEFORE update: {response.response_data}")

        # Update the validation status only if provided (validators only)
        if validation_status is not None:
            response.validation_status = validation_status

        # Update assessor remarks if provided
        if assessor_remarks is not None:
            response.assessor_remarks = assessor_remarks

        # Update response_data if provided (for checklist data)
        # IMPORTANT: Merge with existing BLGU data, don't overwrite!
        if response_data is not None:
            print(f"Merging response_data. New validation data: {response_data}")

            # Get existing BLGU response data or empty dict
            existing_data = response.response_data or {}
            print(f"Existing BLGU response_data: {existing_data}")

            # Merge: Assessor validation data takes precedence for matching keys
            # This preserves BLGU's assessment answers while adding assessor's validation checklist
            merged_data = {**existing_data, **response_data}

            response.response_data = merged_data
            print(f"response.response_data AFTER merge: {response.response_data}")

        # Generate remark if indicator has calculation_schema and remark_schema
        if response.indicator.calculation_schema and response.is_completed:
            try:
                from app.services.intelligence_service import intelligence_service

                # Calculate indicator status based on response data
                indicator_status = intelligence_service.calculate_indicator_status(
                    db=db,
                    indicator_id=response.indicator_id,
                    assessment_data=response.response_data or {},
                )

                # Generate remark
                generated_remark = intelligence_service.generate_indicator_remark(
                    db=db,
                    indicator_id=response.indicator_id,
                    indicator_status=indicator_status,
                    assessment_data=response.response_data or {},
                )

                if generated_remark:
                    response.generated_remark = generated_remark
            except Exception as e:
                # Log error but don't fail the validation
                print(f"Failed to generate remark for response {response_id}: {str(e)}")

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

    def create_mov_for_assessor(
        self, db: Session, mov_create: MOVCreate, assessor: User
    ) -> dict:
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
        indicator = (
            db.query(Indicator).filter(Indicator.id == response.indicator_id).first()
        )

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
        response = (
            db.query(AssessmentResponse)
            .filter(AssessmentResponse.id == response_id)
            .first()
        )

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
        indicator = (
            db.query(Indicator).filter(Indicator.id == response.indicator_id).first()
        )

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
            upload_result = storage_service.upload_mov(
                file=file, response_id=response_id, db=db
            )
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
            "status": db_mov.status.value if hasattr(db_mov.status, "value") else str(db_mov.status),
            "response_id": db_mov.response_id,
            "uploaded_at": db_mov.uploaded_at.isoformat() + 'Z',
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
        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                joinedload(Assessment.responses)
                .joinedload(AssessmentResponse.indicator)
                .joinedload(Indicator.governance_area),
                joinedload(Assessment.responses)
                .joinedload(AssessmentResponse.indicator)
                .joinedload(Indicator.checklist_items),
                # Epic 4.0: Load MOV files from the new mov_files table (removed old movs table loading)
                # Use selectinload for better performance with many files
                joinedload(Assessment.responses).joinedload(
                    AssessmentResponse.feedback_comments
                ),
                selectinload(Assessment.mov_files),
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
                "created_at": assessment.created_at.isoformat() + 'Z',
                "updated_at": assessment.updated_at.isoformat() + 'Z',
                "submitted_at": assessment.submitted_at.isoformat() + 'Z'
                if assessment.submitted_at
                else None,
                "validated_at": assessment.validated_at.isoformat() + 'Z'
                if assessment.validated_at
                else None,
                "rework_requested_at": assessment.rework_requested_at.isoformat() + 'Z'
                if assessment.rework_requested_at
                else None,
                "rework_count": assessment.rework_count,
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

        # Process responses based on assessor's governance area assignment
        for response in assessment.responses:
            # If assessor has validator_area_id, only show responses in that area
            # If assessor has no validator_area_id, show all responses (system-wide)
            if assessor.validator_area_id is not None:
                if response.indicator.governance_area_id != assessor.validator_area_id:
                    continue
            # Get all MOV files for this indicator (before filtering)
            all_movs_for_indicator = [
                mov for mov in assessment.mov_files
                if mov.indicator_id == response.indicator_id and mov.deleted_at is None
            ]

            # Apply rework filtering
            filtered_movs = [
                mov for mov in all_movs_for_indicator
                if (
                    assessment.rework_requested_at is None
                    or mov.uploaded_at >= assessment.rework_requested_at
                )
            ]

            # Log filtering results for debugging
            if assessment.rework_requested_at and len(all_movs_for_indicator) != len(filtered_movs):
                self.logger.info(
                    f"[ASSESSOR REWORK FILTER] Indicator {response.indicator_id}: "
                    f"Filtered {len(all_movs_for_indicator)} total MOVs to {len(filtered_movs)} new MOVs "
                    f"(uploaded after {assessment.rework_requested_at})"
                )

            response_data = {
                "id": response.id,
                "is_completed": response.is_completed,
                "requires_rework": response.requires_rework,
                "validation_status": response.validation_status.value
                if response.validation_status
                else None,
                "response_data": response.response_data,
                "created_at": response.created_at.isoformat() + 'Z',
                "updated_at": response.updated_at.isoformat() + 'Z',
                "indicator": {
                    "id": response.indicator.id,
                    "name": response.indicator.name,
                    "code": response.indicator.indicator_code,
                    "indicator_code": response.indicator.indicator_code,
                    "description": response.indicator.description,
                    "form_schema": response.indicator.form_schema,
                    "validation_rule": response.indicator.validation_rule,
                    "remark_schema": response.indicator.remark_schema,
                    "governance_area": {
                        "id": response.indicator.governance_area.id,
                        "name": response.indicator.governance_area.name,
                        "code": response.indicator.governance_area.code,
                        "area_type": response.indicator.governance_area.area_type.value,
                    },
                    # Technical notes - for now using description, but this could be a separate field
                    "technical_notes": response.indicator.description
                    or "No technical notes available",
                    # Checklist items for validation
                    "checklist_items": [
                        {
                            "id": item.id,
                            "item_id": item.item_id,
                            "label": item.label,
                            "item_type": item.item_type,
                            "group_name": item.group_name,
                            "mov_description": item.mov_description,
                            "required": item.required,
                            "requires_document_count": item.requires_document_count,
                            "display_order": item.display_order,
                        }
                        for item in sorted(response.indicator.checklist_items, key=lambda x: x.display_order)
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
                        "uploaded_at": mov_file.uploaded_at.isoformat() + 'Z' if mov_file.uploaded_at else None,
                        "field_id": mov_file.field_id,
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
                        "created_at": comment.created_at.isoformat() + 'Z',
                        "assessor": {
                            "id": comment.assessor.id,
                            "name": comment.assessor.name,
                            "email": comment.assessor.email,
                        }
                        if comment.assessor
                        else None,
                    }
                    for comment in response.feedback_comments
                ],
            }
            # DEBUG: Log requires_rework status
            self.logger.info(
                f"[ASSESSOR VIEW] Response {response.id} (Indicator {response.indicator.name}): "
                f"requires_rework={response.requires_rework}, is_completed={response.is_completed}"
            )
            assessment_data["assessment"]["responses"].append(response_data)

        return assessment_data

    def send_assessment_for_rework(
        self, db: Session, assessment_id: int, assessor: User
    ) -> dict:
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
            raise ValueError(
                "Assessment has already been sent for rework. Cannot send again."
            )

        # Enforce PRD: Only allow rework from Submitted for Review
        if assessment.status != AssessmentStatus.SUBMITTED_FOR_REVIEW:
            raise ValueError("Rework is only allowed when assessment is Submitted for Review")

        # Phase 1 Assessors: Must have at least one indicator with public comments OR MOV annotations to send for rework
        # (Assessors don't set validation_status, only validators do)
        has_comments = any(
            any(
                fc.comment_type == 'validation' and not fc.is_internal_note and fc.comment
                for fc in response.feedback_comments
            )
            for response in assessment.responses
        )

        # Check for MOV annotations
        from app.db.models.assessment import MOVAnnotation

        mov_file_ids = [mf.id for mf in assessment.mov_files]
        has_annotations = False
        if mov_file_ids:
            annotation_count = db.query(MOVAnnotation).filter(
                MOVAnnotation.mov_file_id.in_(mov_file_ids)
            ).count()
            has_annotations = annotation_count > 0

        if not has_comments and not has_annotations:
            raise ValueError(
                "At least one indicator must have feedback (comments or MOV annotations) to send for rework. "
                "Add comments or annotate MOV files explaining what needs improvement."
            )

        # Update assessment status and rework count
        assessment.status = AssessmentStatus.REWORK
        assessment.rework_count = 1
        assessment.rework_requested_at = datetime.utcnow()
        assessment.rework_requested_by = assessor.id
        # Note: updated_at is automatically handled by SQLAlchemy's onupdate

        # Get all MOV annotations for this assessment to check for indicator-level feedback
        from app.db.models.assessment import MOVAnnotation

        mov_file_ids = [mf.id for mf in assessment.mov_files]
        annotations_by_indicator = {}

        if mov_file_ids:
            all_annotations = db.query(MOVAnnotation).filter(
                MOVAnnotation.mov_file_id.in_(mov_file_ids)
            ).all()

            # Group annotations by indicator_id
            for annotation in all_annotations:
                # Get the MOV file to find its indicator_id
                mov_file = next((mf for mf in assessment.mov_files if mf.id == annotation.mov_file_id), None)
                if mov_file:
                    indicator_id = mov_file.indicator_id
                    if indicator_id not in annotations_by_indicator:
                        annotations_by_indicator[indicator_id] = []
                    annotations_by_indicator[indicator_id].append(annotation)

        # Mark responses requiring rework if they have public comments OR MOV annotations
        # (Assessors don't set validation_status, only validators do in Phase 2)
        for response in assessment.responses:
            has_public_comments = any(
                fc.comment_type == 'validation' and not fc.is_internal_note and fc.comment
                for fc in response.feedback_comments
            )

            has_mov_annotations = response.indicator_id in annotations_by_indicator and len(annotations_by_indicator[response.indicator_id]) > 0

            # Mark for rework if assessor provided feedback (comments OR annotations)
            # CRITICAL: Also reset is_completed to False so BLGU must re-complete the indicator
            if has_public_comments or has_mov_annotations:
                response.requires_rework = True
                response.is_completed = False

        db.commit()
        db.refresh(assessment)

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
            print(f"Failed to queue rework summary generation: {e}")
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
            print(f"Failed to queue notification: {e}")
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

    def finalize_assessment(
        self, db: Session, assessment_id: int, assessor: User
    ) -> dict:
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
                selectinload(Assessment.responses).joinedload(AssessmentResponse.indicator)
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

        if is_validator:
            # ===== PHASE 2: VALIDATORS (Table Validation) =====
            # Must be in AWAITING_FINAL_VALIDATION status
            if assessment.status != AssessmentStatus.AWAITING_FINAL_VALIDATION:
                raise ValueError("Validators can only finalize assessments in AWAITING_FINAL_VALIDATION status")

            # Validators only review indicators in their assigned governance area
            # Filter responses to only those in validator's governance area
            validator_area_responses = [
                response
                for response in assessment.responses
                if response.indicator and response.indicator.governance_area_id == assessor.validator_area_id
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
            all_responses_validated = all(
                response.validation_status is not None
                for response in assessment.responses
            )

            if all_responses_validated:
                # All governance areas validated - move to COMPLETED
                # Validators CAN finalize even with FAIL indicators (that's the final result)
                # MLGOO Chairman will approve this final result
                assessment.status = AssessmentStatus.COMPLETED
            else:
                # This validator's area is done, but other areas still pending
                # Keep status as AWAITING_FINAL_VALIDATION
                # Note: The validation_status is already saved per indicator
                pass

        else:
            # ===== PHASE 1: ASSESSORS (Table Assessment) =====
            # Can finalize from SUBMITTED_FOR_REVIEW, IN_REVIEW, or REWORK statuses
            if assessment.status not in (
                AssessmentStatus.SUBMITTED_FOR_REVIEW,
                AssessmentStatus.IN_REVIEW,
                AssessmentStatus.REWORK
            ):
                raise ValueError("Cannot finalize assessment in its current status")

            # For assessors: Check if ALL responses have checklist data or comments
            # (Assessors fill checklists/comments, not validation_status)
            unreviewed_responses = []
            for response in assessment.responses:
                response_data = response.response_data or {}

                # Check for assessor validation data (assessor_val_ prefix)
                has_assessor_checklist = any(
                    key.startswith('assessor_val_')
                    for key in response_data.keys()
                )

                # Check for public comments
                has_public_comment = bool(response_data.get('public_comment', '').strip())

                # Response must have either checklist data or comments
                if not (has_assessor_checklist or has_public_comment):
                    unreviewed_responses.append(response.id)

            if unreviewed_responses:
                raise ValueError(
                    f"Cannot finalize assessment. Unreviewed response IDs: {unreviewed_responses}"
                )

            # All assessor reviews complete - move to Phase 2 (Table Validation)
            assessment.status = AssessmentStatus.AWAITING_FINAL_VALIDATION
            # Track which assessor completed the review
            assessment.reviewed_by = assessor.id

            # Clear validation_status on all responses so validators start fresh
            # The assessor's checklist work is preserved in response_data (assessor_val_ prefix)
            # But validators make their own Met/Unmet decisions from scratch
            for response in assessment.responses:
                response.validation_status = None

        # Set validated_at timestamp
        assessment.validated_at = (
            db.query(Assessment)
            .filter(Assessment.id == assessment_id)
            .first()
            .updated_at
        )
        # Note: updated_at is automatically handled by SQLAlchemy's onupdate

        db.commit()
        db.refresh(assessment)

        # Run classification algorithm synchronously
        # This must complete in <5 seconds to ensure real-time user experience
        from app.services.intelligence_service import intelligence_service

        try:
            classification_result = intelligence_service.classify_assessment(
                db, assessment_id
            )
        except Exception as e:
            # Log the error but don't fail the finalization operation
            print(f"Failed to run classification: {e}")
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
            print(f"Failed to calculate BBI statuses: {e}")
            bbi_calculation_result = {"success": False, "error": str(e)}

        # Trigger notification asynchronously using Celery
        try:
            from app.workers.notifications import send_validation_complete_notification

            # Queue the notification task to run in the background
            task = send_validation_complete_notification.delay(assessment_id)
            notification_result = {
                "success": True,
                "message": "Validation complete notification queued successfully",
                "task_id": task.id,
            }
        except Exception as e:
            # Log the error but don't fail the finalization operation
            print(f"Failed to queue notification: {e}")
            notification_result = {"success": False, "error": str(e)}

        return {
            "success": True,
            "message": "Assessment review completed and sent to validator for final validation",
            "assessment_id": assessment_id,
            "new_status": assessment.status.value,
            "validated_at": assessment.validated_at.isoformat() + 'Z'
            if assessment.validated_at
            else None,
            "classification_result": classification_result,
            "bbi_calculation_result": bbi_calculation_result,
            "notification_result": notification_result,
        }

    def get_analytics(self, db: Session, assessor: User) -> Dict[str, Any]:
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
                joinedload(Assessment.responses).joinedload(
                    AssessmentResponse.indicator
                ),
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
                Assessment.reviewed_by == assessor.id  # Only count assessments reviewed by THIS assessor
            )
            .distinct(Assessment.id)
            .all()
        )

        # Calculate overview (performance metrics)
        total_assessed = len(assessments)
        passed = sum(
            1
            for a in assessments
            if a.final_compliance_status == ComplianceStatus.PASSED
        )
        failed = sum(
            1
            for a in assessments
            if a.final_compliance_status == ComplianceStatus.FAILED
        )
        # If compliance status not set, count based on validation status
        # An assessment passes if majority of responses are Pass
        if total_assessed > 0:
            assessments_without_compliance = [
                a
                for a in assessments
                if a.final_compliance_status is None
            ]
            for a in assessments_without_compliance:
                if a.responses:
                    pass_count = sum(
                        1
                        for r in a.responses
                        if r.validation_status == ValidationStatus.PASS
                    )
                    fail_count = sum(
                        1
                        for r in a.responses
                        if r.validation_status == ValidationStatus.FAIL
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
        indicator_failures: Dict[int, Dict[str, Any]] = {}
        barangay_failures: Dict[int, List[str]] = {}

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
                        indicator_failures[indicator_id]["barangays"].append(
                            barangay_name
                        )

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
                indicator_failures.items(), key=lambda x: x[1]["failed_count"], reverse=True
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
                        if (
                            first_validation is None
                            or response.updated_at < first_validation
                        ):
                            first_validation = response.updated_at

                if first_validation:
                    time_diff = (first_validation - assessment.submitted_at).total_seconds() / (
                        24 * 3600
                    )  # Convert to days
                    if time_diff > 0:
                        review_times.append(time_diff)

        avg_time_to_first_review = (
            sum(review_times) / len(review_times) if review_times else 0.0
        )

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
                        (assessment.validated_at - assessment.submitted_at).total_seconds()
                        / (24 * 3600)
                    )
                    rework_times.append(time_diff)

        avg_rework_cycle_time = (
            sum(rework_times) / len(rework_times) if rework_times else 0.0
        )

        rework_rate = (rework_count / total_assessed * 100) if total_assessed > 0 else 0.0

        # Counts by status
        counts_by_status: Dict[str, int] = {}
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


assessor_service = AssessorService()
