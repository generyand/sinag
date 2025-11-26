# 🔧 System API Routes
# System-level endpoints for health checks and basic info

from fastapi import APIRouter
from datetime import datetime

from app.schemas.system import ApiResponse, HealthCheck
from app.db.base import (
    check_all_connections,
    check_database_connection,
    check_supabase_connection,
)

router = APIRouter()


@router.get("/", response_model=ApiResponse, tags=["system"])
async def root():
    """Root endpoint - welcome message for the API."""
    return ApiResponse(message="Welcome to SINAG API")


@router.get("/health", response_model=HealthCheck, tags=["system"])
async def health_check():
    """
    Comprehensive health check endpoint.

    Checks:
    - API service status
    - Database connectivity (SQLAlchemy + Supabase)
    - Overall system health
    """
    timestamp = datetime.now()

    # Check database connections
    db_status = await check_all_connections()
    db_status["timestamp"] = timestamp

    # Determine overall health
    api_healthy = True  # API is running if this endpoint responds
    db_healthy = db_status["overall_status"] == "healthy"
    overall_healthy = api_healthy and db_healthy

    return {
        "status": "healthy" if overall_healthy else "unhealthy",
        "timestamp": timestamp,
        "api": {"status": "healthy", "service": "FastAPI", "version": "1.0.0"},
        "connections": db_status,
        "checks": {
            "api": api_healthy,
            "database": db_healthy,
            "overall": overall_healthy,
        },
    }


@router.get("/db-status", tags=["system"])
async def database_status():
    """
    Detailed database connectivity status for debugging.

    Returns detailed information about:
    - PostgreSQL connection via SQLAlchemy
    - Supabase connection and configuration
    - Connection errors and troubleshooting info
    """
    timestamp = datetime.now()

    return {
        "timestamp": timestamp,
        "connections": await check_all_connections(),
        "individual_checks": {
            "postgresql": await check_database_connection(),
            "supabase": await check_supabase_connection(),
        },
    }


@router.get("/hello", response_model=ApiResponse, tags=["system"])
async def hello():
    """Simple hello endpoint for testing connectivity."""
    return ApiResponse(message="Hello from FastAPI backend!")
