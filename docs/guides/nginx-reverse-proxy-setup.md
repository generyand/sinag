# Nginx Reverse Proxy Setup for SINAG

This guide explains the Nginx reverse proxy configuration for the SINAG platform.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Configuration Files](#configuration-files)
- [Request Routing](#request-routing)
- [Getting Started](#getting-started)
- [Configuration Management](#configuration-management)
- [Security Features](#security-features)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)
- [Future Enhancements](#future-enhancements)

## Overview

SINAG uses Nginx as a reverse proxy to provide a single entry point for all client requests. This architecture offers several benefits:

- **Single Entry Point**: All traffic goes through port 80 (HTTP) or 443 (HTTPS when SSL is configured)
- **Routing Logic**: Intelligent routing between FastAPI backend and Next.js frontend
- **Load Balancing**: Ready for horizontal scaling with multiple backend/frontend instances
- **Security**: Additional layer of protection, rate limiting, and security headers
- **Performance**: Gzip compression, caching, and connection pooling
- **SSL Termination**: Future-ready for SSL/TLS certificate management

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet/Users                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
                ┌──────────────────┐
                │   Nginx :80      │  ← Single Entry Point
                │  Reverse Proxy   │
                └────┬────────┬────┘
                     │        │
        ┌────────────┘        └──────────────┐
        │                                     │
        ▼                                     ▼
┌──────────────┐                    ┌──────────────┐
│ FastAPI :8000│                    │ Next.js :3000│
│   Backend    │                    │   Frontend   │
└──────┬───────┘                    └──────────────┘
       │
       ▼
┌──────────────┐
│  Redis :6379 │
│   + Celery   │
└──────────────┘
```

### Network Topology

**Development (`docker-compose.yml`)**:
- Network: `sinag-network` (172.25.0.0/16)
- Nginx: 172.25.0.50
- API: 172.25.0.20
- Web: 172.25.0.40
- Redis: 172.25.0.10

**Production (`docker-compose.prod.yml`)**:
- Backend Network: `sinag-backend` (172.26.0.0/24) - Internal only
- Frontend Network: `sinag-frontend` (172.26.1.0/24)
- Nginx: 172.26.1.50 (bridges both networks)

## Configuration Files

### 1. Main Configuration (`nginx/nginx.conf`)

This file defines global Nginx settings:

- **Worker Processes**: Auto-detects CPU cores
- **Connection Handling**: 2048 connections per worker
- **Logging**: Structured logs with timing information
- **Performance**: Sendfile, TCP optimization, keepalive
- **Compression**: Gzip for text-based content
- **Timeouts**: Client and proxy timeout configuration
- **Security**: Server tokens hidden, security headers
- **Rate Limiting**: DDoS protection zones

**Key Settings**:
```nginx
worker_processes auto;              # Auto-detect CPU cores
worker_connections 2048;            # Max connections per worker
client_max_body_size 100M;          # Allow large file uploads (MOVs)
proxy_read_timeout 300s;            # 5 min for AI/classification tasks
gzip_comp_level 6;                  # Balanced compression
```

### 2. Server Block Configuration (`nginx/conf.d/default.conf`)

This file defines routing rules and upstream servers:

**Upstream Definitions**:
- `sinag_api`: FastAPI backend (api:8000)
- `sinag_web`: Next.js frontend (web:3000)

**Routing Rules**:

| Path | Destination | Purpose |
|------|-------------|---------|
| `/api/*` | FastAPI (api:8000) | API endpoints |
| `/openapi.json` | FastAPI | OpenAPI schema |
| `/docs` | FastAPI | Swagger UI |
| `/redoc` | FastAPI | ReDoc documentation |
| `/health` | FastAPI | Health checks |
| `/_next/*` | Next.js | Static assets (cached) |
| `/` | Next.js | Frontend pages |

### 3. Dockerfile (`nginx/Dockerfile`)

Custom Nginx image based on `nginx:1.25-alpine`:
- Installs curl for health checks
- Sets timezone to Asia/Manila
- Runs as non-root `nginx` user
- Includes health check endpoint

## Request Routing

### API Requests

```
Client → http://localhost/api/v1/assessments
         ↓
      Nginx (Port 80)
         ↓ [Rate Limiting: 30 req/s]
         ↓ [Headers: X-Real-IP, X-Forwarded-For]
         ↓ [Timeout: 5 minutes]
         ↓
      FastAPI (api:8000)
```

**Features**:
- Rate limiting: 30 requests/second with burst of 50
- Connection limit: 10 concurrent connections per IP
- CORS headers (backup, FastAPI handles primary)
- Long timeouts for AI/classification tasks

### Frontend Requests

```
Client → http://localhost/
         ↓
      Nginx (Port 80)
         ↓ [WebSocket Support]
         ↓ [Cache: No-cache for HTML]
         ↓
      Next.js (web:3000)
```

**Features**:
- WebSocket upgrade for hot module reload (development)
- No-cache headers for HTML pages (always fresh)
- Static asset caching for `/_next/*` paths
- Keepalive connections to backend

### Static Assets

```
Client → http://localhost/_next/static/...
         ↓
      Nginx (Port 80)
         ↓ [Cache: 1 hour]
         ↓ [Cache-Control: immutable]
         ↓
      Next.js (web:3000)
```

## Getting Started

### Development Environment

1. **Start all services with Nginx**:
   ```bash
   ./scripts/docker-dev.sh up
   ```

   This starts:
   - Nginx on port 80 (main entry point)
   - API on port 8000 (also exposed for direct access)
   - Web on port 3000 (also exposed for direct access)
   - Redis on port 6379

2. **Access the application**:
   - **Recommended**: http://localhost (via Nginx)
   - Direct API: http://localhost:8000 (bypass Nginx)
   - Direct Web: http://localhost:3000 (bypass Nginx)

3. **View Nginx logs**:
   ```bash
   ./scripts/docker-dev.sh logs-nginx
   ```

### Testing Nginx Configuration

Before starting services, test the Nginx configuration:

```bash
# Test configuration syntax
./scripts/docker-dev.sh nginx-test

# If changes are made while running, reload without downtime
./scripts/docker-dev.sh nginx-reload
```

### Verifying Routing

Test that requests are properly routed:

```bash
# Test API routing
curl http://localhost/api/v1/health

# Test API documentation
curl http://localhost/openapi.json

# Test frontend routing
curl http://localhost/

# Test with headers
curl -H "X-Custom-Header: test" http://localhost/api/v1/health
```

## Configuration Management

### Modifying Nginx Configuration

1. **Edit configuration files**:
   - Main config: `nginx/nginx.conf`
   - Server block: `nginx/conf.d/default.conf`

2. **Test configuration**:
   ```bash
   ./scripts/docker-dev.sh nginx-test
   ```

3. **Apply changes**:

   **Option A: Reload (zero downtime)**:
   ```bash
   ./scripts/docker-dev.sh nginx-reload
   ```

   **Option B: Restart (full restart)**:
   ```bash
   ./scripts/docker-dev.sh restart
   ```

   **Option C: Rebuild (after Dockerfile changes)**:
   ```bash
   ./scripts/docker-dev.sh rebuild nginx
   ```

### Common Configuration Tasks

#### Adjusting Request Timeout

For longer-running tasks, modify `nginx/conf.d/default.conf`:

```nginx
location /api/ {
    proxy_read_timeout 600s;  # 10 minutes instead of 5
    # ... other settings
}
```

#### Changing Rate Limits

Modify `nginx/nginx.conf`:

```nginx
# More restrictive
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# More permissive
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=60r/s;
```

#### Increasing Upload Size

For larger MOV files, modify `nginx/nginx.conf`:

```nginx
client_max_body_size 500M;  # Allow up to 500MB uploads
```

## Security Features

### 1. Rate Limiting

Protects against DDoS attacks:

```nginx
# Global rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

# Applied in location blocks
location /api/ {
    limit_req zone=api_limit burst=50 nodelay;
    limit_conn addr 10;  # Max 10 concurrent connections per IP
}
```

### 2. Security Headers

Automatically applied to all responses:

```nginx
X-Frame-Options: SAMEORIGIN               # Prevent clickjacking
X-XSS-Protection: 1; mode=block           # XSS protection
X-Content-Type-Options: nosniff           # Prevent MIME sniffing
Referrer-Policy: strict-origin-when-cross-origin
```

### 3. Hidden Server Information

```nginx
server_tokens off;  # Hide Nginx version
```

### 4. Deny Hidden Files

```nginx
location ~ /\. {
    deny all;  # Block access to .env, .git, etc.
}
```

### 5. CORS Protection

CORS headers are applied by FastAPI, but Nginx provides backup:

```nginx
add_header Access-Control-Allow-Origin $http_origin always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
```

## Performance Optimization

### 1. Gzip Compression

Compresses text-based responses to reduce bandwidth:

```nginx
gzip on;
gzip_comp_level 6;          # Balanced compression
gzip_types
    text/plain
    text/css
    text/javascript
    application/json
    application/javascript;
```

**Benefit**: 60-80% reduction in text response sizes

### 2. Keepalive Connections

Reuses connections to backend services:

```nginx
upstream sinag_api {
    server api:8000;
    keepalive 32;  # Pool of 32 keepalive connections
}
```

**Benefit**: Reduces connection overhead, improves latency

### 3. Buffer Optimization

Tuned for typical request/response sizes:

```nginx
client_body_buffer_size 128k;
proxy_buffer_size 4k;
proxy_buffers 8 4k;
```

### 4. Static Asset Caching

Next.js static files are cached:

```nginx
location /_next/ {
    proxy_pass http://sinag_web;
    proxy_cache_valid 200 302 60m;  # Cache for 1 hour
    add_header Cache-Control "public, max-age=3600, immutable";
}
```

**Benefit**: Reduces load on Next.js server, faster page loads

### 5. Connection Pooling

Nginx maintains persistent connections to backend services, reducing TCP handshake overhead.

## Troubleshooting

### Common Issues

#### 1. Nginx Won't Start

**Symptom**: `sinag-nginx` container fails to start

**Solutions**:

```bash
# Check configuration syntax
./scripts/docker-dev.sh nginx-test

# Check logs
./scripts/docker-dev.sh logs-nginx

# Verify port 80 is available
./scripts/docker-dev.sh check-ports

# Kill conflicting processes
./scripts/docker-dev.sh kill-ports
```

#### 2. 502 Bad Gateway

**Symptom**: Nginx returns 502 error

**Possible Causes**:
- Backend services not running
- Backend services not healthy
- Network connectivity issues

**Solutions**:

```bash
# Check service health
./scripts/docker-dev.sh health

# Check backend logs
./scripts/docker-dev.sh logs-api
./scripts/docker-dev.sh logs-web

# Restart services
./scripts/docker-dev.sh restart
```

#### 3. 504 Gateway Timeout

**Symptom**: Requests timeout after 5 minutes

**Cause**: Long-running AI/classification tasks exceed timeout

**Solution**: Increase `proxy_read_timeout` in `nginx/conf.d/default.conf`

#### 4. Rate Limiting Too Aggressive

**Symptom**: Legitimate requests get 429 (Too Many Requests) errors

**Solution**: Adjust rate limits in `nginx/nginx.conf`:

```nginx
# Increase rate limit
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=60r/s;

# Increase burst size
location /api/ {
    limit_req zone=api_limit burst=100 nodelay;
}
```

#### 5. Upload Size Exceeded

**Symptom**: 413 (Request Entity Too Large) when uploading large MOV files

**Solution**: Increase `client_max_body_size` in `nginx/nginx.conf`:

```nginx
client_max_body_size 500M;  # or higher
```

### Debugging Commands

```bash
# Open shell in Nginx container
./scripts/docker-dev.sh shell-nginx

# Inside container, check logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Test configuration
nginx -t

# Check Nginx status
ps aux | grep nginx

# View current configuration
cat /etc/nginx/nginx.conf
cat /etc/nginx/conf.d/default.conf
```

### Viewing Nginx Metrics

Access Nginx stub_status (if enabled):

```nginx
# Uncomment in nginx/conf.d/default.conf
server {
    listen 8080;
    location /nginx_status {
        stub_status on;
    }
}
```

Then visit: http://localhost:8080/nginx_status

## Production Deployment

### Using Production Configuration

```bash
# Start production environment
./scripts/docker-dev.sh prod:up

# View production logs
./scripts/docker-dev.sh prod:logs

# Check production status
./scripts/docker-dev.sh prod:status
```

### Production Differences

1. **No Direct Access**: API and Web ports are not exposed, only Nginx port 80
2. **Separate Networks**: Backend services isolated on internal network
3. **Higher Resource Limits**: Nginx gets more CPU/memory
4. **Better Logging**: Compressed logs with longer retention

### Network Isolation

Production uses two networks:

- **sinag-backend** (172.26.0.0/24): Internal, no external access
  - Redis: 172.26.0.10
  - API: 172.26.0.20
  - Celery: 172.26.0.30

- **sinag-frontend** (172.26.1.0/24): Public-facing
  - Web: 172.26.1.40
  - Nginx: 172.26.1.50 (bridges both networks)

**Security Benefit**: Redis and internal API calls cannot be accessed from outside

### Scaling for Production

To add multiple backend replicas:

1. **Update `nginx/conf.d/default.conf`**:

```nginx
upstream sinag_api {
    # Multiple API instances
    server api1:8000 max_fails=3 fail_timeout=30s;
    server api2:8000 max_fails=3 fail_timeout=30s;
    server api3:8000 max_fails=3 fail_timeout=30s;

    # Load balancing method
    least_conn;  # Route to least busy server

    keepalive 32;
}
```

2. **Update `docker-compose.prod.yml`**:

```yaml
api:
  deploy:
    replicas: 3  # Run 3 API instances
```

## Future Enhancements

### 1. SSL/TLS Configuration (HTTPS)

Once SSL certificates are obtained:

1. **Place certificates**:
   ```
   nginx/ssl/cert.pem
   nginx/ssl/key.pem
   ```

2. **Uncomment SSL in `docker-compose.prod.yml`**:
   ```yaml
   nginx:
     ports:
       - "443:443"
     volumes:
       - ./nginx/ssl:/etc/nginx/ssl:ro
   ```

3. **Add SSL server block in `nginx/conf.d/default.conf`**:

```nginx
server {
    listen 443 ssl http2;
    server_name sinag.gov.ph;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # ... rest of configuration
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name sinag.gov.ph;
    return 301 https://$server_name$request_uri;
}
```

### 2. Caching Layer

For improved performance, add Nginx caching:

```nginx
# Define cache zone
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g;

# Apply in location blocks
location /api/v1/lookups/ {
    proxy_pass http://sinag_api;
    proxy_cache api_cache;
    proxy_cache_valid 200 10m;
    add_header X-Cache-Status $upstream_cache_status;
}
```

### 3. Request/Response Logging

Enhanced logging for analytics:

```nginx
log_format detailed '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time" '
                    'cache=$upstream_cache_status';
```

### 4. Geographic Load Balancing

For multi-region deployment:

```nginx
geo $backend {
    default api-us;
    103.0.0.0/8 api-ph;  # Philippine IPs
    # ... more regions
}

upstream api-ph {
    server api1.ph.sinag.gov.ph:8000;
}

upstream api-us {
    server api1.us.sinag.gov.ph:8000;
}

location /api/ {
    proxy_pass http://$backend;
}
```

### 5. WAF Integration

Web Application Firewall for enhanced security:

- ModSecurity with OWASP Core Rule Set
- DDoS protection with rate limiting
- Bot detection and blocking

## Summary

The Nginx reverse proxy provides:

- ✅ **Single Entry Point**: Port 80 for all traffic
- ✅ **Intelligent Routing**: API vs. Frontend routing
- ✅ **Security**: Rate limiting, security headers, DDoS protection
- ✅ **Performance**: Gzip, caching, connection pooling
- ✅ **Scalability**: Ready for multiple backend instances
- ✅ **Observability**: Structured logging with timing metrics
- ✅ **Flexibility**: Zero-downtime configuration reloads

**Access Points**:
- Production: http://localhost (port 80)
- Development: http://localhost (port 80) or direct ports (3000, 8000)

For support or questions, refer to the main [SINAG documentation](/docs/README.md).
