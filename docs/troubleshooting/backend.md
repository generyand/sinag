# Backend Troubleshooting

Backend-specific troubleshooting for FastAPI, Python, and API issues.

## Common Backend Issues

### Port 8000 Already in Use

**Symptoms**:

- `ERROR: [Errno 98] Address already in use` when starting backend
- `Connection reset by peer` when frontend tries to connect

**Root Cause**: Port 8000 is occupied by a zombie process (previous Docker container or test run
that didn't shut down properly).

**Diagnosis**:

```bash
# Check what's listening on port 8000
ss -tlnp | grep 8000

# Check for uvicorn processes
ps aux | grep uvicorn

# Check for Python processes on port 8000
ps aux | grep "python.*8000"
```

**Solutions**:

**Option 1: Kill the zombie process**

```bash
# Find and kill the process
PID=$(pgrep -f "uvicorn.*8000" | head -1)
kill $PID

# If that doesn't work, force kill
sudo kill -9 $PID

# Or kill all uvicorn processes
pkill -f uvicorn
```

**Option 2: Quick kill command**

```bash
# Kill any process on port 8000 (requires password)
sudo fuser -k 8000/tcp
```

**Option 3: Use a different port temporarily**

Edit `apps/api/main.py`:

```python
uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
```

Update `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
```

**Prevention**:

- Always stop servers gracefully with `Ctrl+C`
- Always run `docker compose down` to stop containers
- Check for running processes before starting: `lsof -i :8000`

### Database Connection Errors

> **TODO**: Document database connection troubleshooting

### Migration Conflicts

> **TODO**: Document Alembic migration conflict resolution

### Celery Worker Not Processing Tasks

> **TODO**: Document Celery troubleshooting

### Import Errors

> **TODO**: Document Python import resolution

### Pydantic Validation Errors

> **TODO**: Document schema validation troubleshooting

## Debugging Backend

```bash
# Run with debug logging
cd apps/api
DEBUG=true uvicorn app.main:app --reload --log-level=debug

# Check database connection
python -c "from app.db.session import SessionLocal; db = SessionLocal(); print('Connected!')"

# Test Celery connection
celery -A app.core.celery_app inspect ping
```

## Environment Variables

> **TODO**: Document required environment variables and validation
