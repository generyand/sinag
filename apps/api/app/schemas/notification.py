# Notification Schemas
# Pydantic models for notification-related API requests and responses

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.db.enums import NotificationType


class NotificationBase(BaseModel):
    """Base notification schema with common fields."""

    notification_type: NotificationType
    title: str = Field(..., max_length=255)
    message: str
    assessment_id: Optional[int] = None
    governance_area_id: Optional[int] = None


class NotificationCreate(NotificationBase):
    """Schema for creating a new notification (internal use)."""

    recipient_id: int


class NotificationResponse(BaseModel):
    """Notification response model for API endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    recipient_id: int
    notification_type: NotificationType
    title: str
    message: str
    assessment_id: Optional[int] = None
    governance_area_id: Optional[int] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    # Enriched fields for frontend display (populated by service)
    assessment_barangay_name: Optional[str] = None
    governance_area_name: Optional[str] = None


class NotificationListResponse(BaseModel):
    """Schema for paginated notification list response."""

    model_config = ConfigDict(from_attributes=True)

    notifications: list[NotificationResponse]
    total: int
    unread_count: int


class NotificationCountResponse(BaseModel):
    """
    Schema for notification count response.
    Optimized for polling - minimal payload.
    """

    unread_count: int
    total: int


class MarkReadRequest(BaseModel):
    """Schema for marking specific notifications as read."""

    notification_ids: list[int] = Field(..., min_length=1)


class MarkReadResponse(BaseModel):
    """Schema for mark read response."""

    success: bool
    marked_count: int
