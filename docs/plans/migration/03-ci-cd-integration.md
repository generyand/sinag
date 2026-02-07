# CI/CD Integration with Coolify

> **Goal:** Adapt existing GitHub Actions pipeline to deploy via Coolify webhooks **Current:**
> Direct EC2 SSH deployment **Target:** Webhook-triggered Coolify deployment

## Overview

The existing CI/CD pipeline (CI, security scanning, E2E tests) remains mostly unchanged. Only the
deployment step changes from SSH-based to webhook-based deployment.

### Current vs New Flow

```
CURRENT (EC2 Direct):
Push → CI → Build → SSH into EC2 → docker compose pull → Restart containers

NEW (Coolify):
Push → CI → Coolify Webhook → Coolify pulls image → Zero-downtime deploy
```

### What Changes

| Component        | Current        | New                |
| ---------------- | -------------- | ------------------ |
| CI (tests, lint) | GitHub Actions | No change          |
| Security Scans   | GitHub Actions | No change          |
| Build & Push     | GHCR           | No change          |
| Deployment       | SSH to EC2     | Webhook to Coolify |
| Health Checks    | GitHub Actions | Coolify built-in   |
| SSL              | Manual/Certbot | Traefik auto-SSL   |

---

## Step 1: Configure Coolify Webhooks

### 1.1 Get Webhook URLs from Coolify

For each service (api, web, celery), Coolify provides a webhook URL:

1. In Coolify, go to your service (e.g., `sinag-api`)
2. Navigate to **Settings** → **Webhooks**
3. Copy the webhook URL:
   ```
   https://coolify.sinag.app/api/v1/deploy?uuid=<UUID>&token=<TOKEN>
   ```

You'll have webhooks for:

- `COOLIFY_STAGING_API_WEBHOOK`
- `COOLIFY_STAGING_WEB_WEBHOOK`
- `COOLIFY_STAGING_CELERY_WEBHOOK`
- `COOLIFY_PROD_API_WEBHOOK`
- `COOLIFY_PROD_WEB_WEBHOOK`
- `COOLIFY_PROD_CELERY_WEBHOOK`

### 1.2 Add Webhook Secrets to GitHub

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add secrets for each environment:

**Staging Environment:**

```
COOLIFY_STAGING_API_WEBHOOK=https://coolify.sinag.app/api/v1/deploy?uuid=xxx&token=xxx
COOLIFY_STAGING_WEB_WEBHOOK=https://coolify.sinag.app/api/v1/deploy?uuid=xxx&token=xxx
COOLIFY_STAGING_CELERY_WEBHOOK=https://coolify.sinag.app/api/v1/deploy?uuid=xxx&token=xxx
```

**Production Environment:**

```
COOLIFY_PROD_API_WEBHOOK=https://coolify.sinag.app/api/v1/deploy?uuid=xxx&token=xxx
COOLIFY_PROD_WEB_WEBHOOK=https://coolify.sinag.app/api/v1/deploy?uuid=xxx&token=xxx
COOLIFY_PROD_CELERY_WEBHOOK=https://coolify.sinag.app/api/v1/deploy?uuid=xxx&token=xxx
```

---

## Step 2: Create Coolify Deploy Workflow

Create a new workflow file `.github/workflows/deploy-coolify.yml`:

```yaml
name: Deploy to Coolify

on:
  workflow_run:
    workflows: ["Build and Push to GHCR"]
    types: [completed]
    branches: [main, develop]
  workflow_dispatch:
    inputs:
      environment:
        description: "Environment to deploy"
        required: true
        type: choice
        options:
          - staging
          - production

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false

jobs:
  # Determine which environment to deploy to
  setup:
    runs-on: ubuntu-latest
    if:
      ${{ github.event.workflow_run.conclusion == 'success' || github.event_name ==
      'workflow_dispatch' }}
    outputs:
      environment: ${{ steps.set-env.outputs.environment }}
      should_deploy: ${{ steps.set-env.outputs.should_deploy }}
    steps:
      - name: Determine environment
        id: set-env
        run: |
          if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
            echo "environment=${{ github.event.inputs.environment }}" >> $GITHUB_OUTPUT
            echo "should_deploy=true" >> $GITHUB_OUTPUT
          elif [ "${{ github.ref }}" == "refs/heads/main" ]; then
            echo "environment=production" >> $GITHUB_OUTPUT
            echo "should_deploy=true" >> $GITHUB_OUTPUT
          elif [ "${{ github.ref }}" == "refs/heads/develop" ]; then
            echo "environment=staging" >> $GITHUB_OUTPUT
            echo "should_deploy=true" >> $GITHUB_OUTPUT
          else
            echo "should_deploy=false" >> $GITHUB_OUTPUT
          fi

  # Wait for CI to pass (skip for manual triggers)
  validate-ci:
    needs: setup
    if: needs.setup.outputs.should_deploy == 'true' && github.event_name != 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - name: Wait for CI workflow
        uses: actions/github-script@v7
        with:
          script: |
            const maxAttempts = 30;
            const delaySeconds = 20;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              console.log(`Attempt ${attempt}/${maxAttempts}: Checking CI status...`);

              const runs = await github.rest.actions.listWorkflowRuns({
                owner: context.repo.owner,
                repo: context.repo.repo,
                workflow_id: 'ci.yml',
                head_sha: context.sha,
                per_page: 1
              });

              if (runs.data.workflow_runs.length > 0) {
                const run = runs.data.workflow_runs[0];
                console.log(`CI status: ${run.status}, conclusion: ${run.conclusion}`);

                if (run.status === 'completed') {
                  if (run.conclusion === 'success') {
                    console.log('CI passed!');
                    return;
                  } else {
                    core.setFailed(`CI failed with conclusion: ${run.conclusion}`);
                    return;
                  }
                }
              }

              if (attempt < maxAttempts) {
                console.log(`Waiting ${delaySeconds} seconds...`);
                await new Promise(r => setTimeout(r, delaySeconds * 1000));
              }
            }

            core.setFailed('CI workflow did not complete in time');

  # Deploy to Staging
  deploy-staging:
    needs: [setup, validate-ci]
    if: |
      always() &&
      needs.setup.outputs.environment == 'staging' &&
      (needs.validate-ci.result == 'success' || needs.validate-ci.result == 'skipped')
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Trigger Coolify API deployment
        run: |
          echo "Deploying API to staging..."
          curl -X POST "${{ secrets.COOLIFY_STAGING_API_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            --fail --silent --show-error
          echo "API deployment triggered"

      - name: Trigger Coolify Web deployment
        run: |
          echo "Deploying Web to staging..."
          curl -X POST "${{ secrets.COOLIFY_STAGING_WEB_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            --fail --silent --show-error
          echo "Web deployment triggered"

      - name: Trigger Coolify Celery deployment
        run: |
          echo "Deploying Celery workers to staging..."
          curl -X POST "${{ secrets.COOLIFY_STAGING_CELERY_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            --fail --silent --show-error
          echo "Celery deployment triggered"

      - name: Wait for deployments
        run: |
          echo "Waiting 60 seconds for deployments to complete..."
          sleep 60

      - name: Health check
        run: |
          echo "Checking staging health..."
          for i in {1..5}; do
            if curl -sf https://api-staging.sinag.app/health; then
              echo "Staging is healthy!"
              exit 0
            fi
            echo "Attempt $i failed, retrying in 15 seconds..."
            sleep 15
          done
          echo "Health check failed after 5 attempts"
          exit 1

  # Deploy to Production (requires approval)
  deploy-production:
    needs: [setup, validate-ci]
    if: |
      always() &&
      needs.setup.outputs.environment == 'production' &&
      (needs.validate-ci.result == 'success' || needs.validate-ci.result == 'skipped')
    runs-on: ubuntu-latest
    environment: production # This triggers approval requirement
    steps:
      - name: Trigger Coolify API deployment
        run: |
          echo "Deploying API to production..."
          curl -X POST "${{ secrets.COOLIFY_PROD_API_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            --fail --silent --show-error
          echo "API deployment triggered"

      - name: Trigger Coolify Web deployment
        run: |
          echo "Deploying Web to production..."
          curl -X POST "${{ secrets.COOLIFY_PROD_WEB_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            --fail --silent --show-error
          echo "Web deployment triggered"

      - name: Trigger Coolify Celery deployment
        run: |
          echo "Deploying Celery workers to production..."
          curl -X POST "${{ secrets.COOLIFY_PROD_CELERY_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            --fail --silent --show-error
          echo "Celery deployment triggered"

      - name: Wait for deployments
        run: |
          echo "Waiting 90 seconds for deployments to complete..."
          sleep 90

      - name: Health check
        run: |
          echo "Checking production health..."
          for i in {1..5}; do
            if curl -sf https://api.sinag.app/health; then
              echo "Production is healthy!"
              exit 0
            fi
            echo "Attempt $i failed, retrying in 15 seconds..."
            sleep 15
          done
          echo "Health check failed after 5 attempts"
          exit 1
```

---

## Step 3: Configure Coolify for GHCR

### 3.1 Add GHCR Credentials to Coolify

1. In Coolify, go to **Settings** → **Docker Registries**
2. Add new registry:
   - **Name:** GHCR
   - **URL:** `ghcr.io`
   - **Username:** Your GitHub username
   - **Password:** GitHub Personal Access Token (with `read:packages` scope)

### 3.2 Configure Services to Use GHCR Images

For each service, instead of building from source, configure to pull from GHCR:

**API Service:**

```
Image: ghcr.io/your-org/sinag-api:develop  # or :latest for production
```

**Web Service:**

```
Image: ghcr.io/your-org/sinag-web:develop  # or :latest for production
```

### 3.3 Alternative: Build in Coolify

If you prefer Coolify to build images (simpler but slower):

1. Connect GitHub repository to Coolify
2. Configure build settings:
   - **Build Path:** `apps/api` or `apps/web`
   - **Dockerfile:** `Dockerfile`
3. Coolify will build on each webhook trigger

---

## Step 4: Migration Strategy

### Phase 1: Parallel Running (Recommended)

Run both deployment methods temporarily:

1. Keep existing `deploy.yml` for EC2
2. Add new `deploy-coolify.yml` for Coolify
3. Test thoroughly on Coolify staging
4. Once validated, disable `deploy.yml`

### Phase 2: Cutover

1. Point DNS to Coolify server
2. Disable old `deploy.yml` workflow
3. Monitor for 24-48 hours
4. Decommission EC2

---

## Step 5: Update GitHub Environment Settings

### Staging Environment

1. Go to **Settings** → **Environments** → **staging**
2. Add/update secrets:
   ```
   COOLIFY_STAGING_API_WEBHOOK=...
   COOLIFY_STAGING_WEB_WEBHOOK=...
   COOLIFY_STAGING_CELERY_WEBHOOK=...
   ```
3. Remove EC2-related secrets (after migration):
   - `EC2_HOST`
   - `EC2_USER`
   - `EC2_SSH_PRIVATE_KEY`

### Production Environment

1. Go to **Settings** → **Environments** → **production**
2. Keep **Required reviewers** enabled
3. Add Coolify webhook secrets
4. Remove EC2 secrets after migration

---

## Comparison: EC2 vs Coolify Deployment

| Aspect              | EC2 (Current)        | Coolify (New)    |
| ------------------- | -------------------- | ---------------- |
| Deployment trigger  | SSH + docker compose | Webhook          |
| Build location      | GHCR (no change)     | GHCR (no change) |
| Zero-downtime       | Manual rolling       | Built-in         |
| SSL management      | Manual/Certbot       | Auto (Traefik)   |
| Rollback            | Manual SSH           | Coolify UI       |
| Logs                | SSH + docker logs    | Coolify UI       |
| Resource monitoring | External tools       | Coolify built-in |

---

## Monitoring and Alerts

### Coolify Built-in Monitoring

Coolify provides:

- Deployment status notifications
- Resource usage graphs
- Container health monitoring
- Deployment history

### Configure Notifications

1. In Coolify, go to **Settings** → **Notifications**
2. Configure channels:
   - **Discord:** Add webhook URL
   - **Slack:** Add webhook URL
   - **Email:** Configure SMTP

### Recommended Alerts

- Deployment failed
- Health check failed
- Container restart
- High resource usage

---

## Rollback Procedure

### Via Coolify UI

1. Go to the service in Coolify
2. Click **Deployments** tab
3. Find previous successful deployment
4. Click **Rollback**

### Via GitHub Actions

```yaml
# Manual rollback workflow
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [staging, production]
      image_tag:
        description: "Image tag to rollback to (e.g., sha-abc1234)"
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - name: Trigger rollback
        run: |
          # Coolify API call to deploy specific version
          curl -X POST "${{ secrets.COOLIFY_API_URL }}/deploy" \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_API_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"image_tag": "${{ github.event.inputs.image_tag }}"}'
```

---

## Troubleshooting

### Webhook Not Triggering

```bash
# Test webhook manually
curl -X POST "https://coolify.sinag.app/api/v1/deploy?uuid=xxx&token=xxx" \
  -H "Content-Type: application/json" \
  -v
```

Check:

1. Webhook URL is correct
2. Coolify server is accessible
3. Token hasn't expired

### Deployment Stuck

1. Check Coolify logs: **Service** → **Logs**
2. Check Traefik logs: `docker logs traefik`
3. Verify Docker registry authentication

### Health Check Failing Post-Deploy

1. Check container is running in Coolify
2. Verify environment variables are set
3. Check service logs for startup errors
4. Verify database/Redis connectivity

---

## Files Changed

| File                                   | Change                        |
| -------------------------------------- | ----------------------------- |
| `.github/workflows/deploy-coolify.yml` | New file - Coolify deployment |
| `.github/workflows/deploy.yml`         | Eventually remove or disable  |

---

## Next Steps

After CI/CD is configured:

1. Test staging deployment end-to-end
2. Run full test suite against staging
3. Proceed to data migration: [04-data-migration-runbook.md](./04-data-migration-runbook.md)
