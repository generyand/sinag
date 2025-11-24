# Multi-stage Dockerfile for FastAPI Backend
# Optimized for development with uv package manager
# Build context is root of monorepo, so we copy from apps/api/

# Stage 1: Base image with uv
FROM python:3.13-slim AS base

# Install uv
RUN pip install uv

# Set working directory
WORKDIR /app

# Stage 2: Dependencies
FROM base AS dependencies

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv
RUN uv pip install --system --no-cache -r pyproject.toml

# Stage 3: Development (includes dev dependencies)
FROM dependencies AS development

# Install dev dependencies
RUN uv pip install --system --no-cache -e ".[dev]"

# Copy all application code
COPY . .

# Expose port
EXPOSE 8000

# Default command
# Note: main.py is at the root of apps/api, not in app/
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

