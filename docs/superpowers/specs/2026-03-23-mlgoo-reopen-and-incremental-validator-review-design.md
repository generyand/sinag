# MLGOO Reopen And Incremental Validator Review Design

## Summary

This design fixes two workflow problems that surfaced in the Osmeña incident:

- MLGOO needs a way to reopen prematurely submitted BLGU assessments without abusing the deadline
  unlock feature.
- Validator calibration resubmission must preserve prior review history and only reopen the
  calibrated indicators instead of making the entire validator pass feel reset.

The design separates three concepts that are currently conflated:

- deadline lock state
- workflow state
- validator review history

`unlock` remains a deadline-lock control only. A new MLGOO reopen workflow handles accidental or
premature submission. Calibration resubmission becomes incremental and history-preserving.

## Problem

The Osmeña case showed that the current system allows an operator to reach for the wrong tool.
`unlock` is meant for due-date lock control, but the actual issue was a workflow recovery problem.
At the same time, the validator experience after calibration resubmission is inconsistent:

- the queue can say `Continue Validation`
- the detail page can look almost blank
- validator comments and annotations may be lost

This creates confusion, repeated review work, and weak auditability.

## Goals

- Keep deadline lock behavior and workflow recovery behavior separate.
- Allow MLGOO to reopen eligible BLGU submissions so BLGU can continue editing.
- Preserve validator comments, annotations, and checklist history across calibration cycles.
- Reset only the calibrated indicators for a new active validator pass.
- Make validator queue progress and validator detail page use the same definition of meaningful
  progress.
- Record clear activity history for reopen and calibration resubmission events.

## Non-Goals

- Redesigning the full assessment workflow.
- Introducing a general-purpose state machine for every per-indicator review action.
- Changing rework, calibration, or recalibration limits.
- Replacing the existing deadline lock feature.

## Required Behavior

### 1. Deadline Unlock Remains Narrow

`unlock` remains a deadline-lock action only.

When MLGOO uses `unlock`:

- it affects BLGU edit access only
- it must not repair accidental submission workflow mistakes
- it must not be used as a substitute for reopening a submission

### 2. MLGOO Reopen Workflow

MLGOO can reopen a BLGU submission only from these workflow states:

- `SUBMITTED_FOR_REVIEW`
- `IN_REVIEW`
- `AWAITING_FINAL_VALIDATION`
- `AWAITING_MLGOO_APPROVAL`

When reopened:

- the assessment becomes editable by BLGU again
- the BLGU-facing status is `Reopened by MLGOO`
- MLGOO must provide a reason
- the reopen action is recorded as an explicit activity such as `reopened_by_mlgoo`
- validator rework counters must not be incremented merely because MLGOO reopened the submission
- indicator-level `requires_rework` flags must not be created unless the reopen is tied to actual
  indicator-specific issues

### 3. Calibration Resubmission Is Incremental

When BLGU resubmits after validator calibration:

- the assessment returns to validator review
- only the calibrated indicators become active for re-review
- non-calibrated indicators keep their completed validator state
- non-calibrated indicators keep their prior comments and annotations

The validator should be able to continue where they left off, while still seeing which calibrated
indicators need a new pass.

### 4. Validator History Is Preserved

For calibrated indicators, previous-cycle validator artifacts must be preserved as history:

- validation checklist inputs
- validation decisions
- feedback comments
- MOV annotations

The current active cycle can add new review data without overwriting or deleting prior-cycle data.

History should be visible as previous-cycle context rather than mixed indistinguishably with the
current active cycle.

### 5. Queue And Detail View Must Agree

The validator submissions list and validator detail page must use the same definition of "meaningful
progress."

False-only or placeholder checklist values must not make an indicator look reviewed or resumable.

If the validator has no meaningful active-cycle progress on an assessment, the queue must not label
it as `Continue Validation`.

## Recommended Data Model Direction

### Workflow Status

Introduce a distinct workflow status for MLGOO reopen:

- `REOPENED_BY_MLGOO`

This status is preferable to silently overloading `REWORK` because the BLGU explicitly needs to see
that the submission was reopened by MLGOO, not returned through the ordinary assessor or validator
rework path.

### Reopen Metadata

Add explicit reopen metadata on the assessment:

- `reopened_by`
- `reopened_at`
- `reopen_reason`
- `reopen_from_status`

These fields support audit history, UI explanation, and operator debugging.

### Validator History

Preserve current-cycle and prior-cycle validator data separately.

Recommended direction:

- add a cycle marker or review version to validator comments and annotations
- preserve prior `response_data` validator-owned fields into a historical structure before opening a
  new active cycle for a calibrated indicator
- keep active-cycle validator fields small and explicit

The exact storage shape can be decided during implementation, but the requirement is fixed: preserve
prior-cycle validator artifacts without deleting them.

## UI Direction

### BLGU

- Show `Reopened by MLGOO` as the status badge.
- Show MLGOO's reason prominently in the assessment detail view.
- Allow the same editing capabilities that BLGU already has in editable states.

### Validator

- Show accurate progress based on meaningful current-cycle validator state.
- Show prior-cycle comments, annotations, and checklist data as historical context.
- Clearly identify calibrated indicators that require a fresh pass.

### MLGOO

- Keep `Unlock` in the lock-management surface.
- Add a separate `Reopen Submission` action in workflow-management surfaces.
- Require a reason when reopening.

## Notifications

Expected notifications:

- BLGU receives a reopen notification with MLGOO reason.
- Reviewers who were previously involved can optionally be notified that the submission has been
  reopened.
- Calibration resubmission notifications should remain, but they must no longer imply that the
  entire validator review state was wiped.

## Acceptance Criteria

### Scenario 1: MLGOO Reopens Premature Submission

Given an assessment is in `AWAITING_FINAL_VALIDATION` When MLGOO reopens it with reason
`Accidental submission before completion` Then the assessment moves to `REOPENED_BY_MLGOO` And BLGU
can edit it again And BLGU sees `Reopened by MLGOO` And the reason is visible in history and details
And no deadline unlock fields are changed

### Scenario 2: Validator Calibration Resubmission Preserves History

Given a validator has already reviewed multiple indicators and requested calibration on a subset
When BLGU resubmits calibrated indicators Then only those calibrated indicators re-enter active
validator review And non-calibrated indicators retain prior validator completion state And prior
validator comments, annotations, and checklist inputs remain available as history

### Scenario 3: Queue And Detail Page Stay Consistent

Given an assessment only contains false-only or empty leftover validator draft keys When the
validator queue computes progress Then those indicators do not count as meaningful reviewed progress
And the queue does not show misleading `Continue Validation` behavior
