# Adding Features to VANTAGE: Complete Developer Guide

This guide provides a comprehensive, step-by-step process for adding new features to the VANTAGE governance assessment platform. Follow the "Fat Services, Thin Routers" pattern and the established project conventions.

## Table of Contents

1. [Planning Phase](#1-planning-phase)
2. [Backend Development](#2-backend-development)
3. [Type Generation](#3-type-generation)
4. [Frontend Development](#4-frontend-development)
5. [Testing](#5-testing)
6. [Documentation](#6-documentation)
7. [Code Review Checklist](#7-code-review-checklist)
8. [Complete End-to-End Example: Notifications Feature](#8-complete-end-to-end-example-notifications-feature)

---

## 1. Planning Phase

### 1.1 Feature Scoping and Requirements Gathering

Before writing any code, clearly define:

- **Business requirements**: What problem does this feature solve in the SGLGB workflow?
- **User stories**: Who will use this feature and how?
- **Success criteria**: How will you know the feature is complete?
- **Dependencies**: Does this feature depend on other systems (Supabase, Gemini API, Celery)?

**Example**: For a notifications feature, ask:
- Who receives notifications? (BLGU users, Assessors, Validators)
- What events trigger notifications? (Assessment submitted, rework requested, deadline approaching)
- What delivery methods? (In-app, email, push notifications)

### 1.2 PRD Review and Alignment with SGLGB Workflow

Check existing PRDs in `docs/prds/` to understand:

- **Workflow stages**: Initial BLGU Submission → Assessor Review → Table Validation → Classification → Intelligence
- **Role-based permissions**: MLGOO_DILG, VALIDATOR, ASSESSOR, BLGU_USER
- **Business rules**: 3+1 scoring logic, one rework cycle allowed, grace period handling

**Reference**: Read relevant PRDs:
- `prd-phase1-core-user-authentication-and-management.md` - RBAC patterns
- `prd-phase2-blgu-table-assessment-workflow.md` - BLGU submission workflow
- `prd-phase3-assessor-validation-rework-cycle.md` - Assessor/Validator workflows
- `prd-phase4-core-intelligence-layer.md` - AI classification logic

### 1.3 Database Schema Planning

Design your database tables:

1. **Identify entities**: What new data do you need to store?
2. **Define relationships**: How does this data relate to existing models (User, Assessment, Indicator)?
3. **Consider performance**: Add indexes for frequently queried fields
4. **Plan for multi-tenancy**: Does data need to be isolated by barangay or governance area?

**Example**: For notifications:
- Entity: `Notification`
- Relationships: `User` (recipient), `Assessment` (optional context)
- Indexes: `user_id`, `is_read`, `created_at`

### 1.4 API Design Considerations

Design your API endpoints following RESTful conventions:

- **Resource naming**: Use plural nouns (`/notifications`, not `/getNotifications`)
- **HTTP methods**: GET (read), POST (create), PUT/PATCH (update), DELETE (delete)
- **Tag organization**: Group related endpoints with FastAPI tags for Orval type generation
- **Response structure**: Use consistent Pydantic schemas for request/response validation

**Example**: For notifications:
```
GET    /api/v1/notifications          - List notifications for current user
GET    /api/v1/notifications/{id}     - Get specific notification
POST   /api/v1/notifications/{id}/read - Mark notification as read
DELETE /api/v1/notifications/{id}     - Delete notification
```

---

## 2. Backend Development

Follow the **Model → Schema → Service → Router** pattern for all backend features.

### Step 1: Update/Create SQLAlchemy Models

**Location**: `apps/api/app/db/models/{domain}.py`

Define your database schema using SQLAlchemy ORM models.

**Example**: Creating a `Notification` model

```python
# apps/api/app/db/models/notification.py
# 🔔 Notification Database Models
# SQLAlchemy models for notification-related tables

from datetime import datetime

from app.db.base import Base
from app.db.enums import NotificationType
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Notification(Base):
    """
    Notification table model for database storage.

    Represents system notifications sent to users for various events
    in the SGLGB assessment workflow.
    """

    __tablename__ = "notifications"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Notification content
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type_enum", create_constraint=True),
        nullable=False,
    )

    # Status tracking
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Foreign keys
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    assessment_id: Mapped[int | None] = mapped_column(
        ForeignKey("assessments.id", ondelete="SET NULL"), nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    # Relationships
    user = relationship("User", back_populates="notifications")
    assessment = relationship("Assessment")
```

**Add enum** in `apps/api/app/db/enums.py`:

```python
class NotificationType(str, Enum):
    """Notification type enumeration."""

    ASSESSMENT_SUBMITTED = "ASSESSMENT_SUBMITTED"
    REWORK_REQUESTED = "REWORK_REQUESTED"
    ASSESSMENT_VALIDATED = "ASSESSMENT_VALIDATED"
    DEADLINE_REMINDER = "DEADLINE_REMINDER"
```

**Update User model** to add relationship:

```python
# In apps/api/app/db/models/user.py
# Add to User class:
notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
```

### Step 2: Create Alembic Migration

After updating models, generate a database migration.

```bash
cd apps/api

# Create migration
alembic revision --autogenerate -m "add notifications table"

# Review the generated migration file in apps/api/alembic/versions/
# Make sure it includes all expected changes

# Apply migration
alembic upgrade head
```

**Migration file example** (auto-generated in `alembic/versions/`):

```python
"""add notifications table

Revision ID: abc123def456
Revises: previous_revision
Create Date: 2025-11-19 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'abc123def456'
down_revision = 'previous_revision'
branch_labels = None
depends_on = None


def upgrade():
    # Create notification_type_enum
    op.execute("CREATE TYPE notification_type_enum AS ENUM ('ASSESSMENT_SUBMITTED', 'REWORK_REQUESTED', 'ASSESSMENT_VALIDATED', 'DEADLINE_REMINDER')")

    # Create notifications table
    op.create_table('notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('notification_type', sa.Enum('ASSESSMENT_SUBMITTED', 'REWORK_REQUESTED', 'ASSESSMENT_VALIDATED', 'DEADLINE_REMINDER', name='notification_type_enum'), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('assessment_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_id'), table_name='notifications')
    op.drop_table('notifications')
    op.execute("DROP TYPE notification_type_enum")
```

### Step 3: Define Pydantic Schemas

**Location**: `apps/api/app/schemas/{domain}.py`

Create Pydantic models for request/response validation. These generate TypeScript types via Orval.

**Example**: Notification schemas

```python
# apps/api/app/schemas/notification.py
# 🔔 Notification Schemas
# Pydantic models for notification-related API requests and responses

from datetime import datetime
from typing import Optional

from app.db.enums import NotificationType
from pydantic import BaseModel, ConfigDict


class NotificationBase(BaseModel):
    """Base notification schema with common fields."""

    title: str
    message: str
    notification_type: NotificationType


class NotificationCreate(NotificationBase):
    """Schema for creating a new notification."""

    user_id: int
    assessment_id: Optional[int] = None


class NotificationUpdate(BaseModel):
    """Schema for updating notification (mark as read)."""

    is_read: bool


class Notification(NotificationBase):
    """Notification response model for API endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    is_read: bool
    read_at: Optional[datetime] = None
    user_id: int
    assessment_id: Optional[int] = None
    created_at: datetime


class NotificationListResponse(BaseModel):
    """Paginated notification list response."""

    notifications: list[Notification]
    total: int
    unread_count: int
    page: int
    size: int
    total_pages: int
```

**Key Pydantic patterns**:
- `NotificationBase`: Shared fields across schemas (DRY principle)
- `NotificationCreate`: Request schema for creating notifications
- `NotificationUpdate`: Request schema for updates (partial updates allowed)
- `Notification`: Response schema with `model_config = ConfigDict(from_attributes=True)` for ORM compatibility
- `NotificationListResponse`: Paginated list responses with metadata

### Step 4: Implement Service Layer (Fat Services, Thin Routers)

**Location**: `apps/api/app/services/{domain}_service.py`

The service layer contains **all business logic**. Keep services testable and reusable.

**Example**: Notification service

```python
# apps/api/app/services/notification_service.py
# 🔔 Notification Service
# Business logic for notification management operations

from datetime import datetime
from typing import Optional

from app.db.enums import NotificationType
from app.db.models.notification import Notification
from app.schemas.notification import NotificationCreate
from fastapi import HTTPException, status
from sqlalchemy.orm import Session


class NotificationService:
    """Service class for notification management operations."""

    def get_notifications_for_user(
        self,
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 20,
        unread_only: bool = False,
    ) -> tuple[list[Notification], int, int]:
        """
        Get paginated notifications for a specific user.

        Args:
            db: Active database session for the transaction
            user_id: ID of the user to fetch notifications for
            skip: Number of records to skip for pagination (default: 0)
            limit: Maximum number of records to return (default: 20)
            unread_only: If True, return only unread notifications (default: False)

        Returns:
            Tuple of (notifications, total_count, unread_count)

        Example:
            >>> notifications, total, unread = notification_service.get_notifications_for_user(
            ...     db=session,
            ...     user_id=42,
            ...     skip=0,
            ...     limit=10,
            ...     unread_only=False
            ... )
            >>> print(f"Showing {len(notifications)} of {total} notifications, {unread} unread")
        """
        query = db.query(Notification).filter(Notification.user_id == user_id)

        if unread_only:
            query = query.filter(Notification.is_read == False)

        # Get total counts
        total = query.count()
        unread_count = (
            db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read == False)
            .count()
        )

        # Apply pagination and ordering
        notifications = (
            query.order_by(Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return notifications, total, unread_count

    def create_notification(
        self, db: Session, notification_create: NotificationCreate
    ) -> Notification:
        """
        Create a new notification for a user.

        This function creates a notification record in the database for a specific user.
        Notifications are used to inform users about important events in the SGLGB
        assessment workflow.

        **Use Cases**:
        - BLGU user submits assessment → notify assigned assessor
        - Assessor requests rework → notify BLGU user with comments
        - Deadline approaching → notify BLGU users with pending assessments

        **Side Effects**:
        - Inserts new notification record in database
        - Commits transaction

        Args:
            db: Active database session for the transaction
            notification_create: Notification creation payload with title, message, type, user_id

        Returns:
            Created Notification instance with generated ID and timestamp

        Example:
            >>> notification = notification_service.create_notification(
            ...     db=session,
            ...     notification_create=NotificationCreate(
            ...         title="Assessment Submitted",
            ...         message="Your assessment has been submitted for review.",
            ...         notification_type=NotificationType.ASSESSMENT_SUBMITTED,
            ...         user_id=42,
            ...         assessment_id=123
            ...     )
            ... )
            >>> print(notification.id)
            456
        """
        db_notification = Notification(
            title=notification_create.title,
            message=notification_create.message,
            notification_type=notification_create.notification_type,
            user_id=notification_create.user_id,
            assessment_id=notification_create.assessment_id,
            is_read=False,
        )

        db.add(db_notification)
        db.commit()
        db.refresh(db_notification)
        return db_notification

    def mark_as_read(
        self, db: Session, notification_id: int, user_id: int
    ) -> Optional[Notification]:
        """
        Mark a notification as read.

        **Business Rule**: Users can only mark their own notifications as read (enforced by user_id check).

        Args:
            db: Active database session for the transaction
            notification_id: ID of the notification to mark as read
            user_id: ID of the current user (for authorization check)

        Returns:
            Updated Notification instance, or None if not found or unauthorized

        Raises:
            HTTPException 403: If user tries to mark another user's notification as read

        Example:
            >>> notification = notification_service.mark_as_read(
            ...     db=session,
            ...     notification_id=456,
            ...     user_id=42
            ... )
            >>> print(notification.is_read)
            True
        """
        notification = (
            db.query(Notification).filter(Notification.id == notification_id).first()
        )

        if not notification:
            return None

        # Authorization check: user can only mark their own notifications as read
        if notification.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot mark another user's notification as read",
            )

        notification.is_read = True
        notification.read_at = datetime.utcnow()

        db.commit()
        db.refresh(notification)
        return notification

    def delete_notification(
        self, db: Session, notification_id: int, user_id: int
    ) -> bool:
        """
        Delete a notification.

        **Business Rule**: Users can only delete their own notifications (enforced by user_id check).

        Args:
            db: Active database session for the transaction
            notification_id: ID of the notification to delete
            user_id: ID of the current user (for authorization check)

        Returns:
            True if notification was deleted, False if not found

        Raises:
            HTTPException 403: If user tries to delete another user's notification
        """
        notification = (
            db.query(Notification).filter(Notification.id == notification_id).first()
        )

        if not notification:
            return False

        # Authorization check
        if notification.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete another user's notification",
            )

        db.delete(notification)
        db.commit()
        return True

    def mark_all_as_read(self, db: Session, user_id: int) -> int:
        """
        Mark all notifications as read for a user.

        Args:
            db: Active database session
            user_id: ID of the user

        Returns:
            Number of notifications marked as read
        """
        count = (
            db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read == False)
            .update(
                {"is_read": True, "read_at": datetime.utcnow()},
                synchronize_session=False,
            )
        )
        db.commit()
        return count


# Create service instance (singleton pattern)
notification_service = NotificationService()
```

**Service layer best practices**:
- ✅ **Fat services**: All business logic lives here (authorization, validation, complex queries)
- ✅ **Clear docstrings**: Google-style docstrings with Args, Returns, Raises, Example
- ✅ **Type hints**: Full type annotations for IDE autocomplete and type checking
- ✅ **Transaction management**: Services receive `db: Session` and commit transactions
- ✅ **Reusability**: Methods can be called from routers, Celery tasks, or other services
- ✅ **Testability**: Pure functions that are easy to unit test
- ✅ **Singleton pattern**: Export a service instance (`notification_service = NotificationService()`)

### Step 5: Create API Router (Thin Routers)

**Location**: `apps/api/app/api/v1/{domain}.py`

Routers handle HTTP concerns and delegate to services. Keep routers **thin**.

**Example**: Notification router

```python
# apps/api/app/api/v1/notifications.py
# 🔔 Notifications API Routes
# Endpoints for notification management

import math
from typing import Optional

from app.api import deps
from app.db.models.user import User
from app.schemas.notification import Notification, NotificationListResponse
from app.services.notification_service import notification_service
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/", response_model=NotificationListResponse, tags=["notifications"])
async def get_notifications(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    unread_only: bool = Query(False, description="Show only unread notifications"),
):
    """
    Get paginated notifications for the current user.

    Returns a list of notifications ordered by creation date (newest first).
    Supports pagination and filtering by read status.

    **Authentication**: Required (all user roles)

    **Query Parameters**:
    - page: Page number (default: 1)
    - size: Number of notifications per page (default: 20, max: 100)
    - unread_only: Filter to show only unread notifications (default: False)

    **Returns**:
    - notifications: List of notification objects
    - total: Total number of notifications for this user
    - unread_count: Number of unread notifications
    - page: Current page number
    - size: Page size
    - total_pages: Total number of pages
    """
    skip = (page - 1) * size

    notifications, total, unread_count = notification_service.get_notifications_for_user(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=size,
        unread_only=unread_only,
    )

    total_pages = math.ceil(total / size)

    return NotificationListResponse(
        notifications=notifications,
        total=total,
        unread_count=unread_count,
        page=page,
        size=size,
        total_pages=total_pages,
    )


@router.post("/{notification_id}/read", response_model=Notification, tags=["notifications"])
async def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Mark a notification as read.

    **Authentication**: Required (all user roles)

    **Authorization**: Users can only mark their own notifications as read

    **Path Parameters**:
    - notification_id: ID of the notification to mark as read

    **Returns**: Updated notification object with is_read=true and read_at timestamp

    **Raises**:
    - 404: Notification not found
    - 403: User not authorized to mark this notification as read
    """
    notification = notification_service.mark_as_read(
        db=db, notification_id=notification_id, user_id=current_user.id
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    return notification


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["notifications"])
async def delete_notification(
    notification_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Delete a notification.

    **Authentication**: Required (all user roles)

    **Authorization**: Users can only delete their own notifications

    **Path Parameters**:
    - notification_id: ID of the notification to delete

    **Raises**:
    - 404: Notification not found
    - 403: User not authorized to delete this notification
    """
    success = notification_service.delete_notification(
        db=db, notification_id=notification_id, user_id=current_user.id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )


@router.post("/mark-all-read", response_model=dict, tags=["notifications"])
async def mark_all_notifications_as_read(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Mark all notifications as read for the current user.

    **Authentication**: Required (all user roles)

    **Returns**: Number of notifications marked as read
    """
    count = notification_service.mark_all_as_read(db=db, user_id=current_user.id)

    return {"message": f"Marked {count} notifications as read"}
```

**Router best practices**:
- ✅ **Thin routers**: Just handle HTTP, call services, return responses
- ✅ **Use dependency injection**: `Depends(deps.get_db)`, `Depends(deps.get_current_active_user)`
- ✅ **Proper tags**: Tag all endpoints for Orval organization (`tags=["notifications"]`)
- ✅ **Clear docstrings**: Explain authentication, authorization, parameters, returns, raises
- ✅ **Response models**: Use Pydantic schemas for type-safe responses (`response_model=Notification`)
- ✅ **HTTP status codes**: Use semantic status codes (200, 201, 204, 400, 403, 404)
- ✅ **Error handling**: Raise HTTPException with descriptive messages

### Step 6: Register Router in __init__.py

**Location**: `apps/api/app/api/v1/__init__.py`

Register your new router so FastAPI knows about it.

```python
# apps/api/app/api/v1/__init__.py
from fastapi import APIRouter

from app.api.v1 import (
    analytics,
    assessments,
    assessor,
    auth,
    lookups,
    notifications,  # Add this import
    system,
    users,
)

api_router = APIRouter()

# Include all routers with their prefixes
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(assessments.router, prefix="/assessments", tags=["assessments"])
api_router.include_router(assessor.router, prefix="/assessor", tags=["assessor"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(lookups.router, prefix="/lookups", tags=["lookups"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])  # Add this line
```

**Start the backend** to verify your endpoints:

```bash
pnpm dev:api
```

Visit `http://localhost:8000/docs` to see your new endpoints in the auto-generated Swagger UI.

---

## 3. Type Generation

**After modifying any API endpoints or Pydantic schemas, always run type generation.**

This generates TypeScript types and React Query hooks from the FastAPI OpenAPI spec.

### 3.1 Run Type Generation

```bash
# From project root
pnpm generate-types
```

This command:
1. Starts the FastAPI server
2. Fetches the OpenAPI spec from `/openapi.json`
3. Runs Orval to generate TypeScript code
4. Outputs files to `packages/shared/src/generated/`

### 3.2 Verify Generated Types

Check the generated files:

```bash
# Types organized by tag
ls packages/shared/src/generated/schemas/notifications/
# Output: notificationSchema.ts

# React Query hooks organized by tag
ls packages/shared/src/generated/endpoints/notifications/
# Output: notificationsController.ts
```

**Example generated type** (`notificationSchema.ts`):

```typescript
/**
 * Generated by orval v6.x.x
 * Do not edit manually.
 * VANTAGE API
 * OpenAPI spec version: 1.0.0
 */

export interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: NotificationType;
  is_read: boolean;
  read_at?: string | null;
  user_id: number;
  assessment_id?: number | null;
  created_at: string;
}

export enum NotificationType {
  ASSESSMENT_SUBMITTED = 'ASSESSMENT_SUBMITTED',
  REWORK_REQUESTED = 'REWORK_REQUESTED',
  ASSESSMENT_VALIDATED = 'ASSESSMENT_VALIDATED',
  DEADLINE_REMINDER = 'DEADLINE_REMINDER',
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
  page: number;
  size: number;
  total_pages: number;
}
```

**Example generated hook** (`notificationsController.ts`):

```typescript
/**
 * Generated by orval v6.x.x
 * Do not edit manually.
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import type { QueryFunction, QueryKey, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import api from '@/lib/api';

export const getNotifications = (
  params?: GetNotificationsParams,
  options?: AxiosRequestConfig
) => {
  return api.get<NotificationListResponse>(
    `/api/v1/notifications`,
    { ...options, params }
  );
};

export const useGetNotifications = <TData = Awaited<ReturnType<typeof getNotifications>>, TError = AxiosError>(
  params?: GetNotificationsParams,
  options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof getNotifications>>, TError, TData> }
) => {
  return useQuery<Awaited<ReturnType<typeof getNotifications>>, TError, TData>(
    ['notifications', params],
    () => getNotifications(params),
    options?.query
  );
};

export const markNotificationAsRead = (
  notificationId: number,
  options?: AxiosRequestConfig
) => {
  return api.post<Notification>(
    `/api/v1/notifications/${notificationId}/read`,
    undefined,
    options
  );
};

export const useMarkNotificationAsRead = <TData = Awaited<ReturnType<typeof markNotificationAsRead>>, TError = AxiosError>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof markNotificationAsRead>>, TError, { notificationId: number }> }
) => {
  return useMutation<Awaited<ReturnType<typeof markNotificationAsRead>>, TError, { notificationId: number }>(
    ({ notificationId }) => markNotificationAsRead(notificationId),
    options?.mutation
  );
};
```

### 3.3 Troubleshooting Type Generation

**Issue**: Type generation fails

```bash
# Check if backend is running
curl http://localhost:8000/openapi.json

# Verify Pydantic schemas are valid
cd apps/api
python -c "from app.schemas.notification import Notification"

# Check orval configuration
cat orval.config.ts
```

**Common fixes**:
- Ensure backend is running on port 8000
- Fix any Pydantic schema validation errors
- Check `orval.config.ts` has correct API URL and output paths

---

## 4. Frontend Development

Build UI components that consume the generated API hooks.

### 4.1 Create Page (Next.js App Router)

**Location**: `apps/web/src/app/(app)/{feature}/page.tsx`

Use Server Components by default, Client Components only when needed.

**Example**: Notifications page

```tsx
// apps/web/src/app/(app)/notifications/page.tsx
import { NotificationList } from '@/components/features/notifications';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications | VANTAGE',
  description: 'View and manage your notifications',
};

export default function NotificationsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Notifications
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Stay updated with your assessment workflow
        </p>
      </div>

      <NotificationList />
    </div>
  );
}
```

**Page best practices**:
- ✅ Server Components by default (no `'use client'` directive unless needed)
- ✅ Export metadata for SEO
- ✅ Keep pages minimal, delegate to components
- ✅ Use layout.tsx for shared UI (headers, sidebars)

### 4.2 Create Feature Components

**Location**: `apps/web/src/components/features/{feature}/`

Build feature-specific components using the generated API hooks.

**Example**: Notification list component

```tsx
// apps/web/src/components/features/notifications/NotificationList.tsx
'use client';

import { useState } from 'react';
import { useGetNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@vantage/shared';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';

export function NotificationList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Use generated React Query hook
  const { data, isLoading, error, refetch } = useGetNotifications({
    page: currentPage,
    size: 20,
    unread_only: unreadOnly,
  });

  const markAsReadMutation = useMarkNotificationAsRead({
    mutation: {
      onSuccess: () => {
        // Invalidate queries to refetch notifications
        refetch();
      },
    },
  });

  const markAllAsReadMutation = useMarkAllNotificationsAsRead({
    mutation: {
      onSuccess: () => {
        refetch();
      },
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>Failed to load notifications. Please try again.</p>
      </div>
    );
  }

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate({ notificationId });
  };

  const handleMarkAllAsRead = () => {
    if (confirm('Mark all notifications as read?')) {
      markAllAsReadMutation.mutate({});
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {data?.unread_count || 0} unread
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllAsRead}
          disabled={!data?.unread_count}
        >
          <CheckCheck className="h-4 w-4 mr-2" />
          Mark all as read
        </Button>
      </div>

      {/* Tabs for filtering */}
      <Tabs defaultValue="all" onValueChange={(value) => setUnreadOnly(value === 'unread')}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread {data?.unread_count ? `(${data.unread_count})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          {data?.notifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No notifications yet</p>
              </CardContent>
            </Card>
          ) : (
            data?.notifications.map((notification) => (
              <Card
                key={notification.id}
                className={notification.is_read ? 'opacity-60' : 'border-l-4 border-l-primary'}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {notification.title}
                        {!notification.is_read && (
                          <Badge variant="default" className="text-xs">New</Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    <Badge variant="outline">{notification.notification_type}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-4 mt-4">
          {/* Same as "all" tab but filtered by backend */}
          {data?.notifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCheck className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">All caught up!</p>
              </CardContent>
            </Card>
          ) : (
            data?.notifications.map((notification) => (
              <Card key={notification.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {notification.title}
                        <Badge variant="default" className="text-xs">New</Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {notification.message}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    <Badge variant="outline">{notification.notification_type}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Page {currentPage} of {data.total_pages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(data.total_pages, p + 1))}
            disabled={currentPage === data.total_pages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Export from index.ts**:

```typescript
// apps/web/src/components/features/notifications/index.ts
export { NotificationList } from './NotificationList';
```

**Component best practices**:
- ✅ Use `'use client'` directive for Client Components
- ✅ Import generated hooks from `@vantage/shared`
- ✅ Use TanStack Query patterns (mutations with `onSuccess`)
- ✅ Handle loading, error, and empty states
- ✅ Use shadcn/ui components from `@/components/ui/`
- ✅ Follow VANTAGE design system (Tailwind classes, dark mode support)

### 4.3 Create Custom Hook (Optional)

If you have complex logic, wrap the generated hook.

**Example**: Custom notification hook with polling

```typescript
// apps/web/src/hooks/useNotifications.ts
import { useGetNotifications } from '@vantage/shared';
import { useEffect } from 'react';

export function useNotifications(options?: {
  unreadOnly?: boolean;
  pollInterval?: number;
}) {
  const { data, isLoading, error, refetch } = useGetNotifications({
    page: 1,
    size: 20,
    unread_only: options?.unreadOnly || false,
  });

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (options?.pollInterval) {
      const interval = setInterval(() => {
        refetch();
      }, options.pollInterval);

      return () => clearInterval(interval);
    }
  }, [options?.pollInterval, refetch]);

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unread_count || 0,
    isLoading,
    error,
    refetch,
  };
}
```

### 4.4 State Management with Zustand (If Needed)

For global client state (not server state), use Zustand.

**Example**: Notification preferences store

```typescript
// apps/web/src/store/notificationStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationSound: boolean;
}

interface NotificationStore {
  preferences: NotificationPreferences;
  setPreferences: (preferences: Partial<NotificationPreferences>) => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        notificationSound: false,
      },
      setPreferences: (newPreferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        })),
    }),
    {
      name: 'notification-preferences',
    }
  )
);
```

---

## 5. Testing

Write comprehensive tests for backend and frontend.

### 5.1 Backend Testing with pytest

**Location**: `apps/api/tests/`

**Test structure**:
- `tests/services/test_{service}_service.py` - Unit tests for service layer
- `tests/api/v1/test_{domain}.py` - Integration tests for API endpoints
- `tests/conftest.py` - Shared fixtures

**Example**: Service layer tests

```python
# apps/api/tests/services/test_notification_service.py
"""
Tests for notification service (app/services/notification_service.py)
"""

import pytest
from sqlalchemy.orm import Session

from app.db.enums import NotificationType, UserRole
from app.db.models.notification import Notification
from app.db.models.user import User
from app.schemas.notification import NotificationCreate
from app.services.notification_service import notification_service


@pytest.fixture
def test_user(db_session: Session):
    """Create a test user for notification tests."""
    user = User(
        email="testuser@example.com",
        name="Test User",
        hashed_password="hashed_password",
        role=UserRole.BLGU_USER,
        barangay_id=1,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_create_notification(db_session: Session, test_user: User):
    """Test creating a notification."""
    notification_create = NotificationCreate(
        title="Test Notification",
        message="This is a test notification",
        notification_type=NotificationType.ASSESSMENT_SUBMITTED,
        user_id=test_user.id,
        assessment_id=None,
    )

    notification = notification_service.create_notification(
        db=db_session, notification_create=notification_create
    )

    assert notification.id is not None
    assert notification.title == "Test Notification"
    assert notification.message == "This is a test notification"
    assert notification.notification_type == NotificationType.ASSESSMENT_SUBMITTED
    assert notification.user_id == test_user.id
    assert notification.is_read is False
    assert notification.read_at is None


def test_get_notifications_for_user(db_session: Session, test_user: User):
    """Test fetching notifications for a user."""
    # Create multiple notifications
    for i in range(5):
        notification_create = NotificationCreate(
            title=f"Notification {i}",
            message=f"Message {i}",
            notification_type=NotificationType.ASSESSMENT_SUBMITTED,
            user_id=test_user.id,
        )
        notification_service.create_notification(db=db_session, notification_create=notification_create)

    # Fetch notifications
    notifications, total, unread_count = notification_service.get_notifications_for_user(
        db=db_session, user_id=test_user.id, skip=0, limit=10
    )

    assert len(notifications) == 5
    assert total == 5
    assert unread_count == 5


def test_get_notifications_pagination(db_session: Session, test_user: User):
    """Test notification pagination."""
    # Create 15 notifications
    for i in range(15):
        notification_create = NotificationCreate(
            title=f"Notification {i}",
            message=f"Message {i}",
            notification_type=NotificationType.ASSESSMENT_SUBMITTED,
            user_id=test_user.id,
        )
        notification_service.create_notification(db=db_session, notification_create=notification_create)

    # Fetch first page
    page1, total, unread = notification_service.get_notifications_for_user(
        db=db_session, user_id=test_user.id, skip=0, limit=10
    )

    assert len(page1) == 10
    assert total == 15

    # Fetch second page
    page2, _, _ = notification_service.get_notifications_for_user(
        db=db_session, user_id=test_user.id, skip=10, limit=10
    )

    assert len(page2) == 5


def test_mark_notification_as_read(db_session: Session, test_user: User):
    """Test marking a notification as read."""
    # Create notification
    notification_create = NotificationCreate(
        title="Test",
        message="Test message",
        notification_type=NotificationType.ASSESSMENT_SUBMITTED,
        user_id=test_user.id,
    )
    notification = notification_service.create_notification(
        db=db_session, notification_create=notification_create
    )

    assert notification.is_read is False

    # Mark as read
    updated = notification_service.mark_as_read(
        db=db_session, notification_id=notification.id, user_id=test_user.id
    )

    assert updated.is_read is True
    assert updated.read_at is not None


def test_mark_as_read_unauthorized(db_session: Session, test_user: User):
    """Test that users cannot mark other users' notifications as read."""
    # Create another user
    other_user = User(
        email="other@example.com",
        name="Other User",
        hashed_password="hashed",
        role=UserRole.BLGU_USER,
        barangay_id=2,
        is_active=True,
    )
    db_session.add(other_user)
    db_session.commit()
    db_session.refresh(other_user)

    # Create notification for test_user
    notification_create = NotificationCreate(
        title="Test",
        message="Test",
        notification_type=NotificationType.ASSESSMENT_SUBMITTED,
        user_id=test_user.id,
    )
    notification = notification_service.create_notification(
        db=db_session, notification_create=notification_create
    )

    # Try to mark as read with other_user
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        notification_service.mark_as_read(
            db=db_session, notification_id=notification.id, user_id=other_user.id
        )

    assert exc_info.value.status_code == 403


def test_delete_notification(db_session: Session, test_user: User):
    """Test deleting a notification."""
    # Create notification
    notification_create = NotificationCreate(
        title="Test",
        message="Test",
        notification_type=NotificationType.ASSESSMENT_SUBMITTED,
        user_id=test_user.id,
    )
    notification = notification_service.create_notification(
        db=db_session, notification_create=notification_create
    )

    # Delete notification
    success = notification_service.delete_notification(
        db=db_session, notification_id=notification.id, user_id=test_user.id
    )

    assert success is True

    # Verify deletion
    deleted = db_session.query(Notification).filter(Notification.id == notification.id).first()
    assert deleted is None


def test_mark_all_as_read(db_session: Session, test_user: User):
    """Test marking all notifications as read."""
    # Create 5 unread notifications
    for i in range(5):
        notification_create = NotificationCreate(
            title=f"Notification {i}",
            message=f"Message {i}",
            notification_type=NotificationType.ASSESSMENT_SUBMITTED,
            user_id=test_user.id,
        )
        notification_service.create_notification(db=db_session, notification_create=notification_create)

    # Mark all as read
    count = notification_service.mark_all_as_read(db=db_session, user_id=test_user.id)

    assert count == 5

    # Verify all are read
    _, _, unread_count = notification_service.get_notifications_for_user(
        db=db_session, user_id=test_user.id
    )
    assert unread_count == 0
```

**Example**: API endpoint tests

```python
# apps/api/tests/api/v1/test_notifications.py
"""
Tests for notifications API endpoints (app/api/v1/notifications.py)
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import NotificationType, UserRole
from app.db.models.user import User
from app.schemas.notification import NotificationCreate
from app.services.notification_service import notification_service


@pytest.fixture
def blgu_user(db_session: Session):
    """Create a BLGU user for testing."""
    user = User(
        email="blgu@example.com",
        name="BLGU User",
        hashed_password="hashed",
        role=UserRole.BLGU_USER,
        barangay_id=1,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _override_current_user(client: TestClient, user: User, db_session: Session):
    """Override authentication dependency."""
    def _override():
        return user

    def _override_db():
        try:
            yield db_session
        finally:
            pass

    client.app.dependency_overrides[deps.get_current_active_user] = _override
    client.app.dependency_overrides[deps.get_db] = _override_db


def test_get_notifications(client: TestClient, db_session: Session, blgu_user: User):
    """Test GET /api/v1/notifications endpoint."""
    _override_current_user(client, blgu_user, db_session)

    # Create test notifications
    for i in range(3):
        notification_create = NotificationCreate(
            title=f"Test {i}",
            message=f"Message {i}",
            notification_type=NotificationType.ASSESSMENT_SUBMITTED,
            user_id=blgu_user.id,
        )
        notification_service.create_notification(db=db_session, notification_create=notification_create)

    # Fetch notifications
    response = client.get("/api/v1/notifications")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert data["unread_count"] == 3
    assert len(data["notifications"]) == 3


def test_get_notifications_pagination(client: TestClient, db_session: Session, blgu_user: User):
    """Test notification pagination."""
    _override_current_user(client, blgu_user, db_session)

    # Create 25 notifications
    for i in range(25):
        notification_create = NotificationCreate(
            title=f"Test {i}",
            message=f"Message {i}",
            notification_type=NotificationType.ASSESSMENT_SUBMITTED,
            user_id=blgu_user.id,
        )
        notification_service.create_notification(db=db_session, notification_create=notification_create)

    # Fetch first page
    response = client.get("/api/v1/notifications?page=1&size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 25
    assert data["total_pages"] == 3
    assert len(data["notifications"]) == 10

    # Fetch second page
    response = client.get("/api/v1/notifications?page=2&size=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data["notifications"]) == 10


def test_mark_notification_as_read(client: TestClient, db_session: Session, blgu_user: User):
    """Test POST /api/v1/notifications/{id}/read endpoint."""
    _override_current_user(client, blgu_user, db_session)

    # Create notification
    notification_create = NotificationCreate(
        title="Test",
        message="Test message",
        notification_type=NotificationType.ASSESSMENT_SUBMITTED,
        user_id=blgu_user.id,
    )
    notification = notification_service.create_notification(
        db=db_session, notification_create=notification_create
    )

    # Mark as read
    response = client.post(f"/api/v1/notifications/{notification.id}/read")

    assert response.status_code == 200
    data = response.json()
    assert data["is_read"] is True
    assert data["read_at"] is not None


def test_mark_as_read_not_found(client: TestClient, db_session: Session, blgu_user: User):
    """Test marking non-existent notification as read."""
    _override_current_user(client, blgu_user, db_session)

    response = client.post("/api/v1/notifications/999999/read")

    assert response.status_code == 404


def test_delete_notification(client: TestClient, db_session: Session, blgu_user: User):
    """Test DELETE /api/v1/notifications/{id} endpoint."""
    _override_current_user(client, blgu_user, db_session)

    # Create notification
    notification_create = NotificationCreate(
        title="Test",
        message="Test",
        notification_type=NotificationType.ASSESSMENT_SUBMITTED,
        user_id=blgu_user.id,
    )
    notification = notification_service.create_notification(
        db=db_session, notification_create=notification_create
    )

    # Delete notification
    response = client.delete(f"/api/v1/notifications/{notification.id}")

    assert response.status_code == 204


def test_mark_all_as_read(client: TestClient, db_session: Session, blgu_user: User):
    """Test POST /api/v1/notifications/mark-all-read endpoint."""
    _override_current_user(client, blgu_user, db_session)

    # Create 5 unread notifications
    for i in range(5):
        notification_create = NotificationCreate(
            title=f"Test {i}",
            message=f"Message {i}",
            notification_type=NotificationType.ASSESSMENT_SUBMITTED,
            user_id=blgu_user.id,
        )
        notification_service.create_notification(db=db_session, notification_create=notification_create)

    # Mark all as read
    response = client.post("/api/v1/notifications/mark-all-read")

    assert response.status_code == 200
    data = response.json()
    assert "Marked 5 notifications as read" in data["message"]

    # Verify all are read
    response = client.get("/api/v1/notifications")
    data = response.json()
    assert data["unread_count"] == 0
```

**Run tests**:

```bash
# All tests
cd apps/api
pytest

# Specific test file
pytest tests/services/test_notification_service.py

# Verbose output
pytest -vv

# With debug logging
pytest -vv --log-cli-level=DEBUG
```

### 5.2 Frontend Testing Patterns

VANTAGE currently uses manual testing for frontend. For production apps, consider adding:

- **Component tests**: React Testing Library
- **E2E tests**: Playwright or Cypress
- **Type checking**: `pnpm type-check`

---

## 6. Documentation

Update all relevant documentation after implementing your feature.

### 6.1 API Documentation

**Already done**: Your FastAPI docstrings auto-generate Swagger UI docs at `http://localhost:8000/docs`

**Additional**: If your feature has complex workflows, add documentation in `docs/api/`:

```markdown
# docs/api/notifications-api.md

# Notifications API

## Overview

The Notifications API provides endpoints for managing user notifications in the VANTAGE platform.

## Endpoints

### GET /api/v1/notifications

Retrieve paginated notifications for the current user.

**Authentication**: Required (all user roles)

**Query Parameters**:
- `page` (integer, default: 1): Page number
- `size` (integer, default: 20, max: 100): Number of notifications per page
- `unread_only` (boolean, default: false): Filter to show only unread notifications

**Response**:
```json
{
  "notifications": [
    {
      "id": 123,
      "title": "Assessment Submitted",
      "message": "Your assessment has been submitted for review.",
      "notification_type": "ASSESSMENT_SUBMITTED",
      "is_read": false,
      "read_at": null,
      "user_id": 42,
      "assessment_id": 456,
      "created_at": "2025-11-19T10:30:00Z"
    }
  ],
  "total": 25,
  "unread_count": 10,
  "page": 1,
  "size": 20,
  "total_pages": 2
}
```

(Continue with other endpoints...)
```

### 6.2 Update CLAUDE.md

If your feature introduces new patterns or commands, update `CLAUDE.md`:

```markdown
## Notification System

VANTAGE includes a notification system to alert users about important events in the SGLGB workflow.

### Creating Notifications

Use the `notification_service` to create notifications programmatically:

\`\`\`python
from app.services.notification_service import notification_service
from app.schemas.notification import NotificationCreate
from app.db.enums import NotificationType

notification = notification_service.create_notification(
    db=db,
    notification_create=NotificationCreate(
        title="Assessment Submitted",
        message="Your assessment has been submitted for review.",
        notification_type=NotificationType.ASSESSMENT_SUBMITTED,
        user_id=user_id,
        assessment_id=assessment_id,
    )
)
\`\`\`

### Notification Types

- `ASSESSMENT_SUBMITTED`: Sent to assessors when a BLGU submits an assessment
- `REWORK_REQUESTED`: Sent to BLGU users when an assessor requests rework
- `ASSESSMENT_VALIDATED`: Sent to BLGU users when their assessment is validated
- `DEADLINE_REMINDER`: Sent to BLGU users when a deadline is approaching
```

### 6.3 Update CHANGELOG.md

Add your feature to the changelog:

```markdown
# Changelog

All notable changes to VANTAGE will be documented in this file.

## [Unreleased]

### Added
- Notifications system for real-time alerts
  - In-app notification center with read/unread tracking
  - Pagination and filtering by read status
  - Mark individual or all notifications as read
  - Automatic notifications for assessment submission, rework requests, and deadlines
  - Backend API endpoints: `/api/v1/notifications`
  - Frontend notification panel in dashboard header

### Changed
- User model now includes `notifications` relationship

### Database
- Added `notifications` table with user and assessment foreign keys
- Added `notification_type_enum` enumeration type
```

---

## 7. Code Review Checklist

Before submitting your feature for review, verify:

### 7.1 Security Considerations

- [ ] **Authentication**: All endpoints require authentication (except public endpoints)
- [ ] **Authorization**: Users can only access their own data (RBAC checks in place)
- [ ] **Input validation**: All user input is validated with Pydantic schemas
- [ ] **SQL injection**: No raw SQL queries (using SQLAlchemy ORM)
- [ ] **XSS protection**: Frontend uses React (auto-escapes HTML)
- [ ] **CSRF protection**: Using SameSite cookies and CORS configuration

**Example authorization check**:

```python
# In service layer
if notification.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Unauthorized")
```

### 7.2 Performance Considerations

- [ ] **Database indexes**: Added indexes on foreign keys and frequently queried fields
- [ ] **N+1 queries**: Using `joinedload` for eager loading relationships
- [ ] **Pagination**: Large lists are paginated (max 100 items per page)
- [ ] **Caching**: Using TanStack Query cache on frontend
- [ ] **Background jobs**: Long-running tasks use Celery (not blocking API requests)

**Example eager loading**:

```python
from sqlalchemy.orm import joinedload

notifications = (
    db.query(Notification)
    .options(joinedload(Notification.user))  # Avoid N+1
    .filter(Notification.user_id == user_id)
    .all()
)
```

### 7.3 Error Handling

- [ ] **Graceful failures**: All errors return meaningful HTTP status codes
- [ ] **User-friendly messages**: Error messages are actionable (not technical stack traces)
- [ ] **Logging**: Critical errors are logged for debugging
- [ ] **Validation errors**: Pydantic validation errors return 422 with field details
- [ ] **Frontend error states**: Loading/error/empty states handled in UI

**Example error handling**:

```python
try:
    notification = notification_service.mark_as_read(db, notification_id, user_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification
except HTTPException:
    raise  # Re-raise HTTP exceptions
except Exception as e:
    logger.error(f"Failed to mark notification as read: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

### 7.4 Type Safety

- [ ] **Backend**: All functions have type hints (`def func(db: Session, user_id: int) -> Notification`)
- [ ] **Frontend**: TypeScript strict mode enabled (no `any` types without justification)
- [ ] **Generated types**: Ran `pnpm generate-types` after backend changes
- [ ] **Pydantic**: All schemas use proper type annotations

### 7.5 Documentation Completeness

- [ ] **Docstrings**: All public functions have Google-style docstrings
- [ ] **API docs**: FastAPI docstrings explain authentication, parameters, returns, raises
- [ ] **README updates**: Updated README if adding new setup steps
- [ ] **CLAUDE.md updates**: Updated if introducing new patterns or commands
- [ ] **CHANGELOG.md**: Added entry for this feature

---

## 8. Complete End-to-End Example: Notifications Feature

This section walks through implementing the Notifications feature from start to finish, demonstrating all concepts from this guide.

### Step 1: Planning

**Business requirement**: Users need to be notified about important events in the SGLGB assessment workflow.

**User stories**:
- As a BLGU user, I want to receive notifications when my assessment is reviewed, so I know when to take action.
- As an assessor, I want to receive notifications when new assessments are submitted, so I can review them promptly.
- As a BLGU user, I want to mark notifications as read, so I can track which alerts I've already seen.

**Success criteria**:
- Notifications are created automatically when key events occur (submission, rework request, validation)
- Users can view paginated list of notifications
- Users can mark individual or all notifications as read
- Users can only see their own notifications (multi-tenancy)

**Dependencies**:
- Database: PostgreSQL via Supabase
- No external APIs required
- Future enhancement: Celery background jobs for email notifications

### Step 2: Database Schema

**Entity**: `Notification`

**Fields**:
- `id` (int, primary key)
- `title` (string, required)
- `message` (text, required)
- `notification_type` (enum, required)
- `is_read` (boolean, default: false)
- `read_at` (datetime, nullable)
- `user_id` (int, foreign key to users, indexed)
- `assessment_id` (int, foreign key to assessments, nullable)
- `created_at` (datetime, auto-set)

**Relationships**:
- `User` (many-to-one): Each notification belongs to one user
- `Assessment` (many-to-one, optional): Notifications can optionally reference an assessment

**Indexes**:
- `user_id` (for filtering by user)
- `created_at` (for sorting by date)
- `is_read` (for filtering unread notifications)

### Step 3: API Design

**Endpoints**:

```
GET    /api/v1/notifications          - List notifications (paginated, filterable)
GET    /api/v1/notifications/{id}     - Get single notification (future)
POST   /api/v1/notifications/{id}/read - Mark notification as read
DELETE /api/v1/notifications/{id}     - Delete notification
POST   /api/v1/notifications/mark-all-read - Mark all as read
```

**Tag**: `notifications` (for Orval type generation)

### Step 4: Implementation

**See code examples in Steps 1-6 above for**:
- SQLAlchemy model (`apps/api/app/db/models/notification.py`)
- Alembic migration
- Pydantic schemas (`apps/api/app/schemas/notification.py`)
- Service layer (`apps/api/app/services/notification_service.py`)
- API router (`apps/api/app/api/v1/notifications.py`)
- Router registration in `__init__.py`

### Step 5: Type Generation

```bash
# Generate TypeScript types and React Query hooks
pnpm generate-types
```

**Generated files**:
- `packages/shared/src/generated/schemas/notifications/notificationSchema.ts`
- `packages/shared/src/generated/endpoints/notifications/notificationsController.ts`

### Step 6: Frontend Implementation

**See code examples in Step 4.2 above for**:
- Page component (`apps/web/src/app/(app)/notifications/page.tsx`)
- Feature component (`apps/web/src/components/features/notifications/NotificationList.tsx`)
- Custom hook (optional) (`apps/web/src/hooks/useNotifications.ts`)

### Step 7: Testing

**See code examples in Step 5.1 above for**:
- Service tests (`apps/api/tests/services/test_notification_service.py`)
- API endpoint tests (`apps/api/tests/api/v1/test_notifications.py`)

**Run tests**:

```bash
cd apps/api
pytest tests/services/test_notification_service.py -vv
pytest tests/api/v1/test_notifications.py -vv
```

### Step 8: Integration with Existing Features

**Create notifications when events occur**:

```python
# In apps/api/app/api/v1/assessments.py
# After assessment submission

from app.services.notification_service import notification_service
from app.schemas.notification import NotificationCreate

# Create notification for BLGU user
notification_service.create_notification(
    db=db,
    notification_create=NotificationCreate(
        title="Assessment Submitted",
        message=f"Your assessment has been submitted for review.",
        notification_type=NotificationType.ASSESSMENT_SUBMITTED,
        user_id=current_user.id,
        assessment_id=assessment.id,
    )
)

# Find assigned assessor and notify them
# (Assumes assessor assignment logic exists)
if assessment.assigned_assessor_id:
    notification_service.create_notification(
        db=db,
        notification_create=NotificationCreate(
            title="New Assessment for Review",
            message=f"Assessment from {current_user.name} is ready for review.",
            notification_type=NotificationType.ASSESSMENT_SUBMITTED,
            user_id=assessment.assigned_assessor_id,
            assessment_id=assessment.id,
        )
    )
```

### Step 9: Documentation

**Updated files**:
- `CHANGELOG.md` - Added notification feature entry
- `CLAUDE.md` - Added notification patterns and usage examples
- `docs/api/notifications-api.md` - Created API documentation

### Step 10: Code Review

**Checklist completed**:
- ✅ Authentication on all endpoints
- ✅ Authorization checks (users can only access their own notifications)
- ✅ Pydantic validation on all inputs
- ✅ Database indexes on `user_id`, `is_read`, `created_at`
- ✅ Pagination (max 100 items per page)
- ✅ Error handling with meaningful messages
- ✅ Type hints on all functions
- ✅ Comprehensive tests (service + API)
- ✅ Documentation updated

### Step 11: Deployment

**Database migration**:

```bash
# On production server
cd apps/api
alembic upgrade head
```

**Verify deployment**:

```bash
# Check API health
curl https://api.vantage.example.com/health

# Test notification endpoint (requires auth token)
curl -H "Authorization: Bearer $TOKEN" \
  https://api.vantage.example.com/api/v1/notifications
```

---

## Summary

This guide provided a complete, production-ready workflow for adding features to VANTAGE:

1. **Planning**: Scope requirements, review PRDs, design schema and API
2. **Backend**: Model → Schema → Service → Router (Fat Services, Thin Routers)
3. **Type Generation**: Run `pnpm generate-types` to create TypeScript types
4. **Frontend**: Build pages and components using generated React Query hooks
5. **Testing**: Write comprehensive tests for services and API endpoints
6. **Documentation**: Update CLAUDE.md, CHANGELOG.md, and API docs
7. **Code Review**: Verify security, performance, error handling, type safety, documentation

**Key Takeaways**:
- ✅ Follow the established patterns in CLAUDE.md
- ✅ Keep services fat (business logic) and routers thin (HTTP handling)
- ✅ Use FastAPI tags for Orval organization
- ✅ Always run `pnpm generate-types` after backend changes
- ✅ Write comprehensive tests (service + API)
- ✅ Document everything (docstrings, CHANGELOG, CLAUDE.md)

**Resources**:
- CLAUDE.md - Project conventions and patterns
- docs/prds/ - Product requirements documents
- docs/architecture/ - System architecture
- apps/api/tests/ - Test examples
- https://fastapi.tiangolo.com/ - FastAPI documentation
- https://tanstack.com/query/latest - TanStack Query documentation

Happy coding! 🚀
