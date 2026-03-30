# BLGU Resubmit Route Deduplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure BLGU resubmission after `REOPENED_BY_MLGOO` restores per-area statuses consistently
so reopened assessments reappear in assessor queues after resubmit.

**Architecture:** The root cause is duplicated workflow logic in the API route layer. The
`POST /assessments/{id}/resubmit` route mutates assessment state directly and bypasses the canonical
`assessment_service.submit_assessment()` path, which already contains the MLGOO-reopen area-state
restoration logic. The fix is to add a route-level regression, delegate the route to the shared
service, and verify the persisted area state and assessor queue behavior.

**Tech Stack:** FastAPI, SQLAlchemy, pytest, generated shared client, React frontend already wired
to the resubmit route

---

## File Map

- Modify: `apps/api/app/api/v1/assessments.py`
  - Remove duplicated resubmit workflow mutation for the full-assessment BLGU resubmit endpoint.
  - Delegate to `assessment_service.submit_assessment()` and preserve route-level auth and response
    shaping.
- Modify: `apps/api/tests/api/v1/test_assessments.py`
  - Add an API regression proving `POST /api/v1/assessments/{id}/resubmit` restores area statuses
    for `REOPENED_BY_MLGOO` assessments.
- Modify: `apps/api/tests/services/test_assessment_service.py`
  - Keep the existing service-level regression focused on canonical workflow behavior.
- Optional verify-only read: `apps/api/app/services/assessment_service.py`
  - Confirm shared service behavior remains the source of truth.
- Optional verify-only read: `apps/api/app/services/assessor_service.py`
  - Confirm assessor queue still filters out `draft` areas, so the regression is meaningful.

## Task 1: Lock In The Broken API Behavior With A Failing Regression

**Files:**

- Modify: `apps/api/tests/api/v1/test_assessments.py`
- Read: `apps/api/app/api/v1/assessments.py`
- Read: `apps/api/app/services/assessment_service.py`

- [ ] **Step 1: Write the failing API test**

Add a test that:

- creates a BLGU-owned assessment in `REOPENED_BY_MLGOO`
- sets `reopen_from_status = SUBMITTED_FOR_REVIEW`
- seeds `area_submission_status` for all six areas as `draft`
- calls `POST /api/v1/assessments/{assessment_id}/resubmit`
- asserts:
  - response is `200`
  - `assessment.status == SUBMITTED_FOR_REVIEW`
  - all `area_submission_status[*].status == "submitted"`
  - all `area_assessor_approved[*] is False`

Suggested test name:

```python
def test_resubmit_endpoint_restores_area_statuses_after_mlgoo_reopen(...):
    ...
```

- [ ] **Step 2: Run the test to verify the current route fails**

Run:

```bash
cd apps/api && uv run pytest tests/api/v1/test_assessments.py -k "restores_area_statuses_after_mlgoo_reopen" -v
```

Expected:

- FAIL because the route currently leaves all area statuses as `draft`

## Task 2: Remove Route-Level Workflow Duplication

**Files:**

- Modify: `apps/api/app/api/v1/assessments.py`
- Read: `apps/api/app/services/assessment_service.py`

- [ ] **Step 1: Replace direct mutation with service delegation**

In `resubmit_assessment()`:

- keep route-level authorization and ownership checks
- keep `_ensure_blgu_write_allowed(...)`
- keep the allowed-status gate if it still provides better HTTP errors
- stop directly mutating:
  - `assessment.status`
  - `assessment.submitted_at`
  - `assessment.rework_submitted_at`
  - `assessment.area_submission_status`
- call:

```python
validation_result = assessment_service.submit_assessment(db, assessment.id)
```

- [ ] **Step 2: Preserve route response contract**

Shape the HTTP response from the service result without changing the frontend contract:

```python
return ResubmitAssessmentResponse(
    success=validation_result.success,
    message="Assessment resubmitted successfully",
    assessment_id=assessment.id,
    resubmitted_at=assessment.submitted_at,
    rework_count=assessment.rework_count,
)
```

If the service can return failure for this route path, convert it to the appropriate `HTTPException`
rather than silently returning success.

- [ ] **Step 3: Keep behavior scoped**

Do not change:

- per-area area-only resubmit endpoints
- calibration-specific resubmit endpoint
- frontend mutation wiring

This task is only about making the full-assessment resubmit endpoint use the canonical workflow
implementation.

## Task 3: Verify The Regression Passes At API And Service Levels

**Files:**

- Read: `apps/api/tests/api/v1/test_assessments.py`
- Read: `apps/api/tests/services/test_assessment_service.py`

- [ ] **Step 1: Run the new API regression**

Run:

```bash
cd apps/api && uv run pytest tests/api/v1/test_assessments.py -k "restores_area_statuses_after_mlgoo_reopen" -v
```

Expected:

- PASS

- [ ] **Step 2: Re-run the existing service regressions**

Run:

```bash
cd apps/api && uv run pytest tests/services/test_assessment_service.py -k "mlgoo_reopen_resubmission or reopened_by_mlgoo_by_source_status" -v
```

Expected:

- PASS

- [ ] **Step 3: Re-run validator/assessor workflow guard coverage**

Run:

```bash
cd apps/api && uv run pytest tests/services/test_assessor_service_noop_validation.py -k "validator_cannot_access_assessor_stage_assessment_details" -v
```

Expected:

- PASS

## Task 4: Verify Real Queue-Level Outcome

**Files:**

- Read: `apps/api/app/services/assessor_service.py`

- [ ] **Step 1: Confirm persisted area state after resubmit**

Use a direct DB check or shell snippet against the affected assessment to verify:

```text
assessment.status == SUBMITTED_FOR_REVIEW
area_submission_status["1"]["status"] == "submitted"
...
area_submission_status["6"]["status"] == "submitted"
```

- [ ] **Step 2: Confirm assessor queue visibility**

Use the existing assessor queue service or API for Area 1 and verify the affected barangay is now
included after resubmit.

Expected:

- `Poblacion` appears in Financial Administration submissions once its area `1` status is no longer
  `draft`

- [ ] **Step 3: Decide on legacy data handling**

If existing assessments already persisted in the bad shape do not re-flow automatically, explicitly
document whether to:

- re-run reopen + resubmit after deploying the fix, or
- perform a one-time data repair

This is a product/ops decision after verifying the route fix in a live flow.

## Task 5: Closeout

**Files:**

- Modify if needed: `docs/superpowers/plans/2026-03-29-blgu-resubmit-route-deduplication.md`

- [ ] **Step 1: Summarize the verified root cause**

Record:

- frontend uses `/resubmit`
- `/resubmit` had duplicated workflow logic
- duplicated route bypassed `_restore_area_statuses_after_mlgoo_reopen_resubmission()`

- [ ] **Step 2: Commit focused backend fix**

Suggested commit:

```bash
git add apps/api/app/api/v1/assessments.py apps/api/tests/api/v1/test_assessments.py apps/api/tests/services/test_assessment_service.py
git commit -m "fix(api): deduplicate blgu resubmit workflow"
```

- [ ] **Step 3: Communicate any separate unresolved issues**

Call out explicitly if still unresolved:

- Tagolilong missing `4.1.1` data issue
- any pre-existing bad records that need manual replay or data repair
