# 🔐 Token & Authentication Schemas
# Pydantic models for authentication-related API requests and responses

from pydantic import BaseModel, EmailStr, field_validator


class LoginRequest(BaseModel):
    """
    Schema for user login request.

    Security validations:
    - Email format validation
    - Password length limits (prevent DoS via bcrypt)
    - Email normalization (lowercase, strip whitespace)
    """

    email: EmailStr
    password: str
    remember_me: bool = False

    @field_validator("email", mode="after")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        """Normalize email to lowercase and strip whitespace."""
        return v.lower().strip()

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, v: str) -> str:
        """
        Validate password length.

        - Minimum: 1 character (presence check)
        - Maximum: 72 bytes (bcrypt limit - prevent truncation issues)
        """
        if not v:
            raise ValueError("Password is required")

        # Check byte length (bcrypt truncates at 72 bytes)
        password_bytes = v.encode("utf-8")
        if len(password_bytes) > 72:
            raise ValueError("Password too long (max 72 characters)")

        return v


class AuthToken(BaseModel):
    """Schema for authentication token response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class Token(BaseModel):
    """Standard token response schema."""

    access_token: str
    token_type: str


class TokenPayload(BaseModel):
    """Schema for token payload data."""

    sub: str | None = None
    user_id: str | None = None
    role: str | None = None
    must_change_password: bool | None = None
    iat: float | None = None  # Issued at timestamp
    exp: float | None = None  # Expiration timestamp


class ChangePasswordRequest(BaseModel):
    """
    Schema for password change request.

    Both current and new passwords are validated for length.
    """

    current_password: str
    new_password: str

    @field_validator("current_password", "new_password")
    @classmethod
    def validate_password_length(cls, v: str) -> str:
        """Validate password length."""
        if not v:
            raise ValueError("Password is required")

        password_bytes = v.encode("utf-8")
        if len(password_bytes) > 72:
            raise ValueError("Password too long (max 72 characters)")

        return v

    @field_validator("new_password")
    @classmethod
    def validate_new_password_strength(cls, v: str) -> str:
        """
        Validate new password meets minimum security requirements.

        Note: Full password policy validation is also done in UserCreate/UserUpdate schemas.
        This is a secondary check for the change-password endpoint.
        """
        import re

        if len(v) < 12:
            raise ValueError("Password must be at least 12 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_=+\[\]\\;'`~]", v):
            raise ValueError("Password must contain at least one special character")

        return v
