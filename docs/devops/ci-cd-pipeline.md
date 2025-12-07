# CI/CD Pipeline Documentation

This document provides a comprehensive overview of the SINAG project's Continuous Integration and
Continuous Deployment (CI/CD) pipeline, implemented using GitHub Actions.

## Table of Contents

- [Overview](#overview)
- [Pipeline Architecture](#pipeline-architecture)
- [Workflow Files](#workflow-files)
- [Continuous Integration (CI)](#continuous-integration-ci)
- [Build and Registry](#build-and-registry)
- [Deployment](#deployment)
- [Security Scanning](#security-scanning)
- [E2E Testing](#e2e-testing)
- [Environment Configuration](#environment-configuration)
- [Setting Up for New Environments](#setting-up-for-new-environments)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Overview

SINAG uses a multi-stage CI/CD pipeline that ensures code quality, security, and reliable
deployments:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SINAG CI/CD Pipeline                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PR/Push to main/develop                                                     │
│       │                                                                      │
│       ├───────────────┬───────────────┬───────────────┐                     │
│       ▼               ▼               ▼               ▼                     │
│  ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │   CI    │    │ Security │    │   E2E    │    │  Build   │               │
│  │ Tests   │    │  Scans   │    │  Tests   │    │ & Push   │               │
│  └────┬────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘               │
│       │              │               │               │                      │
│       └──────────────┴───────────────┴───────────────┘                      │
│                              │                                               │
│                    Quality Gates Validation                                  │
│                              │                                               │
│                              ▼                                               │
│                    ┌─────────────────┐                                       │
│                    │    Deploy to    │                                       │
│                    │   EC2 (Staging  │                                       │
│                    │  or Production) │                                       │
│                    └─────────────────┘                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Features

- **Automated Quality Gates**: CI must pass before deployment
- **Environment Separation**: Staging (develop) and Production (main) environments
- **Security-First**: Automated vulnerability scanning and secret detection
- **Docker-Based**: Containerized builds pushed to GitHub Container Registry (GHCR)
- **Zero-Downtime Deployments**: Health checks ensure service availability

---

## Pipeline Architecture

### Branch Strategy

| Branch    | Environment | Docker Tag       | Deployment        |
| --------- | ----------- | ---------------- | ----------------- |
| `develop` | Staging     | `develop`        | Automatic         |
| `main`    | Production  | `latest`         | Requires approval |
| `v*` tags | Production  | Semantic version | Automatic         |

### Workflow Dependencies

```
┌──────────────────────────────────────────────────────────────┐
│                     On Push/PR                                │
│                                                               │
│   ci.yml ─────────────────┐                                  │
│                           │                                  │
│   security.yml ───────────┼──► deploy.yml (validates all)   │
│                           │                                  │
│   build-and-push.yml ─────┘                                  │
│                                                               │
│   playwright.yml (independent E2E testing)                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Workflow Files

### Location

All workflow files are in `.github/workflows/`:

| File                 | Purpose                      | Triggers                     |
| -------------------- | ---------------------------- | ---------------------------- |
| `ci.yml`             | Code quality checks          | PRs, pushes to main/develop  |
| `build-and-push.yml` | Build and push Docker images | Pushes to main/develop, tags |
| `deploy.yml`         | Deploy to EC2                | After build success, manual  |
| `security.yml`       | Security scanning            | PRs, pushes, weekly schedule |
| `playwright.yml`     | E2E testing                  | PRs, pushes to main/develop  |

---

## Continuous Integration (CI)

**File**: `.github/workflows/ci.yml`

The CI workflow ensures code quality through comprehensive checks.

### Jobs

#### 1. Backend Lint (`backend-lint`)

Runs linting and type checking on the Python backend:

- **Ruff Linting**: Code style and format checking
- **Ruff Format**: Code formatting verification
- **MyPy**: Static type checking (currently non-blocking)

```yaml
# Key environment
python-version: "3.13"
working-directory: apps/api
```

#### 2. Backend Tests (`backend-tests`)

Parallelized test execution across four test groups:

| Test Group            | Coverage Area                       |
| --------------------- | ----------------------------------- |
| `api`                 | API endpoint tests                  |
| `services`            | Service layer, workers, workflows   |
| `schemas-core`        | Pydantic schemas, core utilities    |
| `algorithms-security` | Business algorithms, security tests |

**Dependencies**: Requires `backend-lint` to pass first.

**Services**: Redis container for Celery-dependent tests.

#### 3. Frontend Checks (`frontend-checks`)

Comprehensive frontend quality checks:

- **ESLint**: Code quality linting
- **TypeScript**: Type checking
- **Vitest**: Unit test execution with coverage
- **Build Check**: Ensures production build succeeds

#### 4. Type Generation (`type-generation`)

Validates that generated API types are synchronized:

1. Starts the FastAPI server
2. Runs `pnpm generate-types`
3. Checks for uncommitted changes in `packages/shared/src/generated/`

**Important**: If this check fails, run `pnpm generate-types` locally and commit the changes.

#### 5. CI Status (`ci-status`)

Aggregates results and fails the workflow if critical checks fail:

- **Blocking**: `backend-lint`, `frontend-checks`
- **Non-blocking**: `backend-tests` (currently, while improving coverage)

### Concurrency

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

This cancels previous CI runs when new commits are pushed to the same branch.

---

## Build and Registry

**File**: `.github/workflows/build-and-push.yml`

Builds Docker images and pushes them to GitHub Container Registry (GHCR).

### Images Built

| Image         | Source                | Description      |
| ------------- | --------------------- | ---------------- |
| `sinag-api`   | `apps/api/Dockerfile` | FastAPI backend  |
| `sinag-web`   | `apps/web/Dockerfile` | Next.js frontend |
| `sinag-nginx` | `nginx/Dockerfile`    | Reverse proxy    |

### Tagging Strategy

| Trigger           | Tags Applied                     |
| ----------------- | -------------------------------- |
| Push to `main`    | `latest`, `sha-<commit>`         |
| Push to `develop` | `develop`, `sha-<commit>`        |
| Tag `v1.2.3`      | `v1.2.3`, `v1.2`, `sha-<commit>` |

### Environment-Specific Web Builds

The web image is built separately for each environment to bake in the correct API URLs:

- **Staging**: Uses `staging` environment variables
- **Production**: Uses `production` environment variables

```yaml
build-args:
  NEXT_PUBLIC_API_URL=${{ vars.NEXT_PUBLIC_API_URL }} NEXT_PUBLIC_API_V1_URL=${{
  vars.NEXT_PUBLIC_API_V1_URL }}
```

### Build Caching

Uses GitHub Actions cache for faster builds:

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

---

## Deployment

**File**: `.github/workflows/deploy.yml`

Deploys the application to EC2 instances.

### Triggers

1. **Automatic**: After successful `Build and Push to GHCR` workflow
2. **Manual**: Via `workflow_dispatch` with environment selection

### Quality Gates

Before deployment, the workflow validates:

1. Build workflow succeeded
2. CI workflow succeeded (linting, tests)
3. Security workflow succeeded (no critical vulnerabilities)

**Note**: Manual deployments (`workflow_dispatch`) bypass quality gates.

### Deployment Process

```
1. Validate Quality Gates
       │
2. Setup (Determine Environment)
       │
       ├──► Staging (develop branch)
       │         │
       │    ┌────▼────────────────────────────────┐
       │    │ - SSH to EC2                        │
       │    │ - Copy docker-compose.prod.yml      │
       │    │ - Create .env from GitHub Secrets   │
       │    │ - Login to GHCR                     │
       │    │ - Pull and deploy containers        │
       │    │ - Run migrations (if requested)     │
       │    │ - Health check (3 retries)          │
       │    └─────────────────────────────────────┘
       │
       └──► Production (main branch)
                 │
            ┌────▼────────────────────────────────┐
            │ Same steps as staging               │
            │ + Requires manual approval          │
            └─────────────────────────────────────┘
```

### Environment-Specific Behavior

| Environment | Branch    | Approval | Image Tag |
| ----------- | --------- | -------- | --------- |
| Staging     | `develop` | None     | `develop` |
| Production  | `main`    | Required | `latest`  |

### Health Checks

The deployment includes automatic health verification:

```bash
curl -sf http://localhost/health
```

If health check fails after 3 attempts, the workflow outputs debugging information including:

- Docker container status
- Container logs (last 30 lines)
- Environment file verification

### Manual Deployment Options

When triggering manually:

- **Environment**: Choose `staging` or `production`
- **Run Migrations**: Optionally execute `alembic upgrade head`

---

## Security Scanning

**File**: `.github/workflows/security.yml`

Comprehensive security scanning to identify vulnerabilities.

### Scan Types

| Scan             | Tool         | Purpose                             |
| ---------------- | ------------ | ----------------------------------- |
| NPM Audit        | `pnpm audit` | Frontend dependency vulnerabilities |
| Python Audit     | `pip-audit`  | Backend dependency vulnerabilities  |
| Container Scan   | Trivy        | Docker image vulnerabilities        |
| Secret Detection | Gitleaks     | Hardcoded secrets in code           |
| SAST             | Semgrep      | Static application security testing |

### Schedule

- **On-demand**: PRs and pushes to main/develop
- **Scheduled**: Weekly on Monday at 9 AM UTC

### Scan Configurations

#### Semgrep Rulesets

```yaml
config:
  - p/security-audit
  - p/python
  - p/typescript
  - p/react
  - p/docker
  - p/secrets
```

#### Trivy Severity Filter

Only reports `CRITICAL` and `HIGH` severity vulnerabilities.

### Results

- **NPM Audit**: Uploaded as artifact (`npm-audit-report`)
- **Python Audit**: Uploaded as artifact (`pip-audit-report`)
- **Semgrep**: Uploaded to GitHub Security tab (SARIF format)

---

## E2E Testing

**File**: `.github/workflows/playwright.yml`

End-to-end testing using Playwright.

### Test Levels

| Level         | When                   | Tests                                                |
| ------------- | ---------------------- | ---------------------------------------------------- |
| Smoke Tests   | All PRs/pushes         | `smoke.spec.ts`                                      |
| Critical Path | PRs only               | `authentication.spec.ts`, `route-protection.spec.ts` |
| Full Suite    | Pushes to main/develop | All E2E tests                                        |

### Test Environment

Each test job provisions:

- PostgreSQL 16 database
- Redis 7 cache
- Test user seeding via `seed_e2e_users.py`

### Browser

Currently runs on Chromium only for faster feedback.

### Artifacts

Test reports are uploaded on failure:

- `smoke-test-report`
- `critical-path-report`
- `full-e2e-report`

---

## Environment Configuration

### GitHub Environments

The pipeline uses GitHub Environments for secret isolation:

| Environment  | Purpose             | Secrets Isolation                      |
| ------------ | ------------------- | -------------------------------------- |
| `staging`    | Development/testing | Staging secrets                        |
| `production` | Live application    | Production secrets (approval required) |

### Required Secrets

Configure these in **Settings > Secrets and variables > Actions**:

| Secret                           | Description                         | Required For |
| -------------------------------- | ----------------------------------- | ------------ |
| `EC2_HOST`                       | EC2 instance IP address             | Deployment   |
| `EC2_USER`                       | SSH username (usually `ec2-user`)   | Deployment   |
| `EC2_SSH_PRIVATE_KEY`            | Full contents of `.pem` file        | Deployment   |
| `SECRET_KEY`                     | Application secret for JWT          | API          |
| `FIRST_SUPERUSER_PASSWORD`       | Initial admin password              | API          |
| `EXTERNAL_USER_DEFAULT_PASSWORD` | Default password for external users | API          |
| `DATABASE_URL`                   | PostgreSQL connection string        | API          |
| `SUPABASE_URL`                   | Supabase project URL                | API          |
| `SUPABASE_ANON_KEY`              | Supabase anonymous key              | API          |
| `SUPABASE_SERVICE_ROLE_KEY`      | Supabase service role key           | API          |
| `GEMINI_API_KEY`                 | Google Gemini API key               | AI features  |

### Required Variables

Configure these in **Settings > Secrets and variables > Actions > Variables**:

| Variable                 | Description          | Example                     |
| ------------------------ | -------------------- | --------------------------- |
| `NEXT_PUBLIC_API_URL`    | API base URL         | `http://YOUR_EC2_IP`        |
| `NEXT_PUBLIC_API_V1_URL` | API v1 URL           | `http://YOUR_EC2_IP/api/v1` |
| `ENVIRONMENT`            | Environment name     | `staging` or `production`   |
| `BACKEND_CORS_ORIGINS`   | Allowed CORS origins | `http://YOUR_EC2_IP`        |

### Environment-Specific Configuration

Secrets and variables should be configured per-environment:

1. Go to **Settings > Environments**
2. Create `staging` and `production` environments
3. Add environment-specific secrets/variables to each
4. For production, enable **Required reviewers**

---

## Setting Up for New Environments

### Step 1: Create GitHub Environment

1. Navigate to **Settings > Environments**
2. Click **New environment**
3. Name it (e.g., `staging`, `production`, `demo`)
4. Configure protection rules:
   - **Production**: Enable "Required reviewers"
   - **Other**: Optional wait timer

### Step 2: Configure Secrets

Add all required secrets to the new environment:

```bash
# Generate secure values
python3 -c "import secrets; print(secrets.token_urlsafe(64))"  # SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(16))"  # Passwords
```

### Step 3: Configure Variables

Set environment-specific variables:

| Variable              | Staging Example              | Production Example        |
| --------------------- | ---------------------------- | ------------------------- |
| `NEXT_PUBLIC_API_URL` | `http://staging.example.com` | `https://api.example.com` |
| `ENVIRONMENT`         | `staging`                    | `production`              |

### Step 4: Prepare EC2 Instance

1. Launch EC2 instance (see [EC2 Deployment Guide](../guides/ec2-deployment-guide.md))
2. Install Docker and dependencies
3. Configure security groups (ports 22, 80, 443)
4. Note the public IP for `EC2_HOST` secret

### Step 5: Update Workflow (if needed)

For additional environments beyond staging/production, update `deploy.yml`:

```yaml
# Add new environment job similar to deploy-staging/deploy-production
deploy-demo:
  needs: setup
  if: needs.setup.outputs.environment == 'demo'
  environment: demo
  # ... rest of deployment steps
```

### Step 6: Test Deployment

1. Trigger manual deployment via **Actions > Deploy to EC2 > Run workflow**
2. Select the new environment
3. Monitor the workflow execution
4. Verify health check passes

---

## Troubleshooting

### CI Failures

#### Type Generation Out of Sync

**Symptom**: `type-generation` job fails with "Generated types are out of sync"

**Solution**:

```bash
pnpm dev:api  # Start backend
pnpm generate-types
git add packages/shared/src/generated/
git commit -m "chore: regenerate API types"
```

#### Backend Lint Failures

**Symptom**: `backend-lint` job fails

**Solution**:

```bash
cd apps/api
uv run ruff check . --fix  # Auto-fix issues
uv run ruff format .       # Format code
```

#### Frontend Build Failures

**Symptom**: `frontend-checks` job fails on build

**Solution**:

1. Check for TypeScript errors: `pnpm type-check`
2. Verify environment variables are set
3. Check for missing dependencies

### Deployment Failures

#### SSH Connection Failed

**Symptom**: "Permission denied" or "Connection refused"

**Solutions**:

1. Verify `EC2_SSH_PRIVATE_KEY` contains the complete `.pem` file content
2. Check `EC2_HOST` is the correct IP address
3. Ensure EC2 security group allows SSH from GitHub Actions IPs
4. Verify the SSH key matches the EC2 key pair

#### Health Check Failed

**Symptom**: Deployment succeeds but health check fails

**Solutions**:

1. SSH into EC2 and check container logs:
   ```bash
   cd ~/sinag
   docker compose -f docker-compose.prod.yml logs api
   ```
2. Verify `.env` file was created correctly
3. Check database connectivity
4. Ensure all required secrets are configured

#### Images Not Pulling

**Symptom**: "Image not found" or "Unauthorized"

**Solutions**:

1. Verify GHCR login on EC2:
   ```bash
   echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
   ```
2. Check image exists in GHCR (repository packages)
3. Verify `GITHUB_REPOSITORY` matches your repo path

#### Database Connection Errors

**Symptom**: API container crashes with database errors

**Solutions**:

1. Verify `DATABASE_URL` uses the correct format
2. For Supabase, ensure you're using the pooler (port 6543)
3. Check Supabase project is active (not paused)

### Security Scan Failures

#### Gitleaks Detecting False Positives

**Symptom**: Gitleaks reports secrets that aren't real

**Solution**: Add a `.gitleaks.toml` configuration to allowlist false positives.

#### High Vulnerability Count

**Symptom**: Many vulnerabilities reported

**Solutions**:

1. Update dependencies: `pnpm update` / `uv sync --upgrade`
2. Review and address critical/high severity issues first
3. Document accepted risks for known issues

### E2E Test Failures

#### Tests Timing Out

**Symptom**: E2E tests fail with timeout errors

**Solutions**:

1. Increase test timeouts in `playwright.config.ts`
2. Check if services are starting correctly
3. Review test for flaky conditions

#### Authentication Tests Failing

**Symptom**: Login/auth tests fail

**Solutions**:

1. Verify test users are being seeded correctly
2. Check API is accessible from test environment
3. Review authentication flow for changes

---

## Best Practices

### For Developers

1. **Run checks locally** before pushing:

   ```bash
   pnpm lint
   pnpm type-check
   pnpm test
   ```

2. **Keep generated types in sync**:

   ```bash
   pnpm generate-types
   ```

3. **Write meaningful commit messages** for better CI status visibility

4. **Monitor CI status** on PRs before requesting review

### For DevOps

1. **Rotate secrets regularly** (every 90 days recommended)

2. **Review security scan results** weekly

3. **Keep base images updated** for security patches

4. **Monitor deployment logs** for recurring issues

5. **Test deployments in staging** before production

### For the Pipeline

1. **Keep workflows modular** - separate concerns into different files

2. **Use caching** to speed up builds

3. **Set appropriate timeouts** to prevent hung jobs

4. **Use concurrency controls** to avoid resource waste

5. **Document changes** to workflow files in commit messages

---

## Related Documentation

- [EC2 Deployment Guide](../guides/ec2-deployment-guide.md) - Detailed EC2 setup
- [Docker Production Guide](../deployment/docker-production-guide.md) - Docker configuration
- [Testing Guide](../guides/testing.md) - Testing practices
- [Type Generation Guide](../guides/type-generation.md) - API type workflow

---

**Last Updated**: 2025-12-07 **Maintained By**: SINAG DevOps Team
