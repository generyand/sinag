# Server Migration Documentation

> **Decision:** Option 1 - Oracle Cloud Always Free + Coolify ($0/month) **Status:** Implementation
> Ready **Target:** Q1 2026

## Overview

SINAG is migrating from AWS to Oracle Cloud's Always Free tier with Coolify as the self-hosted PaaS.
This provides a completely free, production-ready infrastructure suitable for the project's seasonal
usage pattern (3-4 months/year).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 Oracle Cloud (Always Free)                       │
│                 4 ARM cores, 24GB RAM, 200GB storage             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Coolify (Self-hosted PaaS)              │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  STAGING (staging.sinag.app)                        │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │  │  │
│  │  │  │ Next.js  │ │ FastAPI  │ │  Celery Workers  │    │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────────────┘    │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  PRODUCTION (sinag.app)                             │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │  │  │
│  │  │  │ Next.js  │ │ FastAPI  │ │  Celery Workers  │    │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────────────┘    │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
              │                    │                    │
              ▼                    ▼                    ▼
       ┌──────────┐         ┌──────────┐         ┌──────────┐
       │   Neon   │         │Cloudflare│         │ Upstash  │
       │PostgreSQL│         │    R2    │         │  Redis   │
       │  (Free)  │         │  (Free)  │         │  (Free)  │
       └──────────┘         └──────────┘         └──────────┘
```

## Documentation Index

| Document                                                                     | Description                                         |
| ---------------------------------------------------------------------------- | --------------------------------------------------- |
| [01-overview-and-options.md](./01-overview-and-options.md)                   | Research summary and all hosting options considered |
| [02-oracle-coolify-implementation.md](./02-oracle-coolify-implementation.md) | Step-by-step Oracle Cloud + Coolify setup           |
| [03-ci-cd-integration.md](./03-ci-cd-integration.md)                         | GitHub Actions deployment pipeline                  |
| [04-data-migration-runbook.md](./04-data-migration-runbook.md)               | Database and storage migration commands             |

## Quick Reference

### Services Used

| Service       | Purpose                 | Free Tier                                   |
| ------------- | ----------------------- | ------------------------------------------- |
| Oracle Cloud  | Compute                 | 4 ARM cores, 24GB RAM, 200GB - forever free |
| Coolify       | Container orchestration | Open source, self-hosted                    |
| Neon          | PostgreSQL database     | 0.5GB, scales to zero                       |
| Cloudflare R2 | Object storage          | 10GB, zero egress fees                      |
| Upstash       | Redis for Celery        | 500K commands/month                         |

### Environment URLs

| Environment | URL                       | Branch    |
| ----------- | ------------------------- | --------- |
| Production  | https://sinag.app         | `main`    |
| Staging     | https://staging.sinag.app | `develop` |

### Deployment Flow

```
develop branch → GitHub Actions → Coolify Webhook → staging.sinag.app
main branch    → GitHub Actions → Coolify Webhook → sinag.app
```

## Timeline

| Phase                 | Tasks                      | Duration         |
| --------------------- | -------------------------- | ---------------- |
| 1. Infrastructure     | Oracle VM + Coolify setup  | 1 day            |
| 2. External Services  | Neon, R2, Upstash accounts | 1 day            |
| 3. Staging Deploy     | Deploy to staging, test    | 1-2 days         |
| 4. Data Migration     | Migrate database and files | 1 day            |
| 5. Production Go-Live | DNS cutover, monitoring    | 1 day            |
| 6. Cleanup            | Remove AWS resources       | After validation |

**Total estimated time: 5-7 days**

## Cost Summary

| Component                 | Monthly | Annual |
| ------------------------- | ------- | ------ |
| Oracle Cloud              | $0      | $0     |
| Neon (Free tier)          | $0      | $0     |
| Cloudflare R2 (Free tier) | $0      | $0     |
| Upstash (Free tier)       | $0      | $0     |
| **Total**                 | **$0**  | **$0** |
