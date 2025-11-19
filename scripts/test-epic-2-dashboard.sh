#!/bin/bash

# Quick Test Script for Epic 2.0 BLGU Dashboard
# This script helps you quickly test both frontend and backend

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Epic 2.0: BLGU Dashboard Quick Test Script            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if backend is running
echo -e "${BLUE}🔍 Checking if backend is running...${NC}"
if curl -s http://localhost:8000/api/v1/system/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running on port 8000${NC}"
else
    echo -e "${RED}❌ Backend is NOT running${NC}"
    echo -e "${YELLOW}💡 Start it with: pnpm dev:api${NC}"
    read -p "Do you want to start the backend now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Starting backend...${NC}"
        pnpm dev:api &
        BACKEND_PID=$!
        echo -e "${GREEN}Backend started with PID: $BACKEND_PID${NC}"
        sleep 5
    else
        exit 1
    fi
fi

# Check if frontend is running
echo -e "${BLUE}🔍 Checking if frontend is running...${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running on port 3000${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend is NOT running${NC}"
    echo -e "${YELLOW}💡 Start it with: pnpm dev:web${NC}"
    echo -e "${YELLOW}💡 You can still test the backend API${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Menu
echo "What would you like to test?"
echo ""
echo "  1) 🔧 Test Backend API (Python script)"
echo "  2) 🌐 Open Frontend Dashboard (Browser)"
echo "  3) 📚 Open API Documentation (Swagger UI)"
echo "  4) 🧪 Run Backend Tests (pytest)"
echo "  5) 📊 View Testing Guide"
echo "  6) 🚀 Test Everything"
echo "  0) ❌ Exit"
echo ""
read -p "Enter your choice [0-6]: " choice

case $choice in
    1)
        echo -e "${BLUE}🔧 Running Backend API Test...${NC}"
        echo ""
        if [ -f "apps/api/test_blgu_dashboard.py" ]; then
            cd apps/api
            echo -e "${YELLOW}⚠️  Make sure to edit test_blgu_dashboard.py with your credentials first!${NC}"
            echo ""
            read -p "Press Enter to continue or Ctrl+C to cancel..."
            uv run python test_blgu_dashboard.py
        else
            echo -e "${RED}❌ Test file not found: apps/api/test_blgu_dashboard.py${NC}"
        fi
        ;;
    2)
        echo -e "${BLUE}🌐 Opening Frontend Dashboard...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "http://localhost:3000/blgu/dashboard"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open "http://localhost:3000/blgu/dashboard" 2>/dev/null || echo "Please open: http://localhost:3000/blgu/dashboard"
        else
            echo "Please open: http://localhost:3000/blgu/dashboard"
        fi
        ;;
    3)
        echo -e "${BLUE}📚 Opening API Documentation...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "http://localhost:8000/docs"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open "http://localhost:8000/docs" 2>/dev/null || echo "Please open: http://localhost:8000/docs"
        else
            echo "Please open: http://localhost:8000/docs"
        fi
        ;;
    4)
        echo -e "${BLUE}🧪 Running Backend Tests...${NC}"
        cd apps/api
        uv run pytest tests/api/v1/test_blgu_dashboard.py -v --tb=short || echo -e "${YELLOW}Note: Test file may not exist yet${NC}"
        ;;
    5)
        echo -e "${BLUE}📊 Opening Testing Guide...${NC}"
        if [ -f "apps/api/TESTING_EPIC2_DASHBOARD.md" ]; then
            cat apps/api/TESTING_EPIC2_DASHBOARD.md | less
        else
            echo -e "${RED}❌ Testing guide not found${NC}"
        fi
        ;;
    6)
        echo -e "${BLUE}🚀 Testing Everything...${NC}"
        echo ""

        # Test backend
        echo -e "${BLUE}1. Testing Backend API...${NC}"
        cd apps/api
        if [ -f "test_blgu_dashboard.py" ]; then
            echo -e "${YELLOW}⚠️  Edit test_blgu_dashboard.py with your credentials first!${NC}"
            read -p "Press Enter to continue or Ctrl+C to cancel..."
            uv run python test_blgu_dashboard.py
        fi
        cd ../..

        # Open frontend
        echo ""
        echo -e "${BLUE}2. Opening Frontend Dashboard...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "http://localhost:3000/blgu/dashboard"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open "http://localhost:3000/blgu/dashboard" 2>/dev/null || echo "Please open: http://localhost:3000/blgu/dashboard"
        else
            echo "Please open: http://localhost:3000/blgu/dashboard"
        fi

        # Open Swagger
        echo ""
        echo -e "${BLUE}3. Opening API Documentation...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "http://localhost:8000/docs"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open "http://localhost:8000/docs" 2>/dev/null || echo "Please open: http://localhost:8000/docs"
        else
            echo "Please open: http://localhost:8000/docs"
        fi
        ;;
    0)
        echo -e "${BLUE}👋 Goodbye!${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✨ Testing completed!${NC}"
echo ""
echo -e "${BLUE}📖 For more testing options, see:${NC}"
echo "   apps/api/TESTING_EPIC2_DASHBOARD.md"
echo ""
