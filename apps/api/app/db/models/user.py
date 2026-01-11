# 👥 User Database Model
# SQLAlchemy model for the users table

from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.db.enums import UserRole


class User(Base):
    """
    User table model for database storage.

    This represents the actual database table structure,
    not the API request/response format.
    """

    __tablename__ = "users"

    # Primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # User information
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    role: UserRole = Column(
        Enum(UserRole, name="user_role_enum", create_constraint=True),
        nullable=False,
        default=UserRole.BLGU_USER,
    )
    assessor_area_id = Column(
        SmallInteger, ForeignKey("governance_areas.id"), nullable=True
    )  # Reference to governance_areas.id - Only used when role is ASSESSOR
    municipal_office_id = Column(
        Integer, ForeignKey("municipal_offices.id"), nullable=True
    )  # Reference to municipal_offices.id - Used for municipal office assignment
    barangay_id = Column(Integer, ForeignKey("barangays.id"), nullable=True)

    # User preferences
    preferred_language = Column(
        String(3),
        nullable=False,
        default="ceb",
        comment="Preferred language for AI summaries: ceb (Bisaya), fil (Tagalog), en (English)",
    )
    preferences = Column(
        JSONB,
        nullable=False,
        server_default="{}",
        comment="User preferences including onboarding tour state, UI settings, etc.",
    )

    # Authentication
    hashed_password = Column(String, nullable=False)
    must_change_password = Column(Boolean, default=True, nullable=False)

    # User status
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)

    # Profile
    logo_url = Column(
        String, nullable=True, comment="URL to user's profile logo/avatar in Supabase Storage"
    )
    logo_uploaded_at = Column(
        DateTime(timezone=True), nullable=True, comment="Timestamp when logo was last uploaded"
    )

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Relationships
    barangay = relationship("Barangay", back_populates="users")
    assessor_area = relationship("GovernanceArea", back_populates="assessors")
    municipal_office = relationship(
        "MunicipalOffice",
        foreign_keys=[municipal_office_id],
        backref="validators",
    )
    assessments = relationship(
        "Assessment", foreign_keys="Assessment.blgu_user_id", back_populates="blgu_user"
    )
    feedback_comments = relationship("FeedbackComment", back_populates="assessor")
    created_deadline_overrides = relationship(
        "DeadlineOverride",
        back_populates="creator",
        foreign_keys="DeadlineOverride.created_by",
    )
    notifications = relationship(
        "Notification", back_populates="recipient", cascade="all, delete-orphan"
    )
