# SINAG

**S**eal of Good Local Governance **I**nformation **N**avigation and **A**ssessment **G**ateway

A comprehensive digital platform for the Department of the Interior and Local Government (DILG) to
facilitate the Seal of Good Local Governance for Barangays (SGLGB) assessment process.

---

## Table of Contents

- [Overview](#overview)
- [Key Capabilities](#key-capabilities)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development Commands](#development-commands)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

SINAG is a comprehensive pre-assessment, preparation, and decision-support tool designed for the
DILG's Seal of Good Local Governance for Barangays (SGLGB) process. It enables a digital workflow
where Barangay Local Government Units (BLGUs) submit self-assessments with Means of Verification
(MOVs), which are then reviewed by DILG Area Assessors through a structured, one-time rework cycle.

The platform supports formal, in-person Table Validation by functioning as a live checklist where
assessors record final compliance data. It features a classification algorithm that automatically
applies the official "3+1" SGLGB scoring logic and integrates with Google's Gemini API to generate
actionable CapDev (Capacity Development) recommendations.

### Key Capabilities

| Capability                         | Description                                                            |
| ---------------------------------- | ---------------------------------------------------------------------- |
| **SGLGB Assessment Workflow**      | Complete digital submission and validation process for BLGUs           |
| **Table Validation Support**       | Live checklist for in-person compliance recording                      |
| **Automated Scoring**              | "3+1" SGLGB scoring logic with classification algorithm                |
| **AI-Powered Recommendations**     | Gemini API integration for CapDev suggestions and gap analysis         |
| **Multi-role Access Control**      | 6 distinct user roles with role-based permissions                      |
| **External Stakeholder Analytics** | Aggregated, anonymized data for Katuparan Center and UMDC Peace Center |
| **MOV Annotation System**          | Assessors can annotate PDFs and images with feedback                   |
| **BBI Tracking**                   | Barangay-based Institutions status calculation                         |
| **Type-safe Architecture**         | End-to-end type safety from Pydantic to TypeScript                     |

---

## Tech Stack

### Backend

- **Runtime**: Python 3.13+
- **Framework**: FastAPI
- **ORM**: SQLAlchemy 2.0
- **Migrations**: Alembic
- **Validation**: Pydantic v2
- **Background Tasks**: Celery + Redis
- **AI Integration**: Google Gemini API

### Frontend

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query (server) + Zustand (client)

### Infrastructure

- **Database**: PostgreSQL (via Supabase)
- **File Storage**: Supabase Storage
- **Caching/Message Broker**: Redis
- **Containerization**: Docker + Docker Compose

### Development Tools

- **Monorepo**: Turborepo + pnpm workspaces
- **Type Generation**: Orval (OpenAPI to TypeScript)
- **Python Package Manager**: uv
- **Testing**: pytest (backend), Vitest (frontend), Playwright (e2e)

---

## Prerequisites

Ensure you have the following installed on your development machine:

| Tool        | Version | Installation                                                              |
| ----------- | ------- | ------------------------------------------------------------------------- |
| **Node.js** | 18+     | [nodejs.org](https://nodejs.org/)                                         |
| **pnpm**    | 8+      | `npm install -g pnpm`                                                     |
| **Python**  | 3.13+   | [python.org](https://www.python.org/)                                     |
| **uv**      | Latest  | `pip install uv` or [Installation Guide](https://github.com/astral-sh/uv) |
| **Docker**  | Latest  | [docker.com](https://www.docker.com/)                                     |
| **Git**     | Latest  | [git-scm.com](https://git-scm.com/)                                       |

You will also need:

- A **Supabase** account and project (for database and file storage)
- A **Gemini API key** (for AI-powered features)

---

## Getting Started

Follow these steps to set up your local development environment:

### 1. Clone the Repository

```bash
git clone https://github.com/generyand/sinag.git
cd sinag
```

### 2. Install Dependencies

```bash
# Install all JavaScript/TypeScript dependencies
pnpm install

# Install Python dependencies for the API
cd apps/api
uv sync
cd ../..
```

### 3. Configure Environment Variables

Copy the example environment files and configure them with your credentials:

```bash
# Backend environment
cp apps/api/.env.example apps/api/.env

# Frontend environment
cp apps/web/.env.example apps/web/.env.local
```

#### Backend Configuration (`apps/api/.env`)

Edit `apps/api/.env` with your credentials:

```env
# Required: Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@[region].pooler.supabase.com:6543/postgres

# Required: Security (generate with: openssl rand -base64 32)
SECRET_KEY=your-secret-key-minimum-32-characters

# Required: AI Features
GEMINI_API_KEY=your-gemini-api-key

# Required: Redis/Celery (default localhost works with Docker)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Development Settings
DEBUG=true
ENVIRONMENT=development
FAIL_FAST=true
```

See `apps/api/.env.example` for all available options and documentation.

#### Frontend Configuration (`apps/web/.env.local`)

Edit `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Set Up the Database

Run database migrations to create the required schema:

```bash
cd apps/api
alembic upgrade head
cd ../..
```

### 5. Generate TypeScript Types

Generate the TypeScript API client from the OpenAPI specification:

```bash
# Start the API first (in a separate terminal)
pnpm dev:api

# Then generate types (in another terminal)
pnpm generate-types
```

### 6. Start Development Servers

```bash
# Start all services (API, Web, Redis, Celery)
pnpm dev
```

This will start:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Redis**: localhost:6379

### 7. Verify Installation

1. Open http://localhost:3000 - you should see the login page
2. Open http://localhost:8000/docs - you should see the FastAPI Swagger UI
3. Check the health endpoint: `curl http://localhost:8000/health`

---

## Development Commands

### Core Commands

| Command              | Description                                     |
| -------------------- | ----------------------------------------------- |
| `pnpm dev`           | Start all services (API, Web, Redis, Celery)    |
| `pnpm dev:api`       | Start backend only (auto-starts Redis)          |
| `pnpm dev:web`       | Start frontend only                             |
| `pnpm dev:no-celery` | Start API + Web without Celery (faster startup) |
| `pnpm build`         | Build all applications for production           |
| `pnpm test`          | Run all tests                                   |
| `pnpm lint`          | Run linting across all applications             |
| `pnpm type-check`    | Run TypeScript type checking                    |

### Type Generation (Critical)

| Command               | Description                                     |
| --------------------- | ----------------------------------------------- |
| `pnpm generate-types` | Generate TypeScript types from OpenAPI spec     |
| `pnpm watch-types`    | Watch for API changes and auto-regenerate types |

**Important**: Always run `pnpm generate-types` after modifying API endpoints or Pydantic schemas.

### Database Migrations

```bash
cd apps/api

# Create a new migration
alembic revision --autogenerate -m "description of change"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Merge migration conflicts
alembic merge heads -m "merge migrations"
```

### Redis & Celery

| Command            | Description           |
| ------------------ | --------------------- |
| `pnpm redis:start` | Start Redis in Docker |
| `pnpm redis:stop`  | Stop Redis            |
| `pnpm redis:cli`   | Open Redis CLI        |
| `pnpm celery`      | Start Celery worker   |
| `pnpm celery:logs` | View Celery logs      |

### Docker Development

| Command                         | Description                       |
| ------------------------------- | --------------------------------- |
| `./scripts/docker-dev.sh up`    | Start all services in Docker      |
| `./scripts/docker-dev.sh down`  | Stop all Docker services          |
| `./scripts/docker-dev.sh logs`  | View Docker logs                  |
| `./scripts/docker-dev.sh shell` | Open shell in API container       |
| `./scripts/docker-dev.sh clean` | Remove all containers and volumes |

### Git Worktree (Parallel Development)

| Command                | Description                                |
| ---------------------- | ------------------------------------------ |
| `pnpm worktree:create` | Create a new worktree for a feature branch |
| `pnpm worktree:list`   | List all worktrees                         |
| `pnpm worktree:remove` | Remove a worktree                          |
| `pnpm worktree:finish` | Merge and cleanup a worktree               |

---

## Project Structure

```
sinag/
├── apps/
│   ├── api/                      # FastAPI backend (Python 3.13+)
│   │   ├── alembic/              # Database migrations
│   │   ├── app/
│   │   │   ├── api/v1/           # API routers (thin layer)
│   │   │   ├── core/             # Config, security, Celery
│   │   │   ├── db/models/        # SQLAlchemy ORM models
│   │   │   ├── schemas/          # Pydantic schemas (generates TS types)
│   │   │   ├── services/         # Business logic (fat layer)
│   │   │   └── workers/          # Celery background tasks
│   │   └── tests/                # pytest test suite
│   │
│   └── web/                      # Next.js 16 frontend (React 19)
│       └── src/
│           ├── app/              # Next.js App Router pages
│           │   ├── (app)/        # Authenticated routes
│           │   └── (auth)/       # Public routes (login)
│           ├── components/       # React components
│           ├── hooks/            # Custom React hooks
│           ├── lib/              # Utilities & configs
│           └── store/            # Zustand state stores
│
├── packages/
│   └── shared/                   # Auto-generated API client (@sinag/shared)
│       └── src/generated/
│           ├── endpoints/        # React Query hooks (by API tag)
│           └── schemas/          # TypeScript types
│
├── docs/                         # Documentation
├── scripts/                      # Build & utility scripts
├── CLAUDE.md                     # Claude Code AI assistant instructions
├── CHANGELOG.md                  # Project changelog
└── docker-compose.yml            # Docker services configuration
```

### Architecture Pattern

SINAG follows the **"Fat Services, Thin Routers"** pattern:

```python
# Router (thin) - only handles HTTP concerns
@router.post("/", tags=["assessments"])
def create(data: CreateSchema, db: Session = Depends(get_db)):
    return assessment_service.create(db, data)

# Service (fat) - contains all business logic
def create(self, db: Session, data: CreateSchema):
    # Business logic, validation, etc.
    obj = Assessment(**data.dict())
    db.add(obj)
    db.commit()
    return obj
```

### Type Generation Flow

```
FastAPI (Python) → OpenAPI Spec → Orval → TypeScript
     ↓                ↓              ↓
Pydantic      /openapi.json    packages/shared/
Schemas                        ├── endpoints/  (React Query hooks)
                               └── schemas/    (TypeScript types)
```

---

## User Roles

SINAG supports six distinct user roles with different access levels:

| Role                       | Description                  | Access Level                |
| -------------------------- | ---------------------------- | --------------------------- |
| **MLGOO_DILG**             | DILG Municipal Administrator | System-wide admin access    |
| **VALIDATOR**              | DILG Area Validator          | Assigned governance area    |
| **ASSESSOR**               | DILG Area Assessor           | All barangays (review only) |
| **BLGU_USER**              | Barangay User                | Own barangay only           |
| **KATUPARAN_CENTER_USER**  | External Stakeholder         | Read-only analytics         |
| **UMDC_PEACE_CENTER_USER** | External Stakeholder         | Filtered analytics          |

### Assessment Workflow

```
DRAFT → SUBMITTED → IN_REVIEW → AWAITING_FINAL_VALIDATION → AWAITING_MLGOO_APPROVAL → COMPLETED
                ↓                        ↓                            ↓
              REWORK ←──────────── (Calibration) ←─────────── (RE-calibration)
```

See [Assessment Workflow Documentation](./docs/workflows/assessor-validation.md) for details.

---

## Documentation

Comprehensive documentation is available in the `docs/` directory:

| Topic                      | Location                                                  |
| -------------------------- | --------------------------------------------------------- |
| **Getting Started**        | [docs/getting-started/](./docs/getting-started/README.md) |
| **Architecture**           | [docs/architecture/](./docs/architecture/README.md)       |
| **API Documentation**      | [docs/api/](./docs/api/README.md)                         |
| **Developer Guides**       | [docs/guides/](./docs/guides/README.md)                   |
| **Workflows**              | [docs/workflows/](./docs/workflows/README.md)             |
| **Troubleshooting**        | [docs/troubleshooting/](./docs/troubleshooting/README.md) |
| **Product Requirements**   | [docs/prds/](./docs/prds/)                                |
| **Claude AI Instructions** | [CLAUDE.md](./CLAUDE.md)                                  |
| **Changelog**              | [CHANGELOG.md](./CHANGELOG.md)                            |

### Live API Documentation

When the backend is running:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

---

## Contributing

### Development Workflow

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the established code patterns (see [CLAUDE.md](./CLAUDE.md))
   - Write tests for new functionality
   - Update documentation as needed
   - Run `pnpm generate-types` after API changes

3. **Run quality checks**

   ```bash
   pnpm test
   pnpm lint
   pnpm type-check
   ```

4. **Commit using conventional commits**

   ```bash
   git commit -m "feat: add new assessment feature"
   git commit -m "fix: resolve validation error"
   git commit -m "docs: update API documentation"
   ```

5. **Push and create a Pull Request**

   ```bash
   git push origin feature/your-feature-name
   ```

### Code Standards

- **Backend**: Follow FastAPI best practices, use Pydantic for validation, implement the service
  layer pattern
- **Frontend**: Follow Next.js App Router conventions, use TypeScript strictly, implement proper
  error handling
- **Testing**: Write unit tests for business logic, integration tests for API endpoints
- **Documentation**: Update code comments and relevant docs for new features

### Adding a New Feature

1. **Backend**: Model → Migration → Schema → Service → Router → Generate Types
2. **Frontend**: Page → Components → Use generated hooks from `@sinag/shared`

See [Adding Features Guide](./docs/guides/adding-features.md) for detailed instructions.

---

## Troubleshooting

### Common Issues

#### Type Generation Fails

1. Ensure the backend is running: `pnpm dev:api`
2. Check the OpenAPI endpoint: `curl http://localhost:8000/openapi.json`
3. Verify Pydantic schemas are valid

#### Migration Conflicts

```bash
cd apps/api
alembic merge heads -m "merge migrations"
alembic upgrade head
```

#### Celery Tasks Not Running

1. Ensure Redis is running: `pnpm redis:start`
2. Start Celery worker: `pnpm celery`
3. Check Celery logs: `pnpm celery:logs`

#### Database Connection Issues

- Verify `DATABASE_URL` uses the Supabase Pooler endpoint (port 6543)
- Check Supabase dashboard for connection limits
- Ensure IP is allowlisted in Supabase settings

For more solutions, see [Troubleshooting Documentation](./docs/troubleshooting/README.md).

---

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

---

## Contact

- **Project**: SINAG Governance Assessment Platform
- **Repository**: [github.com/generyand/sinag](https://github.com/generyand/sinag)
- **Issues**: [GitHub Issues](https://github.com/generyand/sinag/issues)

For questions or suggestions:

1. Check existing [Issues](https://github.com/generyand/sinag/issues)
2. Review the [Troubleshooting](./docs/troubleshooting/README.md) documentation
3. Create a new issue with a detailed description

---

## Acknowledgments

- [Turborepo](https://turbo.build/repo) for monorepo tooling
- [FastAPI](https://fastapi.tiangolo.com/) for the Python web framework
- [Next.js](https://nextjs.org/) for the React framework
- [shadcn/ui](https://ui.shadcn.com/) for the component library
- [Orval](https://orval.dev/) for API client generation
- [Supabase](https://supabase.com/) for database and storage
- The open-source community for the amazing tools that make this project possible
