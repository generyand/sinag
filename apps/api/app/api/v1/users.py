# 👥 Users API Routes
# Endpoints for user management and user information

import math

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models.user import User
from app.schemas.user import (
    PasswordResetRequest,
    UserAdminCreate,
    UserAdminUpdate,
    UserListResponse,
    UserUpdate,
)
from app.schemas.user import User as UserSchema
from app.services.user_service import user_service

router = APIRouter()


@router.get("/me", response_model=UserSchema, tags=["users"])
async def get_current_user(current_user: User = Depends(deps.get_current_active_user)):
    """
    Get current user information.

    Returns the profile information of the authenticated user.
    """
    return current_user


@router.put("/me", response_model=UserSchema, tags=["users"])
async def update_current_user(
    user_update: UserUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Update current user information.

    Allows users to update their own profile information.
    """
    updated_user = user_service.update_user(db, current_user.id, user_update)
    if not updated_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return updated_user


@router.patch("/me/language", response_model=UserSchema, tags=["users"])
async def update_language_preference(
    language: str = Query(
        ...,
        pattern="^(ceb|fil|en)$",
        description="Language code: ceb (Bisaya), fil (Tagalog), or en (English)",
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Update user's preferred language for AI-generated summaries.

    Sets the default language for AI-generated content like rework summaries
    and CapDev recommendations.

    Supported languages:
    - ceb: Bisaya (Cebuano) - Default for BLGU users
    - fil: Tagalog (Filipino)
    - en: English

    Args:
        language: Language code (ceb, fil, or en)

    Returns:
        Updated user profile with new language preference
    """
    current_user.preferred_language = language
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/logo", response_model=UserSchema, tags=["users"])
def upload_user_logo(
    file: UploadFile = File(..., description="Profile logo image (JPEG, PNG, or WebP, max 5MB)"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Upload a profile logo for the current user.

    This endpoint allows users to upload their profile picture or organization logo.
    The image will be stored in Supabase Storage and the URL will be saved to the user's profile.

    **Requirements:**
    - **Allowed formats**: JPEG, PNG, WebP
    - **Maximum file size**: 5MB
    - **Recommended dimensions**: At least 200x200 pixels for best quality

    **Behavior:**
    - If the user already has a logo, the old one will be deleted and replaced
    - The logo URL is publicly accessible for display in the application

    Returns:
        Updated user profile with new logo_url and logo_uploaded_at
    """
    return user_service.upload_user_logo(db, current_user.id, file)


@router.delete("/me/logo", response_model=UserSchema, tags=["users"])
def delete_user_logo(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Delete the current user's profile logo.

    This endpoint removes the user's profile logo from both Supabase Storage
    and clears the logo_url from their profile.

    Returns:
        Updated user profile with cleared logo fields

    Raises:
        404: If the user has no logo to delete
    """
    return user_service.delete_user_logo(db, current_user.id)


@router.get("/", response_model=UserListResponse, tags=["users"])
async def get_users(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    search: str | None = Query(None, description="Search in name and email"),
    role: str | None = Query(None, description="Filter by role"),
    is_active: bool | None = Query(None, description="Filter by active status"),
):
    """
    Get paginated list of users with optional filtering.

    Requires admin privileges (MLGOO_DILG role).
    """
    skip = (page - 1) * size
    users, total = user_service.get_users(
        db, skip=skip, limit=size, search=search, role=role, is_active=is_active
    )

    total_pages = math.ceil(total / size)

    return UserListResponse(users=users, total=total, page=page, size=size, total_pages=total_pages)


@router.post("/", response_model=UserSchema, tags=["users"])
async def create_user(
    user_create: UserAdminCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Create a new user.

    Requires admin privileges (MLGOO_DILG role).

    Role-based assignment rules:
    - VALIDATOR: Requires validator_area_id (governance area assignment)
    - BLGU_USER: Requires barangay_id (barangay assignment)
    - ASSESSOR: No assignments (arbitrary barangay selection in workflow)
    - MLGOO_DILG: No assignments (system-wide access)

    The service layer enforces these rules and returns 400 Bad Request for invalid combinations.
    """
    return user_service.create_user_admin(db, user_create)


@router.get("/{user_id}", response_model=UserSchema, tags=["users"])
async def get_user(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Get user by ID.

    Requires admin privileges (MLGOO_DILG role).
    """
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserSchema, tags=["users"])
async def update_user(
    user_id: int,
    user_update: UserAdminUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Update user by ID.

    Requires admin privileges (MLGOO_DILG role).

    Role-based assignment rules:
    - VALIDATOR: Requires validator_area_id (governance area assignment)
    - BLGU_USER: Requires barangay_id (barangay assignment)
    - ASSESSOR: No assignments (arbitrary barangay selection in workflow)
    - MLGOO_DILG: No assignments (system-wide access)

    When changing a user's role, the service layer automatically clears incompatible assignments.
    Returns 400 Bad Request for invalid role/assignment combinations.
    """
    updated_user = user_service.update_user_admin(db, user_id, user_update)
    if not updated_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return updated_user


@router.delete("/{user_id}", response_model=UserSchema, tags=["users"])
async def deactivate_user(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Deactivate user by ID (soft delete).

    Requires admin privileges (MLGOO_DILG role).
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account",
        )

    deactivated_user = user_service.deactivate_user(db, user_id)
    if not deactivated_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return deactivated_user


@router.post("/{user_id}/activate", response_model=UserSchema, tags=["users"])
async def activate_user(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Activate user by ID.

    Requires admin privileges (MLGOO_DILG role).
    """
    activated_user = user_service.activate_user(db, user_id)
    if not activated_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return activated_user


@router.post("/{user_id}/reset-password", response_model=dict, tags=["users"])
async def reset_user_password(
    user_id: int,
    reset_data: PasswordResetRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Reset user password.

    Requires admin privileges (MLGOO_DILG role).
    Sets must_change_password to True.

    Password requirements:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    """
    reset_user = user_service.reset_password(db, user_id, reset_data.new_password)
    if not reset_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"message": "Password reset successfully"}


@router.get("/stats/dashboard", response_model=dict, tags=["users"])
async def get_user_stats(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Get user statistics for admin dashboard.

    Requires admin privileges (MLGOO_DILG role).
    """
    return user_service.get_user_stats(db)
