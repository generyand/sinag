# 👥 User Schemas
# Pydantic models for user-related API requests and responses

import re
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from datetime import datetime
from typing import Literal, Optional, Union

from app.db.enums import UserRole


def coerce_to_optional_int(v: Union[int, str, None]) -> Optional[int]:
    """Coerce string integers to int, handle null/empty strings."""
    if v is None or v == '' or v == 'null':
        return None
    if isinstance(v, str):
        try:
            return int(v)
        except ValueError:
            raise ValueError(f"Invalid integer value: {v}")
    return v


def validate_password_strength(v: str) -> str:
    """Validate password meets minimum security requirements."""
    if len(v) < 8:
        raise ValueError('Password must be at least 8 characters long')
    if not re.search(r'[A-Z]', v):
        raise ValueError('Password must contain at least one uppercase letter')
    if not re.search(r'[a-z]', v):
        raise ValueError('Password must contain at least one lowercase letter')
    if not re.search(r'\d', v):
        raise ValueError('Password must contain at least one digit')
    return v

# Language code type for AI summary preferences
LanguageCode = Literal["ceb", "fil", "en"]


class User(BaseModel):
    """User response model for API endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str  # Keep as str for response (already validated on input)
    name: str
    role: UserRole
    phone_number: Optional[str] = None
    validator_area_id: Optional[int] = None  # Validator's assigned governance area
    barangay_id: Optional[int] = None
    is_active: bool
    is_superuser: bool
    must_change_password: bool
    preferred_language: LanguageCode = "ceb"
    created_at: datetime
    updated_at: Optional[datetime] = None


class UserCreate(BaseModel):
    """Schema for creating a new user."""

    email: EmailStr
    name: str
    password: str
    role: UserRole = UserRole.BLGU_USER
    phone_number: Optional[str] = None
    barangay_id: Optional[int] = None
    is_active: bool = True
    must_change_password: bool = True
    preferred_language: LanguageCode = "ceb"

    @field_validator('password')
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)

    @field_validator('barangay_id', mode='before')
    @classmethod
    def coerce_barangay_id(cls, v: Union[int, str, None]) -> Optional[int]:
        return coerce_to_optional_int(v)


class UserUpdate(BaseModel):
    """Schema for updating user information."""

    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[UserRole] = None
    phone_number: Optional[str] = None
    validator_area_id: Optional[int] = None
    barangay_id: Optional[int] = None
    is_active: Optional[bool] = None
    preferred_language: Optional[LanguageCode] = None

    @field_validator('validator_area_id', 'barangay_id', mode='before')
    @classmethod
    def coerce_ids(cls, v: Union[int, str, None]) -> Optional[int]:
        return coerce_to_optional_int(v)


class UserAdminCreate(BaseModel):
    """Schema for admin creating a new user with all permissions."""

    email: EmailStr
    name: str
    password: str
    role: UserRole = UserRole.BLGU_USER
    phone_number: Optional[str] = None
    validator_area_id: Optional[int] = None
    barangay_id: Optional[int] = None
    is_active: bool = True
    is_superuser: bool = False
    must_change_password: bool = True
    preferred_language: LanguageCode = "ceb"

    @field_validator('password')
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)

    @field_validator('validator_area_id', 'barangay_id', mode='before')
    @classmethod
    def coerce_ids(cls, v: Union[int, str, None]) -> Optional[int]:
        return coerce_to_optional_int(v)


class UserAdminUpdate(BaseModel):
    """Schema for admin updating user information with all permissions."""

    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[UserRole] = None
    phone_number: Optional[str] = None
    validator_area_id: Optional[int] = None
    barangay_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    must_change_password: Optional[bool] = None
    preferred_language: Optional[LanguageCode] = None

    @field_validator('validator_area_id', 'barangay_id', mode='before')
    @classmethod
    def coerce_ids(cls, v: Union[int, str, None]) -> Optional[int]:
        return coerce_to_optional_int(v)


class UserListResponse(BaseModel):
    """Schema for paginated user list response."""

    model_config = ConfigDict(from_attributes=True)

    users: list[User]
    total: int
    page: int
    size: int
    total_pages: int


class UserInDB(User):
    """User model as stored in database (includes sensitive fields)."""

    hashed_password: str
    is_superuser: bool = False
    updated_at: Optional[datetime] = None


class PasswordResetRequest(BaseModel):
    """Schema for admin password reset request."""

    new_password: str

    @field_validator('new_password')
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)
