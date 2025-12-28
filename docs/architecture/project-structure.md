# Project Structure

Detailed monorepo structure for the SINAG platform.

## Directory Layout

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
│   │   │   │   ├── capdev.py             # CapDev recommendations
│   │   │   │   ├── external_analytics.py # External stakeholder analytics
│   │   │   │   ├── gar.py                # GAR endpoints
│   │   │   │   ├── indicators.py         # Indicator management
│   │   │   │   ├── lookups.py            # Lookup data
│   │   │   │   ├── mlgoo.py              # MLGOO approval workflow
│   │   │   │   ├── movs.py               # MOV file management
│   │   │   │   ├── municipal_overview.py # Municipal overview
│   │   │   │   ├── notifications.py      # Notifications
│   │   │   │   ├── system.py             # System health
│   │   │   │   └── users.py              # User management
│   │   │   ├── core/             # Config & security
│   │   │   │   ├── celery_app.py
│   │   │   │   ├── config.py
│   │   │   │   └── security.py
│   │   │   ├── db/
│   │   │   │   ├── models/       # SQLAlchemy ORM models
│   │   │   │   │   ├── admin.py          # AuditLog, AssessmentCycle, DeadlineOverride
│   │   │   │   │   ├── assessment.py     # Assessment, AssessmentResponse, MOV, MOVFile
│   │   │   │   │   ├── barangay.py       # Barangay
│   │   │   │   │   ├── bbi.py            # BBI, BBIResult
│   │   │   │   │   ├── governance_area.py # GovernanceArea, Indicator, ChecklistItem
│   │   │   │   │   └── user.py           # User
│   │   │   │   ├── base.py
│   │   │   │   └── enums.py              # UserRole, AssessmentStatus, ValidationStatus
│   │   │   ├── schemas/          # Pydantic models (auto-generate TS types)
│   │   │   ├── services/         # Business logic layer (fat services)
│   │   │   └── workers/          # Celery background tasks
│   │   ├── tests/                # pytest test suite
│   │   ├── main.py               # FastAPI app entrypoint
│   │   └── pyproject.toml        # Python dependencies (uv)
│   │
│   └── web/                      # Next.js 16 frontend (React 19)
│       ├── public/               # Static assets
│       ├── src/
│       │   ├── app/              # Next.js App Router
│       │   │   ├── (app)/        # Authenticated routes
│       │   │   │   ├── admin/              # Admin features
│       │   │   │   ├── analytics/          # Analytics dashboard
│       │   │   │   ├── assessor/           # Assessor validation
│       │   │   │   ├── blgu/               # BLGU assessment submission
│       │   │   │   ├── external-analytics/ # External stakeholder analytics
│       │   │   │   ├── mlgoo/              # MLGOO features
│       │   │   │   ├── user-management/    # User management
│       │   │   │   └── validator/          # Validator validation
│       │   │   └── (auth)/       # Public routes (login)
│       │   ├── components/
│       │   │   ├── features/     # Domain-specific components
│       │   │   ├── shared/       # Cross-feature components
│       │   │   └── ui/           # shadcn/ui primitives
│       │   ├── hooks/            # Custom React hooks
│       │   ├── lib/              # Utilities & configs
│       │   ├── providers/        # React context providers
│       │   ├── store/            # Zustand state stores
│       │   └── types/            # TypeScript type definitions
│       ├── proxy.ts              # Next.js proxy (auth, routing)
│       └── package.json
│
├── packages/
│   └── shared/                   # Auto-generated types & API client
│       └── src/generated/
│           ├── endpoints/        # React Query hooks (by tag)
│           └── schemas/          # TypeScript types (by tag)
│
├── docs/                         # Documentation
│   ├── api/                      # API documentation
│   ├── architecture/             # System architecture
│   ├── guides/                   # Development guides
│   ├── prds/                     # Product requirements
│   └── workflows/                # Workflow documentation
│
├── scripts/                      # Build & utility scripts
│   ├── docker-dev.sh             # Docker development helper
│   └── generate-types.js         # Orval type generation
│
├── nginx/                        # Nginx reverse proxy config
├── CHANGELOG.md                  # Project changelog
├── CLAUDE.md                     # Claude Code instructions
├── docker-compose.yml            # Docker services
├── orval.config.ts               # Type generation config
├── package.json                  # Root package.json
├── pnpm-workspace.yaml           # pnpm workspace config
└── turbo.json                    # Turborepo config
```

## Key Services

| Service                | Purpose                      | Location                               |
| ---------------------- | ---------------------------- | -------------------------------------- |
| `assessment_service`   | Core assessment CRUD         | `app/services/assessment_service.py`   |
| `assessor_service`     | Assessor validation workflow | `app/services/assessor_service.py`     |
| `intelligence_service` | AI/Gemini integration        | `app/services/intelligence_service.py` |
| `mlgoo_service`        | MLGOO approval workflow      | `app/services/mlgoo_service.py`        |
| `bbi_service`          | BBI functionality            | `app/services/bbi_service.py`          |
| `notification_service` | In-app notifications         | `app/services/notification_service.py` |
| `storage_service`      | Supabase file storage        | `app/services/storage_service.py`      |

## Key Routers

| Router           | Purpose             | Location                       |
| ---------------- | ------------------- | ------------------------------ |
| `assessments`    | Assessment CRUD     | `app/api/v1/assessments.py`    |
| `assessor`       | Assessor operations | `app/api/v1/assessor.py`       |
| `mlgoo`          | MLGOO approval      | `app/api/v1/mlgoo.py`          |
| `blgu_dashboard` | BLGU dashboard      | `app/api/v1/blgu_dashboard.py` |
| `analytics`      | Internal analytics  | `app/api/v1/analytics.py`      |
