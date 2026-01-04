# Municipal Office Database Model
# SQLAlchemy model for municipal_offices table

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MunicipalOffice(Base):
    """
    Municipal Office table model for database storage.

    Represents municipal offices that provide oversight and support
    to barangays within specific governance areas.

    Examples: MBO, MTO, MAO (Financial), LDRRMO (Disaster),
    MSWDO (Social Protection), BPLO (Business), MENRO (Environment)
    """

    __tablename__ = "municipal_offices"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Office information
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    abbreviation: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Contact information (optional)
    contact_person: Mapped[str | None] = mapped_column(String(100), nullable=True)
    contact_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Active status (for soft delete)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Foreign key to governance area
    governance_area_id: Mapped[int] = mapped_column(
        ForeignKey("governance_areas.id"), nullable=False, index=True
    )

    # Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    # Relationships
    governance_area = relationship("GovernanceArea", back_populates="municipal_offices")
    created_by = relationship("User", foreign_keys=[created_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])

    # Unique constraint: abbreviation must be unique within governance area
    __table_args__ = (
        UniqueConstraint(
            "governance_area_id",
            "abbreviation",
            name="uq_municipal_office_area_abbr",
        ),
    )
