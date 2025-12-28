# Troubleshooting Guide

Common issues and solutions for SINAG development.

## Quick Links

- [Docker Issues](./docker.md) - Docker-related problems
- [Backend Issues](./backend.md) - FastAPI and Python issues
- [Frontend Issues](./frontend.md) - Next.js and React issues
- [Common Errors](./common-errors.md) - Frequently encountered errors

## Getting Help

1. Check the relevant troubleshooting guide
2. Search existing GitHub issues
3. Review the [Architecture](../architecture/README.md) documentation
4. Check the FastAPI docs at `http://localhost:8000/docs`
5. Ask in the team channel

## Common Issues

### Type Generation Fails

**Symptoms**: `pnpm generate-types` fails or generates incorrect types

**Solutions**:

1. Ensure backend is running: `pnpm dev:api`
2. Check OpenAPI spec: `curl http://localhost:8000/openapi.json`
3. Verify all Pydantic schemas are valid
4. Check `orval.config.ts` configuration

See [Common Errors](./common-errors.md) for more details.

### Cannot Connect to Database

**Symptoms**: Backend fails to start with database connection errors

**Solutions**:

1. Verify Supabase credentials in `apps/api/.env`
2. Check DATABASE_URL format (use pooler endpoint, port 6543)
3. Test connection: `psql $DATABASE_URL`
4. Verify network connectivity

See [Backend Issues](./backend.md) for more details.

### Frontend Cannot Reach Backend

**Symptoms**: API calls fail with network errors

**Solutions**:

1. Ensure backend is running on port 8000
2. Check CORS configuration
3. Verify `NEXT_PUBLIC_API_URL` in `apps/web/.env.local`
4. Check browser console for errors

See [Frontend Issues](./frontend.md) for more details.

### Docker Containers Won't Start

**Symptoms**: Docker services fail to start or crash

**Solutions**:

1. Check Docker logs: `./scripts/docker-dev.sh logs`
2. Verify environment variables
3. Restart services: `./scripts/docker-dev.sh restart`
4. Clean Docker volumes: `docker-compose down -v`

See [Docker Issues](./docker.md) for more details.

## Debugging Tips

### Backend Debugging

```bash
# Run with verbose logging
cd apps/api
DEBUG=true uvicorn app.main:app --reload --log-level=debug
```

### Frontend Debugging

```bash
# Run with verbose output
cd apps/web
NEXT_PUBLIC_DEBUG=true pnpm dev
```

### Database Debugging

```bash
# Check migration status
cd apps/api
alembic current
alembic history
```

### Network Debugging

```bash
# Test backend health
curl http://localhost:8000/api/v1/health

# Test frontend
curl http://localhost:3000
```
