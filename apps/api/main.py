# 🚀 SINAG API Main Application
# FastAPI application entry point with configuration and middleware setup

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from app.api.deps import get_current_admin_user
from app.api.v1 import api_router as api_router_v1

# Import from our restructured modules
from app.core.config import settings
from app.middleware import (
    CacheHeadersMiddleware,
    MetricsMiddleware,
    RateLimitMiddleware,
    RequestLoggingMiddleware,
    SecurityHeadersMiddleware,
    get_metrics_summary,
    get_prometheus_metrics,
)
from app.services.startup_service import startup_service

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.

    Handles startup and shutdown events using the startup service.

    FAIL-FAST BEHAVIOR:
    - If FAIL_FAST=True (default): Application crashes on startup errors with clear error messages
    - If FAIL_FAST=False: Application logs warnings and continues (useful for local dev)

    Set FAIL_FAST=False in .env only if you need to bypass startup checks temporarily.
    """
    # Startup checks
    if settings.FAIL_FAST:
        # Strict mode: Let exceptions crash the app
        await startup_service.perform_startup_checks()
    else:
        # Lenient mode: Log errors but continue
        try:
            await startup_service.perform_startup_checks()
        except Exception as e:
            logger.warning(f"⚠️  Startup checks failed but continuing (FAIL_FAST=False): {str(e)}")
            logger.warning("⚠️  Some features may be unavailable")

    # Application is running
    yield

    # Shutdown
    startup_service.log_shutdown()


# Create the FastAPI application with lifespan
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS middleware using settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add middleware (order matters - applied in reverse order, innermost first)
# 1. Request logging (outermost - logs everything)
app.add_middleware(RequestLoggingMiddleware)

# 2. Metrics collection (PERFORMANCE: collects request metrics for Prometheus)
app.add_middleware(MetricsMiddleware)

# 3. Rate limiting
app.add_middleware(RateLimitMiddleware)

# 4. Cache headers (PERFORMANCE: adds HTTP cache headers to responses)
app.add_middleware(CacheHeadersMiddleware)

# 5. Security headers (innermost - adds headers to all responses)
app.add_middleware(SecurityHeadersMiddleware)


# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.

    Returns detailed status of all system components.
    """
    return await startup_service.get_health_status()


# Prometheus metrics endpoint
@app.get("/metrics", response_class=PlainTextResponse, include_in_schema=False)
async def prometheus_metrics():
    """
    Prometheus-compatible metrics endpoint.

    Returns metrics in Prometheus text format for scraping.
    Access at: GET /metrics
    """
    return get_prometheus_metrics()


# JSON metrics summary endpoint (requires admin auth)
@app.get("/api/v1/system/metrics", tags=["system"])
async def metrics_summary(
    current_user=Depends(get_current_admin_user),
):
    """
    Get metrics summary as JSON. Requires MLGOO_DILG admin role.

    Returns request counts, latencies, and error rates per endpoint.
    Useful for dashboards and debugging.
    """
    from app.core.cache import get_cache_stats
    from app.db.base import get_db_pool_stats

    return {
        "requests": get_metrics_summary(),
        "cache": get_cache_stats(),
        "database_pool": get_db_pool_stats(),
    }


# Kubernetes liveness probe
@app.get("/health/live", tags=["system"], include_in_schema=False)
async def liveness_probe():
    """
    Kubernetes liveness probe.

    Returns 200 if the application is alive and responsive.
    If this fails, Kubernetes will restart the pod.
    """
    return {"status": "alive"}


# Kubernetes readiness probe
@app.get("/health/ready", tags=["system"], include_in_schema=False)
async def readiness_probe():
    """
    Kubernetes readiness probe.

    Returns 200 if the application is ready to receive traffic.
    Checks database and Redis connectivity.
    """
    from app.db.base import check_database_connection, check_redis_connection

    db_status = await check_database_connection()
    redis_status = await check_redis_connection()

    is_ready = db_status.get("connected", False) and redis_status.get("connected", False)

    if is_ready:
        return {
            "status": "ready",
            "checks": {
                "database": "ok",
                "redis": "ok",
            },
        }
    else:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=503,
            detail={
                "status": "not_ready",
                "checks": {
                    "database": "ok" if db_status.get("connected") else "failed",
                    "redis": "ok" if redis_status.get("connected") else "failed",
                },
            },
        )


# Detailed health check endpoint (requires admin auth)
@app.get("/api/v1/system/health", tags=["system"])
async def detailed_health(
    current_user=Depends(get_current_admin_user),
):
    """
    Detailed health check with all dependencies. Requires MLGOO_DILG admin role.

    Returns comprehensive status of all system components including:
    - Database connection and pool stats
    - Redis (Celery) connection
    - Redis (Cache) connection
    - Gemini AI availability
    """
    from app.db.base import (
        check_database_connection,
        check_redis_cache_connection,
        check_redis_connection,
        get_db_pool_stats,
    )

    # Check all connections
    db_status = await check_database_connection()
    redis_celery_status = await check_redis_connection()
    redis_cache_status = await check_redis_cache_connection()

    # Get pool stats
    pool_stats = get_db_pool_stats()

    # Check Gemini
    gemini_status = {"available": bool(settings.GEMINI_API_KEY)}

    # Determine overall health
    all_healthy = db_status.get("connected", False) and redis_celery_status.get("connected", False)

    return {
        "status": "healthy" if all_healthy else "degraded",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "components": {
            "database": {
                **db_status,
                "pool": pool_stats,
            },
            "redis_celery": redis_celery_status,
            "redis_cache": redis_cache_status,
            "gemini": gemini_status,
        },
    }


# Include the V1 API router
# All routes from auth.py, users.py, etc., will be available under the /api/v1 prefix
app.include_router(api_router_v1, prefix="/api/v1")


# Local development server (optional)
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
