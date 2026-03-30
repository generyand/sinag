# Legacy Assessment Snapshot Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make legacy submitted assessments render the correct historical indicator set by
backfilling `assessment_indicator_snapshots` and removing the unsafe response-row fallback as a
long-term source of truth.

**Architecture:** The system already has `assessment_indicator_snapshots` as the intended historical
source of truth. The bug exists because some older assessments do not have snapshots, and the
current fallback guesses the indicator set from `assessment_responses`, which is not reliable when
rows are missing or absent. The fix is to backfill snapshots for legacy submitted assessments from
the correct year-based indicator set, switch BLGU rendering to trust snapshots, and limit or remove
the response-row fallback after the backfill path exists.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic-backed schema already present, pytest, preview-first
Python repair scripts

---

## File Map

- Modify: `apps/api/app/services/assessment_service.py`
  - Stop treating `assessment_responses` as the primary historical indicator source for legacy
    submitted assessments once backfill support exists.
- Modify: `apps/api/app/services/year_config_service.py`
  - Reuse or extend `indicator_snapshot_service.create_snapshot_for_assessment(...)` for
    backfill-safe snapshot creation.
- Create: `apps/api/scripts/backfill_assessment_indicator_snapshots.py`
  - Preview-first repair script to backfill snapshots for target legacy assessments or batches.
- Create: `apps/api/tests/scripts/test_backfill_assessment_indicator_snapshots.py`
  - Script-level coverage for preview/apply behavior and selection logic.
- Modify: `apps/api/tests/services/test_assessment_service.py`
  - Replace the unsafe response-row fallback expectations with snapshot/backfill-oriented behavior
    tests.
- Optional create: `apps/api/tests/services/test_year_config_service.py`
  - Add focused snapshot backfill service tests if helper extraction makes this cleaner.

## Scope Constraints

- Do not infer the “correct” old indicator set from `assessment_responses` alone.
- Do not silently keep the current legacy fallback as the final solution.
- Prefer preview-first repair tooling for existing production data.
- Keep this plan separate from the MLGOO reopen/resubmit bugfix; they only share files, not root
  cause.

## Task 1: Lock In The Failure Modes With Tests

**Files:**

- Modify: `apps/api/tests/services/test_assessment_service.py`
- Read: `apps/api/app/services/assessment_service.py`
- Read: `apps/api/app/services/year_config_service.py`

- [ ] **Step 1: Write a failing service test for a legacy submitted assessment missing some response
      rows**

Add a test that models:

- a submitted assessment with no snapshots
- the intended active indicator set includes multiple leaf indicators
- only some of those indicators have `assessment_responses`

Assert the current response-row fallback is insufficient and that the eventual behavior must come
from snapshots/backfill, not missing-row inference.

- [ ] **Step 2: Write a failing service test for a legacy submitted assessment with zero response
      rows**

Assert that rendering should not fall back to “all live indicators” just because there are zero
responses.

- [ ] **Step 3: Run the targeted failing tests**

Run:

```bash
cd apps/api && uv run pytest tests/services/test_assessment_service.py -k "legacy_indicator_set or snapshot_backfill" -v
```

Expected:

- FAIL for the current legacy fallback behavior

## Task 2: Add A Backfill-Safe Snapshot Source Of Truth

**Files:**

- Modify: `apps/api/app/services/year_config_service.py`
- Optional create: `apps/api/tests/services/test_year_config_service.py`

- [ ] **Step 1: Extract or add a helper that computes the intended indicator IDs for an assessment
      year**

Use the same year-based filtering rules already used for active indicators:

```python
(Indicator.effective_from_year.is_(None)) | (Indicator.effective_from_year <= assessment_year)
(Indicator.effective_to_year.is_(None)) | (Indicator.effective_to_year >= assessment_year)
```

Only include actual assessment indicators, not arbitrary later additions from other years.

- [ ] **Step 2: Add an idempotent snapshot backfill helper**

Create a helper that:

- takes an `assessment`
- checks whether snapshots already exist
- if not, computes the intended indicator IDs for `assessment.assessment_year`
- calls `indicator_snapshot_service.create_snapshot_for_assessment(...)`

The helper should be safe to run repeatedly:

- if snapshots exist, no-op
- if snapshots do not exist, create them once

- [ ] **Step 3: Write targeted tests for idempotence and selection**

Run:

```bash
cd apps/api && uv run pytest tests/services/test_year_config_service.py -k "snapshot_backfill" -v
```

Expected:

- PASS once helper is implemented

## Task 3: Add A Preview-First Legacy Snapshot Backfill Script

**Files:**

- Create: `apps/api/scripts/backfill_assessment_indicator_snapshots.py`
- Create: `apps/api/tests/scripts/test_backfill_assessment_indicator_snapshots.py`
- Read: `apps/api/scripts/fix_reopened_assessment_area_status.py`

- [ ] **Step 1: Follow the existing preview-first repair script pattern**

The script should support:

- preview mode by default
- `--apply` to persist
- `--assessment-id` for one record
- optional batch mode for submitted/reopened assessments without snapshots

- [ ] **Step 2: Backfill snapshots from the intended year-based indicator set**

The script should:

- load target assessments
- skip assessments that already have snapshots
- compute indicator IDs from the year-based source of truth
- create snapshots
- print what would be created in preview mode

- [ ] **Step 3: Add script tests**

Cover:

- preview-only behavior
- apply behavior
- no-op when snapshots already exist

- [ ] **Step 4: Run the script test suite**

Run:

```bash
cd apps/api && uv run pytest tests/scripts/test_backfill_assessment_indicator_snapshots.py -v
```

Expected:

- PASS

## Task 4: Switch BLGU Rendering To Trust Snapshots

**Files:**

- Modify: `apps/api/app/services/assessment_service.py`
- Modify: `apps/api/tests/services/test_assessment_service.py`

- [ ] **Step 1: Remove or heavily narrow `_select_legacy_indicator_set(...)`**

Once snapshot backfill exists, BLGU rendering should prefer:

1. snapshots if present
2. backfill snapshots before rendering for submitted/reopened legacy assessments without snapshots

Do not keep `assessment_responses` as the final historical source of truth for submitted
assessments.

- [ ] **Step 2: Ensure draft assessments still use the live active schema**

This change should not alter draft-assessment rendering rules.

- [ ] **Step 3: Update the tests to reflect the intended post-backfill behavior**

Replace the current happy-path-only fallback assertion with behavior like:

- submitted assessment without snapshots triggers snapshot-backed rendering
- missing response rows do not hide required indicators
- zero responses do not expand to all live indicators

- [ ] **Step 4: Run targeted service tests**

Run:

```bash
cd apps/api && uv run pytest tests/services/test_assessment_service.py -k "legacy_indicator_set or snapshot_backfill or mlgoo_reopen_resubmission" -v
```

Expected:

- PASS

## Task 5: Verify With Known Legacy Records

**Files:**

- Read-only verification against local DB / script output

- [ ] **Step 1: Preview Tagolilong**

Use the script in preview mode for the known problematic assessment and verify:

- snapshots do not exist yet, or are incomplete
- the backfill computes the expected 2025 indicator set including `4.1.1`

- [ ] **Step 2: Apply to a controlled target**

Run the script with `--apply` on a known local/dev assessment only after preview output is correct.

- [ ] **Step 3: Verify the BLGU payload**

Check that the assessment payload now:

- includes the expected historical indicators
- does not depend on response-row completeness

## Task 6: Closeout

**Files:**

- Modify if needed: `docs/superpowers/plans/2026-03-29-legacy-assessment-snapshot-backfill.md`

- [ ] **Step 1: Summarize the old failure mode**

Record:

- response-row fallback could hide required indicators
- zero-response legacy assessments could show all current live indicators
- snapshots are the intended historical source of truth

- [ ] **Step 2: Commit in focused slices**

Suggested commits:

```bash
git add apps/api/tests/services/test_assessment_service.py apps/api/app/services/year_config_service.py
git commit -m "feat(api): add legacy assessment snapshot backfill helper"
```

```bash
git add apps/api/scripts/backfill_assessment_indicator_snapshots.py apps/api/tests/scripts/test_backfill_assessment_indicator_snapshots.py apps/api/app/services/assessment_service.py
git commit -m "fix(api): backfill and use legacy assessment snapshots"
```

- [ ] **Step 3: Call out operational follow-up**

Document:

- whether a one-time backfill must run in staging/prod
- whether any assessments need manual verification after the backfill
