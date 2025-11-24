# Testing Guide: AI-Generated Rework Summary Feature

## Prerequisites

Before testing, ensure you have:
- ✅ Gemini API key configured in `apps/api/.env`
- ✅ PostgreSQL database running
- ✅ Redis running (for Celery)

## Setup Steps

### 1. Run Database Migration

```bash
cd apps/api
alembic upgrade head
```

**Expected output**: Migration `add_rework_summary` applied successfully

### 2. Start Backend Services

```bash
# Terminal 1: Start FastAPI backend
cd apps/api
pnpm dev:api
# or
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify backend is running: http://localhost:8000/docs

### 3. Start Celery Worker

```bash
# Terminal 2: Start Celery worker
cd apps/api
celery -A app.core.celery_app worker --loglevel=info
```

**Expected output**:
```
[tasks]
  . intelligence.generate_insights_task
  . intelligence.generate_rework_summary_task  ← NEW TASK
  . notifications.send_rework_notification
```

### 4. Start Frontend

```bash
# Terminal 3: Start Next.js frontend
cd apps/web
pnpm dev
```

Verify frontend is running: http://localhost:3000

### 5. Generate TypeScript Types (Optional but Recommended)

```bash
# Terminal 4: Generate types
pnpm generate-types
```

If backend is running, this will generate the types including the new rework summary endpoint.

---

## Test Scenario 1: Complete Rework Workflow

### Step 1: Create Test Users (If Not Exist)

**Option A: Via API**

```bash
# Create BLGU user
curl -X POST http://localhost:8000/api/v1/users/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "blgu_test@test.com",
    "name": "BLGU Test User",
    "password": "password123",
    "role": "BLGU_USER",
    "barangay_id": 1
  }'

# Create Assessor user
curl -X POST http://localhost:8000/api/v1/users/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "assessor_test@test.com",
    "name": "Assessor Test User",
    "password": "password123",
    "role": "ASSESSOR"
  }'
```

**Option B: Via Frontend**
- Use existing admin account to create users via User Management page

### Step 2: BLGU Submits Assessment

1. Login as BLGU user: `blgu_test@test.com`
2. Navigate to dashboard: http://localhost:3000/blgu
3. Fill out assessment form for at least 2-3 indicators
4. Upload MOV files
5. Submit assessment for review

**Expected**: Assessment status changes to `SUBMITTED_FOR_REVIEW`

### Step 3: Assessor Reviews and Requests Rework

1. Logout and login as Assessor: `assessor_test@test.com`
2. Navigate to assessor queue: http://localhost:3000/assessor
3. Select the submitted assessment
4. For 2-3 indicators, add:
   - **Public comments** (visible to BLGU)
   - **MOV annotations** (highlight issues on PDFs/images)
5. Click **"Request Rework"** button

**Expected backend behavior**:
```json
{
  "success": true,
  "message": "Assessment sent for rework successfully",
  "assessment_id": 1,
  "new_status": "REWORK",
  "summary_generation_result": {
    "success": true,
    "message": "Rework summary generation queued successfully",
    "task_id": "abc-123-def-456"
  },
  "notification_result": {
    "success": true,
    "message": "Rework notification queued successfully",
    "task_id": "xyz-789-ghi-012"
  }
}
```

### Step 4: Monitor Celery Task Execution

**Watch Celery logs** (Terminal 2):

```
[2025-11-24 10:30:00,123: INFO] Generating rework summary for assessment 1 (attempt 1)
[2025-11-24 10:30:00,456: INFO] Gemini API call initiated
[2025-11-24 10:30:05,789: INFO] Successfully generated rework summary for assessment 1
[2025-11-24 10:30:05,890: INFO] Task intelligence.generate_rework_summary_task[abc-123-def-456] succeeded
```

**If successful**: Summary generated in 5-10 seconds
**If failed**: Check error logs for API key issues or network problems

### Step 5: Verify Database

```sql
-- Check if summary was stored
SELECT
  id,
  status,
  rework_summary IS NOT NULL as has_summary,
  rework_summary->>'overall_summary' as summary_text
FROM assessments
WHERE id = 1;
```

**Expected**:
```
id | status  | has_summary | summary_text
---+---------+-------------+--------------------------------------------------
 1 | REWORK  | true        | "The assessment requires revisions in 3 areas..."
```

### Step 6: Test API Endpoint Directly

```bash
# Get the BLGU user's token first
BLGU_TOKEN="your_blgu_token_here"

# Fetch rework summary
curl -X GET http://localhost:8000/api/v1/assessments/1/rework-summary \
  -H "Authorization: Bearer $BLGU_TOKEN"
```

**Expected response**:
```json
{
  "overall_summary": "The assessment requires revisions in 3 areas...",
  "indicator_summaries": [
    {
      "indicator_id": 1,
      "indicator_name": "1.1 Budget Ordinance",
      "key_issues": [
        "Budget ordinance document is missing page 3",
        "Signature is not clearly visible"
      ],
      "suggested_actions": [
        "Reupload the complete budget ordinance with all pages",
        "Ensure all signatures are clearly visible"
      ],
      "affected_movs": ["budget_ordinance.pdf"]
    }
  ],
  "priority_actions": [
    "Fix the budget ordinance document first",
    "Reupload missing MOV files",
    "Ensure all signatures are legible"
  ],
  "estimated_time": "30-45 minutes",
  "generated_at": "2025-11-24T10:30:05.789Z"
}
```

### Step 7: Test Frontend Display

1. Logout and login as BLGU user: `blgu_test@test.com`
2. Navigate to dashboard
3. Click on the assessment in rework status

**Expected on indicator page**:
- ✅ Orange alert banner: "This Indicator Requires Rework"
- ✅ Blue alert banner: "AI-Powered Summary" (may show loading spinner for 5-10 seconds)
- ✅ Brief summary text appears
- ✅ Top 3 priority actions listed
- ✅ Estimated time displayed
- ✅ "View Full Rework Summary" button visible

### Step 8: Test Full Summary Page

1. Click **"View Full Rework Summary"** button
2. Verify page loads: http://localhost:3000/blgu/rework-summary?assessment=1

**Expected page sections**:
- ✅ Header with AI icon and "AI-Powered Rework Summary" title
- ✅ Estimated time badge (top right)
- ✅ Overall summary card (blue background)
- ✅ Priority actions card (green background)
- ✅ Accordion with expandable indicator summaries
- ✅ Each indicator shows:
  - Key issues (red bullet points)
  - Suggested actions (green numbered list)
  - Affected MOV files (badges)
- ✅ "Start Fixing Issues" CTA button
- ✅ Generation timestamp footer

### Step 9: Test Polling Behavior

**Scenario**: Summary still generating

1. Manually delete summary from database:
```sql
UPDATE assessments SET rework_summary = NULL WHERE id = 1;
```

2. Trigger summary generation again:
```bash
cd apps/api
python -c "
from app.workers.intelligence_worker import generate_rework_summary_task
generate_rework_summary_task.delay(1)
"
```

3. Immediately refresh the BLGU frontend page

**Expected behavior**:
- Loading spinner appears in banner
- Message: "Analyzing assessor feedback and generating summary..."
- Page polls every 5 seconds
- Once summary is generated, spinner disappears and summary appears
- No page refresh needed (automatic update)

---

## Test Scenario 2: Edge Cases

### Edge Case 1: No Comments or Annotations

**Setup**: Request rework without adding any comments or annotations

**Expected**:
- Backend should reject with error
- Frontend shows validation message

### Edge Case 2: Assessment Not in Rework Status

**Test**: Try to fetch summary for assessment in `DRAFT` status

```bash
curl -X GET http://localhost:8000/api/v1/assessments/1/rework-summary \
  -H "Authorization: Bearer $BLGU_TOKEN"
```

**Expected response**:
```json
{
  "detail": "Assessment is not in rework status. Current status: DRAFT"
}
```

### Edge Case 3: Unauthorized Access

**Test**: Assessor tries to access BLGU's rework summary

```bash
curl -X GET http://localhost:8000/api/v1/assessments/1/rework-summary \
  -H "Authorization: Bearer $ASSESSOR_TOKEN"
```

**Expected response**:
```json
{
  "detail": "You can only access rework summaries for your own assessments"
}
```

### Edge Case 4: Gemini API Failure

**Test**: Temporarily invalidate API key

1. Edit `apps/api/.env`:
```
GEMINI_API_KEY=invalid_key
```

2. Trigger rework summary generation

**Expected**:
- Celery worker logs error
- Retries 3 times with exponential backoff
- After 3 failures, task fails
- Frontend shows error: "Rework summary is still being generated..."

### Edge Case 5: Max Polling Attempts

**Test**: Keep summary NULL for extended period

**Expected**:
- Frontend polls 20 times (5 seconds each = 100 seconds)
- After 20 attempts, shows error message
- Error: "Rework summary generation is taking longer than expected. Please refresh..."

---

## Test Scenario 3: Multiple Indicators

### Setup

1. Request rework for 5+ indicators
2. Add diverse feedback:
   - Some indicators: only comments
   - Some indicators: only MOV annotations
   - Some indicators: both comments and annotations

### Expected Summary Structure

```json
{
  "overall_summary": "Comprehensive summary covering all 5 indicators...",
  "indicator_summaries": [
    { "indicator_id": 1, "indicator_name": "1.1 Budget Ordinance", ... },
    { "indicator_id": 2, "indicator_name": "1.2 Annual Investment Plan", ... },
    { "indicator_id": 3, "indicator_name": "2.1 Disaster Risk Reduction", ... },
    { "indicator_id": 4, "indicator_name": "3.1 Peace and Order Committee", ... },
    { "indicator_id": 5, "indicator_name": "4.1 Gender and Development", ... }
  ],
  "priority_actions": [
    "First priority covering multiple indicators",
    "Second priority addressing critical issue",
    "Third priority for quick wins"
  ],
  "estimated_time": "2-3 hours"
}
```

---

## Troubleshooting

### Problem: Celery task not executing

**Check**:
```bash
# Verify Redis is running
redis-cli ping
# Should return: PONG

# Check Celery worker status
celery -A app.core.celery_app inspect active

# Check task registration
celery -A app.core.celery_app inspect registered
```

**Fix**: Restart Celery worker

### Problem: Summary generation fails

**Check Celery logs**:
```
[ERROR] Gemini API authentication failed
```

**Fix**: Verify `GEMINI_API_KEY` in `.env`

### Problem: Frontend shows "still generating" indefinitely

**Check**:
```sql
SELECT rework_summary FROM assessments WHERE id = 1;
```

**If NULL**: Check Celery logs for errors

**If NOT NULL**: Frontend polling may be broken
- Check browser console for errors
- Verify `useReworkSummary` hook is called correctly

### Problem: Frontend doesn't update after summary generated

**Check**:
- Browser console for errors
- Network tab: verify polling requests every 5 seconds
- Verify `isGenerating` state changes to `false`

**Fix**: Hard refresh browser (Ctrl+Shift+R)

---

## Performance Testing

### Test Load

```bash
# Generate summaries for 10 assessments simultaneously
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/v1/assessor/assessments/$i/rework \
    -H "Authorization: Bearer $ASSESSOR_TOKEN" &
done
```

**Monitor**:
- Celery worker handling concurrent tasks
- Database connection pool usage
- API response times
- Gemini API rate limits

---

## Success Criteria

✅ **Backend**:
- Migration applies without errors
- Celery task executes successfully
- Summary stored in database
- API endpoint returns 200 with valid JSON

✅ **Frontend**:
- Banner displays brief summary
- Polling works (updates without refresh)
- Full summary page renders correctly
- All sections display properly
- Navigation works smoothly

✅ **AI Quality**:
- Summary is coherent and actionable
- Issues accurately extracted from feedback
- Suggested actions are specific and clear
- Priority actions make sense

✅ **Performance**:
- Summary generated in < 15 seconds
- Frontend updates within 5 seconds of generation
- No UI blocking or freezing
- Polling stops after summary received

---

## Rollback Plan

If issues arise in production:

1. **Disable feature temporarily**:
```python
# In assessor_service.py, comment out:
# summary_task = generate_rework_summary_task.delay(assessment_id)
```

2. **Revert migration**:
```bash
cd apps/api
alembic downgrade -1
```

3. **Hide frontend components**:
```tsx
// In ReworkAlertBanner.tsx, comment out AI summary section
```

---

## Next Steps After Testing

1. ✅ Test all scenarios above
2. ✅ Verify AI summary quality with real assessor feedback
3. ✅ Monitor Gemini API usage and costs
4. ✅ Gather user feedback (BLGU users)
5. ✅ Optimize prompt if summary quality needs improvement
6. ✅ Add analytics tracking (optional)
7. ✅ Write automated tests (pytest + Playwright)

---

## Questions?

If you encounter issues during testing, check:
- Celery logs: `/tmp/celery.log` or console output
- Backend logs: FastAPI console
- Frontend console: Browser DevTools
- Database state: Direct SQL queries
