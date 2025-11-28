# Nginx Reverse Proxy - Quick Start Guide

This is a condensed guide for getting started with Nginx in the SINAG project. For detailed documentation, see the [full Nginx setup guide](nginx-reverse-proxy-setup.md).

## What is Nginx Doing?

Nginx acts as the single entry point for all HTTP traffic to the SINAG platform:

- Client requests come to **http://localhost** (port 80)
- Nginx routes requests to either FastAPI or Next.js based on the URL path
- All security, rate limiting, and compression happens in Nginx

## Quick Start

### 1. Start Everything

```bash
./scripts/docker-dev.sh up
```

This starts all services including Nginx on port 80.

### 2. Access the Application

**Recommended**: Use Nginx as the entry point
```
http://localhost
```

**Development Only**: Direct access (bypasses Nginx)
```
http://localhost:3000  # Frontend
http://localhost:8000  # Backend API
```

### 3. Verify Nginx is Working

```bash
# Check health
curl http://localhost/health

# Check API routing
curl http://localhost/api/v1/health

# Check frontend routing
curl http://localhost/

# Check documentation
curl http://localhost/openapi.json
```

## Common Commands

```bash
# View Nginx logs
./scripts/docker-dev.sh logs-nginx

# Test Nginx configuration
./scripts/docker-dev.sh nginx-test

# Reload Nginx (zero downtime)
./scripts/docker-dev.sh nginx-reload

# Open Nginx shell
./scripts/docker-dev.sh shell-nginx

# Rebuild Nginx image
./scripts/docker-dev.sh rebuild nginx

# Check all service health
./scripts/docker-dev.sh health
```

## Request Routing

| Request Path | Destination | Notes |
|-------------|-------------|-------|
| `/api/*` | FastAPI (port 8000) | All API endpoints |
| `/docs` | FastAPI | Swagger UI |
| `/redoc` | FastAPI | ReDoc documentation |
| `/openapi.json` | FastAPI | OpenAPI schema |
| `/health` | FastAPI | Health check |
| `/_next/*` | Next.js (port 3000) | Static assets (cached) |
| `/` | Next.js | All other pages |

## Configuration Files

```
nginx/
├── nginx.conf                    # Main config (global settings)
├── conf.d/default.conf           # Routing rules (active)
├── conf.d/default-ssl.conf.example  # SSL template (future)
└── Dockerfile                    # Custom Nginx image
```

## Quick Fixes

### Problem: "502 Bad Gateway"

**Solution**: Backend services aren't running
```bash
./scripts/docker-dev.sh health
./scripts/docker-dev.sh restart
```

### Problem: "Port 80 already in use"

**Solution**: Another service is using port 80
```bash
./scripts/docker-dev.sh check-ports
./scripts/docker-dev.sh kill-ports
```

### Problem: "413 Request Entity Too Large"

**Solution**: File upload exceeds 100MB limit

Edit `nginx/nginx.conf`:
```nginx
client_max_body_size 500M;  # Increase limit
```

Then reload:
```bash
./scripts/docker-dev.sh nginx-reload
```

### Problem: "504 Gateway Timeout"

**Solution**: Request took longer than 5 minutes

Edit `nginx/conf.d/default.conf`:
```nginx
location /api/ {
    proxy_read_timeout 600s;  # Increase to 10 minutes
}
```

Then reload:
```bash
./scripts/docker-dev.sh nginx-reload
```

## Key Features

### Security
- Rate limiting: 30 requests/second per IP (burst 50)
- Connection limit: 10 concurrent connections per IP
- Security headers: X-Frame-Options, XSS protection
- Hidden server version
- Blocked access to hidden files (.env, .git)

### Performance
- Gzip compression for text content
- Static asset caching (1 hour for /_next/*)
- Keepalive connections to backend
- Connection pooling

### Configuration
- 100MB upload limit (for MOV files)
- 5-minute proxy timeout (for AI tasks)
- 2048 connections per worker process
- Auto-detect CPU cores for worker processes

## Production Mode

```bash
# Start production environment
./scripts/docker-dev.sh prod:up

# In production:
# - Backend and frontend NOT directly exposed
# - Only Nginx port 80 is exposed
# - Separate internal networks for security
```

## Adding SSL (Future)

When SSL certificates are ready:

1. Place certificates in `nginx/ssl/`
2. Copy SSL config: `cp nginx/conf.d/default-ssl.conf.example nginx/conf.d/default.conf`
3. Update domain name in config
4. Uncomment port 443 in `docker-compose.prod.yml`
5. Reload Nginx

See the [full guide](nginx-reverse-proxy-setup.md#future-enhancements) for details.

## Troubleshooting

For detailed troubleshooting, see the [full documentation](nginx-reverse-proxy-setup.md#troubleshooting).

Quick diagnostics:
```bash
# Check if Nginx is running
docker ps | grep nginx

# Check Nginx container logs
./scripts/docker-dev.sh logs-nginx

# Test configuration syntax
./scripts/docker-dev.sh nginx-test

# Check all service health
./scripts/docker-dev.sh health

# View real-time access logs
./scripts/docker-dev.sh shell-nginx
tail -f /var/log/nginx/access.log
```

## Next Steps

- Read the [full Nginx setup guide](nginx-reverse-proxy-setup.md)
- Review [Nginx configuration files](/nginx/)
- Learn about [Docker development](/scripts/docker-dev.sh)
- Understand [SINAG architecture](/docs/architecture.md)

## Summary

- ✅ Nginx is the single entry point (port 80)
- ✅ Routes `/api/*` to FastAPI, everything else to Next.js
- ✅ Provides security, rate limiting, and compression
- ✅ Ready for SSL when certificates are available
- ✅ Zero-downtime configuration reloads

Access the app: **http://localhost**
