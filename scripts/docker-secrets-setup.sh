#!/bin/bash
# ==============================================================================
# Docker Secrets Setup Script
# ==============================================================================
# This script helps set up Docker secrets for production deployment.
# It provides an interactive way to create secrets without exposing them
# in environment files or command history.
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  SINAG Docker Secrets Setup${NC}"
echo -e "${BLUE}======================================${NC}\n"

# Check if running in swarm mode
if ! docker info 2>/dev/null | grep -q "Swarm: active"; then
    echo -e "${YELLOW}Warning: Docker Swarm is not active.${NC}"
    echo -e "${YELLOW}Docker secrets require Swarm mode.${NC}\n"

    read -p "Initialize Docker Swarm? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Initializing Docker Swarm...${NC}"
        docker swarm init
        echo -e "${GREEN}Docker Swarm initialized successfully${NC}\n"
    else
        echo -e "${RED}Aborted. Docker secrets require Swarm mode.${NC}"
        exit 1
    fi
fi

# Function to create secret from user input
create_secret() {
    local secret_name=$1
    local description=$2
    local existing_secret=$3

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Setting up: $secret_name${NC}"
    echo -e "${BLUE}Description: $description${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

    # Check if secret already exists
    if docker secret ls | grep -q "$secret_name"; then
        echo -e "${YELLOW}Secret '$secret_name' already exists.${NC}"
        read -p "Remove and recreate? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Removing existing secret...${NC}"
            docker secret rm "$secret_name" || true
        else
            echo -e "${GREEN}Keeping existing secret.${NC}\n"
            return 0
        fi
    fi

    # Option 1: Enter value manually
    if [ -z "$existing_secret" ]; then
        echo "Enter the value for $secret_name:"
        read -rs secret_value
        echo

        if [ -z "$secret_value" ]; then
            echo -e "${RED}Error: Empty value provided. Skipping...${NC}\n"
            return 1
        fi
    else
        secret_value="$existing_secret"
    fi

    # Create secret
    echo "$secret_value" | docker secret create "$secret_name" - >/dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Secret '$secret_name' created successfully${NC}\n"
        return 0
    else
        echo -e "${RED}✗ Failed to create secret '$secret_name'${NC}\n"
        return 1
    fi
}

# Function to create secret from file
create_secret_from_file() {
    local secret_name=$1
    local file_path=$2
    local description=$3

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Setting up: $secret_name from file${NC}"
    echo -e "${BLUE}File: $file_path${NC}"
    echo -e "${BLUE}Description: $description${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

    if [ ! -f "$file_path" ]; then
        echo -e "${YELLOW}File not found: $file_path${NC}"
        echo -e "${YELLOW}Skipping...${NC}\n"
        return 1
    fi

    # Check if secret already exists
    if docker secret ls | grep -q "$secret_name"; then
        echo -e "${YELLOW}Secret '$secret_name' already exists.${NC}"
        read -p "Remove and recreate? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Removing existing secret...${NC}"
            docker secret rm "$secret_name" || true
        else
            echo -e "${GREEN}Keeping existing secret.${NC}\n"
            return 0
        fi
    fi

    # Create secret from file
    docker secret create "$secret_name" "$file_path" >/dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Secret '$secret_name' created successfully from file${NC}\n"
        return 0
    else
        echo -e "${RED}✗ Failed to create secret '$secret_name'${NC}\n"
        return 1
    fi
}

# Function to show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --from-env FILE    Load secrets from .env file"
    echo "  --interactive      Interactive mode (default)"
    echo "  --list             List all existing secrets"
    echo "  --remove-all       Remove all SINAG secrets"
    echo "  --help             Show this help message"
    echo ""
}

# Function to load from .env file
load_from_env() {
    local env_file=$1

    if [ ! -f "$env_file" ]; then
        echo -e "${RED}Error: Environment file not found: $env_file${NC}"
        exit 1
    fi

    echo -e "${BLUE}Loading secrets from $env_file...${NC}\n"

    # Source the .env file
    source "$env_file"

    # Create secrets from environment variables
    [ -n "$SECRET_KEY" ] && create_secret "sinag_secret_key" "Application secret key" "$SECRET_KEY"
    [ -n "$DATABASE_URL" ] && create_secret "sinag_database_url" "Database connection URL" "$DATABASE_URL"
    [ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && create_secret "sinag_supabase_key" "Supabase service role key" "$SUPABASE_SERVICE_ROLE_KEY"
    [ -n "$GEMINI_API_KEY" ] && create_secret "sinag_gemini_api_key" "Google Gemini API key" "$GEMINI_API_KEY"
    [ -n "$REDIS_PASSWORD" ] && create_secret "sinag_redis_password" "Redis password" "$REDIS_PASSWORD"

    echo -e "${GREEN}Secrets loaded from environment file${NC}"
}

# Function to list secrets
list_secrets() {
    echo -e "${BLUE}Existing SINAG secrets:${NC}\n"
    docker secret ls --filter name=sinag_ --format "table {{.ID}}\t{{.Name}}\t{{.CreatedAt}}"
    echo ""
}

# Function to remove all secrets
remove_all_secrets() {
    echo -e "${YELLOW}This will remove all SINAG secrets:${NC}"
    docker secret ls --filter name=sinag_ --format "{{.Name}}"
    echo ""

    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Removing secrets...${NC}"
        docker secret ls --filter name=sinag_ --format "{{.Name}}" | xargs -r docker secret rm
        echo -e "${GREEN}All SINAG secrets removed${NC}"
    else
        echo "Cancelled"
    fi
}

# Parse command line arguments
case "${1:-}" in
    --from-env)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: --from-env requires a file path${NC}"
            usage
            exit 1
        fi
        load_from_env "$2"
        ;;
    --list)
        list_secrets
        ;;
    --remove-all)
        remove_all_secrets
        ;;
    --help)
        usage
        exit 0
        ;;
    --interactive|"")
        # Interactive mode (default)
        echo -e "${YELLOW}Interactive mode - You will be prompted for each secret${NC}\n"

        # Create secrets interactively
        create_secret "sinag_secret_key" "Application secret key (used for JWT tokens)"
        create_secret "sinag_database_url" "PostgreSQL database connection URL"
        create_secret "sinag_supabase_key" "Supabase service role key"
        create_secret "sinag_gemini_api_key" "Google Gemini API key (for AI features)"
        create_secret "sinag_redis_password" "Redis password (for Celery)"

        echo -e "${GREEN}======================================${NC}"
        echo -e "${GREEN}  Setup Complete!${NC}"
        echo -e "${GREEN}======================================${NC}\n"

        echo -e "Secrets have been created. You can now deploy using:"
        echo -e "${BLUE}docker stack deploy -c docker-compose.prod.yml sinag${NC}\n"

        echo -e "To view created secrets:"
        echo -e "${BLUE}$0 --list${NC}\n"
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}\n"
        usage
        exit 1
        ;;
esac
