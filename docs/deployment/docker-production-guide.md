# SINAG Docker Production Deployment Guide

This guide covers production-ready Docker deployment for the SINAG platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Security Considerations](#security-considerations)
- [Production Deployment](#production-deployment)
- [Secrets Management](#secrets-management)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)
- [Scaling](#scaling)

---

## Prerequisites

### System Requirements

- **OS**: Ubuntu 22.04 LTS or later (recommended), or any Docker-compatible Linux distribution
- **CPU**: Minimum 4 cores, recommended 8+ cores for production
- **RAM**: Minimum 8GB, recommended 16GB+ for production
- **Disk**: Minimum 50GB SSD
- **Network**: Static IP address and domain name configured

### Software Requirements

- Docker Engine 24.0+ ([Installation Guide](https://docs.docker.com/engine/install/))
- Docker Compose v2.20+ (bundled with Docker Desktop)
- Git
- OpenSSL (for generating secrets)

### External Services

- **PostgreSQL Database**: Supabase-hosted database (configured separately)
- **Domain & SSL**: Domain name with SSL/TLS certificates
- **Reverse Proxy**: Nginx, Caddy, or Traefik (recommended for production)

---

## Architecture Overview

### Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Reverse Proxy (Nginx)                    │
│                    Port 80/443 (External)                    │
└───────────────┬─────────────────────────┬───────────────────┘
                │                         │
    ┌───────────▼──────────┐   ┌─────────▼──────────┐
    │   Web Container(s)   │   │   API Container(s) │
    │   (Next.js)          │   │   (FastAPI)        │
    │   Port 3000          │   │   Port 8000        │
    └───────────┬──────────┘   └──────────┬─────────┘
                │                         │
                └─────────┬───────────────┘
                          │
          ┌───────────────▼────────────────┐
          │    Backend Network (Internal)   │
          └───┬──────────────┬─────────────┘
              │              │
    ┌─────────▼─────┐  ┌────▼──────────────┐
    │ Redis         │  │ Celery Worker(s)  │
    │ (Message      │  │ (Background Tasks)│
    │  Broker)      │  │                   │
    └───────────────┘  └───────────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │  PostgreSQL  │
                  │  (Supabase)  │
                  │  (External)  │
                  └──────────────┘
```

### Network Isolation

The production setup uses two isolated networks:

1. **sinag-backend** (internal): API, Celery, Redis (no external access)
2. **sinag-frontend**: Web and API (for SSR)

---

## Security Considerations

### Implemented Security Features

#### 1. Container Security

- ✅ **Non-root users**: All containers run as unprivileged users (UID 1001)
- ✅ **Multi-stage builds**: Minimal production images with only necessary files
- ✅ **Read-only root filesystem**: Where applicable
- ✅ **No secrets in images**: Secrets managed via Docker secrets
- ✅ **Health checks**: All services have health checks configured
- ✅ **Resource limits**: CPU and memory limits prevent resource exhaustion

#### 2. Network Security

- ✅ **Network isolation**: Backend network has no external access
- ✅ **Minimal port exposure**: Only reverse proxy ports exposed externally
- ✅ **TLS/SSL**: All external traffic encrypted (configured in reverse proxy)

#### 3. Secrets Management

- ✅ **Docker secrets**: Production credentials stored in Docker secrets
- ✅ **No hardcoded credentials**: All sensitive data externalized
- ✅ **Environment separation**: Clear separation between dev and prod configs

#### 4. Dependency Security

- ✅ **Version pinning**: All base images and dependencies use specific versions
- ✅ **Security updates**: Base images regularly updated
- ✅ **Vulnerability scanning**: Trivy scanner integrated

#### 5. Logging and Monitoring

- ✅ **Centralized logging**: JSON-file driver with rotation
- ✅ **Log retention**: 10 files × 100MB for production services
- ✅ **Health monitoring**: Built-in health checks for all services

---

## Production Deployment

### Step 1: Prepare the Server

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (avoid using sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### Step 2: Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/sinag.git
cd sinag

# Checkout production branch (or main/master)
git checkout main
```

### Step 3: Configure Environment

Production uses Docker secrets instead of `.env` files. However, you still need to configure
non-sensitive environment variables.

Create a minimal production environment file:

```bash
# Create production environment file
cat > .env.prod << EOF
# Build metadata
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VERSION=1.0.0

# Public URLs (not sensitive)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Redis password (will be moved to Docker secret)
REDIS_PASSWORD=$(openssl rand -base64 32)
EOF
```

### Step 4: Set Up Docker Secrets

Docker secrets provide secure credential storage for production.

#### Option A: Interactive Setup (Recommended)

```bash
# Run interactive secrets setup
./scripts/docker-secrets-setup.sh --interactive
```

This will prompt you for:

- `sinag_secret_key` - Application secret key for JWT tokens
- `sinag_database_url` - PostgreSQL connection URL from Supabase
- `sinag_supabase_key` - Supabase service role key
- `sinag_gemini_api_key` - Google Gemini API key (for AI features)
- `sinag_redis_password` - Redis password

#### Option B: Load from Environment File

```bash
# If you have an existing .env file with secrets
./scripts/docker-secrets-setup.sh --from-env apps/api/.env
```

#### Option C: Manual Setup

```bash
# Initialize Docker Swarm (required for secrets)
docker swarm init

# Create secrets manually
echo "your-secret-key-here" | docker secret create sinag_secret_key -
echo "postgresql://..." | docker secret create sinag_database_url -
echo "your-supabase-key" | docker secret create sinag_supabase_key -
echo "your-gemini-key" | docker secret create sinag_gemini_api_key -
echo "$(openssl rand -base64 32)" | docker secret create sinag_redis_password -

# Verify secrets were created
docker secret ls --filter name=sinag_
```

### Step 5: Build Production Images

```bash
# Build all production images
./scripts/docker-dev.sh prod:build

# Alternatively, use docker compose directly
docker compose -f docker-compose.prod.yml build --no-cache
```

### Step 6: Deploy Services

#### Option A: Docker Compose (Single Server)

```bash
# Start production services
./scripts/docker-dev.sh prod:up

# Or use docker compose directly
docker compose -f docker-compose.prod.yml up -d

# Check service status
./scripts/docker-dev.sh prod:status

# View logs
./scripts/docker-dev.sh prod:logs
```

#### Option B: Docker Swarm (Multi-Server)

For high availability across multiple servers:

```bash
# Deploy as a stack
docker stack deploy -c docker-compose.prod.yml sinag

# Check stack status
docker stack services sinag

# View stack logs
docker service logs -f sinag_api
```

### Step 7: Run Database Migrations

```bash
# Run migrations in the API container
docker exec -it sinag-api-prod alembic upgrade head

# Verify migration status
docker exec -it sinag-api-prod alembic current
```

### Step 8: Verify Deployment

```bash
# Check service health
./scripts/docker-dev.sh health

# Test API endpoint
curl http://localhost:8000/health

# Test web endpoint
curl http://localhost:3000

# View resource usage
./scripts/docker-dev.sh stats
```

### Step 9: Configure Reverse Proxy

For production, you should use a reverse proxy (Nginx, Caddy, or Traefik) for:

- SSL/TLS termination
- Load balancing
- Security headers
- Rate limiting

#### Example Nginx Configuration

```nginx
# /etc/nginx/sites-available/sinag
upstream sinag_api {
    server localhost:8000;
}

upstream sinag_web {
    server localhost:3000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# API server (FastAPI)
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # API proxy
    location / {
        proxy_pass http://sinag_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Web server (Next.js)
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Web proxy
    location / {
        proxy_pass http://sinag_web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (for hot reload in dev)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable the configuration:

```bash
sudo ln -s /etc/nginx/sites-available/sinag /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Secrets Management

### Rotating Secrets

To rotate a secret:

```bash
# 1. Remove old secret (this will cause downtime!)
docker secret rm sinag_secret_key

# 2. Create new secret
echo "new-secret-value" | docker secret create sinag_secret_key -

# 3. Restart affected services
docker service update --force sinag_api
docker service update --force sinag_celery-worker
```

### Backing Up Secrets

Secrets are stored in Docker's internal database. For backup:

```bash
# Export secrets to encrypted file
./scripts/docker-secrets-setup.sh --list > secrets-backup.txt

# Encrypt the backup
gpg --encrypt --recipient your-email@example.com secrets-backup.txt

# Store encrypted backup securely
mv secrets-backup.txt.gpg /secure/backup/location/
rm secrets-backup.txt
```

---

## Monitoring and Maintenance

### Health Checks

```bash
# Check all service health
./scripts/docker-dev.sh health

# Check specific service
docker inspect --format='{{.State.Health.Status}}' sinag-api-prod
```

### Log Management

```bash
# View logs for all services
./scripts/docker-dev.sh prod:logs

# View logs for specific service
docker compose -f docker-compose.prod.yml logs -f api

# View last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 api
```

### Resource Monitoring

```bash
# Real-time resource usage
./scripts/docker-dev.sh stats

# Continuous monitoring
docker stats
```

### Backup Procedures

#### 1. Database Backup (Supabase)

Supabase provides automatic backups. For manual backups:

```bash
# Export from Supabase dashboard or use pg_dump
docker exec -it sinag-api-prod bash -c 'pg_dump $DATABASE_URL > /backup/sinag_$(date +%Y%m%d).sql'
```

#### 2. Application State Backup

```bash
# Backup Redis data
docker exec sinag-redis-prod redis-cli SAVE

# Copy Redis dump
docker cp sinag-redis-prod:/data/dump.rdb ./backups/redis-$(date +%Y%m%d).rdb
```

### Security Scanning

```bash
# Run comprehensive security scan
./scripts/docker-dev.sh security-scan

# Results saved in ./security-scans/
```

Schedule regular scans with cron:

```bash
# Add to crontab
0 2 * * 0 cd /path/to/sinag && ./scripts/docker-security-scan.sh >> /var/log/sinag-security-scan.log 2>&1
```

---

## Troubleshooting

### Common Issues

#### 1. Containers Won't Start

```bash
# Check service status
./scripts/docker-dev.sh prod:status

# Check logs for errors
./scripts/docker-dev.sh prod:logs

# Check health status
./scripts/docker-dev.sh health
```

#### 2. Secret Access Issues

```bash
# Verify secrets exist
docker secret ls --filter name=sinag_

# Recreate secrets
./scripts/docker-secrets-setup.sh --interactive
```

#### 3. Database Connection Issues

```bash
# Test database connectivity from API container
docker exec -it sinag-api-prod bash -c 'python -c "import psycopg2; psycopg2.connect(os.environ[\"DATABASE_URL\"])"'

# Check if DATABASE_URL secret is accessible
docker exec -it sinag-api-prod cat /run/secrets/sinag_database_url
```

#### 4. High Memory Usage

```bash
# Check resource usage
./scripts/docker-dev.sh stats

# Adjust resource limits in docker-compose.prod.yml
# Then restart services
./scripts/docker-dev.sh prod:down
./scripts/docker-dev.sh prod:up
```

#### 5. Celery Worker Issues

```bash
# Check worker logs
docker compose -f docker-compose.prod.yml logs -f celery-worker

# Inspect Celery worker status
docker exec -it sinag-celery-worker-prod celery -A app.core.celery_app inspect active

# Restart worker
docker compose -f docker-compose.prod.yml restart celery-worker
```

---

## Scaling

### Horizontal Scaling

To scale services for increased load:

```bash
# Scale API containers (Docker Compose)
docker compose -f docker-compose.prod.yml up -d --scale api=3

# Scale Celery workers
docker compose -f docker-compose.prod.yml up -d --scale celery-worker=4

# For Docker Swarm
docker service scale sinag_api=3
docker service scale sinag_celery-worker=4
```

### Load Balancing

Use a reverse proxy (Nginx/Caddy/Traefik) for load balancing:

```nginx
# Nginx load balancing example
upstream sinag_api {
    least_conn;  # Load balancing method
    server 172.26.0.20:8000;
    server 172.26.0.21:8000;
    server 172.26.0.22:8000;
}
```

### Database Scaling

For PostgreSQL (Supabase):

- Use read replicas for read-heavy workloads
- Enable connection pooling (already configured via Supabase pooler)
- Consider upgrading Supabase plan for more resources

### Redis Scaling

For high-traffic scenarios:

- Use Redis Sentinel for high availability
- Consider Redis Cluster for horizontal scaling
- Implement Redis caching strategies in the application

---

## Updates and Upgrades

### Updating the Application

```bash
# 1. Pull latest changes
git pull origin main

# 2. Rebuild images
./scripts/docker-dev.sh prod:build

# 3. Run migrations (if needed)
docker exec -it sinag-api-prod alembic upgrade head

# 4. Restart services with zero downtime (Docker Swarm)
docker service update --image sinag-api:latest sinag_api

# Or restart all services (Docker Compose - brief downtime)
./scripts/docker-dev.sh prod:down
./scripts/docker-dev.sh prod:up
```

### Rolling Updates (Docker Swarm)

For zero-downtime updates:

```bash
# Update API service
docker service update \
    --image sinag-api:latest \
    --update-parallelism 1 \
    --update-delay 10s \
    sinag_api

# Update Web service
docker service update \
    --image sinag-web:latest \
    --update-parallelism 1 \
    --update-delay 10s \
    sinag_web
```

---

## Best Practices

1. **Regular Backups**: Automate database and Redis backups
2. **Security Scanning**: Run weekly vulnerability scans
3. **Log Monitoring**: Set up centralized logging (ELK, Loki, etc.)
4. **Alerting**: Configure alerts for service failures
5. **Resource Monitoring**: Use Prometheus + Grafana for metrics
6. **SSL/TLS**: Keep certificates up to date (use Let's Encrypt with auto-renewal)
7. **Secrets Rotation**: Rotate secrets every 90 days
8. **Updates**: Keep Docker, base images, and dependencies updated
9. **Testing**: Always test updates in staging before production
10. **Documentation**: Keep deployment documentation up to date

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Production Guide](https://docs.docker.com/compose/production/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Supabase Documentation](https://supabase.com/docs)
- [SINAG GitHub Repository](https://github.com/your-org/sinag)

---

**Last Updated**: 2025-11-28 **Maintained By**: DevOps Team
