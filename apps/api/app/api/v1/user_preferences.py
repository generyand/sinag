# User Preferences API Routes
# Endpoints for managing user preferences including onboarding tour state

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models.user import User
from app.schemas.user_preferences import (
    TourName,
    UserPreferencesResponse,
    UserPreferencesUpdate,
)
from app.services.user_preferences_service import user_preferences_service

router = APIRouter()


@router.get("/me/preferences", response_model=UserPreferencesResponse, tags=["user-preferences"])
async def get_user_preferences(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Get current user's preferences.

    Returns user preferences including onboarding tour state, completed tours,
    and preferred tour language.
    """
    return user_preferences_service.get_preferences(db, current_user.id)


@router.patch("/me/preferences", response_model=UserPreferencesResponse, tags=["user-preferences"])
async def update_user_preferences(
    updates: UserPreferencesUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Update current user's preferences.

    Allows partial updates to user preferences including tour state and language.
    """
    try:
        return user_preferences_service.update_preferences(db, current_user.id, updates)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/me/preferences/tour/{tour_name}/complete",
    response_model=UserPreferencesResponse,
    tags=["user-preferences"],
)
async def mark_tour_complete(
    tour_name: TourName,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Mark a specific tour as completed.

    Args:
        tour_name: The tour to mark as complete. Options:
            - dashboard: Main dashboard overview tour
            - assessments: Assessment form navigation tour
            - indicatorForm: Indicator form tour
            - rework: Rework workflow tour

    Also sets hasSeenTour to true.
    """
    try:
        return user_preferences_service.mark_tour_complete(db, current_user.id, tour_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/me/preferences/tour/seen",
    response_model=UserPreferencesResponse,
    tags=["user-preferences"],
)
async def mark_tour_seen(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Mark that the user has seen the tour.

    Sets hasSeenTour to true without marking any specific tour as complete.
    Useful when user skips or dismisses the tour.
    """
    try:
        return user_preferences_service.mark_tour_seen(db, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/me/preferences/tour/reset",
    response_model=UserPreferencesResponse,
    tags=["user-preferences"],
)
async def reset_tour_state(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Reset all tour completion state.

    Allows user to restart all tours from the beginning.
    Preserves the tour language preference.
    """
    try:
        return user_preferences_service.reset_tour_state(db, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch(
    "/me/preferences/tour/language",
    response_model=UserPreferencesResponse,
    tags=["user-preferences"],
)
async def set_tour_language(
    language: str = Query(
        ...,
        pattern="^(en|fil|ceb)$",
        description="Language code: en (English), fil (Filipino), or ceb (Cebuano)",
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Set the preferred language for tour content.

    Supported languages:
    - en: English
    - fil: Filipino (Tagalog)
    - ceb: Cebuano (Bisaya)
    """
    try:
        return user_preferences_service.set_tour_language(db, current_user.id, language)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
