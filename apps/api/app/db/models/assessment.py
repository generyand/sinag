# 📋 Assessment Database Models
# SQLAlchemy models for assessment-related tables

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.db.base import Base
from app.db.enums import AssessmentStatus, ComplianceStatus, MOVStatus, ValidationStatus

if TYPE_CHECKING:
    from app.db.models.system import AssessmentYear


class Assessment(Base):
    """
    Assessment table model for database storage.

    Represents a complete assessment instance for a BLGU user.
    Tracks the overall status and progress of the assessment.
    """

    __tablename__ = "assessments"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Assessment information
    status: Mapped[AssessmentStatus] = mapped_column(
        Enum(AssessmentStatus, name="assessment_status_enum", create_constraint=True),
        nullable=False,
        default=AssessmentStatus.DRAFT,
    )

    # Rework tracking (Epic 5.0) - Assessor stage
    # rework_requested_at is used to identify MOV files uploaded after rework request
    # Files uploaded AFTER this timestamp are shown as "New Files (After Rework)" in Assessor view
    rework_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rework_requested_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    rework_submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )  # When BLGU resubmitted after rework
    rework_requested_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    rework_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    rework_summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Calibration tracking (Phase 2 Validator workflow)
    # When True, BLGU should submit back to Validator, not Assessor
    is_calibration_rework: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    calibration_validator_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )  # Legacy: single validator (kept for backward compatibility)
    # calibration_requested_at is used to identify MOV files uploaded after calibration request
    # Files uploaded AFTER this timestamp are shown as "New Files (After Calibration)" in Validator view
    # IMPORTANT: In Validator view, use calibration_requested_at for calibrated indicators (validation_status=null),
    # and rework_requested_at for non-calibrated indicators (to show files from Assessor rework stage)
    calibration_requested_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    calibration_submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )  # When BLGU resubmitted after calibration
    calibration_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )  # Legacy: global count (deprecated)
    # Track calibration per governance area - stores list of area IDs that have been calibrated
    # Each area can only be calibrated once (max 1 per area)
    calibrated_area_ids: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)
    # AI-generated calibration summary (similar to rework_summary but for validator calibration)
    calibration_summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # PARALLEL CALIBRATION: Support multiple validators calibrating different areas simultaneously
    # Stores list of pending calibrations: [{"validator_id": 1, "governance_area_id": 2, "requested_at": "...", "approved": false}, ...]
    pending_calibrations: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)
    # Stores AI summaries per governance area: {"1": {"ceb": {...}, "en": {...}}, "2": {...}}
    calibration_summaries_by_area: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # MLGOO Final Approval tracking (NEW)
    mlgoo_approved_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    mlgoo_approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # MLGOO RE-calibration tracking (distinct from Validator calibration)
    # Used when MLGOO determines validator was too strict and needs to unlock indicators
    is_mlgoo_recalibration: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    mlgoo_recalibration_requested_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    mlgoo_recalibration_requested_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    mlgoo_recalibration_submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )  # When BLGU resubmitted after MLGOO RE-calibration
    mlgoo_recalibration_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )  # Max 1
    mlgoo_recalibration_indicator_ids: Mapped[list | None] = mapped_column(
        JSON, nullable=True
    )  # Specific indicators unlocked (legacy - kept for backward compatibility)
    mlgoo_recalibration_mov_file_ids: Mapped[list | None] = mapped_column(
        JSON, nullable=True
    )  # Specific MOV files flagged for recalibration
    mlgoo_recalibration_comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Grace Period & Auto-lock tracking
    # When set, BLGU has until this time to comply with rework/calibration
    grace_period_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # When deadline expires, BLGU is locked from editing and MLGOO is notified
    is_locked_for_deadline: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Per-Assessment Calculated Deadlines
    # Calculated dynamically when rework/calibration is triggered based on year's window config
    # rework_deadline = rework_requested_at + rework_window_days
    per_assessment_rework_deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # calibration_deadline = calibration_requested_at + calibration_window_days
    per_assessment_calibration_deadline: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )

    # Phase 1 Deadline Reminder Tracking
    # Tracks when automated deadline reminders were sent to avoid duplicates
    phase1_reminder_7d_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    phase1_reminder_3d_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    phase1_reminder_1d_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # Auto-submit tracking - when assessment was automatically submitted at deadline
    auto_submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # ==========================================================================
    # Per-Area Submission Tracking (Workflow Restructuring)
    # ==========================================================================
    # Per-area submission status tracking
    # Format: {"1": {"status": "approved", "submitted_at": "...", "assessor_id": "..."}, ...}
    # Status values: draft, submitted, in_review, rework, approved
    area_submission_status: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)

    # Per-area approval tracking (quick lookup)
    # Format: {"1": true, "2": false, ...}
    area_assessor_approved: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)

    # Rework round flag - True after first rework cycle
    # All 6 assessors' rework requests count as 1 round
    rework_round_used: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Calibration round flag - True after first calibration cycle
    # Validator can only request calibration once
    calibration_round_used: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Intelligence layer fields
    final_compliance_status: Mapped[ComplianceStatus | None] = mapped_column(
        Enum(ComplianceStatus, name="compliance_status_enum", create_constraint=True),
        nullable=True,
    )
    area_results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ai_recommendations: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # CapDev (Capacity Development) AI Insights (generated after MLGOO approval)
    # Structure: {
    #   "ceb": {"summary": "...", "recommendations": [...], "capacity_development_needs": [...],
    #           "suggested_interventions": [...], "priority_actions": [...], "generated_at": "..."},
    #   "en": {...}
    # }
    capdev_insights: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    capdev_insights_generated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    capdev_insights_status: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )  # 'pending', 'generating', 'completed', 'failed'

    # Foreign key to BLGU user
    blgu_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Assessment year - links to AssessmentYear.year
    # Each BLGU can have one assessment per year
    assessment_year: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assessment_years.year"),
        nullable=False,
        index=True,
    )

    # Assessor tracking - which assessor completed the review
    reviewed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    submitted_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    validated_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    blgu_user = relationship("User", foreign_keys=[blgu_user_id], back_populates="assessments")
    rework_requester = relationship("User", foreign_keys=[rework_requested_by], post_update=True)
    reviewer = relationship("User", foreign_keys=[reviewed_by], post_update=True)
    calibration_validator = relationship(
        "User", foreign_keys=[calibration_validator_id], post_update=True
    )
    # MLGOO approval relationships
    mlgoo_approver = relationship("User", foreign_keys=[mlgoo_approved_by], post_update=True)
    mlgoo_recalibration_requester = relationship(
        "User", foreign_keys=[mlgoo_recalibration_requested_by], post_update=True
    )
    responses = relationship(
        "AssessmentResponse", back_populates="assessment", cascade="all, delete-orphan"
    )
    bbi_results = relationship(
        "BBIResult", back_populates="assessment", cascade="all, delete-orphan"
    )
    mov_files = relationship("MOVFile", back_populates="assessment", cascade="all, delete-orphan")
    year_config: Mapped["AssessmentYear"] = relationship(
        "AssessmentYear", back_populates="assessments"
    )

    # Table constraints
    __table_args__ = (
        # Each BLGU can only have one assessment per year
        UniqueConstraint("blgu_user_id", "assessment_year", name="uq_assessment_blgu_year"),
    )

    # Validation methods (Epic 5.0)
    @validates("rework_count")
    def validate_rework_count(self, key, value):
        """
        Validate that rework_count does not exceed 1.

        Only one rework cycle is allowed per assessment in the Epic 5.0 workflow.

        Args:
            key: The attribute name being validated
            value: The new value for rework_count

        Returns:
            The validated value

        Raises:
            ValueError: If rework_count exceeds 1
        """
        if value > 1:
            raise ValueError(
                "rework_count cannot exceed 1. Only one rework cycle is allowed per assessment."
            )
        if value < 0:
            raise ValueError("rework_count cannot be negative.")
        return value

    @validates("mlgoo_recalibration_count")
    def validate_mlgoo_recalibration_count(self, key, value):
        """
        Validate that mlgoo_recalibration_count does not exceed 1.

        Only one MLGOO RE-calibration cycle is allowed per assessment.

        Args:
            key: The attribute name being validated
            value: The new value for mlgoo_recalibration_count

        Returns:
            The validated value

        Raises:
            ValueError: If mlgoo_recalibration_count exceeds 1
        """
        if value > 1:
            raise ValueError(
                "mlgoo_recalibration_count cannot exceed 1. Only one MLGOO RE-calibration cycle is allowed per assessment."
            )
        if value < 0:
            raise ValueError("mlgoo_recalibration_count cannot be negative.")
        return value

    # Helper properties (Epic 5.0)
    @property
    def can_request_rework(self) -> bool:
        """
        Check if rework can be requested for this assessment.

        Rework can only be requested if:
        1. The assessment is in SUBMITTED status (ready for review)
        2. The rework count is less than 1 (no rework has been requested yet)

        Returns:
            True if rework can be requested, False otherwise
        """
        return self.status == AssessmentStatus.SUBMITTED and self.rework_count < 1

    @property
    def is_locked(self) -> bool:
        """
        Check if the assessment is locked for editing by the BLGU user.

        An assessment is locked when it's in one of these states:
        - SUBMITTED: Submitted for assessor review
        - IN_REVIEW: Currently being reviewed by assessor
        - AWAITING_FINAL_VALIDATION: Awaiting validator final validation
        - AWAITING_MLGOO_APPROVAL: Awaiting MLGOO final approval
        - COMPLETED: Final validation complete

        OR when is_locked_for_deadline is True (grace period expired).
        OR when auto_submitted_at is set (assessment was auto-submitted at deadline).

        Locked assessments cannot be edited by BLGU users.

        Returns:
            True if assessment is locked, False otherwise (DRAFT or REWORK states)
        """
        # Check if locked due to deadline expiration
        if self.is_locked_for_deadline:
            return True
        # Check if auto-submitted at deadline
        if self.auto_submitted_at is not None:
            return True
        return self.status in [
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.IN_REVIEW,
            AssessmentStatus.AWAITING_FINAL_VALIDATION,
            AssessmentStatus.AWAITING_MLGOO_APPROVAL,
            AssessmentStatus.COMPLETED,
        ]

    @property
    def can_request_mlgoo_recalibration(self) -> bool:
        """
        Check if MLGOO RE-calibration can be requested for this assessment.

        RE-calibration can only be requested if:
        1. The assessment is in AWAITING_MLGOO_APPROVAL or COMPLETED status
        2. The MLGOO recalibration count is less than 1 (no recalibration has been requested yet)

        Returns:
            True if MLGOO RE-calibration can be requested, False otherwise
        """
        return (
            self.status in [AssessmentStatus.AWAITING_MLGOO_APPROVAL, AssessmentStatus.COMPLETED]
            and self.mlgoo_recalibration_count < 1
        )

    # ==========================================================================
    # Per-Area Submission Helper Methods
    # ==========================================================================
    def all_areas_approved(self) -> bool:
        """
        Check if all 6 governance areas are approved by assessors.

        Returns:
            True if all 6 areas are approved, False otherwise
        """
        if not self.area_assessor_approved:
            return False
        return all(self.area_assessor_approved.get(str(i), False) for i in range(1, 7))

    def get_area_status(self, governance_area_id: int) -> str:
        """
        Get the status of a specific governance area.

        Args:
            governance_area_id: The governance area ID (1-6)

        Returns:
            Status string: draft, submitted, in_review, rework, or approved
        """
        if not self.area_submission_status:
            return "draft"
        area_data = self.area_submission_status.get(str(governance_area_id), {})
        return area_data.get("status", "draft")

    def can_assessor_request_rework(self) -> bool:
        """
        Check if assessors can still request rework for this assessment.

        Rework can only be requested once. After the rework round is used,
        assessors can only approve.

        Returns:
            True if rework can be requested, False otherwise
        """
        return not self.rework_round_used

    def can_validator_request_calibration(self) -> bool:
        """
        Check if the validator can still request calibration for this assessment.

        Calibration can only be requested once per assessment.
        After the calibration round is used, validator can only approve.

        Returns:
            True if calibration can be requested, False otherwise
        """
        return not self.calibration_round_used

    def get_areas_in_rework(self) -> list[int]:
        """
        Get list of governance area IDs that are currently in rework status.

        Returns:
            List of governance area IDs (1-6) that need rework
        """
        if not self.area_submission_status:
            return []
        return [
            int(area_id)
            for area_id, data in self.area_submission_status.items()
            if isinstance(data, dict) and data.get("status") == "rework"
        ]

    def get_areas_pending_review(self) -> list[int]:
        """
        Get list of governance area IDs waiting for assessor review.

        Returns:
            List of governance area IDs (1-6) that are submitted but not yet approved
        """
        if not self.area_submission_status:
            return []
        return [
            int(area_id)
            for area_id, data in self.area_submission_status.items()
            if isinstance(data, dict) and data.get("status") in ("submitted", "in_review")
        ]


class AssessmentResponse(Base):
    """
    AssessmentResponse table model for database storage.

    Represents a BLGU user's response to a specific indicator.
    Stores dynamic form data and tracks completion status.
    """

    __tablename__ = "assessment_responses"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Dynamic form data stored as JSON
    response_data: Mapped[dict] = mapped_column(JSON, nullable=True)

    # Completion status
    is_completed: Mapped[bool] = mapped_column(default=False, nullable=False)
    requires_rework: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Calibration flag (set by validator via toggle)
    # When True, this indicator is explicitly flagged for calibration/rework
    # Independent of validation_status (Met/Unmet) - gives validator direct control
    flagged_for_calibration: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Validation status (set by assessor)
    validation_status: Mapped[ValidationStatus] = mapped_column(
        Enum(ValidationStatus, name="validation_status_enum", create_constraint=True),
        nullable=True,
    )

    # Generated remark (from remark_schema template)
    generated_remark: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Assessor's manual remarks for validators
    assessor_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Foreign keys
    assessment_id: Mapped[int] = mapped_column(ForeignKey("assessments.id"), nullable=False)
    indicator_id: Mapped[int] = mapped_column(ForeignKey("indicators.id"), nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    assessment = relationship("Assessment", back_populates="responses")
    indicator = relationship("Indicator", back_populates="responses")
    movs = relationship("MOV", back_populates="response", cascade="all, delete-orphan")
    feedback_comments = relationship(
        "FeedbackComment", back_populates="response", cascade="all, delete-orphan"
    )


class MOV(Base):
    """
    MOV (Means of Verification) table model for database storage.

    Represents uploaded files that serve as evidence for assessment responses.
    """

    __tablename__ = "movs"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # File information
    filename: Mapped[str] = mapped_column(String, nullable=False)
    original_filename: Mapped[str] = mapped_column(String, nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    content_type: Mapped[str] = mapped_column(String, nullable=False)

    # Supabase storage path
    storage_path: Mapped[str] = mapped_column(String, nullable=False)

    # File status
    status: Mapped[MOVStatus] = mapped_column(
        Enum(MOVStatus, name="mov_status_enum", create_constraint=True),
        nullable=False,
        default=MOVStatus.UPLOADED,
    )

    # Foreign key to assessment response
    response_id: Mapped[int] = mapped_column(ForeignKey("assessment_responses.id"), nullable=False)

    # Timestamps
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    response = relationship("AssessmentResponse", back_populates="movs")


class MOVFile(Base):
    """
    MOVFile (Means of Verification File) table model for database storage.

    Represents uploaded files stored in Supabase Storage that serve as evidence
    for specific indicators within an assessment. This model supports the new
    MOV upload system (Epic 4.0) with direct indicator-level file management.

    Path structure in Supabase Storage: {assessment_id}/{indicator_id}/{file_name}
    """

    __tablename__ = "mov_files"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Foreign keys
    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    indicator_id: Mapped[int] = mapped_column(
        ForeignKey("indicators.id", ondelete="CASCADE"), nullable=False, index=True
    )
    uploaded_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # File metadata
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    file_url: Mapped[str] = mapped_column(String, nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)  # Size in bytes
    field_id: Mapped[str | None] = mapped_column(
        String, nullable=True
    )  # Field identifier for multi-field uploads

    # Timestamps
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, index=True
    )  # Soft delete support

    # Relationships
    assessment = relationship("Assessment", back_populates="mov_files")
    indicator = relationship("Indicator", back_populates="mov_files")
    uploader = relationship("User", foreign_keys=[uploaded_by])


class FeedbackComment(Base):
    """
    FeedbackComment table model for database storage.

    Represents assessor feedback on specific assessment responses.
    Used for rework workflow and communication.
    """

    __tablename__ = "feedback_comments"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Comment content
    comment: Mapped[str] = mapped_column(Text, nullable=False)

    # Comment type (general feedback, specific issue, etc.)
    comment_type: Mapped[str] = mapped_column(String, nullable=False, default="general")

    # Internal note flag - distinguishes internal assessor notes from public feedback
    is_internal_note: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Foreign keys
    response_id: Mapped[int] = mapped_column(ForeignKey("assessment_responses.id"), nullable=False)
    assessor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    response = relationship("AssessmentResponse", back_populates="feedback_comments")
    assessor = relationship("User", back_populates="feedback_comments")


class MOVAnnotation(Base):
    """
    MOVAnnotation table model for database storage.

    Represents annotations (highlights, comments, rectangles) made by assessors
    on MOV files (PDFs and images). Supports both PDF text highlights and
    image rectangle annotations with associated comments.
    """

    __tablename__ = "mov_annotations"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Foreign keys
    mov_file_id: Mapped[int] = mapped_column(
        ForeignKey("mov_files.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assessor_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Annotation type: 'pdfRect' for PDFs, 'imageRect' for images
    annotation_type: Mapped[str] = mapped_column(String(20), nullable=False)

    # Page number (for PDFs, 0-indexed)
    page: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Primary rectangle coordinates (stored as percentages for responsive rendering)
    # Format: {x: float, y: float, w: float, h: float}
    rect: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Multi-line rectangles for PDF text selections (array of rect objects)
    # Format: [{x: float, y: float, w: float, h: float}, ...]
    rects: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Comment text associated with the annotation
    comment: Mapped[str] = mapped_column(Text, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    mov_file = relationship("MOVFile", backref="annotations")
    assessor = relationship("User", foreign_keys=[assessor_id])
