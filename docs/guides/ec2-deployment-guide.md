# EC2 Deployment Guide

This guide walks you through deploying SINAG to AWS EC2 using GitHub Actions for automated, secure
deployments.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GitHub                                        │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │  Push to main   │───▶│  Build Images   │───▶│  Deploy to EC2 │  │
│  └─────────────────┘    │  (GHCR)         │    │  (via SSH)     │  │
│                         └─────────────────┘    └───────┬────────┘  │
│                                                         │           │
│  Secrets: SECRET_KEY, DATABASE_URL, etc.               │           │
│  Variables: NEXT_PUBLIC_API_URL                        │           │
└─────────────────────────────────────────────────────────┼───────────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         EC2 Instance                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │   Nginx   │  │  Next.js  │  │  FastAPI  │  │  Celery   │       │
│  │  :80/443  │  │   :3000   │  │   :8000   │  │  worker   │       │
│  └─────┬─────┘  └───────────┘  └───────────┘  └───────────┘       │
│        │                              │              │              │
│        └──────────────────────────────┴──────────────┘              │
│                              │                                       │
│                        ┌─────┴─────┐                                │
│                        │   Redis   │                                │
│                        └───────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                        ┌───────────────┐
                        │   Supabase    │
                        │  (PostgreSQL) │
                        └───────────────┘
```

## Prerequisites

- GitHub account (Student Developer Pack recommended)
- AWS account with EC2 access
- Supabase account (free tier works)

---

## Step 1: Create EC2 Instance

### 1.1 Launch Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Configure:
   - **Name**: `sinag-production`
   - **AMI**: Amazon Linux 2023
   - **Instance type**: `t2.medium` (2 vCPU, 4GB RAM)
   - **Key pair**: Create new → Download `.pem` file
   - **Security Group**:
     - SSH (22) - Your IP only
     - HTTP (80) - Anywhere
     - HTTPS (443) - Anywhere

3. Launch and note your **Public IPv4 address**

### 1.2 Initial EC2 Setup

SSH into your instance:

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
```

Run the setup script:

```bash
# Install Docker and dependencies
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/sinag/main/scripts/setup-ec2.sh | bash

# IMPORTANT: Logout and login again for Docker permissions
exit
```

SSH back in and clone the repo:

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# Clone repository
git clone https://github.com/YOUR_USERNAME/sinag.git ~/sinag
```

---

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → Create new project
2. Get credentials from **Project Settings → API**:

| Credential                  | Location      |
| --------------------------- | ------------- |
| `SUPABASE_URL`              | Project URL   |
| `SUPABASE_ANON_KEY`         | anon / public |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role  |

3. Get database URL from **Project Settings → Database → Connection string → URI**
   - Use the **Transaction pooler** (port 6543)

---

## Step 3: Configure GitHub Secrets & Variables

Go to your GitHub repo → **Settings → Environments**

> **Note**: SINAG uses GitHub Environments for environment-specific configuration. You need to
> create two environments: `staging` and `production`. Each environment has its own secrets and
> variables.

### Create Environments

1. Go to **Settings → Environments**
2. Click **"New environment"** → Name it `staging` → **Configure environment**
3. Repeat for `production`

### Environment Secrets (Required)

For **each environment** (staging and production), add these secrets:

| Secret Name                      | Value                        | How to Get                                                           |
| -------------------------------- | ---------------------------- | -------------------------------------------------------------------- |
| `EC2_HOST`                       | Your EC2 public IP           | AWS Console                                                          |
| `EC2_USER`                       | `ec2-user`                   | Default for Amazon Linux                                             |
| `EC2_SSH_PRIVATE_KEY`            | Contents of your `.pem` file | `cat your-key.pem`                                                   |
| `SECRET_KEY`                     | Random string                | Run: `python3 -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `FIRST_SUPERUSER_PASSWORD`       | Secure password (12+ chars)  | Run: `python3 -c "import secrets; print(secrets.token_urlsafe(16))"` |
| `EXTERNAL_USER_DEFAULT_PASSWORD` | Secure password              | Run: `python3 -c "import secrets; print(secrets.token_urlsafe(16))"` |
| `DATABASE_URL`                   | PostgreSQL connection string | Supabase Dashboard                                                   |
| `SUPABASE_URL`                   | `https://xxx.supabase.co`    | Supabase Dashboard                                                   |
| `SUPABASE_ANON_KEY`              | `eyJ...`                     | Supabase Dashboard                                                   |
| `SUPABASE_SERVICE_ROLE_KEY`      | `eyJ...`                     | Supabase Dashboard                                                   |
| `GEMINI_API_KEY`                 | Your Gemini API key          | [Google AI Studio](https://makersuite.google.com/app/apikey)         |

### Environment Variables (Required)

For **each environment** (staging and production), add these variables under the **"Environment
variables"** section:

| Variable Name                   | Value                       | Notes                                     |
| ------------------------------- | --------------------------- | ----------------------------------------- |
| `NEXT_PUBLIC_API_URL`           | `http://YOUR_EC2_IP`        | Your EC2 public IP                        |
| `NEXT_PUBLIC_API_V1_URL`        | `http://YOUR_EC2_IP/api/v1` | API v1 endpoint                           |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://xxx.supabase.co`   | Same as SUPABASE_URL (from Supabase)      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...`                    | Same as SUPABASE_ANON_KEY (from Supabase) |

> **Important**: `NEXT_PUBLIC_*` variables are baked into the frontend at **build time**, not
> runtime. These must be set as **Variables** (not Secrets) so they can be embedded in the
> JavaScript bundle. The anon key is safe to expose - it's designed to be public (RLS policies
> protect your data).

---

## Step 4: Deploy

### Automatic Deployment

Push to `main` branch → GitHub Actions automatically:

1. Builds Docker images
2. Pushes to GHCR
3. Deploys to EC2

### Manual Deployment

1. Go to **Actions** tab
2. Select **"Deploy to EC2"**
3. Click **"Run workflow"**
4. Check **"Run database migrations"** if needed
5. Click **"Run workflow"**

### First Deployment

For the first deployment, you need to run migrations:

1. Go to **Actions → Deploy to EC2 → Run workflow**
2. ✅ Check "Run database migrations"
3. Run workflow

---

## Step 5: Verify Deployment

Open in browser: `http://YOUR_EC2_IP`

Check API: `http://YOUR_EC2_IP/docs`

---

## Workflows

### Build Workflow (`.github/workflows/build-and-push.yml`)

**Triggers**: Push to `main`, tags `v*`, manual

**Does**:

- Builds `sinag-api`, `sinag-web`, `sinag-nginx` images
- Pushes to GitHub Container Registry
- Tags with `latest`, version, and SHA

### Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers**: After successful build, manual

**Does**:

- SSHs into EC2
- Creates `.env` from GitHub Secrets
- Pulls latest images
- Starts containers
- Runs migrations (if requested)
- Health check

---

## Common Commands (on EC2)

```bash
cd ~/sinag

# View running containers
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f api

# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop all services
docker compose -f docker-compose.prod.yml down

# Run migrations manually
docker compose -f docker-compose.prod.yml exec api alembic upgrade head

# Pull latest images manually
docker compose -f docker-compose.prod.yml pull
```

---

## Troubleshooting

### Deployment Failed - SSH Error

- Check `EC2_SSH_PRIVATE_KEY` secret contains the full `.pem` file content
- Check `EC2_HOST` is the correct IP
- Check EC2 security group allows SSH from GitHub IPs

### Containers Not Starting

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check if .env was created
cat .env
```

### Database Connection Error

- Verify `DATABASE_URL` uses pooler (port 6543)
- Check Supabase project is active
- Verify credentials are correct

### Images Not Pulling

```bash
# Check GHCR login
docker login ghcr.io -u YOUR_GITHUB_USERNAME

# Manually pull
docker pull ghcr.io/YOUR_USERNAME/sinag/sinag-api:latest
```

### Frontend Error: "supabaseUrl is required"

This error means `NEXT_PUBLIC_SUPABASE_URL` was not set during the Docker build.

**Cause**: `NEXT_PUBLIC_*` variables are baked into the JavaScript at build time, not runtime.

**Solution**:

1. Go to **Settings → Environments → staging** (or production)
2. Under **"Environment variables"**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://your-project.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
3. **Rebuild the image** - push to the branch or manually trigger the Build workflow
4. Redeploy to EC2

> **Note**: Adding these to the EC2 `.env` file won't work because the frontend doesn't read
> environment variables at runtime. They must be set during the GitHub Actions build.

---

## Security Notes

✅ **What's Secure**:

- Secrets stored in GitHub (encrypted)
- SSH key never exposed in logs
- `.env` auto-generated, not committed to git
- GHCR images are private by default

⚠️ **Recommendations**:

- Restrict EC2 SSH to your IP only
- Enable HTTPS with Let's Encrypt
- Rotate secrets periodically
- Keep GitHub repo private if using sensitive data

---

## Cost Estimate

| Resource       | Free Tier                | After Free Tier       |
| -------------- | ------------------------ | --------------------- |
| EC2 t2.micro   | 750 hrs/month (1st year) | ~$8/month             |
| EC2 t2.medium  | ❌                       | ~$33/month            |
| GHCR           | Unlimited (public)       | Free with Pro         |
| Supabase       | 500MB, 2 projects        | $25/month             |
| GitHub Actions | 2,000 mins/month         | Free for public repos |

**Tip**: Use `t2.micro` for testing, `t2.medium` for demos.
