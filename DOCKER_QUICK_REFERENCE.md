# SINAG Docker Quick Reference

A quick reference guide for common Docker operations in the SINAG project.

---

## Table of Contents
- [Development](#development)
- [Production](#production)
- [Troubleshooting](#troubleshooting)
- [Security](#security)

---

## Development

### Start Development Environment
```bash
# Start all services (API, Web, Redis, Celery)
./scripts/docker-dev.sh up
# OR
pnpm dev  # Uses local development without Docker
```

### View Logs
```bash
# All services
./scripts/docker-dev.sh logs

# Specific service
./scripts/docker-dev.sh logs-api
./scripts/docker-dev.sh logs-web
./scripts/docker-dev.sh logs-celery
```

### Check Health
```bash
./scripts/docker-dev.sh health
```

### Restart Services
```bash
./scripts/docker-dev.sh restart

# Restart specific service
./scripts/docker-dev.sh rebuild api
./scripts/docker-dev.sh rebuild web
```

### Stop Everything
```bash
./scripts/docker-dev.sh down
```

### Clean Up (Remove Everything)
```bash
./scripts/docker-dev.sh clean
# WARNING: This removes containers, volumes, and images
```

---

## Production

### First-Time Setup

1. **Set up Docker Secrets**
```bash
./scripts/docker-dev.sh setup-secrets
```

2. **Build Production Images**
```bash
./scripts/docker-dev.sh prod:build
```

3. **Deploy**
```bash
./scripts/docker-dev.sh prod:up
```

### Ongoing Operations

**View Status**
```bash
./scripts/docker-dev.sh prod:status
```

**View Logs**
```bash
./scripts/docker-dev.sh prod:logs
```

**Restart Services**
```bash
./scripts/docker-dev.sh prod:down
./scripts/docker-dev.sh prod:up
```

**Run Database Migrations**
```bash
./scripts/docker-dev.sh db:migrate
```

**Rollback Migration**
```bash
./scripts/docker-dev.sh db:rollback
```

---

## Troubleshooting

### Check Port Conflicts
```bash
./scripts/docker-dev.sh check-ports
```

### Kill Processes on Ports
```bash
./scripts/docker-dev.sh kill-ports
```

### Resource Usage
```bash
./scripts/docker-dev.sh stats
```

### Shell Access
```bash
# API container
./scripts/docker-dev.sh shell

# Web container
./scripts/docker-dev.sh shell-web
```

### Database Shell
```bash
./scripts/docker-dev.sh db:shell
```

### Container Not Starting?
```bash
# 1. Check logs
./scripts/docker-dev.sh logs

# 2. Check health
./scripts/docker-dev.sh health

# 3. Rebuild
./scripts/docker-dev.sh rebuild api
```

### Out of Disk Space?
```bash
# Remove unused Docker resources
./scripts/docker-dev.sh prune
```

---

## Security

### Run Security Scan
```bash
./scripts/docker-dev.sh security-scan
```

### List Docker Secrets
```bash
./scripts/docker-dev.sh setup-secrets --list
```

### Rotate Secrets
```bash
# 1. Remove old secret
docker secret rm sinag_secret_key

# 2. Create new secret
./scripts/docker-dev.sh setup-secrets

# 3. Restart services
./scripts/docker-dev.sh prod:down
./scripts/docker-dev.sh prod:up
```

---

## Quick Command Reference

| Task | Command |
|------|---------|
| Start dev | `./scripts/docker-dev.sh up` |
| Stop dev | `./scripts/docker-dev.sh down` |
| View logs | `./scripts/docker-dev.sh logs` |
| Check health | `./scripts/docker-dev.sh health` |
| Rebuild service | `./scripts/docker-dev.sh rebuild <service>` |
| Shell access | `./scripts/docker-dev.sh shell` |
| **Production** | |
| Setup secrets | `./scripts/docker-dev.sh setup-secrets` |
| Build prod | `./scripts/docker-dev.sh prod:build` |
| Deploy prod | `./scripts/docker-dev.sh prod:up` |
| Prod status | `./scripts/docker-dev.sh prod:status` |
| **Database** | |
| Run migrations | `./scripts/docker-dev.sh db:migrate` |
| Rollback | `./scripts/docker-dev.sh db:rollback` |
| DB shell | `./scripts/docker-dev.sh db:shell` |
| **Utilities** | |
| Security scan | `./scripts/docker-dev.sh security-scan` |
| Check ports | `./scripts/docker-dev.sh check-ports` |
| Resource stats | `./scripts/docker-dev.sh stats` |
| Clean up | `./scripts/docker-dev.sh prune` |

---

## Environment Variables

### Development (.env files)

**API** (`apps/api/.env`):
```env
DEBUG=true
ENVIRONMENT=development
SECRET_KEY=dev-secret-key
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
```

**Web** (`apps/web/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_V1_URL=http://localhost:8000/api/v1
```

### Production (Docker Secrets)

Production uses Docker secrets instead of `.env` files:
- `sinag_secret_key`
- `sinag_database_url`
- `sinag_supabase_key`
- `sinag_gemini_api_key`
- `sinag_redis_password`

---

## Port Mappings

| Service | Development Port | Production Port |
|---------|-----------------|-----------------|
| API | 8000 | Internal only |
| Web | 3000 | Internal only |
| Redis | 6379 | Internal only |
| PostgreSQL | External (Supabase) | External (Supabase) |

**Note**: In production, use a reverse proxy (Nginx/Caddy) to expose services on ports 80/443.

---

## Service URLs

### Development
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Web**: http://localhost:3000
- **Redis**: localhost:6379

### Production
- **API**: https://api.yourdomain.com (via reverse proxy)
- **Web**: https://yourdomain.com (via reverse proxy)
- **Redis**: Internal only
- **Database**: Supabase (external)

---

## Common Issues

### Issue: Port Already in Use
```bash
./scripts/docker-dev.sh check-ports
./scripts/docker-dev.sh kill-ports
```

### Issue: Container Won't Start
```bash
# Check logs
./scripts/docker-dev.sh logs

# Rebuild
./scripts/docker-dev.sh rebuild <service>
```

### Issue: Database Connection Failed
```bash
# Check DATABASE_URL in apps/api/.env
# Verify Supabase credentials
# Test connection:
docker exec -it sinag-api python -c "import psycopg2; psycopg2.connect('$DATABASE_URL')"
```

### Issue: Out of Memory
```bash
# Check resource usage
./scripts/docker-dev.sh stats

# Adjust limits in docker-compose.yml
# Restart services
./scripts/docker-dev.sh restart
```

---

## Additional Resources

- **Full Documentation**: `/docs/deployment/docker-production-guide.md`
- **Security Audit**: `/DOCKER_SECURITY_AUDIT.md`
- **Project README**: `/README.md`
- **Claude Instructions**: `/CLAUDE.md`

---

**Last Updated**: 2025-11-28
