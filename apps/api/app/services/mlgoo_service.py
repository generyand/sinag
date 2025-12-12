# 🛠️ MLGOO Service
# Business logic for MLGOO (Municipal Local Government Operations Officer) features
# Handles final approval workflow, RE-calibration, and grace period management
# Updated: Added MOV files to assessment details for recalibration review
# Updated: Triggers BBI calculation when assessment is approved (COMPLETED status)

import logging
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session, joinedload, selectinload

from app.db.enums import AssessmentStatus, ValidationStatus
from app.db.models.assessment import (
    Assessment,
    AssessmentResponse,
    MOVFile,
)
from app.db.models.governance_area import Indicator
from app.db.models.user import User
from app.services.bbi_service import bbi_service


class MLGOOService:
    """Service for MLGOO-specific operations."""

    # Grace period configuration (in days)
    REWORK_GRACE_PERIOD_DAYS = 5  # For Assessor rework
    CALIBRATION_GRACE_PERIOD_DAYS = 3  # For Validator calibration
    MLGOO_RECALIBRATION_GRACE_PERIOD_DAYS = 3  # For MLGOO RE-calibration

    def __init__(self):
        """Initialize the MLGOO service."""
        self.logger = logging.getLogger(__name__)

    def _parse_indicator_code(self, code: str) -> tuple:
        """
        Parse indicator code for natural sorting.

        Converts "1.2.3" to (1, 2, 3) and "1.6.1.1" to (1, 6, 1, 1)
        for proper numeric sorting instead of lexicographic sorting.
        """
        if not code:
            return (999,)  # Put empty codes at the end
        try:
            parts = code.split(".")
            return tuple(int(p) for p in parts)
        except (ValueError, AttributeError):
            return (999,)  # Put invalid codes at the end

    def get_approval_queue(
        self,
        db: Session,
        mlgoo_user: User,
        include_completed: bool = False,
    ) -> list[dict]:
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
                selectinload(Assessment.responses)
                .joinedload(AssessmentResponse.indicator)
                .joinedload(Indicator.governance_area),
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
                    status_val = (
                        response.validation_status.value
                        if hasattr(response.validation_status, "value")
                        else response.validation_status
                    )
                    # ValidationStatus enum uses uppercase: PASS, FAIL, CONDITIONAL
                    status_upper = status_val.upper() if isinstance(status_val, str) else status_val
                    if status_upper == "PASS":
                        pass_count += 1
                    elif status_upper == "FAIL":
                        fail_count += 1
                    elif status_upper == "CONDITIONAL":
                        conditional_count += 1

            # Calculate overall score and governance area stats
            total_responses = len(assessment.responses)
            overall_score = (
                round(((pass_count + conditional_count) / total_responses * 100), 2)
                if total_responses > 0
                else None
            )

            # Group by governance area to determine passed areas
            areas_data = {}
            for response in assessment.responses:
                if not response.indicator or not response.indicator.governance_area:
                    continue

                area_id = response.indicator.governance_area_id
                if area_id not in areas_data:
                    areas_data[area_id] = {"pass": 0, "total": 0}

                areas_data[area_id]["total"] += 1

                # Check status
                if response.validation_status:
                    status_val = (
                        response.validation_status.value
                        if hasattr(response.validation_status, "value")
                        else response.validation_status
                    )
                    status_upper = status_val.upper() if isinstance(status_val, str) else status_val
                    if status_upper in ["PASS", "CONDITIONAL"]:
                        areas_data[area_id]["pass"] += 1

            # Count passed governance areas (using >= 70% threshold as per overall score logic)
            governance_areas_passed = 0
            for area_stats in areas_data.values():
                if area_stats["total"] > 0:
                    area_score = (area_stats["pass"] / area_stats["total"]) * 100
                    if area_score >= 70:
                        governance_areas_passed += 1

            results.append(
                {
                    "id": assessment.id,
                    "barangay_name": barangay_name,
                    "blgu_user_id": assessment.blgu_user_id,
                    "status": assessment.status.value,
                    "submitted_at": assessment.submitted_at.isoformat()
                    if assessment.submitted_at
                    else None,
                    "validated_at": assessment.validated_at.isoformat()
                    if assessment.validated_at
                    else None,
                    "compliance_status": assessment.final_compliance_status.value
                    if assessment.final_compliance_status
                    else None,
                    "overall_score": overall_score,
                    "pass_count": pass_count,
                    "fail_count": fail_count,
                    "conditional_count": conditional_count,
                    "total_responses": total_responses,
                    "can_recalibrate": assessment.can_request_mlgoo_recalibration,
                    "mlgoo_recalibration_count": assessment.mlgoo_recalibration_count,
                    "is_mlgoo_recalibration": assessment.is_mlgoo_recalibration,
                    "governance_areas_passed": governance_areas_passed,
                    "total_governance_areas": len(areas_data),
                }
            )

        return results

    def approve_assessment(
        self,
        db: Session,
        assessment_id: int,
        mlgoo_user: User,
        comments: str | None = None,
    ) -> dict[str, Any]:
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

        # Calculate BBI compliance when assessment reaches COMPLETED status
        # This calculates the BBI functionality for all 7 BBIs based on validator decisions
        try:
            bbi_results = bbi_service.calculate_all_bbi_compliance(db, assessment)
            self.logger.info(
                f"Calculated BBI compliance for assessment {assessment_id}: "
                f"{len(bbi_results)} BBIs processed"
            )
        except Exception as e:
            self.logger.error(
                f"Failed to calculate BBI compliance for assessment {assessment_id}: {e}"
            )
            # Don't fail the approval if BBI calculation fails

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

        # Trigger CapDev (Capacity Development) AI insights generation
        capdev_result = {"success": False, "message": "Not triggered"}
        try:
            from app.workers.intelligence_worker import generate_capdev_insights_task

            # Set initial status to 'pending' before queueing task
            assessment.capdev_insights_status = "pending"
            db.commit()

            capdev_task = generate_capdev_insights_task.delay(assessment_id)
            capdev_result = {
                "success": True,
                "message": "CapDev insights generation queued",
                "task_id": capdev_task.id,
            }
            self.logger.info(
                f"Queued CapDev insights generation for assessment {assessment_id} "
                f"(task_id: {capdev_task.id})"
            )
        except Exception as e:
            self.logger.error(f"Failed to queue CapDev insights generation: {e}")
            capdev_result = {"success": False, "error": str(e)}

        return {
            "success": True,
            "message": f"Assessment for {barangay_name} has been approved and is now COMPLETED",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "status": assessment.status.value,
            "approved_by": mlgoo_user.name,
            "approved_at": assessment.mlgoo_approved_at.isoformat(),
            "notification_result": notification_result,
            "capdev_insights_result": capdev_result,
        }

    def request_recalibration(
        self,
        db: Session,
        assessment_id: int,
        mlgoo_user: User,
        indicator_ids: list[int],
        comments: str,
    ) -> dict[str, Any]:
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

        # Reset is_completed flag for targeted indicators to require fresh upload
        # This ensures BLGU must re-upload or make changes to these specific indicators
        for response in assessment.responses:
            if response.indicator_id in indicator_ids:
                response.is_completed = False
                self.logger.info(
                    f"Reset is_completed for indicator {response.indicator_id} "
                    f"(response {response.id}) due to MLGOO RE-calibration"
                )

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

    def request_recalibration_by_mov(
        self,
        db: Session,
        assessment_id: int,
        mlgoo_user: User,
        mov_files: list[dict],
        overall_comments: str,
    ) -> dict[str, Any]:
        """
        Request RE-calibration for specific MOV files.

        MLGOO can flag specific MOV files that need to be re-uploaded by BLGU.
        This is more granular than indicator-level recalibration - only the
        flagged files need to be resubmitted.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            mlgoo_user: The MLGOO user requesting RE-calibration
            mov_files: List of MOV file items with mov_file_id and optional comment
            overall_comments: MLGOO's overall comments explaining why RE-calibration is needed

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
                selectinload(Assessment.mov_files).joinedload(MOVFile.indicator),
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

        # Validate MOV file IDs
        assessment_mov_ids = {m.id for m in assessment.mov_files if m.deleted_at is None}
        requested_mov_ids = {item["mov_file_id"] for item in mov_files}
        invalid_ids = requested_mov_ids - assessment_mov_ids
        if invalid_ids:
            raise ValueError(f"Invalid MOV file IDs for this assessment: {invalid_ids}")

        if not mov_files:
            raise ValueError("At least one MOV file must be specified for RE-calibration")

        if not overall_comments or not overall_comments.strip():
            raise ValueError("Overall comments are required for RE-calibration")

        # Get unique indicator IDs from the flagged MOV files
        mov_to_indicator = {m.id: m.indicator_id for m in assessment.mov_files}
        indicator_ids = list(set(mov_to_indicator[mid] for mid in requested_mov_ids))

        # Set RE-calibration fields
        assessment.is_mlgoo_recalibration = True
        assessment.mlgoo_recalibration_requested_by = mlgoo_user.id
        assessment.mlgoo_recalibration_requested_at = datetime.utcnow()
        assessment.mlgoo_recalibration_count += 1
        assessment.mlgoo_recalibration_indicator_ids = (
            indicator_ids  # Also set indicators for backward compatibility
        )
        assessment.mlgoo_recalibration_mov_file_ids = [
            {"mov_file_id": item["mov_file_id"], "comment": item.get("comment")}
            for item in mov_files
        ]
        assessment.mlgoo_recalibration_comments = overall_comments.strip()

        # Set grace period
        assessment.grace_period_expires_at = datetime.utcnow() + timedelta(
            days=self.MLGOO_RECALIBRATION_GRACE_PERIOD_DAYS
        )

        # Move back to REWORK status for BLGU to make corrections
        assessment.status = AssessmentStatus.REWORK

        # Reset is_completed flag for indicators with flagged MOV files
        for response in assessment.responses:
            if response.indicator_id in indicator_ids:
                response.is_completed = False
                self.logger.info(
                    f"Reset is_completed for indicator {response.indicator_id} "
                    f"(response {response.id}) due to MLGOO MOV file RE-calibration"
                )

        db.commit()
        db.refresh(assessment)

        # Get barangay name for logging
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Build flagged MOV file details for response
        mov_file_lookup = {m.id: m for m in assessment.mov_files}
        flagged_mov_files = []
        for item in mov_files:
            mov_file = mov_file_lookup.get(item["mov_file_id"])
            if mov_file:
                flagged_mov_files.append(
                    {
                        "mov_file_id": mov_file.id,
                        "file_name": mov_file.file_name,
                        "indicator_id": mov_file.indicator_id,
                        "indicator_code": mov_file.indicator.indicator_code
                        if mov_file.indicator
                        else None,
                        "indicator_name": mov_file.indicator.name
                        if mov_file.indicator
                        else "Unknown",
                        "comment": item.get("comment"),
                    }
                )

        self.logger.info(
            f"MLGOO {mlgoo_user.name} requested MOV file RE-calibration for assessment {assessment_id} "
            f"({barangay_name}). MOV files: {requested_mov_ids}"
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
            "message": f"RE-calibration requested for {len(mov_files)} MOV file(s)",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "status": assessment.status.value,
            "flagged_mov_files": flagged_mov_files,
            "overall_comments": overall_comments,
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
    ) -> dict[str, Any]:
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

        # Get all MOV files for this assessment (grouped by indicator_id)
        # For recalibration targets, show ALL files but mark them as new/rejected
        recalibration_requested_at = assessment.mlgoo_recalibration_requested_at
        recalibration_indicator_ids = set(assessment.mlgoo_recalibration_indicator_ids or [])

        # Also get calibration_requested_at for validator calibration context
        calibration_requested_at = assessment.calibration_requested_at
        rework_requested_at = assessment.rework_requested_at

        mov_files_query = (
            db.query(MOVFile)
            .filter(
                MOVFile.assessment_id == assessment_id,
                MOVFile.deleted_at.is_(None),  # Only non-deleted files
            )
            .all()
        )

        # Group MOV files by indicator_id
        # For recalibration targets, show ALL files with is_new and is_rejected flags
        mov_files_by_indicator: dict[int, list[dict[str, Any]]] = {}
        for mov_file in mov_files_query:
            # Determine the effective timestamp for this indicator
            is_recalibration_target = mov_file.indicator_id in recalibration_indicator_ids
            effective_timestamp = None

            if is_recalibration_target and recalibration_requested_at:
                # For MLGOO recalibration targets, use recalibration timestamp
                effective_timestamp = recalibration_requested_at
            elif calibration_requested_at:
                # For validator calibration context
                effective_timestamp = calibration_requested_at
            elif rework_requested_at:
                # For assessor rework context
                effective_timestamp = rework_requested_at

            # Determine if file is new (uploaded after effective timestamp)
            is_new = False
            is_rejected = False
            if effective_timestamp and mov_file.uploaded_at:
                is_new = mov_file.uploaded_at >= effective_timestamp
                # File is rejected if it was uploaded before timestamp AND has annotations
                if mov_file.uploaded_at < effective_timestamp:
                    has_annotations = (
                        len(mov_file.annotations) > 0 if mov_file.annotations else False
                    )
                    # Check if there are newer files (replacements) for this indicator
                    has_replacements = any(
                        f.indicator_id == mov_file.indicator_id
                        and f.uploaded_at
                        and f.uploaded_at >= effective_timestamp
                        for f in mov_files_query
                    )
                    is_rejected = has_annotations and has_replacements

            if mov_file.indicator_id not in mov_files_by_indicator:
                mov_files_by_indicator[mov_file.indicator_id] = []
            mov_files_by_indicator[mov_file.indicator_id].append(
                {
                    "id": mov_file.id,
                    "file_name": mov_file.file_name,
                    "file_url": mov_file.file_url,
                    "file_type": mov_file.file_type,
                    "file_size": mov_file.file_size,
                    "field_id": mov_file.field_id,
                    "uploaded_at": mov_file.uploaded_at.isoformat()
                    if mov_file.uploaded_at
                    else None,
                    "is_new": is_new,
                    "is_rejected": is_rejected,
                    "has_annotations": len(mov_file.annotations) > 0
                    if mov_file.annotations
                    else False,
                }
            )

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
                status_val = (
                    response.validation_status.value
                    if hasattr(response.validation_status, "value")
                    else response.validation_status
                )
                # ValidationStatus enum uses uppercase: PASS, FAIL, CONDITIONAL
                status_upper = status_val.upper() if isinstance(status_val, str) else status_val
                if status_upper == "PASS":
                    areas_data[area_id]["pass_count"] += 1
                elif status_upper == "FAIL":
                    areas_data[area_id]["fail_count"] += 1
                elif status_upper == "CONDITIONAL":
                    areas_data[area_id]["conditional_count"] += 1

            areas_data[area_id]["indicators"].append(
                {
                    "response_id": response.id,
                    "indicator_id": response.indicator_id,
                    "indicator_name": response.indicator.name,
                    "indicator_code": response.indicator.indicator_code,
                    "validation_status": response.validation_status.value
                    if response.validation_status
                    else None,
                    "assessor_remarks": response.assessor_remarks,
                    "is_recalibration_target": bool(
                        assessment.mlgoo_recalibration_indicator_ids
                        and response.indicator_id in assessment.mlgoo_recalibration_indicator_ids
                    ),
                    "mov_files": mov_files_by_indicator.get(response.indicator_id, []),
                }
            )

        # Sort indicators in each governance area by indicator_code
        for area_id in areas_data:
            areas_data[area_id]["indicators"].sort(
                key=lambda x: self._parse_indicator_code(x.get("indicator_code", ""))
            )

        # Calculate overall score from governance area data
        total_pass = sum(area["pass_count"] for area in areas_data.values())
        total_conditional = sum(area["conditional_count"] for area in areas_data.values())
        total_indicators = sum(
            area["pass_count"] + area["fail_count"] + area["conditional_count"]
            for area in areas_data.values()
        )
        overall_score = (
            round(((total_pass + total_conditional) / total_indicators * 100), 2)
            if total_indicators > 0
            else None
        )

        return {
            "id": assessment.id,
            "barangay_name": barangay_name,
            "cycle_year": None,  # Assessment doesn't have cycle_year field yet
            "blgu_user_id": assessment.blgu_user_id,
            "blgu_user_name": assessment.blgu_user.name if assessment.blgu_user else None,
            "status": assessment.status.value,
            "submitted_at": assessment.submitted_at.isoformat()
            if assessment.submitted_at
            else None,
            "validated_at": assessment.validated_at.isoformat()
            if assessment.validated_at
            else None,
            "compliance_status": assessment.final_compliance_status.value
            if assessment.final_compliance_status
            else None,
            "overall_score": overall_score,
            "area_results": assessment.area_results,
            "governance_areas": list(areas_data.values()),
            "can_approve": assessment.status == AssessmentStatus.AWAITING_MLGOO_APPROVAL,
            "can_recalibrate": assessment.can_request_mlgoo_recalibration,
            # Rework tracking (Assessor stage)
            "rework_requested_at": assessment.rework_requested_at.isoformat()
            if assessment.rework_requested_at
            else None,
            "rework_submitted_at": assessment.rework_submitted_at.isoformat()
            if assessment.rework_submitted_at
            else None,
            "rework_count": assessment.rework_count,
            # Calibration tracking (Validator stage)
            "calibration_requested_at": assessment.calibration_requested_at.isoformat()
            if assessment.calibration_requested_at
            else None,
            "calibration_submitted_at": assessment.calibration_submitted_at.isoformat()
            if assessment.calibration_submitted_at
            else None,
            # MLGOO RE-calibration tracking
            "mlgoo_recalibration_count": assessment.mlgoo_recalibration_count,
            "is_mlgoo_recalibration": assessment.is_mlgoo_recalibration,
            "mlgoo_recalibration_requested_at": assessment.mlgoo_recalibration_requested_at.isoformat()
            if assessment.mlgoo_recalibration_requested_at
            else None,
            "mlgoo_recalibration_submitted_at": assessment.mlgoo_recalibration_submitted_at.isoformat()
            if assessment.mlgoo_recalibration_submitted_at
            else None,
            "mlgoo_recalibration_indicator_ids": assessment.mlgoo_recalibration_indicator_ids,
            "mlgoo_recalibration_mov_file_ids": assessment.mlgoo_recalibration_mov_file_ids,
            "mlgoo_recalibration_comments": assessment.mlgoo_recalibration_comments,
            # MLGOO approval
            "mlgoo_approved_at": assessment.mlgoo_approved_at.isoformat()
            if assessment.mlgoo_approved_at
            else None,
            "grace_period_expires_at": (
                assessment.grace_period_expires_at.isoformat()
                if assessment.grace_period_expires_at
                else None
            ),
            "is_locked_for_deadline": assessment.is_locked_for_deadline,
        }

    def unlock_assessment(
        self,
        db: Session,
        assessment_id: int,
        mlgoo_user: User,
        extend_grace_period_days: int = 3,
    ) -> dict[str, Any]:
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

    def update_recalibration_validation(
        self,
        db: Session,
        assessment_id: int,
        mlgoo_user: User,
        indicator_updates: list[dict[str, Any]],
        comments: str | None = None,
    ) -> dict[str, Any]:
        """
        Update validation status of recalibration target indicators.

        After BLGU resubmits their recalibrated MOVs, MLGOO can review and
        update the validation status of the targeted indicators before approving.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            mlgoo_user: The MLGOO user making the updates
            indicator_updates: List of dicts with indicator_id, validation_status, and optional remarks
            comments: Optional overall comments from MLGOO

        Returns:
            dict: Result of the update operation

        Raises:
            ValueError: If assessment not found or validation update not allowed
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

        # Only allow updates when assessment is AWAITING_MLGOO_APPROVAL
        if assessment.status != AssessmentStatus.AWAITING_MLGOO_APPROVAL:
            raise ValueError(
                f"Cannot update validation status. Assessment must be awaiting MLGOO approval. "
                f"Current status: {assessment.status.value}"
            )

        # Build a map of indicator_id -> response for quick lookup
        response_map = {r.indicator_id: r for r in assessment.responses}

        # Get recalibration target indicator IDs (if any)
        recalibration_targets = set(assessment.mlgoo_recalibration_indicator_ids or [])

        updated_indicators = []
        for update in indicator_updates:
            indicator_id = update["indicator_id"]
            new_status_str = update["validation_status"]
            remarks = update.get("remarks")

            # Check if the indicator is part of this assessment
            if indicator_id not in response_map:
                raise ValueError(f"Indicator {indicator_id} is not part of this assessment")

            # Only allow updates to recalibration targets (if recalibration was requested)
            if recalibration_targets and indicator_id not in recalibration_targets:
                raise ValueError(
                    f"Indicator {indicator_id} is not a recalibration target. "
                    f"Only recalibration target indicators can be updated."
                )

            response = response_map[indicator_id]

            # Convert string status to enum (handle both Title Case and uppercase)
            try:
                # Try uppercase first (enum values are PASS, FAIL, CONDITIONAL)
                new_status = ValidationStatus(new_status_str.upper())
            except ValueError:
                raise ValueError(
                    f"Invalid validation status: {new_status_str}. Must be Pass, Fail, or Conditional"
                )

            # Store previous status for logging
            previous_status = (
                response.validation_status.value if response.validation_status else None
            )

            # Update the validation status
            response.validation_status = new_status
            if remarks:
                # Append MLGOO remarks to existing assessor remarks
                mlgoo_remark = f"[MLGOO Review] {remarks}"
                if response.assessor_remarks:
                    response.assessor_remarks = f"{response.assessor_remarks}\n{mlgoo_remark}"
                else:
                    response.assessor_remarks = mlgoo_remark

            updated_indicators.append(
                {
                    "indicator_id": indicator_id,
                    "indicator_name": response.indicator.name if response.indicator else "Unknown",
                    "previous_status": previous_status,
                    "new_status": new_status.value,
                    "remarks": remarks,
                }
            )

            self.logger.info(
                f"MLGOO {mlgoo_user.name} updated indicator {indicator_id} "
                f"from {previous_status} to {new_status.value} for assessment {assessment_id}"
            )

        # Ensure all modified responses are added to session explicitly
        for update in indicator_updates:
            indicator_id = update["indicator_id"]
            if indicator_id in response_map:
                db.add(response_map[indicator_id])

        # Commit and flush to ensure changes are persisted
        db.flush()
        db.commit()

        # Log post-commit verification
        self.logger.info(f"Committed validation updates for assessment {assessment_id}")

        # Get barangay name for response
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        return {
            "success": True,
            "message": f"Updated validation status for {len(updated_indicators)} indicator(s)",
            "assessment_id": assessment_id,
            "barangay_name": barangay_name,
            "updated_indicators": updated_indicators,
            "updated_by": mlgoo_user.name,
            "updated_at": datetime.utcnow().isoformat(),
        }

    def override_validation_status(
        self,
        db: Session,
        response_id: int,
        mlgoo_user: User,
        validation_status: str,
        remarks: str | None = None,
    ) -> dict[str, Any]:
        """
        Override the validation status of any assessment response.

        MLGOO has the authority to override any indicator's validation status
        when reviewing assessments awaiting their approval.

        Args:
            db: Database session
            response_id: ID of the assessment response to update
            mlgoo_user: The MLGOO user making the override
            validation_status: New validation status (PASS, FAIL, CONDITIONAL)
            remarks: Optional remarks explaining the override

        Returns:
            dict: Result of the override operation

        Raises:
            ValueError: If response not found or override not allowed
        """
        # Get the assessment response with its indicator
        response = (
            db.query(AssessmentResponse)
            .options(
                joinedload(AssessmentResponse.indicator),
                joinedload(AssessmentResponse.assessment)
                .joinedload(Assessment.blgu_user)
                .joinedload(User.barangay),
            )
            .filter(AssessmentResponse.id == response_id)
            .first()
        )

        if not response:
            raise ValueError(f"Assessment response {response_id} not found")

        assessment = response.assessment
        if not assessment:
            raise ValueError("Assessment not found for this response")

        # Only allow overrides when assessment is AWAITING_MLGOO_APPROVAL
        if assessment.status != AssessmentStatus.AWAITING_MLGOO_APPROVAL:
            raise ValueError(
                f"Cannot override validation status. Assessment must be awaiting MLGOO approval. "
                f"Current status: {assessment.status.value}"
            )

        # Convert string status to enum
        try:
            new_status = ValidationStatus(validation_status.upper())
        except ValueError:
            raise ValueError(
                f"Invalid validation status: {validation_status}. Must be PASS, FAIL, or CONDITIONAL"
            )

        # Store previous status for logging
        previous_status = response.validation_status.value if response.validation_status else None

        # Update the validation status
        response.validation_status = new_status

        # Add MLGOO remarks
        if remarks:
            mlgoo_remark = f"[MLGOO Override] {remarks}"
            if response.assessor_remarks:
                response.assessor_remarks = f"{response.assessor_remarks}\n{mlgoo_remark}"
            else:
                response.assessor_remarks = mlgoo_remark

        db.commit()
        db.refresh(response)

        # Get indicator details
        indicator = response.indicator
        indicator_name = indicator.name if indicator else "Unknown"
        indicator_code = indicator.indicator_code if indicator else None

        self.logger.info(
            f"MLGOO {mlgoo_user.name} overrode validation status for response {response_id} "
            f"(indicator {indicator_code}) from {previous_status} to {new_status.value}"
        )

        return {
            "success": True,
            "message": f"Validation status updated to {new_status.value}",
            "response_id": response_id,
            "indicator_id": response.indicator_id,
            "indicator_name": indicator_name,
            "indicator_code": indicator_code,
            "previous_status": previous_status,
            "new_status": new_status.value,
            "remarks": remarks,
            "updated_by": mlgoo_user.name,
            "updated_at": datetime.utcnow().isoformat(),
        }


# Singleton instance
mlgoo_service = MLGOOService()
