"""
Test System Endpoints
Integration tests for health checks, metrics, and system monitoring endpoints
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient


class TestHealthEndpoints:
    """Test health check endpoints"""

    def test_health_endpoint_returns_200(self, client):
        """Test /health endpoint returns successful response"""
        response = client.get("/health")

        assert response.status_code == 200
        assert response.json() is not None

    def test_health_endpoint_includes_status(self, client):
        """Test /health includes overall status"""
        response = client.get("/health")
        data = response.json()

        # Should include status information
        assert "status" in data or "overall_status" in data

    def test_liveness_probe_returns_200(self, client):
        """Test /health/live liveness probe returns 200"""
        response = client.get("/health/live")

        assert response.status_code == 200
        data = response.json()

        assert "status" in data
        assert data["status"] == "alive"

    def test_readiness_probe_when_healthy(self, client):
        """Test /health/ready returns 200 when services are healthy"""
        with patch('app.db.base.check_database_connection') as mock_db:
            with patch('app.db.base.check_redis_connection') as mock_redis:
                # Mock healthy connections
                mock_db.return_value = {"connected": True}
                mock_redis.return_value = {"connected": True}

                response = client.get("/health/ready")

                assert response.status_code == 200
                data = response.json()

                assert data["status"] == "ready"
                assert "checks" in data
                assert data["checks"]["database"] == "ok"
                assert data["checks"]["redis"] == "ok"

    def test_readiness_probe_when_database_unhealthy(self, client):
        """Test /health/ready returns 503 when database is down"""
        with patch('app.db.base.check_database_connection') as mock_db:
            with patch('app.db.base.check_redis_connection') as mock_redis:
                # Mock database failure
                mock_db.return_value = {"connected": False, "error": "Connection failed"}
                mock_redis.return_value = {"connected": True}

                response = client.get("/health/ready")

                assert response.status_code == 503
                data = response.json()

                assert "detail" in data
                assert data["detail"]["status"] == "not_ready"
                assert data["detail"]["checks"]["database"] == "failed"

    def test_readiness_probe_when_redis_unhealthy(self, client):
        """Test /health/ready returns 503 when Redis is down"""
        with patch('app.db.base.check_database_connection') as mock_db:
            with patch('app.db.base.check_redis_connection') as mock_redis:
                # Mock Redis failure
                mock_db.return_value = {"connected": True}
                mock_redis.return_value = {"connected": False, "error": "Connection refused"}

                response = client.get("/health/ready")

                assert response.status_code == 503
                data = response.json()

                assert "detail" in data
                assert data["detail"]["status"] == "not_ready"
                assert data["detail"]["checks"]["redis"] == "failed"

    def test_readiness_probe_when_all_services_down(self, client):
        """Test /health/ready when all services are down"""
        with patch('app.db.base.check_database_connection') as mock_db:
            with patch('app.db.base.check_redis_connection') as mock_redis:
                # Mock all failures
                mock_db.return_value = {"connected": False}
                mock_redis.return_value = {"connected": False}

                response = client.get("/health/ready")

                assert response.status_code == 503
                data = response.json()

                assert data["detail"]["status"] == "not_ready"
                assert data["detail"]["checks"]["database"] == "failed"
                assert data["detail"]["checks"]["redis"] == "failed"


class TestDetailedHealthEndpoint:
    """Test /api/v1/system/health detailed health endpoint"""

    def test_detailed_health_requires_authentication(self, client):
        """Test detailed health endpoint requires authentication"""
        response = client.get("/api/v1/system/health")

        # Should return 401 Unauthorized
        assert response.status_code == 401

    def test_detailed_health_requires_admin_role(self, client, blgu_user):
        """Test detailed health endpoint requires MLGOO_DILG admin role"""
        # Login as BLGU user (non-admin)
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": blgu_user.email, "password": "password123"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Try to access detailed health
        response = client.get(
            "/api/v1/system/health",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Should be forbidden (403) - non-admin
        assert response.status_code == 403

    def test_detailed_health_accessible_by_admin(self, client, mlgoo_user):
        """Test detailed health endpoint accessible by MLGOO_DILG admin"""
        # Login as MLGOO admin
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": mlgoo_user.email, "password": "password123"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        with patch('app.db.base.check_database_connection') as mock_db:
            with patch('app.db.base.check_redis_connection') as mock_redis:
                with patch('app.db.base.check_redis_cache_connection') as mock_cache:
                    with patch('app.db.base.get_db_pool_stats') as mock_pool:
                        # Mock healthy connections
                        mock_db.return_value = {"connected": True, "status": "healthy"}
                        mock_redis.return_value = {"connected": True}
                        mock_cache.return_value = {"connected": True}
                        mock_pool.return_value = {
                            "available": True,
                            "pool_size": 30,
                            "checked_in": 25,
                            "checked_out": 5,
                        }

                        response = client.get(
                            "/api/v1/system/health",
                            headers={"Authorization": f"Bearer {token}"},
                        )

                        assert response.status_code == 200
                        data = response.json()

                        assert "status" in data
                        assert "version" in data
                        assert "environment" in data
                        assert "components" in data

    def test_detailed_health_includes_all_components(self, client, mlgoo_user):
        """Test detailed health includes all system components"""
        # Login as admin
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": mlgoo_user.email, "password": "password123"},
        )
        token = login_response.json()["access_token"]

        with patch('app.db.base.check_database_connection') as mock_db:
            with patch('app.db.base.check_redis_connection') as mock_redis:
                with patch('app.db.base.check_redis_cache_connection') as mock_cache:
                    with patch('app.db.base.get_db_pool_stats') as mock_pool:
                        mock_db.return_value = {"connected": True}
                        mock_redis.return_value = {"connected": True}
                        mock_cache.return_value = {"connected": True}
                        mock_pool.return_value = {"available": True}

                        response = client.get(
                            "/api/v1/system/health",
                            headers={"Authorization": f"Bearer {token}"},
                        )

                        data = response.json()
                        components = data["components"]

                        # Should include all key components
                        assert "database" in components
                        assert "redis_celery" in components
                        assert "redis_cache" in components
                        assert "gemini" in components

                        # Database should include pool stats
                        assert "pool" in components["database"]

    def test_detailed_health_shows_degraded_when_components_fail(self, client, mlgoo_user):
        """Test detailed health shows degraded status when components fail"""
        # Login as admin
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": mlgoo_user.email, "password": "password123"},
        )
        token = login_response.json()["access_token"]

        with patch('app.db.base.check_database_connection') as mock_db:
            with patch('app.db.base.check_redis_connection') as mock_redis:
                with patch('app.db.base.check_redis_cache_connection') as mock_cache:
                    with patch('app.db.base.get_db_pool_stats') as mock_pool:
                        # Database healthy but Redis Celery down
                        mock_db.return_value = {"connected": True}
                        mock_redis.return_value = {"connected": False, "error": "Connection failed"}
                        mock_cache.return_value = {"connected": True}
                        mock_pool.return_value = {"available": True}

                        response = client.get(
                            "/api/v1/system/health",
                            headers={"Authorization": f"Bearer {token}"},
                        )

                        data = response.json()

                        # Should show degraded status
                        assert data["status"] == "degraded"


class TestMetricsEndpoints:
    """Test metrics endpoints"""

    def test_prometheus_metrics_endpoint_unauthenticated(self, client):
        """Test /metrics Prometheus endpoint is accessible without auth"""
        response = client.get("/metrics")

        # Should be accessible (200)
        assert response.status_code == 200

        # Should return plain text
        assert response.headers["content-type"] == "text/plain; charset=utf-8"

    def test_prometheus_metrics_format(self, client):
        """Test Prometheus metrics are in correct format"""
        response = client.get("/metrics")
        content = response.text

        # Should contain Prometheus metric declarations
        assert "# HELP" in content
        assert "# TYPE" in content

        # Should contain SINAG metrics
        assert "sinag_uptime_seconds" in content
        assert "sinag_active_requests" in content
        assert "sinag_http_requests_total" in content

    def test_prometheus_metrics_not_in_schema(self, client):
        """Test /metrics endpoint is not included in OpenAPI schema"""
        # Metrics endpoint should have include_in_schema=False
        response = client.get("/openapi.json")
        openapi_spec = response.json()

        paths = openapi_spec.get("paths", {})

        # /metrics should not be in the API schema
        assert "/metrics" not in paths

    def test_json_metrics_endpoint_requires_authentication(self, client):
        """Test /api/v1/system/metrics requires authentication"""
        response = client.get("/api/v1/system/metrics")

        # Should return 401 Unauthorized
        assert response.status_code == 401

    def test_json_metrics_endpoint_requires_admin_role(self, client, blgu_user):
        """Test JSON metrics endpoint requires MLGOO_DILG admin role"""
        # Login as BLGU user (non-admin)
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": blgu_user.email, "password": "password123"},
        )
        token = login_response.json()["access_token"]

        response = client.get(
            "/api/v1/system/metrics",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Should be forbidden (403)
        assert response.status_code == 403

    def test_json_metrics_accessible_by_admin(self, client, mlgoo_user):
        """Test JSON metrics endpoint accessible by MLGOO_DILG admin"""
        # Login as admin
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": mlgoo_user.email, "password": "password123"},
        )
        token = login_response.json()["access_token"]

        with patch('app.core.cache.cache') as mock_cache:
            with patch('app.db.base.engine') as mock_engine:
                # Mock cache stats
                mock_cache.is_available = True
                mock_cache.get_metrics.return_value = {
                    "hits": 100,
                    "misses": 20,
                    "hit_rate": 83.33,
                }

                # Mock pool stats
                mock_pool = MagicMock()
                mock_pool.size.return_value = 30
                mock_pool.checkedin.return_value = 25
                mock_pool.checkedout.return_value = 5
                mock_pool.overflow.return_value = 0
                mock_engine.pool = mock_pool

                response = client.get(
                    "/api/v1/system/metrics",
                    headers={"Authorization": f"Bearer {token}"},
                )

                assert response.status_code == 200
                data = response.json()

                assert "requests" in data
                assert "cache" in data
                assert "database_pool" in data

    def test_json_metrics_includes_request_metrics(self, client, mlgoo_user):
        """Test JSON metrics include request statistics"""
        # Login as admin
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": mlgoo_user.email, "password": "password123"},
        )
        token = login_response.json()["access_token"]

        with patch('app.core.cache.cache'):
            with patch('app.db.base.engine'):
                response = client.get(
                    "/api/v1/system/metrics",
                    headers={"Authorization": f"Bearer {token}"},
                )

                data = response.json()

                # Request metrics should include summary data
                assert "requests" in data
                requests = data["requests"]

                # Should have structure from metrics_collector.get_summary()
                assert "uptime_seconds" in requests or "endpoints" in requests

    def test_json_metrics_includes_cache_stats(self, client, mlgoo_user):
        """Test JSON metrics include cache statistics"""
        # Login as admin
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": mlgoo_user.email, "password": "password123"},
        )
        token = login_response.json()["access_token"]

        with patch('app.core.cache.cache') as mock_cache:
            with patch('app.db.base.engine'):
                mock_cache.is_available = True
                mock_cache.get_metrics.return_value = {
                    "hits": 500,
                    "misses": 100,
                    "errors": 2,
                    "hit_rate": 83.33,
                }

                response = client.get(
                    "/api/v1/system/metrics",
                    headers={"Authorization": f"Bearer {token}"},
                )

                data = response.json()

                assert "cache" in data
                cache_data = data["cache"]

                assert "available" in cache_data
                if cache_data["available"]:
                    assert "metrics" in cache_data
                    assert cache_data["metrics"]["hits"] == 500

    def test_json_metrics_includes_database_pool_stats(self, client, mlgoo_user):
        """Test JSON metrics include database connection pool statistics"""
        # Login as admin
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": mlgoo_user.email, "password": "password123"},
        )
        token = login_response.json()["access_token"]

        with patch('app.core.cache.cache'):
            with patch('app.db.base.engine') as mock_engine:
                mock_pool = MagicMock()
                mock_pool.size.return_value = 30
                mock_pool.checkedin.return_value = 20
                mock_pool.checkedout.return_value = 10
                mock_pool.overflow.return_value = 5
                mock_engine.pool = mock_pool

                response = client.get(
                    "/api/v1/system/metrics",
                    headers={"Authorization": f"Bearer {token}"},
                )

                data = response.json()

                assert "database_pool" in data
                pool_data = data["database_pool"]

                if pool_data.get("available"):
                    assert "pool_size" in pool_data
                    assert "checked_in" in pool_data
                    assert "checked_out" in pool_data


class TestEndpointAccessControl:
    """Test access control for system endpoints"""

    def test_health_endpoints_accessible_without_auth(self, client):
        """Test basic health endpoints don't require authentication"""
        unauthenticated_endpoints = [
            "/health",
            "/health/live",
            "/health/ready",
            "/metrics",
        ]

        for endpoint in unauthenticated_endpoints:
            response = client.get(endpoint)
            # Should not be 401 (may be 200, 503, etc.)
            assert response.status_code != 401

    def test_admin_endpoints_require_mlgoo_role(self, client, mlgoo_user, validator_user, assessor_user):
        """Test admin-only endpoints reject non-MLGOO users"""
        admin_endpoints = [
            "/api/v1/system/health",
            "/api/v1/system/metrics",
        ]

        # Test with each non-admin user type
        for user in [validator_user, assessor_user]:
            login_response = client.post(
                "/api/v1/auth/login",
                json={"email": user.email, "password": "password123"},
            )
            token = login_response.json()["access_token"]

            for endpoint in admin_endpoints:
                response = client.get(
                    endpoint,
                    headers={"Authorization": f"Bearer {token}"},
                )
                # Should be forbidden
                assert response.status_code == 403, f"{endpoint} should be forbidden for {user.role}"

        # Test with MLGOO admin - should succeed
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": mlgoo_user.email, "password": "password123"},
        )
        token = login_response.json()["access_token"]

        with patch('app.db.base.check_database_connection', new_callable=AsyncMock) as mock_db:
            with patch('app.db.base.check_redis_connection', new_callable=AsyncMock) as mock_redis:
                with patch('app.db.base.check_redis_cache_connection', new_callable=AsyncMock) as mock_cache:
                    with patch('app.db.base.get_db_pool_stats') as mock_pool:
                        with patch('app.core.cache.cache'):
                            # Set return values for async mocks
                            mock_db.return_value = {"connected": True}
                            mock_redis.return_value = {"connected": True}
                            mock_cache.return_value = {"connected": True}
                            mock_pool.return_value = {"available": True}

                            for endpoint in admin_endpoints:
                                response = client.get(
                                    endpoint,
                                    headers={"Authorization": f"Bearer {token}"},
                                )
                                # Should succeed
                                assert response.status_code == 200, f"{endpoint} should be accessible for MLGOO_DILG"


class TestDatabasePoolStats:
    """Test database pool statistics function"""

    def test_get_db_pool_stats_returns_pool_info(self):
        """Test get_db_pool_stats returns pool information"""
        from app.db.base import get_db_pool_stats

        with patch('app.db.base.engine') as mock_engine:
            mock_pool = MagicMock()
            mock_pool.size.return_value = 30
            mock_pool.checkedin.return_value = 25
            mock_pool.checkedout.return_value = 5
            mock_pool.overflow.return_value = 2
            mock_engine.pool = mock_pool

            stats = get_db_pool_stats()

            assert stats["available"] is True
            assert stats["pool_size"] == 30
            assert stats["checked_in"] == 25
            assert stats["checked_out"] == 5
            assert stats["overflow"] == 2

    def test_get_db_pool_stats_when_engine_not_configured(self):
        """Test get_db_pool_stats handles missing engine gracefully"""
        from app.db.base import get_db_pool_stats

        with patch('app.db.base.engine', None):
            stats = get_db_pool_stats()

            assert stats["available"] is False
            assert "error" in stats


class TestRedisCacheConnectionCheck:
    """Test Redis cache connection health check"""

    def test_check_redis_cache_connection_when_available(self):
        """Test cache connection check when Redis cache is available"""
        from app.db.base import check_redis_cache_connection
        import asyncio

        with patch('app.core.cache.cache') as mock_cache:
            mock_cache.is_available = True
            mock_cache.get_metrics.return_value = {
                "hits": 100,
                "misses": 20,
            }

            result = asyncio.run(check_redis_cache_connection())

            assert result["connected"] is True
            assert result["service"] == "Redis Cache"
            assert "metrics" in result

    def test_check_redis_cache_connection_when_unavailable(self):
        """Test cache connection check when Redis cache is unavailable"""
        from app.db.base import check_redis_cache_connection
        import asyncio

        with patch('app.core.cache.cache') as mock_cache:
            mock_cache.is_available = False

            result = asyncio.run(check_redis_cache_connection())

            assert result["connected"] is False
            assert "error" in result
