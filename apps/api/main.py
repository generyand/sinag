# 🚀 SINAG API Main Application
# FastAPI application entry point with configuration and middleware setup

import logging
from contextlib import asynccontextmanager

from app.api.v1 import api_router as api_router_v1

# Import from our restructured modules
from app.core.config import settings
from app.middleware import (
    RateLimitMiddleware,
    RequestLoggingMiddleware,
    SecurityHeadersMiddleware,
)
from app.services.startup_service import startup_service
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

# Add security middleware (order matters - applied in reverse order)
# 1. Request logging (outermost - logs everything)
app.add_middleware(RequestLoggingMiddleware)

# 2. Rate limiting (before security headers)
app.add_middleware(RateLimitMiddleware)

# 3. Security headers (innermost - adds headers to all responses)
app.add_middleware(SecurityHeadersMiddleware)


# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.

    Returns detailed status of all system components.
    """
    return await startup_service.get_health_status()


# Include the V1 API router
# All routes from auth.py, users.py, etc., will be available under the /api/v1 prefix
app.include_router(api_router_v1, prefix="/api/v1")


# Local development server (optional)
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
