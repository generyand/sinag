# SINAG

A modern monorepo setup using **Turborepo** with **NextJS** frontend and **FastAPI** backend for governance assessment and management.

## Table of Contents

- [Introduction](#introduction)
- [Table of Contents](#table-of-contents)
- [Installation](#installation)
- [Usage](#usage)
- [Features](#features)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [Tests](#tests)
- [Deployment](#deployment)
- [Built With](#built-with)
- [Roadmap](#roadmap)
- [License](#license)
- [Author/Contact](#authorcontact)
- [Acknowledgments](#acknowledgments)

## Introduction

SINAG is a comprehensive pre-assessment, preparation, and decision-support tool designed for the DILG's Seal of Good Local Governance for Barangays (SGLGB) process. It facilitates a digital workflow where Barangay Local Government Units (BLGUs) submit their self-assessment and Means of Verification (MOVs), which are then reviewed by DILG Area Assessors through a structured, one-time rework cycle. The application supports formal, in-person Table Validation by functioning as a live checklist where assessors record final compliance data, features a classification algorithm that automatically applies the official "3+1" SGLGB scoring logic, and integrates with Google's Gemini API to generate actionable CapDev recommendations. SINAG serves as a strategic gap analysis tool, comparing initial submissions against final validated results to provide insights for improving the governance assessment cycle.

### Key Capabilities

- **SGLGB Assessment Workflow**: Digital submission and validation process for BLGUs
- **Table Validation Support**: Live checklist for in-person compliance recording
- **Automated Scoring**: "3+1" SGLGB scoring logic with classification algorithm
- **AI-Powered Recommendations**: Gemini API integration for CapDev suggestions
- **Gap Analysis**: Strategic comparison of initial vs. final assessment results
- **Multi-role Support**: 6 distinct user roles including external stakeholders
- **External Stakeholder Analytics**: Aggregated, anonymized data for Katuparan Center and UMDC Peace Center
- **MOV Annotation System**: Assessors can annotate PDFs and images with feedback
- **BBI Functionality Tracking**: Barangay-based Institutions status calculation
- **Type-safe Architecture**: End-to-end type safety between frontend and backend

## Installation

### Prerequisites

- **Node.js** (18+)
- **Python** (3.13+)
- **pnpm** (`npm install -g pnpm`)
- **uv** (`pip install uv`)

### Setup Instructions

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd sinag
   ```

2. **Install dependencies**

   ```bash
   # Install all dependencies across the monorepo
   pnpm install
   ```

3. **Environment Configuration**

   ```bash
   # Copy environment files (if they exist)
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

4. **Database Setup**

   ```bash
   # Navigate to API directory
   cd apps/api

   # Run database migrations
   alembic upgrade head

   # Return to root
   cd ../..
   ```

5. **Generate Type Definitions**
   ```bash
   # Generate shared types from OpenAPI spec
   pnpm generate-types
   ```

## Usage

### Development Mode

#### Start All Applications

```bash
# Start both frontend and backend
pnpm dev
```

#### Start Individual Applications

```bash
# Frontend only (http://localhost:3000)
pnpm dev:web

# Backend only (http://localhost:8000)
pnpm dev:api
```

### Production Build

```bash
# Build all applications
pnpm build

# Build specific application
turbo build --filter=web
turbo build --filter=api
```

### Available Scripts

- `pnpm dev` - Start all applications (API, Web, Redis, Celery) in development mode
- `pnpm dev:api` - Start backend only (auto-starts Redis)
- `pnpm dev:web` - Start frontend only
- `pnpm dev:no-celery` - Start API + Web without Celery (faster startup)
- `pnpm build` - Build all applications for production
- `pnpm test` - Run tests across all applications
- `pnpm lint` - Run linting across all applications
- `pnpm type-check` - Run TypeScript type checking
- `pnpm clean` - Clean build artifacts
- `pnpm generate-types` - Generate TypeScript types from OpenAPI spec
- `pnpm watch-types` - Watch for API changes and regenerate types
- `pnpm redis:start` - Start Redis in Docker
- `pnpm redis:stop` - Stop Redis
- `pnpm celery` - Start Celery worker for background tasks

## Features

### Core Functionality

- ✅ **Modern Monorepo Architecture** with Turborepo
- ✅ **Type-safe API Integration** using Orval-generated clients
- ✅ **Role-based Access Control** for different user types
- ✅ **Assessment Management** with form validation and submission
- ✅ **Real-time Dashboard** with KPIs and progress tracking
- ✅ **Document Upload & Processing** with file validation
- ✅ **Report Generation** with export capabilities
- ✅ **Responsive Design** with Tailwind CSS and shadcn/ui
- ✅ **Hot Reloading** for both frontend and backend development
- ✅ **Database Migrations** with Alembic
- ✅ **Background Job Processing** with Celery and Redis

### User Roles

The system supports six distinct user roles:

- **MLGOO_DILG (Admin)**: Full system access, user management, system settings
- **VALIDATOR**: DILG validators assigned to specific governance areas
- **ASSESSOR**: DILG assessors who can work with any barangay
- **BLGU_USER**: Barangay-level users for assessment submission
- **KATUPARAN_CENTER_USER**: External stakeholder with read-only analytics access
- **UMDC_PEACE_CENTER_USER**: External stakeholder with filtered analytics access

## Configuration

### Environment Variables

#### Backend (`apps/api/.env`)

```env
#  SINAG API Environment Variables
# Copy this file to .env and fill in your actual values

# =============================================================================
#  APPLICATION SETTINGS
# =============================================================================
DEBUG=true
ENVIRONMENT=development

# =============================================================================
#  SECURITY SETTINGS
# =============================================================================
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# =============================================================================
#  SUPABASE CONFIGURATION
# =============================================================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@[region].pooler.supabase.com:6543/postgres

# =============================================================================
#  CELERY/REDIS CONFIGURATION
# =============================================================================
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# =============================================================================
#  AI CONFIGURATION (Optional - for CapDev recommendations)
# =============================================================================
GEMINI_API_KEY=your-gemini-api-key
```

#### Frontend (`apps/web/.env.local`)

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_V1_URL=http://localhost:8000/api/v1
```

### Database Configuration

The application uses PostgreSQL (via Supabase) with the following key tables:

- `users` - User accounts and authentication (6 roles)
- `barangays` - Barangay/LGU information
- `governance_areas` - Assessment area definitions
- `indicators` - Assessment indicators with dynamic form schemas
- `assessments` - Assessment submissions and status tracking
- `assessment_responses` - Individual indicator responses
- `mov_files` - Means of Verification file uploads
- `mov_annotations` - Assessor annotations on MOV files
- `bbis` - Barangay-based Institutions configuration
- `bbi_results` - BBI functionality results per assessment
- `audit_logs` - Administrative action audit trail
- `assessment_cycles` - Assessment period management
- `deadline_overrides` - Deadline extensions for specific barangays

### Monorepo Structure

```
sinag/
├── apps/
│   ├── web/              # NextJS frontend (TypeScript)
│   │   ├── src/
│   │   │   ├── app/      # App Router pages
│   │   │   ├── components/ # React components
│   │   │   ├── hooks/    # Custom React hooks
│   │   │   └── lib/      # Utilities and configurations
│   │   └── package.json
│   └── api/              # FastAPI backend (Python)
│       ├── app/
│       │   ├── api/      # API routes
│       │   ├── db/       # Database models and migrations
│       │   ├── schemas/  # Pydantic schemas
│       │   └── services/ # Business logic
│       └── pyproject.toml
├── packages/
│   └── shared/           # Shared types and utilities
│       └── src/generated/ # Auto-generated API client
├── docs/                 # Documentation and PRDs
├── tasks/               # Task lists and project management
└── scripts/             # Build and utility scripts
```

## Contributing

### Development Workflow

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

   - Follow the established code structure
   - Write tests for new functionality
   - Update documentation as needed

3. **Run tests and linting**

   ```bash
   pnpm test
   pnpm lint
   pnpm type-check
   ```

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Standards

- **Frontend**: Follow NextJS App Router conventions, use TypeScript, implement proper error handling
- **Backend**: Follow FastAPI best practices, use Pydantic for validation, implement proper service layer pattern
- **Testing**: Write unit tests for business logic, integration tests for API endpoints
- **Documentation**: Update README and code comments for new features

## Tests

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific app
turbo test --filter=web
turbo test --filter=api

# Run tests with verbose output
pnpm test -- -vv --log-cli-level=DEBUG
```

### Test Structure

#### Backend Tests (`apps/api/tests/`)

- Unit tests for services and business logic
- Integration tests for API endpoints
- Database migration tests
- Authentication and authorization tests

#### Frontend Tests (`apps/web/src/`)

- Component tests with React Testing Library
- Hook tests for custom React hooks
- Integration tests for user workflows
- API client tests

### Test Coverage

- Aim for >80% code coverage
- Test critical business logic thoroughly
- Include edge cases and error scenarios
- Mock external dependencies appropriately

## Deployment

### Production Build

```bash
# Build all applications
pnpm build

# Verify builds
turbo build --dry-run
```

### Environment Setup

1. **Configure production environment variables**
2. **Set up PostgreSQL database**
3. **Configure Redis for background jobs**
4. **Set up reverse proxy (nginx)**
5. **Configure SSL certificates**

### Docker Development

SINAG includes comprehensive Docker support for local development with dual-stack IPv4/IPv6 networking.

#### Prerequisites

- **Docker Desktop** (or Docker Engine + Docker Compose)
- **Supabase Account** (for database connection)
- Local Supabase credentials

#### Quick Start with Docker

1. **Copy environment files**

   ```bash
   cp apps/api/.env.docker.example apps/api/.env
   cp apps/web/.env.docker.example apps/web/.env.local
   ```

2. **Configure your Supabase connection**
   Edit `apps/api/.env` and add your Supabase credentials:

   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

3. **Start all services**

   ```bash
   ./scripts/docker-dev.sh up
   # Or manually:
   # docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```

4. **Access your services**
   - **Frontend (Web App)**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **API Documentation**: http://localhost:8000/docs
   - **API ReDoc**: http://localhost:8000/redoc
   - **Health Check**: http://localhost:8000/health
   - **Redis**: localhost:6379 (internal use only)

#### Helper Scripts

```bash
# Start services
./scripts/docker-dev.sh up

# View logs
./scripts/docker-dev.sh logs

# Stop services
./scripts/docker-dev.sh down

# Restart services
./scripts/docker-dev.sh restart

# Open shell in API container
./scripts/docker-dev.sh shell

# Check service status
./scripts/docker-dev.sh status

# Clean everything (removes volumes and images)
./scripts/docker-dev.sh clean
```

#### Docker Architecture

- **api**: FastAPI backend with hot-reload
- **web**: Next.js frontend with fast refresh
- **redis**: Redis instance for Celery tasks
- **celery-worker**: Background task processor

All services run on a custom Docker network with dual-stack IPv4/IPv6 support.

#### Troubleshooting

**Ports already in use:**

```bash
# Check what's using the ports
lsof -i :3000  # Frontend
lsof -i :8000  # Backend
lsof -i :6379  # Redis

# Or stop services and restart
./scripts/docker-dev.sh down
./scripts/docker-dev.sh up
```

**Services not connecting:**

- Verify Supabase credentials in `apps/api/.env`
- Check logs: `./scripts/docker-dev.sh logs`
- Ensure DATABASE_URL uses pooler endpoint (port 6543)

**Need to reset:**

```bash
# WARNING: This removes all data
./scripts/docker-dev.sh clean
./scripts/docker-dev.sh up
```

#### IPv6 Verification

To verify IPv6 is working:

```bash
# Check network configuration
docker network inspect sinag-network

# Test IPv6 connectivity from container
docker exec sinag-api ping6 google.com
```

#### Production Build (Optional)

For production deployment:

```bash
# Build production images
docker build -t sinag-web:latest apps/web
docker build -t sinag-api:latest apps/api

# Run with docker-compose (production config)
docker-compose up -d
```

### Monitoring

- Set up application monitoring
- Configure logging aggregation
- Set up health check endpoints
- Monitor database performance

## Built With

### Frontend Technologies

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Reusable component library
- **[TanStack Query](https://tanstack.com/query)** - Server state management
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Client state management
- **[Lucide React](https://lucide.dev/)** - Icon library

### Backend Technologies

- **[FastAPI](https://fastapi.tiangolo.com/)** - Modern Python web framework
- **[SQLAlchemy](https://www.sqlalchemy.org/)** - Python ORM
- **[Alembic](https://alembic.sqlalchemy.org/)** - Database migration tool
- **[Pydantic](https://pydantic.dev/)** - Data validation and settings
- **[Celery](https://docs.celeryq.dev/)** - Distributed task queue
- **[Redis](https://redis.io/)** - Message broker and caching
- **[Passlib](https://passlib.readthedocs.io/)** - Password hashing
- **[python-jose](https://python-jose.readthedocs.io/)** - JWT implementation

### Development Tools

- **[Turborepo](https://turbo.build/repo)** - Monorepo build system
- **[pnpm](https://pnpm.io/)** - Fast, disk space efficient package manager
- **[uv](https://github.com/astral-sh/uv)** - Fast Python package manager
- **[Orval](https://orval.dev/)** - OpenAPI client generator
- **[Pytest](https://pytest.org/)** - Python testing framework
- **[Vitest](https://vitest.dev/)** - Fast unit test framework

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Author/Contact

- **Project**: SINAG Governance Assessment Platform
- **Repository**: [SINAG](https://github.com/generyand/sinag)
- **Issues**: [Issues](https://github.com/generyand/sinag/issues)

For questions, suggestions, or contributions, please:

1. Check existing [Issues](https://github.com/generyand/sinag/issues)
2. Create a new issue with detailed description
3. Follow the contributing guidelines

## Acknowledgments

- **[Turborepo](https://turbo.build/repo)** for the excellent monorepo tooling
- **[Next.js](https://nextjs.org/)** team for the powerful React framework
- **[FastAPI](https://fastapi.tiangolo.com/)** for the modern Python web framework
- **[shadcn/ui](https://ui.shadcn.com/)** for the beautiful component library
- **[Tailwind CSS](https://tailwindcss.com/)** for the utility-first CSS approach
- **[Orval](https://orval.dev/)** for seamless API client generation
- The open-source community for the amazing tools and libraries that make this project possible
