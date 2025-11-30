#!/bin/bash
# ==============================================================================
# SINAG Deployment Script for EC2
# ==============================================================================
# This script handles deployment on an EC2 instance.
#
# Usage:
#   ./scripts/deploy.sh              # Deploy latest
#   ./scripts/deploy.sh v1.0.0       # Deploy specific version
#   ./scripts/deploy.sh --migrate    # Deploy and run migrations
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
IMAGE_TAG="${1:-latest}"
RUN_MIGRATIONS=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --migrate)
            RUN_MIGRATIONS=true
            shift
            ;;
        v*)
            IMAGE_TAG="$arg"
            shift
            ;;
    esac
done

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  SINAG Deployment Script${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# ------------------------------------------------------------------------------
# Pre-flight checks
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[1/6] Running pre-flight checks...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}Error: $COMPOSE_FILE not found${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found. Copy .env.example to .env and configure it.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Pre-flight checks passed${NC}"

# ------------------------------------------------------------------------------
# Export environment variables
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[2/6] Loading environment...${NC}"
export IMAGE_TAG
export $(grep -v '^#' .env | xargs)
echo -e "${GREEN}✓ Environment loaded (IMAGE_TAG=$IMAGE_TAG)${NC}"

# ------------------------------------------------------------------------------
# Pull latest images
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[3/6] Pulling images from GHCR...${NC}"
docker compose -f "$COMPOSE_FILE" pull
echo -e "${GREEN}✓ Images pulled${NC}"

# ------------------------------------------------------------------------------
# Stop existing containers gracefully
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[4/6] Stopping existing containers...${NC}"
docker compose -f "$COMPOSE_FILE" down --remove-orphans || true
echo -e "${GREEN}✓ Containers stopped${NC}"

# ------------------------------------------------------------------------------
# Start new containers
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[5/6] Starting containers...${NC}"
docker compose -f "$COMPOSE_FILE" up -d
echo -e "${GREEN}✓ Containers started${NC}"

# ------------------------------------------------------------------------------
# Run migrations if requested
# ------------------------------------------------------------------------------
if [ "$RUN_MIGRATIONS" = true ]; then
    echo -e "${YELLOW}[6/6] Running database migrations...${NC}"

    # Wait for API to be healthy
    echo "Waiting for API to be healthy..."
    sleep 10

    # Run migrations and check for errors
    if docker compose -f "$COMPOSE_FILE" exec -T api alembic upgrade head; then
        echo -e "${GREEN}✓ Migrations completed successfully${NC}"
    else
        echo -e "${RED}✗ Migration failed!${NC}"
        echo "Check logs with: docker compose -f $COMPOSE_FILE logs api"
        exit 1
    fi
else
    echo -e "${YELLOW}[6/6] Skipping migrations (use --migrate to run)${NC}"
fi

# ------------------------------------------------------------------------------
# Health check
# ------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}Checking service health...${NC}"
sleep 5

if curl -s -o /dev/null -w "%{http_code}" http://localhost/health | grep -q "200"; then
    echo -e "${GREEN}✓ Application is healthy!${NC}"
else
    echo -e "${YELLOW}⚠ Health check pending. Services may still be starting.${NC}"
    echo "Run 'docker compose -f $COMPOSE_FILE logs' to check status."
fi

# ------------------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo "Services running:"
docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo -e "Access your application at: ${GREEN}http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_EC2_IP')${NC}"
