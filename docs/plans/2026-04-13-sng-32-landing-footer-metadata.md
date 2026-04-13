# SNG-32 Landing Footer Metadata Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task.

**Goal:** Update the landing page footer year and version text for the 2026 deployment.

**Architecture:** Keep the change local to the landing footer component because the displayed values
are hardcoded there already. No other layout or interactive elements should change.

**Tech Stack:** Next.js 16, React 19, ESLint

---

### Task 1: Update landing footer metadata

**Files:**

- Modify: `apps/web/src/components/features/landing-page/footer/Footer.tsx`

**Step 1: Write the failing check**

Confirm the current footer still contains the old strings:

- `© 2025 Municipality of Sulop`
- `Version 1.0`

**Step 2: Run check to verify current state**

Run:
`rg -n "© 2025 Municipality of Sulop|Version 1.0" apps/web/src/components/features/landing-page/footer/Footer.tsx`

Expected: matches found

**Step 3: Write minimal implementation**

Update the hardcoded footer text to:

- `© 2026 Municipality of Sulop`
- `Version 1.1`

**Step 4: Run verification**

Run:
`pnpm exec eslint --config eslint.config.mjs src/components/features/landing-page/footer/Footer.tsx`

Expected: PASS

**Step 5: Commit**

Run:

```bash
git add apps/web/src/components/features/landing-page/footer/Footer.tsx \
  docs/plans/2026-04-13-sng-32-landing-footer-metadata-design.md \
  docs/plans/2026-04-13-sng-32-landing-footer-metadata.md
git commit -m "fix(sng-32): update landing page footer metadata"
```
