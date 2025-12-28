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

        During REWORK status, we Apply "Hybrid Granular Logic":
        1. If Annotations exist: Invalidate ONLY annotated/old files (Granular). Unannotated old files are KEPT.
        2. If NO Annotations but YES Comments: Invalidate ALL old files (Strict).
        3. If NO Feedback: Keep ALL files.

        Args:
            assessment_id: The ID of the assessment to validate
            db: SQLAlchemy database session
            assessment_status: Current assessment status
            rework_requested_at: Timestamp when rework was requested
            is_mlgoo_recalibration: True if this is an MLGOO RE-calibration
            mlgoo_indicator_ids: List of indicator IDs to validate for MLGOO RE-calibration

        Returns:
            List of indicator names/IDs that are incomplete
        """
        from sqlalchemy.orm import joinedload

        from app.db.models.assessment import FeedbackComment

        incomplete_indicators = []
        mlgoo_indicator_ids = mlgoo_indicator_ids or []

        # Check if we're in REWORK mode
        is_rework = assessment_status and assessment_status.upper() in (
            "REWORK",
            "NEEDS_REWORK",
        )

        responses = db.query(AssessmentResponse).filter_by(assessment_id=assessment_id).all()

        for response in responses:
            indicator = db.query(Indicator).filter_by(id=response.indicator_id).first()
            if not indicator:
                continue

            # MLGOO Filter
            if is_mlgoo_recalibration and mlgoo_indicator_ids:
                if indicator.id not in mlgoo_indicator_ids:
                    continue

            # Fetch MOVs with annotations
            mov_files = (
                db.query(MOVFile)
                .options(joinedload(MOVFile.annotations))
                .filter(
                    MOVFile.assessment_id == assessment_id,
                    MOVFile.indicator_id == indicator.id,
                    MOVFile.deleted_at.is_(None),
                )
                .all()
            )

            # Apply Hybrid Filter
            valid_movs = mov_files
            if is_rework and rework_requested_at:
                annotation_count = sum(1 for m in mov_files if m.annotations)

                feedback_count = (
                    db.query(FeedbackComment)
                    .filter(
                        FeedbackComment.response_id == response.id,
                        FeedbackComment.is_internal_note == False,
                    )
                    .count()
                )

                if annotation_count > 0:
                    # Case 1: Specific Annotations -> Granular Filter
                    # Keep New files OR Unannotated Old files
                    valid_movs = []
                    for m in mov_files:
                        is_new = m.uploaded_at and m.uploaded_at >= rework_requested_at
                        has_note = len(m.annotations) > 0
                        if is_new or (not has_note):
                            valid_movs.append(m)
                    self.logger.info(
                        f"Indicator {indicator.id}: Granular Filter Applied (Annotations present)"
                    )

                elif feedback_count > 0:
                    # Case 2: General Comment Only -> Strict Filter
                    # Drop ALL old files
                    valid_movs = [
                        m
                        for m in mov_files
                        if m.uploaded_at and m.uploaded_at >= rework_requested_at
                    ]
                    self.logger.info(
                        f"Indicator {indicator.id}: Strict Filter Applied (Comment only)"
                    )

                # Case 3: No Feedback -> Keep All

            # Check Completeness
            validation_result = completeness_validation_service.validate_completeness(
                form_schema=indicator.form_schema,
                response_data=response.response_data,
                uploaded_movs=valid_movs,
            )
            # Re-map valid_movs for correctness if using simple list
            # But wait, validate_completeness expects 'uploaded_movs' which are objects with storage_path
            # so passing 'valid_movs' (MOVFile objects) is correct.

            if not validation_result["is_complete"]:
                incomplete_indicators.append(indicator.name)

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
        Validate that all required MOV files are uploaded (Hybrid Logic).
        """
        from sqlalchemy.orm import joinedload

        from app.db.models.assessment import FeedbackComment

        missing_movs = []
        mlgoo_indicator_ids = mlgoo_indicator_ids or []
        is_rework = assessment_status and assessment_status.upper() in ("REWORK", "NEEDS_REWORK")

        responses = db.query(AssessmentResponse).filter_by(assessment_id=assessment_id).all()

        for response in responses:
            indicator = db.query(Indicator).filter_by(id=response.indicator_id).first()
            if not indicator:
                continue

            if is_mlgoo_recalibration and mlgoo_indicator_ids:
                if indicator.id not in mlgoo_indicator_ids:
                    continue

            if self._has_file_upload_fields(indicator.form_schema):
                # Fetch MOVs with annotations
                mov_files = (
                    db.query(MOVFile)
                    .options(joinedload(MOVFile.annotations))
                    .filter(
                        MOVFile.assessment_id == assessment_id,
                        MOVFile.indicator_id == indicator.id,
                        MOVFile.deleted_at.is_(None),
                    )
                    .all()
                )

                # Apply Hybrid Filter
                mov_count = len(mov_files)
                if is_rework and rework_requested_at:
                    annotation_count = sum(1 for m in mov_files if m.annotations)
                    feedback_count = (
                        db.query(FeedbackComment)
                        .filter(
                            FeedbackComment.response_id == response.id,
                            FeedbackComment.is_internal_note == False,
                        )
                        .count()
                    )

                    if annotation_count > 0:
                        # Granular: Keep New OR Unannotated
                        valid_count = 0
                        for m in mov_files:
                            is_new = m.uploaded_at and m.uploaded_at >= rework_requested_at
                            has_note = len(m.annotations) > 0
                            if is_new or (not has_note):
                                valid_count += 1
                        mov_count = valid_count

                    elif feedback_count > 0:
                        # Strict: Keep New Only
                        mov_count = sum(
                            1
                            for m in mov_files
                            if m.uploaded_at and m.uploaded_at >= rework_requested_at
                        )

                if mov_count == 0:
                    missing_movs.append(indicator.name)

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
