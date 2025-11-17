# 🛠️ Assessor Service
# Business logic for assessor features

from datetime import datetime, timedelta
from typing import Any, Dict, List

from app.db.enums import AssessmentStatus, ComplianceStatus, ValidationStatus
from app.db.models.assessment import (
    MOV as MOVModel,  # SQLAlchemy model - alias to avoid conflict
    Assessment,
    AssessmentResponse,
    FeedbackComment,
)
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from app.schemas.assessment import MOV, MOVCreate  # Pydantic schema
from app.services.storage_service import storage_service
from fastapi import UploadFile
from sqlalchemy.orm import Session, joinedload


class AssessorService:
    def get_assessor_queue(self, db: Session, assessor: User) -> List[dict]:
        """
        Return submissions filtered by the assessor's governance area.

        - If assessor has validator_area_id: Show only assessments in that governance area
        - If assessor has no validator_area_id: Show all assessments (system-wide access)

        Includes barangay name, submission date, status, and last updated.
        """
        # Base query
        query = (
            db.query(Assessment)
            .join(AssessmentResponse, AssessmentResponse.assessment_id == Assessment.id)
            .join(Indicator, Indicator.id == AssessmentResponse.indicator_id)
            .options(joinedload(Assessment.blgu_user).joinedload(User.barangay))
        )

        # Filter by governance area only if assessor has validator_area_id assigned
        if assessor.validator_area_id is not None:
            query = query.filter(Indicator.governance_area_id == assessor.validator_area_id)

        # Apply remaining filters
        assessments = (
            query.filter(
                # Only include true submissions (must have been submitted)
                Assessment.submitted_at.isnot(None),
                Assessment.status.in_(
                    [
                        AssessmentStatus.SUBMITTED_FOR_REVIEW,
                        AssessmentStatus.NEEDS_REWORK,
                        AssessmentStatus.VALIDATED,
                    ]
                ),
            )
            .distinct(Assessment.id)
            .order_by(Assessment.id, Assessment.updated_at.desc())
            .all()
        )

        items = []
        for a in assessments:
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

        return items

    def validate_assessment_response(
        self,
        db: Session,
        response_id: int,
        assessor: User,
        validation_status: ValidationStatus,
        public_comment: str | None = None,
        internal_note: str | None = None,
    ) -> dict:
        """
        Validate an assessment response and save feedback comments.

        Args:
            db: Database session
            response_id: ID of the assessment response to validate
            assessor: The assessor performing the validation
            validation_status: The validation status (Pass/Fail/Conditional)
            public_comment: Public comment visible to BLGU user
            internal_note: Internal note only visible to assessors

        Returns:
            dict: Success status and details
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
                "assessment_response_id": response_id,
                "validation_status": validation_status,
            }

        # Update the validation status
        response.validation_status = validation_status

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

        # Save internal note if provided
        if internal_note:
            internal_feedback = FeedbackComment(
                comment=internal_note,
                comment_type="internal_note",
                response_id=response_id,
                assessor_id=assessor.id,
                is_internal_note=True,
            )
            db.add(internal_feedback)

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
            "uploaded_at": db_mov.uploaded_at.isoformat(),
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
                joinedload(Assessment.responses).joinedload(AssessmentResponse.movs),
                joinedload(Assessment.responses).joinedload(
                    AssessmentResponse.feedback_comments
                ),
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
                "created_at": assessment.created_at.isoformat(),
                "updated_at": assessment.updated_at.isoformat(),
                "submitted_at": assessment.submitted_at.isoformat()
                if assessment.submitted_at
                else None,
                "validated_at": assessment.validated_at.isoformat()
                if assessment.validated_at
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

        # Process responses based on assessor's governance area assignment
        for response in assessment.responses:
            # If assessor has validator_area_id, only show responses in that area
            # If assessor has no validator_area_id, show all responses (system-wide)
            if assessor.validator_area_id is not None:
                if response.indicator.governance_area_id != assessor.validator_area_id:
                    continue
            response_data = {
                "id": response.id,
                "is_completed": response.is_completed,
                "requires_rework": response.requires_rework,
                "validation_status": response.validation_status.value
                if response.validation_status
                else None,
                "response_data": response.response_data,
                "created_at": response.created_at.isoformat(),
                "updated_at": response.updated_at.isoformat(),
                "indicator": {
                    "id": response.indicator.id,
                    "name": response.indicator.name,
                    "code": response.indicator.indicator_code,
                    "description": response.indicator.description,
                    "form_schema": response.indicator.form_schema,
                    "validation_rule": response.indicator.validation_rule,
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
                        "id": mov.id,
                        "filename": mov.filename,
                        "original_filename": mov.original_filename,
                        "file_size": mov.file_size,
                        "content_type": mov.content_type,
                        "storage_path": mov.storage_path,
                        "status": mov.status.value,
                        "uploaded_at": mov.uploaded_at.isoformat(),
                    }
                    for mov in response.movs
                ],
                "feedback_comments": [
                    {
                        "id": comment.id,
                        "comment": comment.comment,
                        "comment_type": comment.comment_type,
                        "is_internal_note": comment.is_internal_note,
                        "created_at": comment.created_at.isoformat(),
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
            assessment_data["assessment"]["responses"].append(response_data)

        return assessment_data

    def send_assessment_for_rework(
        self, db: Session, assessment_id: int, assessor: User
    ) -> dict:
        """
        Send assessment back to BLGU user for rework.

        Args:
            db: Database session
            assessment_id: ID of the assessment to send for rework
            assessor: The assessor performing the action (currently unused but kept for future audit logging)

        Returns:
            dict: Result of the rework operation

        Raises:
            ValueError: If assessment not found or rework not allowed
            PermissionError: If assessor doesn't have permission
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

        # Check if rework is allowed (rework_count must be 0)
        if assessment.rework_count != 0:
            raise ValueError(
                "Assessment has already been sent for rework. Cannot send again."
            )

        # Enforce PRD: Only allow rework from Submitted for Review
        if assessment.status != AssessmentStatus.SUBMITTED_FOR_REVIEW:
            raise ValueError("Rework is only allowed when assessment is Submitted for Review")

        # Enforce PRD: All responses must be reviewed before sending rework
        if any(r.validation_status is None for r in assessment.responses):
            raise ValueError("All indicators must be reviewed before sending for rework")

        # Enforce PRD: At least one indicator must be marked as Fail to send rework
        has_fail = any(r.validation_status == ValidationStatus.FAIL for r in assessment.responses)
        if not has_fail:
            raise ValueError("At least one indicator must be marked as Fail to send for rework")

        # Check assessor permission (assessor must be assigned to the governance area)
        # For now, we'll allow any assessor to send for rework
        # In a more sophisticated system, we'd check specific permissions

        # Update assessment status and rework count
        assessment.status = AssessmentStatus.NEEDS_REWORK
        assessment.rework_count = 1
        # Note: updated_at is automatically handled by SQLAlchemy's onupdate

        # Mark all responses as requiring rework
        for response in assessment.responses:
            response.requires_rework = True

        db.commit()
        db.refresh(assessment)

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
            "notification_result": notification_result,
        }

    def finalize_assessment(
        self, db: Session, assessment_id: int, assessor: User
    ) -> dict:
        """
        Finalize assessment validation, permanently locking it.

        Args:
            db: Database session
            assessment_id: ID of the assessment to finalize
            assessor: The assessor performing the action (currently unused but kept for future audit logging)

        Returns:
            dict: Result of the finalization operation

        Raises:
            ValueError: If assessment not found or cannot be finalized
            PermissionError: If assessor doesn't have permission
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

        # Check if assessment can be finalized
        if assessment.status == AssessmentStatus.VALIDATED:
            raise ValueError("Assessment is already finalized")

        if assessment.status == AssessmentStatus.DRAFT:
            raise ValueError("Cannot finalize a draft assessment")

        # Only allow finalize from Submitted for Review or Needs Rework
        if assessment.status not in (AssessmentStatus.SUBMITTED_FOR_REVIEW, AssessmentStatus.NEEDS_REWORK):
            raise ValueError("Cannot finalize assessment in its current status")

        # Check that all responses have been reviewed (have validation status)
        unreviewed_responses = [
            response
            for response in assessment.responses
            if response.validation_status is None
        ]

        if unreviewed_responses:
            raise ValueError(
                f"Cannot finalize assessment. {len(unreviewed_responses)} responses have not been reviewed."
            )

        # If first submission: do not allow finalize if there are Fail indicators (must use rework)
        if assessment.status == AssessmentStatus.SUBMITTED_FOR_REVIEW:
            has_fail = any(r.validation_status == ValidationStatus.FAIL for r in assessment.responses)
            if has_fail:
                raise ValueError("Cannot finalize with Fail indicators on first submission; send for rework")

        # Update assessment status
        assessment.status = AssessmentStatus.VALIDATED
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
            "message": "Assessment finalized successfully",
            "assessment_id": assessment_id,
            "new_status": assessment.status.value,
            "validated_at": assessment.validated_at.isoformat()
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

        assessments = (
            query.filter(
                Assessment.status.in_(
                    [
                        AssessmentStatus.SUBMITTED_FOR_REVIEW,
                        AssessmentStatus.NEEDS_REWORK,
                        AssessmentStatus.VALIDATED,
                    ]
                )
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
