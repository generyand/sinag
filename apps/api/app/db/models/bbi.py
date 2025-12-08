# 🏛️ BBI Database Models
# SQLAlchemy models for BBI (Barangay-based Institutions) tables

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


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
    BBIResult stores the calculated BBI functionality for a specific barangay and year.

    Per DILG MC 2024-417, BBI functionality is based on compliance rate:
    - 75-100%: HIGHLY_FUNCTIONAL
    - 50-74%: MODERATELY_FUNCTIONAL
    - 1-49%: LOW_FUNCTIONAL
    - 0%: NON_FUNCTIONAL

    Compliance is calculated based on validator decisions (AssessmentResponse.validation_status)
    for sub-indicators of each BBI indicator.

    Compliance rate = (Passed Sub-Indicators / Total Sub-Indicators) × 100%
    """

    __tablename__ = "bbi_results"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Direct links for efficient queries
    barangay_id: Mapped[int] = mapped_column(
        ForeignKey("barangays.id"), nullable=False, index=True
    )
    assessment_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    # Reference to the assessment that triggered this calculation
    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id"), nullable=False, index=True
    )

    # BBI type (e.g., BDRRMC, BADAC, etc.)
    bbi_id: Mapped[int] = mapped_column(ForeignKey("bbis.id"), nullable=False, index=True)

    # Parent BBI indicator (e.g., 2.1, 3.1, etc.) - for audit trail
    indicator_id: Mapped[int] = mapped_column(
        ForeignKey("indicators.id"), nullable=False, index=True
    )

    # Compliance data (4-tier system)
    compliance_percentage: Mapped[float] = mapped_column(
        Float, nullable=False, comment="Compliance rate 0-100%"
    )
    compliance_rating: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        comment="4-tier rating: HIGHLY_FUNCTIONAL, MODERATELY_FUNCTIONAL, LOW_FUNCTIONAL, NON_FUNCTIONAL",
    )
    sub_indicators_passed: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="Number of sub-indicators that passed"
    )
    sub_indicators_total: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="Total number of sub-indicators evaluated"
    )
    sub_indicator_results: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, comment="Detailed pass/fail results for each sub-indicator"
    )

    # Timestamps
    calculated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=func.now())

    # Relationships
    barangay = relationship("Barangay", back_populates="bbi_results")
    assessment = relationship("Assessment", back_populates="bbi_results")
    bbi = relationship("BBI", back_populates="bbi_results")
    indicator = relationship("Indicator")

    # Unique constraint: One result per barangay + year + BBI type
    __table_args__ = (
        UniqueConstraint(
            "barangay_id",
            "assessment_year",
            "bbi_id",
            name="uq_bbi_result_per_barangay_year_bbi",
        ),
    )
