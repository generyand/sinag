# 🏛️ BBI Database Models
# SQLAlchemy models for BBI (Barangay-based Institutions) tables

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enums import BBIStatus


class BBI(Base):
    """
    BBI (Barangay-based Institutions) table model for database storage.

    Represents a BBI configuration with its mapping rules that determine
    whether the BBI is Functional or Non-Functional based on indicator statuses.

    Each BBI belongs to a specific governance area and contains mapping_rules (JSON)
    that define the logic for calculating the BBI status.
    """

    __tablename__ = "bbis"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # BBI information
    name: Mapped[str] = mapped_column(String, nullable=False)
    abbreviation: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Active status (for soft delete)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Mapping rules stored as JSON
    # Defines the logic for how indicator statuses map to BBI Functional/Non-Functional status
    mapping_rules: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Foreign key to governance area
    governance_area_id: Mapped[int] = mapped_column(
        ForeignKey("governance_areas.id"), nullable=False, index=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )

    # Relationships
    governance_area = relationship("GovernanceArea", back_populates="bbis")
    bbi_results = relationship("BBIResult", back_populates="bbi", cascade="all, delete-orphan")


class BBIResult(Base):
    """
    BBIResult table model for database storage.

    Stores the calculated compliance status of a BBI for a specific assessment.
    Per DILG MC 2024-417, BBI functionality is based on compliance rate:
    - 75-100%: HIGHLY_FUNCTIONAL
    - 50-74%: MODERATELY_FUNCTIONAL
    - <50%: LOW_FUNCTIONAL

    Compliance rate = (Passed Sub-Indicators / Total Sub-Indicators) × 100%
    """

    __tablename__ = "bbi_results"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Legacy BBI status result (kept for backward compatibility)
    status: Mapped[BBIStatus] = mapped_column(
        Enum(BBIStatus, name="bbi_status_enum", create_constraint=True),
        nullable=False,
    )

    # New compliance fields (DILG MC 2024-417)
    compliance_percentage: Mapped[float | None] = mapped_column(
        Float, nullable=True, comment="Compliance rate 0-100%"
    )
    compliance_rating: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
        comment="3-tier rating: HIGHLY_FUNCTIONAL, MODERATELY_FUNCTIONAL, LOW_FUNCTIONAL",
    )
    sub_indicators_passed: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="Number of sub-indicators that passed"
    )
    sub_indicators_total: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="Total number of sub-indicators evaluated"
    )
    sub_indicator_results: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, comment="Detailed pass/fail results for each sub-indicator"
    )

    # Calculation details (optional JSON field for debugging/audit trail)
    calculation_details: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Foreign keys
    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id"), nullable=False, index=True
    )
    bbi_id: Mapped[int] = mapped_column(ForeignKey("bbis.id"), nullable=False, index=True)

    # Timestamps
    calculation_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=func.now())

    # Relationships
    assessment = relationship("Assessment", back_populates="bbi_results")
    bbi = relationship("BBI", back_populates="bbi_results")
