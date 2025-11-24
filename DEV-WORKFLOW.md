# Complete Development Workflow

## 🚀 Quick Start (One Command!)

```bash
pnpm dev
```

This **single command** automatically starts:
- ✅ Redis in Docker (background)
- ✅ FastAPI backend (http://localhost:8000)
- ✅ Next.js frontend (http://localhost:3000)
- ✅ Celery worker (background tasks)

All processes run in **one terminal** with color-coded output:
- 🔵 **API** - Backend logs
- 🟢 **WEB** - Frontend logs
- 🟡 **CELERY** - Background task logs

**Stop everything**: Press `Ctrl+C` once

## 📝 What Runs Where

| Component | Where | Auto-Start? | Terminal |
|-----------|-------|-------------|----------|
| **Redis** | Docker | ✅ Yes | Background |
| **PostgreSQL** | Supabase Cloud | N/A | N/A |
| **FastAPI Backend** | Local | ✅ Yes | Terminal 1 |
| **Next.js Frontend** | Local | ✅ Yes | Terminal 1 |
| **Celery Worker** | Local | ✅ Yes | Terminal 1 |

**All in one terminal!** `pnpm dev` runs everything with `concurrently`.

## 🎯 When Do You Need Each Component?

### Frontend Development Only
```bash
# Terminal 1
pnpm dev:web
```
**Needs**: None! Frontend can run standalone.

### Backend API Development
```bash
# Terminal 1
pnpm dev:api
```
**Needs**: Redis (auto-started), PostgreSQL (Supabase)

### Full Stack Development
```bash
pnpm dev
```
**Needs**: Everything! (All started automatically)

### Testing Background Tasks (Classification, AI)
```bash
pnpm dev
```
**Needs**: Celery worker (auto-started with `pnpm dev`)

## 🔍 How to Tell If Everything Is Running

### Check Services Status

```bash
# Redis
pnpm redis:status
# Should show: "Up X seconds"

# Backend
curl http://localhost:8000/health
# Should return: {"overall_status": "healthy", ...}

# Frontend
# Visit: http://localhost:3000
# Should load the login page

# Celery
# Check Terminal 2 for: "celery@hostname ready."
```

## 🛠️ Common Development Scenarios

### Scenario 1: Working on UI Components
```bash
pnpm dev:web
```
**Why**: Frontend only, no backend needed.

### Scenario 2: Building New API Endpoints
```bash
# Terminal 1
pnpm dev:api

# After changes
pnpm generate-types  # Generate TypeScript types
```
**Why**: Need backend + Redis, no frontend or Celery.

### Scenario 3: Testing SGLGB Classification
```bash
# Terminal 1
pnpm dev

# Terminal 2
pnpm celery  # MUST run for classification to work
```
**Why**: Classification is a Celery background task.

### Scenario 4: Full Feature Development
```bash
# Terminal 1: Main servers
pnpm dev

# Terminal 2: Background tasks
pnpm celery

# Optional Terminal 3: Type generation watch
pnpm watch-types
```
**Why**: Full stack + background tasks + auto type-gen.

## 📊 Service Dependencies

```
Frontend (Next.js)
  ↓ depends on
Backend (FastAPI)
  ↓ depends on
┌─────────────────┐
│ Redis (Docker)  │ ← Auto-started
└─────────────────┘
  ↓ required by
Celery Worker
```

## 🔧 Configuration Files

| File | What It Configures |
|------|-------------------|
| `apps/api/.env` | Backend, Redis, Supabase, Gemini API |
| `apps/web/.env.local` | Frontend API URLs |
| `docker-compose.yml` | Docker services (Redis, Celery) |
| `turbo.json` | Turborepo build orchestration |

## 🎬 Typical Development Session

### Morning Startup

```bash
# ONE command for everything!
cd vantage
pnpm dev

# ✅ Redis starts automatically
# ✅ Backend starts (http://localhost:8000)
# ✅ Frontend starts (http://localhost:3000)
# ✅ Celery worker starts

# Color-coded logs show:
# 🔵 API logs
# 🟢 WEB logs
# 🟡 CELERY logs
```

### During Development

```bash
# If you change API models/endpoints
pnpm generate-types

# View logs
# All logs are in one terminal, color-coded:
# 🔵 API logs
# 🟢 WEB logs
# 🟡 CELERY logs

# Check Redis
pnpm redis:status

# Access Redis CLI
pnpm redis:cli
```

### End of Day

```bash
# Stop everything: Ctrl+C (once!)
# Stops API, Web, and Celery simultaneously

# Optional: Stop Redis (it can keep running)
pnpm redis:stop
```

## 🐛 Debugging Checklist

### Backend Won't Start
- [ ] Check `apps/api/.env` exists and has correct values
- [ ] Verify Supabase DATABASE_URL is correct
- [ ] Check Redis is running: `pnpm redis:status`
- [ ] Look for errors in terminal output

### Frontend Can't Connect to Backend
- [ ] Backend is running: `curl http://localhost:8000/health`
- [ ] Check `apps/web/.env.local` has correct API URL
- [ ] Regenerate types: `pnpm generate-types`
- [ ] Clear Next.js cache: `rm -rf apps/web/.next`

### Celery Tasks Not Processing
- [ ] Celery worker is running in Terminal 2
- [ ] Redis is running: `pnpm redis:status`
- [ ] Check Celery logs for errors
- [ ] Verify task was dispatched in API logs

### Type Errors in Frontend
- [ ] Backend is running
- [ ] Run: `pnpm generate-types`
- [ ] Restart frontend: Ctrl+C and `pnpm dev:web`

## 📚 Additional Resources

- **Full Commands**: See `CLAUDE.md`
- **Redis Setup**: See `REDIS-SETUP.md`
- **Celery Setup**: See `CELERY-SETUP.md`
- **Quick Reference**: See `QUICK-START.md`
- **Fail-Fast Checks**: See `docs/guides/fail-fast-startup-checks.md`

## 🎓 Pro Tips

1. **Keep Redis Running**: Redis is lightweight and can stay running between sessions
   ```bash
   # Redis runs in background, doesn't need to be stopped
   ```

2. **Use Type Watch Mode**: Auto-generate types on API changes
   ```bash
   # Terminal 3 (optional)
   pnpm watch-types
   ```

3. **Docker Full Stack**: For production-like testing
   ```bash
   pnpm docker:up
   # Everything runs in Docker
   ```

4. **Celery Optional**: Skip Celery unless testing background tasks
   ```bash
   # Most UI work doesn't need Celery running
   ```

5. **Health Check First**: Before debugging, check health
   ```bash
   curl http://localhost:8000/health
   pnpm redis:status
   ```

## 🚦 Status Indicators

### ✅ Everything Working
```bash
$ curl http://localhost:8000/health
{"overall_status": "healthy", ...}

$ pnpm redis:status
vantage-redis   Up X seconds

# Terminal 2 shows:
[2025-11-24 12:00:00,000: INFO/MainProcess] celery@hostname ready.
```

### ⚠️ Something Wrong
- API returns 500 errors → Check backend logs
- Frontend shows connection errors → Check API is running
- Tasks stay PENDING → Check Celery is running
- "Redis connection failed" → Run `pnpm redis:start`

---

**Summary**: Run `pnpm dev` and everything starts automatically in ONE terminal! 🚀
