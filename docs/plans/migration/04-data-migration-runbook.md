# Data Migration Runbook

> **Purpose:** Step-by-step commands for migrating data from Supabase to new infrastructure
> **Estimated Time:** 2-4 hours (depending on data volume) **Prerequisites:** New services (Neon,
> R2, Upstash) already provisioned

## Pre-Migration Checklist

- [ ] Staging environment fully deployed and tested (empty)
- [ ] Neon databases created (staging + production)
- [ ] Cloudflare R2 buckets created (staging + production)
- [ ] Upstash Redis instances created (staging + production)
- [ ] Backup of current production data
- [ ] Maintenance window communicated (if applicable)

---

## Phase 1: Database Migration (Supabase → Neon)

### 1.1 Get Supabase Connection Details

From your Supabase dashboard:

1. Go to **Settings** → **Database**
2. Find the **Connection string** (URI format)
3. Note: Use the **direct connection** (port 5432), not the pooler

```bash
# Example Supabase connection string
SUPABASE_DB_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

### 1.2 Get Neon Connection Details

From your Neon dashboard:

1. Go to your project
2. Click **Connection Details**
3. Copy the connection string

```bash
# Example Neon connection string
NEON_DB_URL="postgresql://[user]:[password]@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### 1.3 Export Database from Supabase

```bash
# Install PostgreSQL client if not available
# Ubuntu/Debian
sudo apt install postgresql-client

# macOS
brew install postgresql

# Set environment variables
export SUPABASE_DB_URL="postgresql://postgres.[ref]:[pass]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Export schema and data
pg_dump "$SUPABASE_DB_URL" \
  --no-owner \
  --no-privileges \
  --no-comments \
  --clean \
  --if-exists \
  -f sinag_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh sinag_backup_*.sql
head -100 sinag_backup_*.sql  # Check first 100 lines
```

### 1.4 Import Database to Neon

```bash
# Set Neon connection
export NEON_DB_URL="postgresql://[user]:[pass]@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Import the backup
psql "$NEON_DB_URL" -f sinag_backup_*.sql

# Verify import
psql "$NEON_DB_URL" -c "\dt"  # List tables
psql "$NEON_DB_URL" -c "SELECT COUNT(*) FROM users;"  # Sample count
```

### 1.5 Run Pending Migrations

```bash
# From your local machine or CI
cd apps/api
DATABASE_URL="$NEON_DB_URL" alembic upgrade head

# Verify migration status
DATABASE_URL="$NEON_DB_URL" alembic current
```

### 1.6 Verify Data Integrity

```bash
# Connect and run verification queries
psql "$NEON_DB_URL" <<EOF
-- Check table counts
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'assessments', COUNT(*) FROM assessments
UNION ALL
SELECT 'assessment_responses', COUNT(*) FROM assessment_responses
UNION ALL
SELECT 'barangays', COUNT(*) FROM barangays;

-- Check recent data
SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 5;
SELECT id, status, created_at FROM assessments ORDER BY created_at DESC LIMIT 5;
EOF
```

---

## Phase 2: File Storage Migration (Supabase Storage → Cloudflare R2)

### 2.1 Install Required Tools

```bash
# Install rclone (cross-platform file sync)
curl https://rclone.org/install.sh | sudo bash

# Verify installation
rclone version

# Install AWS CLI (for S3-compatible operations)
# Ubuntu/Debian
sudo apt install awscli

# macOS
brew install awscli
```

### 2.2 Configure Supabase Storage Access

Get your Supabase storage credentials:

1. Go to **Settings** → **API**
2. Note the `service_role` key (for full access)
3. Your storage URL is: `https://[project-ref].supabase.co/storage/v1`

```bash
# Configure rclone for Supabase
rclone config

# Choose: n (new remote)
# Name: supabase
# Storage: s3
# Provider: Other
# env_auth: false
# access_key_id: <your-supabase-access-key>
# secret_access_key: <your-service-role-key>
# endpoint: https://[project-ref].supabase.co/storage/v1/s3
# Leave other options as default
```

Alternative: Use Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# List buckets
supabase storage ls --project-ref [project-ref]
```

### 2.3 Configure Cloudflare R2 Access

From Cloudflare dashboard:

1. Go to **R2** → **Manage R2 API Tokens**
2. Create token with **Object Read & Write** permissions
3. Note: Account ID, Access Key ID, Secret Access Key

```bash
# Configure rclone for R2
rclone config

# Choose: n (new remote)
# Name: r2
# Storage: s3
# Provider: Cloudflare
# env_auth: false
# access_key_id: <R2-access-key-id>
# secret_access_key: <R2-secret-access-key>
# endpoint: https://<account-id>.r2.cloudflarestorage.com
# Leave other options as default
```

### 2.4 List and Verify Source Files

```bash
# List Supabase buckets
rclone lsd supabase:

# List files in a specific bucket
rclone ls supabase:mov-files --max-depth 1

# Count files
rclone size supabase:mov-files
```

### 2.5 Sync Files to R2

```bash
# Dry run first (shows what would be copied)
rclone sync supabase:mov-files r2:sinag-storage/mov-files --dry-run -P

# If dry run looks good, perform actual sync
rclone sync supabase:mov-files r2:sinag-storage/mov-files -P --transfers 10

# Repeat for other buckets
rclone sync supabase:assessor-documents r2:sinag-storage/assessor-documents -P --transfers 10
```

### 2.6 Verify R2 Migration

```bash
# List R2 contents
rclone ls r2:sinag-storage

# Compare sizes
echo "Supabase:"
rclone size supabase:mov-files

echo "R2:"
rclone size r2:sinag-storage/mov-files

# Verify specific files
rclone check supabase:mov-files r2:sinag-storage/mov-files
```

### 2.7 Update Application Storage URLs

After migration, update the application to use R2:

**Old (Supabase Storage):**

```python
STORAGE_URL = "https://[project].supabase.co/storage/v1/object/public"
```

**New (Cloudflare R2):**

```python
R2_PUBLIC_URL = "https://pub-[id].r2.dev"  # or custom domain
```

Database URL updates (if URLs are stored in DB):

```sql
-- Update file URLs in database (if stored as full URLs)
UPDATE assessment_movs
SET file_url = REPLACE(file_url,
  'https://[project].supabase.co/storage/v1/object/public',
  'https://pub-[id].r2.dev'
)
WHERE file_url LIKE '%supabase.co%';
```

---

## Phase 3: Redis Migration (Current → Upstash)

### 3.1 Redis Data Considerations

For SINAG, Redis is used for:

- Celery task broker (task queue)
- Celery result backend (task results)
- Caching (if any)

**Important:** Celery task data is typically ephemeral. A clean Redis start is usually fine.

### 3.2 Option A: Clean Start (Recommended)

For most cases, start with empty Redis:

1. Update `CELERY_BROKER_URL` to Upstash
2. Deploy application
3. Any pending tasks will need to be re-triggered

```bash
# Verify Upstash connection
redis-cli -u "rediss://default:xxx@us1-xxx.upstash.io:6379" ping
# Should return: PONG
```

### 3.3 Option B: Migrate Redis Data (If Needed)

If you have critical data in Redis that must be preserved:

```bash
# Install redis-tools
sudo apt install redis-tools

# Export from current Redis
redis-cli -h current-redis-host -p 6379 --rdb dump.rdb

# Note: Upstash doesn't support RDB import directly
# You'd need to replay commands or use migration tools

# Alternative: Use RIOT (Redis Input/Output Tools)
# https://github.com/redis-developer/riot
```

### 3.4 Verify Upstash Connection

```bash
# Test connection
redis-cli -u "rediss://default:xxx@us1-xxx.upstash.io:6379" ping

# Check info
redis-cli -u "rediss://default:xxx@us1-xxx.upstash.io:6379" info

# Test Celery broker (from application server)
cd apps/api
CELERY_BROKER_URL="rediss://default:xxx@us1-xxx.upstash.io:6379" \
  celery -A app.workers inspect ping
```

---

## Phase 4: Application Configuration

### 4.1 Update Environment Variables

Create the new `.env` file with migrated services:

```bash
# Database (Neon)
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=sinag-storage
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Redis (Upstash)
CELERY_BROKER_URL=rediss://default:xxx@us1-xxx.upstash.io:6379
REDIS_URL=rediss://default:xxx@us1-xxx.upstash.io:6379

# Remove Supabase variables (no longer needed)
# SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...
# SUPABASE_ANON_KEY=...
```

### 4.2 Update Application Code (If Needed)

Check if any code directly references Supabase:

```bash
# Search for Supabase references
grep -r "supabase" apps/api/app/ --include="*.py"
grep -r "SUPABASE" apps/api/app/ --include="*.py"
```

Update storage client initialization if using Supabase client directly.

---

## Phase 5: Verification Checklist

### Database Verification

```bash
# Run from application with new DATABASE_URL
cd apps/api

# Test connection
python -c "from app.db.session import engine; print(engine.connect())"

# Run a simple query via the API
curl http://localhost:8000/api/v1/health
```

### Storage Verification

```bash
# Test file upload
curl -X POST "http://localhost:8000/api/v1/files/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf"

# Test file download
curl "http://localhost:8000/api/v1/files/download/test-file-id"
```

### Celery Verification

```bash
# Check worker connection
celery -A app.workers inspect ping

# Trigger a test task
curl -X POST "http://localhost:8000/api/v1/tasks/test"

# Check task status
celery -A app.workers inspect active
```

### End-to-End Verification

- [ ] User can log in
- [ ] User can view assessments
- [ ] User can upload MOV files
- [ ] User can download files
- [ ] Background tasks execute
- [ ] AI features work (if enabled)

---

## Rollback Procedure

If migration fails, rollback to original infrastructure:

### Database Rollback

```bash
# Point DATABASE_URL back to Supabase
export DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Redeploy with old config
```

### Storage Rollback

Storage files are not deleted from Supabase during migration. Simply revert the `STORAGE_URL`
configuration.

### Redis Rollback

Update `CELERY_BROKER_URL` back to original Redis.

---

## Post-Migration Cleanup

After successful migration and 1-2 weeks of monitoring:

### 1. Supabase Cleanup

- [ ] Export final backup for archive
- [ ] Delete or pause Supabase project (to avoid charges)
- [ ] Document decommissioning date

### 2. AWS Cleanup

- [ ] Terminate EC2 instances
- [ ] Delete EBS volumes
- [ ] Remove security groups
- [ ] Cancel reserved instances (if any)
- [ ] Delete S3 buckets (if any)
- [ ] Remove IAM users/roles

### 3. DNS Cleanup

- [ ] Remove old DNS records pointing to AWS
- [ ] Update documentation with new IPs

### 4. Secrets Cleanup

- [ ] Remove old secrets from GitHub
- [ ] Update password vault
- [ ] Revoke old API keys

---

## Migration Timeline Template

| Day | Time  | Task                        | Owner     |
| --- | ----- | --------------------------- | --------- |
| D-7 | -     | Announce maintenance window | Team Lead |
| D-3 | -     | Final staging test          | DevOps    |
| D-1 | -     | Create fresh backups        | DevOps    |
| D   | 00:00 | Enable maintenance mode     | DevOps    |
| D   | 00:15 | Export database             | DevOps    |
| D   | 00:45 | Import to Neon              | DevOps    |
| D   | 01:00 | Sync files to R2            | DevOps    |
| D   | 01:30 | Update configs, deploy      | DevOps    |
| D   | 02:00 | Run verification tests      | QA        |
| D   | 02:30 | DNS cutover                 | DevOps    |
| D   | 03:00 | Disable maintenance mode    | DevOps    |
| D   | 03:00 | Monitor                     | All       |
| D+1 | -     | Continued monitoring        | DevOps    |
| D+7 | -     | Cleanup old infrastructure  | DevOps    |

---

## Support Contacts

| Service       | Support                                     |
| ------------- | ------------------------------------------- |
| Neon          | https://neon.tech/docs/introduction/support |
| Cloudflare R2 | https://developers.cloudflare.com/support/  |
| Upstash       | https://docs.upstash.com/support            |
| Coolify       | https://coolify.io/docs/contact             |

---

## Appendix: Useful Commands

### Database

```bash
# Connect to Neon
psql "$NEON_DB_URL"

# Run migrations
cd apps/api && DATABASE_URL="$NEON_DB_URL" alembic upgrade head

# Check current migration
DATABASE_URL="$NEON_DB_URL" alembic current
```

### Storage

```bash
# List R2 contents
rclone ls r2:sinag-storage

# Upload single file
rclone copy local-file.pdf r2:sinag-storage/path/

# Download single file
rclone copy r2:sinag-storage/path/file.pdf ./local/
```

### Redis

```bash
# Connect to Upstash
redis-cli -u "$UPSTASH_REDIS_URL"

# Monitor commands
redis-cli -u "$UPSTASH_REDIS_URL" monitor

# Check memory
redis-cli -u "$UPSTASH_REDIS_URL" info memory
```
