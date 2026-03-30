# MLGOO Reopen Resubmit State Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make MLGOO-reopened assessments resubmit into a fully consistent review state, with
correct per-area submission statuses and correct BLGU dashboard progress display.

**Architecture:** Fix the backend source of truth first so resubmitting after `REOPENED_BY_MLGOO`
updates both the overall assessment workflow status and the per-area workflow state together. Then
patch the BLGU dashboard progress component so review-stage statuses such as `SUBMITTED_FOR_REVIEW`
render the correct phase progress instead of falling back to `0% / Starting`.

**Tech Stack:** FastAPI, SQLAlchemy, Next.js, React, Vitest, pytest

---

## File Map

- Modify: `apps/api/app/services/assessment_service.py`
  - Owns the BLGU submission/resubmission workflow and is the correct place to align overall
    assessment status with `area_submission_status`.
- Modify: `apps/api/app/api/v1/assessments.py`
  - Verify the route-level resubmit path stays consistent with the service behavior; update only if
    route logic duplicates stale assumptions.
- Test: `apps/api/tests/...`
  - Add a backend regression covering the exact sequence: MLGOO reopen -> BLGU resubmit -> restored
    review state + per-area state alignment.
- Modify: `apps/web/src/components/features/blgu-phases/AssessmentProgress.tsx`
  - Add explicit support for `SUBMITTED_FOR_REVIEW` in the phase-progress mapping.
- Test: `apps/web/src/components/features/blgu-phases/__tests__/AssessmentProgress.test.tsx`
  - Extend regression coverage so submitted-for-review no longer renders the fallback state.

---

### Task 1: Lock In Current Backend Failure With a Regression Test

**Files:**

- Test: `apps/api/tests/...` locate or add the closest assessment submission workflow test file
- Modify: `apps/api/app/services/assessment_service.py` only after the failing test is verified

- [ ] **Step 1: Identify the best existing backend test location**

Run:

```bash
rg -n "submit_assessment|REOPENED_BY_MLGOO|SUBMITTED_FOR_REVIEW|area_submission_status" apps/api/tests
```

Expected: one existing submission/workflow test module is close enough to extend; otherwise create a
focused new test file under `apps/api/tests/services/`.

- [ ] **Step 2: Write the failing backend regression test**

Test should set up:

- an assessment with `status = REOPENED_BY_MLGOO`
- `reopen_from_status = SUBMITTED_FOR_REVIEW`
- `area_submission_status = {"1": {"status": "draft"}, ..., "6": {"status": "draft"}}`
- completed responses sufficient for submission validation

Assertions after `submit_assessment(...)`:

- overall status becomes `SUBMITTED_FOR_REVIEW`
- all six area statuses are no longer `draft`
- the new area statuses match the intended post-resubmit state for assessor review

- [ ] **Step 3: Run the backend test and verify it fails for the right reason**

Run:

```bash
cd apps/api && uv run pytest path/to/test_file.py -k reopen -v
```

Expected: FAIL because overall status restores but `area_submission_status` stays `draft`.

- [ ] **Step 4: Commit the failing test**

```bash
git add path/to/test_file.py
git commit -m "test(api): cover mlgoo reopen resubmission state"
```

---

### Task 2: Fix MLGOO Reopen Resubmission State in the Backend

**Files:**

- Modify: `apps/api/app/services/assessment_service.py`
- Possibly modify: `apps/api/app/api/v1/assessments.py` only if the route layer duplicates the old
  behavior
- Test: same backend test file from Task 1

- [ ] **Step 1: Implement the minimal backend fix**

In `submit_assessment(...)`:

- keep `assessment.status = get_reopened_submission_target_status(assessment)` for MLGOO reopen
  resubmissions
- add explicit `area_submission_status` updates for the MLGOO reopen path
- move all governance areas out of `draft`
- set the per-area state to the correct submitted/review-ready value for the restored workflow stage
- preserve only metadata that should survive resubmission

Keep the change narrow:

- do not alter unrelated rework or calibration logic
- do not reset `response.is_completed`

- [ ] **Step 2: Run the backend regression test**

Run:

```bash
cd apps/api && uv run pytest path/to/test_file.py -k reopen -v
```

Expected: PASS

- [ ] **Step 3: Run any nearby submission workflow tests**

Run:

```bash
cd apps/api && uv run pytest path/to/test_file.py -v
```

Expected: PASS with no regressions in neighboring submission/resubmission cases.

- [ ] **Step 4: Commit the backend fix**

```bash
git add apps/api/app/services/assessment_service.py path/to/test_file.py
git commit -m "fix(api): align reopened resubmission area states"
```

---

### Task 3: Lock In the Dashboard Progress Failure With a Frontend Regression

**Files:**

- Modify: `apps/web/src/components/features/blgu-phases/__tests__/AssessmentProgress.test.tsx`
- Modify later: `apps/web/src/components/features/blgu-phases/AssessmentProgress.tsx`

- [ ] **Step 1: Extend the existing progress-component test**

Add a case asserting:

- `currentStatus="SUBMITTED_FOR_REVIEW"`
- a nonzero `completionPercentage`
- rendered output is review-phase progress, not `0% / Starting`

Target behavior:

- no fallback label `Starting`
- no fallback `0%`
- a submitted/review band percentage such as the same mapping used for `SUBMITTED`

- [ ] **Step 2: Run the frontend test and verify it fails**

Run:

```bash
pnpm --filter web exec vitest run 'src/components/features/blgu-phases/__tests__/AssessmentProgress.test.tsx' --reporter=verbose
```

Expected: FAIL because `SUBMITTED_FOR_REVIEW` currently hits the fallback branch.

- [ ] **Step 3: Commit the failing frontend test**

```bash
git add apps/web/src/components/features/blgu-phases/__tests__/AssessmentProgress.test.tsx
git commit -m "test(web): cover submitted-for-review progress mapping"
```

---

### Task 4: Fix the Dashboard Progress Mapping

**Files:**

- Modify: `apps/web/src/components/features/blgu-phases/AssessmentProgress.tsx`
- Test: `apps/web/src/components/features/blgu-phases/__tests__/AssessmentProgress.test.tsx`

- [ ] **Step 1: Implement the minimal UI fix**

Update `calculateProgress(...)` so `SUBMITTED_FOR_REVIEW` maps to the correct review-phase bucket.

Recommendation:

- treat `SUBMITTED_FOR_REVIEW` the same as `SUBMITTED`
- keep the rest of the phase mapping unchanged

- [ ] **Step 2: Run the targeted frontend regression**

Run:

```bash
pnpm --filter web exec vitest run 'src/components/features/blgu-phases/__tests__/AssessmentProgress.test.tsx' --reporter=verbose
```

Expected: PASS

- [ ] **Step 3: Optionally run the nearby BLGU dashboard page test if it touches this component
      path**

Run:

```bash
pnpm --filter web exec vitest run 'src/app/(app)/blgu/assessments/__tests__/page.test.tsx' --reporter=verbose
```

Expected: PASS or no relevant regression.

- [ ] **Step 4: Commit the frontend fix**

```bash
git add apps/web/src/components/features/blgu-phases/AssessmentProgress.tsx apps/web/src/components/features/blgu-phases/__tests__/AssessmentProgress.test.tsx
git commit -m "fix(web): map submitted-for-review progress"
```

---

### Task 5: Verify End-to-End State Consistency

**Files:**

- No new files required unless gaps are discovered

- [ ] **Step 1: Reproduce the exact workflow locally**

Flow:

1. Start from an assessment previously submitted for review
2. Reopen it via MLGOO
3. Confirm per-area statuses reset to `draft`
4. Resubmit as BLGU
5. Inspect the dashboard payload and UI

- [ ] **Step 2: Verify the backend payload**

Run:

```bash
curl -s 'http://localhost:8000/api/v1/blgu-dashboard/<assessment_id>?language=ceb' -H 'Authorization: Bearer <blgu_token>'
```

Expected:

- `status` is `SUBMITTED_FOR_REVIEW`
- `completion_percentage` remains correct
- `completed_indicators` matches the completed responses
- `area_assessor_status` / related area state no longer implies all areas are `draft`

- [ ] **Step 3: Verify the BLGU UI**

Expected on `/blgu/dashboard`:

- the progress card does not show `0% / Starting`
- the card reflects the review-phase mapping for `SUBMITTED_FOR_REVIEW`
- area state shown to BLGU is consistent with a submitted-for-review assessment

- [ ] **Step 4: Commit verification-only follow-ups if any**

```bash
git add <files>
git commit -m "test: verify reopened resubmission flow"
```

---

## Notes

- Prefer the backend test to define the exact intended per-area status after MLGOO reopen
  resubmission before implementing the production change.
- Do not “repair” database rows in this task unless the code fix proves the workflow currently
  writes the wrong values and a separate migration or admin repair is explicitly requested.
- Keep this scoped to workflow consistency and progress rendering. Do not refactor unrelated
  assessment submission code.
