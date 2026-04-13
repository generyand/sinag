# SNG-28 General Feedback Reset Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task.

**Goal:** Keep the active reviewer `General Feedback` textarea blank after BLGU resubmission while
preserving archived prior feedback in history.

**Architecture:** Filter hydrated validation comments by the current review boundary instead of
deleting stored comments. The reviewer panel will only load same-role comments created during the
active rework or calibration cycle, while old comments remain available in `feedback_comments` for
historical use.

**Tech Stack:** Next.js 16, React 19, Vitest, Testing Library

---

### Task 1: Lock the reviewer hydration bug with failing tests

**Files:**

- Modify:
  `apps/web/src/components/features/assessor/validation/__tests__/RightAssessorPanel.test.tsx`

**Step 1: Write the failing test**

Add tests that render the reviewer panel with:

- assessor role + `rework_requested_at` newer than an older assessor validation comment
- validator role + calibration boundary newer than an older validator validation comment

Assert the `General Feedback` textarea is blank in both cases.

**Step 2: Run test to verify it fails**

Run:
`pnpm exec vitest run src/components/features/assessor/validation/__tests__/RightAssessorPanel.test.tsx`

Expected: FAIL because the panel currently loads the latest same-role comment regardless of cycle.

**Step 3: Write minimal implementation**

Add a helper in the reviewer panel that only hydrates comments newer than the active rework or
calibration boundary.

**Step 4: Run test to verify it passes**

Run:
`pnpm exec vitest run src/components/features/assessor/validation/__tests__/RightAssessorPanel.test.tsx`

Expected: PASS

### Task 2: Protect same-cycle refresh behavior

**Files:**

- Modify:
  `apps/web/src/components/features/assessor/validation/__tests__/AssessorValidationClient.real-panel.test.tsx`

**Step 1: Write the failing test**

Add a refresh scenario where:

- old assessor feedback predates `rework_requested_at`
- a newly autosaved assessor comment is returned after refresh with a newer timestamp

Assert the fresh comment still hydrates after the refresh while the stale one does not.

**Step 2: Run test to verify it fails**

Run:
`pnpm exec vitest run src/components/features/assessor/validation/__tests__/AssessorValidationClient.real-panel.test.tsx`

Expected: FAIL if the hydration logic blanks all comments or still loads the stale one.

**Step 3: Write minimal implementation**

Thread the active review boundary into the reviewer panel and keep same-cycle comments eligible for
hydration.

**Step 4: Run test to verify it passes**

Run:
`pnpm exec vitest run src/components/features/assessor/validation/__tests__/AssessorValidationClient.real-panel.test.tsx`

Expected: PASS

### Task 3: Verify targeted reviewer flows

**Files:**

- Modify: `apps/web/src/components/features/assessor/validation/RightAssessorPanel.tsx`
- Modify: `apps/web/src/components/features/assessor/validation/AssessorValidationClient.tsx`

**Step 1: Run focused verification**

Run:

- `pnpm exec vitest run src/components/features/assessor/validation/__tests__/RightAssessorPanel.test.tsx`
- `pnpm exec vitest run src/components/features/assessor/validation/__tests__/AssessorValidationClient.real-panel.test.tsx`

**Step 2: Run combined verification**

Run:
`pnpm exec vitest run src/components/features/assessor/validation/__tests__/RightAssessorPanel.test.tsx src/components/features/assessor/validation/__tests__/AssessorValidationClient.real-panel.test.tsx`

**Step 3: Commit with ticket naming**

Run:

```bash
git add apps/web/src/components/features/assessor/validation/RightAssessorPanel.tsx \
  apps/web/src/components/features/assessor/validation/AssessorValidationClient.tsx \
  apps/web/src/components/features/assessor/validation/__tests__/RightAssessorPanel.test.tsx \
  apps/web/src/components/features/assessor/validation/__tests__/AssessorValidationClient.real-panel.test.tsx \
  docs/plans/2026-04-13-sng-28-general-feedback-reset-design.md \
  docs/plans/2026-04-13-sng-28-general-feedback-reset.md
git commit -m "fix(sng-28): auto-clear general feedback on resubmission"
git push origin testing
```
