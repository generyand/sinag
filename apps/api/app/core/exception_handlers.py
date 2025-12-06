# 🛡️ Global Exception Handlers
# Centralized exception handling for consistent API error responses

import logging
import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import SinagException

logger = logging.getLogger(__name__)


def generate_error_id() -> str:
    """Generate a unique error ID for tracking."""
    return str(uuid.uuid4())[:8].upper()


def create_error_response(
    status_code: int,
    error: str,
    error_code: str,
    detail: str | None = None,
    error_id: str | None = None,
    extras: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Create a standardized error response.

    This ensures all error responses follow the same structure:
    {
        "error": "Human-readable error message",
        "error_code": "MACHINE_READABLE_CODE",
        "detail": "Additional context (optional)",
        "error_id": "ABC12345 (for tracking)",
        ...extras
    }
    """
    response = {
        "error": error,
        "error_code": error_code,
    }

    if detail:
        response["detail"] = detail

    if error_id:
        response["error_id"] = error_id

    if extras:
        response.update(extras)

    return response


async def sinag_exception_handler(request: Request, exc: SinagException) -> JSONResponse:
    """
    Handle all custom SinagException errors.

    These are expected application errors with proper status codes and messages.
    """
    error_id = generate_error_id()

    # Log based on severity
    if exc.status_code >= 500:
        logger.error(
            "Application error [%s]: %s - %s",
            error_id,
            exc.error_code,
            exc.message,
            exc_info=True,
        )
    else:
        logger.warning(
            "Client error [%s]: %s - %s",
            error_id,
            exc.error_code,
            exc.message,
        )

    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(
            status_code=exc.status_code,
            error=exc.message,
            error_code=exc.error_code,
            error_id=error_id,
            extras=exc.details if exc.details else None,
        ),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """
    Handle FastAPI/Starlette HTTP exceptions.

    Converts standard HTTPExceptions to our standardized format.
    """
    error_id = generate_error_id()

    # Map common status codes to error codes
    error_code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMIT_EXCEEDED",
        500: "INTERNAL_ERROR",
        502: "BAD_GATEWAY",
        503: "SERVICE_UNAVAILABLE",
        504: "GATEWAY_TIMEOUT",
    }

    error_code = error_code_map.get(exc.status_code, "HTTP_ERROR")

    if exc.status_code >= 500:
        logger.error(
            "HTTP error [%s]: %s - %s",
            error_id,
            exc.status_code,
            exc.detail,
            exc_info=True,
        )
    else:
        logger.info(
            "HTTP error [%s]: %s - %s",
            error_id,
            exc.status_code,
            exc.detail,
        )

    # Handle detail that might be a dict (from our custom exceptions)
    detail = exc.detail
    if isinstance(detail, dict):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": detail.get("message", str(detail)),
                "error_code": error_code,
                "error_id": error_id,
                **{k: v for k, v in detail.items() if k != "message"},
            },
        )

    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(
            status_code=exc.status_code,
            error=str(detail) if detail else "An error occurred",
            error_code=error_code,
            error_id=error_id,
        ),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handle Pydantic validation errors from request parsing.

    Formats validation errors in a user-friendly way.
    """
    error_id = generate_error_id()

    # Format validation errors
    errors = []
    for error in exc.errors():
        location = " -> ".join(str(loc) for loc in error["loc"])
        errors.append(
            {
                "field": location,
                "message": error["msg"],
                "type": error["type"],
            }
        )

    logger.info(
        "Validation error [%s]: %d field(s) failed validation",
        error_id,
        len(errors),
    )

    return JSONResponse(
        status_code=422,
        content=create_error_response(
            status_code=422,
            error="Request validation failed",
            error_code="VALIDATION_ERROR",
            error_id=error_id,
            extras={"errors": errors},
        ),
    )


async def pydantic_validation_exception_handler(
    request: Request, exc: PydanticValidationError
) -> JSONResponse:
    """Handle Pydantic validation errors that occur outside request parsing."""
    error_id = generate_error_id()

    errors = []
    for error in exc.errors():
        location = " -> ".join(str(loc) for loc in error["loc"])
        errors.append(
            {
                "field": location,
                "message": error["msg"],
                "type": error["type"],
            }
        )

    logger.warning(
        "Pydantic validation error [%s]: %s",
        error_id,
        str(exc),
    )

    return JSONResponse(
        status_code=422,
        content=create_error_response(
            status_code=422,
            error="Data validation failed",
            error_code="VALIDATION_ERROR",
            error_id=error_id,
            extras={"errors": errors},
        ),
    )


async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    """
    Handle SQLAlchemy IntegrityError (unique constraint, foreign key violations).

    Maps database constraints to user-friendly error messages.
    """
    error_id = generate_error_id()
    error_str = str(exc.orig) if exc.orig else str(exc)

    logger.error(
        "Database integrity error [%s]: %s",
        error_id,
        error_str,
    )

    # Detect common constraint violations
    if "unique constraint" in error_str.lower() or "duplicate key" in error_str.lower():
        return JSONResponse(
            status_code=409,
            content=create_error_response(
                status_code=409,
                error="A record with this value already exists",
                error_code="DUPLICATE_ENTRY",
                error_id=error_id,
            ),
        )

    if "foreign key constraint" in error_str.lower():
        return JSONResponse(
            status_code=400,
            content=create_error_response(
                status_code=400,
                error="Referenced record does not exist",
                error_code="FOREIGN_KEY_VIOLATION",
                error_id=error_id,
            ),
        )

    if "not null constraint" in error_str.lower() or "not-null constraint" in error_str.lower():
        return JSONResponse(
            status_code=400,
            content=create_error_response(
                status_code=400,
                error="Required field is missing",
                error_code="NOT_NULL_VIOLATION",
                error_id=error_id,
            ),
        )

    # Generic integrity error
    return JSONResponse(
        status_code=400,
        content=create_error_response(
            status_code=400,
            error="Database constraint violation",
            error_code="INTEGRITY_ERROR",
            error_id=error_id,
        ),
    )


async def operational_error_handler(request: Request, exc: OperationalError) -> JSONResponse:
    """
    Handle SQLAlchemy OperationalError (connection issues, timeouts).
    """
    error_id = generate_error_id()

    logger.error(
        "Database operational error [%s]: %s",
        error_id,
        str(exc),
        exc_info=True,
    )

    return JSONResponse(
        status_code=503,
        content=create_error_response(
            status_code=503,
            error="Database temporarily unavailable. Please try again.",
            error_code="DATABASE_UNAVAILABLE",
            error_id=error_id,
        ),
    )


async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """
    Handle generic SQLAlchemy errors not caught by specific handlers.
    """
    error_id = generate_error_id()

    logger.error(
        "Database error [%s]: %s",
        error_id,
        str(exc),
        exc_info=True,
    )

    return JSONResponse(
        status_code=500,
        content=create_error_response(
            status_code=500,
            error="A database error occurred. Please try again.",
            error_code="DATABASE_ERROR",
            error_id=error_id,
        ),
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all handler for unexpected exceptions.

    This ensures no unhandled exceptions leak stack traces to the client.
    Always logs the full stack trace for debugging.
    """
    error_id = generate_error_id()

    logger.error(
        "Unhandled exception [%s]: %s: %s",
        error_id,
        type(exc).__name__,
        str(exc),
        exc_info=True,
    )

    return JSONResponse(
        status_code=500,
        content=create_error_response(
            status_code=500,
            error="An unexpected error occurred. Please try again later.",
            error_code="INTERNAL_ERROR",
            error_id=error_id,
            detail=f"Reference ID: {error_id}",
        ),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """
    Register all exception handlers with the FastAPI application.

    Call this function during app initialization to set up global error handling.

    Order matters: More specific handlers should be registered first.
    """
    # Custom application exceptions (most specific)
    app.add_exception_handler(SinagException, sinag_exception_handler)

    # Request validation errors
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(PydanticValidationError, pydantic_validation_exception_handler)

    # Database errors (from most specific to least)
    app.add_exception_handler(IntegrityError, integrity_error_handler)
    app.add_exception_handler(OperationalError, operational_error_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)

    # HTTP exceptions
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)

    # Catch-all for unexpected errors (least specific, must be last)
    app.add_exception_handler(Exception, generic_exception_handler)

    logger.info("Global exception handlers registered successfully")
