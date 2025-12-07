# Deployment Guide

This guide provides an overview of deployment procedures for the SINAG platform. For detailed
documentation, see the linked resources below.

## Quick Links

| Topic             | Documentation                                                       |
| ----------------- | ------------------------------------------------------------------- |
| CI/CD Pipeline    | [CI/CD Pipeline Documentation](../devops/ci-cd-pipeline.md)         |
| EC2 Deployment    | [EC2 Deployment Guide](./ec2-deployment-guide.md)                   |
| Docker Production | [Docker Production Guide](../deployment/docker-production-guide.md) |

## Deployment Environments

SINAG uses two deployment environments:

| Environment    | Branch    | Docker Tag | URL Pattern                  |
| -------------- | --------- | ---------- | ---------------------------- |
| **Staging**    | `develop` | `develop`  | `http://staging.example.com` |
| **Production** | `main`    | `latest`   | `https://example.com`        |

### Staging

- Automatically deployed on push to `develop` branch
- Used for testing and QA before production release
- No approval required for deployment

### Production

- Automatically deployed on push to `main` branch (after approval)
- Requires manual approval in GitHub environment protection rules
- All quality gates must pass before deployment

## CI/CD Pipeline

The automated pipeline is documented in detail at:
**[CI/CD Pipeline Documentation](../devops/ci-cd-pipeline.md)**

### Pipeline Overview

```
Push/PR → CI Checks → Security Scans → Build Images → Deploy
```

Key workflows:

- `ci.yml` - Linting, testing, type checking
- `build-and-push.yml` - Docker image builds
- `deploy.yml` - EC2 deployment
- `security.yml` - Vulnerability scanning

## Manual Deployment

For manual deployments:

1. Go to **GitHub Actions > Deploy to EC2**
2. Click **Run workflow**
3. Select environment (staging/production)
4. Optionally enable database migrations
5. Click **Run workflow**

See [CI/CD Pipeline - Manual Deployment](../devops/ci-cd-pipeline.md#deployment) for details.

## Database Migrations in Production

Migrations can be run:

1. **During deployment**: Check "Run database migrations" in workflow
2. **Manually on EC2**:
   ```bash
   cd ~/sinag
   docker compose -f docker-compose.prod.yml exec api alembic upgrade head
   ```

**Important**: Always test migrations in staging before production.

## Rollback Procedures

### Quick Rollback

1. Identify the previous working image tag (check GHCR)
2. Update `IMAGE_TAG` in the deployment workflow
3. Trigger manual deployment

### Full Rollback

1. SSH into EC2
2. Update image tags in docker-compose or .env
3. Pull and restart:
   ```bash
   cd ~/sinag
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

### Database Rollback

```bash
docker compose -f docker-compose.prod.yml exec api alembic downgrade -1
```

## Health Checks

### Endpoints

| Endpoint         | Purpose                |
| ---------------- | ---------------------- |
| `/health`        | API health check       |
| `/api/v1/health` | API v1 health          |
| `/`              | Frontend accessibility |

### Monitoring

The deployment workflow automatically performs health checks after deployment. If health checks fail
after 3 attempts, the workflow fails and outputs debugging information.

## Deployment Checklist

Before deploying to production:

- [ ] All CI checks pass
- [ ] Security scans show no critical vulnerabilities
- [ ] Changes tested in staging environment
- [ ] Database migrations tested (if applicable)
- [ ] Environment variables configured
- [ ] Team notified of deployment

## Related Documentation

- [CI/CD Pipeline](../devops/ci-cd-pipeline.md) - Comprehensive pipeline documentation
- [EC2 Deployment Guide](./ec2-deployment-guide.md) - EC2 setup instructions
- [Docker Production Guide](../deployment/docker-production-guide.md) - Docker configuration
- [Database Migrations](./database-migrations.md) - Migration workflow
