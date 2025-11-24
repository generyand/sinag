#!/bin/bash
# Quick Test Script for AI-Generated Rework Summary Feature
# This script helps verify the feature is working correctly

# Don't exit on error - we want to run all checks
set +e

echo "🧪 Testing AI-Generated Rework Summary Feature"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Save project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Check if backend is running
echo "1️⃣  Checking if backend is running..."
if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is not running${NC}"
    echo "   Start it with: cd apps/api && pnpm dev:api"
fi

# Check if database migration was applied
echo ""
echo "2️⃣  Checking database schema..."
cd "$PROJECT_ROOT/apps/api"
if uv run alembic current 2>/dev/null | grep -q "add_rework_summary"; then
    echo -e "${GREEN}✓ Migration 'add_rework_summary' is applied${NC}"
else
    echo -e "${YELLOW}⚠ Migration may not be applied${NC}"
    echo "   Apply it with: cd apps/api && uv run alembic upgrade head"
fi
cd "$PROJECT_ROOT"

# Check if rework_summary column exists
echo ""
echo "3️⃣  Verifying rework_summary column exists..."
COLUMN_CHECK=$(psql $DATABASE_URL -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='assessments' AND column_name='rework_summary';" 2>/dev/null || echo "")
if [ -n "$COLUMN_CHECK" ]; then
    echo -e "${GREEN}✓ Column 'rework_summary' exists in assessments table${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify column (may need DATABASE_URL env var)${NC}"
fi

# Check if Celery is running
echo ""
echo "4️⃣  Checking if Celery worker is running..."
if pgrep -f "celery.*worker" > /dev/null; then
    echo -e "${GREEN}✓ Celery worker is running${NC}"
else
    echo -e "${RED}✗ Celery worker is not running${NC}"
    echo "   Start it with: cd apps/api && celery -A app.core.celery_app worker --loglevel=info"
fi

# Check if new task is registered
echo ""
echo "5️⃣  Checking if rework summary task is registered..."
cd "$PROJECT_ROOT/apps/api"
TASK_CHECK=$(uv run celery -A app.core.celery_app inspect registered 2>/dev/null | grep -o "intelligence.generate_rework_summary_task" || echo "")
if [ -n "$TASK_CHECK" ]; then
    echo -e "${GREEN}✓ Task 'intelligence.generate_rework_summary_task' is registered${NC}"
else
    echo -e "${RED}✗ Task not found${NC}"
    echo "   Restart Celery worker"
fi
cd "$PROJECT_ROOT"

# Check if Redis is running
echo ""
echo "6️⃣  Checking if Redis is running..."
if docker exec vantage-redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running (Docker)${NC}"
elif redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running (local)${NC}"
else
    echo -e "${RED}✗ Redis is not running${NC}"
    echo "   Start it with: pnpm redis:start"
fi

# Check if Gemini API key is configured
echo ""
echo "7️⃣  Checking Gemini API key configuration..."
cd "$PROJECT_ROOT"
if grep -q "GEMINI_API_KEY=.*[^=]" apps/api/.env 2>/dev/null; then
    echo -e "${GREEN}✓ Gemini API key is configured${NC}"
else
    echo -e "${YELLOW}⚠ Gemini API key may not be configured${NC}"
    echo "   Set it in apps/api/.env: GEMINI_API_KEY=your_key_here"
fi

# Check if frontend is running
echo ""
echo "8️⃣  Checking if frontend is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${YELLOW}⚠ Frontend is not running${NC}"
    echo "   Start it with: cd apps/web && pnpm dev"
fi

# Test API endpoint (requires authentication)
echo ""
echo "9️⃣  Testing API endpoint availability..."
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/assessments/1/rework-summary 2>/dev/null || echo "000")
if [ "$API_RESPONSE" == "401" ] || [ "$API_RESPONSE" == "403" ] || [ "$API_RESPONSE" == "404" ]; then
    echo -e "${GREEN}✓ API endpoint is accessible (auth required: $API_RESPONSE)${NC}"
elif [ "$API_RESPONSE" == "200" ]; then
    echo -e "${GREEN}✓ API endpoint is working and returned data${NC}"
else
    echo -e "${RED}✗ API endpoint returned unexpected status: $API_RESPONSE${NC}"
fi

# Summary
echo ""
echo "=============================================="
echo "✅ Environment Check Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Follow the testing guide: docs/testing/rework-summary-testing-guide.md"
echo "2. Create test users (BLGU + Assessor)"
echo "3. Submit an assessment as BLGU user"
echo "4. Request rework as Assessor with comments/annotations"
echo "5. Check BLGU view for AI-generated summary"
echo ""
echo "🔗 Useful URLs:"
echo "   - Backend API Docs: http://localhost:8000/docs"
echo "   - Frontend: http://localhost:3000"
echo "   - Rework Summary Page: http://localhost:3000/blgu/rework-summary?assessment=1"
echo ""
echo "📊 Monitor Celery logs to see task execution:"
echo "   cd apps/api && celery -A app.core.celery_app worker --loglevel=info"
echo ""
