# Oracle Cloud + Coolify Implementation Guide

> **Target:** Single Oracle VM running Coolify with staging and production environments **Cost:**
> $0/month (Always Free tier) **Time:** 4-6 hours initial setup

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Oracle Cloud Setup](#phase-1-oracle-cloud-setup)
3. [Phase 2: Coolify Installation](#phase-2-coolify-installation)
4. [Phase 3: External Services Setup](#phase-3-external-services-setup)
5. [Phase 4: Deploy SINAG](#phase-4-deploy-sinag)
6. [Phase 5: DNS and SSL](#phase-5-dns-and-ssl)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts

- [ ] Oracle Cloud account (free, no credit card required for Always Free)
- [ ] GitHub account (for repository access)
- [ ] Cloudflare account (for R2 storage and optionally DNS)
- [ ] Neon account (for PostgreSQL)
- [ ] Upstash account (for Redis)

### Required Information

- Domain name (e.g., `sinag.app`)
- SSH key pair (or will generate during setup)
- Current environment variables from existing deployment

### Local Tools

```bash
# Verify you have these installed
ssh -V          # SSH client
git --version   # Git
```

---

## Phase 1: Oracle Cloud Setup

### 1.1 Create Oracle Cloud Account

1. Go to [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
2. Click "Start for free"
3. Complete registration (no credit card required for Always Free resources)
4. Verify email and set up account

### 1.2 Create ARM VM Instance

> **Important:** ARM instances are in high demand. If you get "Out of Host Capacity" errors, try
> different availability domains or retry later.

1. Navigate to **Compute** → **Instances** → **Create Instance**

2. Configure the instance:

   | Setting     | Value                                |
   | ----------- | ------------------------------------ |
   | Name        | `sinag-server`                       |
   | Image       | Ubuntu 22.04 (or 24.04 if available) |
   | Shape       | VM.Standard.A1.Flex (ARM)            |
   | OCPUs       | 4 (maximum free)                     |
   | Memory      | 24 GB (maximum free)                 |
   | Boot volume | 100-200 GB (up to 200GB free)        |

3. **Networking:**
   - Create new VCN or use existing
   - Assign public IP address: Yes
   - Subnet: Public subnet

4. **SSH Keys:**
   - Upload your public key OR
   - Generate new key pair (download and save the private key!)

5. Click **Create**

### 1.3 Configure Security Rules (Firewall)

1. Go to **Networking** → **Virtual Cloud Networks** → your VCN
2. Click on your **Public Subnet** → **Security Lists** → **Default Security List**
3. Add **Ingress Rules**:

   | Source    | Protocol | Port | Description            |
   | --------- | -------- | ---- | ---------------------- |
   | 0.0.0.0/0 | TCP      | 22   | SSH                    |
   | 0.0.0.0/0 | TCP      | 80   | HTTP                   |
   | 0.0.0.0/0 | TCP      | 443  | HTTPS                  |
   | 0.0.0.0/0 | TCP      | 8000 | Coolify UI (temporary) |

### 1.4 Connect to Instance

```bash
# Get the public IP from Oracle Console
ssh -i /path/to/private-key ubuntu@<PUBLIC_IP>

# Verify connection
whoami  # Should output: ubuntu
```

### 1.5 Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl git htop

# Configure Ubuntu firewall (in addition to Oracle security lists)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Verify firewall
sudo iptables -L INPUT -n --line-numbers
```

---

## Phase 2: Coolify Installation

### 2.1 Install Coolify

```bash
# Run Coolify installer (as root or with sudo)
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

This installs:

- Docker
- Docker Compose
- Coolify application
- Traefik (reverse proxy)
- PostgreSQL (for Coolify's internal database)

### 2.2 Access Coolify Dashboard

1. Open browser: `http://<PUBLIC_IP>:8000`
2. Create admin account
3. Complete initial setup wizard

### 2.3 Configure Coolify Settings

1. **Settings** → **Configuration**:
   - Instance FQDN: `coolify.sinag.app` (or your subdomain)
   - Enable auto-updates (recommended)

2. **Settings** → **Servers**:
   - Verify localhost is connected and healthy

### 2.4 Create Environments

Create two environments in Coolify:

1. **Staging Environment:**
   - Name: `sinag-staging`
   - Purpose: Test deployments before production

2. **Production Environment:**
   - Name: `sinag-production`
   - Purpose: Live application

---

## Phase 3: External Services Setup

### 3.1 Neon PostgreSQL

1. Go to [Neon Console](https://console.neon.tech/)
2. Create account / Sign in
3. Create two projects:

   **Staging Database:**

   ```
   Project name: sinag-staging
   Region: US East (or closest to Oracle region)
   ```

   **Production Database:**

   ```
   Project name: sinag-production
   Region: US East (or closest to Oracle region)
   ```

4. For each project, note the connection string:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### 3.2 Cloudflare R2 Storage

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** → **Create bucket**
3. Create two buckets:

   | Bucket     | Name                    |
   | ---------- | ----------------------- |
   | Staging    | `sinag-staging-storage` |
   | Production | `sinag-storage`         |

4. **Create API Token** (for both buckets):
   - Go to **R2** → **Manage R2 API Tokens** → **Create API Token**
   - Permissions: Object Read & Write
   - Specify bucket(s)
   - Save the credentials:
     ```
     Access Key ID: xxxxxxxxxx
     Secret Access Key: xxxxxxxxxx
     Endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
     ```

5. **Enable Public Access** (if needed for public files):
   - Bucket → **Settings** → **Public Access**
   - Enable and note the public URL

### 3.3 Upstash Redis

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create account / Sign in
3. Create two Redis databases:

   **Staging:**

   ```
   Name: sinag-staging-redis
   Region: US-East-1 (closest to your Oracle/Neon region)
   Type: Regional
   ```

   **Production:**

   ```
   Name: sinag-production-redis
   Region: US-East-1
   Type: Regional
   ```

4. For each database, note the connection URL:
   ```
   rediss://default:xxxxxx@us1-xxx.upstash.io:6379
   ```

---

## Phase 4: Deploy SINAG

### 4.1 Add GitHub Repository to Coolify

1. **Sources** → **Add GitHub App**
2. Install Coolify GitHub App on your repository
3. Grant access to `sinag` repository

### 4.2 Create Staging Project

1. **Projects** → **Add Project**
2. Name: `SINAG Staging`
3. Environment: `sinag-staging`

### 4.3 Deploy Backend (FastAPI)

1. In the project, **Add Resource** → **Docker Compose** (or Dockerfile)

2. **Source:** GitHub → `sinag` repository

3. **Build Configuration:**

   ```yaml
   # If using docker-compose
   Build Path: apps/api
   Dockerfile: Dockerfile
   ```

4. **Environment Variables:**

   ```env
   # Database
   DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

   # Cloudflare R2
   R2_ACCOUNT_ID=your_account_id
   R2_ACCESS_KEY_ID=your_access_key
   R2_SECRET_ACCESS_KEY=your_secret_key
   R2_BUCKET_NAME=sinag-staging-storage
   R2_PUBLIC_URL=https://pub-xxx.r2.dev

   # Upstash Redis
   CELERY_BROKER_URL=rediss://default:xxx@us1-xxx.upstash.io:6379
   REDIS_URL=rediss://default:xxx@us1-xxx.upstash.io:6379

   # Application
   ENVIRONMENT=staging
   DEBUG=true
   SECRET_KEY=your-secret-key

   # Gemini (if using AI features)
   GEMINI_API_KEY=your-gemini-key
   ```

5. **Domain:** `api-staging.sinag.app`

6. **Health Check:** `/health`

7. Click **Deploy**

### 4.4 Deploy Frontend (Next.js)

1. **Add Resource** → **Docker Compose** (or Dockerfile)

2. **Build Configuration:**

   ```yaml
   Build Path: apps/web
   Dockerfile: Dockerfile
   ```

3. **Environment Variables:**

   ```env
   NEXT_PUBLIC_API_URL=https://api-staging.sinag.app
   NEXT_PUBLIC_API_V1_URL=https://api-staging.sinag.app/api/v1
   ```

4. **Domain:** `staging.sinag.app`

5. Click **Deploy**

### 4.5 Deploy Celery Workers

1. **Add Resource** → **Docker Compose**

2. **Docker Compose Override:**

   ```yaml
   services:
     celery-worker:
       build:
         context: ./apps/api
         dockerfile: Dockerfile
       command: celery -A app.workers worker --loglevel=info
       environment:
         - DATABASE_URL=${DATABASE_URL}
         - CELERY_BROKER_URL=${CELERY_BROKER_URL}
       restart: unless-stopped
   ```

3. Use same environment variables as backend

### 4.6 Replicate for Production

Repeat steps 4.2-4.5 for production:

- Use production database, R2 bucket, and Redis
- Use production domains (`api.sinag.app`, `sinag.app`)
- Set `ENVIRONMENT=production` and `DEBUG=false`

---

## Phase 5: DNS and SSL

### 5.1 Configure DNS Records

Add these DNS records (at your domain registrar or Cloudflare):

| Type | Name          | Value                | Proxy                     |
| ---- | ------------- | -------------------- | ------------------------- |
| A    | `@`           | `<ORACLE_PUBLIC_IP>` | Off (or Cloudflare proxy) |
| A    | `api`         | `<ORACLE_PUBLIC_IP>` | Off                       |
| A    | `staging`     | `<ORACLE_PUBLIC_IP>` | Off                       |
| A    | `api-staging` | `<ORACLE_PUBLIC_IP>` | Off                       |
| A    | `coolify`     | `<ORACLE_PUBLIC_IP>` | Off                       |

### 5.2 SSL Certificates

Coolify uses Traefik with Let's Encrypt for automatic SSL:

1. In Coolify, go to each service's **Settings**
2. Enable **HTTPS** and **Auto-generate SSL**
3. SSL certificates are automatically provisioned

### 5.3 Verify Deployment

```bash
# Check staging
curl -I https://staging.sinag.app
curl -I https://api-staging.sinag.app/health

# Check production
curl -I https://sinag.app
curl -I https://api.sinag.app/health
```

---

## Environment Variables Summary

### Staging Environment

```env
# Database (Neon)
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/sinag_staging?sslmode=require

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=xxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxx
R2_BUCKET_NAME=sinag-staging-storage
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Redis (Upstash)
CELERY_BROKER_URL=rediss://default:xxx@us1-xxx.upstash.io:6379
REDIS_URL=rediss://default:xxx@us1-xxx.upstash.io:6379

# Application
ENVIRONMENT=staging
DEBUG=true
SECRET_KEY=staging-secret-key-change-me
ALLOWED_HOSTS=staging.sinag.app,api-staging.sinag.app

# Frontend
NEXT_PUBLIC_API_URL=https://api-staging.sinag.app
NEXT_PUBLIC_API_V1_URL=https://api-staging.sinag.app/api/v1
```

### Production Environment

```env
# Database (Neon)
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/sinag_prod?sslmode=require

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=xxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxx
R2_BUCKET_NAME=sinag-storage
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Redis (Upstash)
CELERY_BROKER_URL=rediss://default:xxx@us1-xxx.upstash.io:6379
REDIS_URL=rediss://default:xxx@us1-xxx.upstash.io:6379

# Application
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=production-secret-key-very-secure
ALLOWED_HOSTS=sinag.app,api.sinag.app

# Frontend
NEXT_PUBLIC_API_URL=https://api.sinag.app
NEXT_PUBLIC_API_V1_URL=https://api.sinag.app/api/v1
```

---

## Troubleshooting

### Oracle "Out of Host Capacity" Error

This is common for ARM instances. Solutions:

1. Try different **Availability Domain** (AD1, AD2, AD3)
2. Retry at different times (early morning UTC often works)
3. Use the [OCI Capacity Checker script](https://github.com/hitrov/oci-arm-host-capacity)

```bash
# Automated retry script (run on your local machine)
git clone https://github.com/hitrov/oci-arm-host-capacity
cd oci-arm-host-capacity
# Follow setup instructions
```

### Coolify Installation Fails

```bash
# Check Docker status
sudo systemctl status docker

# Manually install Docker if needed
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Retry Coolify installation
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

### Services Not Starting

```bash
# Check Coolify logs
docker logs coolify -f

# Check Traefik logs
docker logs traefik -f

# Check disk space
df -h

# Check memory
free -h
```

### Database Connection Issues

```bash
# Test Neon connection from server
sudo apt install postgresql-client
psql "postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"

# Common issues:
# - SSL mode not set to 'require'
# - IP not allowlisted (Neon allows all by default)
# - Wrong credentials
```

### Redis Connection Issues

```bash
# Test Upstash connection
redis-cli -u "rediss://default:xxx@us1-xxx.upstash.io:6379" ping
# Should return: PONG

# Common issues:
# - Using 'redis://' instead of 'rediss://' (TLS required)
# - Wrong port (should be 6379)
```

---

## Maintenance

### Updating Coolify

Coolify auto-updates if enabled. Manual update:

```bash
cd /data/coolify
docker compose pull
docker compose up -d
```

### Server Updates

```bash
# Monthly security updates
sudo apt update && sudo apt upgrade -y

# Reboot if kernel updated
sudo reboot
```

### Monitoring

1. **Coolify Dashboard:** Shows deployment status, logs, resource usage
2. **Upstash Dashboard:** Redis metrics and command counts
3. **Neon Dashboard:** Database size, connections, query stats

### Backups

- **Database:** Neon provides point-in-time recovery
- **Files (R2):** Enable versioning in Cloudflare R2
- **Config:** Keep environment variables in a secure vault (not in git)

---

## Next Steps

After completing this setup:

1. Set up CI/CD: [03-ci-cd-integration.md](./03-ci-cd-integration.md)
2. Migrate data: [04-data-migration-runbook.md](./04-data-migration-runbook.md)
3. Test thoroughly before DNS cutover
4. Remove Oracle port 8000 access after Coolify domain is configured
