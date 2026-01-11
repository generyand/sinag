# 📊 Assessment Activity Service
# Business logic for tracking and retrieving assessment workflow activities

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.models.assessment import Assessment
from app.db.models.assessment_activity import AssessmentActivity
from app.db.models.user import User
from app.schemas.assessment_activity import ActivityAction

# Action to human-readable label mapping
ACTION_LABELS = {
    ActivityAction.CREATED.value: "Assessment Created",
    ActivityAction.SUBMITTED.value: "Assessment Submitted",
    ActivityAction.REVIEW_STARTED.value: "Review Started",
    ActivityAction.REWORK_REQUESTED.value: "Rework Requested",
    ActivityAction.REWORK_SUBMITTED.value: "Rework Submitted",
    ActivityAction.REVIEW_COMPLETED.value: "Review Completed",
    ActivityAction.VALIDATION_STARTED.value: "Validation Started",
    ActivityAction.CALIBRATION_REQUESTED.value: "Calibration Requested",
    ActivityAction.CALIBRATION_SUBMITTED.value: "Calibration Submitted",
    ActivityAction.VALIDATION_COMPLETED.value: "Validation Completed",
    ActivityAction.APPROVED.value: "Assessment Approved",
    ActivityAction.RECALIBRATION_REQUESTED.value: "Recalibration Requested",
    ActivityAction.RECALIBRATION_SUBMITTED.value: "Recalibration Submitted",
    ActivityAction.COMPLETED.value: "Assessment Completed",
}


class AssessmentActivityService:
    """Service class for assessment activity logging and retrieval."""

    def log_activity(
        self,
        db: Session,
        assessment_id: int,
        action: str,
        user_id: int | None = None,
        from_status: str | None = None,
        to_status: str | None = None,
        extra_data: dict[str, Any] | None = None,
        description: str | None = None,
    ) -> AssessmentActivity:
        """
        Log an assessment activity event.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            action: Action type (see ActivityAction enum)
            user_id: ID of the user performing the action
            from_status: Previous assessment status
            to_status: New assessment status
            extra_data: Additional context data
            description: Human-readable description

        Returns:
            AssessmentActivity: Created activity record
        """
        # Generate description if not provided
        if not description:
            description = ACTION_LABELS.get(action, action.replace("_", " ").title())

        activity = AssessmentActivity(
            assessment_id=assessment_id,
            user_id=user_id,
            action=action,
            from_status=from_status,
            to_status=to_status,
            extra_data=extra_data,
            description=description,
            created_at=datetime.utcnow(),
        )

        db.add(activity)
        db.commit()
        db.refresh(activity)

        return activity

    def get_activities(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        assessment_id: int | None = None,
        user_id: int | None = None,
        barangay_id: int | None = None,
        action: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> tuple[list[AssessmentActivity], int]:
        """
        Get assessment activities with optional filtering and pagination.

        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            assessment_id: Filter by assessment ID
            user_id: Filter by user ID
            barangay_id: Filter by barangay ID (via assessment's BLGU user)
            action: Filter by action type
            start_date: Filter from date (inclusive)
            end_date: Filter to date (inclusive)

        Returns:
            tuple: (activities, total_count)
        """
        query = db.query(AssessmentActivity).options(
            joinedload(AssessmentActivity.user),
            joinedload(AssessmentActivity.assessment)
            .joinedload(Assessment.blgu_user)
            .joinedload(User.barangay),
        )

        # Apply filters
        if assessment_id is not None:
            query = query.filter(AssessmentActivity.assessment_id == assessment_id)

        if user_id is not None:
            query = query.filter(AssessmentActivity.user_id == user_id)

        if barangay_id is not None:
            query = (
                query.join(AssessmentActivity.assessment)
                .join(Assessment.blgu_user)
                .filter(User.barangay_id == barangay_id)
            )

        if action:
            query = query.filter(AssessmentActivity.action == action)

        if start_date:
            query = query.filter(AssessmentActivity.created_at >= start_date)

        if end_date:
            query = query.filter(AssessmentActivity.created_at <= end_date)

        # Get total count before pagination
        total = query.count()

        # Order by most recent first
        query = query.order_by(AssessmentActivity.created_at.desc())

        # Apply pagination
        activities = query.offset(skip).limit(limit).all()

        return activities, total

    def get_assessment_timeline(
        self,
        db: Session,
        assessment_id: int,
    ) -> list[AssessmentActivity]:
        """
        Get the complete activity timeline for a specific assessment.

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            List of activities ordered chronologically (oldest first)
        """
        return (
            db.query(AssessmentActivity)
            .options(joinedload(AssessmentActivity.user))
            .filter(AssessmentActivity.assessment_id == assessment_id)
            .order_by(AssessmentActivity.created_at.asc())
            .all()
        )

    def get_activity_summary(
        self,
        db: Session,
        barangay_id: int | None = None,
    ) -> dict[str, Any]:
        """
        Get activity summary statistics.

        Args:
            db: Database session
            barangay_id: Optional barangay filter

        Returns:
            Dict with summary statistics
        """
        base_query = db.query(AssessmentActivity)

        if barangay_id is not None:
            base_query = (
                base_query.join(AssessmentActivity.assessment)
                .join(Assessment.blgu_user)
                .filter(User.barangay_id == barangay_id)
            )

        # Total activities
        total = base_query.count()

        # Count by action type
        submissions = base_query.filter(
            AssessmentActivity.action == ActivityAction.SUBMITTED.value
        ).count()
        approvals = base_query.filter(
            AssessmentActivity.action == ActivityAction.APPROVED.value
        ).count()
        rework_requests = base_query.filter(
            AssessmentActivity.action == ActivityAction.REWORK_REQUESTED.value
        ).count()
        calibrations = base_query.filter(
            AssessmentActivity.action.in_(
                [
                    ActivityAction.CALIBRATION_REQUESTED.value,
                    ActivityAction.RECALIBRATION_REQUESTED.value,
                ]
            )
        ).count()

        # Recent activity counts
        now = datetime.utcnow()
        last_7_days = base_query.filter(
            AssessmentActivity.created_at >= now - timedelta(days=7)
        ).count()
        last_30_days = base_query.filter(
            AssessmentActivity.created_at >= now - timedelta(days=30)
        ).count()

        return {
            "total_activities": total,
            "submissions_count": submissions,
            "approvals_count": approvals,
            "rework_requests_count": rework_requests,
            "calibrations_count": calibrations,
            "last_7_days": last_7_days,
            "last_30_days": last_30_days,
        }

    def get_activity_counts_by_action(
        self,
        db: Session,
        barangay_id: int | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> list[dict[str, Any]]:
        """
        Get activity counts grouped by action type.

        Args:
            db: Database session
            barangay_id: Optional barangay filter
            start_date: Optional start date filter
            end_date: Optional end date filter

        Returns:
            List of action counts with labels
        """
        query = db.query(
            AssessmentActivity.action, func.count(AssessmentActivity.id).label("count")
        )

        if barangay_id is not None:
            query = (
                query.join(AssessmentActivity.assessment)
                .join(Assessment.blgu_user)
                .filter(User.barangay_id == barangay_id)
            )

        if start_date:
            query = query.filter(AssessmentActivity.created_at >= start_date)

        if end_date:
            query = query.filter(AssessmentActivity.created_at <= end_date)

        results = query.group_by(AssessmentActivity.action).all()

        return [
            {
                "action": action,
                "count": count,
                "label": ACTION_LABELS.get(action, action.replace("_", " ").title()),
            }
            for action, count in results
        ]


# Singleton instance for global use
assessment_activity_service = AssessmentActivityService()
