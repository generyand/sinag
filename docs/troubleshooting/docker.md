# Docker Troubleshooting

Comprehensive troubleshooting guide for Docker development in SINAG.

## Quick Fixes

| Issue                        | Quick Fix                                       |
| ---------------------------- | ----------------------------------------------- |
| Network overlaps             | Change subnet in docker-compose.yml             |
| Permission denied            | `sudo` or add user to docker group              |
| Build fails                  | `docker-compose build --no-cache`               |
| Env vars missing             | Check `apps/api/.env` and `apps/web/.env.local` |
| Containers not communicating | Check `depends_on` and healthcheck              |
| Port already in use          | `./scripts/docker-dev.sh kill-ports`            |
| Out of disk space            | `docker system prune -a`                        |

## Common Issues

### Network Issues

#### "Pool overlaps with other one on this address space"

This error occurs when Docker tries to create a network with an IP range already in use.

**Solution 1: Use a different subnet**

The network configuration uses `172.25.0.0/16`. If conflicts persist, modify `docker-compose.yml`:

```yaml
networks:
  sinag-network:
    driver: bridge
    enable_ipv6: false
    ipam:
      driver: default
      config:
        - subnet: 172.26.0.0/16 # Change this
          gateway: 172.26.0.1
```

**Solution 2: Remove conflicting networks**

```bash
# List existing networks
docker network ls

# Inspect the conflicting network
docker network inspect <network-name>

# Remove it (WARNING: affects other containers using it)
docker network rm <network-name>
```

#### Permission Denied (Docker Daemon Socket)

```bash
# Option 1: Use sudo
sudo docker-compose up

# Option 2: Add user to docker group (permanent)
sudo usermod -aG docker $USER
newgrp docker  # or logout/login
```

### Build Issues

#### "uv.lock: not found"

**Cause**: Incorrect Docker build context.

**Solution**: Build context is correctly configured as:

- API: `apps/api`
- Web: root directory (`.`)

If errors persist, verify Dockerfile `COPY` commands reference correct paths.

#### "ModuleNotFoundError" in Containers

**Cause**: Volumes not mounted correctly.

**Solution**: Verify volume mounts in `docker-compose.yml`:

```yaml
volumes:
  - ./apps/api:/app # API code
  - ./packages/shared:/packages/shared # Shared types
```

#### ASGI Import Error

If you see `ERROR: Error loading ASGI app. Could not import module "app.main"`:

**Cause**: `main.py` is at `apps/api/main.py`, not `apps/api/app/main.py`.

**Solution**: Use `main:app` not `app.main:app` in uvicorn commands:

```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### Environment Variable Issues

#### "DATABASE_URL variable is not set"

**Solution**:

1. Ensure `apps/api/.env` exists with Supabase credentials
2. Verify variables are not commented out
3. Restart containers after changing `.env`:
   ```bash
   ./scripts/docker-dev.sh restart
   ```

#### Environment Variables Not Loading

**Check**:

1. `env_file` directive points to correct file in `docker-compose.yml`
2. File exists and is readable
3. No trailing spaces or invalid syntax

### Container Startup Issues

#### API Container Failing Health Check

**Diagnosis**:

```bash
# Check API logs
docker logs sinag-api

# Common causes:
# - Database connection failed (check DATABASE_URL)
# - Redis connection failed (should auto-connect to redis service)
# - Missing dependencies (rebuild: docker-compose build --no-cache)
```

**Solution**:

1. Verify `apps/api/.env` has correct Supabase credentials
2. Test database connection manually:
   ```bash
   docker exec sinag-api python -c "from app.db.session import SessionLocal; db = SessionLocal(); print('Connected!')"
   ```

#### Celery Worker Not Starting

**Diagnosis**:

```bash
# Check if Redis is healthy
docker ps | grep redis

# Check Celery logs
docker logs sinag-celery-worker

# Verify Celery configuration
docker exec sinag-api python -c "from app.core.celery_app import celery_app; print(celery_app.conf.broker_url)"
```

**Solution**:

- Ensure Redis container is running
- Verify `CELERY_BROKER_URL` in `.env` points to `redis://redis:6379/0`

### Frontend-Backend Connection Issues

#### Frontend Can't Reach Backend

**Symptoms**: Network errors, ERR_FAILED, connection reset

**Root Cause**: Next.js has different runtime environments:

- **Server-side (SSR)**: Inside Docker, needs `http://api:8000`
- **Client-side (Browser)**: On host machine, needs `http://localhost:8000`

**Solution**: Already implemented in `apps/web/src/lib/api.ts`:

```typescript
const getBaseURL = () => {
  const isServer = typeof window === "undefined";

  if (isServer) {
    // Docker internal network
    return process.env.API_BASE_URL || "http://api:8000";
  }

  // Browser on host machine
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
};
```

**Environment Setup**:

`docker-compose.yml`:

```yaml
web:
  environment:
    - API_BASE_URL=http://api:8000 # Server-side
```

`apps/web/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000  # Client-side
```

#### Connection Reset Error

If API immediately resets connections:

**Cause**: API container crashing during startup (e.g., Supabase connection failures)

**Solution**: The API is configured with resilient startup checks. If you see warnings like "Startup
checks failed but continuing", provide valid Supabase credentials in `apps/api/.env`.

### Port Conflicts

#### "Address already in use" Error

**Symptoms**: `bind: address already in use` when starting containers

**Common Causes**:

- Local dev server (uvicorn, next dev) already running on same ports
- Another Docker container using the port
- Zombie processes from previous runs

**Solutions**:

**Option 1: Use helper script**

```bash
# Check what's using Docker ports
./scripts/docker-dev.sh check-ports

# Kill processes on Docker ports (interactive)
./scripts/docker-dev.sh kill-ports
```

**Option 2: Manual process kill**

```bash
# Find what's using port 8000
lsof -i :8000
# or
netstat -tlnp | grep 8000

# Kill the process
kill <PID>
# or forcefully
kill -9 <PID>

# Kill specific development servers
pkill -f "next dev"
pkill -f "uvicorn"
```

**Option 3: Change port mapping**

```yaml
# In docker-compose.yml
ports:
  - "8001:8000" # Use 8001 on host instead
```

### Performance Issues

#### Slow File Watching in Docker

Already configured with polling for compatibility. If still slow:

```yaml
# In docker-compose.yml web service
environment:
  - CHOKIDAR_USEPOLLING=true # For Linux
  - WATCHPACK_POLLING=true # For Next.js
```

#### High Docker Resource Usage

**Solutions**:

1. Limit Docker Desktop resources in settings
2. Use BuildKit for faster builds:
   ```bash
   export DOCKER_BUILDKIT=1
   docker-compose build
   ```

## Debugging Commands

### Container Status

```bash
# All containers
docker ps -a
docker-compose ps

# Specific service health
docker inspect --format='{{.State.Health.Status}}' sinag-api
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f celery-worker

# Last N lines
docker-compose logs --tail=100 api
```

### Execute Commands in Containers

```bash
# Shell into API container
docker exec -it sinag-api bash

# Shell into web container
docker exec -it sinag-web sh

# Run Python command in API
docker exec sinag-api python -c "from app.core.config import settings; print(settings.SUPABASE_URL)"

# Run Node command in web
docker exec sinag-web node --version
```

### Network Debugging

```bash
# Test connectivity between containers
docker exec sinag-api ping redis
docker exec sinag-web ping api

# Check DNS resolution
docker exec sinag-api nslookup redis

# List Docker networks
docker network ls
docker network inspect sinag-network

# Check what ports are exposed
docker port sinag-api
```

### Cleanup Commands

```bash
# Stop and remove containers, networks
docker-compose down

# Remove volumes too (WARNING: deletes data)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Complete cleanup (WARNING: affects ALL Docker resources)
docker system prune -a --volumes
```

## Development Workflow

### Starting Services

```bash
# Start all services
./scripts/docker-dev.sh up

# Start in background
./scripts/docker-dev.sh up -d

# Rebuild and start
./scripts/docker-dev.sh up --build
```

### Stopping Services

```bash
# Stop gracefully
./scripts/docker-dev.sh down

# Stop and remove volumes
./scripts/docker-dev.sh down -v
```

### Rebuilding

```bash
# Rebuild all services
./scripts/docker-dev.sh build

# Rebuild specific service
docker-compose build api

# Rebuild without cache (clean build)
docker-compose build --no-cache
```

### Restarting Services

```bash
# Restart all
./scripts/docker-dev.sh restart

# Restart specific service
docker-compose restart api
```

## Verification Checklist

After fixing issues, verify everything works:

- [ ] Containers are running: `docker ps`
- [ ] API health check: `curl http://localhost:8000/health`
- [ ] API docs accessible: `http://localhost:8000/docs`
- [ ] Frontend loads: `http://localhost:3000`
- [ ] Frontend can reach API: Check browser console Network tab
- [ ] Celery worker connected: `docker logs sinag-celery-worker | grep "Connected"`
- [ ] Redis responding: `docker exec sinag-api redis-cli -h redis ping`

## Getting Help

If issues persist:

1. Check logs: `./scripts/docker-dev.sh logs`
2. Verify environment files exist and are configured correctly
3. Try clean rebuild:
   `docker-compose down -v && docker-compose build --no-cache && docker-compose up`
4. Check Docker Desktop/system resources (CPU, memory, disk)
5. Review `docker-compose.yml` and `.env` files
6. Check [Common Errors](./common-errors.md)

## See Also

- [Backend Troubleshooting](./backend.md) - Python/FastAPI specific issues
- [Frontend Troubleshooting](./frontend.md) - Next.js specific issues
- [Getting Started with Docker](../getting-started/docker-setup.md) - Initial setup guide
