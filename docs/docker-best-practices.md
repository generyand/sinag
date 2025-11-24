# Docker Best Practices - VANTAGE

This document explains the Docker best practices implemented in the VANTAGE project, specifically for Redis and Celery configuration.

## Overview

The VANTAGE Docker setup follows industry best practices for:
- **Security**: Non-root users, resource limits, logging
- **Reliability**: Health checks, restart policies, graceful shutdown
- **Performance**: Resource limits, optimized configurations
- **Maintainability**: Clear structure, comprehensive logging

## Redis Best Practices

### 1. Custom Configuration File

**Location**: `docker/redis/redis.conf`

**Why**: Default Redis configuration isn't optimized for production use.

**What we configured**:
- **Persistence**: AOF (Append-Only File) + RDB snapshots
- **Memory Management**: 256MB limit with LRU eviction
- **Performance**: Multi-threaded I/O (2 threads)
- **Monitoring**: Slow query log, latency monitoring

```yaml
volumes:
  - ./docker/redis/redis.conf:/usr/local/etc/redis/redis.conf:ro
command: redis-server /usr/local/etc/redis/redis.conf
```

### 2. Data Persistence

**AOF (Append-Only File)**:
```conf
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
```

- Writes every operation to a log file
- Syncs to disk every second
- Better durability than RDB alone

**RDB Snapshots**:
```conf
save 900 1       # 15 min if >= 1 key changed
save 300 10      # 5 min if >= 10 keys changed
save 60 10000    # 1 min if >= 10000 keys changed
```

- Periodic snapshots for faster restarts
- Combined with AOF for maximum durability

### 3. Memory Management

```conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

**Why**: Prevents Redis from consuming unlimited memory.

**allkeys-lru**: Removes least recently used keys when memory limit is reached.

### 4. Security

```yaml
# Run as non-root user
user: "999:999"
```

**Why**: Principle of least privilege - Redis doesn't need root access.

### 5. Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '0.50'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M
```

**Why**:
- Prevents Redis from starving other services
- Guarantees minimum resources
- Helps with capacity planning

### 6. Health Checks

```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 5s
```

**Why**: Ensures Redis is responsive before dependent services start.

### 7. Logging

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

**Why**: Prevents logs from consuming unlimited disk space.

## Celery Worker Best Practices

### 1. Optimized Worker Configuration

```yaml
command: >
  celery -A app.core.celery_app worker
  --loglevel=info
  --queues=notifications,classification
  --concurrency=4
  --max-tasks-per-child=1000
  --task-events
  --without-gossip
  --without-mingle
  --without-heartbeat
```

**Explanation**:

- `--concurrency=4`: Run 4 worker processes (adjust based on CPU cores)
- `--max-tasks-per-child=1000`: Restart worker after 1000 tasks (prevents memory leaks)
- `--task-events`: Enable task event monitoring
- `--without-gossip`: Disable gossip protocol (not needed for small deployments)
- `--without-mingle`: Disable mingle at startup (faster startup)
- `--without-heartbeat`: Disable heartbeat (use health checks instead)

### 2. Task Time Limits

```yaml
environment:
  - CELERY_TASK_TIME_LIMIT=1800        # 30 minutes hard limit
  - CELERY_TASK_SOFT_TIME_LIMIT=1500   # 25 minutes soft limit
```

**Why**:
- **Hard limit**: Forcefully kills tasks after 30 minutes
- **Soft limit**: Raises exception after 25 minutes (allows graceful cleanup)
- Prevents hung tasks from blocking workers

### 3. Prefetch Multiplier

```yaml
environment:
  - CELERY_WORKER_PREFETCH_MULTIPLIER=4
```

**Why**: Controls how many tasks each worker process prefetches.
- Higher values (4): Better throughput for quick tasks
- Lower values (1): Better load distribution for long tasks

### 4. Health Checks

```yaml
healthcheck:
  test: ["CMD-SHELL", "celery -A app.core.celery_app inspect ping -d celery@$$HOSTNAME"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s
```

**Why**: Verifies Celery worker is responsive and processing tasks.

### 5. Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
    reservations:
      cpus: '0.5'
      memory: 512M
```

**Why**:
- Classification tasks can be CPU/memory intensive
- 2GB limit prevents OOM (Out of Memory) crashes
- Reserves minimum resources for stability

### 6. Restart Policy

```yaml
restart: unless-stopped
```

**Why**: Automatically restarts if worker crashes, but respects manual stops.

### 7. Dependencies

```yaml
depends_on:
  api:
    condition: service_healthy
  redis:
    condition: service_healthy
```

**Why**: Ensures Redis and API are ready before starting worker.

## General Best Practices

### 1. Restart Policies

All services use `restart: unless-stopped`:

```yaml
restart: unless-stopped
```

**Behavior**:
- Automatically restarts if crashes
- Does NOT restart if manually stopped with `docker stop`
- Persists across system reboots

### 2. Logging Configuration

All services use JSON file logging with rotation:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "5"
```

**Why**:
- Structured logging (JSON)
- Automatic log rotation
- Max 50MB per service (10MB × 5 files)

### 3. Health Checks

All critical services have health checks:

```yaml
healthcheck:
  test: [...]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

**Parameters**:
- `test`: Command to run
- `interval`: Check every 30 seconds
- `timeout`: Fail if check takes >10 seconds
- `retries`: 3 failures before marking unhealthy
- `start_period`: Grace period for slow-starting services

### 4. Resource Limits

All services have CPU and memory limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

**Benefits**:
- Prevents resource starvation
- Predictable performance
- Easier capacity planning

### 5. Network Configuration

Custom bridge network with static IPs:

```yaml
networks:
  vantage-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16
          gateway: 172.25.0.1
```

**Why**:
- Services can reference each other by name (e.g., `redis://redis:6379`)
- Static IPs for debugging
- Network isolation

## Celery Beat (Optional)

For scheduled periodic tasks:

```yaml
# Uncomment in docker-compose.yml
celery-beat:
  command: celery -A app.core.celery_app beat --loglevel=info
  volumes:
    - celery-beat-schedule:/app/celerybeat-schedule
```

**When to use**: If you need tasks to run on a schedule (e.g., daily reports, cleanup jobs).

**Resource limits**: Beat is lightweight - 256MB is sufficient.

## Production Recommendations

### Redis

1. **Enable Authentication**:
   ```conf
   requirepass your-strong-password-here
   ```
   Update connection strings: `redis://:password@redis:6379/0`

2. **Increase Memory** (if needed):
   ```conf
   maxmemory 1gb
   ```

3. **Enable TLS** (for sensitive data):
   Use Redis Sentinel or Redis Cluster with TLS

4. **Monitor Performance**:
   ```bash
   docker exec vantage-redis redis-cli INFO stats
   docker exec vantage-redis redis-cli SLOWLOG GET 10
   ```

### Celery

1. **Scale Workers Horizontally**:
   ```bash
   docker-compose up -d --scale celery-worker=3
   ```

2. **Separate Queues**:
   ```bash
   # Heavy tasks
   --queues=classification --concurrency=2

   # Light tasks
   --queues=notifications --concurrency=8
   ```

3. **Use Flower for Monitoring**:
   ```yaml
   flower:
     image: mher/flower
     command: celery -A app.core.celery_app flower
     ports:
       - "5555:5555"
   ```

4. **Configure Dead Letter Queue**:
   Handle failed tasks properly in your Celery configuration.

## Monitoring Commands

### Check Service Health

```bash
# All services
docker-compose ps

# Specific service health
docker inspect vantage-redis --format='{{.State.Health.Status}}'
docker inspect vantage-celery-worker --format='{{.State.Health.Status}}'
```

### View Logs

```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f redis
docker-compose logs -f celery-worker

# Last 100 lines
docker-compose logs --tail=100 celery-worker
```

### Resource Usage

```bash
# All containers
docker stats

# Specific container
docker stats vantage-redis vantage-celery-worker
```

### Redis Monitoring

```bash
# Connect to Redis CLI
docker exec -it vantage-redis redis-cli

# Redis commands
INFO                  # Full info
INFO memory           # Memory usage
INFO stats            # Statistics
DBSIZE                # Number of keys
SLOWLOG GET 10        # Slow queries
CLIENT LIST           # Connected clients
```

### Celery Monitoring

```bash
# Worker status
docker exec vantage-celery-worker celery -A app.core.celery_app inspect active
docker exec vantage-celery-worker celery -A app.core.celery_app inspect stats

# Task info
docker exec vantage-celery-worker celery -A app.core.celery_app inspect registered
docker exec vantage-celery-worker celery -A app.core.celery_app inspect scheduled
```

## Troubleshooting

### Redis Issues

**High Memory Usage**:
```bash
# Check memory
docker exec vantage-redis redis-cli INFO memory

# Clear old keys (if safe)
docker exec vantage-redis redis-cli FLUSHDB
```

**Slow Queries**:
```bash
# Check slow log
docker exec vantage-redis redis-cli SLOWLOG GET 10

# Reset slow log
docker exec vantage-redis redis-cli SLOWLOG RESET
```

### Celery Issues

**Worker Not Processing Tasks**:
```bash
# Check worker is responsive
docker exec vantage-celery-worker celery -A app.core.celery_app inspect ping

# Check active tasks
docker exec vantage-celery-worker celery -A app.core.celery_app inspect active

# Restart worker
docker-compose restart celery-worker
```

**Memory Leaks**:
- Check `--max-tasks-per-child` is set (we use 1000)
- Monitor with `docker stats vantage-celery-worker`
- Decrease `--max-tasks-per-child` if needed

**Task Timeouts**:
- Check task time limits are appropriate
- Increase `CELERY_TASK_TIME_LIMIT` if needed
- Monitor slow tasks in logs

## Summary

Our Docker configuration follows these best practices:

✅ **Security**: Non-root users, authentication ready, resource limits
✅ **Reliability**: Health checks, restart policies, dependency management
✅ **Performance**: Optimized configs, resource limits, monitoring
✅ **Maintainability**: Structured logging, clear documentation, easy debugging
✅ **Scalability**: Horizontal scaling ready, separate queues supported

**Start Services**:
```bash
docker-compose up -d
```

**Stop Services**:
```bash
docker-compose down
```

**View Status**:
```bash
docker-compose ps
docker stats
```

For more information, see:
- `docker-compose.yml` - Main configuration
- `docker/redis/redis.conf` - Redis configuration
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Redis Documentation](https://redis.io/documentation)
- [Celery Documentation](https://docs.celeryproject.org/)
