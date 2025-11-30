#!/bin/bash
# ==============================================================================
# SINAG EC2 Initial Setup Script
# ==============================================================================
# Run this script ONCE on a fresh EC2 instance to install all dependencies.
#
# Supported OS: Amazon Linux 2023, Ubuntu 22.04+
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/sinag/main/scripts/setup-ec2.sh | bash
#   # OR
#   ./scripts/setup-ec2.sh
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  SINAG EC2 Setup Script${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# ------------------------------------------------------------------------------
# Detect OS
# ------------------------------------------------------------------------------
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo -e "${RED}Cannot detect OS${NC}"
    exit 1
fi

echo -e "${YELLOW}Detected OS: $OS${NC}"

# ------------------------------------------------------------------------------
# Install Docker
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[1/5] Installing Docker...${NC}"

if command -v docker &> /dev/null; then
    echo -e "${GREEN}Docker already installed${NC}"
else
    if [ "$OS" = "amzn" ]; then
        # Amazon Linux 2023
        sudo dnf update -y
        sudo dnf install -y docker
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -aG docker $USER
    elif [ "$OS" = "ubuntu" ]; then
        # Ubuntu
        sudo apt-get update
        sudo apt-get install -y ca-certificates curl gnupg
        sudo install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        sudo chmod a+r /etc/apt/keyrings/docker.gpg
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
          sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        sudo usermod -aG docker $USER
    else
        echo -e "${RED}Unsupported OS: $OS${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Docker installed${NC}"

# ------------------------------------------------------------------------------
# Install Docker Compose (standalone, for older systems)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[2/5] Verifying Docker Compose...${NC}"

if docker compose version &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose plugin available${NC}"
else
    echo "Installing Docker Compose standalone..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
fi

# ------------------------------------------------------------------------------
# Install Git
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[3/5] Installing Git...${NC}"

if command -v git &> /dev/null; then
    echo -e "${GREEN}Git already installed${NC}"
else
    if [ "$OS" = "amzn" ]; then
        sudo dnf install -y git
    elif [ "$OS" = "ubuntu" ]; then
        sudo apt-get install -y git
    fi
fi

echo -e "${GREEN}✓ Git installed${NC}"

# ------------------------------------------------------------------------------
# Create application directory
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[4/5] Setting up application directory...${NC}"

APP_DIR="/home/$USER/sinag"

if [ -d "$APP_DIR" ]; then
    echo -e "${YELLOW}Directory $APP_DIR already exists${NC}"
else
    mkdir -p "$APP_DIR"
    echo -e "${GREEN}✓ Created $APP_DIR${NC}"
fi

# ------------------------------------------------------------------------------
# Print next steps
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[5/5] Setup complete!${NC}"
echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}  EC2 Setup Complete!${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT: Log out and back in for Docker group to take effect!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Log out and back in:"
echo -e "   ${GREEN}exit${NC}"
echo "   Then SSH back in"
echo ""
echo "2. Clone the repository:"
echo -e "   ${GREEN}git clone https://github.com/YOUR_USERNAME/sinag.git ~/sinag${NC}"
echo -e "   ${GREEN}cd ~/sinag${NC}"
echo ""
echo "3. Create a GitHub Personal Access Token (PAT):"
echo "   - Go to: https://github.com/settings/tokens"
echo "   - Generate new token (classic)"
echo "   - Select scope: read:packages"
echo "   - Copy the token"
echo ""
echo "4. Login to GitHub Container Registry:"
echo -e "   ${GREEN}echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin${NC}"
echo ""
echo "5. Configure environment:"
echo -e "   ${GREEN}cp .env.example .env${NC}"
echo -e "   ${GREEN}nano .env  # Edit with your values${NC}"
echo ""
echo "6. Deploy the application:"
echo -e "   ${GREEN}./scripts/deploy.sh --migrate${NC}"
echo ""
