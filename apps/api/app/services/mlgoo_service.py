# 🛠️ MLGOO Service
# Business logic for MLGOO (Municipal Local Government Operations Officer) features
# Handles final approval workflow, RE-calibration, and grace period management
# Updated: Added MOV files to assessment details for recalibration review
# Updated: Triggers BBI calculation when assessment is approved (COMPLETED status)

import logging
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session, joinedload, selectinload

from app.db.enums import AssessmentStatus, UserRole, ValidationStatus
from app.db.models.assessment import (
    Assessment,
    AssessmentResponse,
    FeedbackComment,
    MOVAnnotation,
    MOVFile,
)
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from app.services.assessment_activity_service import assessment_activity_service
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

    def _format_utc_datetime(self, dt: datetime | None) -> str | None:
        """
        Format a datetime as ISO 8601 string with 'Z' suffix indicating UTC.

        JavaScript's Date constructor interprets timestamps without timezone info
        as local time, but with 'Z' suffix as UTC. Since our backend stores all
        times in UTC using datetime.utcnow(), we append 'Z' for correct parsing.

        Args:
            dt: The datetime to format, or None

        Returns:
            ISO 8601 string with 'Z' suffix (e.g., '2025-01-05T02:33:12Z'), or None
        """
        if dt is None:
            return None
        return dt.isoformat() + "Z"

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

    def _build_assessment_progress_overview(
        self, db: Session, assessment: Assessment, areas_data: dict[int, dict[str, Any]]
    ) -> dict[str, Any]:
        """
        Build per-governance-area assessor and validator progress for MLGOO tracking.
        """

        area_submission_status = assessment.area_submission_status or {}
        area_assessor_approved = assessment.area_assessor_approved or {}
        area_ids = sorted(areas_data.keys())

        # Fetch active assessors assigned to the governance areas in this assessment.
        active_assessors = []
        if area_ids:
            active_assessors = (
                db.query(User.id, User.name, User.assessor_area_id)
                .filter(
                    User.role == UserRole.ASSESSOR,
                    User.assessor_area_id.in_(area_ids),
                    User.is_active.is_(True),
                )
                .all()
            )

        assessor_by_area: dict[int, dict[str, Any]] = {}
        assessor_name_by_id: dict[int, str] = {}
        for assessor in active_assessors:
            assessor_name_by_id[assessor.id] = assessor.name
            if assessor.assessor_area_id is not None:
                assessor_by_area[assessor.assessor_area_id] = {
                    "id": assessor.id,
                    "name": assessor.name,
                }

        # Include assessors referenced in area submission status (fallback for old assignments).
        area_status_assessor_ids: set[int] = set()
        for area_data in area_submission_status.values():
            if not isinstance(area_data, dict):
                continue
            assessor_id = area_data.get("assessor_id")
            if isinstance(assessor_id, int):
                area_status_assessor_ids.add(assessor_id)

        missing_assessor_ids = area_status_assessor_ids - set(assessor_name_by_id.keys())
        if missing_assessor_ids:
            missing_assessors = (
                db.query(User.id, User.name).filter(User.id.in_(missing_assessor_ids)).all()
            )
            for assessor in missing_assessors:
                assessor_name_by_id[assessor.id] = assessor.name

        # Validators are system-wide in the current workflow.
        active_validators = (
            db.query(User.id, User.name)
            .filter(User.role == UserRole.VALIDATOR, User.is_active.is_(True))
            .order_by(User.id.asc())
            .all()
        )
        active_validator_ids = [validator.id for validator in active_validators]
        active_validator_names = [validator.name for validator in active_validators]

        def assessor_label(status: str) -> str:
            labels = {
                "pending": "Awaiting Assessor",
                "in_progress": "In Progress",
                "reviewed": "Reviewed",
                "sent_for_rework": "Sent for Rework",
            }
            return labels.get(status, "Awaiting Assessor")

        def validator_label(status: str) -> str:
            labels = {
                "pending": "Awaiting Validation",
                "in_progress": "In Progress",
                "reviewed": "Validated",
            }
            return labels.get(status, "Awaiting Validation")

        governance_areas_progress: list[dict[str, Any]] = []
        assessors_completed_count = 0
        validators_completed_count = 0

        for area_id in area_ids:
            area = areas_data.get(area_id, {})
            indicators = area.get("indicators") or []
            total_indicators = len(indicators)

            validated_indicators = 0
            for indicator in indicators:
                raw_status = indicator.get("validation_status")
                normalized = raw_status.upper() if isinstance(raw_status, str) else None
                if normalized in ("PASS", "FAIL", "CONDITIONAL"):
                    validated_indicators += 1

            if total_indicators == 0 or validated_indicators == 0:
                validator_status = "pending"
                validator_progress_percent = 0
            elif validated_indicators < total_indicators:
                validator_status = "in_progress"
                validator_progress_percent = round((validated_indicators / total_indicators) * 100)
            else:
                validator_status = "reviewed"
                validator_progress_percent = 100
                validators_completed_count += 1

            area_key = str(area_id)
            area_payload = area_submission_status.get(area_key, {})
            raw_area_status = "draft"
            area_assessor_id = None
            if isinstance(area_payload, dict):
                raw_area_status = str(area_payload.get("status", "draft")).lower()
                raw_assessor_id = area_payload.get("assessor_id")
                if isinstance(raw_assessor_id, int):
                    area_assessor_id = raw_assessor_id

            is_approved = (
                bool(area_assessor_approved.get(area_key, False)) or raw_area_status == "approved"
            )
            if is_approved:
                assessor_status = "reviewed"
                assessor_progress_percent = 100
                assessors_completed_count += 1
            elif raw_area_status == "rework":
                assessor_status = "sent_for_rework"
                assessor_progress_percent = 100
                assessors_completed_count += 1
            elif raw_area_status == "in_review":
                assessor_status = "in_progress"
                assessor_progress_percent = 50
            else:
                assessor_status = "pending"
                assessor_progress_percent = 0

            assigned_assessor = assessor_by_area.get(area_id)
            assessor_id = assigned_assessor["id"] if assigned_assessor else area_assessor_id
            assessor_name = assigned_assessor["name"] if assigned_assessor else None
            if assessor_name is None and isinstance(assessor_id, int):
                assessor_name = assessor_name_by_id.get(assessor_id)

            governance_areas_progress.append(
                {
                    "governance_area_id": area_id,
                    "governance_area_name": area.get("name", f"Area {area_id}"),
                    "total_indicators": total_indicators,
                    "assessor": {
                        "assessor_id": assessor_id,
                        "assessor_name": assessor_name,
                        "status": assessor_status,
                        "progress_percent": assessor_progress_percent,
                        "label": assessor_label(assessor_status),
                    },
                    "validator": {
                        "validator_ids": active_validator_ids,
                        "validator_names": active_validator_names,
                        "status": validator_status,
                        "reviewed_indicators": validated_indicators,
                        "total_indicators": total_indicators,
                        "progress_percent": validator_progress_percent,
                        "label": validator_label(validator_status),
                    },
                }
            )

        return {
            "active_assessors_count": len(active_assessors),
            "active_validators_count": len(active_validators),
            "assessors_completed_count": assessors_completed_count,
            "validators_completed_count": validators_completed_count,
            "governance_areas": governance_areas_progress,
        }

    def _build_rework_calibration_summary(
        self, db: Session, assessment: Assessment
    ) -> dict[str, Any] | None:
        """
        Build a comprehensive summary of rework/calibration requests for an assessment.

        Gathers information about:
        - Assessor rework requests (who, when, comments)
        - Validator calibration requests (who, when, comments)
        - MLGOO RE-calibration requests (comments)
        - Indicators flagged for rework/calibration with their feedback
        - MOV annotations from assessors

        Args:
            db: Database session
            assessment: The assessment to build summary for

        Returns:
            dict: Rework/calibration summary, or None if no rework/calibration info
        """
        has_rework = assessment.rework_requested_at is not None
        has_calibration = assessment.calibration_requested_at is not None
        has_mlgoo_recalibration = assessment.is_mlgoo_recalibration

        # If no rework/calibration activity, return None
        if not has_rework and not has_calibration and not has_mlgoo_recalibration:
            return None

        summary: dict[str, Any] = {
            "has_rework": has_rework,
            "has_calibration": has_calibration,
            "has_mlgoo_recalibration": has_mlgoo_recalibration,
            "rework_requested_by_id": None,
            "rework_requested_by_name": None,
            "rework_comments": assessment.rework_comments,
            "calibration_validator_id": None,
            "calibration_validator_name": None,
            "calibration_comments": None,
            "pending_calibrations": [],
            "rework_indicators": [],
        }

        # Batch collect all user IDs and governance area IDs needed
        user_ids: set[int] = set()
        area_ids: set[int] = set()

        if assessment.rework_requested_by:
            user_ids.add(assessment.rework_requested_by)
        if assessment.calibration_validator_id:
            user_ids.add(assessment.calibration_validator_id)

        # Collect IDs from pending calibrations (with defensive type checking)
        for cal in assessment.pending_calibrations or []:
            if not isinstance(cal, dict):
                continue
            validator_id = cal.get("validator_id")
            area_id = cal.get("governance_area_id")
            if validator_id:
                user_ids.add(validator_id)
            if area_id:
                area_ids.add(area_id)

        # Batch fetch all users in a single query
        users_by_id: dict[int, User] = {}
        if user_ids:
            users = db.query(User).filter(User.id.in_(user_ids)).all()
            users_by_id = {u.id: u for u in users}

        # Batch fetch all governance areas in a single query
        areas_by_id: dict[int, GovernanceArea] = {}
        if area_ids:
            areas = db.query(GovernanceArea).filter(GovernanceArea.id.in_(area_ids)).all()
            areas_by_id = {a.id: a for a in areas}

        # Populate rework requester info
        if assessment.rework_requested_by:
            rework_requester = users_by_id.get(assessment.rework_requested_by)
            if rework_requester:
                summary["rework_requested_by_id"] = rework_requester.id
                summary["rework_requested_by_name"] = rework_requester.name

        # Populate calibration validator info
        if assessment.calibration_validator_id:
            calibration_validator = users_by_id.get(assessment.calibration_validator_id)
            if calibration_validator:
                summary["calibration_validator_id"] = calibration_validator.id
                summary["calibration_validator_name"] = calibration_validator.name

        # Build pending calibrations list (parallel calibration support)
        for cal in assessment.pending_calibrations or []:
            if not isinstance(cal, dict):
                continue
            validator_id = cal.get("validator_id")
            area_id = cal.get("governance_area_id")
            if validator_id and area_id:
                validator = users_by_id.get(validator_id)
                area = areas_by_id.get(area_id)
                if validator and area:
                    summary["pending_calibrations"].append(
                        {
                            "validator_id": validator.id,
                            "validator_name": validator.name,
                            "governance_area_id": area.id,
                            "governance_area_name": area.name,
                            "requested_at": self._format_utc_datetime(
                                cal.get("requested_at")
                                if isinstance(cal.get("requested_at"), datetime)
                                else None
                            ),
                            "comments": cal.get("comments"),
                        }
                    )

        # Get indicators flagged for rework/calibration with their feedback
        responses_with_feedback = (
            db.query(AssessmentResponse)
            .options(
                joinedload(AssessmentResponse.indicator).joinedload(Indicator.governance_area),
                selectinload(AssessmentResponse.feedback_comments).joinedload(
                    FeedbackComment.assessor
                ),
            )
            .filter(
                AssessmentResponse.assessment_id == assessment.id,
            )
            .all()
        )

        # Filter to only include responses that need rework/calibration
        mlgoo_recalibration_ids = set(assessment.mlgoo_recalibration_indicator_ids or [])

        # Collect indicator IDs that need rework/calibration for batch MOV query
        indicator_ids_for_mov: list[int] = []
        for response in responses_with_feedback:
            is_rework = response.requires_rework
            is_calibration = response.flagged_for_calibration
            is_mlgoo_recal = response.indicator_id in mlgoo_recalibration_ids
            if is_rework or is_calibration or is_mlgoo_recal:
                indicator_ids_for_mov.append(response.indicator_id)

        # Batch fetch all MOV files for these indicators in a single query
        mov_files_by_indicator: dict[int, list[MOVFile]] = {}
        if indicator_ids_for_mov:
            mov_files = (
                db.query(MOVFile)
                .filter(
                    MOVFile.assessment_id == assessment.id,
                    MOVFile.indicator_id.in_(indicator_ids_for_mov),
                    MOVFile.deleted_at.is_(None),
                )
                .all()
            )
            for mf in mov_files:
                if mf.indicator_id not in mov_files_by_indicator:
                    mov_files_by_indicator[mf.indicator_id] = []
                mov_files_by_indicator[mf.indicator_id].append(mf)

        # Batch fetch all annotations for these MOV files in a single query
        all_mov_file_ids = [mf.id for mfs in mov_files_by_indicator.values() for mf in mfs]
        annotations_by_mov_id: dict[int, list[MOVAnnotation]] = {}
        if all_mov_file_ids:
            annotations = (
                db.query(MOVAnnotation)
                .options(joinedload(MOVAnnotation.assessor))
                .filter(MOVAnnotation.mov_file_id.in_(all_mov_file_ids))
                .all()
            )
            for ann in annotations:
                if ann.mov_file_id not in annotations_by_mov_id:
                    annotations_by_mov_id[ann.mov_file_id] = []
                annotations_by_mov_id[ann.mov_file_id].append(ann)

        # Build the rework indicators list
        for response in responses_with_feedback:
            is_rework = response.requires_rework
            is_calibration = response.flagged_for_calibration
            is_mlgoo_recal = response.indicator_id in mlgoo_recalibration_ids

            if not (is_rework or is_calibration or is_mlgoo_recal):
                continue

            # Determine status type
            if is_mlgoo_recal:
                status = "mlgoo_recalibration"
            elif is_calibration:
                status = "calibration"
            else:
                status = "rework"

            indicator = response.indicator
            area = indicator.governance_area if indicator else None

            # Get feedback comments for this response (already eagerly loaded)
            feedback_comments = []
            for fc in response.feedback_comments or []:
                feedback_comments.append(
                    {
                        "id": fc.id,
                        "comment": fc.comment,
                        "comment_type": fc.comment_type,
                        "assessor_id": fc.assessor_id,
                        "assessor_name": fc.assessor.name if fc.assessor else "Unknown",
                        "created_at": self._format_utc_datetime(fc.created_at),
                    }
                )

            # Get MOV annotations for this indicator (from batched data)
            mov_annotations = []
            indicator_mov_files = mov_files_by_indicator.get(response.indicator_id, [])
            for mov_file in indicator_mov_files:
                file_annotations = annotations_by_mov_id.get(mov_file.id, [])
                for ann in file_annotations:
                    mov_annotations.append(
                        {
                            "id": ann.id,
                            "mov_file_id": mov_file.id,
                            "mov_filename": mov_file.file_name,
                            "mov_file_type": mov_file.file_type,
                            "annotation_type": ann.annotation_type,
                            "page": ann.page,
                            "rect": ann.rect,
                            "rects": ann.rects,
                            "comment": ann.comment,
                            "assessor_id": ann.assessor_id,
                            "assessor_name": ann.assessor.name if ann.assessor else "Unknown",
                            "created_at": self._format_utc_datetime(ann.created_at),
                        }
                    )

            summary["rework_indicators"].append(
                {
                    "indicator_id": indicator.id if indicator else response.indicator_id,
                    "indicator_name": indicator.name if indicator else "Unknown",
                    "indicator_code": indicator.indicator_code if indicator else None,
                    "governance_area_id": area.id if area else None,
                    "governance_area_name": area.name if area else "Unknown",
                    "status": status,
                    "validation_status": response.validation_status.value
                    if response.validation_status
                    else None,
                    "feedback_comments": feedback_comments,
                    "mov_annotations": mov_annotations,
                }
            )

        # Sort indicators by indicator_code for consistent display
        summary["rework_indicators"].sort(
            key=lambda x: self._parse_indicator_code(x.get("indicator_code", ""))
        )

        return summary

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
                    "submitted_at": self._format_utc_datetime(assessment.submitted_at),
                    "validated_at": self._format_utc_datetime(assessment.validated_at),
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

        # Log activity: Assessment approved and completed
        try:
            assessment_activity_service.log_activity(
                db=db,
                assessment_id=assessment_id,
                action="approved",
                user_id=mlgoo_user.id,  # type: ignore
                from_status=AssessmentStatus.AWAITING_MLGOO_APPROVAL.value,
                to_status=AssessmentStatus.COMPLETED.value,
                extra_data={
                    "barangay_name": barangay_name,
                    "comments": comments,
                },
                description=f"Assessment approved by {mlgoo_user.name}",
            )
        except Exception as e:
            self.logger.error(f"Failed to log approval activity: {e}")

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

        # Log activity: Recalibration requested
        try:
            assessment_activity_service.log_activity(
                db=db,
                assessment_id=assessment_id,
                action="recalibration_requested",
                user_id=mlgoo_user.id,  # type: ignore
                from_status=AssessmentStatus.AWAITING_MLGOO_APPROVAL.value,
                to_status=AssessmentStatus.REWORK.value,
                extra_data={
                    "barangay_name": barangay_name,
                    "indicator_ids": indicator_ids,
                    "indicator_names": indicator_names,
                    "comments": comments,
                },
                description=f"RE-calibration requested by {mlgoo_user.name} for {len(indicator_ids)} indicator(s)",
            )
        except Exception as e:
            self.logger.error(f"Failed to log recalibration activity: {e}")

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

        # Log activity: Recalibration requested (by MOV)
        try:
            assessment_activity_service.log_activity(
                db=db,
                assessment_id=assessment_id,
                action="recalibration_requested",
                user_id=mlgoo_user.id,  # type: ignore
                from_status=AssessmentStatus.AWAITING_MLGOO_APPROVAL.value,
                to_status=AssessmentStatus.REWORK.value,
                extra_data={
                    "barangay_name": barangay_name,
                    "mov_file_count": len(mov_files),
                    "indicator_ids": indicator_ids,
                    "comments": overall_comments,
                    "type": "mov_file_recalibration",
                },
                description=f"RE-calibration requested by {mlgoo_user.name} for {len(mov_files)} MOV file(s)",
            )
        except Exception as e:
            self.logger.error(f"Failed to log recalibration activity: {e}")

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

        # Build a mapping of indicator_id -> response for existing responses
        response_by_indicator: dict[int, AssessmentResponse] = {}
        for response in assessment.responses:
            if response.indicator_id:
                response_by_indicator[response.indicator_id] = response

        # Get ALL active child indicators applicable to this assessment year
        # Only child indicators (parent_id IS NOT NULL) are actual assessment items
        # Parent indicators are just category groupings
        assessment_year = assessment.assessment_year
        all_indicators_query = (
            db.query(Indicator)
            .options(joinedload(Indicator.governance_area))
            .filter(
                Indicator.is_active == True,
                Indicator.parent_id.isnot(None),  # Only child indicators (actual assessment items)
                # Year-based filtering: indicator must be effective for this assessment year
                (Indicator.effective_from_year.is_(None))
                | (Indicator.effective_from_year <= assessment_year),
                (Indicator.effective_to_year.is_(None))
                | (Indicator.effective_to_year >= assessment_year),
            )
            .all()
        )

        # Group ALL indicators by governance area
        areas_data = {}
        for indicator in all_indicators_query:
            area = indicator.governance_area
            if not area:
                continue

            area_id = area.id
            area_name = area.name

            if area_id not in areas_data:
                areas_data[area_id] = {
                    "id": area_id,
                    "name": area_name,
                    "area_type": area.area_type.value if area.area_type else None,
                    "pass_count": 0,
                    "fail_count": 0,
                    "conditional_count": 0,
                    "indicators": [],
                }

            # Check if there's an existing response for this indicator
            response = response_by_indicator.get(indicator.id)

            # Count statuses (only for indicators with responses and validation status)
            if response and response.validation_status:
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

            # Build indicator data (with or without response)
            indicator_data = {
                "response_id": response.id if response else None,
                "indicator_id": indicator.id,
                "indicator_name": indicator.name,
                "indicator_code": indicator.indicator_code,
                "validation_status": response.validation_status.value
                if response and response.validation_status
                else None,
                "assessor_remarks": response.assessor_remarks if response else None,
                "is_completed": response.is_completed if response else False,
                "is_recalibration_target": bool(
                    assessment.mlgoo_recalibration_indicator_ids
                    and indicator.id in assessment.mlgoo_recalibration_indicator_ids
                ),
                "requires_rework": response.requires_rework if response else False,
                "flagged_for_calibration": response.flagged_for_calibration if response else False,
                "mov_files": mov_files_by_indicator.get(indicator.id, []),
            }
            areas_data[area_id]["indicators"].append(indicator_data)

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
            "cycle_year": assessment.assessment_year,
            "blgu_user_id": assessment.blgu_user_id,
            "blgu_user_name": assessment.blgu_user.name if assessment.blgu_user else None,
            "status": assessment.status.value,
            "submitted_at": self._format_utc_datetime(assessment.submitted_at),
            "validated_at": self._format_utc_datetime(assessment.validated_at),
            "compliance_status": assessment.final_compliance_status.value
            if assessment.final_compliance_status
            else None,
            "overall_score": overall_score,
            "area_results": assessment.area_results,
            "governance_areas": list(areas_data.values()),
            "can_approve": assessment.status == AssessmentStatus.AWAITING_MLGOO_APPROVAL,
            "can_recalibrate": assessment.can_request_mlgoo_recalibration,
            # Rework tracking (Assessor stage)
            "rework_requested_at": self._format_utc_datetime(assessment.rework_requested_at),
            "rework_submitted_at": self._format_utc_datetime(assessment.rework_submitted_at),
            "rework_count": assessment.rework_count,
            # Calibration tracking (Validator stage)
            "calibration_requested_at": self._format_utc_datetime(
                assessment.calibration_requested_at
            ),
            "calibration_submitted_at": self._format_utc_datetime(
                assessment.calibration_submitted_at
            ),
            # MLGOO RE-calibration tracking
            "mlgoo_recalibration_count": assessment.mlgoo_recalibration_count,
            "is_mlgoo_recalibration": assessment.is_mlgoo_recalibration,
            "mlgoo_recalibration_requested_at": self._format_utc_datetime(
                assessment.mlgoo_recalibration_requested_at
            ),
            "mlgoo_recalibration_submitted_at": self._format_utc_datetime(
                assessment.mlgoo_recalibration_submitted_at
            ),
            "mlgoo_recalibration_indicator_ids": assessment.mlgoo_recalibration_indicator_ids,
            "mlgoo_recalibration_mov_file_ids": assessment.mlgoo_recalibration_mov_file_ids,
            "mlgoo_recalibration_comments": assessment.mlgoo_recalibration_comments,
            # MLGOO approval
            "mlgoo_approved_at": self._format_utc_datetime(assessment.mlgoo_approved_at),
            "grace_period_expires_at": self._format_utc_datetime(
                assessment.grace_period_expires_at
            ),
            "is_locked_for_deadline": assessment.is_locked_for_deadline,
            # Rework/Calibration summary (detailed info for display)
            "rework_calibration_summary": self._build_rework_calibration_summary(db, assessment),
            # Area-by-area assessor/validator progress (for MLGOO tracking tab)
            "assessment_progress": self._build_assessment_progress_overview(
                db, assessment, areas_data
            ),
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
