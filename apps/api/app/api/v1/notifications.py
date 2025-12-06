# Notifications API Routes
# Endpoints for notification management


from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models.user import User
from app.schemas.notification import (
    MarkReadRequest,
    MarkReadResponse,
    NotificationCountResponse,
    NotificationListResponse,
    NotificationResponse,
)
from app.services.notification_service import notification_service

router = APIRouter()


@router.get(
    "/",
    response_model=NotificationListResponse,
    tags=["notifications"],
    summary="Get user notifications",
)
async def get_notifications(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    skip: int = Query(0, ge=0, description="Number of notifications to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum notifications to return"),
    unread_only: bool = Query(False, description="Filter to unread notifications only"),
):
    """
    Get paginated notifications for the current user.

    Returns notifications ordered by creation date (newest first).
    Includes total count and unread count for UI badge.
    """
    notifications, total, unread_count = notification_service.get_user_notifications(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        unread_only=unread_only,
    )

    return NotificationListResponse(
        notifications=notifications,
        total=total,
        unread_count=unread_count,
    )


@router.get(
    "/count",
    response_model=NotificationCountResponse,
    tags=["notifications"],
    summary="Get unread notification count",
)
async def get_notification_count(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Get unread notification count for the current user.

    Optimized endpoint for polling - returns minimal payload.
    Use this for updating the notification badge without fetching full list.
    """
    unread_count = notification_service.get_unread_count(db, current_user.id)
    total = notification_service.get_total_count(db, current_user.id)

    return NotificationCountResponse(
        unread_count=unread_count,
        total=total,
    )


@router.post(
    "/mark-read",
    response_model=MarkReadResponse,
    tags=["notifications"],
    summary="Mark notifications as read",
)
async def mark_notifications_read(
    request: MarkReadRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Mark specific notifications as read.

    Only marks notifications owned by the current user.
    Returns the number of notifications actually marked.
    """
    marked_count = notification_service.mark_as_read(
        db=db,
        user_id=current_user.id,
        notification_ids=request.notification_ids,
    )

    return MarkReadResponse(
        success=True,
        marked_count=marked_count,
    )


@router.post(
    "/mark-all-read",
    response_model=MarkReadResponse,
    tags=["notifications"],
    summary="Mark all notifications as read",
)
async def mark_all_notifications_read(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Mark all notifications as read for the current user.

    Returns the number of notifications marked.
    """
    marked_count = notification_service.mark_all_as_read(
        db=db,
        user_id=current_user.id,
    )

    return MarkReadResponse(
        success=True,
        marked_count=marked_count,
    )


@router.get(
    "/{notification_id}",
    response_model=NotificationResponse,
    tags=["notifications"],
    summary="Get single notification",
)
async def get_notification(
    notification_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Get a single notification by ID.

    Only returns notification if it belongs to the current user.
    """
    notification = notification_service.get_notification_by_id(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id,
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    # Build enriched response
    response = NotificationResponse.model_validate(notification)

    # Add assessment barangay name if available
    if notification.assessment and notification.assessment.blgu_user:
        if notification.assessment.blgu_user.barangay:
            response.assessment_barangay_name = notification.assessment.blgu_user.barangay.name

    # Add governance area name if available
    if notification.governance_area:
        response.governance_area_name = notification.governance_area.name

    return response
