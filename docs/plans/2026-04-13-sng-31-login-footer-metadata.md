# SNG-31 Login Footer Metadata and Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task.

**Goal:** Refresh the login footer metadata and replace the support contact with the Sulop DILG
email.

**Architecture:** Keep the change local to the login page footer because the values are hardcoded
there. Preserve the current footer structure and styling while replacing only the content.

**Tech Stack:** Next.js 16, React 19, ESLint

---

### Task 1: Update login footer metadata and support contact

**Files:**

- Modify: `apps/web/src/app/(auth)/login/page.tsx`

**Step 1: Write the failing check**

Confirm the current footer still contains:

- `Support: (02) 1234-5678 | support.sinag@mlgrc.gov.ph`
- `Version 1.0.0 | Build 2024.01.15`

**Step 2: Run check to verify current state**

Run:
`rg -n "1234-5678|support.sinag@mlgrc.gov.ph|Version 1.0.0 | Build 2024.01.15" "apps/web/src/app/(auth)/login/page.tsx"`

Expected: matches found

**Step 3: Write minimal implementation**

Update the footer to:

- `© 2026 MLGRC Davao del Sur`
- `Support: sulop.mlgoo@dilg.gov.ph`
- `Version 1.1.0 | Build 2026.04.13`

**Step 4: Run verification**

Run: `pnpm exec eslint --config eslint.config.mjs "src/app/(auth)/login/page.tsx"`

Expected: PASS

**Step 5: Commit**

Run:

```bash
git add "apps/web/src/app/(auth)/login/page.tsx" \
  docs/plans/2026-04-13-sng-31-login-footer-metadata-design.md \
  docs/plans/2026-04-13-sng-31-login-footer-metadata.md
git commit -m "fix(sng-31): update login footer metadata and support contact"
```
