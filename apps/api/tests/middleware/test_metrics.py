"""
Test Metrics Middleware
Tests for Prometheus metrics collection middleware
"""

from threading import Thread
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.metrics import (
    NUMERIC_ID_PATTERN,
    UUID_PATTERN,
    EndpointMetrics,
    MetricsCollector,
    MetricsMiddleware,
    get_metrics_summary,
    get_prometheus_metrics,
)


class TestEndpointMetrics:
    """Test EndpointMetrics data class"""

    def test_endpoint_metrics_initialization(self):
        """Test metrics initialized with zero values"""
        metrics = EndpointMetrics()
        assert metrics.request_count == 0
        assert metrics.error_count == 0
        assert metrics.total_latency_ms == 0.0
        assert len(metrics.latency_buckets) == 0

    def test_avg_latency_calculation(self):
        """Test average latency calculation"""
        metrics = EndpointMetrics(request_count=10, total_latency_ms=500.0)
        assert metrics.avg_latency_ms == 50.0

    def test_avg_latency_when_no_requests(self):
        """Test average latency is 0 when no requests"""
        metrics = EndpointMetrics()
        assert metrics.avg_latency_ms == 0.0

    def test_error_rate_calculation(self):
        """Test error rate calculation"""
        metrics = EndpointMetrics(request_count=100, error_count=5)
        assert metrics.error_rate == 5.0

    def test_error_rate_when_no_requests(self):
        """Test error rate is 0 when no requests"""
        metrics = EndpointMetrics()
        assert metrics.error_rate == 0.0

    def test_error_rate_all_errors(self):
        """Test error rate is 100% when all requests fail"""
        metrics = EndpointMetrics(request_count=50, error_count=50)
        assert metrics.error_rate == 100.0


class TestMetricsCollector:
    """Test MetricsCollector class functionality"""

    def test_initialization(self):
        """Test collector initializes with empty metrics"""
        collector = MetricsCollector()
        assert collector._active_requests == 0
        assert len(collector._metrics) == 0

    def test_record_request_increments_count(self):
        """Test record_request increments counters"""
        collector = MetricsCollector()
        collector.record_request("GET", "/api/v1/users", 200, 25.5)

        metrics = collector._metrics["GET"]["/api/v1/users"]
        assert metrics.request_count == 1
        assert metrics.total_latency_ms == 25.5
        assert metrics.error_count == 0

    def test_record_request_increments_error_count(self):
        """Test record_request increments error count for 4xx/5xx"""
        collector = MetricsCollector()
        collector.record_request("POST", "/api/v1/login", 401, 10.0)
        collector.record_request("GET", "/api/v1/data", 500, 100.0)

        login_metrics = collector._metrics["POST"]["/api/v1/login"]
        data_metrics = collector._metrics["GET"]["/api/v1/data"]

        assert login_metrics.error_count == 1
        assert data_metrics.error_count == 1

    def test_record_request_does_not_increment_error_for_2xx_3xx(self):
        """Test error count not incremented for successful responses"""
        collector = MetricsCollector()
        collector.record_request("GET", "/api/v1/users", 200, 10.0)
        collector.record_request("POST", "/api/v1/resource", 201, 20.0)
        collector.record_request("DELETE", "/api/v1/resource", 204, 5.0)
        collector.record_request("GET", "/api/v1/redirect", 302, 2.0)

        for method in collector._metrics.values():
            for metrics in method.values():
                assert metrics.error_count == 0

    def test_latency_buckets_distribution(self):
        """Test latency values are distributed into correct buckets"""
        collector = MetricsCollector()

        # Record requests with various latencies
        collector.record_request("GET", "/api/v1/fast", 200, 3.0)  # le_5
        collector.record_request("GET", "/api/v1/fast", 200, 15.0)  # le_25
        collector.record_request("GET", "/api/v1/fast", 200, 75.0)  # le_100
        collector.record_request("GET", "/api/v1/fast", 200, 300.0)  # le_500
        collector.record_request("GET", "/api/v1/fast", 200, 5000.0)  # le_5000

        metrics = collector._metrics["GET"]["/api/v1/fast"]

        assert metrics.latency_buckets["le_5"] == 1
        assert metrics.latency_buckets["le_25"] == 1
        assert metrics.latency_buckets["le_100"] == 1
        assert metrics.latency_buckets["le_500"] == 1
        assert metrics.latency_buckets["le_5000"] == 1

    def test_latency_bucket_overflow(self):
        """Test latencies beyond max bucket go to le_inf"""
        collector = MetricsCollector()
        collector.record_request("GET", "/api/v1/slow", 200, 15000.0)  # > 10000

        metrics = collector._metrics["GET"]["/api/v1/slow"]
        assert metrics.latency_buckets["le_inf"] == 1

    def test_increment_active_requests(self):
        """Test increment_active increases counter"""
        collector = MetricsCollector()
        collector.increment_active()
        collector.increment_active()

        assert collector._active_requests == 2

    def test_decrement_active_requests(self):
        """Test decrement_active decreases counter"""
        collector = MetricsCollector()
        collector._active_requests = 5
        collector.decrement_active()

        assert collector._active_requests == 4

    def test_decrement_active_never_goes_negative(self):
        """Test decrement_active doesn't go below 0"""
        collector = MetricsCollector()
        collector.decrement_active()
        collector.decrement_active()

        assert collector._active_requests == 0

    def test_thread_safety_record_request(self):
        """Test record_request is thread-safe"""
        collector = MetricsCollector()

        def record_requests():
            for _ in range(100):
                collector.record_request("GET", "/api/v1/test", 200, 10.0)

        threads = [Thread(target=record_requests) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        metrics = collector._metrics["GET"]["/api/v1/test"]
        assert metrics.request_count == 1000

    def test_thread_safety_active_requests(self):
        """Test active request counter is thread-safe"""
        collector = MetricsCollector()

        def increment_and_decrement():
            for _ in range(100):
                collector.increment_active()
                collector.decrement_active()

        threads = [Thread(target=increment_and_decrement) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert collector._active_requests == 0


class TestPathNormalization:
    """Test path normalization for metrics grouping"""

    def test_normalize_uuid_in_path(self):
        """Test UUIDs are replaced with {id} placeholder"""
        collector = MetricsCollector()

        uuid = "123e4567-e89b-12d3-a456-426614174000"
        path = f"/api/v1/assessments/{uuid}"
        normalized = collector._normalize_path(path)

        assert normalized == "/api/v1/assessments/{id}"

    def test_normalize_multiple_uuids_in_path(self):
        """Test multiple UUIDs are all replaced"""
        collector = MetricsCollector()

        uuid1 = "123e4567-e89b-12d3-a456-426614174000"
        uuid2 = "987f6543-a21b-43c2-b654-321098765432"
        path = f"/api/v1/users/{uuid1}/assessments/{uuid2}"
        normalized = collector._normalize_path(path)

        assert normalized == "/api/v1/users/{id}/assessments/{id}"

    def test_normalize_numeric_id_in_path(self):
        """Test numeric IDs are replaced with {id} placeholder"""
        collector = MetricsCollector()

        path = "/api/v1/users/123/profile"
        normalized = collector._normalize_path(path)

        assert normalized == "/api/v1/users/{id}/profile"

    def test_normalize_multiple_numeric_ids(self):
        """Test multiple numeric IDs are replaced"""
        collector = MetricsCollector()

        path = "/api/v1/users/42/assessments/99/results"
        normalized = collector._normalize_path(path)

        assert normalized == "/api/v1/users/{id}/assessments/{id}/results"

    def test_normalize_mixed_uuid_and_numeric_ids(self):
        """Test paths with both UUIDs and numeric IDs"""
        collector = MetricsCollector()

        uuid = "123e4567-e89b-12d3-a456-426614174000"
        path = f"/api/v1/users/42/assessments/{uuid}/indicators/7"
        normalized = collector._normalize_path(path)

        assert normalized == "/api/v1/users/{id}/assessments/{id}/indicators/{id}"

    def test_normalize_preserves_static_paths(self):
        """Test static paths are not modified"""
        collector = MetricsCollector()

        paths = [
            "/api/v1/users",
            "/api/v1/analytics/dashboard",
            "/api/v1/lookups/provinces",
        ]

        for path in paths:
            normalized = collector._normalize_path(path)
            assert normalized == path


class TestUUIDPattern:
    """Test UUID regex pattern"""

    def test_uuid_pattern_matches_valid_uuids(self):
        """Test UUID pattern matches valid UUID formats"""
        valid_uuids = [
            "123e4567-e89b-12d3-a456-426614174000",
            "550e8400-e29b-41d4-a716-446655440000",
            "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
            "00000000-0000-0000-0000-000000000000",
        ]

        for uuid in valid_uuids:
            assert UUID_PATTERN.search(uuid) is not None

    def test_uuid_pattern_case_insensitive(self):
        """Test UUID pattern matches uppercase and lowercase"""
        assert UUID_PATTERN.search("123E4567-E89B-12D3-A456-426614174000") is not None
        assert UUID_PATTERN.search("123e4567-e89b-12d3-a456-426614174000") is not None

    def test_uuid_pattern_does_not_match_invalid(self):
        """Test UUID pattern rejects invalid formats"""
        invalid = [
            "not-a-uuid",
            "123-456",
            "12345678-1234-1234-1234",  # Too short
        ]

        for invalid_uuid in invalid:
            assert UUID_PATTERN.search(invalid_uuid) is None


class TestNumericIDPattern:
    """Test numeric ID regex pattern"""

    def test_numeric_pattern_matches_ids_in_paths(self):
        """Test numeric pattern matches IDs in URL paths"""
        paths_and_ids = [
            ("/users/123/profile", "123"),
            ("/api/v1/assessments/456", "456"),
            ("/items/1/details", "1"),
        ]

        for path, expected_id in paths_and_ids:
            match = NUMERIC_ID_PATTERN.search(path)
            assert match is not None
            assert expected_id in match.group()

    def test_numeric_pattern_requires_path_delimiter(self):
        """Test numeric pattern only matches within path segments"""
        # Should match (has delimiter before/after)
        assert NUMERIC_ID_PATTERN.search("/users/123/") is not None
        assert NUMERIC_ID_PATTERN.search("/users/123") is not None

        # Should not match standalone numbers
        assert NUMERIC_ID_PATTERN.search("123") is None


class TestGetPrometheusMetrics:
    """Test Prometheus metrics output generation"""

    def test_prometheus_metrics_format(self):
        """Test Prometheus output follows correct format"""
        collector = MetricsCollector()
        collector.record_request("GET", "/api/v1/users", 200, 25.0)
        collector.record_request("POST", "/api/v1/users", 201, 50.0)

        output = collector.get_prometheus_metrics()

        # Should contain HELP and TYPE declarations
        assert "# HELP sinag_uptime_seconds" in output
        assert "# TYPE sinag_uptime_seconds gauge" in output
        assert "# HELP sinag_active_requests" in output
        assert "# TYPE sinag_active_requests gauge" in output
        assert "# HELP sinag_http_requests_total" in output
        assert "# TYPE sinag_http_requests_total counter" in output

    def test_prometheus_metrics_includes_request_counts(self):
        """Test metrics include request counts per endpoint"""
        collector = MetricsCollector()
        collector.record_request("GET", "/api/v1/users", 200, 10.0)
        collector.record_request("GET", "/api/v1/users", 200, 15.0)
        collector.record_request("POST", "/api/v1/users", 201, 20.0)

        output = collector.get_prometheus_metrics()

        assert 'sinag_http_requests_total{method="GET",endpoint="/api/v1/users"} 2' in output
        assert 'sinag_http_requests_total{method="POST",endpoint="/api/v1/users"} 1' in output

    def test_prometheus_metrics_includes_error_counts(self):
        """Test metrics include error counts"""
        collector = MetricsCollector()
        collector.record_request("GET", "/api/v1/data", 500, 100.0)
        collector.record_request("POST", "/api/v1/login", 401, 10.0)

        output = collector.get_prometheus_metrics()

        assert 'sinag_http_errors_total{method="GET",endpoint="/api/v1/data"} 1' in output
        assert 'sinag_http_errors_total{method="POST",endpoint="/api/v1/login"} 1' in output

    def test_prometheus_metrics_histogram_buckets(self):
        """Test latency histogram includes cumulative buckets"""
        collector = MetricsCollector()
        collector.record_request("GET", "/api/v1/test", 200, 5.0)
        collector.record_request("GET", "/api/v1/test", 200, 75.0)
        collector.record_request("GET", "/api/v1/test", 200, 500.0)

        output = collector.get_prometheus_metrics()

        # Should have histogram buckets
        assert "sinag_http_request_duration_ms_bucket" in output
        assert 'le="5"' in output
        assert 'le="100"' in output
        assert 'le="500"' in output
        assert 'le="+Inf"' in output

        # Should have histogram sum and count
        assert "sinag_http_request_duration_ms_sum" in output
        assert "sinag_http_request_duration_ms_count" in output

    def test_get_summary_includes_all_metrics(self):
        """Test get_summary returns comprehensive metrics dict"""
        collector = MetricsCollector()
        collector.increment_active()
        collector.record_request("GET", "/api/v1/users", 200, 50.0)
        collector.record_request("GET", "/api/v1/users", 500, 100.0)

        summary = collector.get_summary()

        assert "uptime_seconds" in summary
        assert "active_requests" in summary
        assert summary["active_requests"] == 1
        assert "endpoints" in summary
        assert "GET /api/v1/users" in summary["endpoints"]

        endpoint_stats = summary["endpoints"]["GET /api/v1/users"]
        assert endpoint_stats["requests"] == 2
        assert endpoint_stats["errors"] == 1
        assert endpoint_stats["error_rate"] == 50.0
        assert endpoint_stats["avg_latency_ms"] == 75.0

    def test_get_summary_includes_totals(self):
        """Test get_summary includes total statistics"""
        collector = MetricsCollector()
        collector.record_request("GET", "/api/v1/users", 200, 10.0)
        collector.record_request("POST", "/api/v1/users", 201, 20.0)
        collector.record_request("GET", "/api/v1/data", 500, 50.0)

        summary = collector.get_summary()

        assert "totals" in summary
        totals = summary["totals"]
        assert totals["requests"] == 3
        assert totals["errors"] == 1
        assert round(totals["error_rate"], 2) == 33.33
        assert totals["avg_latency_ms"] > 0


class TestMetricsMiddleware:
    """Test MetricsMiddleware integration"""

    @pytest.fixture
    def app_with_metrics(self):
        """Create FastAPI app with metrics middleware"""
        app = FastAPI()
        app.add_middleware(MetricsMiddleware)

        @app.get("/api/v1/users")
        def get_users():
            return {"users": []}

        @app.post("/api/v1/users")
        def create_user():
            return {"id": 1}

        @app.get("/health")
        def health():
            return {"status": "ok"}

        @app.get("/metrics")
        def metrics():
            return {"metrics": "data"}

        return app

    def test_middleware_records_successful_requests(self, app_with_metrics):
        """Test middleware records successful requests"""
        test_collector = MetricsCollector()

        with patch("app.middleware.metrics.metrics_collector", test_collector):
            client = TestClient(app_with_metrics)
            response = client.get("/api/v1/users")

            assert response.status_code == 200

            summary = test_collector.get_summary()
            assert "GET /api/v1/users" in summary["endpoints"]

    def test_middleware_skips_health_endpoint(self, app_with_metrics):
        """Test middleware skips /health endpoint"""
        test_collector = MetricsCollector()

        with patch("app.middleware.metrics.metrics_collector", test_collector):
            client = TestClient(app_with_metrics)
            response = client.get("/health")

            assert response.status_code == 200

            summary = test_collector.get_summary()
            assert "GET /health" not in summary.get("endpoints", {})

    def test_middleware_skips_metrics_endpoint(self, app_with_metrics):
        """Test middleware skips /metrics endpoint"""
        test_collector = MetricsCollector()

        with patch("app.middleware.metrics.metrics_collector", test_collector):
            client = TestClient(app_with_metrics)
            response = client.get("/metrics")

            assert response.status_code == 200

            summary = test_collector.get_summary()
            assert "GET /metrics" not in summary.get("endpoints", {})

    def test_middleware_tracks_active_requests(self, app_with_metrics):
        """Test middleware increments/decrements active requests"""
        test_collector = MetricsCollector()

        with patch("app.middleware.metrics.metrics_collector", test_collector):
            # Active count should be 0 initially
            assert test_collector._active_requests == 0

            client = TestClient(app_with_metrics)
            response = client.get("/api/v1/users")

            # After request completes, should be back to 0
            assert test_collector._active_requests == 0

    def test_middleware_normalizes_paths(self, app_with_metrics):
        """Test middleware normalizes paths with IDs"""
        test_collector = MetricsCollector()

        with patch("app.middleware.metrics.metrics_collector", test_collector):
            client = TestClient(app_with_metrics)

            # Add route with ID parameter
            @app_with_metrics.get("/api/v1/users/{user_id}")
            def get_user(user_id: int):
                return {"id": user_id}

            client.get("/api/v1/users/123")
            client.get("/api/v1/users/456")

            summary = test_collector.get_summary()
            # Should be grouped under normalized path
            assert "GET /api/v1/users/{id}" in summary["endpoints"]
            assert summary["endpoints"]["GET /api/v1/users/{id}"]["requests"] == 2


class TestModuleFunctions:
    """Test module-level convenience functions"""

    def test_get_prometheus_metrics_delegates_to_collector(self):
        """Test get_prometheus_metrics uses global collector"""
        with patch("app.middleware.metrics.metrics_collector") as mock_collector:
            mock_collector.get_prometheus_metrics.return_value = "prometheus output"

            result = get_prometheus_metrics()

            assert result == "prometheus output"
            mock_collector.get_prometheus_metrics.assert_called_once()

    def test_get_metrics_summary_delegates_to_collector(self):
        """Test get_metrics_summary uses global collector"""
        with patch("app.middleware.metrics.metrics_collector") as mock_collector:
            mock_collector.get_summary.return_value = {"summary": "data"}

            result = get_metrics_summary()

            assert result == {"summary": "data"}
            mock_collector.get_summary.assert_called_once()
