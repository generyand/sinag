# BLGU Assessment Lock Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task.

**Goal:** Replace deadline-based auto-submission with explicit BLGU write-access locking, plus MLGOO
unlock and relock controls, without changing workflow status or consuming rework/calibration cycles.

**Architecture:** Add explicit BLGU lock metadata to assessments and a default unlock grace setting
to assessment years. Centralize backend lock enforcement for all BLGU write paths, replace the
deadline worker’s auto-submit logic with lock/relock behavior, then update BLGU and MLGOO UI to
reflect the new source of truth.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Celery, Next.js, React Query, Orval-generated client,
Vitest, Pytest

---

### Task 1: Add explicit BLGU lock fields and settings

**Files:**

- Modify: `apps/api/app/db/models/assessment.py`
- Modify: `apps/api/app/db/models/system.py`
- Modify: `apps/api/app/schemas/assessment_year.py`
- Create: `apps/api/alembic/versions/<new_migration>.py`
- Test: `apps/api/tests/...` new migration-adjacent model/service tests

**Step 1: Write the failing backend tests**

Add tests that expect:

- `Assessment` to expose explicit BLGU lock fields
- `AssessmentYear` to expose `default_unlock_grace_period_days`

**Step 2: Run targeted tests to verify failure**

Run: `cd apps/api && pytest apps/api/tests -k "lock_for_blgu or grace_period_days" -q`

Expected: FAIL because the fields do not exist yet.

**Step 3: Write the minimal implementation**

- add the new assessment columns
- add the new assessment year column with default `3`
- create the Alembic migration
- expose the new assessment year field in create/update/response schemas

**Step 4: Run targeted tests to verify pass**

Run the same `pytest` command and confirm the new tests pass.

**Step 5: Commit**

```bash
git add apps/api/app/db/models/assessment.py apps/api/app/db/models/system.py apps/api/app/schemas/assessment_year.py apps/api/alembic/versions
git commit -m "feat(lock): add explicit BLGU lock metadata"
```

### Task 2: Replace auto-submit worker with lock processing

**Files:**

- Modify: `apps/api/app/workers/deadline_worker.py`
- Modify: `apps/api/app/core/celery_app.py`
- Modify: `apps/api/app/api/v1/admin.py`
- Modify: `apps/api/app/schemas/admin.py`
- Test: `apps/api/tests/workers/test_deadline_worker_locking.py`
- Test: `apps/api/tests/api/v1/test_admin_deadline_lock_processing.py`

**Step 1: Write the failing tests**

Add tests for:

- overdue `DRAFT` assessments become locked, not submitted
- grace-expired assessments relock without status changes
- rerunning the worker is idempotent
- admin manual trigger reports locked assessments, not auto-submissions

**Step 2: Run test to verify it fails**

Run:
`cd apps/api && pytest apps/api/tests/workers/test_deadline_worker_locking.py apps/api/tests/api/v1/test_admin_deadline_lock_processing.py -q`

Expected: FAIL because the worker still auto-submits.

**Step 3: Write minimal implementation**

- replace `_auto_submit_assessment` semantics with lock helpers
- update Celery schedule names/messages
- convert admin trigger endpoint to deadline lock processing
- remove `AUTO_SUBMITTED` behavior from this path

**Step 4: Run tests to verify pass**

Run the same `pytest` command and confirm green.

**Step 5: Commit**

```bash
git add apps/api/app/workers/deadline_worker.py apps/api/app/core/celery_app.py apps/api/app/api/v1/admin.py apps/api/app/schemas/admin.py apps/api/tests/workers/test_deadline_worker_locking.py apps/api/tests/api/v1/test_admin_deadline_lock_processing.py
git commit -m "fix(deadline): lock overdue assessments instead of auto-submitting"
```

### Task 3: Centralize backend BLGU write-lock enforcement

**Files:**

- Modify: `apps/api/app/db/models/assessment.py`
- Modify: `apps/api/app/api/v1/assessments.py`
- Modify: `apps/api/app/api/v1/movs.py`
- Modify: `apps/api/app/services/storage_service.py`
- Modify: `apps/api/app/services/area_submission_service.py`
- Modify: `apps/api/app/services/assessment_service.py`
- Test: `apps/api/tests/api/v1/test_blgu_lock_enforcement.py`

**Step 1: Write the failing tests**

Cover locked-assessment rejection for:

- save answers
- update response
- MOV upload
- MOV delete
- MOV rotate
- area submit
- area resubmit
- submit assessment
- resubmit assessment
- submit for calibration review

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pytest apps/api/tests/api/v1/test_blgu_lock_enforcement.py -q`

Expected: FAIL because locked BLGU writes still succeed in multiple paths.

**Step 3: Write minimal implementation**

- add a shared BLGU write guard helper
- call it from all BLGU write endpoints and services
- return a consistent lock error payload
- update `Assessment.is_locked` logic to stop depending on `auto_submitted_at`

**Step 4: Run tests to verify pass**

Run the same `pytest` command and confirm green.

**Step 5: Commit**

```bash
git add apps/api/app/db/models/assessment.py apps/api/app/api/v1/assessments.py apps/api/app/api/v1/movs.py apps/api/app/services/storage_service.py apps/api/app/services/area_submission_service.py apps/api/app/services/assessment_service.py apps/api/tests/api/v1/test_blgu_lock_enforcement.py
git commit -m "fix(blgu): enforce explicit assessment locks on write paths"
```

### Task 4: Add MLGOO unlock and manual relock controls

**Files:**

- Modify: `apps/api/app/services/mlgoo_service.py`
- Modify: `apps/api/app/api/v1/mlgoo.py`
- Modify: `apps/api/app/schemas/mlgoo.py`
- Test: `apps/api/tests/services/test_mlgoo_lock_controls.py`
- Test: `apps/api/tests/api/v1/test_mlgoo_lock_controls.py`

**Step 1: Write the failing tests**

Add tests for:

- unlock with default grace period from active year
- unlock with custom expiry override
- unlock does not change workflow status
- manual relock does not change workflow status
- repeated unlock or lock calls are idempotent

**Step 2: Run test to verify it fails**

Run:
`cd apps/api && pytest apps/api/tests/services/test_mlgoo_lock_controls.py apps/api/tests/api/v1/test_mlgoo_lock_controls.py -q`

Expected: FAIL because only the old deadline unlock behavior exists.

**Step 3: Write minimal implementation**

- extend unlock request/response schemas
- compute default grace period from active assessment year
- add manual relock endpoint and service method
- persist lock metadata without touching workflow counters

**Step 4: Run tests to verify pass**

Run the same `pytest` command and confirm green.

**Step 5: Commit**

```bash
git add apps/api/app/services/mlgoo_service.py apps/api/app/api/v1/mlgoo.py apps/api/app/schemas/mlgoo.py apps/api/tests/services/test_mlgoo_lock_controls.py apps/api/tests/api/v1/test_mlgoo_lock_controls.py
git commit -m "feat(mlgoo): add assessment unlock and relock controls"
```

### Task 5: Surface lock metadata in BLGU and MLGOO data responses

**Files:**

- Modify: `apps/api/app/api/v1/blgu_dashboard.py`
- Modify: `apps/api/app/schemas/blgu_dashboard.py`
- Modify: `apps/api/app/schemas/assessment.py`
- Modify: `apps/api/app/services/assessment_service.py`
- Modify: `packages/shared/src/generated/**` after regen
- Test: `apps/api/tests/api/v1/test_blgu_dashboard_lock_metadata.py`

**Step 1: Write the failing tests**

Add tests that expect BLGU-facing and shared assessment responses to include:

- `is_locked_for_blgu`
- `lock_reason`
- `locked_at`
- `grace_period_expires_at`

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pytest apps/api/tests/api/v1/test_blgu_dashboard_lock_metadata.py -q`

Expected: FAIL because the response payload does not expose the new lock metadata.

**Step 3: Write minimal implementation**

- include lock metadata in BLGU dashboard response
- include lock metadata in assessment/submission status responses
- regenerate shared client/types from OpenAPI

**Step 4: Run tests to verify pass**

Run the same `pytest` command and confirm green.

**Step 5: Commit**

```bash
git add apps/api/app/api/v1/blgu_dashboard.py apps/api/app/schemas/blgu_dashboard.py apps/api/app/schemas/assessment.py apps/api/app/services/assessment_service.py packages/shared/src/generated
git commit -m "feat(api): expose BLGU assessment lock metadata"
```

### Task 6: Update BLGU frontend to honor explicit lock state

**Files:**

- Modify: `apps/web/src/hooks/useAssessment.ts`
- Modify: `apps/web/src/components/features/blgu-phases/DeadlineBanner.tsx`
- Modify: `apps/web/src/components/features/assessments/AssessmentLockedBanner.tsx`
- Modify: `apps/web/src/components/features/assessments/LockedStateBanner.tsx`
- Modify: `apps/web/src/app/(app)/blgu/assessments/page.tsx`
- Modify: `apps/web/src/app/(app)/blgu/assessment/[assessmentId]/indicator/[indicatorId]/page.tsx`
- Modify: submission and area-action components that currently infer editability from status only
- Test: `apps/web/src/components/features/blgu-phases/__tests__/DeadlineBanner.test.tsx`
- Test: `apps/web/src/components/features/assessments/__tests__/AssessmentLockedBanner.test.tsx`
- Test: `apps/web/src/components/features/assessments/__tests__/LockedStateBanner.test.tsx`
- Test: page-level BLGU lock behavior tests as needed

**Step 1: Write the failing tests**

Add tests for:

- no more auto-submit copy
- locked-due-to-deadline banner
- locked-due-to-grace-expiry banner
- submit/resubmit/actions disabled when explicit lock is active even if status is editable

**Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run <targeted test files>`

Expected: FAIL because the UI still keys mainly off status and auto-submit messaging.

**Step 3: Write minimal implementation**

- map new lock metadata in `useCurrentAssessment`
- drive BLGU `isLocked` from explicit lock metadata
- update banners and disable action components accordingly

**Step 4: Run tests to verify pass**

Run the same `vitest` command and confirm green.

**Step 5: Commit**

```bash
git add apps/web/src/hooks/useAssessment.ts apps/web/src/components/features/blgu-phases/DeadlineBanner.tsx apps/web/src/components/features/assessments apps/web/src/app/(app)/blgu/assessments/page.tsx apps/web/src/app/(app)/blgu/assessment/[assessmentId]/indicator/[indicatorId]/page.tsx
git commit -m "fix(web): honor explicit BLGU assessment locks"
```

### Task 7: Add MLGOO frontend controls for unlock and relock

**Files:**

- Modify: `apps/web/src/app/(app)/mlgoo/submissions/[id]/page.tsx`
- Modify: any shared MLGOO action components needed
- Modify: generated client usage after schema regen
- Test: `apps/web/src/app/(app)/mlgoo/submissions/[id]/__tests__/...`

**Step 1: Write the failing tests**

Add tests for:

- unlock UI prefills active-year default grace period
- MLGOO can switch to custom expiry
- relock action is visible when assessment is currently unlocked

**Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run <targeted mlgoo lock control tests>`

Expected: FAIL because the page does not yet expose the new controls.

**Step 3: Write minimal implementation**

- add lock state display
- wire unlock mutation to new request shape
- add manual relock action

**Step 4: Run tests to verify pass**

Run the same `vitest` command and confirm green.

**Step 5: Commit**

```bash
git add apps/web/src/app/(app)/mlgoo/submissions/[id]/page.tsx
git commit -m "feat(mlgoo-web): add assessment lock controls"
```

### Task 8: Final verification and cleanup

**Files:**

- Modify: any touched files needed for final fixes
- Test: targeted backend and frontend suites

**Step 1: Run backend targeted suites**

Run:

```bash
cd apps/api && pytest apps/api/tests/workers/test_deadline_worker_locking.py apps/api/tests/api/v1/test_admin_deadline_lock_processing.py apps/api/tests/api/v1/test_blgu_lock_enforcement.py apps/api/tests/services/test_mlgoo_lock_controls.py apps/api/tests/api/v1/test_mlgoo_lock_controls.py apps/api/tests/api/v1/test_blgu_dashboard_lock_metadata.py -q
```

Expected: PASS

**Step 2: Run frontend targeted suites**

Run:

```bash
cd apps/web && pnpm vitest run <all touched lock-related frontend tests>
```

Expected: PASS

**Step 3: Run touched-file lint**

Run:

```bash
cd apps/web && pnpm eslint <touched web files>
cd /home/asnari/Project/sinag/.worktrees/testing-publish/apps/api && pnpm exec ruff check <touched api files>
```

Expected: no errors

**Step 4: Regenerate shared client if backend contract changed**

Run:

```bash
cd /home/asnari/Project/sinag/.worktrees/testing-publish && pnpm generate-types
```

Expected: generated client updated to match API

**Step 5: Commit**

```bash
git add apps/api apps/web packages/shared
git commit -m "feat(lock): replace autosubmit with BLGU assessment lock flow"
```
