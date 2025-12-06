# 🚀 Cache Headers Middleware
# Adds appropriate HTTP cache headers to API responses for improved performance

import hashlib
import logging
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class CacheHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add HTTP cache headers to API responses.

    This improves performance by allowing browsers and CDNs to cache
    appropriate responses, reducing server load and response times.

    Cache strategies:
    - No cache: Auth endpoints, user-specific data, mutations
    - Short cache (5-15 min): Dashboards, frequently changing data
    - Long cache (1 hour): External analytics, lookup tables
    """

    # Cache rules for different API paths
    # Format: path_prefix -> {max_age, public, stale_while_revalidate}
    CACHE_RULES: dict[str, dict] = {
        # No cache - sensitive/dynamic endpoints
        "/api/v1/auth": {"cache": False},
        "/api/v1/users/me": {"cache": False},
        # Short cache - dashboards (private, user-specific)
        "/api/v1/analytics": {"max_age": 900, "public": False, "swr": 300},
        "/api/v1/blgu-dashboard": {"max_age": 300, "public": False, "swr": 60},
        "/api/v1/assessor-dashboard": {"max_age": 300, "public": False, "swr": 60},
        "/api/v1/mlgoo-dashboard": {"max_age": 300, "public": False, "swr": 60},
        "/api/v1/validator-dashboard": {"max_age": 300, "public": False, "swr": 60},
        # Long cache - external analytics (public, rarely changes)
        "/api/v1/external-analytics": {"max_age": 3600, "public": True, "swr": 600},
        # Long cache - lookup/reference data (rarely changes)
        "/api/v1/lookups": {"max_age": 3600, "public": True, "swr": 600},
        "/api/v1/governance-areas": {"max_age": 1800, "public": True, "swr": 300},
        "/api/v1/indicators": {"max_age": 1800, "public": True, "swr": 300},
        "/api/v1/cycles": {"max_age": 1800, "public": True, "swr": 300},
        "/api/v1/provinces": {"max_age": 3600, "public": True, "swr": 600},
        "/api/v1/municipalities": {"max_age": 3600, "public": True, "swr": 600},
        # Medium cache - lists (private, changes with user actions)
        "/api/v1/assessments": {"max_age": 60, "public": False, "swr": 30},
        "/api/v1/barangays": {"max_age": 300, "public": False, "swr": 60},
    }

    # Methods that should never be cached
    NON_CACHEABLE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Only add cache headers to successful GET/HEAD requests
        if request.method in self.NON_CACHEABLE_METHODS:
            response.headers["Cache-Control"] = "no-store"
            return response

        if request.method not in {"GET", "HEAD"}:
            return response

        if response.status_code >= 400:
            # Don't cache error responses long
            response.headers["Cache-Control"] = "no-cache, max-age=0"
            return response

        # Find matching cache rule
        path = request.url.path
        cache_rule = self._get_cache_rule(path)

        if cache_rule is None:
            # Default: no cache for unspecified endpoints
            response.headers["Cache-Control"] = "no-cache"
            return response

        if cache_rule.get("cache") is False:
            # Explicitly no-cache
            response.headers["Cache-Control"] = "no-store, private"
            return response

        # Build Cache-Control header
        max_age = cache_rule.get("max_age", 0)
        public = cache_rule.get("public", False)
        swr = cache_rule.get("swr", 0)  # stale-while-revalidate

        visibility = "public" if public else "private"
        cache_control_parts = [visibility, f"max-age={max_age}"]

        if swr > 0:
            cache_control_parts.append(f"stale-while-revalidate={swr}")

        response.headers["Cache-Control"] = ", ".join(cache_control_parts)

        # Add ETag for cache validation (based on response body hash)
        # Note: This requires buffering the response body
        if not response.headers.get("ETag") and hasattr(response, "body"):
            try:
                body = response.body
                if body:
                    etag = hashlib.md5(body).hexdigest()[:16]
                    response.headers["ETag"] = f'W/"{etag}"'
            except Exception:
                pass  # Skip ETag if body not accessible

        # Add Vary header to ensure proper cache key differentiation
        vary_headers = ["Accept", "Accept-Encoding"]
        if not public:
            vary_headers.append("Authorization")
        response.headers["Vary"] = ", ".join(vary_headers)

        return response

    def _get_cache_rule(self, path: str) -> dict | None:
        """Get cache rule for a given path."""
        # Check for exact or prefix matches
        for prefix, rule in self.CACHE_RULES.items():
            if path.startswith(prefix):
                return rule
        return None
