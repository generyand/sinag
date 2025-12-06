# 🔧 System Schemas
# Pydantic models for system-level API responses

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ApiResponse(BaseModel):
    """Generic API response schema."""

    message: str


class HealthCheck(BaseModel):
    """Health check response schema."""

    status: str
    timestamp: datetime
    api: dict[str, Any]
    connections: dict[str, Any]
    checks: dict[str, Any]


class ErrorResponse(BaseModel):
    """Error response schema."""

    error: str
    detail: str | None = None


class SuccessResponse(BaseModel):
    """Success response schema."""

    success: bool = True
    message: str


class ValidationResult(BaseModel):
    """
    File validation result schema.

    Used by FileValidationService to return validation results
    with success status, error messages, and error codes.
    """

    success: bool
    error_message: str | None = None
    error_code: str | None = None
