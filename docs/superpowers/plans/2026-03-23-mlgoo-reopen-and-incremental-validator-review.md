# MLGOO Reopen And Incremental Validator Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit MLGOO reopen workflow for premature BLGU submissions and make validator
calibration resubmission preserve history while only reopening calibrated indicators.

**Architecture:** Keep deadline lock logic and workflow recovery logic separate. Introduce a new
workflow status and MLGOO reopen service path for BLGU submissions, then tighten validator
progress/state handling so queue progress, detail-state hydration, and calibration resubmission all
operate on the same meaningful active-cycle review rules while preserving prior-cycle history.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, pytest, Next.js, React Query, shared
generated API types

---

### Task 1: Add The New Workflow Status And Reopen Metadata

**Files:**

- Modify: `apps/api/app/db/models/assessment.py`
- Modify: `apps/api/app/schemas/assessment.py`
- Modify: `packages/shared/src/generated/*` via `pnpm generate-types`
- Create: `apps/api/alembic/versions/<timestamp>_add_mlgoo_reopen_fields.py`
- Reference: `apps/api/app/db/models/enums.py`

- [ ] **Step 1: Inspect current assessment status enum, assessment columns, and API schemas**

Read:

- `apps/api/app/db/models/assessment.py`
- `apps/api/app/db/models/enums.py`
- `apps/api/app/schemas/assessment.py`

Confirm where:

- assessment statuses are declared
- status fields are serialized to web clients
- audit-friendly metadata can be added without breaking unrelated flows

- [ ] **Step 2: Write the failing migration-oriented model tests**

Add coverage in `apps/api/tests/services/` or `apps/api/tests/api/v1/` for:

- an assessment entering `REOPENED_BY_MLGOO`
- `reopened_at`, `reopened_by`, `reopen_reason`, and `reopen_from_status` round-tripping through ORM
  serialization

Use a test body shaped like:

```python
def test_assessment_can_store_mlgoo_reopen_metadata(db_session, mlgoo_user, blgu_user):
    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=2026,
        status=AssessmentStatus.REOPENED_BY_MLGOO,
        reopened_by=mlgoo_user.id,
        reopened_at=datetime.utcnow(),
        reopen_reason="Accidental submission before completion",
        reopen_from_status=AssessmentStatus.AWAITING_FINAL_VALIDATION,
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    assert assessment.status == AssessmentStatus.REOPENED_BY_MLGOO
    assert assessment.reopen_reason == "Accidental submission before completion"
```

- [ ] **Step 3: Run the focused test and verify it fails because the fields/status do not exist**

Run:

```bash
cd apps/api && uv run pytest tests -k mlgoo_reopen_metadata -v
```

Expected:

- FAIL with enum or model-field errors

- [ ] **Step 4: Add the enum value, model fields, and Alembic migration**

Implement:

- `AssessmentStatus.REOPENED_BY_MLGOO`
- nullable columns for:
  - `reopened_at`
  - `reopened_by`
  - `reopen_reason`
  - `reopen_from_status`

Migration notes:

- use nullable columns for backward compatibility
- backfill nothing by default
- keep existing deadline-lock columns untouched

- [ ] **Step 5: Update response schemas and generated shared types**

Expose the new status and reopen metadata through the relevant assessment response schemas, then
run:

```bash
pnpm generate-types
```

Expected:

- generated shared client/types include `REOPENED_BY_MLGOO` and reopen metadata

- [ ] **Step 6: Run the focused model/schema tests again**

Run:

```bash
cd apps/api && uv run pytest tests -k mlgoo_reopen_metadata -v
```

Expected:

- PASS

- [ ] **Step 7: Commit the status and schema groundwork**

```bash
git add apps/api/app/db/models/assessment.py apps/api/app/db/models/enums.py apps/api/app/schemas/assessment.py apps/api/alembic/versions packages/shared/src/generated
git commit -m "feat(api): add mlgoo reopen workflow metadata"
```

### Task 2: Implement The MLGOO Reopen Service And Endpoint Rules

**Files:**

- Modify: `apps/api/app/services/mlgoo_service.py`
- Modify: `apps/api/app/api/v1/mlgoo.py`
- Modify: `apps/api/app/core/exception_handlers.py` only if a reusable validation error shape is
  needed
- Test: `apps/api/tests/services/test_mlgoo_service.py`
- Test: `apps/api/tests/api/v1/test_mlgoo.py`

- [ ] **Step 1: Write the failing service test for allowed source states**

Add a service test that:

- creates an assessment in each allowed source state:
  - `SUBMITTED_FOR_REVIEW`
  - `IN_REVIEW`
  - `AWAITING_FINAL_VALIDATION`
  - `AWAITING_MLGOO_APPROVAL`
- calls `reopen_submission(...)`
- asserts:
  - new status is `REOPENED_BY_MLGOO`
  - `reopen_from_status` captures the original value
  - reason is required
  - deadline lock fields are unchanged
  - `rework_count` is unchanged

Use a test body shaped like:

```python
def test_reopen_submission_moves_allowed_status_to_reopened_by_mlgoo(db_session, mlgoo_user, assessment):
    assessment.status = AssessmentStatus.AWAITING_FINAL_VALIDATION
    db_session.commit()

    updated = mlgoo_service.reopen_submission(
        db_session,
        assessment_id=assessment.id,
        mlgoo_user_id=mlgoo_user.id,
        reason="Accidental submission before completion",
    )

    assert updated.status == AssessmentStatus.REOPENED_BY_MLGOO
    assert updated.reopen_from_status == AssessmentStatus.AWAITING_FINAL_VALIDATION
    assert updated.reopen_reason == "Accidental submission before completion"
    assert updated.rework_count == assessment.rework_count
```

- [ ] **Step 2: Add a failing API test for authorization and validation**

Add API coverage asserting:

- only MLGOO can call the reopen endpoint
- empty reason is rejected
- unsupported source states like `DRAFT`, `REWORK`, `COMPLETED`, `VALIDATED` are rejected with clear
  errors

- [ ] **Step 3: Run the focused reopen tests and verify failure**

Run:

```bash
cd apps/api && uv run pytest tests/services/test_mlgoo_service.py tests/api/v1/test_mlgoo.py -k reopen_submission -v
```

Expected:

- FAIL because the reopen operation does not exist yet

- [ ] **Step 4: Implement `reopen_submission` in `mlgoo_service`**

Implementation requirements:

- validate the source status against the allowed set
- require a non-empty reason
- set:
  - `status = REOPENED_BY_MLGOO`
  - `reopened_by`
  - `reopened_at`
  - `reopen_reason`
  - `reopen_from_status`
- do not touch:
  - deadline lock metadata
  - `rework_count`
  - `calibration_count`
  - indicator-level `requires_rework`
- create an assessment activity such as:

```python
activity = AssessmentActivity(
    assessment_id=assessment.id,
    user_id=mlgoo_user_id,
    action="reopened_by_mlgoo",
    from_status=original_status,
    to_status=AssessmentStatus.REOPENED_BY_MLGOO,
    remarks=reason,
)
```

- [ ] **Step 5: Add the MLGOO API route and request schema**

Add a dedicated endpoint like:

```python
@router.post("/assessments/{assessment_id}/reopen")
```

Back it with a small request schema such as:

```python
class ReopenSubmissionRequest(BaseModel):
    reason: str
```

Keep the router thin and delegate to `mlgoo_service`.

- [ ] **Step 6: Run the focused reopen tests again**

Run:

```bash
cd apps/api && uv run pytest tests/services/test_mlgoo_service.py tests/api/v1/test_mlgoo.py -k reopen_submission -v
```

Expected:

- PASS

- [ ] **Step 7: Commit the reopen flow**

```bash
git add apps/api/app/services/mlgoo_service.py apps/api/app/api/v1/mlgoo.py apps/api/tests/services/test_mlgoo_service.py apps/api/tests/api/v1/test_mlgoo.py
git commit -m "feat(api): add mlgoo reopen submission flow"
```

### Task 3: Make BLGU Editable Flow Accept `REOPENED_BY_MLGOO`

**Files:**

- Modify: `apps/api/app/services/assessment_service.py`
- Modify: `apps/api/app/db/models/assessment.py`
- Test: `apps/api/tests/services/test_assessment_service.py`
- Test: `apps/api/tests/api/v1/test_assessments.py`

- [ ] **Step 1: Write the failing tests for BLGU editability and resubmission**

Cover:

- BLGU can save responses in `REOPENED_BY_MLGOO`
- BLGU can upload/replace MOVs in `REOPENED_BY_MLGOO`
- BLGU can resubmit from `REOPENED_BY_MLGOO`
- existing non-editable states stay non-editable

Use a test body shaped like:

```python
def test_blgu_can_update_assessment_when_reopened_by_mlgoo(client, blgu_token, reopened_assessment):
    response = client.patch(
        f"/api/v1/assessments/{reopened_assessment.id}/responses/{response_id}",
        json={"response_data": {"field": "value"}},
        headers={"Authorization": f"Bearer {blgu_token}"},
    )
    assert response.status_code == 200
```

- [ ] **Step 2: Run the focused editability tests and verify failure**

Run:

```bash
cd apps/api && uv run pytest tests/services/test_assessment_service.py tests/api/v1/test_assessments.py -k reopened_by_mlgoo -v
```

Expected:

- FAIL because editability logic does not yet allow the new status

- [ ] **Step 3: Update editable-state guards**

Find and update the guards that currently treat only `DRAFT` and `REWORK`-like states as editable.
Ensure `REOPENED_BY_MLGOO` behaves like an editable BLGU state for:

- response save/autosave
- MOV upload/replace/remove
- submit/resubmit actions

Do not broaden write access for any other non-editable statuses.

- [ ] **Step 4: Decide post-resubmission target and codify it**

On BLGU resubmission from `REOPENED_BY_MLGOO`, preserve the existing downstream routing rules:

- if the assessment was reopened from `SUBMITTED_FOR_REVIEW` or `IN_REVIEW`, return to the normal
  reviewer path
- if reopened from `AWAITING_FINAL_VALIDATION`, return to validator review
- if reopened from `AWAITING_MLGOO_APPROVAL`, return to MLGOO approval

Implement the target resolution from `reopen_from_status` and cover it with tests.

- [ ] **Step 5: Run the focused tests again**

Run:

```bash
cd apps/api && uv run pytest tests/services/test_assessment_service.py tests/api/v1/test_assessments.py -k reopened_by_mlgoo -v
```

Expected:

- PASS

- [ ] **Step 6: Commit the BLGU editable-state changes**

```bash
git add apps/api/app/services/assessment_service.py apps/api/app/db/models/assessment.py apps/api/tests/services/test_assessment_service.py apps/api/tests/api/v1/test_assessments.py
git commit -m "feat(api): allow blgu edits for mlgoo reopened submissions"
```

### Task 4: Preserve Validator History Across Calibration Resubmission

**Files:**

- Modify: `apps/api/app/api/v1/assessments.py`
- Modify: `apps/api/app/db/models/assessment.py`
- Modify: `apps/api/app/db/models/mov.py`
- Create: `apps/api/alembic/versions/<timestamp>_add_validator_review_history.py`
- Test: `apps/api/tests/api/v1/test_assessments.py`
- Test: `apps/api/tests/services/test_assessment_service.py`

- [ ] **Step 1: Write the failing regression test for non-calibrated indicator preservation**

Build a test scenario with:

- one calibrated response
- one non-calibrated response
- validator `validation_status` on both
- validator checklist keys in `response_data`
- validator comments and MOV annotations on both

After calibration resubmission, assert:

- calibrated response enters a new active cycle
- non-calibrated response still keeps its current validator state
- no validator comments/annotations are deleted

Use a test body shaped like:

```python
def test_calibration_resubmission_preserves_non_calibrated_validator_state(client, db_session, ...):
    ...
    assert preserved_response.validation_status == ValidationStatus.APPROVED
    assert any(comment.review_cycle == 1 for comment in preserved_comments)
    assert any(annotation.review_cycle == 1 for annotation in preserved_annotations)
```

- [ ] **Step 2: Write the failing regression test for calibrated-indicator history preservation**

Assert that when a calibrated indicator is reopened:

- prior validator checklist data is copied to historical storage
- prior validator comments remain queryable as previous-cycle history
- prior MOV annotations remain queryable as previous-cycle history
- active-cycle validator state is clean for the calibrated indicator only

- [ ] **Step 3: Run the focused calibration tests and verify failure**

Run:

```bash
cd apps/api && uv run pytest tests/api/v1/test_assessments.py tests/services/test_assessment_service.py -k calibration_resubmission_preserves -v
```

Expected:

- FAIL because the current code clears response data and deletes feedback comments

- [ ] **Step 4: Add review-cycle persistence fields**

Implement the minimal persistence needed to preserve previous-cycle history. Prefer adding explicit
cycle/version metadata rather than stuffing archival blobs into unrelated columns.

Examples:

- `FeedbackComment.review_cycle`
- `MOVAnnotation.review_cycle`
- assessment-level or response-level `validator_review_cycle`
- a historical JSON field for prior validator-owned checklist data if no better normalized shape
  exists

Migration notes:

- default existing records to cycle `1`
- keep fields nullable only if migration constraints require it

- [ ] **Step 5: Replace destructive calibration reset behavior**

In `apps/api/app/api/v1/assessments.py`, change the current loop over `rework_responses` so it:

- preserves non-calibrated responses entirely
- archives validator-owned checklist data for each calibrated response
- increments or assigns the next review cycle for calibrated artifacts
- resets only the active-cycle validator state needed for the new pass
- stops deleting `FeedbackComment` rows
- stops discarding prior MOV annotation history

Implementation note:

```python
for response in rework_responses:
    archive_validator_cycle(response, current_cycle=response.validator_review_cycle)
    response.requires_rework = False
    response.validation_status = None
    response.response_data = clear_active_validator_fields_only(response.response_data)
    response.validator_review_cycle += 1
```

The helper must clear only active validator-owned keys for the calibrated response and must leave
BLGU-submitted answer data intact.

- [ ] **Step 6: Run the focused calibration tests again**

Run:

```bash
cd apps/api && uv run pytest tests/api/v1/test_assessments.py tests/services/test_assessment_service.py -k calibration_resubmission_preserves -v
```

Expected:

- PASS

- [ ] **Step 7: Commit the history-preservation changes**

```bash
git add apps/api/app/api/v1/assessments.py apps/api/app/db/models/assessment.py apps/api/app/db/models/mov.py apps/api/alembic/versions apps/api/tests/api/v1/test_assessments.py apps/api/tests/services/test_assessment_service.py
git commit -m "feat(api): preserve validator history across calibration cycles"
```

### Task 5: Align Validator Queue Progress With Meaningful Active-Cycle State

**Files:**

- Modify: `apps/api/app/services/assessor_service.py`
- Test: `apps/api/tests/services/test_assessor_service.py`
- Reference: `apps/web/src/components/features/validator/ValidatorValidationClient.tsx`
- Reference: `apps/web/src/components/features/submissions/utils/statusConfig.ts`

- [ ] **Step 1: Write the failing regression test for false-only validator data**

Create a validator queue test where:

- one response has `response_data = {"validator_val_2_2_1_upload_1": False}`
- `validation_status = None`
- `flagged_for_calibration = False`

Assert that the response does not count as reviewed progress.

Use a test body shaped like:

```python
def test_validator_queue_ignores_false_only_validator_draft_values(db_session, validator_user):
    ...
    assert queue_item["validation_progress"] == 0
```

- [ ] **Step 2: Run the focused queue test and verify failure**

Run:

```bash
cd apps/api && uv run pytest tests/services/test_assessor_service.py -k false_only_validator_draft_values -v
```

Expected:

- FAIL because the current queue logic counts any `validator_val_*` key

- [ ] **Step 3: Replace loose validator key-presence checks**

Update validator queue and re-review progress logic in `assessor_service.py` to use the same
meaningful-data helper pattern already used for assessors.

Implementation direction:

```python
reviewed_count = sum(
    1
    for r in area_responses
    if not r.requires_rework
    and (
        r.validation_status is not None
        or r.flagged_for_calibration
        or self._has_meaningful_owned_validation_data(validator_user, r.response_data)
    )
)
```

Make the same change for validator `re_review_progress`.

- [ ] **Step 4: Run the focused queue test again**

Run:

```bash
cd apps/api && uv run pytest tests/services/test_assessor_service.py -k false_only_validator_draft_values -v
```

Expected:

- PASS

- [ ] **Step 5: Commit the queue-alignment fix**

```bash
git add apps/api/app/services/assessor_service.py apps/api/tests/services/test_assessor_service.py
git commit -m "fix(api): align validator queue progress with meaningful review state"
```

### Task 6: Surface The New Reopen State And Accurate Validator Progress In The Web App

**Files:**

- Modify: `apps/web/src/components/features/submissions/utils/statusConfig.ts`
- Modify: `apps/web/src/app/(app)/validator/submissions/page.tsx`
- Modify: `apps/web/src/components/features/validator/ValidatorValidationClient.tsx`
- Modify: `apps/web/src/components/features/assessor/validation/RightAssessorPanel.tsx`
- Modify: `apps/web/src/app/(app)/mlgoo/...` relevant reopen action surface
- Test: `apps/web/src/components/features/submissions/__tests__/...`
- Test: `apps/web/src/components/features/validator/__tests__/...`

- [ ] **Step 1: Add the failing UI tests for the new status and progress semantics**

Cover:

- BLGU/MLGOO surfaces render `Reopened by MLGOO`
- validator submissions list does not show `Continue Validation` for false-only stale validator keys
- validator detail view can render prior-cycle history separately from active-cycle review

- [ ] **Step 2: Run the focused frontend tests and verify failure**

Run:

```bash
cd apps/web && pnpm test -- --runInBand reopened-by-mlgoo validator-progress
```

Expected:

- FAIL because the UI does not yet know the new status/history model

- [ ] **Step 3: Add status mapping and action-label handling**

Update status config so:

- `REOPENED_BY_MLGOO` maps to display label `Reopened by MLGOO`
- BLGU sees this as editable/reopen state
- validator dashboard action labels align with true resumable progress

- [ ] **Step 4: Render prior-cycle validator history distinctly**

Update the validator detail flow to show historical validator comments, annotations, and checklist
state in a clearly separate previous-cycle section instead of blending it into the active cycle.

Keep the active cycle focused on the items that currently need review.

- [ ] **Step 5: Add the MLGOO reopen action UI**

Expose a `Reopen Submission` action only for the allowed source states. Require a reason before
submitting the request. Do not route this through deadline lock UI.

- [ ] **Step 6: Run the focused frontend tests again**

Run:

```bash
cd apps/web && pnpm test -- --runInBand reopened-by-mlgoo validator-progress
```

Expected:

- PASS

- [ ] **Step 7: Commit the frontend workflow changes**

```bash
git add apps/web/src/components/features/submissions/utils/statusConfig.ts apps/web/src/app/(app)/validator/submissions/page.tsx apps/web/src/components/features/validator/ValidatorValidationClient.tsx apps/web/src/components/features/assessor/validation/RightAssessorPanel.tsx apps/web/src/app/(app)/mlgoo
git commit -m "feat(web): add mlgoo reopen and validator history UI"
```

### Task 7: Run End-To-End Verification And Migration Checks

**Files:**

- Reference: `scripts/test-migration.sh`
- Reference: `apps/web/tests/e2e`
- Reference: `docs/guides/testing.md`

- [ ] **Step 1: Run targeted backend test groups**

Run:

```bash
cd apps/api && uv run pytest tests/services/test_mlgoo_service.py tests/api/v1/test_mlgoo.py tests/services/test_assessor_service.py tests/api/v1/test_assessments.py tests/services/test_assessment_service.py -v
```

Expected:

- PASS for reopen, calibration preservation, and validator progress coverage

- [ ] **Step 2: Run migration verification**

Run:

```bash
./scripts/test-migration.sh
```

Expected:

- upgrade and downgrade both succeed for the new reopen/history migrations

- [ ] **Step 3: Run relevant frontend tests**

Run:

```bash
cd apps/web && pnpm test -- --runInBand validator-progress reopened-by-mlgoo
```

Expected:

- PASS

- [ ] **Step 4: Add or update an e2e workflow covering the Osmeña-class case**

Cover this path:

- BLGU submits too early
- MLGOO reopens with reason
- BLGU edits and resubmits
- validator requests calibration on subset
- BLGU resubmits calibrated subset
- validator sees prior-cycle history and only the calibrated subset reopened

- [ ] **Step 5: Run the targeted e2e test**

Run:

```bash
cd apps/web && pnpm test:e2e --grep "mlgoo reopen calibration history"
```

Expected:

- PASS

- [ ] **Step 6: Verify generated types and repo state**

Run:

```bash
git status --short
```

Expected:

- only intended files are changed
- generated files are included

- [ ] **Step 7: Commit the verification-safe final state**

```bash
git add .
git commit -m "test: cover mlgoo reopen and incremental validator review"
```
