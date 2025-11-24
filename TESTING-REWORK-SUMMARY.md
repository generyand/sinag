# Quick Testing Guide: AI Rework Summary

## 🚀 Quick Start (5 Minutes)

### 1. Run Environment Check
```bash
./scripts/test-rework-summary.sh
```

This checks:
- ✅ Backend running
- ✅ Database migration applied
- ✅ Celery worker running
- ✅ Redis running
- ✅ Gemini API key configured
- ✅ Frontend running

### 2. Start All Services (if not running)

**Terminal 1 - Backend:**
```bash
cd apps/api
pnpm dev:api
```

**Terminal 2 - Celery:**
```bash
cd apps/api
celery -A app.core.celery_app worker --loglevel=info
```

**Terminal 3 - Frontend:**
```bash
cd apps/web
pnpm dev
```

**Terminal 4 - Redis (if not running):**
```bash
redis-server
```

---

## 📝 Manual Test Checklist

### Step 1: Setup (One-time)

- [ ] Run migration: `cd apps/api && alembic upgrade head`
- [ ] Configure Gemini API key in `apps/api/.env`
- [ ] Create test BLGU user (if not exists)
- [ ] Create test Assessor user (if not exists)

### Step 2: Create Test Data

- [ ] Login as BLGU user
- [ ] Fill out assessment (at least 3 indicators)
- [ ] Upload MOV files
- [ ] Submit for review

### Step 3: Trigger Rework with AI Summary

- [ ] Login as Assessor
- [ ] Open submitted assessment
- [ ] Add comments to 2-3 indicators (public comments)
- [ ] Add MOV annotations (highlight issues on files)
- [ ] Click "Request Rework" button

**Watch Celery logs** - You should see:
```
[INFO] Generating rework summary for assessment X (attempt 1)
[INFO] Successfully generated rework summary for assessment X
```

### Step 4: Verify Backend

- [ ] Check database: `SELECT rework_summary FROM assessments WHERE id = 1;`
- [ ] Test API directly:
```bash
curl http://localhost:8000/api/v1/assessments/1/rework-summary \
  -H "Authorization: Bearer YOUR_BLGU_TOKEN"
```

### Step 5: Test Frontend

- [ ] Login as BLGU user
- [ ] Navigate to assessment (should show REWORK status)
- [ ] Open any indicator requiring rework

**Check Banner Display:**
- [ ] Orange alert: "This Indicator Requires Rework"
- [ ] Blue alert: "AI-Powered Summary"
- [ ] See brief overall summary
- [ ] See top 3 priority actions
- [ ] See estimated time
- [ ] See "View Full Rework Summary" button

### Step 6: Test Full Summary Page

- [ ] Click "View Full Rework Summary" button
- [ ] Page loads: `/blgu/rework-summary?assessment=1`

**Verify page sections:**
- [ ] Header with AI icon and title
- [ ] Estimated time badge (top right)
- [ ] Overall summary card (blue)
- [ ] Priority actions card (green, numbered list)
- [ ] Accordion with indicator summaries
- [ ] Each indicator shows:
  - [ ] Key issues (red bullets)
  - [ ] Suggested actions (green numbers)
  - [ ] Affected MOV files (badges)
- [ ] "Start Fixing Issues" button
- [ ] Generation timestamp at bottom

### Step 7: Test Polling Behavior (Optional)

**Simulate slow generation:**

1. Delete summary from DB:
```sql
UPDATE assessments SET rework_summary = NULL WHERE id = 1;
```

2. Trigger generation manually:
```bash
cd apps/api
python -c "
from app.workers.intelligence_worker import generate_rework_summary_task
generate_rework_summary_task.delay(1)
"
```

3. Immediately refresh BLGU page

**Expected:**
- [ ] Loading spinner appears
- [ ] "Analyzing assessor feedback..." message
- [ ] After 5-10 seconds, summary appears automatically
- [ ] No manual refresh needed

---

## 🐛 Common Issues

### Issue: "Task not found" error

**Solution:** Restart Celery worker
```bash
pkill -f celery
cd apps/api && celery -A app.core.celery_app worker --loglevel=info
```

### Issue: Summary not generating

**Check:**
1. Celery logs for errors
2. Gemini API key: `grep GEMINI_API_KEY apps/api/.env`
3. Redis connection: `redis-cli ping`

### Issue: Frontend shows "still generating" forever

**Check:**
1. Browser console for errors
2. Network tab - verify polling requests
3. Database: `SELECT rework_summary FROM assessments WHERE id = 1;`
4. If summary exists in DB but not showing, hard refresh (Ctrl+Shift+R)

### Issue: "Authentication failed" in Celery logs

**Solution:** Check Gemini API key is valid
```bash
# Test Gemini API key
curl https://generativelanguage.googleapis.com/v1beta/models \
  -H "x-goog-api-key: YOUR_KEY"
```

---

## ✅ Success Indicators

**Backend:**
- ✅ Celery task completes in 5-15 seconds
- ✅ Database has JSON summary stored
- ✅ API returns 200 with structured JSON

**Frontend:**
- ✅ Banner updates automatically (no refresh needed)
- ✅ Summary is readable and actionable
- ✅ All navigation works smoothly
- ✅ No console errors

**AI Quality:**
- ✅ Summary accurately reflects assessor feedback
- ✅ Suggested actions are specific and clear
- ✅ Priority actions make sense
- ✅ Estimated time is reasonable

---

## 📊 What to Look For in Celery Logs

### ✅ Successful Generation
```
[INFO] Generating rework summary for assessment 1 (attempt 1)
[INFO] Successfully generated rework summary for assessment 1
[INFO] Task intelligence.generate_rework_summary_task succeeded
```

### ⚠️ Retry (transient error)
```
[WARNING] Error generating rework summary for assessment 1 (attempt 1): Network timeout
[INFO] Retrying rework summary generation for assessment 1 in 60 seconds...
```

### ❌ Failed (permanent error)
```
[ERROR] Validation error generating rework summary for assessment 1: Assessment 1 not found
[ERROR] Task intelligence.generate_rework_summary_task failed
```

---

## 🎯 Quick Verification Commands

### Check if everything is running:
```bash
# Backend
curl -s http://localhost:8000/docs > /dev/null && echo "✓ Backend UP" || echo "✗ Backend DOWN"

# Frontend
curl -s http://localhost:3000 > /dev/null && echo "✓ Frontend UP" || echo "✗ Frontend DOWN"

# Redis
redis-cli ping | grep -q PONG && echo "✓ Redis UP" || echo "✗ Redis DOWN"

# Celery
pgrep -f celery > /dev/null && echo "✓ Celery UP" || echo "✗ Celery DOWN"
```

### Check database:
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM assessments WHERE rework_summary IS NOT NULL;"
```

### Trigger test generation:
```bash
cd apps/api
python -c "
from app.workers.intelligence_worker import generate_rework_summary_task
result = generate_rework_summary_task.delay(1)
print(f'Task ID: {result.id}')
"
```

---

## 📚 Full Documentation

For comprehensive testing guide with all edge cases:
- **Full Guide:** `docs/testing/rework-summary-testing-guide.md`
- **Test Script:** `./scripts/test-rework-summary.sh`

## 🆘 Need Help?

If you encounter issues:
1. Check Celery logs (Terminal 2)
2. Check browser console (F12)
3. Check database state (SQL queries above)
4. Review backend logs (Terminal 1)
