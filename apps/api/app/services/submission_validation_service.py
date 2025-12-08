"""
Submission Validation Service (Epic 5.0)

This service validates that an assessment is complete and ready for submission.
It performs comprehensive checks before allowing a BLGU user to submit their assessment.

The service checks:
1. Completeness: All required indicator fields are filled (uses CompletenessValidationService)
2. MOVs: All required file uploads (MOVFiles) are present

Usage:
    from app.services.submission_validation_service import submission_validation_service

    result = submission_validation_service.validate_submission(
        assessment_id=1,
        db=db_session
    )

    if not result.is_valid:
        print(f"Incomplete indicators: {result.incomplete_indicators}")
        print(f"Missing MOVs: {result.missing_movs}")
"""

import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.db.models.assessment import Assessment, AssessmentResponse, MOVFile
from app.db.models.governance_area import Indicator
from app.schemas.assessment import SubmissionValidationResult
from app.services.completeness_validation_service import completeness_validation_service

logger = logging.getLogger(__name__)


class SubmissionValidationError(Exception):
    """Custom exception for submission validation errors"""

    pass


class SubmissionValidationService:
    """
    Service for validating assessment submission readiness (Epic 5.0).

    This service ensures that an assessment meets all requirements before
    being submitted for assessor review.
    """

    def __init__(self):
        """Initialize the submission validation service"""
        self.logger = logging.getLogger(__name__)

    def validate_submission(self, assessment_id: int, db: Session) -> SubmissionValidationResult:
        """
        Validate that an assessment is complete and ready for submission.

        This is the main entry point for Epic 5.0 submission validation.

        During REWORK status, only MOV files uploaded AFTER rework_requested_at are counted.

        Args:
            assessment_id: The ID of the assessment to validate
            db: SQLAlchemy database session

        Returns:
            SubmissionValidationResult with validation status and details

        Raises:
            SubmissionValidationError: If the assessment cannot be validated
        """
        try:
            # Get the assessment
            assessment = db.query(Assessment).filter_by(id=assessment_id).first()
            if not assessment:
                raise SubmissionValidationError(f"Assessment {assessment_id} not found")

            # Get assessment status and rework timestamp for filtering
            assessment_status = (
                assessment.status.value
                if hasattr(assessment.status, "value")
                else str(assessment.status)
            )
            rework_requested_at = assessment.rework_requested_at

            # Check if this is an MLGOO RE-calibration
            is_mlgoo_recalibration = assessment.is_mlgoo_recalibration
            mlgoo_recalibration_indicator_ids = assessment.mlgoo_recalibration_indicator_ids or []
            mlgoo_recalibration_requested_at = assessment.mlgoo_recalibration_requested_at

            # For MLGOO RE-calibration, use the MLGOO timestamp instead of rework timestamp
            if is_mlgoo_recalibration and mlgoo_recalibration_requested_at:
                effective_rework_timestamp = mlgoo_recalibration_requested_at
            else:
                effective_rework_timestamp = rework_requested_at

            # ENHANCED LOGGING for debugging
            self.logger.info(
                f"[SUBMISSION VALIDATION] Assessment {assessment_id} - "
                f"Status: '{assessment_status}', Rework requested at: {rework_requested_at}, "
                f"is_mlgoo_recalibration: {is_mlgoo_recalibration}, "
                f"mlgoo_recalibration_indicator_ids: {mlgoo_recalibration_indicator_ids}"
            )

            # Validate completeness of all indicators (with rework filtering)
            # For MLGOO RE-calibration, only validate the specific indicators
            incomplete_indicators = self.validate_completeness(
                assessment_id,
                db,
                assessment_status,
                effective_rework_timestamp,
                is_mlgoo_recalibration=is_mlgoo_recalibration,
                mlgoo_indicator_ids=mlgoo_recalibration_indicator_ids,
            )

            # Validate that all required MOVs are uploaded (with rework filtering)
            # For MLGOO RE-calibration, only validate the specific indicators
            missing_movs = self.validate_movs(
                assessment_id,
                db,
                assessment_status,
                effective_rework_timestamp,
                is_mlgoo_recalibration=is_mlgoo_recalibration,
                mlgoo_indicator_ids=mlgoo_recalibration_indicator_ids,
            )

            # Determine overall validity
            is_valid = len(incomplete_indicators) == 0 and len(missing_movs) == 0

            # Build error message if invalid
            error_message = None
            if not is_valid:
                error_parts = []
                if incomplete_indicators:
                    self.logger.warning(
                        f"[SUBMISSION VALIDATION] {len(incomplete_indicators)} incomplete indicators: {incomplete_indicators[:5]}"
                    )
                    error_parts.append(f"{len(incomplete_indicators)} indicator(s) are incomplete")
                if missing_movs:
                    self.logger.warning(
                        f"[SUBMISSION VALIDATION] {len(missing_movs)} missing MOVs: {missing_movs[:5]}"
                    )
                    error_parts.append(
                        f"{len(missing_movs)} indicator(s) are missing required file uploads"
                    )
                error_message = ". ".join(error_parts)
            else:
                self.logger.info(f"[SUBMISSION VALIDATION] Assessment {assessment_id} is VALID")

            return SubmissionValidationResult(
                is_valid=is_valid,
                incomplete_indicators=incomplete_indicators,
                missing_movs=missing_movs,
                error_message=error_message,
            )

        except Exception as e:
            self.logger.error(
                f"Error validating submission for assessment {assessment_id}: {str(e)}",
                exc_info=True,
            )
            raise SubmissionValidationError(f"Failed to validate submission: {str(e)}")

    def validate_completeness(
        self,
        assessment_id: int,
        db: Session,
        assessment_status: str = None,
        rework_requested_at: datetime = None,
        is_mlgoo_recalibration: bool = False,
        mlgoo_indicator_ids: list[int] = None,
    ) -> list[str]:
        """
        Validate that all indicators in the assessment are complete.

        During REWORK status:
        - Indicators WITH feedback: Only count files uploaded AFTER rework_requested_at
        - Indicators WITHOUT feedback: Count ALL files (old files still valid)

        During MLGOO RE-calibration:
        - ONLY validate the specific indicators in mlgoo_indicator_ids
        - Other indicators are NOT checked (they already passed validation)

        Recalculates completion on-the-fly to ensure correct validation during rework.

        Args:
            assessment_id: The ID of the assessment to validate
            db: SQLAlchemy database session
            assessment_status: Current assessment status (for rework filtering)
            rework_requested_at: Timestamp when rework was requested (for filtering)
            is_mlgoo_recalibration: True if this is an MLGOO RE-calibration
            mlgoo_indicator_ids: List of indicator IDs to validate for MLGOO RE-calibration

        Returns:
            List of indicator names/IDs that are incomplete (empty list if all complete)
        """
        from app.db.models.assessment import FeedbackComment, MOVAnnotation

        incomplete_indicators = []
        mlgoo_indicator_ids = mlgoo_indicator_ids or []

        # Check if we're in REWORK mode
        is_rework = assessment_status and assessment_status.upper() in (
            "REWORK",
            "NEEDS_REWORK",
        )

        # DEBUG: Log what we received
        self.logger.info(
            f"[COMPLETENESS DEBUG] assessment_status='{assessment_status}', "
            f"rework_requested_at={rework_requested_at}, is_rework={is_rework}"
        )

        # Get all assessment responses for this assessment
        # Only check indicators that have responses (not all active indicators in system)
        responses = db.query(AssessmentResponse).filter_by(assessment_id=assessment_id).all()
        self.logger.info(
            f"[COMPLETENESS DEBUG] Found {len(responses)} responses for assessment {assessment_id}"
        )

        # Check each response's indicator
        for response in responses:
            # Get the indicator for this response
            indicator = db.query(Indicator).filter_by(id=response.indicator_id).first()
            if not indicator:
                self.logger.warning(
                    f"[COMPLETENESS DEBUG] Response {response.id} has invalid indicator_id {response.indicator_id}"
                )
                continue

            # For MLGOO RE-calibration: ONLY validate the specific indicators
            # Skip all other indicators (they already passed validation)
            if is_mlgoo_recalibration and mlgoo_indicator_ids:
                if indicator.id not in mlgoo_indicator_ids:
                    self.logger.info(
                        f"[COMPLETENESS] Skipping indicator {indicator.id} - not in MLGOO recalibration list"
                    )
                    continue

            # Get MOV files for this indicator (needed for both normal and rework paths)
            mov_files = (
                db.query(MOVFile)
                .filter(
                    MOVFile.assessment_id == assessment_id,
                    MOVFile.indicator_id == indicator.id,
                    MOVFile.deleted_at.is_(None),
                )
                .all()
            )

            # During REWORK: Apply selective filtering based on feedback
            if is_rework and rework_requested_at:
                self.logger.info(
                    f"[COMPLETENESS DEBUG] Indicator {indicator.id}: Taking REWORK path"
                )
                feedback_count = (
                    db.query(FeedbackComment)
                    .filter(
                        FeedbackComment.response_id == response.id,
                        FeedbackComment.is_internal_note == False,
                    )
                    .count()
                )

                annotation_count = (
                    db.query(MOVAnnotation)
                    .join(MOVFile)
                    .filter(
                        MOVFile.assessment_id == assessment_id,
                        MOVFile.indicator_id == indicator.id,
                    )
                    .count()
                )

                has_feedback = feedback_count > 0 or annotation_count > 0

                # Apply selective filtering based on feedback
                if has_feedback:
                    # Only count files uploaded after rework
                    mov_files = [
                        m
                        for m in mov_files
                        if m.uploaded_at and m.uploaded_at >= rework_requested_at
                    ]
                    self.logger.info(
                        f"[COMPLETENESS] Indicator {indicator.id} has feedback - counting only new files: {len(mov_files)}"
                    )
                else:
                    # No feedback - count all files (old + new)
                    self.logger.info(
                        f"[COMPLETENESS] Indicator {indicator.id} has NO feedback - counting all files: {len(mov_files)}"
                    )
            else:
                # Normal path (not rework) - use all MOV files
                self.logger.info(
                    f"[COMPLETENESS DEBUG] Indicator {indicator.id}: Taking NORMAL path - {len(mov_files)} MOV files"
                )

            # Use completeness_validation_service to check completion
            validation_result = completeness_validation_service.validate_completeness(
                form_schema=indicator.form_schema,
                response_data=response.response_data,
                uploaded_movs=mov_files,
            )

            is_complete = validation_result["is_complete"]

            if not is_complete:
                incomplete_indicators.append(indicator.name)
                self.logger.info(
                    f"[INCOMPLETE] Indicator ID {indicator.id}: '{indicator.name}' is INCOMPLETE"
                )

        return incomplete_indicators

    def validate_movs(
        self,
        assessment_id: int,
        db: Session,
        assessment_status: str = None,
        rework_requested_at: datetime = None,
        is_mlgoo_recalibration: bool = False,
        mlgoo_indicator_ids: list[int] = None,
    ) -> list[str]:
        """
        Validate that all required MOV files (Epic 4.0) are uploaded.

        During REWORK status, the filtering logic is:
        - Indicators WITH assessor feedback/comments: Only count files uploaded AFTER rework_requested_at
        - Indicators WITHOUT assessor feedback: Count ALL files (old files are still valid)

        During MLGOO RE-calibration:
        - ONLY validate the specific indicators in mlgoo_indicator_ids
        - Other indicators are NOT checked (they already passed validation)

        This allows BLGU users to only re-upload files for indicators the assessor flagged,
        while keeping the old files for indicators that passed the first review.

        Args:
            assessment_id: The ID of the assessment to validate
            db: SQLAlchemy database session
            assessment_status: Current assessment status (for rework filtering)
            rework_requested_at: Timestamp when rework was requested (for filtering)
            is_mlgoo_recalibration: True if this is an MLGOO RE-calibration
            mlgoo_indicator_ids: List of indicator IDs to validate for MLGOO RE-calibration

        Returns:
            List of indicator names/IDs missing required MOV files (empty list if all present)
        """
        from app.db.models.assessment import FeedbackComment, MOVAnnotation

        missing_movs = []
        mlgoo_indicator_ids = mlgoo_indicator_ids or []

        # Check if we're in REWORK mode
        is_rework = assessment_status and assessment_status.upper() in (
            "REWORK",
            "NEEDS_REWORK",
        )

        if is_rework and rework_requested_at:
            self.logger.info(
                "[MOV VALIDATION] REWORK mode - will apply selective filtering based on assessor feedback"
            )

        # Get all indicators that have file upload fields
        # We need to check the form_schema for each indicator to determine
        # if it requires file uploads
        responses = db.query(AssessmentResponse).filter_by(assessment_id=assessment_id).all()

        for response in responses:
            # Get the indicator
            indicator = db.query(Indicator).filter_by(id=response.indicator_id).first()
            if not indicator:
                continue

            # For MLGOO RE-calibration: ONLY validate the specific indicators
            # Skip all other indicators (they already passed validation)
            if is_mlgoo_recalibration and mlgoo_indicator_ids:
                if indicator.id not in mlgoo_indicator_ids:
                    self.logger.debug(
                        f"[MOV VALIDATION] Skipping indicator {indicator.id} - not in MLGOO recalibration list"
                    )
                    continue

            # Check if this indicator's form schema has file upload fields
            if self._has_file_upload_fields(indicator.form_schema):
                # During REWORK: Check if this indicator has assessor feedback
                has_feedback = False
                if is_rework and rework_requested_at:
                    # Check for feedback comments (non-internal)
                    feedback_count = (
                        db.query(FeedbackComment)
                        .filter(
                            FeedbackComment.response_id == response.id,
                            FeedbackComment.is_internal_note == False,
                        )
                        .count()
                    )

                    # Check for MOV annotations
                    annotation_count = (
                        db.query(MOVAnnotation)
                        .join(MOVFile)
                        .filter(
                            MOVFile.assessment_id == assessment_id,
                            MOVFile.indicator_id == indicator.id,
                        )
                        .count()
                    )

                    has_feedback = feedback_count > 0 or annotation_count > 0

                    self.logger.debug(
                        f"[MOV VALIDATION] Indicator {indicator.id} ({indicator.name}): "
                        f"has_feedback={has_feedback} (comments={feedback_count}, annotations={annotation_count})"
                    )

                # Build query for MOVFiles for this indicator
                mov_query = db.query(MOVFile).filter(
                    MOVFile.assessment_id == assessment_id,
                    MOVFile.indicator_id == indicator.id,
                    MOVFile.deleted_at.is_(None),  # Only count non-deleted files
                )

                # During REWORK: Only filter if indicator has assessor feedback
                # If no feedback, old files are still valid
                if is_rework and rework_requested_at and has_feedback:
                    mov_query = mov_query.filter(MOVFile.uploaded_at >= rework_requested_at)
                    self.logger.debug(
                        f"[MOV VALIDATION] Indicator {indicator.id}: Applying rework filter (only new files)"
                    )
                elif is_rework and rework_requested_at and not has_feedback:
                    self.logger.debug(
                        f"[MOV VALIDATION] Indicator {indicator.id}: No feedback - accepting all files (old+new)"
                    )

                mov_count = mov_query.count()

                self.logger.debug(
                    f"[MOV VALIDATION] Indicator {indicator.id} ({indicator.name}): {mov_count} MOV files"
                )

                if mov_count == 0:
                    missing_movs.append(indicator.name)
                    self.logger.warning(
                        f"[MOV VALIDATION] Indicator {indicator.id} ({indicator.name}) is missing MOV files"
                    )

        return missing_movs

    def _has_file_upload_fields(self, form_schema: dict) -> bool:
        """
        Check if a form schema has any file upload fields.

        Args:
            form_schema: The form schema dictionary

        Returns:
            True if the schema has file upload fields, False otherwise
        """
        if not form_schema or "fields" not in form_schema:
            return False

        for field in form_schema.get("fields", []):
            field_type = field.get("field_type") or field.get("type")
            if field_type == "file_upload":
                return True

        return False


# Singleton instance for use across the application
submission_validation_service = SubmissionValidationService()
