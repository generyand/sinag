# 📋 Assessment Database Models
# SQLAlchemy models for assessment-related tables

from datetime import datetime

from app.db.base import Base
from app.db.enums import AssessmentStatus, ComplianceStatus, MOVStatus, ValidationStatus
from sqlalchemy import JSON, Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates


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

    # Rework tracking (Epic 5.0)
    rework_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rework_requested_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    rework_requested_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    rework_comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Intelligence layer fields
    final_compliance_status: Mapped[ComplianceStatus | None] = mapped_column(
        Enum(ComplianceStatus, name="compliance_status_enum", create_constraint=True),
        nullable=True,
    )
    area_results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ai_recommendations: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Foreign key to BLGU user
    blgu_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Assessor tracking - which assessor completed the review
    reviewed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    submitted_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    validated_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    blgu_user = relationship("User", foreign_keys=[blgu_user_id], back_populates="assessments")
    rework_requester = relationship(
        "User", foreign_keys=[rework_requested_by], post_update=True
    )
    reviewer = relationship(
        "User", foreign_keys=[reviewed_by], post_update=True
    )
    responses = relationship(
        "AssessmentResponse", back_populates="assessment", cascade="all, delete-orphan"
    )
    bbi_results = relationship(
        "BBIResult", back_populates="assessment", cascade="all, delete-orphan"
    )
    mov_files = relationship(
        "MOVFile", back_populates="assessment", cascade="all, delete-orphan"
    )

    # Validation methods (Epic 5.0)
    @validates('rework_count')
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
        - COMPLETED: Final validation complete

        Locked assessments cannot be edited by BLGU users.

        Returns:
            True if assessment is locked, False otherwise (DRAFT or REWORK states)
        """
        return self.status in [
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.IN_REVIEW,
            AssessmentStatus.AWAITING_FINAL_VALIDATION,
            AssessmentStatus.COMPLETED,
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
    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id"), nullable=False
    )
    indicator_id: Mapped[int] = mapped_column(
        ForeignKey("indicators.id"), nullable=False
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
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
    response_id: Mapped[int] = mapped_column(
        ForeignKey("assessment_responses.id"), nullable=False
    )

    # Timestamps
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

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
    field_id: Mapped[str | None] = mapped_column(String, nullable=True)  # Field identifier for multi-field uploads

    # Timestamps
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
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
    is_internal_note: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # Foreign keys
    response_id: Mapped[int] = mapped_column(
        ForeignKey("assessment_responses.id"), nullable=False
    )
    assessor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

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
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    mov_file = relationship("MOVFile", backref="annotations")
    assessor = relationship("User", foreign_keys=[assessor_id])
