# Installation Guide

> **TODO**: Document detailed installation steps including:
>
> - System prerequisites
> - Installing Node.js, pnpm, Python, uv
> - Setting up Supabase project
> - Configuring environment variables
> - Database initialization and migrations
> - Redis setup for Celery
> - Verifying installation

## Environment Variables

### Backend (`apps/api/.env`)

```env
# TODO: Document all required environment variables
DEBUG=true
ENVIRONMENT=development
SECRET_KEY=<your-secret-key>
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-anon-key>
DATABASE_URL=<your-database-url>
# ... (see CLAUDE.md for complete list)
```

### Frontend (`apps/web/.env.local`)

```env
# TODO: Document all required environment variables
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_V1_URL=http://localhost:8000/api/v1
```

## Initial Database Setup

```bash
# TODO: Document database initialization steps
cd apps/api
alembic upgrade head
```

## Verification

```bash
# TODO: Document verification steps
# - Check backend health endpoint
# - Check frontend loads
# - Verify database connection
# - Test type generation
```
