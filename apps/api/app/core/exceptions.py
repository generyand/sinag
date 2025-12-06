# 🚨 Custom Exception Classes
# Centralized exception definitions for consistent error handling across the application

from typing import Any


class SinagException(Exception):
    """
    Base exception class for all SINAG application errors.

    All custom exceptions should inherit from this class to ensure
    consistent error handling and response formatting.

    Attributes:
        message: Human-readable error message
        error_code: Machine-readable error code for client handling
        status_code: HTTP status code to return
        details: Additional context about the error
    """

    def __init__(
        self,
        message: str,
        error_code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


# ==================== Authentication & Authorization ====================


class AuthenticationError(SinagException):
    """Raised when authentication fails (invalid credentials, expired token, etc.)."""

    def __init__(
        self,
        message: str = "Authentication failed",
        error_code: str = "AUTH_FAILED",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=401,
            details=details,
        )


class AuthorizationError(SinagException):
    """Raised when user lacks permission to perform an action."""

    def __init__(
        self,
        message: str = "You do not have permission to perform this action",
        error_code: str = "FORBIDDEN",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=403,
            details=details,
        )


class AccountLockedError(AuthenticationError):
    """Raised when user account is locked due to too many failed attempts."""

    def __init__(
        self,
        retry_after: int = 900,  # 15 minutes default
        message: str = "Account temporarily locked due to too many failed login attempts",
    ):
        super().__init__(
            message=message,
            error_code="ACCOUNT_LOCKED",
            details={"retry_after_seconds": retry_after},
        )
        self.retry_after = retry_after


# ==================== Resource Errors ====================


class NotFoundError(SinagException):
    """Raised when a requested resource does not exist."""

    def __init__(
        self,
        resource: str = "Resource",
        resource_id: Any = None,
        message: str | None = None,
    ):
        if message is None:
            if resource_id:
                message = f"{resource} with ID '{resource_id}' not found"
            else:
                message = f"{resource} not found"

        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            status_code=404,
            details={"resource": resource, "resource_id": resource_id},
        )


class ConflictError(SinagException):
    """Raised when there's a conflict (duplicate entry, version mismatch, etc.)."""

    def __init__(
        self,
        message: str = "Resource conflict",
        error_code: str = "CONFLICT",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=409,
            details=details,
        )


class DuplicateError(ConflictError):
    """Raised when attempting to create a duplicate resource."""

    def __init__(
        self,
        resource: str = "Resource",
        field: str | None = None,
        value: Any = None,
    ):
        message = f"{resource} already exists"
        if field and value:
            message = f"{resource} with {field} '{value}' already exists"

        super().__init__(
            message=message,
            error_code="DUPLICATE_ENTRY",
            details={"resource": resource, "field": field, "value": value},
        )


class VersionConflictError(ConflictError):
    """Raised when there's an optimistic locking conflict."""

    def __init__(
        self,
        resource: str = "Resource",
        message: str | None = None,
    ):
        super().__init__(
            message=message or f"{resource} was modified by another user. Please refresh and try again.",
            error_code="VERSION_CONFLICT",
            details={"resource": resource},
        )


# ==================== Validation Errors ====================


class ValidationError(SinagException):
    """Raised when input validation fails."""

    def __init__(
        self,
        message: str = "Validation failed",
        errors: list[dict[str, Any]] | None = None,
        details: dict[str, Any] | None = None,
    ):
        all_details = details or {}
        if errors:
            all_details["errors"] = errors

        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=422,
            details=all_details,
        )


class FileValidationError(ValidationError):
    """Raised when file validation fails (size, type, content)."""

    def __init__(
        self,
        message: str = "File validation failed",
        error_code: str = "FILE_VALIDATION_ERROR",
        filename: str | None = None,
    ):
        super().__init__(
            message=message,
            errors=[{"field": "file", "message": message}],
            details={"filename": filename, "error_code": error_code},
        )


class BusinessRuleError(ValidationError):
    """Raised when a business rule is violated."""

    def __init__(
        self,
        message: str,
        rule: str | None = None,
    ):
        super().__init__(
            message=message,
            details={"rule": rule} if rule else None,
        )
        self.error_code = "BUSINESS_RULE_VIOLATION"


# ==================== External Service Errors ====================


class ExternalServiceError(SinagException):
    """Raised when an external service call fails."""

    def __init__(
        self,
        service: str,
        message: str | None = None,
        original_error: str | None = None,
    ):
        super().__init__(
            message=message or f"External service '{service}' is unavailable",
            error_code="EXTERNAL_SERVICE_ERROR",
            status_code=503,
            details={"service": service, "original_error": original_error},
        )


class DatabaseError(SinagException):
    """Raised when a database operation fails."""

    def __init__(
        self,
        message: str = "Database operation failed",
        operation: str | None = None,
        original_error: str | None = None,
    ):
        super().__init__(
            message=message,
            error_code="DATABASE_ERROR",
            status_code=500,
            details={"operation": operation, "original_error": original_error},
        )


class CacheError(SinagException):
    """Raised when a cache operation fails (non-critical, logged but often fail-open)."""

    def __init__(
        self,
        message: str = "Cache operation failed",
        operation: str | None = None,
    ):
        super().__init__(
            message=message,
            error_code="CACHE_ERROR",
            status_code=500,
            details={"operation": operation},
        )


# ==================== Rate Limiting ====================


class RateLimitError(SinagException):
    """Raised when rate limit is exceeded."""

    def __init__(
        self,
        retry_after: int = 60,
        message: str = "Rate limit exceeded. Please try again later.",
    ):
        super().__init__(
            message=message,
            error_code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            details={"retry_after_seconds": retry_after},
        )
        self.retry_after = retry_after


# ==================== Assessment Workflow Errors ====================


class AssessmentError(SinagException):
    """Base class for assessment-related errors."""

    def __init__(
        self,
        message: str,
        error_code: str = "ASSESSMENT_ERROR",
        status_code: int = 400,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status_code,
            details=details,
        )


class InvalidStatusTransitionError(AssessmentError):
    """Raised when an invalid status transition is attempted."""

    def __init__(
        self,
        current_status: str,
        target_status: str,
        assessment_id: int | None = None,
    ):
        super().__init__(
            message=f"Cannot transition from '{current_status}' to '{target_status}'",
            error_code="INVALID_STATUS_TRANSITION",
            details={
                "current_status": current_status,
                "target_status": target_status,
                "assessment_id": assessment_id,
            },
        )


class AssessmentLockedError(AssessmentError):
    """Raised when trying to modify a locked assessment."""

    def __init__(
        self,
        assessment_id: int | None = None,
        reason: str = "Assessment is locked and cannot be modified",
    ):
        super().__init__(
            message=reason,
            error_code="ASSESSMENT_LOCKED",
            status_code=403,
            details={"assessment_id": assessment_id},
        )


class DeadlineExpiredError(AssessmentError):
    """Raised when an assessment deadline has expired."""

    def __init__(
        self,
        assessment_id: int | None = None,
        deadline: str | None = None,
    ):
        super().__init__(
            message="The deadline for this assessment has expired",
            error_code="DEADLINE_EXPIRED",
            status_code=403,
            details={"assessment_id": assessment_id, "deadline": deadline},
        )
