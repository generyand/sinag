# Celery Worker Setup & Usage Guide

Celery is the background task processor for VANTAGE. It handles computationally intensive or time-consuming operations asynchronously.

## What Celery Does

Celery powers these critical background tasks:

1. **SGLGB Classification** (`apps/api/app/workers/sglgb_classifier.py`)
   - Runs the "3+1" scoring algorithm
   - Calculates seal eligibility
   - Processes assessment submissions

2. **AI Intelligence** (`apps/api/app/workers/intelligence_worker.py`)
   - Generates CapDev recommendations via Gemini
   - Performs gap analysis between assessments
   - Creates AI-powered insights

3. **Notifications** (`apps/api/app/workers/notifications.py`)
   - Sends email notifications
   - Processes background notification queues

## Quick Start

### Starting Celery Worker

```bash
# In a separate terminal
pnpm celery
```

That's it! The worker will connect to Redis and start processing tasks.

### When Do You Need Celery?

**You NEED Celery running when:**
- ✅ Testing SGLGB classification
- ✅ Testing AI-powered features (CapDev recommendations)
- ✅ Testing gap analysis
- ✅ Testing notification sending
- ✅ Running full integration tests

**You DON'T need Celery when:**
- ❌ Only working on frontend UI
- ❌ Only working on CRUD endpoints (no background tasks)
- ❌ Only viewing/fetching data

## Development Workflow

### Full Stack Development

```bash
# Terminal 1: Main servers
pnpm dev

# Terminal 2: Celery worker
pnpm celery
```

### Backend Only

```bash
# Terminal 1: API server
pnpm dev:api

# Terminal 2: Celery worker
pnpm celery
```

### Frontend Only (No Celery Needed)

```bash
pnpm dev:web
```

## Available Commands

| Command | What It Does |
|---------|--------------|
| `pnpm celery` | Start Celery worker locally |
| `pnpm celery:logs` | View Celery logs (Docker) |
| `cd apps/api && pnpm dev:celery` | Direct Celery command |

## Celery Configuration

### Environment Variables (apps/api/.env)

```bash
# Redis is used as the Celery broker
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Make Celery mandatory (recommended)
REQUIRE_CELERY=true
```

### Task Queues

Celery uses two queues:

1. **`notifications`** - Email and notification tasks
2. **`classification`** - SGLGB classification and AI tasks

Workers automatically listen to both queues.

## Monitoring Celery

### Check if Worker is Running

When you start `pnpm celery`, you should see:

```
-------------- celery@hostname v5.x.x
---- **** -----
--- * ***  * -- Linux-x.x.x
-- * - **** ---
- ** ---------- [config]
- ** ---------- .> app:         app.core.celery_app:0x...
- ** ---------- .> transport:   redis://localhost:6379/0
- ** ---------- .> results:     redis://localhost:6379/0
- *** --- * --- .> concurrency: 8 (prefork)
-- ******* ---- .> task events: OFF
--- ***** -----

[tasks]
  . app.workers.intelligence_worker.classify_assessment
  . app.workers.intelligence_worker.generate_insights
  . app.workers.notifications.send_email

[queues]
  .> notifications
  .> classification

[2025-11-24 12:00:00,000: INFO/MainProcess] Connected to redis://localhost:6379/0
[2025-11-24 12:00:00,000: INFO/MainProcess] celery@hostname ready.
```

### Verify Tasks Are Registered

The worker should show registered tasks:
- `classify_assessment`
- `generate_insights`
- `send_email`

### Test Task Execution

Trigger a classification from the API and watch Celery logs:

```bash
# In Celery terminal, you'll see:
[2025-11-24 12:00:00,000: INFO/MainProcess] Task app.workers.intelligence_worker.classify_assessment[abc-123] received
[2025-11-24 12:00:00,000: INFO/ForkPoolWorker-1] Task app.workers.intelligence_worker.classify_assessment[abc-123] succeeded in 2.3s
```

## Troubleshooting

### Problem: "No module named 'celery'"

**Solution:**
```bash
cd apps/api
uv sync  # Reinstall dependencies
pnpm celery
```

### Problem: "Cannot connect to redis://localhost:6379"

**Cause**: Redis is not running.

**Solution:**
```bash
# Start Redis
pnpm redis:start

# Verify Redis is running
pnpm redis:status

# Then start Celery
pnpm celery
```

### Problem: Tasks not being processed

**Check:**

1. **Is Celery running?**
   ```bash
   # Should see celery process
   ps aux | grep celery
   ```

2. **Is Redis accessible?**
   ```bash
   pnpm redis:cli
   # Then type: PING
   # Should return: PONG
   ```

3. **Are tasks being sent?**
   Check API logs for task dispatch messages:
   ```
   INFO: Dispatching classification task for assessment_id=123
   ```

4. **Check Celery logs for errors**
   Look in Celery terminal for error messages

### Problem: "Task always says 'PENDING'"

**Causes:**
- Celery worker is not running
- Task name mismatch
- Redis connection issue

**Solution:**
1. Ensure Celery worker is running (`pnpm celery`)
2. Check Redis connection (`pnpm redis:status`)
3. Look for errors in Celery logs

### Problem: Worker crashes or restarts

**Check:**
- Python errors in worker code
- Memory issues (classification is heavy)
- Database connection issues

**Solution:**
- Check Celery logs for Python tracebacks
- Reduce concurrency if memory is limited:
  ```bash
  cd apps/api
  uv run celery -A app.core.celery_app worker --loglevel=info --concurrency=2
  ```

## Production Deployment

### Docker Setup (Recommended)

The project includes a Celery worker in `docker-compose.yml`:

```bash
# Start full stack including Celery
pnpm docker:up

# View Celery logs
pnpm celery:logs
```

### Scaling Celery

For production, run multiple workers:

```bash
# Worker 1: Classification tasks (heavy)
celery -A app.core.celery_app worker --queues=classification --concurrency=4

# Worker 2: Notifications (light)
celery -A app.core.celery_app worker --queues=notifications --concurrency=8
```

### Monitoring in Production

Consider using:
- **Flower** - Web-based Celery monitoring tool
- **Redis monitoring** - Track queue sizes
- **Application logs** - Task success/failure rates

## Task Retry Logic

Tasks are configured with automatic retries:

```python
@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60  # Wait 60s before retry
)
def classify_assessment(self, assessment_id):
    try:
        # Task logic
        pass
    except Exception as exc:
        # Retry on failure
        raise self.retry(exc=exc)
```

## Performance Tips

1. **Concurrency**: Adjust based on your CPU cores
   ```bash
   # Auto-detect cores
   pnpm celery

   # Manual setting
   cd apps/api
   uv run celery -A app.core.celery_app worker --concurrency=4
   ```

2. **Task Timeout**: Set reasonable timeouts
   ```python
   @celery_app.task(time_limit=300)  # 5 minutes max
   def long_running_task():
       pass
   ```

3. **Prefetch Multiplier**: Control task prefetching
   ```bash
   celery -A app.core.celery_app worker --prefetch-multiplier=1
   ```

## Development vs Production

### Development
```bash
# Simple local worker
pnpm celery

# Features:
- ✅ Hot reload on code changes (manual restart)
- ✅ Detailed logging
- ✅ Single worker instance
```

### Production
```bash
# Docker with proper orchestration
pnpm docker:up

# Features:
- ✅ Automatic restarts
- ✅ Health checks
- ✅ Multiple workers
- ✅ Persistent logs
```

## Summary

✅ **For full development:**
```bash
# Terminal 1
pnpm dev

# Terminal 2
pnpm celery
```

✅ **For frontend-only work:**
```bash
pnpm dev:web
# No Celery needed
```

✅ **For production:**
```bash
pnpm docker:up
# Celery runs automatically
```

---

**Need help?**
- Check if Redis is running: `pnpm redis:status`
- View Celery logs for errors
- Test Redis connection: `pnpm redis:cli` → `PING`
