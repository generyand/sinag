# ==============================================================================
# Multi-stage Dockerfile for FastAPI Backend
# ==============================================================================
# This Dockerfile implements production-ready best practices:
# - Multi-stage builds for minimal image size
# - Non-root user for security
# - Layer caching optimization
# - Health checks
# - Proper dependency management with uv
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base image with uv package manager
# ------------------------------------------------------------------------------
FROM python:3.13-slim AS base

# Install system dependencies and security updates
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install uv (fast Python package installer)
RUN pip install --no-cache-dir uv==0.5.17

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -u 1001 appuser

# Set working directory
WORKDIR /app

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# ------------------------------------------------------------------------------
# Stage 2: Dependencies installation
# ------------------------------------------------------------------------------
FROM base AS dependencies

# Copy dependency files (only what's needed for installation)
# Install as root since --system installs to /usr/local which requires root
COPY pyproject.toml uv.lock ./

# Install production dependencies using uv
# --system flag installs to system Python (no virtual env in container)
# --no-cache prevents caching to reduce image size
RUN uv pip install --system --no-cache -r pyproject.toml

# Switch to non-root user after installation
USER appuser

# ------------------------------------------------------------------------------
# Stage 3: Development (includes dev dependencies and source code)
# ------------------------------------------------------------------------------
FROM dependencies AS development

# Switch to root to install dev dependencies
USER root

# Install dev dependencies for development environment
RUN uv pip install --system --no-cache \
    factory-boy==3.3.3 \
    httpx==0.28.1 \
    mypy==1.16.0 \
    pytest==8.4.0 \
    pytest-asyncio==1.0.0 \
    pytest-cov==7.0.0 \
    ruff==0.11.13

# Switch back to non-root user
USER appuser

# Copy application code
COPY --chown=appuser:appuser . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Default command with auto-reload for development
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ------------------------------------------------------------------------------
# Stage 4: Production (minimal, optimized, secure)
# ------------------------------------------------------------------------------
FROM dependencies AS production

# Copy only necessary application code (no tests, no dev files)
COPY --chown=appuser:appuser main.py ./
COPY --chown=appuser:appuser app ./app
COPY --chown=appuser:appuser alembic ./alembic
COPY --chown=appuser:appuser alembic.ini ./

# Set production environment variables (can be overridden)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=production \
    DEBUG=false

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Production command with optimized settings
# - Multiple workers based on CPU cores
# - No auto-reload
# - Production-grade logging
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--log-level", "info"]

# ------------------------------------------------------------------------------
# Stage 5: Celery Worker (for background tasks)
# ------------------------------------------------------------------------------
FROM dependencies AS celery-worker

# Copy application code
COPY --chown=appuser:appuser app ./app

# Set production environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=production

# Health check for Celery worker
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD celery -A app.core.celery_app inspect ping -d celery@$HOSTNAME || exit 1

# Production Celery command with optimizations
CMD ["celery", "-A", "app.core.celery_app", "worker", \
     "--loglevel=info", \
     "--queues=notifications,classification", \
     "--concurrency=4", \
     "--max-tasks-per-child=1000", \
     "--task-events", \
     "--without-gossip", \
     "--without-mingle", \
     "--without-heartbeat"]
