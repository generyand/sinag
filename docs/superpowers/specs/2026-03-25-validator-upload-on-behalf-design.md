# Validator Upload On Behalf Design

## Summary

This feature allows a `Validator` to upload MOV files on behalf of a barangay so validation can
continue without routing the whole assessment back to the BLGU. The upload is additive only:
validator-uploaded files become new evidence attached to the same assessment and indicator, while
existing barangay uploads remain intact and visible.

The system must preserve provenance. Validator-uploaded files are stored in the existing MOV flow
but are marked so every consumer can distinguish:

- `Barangay uploads`
- `Validator uploads`

This feature is intentionally scoped to validators only. Assessors and MLGOO users are excluded for
now.

## Goals

- Allow validators to upload evidence for any assessment they can access once the BLGU is no longer
  actively editing it.
- Reduce turnaround time for minor evidence fixes that do not justify sending the whole assessment
  back to the barangay.
- Keep validator uploads inside the durable assessment evidence model.
- Preserve a clear audit trail showing who uploaded each file.
- Keep barangay and validator uploads visible as separate groups in the UI.

## Non-Goals

- Replacing, overwriting, or auto-hiding existing barangay files.
- Adding a barangay acknowledgment workflow for validator uploads.
- Extending this capability to assessors or MLGOO users.
- Introducing a separate parallel file system outside `MOVFile`.

## User Story

As a validator reviewing a submitted barangay assessment, I need to upload a supporting file on
behalf of the barangay so I can move validation forward without sending the whole assessment back
for a simple file issue.

## Current State

The current product already supports:

- BLGU-side MOV uploads as part of assessment completion
- validator and assessor review flows over submitted assessments
- existing MOV file display, preview, signed URL, and deletion flows
- an assessor-side upload capability that proves non-BLGU uploads are already a valid product
  pattern

What is missing is a validator-owned upload path that:

- works on submitted or otherwise BLGU-non-active assessments
- stores durable uploader provenance
- renders validator-added files separately from barangay uploads

## Proposed Approach

Use the existing `MOVFile` model and storage flow, but extend it with uploader provenance fields.
This keeps validator uploads in the same durable evidence model as barangay uploads and avoids
duplicating the existing file preview, validation, and retrieval paths.

### Why Not A Separate Table

A separate `validator_files` or supplemental-file table would make provenance explicit, but it would
duplicate:

- upload endpoints
- preview and signed URL logic
- indicator file aggregation
- BLGU/validator rendering logic
- submission and compliance rules that already operate on MOV files

The simpler and more coherent design is to keep one file model and add explicit ownership metadata.

## Data Model

### `mov_files` Changes

Add uploader provenance columns to `mov_files`:

- `uploaded_by_user_id: int | null`
- `upload_origin: str`

Recommended `upload_origin` values for this feature:

- `blgu`
- `validator`

Future-safe but out of current scope:

- `assessor`
- `mlgoo`
- `system`

### Rationale

`uploaded_by_user_id` supports auditability and activity logs. `upload_origin` supports filtering,
display grouping, and business rules without needing to join users everywhere a file list is shown.

### Backfill

Backfill must be conservative.

The migration should only auto-set `upload_origin='blgu'` for rows that are known to belong to the
current BLGU upload path. If the existing dataset contains mixed provenance that cannot be inferred
reliably from current columns or storage path conventions, introduce a temporary fallback value such
as `unknown` and treat it as `Barangay uploads` in the UI only if product confirms that behavior is
acceptable.

The implementation plan must verify the current `mov_files` dataset shape before finalizing the
backfill rule. Do not silently label ambiguous historical rows as BLGU uploads.

## Permission Model

Validator upload is allowed only when all of the following are true:

- caller role is `VALIDATOR`
- the validator can already access the assessment under existing validator access rules
- the target assessment is in an explicitly allowed validator-upload status
- the target indicator belongs to the assessment being reviewed

Validator upload is denied when the BLGU is actively editing the assessment. In practice this means
the endpoint should reject statuses that are BLGU-editable.

### Initial Status Rule

Per product direction, the initial allowed set is:

- `SUBMITTED`

The implementation should centralize this status check in one helper/service so the product can
later expand the allowed list without scattering role logic across routers and UI code.

## Workflow

### Validator Flow

1. Validator opens an assessment detail page they already have access to.
2. Validator navigates to an indicator.
3. The page shows two file groups when present:
   - `Barangay uploads`
   - `Validator uploads`
4. Validator uploads one or more new files into the validator group.
5. The backend stores the file as a new `MOVFile` row with validator provenance.
6. The file is immediately available in preview/download flows and appears in the evidence list.

### BLGU Flow

When the BLGU later views the assessment again, the page shows the same evidence split:

- `Barangay uploads`
- `Validator uploads`

The BLGU does not need to acknowledge, accept, or resubmit the validator-added file for it to count
as part of the evidence set.

## Backend Design

### API Surface

Add a validator-only endpoint for uploading a MOV file against a specific assessment response or
indicator in a validator-visible assessment.

Preferred shape:

- `POST /api/v1/validator/assessment-responses/{response_id}/movs/upload`

Alternative if the existing assessor router is already shared by validators:

- extend the existing assessor upload path to explicitly support validators while storing
  `upload_origin='validator'`

The choice should follow the existing router ownership pattern. If the current validator UI already
depends on assessor-owned review endpoints, extending that path may be the smallest change.

However, the implementation must use the modern `MOVFile`-based flow, not the legacy `MOV` table
path. Review-side upload code in the repo currently includes older `MOV`-model helpers, so this
feature must either:

- add a validator upload path directly on the modern `MOVFile` flow, or
- refactor the reusable review-side upload path so validators and any future reviewers both create
  `MOVFile` records

Under no circumstance should validator uploads be implemented only in the legacy `MOV` model if the
rest of the assessment evidence UI reads from `mov_files`.

### Backend Responsibilities

The endpoint/service should:

- verify the caller is a validator
- verify access to the assessment response and indicator
- verify the assessment status is in the explicitly allowed validator-upload status set, currently
  `SUBMITTED`
- run the existing file validation rules
- upload to storage using the existing MOV storage pattern
- create a `MOVFile` row with validator provenance
- return the created file in the same response shape expected by the existing UI

### Service Layer

Prefer extending the current review-side upload service rather than inventing a new standalone flow.
That keeps:

- file validation
- storage integration
- permission checks
- response serialization

close to the review workflow that already owns validator assessment access.

This recommendation applies only if the reused service writes to `MOVFile`. If the current service
still terminates in legacy `MOV` records, the implementation should extract shared validation and
permission logic but create a new `MOVFile`-native upload path for validators.

## Frontend Design

### Validator UI

Add an upload control within the validator assessment detail flow, scoped to each indicator. The
control should live close to the existing file panel so the validator can act without leaving the
review context.

The validator view should render files in separate sections:

- `Barangay uploads`
- `Validator uploads`

The upload affordance should target only the validator section.

### BLGU UI

When the BLGU later sees the indicator file list, the same grouping should be preserved. The BLGU
must be able to tell which evidence came from the barangay and which was added by the validator.

### Rendering Rules

- Do not merge file groups purely by timestamp.
- Do not relabel validator uploads as barangay uploads.
- Preserve existing preview and download behavior.
- Keep the visual difference explicit through section headings, not just small badges.

## Validation And Submission Semantics

Validator-added files are additive evidence and should count as valid MOVs unless a later product
decision says otherwise. This is consistent with the client’s goal: move validation faster without
routing the full assessment back to the barangay.

This means submission/completeness logic that checks for required MOV presence should treat both
`blgu` and `validator` uploads as valid files for the indicator.

## Audit And Activity Logging

The feature should support clear traceability:

- who uploaded the file
- when it was uploaded
- which assessment and indicator it belongs to
- that the upload originated from a validator

If there is an existing activity log or assessment activity service hook for file actions, add a
validator-upload event there. If not, the provenance fields still give the minimum required audit
trail and activity logging can be layered on later.

## Error Handling

The endpoint should return clear failures for:

- invalid file type or file too large
- validator lacking access to the assessment/indicator
- assessment currently active in BLGU editing flow
- assessment response not found
- storage upload failure

The validator UI should surface these errors inline or through the existing toast/error pattern used
in the validation workflow.

## Testing Strategy

### Backend

- permission test: validator allowed
- permission test: BLGU, assessor, and MLGOO denied
- status gating test: `SUBMITTED` assessment allowed
- status gating test: BLGU-active assessment denied
- persistence test: created `MOVFile` stores `upload_origin='validator'`
- persistence test: validator upload is stored in `mov_files`, not only in legacy `MOV`
- serialization test: file list response exposes provenance needed for grouping
- validation test: validator-uploaded files satisfy required MOV presence where applicable

### Frontend

- validator page renders separate `Barangay uploads` and `Validator uploads` sections
- validator upload action appends files only to the validator group
- BLGU file view shows validator-added files in a separate group
- existing preview/download interactions still work for both groups

### Regression

- existing BLGU upload flow remains unchanged
- existing signed URL and file preview flows remain unchanged
- existing rework/calibration rendering still works with mixed file origins

## Risks

### Provenance Leaks

If provenance is not wired through every response serializer, some views may accidentally merge
validator files back into the main list. Mitigation: make provenance part of the canonical file
response shape, not just internal ORM fields.

### Status Rule Drift

Different endpoints may disagree on what “not active in BLGU view” means. Mitigation: centralize the
allowed-status check in one service/helper used by validator upload.

### UI Ambiguity

If grouping is weak, users may assume validator files were uploaded by the barangay. Mitigation: use
explicit group headings rather than subtle badges alone.

## Open Decisions Resolved

- Validator only: yes
- Allowed status set for v1: `SUBMITTED` only
- Additive uploads only: yes
- No replacement semantics: yes
- No barangay acknowledgment required: yes
- Separate BLGU-visible grouping: yes
- Migration likely required: yes

## Implementation Direction

The implementation should proceed as:

1. Add MOV provenance fields and migration, with a verified backfill strategy for historical rows.
2. Extend backend file upload/service flow for validator uploads on the `MOVFile` path.
3. Expose provenance in file response payloads.
4. Add validator-side upload UI in the validation flow.
5. Group files by origin in validator and BLGU views.
6. Add backend and frontend coverage for permission, status gating, persistence, and rendering.
