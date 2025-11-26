# Docker Setup Guide

## Environment Configuration

Docker Compose for SINAG uses a decentralized environment variable approach where each service loads its environment from its respective `.env` files.

### Environment File Structure

```
sinag/
├── apps/
│   ├── api/
│   │   ├── .env              # API & Celery environment (REQUIRED)
│   │   └── .env.example      # Example template
│   └── web/
│       ├── .env.local        # Web app environment
│       └── .env.example      # Example template
└── docker-compose.yml        # Loads env files from above locations
```

### Environment Variables per Service

#### API Service (`apps/api/.env`)

The API service loads all environment variables from `apps/api/.env`. This includes:

**Required for Supabase:**

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `DATABASE_URL` - PostgreSQL connection string from Supabase

**Application Settings:**

- `DEBUG` - Enable debug mode (default: `true`)
- `ENVIRONMENT` - Environment name (default: `development`)
- `SECRET_KEY` - Secret key for JWT tokens
- `ALGORITHM` - JWT algorithm (default: `HS256`)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration (default: `10080`)

**Redis Configuration (Auto-overridden):**

- `CELERY_BROKER_URL` - Automatically set to `redis://redis:6379/0`
- `CELERY_RESULT_BACKEND` - Automatically set to `redis://redis:6379/0`
- `REDIS_URL` - Automatically set to `redis://redis:6379/0`

**Example `apps/api/.env`:**

```env
DEBUG=true
ENVIRONMENT=development

SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

#### Web Service (`apps/web/.env.local`)

The web service loads environment variables from `apps/web/.env.local`:

**Required:**

- `NEXT_PUBLIC_API_URL` - API endpoint URL (default: `http://localhost:8000`)

**Example `apps/web/.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_ENV=development
```

### Docker Compose Environment Configuration

In `docker-compose.yml`, the services are configured as follows:

```yaml
api:
  env_file:
    - apps/api/.env # Load all variables from this file
  environment:
    # Override only Redis URLs for Docker network
    - CELERY_BROKER_URL=redis://redis:6379/0
    - CELERY_RESULT_BACKEND=redis://redis:6379/0

celery-worker:
  env_file:
    - apps/api/.env # Use same env as API
  environment:
    # Override Redis URLs for Docker network
    - CELERY_BROKER_URL=redis://redis:6379/0
    - CELERY_RESULT_BACKEND=redis://redis:6379/0

web:
  env_file:
    - apps/web/.env.local # Load web app variables
  environment:
    - WATCHPACK_POLLING=true # Enable file watching
```

### Key Points

1. **Decentralized Configuration**: Each service loads from its own `.env` file
2. **Redis URL Override**: Redis URLs are automatically set to use the `redis` service name for Docker networking
3. **No Root .env**: We don't use a root-level `.env` file - each service maintains its own
4. **Environment File Safety**: Actual `.env` files are gitignored, only `.env.example` files are committed

### Quick Setup

1. **Copy the example files:**

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

2. **Configure your Supabase credentials in `apps/api/.env`**

3. **Start Docker services:**
   ```bash
   ./scripts/docker-dev.sh up
   ```

### Troubleshooting

**Environment variables not being loaded:**

- Ensure `apps/api/.env` exists with your Supabase credentials
- Check that `apps/web/.env.local` exists
- Restart services: `./scripts/docker-dev.sh restart`

**Redis connection errors:**

- The `redis://redis:6379/0` URLs are automatically set - don't override these
- Ensure the Redis service is healthy: `./scripts/docker-dev.sh status`

**Database connection errors:**

- Verify `DATABASE_URL` in `apps/api/.env` is correct
- Ensure it uses the pooler endpoint (port 6543)
- Test connection outside Docker first

### Verification

Check that environment variables are loaded correctly:

```bash
# Check API service environment
docker exec sinag-api env | grep SUPABASE

# Check web service environment
docker exec sinag-web env | grep NEXT_PUBLIC

# Check celery worker environment
docker exec sinag-celery-worker env | grep CELERY
```
