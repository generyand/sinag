# Docker Development Journey

This document chronicles the Docker-related issues encountered during SINAG development and how they were resolved. These are preserved for historical reference and learning purposes.

## October 27, 2024: API Connection Reset Issues

**Problem**: Frontend getting `ERR_CONNECTION_RESET` when trying to access API in Docker.

**Root Cause**: API container was crashing during startup because:
- Supabase credentials were invalid or missing
- Startup service tried to connect to Supabase and failed
- When startup checks failed, entire server crashed with exception
- Since server never started, connections were being reset

**Solution**: Made API resilient to connection failures
- Updated `apps/api/main.py` to make startup checks non-blocking
- Made Supabase client initialization graceful (returns None instead of crashing)
- Server can now start even without Supabase credentials

**Lessons Learned**:
- Always implement graceful degradation for external services
- Startup failures shouldn't prevent the entire application from starting
- Log warnings but allow core functionality to work

**Files Affected**: `apps/api/main.py`, `apps/api/app/db/base.py`

---

## October 28, 2024: Frontend-Backend Communication in Docker

**Problem**: Frontend couldn't fetch data from backend in Docker, though it worked fine when running manually.

**Root Cause**: Misunderstanding of Next.js runtime environments and Docker networking:
- Next.js has two runtime environments: Server-side (SSR) and Client-side (Browser)
- `NEXT_PUBLIC_*` environment variables are ONLY available in the browser
- On server side (SSR), they are `undefined`
- Code was falling back to `http://localhost:8000`, which from inside Docker refers to the Next.js container itself, not the API container

**Understanding the Problem**:
- **When running manually**: Both frontend and backend on host machine → both use `localhost:8000` ✅
- **When running in Docker**:
  - Server-side requests from Next.js container → Need `http://api:8000` (internal Docker network)
  - Client-side requests from browser → Need `http://localhost:8000` (exposed port)
  - Previously, server-side was trying `http://localhost:8000` which failed ❌

**Solution**: Dynamic base URL based on execution context
- Updated `apps/web/src/lib/api.ts` to detect server vs client runtime
- Added `API_BASE_URL` environment variable for server-side (Docker internal network)
- Kept `NEXT_PUBLIC_API_BASE_URL` for client-side (host machine access)
- Updated CORS configuration to allow Docker internal network access

**Lessons Learned**:
- Next.js `NEXT_PUBLIC_` prefix makes vars available ONLY to browser, not SSR
- Docker internal network vs host network are completely different
- Always consider where code executes: inside container or on host machine

**Files Affected**: `apps/web/src/lib/api.ts`, `docker-compose.yml`, `apps/api/app/core/config.py`

---

## October 28, 2024: localhost vs 0.0.0.0 Confusion

**Problem**: Errors saying "cannot access localhost, only 0.0.0.0" when running in Docker.

**Root Cause**: Confusion between binding address and access address:
- `localhost` from inside a Docker container refers to the container itself, not the host
- `0.0.0.0` is a **binding address** (what server binds to), not an **access address**
- Browsers cannot connect to `http://0.0.0.0:8000` - it's not a valid target

**Solution**:
- Changed `.env.local` from `http://0.0.0.0:8000` to `http://localhost:8000`
- Ensured dynamic base URL sets correct address based on runtime context
- Server binds to `0.0.0.0` (listens on all interfaces)
- Clients connect to `localhost` (browser) or `api` (Docker internal)

**Lessons Learned**:
- `0.0.0.0` means "listen on all network interfaces" - it's for binding, not connecting
- `localhost` is for accessing from the browser (host machine)
- Docker service names (like `api`) are for internal container-to-container communication

**Files Affected**: `apps/web/.env.local`, `apps/web/src/lib/api.ts`

---

## October 28, 2024: IPv6 vs IPv4 localhost Resolution

**Problem**: `curl http://localhost:8000/health` hangs or fails, but `curl http://127.0.0.1:8000/health` works.

**Root Cause**: System prefers IPv6 over IPv4 for `localhost` resolution:
- `localhost` resolves to IPv6 `::1` on some systems
- Docker's port forwarding may not properly forward IPv6 traffic
- Connection attempts fail silently or hang

**Diagnosis**:
```bash
$ getent hosts localhost
::1             localhost  # IPv6 preferred
```

**Solution**: Disabled IPv6 in Docker network configuration
- Updated `docker-compose.yml` to set `enable_ipv6: false`
- Removed IPv6 subnet configuration
- Ensures `localhost` uses IPv4 (`127.0.0.1`)

**Alternative Solutions Considered**:
1. Use `127.0.0.1` explicitly (works but not portable)
2. Fix `/etc/hosts` to ensure IPv4 resolution
3. Configure Docker for proper IPv6 handling (complex)

**Lessons Learned**:
- IPv6 vs IPv4 can cause subtle networking issues
- Not all tools handle IPv6 port forwarding equally
- Disabling IPv6 in Docker is simplest solution for development

**Files Affected**: `docker-compose.yml`

---

## October 28, 2024: ASGI Import Error

**Problem**: API container fails to start with `ERROR: Error loading ASGI app. Could not import module "app.main"`.

**Root Cause**: Path confusion in uvicorn command
- `main.py` is located at `apps/api/main.py` (root of API directory)
- NOT at `apps/api/app/main.py`
- Using `app.main:app` looks for `main.py` inside `app/` subdirectory

**Project Structure**:
```
apps/api/
├── main.py           # ← Application entry point
├── app/              # ← Application code package
│   ├── api/
│   ├── core/
│   └── ...
```

**Solution**: Change uvicorn command from `app.main:app` to `main:app`
- Updated `apps/api/Dockerfile` CMD
- Updated `docker-compose.yml` command overrides

**Lessons Learned**:
- Python import paths depend on working directory and module structure
- FastAPI entry point location affects import path
- Docker container working directory is set by `WORKDIR` in Dockerfile

**Files Affected**: `apps/api/Dockerfile`, `docker-compose.yml`

---

## Summary of Key Learnings

### Docker Networking
- Internal container network (using service names like `api`, `redis`)
- vs. Host machine access (using `localhost` with port mapping)
- Binding to `0.0.0.0` makes server accessible from all networks

### Next.js Environment Variables
- `NEXT_PUBLIC_*` prefix makes variables available to browser JavaScript
- Regular env vars are ONLY available server-side (SSR, API routes)
- Need different URLs for SSR (Docker internal) vs browser (host access)

### Graceful Degradation
- External service failures shouldn't crash the application
- Log warnings, not errors, for optional services
- Allow core functionality to work even with partial configuration

### IPv4 vs IPv6
- Modern systems prefer IPv6 for `localhost` resolution
- Not all tools handle IPv6 equally
- Disabling IPv6 in Docker simplifies development setup

### Python Import Paths
- Module structure determines import paths
- Working directory affects relative imports
- Container WORKDIR must align with import statements

---

## Current State (October 31, 2024)

All issues resolved and solutions are baked into the codebase:
- ✅ API has resilient startup with graceful degradation
- ✅ Frontend dynamically determines base URL based on runtime
- ✅ Docker uses IPv4 only (IPv6 disabled)
- ✅ Correct ASGI import paths in all Docker configurations
- ✅ CORS configured for both host and Docker internal access

New comprehensive troubleshooting guides available:
- `docs/troubleshooting/docker.md` - Complete Docker troubleshooting
- `docs/troubleshooting/backend.md` - Backend-specific issues
- `docs/troubleshooting/frontend.md` - Frontend-specific issues

---

## For Future Reference

If similar issues arise:
1. Check the comprehensive guides in `docs/troubleshooting/`
2. Review this journey document for context
3. Check git history for detailed implementation of fixes
4. Remember: most issues stem from runtime environment confusion (Docker vs host, SSR vs browser)

The problems we solved are now patterns we understand. 🎉
