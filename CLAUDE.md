# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VANTAGE is a governance assessment platform for the DILG's Seal of Good Local Governance for Barangays (SGLGB). It's a monorepo built with Turborepo, featuring a FastAPI backend and Next.js frontend with end-to-end type safety.

### Key Architecture Principles

1. **Type Safety**: Backend Pydantic schemas generate TypeScript types via Orval
2. **Service Layer Pattern**: Fat services, thin routers - business logic lives in services
3. **Tag-Based Organization**: FastAPI tags drive auto-generated code organization
4. **Monorepo Structure**: pnpm workspaces + Turborepo for coordinated builds

## Development Commands

### Starting Development

```bash
# Start everything in ONE command (recommended)
pnpm dev
```

This automatically starts:
- ✅ Redis in Docker (background)
- ✅ FastAPI backend (http://localhost:8000)
- ✅ Next.js frontend (http://localhost:3000)
- ✅ Celery worker (background tasks)

All processes run in one terminal with color-coded output:
- 🔵 **API** - Backend logs
- 🟢 **WEB** - Frontend logs
- 🟡 **CELERY** - Background task logs

**Alternative commands:**
```bash
pnpm dev:web        # Frontend only (http://localhost:3000)
pnpm dev:api        # Backend only (http://localhost:8000) - auto-starts Redis
pnpm dev:no-celery  # API + Web without Celery (faster startup)
```

### Redis Management

Redis is required for Celery background tasks (classification, AI insights). Run Redis in Docker:

```bash
# Start Redis (runs in background)
pnpm redis:start

# Check Redis status
pnpm redis:status

# View Redis logs
pnpm redis:logs

# Restart Redis
pnpm redis:restart

# Stop Redis
pnpm redis:stop

# Access Redis CLI
pnpm redis:cli
```

**Redis runs on**: `localhost:6379` (Docker port forwarded to your machine)

### Celery Worker (Background Tasks)

Celery handles background tasks like classification and AI-powered insights:

```bash
# Start Celery worker (in separate terminal)
pnpm celery

# View Celery logs if running in Docker
pnpm celery:logs
```

**What Celery Does:**
- SGLGB classification algorithm
- AI-powered insights via Gemini
- Gap analysis between assessments
- Background notifications

**When to run it:**
- Development: Run `pnpm celery` when testing background tasks
- Production: Celery runs automatically in Docker

### Type Generation (Critical!)

**Always run after modifying API endpoints or Pydantic schemas:**

```bash
pnpm generate-types
```

This generates TypeScript types and React Query hooks from the FastAPI OpenAPI spec. The frontend cannot function without this step.

### Database Migrations

```bash
cd apps/api

# Create a new migration after model changes
alembic revision --autogenerate -m "description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

### Testing

```bash
# All tests
pnpm test

# Backend tests only
cd apps/api
pytest
pytest -vv --log-cli-level=DEBUG  # Verbose output

# Specific test file
pytest tests/api/v1/test_auth.py
```

### Build & Linting

```bash
# Build all apps
pnpm build

# Lint all apps
pnpm lint

# Type checking
pnpm type-check
```

### Background Tasks (Celery)

```bash
cd apps/api

# Start Celery worker
celery -A app.core.celery_app worker --loglevel=info

# Start with auto-reload (development)
celery -A app.core.celery_app worker --loglevel=info --reload

# Start specific queues
celery -A app.core.celery_app worker --loglevel=info --queues=notifications,classification
```

Redis must be running for Celery to work.

### Docker Development

```bash
# Start all services (frontend, backend, Redis, Celery)
./scripts/docker-dev.sh up

# View logs
./scripts/docker-dev.sh logs

# Stop services
./scripts/docker-dev.sh down

# Open shell in API container
./scripts/docker-dev.sh shell
```

## High-Level Architecture

### Monorepo Structure

```
vantage/
├── apps/
│   ├── api/                      # FastAPI backend (Python 3.13+)
│   │   ├── alembic/              # Database migrations
│   │   │   └── versions/         # Migration files
│   │   ├── app/
│   │   │   ├── api/v1/           # API endpoints (routers)
│   │   │   │   ├── analytics.py
│   │   │   │   ├── assessments.py
│   │   │   │   ├── assessor.py
│   │   │   │   ├── auth.py
│   │   │   │   ├── lookups.py
│   │   │   │   ├── system.py
│   │   │   │   └── users.py
│   │   │   ├── core/             # Config & security
│   │   │   │   ├── celery_app.py
│   │   │   │   ├── config.py
│   │   │   │   └── security.py
│   │   │   ├── db/
│   │   │   │   ├── models/       # SQLAlchemy ORM models
│   │   │   │   │   ├── assessment.py
│   │   │   │   │   ├── auth.py
│   │   │   │   │   ├── barangay.py
│   │   │   │   │   ├── governance_area.py
│   │   │   │   │   ├── system.py
│   │   │   │   │   └── user.py
│   │   │   │   ├── base.py
│   │   │   │   └── enums.py
│   │   │   ├── schemas/          # Pydantic models
│   │   │   │   ├── analytics.py
│   │   │   │   ├── assessment.py
│   │   │   │   ├── assessor.py
│   │   │   │   ├── lookups.py
│   │   │   │   ├── system.py
│   │   │   │   ├── token.py
│   │   │   │   └── user.py
│   │   │   ├── services/         # Business logic layer
│   │   │   │   ├── analytics_service.py
│   │   │   │   ├── assessment_service.py
│   │   │   │   ├── assessor_service.py
│   │   │   │   ├── barangay_service.py
│   │   │   │   ├── governance_area_service.py
│   │   │   │   ├── indicator_service.py
│   │   │   │   ├── intelligence_service.py
│   │   │   │   ├── startup_service.py
│   │   │   │   ├── storage_service.py
│   │   │   │   └── user_service.py
│   │   │   └── workers/          # Celery background tasks
│   │   │       ├── intelligence_worker.py
│   │   │       ├── notifications.py
│   │   │       └── sglgb_classifier.py
│   │   ├── tests/                # pytest test suite
│   │   ├── main.py               # FastAPI app entrypoint
│   │   ├── pyproject.toml        # Python dependencies (uv)
│   │   └── alembic.ini           # Alembic config
│   │
│   └── web/                      # Next.js 15 frontend (React 19)
│       ├── public/               # Static assets
│       │   ├── Assessment_Areas/
│       │   ├── Scenery/
│       │   ├── Toolkit/
│       │   └── officialLogo/
│       ├── src/
│       │   ├── app/              # Next.js App Router
│       │   │   ├── (app)/        # Authenticated routes
│       │   │   │   ├── assessor/ # Assessor dashboard & validation
│       │   │   │   ├── blgu/     # BLGU assessment submission
│       │   │   │   ├── mlgoo/    # Admin/MLGOO features
│       │   │   │   ├── reports/  # Analytics & reports
│       │   │   │   └── user-management/
│       │   │   ├── (auth)/       # Public routes
│       │   │   │   └── login/
│       │   │   └── layout.tsx
│       │   ├── components/
│       │   │   ├── features/     # Domain-specific components
│       │   │   │   ├── analytics/
│       │   │   │   ├── assessments/
│       │   │   │   ├── assessor/
│       │   │   │   ├── auth/
│       │   │   │   ├── dashboard/
│       │   │   │   ├── dashboard-analytics/
│       │   │   │   ├── landing-page/
│       │   │   │   ├── profile/
│       │   │   │   ├── reports/
│       │   │   │   ├── settings/
│       │   │   │   ├── submissions/
│       │   │   │   ├── system-settings/
│       │   │   │   └── users/
│       │   │   ├── shared/       # Cross-feature components
│       │   │   └── ui/           # shadcn/ui primitives
│       │   ├── hooks/            # Custom React hooks
│       │   ├── lib/              # Utilities & configs
│       │   │   ├── api.ts        # Axios instance
│       │   │   ├── csv-export.ts
│       │   │   ├── pdf-export.ts
│       │   │   ├── png-export.ts
│       │   │   └── utils.ts
│       │   ├── providers/        # React context providers
│       │   ├── store/            # Zustand state stores
│       │   └── types/            # TypeScript type definitions
│       ├── middleware.ts         # Next.js middleware
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                   # Auto-generated types & API client
│       └── src/generated/
│           ├── endpoints/        # React Query hooks (by tag)
│           │   ├── analytics/
│           │   ├── assessments/
│           │   ├── assessor/
│           │   ├── auth/
│           │   ├── lookups/
│           │   ├── system/
│           │   └── users/
│           └── schemas/          # TypeScript types (by tag)
│               ├── analytics/
│               ├── assessments/
│               ├── assessor/
│               ├── auth/
│               ├── system/
│               └── users/
│
├── docs/                         # Documentation
│   ├── api/                      # API documentation
│   ├── architecture/             # System architecture
│   ├── getting-started/          # Setup guides
│   ├── guides/                   # Development guides
│   ├── prds/                     # Product requirements
│   ├── troubleshooting/          # Common issues
│   ├── workflows/                # Workflow documentation
│   └── project-roadmap.md
│
├── tasks/                        # Implementation task tracking
│   ├── tasks-prd-analytics-reporting/
│   └── temporary/
│
├── scripts/                      # Build & utility scripts
│   ├── docker-dev.sh             # Docker development helper
│   ├── generate-types.js         # Orval type generation
│   └── watch-generate.js         # Watch mode for types
│
├── CHANGELOG.md                  # Project changelog
├── CLAUDE.md                     # Claude Code instructions
├── README.md                     # Project README
├── docker-compose.yml            # Docker services
├── orval.config.ts               # Type generation config
├── package.json                  # Root package.json
├── pnpm-workspace.yaml           # pnpm workspace config
├── turbo.json                    # Turborepo config
└── vercel.json                   # Vercel deployment config
```

### Backend Architecture (`apps/api`)

**Core Pattern: Model → Schema → Service → Router**

1. **Models** (`app/db/models/`): SQLAlchemy ORM models define database schema
   - `assessment.py`: Assessment submissions and data
   - `user.py`: User accounts with role-based access control
   - `barangay.py`: Barangay/LGU information
   - `governance_area.py`: Assessment area definitions (used for Validator assignments)

2. **Schemas** (`app/schemas/`): Pydantic models for validation and serialization
   - Define request/response shapes
   - Auto-generate TypeScript types via Orval

3. **Services** (`app/services/`): Business logic layer (the "fat" layer)
   - `assessment_service.py`: Core assessment operations
   - `assessor_service.py`: Assessor validation workflow
   - `intelligence_service.py`: AI-powered insights via Gemini
   - `user_service.py`: User management

4. **Routers** (`app/api/v1/`): API endpoints (the "thin" layer)
   - Just handle HTTP, call services, return responses
   - `assessments.py`: Assessment CRUD
   - `assessor.py`: Assessor-specific operations
   - `users.py`: User management endpoints
   - `auth.py`: Authentication/authorization

5. **Workers** (`app/workers/`): Background task processing with Celery

### Frontend Architecture (`apps/web`)

**Next.js 15 App Router with React 19**

- **`src/app/`**: App Router pages and layouts
  - `(app)/`: Authenticated pages (dashboard, assessments, reports, user management)
  - `(auth)/`: Public pages (login)

- **`src/components/`**: React components
  - `features/[domain]/`: Domain-specific components (auth, assessments, users)
  - `shared/`: Reusable cross-feature components
  - `ui/`: shadcn/ui components

- **`src/lib/`**: Utilities and configurations
  - `api.ts`: Axios instance with auth & error handling (used by Orval)
  - `utils.ts`: Helper functions

- **`src/hooks/`**: Custom React hooks for data fetching
- **`src/store/`**: Zustand stores for client state
- **`src/providers/`**: React context providers

### Type Generation Flow

```
FastAPI Backend
  ↓ (OpenAPI spec at /openapi.json)
Orval (orval.config.ts)
  ↓ (pnpm generate-types)
packages/shared/src/generated/
  ├── endpoints/[tag]/  ← React Query hooks (by FastAPI tag)
  └── schemas/[tag]/    ← TypeScript types (by FastAPI tag)
  ↓
Frontend imports from @vantage/shared
```

**Critical**: The frontend depends entirely on generated types. Always run `pnpm generate-types` after backend changes.

## Adding a New Feature

### Backend: Creating a New API Endpoint

Follow this exact sequence:

1. **Update/Create Model** (`app/db/models/[domain].py`)
   - Define SQLAlchemy model
   - Create migration: `alembic revision --autogenerate -m "description"`
   - Apply: `alembic upgrade head`

2. **Create Schemas** (`app/schemas/[domain].py`)
   - Define Pydantic models (Base, Create, Update, Response)
   - Use proper type hints

3. **Implement Service** (`app/services/[domain]_service.py`)
   - Create service class with business logic
   - Keep it testable and reusable
   - Export singleton instance: `domain_service = DomainService()`

4. **Create Router** (`app/api/v1/[domain].py`)
   - Create FastAPI router
   - Add tag for organization: `@router.get("/", tags=["domain"])`
   - Call service methods (keep thin!)
   - Register router in `app/api/v1/__init__.py`

5. **Generate Types**
   ```bash
   pnpm generate-types
   ```

6. **Write Tests** (`tests/api/v1/test_[domain].py`)
   - Test endpoint behavior
   - Use pytest fixtures from `conftest.py`

### Frontend: Creating a New Feature

1. **Create Page** (`src/app/(app)/[feature]/page.tsx`)
   - Use Server Components by default
   - Client Components only when needed

2. **Create Components** (`src/components/features/[feature]/`)
   - Feature-specific components
   - Export from `index.ts`

3. **Use Generated API Client**
   ```typescript
   import { useGetDomain } from '@vantage/shared';

   const { data, isLoading } = useGetDomain();
   ```

4. **Create Custom Hook** (optional, `src/hooks/use[Feature].ts`)
   - Wrap generated hooks with business logic

## Important Patterns

### Service Layer Pattern

**Always follow: Fat Services, Thin Routers**

```python
# ✅ GOOD: Router delegates to service
@router.post("/assessments", tags=["assessments"])
def create_assessment(
    db: Session = Depends(deps.get_db),
    data: AssessmentCreate,
    user: User = Depends(deps.get_current_user)
):
    return assessment_service.create_assessment(db, data, user.id)

# ❌ BAD: Business logic in router
@router.post("/assessments", tags=["assessments"])
def create_assessment(
    db: Session = Depends(deps.get_db),
    data: AssessmentCreate,
    user: User = Depends(deps.get_current_user)
):
    # Don't put business logic here!
    assessment = Assessment(**data.dict())
    db.add(assessment)
    db.commit()
    return assessment
```

### FastAPI Tags

Tags organize generated code. Use descriptive, plural tags:

```python
@router.get("/assessments", tags=["assessments"])  # ✅ Generates endpoints/assessments/
@router.post("/users", tags=["users"])             # ✅ Generates endpoints/users/
```

### Database Session Management

Services receive the session from routers via dependency injection:

```python
# In router
def endpoint(db: Session = Depends(deps.get_db)):
    return service.method(db, ...)

# In service
def method(self, db: Session, ...):
    db.add(obj)
    db.commit()
    db.refresh(obj)
```

### Intelligence Layer (AI Features)

The `intelligence_service.py` handles:
- SGLGB classification with "3+1" scoring logic
- Gemini API integration for CapDev recommendations
- Gap analysis between initial and final assessments

Background processing via Celery for long-running AI operations.

## Key Technologies

### Backend
- Python 3.13+, FastAPI, SQLAlchemy, Alembic
- PostgreSQL (via Supabase), Redis
- Celery for background tasks
- Pydantic for validation
- pytest for testing

### Frontend
- Next.js 15 (App Router, Turbopack)
- React 19, TypeScript
- Tailwind CSS, shadcn/ui
- TanStack Query (React Query)
- Zustand for state
- Axios for HTTP

### Tooling
- Turborepo for monorepo builds
- pnpm for package management
- Orval for type generation
- uv for Python packages
- Docker for local development

## Environment Configuration

### Backend (`apps/api/.env`)

```env
DEBUG=true
ENVIRONMENT=development
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Supabase
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@[region].pooler.supabase.com:6543/postgres

# Celery/Redis
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Frontend (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_V1_URL=http://localhost:8000/api/v1
```

## Workflow Assessment

This application implements a structured workflow:

1. **BLGU Submission**: BLGUs submit self-assessments with Means of Verification (MOVs)
2. **Assessor Review**: DILG assessors validate submissions (one rework cycle allowed)
3. **Table Validation**: In-person validation with live compliance checklist
4. **Classification**: Automated "3+1" SGLGB scoring logic
5. **Intelligence**: Gemini API generates CapDev recommendations
6. **Gap Analysis**: Compare initial vs. final results for insights

## Recent Feature Implementations

This section tracks major features and enhancements added to the platform (most recent first):

### November 2025 - MOV File Management & Assessor Validation Enhancements

**1. Clean Filename Display for BLGU Uploads**
- **Issue**: Uploaded files were showing UUID prefixes (e.g., `465069ba-8235-4203-8a71-1468d8cc0e8b_sample5.pdf`)
- **Solution**: Modified storage service to store original clean filename in database while using UUID-prefixed name for storage path
- **Files Modified**:
  - `apps/api/app/services/storage_service.py` - Store `original_filename` for display, use UUID prefix for storage only
- **Impact**: BLGU users now see clean filenames in the UI while maintaining unique storage paths

**2. BLGU Assessment Navigation Improvements**
- **Enhancement**: Removed redundant "Save Responses" button (auto-save handles persistence)
- **Enhancement**: Added Previous/Next indicator navigation at TOP of assessment form for quick navigation
- **Files Modified**:
  - `apps/web/src/components/features/forms/DynamicFormRenderer.tsx` - Added sticky navigation header with Previous/Next buttons
  - `apps/web/src/components/features/assessments/IndicatorAccordion.tsx` - Pass navigation props through component hierarchy
  - `apps/web/src/components/features/assessments/AssessmentContentPanel.tsx` - Top-level navigation state management
- **Impact**: BLGU users can navigate between indicators without scrolling to bottom of long forms

**3. Interactive Image Annotation for Assessors**
- **Feature**: Assessors can now annotate images (similar to PDF annotations) with rectangle drawings and comments
- **Implementation**: Created `ImageAnnotator.tsx` component with:
  - Click-and-drag rectangle drawing on images
  - Percentage-based coordinates for responsive scaling
  - Comment modal for each annotation
  - Visual overlays showing all annotations with accurate cursor positioning
  - Boundary checking and clamping for coordinates
- **Files Created**:
  - `apps/web/src/components/shared/ImageAnnotator.tsx` - Interactive image annotation component
- **Files Modified**:
  - `apps/web/src/components/features/assessor/validation/MiddleMovFilesPanel.tsx` - Integrated ImageAnnotator for image previews
- **Styling**: Applied consistent `rounded-sm` (2px border radius) across all annotation UI elements
- **Impact**: Assessors can provide precise feedback on image MOVs with visual annotations

**4. Image Preview Modal for Assessors**
- **Enhancement**: Images now open in preview modal instead of new tab (consistent with PDF behavior)
- **Files Modified**:
  - `apps/web/src/components/features/assessor/validation/MiddleMovFilesPanel.tsx` - Updated `handlePreview` to work for all file types
- **Impact**: Improved assessor workflow with inline image viewing

**5. Consistent UI Styling**
- **Enhancement**: Applied `rounded-sm` border radius consistently across all annotation-related UI components
- **Components Updated**:
  - Annotation rectangles on images
  - Annotation comment cards (both PDF and image)
  - Comment input modals and buttons
- **Impact**: Consistent visual design across the assessor validation interface

### Backend API Endpoints (Assessor Module)

The following assessor-specific endpoints are available at `/api/v1/assessor/`:

- `GET /queue` - Get assessor's submissions queue filtered by governance area
- `GET /assessments/{assessment_id}` - Get detailed assessment data for review
- `POST /assessment-responses/{response_id}/validate` - Validate an assessment response
- `POST /assessments/{assessment_id}/rework` - Send assessment back for rework
- `POST /assessments/{assessment_id}/finalize` - Finalize assessment validation
- `POST /assessments/{assessment_id}/classify` - Trigger classification algorithm
- `GET /analytics` - Get analytics for assessor's governance area
- `POST /movs/{mov_file_id}/annotations` - Create annotation on MOV file
- `GET /movs/{mov_file_id}/annotations` - Get all annotations for MOV
- `GET /assessments/{assessment_id}/annotations` - Get all annotations for assessment
- `PATCH /annotations/{annotation_id}` - Update annotation
- `DELETE /annotations/{annotation_id}` - Delete annotation

See `apps/api/app/api/v1/assessor.py` for complete endpoint documentation.

## User Roles and Permissions

The system implements role-based access control (RBAC) with four distinct user roles:

### Role Definitions

1. **MLGOO_DILG** (Admin Role)
   - System administrators with full access to all features
   - Can manage users, view all submissions, access analytics
   - No barangay or governance area assignments (system-wide access)
   - Replaces the legacy SUPERADMIN role

2. **VALIDATOR**
   - DILG validators assigned to specific governance areas
   - Validates assessments for barangays within their assigned governance area
   - **Required field**: `validator_area_id` (governance area assignment)
   - Introduced in November 2025 following DILG consultation

3. **ASSESSOR**
   - DILG assessors who can work with any barangay
   - No pre-assigned governance areas (flexible assignment)
   - Can select barangays arbitrarily during the assessment workflow
   - Replaces the legacy AREA_ASSESSOR role

4. **BLGU_USER**
   - Barangay-level users who submit assessments
   - **Required field**: `barangay_id` (barangay assignment)
   - Limited to their assigned barangay's data

### Role-Based Field Requirements

The system enforces strict role-based field validation:

```python
# User creation/update rules enforced by user_service.py
VALIDATOR role → Requires validator_area_id (governance area)
                 Clears barangay_id automatically

BLGU_USER role → Requires barangay_id (barangay assignment)
                 Clears validator_area_id automatically

ASSESSOR role  → No assignments required
                 Clears both validator_area_id and barangay_id

MLGOO_DILG role → No assignments required
                  Clears both validator_area_id and barangay_id
```

### Database Schema

The User model includes these role-related fields:

- `role`: String enum (MLGOO_DILG, VALIDATOR, ASSESSOR, BLGU_USER)
- `validator_area_id`: Integer (nullable) - FK to governance_areas table
- `barangay_id`: Integer (nullable) - FK to barangays table

**Important**: The field `governance_area_id` was renamed to `validator_area_id` in November 2025 to better reflect its purpose.

### API Endpoints

All admin endpoints require `MLGOO_DILG` role:

- `POST /api/v1/users/` - Create new user
- `GET /api/v1/users/` - List all users
- `PUT /api/v1/users/{user_id}` - Update user
- `DELETE /api/v1/users/{user_id}` - Deactivate user
- `POST /api/v1/users/{user_id}/activate` - Activate user
- `POST /api/v1/users/{user_id}/reset-password` - Reset password

See `apps/api/app/api/v1/users.py` for complete documentation.

## Documentation

### Core Technical Specifications

- **Indicator Builder Specification v1.4**: `docs/indicator-builder-specification.md` - **SOURCE OF TRUTH** for indicator structure, MOV checklist validation, BBI functionality system, and grace period handling
  - Validated against 29 real SGLGB indicators (1.1-6.3)
  - Defines 9 MOV checklist item types
  - Documents 9 mandatory BBIs with governance area mappings
  - Specifies validation statuses: Passed, Considered, Failed, Not Applicable, Pending
  - Referenced by all 5 PRDs for consistent implementation

### Product Requirements

- **PRDs**: `docs/prds/` - Product requirements documents (sequential by phase)
  - `prd-phase1-core-user-authentication-and-management.md` - User authentication & RBAC
  - `prd-phase2-blgu-table-assessment-workflow.md` (v2.2) - BLGU submission interface
  - `prd-phase3-assessor-validation-rework-cycle.md` (v1.1) - Assessor/Validator workflows
  - `prd-phase4-core-intelligence-layer.md` (v1.1) - Classification algorithm & AI insights
  - `prd-phase5-analytics-reporting.md` (v1.1) - Analytics & reporting dashboards
  - `prd-phase6-administrative-features.md` (v1.1) - Admin tools for indicator management

### Other Documentation

- **Architecture**: `docs/architecture.md` - System architecture diagrams
- **Roadmap**: `docs/project-roadmap.md` - Feature roadmap
- **Tasks**: `tasks/` - Implementation task lists
- **Cursor Rules**: `.cursor/rules/` - Development guidelines

Key rule files:
- `@project-structure.mdc`: File organization
- `@api-endpoint-creation.mdc`: Backend endpoint workflow
- `@service-layer-pattern.mdc`: Service layer best practices
- `@database-migrations.mdc`: Migration guidelines

## Common Issues

### Type Generation Fails

1. Ensure backend is running: `pnpm dev:api`
2. Check OpenAPI is accessible: `curl http://localhost:8000/openapi.json`
3. Verify all Pydantic schemas are valid
4. Check `orval.config.ts` configuration

### Docker Connection Issues

If frontend can't reach backend:
1. Check Supabase credentials in `apps/api/.env`
2. Verify DATABASE_URL uses pooler endpoint (port 6543)
3. Restart services: `./scripts/docker-dev.sh restart`
4. Check logs: `./scripts/docker-dev.sh logs`

### Migration Conflicts

If multiple migration heads exist:
```bash
cd apps/api
alembic merge heads -m "merge conflicting migrations"
alembic upgrade head
```

### Celery Tasks Not Running

1. Ensure Redis is running: `redis-cli ping`
2. Start Celery worker: `celery -A app.core.celery_app worker --loglevel=info`
3. Check task registration: `celery -A app.core.celery_app inspect registered`
