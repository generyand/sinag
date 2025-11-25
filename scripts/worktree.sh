#!/usr/bin/env bash
#
# Git Worktree Management Script for VANTAGE
# Automates creation, setup, and removal of git worktrees for parallel development
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
MAIN_REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE_BASE_DIR="$(dirname "$MAIN_REPO_DIR")/vantage-worktrees"
DEFAULT_BASE_BRANCH="develop"

# Port offset for each worktree (to avoid conflicts)
# Each worktree gets: API_PORT = 8000 + offset, WEB_PORT = 3000 + offset
# Finds the next available port by checking existing worktree assignments
calculate_port_offset() {
    local max_offset=0

    # Check all existing worktrees for their port assignments
    while IFS= read -r line; do
        local wt_path
        wt_path=$(echo "$line" | awk '{print $1}')

        if [[ -f "${wt_path}/.worktree-info" ]]; then
            local api_port
            api_port=$(grep "API_PORT=" "${wt_path}/.worktree-info" 2>/dev/null | cut -d'=' -f2)
            if [[ -n "$api_port" ]]; then
                local offset=$((api_port - 8000))
                if [[ $offset -gt $max_offset ]]; then
                    max_offset=$offset
                fi
            fi
        fi
    done <<< "$(git worktree list)"

    # Return next available offset (max + 1)
    # If no worktrees have .worktree-info, start at 1 (main uses 0)
    echo $((max_offset + 1))
}

print_header() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  VANTAGE Git Worktree Manager${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Show usage information
usage() {
    print_header
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  create <type> <name>    Create a new worktree"
    echo "                          Types: feature, fix, perf, docs, refactor"
    echo "                          Example: $0 create feature analytics-dashboard"
    echo ""
    echo "  list                    List all worktrees with status"
    echo ""
    echo "  remove <name>           Remove a worktree and optionally delete branch"
    echo "                          Example: $0 remove analytics-dashboard"
    echo ""
    echo "  setup <path>            Install dependencies in a worktree"
    echo "                          Example: $0 setup feature-analytics"
    echo ""
    echo "  sync <path>             Sync worktree with base branch (develop)"
    echo "                          Example: $0 sync feature-analytics"
    echo ""
    echo "  env <path>              Copy/sync .env files from main worktree"
    echo "                          Example: $0 env feature-analytics"
    echo "                          Use 'env --all' to sync all worktrees"
    echo ""
    echo "  status                  Show detailed status of all worktrees"
    echo ""
    echo "  finish <name>           Merge worktree into develop and clean up"
    echo "                          Example: $0 finish feature-analytics"
    echo ""
    echo "  clean                   Remove all worktrees (with confirmation)"
    echo ""
    echo "  ports                   Show port assignments for all worktrees"
    echo ""
    echo "Options:"
    echo "  -b, --base <branch>     Base branch for new worktree (default: develop)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 create feature user-analytics"
    echo "  $0 create fix pagination-bug"
    echo "  $0 list"
    echo "  $0 remove user-analytics"
    echo ""
}

# Create a new worktree
cmd_create() {
    local type="$1"
    local name="$2"
    local base_branch="${3:-$DEFAULT_BASE_BRANCH}"

    if [[ -z "$type" || -z "$name" ]]; then
        print_error "Usage: $0 create <type> <name> [base-branch]"
        print_info "Types: feature, fix, perf, docs, refactor"
        exit 1
    fi

    # Validate type
    case "$type" in
        feature|fix|perf|docs|refactor) ;;
        *)
            print_error "Invalid type: $type"
            print_info "Valid types: feature, fix, perf, docs, refactor"
            exit 1
            ;;
    esac

    local branch_name="${type}/${name}"
    local dir_name="${type}-${name}"
    local worktree_path="${WORKTREE_BASE_DIR}/${dir_name}"

    # Ensure worktrees directory exists
    if [[ ! -d "$WORKTREE_BASE_DIR" ]]; then
        mkdir -p "$WORKTREE_BASE_DIR"
        print_info "Created worktrees directory: ${WORKTREE_BASE_DIR}"
    fi

    print_header
    echo ""
    print_info "Creating worktree..."
    echo "  Branch: ${branch_name}"
    echo "  Path:   ${worktree_path}"
    echo "  Base:   ${base_branch}"
    echo ""

    # Check if branch already exists
    if git show-ref --verify --quiet "refs/heads/${branch_name}"; then
        print_warning "Branch '${branch_name}' already exists"
        read -p "Check out existing branch? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git worktree add "$worktree_path" "$branch_name"
        else
            print_error "Aborted"
            exit 1
        fi
    else
        # Fetch latest from remote first
        print_info "Fetching latest from remote..."
        git fetch origin

        # Create worktree with new branch
        git worktree add -b "$branch_name" "$worktree_path" "$base_branch"
    fi

    print_success "Worktree created at: ${worktree_path}"

    # Calculate port offset
    local port_offset
    port_offset=$(calculate_port_offset)
    local api_port=$((8000 + port_offset))
    local web_port=$((3000 + port_offset))

    # Create environment files with unique ports
    print_info "Configuring environment (API: ${api_port}, Web: ${web_port})..."

    # Create directories
    mkdir -p "${worktree_path}/apps/web"
    mkdir -p "${worktree_path}/apps/api"

    # Copy and configure API .env
    local main_api_env="${MAIN_REPO_DIR}/apps/api/.env"
    local worktree_api_env="${worktree_path}/apps/api/.env"

    if [[ -f "$main_api_env" ]]; then
        print_info "Copying API .env from main worktree..."
        cp "$main_api_env" "$worktree_api_env"

        # Update port-related settings if they exist (optional - API usually runs on same port)
        # For now, we keep the same database/redis config (shared services)
        # Add a marker comment at the top
        local temp_file=$(mktemp)
        echo "# Auto-configured by worktree.sh - Worktree: ${dir_name}" > "$temp_file"
        echo "# API Port: ${api_port} (update if needed)" >> "$temp_file"
        echo "" >> "$temp_file"
        cat "$worktree_api_env" >> "$temp_file"
        mv "$temp_file" "$worktree_api_env"

        print_success "API .env copied and configured"
    else
        print_warning "No .env found at ${main_api_env}"
        print_info "You'll need to create apps/api/.env manually"

        # Create a template
        cat > "$worktree_api_env" << APIEOF
# VANTAGE API Environment - Worktree: ${dir_name}
# Copy settings from main worktree or configure manually

DEBUG=true
ENVIRONMENT=development
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Supabase (copy from main .env)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# Celery/Redis (shared with main worktree)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Gemini AI (copy from main .env)
GEMINI_API_KEY=
APIEOF
    fi

    # Copy and configure Web .env.local
    local main_web_env="${MAIN_REPO_DIR}/apps/web/.env.local"
    local worktree_web_env="${worktree_path}/apps/web/.env.local"

    # Always create web .env.local with correct ports (overrides if exists)
    cat > "$worktree_web_env" << WEBEOF
# Auto-generated by worktree.sh - Worktree: ${dir_name}
# Configured for parallel development with unique ports

NEXT_PUBLIC_API_URL=http://localhost:${api_port}
NEXT_PUBLIC_API_V1_URL=http://localhost:${api_port}/api/v1
WEBEOF

    # Copy any additional settings from main web .env.local (if exists)
    if [[ -f "$main_web_env" ]]; then
        print_info "Merging additional settings from main web .env.local..."
        # Append non-API settings from main env
        grep -v "^NEXT_PUBLIC_API" "$main_web_env" 2>/dev/null | grep -v "^#" | grep -v "^$" >> "$worktree_web_env" || true
    fi

    print_success "Web .env.local configured"

    # Create Docker Compose .env to share the same project name (avoids network conflicts)
    cat > "${worktree_path}/.env" << DOCKEREOF
# Docker Compose configuration - Auto-generated by worktree.sh
# This ensures all worktrees share the same Redis container/network
COMPOSE_PROJECT_NAME=vantage
DOCKEREOF

    print_success "Docker Compose configured (shared Redis)"

    # Create worktree metadata file
    cat > "${worktree_path}/.worktree-info" << EOF
# VANTAGE Worktree Information
# Auto-generated by worktree.sh

WORKTREE_NAME=${dir_name}
BRANCH_NAME=${branch_name}
BASE_BRANCH=${base_branch}
CREATED_AT=$(date -Iseconds)
API_PORT=${api_port}
WEB_PORT=${web_port}
REDIS_PORT=6379
MAIN_REPO=${MAIN_REPO_DIR}
EOF

    print_success "Environment configured"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Worktree Ready!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Next steps:"
    echo ""
    echo "  1. Navigate to worktree:"
    echo -e "     ${CYAN}cd ${worktree_path}${NC}"
    echo ""
    echo "  2. Install dependencies:"
    echo -e "     ${CYAN}pnpm install${NC}"
    echo ""
    echo "  3. Start development (ports: API=${api_port}, Web=${web_port}):"
    echo -e "     ${CYAN}pnpm dev${NC}"
    echo ""
    echo "  4. Or open Claude Code in this worktree:"
    echo -e "     ${CYAN}cd ${worktree_path} && claude${NC}"
    echo ""
}

# List all worktrees
cmd_list() {
    print_header
    echo ""

    local worktrees
    worktrees=$(git worktree list --porcelain)

    if [[ -z "$worktrees" ]]; then
        print_info "No worktrees found"
        return
    fi

    echo -e "${BLUE}Worktrees:${NC}"
    echo ""

    local current_path=""
    local current_branch=""
    local index=0

    while IFS= read -r line; do
        if [[ "$line" =~ ^worktree\ (.+)$ ]]; then
            current_path="${BASH_REMATCH[1]}"
        elif [[ "$line" =~ ^branch\ refs/heads/(.+)$ ]]; then
            current_branch="${BASH_REMATCH[1]}"
        elif [[ -z "$line" && -n "$current_path" ]]; then
            local dir_name
            dir_name=$(basename "$current_path")

            # Check for worktree info file
            local ports=""
            if [[ -f "${current_path}/.worktree-info" ]]; then
                local api_port web_port
                api_port=$(grep "API_PORT=" "${current_path}/.worktree-info" 2>/dev/null | cut -d'=' -f2)
                web_port=$(grep "WEB_PORT=" "${current_path}/.worktree-info" 2>/dev/null | cut -d'=' -f2)
                if [[ -n "$api_port" && -n "$web_port" ]]; then
                    ports=" (API:${api_port}, Web:${web_port})"
                fi
            fi

            if [[ "$current_path" == "$MAIN_REPO_DIR" ]]; then
                echo -e "  ${GREEN}● ${dir_name}${NC} [main]"
                echo -e "    Branch: ${current_branch:-detached}"
                echo -e "    Path:   ${current_path}"
            else
                echo -e "  ${YELLOW}○ ${dir_name}${NC}${ports}"
                echo -e "    Branch: ${current_branch:-detached}"
                echo -e "    Path:   ${current_path}"
            fi
            echo ""

            current_path=""
            current_branch=""
            ((index++))
        fi
    done <<< "$worktrees"

    # Handle last entry
    if [[ -n "$current_path" ]]; then
        local dir_name
        dir_name=$(basename "$current_path")

        if [[ "$current_path" == "$MAIN_REPO_DIR" ]]; then
            echo -e "  ${GREEN}● ${dir_name}${NC} [main]"
        else
            echo -e "  ${YELLOW}○ ${dir_name}${NC}"
        fi
        echo -e "    Branch: ${current_branch:-detached}"
        echo -e "    Path:   ${current_path}"
        echo ""
    fi
}

# Remove a worktree
cmd_remove() {
    local name="$1"

    if [[ -z "$name" ]]; then
        print_error "Usage: $0 remove <name>"
        print_info "Use '$0 list' to see available worktrees"
        exit 1
    fi

    print_header
    echo ""

    # Find matching worktree
    local worktree_path=""
    local branch_name=""

    while IFS= read -r line; do
        if [[ "$line" =~ ${name} ]]; then
            worktree_path=$(echo "$line" | awk '{print $1}')
            branch_name=$(echo "$line" | awk '{print $3}' | sed 's/\[//;s/\]//')
            break
        fi
    done <<< "$(git worktree list)"

    if [[ -z "$worktree_path" ]]; then
        print_error "Worktree not found: $name"
        print_info "Use '$0 list' to see available worktrees"
        exit 1
    fi

    # Don't allow removing main worktree
    if [[ "$worktree_path" == "$MAIN_REPO_DIR" ]]; then
        print_error "Cannot remove main worktree"
        exit 1
    fi

    print_warning "This will remove:"
    echo "  Path:   ${worktree_path}"
    echo "  Branch: ${branch_name}"
    echo ""

    read -p "Continue? [y/N] " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Aborted"
        exit 0
    fi

    # Remove worktree
    print_info "Removing worktree..."
    git worktree remove "$worktree_path" --force
    print_success "Worktree removed"

    # Ask about branch deletion
    if [[ -n "$branch_name" && "$branch_name" != "detached" ]]; then
        echo ""
        read -p "Also delete branch '${branch_name}'? [y/N] " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git branch -D "$branch_name" 2>/dev/null || print_warning "Branch not found or already deleted"
            print_success "Branch deleted"
        fi
    fi

    # Prune worktree references
    git worktree prune
    print_success "Worktree references pruned"
}

# Setup dependencies in a worktree
cmd_setup() {
    local path="$1"

    if [[ -z "$path" ]]; then
        print_error "Usage: $0 setup <path>"
        exit 1
    fi

    # Resolve path
    if [[ ! "$path" = /* ]]; then
        path="${WORKTREE_BASE_DIR}/${path}"
    fi

    if [[ ! -d "$path" ]]; then
        print_error "Directory not found: $path"
        exit 1
    fi

    print_header
    echo ""
    print_info "Setting up worktree: ${path}"
    echo ""

    cd "$path"

    # Install pnpm dependencies
    print_info "Installing pnpm dependencies..."
    pnpm install
    print_success "pnpm dependencies installed"

    # Check for Python backend
    if [[ -d "apps/api" ]]; then
        print_info "Setting up Python environment..."
        cd apps/api

        if command -v uv &> /dev/null; then
            uv sync
            print_success "Python dependencies installed (uv)"
        elif [[ -f "pyproject.toml" ]]; then
            python -m venv .venv
            source .venv/bin/activate
            pip install -e ".[dev]"
            print_success "Python dependencies installed (pip)"
        fi

        cd "$path"
    fi

    print_success "Setup complete!"
    echo ""
    echo "You can now start development:"
    echo -e "  ${CYAN}cd ${path} && pnpm dev${NC}"
}

# Sync worktree with base branch
cmd_sync() {
    local path="$1"

    if [[ -z "$path" ]]; then
        print_error "Usage: $0 sync <path>"
        exit 1
    fi

    # Resolve path
    if [[ ! "$path" = /* ]]; then
        path="${WORKTREE_BASE_DIR}/${path}"
    fi

    if [[ ! -d "$path" ]]; then
        print_error "Directory not found: $path"
        exit 1
    fi

    print_header
    echo ""
    print_info "Syncing worktree: ${path}"

    cd "$path"

    # Get base branch from info file or use default
    local base_branch="$DEFAULT_BASE_BRANCH"
    if [[ -f ".worktree-info" ]]; then
        base_branch=$(grep "BASE_BRANCH=" .worktree-info | cut -d'=' -f2)
    fi

    print_info "Fetching latest from remote..."
    git fetch origin

    print_info "Merging ${base_branch}..."
    git merge "origin/${base_branch}" --no-edit

    print_success "Worktree synced with ${base_branch}"

    # Regenerate types if needed
    if [[ -f "package.json" ]]; then
        echo ""
        read -p "Regenerate TypeScript types? [Y/n] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            print_info "Regenerating types..."
            pnpm generate-types
            print_success "Types regenerated"
        fi
    fi
}

# Copy/sync .env files from main worktree
cmd_env() {
    local path="$1"

    print_header
    echo ""

    # Handle --all flag to sync all worktrees
    if [[ "$path" == "--all" || "$path" == "-a" ]]; then
        print_info "Syncing .env files to all worktrees..."
        echo ""

        while IFS= read -r line; do
            local wt_path
            wt_path=$(echo "$line" | awk '{print $1}')

            if [[ "$wt_path" != "$MAIN_REPO_DIR" && -n "$wt_path" && -d "$wt_path" ]]; then
                local dir_name
                dir_name=$(basename "$wt_path")
                print_info "Syncing: ${dir_name}"
                sync_env_files "$wt_path"
                echo ""
            fi
        done <<< "$(git worktree list)"

        print_success "All worktrees synced"
        return
    fi

    if [[ -z "$path" ]]; then
        print_error "Usage: $0 env <path>"
        print_info "Or use '$0 env --all' to sync all worktrees"
        exit 1
    fi

    # Resolve path
    if [[ ! "$path" = /* ]]; then
        path="${WORKTREE_BASE_DIR}/${path}"
    fi

    if [[ ! -d "$path" ]]; then
        print_error "Directory not found: $path"
        exit 1
    fi

    if [[ "$path" == "$MAIN_REPO_DIR" ]]; then
        print_error "Cannot sync .env to main worktree (it's the source)"
        exit 1
    fi

    print_info "Syncing .env files to: ${path}"
    echo ""

    sync_env_files "$path"

    print_success "Environment files synced"
}

# Helper function to sync .env files to a worktree
sync_env_files() {
    local target_path="$1"
    local dir_name
    dir_name=$(basename "$target_path")

    # Get port info from worktree-info if it exists
    local api_port="8000"
    local web_port="3000"
    if [[ -f "${target_path}/.worktree-info" ]]; then
        api_port=$(grep "API_PORT=" "${target_path}/.worktree-info" | cut -d'=' -f2)
        web_port=$(grep "WEB_PORT=" "${target_path}/.worktree-info" | cut -d'=' -f2)
    fi

    # Sync API .env
    local main_api_env="${MAIN_REPO_DIR}/apps/api/.env"
    local target_api_env="${target_path}/apps/api/.env"

    if [[ -f "$main_api_env" ]]; then
        mkdir -p "${target_path}/apps/api"

        # Check if target already has .env and ask for confirmation
        if [[ -f "$target_api_env" ]]; then
            echo -n "  API .env exists. Overwrite? [y/N] "
            read -r reply
            if [[ ! "$reply" =~ ^[Yy]$ ]]; then
                print_info "  Skipping API .env"
            else
                cp "$main_api_env" "$target_api_env"
                # Add header
                local temp_file=$(mktemp)
                echo "# Auto-configured by worktree.sh - Worktree: ${dir_name}" > "$temp_file"
                echo "# Synced at: $(date -Iseconds)" >> "$temp_file"
                echo "# API Port: ${api_port}" >> "$temp_file"
                echo "" >> "$temp_file"
                cat "$target_api_env" >> "$temp_file"
                mv "$temp_file" "$target_api_env"
                print_success "  API .env synced"
            fi
        else
            cp "$main_api_env" "$target_api_env"
            local temp_file=$(mktemp)
            echo "# Auto-configured by worktree.sh - Worktree: ${dir_name}" > "$temp_file"
            echo "# Synced at: $(date -Iseconds)" >> "$temp_file"
            echo "# API Port: ${api_port}" >> "$temp_file"
            echo "" >> "$temp_file"
            cat "$target_api_env" >> "$temp_file"
            mv "$temp_file" "$target_api_env"
            print_success "  API .env created"
        fi
    else
        print_warning "  No API .env found in main worktree"
    fi

    # Sync Web .env.local (always update with correct ports)
    local target_web_env="${target_path}/apps/web/.env.local"
    mkdir -p "${target_path}/apps/web"

    cat > "$target_web_env" << WEBEOF
# Auto-generated by worktree.sh - Worktree: ${dir_name}
# Synced at: $(date -Iseconds)

NEXT_PUBLIC_API_URL=http://localhost:${api_port}
NEXT_PUBLIC_API_V1_URL=http://localhost:${api_port}/api/v1
WEBEOF

    # Copy any additional settings from main web .env.local
    local main_web_env="${MAIN_REPO_DIR}/apps/web/.env.local"
    if [[ -f "$main_web_env" ]]; then
        grep -v "^NEXT_PUBLIC_API" "$main_web_env" 2>/dev/null | grep -v "^#" | grep -v "^$" >> "$target_web_env" || true
    fi

    print_success "  Web .env.local synced (API: ${api_port}, Web: ${web_port})"

    # Ensure Docker Compose .env exists (for shared Redis)
    local target_docker_env="${target_path}/.env"
    if [[ ! -f "$target_docker_env" ]]; then
        cat > "$target_docker_env" << DOCKEREOF
# Docker Compose configuration - Auto-generated by worktree.sh
# This ensures all worktrees share the same Redis container/network
COMPOSE_PROJECT_NAME=vantage
DOCKEREOF
        print_success "  Docker Compose .env created (shared Redis)"
    fi
}

# Show detailed status
cmd_status() {
    print_header
    echo ""

    echo -e "${BLUE}Worktree Status:${NC}"
    echo ""

    while IFS= read -r line; do
        local path branch
        path=$(echo "$line" | awk '{print $1}')
        branch=$(echo "$line" | awk '{print $3}' | sed 's/\[//;s/\]//')

        if [[ -z "$path" ]]; then
            continue
        fi

        local dir_name
        dir_name=$(basename "$path")

        echo -e "${YELLOW}${dir_name}${NC}"
        echo "  Path:   ${path}"
        echo "  Branch: ${branch}"

        # Show git status
        if [[ -d "$path" ]]; then
            cd "$path"
            local changes
            changes=$(git status --porcelain 2>/dev/null | wc -l)

            if [[ "$changes" -gt 0 ]]; then
                echo -e "  Status: ${RED}${changes} uncommitted change(s)${NC}"
            else
                echo -e "  Status: ${GREEN}Clean${NC}"
            fi

            # Check ahead/behind
            local ahead behind
            ahead=$(git rev-list --count @{upstream}..HEAD 2>/dev/null || echo "?")
            behind=$(git rev-list --count HEAD..@{upstream} 2>/dev/null || echo "?")

            if [[ "$ahead" != "?" && "$behind" != "?" ]]; then
                echo "  Remote: ↑${ahead} ↓${behind}"
            fi

            # Show port info
            if [[ -f ".worktree-info" ]]; then
                local api_port web_port
                api_port=$(grep "API_PORT=" .worktree-info | cut -d'=' -f2)
                web_port=$(grep "WEB_PORT=" .worktree-info | cut -d'=' -f2)
                echo "  Ports:  API:${api_port}, Web:${web_port}"
            fi
        fi

        echo ""
    done <<< "$(git worktree list)"
}

# Show port assignments
cmd_ports() {
    print_header
    echo ""

    echo -e "${BLUE}Port Assignments:${NC}"
    echo ""
    printf "%-30s %-10s %-10s\n" "Worktree" "API Port" "Web Port"
    printf "%-30s %-10s %-10s\n" "--------" "--------" "--------"

    while IFS= read -r line; do
        local path
        path=$(echo "$line" | awk '{print $1}')

        if [[ -z "$path" ]]; then
            continue
        fi

        local dir_name
        dir_name=$(basename "$path")

        local api_port="8000"
        local web_port="3000"

        if [[ -f "${path}/.worktree-info" ]]; then
            api_port=$(grep "API_PORT=" "${path}/.worktree-info" | cut -d'=' -f2)
            web_port=$(grep "WEB_PORT=" "${path}/.worktree-info" | cut -d'=' -f2)
        fi

        printf "%-30s %-10s %-10s\n" "$dir_name" "$api_port" "$web_port"
    done <<< "$(git worktree list)"

    echo ""
}

# Finish a worktree: merge into develop and clean up
cmd_finish() {
    local name="$1"
    local target_branch="${2:-develop}"

    if [[ -z "$name" ]]; then
        print_error "Usage: $0 finish <worktree-name> [target-branch]"
        print_info "Default target branch: develop"
        exit 1
    fi

    print_header
    echo ""

    # Find the worktree
    local worktree_path=""
    local branch_name=""

    while IFS= read -r line; do
        local wt_path
        wt_path=$(echo "$line" | awk '{print $1}')
        local wt_name
        wt_name=$(basename "$wt_path")

        if [[ "$wt_name" == "$name" || "$wt_name" == *"$name"* ]]; then
            worktree_path="$wt_path"
            # Get branch name from worktree
            branch_name=$(git -C "$wt_path" rev-parse --abbrev-ref HEAD 2>/dev/null)
            break
        fi
    done <<< "$(git worktree list)"

    if [[ -z "$worktree_path" ]]; then
        print_error "Worktree not found: $name"
        print_info "Use '$0 list' to see available worktrees"
        exit 1
    fi

    if [[ "$worktree_path" == "$MAIN_REPO_DIR" ]]; then
        print_error "Cannot finish main worktree"
        exit 1
    fi

    print_info "Finishing worktree: $(basename "$worktree_path")"
    echo "  Branch: ${branch_name}"
    echo "  Target: ${target_branch}"
    echo ""

    # Step 1: Check for uncommitted changes in worktree
    print_info "Step 1: Checking for uncommitted changes..."
    local changes
    changes=$(git -C "$worktree_path" status --porcelain 2>/dev/null | wc -l)

    if [[ "$changes" -gt 0 ]]; then
        print_error "Worktree has uncommitted changes!"
        echo ""
        git -C "$worktree_path" status --short
        echo ""
        print_info "Please commit or stash your changes first:"
        echo "  cd $worktree_path"
        echo "  git add . && git commit -m 'your message'"
        exit 1
    fi
    print_success "Worktree is clean"

    # Step 2: Fetch latest from remote
    print_info "Step 2: Fetching latest from remote..."
    git fetch origin
    print_success "Fetched latest"

    # Step 3: Check if target branch is up to date
    print_info "Step 3: Updating ${target_branch}..."
    git checkout "$target_branch"
    git pull origin "$target_branch"
    print_success "${target_branch} is up to date"

    # Step 4: Merge the feature branch
    print_info "Step 4: Merging ${branch_name} into ${target_branch}..."

    if git merge "$branch_name" --no-ff -m "Merge branch '${branch_name}' into ${target_branch}"; then
        print_success "Merged successfully"
    else
        print_error "Merge conflict detected!"
        echo ""
        print_info "Resolve conflicts manually, then run:"
        echo "  git add ."
        echo "  git commit"
        echo "  $0 finish-cleanup $name"
        exit 1
    fi

    # Step 5: Push to remote
    print_info "Step 5: Pushing ${target_branch} to remote..."
    if git push origin "$target_branch"; then
        print_success "Pushed to origin/${target_branch}"
    else
        print_error "Failed to push. Please push manually:"
        echo "  git push origin ${target_branch}"
    fi

    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Merge Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Step 6: Ask to clean up
    echo -n "Remove worktree and delete branch '${branch_name}'? [Y/n] "
    read -r reply

    if [[ ! "$reply" =~ ^[Nn]$ ]]; then
        print_info "Cleaning up..."

        # Remove worktree
        git worktree remove "$worktree_path" --force
        print_success "Worktree removed"

        # Delete branch
        git branch -d "$branch_name" 2>/dev/null || git branch -D "$branch_name" 2>/dev/null
        print_success "Branch deleted"

        # Prune
        git worktree prune

        echo ""
        print_success "All done! Your changes are now in ${target_branch}"
    else
        echo ""
        print_info "Worktree kept. To remove later:"
        echo "  $0 remove $(basename "$worktree_path")"
    fi
}

# Clean all worktrees
cmd_clean() {
    print_header
    echo ""

    print_warning "This will remove ALL worktrees except the main repository!"
    echo ""

    local count=0
    while IFS= read -r line; do
        local path
        path=$(echo "$line" | awk '{print $1}')

        if [[ "$path" != "$MAIN_REPO_DIR" && -n "$path" ]]; then
            echo "  - $(basename "$path")"
            ((count++))
        fi
    done <<< "$(git worktree list)"

    if [[ "$count" -eq 0 ]]; then
        print_info "No worktrees to remove"
        exit 0
    fi

    echo ""
    read -p "Remove ${count} worktree(s)? [y/N] " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Aborted"
        exit 0
    fi

    while IFS= read -r line; do
        local path
        path=$(echo "$line" | awk '{print $1}')

        if [[ "$path" != "$MAIN_REPO_DIR" && -n "$path" ]]; then
            print_info "Removing $(basename "$path")..."
            git worktree remove "$path" --force 2>/dev/null || true
        fi
    done <<< "$(git worktree list)"

    git worktree prune
    print_success "All worktrees removed"
}

# Main command handler
main() {
    cd "$MAIN_REPO_DIR"

    local cmd="${1:-}"
    shift || true

    case "$cmd" in
        create)
            cmd_create "$@"
            ;;
        list|ls)
            cmd_list
            ;;
        remove|rm)
            cmd_remove "$@"
            ;;
        setup)
            cmd_setup "$@"
            ;;
        sync)
            cmd_sync "$@"
            ;;
        env)
            cmd_env "$@"
            ;;
        status|st)
            cmd_status
            ;;
        ports)
            cmd_ports
            ;;
        finish)
            cmd_finish "$@"
            ;;
        clean)
            cmd_clean
            ;;
        -h|--help|help|"")
            usage
            ;;
        *)
            print_error "Unknown command: $cmd"
            echo ""
            usage
            exit 1
            ;;
    esac
}

main "$@"
