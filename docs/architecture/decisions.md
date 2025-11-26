# Architectural Decision Records (ADR)

This file tracks all major technical decisions made in the SINAG project. Each decision includes context, the choice made, and reasoning.

---

## 2025-06-15: Package Management Choices

**Context:** Need consistent dependency management across TypeScript and Python codebases.

**Decision:** 
- **Frontend/Monorepo:** pnpm with workspaces
- **Backend:** uv for Python dependency management

**Reason:**
- pnpm provides fast, efficient package management with workspaces support
- uv is faster than pip/poetry and has excellent dependency resolution
- Both tools prioritize performance and reliability
- Lockfiles ensure reproducible builds

---

## 2024-06-15: Monorepo Architecture with Turborepo

**Context:** Need to manage a full-stack application with TypeScript frontend and Python backend while sharing types and utilities.

**Decision:** Implemented Turborepo-based monorepo with:
- `apps/web` - NextJS 15 frontend with TypeScript
- `apps/api` - FastAPI backend with Python 3.13
- `packages/shared` - Shared TypeScript types and utilities

**Reason:** 
- Single repository simplifies dependency management and deployment
- Turborepo provides intelligent caching and parallel builds
- Shared package enables type safety across the stack
- Each app remains independently deployable

---

## 2024-06-16: Type Generation Strategy (Tag-Based Organization)

**Context:** Need to keep TypeScript and Python types synchronized without creating maintenance nightmares.

**Decision:** Implemented tag-based type organization using `openapi-typescript-codegen`:
- FastAPI endpoints tagged by feature area (auth, users, projects, system)
- Generated types organized into separate files by domain
- Auto-generated API client with full type safety

**Reason:**
- Avoids monolithic type files that become unmaintainable
- Logical organization by feature makes types easy to find
- Auto-generation ensures frontend/backend types never drift
- Generated API client eliminates manual fetch() calls

---

## 2024-06-16: Documentation Strategy (Lean & Mean)

**Context:** Small 2-person team needs effective documentation without overhead.

**Decision:** Implemented "Lean & Mean" documentation strategy:
- README-driven development (root + workspace READMEs)
- Simple `docs/` directory for ADRs and architecture
- Leverage auto-generated docs (FastAPI `/docs`)
- Good in-code documentation (docstrings, comments)

**Reason:**
- Low maintenance overhead for small team
- Critical information is always accessible
- Auto-generated docs provide "free" API documentation
- Simple markdown scales well and integrates with GitHub

---

## Template for Future Decisions

```
## YYYY-MM-DD: Decision Title
Context: Why we're making this decision
Decision: What we chose
Reason: Why this choice was made
``` 