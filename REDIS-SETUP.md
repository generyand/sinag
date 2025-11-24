# Redis Setup & Usage Guide

Redis is **required** for VANTAGE API to run. It powers Celery background tasks for:
- SGLGB classification
- AI-powered insights (Gemini)
- Gap analysis
- Notifications

## Quick Start (Recommended)

### Just Use `pnpm dev` ✅

```bash
pnpm dev
```

This automatically:
1. Starts Redis in Docker (background)
2. Starts the FastAPI backend (with Redis connection)
3. Starts the Next.js frontend

**That's it!** Redis is handled automatically.

## Available Commands

### Redis Management

| Command | What It Does |
|---------|--------------|
| `pnpm redis:start` | Start Redis in Docker (background) |
| `pnpm redis:stop` | Stop Redis |
| `pnpm redis:restart` | Restart Redis |
| `pnpm redis:status` | Check if Redis is running |
| `pnpm redis:logs` | View Redis logs (live) |
| `pnpm redis:cli` | Access Redis CLI (interactive) |

### Development

| Command | What It Does | Requires Redis? |
|---------|--------------|-----------------|
| `pnpm dev` | Start Redis + API + Web | ✅ Auto-starts |
| `pnpm dev:api` | Start Redis + API only | ✅ Auto-starts |
| `pnpm dev:web` | Start Web only | ❌ No |

### Docker (Full Stack)

| Command | What It Does |
|---------|--------------|
| `pnpm docker:up` | Start all services (Redis, API, Celery, Web) in Docker |
| `pnpm docker:down` | Stop all Docker services |
| `pnpm docker:logs` | View all Docker logs |

## Checking Redis Connection

### 1. Check if Redis is Running

```bash
pnpm redis:status
```

Expected output:
```
NAME                IMAGE              STATUS
vantage-redis      redis:7-alpine     Up X minutes
```

### 2. Test Redis Connection

```bash
pnpm redis:cli
```

Then type:
```
ping
```

Expected response: `PONG`

Type `exit` to quit.

### 3. Check API Connection to Redis

Start your API and look for this in the logs:

```
🔍 Checking Redis connection for Celery...
✅ Redis connection: healthy
```

## Troubleshooting

### Problem: "Redis connection failed"

**Symptoms:**
```
❌ Redis connection failed: Error 111 connecting to localhost:6379. Connection refused.
Background tasks (Celery) will not work!
```

**Solution:**
```bash
# Check if Redis is running
pnpm redis:status

# If not running, start it
pnpm redis:start

# Verify it started
pnpm redis:status
```

### Problem: Port 6379 already in use

**Check what's using the port:**
```bash
lsof -i :6379
```

**Solutions:**
1. Stop the other Redis instance
2. Stop Docker Redis: `pnpm redis:stop`
3. Change the port in `docker-compose.yml` and `.env`

### Problem: Docker not running

**Error:**
```
Cannot connect to the Docker daemon
```

**Solution:**
```bash
# Start Docker
sudo systemctl start docker

# Or Docker Desktop if on Mac/Windows
```

### Problem: API still can't connect after starting Redis

**Check your `.env` file** (`apps/api/.env`):
```bash
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

**Restart your API** after starting Redis:
```bash
# Stop API (Ctrl+C)
# Start Redis
pnpm redis:start
# Start API again
pnpm dev:api
```

## Configuration

### Environment Variables (apps/api/.env)

```bash
# Redis/Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Make Redis/Celery mandatory (recommended)
REQUIRE_CELERY=true

# Enable fail-fast on Redis errors (recommended)
FAIL_FAST=true
```

### When is Redis Optional?

If you set `REQUIRE_CELERY=false` in your `.env`, the API will start even if Redis is down:

```bash
REQUIRE_CELERY=false
```

**⚠️ WARNING**: Background tasks won't work! Only use this temporarily for debugging.

## How Redis is Used

### Docker Setup

Redis runs in a Docker container defined in `docker-compose.yml`:

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: vantage-redis
    ports:
      - "6379:6379"  # Port forwarded to your machine
    volumes:
      - redis-data:/data  # Persistent storage
```

**Port Forwarding**: Docker forwards port 6379 to your `localhost:6379`, so your local API can connect to it as if Redis was installed locally.

### Celery Tasks That Need Redis

1. **Classification Worker** (`apps/api/app/workers/sglgb_classifier.py`)
   - Runs SGLGB classification algorithm
   - Calculates scores and seal eligibility

2. **Intelligence Worker** (`apps/api/app/workers/intelligence_worker.py`)
   - Generates AI-powered insights via Gemini
   - Creates CapDev recommendations
   - Performs gap analysis

3. **Notifications** (`apps/api/app/workers/notifications.py`)
   - Sends email notifications
   - Background notification processing

## Data Persistence

Redis data is stored in a Docker volume:
- Volume name: `redis-data`
- Location: Managed by Docker

**View volumes:**
```bash
docker volume ls | grep redis
```

**Clear Redis data:**
```bash
# Stop Redis
pnpm redis:stop

# Remove Redis and its data
docker-compose down redis -v

# Start fresh
pnpm redis:start
```

## Production Deployment

### Cloud Redis Options

For production, use managed Redis instead of self-hosting:

1. **Redis Cloud** - https://redis.com/cloud/
2. **AWS ElastiCache** - https://aws.amazon.com/elasticache/
3. **Azure Cache for Redis** - https://azure.microsoft.com/services/cache/
4. **Google Cloud Memorystore** - https://cloud.google.com/memorystore

Update your production `.env`:
```bash
CELERY_BROKER_URL=redis://your-production-redis:6379/0
CELERY_RESULT_BACKEND=redis://your-production-redis:6379/0
REQUIRE_CELERY=true
FAIL_FAST=true
```

## Summary

✅ **Simplest workflow (recommended):**
```bash
pnpm dev  # One command for everything
```

✅ **Full Docker workflow:**
```bash
pnpm docker:up    # Everything in containers
```

✅ **Manual Redis control (if needed):**
```bash
pnpm redis:start  # Start Redis manually
pnpm redis:stop   # Stop Redis manually
```

**Need help?** Check Redis status with `pnpm redis:status` or view logs with `pnpm redis:logs`.
