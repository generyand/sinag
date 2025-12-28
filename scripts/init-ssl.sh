#!/bin/bash
# ==============================================================================
# SINAG SSL Certificate Initialization Script
# ==============================================================================
# This script sets up Let's Encrypt SSL certificates for the SINAG platform.
#
# PREREQUISITES:
# 1. Domain must be pointing to this server's IP address
# 2. Ports 80 and 443 must be open in security group/firewall
# 3. Docker and docker-compose must be installed
#
# USAGE:
#   ./scripts/init-ssl.sh your-domain.com your-email@example.com
#   ./scripts/init-ssl.sh sinag.example.com admin@example.com --staging  # Test first
#
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_msg() {
    local color=$1
    local msg=$2
    echo -e "${color}${msg}${NC}"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        print_msg $YELLOW "Note: Some operations may require sudo access."
    fi
}

# Validate domain format
validate_domain() {
    local domain=$1
    if [[ ! $domain =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$ ]]; then
        print_msg $RED "Error: Invalid domain format: $domain"
        exit 1
    fi
}

# Validate email format
validate_email() {
    local email=$1
    if [[ ! $email =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
        print_msg $RED "Error: Invalid email format: $email"
        exit 1
    fi
}

# Show usage
usage() {
    echo "Usage: $0 <domain> <email> [--staging]"
    echo ""
    echo "Arguments:"
    echo "  domain     Your domain name (e.g., sinag.example.com)"
    echo "  email      Email for Let's Encrypt notifications"
    echo "  --staging  Use Let's Encrypt staging server (for testing)"
    echo ""
    echo "Examples:"
    echo "  $0 sinag.example.com admin@example.com"
    echo "  $0 sinag.example.com admin@example.com --staging"
    exit 1
}

# Parse arguments
DOMAIN=""
EMAIL=""
STAGING=""
STAGING_ARG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --staging)
            STAGING="1"
            STAGING_ARG="--staging"
            shift
            ;;
        --help|-h)
            usage
            ;;
        *)
            if [[ -z "$DOMAIN" ]]; then
                DOMAIN=$1
            elif [[ -z "$EMAIL" ]]; then
                EMAIL=$1
            else
                print_msg $RED "Error: Unknown argument: $1"
                usage
            fi
            shift
            ;;
    esac
done

# Validate required arguments
if [[ -z "$DOMAIN" ]] || [[ -z "$EMAIL" ]]; then
    print_msg $RED "Error: Domain and email are required"
    usage
fi

validate_domain "$DOMAIN"
validate_email "$EMAIL"

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

print_msg $BLUE "=============================================="
print_msg $BLUE "SINAG SSL Certificate Setup"
print_msg $BLUE "=============================================="
echo ""
print_msg $GREEN "Domain: $DOMAIN"
print_msg $GREEN "Email: $EMAIL"
if [[ -n "$STAGING" ]]; then
    print_msg $YELLOW "Mode: STAGING (certificates will NOT be trusted by browsers)"
else
    print_msg $GREEN "Mode: PRODUCTION"
fi
echo ""

# Check permissions
check_permissions

# Change to project root
cd "$PROJECT_ROOT"

# Step 1: Update ssl.conf with the domain
print_msg $BLUE "[1/6] Updating Nginx SSL configuration with domain..."

if [[ -f "nginx/conf.d/ssl.conf" ]]; then
    # Create backup
    cp nginx/conf.d/ssl.conf nginx/conf.d/ssl.conf.backup

    # Replace placeholder domain with actual domain
    # Handle both YOUR_DOMAIN placeholder and any previously set domain
    # Use | as sed delimiter to avoid issues with domain characters
    sed -i "s|YOUR_DOMAIN|$DOMAIN|g" nginx/conf.d/ssl.conf
    sed -i "s|staging\.dilg-sinag\.tech|$DOMAIN|g" nginx/conf.d/ssl.conf
    print_msg $GREEN "Updated nginx/conf.d/ssl.conf with domain: $DOMAIN"
else
    print_msg $RED "Error: nginx/conf.d/ssl.conf not found"
    exit 1
fi

# Step 2: Create required directories
print_msg $BLUE "[2/6] Creating required directories..."

# Create certbot directories (will be mounted as volumes)
mkdir -p certbot/conf certbot/www
print_msg $GREEN "Created certbot directories"

# Step 3: Create dummy certificates (so Nginx can start)
print_msg $BLUE "[3/6] Creating temporary self-signed certificate..."

CERT_PATH="certbot/conf/live/$DOMAIN"
mkdir -p "$CERT_PATH"

# Generate self-signed certificate
openssl req -x509 -nodes -newkey rsa:4096 \
    -days 1 \
    -keyout "$CERT_PATH/privkey.pem" \
    -out "$CERT_PATH/fullchain.pem" \
    -subj "/CN=localhost" \
    2>/dev/null

# Create chain.pem (copy of fullchain for OCSP)
cp "$CERT_PATH/fullchain.pem" "$CERT_PATH/chain.pem"

print_msg $GREEN "Created temporary self-signed certificate"

# Step 4: Start Nginx with temporary certificate
print_msg $BLUE "[4/6] Starting Nginx with temporary certificate..."

# Create volumes and copy certificates
docker volume create sinag_certbot-conf 2>/dev/null || true
docker volume create sinag_certbot-www 2>/dev/null || true

# Copy certificates to volume using a temporary container
docker run --rm -v sinag_certbot-conf:/etc/letsencrypt -v "$(pwd)/certbot/conf:/src" alpine \
    sh -c "cp -r /src/* /etc/letsencrypt/ 2>/dev/null || true"

# Start only Nginx first (without waiting for full stack)
docker compose -f docker-compose.prod.yml up -d nginx

# Wait for Nginx to start
print_msg $YELLOW "Waiting for Nginx to start..."
sleep 5

# Check if Nginx is running
if ! docker compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    print_msg $RED "Error: Nginx failed to start. Check logs with:"
    print_msg $RED "  docker compose -f docker-compose.prod.yml logs nginx"
    exit 1
fi

print_msg $GREEN "Nginx is running"

# Step 5: Request real certificate from Let's Encrypt
print_msg $BLUE "[5/6] Requesting certificate from Let's Encrypt..."

# Delete dummy certificates
docker run --rm -v sinag_certbot-conf:/etc/letsencrypt alpine \
    rm -rf "/etc/letsencrypt/live/$DOMAIN"

# Request certificate
docker run --rm \
    -v sinag_certbot-conf:/etc/letsencrypt \
    -v sinag_certbot-www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    $STAGING_ARG \
    -d "$DOMAIN"

if [[ $? -ne 0 ]]; then
    print_msg $RED "Error: Failed to obtain certificate"
    print_msg $YELLOW "Common issues:"
    print_msg $YELLOW "  1. Domain not pointing to this server"
    print_msg $YELLOW "  2. Port 80 blocked by firewall/security group"
    print_msg $YELLOW "  3. Let's Encrypt rate limits (try --staging first)"
    exit 1
fi

print_msg $GREEN "Certificate obtained successfully!"

# Step 6: Reload Nginx with real certificate
print_msg $BLUE "[6/6] Reloading Nginx with real certificate..."

docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

print_msg $GREEN "Nginx reloaded with SSL certificate"

# Cleanup
rm -rf certbot/conf certbot/www
rm -f nginx/conf.d/ssl.conf.backup 2>/dev/null || true

# Final message
echo ""
print_msg $BLUE "=============================================="
print_msg $GREEN "SSL SETUP COMPLETE!"
print_msg $BLUE "=============================================="
echo ""
print_msg $GREEN "Your site is now available at:"
print_msg $GREEN "  https://$DOMAIN"
echo ""

if [[ -n "$STAGING" ]]; then
    print_msg $YELLOW "NOTE: You used --staging mode."
    print_msg $YELLOW "The certificate is NOT trusted by browsers."
    print_msg $YELLOW "Run without --staging for a real certificate."
fi

print_msg $BLUE "Next steps:"
echo "  1. Start the full stack:"
echo "     docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "  2. Certificates auto-renew via the certbot container"
echo ""
echo "  3. To manually renew:"
echo "     docker compose -f docker-compose.prod.yml exec certbot certbot renew"
echo ""
