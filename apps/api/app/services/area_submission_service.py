# 📋 Area Submission Service
# Handles per-area submission for BLGUs in the workflow restructuring

import logging
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.orm.attributes import flag_modified

from app.db.enums import AssessmentStatus, NotificationType
from app.db.models.assessment import Assessment
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from app.services.notification_service import notification_service

logger = logging.getLogger(__name__)


class AreaSubmissionService:
    """
    Service for handling per-area submission workflow.

    After workflow restructuring, BLGUs can submit individual governance areas
    instead of the entire assessment at once. Each area has its own status:
    - draft: BLGU still working on this area
    - submitted: BLGU submitted, waiting for assessor
    - in_review: Assessor is currently reviewing
    - rework: Assessor requested changes
    - approved: Assessor approved this area

    When all 6 areas are approved, the assessment moves to AWAITING_VALIDATION
    for the Validator to review.
    """

    def submit_area(
        self,
        db: Session,
        assessment_id: int,
        governance_area_id: int,
        user: User,
    ) -> dict:
        """
        BLGU submits a specific governance area for assessor review.

        Args:
            db: Database session
            assessment_id: Assessment ID
            governance_area_id: Governance area ID (1-6)
            user: BLGU user

        Returns:
            Response dict with success status and area info

        Raises:
            HTTPException: If assessment not found, user not authorized,
                           or area already submitted
        """
        # Get assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment not found",
            )

        # Validate user owns this assessment (same barangay)
        if assessment.blgu_user.barangay_id != user.barangay_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this assessment",
            )

        # Validate governance area exists
        governance_area = (
            db.query(GovernanceArea).filter(GovernanceArea.id == governance_area_id).first()
        )
        if not governance_area:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Governance area {governance_area_id} not found",
            )

        # Initialize area_submission_status if None
        if assessment.area_submission_status is None:
            assessment.area_submission_status = {}
        if assessment.area_assessor_approved is None:
            assessment.area_assessor_approved = {}

        area_key = str(governance_area_id)

        # Check if area is already submitted or approved
        current_status = assessment.area_submission_status.get(area_key, {}).get("status", "draft")
        if current_status in ("submitted", "in_review", "approved"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Area is already {current_status}. Cannot resubmit.",
            )

        # Update area status to submitted
        now = datetime.utcnow()
        assessment.area_submission_status[area_key] = {
            "status": "submitted",
            "submitted_at": now.isoformat(),
        }
        assessment.area_assessor_approved[area_key] = False
        flag_modified(assessment, "area_submission_status")
        flag_modified(assessment, "area_assessor_approved")

        # CRITICAL FIX: Set submitted_at when FIRST area is submitted
        # This allows the assessment to appear in assessor queues (which filter by submitted_at IS NOT NULL)
        # The per-area filtering in assessor_service.py will ensure only the correct assessor sees it
        if assessment.submitted_at is None:
            assessment.submitted_at = now
            logger.info(
                f"First area ({governance_area_id}) submitted for assessment {assessment_id}. "
                f"Setting submitted_at timestamp."
            )

        # Check if ALL 6 governance areas are now submitted
        # Only change overall assessment status to SUBMITTED when all areas are submitted
        all_areas_submitted = self._check_all_areas_submitted(assessment)

        if all_areas_submitted:
            # All 6 areas are submitted - update overall assessment status
            # Only change status if it's currently DRAFT (first time all areas submitted)
            if assessment.status == AssessmentStatus.DRAFT:
                assessment.status = AssessmentStatus.SUBMITTED
                logger.info(
                    f"All 6 governance areas submitted for assessment {assessment_id}. "
                    f"Overall status changed to SUBMITTED."
                )
            else:
                # Status is already SUBMITTED or something else (legacy data or already processed)
                # Don't change it, but log for debugging
                logger.info(
                    f"All 6 governance areas submitted for assessment {assessment_id}, "
                    f"but status is already {assessment.status.value}. No change needed."
                )
        else:
            # Not all areas submitted yet - keep status as DRAFT
            # This ensures the "Assessment Submitted" banner only shows when ALL areas are submitted
            if assessment.status == AssessmentStatus.SUBMITTED:
                # Edge case: Status was already SUBMITTED (legacy data), but not all areas are submitted yet
                # Revert to DRAFT to match the actual state
                assessment.status = AssessmentStatus.DRAFT
                logger.warning(
                    f"Assessment {assessment_id} had SUBMITTED status but not all areas are submitted. "
                    f"Reverting to DRAFT status."
                )
            logger.info(
                f"Area {governance_area_id} submitted for assessment {assessment_id}. "
                f"Overall status remains DRAFT (not all areas submitted yet)."
            )

        db.commit()

        logger.info(
            f"BLGU submitted area {governance_area_id} for assessment {assessment_id} "
            f"(barangay: {user.barangay_id})"
        )

        # Send per-area notification to assessor(s) assigned to this governance area
        # This is more targeted than the legacy "notify all assessors" approach
        try:
            barangay_name = "Unknown Barangay"
            if user.barangay:
                barangay_name = user.barangay.name

            notifications = notification_service.notify_assessors_for_governance_area(
                db=db,
                notification_type=NotificationType.NEW_SUBMISSION,
                title=f"New Submission: {barangay_name}",
                message=f"A new submission for '{governance_area.name}' is ready for your review.",
                governance_area_id=governance_area_id,
                assessment_id=assessment_id,
            )
            db.commit()

            logger.info(
                f"Sent per-area NEW_SUBMISSION notification to {len(notifications)} assessor(s) "
                f"for governance area {governance_area_id} ({governance_area.name})"
            )
        except Exception as e:
            logger.error(f"Failed to send per-area notification: {e}")
            # Don't fail the submission if notification fails

        return {
            "success": True,
            "message": f"Area '{governance_area.name}' submitted for review",
            "assessment_id": assessment_id,
            "governance_area_id": governance_area_id,
            "new_status": "submitted",
        }

    def resubmit_area(
        self,
        db: Session,
        assessment_id: int,
        governance_area_id: int,
        user: User,
    ) -> dict:
        """
        BLGU resubmits an area after rework.

        Args:
            db: Database session
            assessment_id: Assessment ID
            governance_area_id: Governance area ID (1-6)
            user: BLGU user

        Returns:
            Response dict with success status and area info

        Raises:
            HTTPException: If assessment not found, user not authorized,
                           or area not in rework status
        """
        # Get assessment with responses for clearing assessor validation data
        assessment = (
            db.query(Assessment)
            .options(selectinload(Assessment.responses))
            .filter(Assessment.id == assessment_id)
            .first()
        )
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment not found",
            )

        # Validate user owns this assessment
        if assessment.blgu_user.barangay_id != user.barangay_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this assessment",
            )

        # Validate governance area exists
        governance_area = (
            db.query(GovernanceArea).filter(GovernanceArea.id == governance_area_id).first()
        )
        if not governance_area:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Governance area {governance_area_id} not found",
            )

        area_key = str(governance_area_id)

        # Check if area is in rework status
        current_status = assessment.get_area_status(governance_area_id)
        if current_status != "rework":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Area is in '{current_status}' status. Can only resubmit areas in 'rework' status.",
            )

        # Update area status to submitted (resubmission)
        now = datetime.utcnow()
        area_data = assessment.area_submission_status.get(area_key, {})
        area_data["status"] = "submitted"
        area_data["resubmitted_at"] = now.isoformat()
        area_data["submitted_at"] = now.isoformat()
        area_data["is_resubmission"] = True
        area_data["resubmitted_after_rework"] = True
        assessment.area_submission_status[area_key] = area_data
        flag_modified(assessment, "area_submission_status")

        # Set rework_submitted_at for timeline tracking
        assessment.rework_submitted_at = now

        # Clear assessor validation data for rework responses in this area
        # This ensures assessors start with clean checklists when re-reviewing
        indicator_ids_in_area = {
            ind.id
            for ind in db.query(Indicator.id)
            .filter(Indicator.governance_area_id == governance_area_id)
            .all()
        }
        for response in assessment.responses:
            if response.indicator_id in indicator_ids_in_area and response.requires_rework:
                response.assessor_remarks = None
                if response.response_data:
                    response.response_data = {
                        k: v
                        for k, v in response.response_data.items()
                        if not k.startswith("assessor_val_")
                    }

        # Check if all rework areas have been resubmitted
        if self._check_all_rework_areas_resubmitted(assessment):
            # Mark rework round as used
            assessment.rework_round_used = True
            logger.info(
                f"All rework areas resubmitted for assessment {assessment_id}. Rework round marked as used."
            )

        db.commit()

        logger.info(
            f"BLGU resubmitted area {governance_area_id} for assessment {assessment_id} "
            f"(barangay: {user.barangay_id})"
        )

        # Send per-area resubmission notification to assessor(s) assigned to this governance area
        try:
            barangay_name = "Unknown Barangay"
            if user.barangay:
                barangay_name = user.barangay.name

            notifications = notification_service.notify_assessors_for_governance_area(
                db=db,
                notification_type=NotificationType.REWORK_RESUBMITTED,
                title=f"Rework Resubmission: {barangay_name}",
                message=f"'{governance_area.name}' has been resubmitted after rework and is ready for your review.",
                governance_area_id=governance_area_id,
                assessment_id=assessment_id,
            )
            db.commit()

            logger.info(
                f"Sent per-area REWORK_RESUBMITTED notification to {len(notifications)} assessor(s) "
                f"for governance area {governance_area_id} ({governance_area.name})"
            )
        except Exception as e:
            logger.error(f"Failed to send per-area resubmission notification: {e}")
            # Don't fail the resubmission if notification fails

        return {
            "success": True,
            "message": f"Area '{governance_area.name}' resubmitted after rework",
            "assessment_id": assessment_id,
            "governance_area_id": governance_area_id,
            "new_status": "submitted",
        }

    def get_area_status(self, db: Session, assessment_id: int) -> dict:
        """
        Get submission status for all governance areas.

        Args:
            db: Database session
            assessment_id: Assessment ID

        Returns:
            Dict with area submission status, approval status, and summary info

        Raises:
            HTTPException: If assessment not found
        """
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment not found",
            )

        # Initialize if None
        area_submission_status = assessment.area_submission_status or {}
        area_assessor_approved = assessment.area_assessor_approved or {}

        # Get areas in rework and pending review
        areas_in_rework = assessment.get_areas_in_rework()
        areas_pending_review = assessment.get_areas_pending_review()

        return {
            "area_submission_status": area_submission_status,
            "area_assessor_approved": area_assessor_approved,
            "all_areas_approved": assessment.all_areas_approved(),
            "rework_round_used": assessment.rework_round_used,
            "calibration_round_used": assessment.calibration_round_used,
            "areas_in_rework": areas_in_rework,
            "areas_pending_review": areas_pending_review,
        }

    def _check_all_rework_areas_resubmitted(self, assessment: Assessment) -> bool:
        """
        Check if all areas that were in rework have been resubmitted.

        Args:
            assessment: Assessment instance

        Returns:
            True if all previously-rework areas are now submitted, False otherwise
        """
        if not assessment.area_submission_status:
            return False

        # Check each area that has rework data
        for area_id, data in assessment.area_submission_status.items():
            if not isinstance(data, dict):
                continue
            # If area was in rework and is now submitted with is_resubmission=True, it's done
            # If area is still in rework status, return False
            if data.get("status") == "rework":
                return False

        return True

    def _check_all_areas_submitted(self, assessment: Assessment) -> bool:
        """
        Check if all 6 governance areas have been submitted.

        An area is considered "submitted" if its status is:
        - "submitted" (initial submission)
        - "in_review" (assessor started reviewing)
        - "rework" (assessor requested rework, but area was submitted)
        - "approved" (assessor approved, but area was submitted)

        Args:
            assessment: Assessment instance

        Returns:
            True if all 6 areas are submitted (not in "draft" status), False otherwise
        """
        if not assessment.area_submission_status:
            return False

        # Check all 6 governance areas (1-6)
        for area_id in range(1, 7):  # 1 to 6 inclusive
            area_key = str(area_id)
            area_data = assessment.area_submission_status.get(area_key, {})
            area_status = area_data.get("status", "draft")

            # If any area is still in "draft" status, not all areas are submitted
            if area_status == "draft":
                return False

        # All 6 areas have a non-draft status (submitted, in_review, rework, or approved)
        return True


# Singleton instance
area_submission_service = AreaSubmissionService()
