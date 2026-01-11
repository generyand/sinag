# 📅 Deadline Extension Service
# Business logic for per-assessment deadline extensions

import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session, joinedload

from app.db.models.admin import AssessmentDeadlineExtension
from app.db.models.assessment import Assessment
from app.db.models.user import User
from app.schemas.deadline_extension import (
    DeadlineExtensionCreate,
    DeadlineExtensionListResponse,
    DeadlineExtensionResponse,
    ExtendDeadlineResult,
    UserNested,
)

logger = logging.getLogger(__name__)


class DeadlineExtensionService:
    """Service for managing per-assessment deadline extensions."""

    def __init__(self):
        """Initialize the deadline extension service."""
        self.logger = logging.getLogger(__name__)

    def extend_deadline(
        self,
        db: Session,
        assessment_id: int,
        data: DeadlineExtensionCreate,
        extended_by: User,
    ) -> ExtendDeadlineResult:
        """
        Extend an assessment's rework or calibration deadline.

        Only MLGOO can grant extensions. This creates an extension record
        and updates the assessment's deadline fields.

        Args:
            db: Database session
            assessment_id: ID of the assessment to extend
            data: Extension request data
            extended_by: The MLGOO user granting the extension

        Returns:
            ExtendDeadlineResult: Result of the extension operation

        Raises:
            ValueError: If assessment not found or no deadline set
        """
        # Get the assessment
        assessment = (
            db.query(Assessment)
            .options(joinedload(Assessment.blgu_user))
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Determine original deadline based on extension type
        if data.extension_type == "rework":
            original_deadline = assessment.per_assessment_rework_deadline
            if not original_deadline:
                raise ValueError(
                    "No rework deadline set for this assessment. "
                    "Deadline is only set when Assessor sends for rework."
                )
        else:  # calibration
            original_deadline = assessment.per_assessment_calibration_deadline
            if not original_deadline:
                raise ValueError(
                    "No calibration deadline set for this assessment. "
                    "Deadline is only set when Validator sends for calibration."
                )

        # Calculate new deadline
        new_deadline = original_deadline + timedelta(days=data.additional_days)

        # Create extension record for audit trail
        extension = AssessmentDeadlineExtension(
            assessment_id=assessment_id,
            extended_by=extended_by.id,
            extension_type=data.extension_type,
            original_deadline=original_deadline,
            new_deadline=new_deadline,
            additional_days=data.additional_days,
            reason=data.reason,
            created_at=datetime.utcnow(),
        )
        db.add(extension)

        # Update assessment deadline
        if data.extension_type == "rework":
            assessment.per_assessment_rework_deadline = new_deadline
        else:
            assessment.per_assessment_calibration_deadline = new_deadline

        # Update grace_period_expires_at for consistency
        assessment.grace_period_expires_at = new_deadline

        # If assessment was locked for deadline, unlock it
        if assessment.is_locked_for_deadline:
            assessment.is_locked_for_deadline = False
            assessment.locked_at = None
            self.logger.info(
                f"[DEADLINE EXTENSION] Unlocked assessment {assessment_id} after extension"
            )

        db.commit()
        db.refresh(extension)

        self.logger.info(
            f"[DEADLINE EXTENSION] Extended {data.extension_type} deadline for assessment {assessment_id} "
            f"by {data.additional_days} days. New deadline: {new_deadline}"
        )

        # Build response
        extender_nested = UserNested(
            id=extended_by.id,
            name=extended_by.name,
            email=extended_by.email,
        )

        extension_response = DeadlineExtensionResponse(
            id=extension.id,
            assessment_id=extension.assessment_id,
            extension_type=extension.extension_type,
            original_deadline=extension.original_deadline,
            new_deadline=extension.new_deadline,
            additional_days=extension.additional_days,
            reason=extension.reason,
            created_at=extension.created_at,
            extender=extender_nested,
        )

        return ExtendDeadlineResult(
            success=True,
            message=f"Extended {data.extension_type} deadline by {data.additional_days} days",
            extension=extension_response,
            new_deadline=new_deadline,
        )

    def get_extensions_for_assessment(
        self,
        db: Session,
        assessment_id: int,
    ) -> DeadlineExtensionListResponse:
        """
        Get all deadline extensions for an assessment.

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            DeadlineExtensionListResponse: List of extensions with total count
        """
        extensions = (
            db.query(AssessmentDeadlineExtension)
            .options(joinedload(AssessmentDeadlineExtension.extender))
            .filter(AssessmentDeadlineExtension.assessment_id == assessment_id)
            .order_by(AssessmentDeadlineExtension.created_at.desc())
            .all()
        )

        extension_responses = []
        for ext in extensions:
            extender_nested = None
            if ext.extender:
                extender_nested = UserNested(
                    id=ext.extender.id,
                    name=ext.extender.name,
                    email=ext.extender.email,
                )

            extension_responses.append(
                DeadlineExtensionResponse(
                    id=ext.id,
                    assessment_id=ext.assessment_id,
                    extension_type=ext.extension_type,
                    original_deadline=ext.original_deadline,
                    new_deadline=ext.new_deadline,
                    additional_days=ext.additional_days,
                    reason=ext.reason,
                    created_at=ext.created_at,
                    extender=extender_nested,
                )
            )

        return DeadlineExtensionListResponse(
            extensions=extension_responses,
            total=len(extension_responses),
        )


# Singleton instance
deadline_extension_service = DeadlineExtensionService()
