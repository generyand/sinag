# 🏛️ Governance Area Database Model
# SQLAlchemy model for the governance_areas table

from datetime import datetime
from uuid import UUID, uuid4

from app.db.base import Base
from app.db.enums import AreaType
from sqlalchemy import JSON, Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional


class GovernanceArea(Base):
    """
    Governance Area table model for database storage.

    Represents the SGLGB governance areas that Validators can be assigned to.
    Each area has a type: Core or Essential
    """

    __tablename__ = "governance_areas"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Area information
    name = Column(String, nullable=False, unique=True)
    area_type: AreaType = Column(
        Enum(AreaType, name="area_type_enum", create_constraint=True), nullable=False
    )

    # Relationships
    validators = relationship("User", back_populates="validator_area")
    indicators = relationship("Indicator", back_populates="governance_area")
    bbis = relationship("BBI", back_populates="governance_area")


class Indicator(Base):
    """
    Indicator table model for database storage.

    Represents assessment indicators within governance areas.
    Each indicator has a dynamic form schema that defines the input fields.

    Versioning Support:
    - version: Tracks the current version number of the indicator
    - When schemas are modified, a new version is created and old version is archived
    - Historical versions are stored in indicators_history table
    """

    __tablename__ = "indicators"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Indicator information
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=True)

    # Versioning field
    version: Mapped[int] = mapped_column(nullable=False, default=1)

    # Active status (for soft delete)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)

    # Auto-calculable flag - determines if Pass/Fail is calculated automatically
    is_auto_calculable: Mapped[bool] = mapped_column(nullable=False, default=False)

    # Profiling-only flag (existing field retained for compatibility)
    is_profiling_only: Mapped[bool] = mapped_column(nullable=False, default=False)

    # Dynamic form schema stored as JSON (existing field, now nullable for migration)
    form_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Calculation schema for automatic Pass/Fail determination
    calculation_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Remark schema for generating human-readable status summaries
    remark_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Technical notes (plain text for backward compatibility)
    technical_notes_text: Mapped[str | None] = mapped_column(String, nullable=True)

    # Foreign key to governance area
    governance_area_id: Mapped[int] = mapped_column(
        ForeignKey("governance_areas.id"), nullable=False
    )

    # Self-referencing hierarchy
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("indicators.id"), nullable=True
    )

    # Hierarchical tree fields (Phase 6)
    indicator_code: Mapped[str | None] = mapped_column(
        String(50), nullable=True, index=True
    )  # e.g., "1.1", "1.1.1", "2.3.4"

    sort_order: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=0
    )  # For maintaining tree order within siblings

    selection_mode: Mapped[str | None] = mapped_column(
        String(20), nullable=True, default='none'
    )  # 'single', 'multiple', 'none'

    # MOV checklist items (JSON array) - Phase 6
    mov_checklist_items: Mapped[dict | None] = mapped_column(
        JSON, nullable=True
    )  # Array of MOV item configurations

    # Hard-coded indicator fields (added for simplified approach)
    validation_rule: Mapped[str] = mapped_column(
        String(50), nullable=False, server_default='ALL_ITEMS_REQUIRED'
    )  # Validation strategy: ALL_ITEMS_REQUIRED, ANY_ITEM_REQUIRED, CUSTOM
    is_bbi: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default='false'
    )  # Is this a BBI indicator
    effective_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )  # When this version became active
    retired_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )  # When this version was retired

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    # Relationships
    governance_area = relationship("GovernanceArea", back_populates="indicators")
    responses = relationship("AssessmentResponse", back_populates="indicator")
    parent: Mapped[Optional["Indicator"]] = relationship(
        "Indicator",
        remote_side="Indicator.id",
        back_populates="children",
    )
    children: Mapped[list["Indicator"]] = relationship(
        "Indicator",
        back_populates="parent",
        cascade="all, delete-orphan",
    )
    history = relationship("IndicatorHistory", back_populates="indicator")
    deadline_overrides = relationship("DeadlineOverride", back_populates="indicator")
    mov_files = relationship("MOVFile", back_populates="indicator")
    checklist_items = relationship("ChecklistItem", back_populates="indicator", cascade="all, delete-orphan")


class IndicatorHistory(Base):
    """
    IndicatorHistory table model for database storage.

    Stores historical versions of indicators to maintain data integrity.
    When an indicator's schemas are modified, the old version is archived here
    to ensure existing assessments continue to reference the correct schema version.
    """

    __tablename__ = "indicators_history"
    __table_args__ = (
        UniqueConstraint('indicator_id', 'version', name='uq_indicator_version'),
    )

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Foreign key to the current indicator
    indicator_id: Mapped[int] = mapped_column(
        ForeignKey("indicators.id"), nullable=False, index=True
    )

    # Version number of this archived indicator
    version: Mapped[int] = mapped_column(nullable=False)

    # Indicator information (snapshot at time of archival)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)

    # Active status at time of archival
    is_active: Mapped[bool] = mapped_column(nullable=False)

    # Auto-calculable flag
    is_auto_calculable: Mapped[bool] = mapped_column(nullable=False)

    # Profiling-only flag
    is_profiling_only: Mapped[bool] = mapped_column(nullable=False)

    # Archived schema snapshots (JSONB fields)
    form_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    calculation_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    remark_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    technical_notes_text: Mapped[str | None] = mapped_column(String, nullable=True)

    # Hierarchical tree fields (archived snapshot - Phase 6)
    indicator_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sort_order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    selection_mode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    mov_checklist_items: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Foreign keys preserved from original indicator
    governance_area_id: Mapped[int] = mapped_column(nullable=False)
    parent_id: Mapped[int | None] = mapped_column(nullable=True)

    # Original timestamps from indicator
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # Archive metadata
    archived_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    archived_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    # Relationships
    indicator = relationship("Indicator", back_populates="history")
    archived_by_user = relationship("User", foreign_keys=[archived_by])


class IndicatorDraft(Base):
    """
    IndicatorDraft table model for database storage.

    Stores draft versions of indicator hierarchies during the creation wizard process.
    Supports auto-save functionality with optimistic locking to prevent concurrent edit conflicts.
    """

    __tablename__ = "indicator_drafts"

    # Primary key
    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        primary_key=True,
        default=lambda: uuid4()
    )

    # User who created the draft
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )

    # Governance area for this indicator set
    governance_area_id: Mapped[int] = mapped_column(
        ForeignKey("governance_areas.id"), nullable=False, index=True
    )

    # Wizard state
    creation_mode: Mapped[str] = mapped_column(String(50), nullable=False)
    current_step: Mapped[int] = mapped_column(nullable=False, default=1)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="in_progress"
    )

    # Draft data stored as JSONB (array of indicator nodes)
    data: Mapped[dict] = mapped_column(
        JSON, nullable=False, server_default="[]"
    )

    # Optional title for the draft
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_accessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Optimistic locking
    version: Mapped[int] = mapped_column(nullable=False, default=1)

    # Draft locking to prevent concurrent edits
    lock_token: Mapped[UUID | None] = mapped_column(
        PostgresUUID(as_uuid=True), nullable=True
    )
    locked_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    locked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    governance_area = relationship("GovernanceArea")
    locked_by_user = relationship("User", foreign_keys=[locked_by_user_id])


class ChecklistItem(Base):
    """
    ChecklistItem table model for database storage.

    Represents individual checklist items within an indicator's MOV checklist.
    Used for hard-coded indicators where checklists are defined in Python code
    and seeded into the database.

    Replaces the JSONB mov_checklist_items approach with a normalized table structure.
    """

    __tablename__ = "checklist_items"
    __table_args__ = (
        UniqueConstraint('indicator_id', 'item_id', name='uq_indicator_item_id'),
    )

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Foreign key to indicator
    indicator_id: Mapped[int] = mapped_column(
        ForeignKey("indicators.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Item identifier (e.g., "1_1_1_a", "1_1_1_b")
    item_id: Mapped[str] = mapped_column(String(20), nullable=False)

    # Display text (e.g., "a. Barangay Financial Report")
    label: Mapped[str] = mapped_column(String, nullable=False)

    # Optional group name for visual organization (e.g., "ANNUAL REPORT", "QUARTERLY REPORT")
    group_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Means of Verification description (right column text)
    mov_description: Mapped[str | None] = mapped_column(String, nullable=True)

    # Required for indicator to pass
    required: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default='true')

    # Requires document count input from validator
    requires_document_count: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default='false')

    # Sort order within indicator
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default='0')

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    indicator = relationship("Indicator", back_populates="checklist_items")
