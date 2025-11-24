# Single Command Development

## 🎉 New: One Command to Run Everything!

We've simplified the development workflow to a single command:

```bash
pnpm dev
```

## What Changed?

### Before (Required 2 Terminals)
```bash
# Terminal 1
pnpm dev

# Terminal 2
pnpm celery
```
- ❌ Had to manage 2 terminals
- ❌ Easy to forget Celery
- ❌ Background tasks wouldn't work if you forgot

### After (ONE Terminal) ✨
```bash
pnpm dev
```
- ✅ Everything starts automatically
- ✅ One terminal, color-coded logs
- ✅ Background tasks always work
- ✅ Stop everything with one `Ctrl+C`

## What Runs Automatically?

When you run `pnpm dev`, it automatically starts:

1. **Redis** (Docker, in background)
   - Message broker for Celery
   - Port: 6379

2. **FastAPI Backend** (Local)
   - API server
   - URL: http://localhost:8000
   - Logs: 🔵 Blue

3. **Next.js Frontend** (Local)
   - Web application
   - URL: http://localhost:3000
   - Logs: 🟢 Green

4. **Celery Worker** (Local)
   - Background task processor
   - Handles: Classification, AI, notifications
   - Logs: 🟡 Yellow

## Color-Coded Logs

The terminal shows all logs in one place with color coding:

```
[API]    🔵 INFO:     Application startup complete.
[WEB]    🟢 ready - started server on 0.0.0.0:3000
[CELERY] 🟡 [2025-11-24 12:00:00,000: INFO/MainProcess] celery@hostname ready.
```

This makes it easy to:
- Track which component generated each log
- Debug issues quickly
- Monitor all services at once

## Alternative Commands

### For Frontend-Only Work

If you're only working on UI and don't need the backend:

```bash
pnpm dev:web
```
- Starts: Frontend only
- No Redis, no API, no Celery
- Fastest startup

### Without Celery

If you don't need background tasks running:

```bash
pnpm dev:no-celery
```
- Starts: Redis + API + Web
- No Celery worker
- Slightly faster than full `pnpm dev`

### API Only

For backend development:

```bash
pnpm dev:api
```
- Starts: Redis + API
- No frontend, no Celery

### Celery Separately (Legacy)

If you prefer the old way:

```bash
# Terminal 1
pnpm dev:no-celery

# Terminal 2
pnpm celery
```

## How It Works

We use [`concurrently`](https://github.com/open-cli-tools/concurrently) to run multiple processes in parallel:

```json
{
  "dev": "pnpm redis:start && concurrently -n \"API,WEB,CELERY\" -c \"blue,green,yellow\" \"turbo dev --filter=api\" \"turbo dev --filter=web\" \"pnpm celery:run\""
}
```

**Benefits of `concurrently`:**
- ✅ Runs multiple processes in one terminal
- ✅ Color-codes output by process name
- ✅ Handles process lifecycle (start/stop together)
- ✅ Graceful shutdown with one `Ctrl+C`

## Stopping Everything

Just press `Ctrl+C` once!

`concurrently` will gracefully shut down all processes:
```
^C[CELERY] Received SIGTERM, shutting down gracefully...
[API] Shutting down...
[WEB] Server stopped.
```

## Benefits

### For New Developers
- ✅ **Zero configuration** - Just `pnpm dev` and go
- ✅ **No missing services** - Everything runs automatically
- ✅ **Clear documentation** - One command to remember

### For Experienced Developers
- ✅ **Faster workflow** - No juggling terminals
- ✅ **Consistent setup** - Same for everyone
- ✅ **Easy debugging** - All logs in one place

### For Team Productivity
- ✅ **Fewer support questions** - "Did you start Celery?"
- ✅ **Reliable testing** - Background tasks always available
- ✅ **Faster onboarding** - New devs productive immediately

## When Each Command Makes Sense

| Scenario | Command | Why |
|----------|---------|-----|
| **Full stack development** | `pnpm dev` | Everything you need ⭐ |
| **Testing classification/AI** | `pnpm dev` | Celery included ⭐ |
| **UI/UX work only** | `pnpm dev:web` | Faster, no backend |
| **API endpoint development** | `pnpm dev:api` | Backend + Redis only |
| **Just browsing frontend** | `pnpm dev:web` | No services needed |
| **Need separate Celery logs** | `pnpm dev:no-celery` + `pnpm celery` | Two terminals |

## Troubleshooting

### All Logs Mixed Together?

The logs are color-coded:
- 🔵 **API** (blue)
- 🟢 **WEB** (green)
- 🟡 **CELERY** (yellow)

Focus on the color you need!

### Want to See Only One Service?

Use the specific commands:
```bash
pnpm dev:api     # Only API logs
pnpm dev:web     # Only Web logs
pnpm celery      # Only Celery logs
```

### Process Won't Stop?

If `Ctrl+C` doesn't work:
1. Press `Ctrl+C` again
2. Or force kill: `Ctrl+\` (sends SIGQUIT)
3. Or close the terminal

### One Service Failing?

If one service crashes, the others keep running. Check the color-coded logs to see which one failed and why.

To restart:
1. Stop all: `Ctrl+C`
2. Fix the issue
3. Restart: `pnpm dev`

## Under the Hood

### What `pnpm dev` Does

1. Starts Redis in Docker (`pnpm redis:start`)
2. Runs `concurrently` with 3 processes:
   - `turbo dev --filter=api` (Backend)
   - `turbo dev --filter=web` (Frontend)
   - `pnpm celery:run` (Celery worker)

### Port Usage

| Service | Port | URL |
|---------|------|-----|
| Redis | 6379 | redis://localhost:6379 |
| API | 8000 | http://localhost:8000 |
| Web | 3000 | http://localhost:3000 |

### Environment Variables

All services use the environment variables from:
- `apps/api/.env` (API, Celery)
- `apps/web/.env.local` (Web)

## Performance

### Startup Time

Typical startup times:
- `pnpm dev`: ~5-10 seconds (all services)
- `pnpm dev:no-celery`: ~3-7 seconds (no Celery)
- `pnpm dev:web`: ~1-3 seconds (frontend only)

### Resource Usage

Running all services:
- Redis: ~10-20 MB
- API: ~150-200 MB
- Web: ~200-300 MB
- Celery: ~150-200 MB

**Total**: ~500-720 MB

## Migration Guide

If you have existing workflows using the old two-terminal approach:

### Old Scripts/Documentation
```bash
# Terminal 1
pnpm dev

# Terminal 2
pnpm celery
```

### Update To
```bash
pnpm dev
```

### If You Prefer Old Way
```bash
# Still works!
pnpm dev:no-celery  # Terminal 1
pnpm celery         # Terminal 2
```

## Summary

**Before**: Multiple terminals, manual service management

**Now**: One command, everything automatic! 🚀

```bash
pnpm dev
```

That's it! Happy coding! ✨
