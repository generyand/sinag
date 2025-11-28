# Nginx Configuration for SINAG

This directory contains the Nginx reverse proxy configuration for the SINAG platform.

## Files

```
nginx/
├── Dockerfile                    # Custom Nginx image
├── nginx.conf                    # Main Nginx configuration
├── conf.d/
│   ├── default.conf              # Server block (active)
│   └── default-ssl.conf.example  # SSL configuration template
└── README.md                     # This file
```

## Quick Start

### Development

```bash
# Start with Nginx
./scripts/docker-dev.sh up

# Access application
http://localhost

# View logs
./scripts/docker-dev.sh logs-nginx

# Test configuration
./scripts/docker-dev.sh nginx-test

# Reload configuration
./scripts/docker-dev.sh nginx-reload
```

### Production

```bash
# Start production environment
./scripts/docker-dev.sh prod:up

# Access application
http://your-domain.com
```

## Configuration Overview

### Main Configuration (`nginx.conf`)

Global settings:
- Worker processes: Auto (matches CPU cores)
- Max connections: 2048 per worker
- Upload size limit: 100MB (for MOV files)
- Gzip compression: Enabled (level 6)
- Rate limiting: 30 req/s per IP
- Proxy timeout: 300s (5 minutes for AI tasks)

### Server Block (`conf.d/default.conf`)

Routing rules:
- `/api/*` → FastAPI backend (api:8000)
- `/docs`, `/redoc`, `/openapi.json` → FastAPI documentation
- `/health` → API health check
- `/_next/*` → Next.js static assets (cached)
- `/` → Next.js frontend (web:3000)

## Customization

### Adjust Timeouts

Edit `conf.d/default.conf`:

```nginx
location /api/ {
    proxy_read_timeout 600s;  # Increase to 10 minutes
}
```

### Change Rate Limits

Edit `nginx.conf`:

```nginx
# More restrictive
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# More permissive
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=60r/s;
```

### Increase Upload Size

Edit `nginx.conf`:

```nginx
client_max_body_size 500M;  # Allow larger uploads
```

## SSL/HTTPS Setup

When SSL certificates are ready:

1. Place certificates in `nginx/ssl/`:
   ```
   nginx/ssl/cert.pem
   nginx/ssl/key.pem
   ```

2. Copy SSL configuration:
   ```bash
   cp nginx/conf.d/default-ssl.conf.example nginx/conf.d/default.conf
   ```

3. Update domain in `default.conf`:
   ```nginx
   server_name sinag.gov.ph www.sinag.gov.ph;
   ```

4. Uncomment SSL ports in `docker-compose.prod.yml`:
   ```yaml
   nginx:
     ports:
       - "443:443"
     volumes:
       - ./nginx/ssl:/etc/nginx/ssl:ro
   ```

5. Reload Nginx:
   ```bash
   ./scripts/docker-dev.sh nginx-reload
   ```

## Testing

### Test Configuration Syntax

```bash
./scripts/docker-dev.sh nginx-test
```

### Test Routing

```bash
# API endpoint
curl http://localhost/api/v1/health

# Frontend
curl http://localhost/

# Documentation
curl http://localhost/openapi.json
```

### View Logs

```bash
# Follow all logs
./scripts/docker-dev.sh logs-nginx

# Inside container
./scripts/docker-dev.sh shell-nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Troubleshooting

### 502 Bad Gateway

**Cause**: Backend services not running or not healthy

**Solution**:
```bash
./scripts/docker-dev.sh health
./scripts/docker-dev.sh restart
```

### 504 Gateway Timeout

**Cause**: Request took longer than proxy_read_timeout

**Solution**: Increase timeout in `conf.d/default.conf`

### 413 Request Entity Too Large

**Cause**: Upload exceeds client_max_body_size

**Solution**: Increase limit in `nginx.conf`

### 429 Too Many Requests

**Cause**: Rate limiting triggered

**Solution**: Adjust rate limits in `nginx.conf` or whitelist IP

## Architecture

```
Client Request
     ↓
Nginx :80 (Reverse Proxy)
     ↓
     ├─→ /api/* → FastAPI :8000
     └─→ /*     → Next.js :3000
```

## Performance Features

- ✅ Gzip compression (60-80% size reduction)
- ✅ Keepalive connections (reduced latency)
- ✅ Static asset caching (1 hour)
- ✅ Connection pooling to backends
- ✅ HTTP/2 support (when SSL enabled)

## Security Features

- ✅ Rate limiting (30 req/s, burst 50)
- ✅ Connection limits (10 per IP)
- ✅ Security headers (X-Frame-Options, XSS, etc.)
- ✅ Hidden server version
- ✅ Blocked hidden files (.env, .git)
- ✅ CORS protection

## Resources

- [Full Documentation](/docs/guides/nginx-reverse-proxy-setup.md)
- [Docker Dev Script](/scripts/docker-dev.sh)
- [Docker Compose (Dev)](/docker-compose.yml)
- [Docker Compose (Prod)](/docker-compose.prod.yml)

## Support

For issues or questions, refer to the [troubleshooting guide](/docs/guides/nginx-reverse-proxy-setup.md#troubleshooting).
