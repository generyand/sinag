# 🔒 Security Middleware
# Security headers, rate limiting, and request tracking middleware

import time
import uuid
from collections import defaultdict
from collections.abc import Callable

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.

    Headers added:
    - X-Content-Type-Options: nosniff (prevent MIME sniffing)
    - X-Frame-Options: DENY (prevent clickjacking)
    - X-XSS-Protection: 1; mode=block (XSS protection for older browsers)
    - Strict-Transport-Security: HSTS for HTTPS
    - Content-Security-Policy: CSP directives
    - X-Request-ID: Unique request identifier for tracking
    """

    async def dispatch(self, request: Request, call_next: Callable):
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Process the request
        response = await call_next(request)

        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["X-Request-ID"] = request_id

        # Add HSTS header for HTTPS (31536000 seconds = 1 year)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Content Security Policy
        # Note: Adjust based on your frontend needs
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  # Adjust for production
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy (formerly Feature-Policy)
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=()"
        )

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiting middleware.

    Rate limits:
    - 100 requests per minute per IP for general endpoints
    - 20 requests per minute per IP for auth endpoints
    - 1000 requests per minute per IP for health checks

    Note: For production, consider using Redis-based rate limiting
    for distributed systems.
    """

    # Class-level store to allow clearing in tests
    _rate_limit_store: dict[str, dict[str, list]] = defaultdict(lambda: defaultdict(list))

    def __init__(self, app):
        super().__init__(app)
        # Use class-level store for easier testing
        self.rate_limit_store = RateLimitMiddleware._rate_limit_store

        # Rate limit configurations
        # SECURITY: Stricter limits for auth endpoints to prevent brute-force
        self.limits = {
            "/api/v1/auth/login": {
                "requests": 5,
                "window": 300,
            },  # 5 per 5 min (strict)
            "/api/v1/auth/change-password": {
                "requests": 3,
                "window": 300,
            },  # 3 per 5 min
            "/api/v1/auth": {
                "requests": 10,
                "window": 60,
            },  # 10 per minute (other auth)
            "/api/v1/admin": {"requests": 50, "window": 60},  # 50 requests per minute
            "/api/v1/users": {
                "requests": 30,
                "window": 60,
            },  # 30 per minute (user mgmt)
            "/health": {"requests": 1000, "window": 60},  # 1000 requests per minute
            "default": {"requests": 100, "window": 60},  # 100 requests per minute
        }

    @classmethod
    def clear_rate_limits(cls):
        """Clear all rate limit data. Useful for testing."""
        cls._rate_limit_store.clear()

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request."""
        # Check X-Forwarded-For header (proxy/load balancer)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()

        # Fall back to direct client IP
        if request.client:
            return request.client.host

        return "unknown"

    def _get_rate_limit_config(self, path: str) -> dict[str, int]:
        """Get rate limit configuration for a given path."""
        # Check for exact matches first
        for prefix, config in self.limits.items():
            if prefix != "default" and path.startswith(prefix):
                return config

        return self.limits["default"]

    def _is_rate_limited(
        self, client_ip: str, path: str, config: dict[str, int]
    ) -> tuple[bool, int | None]:
        """
        Check if the request should be rate limited.

        Returns:
            tuple: (is_limited, retry_after_seconds)
        """
        now = time.time()
        window = config["window"]
        max_requests = config["requests"]

        # Clean up old entries (outside the time window)
        cutoff_time = now - window
        if client_ip in self.rate_limit_store and path in self.rate_limit_store[client_ip]:
            self.rate_limit_store[client_ip][path] = [
                timestamp
                for timestamp in self.rate_limit_store[client_ip][path]
                if timestamp > cutoff_time
            ]

        # Count requests in the current window
        request_count = len(self.rate_limit_store[client_ip][path])

        if request_count >= max_requests:
            # Calculate retry-after time
            oldest_request = min(self.rate_limit_store[client_ip][path])
            retry_after = int(window - (now - oldest_request)) + 1
            return True, retry_after

        # Add current request to store
        self.rate_limit_store[client_ip][path].append(now)
        return False, None

    async def dispatch(self, request: Request, call_next: Callable):
        client_ip = self._get_client_ip(request)
        path = request.url.path
        config = self._get_rate_limit_config(path)

        # Skip rate limit enforcement for health checks (but still add headers)
        skip_enforcement = request.url.path == "/health"

        # Check rate limit
        is_limited = False
        retry_after = None

        if not skip_enforcement:
            is_limited, retry_after = self._is_rate_limited(client_ip, path, config)

        if is_limited:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Please try again later.",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        # Add rate limit headers to response
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(config["requests"])
        response.headers["X-RateLimit-Window"] = str(config["window"])

        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all incoming requests with request ID.

    Logs:
    - Request method, path, client IP
    - Request processing time
    - Response status code
    - Request ID for correlation
    """

    async def dispatch(self, request: Request, call_next: Callable):
        # Get request ID (set by SecurityHeadersMiddleware)
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))

        # Get client IP
        client_ip = request.headers.get("X-Forwarded-For", "unknown")
        if client_ip == "unknown" and request.client:
            client_ip = request.client.host

        # Start timer
        start_time = time.time()

        # Log request
        import logging

        logger = logging.getLogger(__name__)
        logger.info(f"[{request_id}] {request.method} {request.url.path} - Client: {client_ip}")

        # Process request
        try:
            response = await call_next(request)

            # Calculate processing time
            process_time = time.time() - start_time

            # Log response
            logger.info(
                f"[{request_id}] Status: {response.status_code} - Time: {process_time:.3f}s"
            )

            # Add processing time header
            response.headers["X-Process-Time"] = f"{process_time:.3f}"

            return response

        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"[{request_id}] Error: {str(e)} - Time: {process_time:.3f}s",
                exc_info=True,
            )
            raise
