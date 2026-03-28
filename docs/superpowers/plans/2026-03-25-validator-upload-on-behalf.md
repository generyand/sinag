# Validator Upload On Behalf Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow validators to add MOV evidence to submitted assessments on behalf of barangays,
using the modern `mov_files` path with durable provenance and separate UI grouping.

**Architecture:** Extend the `MOVFile` model with uploader-origin metadata, enforce validator-only
upload permission on the modern MOV upload API for `SUBMITTED` assessments, and expose provenance
through existing file response shapes. Update validator and BLGU file views to render
`Barangay uploads` and `Validator uploads` as distinct groups while preserving current
preview/download behavior.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, Next.js 16, React 19, TanStack Query, shared
generated API types

---

## File Structure

### Backend

- Modify: `apps/api/app/db/models/assessment.py`
  - Add `MOVFile` provenance fields such as `upload_origin` and, if needed for clarity, align naming
    with existing `uploaded_by`.
- Create: `apps/api/alembic/versions/<timestamp>_add_mov_file_upload_origin.py`
  - Add the new `mov_files` provenance column(s) and perform conservative backfill.
- Modify: `apps/api/app/schemas/assessment.py`
  - Extend `MOVFileResponse` so API consumers can group files by origin.
- Modify: `apps/api/app/api/v1/movs.py`
  - Allow validator uploads only for `SUBMITTED` assessments and keep BLGU rules unchanged.
- Modify: `apps/api/app/services/storage_service.py`
  - Thread upload-origin metadata through `upload_mov_file()` and persist it on `MOVFile`.
- Modify: `apps/api/app/services/assessment_service.py`
  - Ensure the assessment payload path includes the new provenance field in embedded `mov_files`.
- Modify: `apps/api/app/services/assessor_service.py`
  - Ensure validator assessment-detail payloads include the new provenance field anywhere they
    serialize `mov_files`.
- Test: `apps/api/tests/api/v1/test_movs.py` or the closest existing MOV endpoint test module
  - Add validator upload permission/status tests.
- Test: `apps/api/tests/services/test_storage_service.py` or the closest storage/MOV service test
  module
  - Add persistence tests for `MOVFile.upload_origin`.

### Frontend

- Modify: `apps/web/src/components/features/assessor/validation/MiddleMovFilesPanel.tsx`
  - Add grouped rendering for barangay versus validator uploads in validator review screens.
- Modify: `apps/web/src/components/features/validator/ValidatorValidationClient.tsx`
  - Add validator upload action wiring in the validation flow.
- Modify: `apps/web/src/components/features/forms/fields/FileFieldComponent.tsx`
  - Add BLGU-side grouped display for file provenance without changing BLGU upload affordances.
- Modify: `apps/web/src/components/features/movs/FileList.tsx`
  - Reuse or extend file list presentation for grouped sections if needed.
- Modify: `apps/web/src/lib/uploadMov.ts` only if the current client helper is reused for validator
  uploads
  - Keep this scoped; do not merge BLGU and validator behavior unless it simplifies the
    implementation.
- Test: `apps/web/src/components/features/validator/__tests__/ValidatorValidationClient*.test.tsx`
  - Add validator upload/grouping coverage.
- Test: `apps/web/src/components/features/forms/fields/__tests__/FileFieldComponent.test.tsx`
  - Add BLGU grouped-rendering coverage.

### Generated Contract

- Modify: `packages/shared/src/generated/*`
  - Regenerate after schema changes so frontend hooks/types include the new provenance field.

### References

- Spec: `docs/superpowers/specs/2026-03-25-validator-upload-on-behalf-design.md`
- Modern MOV API: `apps/api/app/api/v1/movs.py`
- MOV model: `apps/api/app/db/models/assessment.py`
- MOV response schema: `apps/api/app/schemas/assessment.py`
- Validator review file panel:
  `apps/web/src/components/features/assessor/validation/MiddleMovFilesPanel.tsx`
- BLGU file rendering: `apps/web/src/components/features/forms/fields/FileFieldComponent.tsx`

### Task 1: Lock In Data Model And Migration

**Files:**

- Modify: `apps/api/app/db/models/assessment.py`
- Create: `apps/api/alembic/versions/<timestamp>_add_mov_file_upload_origin.py`
- Test: `apps/api/tests/services/test_storage_service.py` or nearest existing MOV persistence test
  file

- [ ] **Step 1: Inspect existing `mov_files` usage and choose the final provenance field shape**

Confirm the exact schema change before editing:

- Reuse existing `uploaded_by` as the uploader FK
- Add `upload_origin` as the new canonical grouping field
- Decide whether `upload_origin` is a constrained string or enum-like string column

Expected decision for v1:

```python
upload_origin: Mapped[str] = mapped_column(String(20), nullable=False, default="blgu")
```

- [ ] **Step 2: Write the failing migration/model test**

Add or update a backend test that creates a `MOVFile` through the service path and asserts:

```python
assert mov_file.uploaded_by == validator.id
assert mov_file.upload_origin == "validator"
```

Run: `cd apps/api && uv run pytest tests/services/test_storage_service.py -k upload_origin -v`

Expected: FAIL because `upload_origin` does not exist yet.

- [ ] **Step 3: Update the SQLAlchemy model**

Add the new column to `MOVFile` in `apps/api/app/db/models/assessment.py` with:

- non-null storage
- default `blgu`
- a short doc comment describing provenance usage

- [ ] **Step 4: Create the Alembic migration**

Create a migration that:

- adds the `upload_origin` column to `mov_files`
- sets a safe server/default for new rows
- backfills only rows that can be safely inferred as BLGU uploads
- leaves room for a temporary `unknown` fallback if data inspection shows ambiguity

Run: `cd apps/api && pnpm migrate`

Expected: migration applies locally without errors.

- [ ] **Step 5: Run migration verification**

Run: `./scripts/test-migration.sh`

Expected: upgrade and downgrade pass for the new migration.

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/db/models/assessment.py apps/api/alembic/versions
git commit -m "feat(api): add mov file upload origin"
```

### Task 2: Extend Modern MOV Upload API For Validators

**Files:**

- Modify: `apps/api/app/api/v1/movs.py`
- Modify: `apps/api/app/services/storage_service.py`
- Test: `apps/api/tests/api/v1/test_movs.py`
- Test: `apps/api/tests/services/test_storage_service.py`

- [ ] **Step 1: Write failing API permission tests**

Add tests that cover:

```python
def test_validator_can_upload_mov_for_submitted_assessment(...): ...
def test_validator_cannot_upload_mov_for_draft_assessment(...): ...
def test_blgu_rules_remain_unchanged(...): ...
```

Run: `cd apps/api && uv run pytest tests/api/v1/test_movs.py -k validator_upload -v`

Expected: FAIL because validator upload/status gating is not implemented.

- [ ] **Step 2: Centralize the validator status rule in the MOV router/service path**

Implement a small helper in `apps/api/app/api/v1/movs.py` or a nearby service that:

- allows validator uploads only when `assessment.status == AssessmentStatus.SUBMITTED`
- rejects BLGU-editable states
- preserves existing BLGU ownership and lock checks

- [ ] **Step 3: Thread `upload_origin` through the storage service**

Update `storage_service.upload_mov_file()` to accept an origin parameter:

```python
def upload_mov_file(..., upload_origin: str = "blgu") -> MOVFile:
    ...
    mov_file = MOVFile(
        ...,
        uploaded_by=user_id,
        upload_origin=upload_origin,
    )
```

- [ ] **Step 4: Update the MOV upload endpoint to pass validator provenance**

In `apps/api/app/api/v1/movs.py`:

- keep BLGU uploads as `upload_origin="blgu"`
- allow validators to call the same modern endpoint for `SUBMITTED` assessments
- pass `upload_origin="validator"` for validator callers

- [ ] **Step 5: Run targeted backend tests**

Run:

```bash
cd apps/api && uv run pytest tests/api/v1/test_movs.py -k validator_upload -v
cd apps/api && uv run pytest tests/services/test_storage_service.py -k upload_origin -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/api/v1/movs.py apps/api/app/services/storage_service.py apps/api/tests
git commit -m "feat(api): allow validator mov uploads for submitted assessments"
```

### Task 3: Expose Provenance In Assessment And MOV Responses

**Files:**

- Modify: `apps/api/app/schemas/assessment.py`
- Modify: `apps/api/app/services/assessment_service.py`
- Modify: `apps/api/app/services/assessor_service.py`
- Test: `apps/api/tests/api/v1/test_movs.py`
- Test: nearest assessment-detail serialization test module

- [ ] **Step 1: Write a failing serialization test**

Add a test that fetches a file list or assessment detail and expects:

```python
assert response_json["files"][0]["upload_origin"] in {"blgu", "validator"}
```

and, for embedded assessment payloads:

```python
assert indicator["mov_files"][0]["upload_origin"] == "validator"
```

Run: `cd apps/api && uv run pytest tests/api/v1/test_movs.py -k upload_origin_response -v`

Expected: FAIL because response schemas do not expose the field yet.

- [ ] **Step 2: Update Pydantic response schemas**

Extend `MOVFileResponse` in `apps/api/app/schemas/assessment.py`:

```python
upload_origin: str
```

- [ ] **Step 3: Update service serializers**

Ensure all modern `mov_files` serialization paths include `upload_origin`, especially in:

- `apps/api/app/services/assessment_service.py`
- `apps/api/app/services/assessor_service.py`

Do not leave the field available only on the standalone `/movs` endpoints.

- [ ] **Step 4: Regenerate shared types**

Run: `pnpm generate-types`

Expected: generated frontend types and hooks include `upload_origin`.

- [ ] **Step 5: Run targeted API tests**

Run:

```bash
cd apps/api && uv run pytest tests/api/v1/test_movs.py -k "upload_origin_response or validator_upload" -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/schemas/assessment.py apps/api/app/services/assessment_service.py apps/api/app/services/assessor_service.py packages/shared/src/generated
git commit -m "feat(shared): expose mov file upload origin"
```

### Task 4: Add Validator Upload UI And Grouped Review Rendering

**Files:**

- Modify: `apps/web/src/components/features/validator/ValidatorValidationClient.tsx`
- Modify: `apps/web/src/components/features/assessor/validation/MiddleMovFilesPanel.tsx`
- Test: `apps/web/src/components/features/validator/__tests__/ValidatorValidationClient*.test.tsx`
- Test:
  `apps/web/src/components/features/assessor/validation/__tests__/MiddleMovFilesPanel*.test.tsx`

- [ ] **Step 1: Write failing UI tests for grouped review rendering**

Add tests that assert:

- validator screens show `Barangay uploads`
- validator screens show `Validator uploads`
- validator-origin files are rendered in the validator section only

Run: `cd apps/web && pnpm test -- --run MiddleMovFilesPanel`

Expected: FAIL because grouped provenance rendering is not implemented.

- [ ] **Step 2: Add grouping helpers in the review file panel**

In `MiddleMovFilesPanel.tsx`, group `MOVFileResponse[]` by `upload_origin` before applying the
existing display logic. Keep ordering newest-first within each section.

Expected section shape:

```tsx
const barangayFiles = files.filter((file) => file.upload_origin !== "validator");
const validatorFiles = files.filter((file) => file.upload_origin === "validator");
```

- [ ] **Step 3: Wire validator upload action in the validation client**

Add a validator-side upload trigger that posts to:

```ts
/api/1v / movs / assessments / { assessmentId } / indicators / { indicatorId } / upload;
```

using multipart upload, then invalidates/refetches the file or assessment-detail query.

- [ ] **Step 4: Surface upload errors and loading state**

Follow the existing validation page pattern:

- disable the control during upload
- show the current file validation or network error via toast/inline message
- refetch on success so grouped sections update immediately

- [ ] **Step 5: Run targeted validator UI tests**

Run:

```bash
cd apps/web && pnpm test -- --run ValidatorValidationClient
cd apps/web && pnpm test -- --run MiddleMovFilesPanel
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/features/validator/ValidatorValidationClient.tsx apps/web/src/components/features/assessor/validation/MiddleMovFilesPanel.tsx apps/web/src/components/features/validator/__tests__ apps/web/src/components/features/assessor/validation/__tests__
git commit -m "feat(web): add validator mov uploads in review flow"
```

### Task 5: Add BLGU Grouped Display Without Changing BLGU Upload Ownership

**Files:**

- Modify: `apps/web/src/components/features/forms/fields/FileFieldComponent.tsx`
- Modify: `apps/web/src/components/features/movs/FileList.tsx` if needed for reusable section UI
- Test: `apps/web/src/components/features/forms/fields/__tests__/FileFieldComponent.test.tsx`

- [ ] **Step 1: Write a failing BLGU display test**

Add a test that renders mixed-origin files and asserts:

- barangay-origin files appear under `Barangay uploads`
- validator-origin files appear under `Validator uploads`
- BLGU upload/delete affordances do not appear on validator-origin files unless explicitly intended

Run: `cd apps/web && pnpm test -- --run FileFieldComponent`

Expected: FAIL because origin grouping is not present yet.

- [ ] **Step 2: Group files by provenance in the BLGU file field**

Update `FileFieldComponent.tsx` to:

- preserve current rework/calibration filtering logic
- split the resulting visible files by `upload_origin`
- render explicit section headers for the two groups

Avoid rewriting the entire component. Add a focused grouping layer around the existing file list
composition.

- [ ] **Step 3: Keep BLGU upload semantics unchanged**

Ensure the BLGU-side upload code still creates `upload_origin="blgu"` implicitly through the
existing upload endpoint and does not expose validator-only actions.

- [ ] **Step 4: Run targeted BLGU tests**

Run: `cd apps/web && pnpm test -- --run FileFieldComponent`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/features/forms/fields/FileFieldComponent.tsx apps/web/src/components/features/movs/FileList.tsx apps/web/src/components/features/forms/fields/__tests__/FileFieldComponent.test.tsx
git commit -m "feat(web): separate validator and barangay mov groups"
```

### Task 6: Full Verification And Contract Sweep

**Files:**

- Verify: `apps/api/app/api/v1/movs.py`
- Verify: `apps/api/app/services/storage_service.py`
- Verify: `apps/api/app/services/assessment_service.py`
- Verify: `apps/web/src/components/features/validator/ValidatorValidationClient.tsx`
- Verify: `apps/web/src/components/features/assessor/validation/MiddleMovFilesPanel.tsx`
- Verify: `apps/web/src/components/features/forms/fields/FileFieldComponent.tsx`
- Verify: `packages/shared/src/generated/*`

- [ ] **Step 1: Run backend targeted suite**

```bash
cd apps/api && uv run pytest tests/api/v1/test_movs.py -v
cd apps/api && uv run pytest tests/services/test_storage_service.py -v
```

Expected: PASS.

- [ ] **Step 2: Run frontend targeted suite**

```bash
cd apps/web && pnpm test -- --run ValidatorValidationClient
cd apps/web && pnpm test -- --run MiddleMovFilesPanel
cd apps/web && pnpm test -- --run FileFieldComponent
```

Expected: PASS.

- [ ] **Step 3: Run shared repo validation**

```bash
pnpm lint
pnpm type-check
```

Expected: PASS, or any unrelated failures are documented clearly.

- [ ] **Step 4: Optional manual verification**

Use the app to confirm:

- validator can upload on a `SUBMITTED` assessment
- validator cannot upload on a BLGU-editable assessment
- validator uploads appear immediately in validator review
- BLGU later sees separate `Barangay uploads` and `Validator uploads`

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat(validator): support upload on behalf for submitted assessments"
```

## Notes For Executor

- Do not implement this feature on the legacy assessor `MOV` table path.
- Prefer a minimal backend change in `api/v1/movs.py` plus `storage_service.py` over duplicating
  upload logic.
- Be careful with historical backfill. Inspect current `mov_files` rows before deciding whether all
  of them can safely become `blgu`.
- Keep UI changes local to grouping and upload affordances. Avoid broad refactors in already complex
  file panels.
