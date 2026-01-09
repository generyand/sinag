# 📋 Area Submission Service
# Handles per-area submission for BLGUs in the workflow restructuring

import logging
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.db.enums import AssessmentStatus
from app.db.models.assessment import Assessment
from app.db.models.governance_area import GovernanceArea
from app.db.models.user import User

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

        # Update overall assessment status if first submission
        if assessment.status == AssessmentStatus.DRAFT:
            assessment.status = AssessmentStatus.SUBMITTED
            assessment.submitted_at = now

        db.commit()

        logger.info(
            f"BLGU submitted area {governance_area_id} for assessment {assessment_id} "
            f"(barangay: {user.barangay_id})"
        )

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
        # Get assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
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
        area_data["is_resubmission"] = True
        assessment.area_submission_status[area_key] = area_data
        flag_modified(assessment, "area_submission_status")

        # Check if all rework areas have been resubmitted
        if self._check_all_rework_areas_resubmitted(assessment):
            # Mark rework round as used
            assessment.rework_round_used = True
            assessment.rework_submitted_at = now
            logger.info(
                f"All rework areas resubmitted for assessment {assessment_id}. Rework round marked as used."
            )

        db.commit()

        logger.info(
            f"BLGU resubmitted area {governance_area_id} for assessment {assessment_id} "
            f"(barangay: {user.barangay_id})"
        )

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


# Singleton instance
area_submission_service = AreaSubmissionService()
