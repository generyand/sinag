# User Preferences Schemas
# Pydantic models for user preferences API requests and responses

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Language codes for tour content
TourLanguage = Literal["en", "fil", "ceb"]

# Tour names
TourName = Literal["dashboard", "assessments", "indicatorForm", "rework"]


class TourCompletedState(BaseModel):
    """Tracks which tours the user has completed."""

    dashboard: bool = False
    assessments: bool = False
    indicatorForm: bool = Field(default=False, alias="indicator_form")
    rework: bool = False

    model_config = ConfigDict(populate_by_name=True)


class TourPreferences(BaseModel):
    """User's tour-related preferences."""

    # Whether user has seen any tour (first-time detection)
    has_seen_tour: bool = Field(default=False, alias="hasSeenTour")

    # Which tours have been completed
    completed_tours: TourCompletedState = Field(
        default_factory=TourCompletedState, alias="completedTours"
    )

    # Preferred language for tour content
    tour_language: TourLanguage = Field(default="en", alias="tourLanguage")

    model_config = ConfigDict(populate_by_name=True)


class UserPreferences(BaseModel):
    """Full user preferences object stored in the database."""

    tour: TourPreferences = Field(default_factory=TourPreferences)

    model_config = ConfigDict(from_attributes=True)


class UserPreferencesResponse(BaseModel):
    """Response model for GET /users/me/preferences."""

    tour: TourPreferences = Field(default_factory=TourPreferences)

    model_config = ConfigDict(from_attributes=True)


class TourCompletedUpdate(BaseModel):
    """Update model for marking tours as completed."""

    dashboard: bool | None = None
    assessments: bool | None = None
    indicatorForm: bool | None = Field(default=None, alias="indicator_form")
    rework: bool | None = None

    model_config = ConfigDict(populate_by_name=True)


class TourPreferencesUpdate(BaseModel):
    """Update model for tour preferences."""

    has_seen_tour: bool | None = Field(default=None, alias="hasSeenTour")
    completed_tours: TourCompletedUpdate | None = Field(default=None, alias="completedTours")
    tour_language: TourLanguage | None = Field(default=None, alias="tourLanguage")

    model_config = ConfigDict(populate_by_name=True)


class UserPreferencesUpdate(BaseModel):
    """Request model for PATCH /users/me/preferences."""

    tour: TourPreferencesUpdate | None = None

    model_config = ConfigDict(from_attributes=True)
