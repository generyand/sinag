# Redis Fail-Fast Fix

**Date**: 2025-11-24
**Issue**: Application was still running with Redis warnings instead of failing fast

## Problem

The original implementation had **environment-dependent** Redis checks:
- `ENVIRONMENT=production` → Redis failures crashed the app ❌
- `ENVIRONMENT=development` → Redis failures only warned ⚠️

This defeated the purpose of fail-fast, because:
1. Developers could accidentally miss Redis being down in development
2. The behavior was inconsistent between environments
3. It didn't respect the `FAIL_FAST` setting

## Solution

Changed Redis validation to respect **`FAIL_FAST` and `REQUIRE_CELERY` settings** instead of environment:

### New Behavior

The application now fails based on **two settings**:

```bash
# Both must be true for Redis to be critical
FAIL_FAST=true        # Enable fail-fast behavior
REQUIRE_CELERY=true   # Make Redis/Celery mandatory
```

**Fail-fast matrix**:

| FAIL_FAST | REQUIRE_CELERY | Redis Failure Behavior |
|-----------|----------------|------------------------|
| `true` | `true` | ❌ **CRASHES** (default, recommended) |
| `true` | `false` | ⚠️ Warns and continues |
| `false` | `true` | ⚠️ Warns and continues |
| `false` | `false` | ⚠️ Warns and continues |

## Changes Made

### 1. Updated `startup_service.py`

**File**: `apps/api/app/services/startup_service.py:175-218`

**Before**:
```python
if settings.ENVIRONMENT == "production":
    logger.critical(f"❌ {error_message}")
    raise RuntimeError(error_message)
else:
    logger.warning(f"⚠️  {error_message}")
```

**After**:
```python
should_fail = settings.FAIL_FAST and settings.REQUIRE_CELERY

if should_fail:
    logger.critical(f"❌ {error_message}")
    logger.critical("Background tasks (Celery) will not work!")
    raise RuntimeError(error_message)
else:
    logger.warning(f"⚠️  {error_message}")
    if not settings.REQUIRE_CELERY:
        logger.warning("Continuing because REQUIRE_CELERY=false")
    if not settings.FAIL_FAST:
        logger.warning("Continuing because FAIL_FAST=false")
```

### 2. Added `REQUIRE_CELERY` Configuration

**File**: `apps/api/app/core/config.py:102`

```python
REQUIRE_CELERY: bool = True  # If False, Redis failures only log warnings
```

### 3. Updated `.env.example`

**File**: `apps/api/.env.example`

- Fixed encoding issues (was UTF-16 with spaces, now clean ASCII)
- Added `REQUIRE_CELERY` documentation
- Clarified fail-fast behavior for Redis/Celery

## Usage

### Recommended Configuration (Production & Development)

```bash
# .env
FAIL_FAST=true
REQUIRE_CELERY=true  # Make Redis mandatory
```

With this configuration:
- Application **CRASHES** if Redis is down
- Ensures Celery background tasks always work
- Consistent behavior across all environments

### If Background Tasks Are Optional

```bash
# .env
FAIL_FAST=true
REQUIRE_CELERY=false  # Redis is optional
```

With this configuration:
- Application **WARNS** if Redis is down but continues
- Useful if your app can run without background tasks

### Temporarily Bypass All Checks (Not Recommended)

```bash
# .env
FAIL_FAST=false  # Bypass all strict checks
```

With this configuration:
- Application logs warnings for all failures
- Only use temporarily during local troubleshooting

## Error Messages

### With FAIL_FAST=true and REQUIRE_CELERY=true

```
🔍 Checking Redis connection for Celery...
❌ Redis connection failed: Error 111 connecting to localhost:6379. Connection refused.
Background tasks (Celery) will not work!
To bypass: Set FAIL_FAST=false OR REQUIRE_CELERY=false in .env (NOT RECOMMENDED)

RuntimeError: Redis connection failed: Error 111 connecting to localhost:6379. Connection refused.
```

### With REQUIRE_CELERY=false

```
🔍 Checking Redis connection for Celery...
⚠️  Redis connection failed: Error 111 connecting to localhost:6379. Connection refused.
Background tasks (Celery) may not work
Continuing because REQUIRE_CELERY=false
```

## Testing

To test Redis fail-fast behavior:

```bash
# Stop Redis
sudo systemctl stop redis
# or
pkill redis-server

# Try starting the app with default settings
cd apps/api
pnpm dev:api

# Expected result: Application crashes with clear error message
```

To allow startup without Redis (temporarily):

```bash
# In .env, add:
REQUIRE_CELERY=false

# Now start the app
pnpm dev:api

# Expected result: Warning logged, app continues
```

## Benefits

✅ **Consistent Behavior** - Same fail-fast logic across all environments
✅ **Respects FAIL_FAST** - Redis checks honor the global fail-fast setting
✅ **Configurable** - Can make Redis optional if background tasks aren't critical
✅ **Clear Messages** - Error messages explain exactly why it failed and how to bypass

## Recommendations

1. ✅ **Always use `REQUIRE_CELERY=true` if your app depends on Celery tasks**
2. ✅ **Keep `FAIL_FAST=true` in all environments**
3. ✅ **Only set `REQUIRE_CELERY=false` if background tasks are truly optional**
4. ❌ **Never use `FAIL_FAST=false` in production**

## Summary

The Redis validation now:
- Respects the `FAIL_FAST` setting instead of environment
- Adds `REQUIRE_CELERY` flag for fine-grained control
- Provides clear error messages with bypass instructions
- Works consistently across all environments

**Result**: True fail-fast behavior for Redis/Celery! 🚀
