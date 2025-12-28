# SSL/HTTPS Setup with Let's Encrypt

This guide explains how to set up SSL/HTTPS for the SINAG platform using Let's Encrypt certificates.

## Prerequisites

Before setting up SSL, ensure:

1. **Domain configured**: Your domain (e.g., `sinag.example.com`) points to your server's public IP
2. **Ports open**: Ports 80 and 443 are open in your EC2 security group/firewall
3. **Docker installed**: Docker and docker-compose are installed on the server
4. **DNS propagated**: Wait for DNS changes to propagate (can take up to 48 hours)

### Verify DNS

```bash
# Check if domain resolves to your server
dig +short your-domain.com

# Should return your server's public IP
```

## Quick Setup

Use the provided initialization script:

```bash
# Test first with staging (recommended)
./scripts/init-ssl.sh your-domain.com your-email@example.com --staging

# If staging works, get real certificate
./scripts/init-ssl.sh your-domain.com your-email@example.com
```

## Manual Setup

If you prefer manual setup or the script fails:

### Step 1: Update Nginx Configuration

Edit `nginx/conf.d/ssl.conf` and replace `YOUR_DOMAIN` with your actual domain:

```bash
sed -i 's/YOUR_DOMAIN/your-domain.com/g' nginx/conf.d/ssl.conf
```

### Step 2: Create Docker Volumes

```bash
docker volume create sinag_certbot-conf
docker volume create sinag_certbot-www
```

### Step 3: Get Initial Certificate

```bash
# Start nginx first (it will fail initially - that's OK)
docker compose -f docker-compose.prod.yml up -d nginx

# Request certificate
docker run -it --rm \
  -v sinag_certbot-conf:/etc/letsencrypt \
  -v sinag_certbot-www:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com
```

### Step 4: Restart Services

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

## Certificate Renewal

Certificates are automatically renewed by the certbot container every 12 hours (only renews when
needed - within 30 days of expiration).

### Manual Renewal

```bash
# Check certificate status
docker compose -f docker-compose.prod.yml exec certbot certbot certificates

# Force renewal
docker compose -f docker-compose.prod.yml exec certbot certbot renew --force-renewal

# Reload nginx after renewal
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Troubleshooting

### Certificate Request Failed

**Error**: `Challenge failed for domain`

**Causes**:

1. Domain not pointing to server
2. Port 80 blocked
3. Nginx not running or misconfigured

**Solutions**:

```bash
# Check DNS
dig +short your-domain.com

# Check if port 80 is accessible
curl -I http://your-domain.com/.well-known/acme-challenge/test

# Check nginx logs
docker compose -f docker-compose.prod.yml logs nginx
```

### Rate Limit Exceeded

Let's Encrypt has rate limits (5 certificates per week per domain).

**Solution**: Use staging for testing:

```bash
./scripts/init-ssl.sh your-domain.com email@example.com --staging
```

### Nginx Won't Start

**Error**: `cannot load certificate`

**Cause**: Certificate files don't exist yet.

**Solution**: The init script creates temporary self-signed certs first. If starting manually:

```bash
# Create dummy certificate
mkdir -p certbot/conf/live/your-domain.com
openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
  -keyout certbot/conf/live/your-domain.com/privkey.pem \
  -out certbot/conf/live/your-domain.com/fullchain.pem \
  -subj "/CN=localhost"
```

### Mixed Content Warnings

If you see mixed content warnings after enabling HTTPS:

1. Ensure `NEXT_PUBLIC_API_URL` uses `https://`
2. Rebuild the web image with correct env vars
3. Clear browser cache

## Security Best Practices

### HSTS (HTTP Strict Transport Security)

Already configured in `ssl.conf`:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### OCSP Stapling

Already configured for faster SSL handshakes.

### Strong Cipher Suites

Using TLS 1.2 and 1.3 only with secure cipher suites.

## Configuration Files

| File                        | Purpose                             |
| --------------------------- | ----------------------------------- |
| `docker-compose.prod.yml`   | Certbot container and volume mounts |
| `nginx/conf.d/ssl.conf`     | HTTPS server block configuration    |
| `nginx/conf.d/default.conf` | HTTP localhost/development config   |
| `scripts/init-ssl.sh`       | First-time SSL setup script         |

## Architecture

```
                    ┌─────────────────┐
                    │   Let's Encrypt │
                    └────────┬────────┘
                             │ ACME Protocol
                             ▼
┌──────────┐     ┌───────────────────────┐     ┌─────────────┐
│ Certbot  │────▶│ /var/www/certbot      │◀────│   Nginx     │
│Container │     │ (ACME challenges)     │     │ Port 80/443 │
└──────────┘     └───────────────────────┘     └─────────────┘
      │                                               │
      │          ┌───────────────────────┐           │
      └─────────▶│ /etc/letsencrypt      │◀──────────┘
                 │ (SSL certificates)    │
                 └───────────────────────┘
```

## Updating Domain

If you need to change the domain:

1. Edit `nginx/conf.d/ssl.conf` with new domain
2. Request new certificate:
   ```bash
   docker compose -f docker-compose.prod.yml exec certbot \
     certbot certonly --webroot -w /var/www/certbot \
     -d new-domain.com --force-renewal
   ```
3. Update `ssl.conf` certificate paths
4. Reload nginx:
   ```bash
   docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
   ```

## Multiple Domains

To add additional domains (e.g., www subdomain):

```bash
docker compose -f docker-compose.prod.yml exec certbot \
  certbot certonly --webroot -w /var/www/certbot \
  -d your-domain.com -d www.your-domain.com
```

Update `ssl.conf`:

```nginx
server_name your-domain.com www.your-domain.com;
```
