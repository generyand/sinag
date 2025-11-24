# VANTAGE Quick Start

## 🚀 Start Development

### One Command - Everything Runs!
```bash
pnpm dev
```

This **single command** automatically starts:
- ✅ Redis in Docker (background)
- ✅ FastAPI backend (http://localhost:8000)
- ✅ Next.js frontend (http://localhost:3000)
- ✅ Celery worker (background tasks)

All processes run in **one terminal** with color-coded logs:
- 🔵 **API** - Backend logs
- 🟢 **WEB** - Frontend logs
- 🟡 **CELERY** - Background tasks (classification, AI, notifications)

**That's it!** Press `Ctrl+C` to stop everything.

## 📋 Common Commands

### Development

| Command | What It Does |
|---------|--------------|
| `pnpm dev` | **Start everything** (Redis + API + Web + Celery) ⭐ |
| `pnpm dev:no-celery` | Start without Celery (faster, for UI-only work) |
| `pnpm dev:api` | Start backend only (auto-starts Redis) |
| `pnpm dev:web` | Start frontend only |
| `pnpm celery` | Start Celery worker separately (legacy) |

### Redis (Required for Backend)

| Command | What It Does |
|---------|--------------|
| `pnpm redis:start` | Start Redis |
| `pnpm redis:stop` | Stop Redis |
| `pnpm redis:status` | Check if Redis is running |
| `pnpm redis:logs` | View Redis logs |

### Type Generation

| Command | What It Does |
|---------|--------------|
| `pnpm generate-types` | Generate TypeScript types from API |
| `pnpm watch-types` | Auto-generate types on API changes |

### Full Docker Stack

| Command | What It Does |
|---------|--------------|
| `pnpm docker:up` | Start all services in Docker |
| `pnpm docker:down` | Stop all Docker services |
| `pnpm docker:logs` | View all Docker logs |

## 🔧 Initial Setup

### 1. Clone & Install

```bash
git clone <repository>
cd vantage
pnpm install
```

### 2. Configure Environment Variables

```bash
# Backend
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your Supabase credentials

# Frontend
cp apps/web/.env.example apps/web/.env.local
```

### 3. Start Development

```bash
pnpm dev
```

## 📝 Configuration Files

- `apps/api/.env` - Backend configuration (Supabase, Redis, API keys)
- `apps/web/.env.local` - Frontend configuration
- `docker-compose.yml` - Docker services configuration

## 🆘 Troubleshooting

### Problem: "Redis connection failed"

```bash
# Check if Redis is running
pnpm redis:status

# If not running
pnpm redis:start
```

### Problem: "Type errors in frontend"

```bash
# Regenerate types from backend
pnpm generate-types
```

### Problem: "Database connection failed"

1. Check your `apps/api/.env` has correct DATABASE_URL
2. Verify Supabase credentials
3. Ensure you're using the **pooler** connection (port 6543)

## 📚 Documentation

- **Full Guide**: See `CLAUDE.md`
- **Redis Setup**: See `REDIS-SETUP.md`
- **Fail-Fast Checks**: See `docs/guides/fail-fast-startup-checks.md`

## 🏃 Common Workflows

### Starting Work

```bash
# One command for everything!
pnpm dev

# Servers running:
# - Backend: http://localhost:8000
# - Frontend: http://localhost:3000
# - API Docs: http://localhost:8000/docs
# - Celery: Processing background tasks

# Stop everything: Ctrl+C
```

### After Changing API Models/Endpoints

```bash
# 1. Generate types
pnpm generate-types

# 2. Restart frontend
# Press Ctrl+C on frontend terminal
# It will auto-restart if using pnpm dev
```

### Running Tests

```bash
# All tests
pnpm test

# Backend tests only
cd apps/api
pytest
```

### Database Migrations

```bash
cd apps/api

# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

## ✅ Verification

After starting with `pnpm dev`, verify everything is running:

1. **Redis**: `pnpm redis:status` should show "Up"
2. **Backend**: Visit http://localhost:8000/health
3. **Frontend**: Visit http://localhost:3000
4. **API Docs**: Visit http://localhost:8000/docs

All should be accessible!

## 🎯 What You Need

### Required

- ✅ Node.js 18+ and pnpm
- ✅ Python 3.13+
- ✅ Docker (for Redis)
- ✅ Supabase account & database

### Optional

- Docker Desktop (for full Docker stack)
- Redis CLI tools (for debugging)

---

**Need more help?** Check `CLAUDE.md` for comprehensive documentation.
