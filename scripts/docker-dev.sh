#!/bin/bash
# ==============================================================================
# SINAG Docker Development Helper Script
# ==============================================================================
# Convenience script for managing Docker containers during development.
# Supports both development and production workflows.
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="SINAG"
COMPOSE_DEV_FILES="-f docker-compose.yml -f docker-compose.dev.yml"
COMPOSE_PROD_FILE="-f docker-compose.prod.yml"

echo -e "${BLUE}${PROJECT_NAME} Docker Management${NC}\n"

# Function to show usage
usage() {
    cat << EOF
${GREEN}Usage:${NC} $0 [command] [options]

${GREEN}Development Commands:${NC}
  ${CYAN}up${NC}              Start all services in development mode
  ${CYAN}down${NC}            Stop all services
  ${CYAN}restart${NC}         Restart all services
  ${CYAN}build${NC}           Build all images without cache
  ${CYAN}rebuild${NC}         Rebuild specific service (usage: $0 rebuild api|web|celery|nginx)
  ${CYAN}logs${NC}            Show logs from all services
  ${CYAN}logs-api${NC}        Show API logs only
  ${CYAN}logs-web${NC}        Show web logs only
  ${CYAN}logs-celery${NC}     Show Celery worker logs only
  ${CYAN}logs-nginx${NC}      Show Nginx logs only
  ${CYAN}shell${NC}           Open shell in API container
  ${CYAN}shell-web${NC}       Open shell in web container
  ${CYAN}shell-nginx${NC}     Open shell in Nginx container
  ${CYAN}clean${NC}           Remove containers, volumes, and images
  ${CYAN}status${NC}          Show status of all services
  ${CYAN}ps${NC}              Show running containers

${GREEN}Production Commands:${NC}
  ${CYAN}prod:up${NC}         Start all services in production mode
  ${CYAN}prod:down${NC}       Stop production services
  ${CYAN}prod:build${NC}      Build production images
  ${CYAN}prod:logs${NC}       Show production logs
  ${CYAN}prod:status${NC}     Show production status
  ${CYAN}prod:deploy${NC}     Deploy to Docker Swarm

${GREEN}Utility Commands:${NC}
  ${CYAN}check-ports${NC}     Check for port conflicts
  ${CYAN}kill-ports${NC}      Kill processes using Docker ports
  ${CYAN}health${NC}          Check health status of all services
  ${CYAN}stats${NC}           Show resource usage statistics
  ${CYAN}prune${NC}           Remove unused Docker resources
  ${CYAN}security-scan${NC}   Run security vulnerability scan
  ${CYAN}setup-secrets${NC}   Set up Docker secrets for production
  ${CYAN}nginx-reload${NC}    Reload Nginx configuration (zero-downtime)
  ${CYAN}nginx-test${NC}      Test Nginx configuration

${GREEN}Database Commands:${NC}
  ${CYAN}db:migrate${NC}      Run database migrations
  ${CYAN}db:rollback${NC}     Rollback last migration
  ${CYAN}db:shell${NC}        Open PostgreSQL shell (requires Supabase credentials)

${GREEN}Options:${NC}
  ${CYAN}--help${NC}          Show this help message
  ${CYAN}--verbose${NC}       Enable verbose output

${GREEN}Examples:${NC}
  $0 up                    # Start development environment
  $0 logs-api              # View API logs
  $0 prod:build            # Build production images
  $0 security-scan         # Scan for vulnerabilities

EOF
    exit 0
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed${NC}"
        echo "Please install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
}

# Check if Docker Compose is installed
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}Error: Docker Compose is not installed${NC}"
        echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
}

# Determine Docker Compose command
get_compose_cmd() {
    if docker compose version &> /dev/null 2>&1; then
        echo "docker compose"
    else
        echo "docker-compose"
    fi
}

# Check environment files
check_env_files() {
    local missing_files=()

    if [ ! -f "apps/api/.env" ]; then
        missing_files+=("apps/api/.env")
    fi

    if [ ! -f "apps/web/.env.local" ]; then
        echo -e "${YELLOW}Warning: apps/web/.env.local not found${NC}"
        if [ -f "apps/web/.env.example" ]; then
            echo -e "${BLUE}Creating from apps/web/.env.example...${NC}"
            cp apps/web/.env.example apps/web/.env.local 2>/dev/null || true
        fi
    fi

    if [ ${#missing_files[@]} -gt 0 ]; then
        echo -e "${YELLOW}Warning: Missing environment files:${NC}"
        for file in "${missing_files[@]}"; do
            echo -e "  - $file"
        done
        echo -e "\n${YELLOW}Please create these files before continuing.${NC}"
        echo -e "Copy from .env.example files and configure your credentials.\n"
        return 1
    fi

    return 0
}

# Check port availability
check_ports() {
    echo -e "${BLUE}Checking for port conflicts...${NC}\n"
    local ports=(80 8000 3000 6379)
    local conflicts=0

    for port in "${ports[@]}"; do
        if lsof -i :$port >/dev/null 2>&1; then
            echo -e "${YELLOW}Port $port is in use:${NC}"
            lsof -i :$port
            echo ""
            ((conflicts++))
        else
            echo -e "${GREEN}✓ Port $port is available${NC}"
        fi
    done

    if [ $conflicts -gt 0 ]; then
        echo -e "\n${YELLOW}Found $conflicts port conflict(s).${NC}"
        echo -e "Run '${CYAN}$0 kill-ports${NC}' to free these ports.\n"
        return 1
    fi

    echo -e "\n${GREEN}All ports are available${NC}\n"
    return 0
}

# Kill processes on ports
kill_ports() {
    echo -e "${YELLOW}Warning: This will kill processes using ports 80, 8000, 3000, and 6379${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled"
        return 1
    fi

    echo -e "${YELLOW}Killing processes...${NC}"
    local ports=(80 8000 3000 6379)
    for port in "${ports[@]}"; do
        pids=$(lsof -ti :$port 2>/dev/null || true)
        if [ ! -z "$pids" ]; then
            kill $pids 2>/dev/null && echo -e "${GREEN}✓ Freed port $port${NC}" || echo -e "${YELLOW}Failed to free port $port${NC}"
        fi
    done
    echo -e "${GREEN}Done${NC}\n"
}

# Check health status
check_health() {
    echo -e "${BLUE}Checking service health...${NC}\n"

    local DOCKER_COMPOSE=$(get_compose_cmd)

    # Get running containers
    containers=$($DOCKER_COMPOSE $COMPOSE_DEV_FILES ps -q 2>/dev/null)

    if [ -z "$containers" ]; then
        echo -e "${YELLOW}No containers are running${NC}\n"
        return 1
    fi

    for container in $containers; do
        container_name=$(docker inspect --format='{{.Name}}' $container | sed 's/\///')
        health=$(docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null || echo "no healthcheck")

        case $health in
            "healthy")
                echo -e "${GREEN}✓ $container_name: healthy${NC}"
                ;;
            "unhealthy")
                echo -e "${RED}✗ $container_name: unhealthy${NC}"
                ;;
            "starting")
                echo -e "${YELLOW}⏳ $container_name: starting${NC}"
                ;;
            *)
                echo -e "${BLUE}ℹ $container_name: running (no healthcheck)${NC}"
                ;;
        esac
    done
    echo ""
}

# Show resource usage
show_stats() {
    echo -e "${BLUE}Resource usage statistics:${NC}\n"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    echo ""
}

# Prune unused resources
prune_resources() {
    echo -e "${YELLOW}This will remove:${NC}"
    echo "  - Stopped containers"
    echo "  - Unused networks"
    echo "  - Dangling images"
    echo "  - Build cache"
    echo ""

    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Pruning Docker resources...${NC}"
        docker system prune -f
        echo -e "${GREEN}Prune complete${NC}\n"
    else
        echo "Cancelled"
    fi
}

# Main command handler
COMMAND=${1:-"help"}
DOCKER_COMPOSE=$(get_compose_cmd)

# Check prerequisites
check_docker
check_docker_compose

case "$COMMAND" in
    # Development commands
    up)
        echo -e "${BLUE}Starting development environment...${NC}\n"
        check_env_files || exit 1
        $DOCKER_COMPOSE $COMPOSE_DEV_FILES up -d
        echo -e "\n${GREEN}Services started!${NC}"
        echo -e "  ${GREEN}Nginx (Main Entry):${NC} ${CYAN}http://localhost${NC}"
        echo -e "  API (Direct):       ${CYAN}http://localhost:8000${NC}"
        echo -e "  Web (Direct):       ${CYAN}http://localhost:3000${NC}"
        echo -e "  Redis:              ${CYAN}localhost:6379${NC}"
        echo -e "\n${BLUE}Recommended:${NC} Access via Nginx at ${CYAN}http://localhost${NC}"
        echo -e "${BLUE}View logs:${NC} $0 logs"
        echo -e "${BLUE}Check health:${NC} $0 health\n"
        ;;

    down)
        echo -e "${YELLOW}Stopping all services...${NC}\n"
        $DOCKER_COMPOSE $COMPOSE_DEV_FILES down
        echo -e "${GREEN}All services stopped${NC}\n"
        ;;

    restart)
        echo -e "${YELLOW}Restarting all services...${NC}\n"
        $DOCKER_COMPOSE $COMPOSE_DEV_FILES restart
        echo -e "${GREEN}All services restarted${NC}\n"
        ;;

    build)
        echo -e "${BLUE}Building all images (no cache)...${NC}\n"
        $DOCKER_COMPOSE $COMPOSE_DEV_FILES build --no-cache
        echo -e "${GREEN}Build complete${NC}\n"
        ;;

    rebuild)
        SERVICE=$2
        if [ -z "$SERVICE" ]; then
            echo -e "${RED}Error: Specify service to rebuild (api|web|celery|nginx)${NC}"
            exit 1
        fi
        echo -e "${BLUE}Rebuilding $SERVICE...${NC}\n"
        $DOCKER_COMPOSE $COMPOSE_DEV_FILES build --no-cache $SERVICE
        $DOCKER_COMPOSE $COMPOSE_DEV_FILES up -d $SERVICE
        echo -e "${GREEN}Rebuild complete${NC}\n"
        ;;

    logs)
        echo -e "${BLUE}Showing logs (Ctrl+C to exit)...${NC}\n"
        $DOCKER_COMPOSE $COMPOSE_DEV_FILES logs -f
        ;;

    logs-api)
        echo -e "${BLUE}Showing API logs (Ctrl+C to exit)...${NC}\n"
        $DOCKER_COMPOSE $COMPOSE_DEV_FILES logs -f api
        ;;

    logs-web)
        echo -e "${BLUE}Showing web logs (Ctrl+C to exit)...${NC}\n"
        $DOCKER_COMPOSE $COMPOSE_DEV_FILES logs -f web
        ;;

    logs-celery)
        echo -e "${BLUE}Showing Celery logs (Ctrl+C to exit)...${NC}\n"
        $DOCKER_COMPOSE $COMPOSE_DEV_FILES logs -f celery-worker
        ;;

    logs-nginx)
        echo -e "${BLUE}Showing Nginx logs (Ctrl+C to exit)...${NC}\n"
        $DOCKER_COMPOSE $COMPOSE_DEV_FILES logs -f nginx
        ;;

    shell)
        echo -e "${BLUE}Opening shell in API container...${NC}\n"
        docker exec -it sinag-api /bin/bash || docker exec -it sinag-api /bin/sh
        ;;

    shell-web)
        echo -e "${BLUE}Opening shell in web container...${NC}\n"
        docker exec -it sinag-web /bin/sh
        ;;

    shell-nginx)
        echo -e "${BLUE}Opening shell in Nginx container...${NC}\n"
        docker exec -it sinag-nginx /bin/sh
        ;;

    clean)
        echo -e "${YELLOW}This will remove containers, volumes, and images${NC}"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Cleaning up...${NC}\n"
            $DOCKER_COMPOSE $COMPOSE_DEV_FILES down -v
            docker system prune -a --volumes -f
            echo -e "${GREEN}Cleanup complete${NC}\n"
        else
            echo "Cancelled"
        fi
        ;;

    status)
        echo -e "${BLUE}Service status:${NC}\n"
        $DOCKER_COMPOSE $COMPOSE_DEV_FILES ps
        echo ""
        ;;

    ps)
        docker ps --filter "name=sinag-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        ;;

    # Production commands
    prod:up)
        echo -e "${BLUE}Starting production environment...${NC}\n"
        $DOCKER_COMPOSE $COMPOSE_PROD_FILE up -d
        echo -e "${GREEN}Production services started${NC}\n"
        ;;

    prod:down)
        echo -e "${YELLOW}Stopping production services...${NC}\n"
        $DOCKER_COMPOSE $COMPOSE_PROD_FILE down
        echo -e "${GREEN}Production services stopped${NC}\n"
        ;;

    prod:build)
        echo -e "${BLUE}Building production images...${NC}\n"
        $DOCKER_COMPOSE $COMPOSE_PROD_FILE build --no-cache
        echo -e "${GREEN}Production build complete${NC}\n"
        ;;

    prod:logs)
        echo -e "${BLUE}Showing production logs (Ctrl+C to exit)...${NC}\n"
        $DOCKER_COMPOSE $COMPOSE_PROD_FILE logs -f
        ;;

    prod:status)
        echo -e "${BLUE}Production service status:${NC}\n"
        $DOCKER_COMPOSE $COMPOSE_PROD_FILE ps
        echo ""
        ;;

    prod:deploy)
        echo -e "${BLUE}Deploying to Docker Swarm...${NC}\n"
        if ! docker info 2>/dev/null | grep -q "Swarm: active"; then
            echo -e "${RED}Error: Docker Swarm is not initialized${NC}"
            echo "Run: docker swarm init"
            exit 1
        fi
        docker stack deploy -c docker-compose.prod.yml sinag
        echo -e "${GREEN}Deployment complete${NC}\n"
        ;;

    # Utility commands
    check-ports)
        check_ports
        ;;

    kill-ports)
        kill_ports
        ;;

    health)
        check_health
        ;;

    stats)
        show_stats
        ;;

    prune)
        prune_resources
        ;;

    security-scan)
        if [ -f "./scripts/docker-security-scan.sh" ]; then
            ./scripts/docker-security-scan.sh
        else
            echo -e "${RED}Error: Security scan script not found${NC}"
            exit 1
        fi
        ;;

    setup-secrets)
        if [ -f "./scripts/docker-secrets-setup.sh" ]; then
            ./scripts/docker-secrets-setup.sh "$@"
        else
            echo -e "${RED}Error: Secrets setup script not found${NC}"
            exit 1
        fi
        ;;

    nginx-reload)
        echo -e "${BLUE}Reloading Nginx configuration...${NC}\n"
        docker exec sinag-nginx nginx -s reload
        echo -e "${GREEN}Nginx configuration reloaded${NC}\n"
        ;;

    nginx-test)
        echo -e "${BLUE}Testing Nginx configuration...${NC}\n"
        docker exec sinag-nginx nginx -t
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Nginx configuration is valid${NC}\n"
        else
            echo -e "${RED}Nginx configuration has errors${NC}\n"
            exit 1
        fi
        ;;

    # Database commands
    db:migrate)
        echo -e "${BLUE}Running database migrations...${NC}\n"
        docker exec -it sinag-api alembic upgrade head
        echo -e "${GREEN}Migrations complete${NC}\n"
        ;;

    db:rollback)
        echo -e "${YELLOW}Rolling back last migration...${NC}\n"
        docker exec -it sinag-api alembic downgrade -1
        echo -e "${GREEN}Rollback complete${NC}\n"
        ;;

    db:shell)
        echo -e "${BLUE}Opening database shell...${NC}"
        echo -e "${YELLOW}Note: Requires DATABASE_URL in apps/api/.env${NC}\n"
        docker exec -it sinag-api bash -c 'psql $DATABASE_URL'
        ;;

    --help|help)
        usage
        ;;

    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}\n"
        usage
        exit 1
        ;;
esac
