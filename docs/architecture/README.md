# Architecture Documentation

This section contains comprehensive documentation about SINAG's system architecture, design
patterns, and technical decisions.

## Overview

SINAG is a monorepo-based full-stack application built with:

- **Frontend**: Next.js 15 (App Router) with React 19 and TypeScript
- **Backend**: FastAPI (Python 3.13+) with SQLAlchemy
- **Database**: PostgreSQL (via Supabase)
- **Background Tasks**: Celery with Redis
- **AI Integration**: Google Gemini API for CapDev insights
- **Reverse Proxy**: Nginx for rate limiting, compression, and routing
- **Monorepo**: Turborepo with pnpm workspaces

## Architecture Documents

- [System Overview](./system-overview.md) - High-level architecture and data flow
- [Backend Architecture](./backend-architecture.md) - FastAPI structure and patterns
- [Frontend Architecture](./frontend-architecture.md) - Next.js structure and components
- [Database Schema](./database-schema.md) - Data models and relationships
- [Type Generation](./type-generation.md) - End-to-end type safety workflow
- [Decisions (ADR)](./decisions.md) - Architectural Decision Records

## Key Architectural Principles

### 1. Fat Services, Thin Routers

Business logic lives in service layers, not in API route handlers. See
[Service Layer Pattern](../guides/service-layer-pattern.md).

### 2. Tag-Based Organization

FastAPI tags drive code organization for generated TypeScript types and React Query hooks.

### 3. End-to-End Type Safety

Pydantic schemas → OpenAPI spec → TypeScript types ensure frontend/backend contract alignment.

### 4. Monorepo Structure

Single repository with independent, deployable applications sharing types and utilities.

## Technology Stack

### Backend

- FastAPI, SQLAlchemy, Alembic, Pydantic
- PostgreSQL, Redis, Celery
- pytest for testing

### Frontend

- Next.js 15, React 19, TypeScript
- Tailwind CSS, shadcn/ui
- TanStack Query (React Query)
- Zustand for state management

### DevOps & Tooling

- Turborepo, pnpm, uv
- Orval for type generation
- Docker for containerization

## Design Patterns

### Implemented Patterns

- **Service Layer Pattern**: Business logic encapsulated in service classes, routers remain thin
- **Dependency Injection**: FastAPI's `Depends()` for database sessions, auth, and role-based access
- **Repository Pattern**: Services interact with database through SQLAlchemy ORM
- **React Composition**: Feature components composed from shared and UI primitives
- **State Management**: Zustand for global state, TanStack Query for server state

## User Roles

The system implements five user roles with distinct access levels:

| Role                    | Access Level                                   | Assignment                   |
| ----------------------- | ---------------------------------------------- | ---------------------------- |
| `MLGOO_DILG`            | System-wide admin, final approval authority    | No assignment required       |
| `VALIDATOR`             | Area-specific validation, calibration requests | Requires `validator_area_id` |
| `ASSESSOR`              | Flexible barangay assessment review            | No assignment required       |
| `BLGU_USER`             | Barangay-specific assessment submission        | Requires `barangay_id`       |
| `KATUPARAN_CENTER_USER` | Read-only aggregated analytics for research    | No assignment required       |

## Recent Updates (December 2025)

- **MLGOO Final Approval**: New `AWAITING_MLGOO_APPROVAL` status and approval workflow
- **Calibration Workflow**: Validators can request calibration, routing back to same Validator
- **Parallel Calibration**: Multiple validators can calibrate different areas simultaneously
- **MLGOO RE-calibration**: Distinct from Validator calibration, unlocks specific indicators
- **BBI 3-Tier Rating**: HIGHLY_FUNCTIONAL, MODERATELY_FUNCTIONAL, LOW_FUNCTIONAL per DILG MC
  2024-417
- **MOV Annotations**: Interactive PDF and image annotations for assessors
- **CapDev Insights**: AI-generated capacity development recommendations
- **Grace Period & Auto-Lock**: Deadline management with automatic assessment locking
- **Nginx Reverse Proxy**: Rate limiting, compression, and security headers

_Last updated: December 2025_
