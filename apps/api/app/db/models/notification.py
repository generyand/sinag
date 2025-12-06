# Notification Database Model
# SQLAlchemy model for the notifications table

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.db.enums import NotificationType


class Notification(Base):
    """
    Notification table model for in-app and email notifications.

    Tracks notifications sent to users throughout the assessment workflow:
    - NEW_SUBMISSION: BLGU submits assessment -> All Assessors notified
    - REWORK_REQUESTED: Assessor requests rework -> BLGU notified
    - REWORK_RESUBMITTED: BLGU resubmits after rework -> All Assessors notified
    - READY_FOR_VALIDATION: Assessor finalizes -> Validator(s) notified
    - CALIBRATION_REQUESTED: Validator requests calibration -> BLGU notified
    - CALIBRATION_RESUBMITTED: BLGU resubmits calibration -> Same Validator notified
    """

    __tablename__ = "notifications"

    # Primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Recipient
    recipient_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Notification content
    notification_type = Column(
        Enum(NotificationType, name="notification_type_enum", create_constraint=True),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    # Related entities (for navigation and context)
    assessment_id = Column(
        Integer, ForeignKey("assessments.id", ondelete="SET NULL"), nullable=True
    )
    governance_area_id = Column(
        Integer, ForeignKey("governance_areas.id", ondelete="SET NULL"), nullable=True
    )

    # Read status
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    # Email delivery tracking
    email_sent = Column(Boolean, default=False, nullable=False)
    email_sent_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True
    )

    # Relationships
    recipient = relationship("User", back_populates="notifications")
    assessment = relationship("Assessment")
    governance_area = relationship("GovernanceArea")

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, type={self.notification_type}, recipient_id={self.recipient_id})>"
