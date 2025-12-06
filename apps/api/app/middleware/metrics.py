# 📊 Prometheus Metrics Middleware
# Collects request metrics for monitoring and observability
# PERFORMANCE: Enables tracking of request latency, throughput, and errors

import re
import time
import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional
from threading import Lock

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Pre-compiled regex patterns for path normalization (PERFORMANCE: compile once)
UUID_PATTERN = re.compile(
    r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
    re.IGNORECASE
)
NUMERIC_ID_PATTERN = re.compile(r'/\d+(?=/|$)')


@dataclass
class EndpointMetrics:
    """Metrics for a specific endpoint."""
    request_count: int = 0
    error_count: int = 0
    total_latency_ms: float = 0.0
    latency_buckets: Dict[str, int] = field(default_factory=lambda: defaultdict(int))

    @property
    def avg_latency_ms(self) -> float:
        """Average latency in milliseconds."""
        return (self.total_latency_ms / self.request_count) if self.request_count > 0 else 0.0

    @property
    def error_rate(self) -> float:
        """Error rate as percentage."""
        return (self.error_count / self.request_count * 100) if self.request_count > 0 else 0.0


class MetricsCollector:
    """
    Collects and exposes Prometheus-compatible metrics.

    Tracks:
    - Request count by endpoint and status
    - Request latency histogram
    - Active requests gauge
    - Error rates
    """

    # Latency bucket thresholds in milliseconds
    LATENCY_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]

    def __init__(self):
        self._lock = Lock()
        self._metrics: Dict[str, Dict[str, EndpointMetrics]] = defaultdict(
            lambda: defaultdict(EndpointMetrics)
        )
        self._active_requests = 0
        self._start_time = time.time()

    def record_request(
        self,
        method: str,
        path: str,
        status_code: int,
        latency_ms: float
    ) -> None:
        """Record a completed request."""
        with self._lock:
            endpoint_key = self._normalize_path(path)
            metrics = self._metrics[method][endpoint_key]

            metrics.request_count += 1
            metrics.total_latency_ms += latency_ms

            if status_code >= 400:
                metrics.error_count += 1

            # Update latency histogram buckets
            bucket = self._get_latency_bucket(latency_ms)
            metrics.latency_buckets[bucket] += 1

    def increment_active(self) -> None:
        """Increment active request count."""
        with self._lock:
            self._active_requests += 1

    def decrement_active(self) -> None:
        """Decrement active request count."""
        with self._lock:
            self._active_requests = max(0, self._active_requests - 1)

    def _normalize_path(self, path: str) -> str:
        """Normalize path to group similar endpoints."""
        # Replace UUIDs with placeholder (using pre-compiled pattern)
        path = UUID_PATTERN.sub('{id}', path)
        # Replace numeric IDs with placeholder (using pre-compiled pattern)
        path = NUMERIC_ID_PATTERN.sub('/{id}', path)
        return path

    def _get_latency_bucket(self, latency_ms: float) -> str:
        """Get the bucket label for a latency value."""
        for bucket in self.LATENCY_BUCKETS:
            if latency_ms <= bucket:
                return f"le_{bucket}"
        return "le_inf"

    def get_prometheus_metrics(self) -> str:
        """Generate Prometheus-compatible metrics output."""
        lines = []
        uptime = time.time() - self._start_time

        # Uptime gauge
        lines.append("# HELP sinag_uptime_seconds Time since application start")
        lines.append("# TYPE sinag_uptime_seconds gauge")
        lines.append(f"sinag_uptime_seconds {uptime:.2f}")

        # Active requests gauge
        lines.append("")
        lines.append("# HELP sinag_active_requests Current number of active requests")
        lines.append("# TYPE sinag_active_requests gauge")
        lines.append(f"sinag_active_requests {self._active_requests}")

        # Request count counter
        lines.append("")
        lines.append("# HELP sinag_http_requests_total Total HTTP requests")
        lines.append("# TYPE sinag_http_requests_total counter")

        # Error count counter
        lines.append("")
        lines.append("# HELP sinag_http_errors_total Total HTTP errors (4xx, 5xx)")
        lines.append("# TYPE sinag_http_errors_total counter")

        # Latency histogram
        lines.append("")
        lines.append("# HELP sinag_http_request_duration_ms Request duration in milliseconds")
        lines.append("# TYPE sinag_http_request_duration_ms histogram")

        with self._lock:
            for method, endpoints in self._metrics.items():
                for endpoint, metrics in endpoints.items():
                    labels = f'method="{method}",endpoint="{endpoint}"'

                    # Request count
                    lines.append(
                        f'sinag_http_requests_total{{{labels}}} {metrics.request_count}'
                    )

                    # Error count
                    if metrics.error_count > 0:
                        lines.append(
                            f'sinag_http_errors_total{{{labels}}} {metrics.error_count}'
                        )

                    # Latency histogram buckets
                    cumulative = 0
                    for bucket in self.LATENCY_BUCKETS:
                        bucket_key = f"le_{bucket}"
                        cumulative += metrics.latency_buckets.get(bucket_key, 0)
                        lines.append(
                            f'sinag_http_request_duration_ms_bucket{{{labels},le="{bucket}"}} {cumulative}'
                        )
                    # +Inf bucket
                    cumulative += metrics.latency_buckets.get("le_inf", 0)
                    lines.append(
                        f'sinag_http_request_duration_ms_bucket{{{labels},le="+Inf"}} {cumulative}'
                    )
                    lines.append(
                        f'sinag_http_request_duration_ms_sum{{{labels}}} {metrics.total_latency_ms:.2f}'
                    )
                    lines.append(
                        f'sinag_http_request_duration_ms_count{{{labels}}} {metrics.request_count}'
                    )

        return "\n".join(lines)

    def get_summary(self) -> Dict:
        """Get metrics summary as dictionary."""
        summary = {
            "uptime_seconds": time.time() - self._start_time,
            "active_requests": self._active_requests,
            "endpoints": {},
        }

        with self._lock:
            total_requests = 0
            total_errors = 0
            total_latency = 0.0

            for method, endpoints in self._metrics.items():
                for endpoint, metrics in endpoints.items():
                    key = f"{method} {endpoint}"
                    summary["endpoints"][key] = {
                        "requests": metrics.request_count,
                        "errors": metrics.error_count,
                        "error_rate": round(metrics.error_rate, 2),
                        "avg_latency_ms": round(metrics.avg_latency_ms, 2),
                    }
                    total_requests += metrics.request_count
                    total_errors += metrics.error_count
                    total_latency += metrics.total_latency_ms

            summary["totals"] = {
                "requests": total_requests,
                "errors": total_errors,
                "error_rate": round((total_errors / total_requests * 100) if total_requests > 0 else 0, 2),
                "avg_latency_ms": round((total_latency / total_requests) if total_requests > 0 else 0, 2),
            }

        return summary


# Global metrics collector instance
metrics_collector = MetricsCollector()


class MetricsMiddleware(BaseHTTPMiddleware):
    """
    Middleware to collect request metrics for Prometheus.

    Tracks request count, latency, and error rates per endpoint.
    """

    # Paths to skip (health checks, metrics endpoint itself)
    SKIP_PATHS = {"/health", "/metrics", "/api/v1/system/metrics"}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # Skip metrics collection for certain paths
        if path in self.SKIP_PATHS:
            return await call_next(request)

        # Track active requests
        metrics_collector.increment_active()
        start_time = time.time()

        try:
            response = await call_next(request)

            # Calculate latency
            latency_ms = (time.time() - start_time) * 1000

            # Record metrics
            metrics_collector.record_request(
                method=request.method,
                path=path,
                status_code=response.status_code,
                latency_ms=latency_ms
            )

            return response

        finally:
            metrics_collector.decrement_active()


def get_prometheus_metrics() -> str:
    """Get Prometheus-formatted metrics."""
    return metrics_collector.get_prometheus_metrics()


def get_metrics_summary() -> Dict:
    """Get metrics summary as dictionary."""
    return metrics_collector.get_summary()
