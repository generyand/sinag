# SNG-33 File Visibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task.

**Goal:** Keep all relevant uploaded files visible inline across reviewer and BLGU screens, removing
file-history toggles that hide current evidence.

**Architecture:** Preserve existing file grouping logic and only change presentation. Reviewer
sections still distinguish current, previous, and validator-origin files, while the BLGU file field
still distinguishes normal uploads, validator uploads, and rework/reference sections.

**Tech Stack:** Next.js 16, React 19, Vitest, Testing Library

---

### Task 1: Lock the new reviewer behavior with tests

**Files:**

- Modify:
  `apps/web/src/components/features/assessor/validation/__tests__/MiddleMovFilesPanel.grouping.test.tsx`

**Step 1: Write the failing test**

Add a test that renders a rework/calibration case with multiple accepted old files and asserts:

- both files are visible inside `Existing File`
- `View existing file history` is absent

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- MiddleMovFilesPanel.grouping.test.tsx`

Expected: FAIL because only one file is visible and the history button still exists.

**Step 3: Write minimal implementation**

Remove collapsing behavior from the reviewer file section component so every file in a section
renders inline.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- MiddleMovFilesPanel.grouping.test.tsx`

Expected: PASS

### Task 2: Lock the new BLGU file-field behavior with tests

**Files:**

- Modify: `apps/web/src/components/features/forms/fields/__tests__/FileFieldComponent.test.tsx`

**Step 1: Write the failing test**

Replace the file-history expectation with assertions that:

- all uploaded files render immediately
- `View file history` is absent

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- FileFieldComponent.test.tsx`

Expected: FAIL because only the latest file is shown and the history toggle is still rendered.

**Step 3: Write minimal implementation**

Render all current uploads and validator uploads inline and update labels/helper copy so they no
longer describe hidden history.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- FileFieldComponent.test.tsx`

Expected: PASS

### Task 3: Verify the combined change

**Files:**

- Modify: `apps/web/src/components/features/assessor/validation/MiddleMovFilesPanel.tsx`
- Modify: `apps/web/src/components/features/forms/fields/FileFieldComponent.tsx`

**Step 1: Run targeted verification**

Run:

- `pnpm --filter web test -- MiddleMovFilesPanel.grouping.test.tsx`
- `pnpm --filter web test -- FileFieldComponent.test.tsx`

**Step 2: Inspect final diff**

Run:
`git diff -- apps/web/src/components/features/assessor/validation/MiddleMovFilesPanel.tsx apps/web/src/components/features/forms/fields/FileFieldComponent.tsx`

**Step 3: Confirm no stale history copy remains**

Check for remaining labels such as `View existing file history` or `View file history` in the
modified surfaces.
