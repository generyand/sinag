# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SINAG is a governance assessment platform for the DILG's Seal of Good Local Governance for Barangays (SGLGB). It's a monorepo built with Turborepo, featuring a FastAPI backend and Next.js frontend with end-to-end type safety.

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
# Start all services (frontend, backend, Redis, Celery, Nginx)
./scripts/docker-dev.sh up

# View logs
./scripts/docker-dev.sh logs
./scripts/docker-dev.sh logs-nginx    # Nginx logs only

# Stop services
./scripts/docker-dev.sh down

# Open shell in API container
./scripts/docker-dev.sh shell
./scripts/docker-dev.sh shell-nginx   # Nginx container

# Test/reload Nginx configuration
./scripts/docker-dev.sh nginx-test
./scripts/docker-dev.sh nginx-reload
```

### Nginx Reverse Proxy

SINAG uses Nginx as a reverse proxy for all HTTP traffic. Nginx routes requests to the appropriate backend service.

**Access Points:**
- **Main Entry (Recommended)**: `http://localhost` (via Nginx on port 80)
- Direct API Access: `http://localhost:8000` (development only)
- Direct Web Access: `http://localhost:3000` (development only)

**Routing:**
- `/api/*` → FastAPI backend (api:8000)
- `/docs`, `/redoc`, `/openapi.json` → FastAPI documentation
- `/health` → API health check
- `/_next/*` → Next.js static assets (cached)
- `/` → Next.js frontend (web:3000)

**Key Features:**
- Rate limiting: 30 requests/second per IP (burst 50)
- Gzip compression: Enabled for text-based content
- Upload size limit: 100MB (for MOV files)
- Proxy timeout: 5 minutes (for AI/classification tasks)
- Security headers: X-Frame-Options, XSS protection, etc.

**Configuration Files:**
- `nginx/nginx.conf` - Main Nginx configuration
- `nginx/conf.d/default.conf` - Server block and routing rules
- `nginx/Dockerfile` - Custom Nginx image

**Common Operations:**
```bash
# Test configuration syntax
./scripts/docker-dev.sh nginx-test

# Reload configuration (zero downtime)
./scripts/docker-dev.sh nginx-reload

# Rebuild Nginx image
./scripts/docker-dev.sh rebuild nginx

# View Nginx logs
./scripts/docker-dev.sh logs-nginx
```

For detailed Nginx documentation, see [Nginx Reverse Proxy Setup Guide](/docs/guides/nginx-reverse-proxy-setup.md).

## High-Level Architecture

### Monorepo Structure

```
sinag/
├── apps/
│   ├── api/                      # FastAPI backend (Python 3.13+)
│   │   ├── alembic/              # Database migrations
│   │   │   └── versions/         # Migration files
│   │   ├── app/
│   │   │   ├── api/v1/           # API endpoints (routers)
│   │   │   │   ├── admin.py              # Admin features (audit logs, cycles)
│   │   │   │   ├── analytics.py          # Internal analytics
│   │   │   │   ├── assessments.py        # Assessment CRUD
│   │   │   │   ├── assessor.py           # Assessor validation workflow
│   │   │   │   ├── auth.py               # Authentication
│   │   │   │   ├── bbis.py               # BBI management
│   │   │   │   ├── blgu_dashboard.py     # BLGU dashboard
│   │   │   │   ├── external_analytics.py # External stakeholder analytics
│   │   │   │   ├── indicators.py         # Indicator management
│   │   │   │   ├── lookups.py            # Lookup data
│   │   │   │   ├── movs.py               # MOV file management
│   │   │   │   ├── system.py             # System health
│   │   │   │   └── users.py              # User management
│   │   │   ├── core/             # Config & security
│   │   │   │   ├── celery_app.py
│   │   │   │   ├── config.py
│   │   │   │   └── security.py
│   │   │   ├── db/
│   │   │   │   ├── models/       # SQLAlchemy ORM models
│   │   │   │   │   ├── admin.py          # AuditLog, AssessmentCycle, DeadlineOverride
│   │   │   │   │   ├── assessment.py     # Assessment, AssessmentResponse, MOV, MOVFile, FeedbackComment, MOVAnnotation
│   │   │   │   │   ├── auth.py           # Auth-related models
│   │   │   │   │   ├── barangay.py       # Barangay
│   │   │   │   │   ├── bbi.py            # BBI, BBIResult
│   │   │   │   │   ├── governance_area.py # GovernanceArea, Indicator, IndicatorHistory, IndicatorDraft, ChecklistItem
│   │   │   │   │   ├── system.py         # Reserved for future system tables
│   │   │   │   │   └── user.py           # User
│   │   │   │   ├── base.py
│   │   │   │   └── enums.py              # UserRole, AssessmentStatus, ValidationStatus, etc.
│   │   │   ├── schemas/          # Pydantic models
│   │   │   │   ├── admin.py              # Admin schemas
│   │   │   │   ├── analytics.py          # Analytics schemas
│   │   │   │   ├── assessment.py         # Assessment schemas
│   │   │   │   ├── assessor.py           # Assessor schemas
│   │   │   │   ├── bbi.py                # BBI schemas
│   │   │   │   ├── blgu_dashboard.py     # BLGU dashboard schemas
│   │   │   │   ├── calculation_schema.py # Calculation rule schemas
│   │   │   │   ├── external_analytics.py # External analytics schemas
│   │   │   │   ├── form_schema.py        # Dynamic form schemas
│   │   │   │   ├── indicator.py          # Indicator schemas
│   │   │   │   ├── lookups.py            # Lookup schemas
│   │   │   │   ├── mov_checklist.py      # MOV checklist schemas
│   │   │   │   ├── remark_schema.py      # Remark template schemas
│   │   │   │   ├── system.py             # System schemas
│   │   │   │   ├── token.py              # Token schemas
│   │   │   │   └── user.py               # User schemas
│   │   │   ├── services/         # Business logic layer
│   │   │   │   ├── analytics_service.py
│   │   │   │   ├── annotation_service.py         # MOV annotation management
│   │   │   │   ├── assessment_service.py
│   │   │   │   ├── assessor_service.py
│   │   │   │   ├── audit_service.py              # Audit logging
│   │   │   │   ├── barangay_service.py
│   │   │   │   ├── bbi_service.py                # BBI functionality
│   │   │   │   ├── calculation_engine_service.py # Auto Pass/Fail calculation
│   │   │   │   ├── completeness_validation_service.py
│   │   │   │   ├── compliance_validation_service.py
│   │   │   │   ├── deadline_service.py           # Deadline management
│   │   │   │   ├── external_analytics_service.py # External stakeholder analytics
│   │   │   │   ├── file_validation_service.py    # File upload validation
│   │   │   │   ├── form_schema_validator.py      # Dynamic form validation
│   │   │   │   ├── governance_area_service.py
│   │   │   │   ├── indicator_draft_service.py    # Draft indicator wizard
│   │   │   │   ├── indicator_service.py
│   │   │   │   ├── indicator_validation_service.py
│   │   │   │   ├── intelligence_service.py       # AI/Gemini integration
│   │   │   │   ├── mov_validation_service.py     # MOV validation
│   │   │   │   ├── remark_template_service.py    # Generated remarks
│   │   │   │   ├── startup_service.py
│   │   │   │   ├── storage_service.py            # Supabase storage
│   │   │   │   ├── submission_validation_service.py
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
│   └── web/                      # Next.js 16 frontend (React 19)
│       ├── public/               # Static assets
│       │   ├── Assessment_Areas/
│       │   ├── Scenery/
│       │   ├── Toolkit/
│       │   └── officialLogo/
│       ├── src/
│       │   ├── app/              # Next.js App Router
│       │   │   ├── (app)/        # Authenticated routes
│       │   │   │   ├── admin/              # Admin features
│       │   │   │   ├── analytics/          # Analytics dashboard
│       │   │   │   ├── assessor/           # Assessor dashboard & validation
│       │   │   │   ├── blgu/               # BLGU assessment submission
│       │   │   │   ├── change-password/    # Password change
│       │   │   │   ├── external-analytics/ # External stakeholder analytics
│       │   │   │   ├── mlgoo/              # Admin/MLGOO features
│       │   │   │   ├── reports/            # Analytics & reports
│       │   │   │   ├── user-management/    # User management
│       │   │   │   └── validator/          # Validator dashboard & validation
│       │   │   ├── (auth)/       # Public routes
│       │   │   │   └── login/
│       │   │   └── layout.tsx
│       │   ├── components/
│       │   │   ├── features/     # Domain-specific components
│       │   │   │   ├── admin/
│       │   │   │   ├── analytics/
│       │   │   │   ├── assessments/
│       │   │   │   ├── assessor/
│       │   │   │   ├── auth/
│       │   │   │   ├── bbis/
│       │   │   │   ├── dashboard/
│       │   │   │   ├── dashboard-analytics/
│       │   │   │   ├── external-analytics/   # External stakeholder views
│       │   │   │   ├── forms/
│       │   │   │   ├── indicators/
│       │   │   │   ├── landing/
│       │   │   │   ├── landing-page/
│       │   │   │   ├── movs/
│       │   │   │   ├── profile/
│       │   │   │   ├── reports/
│       │   │   │   ├── rework/               # BLGU rework workflow components
│       │   │   │   ├── settings/
│       │   │   │   ├── submissions/
│       │   │   │   ├── system-settings/
│       │   │   │   ├── users/
│       │   │   │   └── validator/            # Validator-specific validation UI
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
   - `assessment.py`: Assessment, AssessmentResponse, MOV, MOVFile, FeedbackComment, MOVAnnotation
   - `user.py`: User accounts with role-based access control (6 roles)
   - `barangay.py`: Barangay/LGU information
   - `governance_area.py`: GovernanceArea, Indicator, IndicatorHistory, IndicatorDraft, ChecklistItem
   - `bbi.py`: BBI (Barangay-based Institutions), BBIResult
   - `admin.py`: AuditLog, AssessmentCycle, DeadlineOverride

2. **Schemas** (`app/schemas/`): Pydantic models for validation and serialization
   - Define request/response shapes
   - Auto-generate TypeScript types via Orval
   - Key schemas: `external_analytics.py` for external stakeholder data

3. **Services** (`app/services/`): Business logic layer (the "fat" layer)
   - `assessment_service.py`: Core assessment operations
   - `assessor_service.py`: Assessor validation workflow
   - `intelligence_service.py`: AI-powered insights via Gemini
   - `external_analytics_service.py`: Aggregated analytics for external stakeholders
   - `bbi_service.py`: BBI functionality calculations
   - `calculation_engine_service.py`: Automatic Pass/Fail determination
   - `annotation_service.py`: MOV file annotations
   - `user_service.py`: User management

4. **Routers** (`app/api/v1/`): API endpoints (the "thin" layer)
   - Just handle HTTP, call services, return responses
   - `assessments.py`: Assessment CRUD
   - `assessor.py`: Assessor-specific operations
   - `users.py`: User management endpoints
   - `auth.py`: Authentication/authorization
   - `external_analytics.py`: External stakeholder read-only analytics
   - `admin.py`: Administrative features (audit logs, cycles)
   - `bbis.py`: BBI management
   - `indicators.py`: Indicator CRUD
   - `blgu_dashboard.py`: BLGU-specific dashboard data
   - `movs.py`: MOV file operations

5. **Workers** (`app/workers/`): Background task processing with Celery

### Frontend Architecture (`apps/web`)

**Next.js 16 App Router with React 19**

- **`src/app/`**: App Router pages and layouts
  - `(app)/`: Authenticated pages (dashboard, assessments, reports, user management)
  - `(auth)/`: Public pages (login)

- **`src/components/`**: React components
  - `features/[domain]/`: Domain-specific components (auth, assessments, users)
  - `shared/`: Reusable cross-feature components
  - `ui/`: shadcn/ui components

- **`src/lib/`**: Utilities and configurations
  - `api.ts`: Axios instance with auth & error handling (used by Orval)
  - `error-utils.ts`: Error classification utilities (`classifyError()`, `getErrorMessage()`)
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
Frontend imports from @sinag/shared
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
   import { useGetDomain } from '@sinag/shared';

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
- Next.js 16 (App Router, Turbopack - now default)
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

# AI/Gemini (for CapDev recommendations)
GEMINI_API_KEY=your-gemini-api-key
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
3. **Validator Calibration**: Validators can request targeted calibration (routes back to same Validator)
4. **Table Validation**: In-person validation with live compliance checklist
5. **Classification**: Automated "3+1" SGLGB scoring logic
6. **Intelligence**: Gemini API generates CapDev recommendations
7. **Gap Analysis**: Compare initial vs. final results for insights

## External Stakeholder Analytics (Epic 5)

The platform provides read-only analytics access for external stakeholders from Katuparan Center for research purposes. All data is aggregated and anonymized to protect individual barangay privacy.

### External Analytics Endpoints

Available at `/api/v1/external/analytics/`:

- `GET /overall` - Municipal-wide SGLGB compliance statistics
- `GET /governance-areas` - Aggregated pass/fail rates for all 6 governance areas
- `GET /top-failing-indicators` - Top 5 most frequently failed indicators
- `GET /ai-insights/summary` - Anonymized AI-generated recommendations
- `GET /dashboard` - Complete dashboard data in single request
- `GET /export/csv` - Download aggregated analytics as CSV
- `GET /export/pdf` - Download aggregated analytics as PDF

### Privacy Protections

1. **Minimum Threshold**: Data only shown if ≥5 barangays assessed (prevents identification)
2. **Aggregation**: All metrics are aggregated across all barangays
3. **No Individual Data**: Individual barangay performance cannot be identified

### Access Control

Only users with this role can access external analytics:
- `KATUPARAN_CENTER_USER`

Uses the `get_current_external_user` dependency for authentication.

## Recent Feature Implementations

This section tracks major features and enhancements added to the platform (most recent first):

### December 2025 - Next.js 16 Migration

**Framework Upgrade**
- **Upgraded**: Next.js 15.3.3 → 16.0.7
- **Turbopack**: Now stable and used by default for both dev and production builds
- **Node.js Requirement**: 20.9.0+ (current: 24.11.1)

**Breaking Changes Handled**:

1. **Middleware → Proxy Migration**
   - `middleware.ts` renamed to `proxy.ts`
   - Function export renamed from `middleware` to `proxy`
   - Runtime changed from Edge to Node.js (provides full Node.js APIs)
   - No logic changes required - same authentication and route protection

2. **Async Request APIs**
   - Server Components with dynamic routes now require `await params`
   - Updated pattern:
     ```typescript
     // Before (Next.js 15)
     interface PageProps {
       params: { id: string };
     }
     export default function Page({ params }: PageProps) {
       const id = params.id;
     }

     // After (Next.js 16)
     interface PageProps {
       params: Promise<{ id: string }>;
     }
     export default async function Page({ params }: PageProps) {
       const { id } = await params;
     }
     ```
   - Client Components using `useParams()` hook are unchanged

3. **Configuration Updates**
   - Added `turbopack: {}` config for Turbopack compatibility
   - Removed duplicate `next.config.mjs` (using only `.ts`)
   - Removed deprecated `eslint` config option (use `next lint` CLI options instead)

**Files Modified**:
- `apps/web/package.json` - Updated dependencies
- `apps/web/proxy.ts` - Renamed from middleware.ts
- `apps/web/next.config.ts` - Turbopack configuration
- `apps/web/src/app/(app)/validator/submissions/[assessmentId]/validation/page.tsx` - Async params
- `apps/web/src/app/(app)/mlgoo/assessments/[id]/page.tsx` - Async params

### November 2025 - Calibration Tracking & Assessment Resubmission

**1. Calibration Workflow for Validators**
- **Feature**: Validators can now "calibrate" assessments, sending them back to BLGU for targeted corrections
- **Workflow**: When a Validator requests calibration, the assessment returns to the same Validator (not Assessor) after BLGU corrections
- **Database Fields Added**:
  - `is_calibration_rework`: Boolean flag indicating calibration mode
  - `calibration_validator_id`: FK to the Validator who requested calibration
  - `calibration_count`: Integer tracking calibration cycles (max 1)
- **Files Modified**:
  - `apps/api/app/db/models/assessment.py` - Added calibration tracking fields
  - `apps/api/alembic/versions/de1d0f3186e7_add_calibration_count_to_assessments.py` - Migration
  - `apps/api/alembic/versions/3875cc740ca0_add_calibration_tracking_fields_to_.py` - Migration
- **API Endpoints**:
  - `POST /api/v1/assessments/{assessment_id}/submit-for-calibration` - BLGU submits back to Validator
- **Impact**: Enables Validators to request targeted fixes without routing through the full Assessor workflow

**2. BLGU Dashboard Calibration Support**
- **Enhancement**: BLGU dashboard now displays calibration status and routing information
- **Schema Fields Added** (`blgu_dashboard.py`):
  - `is_calibration_rework`: Shows if BLGU should submit to Validator
  - `calibration_validator_id`: ID of requesting Validator
  - `calibration_governance_area_id`: Governance area being calibrated
  - `calibration_governance_area_name`: Display name for UI
- **Impact**: BLGU users see clear guidance on where their resubmission will be routed

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

The system implements role-based access control (RBAC) with six distinct user roles:

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

5. **KATUPARAN_CENTER_USER** (External Stakeholder)
   - External user from Katuparan Center with read-only analytics access for research purposes
   - Can view aggregated, anonymized SGLGB data
   - No access to individual barangay data (privacy protection)
   - Uses `/api/v1/external/analytics/*` endpoints

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

KATUPARAN_CENTER_USER role → No assignments required (external read-only)
                             Clears both validator_area_id and barangay_id
```

### Database Schema

The User model includes these role-related fields:

- `role`: String enum (MLGOO_DILG, VALIDATOR, ASSESSOR, BLGU_USER, KATUPARAN_CENTER_USER)
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

### Development Guides

Located in `docs/guides/`:
- `error-handling.md` - Frontend error classification and display patterns
- `service-layer-pattern.md` - Backend service layer best practices
- `type-generation.md` - Orval type generation workflow
- `database-migrations.md` - Alembic migration guidelines
- `nginx-reverse-proxy-setup.md` - Nginx configuration for development

Key Cursor rule files:
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
