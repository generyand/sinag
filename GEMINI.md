# SINAG Project Context

## Overview

**SINAG** (Seal of Good Local Governance Information Navigation and Assessment Gateway) is a
comprehensive digital platform for the DILG's SGLGB assessment process. It facilitates the
submission, review, validation, and analysis of governance data from Barangays.

**Type:** Full-stack Web Application (Monorepo) **Tech Stack:**

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend:** Python 3.13+, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2.
- **Infrastructure:** Docker, Redis, Celery, Supabase (PostgreSQL + Storage).
- **Tools:** Turborepo, pnpm workspaces, uv (Python pkg manager), Orval (API client gen).

## Key Architecture Patterns

### 1. Fat Services, Thin Routers

Business logic resides strictly in the `services/` layer (`apps/api/app/services/`). API routers
(`apps/api/app/api/v1/`) should be minimal, only handling HTTP request/response mapping and calling
the service.

```python
# GOOD: Router calls service
@router.post("/")
def create_item(data: Schema, db: Session = Depends(get_db)):
    return item_service.create(db, data)
```

### 2. Type Safety & Code Generation

We enforce end-to-end type safety.

- **Backend:** Pydantic schemas define the API contract.
- **Frontend:** `pnpm generate-types` generates TypeScript interfaces and React Query hooks via
  **Orval** from the OpenAPI spec.
- **Workflow:** Change Pydantic Schema -> Run `pnpm generate-types` -> Use generated hooks in
  Frontend.

## Development Workflow

### Prerequisites

- Node.js 18+, pnpm 8+
- Python 3.13+, uv (`pip install uv`)
- Docker (for Redis)
- Supabase account (or local equivalent)

### Quick Start

```bash
# 1. Install dependencies
pnpm install
cd apps/api && uv sync && cd ../..

# 2. Start development services (API, Web, Redis, Celery)
pnpm dev

# Alternative: Start individual parts
pnpm dev:api       # Backend + Redis
pnpm dev:web       # Frontend only
pnpm dev:no-celery # API + Web (no background worker)
```

### Essential Commands

| Command               | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `pnpm generate-types` | **CRITICAL:** Re-generate TS types/hooks after API changes. |
| `pnpm test`           | Run all tests (Frontend + Backend).                         |
| `pnpm lint`           | Run linting (ESLint, Prettier, Ruff).                       |
| `pnpm format`         | Auto-format code.                                           |

### Database Migrations

Migrations are managed by Alembic in `apps/api/`.

```bash
cd apps/api
# Create migration
alembic revision --autogenerate -m "describe_changes"
# Apply migration
alembic upgrade head
# Verify migration safety (REQUIRED)
../scripts/test-migration.sh
```

**Rule:** Always test migrations (up and down) using the provided script before committing.

## Assessment Workflow & Roles

The core feature is the SGLGB Assessment cycle:

1.  **BLGU_USER**: Submits assessment & MOVs (Draft -> Submitted).
2.  **ASSESSOR** (Per-Area): 6 Assessors review specific governance areas.
3.  **VALIDATOR**: Validates the entire assessment once all areas are approved.
4.  **MLGOO_DILG**: Final approval or requests Re-calibration.

**Roles:**

- `MLGOO_DILG`: Admin / Final Approver.
- `VALIDATOR`: System-wide Validator (reviews entire assessment after all Assessors approve).
- `ASSESSOR`: Area Assessor (Specific Governance Area).
- `BLGU_USER`: Barangay User.
- `KATUPARAN_CENTER_USER`: External Analytics Viewer (read-only, anonymized data).

## Documentation References

- **Project Structure:** `docs/architecture/project-structure.md` (and `README.md`)
- **AI Instructions:** `CLAUDE.md` (Contains detailed coding guidelines and patterns)
- **Workflows:** `docs/workflows/`
- **API Docs:** `http://localhost:8000/docs` (when running)

## Commit Conventions

This project follows conventional commits (e.g., `feat:`, `fix:`, `docs:`, `chore:`). Pre-commit
hooks (Husky) will enforce formatting and linting.
