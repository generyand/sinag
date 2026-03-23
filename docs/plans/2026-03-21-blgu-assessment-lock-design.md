# BLGU Assessment Lock Design

## Summary

Replace deadline-driven auto-submission with explicit BLGU write-access locking.

When a due date expires, the system must not advance workflow state. It must only lock the
assessment for BLGU editing and submission actions. MLGOO can unlock the entire assessment and set
an immediate grace period expiry. When that grace period expires, the assessment locks again without
changing workflow status or consuming rework, calibration, or recalibration opportunities.

## Scope

This design covers:

- assessment data model changes for explicit BLGU lock metadata
- deadline/background job changes
- MLGOO unlock and manual relock flows
- backend enforcement for BLGU write paths
- BLGU and MLGOO frontend changes
- regression test coverage

This design does not include:

- UI audit trail for lock and unlock history
- workflow-status redesign
- rework, calibration, or recalibration limit changes

## Current State

The current codebase already has partial deadline-lock concepts:

- [assessment.py](/home/asnari/Project/sinag/.worktrees/testing-publish/apps/api/app/db/models/assessment.py)
  includes `grace_period_expires_at`, `is_locked_for_deadline`, `locked_at`, and
  `auto_submitted_at`.
- [deadline_worker.py](/home/asnari/Project/sinag/.worktrees/testing-publish/apps/api/app/workers/deadline_worker.py)
  still force-transitions overdue `DRAFT` assessments to `SUBMITTED` and sets `auto_submitted_at`.
- [mlgoo_service.py](/home/asnari/Project/sinag/.worktrees/testing-publish/apps/api/app/services/mlgoo_service.py)
  already exposes a coarse unlock action that only extends by N days.
- BLGU write-path enforcement is incomplete and inconsistent across assessment answers, MOV files,
  area submission, assessment submission, and calibration/resubmission endpoints.

The result is a mixed model where "workflow status" and "BLGU edit access" are still entangled.

## Design Principles

1. Deadline expiry must only affect BLGU editability, never workflow progression.
2. Workflow statuses remain authoritative for review state.
3. Explicit lock metadata becomes the source of truth for BLGU write access.
4. Backend enforcement is mandatory. Frontend disabling is only a reflection of backend state.
5. Locking and unlocking must be idempotent.

## Recommended Architecture

### Source of Truth

Keep the current workflow status model and add explicit BLGU lock metadata on the assessment.

The assessment is writable by BLGU only when both conditions are true:

1. the workflow status is BLGU-editable for the current flow
2. the explicit BLGU lock state is not active

This preserves current review semantics while separating deadline-based access control from review
progress.

### Assessment Data Model

Add the following fields to `Assessment`:

- `is_locked_for_blgu: bool`
- `lock_reason: str | None`
- `locked_at: datetime | None`
- `grace_period_expires_at: datetime | None`
- `grace_period_set_by: int | None`
- `unlocked_at: datetime | None`
- `unlocked_by: int | None`

Recommended `lock_reason` values:

- `deadline_expired`
- `grace_period_expired`
- `mlgoo_manual_lock`

The current `is_locked_for_deadline` and `auto_submitted_at` fields should be treated as legacy
compatibility fields during migration, then removed from logic. The implementation should stop
reading `auto_submitted_at` for BLGU lock decisions immediately.

### Assessment Year Settings

Add the following field to `AssessmentYear`:

- `default_unlock_grace_period_days: int = 3`

This lives beside other deadline window settings and is only used to prefill MLGOO unlock behavior.
MLGOO may override it per unlock action without changing the default setting.

## Lock Semantics

### Due Date Expiry

When the active assessment year's `phase1_deadline` passes for a `DRAFT` assessment:

- do not change workflow status
- do not set `submitted_at`
- do not set per-area statuses to submitted
- set `is_locked_for_blgu = true`
- set `lock_reason = "deadline_expired"`
- set `locked_at = now`
- clear any expired grace metadata that should no longer be active

### MLGOO Unlock

When MLGOO unlocks an assessment:

- leave workflow status unchanged
- set `is_locked_for_blgu = false`
- set `lock_reason = null`
- set `unlocked_at = now`
- set `unlocked_by = mlgoo_user.id`
- set `grace_period_expires_at` to the chosen expiry
- set `grace_period_set_by = mlgoo_user.id`

Unlock request behavior:

- if caller provides custom expiry, use it
- otherwise compute `now + default_unlock_grace_period_days`
- if assessment is already unlocked, return current state without mutating workflow or counters

### MLGOO Manual Lock

When MLGOO manually relocks an assessment:

- leave workflow status unchanged
- set `is_locked_for_blgu = true`
- set `lock_reason = "mlgoo_manual_lock"`
- set `locked_at = now`
- keep existing `grace_period_expires_at` for history/reference if useful, but it must no longer
  imply writability

If the assessment is already locked, return current state idempotently.

### Grace Period Expiry

When a grace period expires:

- leave workflow status unchanged
- set `is_locked_for_blgu = true`
- set `lock_reason = "grace_period_expired"`
- set `locked_at = now`

Repeated worker runs must not double-mutate or consume counters.

## Backend Enforcement

### Central Guard

Introduce a shared backend helper that validates BLGU write access for an assessment. This guard
should be called by all BLGU write endpoints and any service methods invoked by them.

The guard should:

- verify ownership when appropriate
- reject writes when `assessment.is_locked_for_blgu` is true
- continue to respect existing review-state locks
- return a consistent error payload with lock metadata for frontend rendering

### Write Paths to Enforce

The guard must cover all BLGU write paths, including:

- answer save/update/create in
  [assessments.py](/home/asnari/Project/sinag/.worktrees/testing-publish/apps/api/app/api/v1/assessments.py)
- MOV upload/delete/rotate in
  [assessments.py](/home/asnari/Project/sinag/.worktrees/testing-publish/apps/api/app/api/v1/assessments.py),
  [movs.py](/home/asnari/Project/sinag/.worktrees/testing-publish/apps/api/app/api/v1/movs.py), and
  [storage_service.py](/home/asnari/Project/sinag/.worktrees/testing-publish/apps/api/app/services/storage_service.py)
- area submit/resubmit in
  [area_submission_service.py](/home/asnari/Project/sinag/.worktrees/testing-publish/apps/api/app/services/area_submission_service.py)
- assessment submit/resubmit/calibration submit/recalibration resubmit in
  [assessments.py](/home/asnari/Project/sinag/.worktrees/testing-publish/apps/api/app/api/v1/assessments.py)
- autosave and save-draft flows surfaced through current BLGU pages

### Error Contract

Preferred response shape:

- HTTP status `423 Locked` if practical across clients
- fallback to `400` with structured lock metadata if shared client behavior makes `423` risky

Response payload should include:

- `detail`
- `is_locked_for_blgu`
- `lock_reason`
- `grace_period_expires_at`

## Background Job Changes

### Deadline Worker

Replace the current auto-submit behavior in
[deadline_worker.py](/home/asnari/Project/sinag/.worktrees/testing-publish/apps/api/app/workers/deadline_worker.py)
with two lock-oriented passes:

1. lock overdue eligible assessments after `phase1_deadline`
2. relock expired grace-period assessments

The worker must never:

- set status to `SUBMITTED`
- set `submitted_at`
- set `auto_submitted_at`
- synthesize area submissions

### Admin Manual Trigger

The admin endpoint currently named `trigger-auto-submit` should be converted to deadline lock
processing. The route name may remain temporarily for compatibility, but its semantics and response
must reflect locking rather than submission.

## MLGOO API Changes

### Unlock Endpoint

Replace the current `extend_grace_period_days`-only request with a request that supports either:

- default grace days from the active `AssessmentYear`
- explicit expiry override

Recommended request shape:

- `use_default_grace_period: bool = true`
- `custom_expires_at: datetime | None`

or the equivalent minimal shape if keeping the API simpler.

### Manual Lock Endpoint

Add an MLGOO endpoint to immediately relock the assessment.

Recommended response payload for both lock and unlock:

- `assessment_id`
- `status`
- `is_locked_for_blgu`
- `lock_reason`
- `locked_at`
- `grace_period_expires_at`
- `unlocked_at`

## Frontend Behavior

### BLGU Experience

BLGU users must still see the assessment, but all writes must become unavailable.

Frontend changes:

- replace "auto-submitted" messaging in
  [DeadlineBanner.tsx](/home/asnari/Project/sinag/.worktrees/testing-publish/apps/web/src/components/features/blgu-phases/DeadlineBanner.tsx)
  with lock messaging
- update lock banners in
  [AssessmentLockedBanner.tsx](/home/asnari/Project/sinag/.worktrees/testing-publish/apps/web/src/components/features/assessments/AssessmentLockedBanner.tsx)
  and
  [LockedStateBanner.tsx](/home/asnari/Project/sinag/.worktrees/testing-publish/apps/web/src/components/features/assessments/LockedStateBanner.tsx)
  to support explicit lock reasons
- drive `isLocked` on BLGU pages from backend lock metadata, not only from workflow status
- disable autosave, answer edits, MOV writes, and submit/resubmit actions while locked
- display grace expiry timing when temporarily reopened

### MLGOO Experience

MLGOO assessment pages need:

- unlock action with prefilled default grace period
- ability to override the expiry
- manual relock action
- current lock state display

No lock/unlock audit trail UI is included in this version.

## Notification Changes

Add notification events for:

- BLGU locked because due date expired
- BLGU unlocked by MLGOO with grace expiry
- BLGU relocked because grace period expired
- BLGU manually relocked by MLGOO

Existing `AUTO_SUBMITTED` usage should be removed from the deadline path.

## Testing Strategy

### Backend

- worker tests for due-date lock behavior
- worker tests for grace-expiry relock behavior
- idempotency tests for repeated worker runs
- MLGOO service/API tests for unlock with default
- MLGOO service/API tests for unlock with override
- MLGOO service/API tests for manual relock
- regression tests covering every BLGU write path while locked
- regression tests confirming counters and workflow statuses stay unchanged

### Frontend

- deadline banner copy and behavior no longer reference auto-submit
- BLGU lock banner shows explicit reason and grace expiry
- BLGU actions are disabled or hidden while locked
- MLGOO unlock form prefills default grace period and allows override

## Risks

- current lock logic is duplicated across endpoints and services, so partial adoption would leave
  bypasses
- generated API types will need regeneration after schema changes
- legacy `auto_submitted_at` assumptions exist in assessor and BLGU UI and must be removed

## Recommended Delivery Order

1. schema and model changes
2. shared backend lock guard
3. deadline worker and admin trigger conversion
4. MLGOO lock/unlock endpoints
5. BLGU frontend lock-state integration
6. MLGOO frontend controls
7. notification cleanup and regression verification
