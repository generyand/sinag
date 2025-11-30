# DevOps Pre-Deployment Checklist

This checklist ensures your SINAG deployment is production-ready. Follow these steps before deploying to EC2.

## Prerequisites

### 1. GitHub Setup
- [ ] Repository is on GitHub with appropriate permissions
- [ ] GitHub Actions is enabled
- [ ] Repository packages/containers setting is set to public or PAT is ready

### 2. AWS EC2 Setup
- [ ] EC2 instance created (recommended: t2.medium or t3.medium)
- [ ] Security groups configured:
  - [ ] Port 22 (SSH) - restricted to your IP
  - [ ] Port 80 (HTTP) - open to 0.0.0.0/0
  - [ ] Port 443 (HTTPS) - open to 0.0.0.0/0 (for future SSL)
- [ ] Key pair (.pem file) downloaded and secured (chmod 400)
- [ ] Public IP address noted

### 3. Supabase Setup
- [ ] Supabase project created
- [ ] Database credentials obtained:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `DATABASE_URL` (use Transaction pooler, port 6543)

### 4. Optional Services
- [ ] Gemini API key (for AI features) - optional
- [ ] Domain name (for custom domain) - optional

## Pre-Deployment Steps

### 1. Build Docker Images

```bash
# Trigger GitHub Actions to build images
# Method 1: Push to main branch
git push origin main

# Method 2: Manual trigger
# Go to GitHub → Actions → "Build and Push to GHCR" → Run workflow
```

**Verify build:**
- Go to GitHub → Actions
- Wait for workflow to complete (green checkmark)
- Go to GitHub → Packages
- Verify images exist:
  - `sinag-api:latest`
  - `sinag-web:latest`
  - `sinag-nginx:latest`

### 2. EC2 Initial Setup

```bash
# 1. SSH to EC2
ssh -i "your-key.pem" ec2-user@YOUR_EC2_IP

# 2. Run setup script
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/sinag/main/scripts/setup-ec2.sh | bash

# 3. IMPORTANT: Log out and back in
exit
ssh -i "your-key.pem" ec2-user@YOUR_EC2_IP

# 4. Clone repository
git clone https://github.com/YOUR_USERNAME/sinag.git ~/sinag
cd ~/sinag
```

### 3. Configure Environment

```bash
# 1. Create GitHub Personal Access Token
# Go to: https://github.com/settings/tokens
# Create token with scope: read:packages
# Copy the token

# 2. Login to GHCR
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# 3. Configure environment
cp .env.example .env
nano .env
```

**Required environment variables:**

```env
# GitHub
GITHUB_REPOSITORY=your-username/sinag
IMAGE_TAG=latest

# Security (generate with: python3 -c "import secrets; print(secrets.token_urlsafe(64))")
SECRET_KEY=YOUR_GENERATED_SECRET_KEY

# Supabase
DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Frontend (use EC2 public IP or domain)
NEXT_PUBLIC_API_URL=http://YOUR_EC2_IP
NEXT_PUBLIC_API_V1_URL=http://YOUR_EC2_IP/api/v1

# AI (optional)
GEMINI_API_KEY=
```

### 4. Initial Deployment

```bash
# Deploy with database migrations
./scripts/deploy.sh --migrate
```

**Expected output:**
```
[1/6] Running pre-flight checks...
✓ Pre-flight checks passed
[2/6] Loading environment...
✓ Environment loaded
[3/6] Pulling images from GHCR...
✓ Images pulled
[4/6] Stopping existing containers...
✓ Containers stopped
[5/6] Starting containers...
✓ Containers started
[6/6] Running database migrations...
✓ Migrations completed successfully
✓ Application is healthy!
```

### 5. Verification

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Expected output:
# NAME                  STATUS              PORTS
# sinag-api            Up (healthy)        8000/tcp
# sinag-celery-worker  Up                  -
# sinag-nginx          Up (healthy)        0.0.0.0:80->80/tcp
# sinag-redis          Up (healthy)        6379/tcp
# sinag-web            Up                  3000/tcp

# Check logs if needed
docker compose -f docker-compose.prod.yml logs

# Test health endpoint
curl http://localhost/health
```

### 6. Access Application

Open browser: `http://YOUR_EC2_PUBLIC_IP`

**Expected:**
- Login page loads
- No console errors
- API endpoints are accessible

## Post-Deployment

### 1. Create Initial Admin User

```bash
# SSH to API container
docker compose -f docker-compose.prod.yml exec api bash

# Create admin user (example)
python -c "
from app.db.session import SessionLocal
from app.services.user_service import user_service
from app.schemas.user import UserCreate
from app.db.enums import UserRole

db = SessionLocal()
try:
    admin_data = UserCreate(
        email='admin@sinag.local',
        username='admin',
        first_name='Admin',
        last_name='User',
        password='ChangeThisPassword123!',
        role=UserRole.MLGOO_DILG
    )
    user = user_service.create_user(db, admin_data)
    print(f'Admin user created: {user.email}')
finally:
    db.close()
"
```

### 2. Monitor Logs

```bash
# Real-time logs (all services)
docker compose -f docker-compose.prod.yml logs -f

# Specific service logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f celery-worker
```

### 3. Common Commands

```bash
# View container status
docker compose -f docker-compose.prod.yml ps

# Restart specific service
docker compose -f docker-compose.prod.yml restart api

# Stop all services
docker compose -f docker-compose.prod.yml down

# Update to latest images (after new build)
./scripts/deploy.sh

# Run migrations only
docker compose -f docker-compose.prod.yml exec api alembic upgrade head

# View Nginx access logs
docker compose -f docker-compose.prod.yml logs nginx

# Access Redis CLI
docker compose -f docker-compose.prod.yml exec redis redis-cli
```

## Troubleshooting

### Images Not Pulling

**Symptom**: `Error response from daemon: pull access denied`

**Solution**:
```bash
# Re-login to GHCR
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Verify token has read:packages permission
# Try pulling manually
docker pull ghcr.io/YOUR_USERNAME/sinag/sinag-api:latest
```

### API Container Not Starting

**Symptom**: API container exits immediately or shows unhealthy

**Solution**:
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs api

# Common issues:
# 1. DATABASE_URL incorrect → verify Supabase connection string
# 2. SECRET_KEY missing → check .env file
# 3. Migration failed → run manually: docker compose -f docker-compose.prod.yml exec api alembic upgrade head
```

### Web Container Not Starting

**Symptom**: Web container exits or health check fails

**Solution**:
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs web

# Common issues:
# 1. NEXT_PUBLIC_* vars missing → check .env and docker-compose.prod.yml
# 2. API not accessible → verify API is healthy first
```

### Database Connection Failed

**Symptom**: `Could not connect to database`

**Solution**:
1. Verify DATABASE_URL uses pooler port (6543), not direct (5432)
2. Check Supabase project is active
3. Verify EC2 security group allows outbound HTTPS (port 443)
4. Test connection:
   ```bash
   docker compose -f docker-compose.prod.yml exec api python -c "from app.db.session import SessionLocal; db = SessionLocal(); print('Connected!')"
   ```

### Can't Access from Browser

**Symptom**: Connection timeout when accessing `http://EC2_IP`

**Solution**:
1. Check EC2 security group allows inbound port 80
2. Verify Nginx is running: `docker compose -f docker-compose.prod.yml ps nginx`
3. Check Nginx logs: `docker compose -f docker-compose.prod.yml logs nginx`
4. Test locally on EC2: `curl http://localhost/health`

### Celery Tasks Not Running

**Symptom**: Background tasks (classification, AI) not executing

**Solution**:
```bash
# Check Celery logs
docker compose -f docker-compose.prod.yml logs celery-worker

# Check Redis is running
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
# Expected: PONG

# Restart Celery worker
docker compose -f docker-compose.prod.yml restart celery-worker
```

## Updating Application

### When Code Changes

```bash
# 1. Push to main branch (triggers automatic build)
git push origin main

# 2. Wait for GitHub Actions to complete

# 3. SSH to EC2 and update
cd ~/sinag
./scripts/deploy.sh
```

### When Database Schema Changes

```bash
# Deploy with migrations
cd ~/sinag
./scripts/deploy.sh --migrate
```

### Rolling Back

```bash
# Deploy specific version
cd ~/sinag
./scripts/deploy.sh v1.0.0 --migrate
```

## Security Checklist

- [ ] `.env` file has 600 permissions: `chmod 600 .env`
- [ ] `SECRET_KEY` is randomly generated and unique
- [ ] SSH access restricted to your IP only
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is kept secret
- [ ] GitHub PAT has minimal permissions (read:packages only)
- [ ] Regular security updates: `sudo dnf update -y` (Amazon Linux)
- [ ] Consider adding HTTPS with Let's Encrypt for production

## Cost Monitoring

### Check AWS Costs

1. Go to AWS Console → Billing Dashboard
2. Set up billing alerts:
   - Budget: $10/month (for testing)
   - Alert threshold: 80%

### Optimize Costs

- **Development**: Use `t2.micro` (free tier)
- **Demo/Production**: Use `t2.medium` or `t3.medium`
- **Stop instance** when not in use (saves compute costs)
- **Elastic IP**: Release if not using to avoid charges
- **Supabase**: Free tier is sufficient for testing

## Next Steps

### Enable HTTPS (Recommended for Production)

See: `/docs/guides/ssl-setup.md` (to be created)

### Set Up Custom Domain

See: `/docs/guides/custom-domain.md` (to be created)

### Enable Monitoring

See: `/docs/guides/monitoring.md` (to be created)

## Support

### Common Resources

- **Project Documentation**: `/docs/`
- **EC2 Deployment Guide**: `/docs/guides/ec2-deployment-guide.md`
- **Nginx Setup**: `/docs/guides/nginx-reverse-proxy-setup.md`
- **Troubleshooting**: `/docs/troubleshooting/`

### Getting Help

1. Check container logs: `docker compose -f docker-compose.prod.yml logs`
2. Review this checklist
3. Check GitHub Issues
4. Contact team lead
