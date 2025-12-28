# Frontend Troubleshooting

Frontend-specific troubleshooting for Next.js, React, and UI issues.

## Common Frontend Issues

### Login Error: ERR_FAILED 500 / Network Error

**Symptoms**:

- `POST http://localhost:8000/api/v1/auth/login net::ERR_FAILED 500 (Internal Server Error)`
- `AxiosError: Network Error` in browser console
- Backend health check (`curl http://localhost:8000/health`) works fine from terminal

**Root Cause**: Mismatch between environment variable and DNS resolution, often related to IPv4 vs
IPv6 or incorrect base URL configuration.

**Solution**:

1. **Update `.env.local`** to use `localhost`:

   ```env
   # apps/web/.env.local
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```

2. **Restart Next.js dev server**:

   ```bash
   # Stop with Ctrl+C, then restart
   pnpm dev:web
   ```

3. **Verify in browser console** that requests now go to `http://localhost:8000`

**Alternative**: If `localhost` still doesn't work, use explicit IPv4:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

**Note**: The Docker IPv6 configuration has been disabled to prevent `localhost` resolution issues.
Using `localhost` is now preferred over `127.0.0.1`.

### Type Generation Failures

> **TODO**: Document type generation troubleshooting

### API Connection Errors

> **TODO**: Document API client connection issues

### Build Failures

> **TODO**: Document Next.js build troubleshooting

### Hot Reload Not Working

> **TODO**: Document development server issues

### Hydration Errors

> **TODO**: Document React hydration mismatch errors

## Debugging Frontend

```bash
# Run with verbose output
cd apps/web
NEXT_PUBLIC_DEBUG=true pnpm dev

# Check type generation
pnpm generate-types

# Clear Next.js cache
rm -rf .next
pnpm dev

# Check API connectivity
curl http://localhost:8000/api/v1/health
```

## Environment Variables

> **TODO**: Document required frontend environment variables
