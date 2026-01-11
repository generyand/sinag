# 📊 Assessment Activity Database Model
# SQLAlchemy model for tracking assessment workflow activities
# Provides audit trail for submissions, approvals, validations, etc.

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AssessmentActivity(Base):
    """
    Assessment activity log for tracking workflow events.

    Records all significant assessment workflow actions including:
    - Submissions (initial and rework)
    - Reviews (assessor starting review)
    - Rework requests
    - Validations (validator pass/fail)
    - Calibration requests
    - MLGOO approvals and recalibrations

    This provides a complete timeline of assessment progress.
    """

    __tablename__ = "assessment_activities"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Foreign keys
    assessment_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assessments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Activity details
    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    # Possible actions:
    # - "created" - Assessment created
    # - "submitted" - Initial submission by BLGU
    # - "review_started" - Assessor started review
    # - "rework_requested" - Assessor requested rework
    # - "rework_submitted" - BLGU resubmitted after rework
    # - "review_completed" - Assessor completed review
    # - "validation_started" - Validator started validation
    # - "calibration_requested" - Validator requested calibration
    # - "calibration_submitted" - BLGU resubmitted after calibration
    # - "validation_completed" - Validator completed validation
    # - "approved" - MLGOO approved assessment
    # - "recalibration_requested" - MLGOO requested recalibration
    # - "recalibration_submitted" - BLGU resubmitted after recalibration
    # - "completed" - Assessment workflow completed

    # Status transition
    from_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Additional context (comments, feedback summary, etc.)
    extra_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # extra_data can include:
    # - "comments": User comments/notes
    # - "indicators_reviewed": Count of indicators reviewed
    # - "pass_count", "fail_count": Validation counts
    # - "governance_area_id": For calibration actions
    # - "barangay_name": For easier querying/display

    # Human-readable description
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    assessment = relationship("Assessment", backref="activities")
    user = relationship("User")

    # Indexes for efficient queries
    __table_args__ = (
        Index("ix_assessment_activities_created_at_desc", created_at.desc()),
        Index("ix_assessment_activities_assessment_action", assessment_id, action),
        Index("ix_assessment_activities_user_action", user_id, action),
    )

    def __repr__(self):
        return f"<AssessmentActivity(id={self.id}, assessment_id={self.assessment_id}, action='{self.action}')>"
