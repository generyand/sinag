# ⏰ Deadline Management Service
# Business logic for managing assessment cycles and deadline overrides

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from enum import Enum
import csv
from io import StringIO

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func

from app.db.models.admin import AssessmentCycle, DeadlineOverride
from app.db.models.barangay import Barangay
from app.db.models.governance_area import Indicator
from app.db.models.user import User
from app.db.models.assessment import Assessment
from app.db.enums import AssessmentStatus
from app.workers.notifications import send_deadline_extension_notification


class DeadlineStatusType(str, Enum):
    """Status of a barangay's submission relative to deadline."""

    SUBMITTED_ON_TIME = "submitted_on_time"  # Submitted before deadline
    SUBMITTED_LATE = "submitted_late"  # Submitted after deadline
    PENDING = "pending"  # Not submitted, deadline not yet passed
    OVERDUE = "overdue"  # Not submitted, deadline passed


class DeadlineService:
    """
    Service for managing assessment cycles and deadline overrides.

    This service handles:
    - Creating and managing assessment cycles
    - Tracking deadline status across barangays and phases
    - Applying and querying deadline overrides
    - Exporting override audit logs
    """

    def __init__(self):
        """Initialize the deadline service."""
        pass

    def create_assessment_cycle(
        self,
        db: Session,
        name: str,
        year: int,
        phase1_deadline: datetime,
        rework_deadline: datetime,
        phase2_deadline: datetime,
        calibration_deadline: datetime,
    ) -> AssessmentCycle:
        """
        Create a new assessment cycle.

        This method:
        1. Validates that deadlines are in chronological order
        2. Deactivates any existing active cycle
        3. Creates and returns the new active cycle

        Args:
            db: Database session
            name: Cycle name (e.g., "SGLGB 2025")
            year: Assessment year
            phase1_deadline: Initial submission deadline
            rework_deadline: Rework submission deadline
            phase2_deadline: Final submission deadline
            calibration_deadline: Calibration/validation deadline

        Returns:
            The newly created assessment cycle

        Raises:
            ValueError: If deadlines are not in chronological order
        """
        # Validate chronological order of deadlines
        if not (
            phase1_deadline < rework_deadline < phase2_deadline < calibration_deadline
        ):
            raise ValueError(
                "Deadlines must be in chronological order: "
                "phase1 < rework < phase2 < calibration"
            )

        # Deactivate any existing active cycle
        existing_active = (
            db.query(AssessmentCycle).filter(AssessmentCycle.is_active == True).first()
        )
        if existing_active:
            existing_active.is_active = False
            db.add(existing_active)

        # Create new cycle
        new_cycle = AssessmentCycle(
            name=name,
            year=year,
            phase1_deadline=phase1_deadline,
            rework_deadline=rework_deadline,
            phase2_deadline=phase2_deadline,
            calibration_deadline=calibration_deadline,
            is_active=True,
        )

        db.add(new_cycle)
        db.commit()
        db.refresh(new_cycle)

        return new_cycle

    def get_active_cycle(self, db: Session) -> Optional[AssessmentCycle]:
        """
        Get the currently active assessment cycle.

        Args:
            db: Database session

        Returns:
            The active assessment cycle, or None if no cycle is active
        """
        return db.query(AssessmentCycle).filter(AssessmentCycle.is_active == True).first()

    def update_cycle(
        self,
        db: Session,
        cycle_id: int,
        name: Optional[str] = None,
        year: Optional[int] = None,
        phase1_deadline: Optional[datetime] = None,
        rework_deadline: Optional[datetime] = None,
        phase2_deadline: Optional[datetime] = None,
        calibration_deadline: Optional[datetime] = None,
    ) -> AssessmentCycle:
        """
        Update an existing assessment cycle.

        This method updates cycle metadata and deadlines. Deadline updates are only
        allowed if the cycle hasn't started yet (phase1_deadline is in the future).

        Args:
            db: Database session
            cycle_id: ID of the cycle to update
            name: New cycle name (optional)
            year: New assessment year (optional)
            phase1_deadline: New phase 1 deadline (optional)
            rework_deadline: New rework deadline (optional)
            phase2_deadline: New phase 2 deadline (optional)
            calibration_deadline: New calibration deadline (optional)

        Returns:
            The updated assessment cycle

        Raises:
            ValueError: If cycle not found, if cycle has already started,
                       or if deadlines are not in chronological order
        """
        cycle = db.query(AssessmentCycle).filter(AssessmentCycle.id == cycle_id).first()

        if not cycle:
            raise ValueError(f"Assessment cycle with ID {cycle_id} not found")

        # Check if cycle has started (cannot modify deadlines after phase 1 starts)
        if cycle.phase1_deadline < datetime.utcnow():
            # Only allow updating name/year for started cycles
            if any(
                [
                    phase1_deadline,
                    rework_deadline,
                    phase2_deadline,
                    calibration_deadline,
                ]
            ):
                raise ValueError(
                    "Cannot modify deadlines for a cycle that has already started"
                )

        # Update fields if provided
        if name is not None:
            cycle.name = name
        if year is not None:
            cycle.year = year

        # Update deadlines if provided
        updated_deadlines = {
            "phase1": phase1_deadline if phase1_deadline else cycle.phase1_deadline,
            "rework": rework_deadline if rework_deadline else cycle.rework_deadline,
            "phase2": phase2_deadline if phase2_deadline else cycle.phase2_deadline,
            "calibration": calibration_deadline
            if calibration_deadline
            else cycle.calibration_deadline,
        }

        # Validate chronological order
        if not (
            updated_deadlines["phase1"]
            < updated_deadlines["rework"]
            < updated_deadlines["phase2"]
            < updated_deadlines["calibration"]
        ):
            raise ValueError(
                "Deadlines must be in chronological order: "
                "phase1 < rework < phase2 < calibration"
            )

        # Apply deadline updates
        if phase1_deadline:
            cycle.phase1_deadline = phase1_deadline
        if rework_deadline:
            cycle.rework_deadline = rework_deadline
        if phase2_deadline:
            cycle.phase2_deadline = phase2_deadline
        if calibration_deadline:
            cycle.calibration_deadline = calibration_deadline

        db.add(cycle)
        db.commit()
        db.refresh(cycle)

        return cycle

    def get_deadline_status(
        self, db: Session, cycle_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get deadline status for all barangays across all phases.

        For each barangay, checks submission status against deadlines:
        - submitted_on_time: Submitted before deadline
        - submitted_late: Submitted after deadline but accepted
        - pending: Not submitted, deadline not yet passed
        - overdue: Not submitted, deadline passed

        Args:
            db: Database session
            cycle_id: Optional cycle ID to check (defaults to active cycle)

        Returns:
            List of dictionaries containing barangay deadline status information
        """
        # Get the cycle to check
        if cycle_id:
            cycle = db.query(AssessmentCycle).filter(AssessmentCycle.id == cycle_id).first()
        else:
            cycle = self.get_active_cycle(db)

        if not cycle:
            return []

        # Get all barangays
        barangays = db.query(Barangay).all()

        # Get all assessments for this cycle (we'll use submission timestamps)
        # For simplicity, we'll check assessments by their submitted_at timestamp
        assessments = (
            db.query(Assessment)
            .join(User, Assessment.blgu_user_id == User.id)
            .options(joinedload(Assessment.blgu_user))
            .filter(User.barangay_id.isnot(None))
            .all()
        )

        # Build assessment lookup by barangay_id
        assessment_by_barangay = {}
        for assessment in assessments:
            barangay_id = assessment.blgu_user.barangay_id
            if barangay_id not in assessment_by_barangay:
                assessment_by_barangay[barangay_id] = []
            assessment_by_barangay[barangay_id].append(assessment)

        # Get deadline overrides for this cycle
        overrides = (
            db.query(DeadlineOverride)
            .filter(DeadlineOverride.cycle_id == cycle.id)
            .all()
        )

        # Build override lookup by (barangay_id, indicator_id)
        override_lookup = {}
        for override in overrides:
            key = (override.barangay_id, override.indicator_id)
            override_lookup[key] = override.new_deadline

        now = datetime.now(timezone.utc)
        status_results = []

        for barangay in barangays:
            barangay_assessments = assessment_by_barangay.get(barangay.id, [])

            # Determine status for each phase
            phase1_status = self._determine_phase_status(
                barangay_assessments, cycle.phase1_deadline, now, phase="phase1"
            )
            rework_status = self._determine_phase_status(
                barangay_assessments, cycle.rework_deadline, now, phase="rework"
            )
            phase2_status = self._determine_phase_status(
                barangay_assessments, cycle.phase2_deadline, now, phase="phase2"
            )
            calibration_status = self._determine_phase_status(
                barangay_assessments,
                cycle.calibration_deadline,
                now,
                phase="calibration",
            )

            status_results.append(
                {
                    "barangay_id": barangay.id,
                    "barangay_name": barangay.name,
                    "cycle_id": cycle.id,
                    "cycle_name": cycle.name,
                    "phase1": phase1_status,
                    "rework": rework_status,
                    "phase2": phase2_status,
                    "calibration": calibration_status,
                }
            )

        return status_results

    def _ensure_timezone_aware(self, dt: datetime) -> datetime:
        """
        Ensure a datetime is timezone-aware (UTC).

        If the datetime is naive, assume it's UTC and make it aware.
        """
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt

    def _determine_phase_status(
        self,
        assessments: List[Assessment],
        deadline: datetime,
        now: datetime,
        phase: str,
    ) -> Dict[str, Any]:
        """
        Helper method to determine status for a specific phase.

        Args:
            assessments: List of assessments for the barangay
            deadline: Deadline for this phase
            now: Current timestamp
            phase: Phase name (for context)

        Returns:
            Dictionary with status and additional info
        """
        # Ensure deadline is timezone-aware
        deadline = self._ensure_timezone_aware(deadline)

        # Check if there's a submitted assessment
        submitted_assessments = [
            a
            for a in assessments
            if a.submitted_at and a.status != AssessmentStatus.DRAFT
        ]

        if submitted_assessments:
            # Get the latest submission
            latest_submission = max(submitted_assessments, key=lambda a: a.submitted_at)

            # Ensure submitted_at is timezone-aware
            submitted_at = self._ensure_timezone_aware(latest_submission.submitted_at)

            if submitted_at <= deadline:
                return {
                    "status": DeadlineStatusType.SUBMITTED_ON_TIME.value,
                    "submitted_at": submitted_at.isoformat() + 'Z',
                    "deadline": deadline.isoformat() + 'Z',
                }
            else:
                return {
                    "status": DeadlineStatusType.SUBMITTED_LATE.value,
                    "submitted_at": submitted_at.isoformat() + 'Z',
                    "deadline": deadline.isoformat() + 'Z',
                }
        else:
            # No submission yet
            if now < deadline:
                return {
                    "status": DeadlineStatusType.PENDING.value,
                    "deadline": deadline.isoformat() + 'Z',
                }
            else:
                return {
                    "status": DeadlineStatusType.OVERDUE.value,
                    "deadline": deadline.isoformat() + 'Z',
                }

    def apply_deadline_override(
        self,
        db: Session,
        cycle_id: int,
        barangay_id: int,
        indicator_id: int,
        new_deadline: datetime,
        reason: str,
        created_by_user_id: int,
    ) -> DeadlineOverride:
        """
        Apply a deadline override for a specific barangay and indicator.

        This method:
        1. Validates that the cycle, barangay, and indicator exist
        2. Validates that new_deadline is not in the past
        3. Determines the original deadline from the cycle
        4. Creates a DeadlineOverride record with audit trail

        Args:
            db: Database session
            cycle_id: ID of the assessment cycle
            barangay_id: ID of the barangay receiving the extension
            indicator_id: ID of the indicator being extended
            new_deadline: The extended deadline (must be in the future)
            reason: Justification for the extension (required for audit)
            created_by_user_id: ID of the MLGOO-DILG user creating the override

        Returns:
            The newly created DeadlineOverride record

        Raises:
            ValueError: If cycle/barangay/indicator not found, or if new_deadline is in the past
        """
        # Validate cycle exists
        cycle = db.query(AssessmentCycle).filter(AssessmentCycle.id == cycle_id).first()
        if not cycle:
            raise ValueError(f"Assessment cycle with ID {cycle_id} not found")

        # Validate barangay exists
        barangay = db.query(Barangay).filter(Barangay.id == barangay_id).first()
        if not barangay:
            raise ValueError(f"Barangay with ID {barangay_id} not found")

        # Validate indicator exists
        indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
        if not indicator:
            raise ValueError(f"Indicator with ID {indicator_id} not found")

        # Validate user exists
        user = db.query(User).filter(User.id == created_by_user_id).first()
        if not user:
            raise ValueError(f"User with ID {created_by_user_id} not found")

        # Validate new_deadline is not in the past
        now = datetime.now(timezone.utc)
        if new_deadline <= now:
            raise ValueError(
                f"New deadline must be in the future. "
                f"Provided: {new_deadline.isoformat() + 'Z'}, Current time: {now.isoformat() + 'Z'}"
            )

        # Determine original deadline based on current phase
        # We'll use the phase2_deadline as the base original deadline
        # (this could be made more sophisticated to determine which phase the indicator is in)
        original_deadline = cycle.phase2_deadline

        # Create the override record
        override = DeadlineOverride(
            cycle_id=cycle_id,
            barangay_id=barangay_id,
            indicator_id=indicator_id,
            created_by=created_by_user_id,
            original_deadline=original_deadline,
            new_deadline=new_deadline,
            reason=reason,
        )

        db.add(override)
        db.commit()
        db.refresh(override)

        # Trigger notification task asynchronously
        # Note: This sends one notification per override. If multiple overrides are created
        # for the same barangay, multiple notifications will be sent. Consider using
        # apply_deadline_overrides_bulk() instead for batch operations.
        try:
            send_deadline_extension_notification.delay(
                barangay_id=barangay_id,
                indicator_ids=[indicator_id],
                new_deadline=new_deadline.isoformat() + 'Z',
                reason=reason,
                created_by_user_id=created_by_user_id,
            )
        except Exception as e:
            # Log error but don't fail the override creation
            # (notification failures shouldn't block the main operation)
            import logging
            logger = logging.getLogger(__name__)
            logger.error(
                "Failed to trigger deadline extension notification for override %s: %s",
                override.id,
                str(e),
            )

        return override

    def get_deadline_overrides(
        self,
        db: Session,
        cycle_id: Optional[int] = None,
        barangay_id: Optional[int] = None,
        indicator_id: Optional[int] = None,
    ) -> List[DeadlineOverride]:
        """
        Query deadline overrides with optional filters.

        This method allows filtering overrides by cycle, barangay, and/or indicator.
        Returns results ordered by creation date (newest first).

        Args:
            db: Database session
            cycle_id: Optional filter by cycle ID
            barangay_id: Optional filter by barangay ID
            indicator_id: Optional filter by indicator ID

        Returns:
            List of DeadlineOverride records matching the filters
        """
        # Build the query with optional filters
        query = db.query(DeadlineOverride)

        if cycle_id is not None:
            query = query.filter(DeadlineOverride.cycle_id == cycle_id)

        if barangay_id is not None:
            query = query.filter(DeadlineOverride.barangay_id == barangay_id)

        if indicator_id is not None:
            query = query.filter(DeadlineOverride.indicator_id == indicator_id)

        # Order by creation date (newest first)
        query = query.order_by(DeadlineOverride.created_at.desc())

        return query.all()

    def export_overrides_to_csv(
        self,
        db: Session,
        cycle_id: Optional[int] = None,
        barangay_id: Optional[int] = None,
        indicator_id: Optional[int] = None,
    ) -> str:
        """
        Export deadline overrides to CSV format for audit purposes.

        This method generates a CSV string containing all deadline override records
        with comprehensive audit information including barangay name, indicator name,
        creator email, deadlines, and justification reason.

        Args:
            db: Database session
            cycle_id: Optional filter by cycle ID
            barangay_id: Optional filter by barangay ID
            indicator_id: Optional filter by indicator ID

        Returns:
            CSV string with headers and override data
        """
        # Get filtered overrides
        overrides = self.get_deadline_overrides(db, cycle_id, barangay_id, indicator_id)

        # Create CSV in memory
        output = StringIO()
        writer = csv.writer(output)

        # Write header row
        writer.writerow([
            "Override ID",
            "Cycle Name",
            "Barangay Name",
            "Indicator Name",
            "Original Deadline",
            "New Deadline",
            "Extension Duration (Days)",
            "Reason",
            "Created By",
            "Created At",
        ])

        # Write data rows
        for override in overrides:
            # Calculate extension duration
            extension_days = (override.new_deadline - override.original_deadline).days

            writer.writerow([
                override.id,
                override.cycle.name,
                override.barangay.name,
                override.indicator.name,
                override.original_deadline.strftime("%Y-%m-%d %H:%M:%S UTC"),
                override.new_deadline.strftime("%Y-%m-%d %H:%M:%S UTC"),
                extension_days,
                override.reason,
                override.creator.email,
                override.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
            ])

        return output.getvalue()


# Create a single instance to be used across the application
deadline_service = DeadlineService()
