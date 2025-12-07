# 🔧 System Database Models
# SQLAlchemy models for system-wide configuration and settings

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class AssessmentYearConfig(Base):
    """
    Assessment Year Configuration table model.

    Stores the current assessment year and period settings for the SGLGB system.
    This controls the dynamic year placeholders used throughout indicator definitions.

    Key Features:
    - Only ONE record should be active at any time (is_active=True)
    - When a new year is activated, the previous active year is deactivated
    - Historical year configs are preserved for audit purposes

    Year Placeholders Supported:
    - {CURRENT_YEAR} → current_assessment_year (e.g., 2025)
    - {PREVIOUS_YEAR} → current_assessment_year - 1 (e.g., 2024)
    - {JAN_OCT_CURRENT_YEAR} → "January to October {CURRENT_YEAR}"
    - {JUL_SEP_CURRENT_YEAR} → "July-September {CURRENT_YEAR}"
    - {Q1_Q3_CURRENT_YEAR} → "1st to 3rd quarter of CY {CURRENT_YEAR}"
    - {DEC_31_CURRENT_YEAR} → "December 31, {CURRENT_YEAR}"
    - {DEC_31_PREVIOUS_YEAR} → "December 31, {PREVIOUS_YEAR}"
    - {CY_CURRENT_YEAR} → "CY {CURRENT_YEAR}"
    - {CY_PREVIOUS_YEAR} → "CY {PREVIOUS_YEAR}"
    """

    __tablename__ = "assessment_year_configs"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Assessment year (e.g., 2025)
    current_assessment_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    # Assessment period boundaries
    # Typically January 1 to October 31 of the assessment year
    assessment_period_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    assessment_period_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # Active status - only ONE config should be active at a time
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)

    # Optional description/notes for this year configuration
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Audit timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Activation tracking
    activated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    activated_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    deactivated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    deactivated_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    activated_by = relationship("User", foreign_keys=[activated_by_id])
    deactivated_by = relationship("User", foreign_keys=[deactivated_by_id])

    def __repr__(self) -> str:
        return (
            f"<AssessmentYearConfig(year={self.current_assessment_year}, active={self.is_active})>"
        )


class AssessmentIndicatorSnapshot(Base):
    """
    Assessment Indicator Snapshot table model.

    Stores the EXACT indicator definition used for a specific assessment,
    with all dynamic year placeholders resolved to concrete values.

    This ensures historical assessments maintain data integrity even when:
    - Indicator definitions are updated (new form_schema, calculation_schema, etc.)
    - The assessment year changes (new current_assessment_year)
    - Checklist items are modified

    The snapshot is created when an assessment is SUBMITTED, capturing:
    - The indicator version at submission time
    - All schemas with year placeholders resolved
    - The assessment year used for resolution

    Historical assessments should ALWAYS reference this snapshot, never the
    current indicator definition.
    """

    __tablename__ = "assessment_indicator_snapshots"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Foreign keys
    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    indicator_id: Mapped[int] = mapped_column(
        ForeignKey("indicators.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Version tracking
    indicator_version: Mapped[int] = mapped_column(Integer, nullable=False)
    assessment_year: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # Year used for placeholder resolution

    # Indicator identity (snapshot)
    indicator_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)

    # Indicator flags (snapshot)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False)
    is_auto_calculable: Mapped[bool] = mapped_column(Boolean, nullable=False)
    is_profiling_only: Mapped[bool] = mapped_column(Boolean, nullable=False)
    is_bbi: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    validation_rule: Mapped[str] = mapped_column(String(50), nullable=False)

    # Resolved schemas (with all {YEAR} placeholders replaced)
    # These contain the EXACT text shown to users at submission time
    form_schema_resolved: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    calculation_schema_resolved: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    remark_schema_resolved: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    technical_notes_resolved: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Resolved checklist items (JSON array with resolved text)
    checklist_items_resolved: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Hierarchy info (snapshot)
    governance_area_id: Mapped[int] = mapped_column(Integer, nullable=False)
    parent_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Snapshot metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    # Relationships
    assessment = relationship("Assessment", backref="indicator_snapshots")
    indicator = relationship("Indicator")

    def __repr__(self) -> str:
        return (
            f"<AssessmentIndicatorSnapshot("
            f"assessment_id={self.assessment_id}, "
            f"indicator_id={self.indicator_id}, "
            f"year={self.assessment_year})>"
        )
