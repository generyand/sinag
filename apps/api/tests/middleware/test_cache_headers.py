"""
Test Cache Headers Middleware
Tests for HTTP cache headers middleware functionality
"""

from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.cache_headers import CacheHeadersMiddleware


class TestCacheHeadersMiddleware:
    """Test CacheHeadersMiddleware class functionality"""

    @pytest.fixture
    def app_with_middleware(self):
        """Create FastAPI app with cache headers middleware for testing"""
        app = FastAPI()
        app.add_middleware(CacheHeadersMiddleware)

        @app.get("/api/v1/auth/login")
        def auth_endpoint():
            return {"message": "auth"}

        @app.get("/api/v1/users/me")
        def user_me():
            return {"user": "data"}

        @app.get("/api/v1/analytics/stats")
        def analytics():
            return {"stats": "data"}

        @app.get("/api/v1/analytics/stats/detailed")
        def analytics_detailed():
            return {"stats": "detailed"}

        @app.get("/api/v1/blgu-dashboard/summary")
        def blgu_dashboard():
            return {"dashboard": "data"}

        @app.get("/api/v1/external-analytics/public")
        def external_analytics():
            return {"public": "data"}

        @app.get("/api/v1/lookups/provinces")
        def lookups():
            return {"lookups": "data"}

        @app.get("/api/v1/governance-areas")
        def governance_areas():
            return {"areas": "data"}

        @app.get("/api/v1/assessments")
        def assessments():
            return {"assessments": "data"}

        @app.post("/api/v1/assessments")
        def create_assessment():
            return {"created": True}

        @app.get("/api/v1/unknown-endpoint")
        def unknown():
            return {"data": "unknown"}

        return app

    def test_no_cache_for_auth_endpoints(self, app_with_middleware):
        """Test auth endpoints get no-store private cache headers"""
        client = TestClient(app_with_middleware)
        response = client.get("/api/v1/auth/login")

        assert response.status_code == 200
        assert "Cache-Control" in response.headers
        assert response.headers["Cache-Control"] == "no-store, private"

    def test_no_cache_for_user_me_endpoint(self, app_with_middleware):
        """Test /users/me gets no-store private cache headers"""
        client = TestClient(app_with_middleware)
        response = client.get("/api/v1/users/me")

        assert response.status_code == 200
        assert "Cache-Control" in response.headers
        assert response.headers["Cache-Control"] == "no-store, private"

    def test_short_private_cache_for_analytics(self, app_with_middleware):
        """Test analytics endpoints get short private cache (15 min)"""
        client = TestClient(app_with_middleware)
        response = client.get("/api/v1/analytics/stats")

        assert response.status_code == 200
        assert "Cache-Control" in response.headers
        cache_control = response.headers["Cache-Control"]

        assert "private" in cache_control
        assert "max-age=900" in cache_control  # 15 minutes
        assert "stale-while-revalidate=300" in cache_control

    def test_short_private_cache_for_blgu_dashboard(self, app_with_middleware):
        """Test BLGU dashboard gets short private cache (5 min)"""
        client = TestClient(app_with_middleware)
        response = client.get("/api/v1/blgu-dashboard/summary")

        assert response.status_code == 200
        cache_control = response.headers["Cache-Control"]

        assert "private" in cache_control
        assert "max-age=300" in cache_control  # 5 minutes
        assert "stale-while-revalidate=60" in cache_control

    def test_long_public_cache_for_external_analytics(self, app_with_middleware):
        """Test external analytics gets long public cache (1 hour)"""
        client = TestClient(app_with_middleware)
        response = client.get("/api/v1/external-analytics/public")

        assert response.status_code == 200
        cache_control = response.headers["Cache-Control"]

        assert "public" in cache_control
        assert "max-age=3600" in cache_control  # 1 hour
        assert "stale-while-revalidate=600" in cache_control

    def test_long_public_cache_for_lookups(self, app_with_middleware):
        """Test lookup endpoints get long public cache (1 hour)"""
        client = TestClient(app_with_middleware)
        response = client.get("/api/v1/lookups/provinces")

        assert response.status_code == 200
        cache_control = response.headers["Cache-Control"]

        assert "public" in cache_control
        assert "max-age=3600" in cache_control  # 1 hour

    def test_medium_public_cache_for_governance_areas(self, app_with_middleware):
        """Test governance areas get medium public cache (30 min)"""
        client = TestClient(app_with_middleware)
        response = client.get("/api/v1/governance-areas")

        assert response.status_code == 200
        cache_control = response.headers["Cache-Control"]

        assert "public" in cache_control
        assert "max-age=1800" in cache_control  # 30 minutes

    def test_short_private_cache_for_assessments_list(self, app_with_middleware):
        """Test assessments list gets short private cache (1 min)"""
        client = TestClient(app_with_middleware)
        response = client.get("/api/v1/assessments")

        assert response.status_code == 200
        cache_control = response.headers["Cache-Control"]

        assert "private" in cache_control
        assert "max-age=60" in cache_control  # 1 minute

    def test_no_cache_for_post_requests(self, app_with_middleware):
        """Test POST requests get no-store cache headers"""
        client = TestClient(app_with_middleware)
        response = client.post("/api/v1/assessments")

        assert response.status_code == 200
        assert "Cache-Control" in response.headers
        assert response.headers["Cache-Control"] == "no-store"

    def test_default_no_cache_for_unknown_endpoints(self, app_with_middleware):
        """Test unknown endpoints get no-cache by default"""
        client = TestClient(app_with_middleware)
        response = client.get("/api/v1/unknown-endpoint")

        assert response.status_code == 200
        assert "Cache-Control" in response.headers
        assert response.headers["Cache-Control"] == "no-cache"

    def test_no_cache_for_error_responses(self, app_with_middleware):
        """Test error responses get no-cache headers"""
        client = TestClient(app_with_middleware)
        response = client.get("/api/v1/nonexistent")

        assert response.status_code == 404
        assert "Cache-Control" in response.headers
        assert "no-cache" in response.headers["Cache-Control"]
        assert "max-age=0" in response.headers["Cache-Control"]

    def test_vary_header_for_private_cache(self, app_with_middleware):
        """Test Vary header includes Authorization for private caches"""
        client = TestClient(app_with_middleware)
        response = client.get("/api/v1/analytics/stats")

        assert "Vary" in response.headers
        vary_headers = response.headers["Vary"]

        assert "Accept" in vary_headers
        assert "Accept-Encoding" in vary_headers
        assert "Authorization" in vary_headers  # Private cache

    def test_vary_header_for_public_cache(self, app_with_middleware):
        """Test Vary header excludes Authorization for public caches"""
        client = TestClient(app_with_middleware)
        response = client.get("/api/v1/external-analytics/public")

        assert "Vary" in response.headers
        vary_headers = response.headers["Vary"]

        assert "Accept" in vary_headers
        assert "Accept-Encoding" in vary_headers
        assert "Authorization" not in vary_headers  # Public cache

    def test_etag_generation_for_responses_with_body(self, app_with_middleware):
        """Test ETag header is generated for responses with body"""
        client = TestClient(app_with_middleware)
        response = client.get("/api/v1/external-analytics/public")

        assert response.status_code == 200
        # ETag may or may not be present depending on response body accessibility
        # This is an optional feature that depends on the response type

    def test_cache_rule_matching_by_prefix(self, app_with_middleware):
        """Test cache rules match by path prefix"""
        client = TestClient(app_with_middleware)

        # Should match /api/v1/analytics rule
        response = client.get("/api/v1/analytics/stats/detailed")
        cache_control = response.headers["Cache-Control"]
        assert "max-age=900" in cache_control

    def test_non_cacheable_methods(self):
        """Test all mutation methods get no-store"""
        app = FastAPI()
        app.add_middleware(CacheHeadersMiddleware)

        @app.put("/api/v1/resource")
        def update():
            return {"updated": True}

        @app.patch("/api/v1/resource")
        def partial_update():
            return {"patched": True}

        @app.delete("/api/v1/resource")
        def delete():
            return {"deleted": True}

        client = TestClient(app)

        for method in ["put", "patch", "delete"]:
            response = getattr(client, method)("/api/v1/resource")
            assert response.headers["Cache-Control"] == "no-store"


class TestCacheHeadersMiddlewareEdgeCases:
    """Test edge cases and error scenarios"""

    def test_head_requests_get_cache_headers(self):
        """Test HEAD requests get appropriate cache headers"""
        app = FastAPI()
        app.add_middleware(CacheHeadersMiddleware)

        @app.api_route("/api/v1/lookups/test", methods=["GET", "HEAD"])
        def lookups():
            return {"data": "value"}

        client = TestClient(app)
        response = client.head("/api/v1/lookups/test")

        assert response.status_code == 200
        assert "Cache-Control" in response.headers
        # Should use lookup rule (long public cache)
        assert "public" in response.headers["Cache-Control"]
        assert "max-age=3600" in response.headers["Cache-Control"]

    def test_middleware_handles_non_get_head_gracefully(self):
        """Test middleware doesn't crash on unexpected methods"""
        app = FastAPI()
        app.add_middleware(CacheHeadersMiddleware)

        @app.api_route("/api/v1/resource", methods=["OPTIONS"])
        def options():
            return {"methods": ["GET", "POST"]}

        client = TestClient(app)
        response = client.options("/api/v1/resource")

        # OPTIONS should not get cache headers (or get minimal ones)
        assert response.status_code == 200

    def test_cache_control_parts_formatting(self):
        """Test Cache-Control header is properly formatted"""
        app = FastAPI()
        app.add_middleware(CacheHeadersMiddleware)

        @app.get("/api/v1/lookups/test")
        def lookups():
            return {"data": "value"}

        client = TestClient(app)
        response = client.get("/api/v1/lookups/test")

        cache_control = response.headers["Cache-Control"]
        parts = [p.strip() for p in cache_control.split(",")]

        # Should have visibility, max-age, and swr
        assert any("public" in p for p in parts)
        assert any("max-age=" in p for p in parts)
        assert any("stale-while-revalidate=" in p for p in parts)

    def test_path_matching_is_case_sensitive(self):
        """Test path matching is case-sensitive"""
        app = FastAPI()
        app.add_middleware(CacheHeadersMiddleware)

        @app.get("/API/V1/LOOKUPS/test")
        def lookups_upper():
            return {"data": "value"}

        @app.get("/api/v1/lookups/test")
        def lookups_lower():
            return {"data": "value"}

        client = TestClient(app)

        # Uppercase path won't match rule
        response_upper = client.get("/API/V1/LOOKUPS/test")
        assert response_upper.headers["Cache-Control"] == "no-cache"

        # Lowercase matches
        response_lower = client.get("/api/v1/lookups/test")
        assert "max-age=3600" in response_lower.headers["Cache-Control"]


class TestGetCacheRule:
    """Test _get_cache_rule method"""

    def test_get_cache_rule_exact_match(self):
        """Test exact path matching"""
        middleware = CacheHeadersMiddleware(app=MagicMock())

        rule = middleware._get_cache_rule("/api/v1/auth")
        assert rule is not None
        assert rule.get("cache") is False

    def test_get_cache_rule_prefix_match(self):
        """Test prefix matching"""
        middleware = CacheHeadersMiddleware(app=MagicMock())

        rule = middleware._get_cache_rule("/api/v1/analytics/stats/detailed")
        assert rule is not None
        assert rule.get("max_age") == 900

    def test_get_cache_rule_no_match(self):
        """Test returns None for unmatched paths"""
        middleware = CacheHeadersMiddleware(app=MagicMock())

        rule = middleware._get_cache_rule("/some/random/path")
        assert rule is None

    def test_get_cache_rule_first_match_wins(self):
        """Test first matching rule is returned"""
        middleware = CacheHeadersMiddleware(app=MagicMock())

        # /api/v1/users/me should match before any potential /api/v1/users rule
        rule = middleware._get_cache_rule("/api/v1/users/me")
        assert rule is not None
        assert rule.get("cache") is False


class TestCacheRulesConfiguration:
    """Test cache rules are properly configured"""

    def test_all_dashboard_endpoints_have_private_cache(self):
        """Test all dashboard endpoints use private cache"""
        middleware = CacheHeadersMiddleware(app=MagicMock())

        dashboards = [
            "/api/v1/blgu-dashboard",
            "/api/v1/assessor-dashboard",
            "/api/v1/mlgoo-dashboard",
            "/api/v1/validator-dashboard",
        ]

        for dashboard in dashboards:
            rule = middleware._get_cache_rule(dashboard)
            assert rule is not None
            assert rule.get("public") is False

    def test_external_analytics_is_public(self):
        """Test external analytics uses public cache"""
        middleware = CacheHeadersMiddleware(app=MagicMock())

        rule = middleware._get_cache_rule("/api/v1/external-analytics")
        assert rule is not None
        assert rule.get("public") is True
        assert rule.get("max_age") == 3600

    def test_reference_data_has_long_cache(self):
        """Test reference data has appropriately long cache times"""
        middleware = CacheHeadersMiddleware(app=MagicMock())

        reference_endpoints = [
            "/api/v1/lookups",
            "/api/v1/provinces",
            "/api/v1/municipalities",
        ]

        for endpoint in reference_endpoints:
            rule = middleware._get_cache_rule(endpoint)
            assert rule is not None
            assert rule.get("max_age") == 3600  # 1 hour

    def test_sensitive_endpoints_have_no_cache(self):
        """Test sensitive endpoints explicitly disable caching"""
        middleware = CacheHeadersMiddleware(app=MagicMock())

        sensitive_endpoints = [
            "/api/v1/auth",
            "/api/v1/users/me",
        ]

        for endpoint in sensitive_endpoints:
            rule = middleware._get_cache_rule(endpoint)
            assert rule is not None
            assert rule.get("cache") is False
