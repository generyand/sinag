#!/bin/bash
# ==============================================================================
# Docker Security Scanning Script
# ==============================================================================
# This script performs comprehensive security scanning on Docker images using:
# - Trivy (vulnerability scanner)
# - Docker Scout (if available)
# - Best practices checks
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCAN_DIR="./security-scans"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SEVERITY_THRESHOLD="${SEVERITY_THRESHOLD:-HIGH,CRITICAL}"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  SINAG Docker Security Scanner${NC}"
echo -e "${BLUE}======================================${NC}\n"

# Create scan directory
mkdir -p "$SCAN_DIR"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Trivy if not present
install_trivy() {
    echo -e "${YELLOW}Trivy not found. Installing...${NC}"

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
        echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
        sudo apt-get update
        sudo apt-get install -y trivy
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install trivy
    else
        echo -e "${RED}Unsupported OS. Please install Trivy manually: https://aquasecurity.github.io/trivy/latest/getting-started/installation/${NC}"
        exit 1
    fi

    echo -e "${GREEN}Trivy installed successfully${NC}\n"
}

# Function to scan image with Trivy
scan_with_trivy() {
    local image=$1
    local output_file="$SCAN_DIR/trivy_${image##*/}_${TIMESTAMP}.json"

    echo -e "${BLUE}Scanning $image with Trivy...${NC}"

    trivy image \
        --severity "$SEVERITY_THRESHOLD" \
        --format json \
        --output "$output_file" \
        "$image"

    # Also create human-readable report
    trivy image \
        --severity "$SEVERITY_THRESHOLD" \
        --format table \
        "$image" | tee "$SCAN_DIR/trivy_${image##*/}_${TIMESTAMP}.txt"

    echo -e "${GREEN}Trivy scan complete. Results saved to $output_file${NC}\n"
}

# Function to scan with Docker Scout (if available)
scan_with_scout() {
    local image=$1
    local output_file="$SCAN_DIR/scout_${image##*/}_${TIMESTAMP}.json"

    if command_exists docker && docker scout version >/dev/null 2>&1; then
        echo -e "${BLUE}Scanning $image with Docker Scout...${NC}"

        docker scout cves \
            --format sarif \
            --output "$output_file" \
            "$image" || true

        docker scout cves "$image" | tee "$SCAN_DIR/scout_${image##*/}_${TIMESTAMP}.txt" || true

        echo -e "${GREEN}Docker Scout scan complete${NC}\n"
    else
        echo -e "${YELLOW}Docker Scout not available. Skipping...${NC}\n"
    fi
}

# Function to check Docker best practices
check_best_practices() {
    local dockerfile=$1
    local image_name=$2

    echo -e "${BLUE}Checking Docker best practices for $dockerfile...${NC}"

    local issues=0
    local report_file="$SCAN_DIR/best_practices_${image_name}_${TIMESTAMP}.txt"

    {
        echo "Docker Best Practices Check for $dockerfile"
        echo "Generated: $(date)"
        echo "============================================"
        echo ""

        # Check 1: Non-root user
        if ! grep -q "USER" "$dockerfile"; then
            echo "❌ WARNING: No USER instruction found. Container may run as root."
            ((issues++))
        else
            echo "✅ PASS: Non-root user specified"
        fi

        # Check 2: Health check
        if ! grep -q "HEALTHCHECK" "$dockerfile"; then
            echo "⚠️  WARNING: No HEALTHCHECK instruction found."
            ((issues++))
        else
            echo "✅ PASS: Health check configured"
        fi

        # Check 3: Multi-stage build
        if ! grep -c "FROM" "$dockerfile" | grep -q "[2-9]"; then
            echo "⚠️  INFO: Single-stage build. Consider multi-stage for optimization."
        else
            echo "✅ PASS: Multi-stage build used"
        fi

        # Check 4: Version pinning
        if grep -q "FROM.*:latest" "$dockerfile"; then
            echo "❌ WARNING: Using ':latest' tag. Pin specific versions."
            ((issues++))
        else
            echo "✅ PASS: Version pinning used"
        fi

        # Check 5: COPY vs ADD
        if grep -q "^ADD" "$dockerfile"; then
            echo "⚠️  WARNING: Using ADD instruction. Prefer COPY unless needed."
        else
            echo "✅ PASS: Using COPY (not ADD)"
        fi

        # Check 6: Exposed secrets
        if grep -iE "(password|secret|key|token).*=" "$dockerfile"; then
            echo "❌ CRITICAL: Potential secrets in Dockerfile!"
            ((issues++))
        else
            echo "✅ PASS: No obvious secrets in Dockerfile"
        fi

        echo ""
        echo "============================================"
        echo "Total Issues: $issues"

    } | tee "$report_file"

    echo -e "${GREEN}Best practices check complete${NC}\n"
    return $issues
}

# Function to generate summary report
generate_summary() {
    local summary_file="$SCAN_DIR/summary_${TIMESTAMP}.md"

    echo -e "${BLUE}Generating summary report...${NC}"

    {
        echo "# SINAG Docker Security Scan Summary"
        echo ""
        echo "**Date:** $(date)"
        echo "**Scan ID:** $TIMESTAMP"
        echo ""
        echo "## Scanned Images"
        echo ""

        for image in "${IMAGES[@]}"; do
            echo "- \`$image\`"
        done

        echo ""
        echo "## Scan Results"
        echo ""
        echo "Detailed results are available in the following files:"
        echo ""

        for file in "$SCAN_DIR"/*_"$TIMESTAMP".*; do
            if [ -f "$file" ]; then
                echo "- \`$(basename "$file")\`"
            fi
        done

        echo ""
        echo "## Next Steps"
        echo ""
        echo "1. Review all HIGH and CRITICAL vulnerabilities"
        echo "2. Update base images to latest patched versions"
        echo "3. Update application dependencies"
        echo "4. Re-scan after fixes"
        echo "5. Document any accepted risks"

    } > "$summary_file"

    echo -e "${GREEN}Summary report saved to $summary_file${NC}\n"
    cat "$summary_file"
}

# Main execution
main() {
    # Check for Trivy installation
    if ! command_exists trivy; then
        install_trivy
    fi

    # Define images to scan
    IMAGES=(
        "sinag-api:latest"
        "sinag-web:latest"
        "sinag-celery-worker:latest"
    )

    # Build images if they don't exist
    echo -e "${YELLOW}Building images for scanning...${NC}\n"
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml build

    # Scan each image
    for image in "${IMAGES[@]}"; do
        if docker image inspect "$image" >/dev/null 2>&1; then
            echo -e "${BLUE}=== Scanning $image ===${NC}\n"
            scan_with_trivy "$image"
            scan_with_scout "$image"
            echo ""
        else
            echo -e "${YELLOW}Image $image not found. Skipping...${NC}\n"
        fi
    done

    # Check Dockerfiles for best practices
    check_best_practices "apps/api/Dockerfile" "api"
    check_best_practices "apps/web/Dockerfile" "web"

    # Generate summary
    generate_summary

    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}  Security scan complete!${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo -e "\nResults saved in: ${BLUE}$SCAN_DIR${NC}\n"
}

# Run main function
main "$@"
