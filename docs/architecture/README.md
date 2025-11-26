# Architecture Documentation

This section contains comprehensive documentation about SINAG's system architecture, design patterns, and technical decisions.

## Overview

SINAG is a monorepo-based full-stack application built with:
- **Frontend**: Next.js 15 (App Router) with React 19 and TypeScript
- **Backend**: FastAPI (Python 3.13+) with SQLAlchemy
- **Database**: PostgreSQL (via Supabase)
- **Background Tasks**: Celery with Redis
- **AI Integration**: Google Gemini API
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
Business logic lives in service layers, not in API route handlers. See [Service Layer Pattern](../guides/service-layer-pattern.md).

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

> **TODO**: Document key patterns used:
> - Repository pattern (if applicable)
> - Dependency injection
> - Service layer pattern
> - React composition patterns
> - State management patterns
