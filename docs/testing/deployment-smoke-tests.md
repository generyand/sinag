# Deployment and Smoke Testing Checklist

**Epic 6.0 - Story 6.19**
**Version:** 1.0
**Date:** 2025-11-09

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing (unit, integration, E2E)
- [ ] Code review completed and approved
- [ ] No critical or high-severity security vulnerabilities
- [ ] Linting passes with no errors
- [ ] Type checking passes (TypeScript)
- [ ] Build completes successfully
- [ ] Bundle size within acceptable limits

### Database

- [ ] All migrations tested on staging
- [ ] Database backup created
- [ ] Migration rollback procedure documented
- [ ] Database connection pooling configured
- [ ] RLS policies tested and verified

### Environment Configuration

- [ ] Production environment variables configured
- [ ] Secrets stored securely (not in code)
- [ ] API keys rotated and production-ready
- [ ] Supabase production project configured
- [ ] Redis production instance configured
- [ ] Celery workers configured

### Infrastructure

- [ ] Production servers provisioned
- [ ] Load balancer configured
- [ ] SSL/TLS certificates installed
- [ ] CDN configured for static assets
- [ ] Monitoring tools installed (Sentry, Analytics)
- [ ] Log aggregation configured

### Documentation

- [ ] Deployment runbook completed
- [ ] Rollback procedure documented
- [ ] Incident response plan ready
- [ ] User documentation published
- [ ] API documentation up-to-date

---

## Deployment Steps

### 1. Pre-Deployment Backup

```bash
# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup configuration
cp .env .env.backup_$(date +%Y%m%d_%H%M%S)

# Tag release
git tag -a v1.0.0 -m "Production Release v1.0.0"
git push origin v1.0.0
```

### 2. Database Migration

```bash
cd apps/api

# Dry run (verify migrations)
alembic upgrade head --sql > migration.sql
cat migration.sql  # Review SQL

# Apply migrations
alembic upgrade head

# Verify migration
alembic current
```

### 3. Backend Deployment

```bash
# Build backend
cd apps/api
pnpm build

# Deploy API
# (Using your deployment method: Docker, PM2, systemd, etc.)
docker-compose up -d api

# Verify API health
curl https://api.sinag.gov.ph/health
```

### 4. Frontend Deployment

```bash
# Build frontend
cd apps/web
pnpm build

# Deploy to Vercel/hosting
vercel deploy --prod

# Verify deployment
curl https://sinag.dilg.gov.ph
```

### 5. Worker Deployment

```bash
# Start Celery workers
celery -A app.core.celery_app worker --detach

# Verify workers running
celery -A app.core.celery_app inspect active
```

### 6. Post-Deployment Verification

```bash
# Health checks
curl https://api.sinag.gov.ph/health
curl https://api.sinag.gov.ph/api/v1/system/status

# Database connectivity
curl https://api.sinag.gov.ph/api/v1/system/db-status
```

---

## Smoke Test Suite

### Test 1: Application Accessibility

**Objective:** Verify application is accessible

```bash
# Frontend accessible
curl -I https://sinag.dilg.gov.ph
# Expected: HTTP 200 OK

# API accessible
curl -I https://api.sinag.gov.ph
# Expected: HTTP 200 OK

# API docs accessible
curl -I https://api.sinag.gov.ph/docs
# Expected: HTTP 200 OK
```

**✅ PASS Criteria:** All endpoints return 200 OK
**❌ FAIL Action:** Check load balancer, DNS, SSL certificate

---

### Test 2: Database Connectivity

**Objective:** Verify database is accessible and migrations applied

```bash
# Check database connection
curl https://api.sinag.gov.ph/api/v1/system/db-status

# Expected Response:
{
  "status": "healthy",
  "latency_ms": "<100",
  "migration_version": "head"
}
```

**✅ PASS Criteria:** Database healthy, latency < 100ms
**❌ FAIL Action:** Check database connection string, connection pool

---

### Test 3: Authentication Flow

**Objective:** Verify users can log in

**Manual Steps:**
1. Navigate to https://sinag.dilg.gov.ph/login
2. Enter valid test user credentials
3. Click "Login"

**Expected:**
- ✅ Login successful
- ✅ Redirected to dashboard
- ✅ User name displayed in header
- ✅ JWT token stored in session

**✅ PASS Criteria:** Successful login and redirect
**❌ FAIL Action:** Check auth service, JWT configuration, session storage

---

### Test 4: BLGU Dashboard Load

**Objective:** Verify BLGU dashboard loads with data

**Manual Steps:**
1. Log in as BLGU user
2. Observe dashboard

**Expected:**
- ✅ Dashboard loads within 3 seconds
- ✅ Barangay name displayed correctly
- ✅ Assessment statistics visible
- ✅ "New Assessment" button visible
- ✅ Recent assessments list populated

**✅ PASS Criteria:** Dashboard loads completely with data
**❌ FAIL Action:** Check API response time, database queries

---

### Test 5: Assessment Creation

**Objective:** Verify BLGU can create new assessment

**Manual Steps:**
1. Log in as BLGU user
2. Click "New Assessment"
3. Observe form

**Expected:**
- ✅ New assessment created in DRAFT status
- ✅ Assessment ID assigned
- ✅ Form renders with all governance areas
- ✅ Form fields are editable
- ✅ No errors in console

**✅ PASS Criteria:** Assessment created successfully
**❌ FAIL Action:** Check assessment service, database permissions

---

### Test 6: Form Interaction

**Objective:** Verify dynamic form works

**Manual Steps:**
1. Open assessment form
2. Fill a text field
3. Change a select dropdown
4. Toggle a conditional field

**Expected:**
- ✅ Text input accepts text
- ✅ Changes are reflected immediately
- ✅ Conditional fields appear/disappear correctly
- ✅ Auto-save triggers after 500ms
- ✅ No lag or freezing

**✅ PASS Criteria:** Form responsive and functional
**❌ FAIL Action:** Check form validation, React performance

---

### Test 7: File Upload

**Objective:** Verify MOV file upload works

**Manual Steps:**
1. Open assessment form
2. Navigate to an indicator
3. Click "Upload MOV"
4. Select a PDF file (< 5MB)
5. Observe upload

**Expected:**
- ✅ File upload dialog opens
- ✅ File upload starts
- ✅ Progress indicator shows
- ✅ Upload completes successfully
- ✅ File appears in file list
- ✅ File is downloadable

**✅ PASS Criteria:** File uploads and downloads successfully
**❌ FAIL Action:** Check storage service, file upload API, CORS

---

### Test 8: Assessment Submission

**Objective:** Verify BLGU can submit assessment

**Manual Steps:**
1. Complete all required fields
2. Upload required MOV files
3. Click "Check Completeness"
4. Click "Submit Assessment"
5. Confirm submission

**Expected:**
- ✅ Completeness validation passes
- ✅ Confirmation dialog appears
- ✅ Submission succeeds
- ✅ Status changes to SUBMITTED
- ✅ Form becomes read-only
- ✅ Success message displayed

**✅ PASS Criteria:** Submission successful and form locked
**❌ FAIL Action:** Check validation service, submission API

---

### Test 9: Assessor Access

**Objective:** Verify assessor can view submissions

**Manual Steps:**
1. Log in as ASSESSOR user
2. View assessor dashboard
3. Open a submitted assessment

**Expected:**
- ✅ Assessor dashboard loads
- ✅ Submitted assessments list appears
- ✅ Assessment details load
- ✅ Compliance status visible (PASS/FAIL/CONDITIONAL)
- ✅ calculated_remark visible
- ✅ All form data readable

**✅ PASS Criteria:** Assessor sees compliance data
**❌ FAIL Action:** Check role-based filtering, compliance calculation

---

### Test 10: Compliance Separation

**Objective:** Verify BLGU does NOT see compliance data

**Manual Steps:**
1. Log in as BLGU user
2. View submitted assessment
3. Inspect page source (F12 Developer Tools)

**Expected:**
- ✅ No "calculated_status" in response
- ✅ No "calculated_remark" in response
- ✅ No "PASS/FAIL/CONDITIONAL" visible
- ✅ Only "SUBMITTED" status visible

**✅ PASS Criteria:** Compliance completely hidden from BLGU
**❌ FAIL Action:** CRITICAL - Fix response filtering immediately

---

### Test 11: Rework Workflow

**Objective:** Verify rework request works

**Manual Steps:**
1. Log in as ASSESSOR
2. Open submitted assessment
3. Click "Request Rework"
4. Enter rework comments
5. Submit rework request

**Expected:**
- ✅ Rework request form appears
- ✅ Comments saved per indicator
- ✅ Request submitted successfully
- ✅ Status changes to REWORK
- ✅ BLGU receives notification

**✅ PASS Criteria:** Rework request successful
**❌ FAIL Action:** Check rework service, notification system

---

### Test 12: Background Jobs

**Objective:** Verify Celery workers processing jobs

**Manual Steps:**
1. Trigger a background job (e.g., compliance calculation)
2. Check Celery worker logs

**Expected:**
- ✅ Worker receives task
- ✅ Task executes successfully
- ✅ Task completes within expected time
- ✅ No errors in logs

**✅ PASS Criteria:** Background jobs processing
**❌ FAIL Action:** Check Celery workers, Redis connection

---

### Test 13: Error Handling

**Objective:** Verify graceful error handling

**Manual Steps:**
1. Submit invalid form data
2. Upload oversized file (> 50MB)
3. Access unauthorized endpoint

**Expected:**
- ✅ Validation errors displayed clearly
- ✅ File size error message shown
- ✅ 403 Forbidden for unauthorized access
- ✅ No server crashes
- ✅ Error logged to monitoring system

**✅ PASS Criteria:** Errors handled gracefully
**❌ FAIL Action:** Check error handling middleware, monitoring

---

### Test 14: Performance

**Objective:** Verify acceptable performance

**Metrics to Check:**
- ✅ Page load time < 3 seconds
- ✅ API response time < 500ms
- ✅ Database query time < 100ms
- ✅ File upload (10MB) < 10 seconds

**Tools:**
- Chrome DevTools (Network, Performance tabs)
- Lighthouse audit
- Backend logs for query times

**✅ PASS Criteria:** All metrics within targets
**❌ FAIL Action:** Identify slow queries, optimize as needed

---

### Test 15: Security

**Objective:** Verify security measures active

**Checks:**
- ✅ HTTPS enforced (no HTTP access)
- ✅ JWT tokens expire correctly
- ✅ CORS configured properly
- ✅ SQL injection prevented (test with SQLMap)
- ✅ XSS prevention (test with XSS payloads)
- ✅ File upload validation working
- ✅ RBAC properly enforced

**✅ PASS Criteria:** No security vulnerabilities found
**❌ FAIL Action:** CRITICAL - Fix security issues immediately

---

## Smoke Test Summary

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Application Accessibility | ☐ | |
| 2 | Database Connectivity | ☐ | |
| 3 | Authentication Flow | ☐ | |
| 4 | BLGU Dashboard Load | ☐ | |
| 5 | Assessment Creation | ☐ | |
| 6 | Form Interaction | ☐ | |
| 7 | File Upload | ☐ | |
| 8 | Assessment Submission | ☐ | |
| 9 | Assessor Access | ☐ | |
| 10 | Compliance Separation | ☐ | |
| 11 | Rework Workflow | ☐ | |
| 12 | Background Jobs | ☐ | |
| 13 | Error Handling | ☐ | |
| 14 | Performance | ☐ | |
| 15 | Security | ☐ | |

**Overall Result:** ☐ PASS ☐ FAIL

---

## Rollback Procedure

If smoke tests fail critically:

### Immediate Rollback Steps

```bash
# 1. Revert to previous version
git checkout <previous_tag>

# 2. Rollback database migrations
cd apps/api
alembic downgrade -1

# 3. Redeploy previous version
docker-compose down
docker-compose up -d

# 4. Restore database backup (if needed)
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# 5. Verify previous version working
curl https://api.sinag.gov.ph/health
```

### Post-Rollback Actions

1. Notify stakeholders of rollback
2. Create incident report
3. Analyze root cause
4. Fix issues in development
5. Retest thoroughly
6. Schedule new deployment

---

## Monitoring Setup

### Application Monitoring

```bash
# Sentry error tracking
export SENTRY_DSN="<production_dsn>"

# Application logs
tail -f /var/log/sinag/app.log

# Nginx access logs
tail -f /var/log/nginx/access.log

# Database logs
tail -f /var/log/postgresql/postgresql.log
```

### Metrics to Monitor (First 48 hours)

- **Error Rate:** < 1% of requests
- **Response Time:** p95 < 1 second
- **Uptime:** > 99.9%
- **Database Connections:** < 80% of pool
- **Memory Usage:** < 80% of available
- **CPU Usage:** < 70% average
- **Disk Space:** > 20% free

### Alerts to Configure

- [ ] API error rate > 5%
- [ ] Response time p95 > 3 seconds
- [ ] Service downtime
- [ ] Database connection pool exhausted
- [ ] Disk space < 10%
- [ ] Memory usage > 90%

---

## Sign-off

### Deployment Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| DevOps Lead | _________________ | _________________ | ________ |
| Technical Lead | _________________ | _________________ | ________ |
| QA Lead | _________________ | _________________ | ________ |
| Project Manager | _________________ | _________________ | ________ |

### Smoke Test Result

- [ ] **ALL TESTS PASSED** - Production deployment successful
- [ ] **MINOR ISSUES** - Deploy with monitoring and issue tracking
- [ ] **CRITICAL ISSUES** - Rollback immediately

**Deployment Status:** ________________

**Deployed By:** ________________

**Deployment Date/Time:** ________________

**Production URL:** https://sinag.dilg.gov.ph

**API URL:** https://api.sinag.gov.ph

---

**Next Steps:**
1. Begin hypercare monitoring period (48 hours)
2. Daily stakeholder status updates
3. Monitor error rates and performance
4. Collect user feedback
5. Triage and fix issues as needed
