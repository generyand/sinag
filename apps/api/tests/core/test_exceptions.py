"""
Tests for custom exception classes (app/core/exceptions.py)

Tests cover:
- Exception instantiation with various parameters
- String representations (__str__ and __repr__)
- Status code and error code assignments
- Exception hierarchy (inheritance)
- Details dictionary handling
"""

import pytest

from app.core.exceptions import (
    AccountLockedError,
    AssessmentError,
    AssessmentLockedError,
    AuthenticationError,
    AuthorizationError,
    BusinessRuleError,
    CacheError,
    ConflictError,
    DatabaseError,
    DeadlineExpiredError,
    DuplicateError,
    ExternalServiceError,
    FileValidationError,
    InvalidStatusTransitionError,
    NotFoundError,
    RateLimitError,
    SinagException,
    ValidationError,
    VersionConflictError,
)


class TestSinagException:
    """Test base SinagException class"""

    def test_default_initialization(self):
        """Test exception with default values"""
        exc = SinagException("Test error")
        assert exc.message == "Test error"
        assert exc.error_code == "INTERNAL_ERROR"
        assert exc.status_code == 500
        assert exc.details == {}

    def test_custom_initialization(self):
        """Test exception with all custom values"""
        exc = SinagException(
            message="Custom error",
            error_code="CUSTOM_CODE",
            status_code=418,
            details={"key": "value"},
        )
        assert exc.message == "Custom error"
        assert exc.error_code == "CUSTOM_CODE"
        assert exc.status_code == 418
        assert exc.details == {"key": "value"}

    def test_str_representation(self):
        """Test __str__ returns formatted string"""
        exc = SinagException("Test message", error_code="TEST_CODE")
        assert str(exc) == "TEST_CODE: Test message"

    def test_repr_representation(self):
        """Test __repr__ returns detailed string"""
        exc = SinagException(
            message="Test message",
            error_code="TEST_CODE",
            status_code=400,
            details={"foo": "bar"},
        )
        repr_str = repr(exc)
        assert "SinagException" in repr_str
        assert "Test message" in repr_str
        assert "TEST_CODE" in repr_str
        assert "400" in repr_str
        assert "foo" in repr_str

    def test_exception_is_raiseable(self):
        """Test exception can be raised and caught"""
        with pytest.raises(SinagException) as exc_info:
            raise SinagException("Raised error")
        assert exc_info.value.message == "Raised error"


class TestAuthenticationErrors:
    """Test authentication-related exceptions"""

    def test_authentication_error_defaults(self):
        """Test AuthenticationError default values"""
        exc = AuthenticationError()
        assert exc.message == "Authentication failed"
        assert exc.error_code == "AUTH_FAILED"
        assert exc.status_code == 401

    def test_authentication_error_custom_message(self):
        """Test AuthenticationError with custom message"""
        exc = AuthenticationError(message="Invalid token")
        assert exc.message == "Invalid token"
        assert exc.status_code == 401

    def test_account_locked_error_defaults(self):
        """Test AccountLockedError default values"""
        exc = AccountLockedError()
        assert exc.retry_after == 900
        assert exc.error_code == "ACCOUNT_LOCKED"
        assert exc.status_code == 401
        assert "retry_after_seconds" in exc.details

    def test_account_locked_error_custom_retry(self):
        """Test AccountLockedError with custom retry_after"""
        exc = AccountLockedError(retry_after=1800)
        assert exc.retry_after == 1800
        assert exc.details["retry_after_seconds"] == 1800


class TestAuthorizationError:
    """Test authorization exception"""

    def test_authorization_error_defaults(self):
        """Test AuthorizationError default values"""
        exc = AuthorizationError()
        assert exc.message == "You do not have permission to perform this action"
        assert exc.error_code == "FORBIDDEN"
        assert exc.status_code == 403


class TestResourceErrors:
    """Test resource-related exceptions"""

    def test_not_found_error_with_id(self):
        """Test NotFoundError with resource and ID"""
        exc = NotFoundError(resource="User", resource_id=123)
        assert exc.message == "User with ID '123' not found"
        assert exc.error_code == "NOT_FOUND"
        assert exc.status_code == 404
        assert exc.details["resource"] == "User"
        assert exc.details["resource_id"] == 123

    def test_not_found_error_without_id(self):
        """Test NotFoundError without resource ID"""
        exc = NotFoundError(resource="Configuration")
        assert exc.message == "Configuration not found"

    def test_not_found_error_custom_message(self):
        """Test NotFoundError with custom message"""
        exc = NotFoundError(message="Custom not found")
        assert exc.message == "Custom not found"

    def test_conflict_error(self):
        """Test ConflictError"""
        exc = ConflictError(message="Version mismatch")
        assert exc.message == "Version mismatch"
        assert exc.status_code == 409

    def test_duplicate_error_with_field(self):
        """Test DuplicateError with field info"""
        exc = DuplicateError(resource="User", field="email", value="test@example.com")
        assert "email" in exc.message
        assert "test@example.com" in exc.message
        assert exc.error_code == "DUPLICATE_ENTRY"
        assert exc.status_code == 409

    def test_version_conflict_error(self):
        """Test VersionConflictError"""
        exc = VersionConflictError(resource="Assessment")
        assert "Assessment" in exc.message
        assert exc.error_code == "VERSION_CONFLICT"


class TestValidationErrors:
    """Test validation-related exceptions"""

    def test_validation_error_defaults(self):
        """Test ValidationError default values"""
        exc = ValidationError()
        assert exc.message == "Validation failed"
        assert exc.error_code == "VALIDATION_ERROR"
        assert exc.status_code == 422

    def test_validation_error_with_errors_list(self):
        """Test ValidationError with errors list"""
        errors = [{"field": "name", "message": "Required"}]
        exc = ValidationError(errors=errors)
        assert exc.details["errors"] == errors

    def test_file_validation_error(self):
        """Test FileValidationError"""
        exc = FileValidationError(message="File too large", filename="test.pdf")
        assert exc.message == "File too large"
        assert exc.details["filename"] == "test.pdf"
        assert exc.status_code == 422

    def test_business_rule_error(self):
        """Test BusinessRuleError"""
        exc = BusinessRuleError(message="Cannot submit twice", rule="single_submission")
        assert exc.message == "Cannot submit twice"
        assert exc.error_code == "BUSINESS_RULE_VIOLATION"
        assert exc.details["rule"] == "single_submission"


class TestExternalServiceErrors:
    """Test external service exceptions"""

    def test_external_service_error(self):
        """Test ExternalServiceError"""
        exc = ExternalServiceError(service="Gemini API", original_error="Timeout")
        assert "Gemini API" in exc.message
        assert exc.status_code == 503
        assert exc.details["service"] == "Gemini API"
        assert exc.details["original_error"] == "Timeout"

    def test_database_error(self):
        """Test DatabaseError"""
        exc = DatabaseError(operation="INSERT", original_error="Connection lost")
        assert exc.status_code == 500
        assert exc.error_code == "DATABASE_ERROR"
        assert exc.details["operation"] == "INSERT"

    def test_cache_error(self):
        """Test CacheError"""
        exc = CacheError(operation="GET")
        assert exc.error_code == "CACHE_ERROR"
        assert exc.details["operation"] == "GET"


class TestRateLimitError:
    """Test rate limiting exception"""

    def test_rate_limit_error_defaults(self):
        """Test RateLimitError default values"""
        exc = RateLimitError()
        assert exc.retry_after == 60
        assert exc.error_code == "RATE_LIMIT_EXCEEDED"
        assert exc.status_code == 429
        assert exc.details["retry_after_seconds"] == 60

    def test_rate_limit_error_custom_retry(self):
        """Test RateLimitError with custom retry_after"""
        exc = RateLimitError(retry_after=120)
        assert exc.retry_after == 120
        assert exc.details["retry_after_seconds"] == 120


class TestAssessmentErrors:
    """Test assessment workflow exceptions"""

    def test_assessment_error_base(self):
        """Test base AssessmentError"""
        exc = AssessmentError(message="Assessment error occurred")
        assert exc.status_code == 400
        assert exc.error_code == "ASSESSMENT_ERROR"

    def test_invalid_status_transition(self):
        """Test InvalidStatusTransitionError"""
        exc = InvalidStatusTransitionError(
            current_status="DRAFT",
            target_status="COMPLETED",
            assessment_id=42,
        )
        assert "DRAFT" in exc.message
        assert "COMPLETED" in exc.message
        assert exc.error_code == "INVALID_STATUS_TRANSITION"
        assert exc.details["assessment_id"] == 42

    def test_assessment_locked_error(self):
        """Test AssessmentLockedError"""
        exc = AssessmentLockedError(assessment_id=123)
        assert exc.error_code == "ASSESSMENT_LOCKED"
        assert exc.status_code == 403
        assert exc.details["assessment_id"] == 123

    def test_deadline_expired_error(self):
        """Test DeadlineExpiredError"""
        exc = DeadlineExpiredError(assessment_id=456, deadline="2024-12-31")
        assert exc.error_code == "DEADLINE_EXPIRED"
        assert exc.status_code == 403
        assert exc.details["deadline"] == "2024-12-31"


class TestExceptionHierarchy:
    """Test exception inheritance relationships"""

    def test_authentication_error_is_sinag_exception(self):
        """AuthenticationError should inherit from SinagException"""
        exc = AuthenticationError()
        assert isinstance(exc, SinagException)

    def test_account_locked_is_authentication_error(self):
        """AccountLockedError should inherit from AuthenticationError"""
        exc = AccountLockedError()
        assert isinstance(exc, AuthenticationError)
        assert isinstance(exc, SinagException)

    def test_duplicate_error_is_conflict_error(self):
        """DuplicateError should inherit from ConflictError"""
        exc = DuplicateError()
        assert isinstance(exc, ConflictError)
        assert isinstance(exc, SinagException)

    def test_file_validation_is_validation_error(self):
        """FileValidationError should inherit from ValidationError"""
        exc = FileValidationError()
        assert isinstance(exc, ValidationError)
        assert isinstance(exc, SinagException)

    def test_invalid_status_transition_is_assessment_error(self):
        """InvalidStatusTransitionError should inherit from AssessmentError"""
        exc = InvalidStatusTransitionError("DRAFT", "COMPLETED")
        assert isinstance(exc, AssessmentError)
        assert isinstance(exc, SinagException)

    def test_all_exceptions_are_base_exception(self):
        """All custom exceptions should be catchable as Exception"""
        exceptions = [
            SinagException("test"),
            AuthenticationError(),
            AuthorizationError(),
            NotFoundError(),
            ValidationError(),
            RateLimitError(),
            AssessmentError("test"),
        ]
        for exc in exceptions:
            assert isinstance(exc, Exception)
