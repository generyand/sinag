# User Preferences Service
# Business logic for user preferences including onboarding tour state

from collections.abc import Callable

from sqlalchemy.orm import Session

from app.db.models.user import User
from app.schemas.user_preferences import (
    TourCompletedState,
    TourName,
    TourPreferences,
    TourPreferencesUpdate,
    UserPreferences,
    UserPreferencesUpdate,
)


class UserPreferencesService:
    """Service class for managing user preferences.

    Handles user-specific preferences stored in the JSONB preferences column,
    including onboarding tour state, UI settings, and language preferences.

    **Preferences Structure**:
    {
        "tour": {
            "hasSeenTour": bool,
            "completedTours": {
                "dashboard": bool,
                "assessments": bool,
                "indicatorForm": bool,
                "rework": bool
            },
            "tourLanguage": "en" | "fil" | "ceb"
        }
    }

    See Also:
        - apps/api/app/schemas/user_preferences.py: Pydantic schemas
        - apps/api/app/db/models/user.py: User model with preferences column
    """

    def _get_user_or_raise(self, db: Session, user_id: int) -> User:
        """Get user by ID or raise ValueError if not found.

        Args:
            db: Active database session
            user_id: ID of the user

        Returns:
            User object

        Raises:
            ValueError: If user is not found
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        return user

    def _get_preferences_dict(self, user: User) -> dict:
        """Get user preferences as a mutable dict.

        Args:
            user: User object

        Returns:
            Copy of user preferences dict, or empty dict if None
        """
        return dict(user.preferences or {})

    def _ensure_tour_structure(self, prefs: dict) -> dict:
        """Ensure the tour structure exists in preferences.

        Args:
            prefs: Preferences dict to modify

        Returns:
            The same dict with tour structure initialized
        """
        if "tour" not in prefs:
            prefs["tour"] = {}
        return prefs

    def _save_preferences(self, db: Session, user: User, prefs: dict) -> UserPreferences:
        """Save preferences to database and return parsed result.

        Args:
            db: Active database session
            user: User object to update
            prefs: Preferences dict to save

        Returns:
            Parsed UserPreferences object
        """
        user.preferences = prefs
        db.commit()
        db.refresh(user)
        return self._parse_preferences(user.preferences)

    def _update_tour_preferences(
        self,
        db: Session,
        user_id: int,
        modifier: Callable[[dict], None],
    ) -> UserPreferences:
        """Common pattern for updating tour preferences.

        Args:
            db: Active database session
            user_id: ID of the user
            modifier: Function that modifies the preferences dict in place

        Returns:
            Updated UserPreferences object
        """
        user = self._get_user_or_raise(db, user_id)
        prefs = self._get_preferences_dict(user)
        self._ensure_tour_structure(prefs)
        modifier(prefs)
        return self._save_preferences(db, user, prefs)

    def get_preferences(self, db: Session, user_id: int) -> UserPreferences:
        """Get user preferences, raising error if user not found.

        Args:
            db: Active database session
            user_id: ID of the user

        Returns:
            UserPreferences object with tour preferences

        Raises:
            ValueError: If user is not found
        """
        user = self._get_user_or_raise(db, user_id)
        prefs = user.preferences or {}
        return self._parse_preferences(prefs)

    def update_preferences(
        self, db: Session, user_id: int, updates: UserPreferencesUpdate
    ) -> UserPreferences:
        """Update user preferences with partial updates.

        Args:
            db: Active database session
            user_id: ID of the user
            updates: Partial update object

        Returns:
            Updated UserPreferences object
        """

        def apply_updates(prefs: dict) -> None:
            if updates.tour is not None:
                self._merge_tour_updates(prefs, updates.tour)

        return self._update_tour_preferences(db, user_id, apply_updates)

    def mark_tour_complete(self, db: Session, user_id: int, tour_name: TourName) -> UserPreferences:
        """Mark a specific tour as completed.

        Args:
            db: Active database session
            user_id: ID of the user
            tour_name: Name of the tour to mark complete

        Returns:
            Updated UserPreferences object
        """

        def mark_complete(prefs: dict) -> None:
            tour = prefs["tour"]
            if "completedTours" not in tour:
                tour["completedTours"] = {}
            tour["completedTours"][tour_name] = True
            tour["hasSeenTour"] = True

        return self._update_tour_preferences(db, user_id, mark_complete)

    def mark_tour_seen(self, db: Session, user_id: int) -> UserPreferences:
        """Mark that user has seen the tour (regardless of completion).

        Args:
            db: Active database session
            user_id: ID of the user

        Returns:
            Updated UserPreferences object
        """

        def mark_seen(prefs: dict) -> None:
            prefs["tour"]["hasSeenTour"] = True

        return self._update_tour_preferences(db, user_id, mark_seen)

    def reset_tour_state(self, db: Session, user_id: int) -> UserPreferences:
        """Reset all tour completion state (allows user to restart tours).

        Args:
            db: Active database session
            user_id: ID of the user

        Returns:
            Updated UserPreferences object with reset tour state
        """

        def reset_state(prefs: dict) -> None:
            # Preserve language preference
            tour_language = prefs.get("tour", {}).get("tourLanguage", "en")
            prefs["tour"] = {
                "hasSeenTour": False,  # Reset to allow tour to show again
                "completedTours": {
                    "dashboard": False,
                    "assessments": False,
                    "indicatorForm": False,
                    "rework": False,
                },
                "tourLanguage": tour_language,
            }

        return self._update_tour_preferences(db, user_id, reset_state)

    def set_tour_language(self, db: Session, user_id: int, language: str) -> UserPreferences:
        """Set the preferred language for tour content.

        Args:
            db: Active database session
            user_id: ID of the user
            language: Language code ("en", "fil", or "ceb")

        Returns:
            Updated UserPreferences object

        Raises:
            ValueError: If language code is invalid
        """
        if language not in ("en", "fil", "ceb"):
            raise ValueError(f"Invalid language code: {language}")

        def set_language(prefs: dict) -> None:
            prefs["tour"]["tourLanguage"] = language

        return self._update_tour_preferences(db, user_id, set_language)

    def _parse_preferences(self, prefs: dict) -> UserPreferences:
        """Parse raw preferences dict into UserPreferences object."""
        tour_data = prefs.get("tour", {})
        completed_data = tour_data.get("completedTours", {})

        return UserPreferences(
            tour=TourPreferences(
                has_seen_tour=tour_data.get("hasSeenTour", False),
                completed_tours=TourCompletedState(
                    dashboard=completed_data.get("dashboard", False),
                    assessments=completed_data.get("assessments", False),
                    indicatorForm=completed_data.get("indicatorForm", False),
                    rework=completed_data.get("rework", False),
                ),
                tour_language=tour_data.get("tourLanguage", "en"),
            )
        )

    def _merge_tour_updates(self, current_prefs: dict, tour_update: TourPreferencesUpdate) -> None:
        """Merge tour preference updates into current preferences.

        Args:
            current_prefs: Current preferences dict to modify in place
            tour_update: Tour update object with fields to merge
        """
        self._ensure_tour_structure(current_prefs)
        tour = current_prefs["tour"]

        # Update hasSeenTour
        if tour_update.has_seen_tour is not None:
            tour["hasSeenTour"] = tour_update.has_seen_tour

        # Update completedTours
        if tour_update.completed_tours is not None:
            if "completedTours" not in tour:
                tour["completedTours"] = {}

            completed = tour["completedTours"]
            update_data = tour_update.completed_tours.model_dump(exclude_unset=True, by_alias=False)
            for key, value in update_data.items():
                if value is not None:
                    completed[key] = value

        # Update tourLanguage
        if tour_update.tour_language is not None:
            tour["tourLanguage"] = tour_update.tour_language


# Create service instance
user_preferences_service = UserPreferencesService()
