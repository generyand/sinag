# Fail-Fast Startup Checks

## Overview

The SINAG API now implements a **fail-fast startup system** that validates critical configuration and connections before the application starts accepting requests. This prevents the server from running in a misconfigured state and provides clear error messages when something is wrong.

## What Gets Validated

### 1. Environment Variables (CRITICAL)

The following environment variables are **required** and validated at startup:

- `DATABASE_URL` - PostgreSQL connection string (must start with `postgresql://`)
- `SECRET_KEY` - JWT signing key (minimum 32 characters)
- `SUPABASE_URL` - Supabase project URL (must start with `https://`)
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

**Optional but recommended:**
- `GEMINI_API_KEY` - For AI-powered features (warnings if missing)
- `CELERY_BROKER_URL` - For background tasks

### 2. Database Connections

- **PostgreSQL** - Direct database connection via SQLAlchemy
- **Supabase** - Real-time features, auth, and storage client

Connection requirements can be configured:
- `REQUIRE_ALL_CONNECTIONS=true` (default) - Both must be connected
- `REQUIRE_ALL_CONNECTIONS=false` - At least one must work

### 3. Redis Connection (Celery)

- Validates Redis connectivity for Celery background tasks
- **Production**: Fails if Redis is unreachable
- **Development**: Logs warning but continues

## Configuration

### FAIL_FAST Mode

Control startup behavior with the `FAIL_FAST` environment variable:

```bash
# Strict mode (default, recommended for production)
FAIL_FAST=true

# Lenient mode (useful for local development)
FAIL_FAST=false
```

**When `FAIL_FAST=true` (RECOMMENDED):**
- Application **crashes immediately** if any check fails
- Provides detailed error messages indicating what's wrong
- Prevents misconfigured deployments from accepting traffic
- **This is the default and should be used in production!**

**When `FAIL_FAST=false` (NOT RECOMMENDED):**
- Application logs warnings but continues to start
- Some features may be unavailable
- Only use temporarily during local development troubleshooting

## Error Messages

When startup fails, you'll see clear error messages:

### Example: Missing Environment Variables

```
🚨 Critical environment variables are missing or invalid:

  ❌ DATABASE_URL is not set or empty
  ❌ SECRET_KEY is too short (minimum 32 characters)
  ❌ SUPABASE_URL must start with 'https://'

Please check your .env file and ensure all required variables are set.
See apps/api/.env.example for reference.
```

### Example: Database Connection Failure

```
🚨 Failed to start application due to connection errors:

All connections are required but the following failed:
- PostgreSQL connection failed: Connection refused (Could not connect to server)
- Supabase connection failed: Invalid credentials (Authentication failed)

Please check your database configuration and connection settings.
```

### Example: Redis Connection Failure (Production)

```
❌ Redis connection failed: Error 111 connecting to localhost:6379. Connection refused.
Background tasks (Celery) will not work!
```

## Startup Flow

The startup process follows this order:

1. **Log startup info** - Environment, debug mode, version
2. **Validate environment variables** - Check all required vars are set
3. **Validate database connections** - PostgreSQL and Supabase
4. **Validate Redis connection** - For Celery (strict in production)
5. **Seed initial data** - Barangays, governance areas, indicators
6. **Create first superuser** - If no admin user exists
7. **Log connection details** - Summary of all connection statuses
8. **Start accepting requests** - Server is ready

If any step fails (and `FAIL_FAST=true`), the application crashes immediately with a detailed error message.

## Testing

### Manual Testing

Test different failure scenarios:

```bash
# Test with missing DATABASE_URL
unset DATABASE_URL
pnpm dev:api
# Expected: Application crashes with clear error message

# Test with invalid SECRET_KEY
export SECRET_KEY="short"
pnpm dev:api
# Expected: Application crashes indicating SECRET_KEY is too short

# Test with Redis down (production mode)
export ENVIRONMENT=production
# Stop Redis: sudo systemctl stop redis
pnpm dev:api
# Expected: Application crashes indicating Redis connection failed
```

### Automated Testing

A test script is provided at `apps/api/test_startup_checks.py`:

```bash
cd apps/api

# Test success scenario (all checks pass)
python3 test_startup_checks.py --scenario success

# Test missing DATABASE_URL
python3 test_startup_checks.py --scenario missing-db

# Test missing SECRET_KEY
python3 test_startup_checks.py --scenario missing-secret

# Test invalid DATABASE_URL format
python3 test_startup_checks.py --scenario invalid-db-url

# Test Redis connection failure
python3 test_startup_checks.py --scenario redis-down
```

## Development vs Production

### Development (`ENVIRONMENT=development`)

- Redis failures log warnings but don't crash the app
- `FAIL_FAST=false` can be used temporarily for troubleshooting
- More lenient error handling for convenience

### Production (`ENVIRONMENT=production`)

- **Always use `FAIL_FAST=true`** (default)
- Redis failures are critical and will crash the app
- Strict validation of all connections
- No tolerance for misconfigurations

## Health Check Endpoint

The `/health` endpoint provides runtime status of all connections:

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "overall_status": "healthy",
  "database": {
    "connected": true,
    "database": "PostgreSQL (via SQLAlchemy)",
    "status": "healthy"
  },
  "supabase": {
    "connected": true,
    "service": "Supabase",
    "status": "healthy",
    "url": "https://your-project.supabase.co"
  },
  "timestamp": "2025-11-24T12:00:00.000000"
}
```

## Troubleshooting

### Application won't start - "DATABASE_URL is not set"

1. Check your `.env` file exists: `ls apps/api/.env`
2. Verify `DATABASE_URL` is set in `.env`
3. Ensure there are no typos in the variable name
4. Check the format: must start with `postgresql://`

### Application won't start - "SECRET_KEY is too short"

1. Generate a new secret key:
   ```bash
   openssl rand -base64 32
   ```
2. Update `SECRET_KEY` in your `.env` file
3. Ensure it's at least 32 characters

### Application won't start - "PostgreSQL connection failed"

1. Verify your Supabase database is running
2. Check the DATABASE_URL uses the **pooler** endpoint (port 6543)
3. Verify your Supabase password is correct
4. Test connection manually:
   ```bash
   psql "postgresql://postgres.xxx:password@xxx.pooler.supabase.com:6543/postgres"
   ```

### Application won't start - "Redis connection failed" (Production)

1. Check if Redis is running:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```
2. Start Redis if not running:
   ```bash
   sudo systemctl start redis
   # or
   redis-server
   ```
3. Verify `CELERY_BROKER_URL` in `.env` matches your Redis configuration

### Temporarily bypass checks (NOT RECOMMENDED)

If you need to temporarily bypass startup checks for local development:

```bash
# In your .env file
FAIL_FAST=false
```

**WARNING**: Only use this temporarily! Fix the underlying configuration issues instead.

## Best Practices

1. ✅ **Always keep `FAIL_FAST=true` in production**
2. ✅ **Use the provided `.env.example` as a template**
3. ✅ **Generate strong SECRET_KEY values (32+ characters)**
4. ✅ **Use Supabase pooler endpoints (port 6543) for DATABASE_URL**
5. ✅ **Test your configuration before deploying**
6. ✅ **Monitor the `/health` endpoint in production**
7. ❌ **Never commit `.env` files to version control**
8. ❌ **Never use `FAIL_FAST=false` in production**

## Implementation Details

### Files Modified

1. **`apps/api/app/services/startup_service.py`**
   - Added `_validate_environment_variables()` method
   - Added `_validate_redis_connection()` method
   - Enhanced startup check flow

2. **`apps/api/main.py`**
   - Removed lenient try-catch wrapper
   - Added conditional fail-fast behavior based on `FAIL_FAST` setting
   - Updated documentation

3. **`apps/api/app/core/config.py`**
   - Added `FAIL_FAST` configuration option (default: True)

4. **`apps/api/.env.example`**
   - Added comprehensive documentation for all variables
   - Added `FAIL_FAST` setting with explanation
   - Converted from UTF-16 to UTF-8 encoding

### Code Location Reference

- Environment validation: `apps/api/app/services/startup_service.py:105-173`
- Redis validation: `apps/api/app/services/startup_service.py:175-212`
- Main startup flow: `apps/api/main.py:25-54`
- Configuration: `apps/api/app/core/config.py:110-111`

## Related Documentation

- [Environment Configuration](../CLAUDE.md#environment-configuration)
- [Development Commands](../CLAUDE.md#development-commands)
- [Common Issues](../CLAUDE.md#common-issues)

## Changelog

**2025-11-24**: Initial implementation of fail-fast startup checks
- Environment variable validation
- Database connection validation
- Redis/Celery connectivity checks
- Configurable fail-fast behavior
- Comprehensive error messages
