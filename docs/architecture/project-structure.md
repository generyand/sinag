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
│   │   │   │   ├── assessment_activities.py # Assessment activity tracking
│   │   │   │   ├── assessments.py        # Assessment CRUD
│   │   │   │   ├── assessment_years.py   # Assessment year management
│   │   │   │   ├── assessor.py           # Assessor/Validator validation workflow
│   │   │   │   ├── auth.py               # Authentication
│   │   │   │   ├── bbis.py               # BBI management
│   │   │   │   ├── blgu_dashboard.py     # BLGU dashboard
│   │   │   │   ├── capdev.py             # CapDev recommendations
│   │   │   │   ├── compliance.py         # Compliance endpoints
│   │   │   │   ├── deadline_extensions.py # Deadline extension management
│   │   │   │   ├── external_analytics.py # External stakeholder analytics
│   │   │   │   ├── gar.py                # GAR endpoints
│   │   │   │   ├── indicators.py         # Indicator management
│   │   │   │   ├── lookups.py            # Lookup data
│   │   │   │   ├── mlgoo.py              # MLGOO approval workflow
│   │   │   │   ├── movs.py               # MOV file management
│   │   │   │   ├── municipal_export.py   # Municipal data export
│   │   │   │   ├── municipal_offices.py  # Municipal office management
│   │   │   │   ├── municipal_overview.py # Municipal overview
│   │   │   │   ├── notifications.py      # Notifications
│   │   │   │   ├── system.py             # System health
│   │   │   │   ├── user_preferences.py   # User preferences (language, tour)
│   │   │   │   ├── users.py              # User management
│   │   │   │   └── year_config.py        # Year configuration
│   │   │   ├── core/             # Config & security
│   │   │   │   ├── cache.py
│   │   │   │   ├── celery_app.py
│   │   │   │   ├── config.py
│   │   │   │   ├── exception_handlers.py
│   │   │   │   ├── exceptions.py
│   │   │   │   ├── security.py
│   │   │   │   └── year_resolver.py
│   │   │   ├── db/
│   │   │   │   ├── models/       # SQLAlchemy ORM models
│   │   │   │   │   ├── admin.py          # AuditLog, AssessmentCycle, DeadlineOverride
│   │   │   │   │   ├── assessment.py     # Assessment, AssessmentResponse, MOV, MOVFile, MOVAnnotation
│   │   │   │   │   ├── assessment_activity.py # AssessmentActivity tracking
│   │   │   │   │   ├── auth.py           # Token/auth models
│   │   │   │   │   ├── barangay.py       # Barangay
│   │   │   │   │   ├── bbi.py            # BBI, BBIResult
│   │   │   │   │   ├── governance_area.py # GovernanceArea, Indicator, ChecklistItem
│   │   │   │   │   ├── municipal_office.py # MunicipalOffice
│   │   │   │   │   ├── notification.py   # Notification
│   │   │   │   │   ├── system.py         # AssessmentYear, system config
│   │   │   │   │   └── user.py           # User
│   │   │   │   ├── base.py
│   │   │   │   └── enums.py              # UserRole, AssessmentStatus, ValidationStatus, etc.
│   │   │   ├── schemas/          # Pydantic models (auto-generate TS types)
│   │   │   ├── services/         # Business logic layer (fat services)
│   │   │   └── workers/          # Celery background tasks
│   │   │       ├── assessment_year_worker.py  # Year lifecycle tasks
│   │   │       ├── deadline_worker.py         # Deadline monitoring & auto-lock
│   │   │       ├── intelligence_worker.py     # AI/Gemini background tasks
│   │   │       ├── notifications.py           # Notification delivery
│   │   │       └── sglgb_classifier.py        # SGLGB classification
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
│       │   │   │   ├── change-password/    # Password change flow
│       │   │   │   ├── katuparan/          # Katuparan Center external analytics
│       │   │   │   ├── mlgoo/              # MLGOO features
│       │   │   │   ├── reports/            # Reports views
│       │   │   │   ├── user-management/    # User management
│       │   │   │   └── validator/          # Validator validation
│       │   │   └── (auth)/       # Public routes (login)
│       │   ├── components/
│       │   │   ├── features/     # Domain-specific components
│       │   │   ├── layout/       # Layout components (sidebar, header)
│       │   │   ├── shared/       # Cross-feature components
│       │   │   ├── tour/         # Onboarding tour components
│       │   │   └── ui/           # shadcn/ui primitives
│       │   ├── constants/        # Application constants
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
│   ├── archive/                  # Archived documentation
│   ├── deployment/               # Deployment guides
│   ├── devops/                   # CI/CD documentation
│   ├── features/                 # Feature documentation
│   ├── getting-started/          # Setup and installation
│   ├── guides/                   # Development guides
│   ├── migrations/               # Migration documentation
│   ├── plans/                    # Planning documents
│   ├── prds/                     # Product requirements
│   ├── references/               # Reference documentation
│   ├── testing/                  # Testing guides
│   ├── troubleshooting/          # Troubleshooting guides
│   └── workflows/                # Workflow documentation
│
├── scripts/                      # Build & utility scripts
│   ├── docker-dev.sh             # Docker development helper
│   ├── generate-types.js         # Orval type generation
│   ├── test-migration.sh         # Migration health check
│   └── deploy.sh                 # Production deployment
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

| Service                         | Purpose                        | Location                                        |
| ------------------------------- | ------------------------------ | ----------------------------------------------- |
| `assessment_service`            | Core assessment CRUD           | `app/services/assessment_service.py`            |
| `assessor_service`              | Assessor/Validator workflow    | `app/services/assessor_service.py`              |
| `area_submission_service`       | Per-area submission tracking   | `app/services/area_submission_service.py`       |
| `intelligence_service`          | AI/Gemini integration          | `app/services/intelligence_service.py`          |
| `mlgoo_service`                 | MLGOO approval workflow        | `app/services/mlgoo_service.py`                 |
| `bbi_service`                   | BBI functionality              | `app/services/bbi_service.py`                   |
| `compliance_service`            | Compliance calculation         | `app/services/compliance_service.py`            |
| `notification_service`          | In-app notifications           | `app/services/notification_service.py`          |
| `storage_service`               | Supabase file storage          | `app/services/storage_service.py`               |
| `assessment_year_service`       | Assessment year management     | `app/services/assessment_year_service.py`       |
| `deadline_service`              | Deadline & grace period mgmt   | `app/services/deadline_service.py`              |
| `deadline_extension_service`    | Deadline extension requests    | `app/services/deadline_extension_service.py`    |
| `analytics_service`             | Internal analytics             | `app/services/analytics_service.py`             |
| `external_analytics_service`    | External stakeholder analytics | `app/services/external_analytics_service.py`    |
| `municipal_export_service`      | Municipal data export          | `app/services/municipal_export_service.py`      |
| `user_preferences_service`      | User preferences management    | `app/services/user_preferences_service.py`      |
| `calculation_engine_service`    | Auto-calculation engine        | `app/services/calculation_engine_service.py`    |
| `submission_validation_service` | Submission completeness checks | `app/services/submission_validation_service.py` |
| `annotation_service`            | MOV file annotations           | `app/services/annotation_service.py`            |
| `year_config_service`           | Year configuration             | `app/services/year_config_service.py`           |

## Key Routers

| Router           | Purpose             | Location                       |
| ---------------- | ------------------- | ------------------------------ |
| `assessments`    | Assessment CRUD     | `app/api/v1/assessments.py`    |
| `assessor`       | Assessor operations | `app/api/v1/assessor.py`       |
| `mlgoo`          | MLGOO approval      | `app/api/v1/mlgoo.py`          |
| `blgu_dashboard` | BLGU dashboard      | `app/api/v1/blgu_dashboard.py` |
| `analytics`      | Internal analytics  | `app/api/v1/analytics.py`      |
