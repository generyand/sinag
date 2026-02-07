# Server Migration: Overview and Options

> **Status:** Decision Made - Option 1 (Oracle + Coolify) Selected **Created:** January 2026
> **Purpose:** Research document outlining all hosting options considered

This document contains the research and comparison of all hosting options. For implementation
details, see [02-oracle-coolify-implementation.md](./02-oracle-coolify-implementation.md).

## Background

SINAG is a governance assessment platform used seasonally (3-4 months/year). The current AWS
infrastructure is too expensive for student maintainers. This document outlines free and affordable
alternatives with recurring credits.

### Current Stack (Containerized)

- **Backend:** FastAPI + Celery workers
- **Frontend:** Next.js 16
- **Database:** Supabase PostgreSQL
- **Storage:** Supabase Storage (buckets)
- **Cache/Broker:** Redis (for Celery)

### Requirements

| Requirement        | Priority | Notes                                   |
| ------------------ | -------- | --------------------------------------- |
| Free or very cheap | High     | Student budget constraints              |
| Recurring credits  | High     | Not one-time trials                     |
| No database pause  | High     | Supabase pauses after 7 days inactivity |
| Container support  | High     | Services are already containerized      |
| Seasonal billing   | Medium   | Only pay for 3-4 months of use          |

---

## Recommended Architecture Options

### Option 1: Oracle Cloud Always Free + Coolify (RECOMMENDED - $0/month)

**Best for:** Long-term free hosting with generous resources

| Component         | Service                  | Free Tier Details                                       |
| ----------------- | ------------------------ | ------------------------------------------------------- |
| **Compute**       | Oracle Cloud Always Free | 4 ARM cores, 24GB RAM, 200GB storage - **forever free** |
| **Orchestration** | Coolify                  | Self-hosted PaaS (open-source, Heroku-like DX)          |
| **Database**      | Neon                     | 0.5GB storage, scales to zero (no pause!)               |
| **Storage**       | Cloudflare R2            | 10GB free + **zero egress fees**                        |
| **Redis**         | Upstash                  | 500K commands/month free (serverless)                   |

**Architecture Diagram:**

```
┌─────────────────────────────────────────────────────────┐
│                 Oracle Cloud (Free Tier)                │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Coolify (Self-hosted PaaS)          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │   │
│  │  │ Next.js  │ │ FastAPI  │ │  Celery Workers  │ │   │
│  │  │ Frontend │ │ Backend  │ │  (Background)    │ │   │
│  │  └──────────┘ └──────────┘ └──────────────────┘ │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
           │              │              │
           ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │   Neon   │   │Cloudflare│   │ Upstash  │
    │PostgreSQL│   │    R2    │   │  Redis   │
    │  (Free)  │   │ (Free)   │   │  (Free)  │
    └──────────┘   └──────────┘   └──────────┘
```

**Pros:**

- Completely free indefinitely
- 4 ARM cores + 24GB RAM handles SINAG easily
- Coolify provides Heroku-like deployment experience
- No pause on inactivity for any service
- Full control over infrastructure

**Cons:**

- Oracle Cloud ARM VMs can be hard to provision ("Out of Host Capacity" errors)
- Requires initial server setup (~2-3 hours)
- Self-managed infrastructure (updates, security)

**Resources:**

- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [Oracle Always Free Resources Docs](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Coolify Documentation](https://coolify.io/docs/get-started/introduction)

---

### Option 2: GitHub Student Pack + Managed Services (~$0-5/month)

**Best for:** Students with verified .edu email wanting managed infrastructure

| Component    | Service                | Student Benefit                            |
| ------------ | ---------------------- | ------------------------------------------ |
| **Compute**  | Heroku                 | $13/month for 24 months ($312 total value) |
| **Database** | Neon or MongoDB Atlas  | Free tier or $200 credits                  |
| **Storage**  | Cloudflare R2          | 10GB free                                  |
| **Redis**    | Heroku Key-Value Store | Included in Heroku credits                 |
| **Extras**   | DigitalOcean           | $200 credits                               |
| **Extras**   | Microsoft Azure        | $100 credits                               |

**Heroku $13/month breakdown:**

- Eco Dynos ($5) - containers
- Mini Postgres ($5) - database (or use Neon free)
- Mini Key-Value Store ($3) - Redis for Celery

**Pros:**

- Fully managed, zero DevOps
- Great for students with verified .edu email
- Credits last 24 months
- Easy deployment with Git push
- Multiple backup credit sources

**Cons:**

- Credits eventually expire (24 months)
- Need to verify student status annually
- Heroku free tier pauses (but paid Eco doesn't)

**Resources:**

- [GitHub Student Developer Pack](https://education.github.com/pack)
- [Heroku Student Offer](https://www.heroku.com/github-students/)
- [Cloud Credits in Student Pack](https://education.github.com/pack?sort=popularity&tag=Cloud)

---

### Option 3: Hetzner + Coolify (~€22/year for 4 months)

**Best for:** Best price/performance ratio with seasonal billing

| Component         | Service       | Cost                                    |
| ----------------- | ------------- | --------------------------------------- |
| **Compute**       | Hetzner CX33  | €5.49/month (4 vCPU, 8GB RAM, 80GB SSD) |
| **Orchestration** | Coolify       | Free (self-hosted)                      |
| **Database**      | Neon          | Free tier (0.5GB)                       |
| **Storage**       | Cloudflare R2 | Free (10GB)                             |
| **Redis**         | Upstash       | Free (500K commands/month)              |

**Seasonal Cost Calculation:**

- Active months (4): €5.49 × 4 = €21.96/year
- Delete server during inactive 8 months = €0
- **Total: ~€22/year**

**Hetzner Plans (January 2026):**

| Plan | vCPU | RAM  | Storage | Price        |
| ---- | ---- | ---- | ------- | ------------ |
| CX23 | 2    | 4GB  | 40GB    | €3.49/month  |
| CX33 | 4    | 8GB  | 80GB    | €5.49/month  |
| CX43 | 8    | 16GB | 160GB   | €14.99/month |

**Pros:**

- Excellent performance-to-cost ratio
- EU data centers (GDPR compliant)
- 20TB included traffic
- Hourly billing - delete when not needed
- Docker pre-installed option

**Cons:**

- Need to manage server setup
- Must remember to delete/recreate seasonally
- Not free (but very cheap)

**Resources:**

- [Hetzner Cloud VPS](https://www.hetzner.com/cloud/)
- [Hetzner European Cloud](https://www.hetzner.com/european-cloud/)

---

### Option 4: Railway/Render Hobby Tier (~$5/month)

**Best for:** Simplest setup with minimal DevOps

| Component    | Service           | Cost                                |
| ------------ | ----------------- | ----------------------------------- |
| **Compute**  | Railway or Render | $5/month (includes $5 usage credit) |
| **Database** | Neon              | Free                                |
| **Storage**  | Cloudflare R2     | Free                                |
| **Redis**    | Upstash           | Free                                |

**Railway vs Render:**

| Feature            | Railway                      | Render                        |
| ------------------ | ---------------------------- | ----------------------------- |
| Free credit        | $5/month                     | 750 hours/month               |
| Sleep behavior     | Sleeps when credit exhausted | Sleeps after 15min inactivity |
| GitHub integration | Excellent                    | Excellent                     |
| Docker support     | Yes                          | Yes                           |

**Pros:**

- Extremely easy deployment
- Great developer experience
- GitHub integration built-in
- ~500 compute hours per month

**Cons:**

- $5/month even during inactive periods (unless you delete)
- May need to manually manage during off-season

**Resources:**

- [Railway Pricing](https://railway.com/pricing)
- [Render Pricing](https://render.com/pricing)

---

## Service Comparison Tables

### Database Options (PostgreSQL)

| Service     | Free Storage | Pause Behavior                | Recommendation       |
| ----------- | ------------ | ----------------------------- | -------------------- |
| **Neon**    | 0.5GB        | Scales to zero (instant wake) | **RECOMMENDED**      |
| Xata        | 15GB         | Never pauses                  | Good alternative     |
| Supabase    | 500MB        | Pauses after 7 days           | Not recommended      |
| PlanetScale | None         | N/A                           | No free tier anymore |

**Why Neon:**

- "Scales to zero" means the database is always accessible
- Instant cold start (no waiting)
- PostgreSQL compatible (same as current Supabase)
- Generous free tier for small projects

**Resources:**

- [Neon Plans](https://neon.com/docs/introduction/plans)
- [Xata Free Tier](https://xata.io/blog/postgres-free-tier)

---

### Object Storage Options (Supabase Storage Replacement)

| Service           | Free Storage | Free Egress   | S3 Compatible |
| ----------------- | ------------ | ------------- | ------------- |
| **Cloudflare R2** | 10GB         | **Unlimited** | Yes           |
| Backblaze B2      | None ($6/TB) | Free via CDN  | Yes           |
| Supabase Storage  | 1GB          | 2GB/month     | No            |
| MinIO             | Self-hosted  | N/A           | Yes           |

**Why Cloudflare R2:**

- 10GB free storage
- **Zero egress fees** (huge savings)
- S3-compatible API (easy migration)
- Global CDN included

**Free tier details:**

- Storage: 10GB/month
- Class A operations (writes): 1 million/month
- Class B operations (reads): 10 million/month
- Egress: **Unlimited and free**

**Resources:**

- [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/)

---

### Redis/Message Broker Options

| Service     | Free Tier           | Serverless | Celery Compatible |
| ----------- | ------------------- | ---------- | ----------------- |
| **Upstash** | 500K commands/month | Yes        | Yes               |
| Redis Cloud | 30MB                | No         | Yes               |
| Self-hosted | Free (on VPS)       | No         | Yes               |

**Why Upstash:**

- 500K commands/month free
- Serverless (pay per use)
- Works with Celery
- HTTP API for edge functions

**Resources:**

- [Upstash Pricing](https://upstash.com/blog/redis-new-pricing)

---

## Migration Checklist

### Phase 1: Preparation

- [ ] Backup current Supabase database
- [ ] Export file inventory from Supabase Storage
- [ ] Document all environment variables
- [ ] Test containers locally with new service URLs

### Phase 2: Set Up New Infrastructure

#### Option 1 (Oracle + Coolify):

- [ ] Create Oracle Cloud account
- [ ] Provision ARM VM (may take multiple attempts due to capacity)
- [ ] Install Coolify on Oracle VM
- [ ] Configure firewall rules (ports 80, 443, 22)

#### Option 2 (GitHub Student Pack):

- [ ] Verify student status on GitHub
- [ ] Claim Heroku credits
- [ ] Set up Heroku app with Docker deployment

#### Option 3 (Hetzner):

- [ ] Create Hetzner Cloud account
- [ ] Provision CX33 (or CX23) server
- [ ] Install Coolify
- [ ] Configure firewall

### Phase 3: Database Migration

- [ ] Create Neon account and project
- [ ] Export from Supabase: `pg_dump`
- [ ] Import to Neon: `psql`
- [ ] Verify data integrity
- [ ] Update `DATABASE_URL` in environment

### Phase 4: Storage Migration

- [ ] Create Cloudflare account
- [ ] Set up R2 bucket
- [ ] Install rclone for migration
- [ ] Migrate files from Supabase Storage to R2
- [ ] Update storage URLs in application
- [ ] Update `SUPABASE_URL` references to R2

### Phase 5: Redis Migration

- [ ] Create Upstash account
- [ ] Create Redis database
- [ ] Update `CELERY_BROKER_URL` to Upstash URL
- [ ] Update `REDIS_URL` if used elsewhere
- [ ] Test Celery task execution

### Phase 6: Deploy Application

- [ ] Deploy containers via Coolify/Heroku/Railway
- [ ] Configure environment variables
- [ ] Set up SSL certificates (Coolify does this automatically)
- [ ] Configure custom domain (if applicable)

### Phase 7: Verification

- [ ] Test all API endpoints
- [ ] Test file upload/download
- [ ] Test Celery background tasks
- [ ] Test authentication flow
- [ ] Monitor for 24-48 hours

### Phase 8: Cleanup

- [ ] Disable/delete old AWS resources
- [ ] Update DNS records
- [ ] Document new infrastructure in README
- [ ] Update CI/CD pipelines if applicable

---

## Environment Variable Changes

```bash
# Before (Supabase + AWS)
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
CELERY_BROKER_URL=redis://localhost:6379/0

# After (Neon + R2 + Upstash)
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb
NEON_DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb

# Cloudflare R2 (S3-compatible)
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=sinag-storage
R2_PUBLIC_URL=https://xxx.r2.cloudflarestorage.com

# Upstash Redis
CELERY_BROKER_URL=rediss://default:xxx@xxx.upstash.io:6379
UPSTASH_REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379
```

---

## Cost Summary

| Option              | Monthly Cost | Annual Cost (4 months) | Complexity |
| ------------------- | ------------ | ---------------------- | ---------- |
| Oracle + Coolify    | **$0**       | **$0**                 | Medium     |
| GitHub Student Pack | $0-5         | $0-60                  | Easy       |
| Hetzner + Coolify   | €5.49        | ~€22                   | Medium     |
| Railway/Render      | $5           | $60                    | Easy       |

---

## Decision Matrix

| Criteria            | Oracle | Student Pack | Hetzner | Railway |
| ------------------- | ------ | ------------ | ------- | ------- |
| Cost                | ★★★★★  | ★★★★☆        | ★★★★☆   | ★★★☆☆   |
| Ease of Setup       | ★★★☆☆  | ★★★★★        | ★★★☆☆   | ★★★★★   |
| Reliability         | ★★★★☆  | ★★★★☆        | ★★★★★   | ★★★★☆   |
| Scalability         | ★★★★☆  | ★★★☆☆        | ★★★★★   | ★★★☆☆   |
| Long-term Viability | ★★★★★  | ★★★☆☆        | ★★★★★   | ★★★★☆   |

**Recommendation:** Start with **Option 1 (Oracle + Coolify)** for $0/month. If Oracle has capacity
issues, fall back to **Option 3 (Hetzner)** at ~€22/year.

---

## References

### Compute & Hosting

- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [Oracle Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Coolify - Self-hosted PaaS](https://coolify.io/)
- [Hetzner Cloud](https://www.hetzner.com/cloud/)
- [Railway](https://railway.com/)
- [Render](https://render.com/)
- [GitHub Student Developer Pack](https://education.github.com/pack)

### Database

- [Neon PostgreSQL](https://neon.com/)
- [Xata](https://xata.io/)
- [Supabase Pause Prevention Workaround](https://github.com/travisvn/supabase-pause-prevention)

### Storage

- [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/)
- [Backblaze B2](https://www.backblaze.com/cloud-storage)

### Redis

- [Upstash](https://upstash.com/)

### Comparisons & Guides

- [Top 7 Free Deployment Services 2025](https://blogs.kuberns.com/post/top-7-free-deployment-services-for-2025-compared-with-pricing--features/)
- [Serverless PostgreSQL 2025 Comparison](https://dev.to/dataformathub/serverless-postgresql-2025-the-truth-about-supabase-neon-and-planetscale-7lf)
- [Cheap Object Storage Providers](https://sliplane.io/blog/5-cheap-object-storage-providers)
