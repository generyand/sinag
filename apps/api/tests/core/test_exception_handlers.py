"""
Tests for global exception handlers (app/core/exception_handlers.py)

Tests cover:
- Exception handler responses for all exception types
- Error response structure validation
- HTTP status codes
- Retry-After headers for rate limiting
- Error ID generation
- SQLAlchemy error handling
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exception_handlers import (
    create_error_response,
    generate_error_id,
    register_exception_handlers,
)
from app.core.exceptions import (
    AccountLockedError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    SinagException,
    ValidationError,
)


class TestGenerateErrorId:
    """Test error ID generation"""

    def test_error_id_format(self):
        """Test error ID is uppercase alphanumeric"""
        error_id = generate_error_id()
        assert len(error_id) == 8
        assert error_id.isupper()

    def test_error_id_unique(self):
        """Test error IDs are unique"""
        ids = [generate_error_id() for _ in range(100)]
        assert len(set(ids)) == 100


class TestCreateErrorResponse:
    """Test error response creation"""

    def test_basic_error_response(self):
        """Test basic error response structure"""
        response = create_error_response(
            status_code=400,
            error="Bad request",
            error_code="BAD_REQUEST",
        )
        assert response["error"] == "Bad request"
        assert response["error_code"] == "BAD_REQUEST"
        assert "detail" not in response
        assert "error_id" not in response

    def test_error_response_with_detail(self):
        """Test error response with detail"""
        response = create_error_response(
            status_code=400,
            error="Bad request",
            error_code="BAD_REQUEST",
            detail="Missing required field",
        )
        assert response["detail"] == "Missing required field"

    def test_error_response_with_error_id(self):
        """Test error response with error ID"""
        response = create_error_response(
            status_code=400,
            error="Bad request",
            error_code="BAD_REQUEST",
            error_id="ABC12345",
        )
        assert response["error_id"] == "ABC12345"

    def test_error_response_with_extras(self):
        """Test error response with extra fields"""
        response = create_error_response(
            status_code=400,
            error="Bad request",
            error_code="BAD_REQUEST",
            extras={"field": "email", "reason": "invalid format"},
        )
        assert response["field"] == "email"
        assert response["reason"] == "invalid format"


class TestExceptionHandlersIntegration:
    """Integration tests for exception handlers using FastAPI TestClient"""

    @pytest.fixture
    def app(self):
        """Create test FastAPI app with exception handlers"""
        app = FastAPI()
        register_exception_handlers(app)

        @app.get("/sinag-exception")
        def raise_sinag():
            raise SinagException("Test error", error_code="TEST_ERROR", status_code=400)

        @app.get("/auth-error")
        def raise_auth():
            raise AuthenticationError("Invalid credentials")

        @app.get("/not-found")
        def raise_not_found():
            raise NotFoundError(resource="User", resource_id=123)

        @app.get("/rate-limit")
        def raise_rate_limit():
            raise RateLimitError(retry_after=120)

        @app.get("/account-locked")
        def raise_account_locked():
            raise AccountLockedError(retry_after=1800)

        @app.get("/validation-error")
        def raise_validation():
            raise ValidationError(
                message="Validation failed",
                errors=[{"field": "email", "message": "Invalid format"}],
            )

        @app.get("/http-exception")
        def raise_http():
            raise StarletteHTTPException(status_code=404, detail="Not found")

        @app.get("/generic-error")
        def raise_generic():
            raise RuntimeError("Unexpected error")

        return app

    @pytest.fixture
    def client(self, app):
        """Create test client"""
        return TestClient(app, raise_server_exceptions=False)

    def test_sinag_exception_handler(self, client):
        """Test SinagException is handled correctly"""
        response = client.get("/sinag-exception")
        assert response.status_code == 400
        data = response.json()
        assert data["error"] == "Test error"
        assert data["error_code"] == "TEST_ERROR"
        assert "error_id" in data

    def test_auth_error_handler(self, client):
        """Test AuthenticationError is handled correctly"""
        response = client.get("/auth-error")
        assert response.status_code == 401
        data = response.json()
        assert data["error"] == "Invalid credentials"
        assert data["error_code"] == "AUTH_FAILED"

    def test_not_found_handler(self, client):
        """Test NotFoundError is handled correctly"""
        response = client.get("/not-found")
        assert response.status_code == 404
        data = response.json()
        assert "User" in data["error"]
        assert data["error_code"] == "NOT_FOUND"

    def test_rate_limit_handler_with_retry_after(self, client):
        """Test RateLimitError includes Retry-After header"""
        response = client.get("/rate-limit")
        assert response.status_code == 429
        assert response.headers.get("Retry-After") == "120"
        data = response.json()
        assert data["error_code"] == "RATE_LIMIT_EXCEEDED"

    def test_account_locked_handler_with_retry_after(self, client):
        """Test AccountLockedError includes Retry-After header"""
        response = client.get("/account-locked")
        assert response.status_code == 401
        assert response.headers.get("Retry-After") == "1800"
        data = response.json()
        assert data["error_code"] == "ACCOUNT_LOCKED"

    def test_validation_error_handler(self, client):
        """Test ValidationError is handled correctly"""
        response = client.get("/validation-error")
        assert response.status_code == 422
        data = response.json()
        assert data["error"] == "Validation failed"
        assert "errors" in data

    def test_http_exception_handler(self, client):
        """Test HTTPException is handled correctly"""
        response = client.get("/http-exception")
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"
        assert "error_id" in data

    def test_generic_exception_handler(self, client):
        """Test generic Exception is handled correctly"""
        response = client.get("/generic-error")
        assert response.status_code == 500
        data = response.json()
        assert data["error_code"] == "INTERNAL_ERROR"
        assert "error_id" in data
        # Should not expose internal error details
        assert "RuntimeError" not in data.get("error", "")


class TestDatabaseErrorHandlers:
    """Test database-specific exception handlers"""

    @pytest.fixture
    def app(self):
        """Create test FastAPI app with database error endpoints"""
        app = FastAPI()
        register_exception_handlers(app)

        @app.get("/integrity-unique")
        def raise_integrity_unique():
            # Simulate unique constraint violation
            orig = Exception("UNIQUE constraint failed: users.email")
            exc = IntegrityError("INSERT", {}, orig)
            raise exc

        @app.get("/integrity-fk")
        def raise_integrity_fk():
            # Simulate foreign key violation
            orig = Exception("FOREIGN KEY constraint failed")
            exc = IntegrityError("INSERT", {}, orig)
            raise exc

        @app.get("/integrity-null")
        def raise_integrity_null():
            # Simulate not-null violation
            orig = Exception("NOT NULL constraint failed: users.name")
            exc = IntegrityError("INSERT", {}, orig)
            raise exc

        @app.get("/operational-error")
        def raise_operational():
            raise OperationalError("connection", {}, None)

        @app.get("/sqlalchemy-error")
        def raise_sqlalchemy():
            raise SQLAlchemyError("Generic database error")

        return app

    @pytest.fixture
    def client(self, app):
        """Create test client"""
        return TestClient(app, raise_server_exceptions=False)

    def test_integrity_error_unique_constraint(self, client):
        """Test unique constraint violation handling"""
        response = client.get("/integrity-unique")
        assert response.status_code == 409
        data = response.json()
        assert data["error_code"] == "DUPLICATE_ENTRY"

    def test_integrity_error_foreign_key(self, client):
        """Test foreign key violation handling"""
        response = client.get("/integrity-fk")
        assert response.status_code == 400
        data = response.json()
        assert data["error_code"] == "FOREIGN_KEY_VIOLATION"

    def test_integrity_error_not_null(self, client):
        """Test not-null violation handling"""
        response = client.get("/integrity-null")
        assert response.status_code == 400
        data = response.json()
        assert data["error_code"] == "NOT_NULL_VIOLATION"

    def test_operational_error_handler(self, client):
        """Test database operational error handling"""
        response = client.get("/operational-error")
        assert response.status_code == 503
        data = response.json()
        assert data["error_code"] == "DATABASE_UNAVAILABLE"

    def test_generic_sqlalchemy_error_handler(self, client):
        """Test generic SQLAlchemy error handling"""
        response = client.get("/sqlalchemy-error")
        assert response.status_code == 500
        data = response.json()
        assert data["error_code"] == "DATABASE_ERROR"


class TestValidationErrorHandler:
    """Test request validation error handling"""

    @pytest.fixture
    def app(self):
        """Create test FastAPI app with validation endpoint"""
        app = FastAPI()
        register_exception_handlers(app)

        class CreateUserRequest(BaseModel):
            email: str
            age: int

        @app.post("/users")
        def create_user(data: CreateUserRequest):
            return {"message": "created"}

        return app

    @pytest.fixture
    def client(self, app):
        """Create test client"""
        return TestClient(app, raise_server_exceptions=False)

    def test_request_validation_error(self, client):
        """Test request validation error handling"""
        response = client.post(
            "/users",
            json={"email": 123, "age": "not-a-number"},
        )
        assert response.status_code == 422
        data = response.json()
        assert data["error_code"] == "VALIDATION_ERROR"
        assert "errors" in data
        assert len(data["errors"]) >= 1

    def test_missing_field_validation(self, client):
        """Test missing required field handling"""
        response = client.post("/users", json={"email": "test@example.com"})
        assert response.status_code == 422
        data = response.json()
        assert data["error_code"] == "VALIDATION_ERROR"


class TestErrorResponseConsistency:
    """Test that all error responses have consistent structure"""

    @pytest.fixture
    def app(self):
        """Create test app with various error endpoints"""
        app = FastAPI()
        register_exception_handlers(app)

        @app.get("/error-{status}")
        def raise_error(status: int):
            if status == 400:
                raise SinagException("Bad request", status_code=400)
            elif status == 401:
                raise AuthenticationError()
            elif status == 403:
                raise AuthorizationError()
            elif status == 404:
                raise NotFoundError()
            elif status == 409:
                raise SinagException("Conflict", status_code=409)
            elif status == 422:
                raise ValidationError()
            elif status == 429:
                raise RateLimitError()
            else:
                raise SinagException("Error", status_code=status)

        return app

    @pytest.fixture
    def client(self, app):
        return TestClient(app, raise_server_exceptions=False)

    @pytest.mark.parametrize("status", [400, 401, 403, 404, 409, 422, 429])
    def test_consistent_error_structure(self, client, status):
        """Test all errors have consistent structure"""
        response = client.get(f"/error-{status}")
        assert response.status_code == status
        data = response.json()

        # All responses must have these fields
        assert "error" in data
        assert "error_code" in data
        assert "error_id" in data

        # Error should be a string
        assert isinstance(data["error"], str)
        assert isinstance(data["error_code"], str)
        assert isinstance(data["error_id"], str)
