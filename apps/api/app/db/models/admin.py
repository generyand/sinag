# 🔒 Administrative Features Database Models
# SQLAlchemy models for admin-specific tables (audit logs, assessment cycles, BBI, etc.)

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base


class AuditLog(Base):
    """
    Audit log table for tracking all administrative actions.

    This table maintains a comprehensive audit trail of all changes
    made by MLGOO-DILG users to indicators, BBIs, deadlines, and
    other administrative configurations.
    """

    __tablename__ = "audit_logs"

    # Primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Who made the change
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # What entity was changed
    entity_type = Column(
        String(50), nullable=False, index=True
    )  # e.g., "indicator", "bbi", "deadline_override"
    entity_id = Column(
        Integer, nullable=True, index=True
    )  # FK to the entity (may be null for bulk operations)

    # What action was performed
    action = Column(String(50), nullable=False)  # e.g., "create", "update", "delete", "deactivate"

    # What changed (JSON diff of before/after states)
    # Use JSON.with_variant() to support both PostgreSQL (JSONB) and SQLite (JSON)
    changes = Column(
        JSON().with_variant(JSONB(astext_type=Text), "postgresql"),  # type: ignore[arg-type]
        nullable=True,
    )  # Store structured change data: {"field": {"before": X, "after": Y}}

    # Request metadata
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6

    # Timestamp
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User")

    # Composite indexes for efficient queries
    __table_args__ = (
        Index("ix_audit_logs_created_at_desc", created_at.desc()),  # For time-based sorting
        Index("ix_audit_logs_entity_lookup", entity_type, entity_id),  # For entity-specific queries
    )

    def __repr__(self):
        return f"<AuditLog(id={self.id}, user_id={self.user_id}, entity_type='{self.entity_type}', action='{self.action}')>"


class AssessmentCycle(Base):
    """
    Assessment cycle table for managing assessment periods and deadlines.

    This table defines the assessment cycles (e.g., "SGLGB 2025") with
    phase-specific deadlines for Phase 1, Rework, Phase 2, and Calibration.
    Only one cycle can be active at a time.
    """

    __tablename__ = "assessment_cycles"

    # Primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Cycle information
    name = Column(String(100), nullable=False)  # e.g., "SGLGB 2025"
    year = Column(SmallInteger, nullable=False, index=True)  # e.g., 2025

    # Phase deadlines (all stored in UTC)
    phase1_deadline = Column(DateTime(timezone=True), nullable=False)  # Initial submission deadline
    rework_deadline = Column(DateTime(timezone=True), nullable=False)  # Rework submission deadline
    phase2_deadline = Column(DateTime(timezone=True), nullable=False)  # Final submission deadline
    calibration_deadline = Column(
        DateTime(timezone=True), nullable=False
    )  # Calibration/validation deadline

    # Active status (only one cycle can be active)
    is_active = Column(Boolean, nullable=False, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    deadline_overrides = relationship(
        "DeadlineOverride", back_populates="cycle", cascade="all, delete-orphan"
    )

    # Indexes for efficient queries
    __table_args__ = (
        Index("ix_assessment_cycles_is_active", is_active),  # Fast active cycle lookup
        Index("ix_assessment_cycles_year_desc", year.desc()),  # Year-based queries
        # Partial unique index: Only one cycle can have is_active=True
        # This prevents multiple active cycles at the same time
        Index(
            "uq_assessment_cycles_single_active",
            is_active,
            unique=True,
            postgresql_where=(is_active == True),  # noqa: E712 - SQLAlchemy requires == not is
        ),
    )

    def __repr__(self):
        return f"<AssessmentCycle(id={self.id}, name='{self.name}', year={self.year}, is_active={self.is_active})>"


class DeadlineOverride(Base):
    """
    Deadline override table for tracking deadline extensions.

    This table records when MLGOO-DILG admins extend deadlines for specific
    barangays and indicators. Each override includes the original deadline,
    new deadline, and justification reason for audit purposes.
    """

    __tablename__ = "deadline_overrides"

    # Primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Foreign keys
    cycle_id = Column(Integer, ForeignKey("assessment_cycles.id"), nullable=False, index=True)
    barangay_id = Column(Integer, ForeignKey("barangays.id"), nullable=False, index=True)
    indicator_id = Column(Integer, ForeignKey("indicators.id"), nullable=False, index=True)
    created_by = Column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )  # MLGOO-DILG user who created the override

    # Deadline information
    original_deadline = Column(DateTime(timezone=True), nullable=False)  # Original phase deadline
    new_deadline = Column(DateTime(timezone=True), nullable=False)  # Extended deadline

    # Justification
    reason = Column(Text, nullable=False)  # Required reason for extension

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    cycle = relationship("AssessmentCycle", back_populates="deadline_overrides")
    barangay = relationship("Barangay", back_populates="deadline_overrides")
    indicator = relationship("Indicator", back_populates="deadline_overrides")
    creator = relationship(
        "User", back_populates="created_deadline_overrides", foreign_keys=[created_by]
    )

    # Composite indexes for efficient queries
    __table_args__ = (
        Index(
            "ix_deadline_overrides_barangay_indicator",
            barangay_id,
            indicator_id,
        ),  # Lookup overrides for specific barangay-indicator pairs
        Index(
            "ix_deadline_overrides_created_at_desc", created_at.desc()
        ),  # Time-based audit queries
        Index(
            "ix_deadline_overrides_cycle_barangay", cycle_id, barangay_id
        ),  # Cycle-specific queries
    )

    def __repr__(self):
        return f"<DeadlineOverride(id={self.id}, barangay_id={self.barangay_id}, indicator_id={self.indicator_id}, new_deadline='{self.new_deadline}')>"


class AssessmentDeadlineExtension(Base):
    """
    Assessment-level deadline extensions granted by MLGOO.

    Tracks when MLGOO extends a specific assessment's rework or
    calibration deadline beyond the calculated window. This is different
    from DeadlineOverride which is per-indicator. This table provides
    assessment-wide deadline extensions.

    Each extension includes:
    - Which assessment and what type of deadline (rework/calibration)
    - Original deadline (calculated from window) vs new deadline
    - How many days were added
    - Required justification reason for audit
    - Who granted the extension
    """

    __tablename__ = "assessment_deadline_extensions"

    # Primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Foreign keys
    assessment_id = Column(
        Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    extended_by = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )  # MLGOO user who granted extension

    # Extension details
    extension_type = Column(String(20), nullable=False)  # 'rework' or 'calibration'
    original_deadline = Column(DateTime(timezone=True), nullable=False)
    new_deadline = Column(DateTime(timezone=True), nullable=False)
    additional_days = Column(Integer, nullable=False)  # How many days added

    # Audit
    reason = Column(Text, nullable=False)  # Required justification
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    assessment = relationship("Assessment", backref="deadline_extensions")
    extender = relationship("User", foreign_keys=[extended_by])

    # Indexes and constraints
    __table_args__ = (
        Index("ix_assessment_deadline_extensions_assessment", assessment_id),
        Index("ix_assessment_deadline_extensions_created_at_desc", created_at.desc()),
        CheckConstraint(
            "extension_type IN ('rework', 'calibration')",
            name="ck_extension_type_valid",
        ),
    )

    def __repr__(self):
        return f"<AssessmentDeadlineExtension(id={self.id}, assessment_id={self.assessment_id}, type='{self.extension_type}', days={self.additional_days})>"
