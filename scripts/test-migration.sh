#!/bin/bash
# Migration Health Check Script
# Tests migration upgrade and downgrade using a temporary Docker Postgres database
#
# Usage:
#   ./scripts/test-migration.sh [migration_revision]
#
# Examples:
#   ./scripts/test-migration.sh                    # Test all pending migrations
#   ./scripts/test-migration.sh fix_is_bbi_official_7_only  # Test specific migration
#
# This script:
# 1. Spins up a temporary Postgres container
# 2. Runs all migrations up to the specified revision (or all)
# 3. Tests downgrade to previous revision
# 4. Tests upgrade again
# 5. Cleans up the container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="sinag-migration-test-$$"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="testpassword"
POSTGRES_DB="sinag_migration_test"
POSTGRES_PORT="5433"  # Use different port to avoid conflicts
MIGRATION_REVISION="${1:-head}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SINAG Migration Health Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to cleanup
cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
    echo -e "${GREEN}Cleanup complete${NC}"
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed or not in PATH${NC}"
    exit 1
fi

# Start temporary Postgres container
echo -e "${BLUE}[1/6] Starting temporary Postgres container...${NC}"
docker run -d \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_USER="$POSTGRES_USER" \
    -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    -e POSTGRES_DB="$POSTGRES_DB" \
    -p "$POSTGRES_PORT:5432" \
    postgres:15-alpine \
    > /dev/null

# Wait for Postgres to be ready
echo -e "${BLUE}[2/6] Waiting for Postgres to be ready...${NC}"
for i in {1..30}; do
    if docker exec "$CONTAINER_NAME" pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
        echo -e "${GREEN}Postgres is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Timeout waiting for Postgres${NC}"
        exit 1
    fi
    sleep 1
done

# Set DATABASE_URL for alembic
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}"

# Change to API directory
cd "$(dirname "$0")/../apps/api"

# Run upgrade to target revision
echo -e "${BLUE}[3/6] Running migration upgrade to '${MIGRATION_REVISION}'...${NC}"
if uv run alembic upgrade "$MIGRATION_REVISION"; then
    echo -e "${GREEN}Upgrade successful!${NC}"
else
    echo -e "${RED}Upgrade FAILED!${NC}"
    exit 1
fi

# Get current revision
CURRENT_REVISION=$(uv run alembic current 2>/dev/null | head -1 | awk '{print $1}')
echo -e "Current revision: ${YELLOW}${CURRENT_REVISION}${NC}"

# Get previous revision for downgrade test
if [ "$MIGRATION_REVISION" != "head" ]; then
    # If specific revision provided, get its down_revision
    PREVIOUS_REVISION=$(uv run alembic show "$MIGRATION_REVISION" 2>/dev/null | grep "Rev:" | head -1 | sed 's/.*-> \([^,]*\).*/\1/' | awk '{print $1}')
else
    # Get the revision before current
    PREVIOUS_REVISION=$(uv run alembic history -r-1:current 2>/dev/null | tail -1 | awk '{print $3}' | tr -d ',')
fi

if [ -n "$PREVIOUS_REVISION" ] && [ "$PREVIOUS_REVISION" != "None" ] && [ "$PREVIOUS_REVISION" != "(head)" ]; then
    # Test downgrade
    echo -e "${BLUE}[4/6] Testing downgrade to '${PREVIOUS_REVISION}'...${NC}"
    if uv run alembic downgrade "$PREVIOUS_REVISION"; then
        echo -e "${GREEN}Downgrade successful!${NC}"
    else
        echo -e "${RED}Downgrade FAILED!${NC}"
        exit 1
    fi

    # Test upgrade again
    echo -e "${BLUE}[5/6] Testing upgrade again to '${MIGRATION_REVISION}'...${NC}"
    if uv run alembic upgrade "$MIGRATION_REVISION"; then
        echo -e "${GREEN}Re-upgrade successful!${NC}"
    else
        echo -e "${RED}Re-upgrade FAILED!${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}[4/6] Skipping downgrade test (no previous revision)${NC}"
    echo -e "${YELLOW}[5/6] Skipping re-upgrade test${NC}"
fi

# Verify final state
echo -e "${BLUE}[6/6] Verifying final state...${NC}"
FINAL_REVISION=$(uv run alembic current 2>/dev/null | head -1 | awk '{print $1}')
echo -e "Final revision: ${YELLOW}${FINAL_REVISION}${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Migration Health Check PASSED!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Summary:"
echo -e "  - Upgrade to ${MIGRATION_REVISION}: ${GREEN}OK${NC}"
if [ -n "$PREVIOUS_REVISION" ] && [ "$PREVIOUS_REVISION" != "None" ] && [ "$PREVIOUS_REVISION" != "(head)" ]; then
    echo -e "  - Downgrade to ${PREVIOUS_REVISION}: ${GREEN}OK${NC}"
    echo -e "  - Re-upgrade to ${MIGRATION_REVISION}: ${GREEN}OK${NC}"
fi
echo ""
