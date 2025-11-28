# 🛠️ MLGOO Service
# Business logic for MLGOO (Municipal Local Government Operations Officer) features
# Handles final approval workflow, RE-calibration, and grace period management

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import logging

from sqlalchemy.orm import Session, joinedload, selectinload

from app.db.enums import AssessmentStatus, NotificationType
from app.db.models.assessment import (
    Assessment,
    AssessmentResponse,
)
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User


class MLGOOService:
    """Service for MLGOO-specific operations."""

    # Grace period configuration (in days)
    REWORK_GRACE_PERIOD_DAYS = 5  # For Assessor rework
    CALIBRATION_GRACE_PERIOD_DAYS = 3  # For Validator calibration
    MLGOO_RECALIBRATION_GRACE_PERIOD_DAYS = 3  # For MLGOO RE-calibration

    def __init__(self):
        """Initialize the MLGOO service."""
        self.logger = logging.getLogger(__name__)

    def get_approval_queue(
        self,
        db: Session,
        mlgoo_user: User,
        include_completed: bool = False,
    ) -> List[dict]:
        """
        Get assessments awaiting MLGOO final approval.

        Args:
            db: Database session
            mlgoo_user: The MLGOO user making the request
            include_completed: Whether to include recently completed assessments

        Returns:
            List of assessments with relevant details
        """
        statuses = [AssessmentStatus.AWAITING_MLGOO_APPROVAL]
        if include_completed:
            statuses.append(AssessmentStatus.COMPLETED)

        assessments = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                selectinload(Assessment.responses).joinedload(AssessmentResponse.indicator),
            )
            .filter(Assessment.status.in_(statuses))
            .order_by(Assessment.updated_at.desc())
            .all()
        )

        results = []
        for assessment in assessments:
            barangay_name = "Unknown Barangay"
            if assessment.blgu_user and assessment.blgu_user.barangay:
                barangay_name = assessment.blgu_user.barangay.name

            # Count Pass/Fail/Conditional responses
            pass_count = 0
            fail_count = 0
            conditional_count = 0
            for response in assessment.responses:
                if response.validation_status:
                    status_val = response.validation_status.value if hasattr(response.validation_status, 'value') else response.validation_status
                    if status_val == "Pass":
                        pass_count += 1
                    elif status_val == "Fail":
                        fail_count += 1
                    elif status_val == "Conditional":
                        conditional_count += 1

            # Calculate overall score from pass/total ratio
            total_responses = len(assessment.responses)
            overall_score = round((pass_count / total_responses * 100), 2) if total_responses > 0 else None

            results.append({
                "id": assessment.id,
                "barangay_name": barangay_name,
                "blgu_user_id": assessment.blgu_user_id,
                "status": assessment.status.value,
                "submitted_at": assessment.submitted_at.isoformat() if assessment.submitted_at else None,
                "validated_at": assessment.validated_at.isoformat() if assessment.validated_at else None,
                "compliance_status": assessment.final_compliance_status.value if assessment.final_compliance_status else None,
                "overall_score": overall_score,
                "pass_count": pass_count,
                "fail_count": fail_count,
                "conditional_count": conditional_count,
                "total_responses": total_responses,
                "can_recalibrate": assessment.can_request_mlgoo_recalibration,
                "mlgoo_recalibration_count": assessment.mlgoo_recalibration_count,
                "is_mlgoo_recalibration": assessment.is_mlgoo_recalibration,
            })

        return results

    def approve_assessment(
        self,
        db: Session,
        assessment_id: int,
        mlgoo_user: User,
        comments: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Approve an assessment and move it to COMPLETED status.

        This is the final step in the assessment workflow. Only MLGOO can approve.

        Args:
            db: Database session
            assessment_id: ID of the assessment to approve
            mlgoo_user: The MLGOO user approving the assessment
            comments: Optional approval comments

        Returns:
            dict: Result of the approval operation

        Raises:
            ValueError: If assessment not found or cannot be approved
        """
        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Only AWAITING_MLGOO_APPROVAL assessments can be approved
        if assessment.status != AssessmentStatus.AWAITING_MLGOO_APPROVAL:
            raise ValueError(
                f"Assessment is not awaiting MLGOO approval. Current status: {assessment.status.value}"
            )

        # Record approval details
        assessment.mlgoo_approved_by = mlgoo_user.id
        assessment.mlgoo_approved_at = datetime.utcnow()
        assessment.status = AssessmentStatus.COMPLETED

        # Clear any RE-calibration flags if set
        assessment.is_mlgoo_recalibration = False

        db.commit()
        db.refresh(assessment)

        # Get barangay name for logging
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        self.logger.info(
            f"MLGOO {mlgoo_user.name} approved assessment {assessment_id} for {barangay_name}"
        )

        # Trigger notification to BLGU
        try:
            from app.workers.notifications import send_assessment_approved_notification

            task = send_assessment_approved_notification.delay(assessment_id)
            notification_result = {
                "success": True,
                "message": "Approval notification queued",
                "task_id": task.id,
            }
        except Exception as e:
            self.logger.error(f"Failed to queue approval notification: {e}")
            notification_result = {"success": False, "error": str(e)}

        return {
            "success": True,
            "message": f"Assessment for {barangay_name} has been approved and is now COMPLETED",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "status": assessment.status.value,
            "approved_by": mlgoo_user.name,
            "approved_at": assessment.mlgoo_approved_at.isoformat(),
            "notification_result": notification_result,
        }

    def request_recalibration(
        self,
        db: Session,
        assessment_id: int,
        mlgoo_user: User,
        indicator_ids: List[int],
        comments: str,
    ) -> Dict[str, Any]:
        """
        Request RE-calibration for specific indicators.

        MLGOO can request RE-calibration when they believe the Validator was too strict.
        This sends the assessment back to BLGU for corrections on specific indicators.
        RE-calibration can only be requested once per assessment.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            mlgoo_user: The MLGOO user requesting RE-calibration
            indicator_ids: List of indicator IDs to RE-calibrate
            comments: MLGOO's comments explaining why RE-calibration is needed

        Returns:
            dict: Result of the RE-calibration request

        Raises:
            ValueError: If assessment cannot be RE-calibrated
        """
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

        # Check if RE-calibration is allowed
        if not assessment.can_request_mlgoo_recalibration:
            if assessment.mlgoo_recalibration_count >= 1:
                raise ValueError(
                    "RE-calibration has already been used for this assessment. Only one RE-calibration is allowed."
                )
            raise ValueError(
                f"Assessment cannot be RE-calibrated. Current status: {assessment.status.value}"
            )

        # Validate indicator IDs
        response_indicator_ids = {r.indicator_id for r in assessment.responses}
        invalid_ids = set(indicator_ids) - response_indicator_ids
        if invalid_ids:
            raise ValueError(f"Invalid indicator IDs for this assessment: {invalid_ids}")

        if not indicator_ids:
            raise ValueError("At least one indicator must be specified for RE-calibration")

        if not comments or not comments.strip():
            raise ValueError("Comments are required for RE-calibration")

        # Set RE-calibration fields
        assessment.is_mlgoo_recalibration = True
        assessment.mlgoo_recalibration_requested_by = mlgoo_user.id
        assessment.mlgoo_recalibration_requested_at = datetime.utcnow()
        assessment.mlgoo_recalibration_count += 1
        assessment.mlgoo_recalibration_indicator_ids = indicator_ids
        assessment.mlgoo_recalibration_comments = comments.strip()

        # Set grace period
        assessment.grace_period_expires_at = datetime.utcnow() + timedelta(
            days=self.MLGOO_RECALIBRATION_GRACE_PERIOD_DAYS
        )

        # Move back to REWORK status for BLGU to make corrections
        assessment.status = AssessmentStatus.REWORK

        db.commit()
        db.refresh(assessment)

        # Get barangay name for logging
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Get indicator names for the response
        indicator_names = []
        for response in assessment.responses:
            if response.indicator_id in indicator_ids and response.indicator:
                indicator_names.append(response.indicator.name)

        self.logger.info(
            f"MLGOO {mlgoo_user.name} requested RE-calibration for assessment {assessment_id} "
            f"({barangay_name}). Indicators: {indicator_ids}"
        )

        # Trigger notification to BLGU
        try:
            from app.workers.notifications import send_mlgoo_recalibration_notification

            task = send_mlgoo_recalibration_notification.delay(assessment_id)
            notification_result = {
                "success": True,
                "message": "RE-calibration notification queued",
                "task_id": task.id,
            }
        except Exception as e:
            self.logger.error(f"Failed to queue RE-calibration notification: {e}")
            notification_result = {"success": False, "error": str(e)}

        return {
            "success": True,
            "message": f"RE-calibration requested for {len(indicator_ids)} indicator(s)",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "status": assessment.status.value,
            "indicator_ids": indicator_ids,
            "indicator_names": indicator_names,
            "comments": comments,
            "requested_by": mlgoo_user.name,
            "requested_at": assessment.mlgoo_recalibration_requested_at.isoformat(),
            "grace_period_expires_at": assessment.grace_period_expires_at.isoformat(),
            "recalibration_count": assessment.mlgoo_recalibration_count,
            "notification_result": notification_result,
        }

    def get_assessment_details(
        self,
        db: Session,
        assessment_id: int,
        mlgoo_user: User,
    ) -> Dict[str, Any]:
        """
        Get detailed assessment information for MLGOO review.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            mlgoo_user: The MLGOO user requesting details

        Returns:
            dict: Detailed assessment information

        Raises:
            ValueError: If assessment not found
        """
        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                selectinload(Assessment.responses)
                .joinedload(AssessmentResponse.indicator)
                .joinedload(Indicator.governance_area),
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Group responses by governance area
        areas_data = {}
        for response in assessment.responses:
            if not response.indicator:
                continue

            area = response.indicator.governance_area
            area_id = area.id if area else 0
            area_name = area.name if area else "Unknown Area"

            if area_id not in areas_data:
                areas_data[area_id] = {
                    "id": area_id,
                    "name": area_name,
                    "area_type": area.area_type.value if area and area.area_type else None,
                    "pass_count": 0,
                    "fail_count": 0,
                    "conditional_count": 0,
                    "indicators": [],
                }

            # Count statuses
            if response.validation_status:
                status_val = response.validation_status.value if hasattr(response.validation_status, 'value') else response.validation_status
                if status_val == "Pass":
                    areas_data[area_id]["pass_count"] += 1
                elif status_val == "Fail":
                    areas_data[area_id]["fail_count"] += 1
                elif status_val == "Conditional":
                    areas_data[area_id]["conditional_count"] += 1

            areas_data[area_id]["indicators"].append({
                "response_id": response.id,
                "indicator_id": response.indicator_id,
                "indicator_name": response.indicator.name,
                "indicator_code": response.indicator.indicator_code,
                "validation_status": response.validation_status.value if response.validation_status else None,
                "assessor_remarks": response.assessor_remarks,
                "is_recalibration_target": bool(
                    assessment.mlgoo_recalibration_indicator_ids and
                    response.indicator_id in assessment.mlgoo_recalibration_indicator_ids
                ),
            })

        # Calculate overall score from governance area data
        total_pass = sum(area["pass_count"] for area in areas_data.values())
        total_indicators = sum(
            area["pass_count"] + area["fail_count"] + area["conditional_count"]
            for area in areas_data.values()
        )
        overall_score = round((total_pass / total_indicators * 100), 2) if total_indicators > 0 else None

        return {
            "id": assessment.id,
            "barangay_name": barangay_name,
            "cycle_year": None,  # Assessment doesn't have cycle_year field yet
            "blgu_user_id": assessment.blgu_user_id,
            "blgu_user_name": assessment.blgu_user.name if assessment.blgu_user else None,
            "status": assessment.status.value,
            "submitted_at": assessment.submitted_at.isoformat() if assessment.submitted_at else None,
            "validated_at": assessment.validated_at.isoformat() if assessment.validated_at else None,
            "compliance_status": assessment.final_compliance_status.value if assessment.final_compliance_status else None,
            "overall_score": overall_score,
            "area_results": assessment.area_results,
            "governance_areas": list(areas_data.values()),
            "can_approve": assessment.status == AssessmentStatus.AWAITING_MLGOO_APPROVAL,
            "can_recalibrate": assessment.can_request_mlgoo_recalibration,
            "mlgoo_recalibration_count": assessment.mlgoo_recalibration_count,
            "is_mlgoo_recalibration": assessment.is_mlgoo_recalibration,
            "mlgoo_recalibration_indicator_ids": assessment.mlgoo_recalibration_indicator_ids,
            "mlgoo_recalibration_comments": assessment.mlgoo_recalibration_comments,
            "grace_period_expires_at": (
                assessment.grace_period_expires_at.isoformat()
                if assessment.grace_period_expires_at else None
            ),
            "is_locked_for_deadline": assessment.is_locked_for_deadline,
        }

    def unlock_assessment(
        self,
        db: Session,
        assessment_id: int,
        mlgoo_user: User,
        extend_grace_period_days: int = 3,
    ) -> Dict[str, Any]:
        """
        Unlock an assessment that was locked due to deadline expiry.

        MLGOO can unlock assessments and grant additional grace period.

        Args:
            db: Database session
            assessment_id: ID of the assessment to unlock
            mlgoo_user: The MLGOO user unlocking the assessment
            extend_grace_period_days: Number of days to extend grace period (default 3)

        Returns:
            dict: Result of the unlock operation

        Raises:
            ValueError: If assessment not found or not locked
        """
        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        if not assessment.is_locked_for_deadline:
            raise ValueError("Assessment is not locked")

        # Unlock the assessment
        assessment.is_locked_for_deadline = False
        assessment.locked_at = None

        # Extend grace period
        assessment.grace_period_expires_at = datetime.utcnow() + timedelta(
            days=extend_grace_period_days
        )

        db.commit()
        db.refresh(assessment)

        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        self.logger.info(
            f"MLGOO {mlgoo_user.name} unlocked assessment {assessment_id} for {barangay_name}. "
            f"Grace period extended by {extend_grace_period_days} days."
        )

        return {
            "success": True,
            "message": f"Assessment unlocked and grace period extended by {extend_grace_period_days} days",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "status": assessment.status.value,
            "grace_period_expires_at": assessment.grace_period_expires_at.isoformat(),
            "unlocked_by": mlgoo_user.name,
        }


# Singleton instance
mlgoo_service = MLGOOService()
