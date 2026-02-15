# CLAUDE.md

Guidance for Claude Code when working with the SINAG codebase.

## Project Overview

SINAG is a governance assessment platform for the DILG's Seal of Good Local Governance for Barangays
(SGLGB). Monorepo with FastAPI backend + Next.js 16 frontend.

### Architecture Principles

1. **Type Safety**: Pydantic schemas → Orval → TypeScript types
2. **Service Layer**: Fat services, thin routers (business logic in services)
3. **Tag-Based Organization**: FastAPI tags drive code generation
4. **Monorepo**: pnpm workspaces + Turborepo

## Essential Commands

```bash
# Development (starts Redis, API, Web, Celery)
pnpm dev

# Alternative commands
pnpm dev:api        # Backend only (auto-starts Redis)
pnpm dev:web        # Frontend only
pnpm dev:no-celery  # API + Web without Celery

# Type generation (CRITICAL - run after API changes)
pnpm generate-types

# Database migrations
cd apps/api
alembic revision --autogenerate -m "description"
alembic upgrade head

# Migration health check (IMPORTANT - run after creating migrations)
./scripts/test-migration.sh              # Test all migrations
./scripts/test-migration.sh <revision>   # Test specific migration

# Testing
pnpm test                    # All tests
cd apps/api && pytest        # Backend only

# Build & lint
pnpm build
pnpm lint
pnpm type-check

# Manual formatting (auto-runs on commit via husky)
pnpm format                        # Format JS/TS/JSON/CSS/MD
cd apps/api && uv run ruff format  # Format Python
```

## Pre-commit Hooks

Husky automatically runs on every commit:

- **JS/TS/JSON/CSS/MD**: lint-staged + Prettier
- **Python**: ruff check --fix + ruff format (auto-formats and re-stages)

## Project Structure

```
sinag/
├── apps/
│   ├── api/                 # FastAPI backend (Python 3.13+)
│   │   ├── app/
│   │   │   ├── api/v1/      # Routers (thin layer)
│   │   │   ├── db/models/   # SQLAlchemy models
│   │   │   ├── core/        # Config, cache, Celery, year resolver
│   │   │   ├── schemas/     # Pydantic schemas
│   │   │   ├── services/    # Business logic (fat layer)
│   │   │   └── workers/     # Celery tasks
│   │   └── alembic/         # Migrations
│   └── web/                 # Next.js 16 (React 19)
│       └── src/
│           ├── app/         # App Router pages
│           ├── components/  # React components
│           └── lib/         # Utilities
├── packages/shared/         # Auto-generated types (@sinag/shared)
└── docs/                    # Documentation
```

See `docs/architecture/project-structure.md` for full structure.

## Core Pattern: Model → Schema → Service → Router

### Adding a Backend Feature

1. **Model** (`app/db/models/`): Define SQLAlchemy model
2. **Migration**: `alembic revision --autogenerate -m "desc"` → `alembic upgrade head`
3. **Test Migration**: `./scripts/test-migration.sh` (IMPORTANT!)
4. **Schema** (`app/schemas/`): Define Pydantic models
5. **Service** (`app/services/`): Implement business logic
6. **Router** (`app/api/v1/`): Expose via API (keep thin!)
7. **Generate**: `pnpm generate-types`
8. **Test** (`tests/api/v1/`): Write pytest tests

### Adding a Frontend Feature

1. **Page** (`src/app/(app)/[feature]/page.tsx`)
2. **Components** (`src/components/features/[feature]/`)
3. **Use generated hooks**: `import { useGetX } from '@sinag/shared'`

## Type Generation Flow

```
FastAPI → /openapi.json → Orval → packages/shared/src/generated/
                                   ├── endpoints/  (React Query hooks)
                                   └── schemas/    (TypeScript types)
```

**Always run `pnpm generate-types` after modifying API endpoints or Pydantic schemas.**

## Assessment Workflow

```
DRAFT → SUBMITTED → [6 Assessors Review Per-Area] → AWAITING_FINAL_VALIDATION → AWAITING_MLGOO_APPROVAL → COMPLETED
                ↓                                            ↓                            ↓
              REWORK ←────────────────────────────── (Calibration) ←─────────── (RE-calibration)
```

| Role       | Responsibility                                                 |
| ---------- | -------------------------------------------------------------- |
| BLGU_USER  | Submit assessments with MOVs                                   |
| ASSESSOR   | Review assigned governance area, approve/rework (per-area)     |
| VALIDATOR  | Final validation (all areas), determine Pass/Fail, calibration |
| MLGOO_DILG | Final approval, request RE-calibration                         |

**Per-Area Workflow (January 2026):** Each of the 6 governance areas has a dedicated assessor. When
all 6 assessors approve their areas, the assessment moves to `AWAITING_FINAL_VALIDATION` for the
system-wide Validator to review.

See `docs/workflows/assessor-validation.md` for detailed workflow.

## User Roles

| Role                  | Access                   | Required Field     |
| --------------------- | ------------------------ | ------------------ |
| MLGOO_DILG            | System-wide admin        | None               |
| ASSESSOR              | Assigned governance area | `assessor_area_id` |
| VALIDATOR             | System-wide (all areas)  | None               |
| BLGU_USER             | Own barangay only        | `barangay_id`      |
| KATUPARAN_CENTER_USER | Read-only analytics      | None               |

See `docs/architecture/user-roles.md` for details.

## Tech Stack

| Layer    | Technologies                                                   |
| -------- | -------------------------------------------------------------- |
| Backend  | Python 3.13+, FastAPI, SQLAlchemy, Alembic, Celery, Redis      |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind, shadcn/ui, Zustand |
| Database | PostgreSQL (Supabase)                                          |
| Tooling  | Turborepo, pnpm, Orval, uv, Docker                             |

## Key Services

| Service                      | Purpose                                          |
| ---------------------------- | ------------------------------------------------ |
| `assessment_service`         | Core assessment CRUD and status management       |
| `assessor_service`           | Per-area assessor review workflow                |
| `mlgoo_service`              | MLGOO final approval and RE-calibration workflow |
| `intelligence_service`       | AI/Gemini integration for insights               |
| `bbi_service`                | BBI compliance checking (7 mandatory BBIs)       |
| `assessment_year_service`    | Multi-year lifecycle (activate/publish/phase)    |
| `analytics_service`          | Dashboard analytics and statistics               |
| `user_service`               | User CRUD with role-based field management       |
| `notification_service`       | In-app notification creation and delivery        |
| `deadline_service`           | Per-assessment deadline tracking and extensions  |
| `storage_service`            | Supabase file storage for MOVs and logos         |
| `gar_service`                | Governance area report generation                |
| `external_analytics_service` | Anonymized analytics for Katuparan Center        |
| `compliance_service`         | Assessment compliance validation                 |
| `email_service`              | Email notification delivery                      |

## Database Migrations (IMPORTANT)

**ALWAYS test migrations before committing!** Use the migration health check:

```bash
./scripts/test-migration.sh              # Test all pending migrations
./scripts/test-migration.sh <revision>   # Test specific migration
```

Or use the slash command: `/test-migration`

### Migration Best Practices

1. **Test upgrade AND downgrade**: Migrations must be reversible
2. **Avoid data loss**: Downgrade should preserve data where possible
3. **Check constraints**: Foreign keys, unique, NOT NULL constraints
4. **Use transactions**: Wrap data migrations in transactions
5. **Handle edge cases**: Empty tables, NULL values, existing data
6. **Use Alembic, NOT Supabase MCP**: Always create migrations via `alembic revision` - never use
   Supabase MCP's `apply_migration` for persistent changes. MCP changes only affect the current
   database and won't be tracked in git or applied to other environments.

### Common Migration Issues

| Issue                | Solution                                               |
| -------------------- | ------------------------------------------------------ |
| Multiple heads       | `alembic merge heads -m "merge"`                       |
| Missing dependency   | Check `down_revision` in migration file                |
| Constraint violation | Add data migration before schema change                |
| Trailing whitespace  | Use `op.execute()` with parentheses, not triple quotes |

## Key Patterns

### Service Layer (Fat Services, Thin Routers)

```python
# Router (thin) - just calls service
@router.post("/", tags=["domain"])
def create(db: Session = Depends(deps.get_db), data: CreateSchema):
    return domain_service.create(db, data)

# Service (fat) - contains business logic
def create(self, db: Session, data: CreateSchema):
    obj = Model(**data.dict())
    db.add(obj)
    db.commit()
    return obj
```

### FastAPI Tags

Tags organize generated code:

```python
@router.get("/", tags=["assessments"])  # → endpoints/assessments/
```

## Environment Variables

See `.env.example` files for full documentation of each variable.

### Backend (`apps/api/.env`)

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SECRET_KEY=...                              # Min 32 chars, for JWT signing
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
REDIS_CACHE_URL=redis://localhost:6380/0    # Separate Redis for app cache
GEMINI_API_KEY=...
FIRST_SUPERUSER=admin@sinag.dilg.gov.ph
FIRST_SUPERUSER_PASSWORD=...
BACKEND_CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Frontend (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_MAINTENANCE_MODE=false
```

## Common Issues

### Type Generation Fails

1. Ensure backend is running: `pnpm dev:api`
2. Check OpenAPI: `curl http://localhost:8000/openapi.json`
3. Verify Pydantic schemas are valid

### Migration Conflicts

```bash
cd apps/api
alembic merge heads -m "merge migrations"
alembic upgrade head
```

### Celery Tasks Not Running

1. Ensure Redis is running: `pnpm redis:start`
2. Start Celery: `pnpm celery`

## Documentation

| Topic                  | Location                                     |
| ---------------------- | -------------------------------------------- |
| Project structure      | `docs/architecture/project-structure.md`     |
| Database schema        | `docs/architecture/database-schema.md`       |
| Backend architecture   | `docs/architecture/backend-architecture.md`  |
| User roles             | `docs/architecture/user-roles.md`            |
| Assessment workflow    | `docs/workflows/assessor-validation.md`      |
| BLGU workflow          | `docs/workflows/blgu-assessment.md`          |
| Classification (3+1)   | `docs/workflows/classification-algorithm.md` |
| BBI compliance         | `docs/features/bbi-compliance.md`            |
| External analytics     | `docs/features/external-analytics.md`        |
| Multi-year assessments | `docs/features/multi-year-assessments.md`    |
| API endpoints          | `docs/api/endpoints/`                        |
| PRDs                   | `docs/prds/`                                 |
| Changelog              | `CHANGELOG.md`                               |

## Docker Development

```bash
./scripts/docker-dev.sh up      # Start all services
./scripts/docker-dev.sh logs    # View logs
./scripts/docker-dev.sh down    # Stop services
```

Access: `http://localhost` (Nginx) or `http://localhost:8000` (API direct)
