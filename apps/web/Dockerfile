# ==============================================================================
# Multi-stage Dockerfile for Next.js Frontend
# ==============================================================================
# This Dockerfile implements production-ready best practices:
# - Multi-stage builds for minimal image size
# - Non-root user for security
# - Layer caching optimization
# - Standalone output for optimal production deployment
# - Security headers and optimizations
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base image with pnpm
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base

# Install security updates
RUN apk update && apk upgrade --no-cache

# Install pnpm globally
RUN npm install -g pnpm@10.11.0

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# ------------------------------------------------------------------------------
# Stage 2: Dependencies installation
# ------------------------------------------------------------------------------
FROM base AS deps

# Copy package manifests for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# ------------------------------------------------------------------------------
# Stage 3: Development (includes all source code and dev dependencies)
# ------------------------------------------------------------------------------
FROM deps AS development

# Copy all source code for development
COPY . .

# Set working directory to web app
WORKDIR /app/apps/web

# Expose development port
EXPOSE 3000

# Development command with hot reload and Turbopack
CMD ["pnpm", "dev", "--turbopack"]

# ------------------------------------------------------------------------------
# Stage 4: Builder (builds the production application)
# ------------------------------------------------------------------------------
FROM deps AS builder

# Build arguments for NEXT_PUBLIC_* variables (must be set at build time)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_V1_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_MAINTENANCE_MODE

# Copy all source code
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_API_V1_URL=${NEXT_PUBLIC_API_V1_URL} \
    NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY} \
    NEXT_PUBLIC_MAINTENANCE_MODE=${NEXT_PUBLIC_MAINTENANCE_MODE}

# Set working directory to web app
WORKDIR /app/apps/web

# Build Next.js application with standalone output
# Standalone output creates a minimal production bundle
RUN pnpm build

# ------------------------------------------------------------------------------
# Stage 5: Production (minimal runtime with only necessary files)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS production

# Install security updates
RUN apk update && apk upgrade --no-cache

# Install only production runtime dependencies (if needed)
RUN apk add --no-cache \
    tini \
    curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Copy only necessary files from builder
# Next.js standalone output includes everything needed to run
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Switch to non-root user
USER nextjs

# Expose production port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Production command - run the standalone server
CMD ["node", "apps/web/server.js"]
