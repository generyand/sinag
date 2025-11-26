## PRD Traceability Matrix

This matrix maps each functional requirement from the PRD to the corresponding Epic in this task list.

- **FR 4.1** (Assessor's Submissions Queue Module) → **Epic 1.0**
- **FR 4.2** (Validation Module) → **Epic 2.0**
- **FR 4.3** (Rework Workflow Module) → **Epic 3.0**
- **FR 4.4** (Assessment Finalization Module) → **Epic 3.0**

## Relevant Files

- `apps/api/alembic/versions/ee9817766282_add_validation_status_to_assessment_.py`
- `apps/api/tests/test_assessor_story_2_2_1.py`
- `apps/api/tests/test_assessor_story_2_2_2.py`
- `apps/api/tests/test_assessor_story_2_2_3.py`
- `apps/api/app/db/models/assessment.py`
- `apps/api/app/api/deps.py`
- `apps/api/app/api/v1/assessor.py`
- `apps/api/app/schemas/assessor.py`
- `apps/api/app/services/assessor_service.py`
- `apps/web/src/app/(app)/assessor/dashboard/page.tsx`
- `apps/web/src/app/(app)/assessor/assessments/[id]/page.tsx`
- `apps/web/src/app/(app)/assessor/assessments/[id]/AssessmentDetailsSkeleton.tsx`
- `apps/web/src/app/(app)/assessor/assessments/[id]/AssessmentResponseCard.tsx`
- `apps/web/src/app/(app)/assessor/assessments/[id]/TechnicalNotesPanel.tsx`
- `apps/web/src/app/(app)/assessor/assessments/[id]/MOVPreviewer.tsx`
- `apps/web/src/app/(app)/assessor/assessments/[id]/ValidationForm.tsx`
- `apps/web/src/app/(app)/assessor/assessments/[id]/index.ts`
- `apps/web/src/components/features/assessor/SubmissionsQueue.tsx`
- `apps/web/src/components/features/assessor/ValidationControls.tsx`
- `apps/web/src/components/shared/FilePreviewerModal.tsx`
- `apps/web/src/hooks/useAssessor.ts`
- `apps/api/app/services/storage_service.py`
- `apps/api/app/api/v1/assessor.py` (multipart upload endpoint, analytics endpoint)
- `apps/api/app/schemas/assessor.py` (MOVUploadResponse extended, AssessorAnalyticsResponse)

## Plan Update: Assessor — Replace Mocks, Add Supabase Uploads, and Analytics Endpoint

This section adds a new integration-focused epic to wire existing assessor UI to real backend data, introduce Supabase-backed MOV uploads (server-side only), and provide a minimal analytics endpoint to power current widgets. These changes minimize surface-area by introducing only two new endpoints.

### Additional Relevant Files (new/updated)

- `apps/api/app/core/config.py` (add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- `apps/api/app/services/storage_service.py` (new)
- `apps/api/app/schemas/assessment.py` (extend with `MOVUploadResponse` if missing)
- `apps/api/app/api/v1/assessor.py` (add routes: uploads, analytics)
- `apps/web/src/app/(app)/assessor/submissions/page.tsx` (wire queue)
- `apps/web/src/app/(app)/assessor/dashboard/page.tsx` (fetch queue in client subcomponent)
- `apps/web/src/app/(app)/assessor/analytics/page.tsx` (replace mocks with hook)
- `apps/web/src/app/(app)/assessor/assessments/[id]/ValidationControls.tsx` (multipart upload)
- `apps/web/src/hooks/useAssessor.ts` (new hooks for analytics and upload)

### 4.0 Epic: Integration & Analytics

- [x] 4.1 Story: Backend — Supabase Integration

  - [x] 4.1.1 Atomic: Add settings and env vars
    - Files: `apps/api/app/core/config.py`, `apps/api/.env`
    - Acceptance: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` defined in `Settings` and loaded from `.env` (local) or environment (prod). Keys never exposed to frontend.
  - [x] 4.1.2 Atomic: Implement `storage_service.py`
    - Files: `apps/api/app/services/storage_service.py` (new)
    - Acceptance: Service initializes Supabase client with service-role key and implements `upload_mov(file, *, response_id)` that stores files under bucket `movs` with prefix `assessment-{assessment_id}/response-{response_id}/`. Returns stored path and metadata suitable for persistence.

- [x] 4.2 Story: Backend — MOV Upload Endpoint (Assessor)

  - [x] 4.2.1 Atomic: Add multipart upload route
    - Files: `apps/api/app/api/v1/assessor.py`, `apps/api/app/schemas/assessment.py`, `apps/api/app/services/assessor_service.py`
    - Acceptance: `POST /api/v1/assessor/assessment-responses/{response_id}/movs/upload` accepts `multipart/form-data` (`file`, optional `filename`), validates assessor permissions (existing firewall in `deps.py`), uploads via `storage_service`, creates MOV record marked as "Uploaded by Assessor", and returns `MOVUploadResponse` including stored path and MOV entity. Existing JSON-based BLGU MOV endpoints remain unchanged.
    - Note: Do not expose Supabase credentials; only persist storage path/URL in DB. Signed URLs can be added later.

- [x] 4.3 Story: Backend — Assessor Analytics Endpoint

  - [x] 4.3.1 Atomic: Add analytics route and service method(s)
    - Files: `apps/api/app/api/v1/assessor.py`, `apps/api/app/schemas/assessor.py`, `apps/api/app/services/assessor_service.py`
    - Acceptance: `GET /api/v1/assessor/analytics` returns `AssessorAnalyticsResponse` covering current UI widgets:
      - `overview`: totals and trend series
      - `hotspots`: top underperforming indicators/areas with reasons
      - `workflow`: counts/durations by status
    - Start minimal using existing assessment/response data and extend as UI grows.

- [x] 4.4 Story: OpenAPI and Types

  - [x] 4.4.1 Atomic: Ensure routes are in main router and regenerate clients
    - Files: `apps/api/app/api/v1/assessor.py`, root `orval.config.ts`
    - Acceptance: New endpoints appear in OpenAPI; run `pnpm generate-types` at repo root to refresh `@sinag/shared` client types and functions.
    - Note: Routes verified in main router (`apps/api/app/api/v1/__init__.py`). Type regeneration requires API server running on `http://localhost:8000`. Run `pnpm generate-types` after starting the API.

- [x] 4.5 Story: Frontend — Wire Submissions and Dashboard

  - [x] 4.5.1 Atomic: Replace queue mocks on Submissions page
    - Files: `apps/web/src/app/(app)/assessor/submissions/page.tsx`, `apps/web/src/hooks/useAssessor.ts`
    - Acceptance: Use `useAssessorQueue()` (generated client + TanStack Query) instead of `generateSubmissionsData`. Preserve existing filters and map to current UI shape.
  - [x] 4.5.2 Atomic: Dashboard uses real queue via client subcomponent
    - Files: `apps/web/src/app/(app)/assessor/dashboard/page.tsx`
    - Acceptance: Fetch queue client-side and pass items to `<SubmissionsQueue />` without breaking current UI.

- [x] 4.6 Story: Frontend — Analytics

  - [x] 4.6.1 Atomic: Replace analytics mocks with hook
    - Files: `apps/web/src/app/(app)/assessor/analytics/page.tsx`, `apps/web/src/hooks/useAssessor.ts`
    - Acceptance: Implement `useAssessorAnalytics()` (generated from `/assessor/analytics`) and adapt widget prop mapping to the API response shape.

- [x] 4.7 Story: Frontend — MOV Upload in Validation Flow
  - [x] 4.7.1 Atomic: Use multipart endpoint in validation controls
    - Files: `apps/web/src/components/features/assessor/ValidationControls.tsx`, `apps/web/src/hooks/useAssessor.ts`
    - Acceptance: Remove mock storage path usage, submit file via multipart upload mutation; on success invalidate assessor detail query to reflect new MOVs.

### Config & Security

- Do not expose Supabase keys to the frontend. Use service-role key in backend only. Persist storage path/URL; serve signed URLs later if needed.

### Testing & Ops Notes

- Backend tests: add unit tests for `storage_service` and endpoint tests for upload and analytics. Use `pytest -vv --log-cli-level=DEBUG` under `apps/api/tests/`.
- Frontend tests: component-level tests for analytics widgets mapping and upload action wiring.
- Types regeneration: after backend routes exist, run `pnpm generate` to refresh `@sinag/shared`.
- Migrations: none expected for this epic; if DB schema changes become necessary, follow Alembic guidelines and never modify old migrations. Always test `upgrade` and `downgrade` locally.

### Testing Notes

- **Backend Testing:** Place Pytest tests in `apps/api/tests/`. Test services and API endpoints separately. Run with `pytest -vv --log-cli-level=DEBUG`.
- **Frontend Testing:** Place test files alongside components (`.test.tsx`). Use Vitest and React Testing Library.
- **Type Safety:** Import auto-generated types from `@sinag/shared` to ensure frontend and backend are in sync.
- **Run Tests:** Use `pnpm test` from the root, which will run tests for all workspaces.

## Tasks

### Three-Tier Structure: Epic → Story → Atomic

- [x] **1.0 Epic: Assessor Dashboard & Secure Queue** _(FR 4.1)_
  - [x] **1.1 Story: Backend API for Secure Queue**
    - [x] **1.1.1 Atomic:** Enhance FastAPI security dependency to enforce `assessor_area` firewall.
      - **Files:** `apps/api/app/api/deps.py`
      - **Dependencies:** None.
      - **Acceptance:** A new dependency function is created that verifies the authenticated user has the `Assessor` role and fetches their `assessor_area`. This dependency will be used to protect all assessor-specific endpoints.
      - **Tech:** FastAPI Dependency Injection.
    - [x] **1.1.2 Atomic:** Create `GET /api/v1/assessor/queue` endpoint.
      - **Files:** `apps/api/app/api/v1/assessor.py` (new file), `apps/api/app/services/assessor_service.py` (new file), `apps/api/app/schemas/assessor.py` (new file).
      - **Dependencies:** Security dependency (1.1.1).
      - **Acceptance:** The endpoint, protected by the new dependency, returns a list of submissions strictly filtered by the assessor's `assessor_area`. The response includes Barangay Name, Submission Date, Status, and Last Updated timestamp, matching a new Pydantic schema.
      - **Tech:** FastAPI, SQLAlchemy, Pydantic.
  - [x] **1.2 Story: Frontend Assessor Dashboard UI**
    - [x] **1.2.1 Atomic:** Create the Assessor Dashboard page and submissions queue component.
      - **Files:** `apps/web/src/app/(app)/assessor/dashboard/page.tsx`, `apps/web/src/components/features/assessor/SubmissionsQueue.tsx`.
      - **Dependencies:** None.
      - **Acceptance:** The page renders the `SubmissionsQueue` component, which uses `shadcn/ui` `Table` and `Tabs` to display the queue. The tabs allow filtering by status (`Submitted for Review`, `Needs Rework`, `Validated`). Each row has a "Review" button that links to the validation page.
      - **Tech:** Next.js App Router, shadcn/ui (`Table`, `Tabs`, `Button`).
    - [x] **1.2.2 Atomic:** Create custom hook to fetch and manage assessor queue data.
      - **Files:** `apps/web/src/hooks/useAssessor.ts` (new file).
      - **Dependencies:** Backend API (1.1.2), Orval client generation must be run.
      - **Acceptance:** The `useAssessor` hook uses TanStack Query's `useQuery` to fetch data from the `/api/v1/assessor/queue` endpoint via the generated Orval client. It provides loading, error, and data states to the `SubmissionsQueue` component.
      - **Tech:** TanStack Query, Orval, Axios.
- [x] **2.0 Epic: Interactive Assessment Validation Interface** _(FR 4.2)_
  - [x] **2.1 Story: Database Schema for Internal Notes**
    - [x] **2.1.1 Atomic:** Create Alembic migration to add `is_internal_note` to `feedback_comments` table.
      - **Files:** `apps/api/alembic/versions/xxxx_add_is_internal_note_to_feedback.py`, `apps/api/app/db/models/assessment.py`.
      - **Dependencies:** None.
      - **Acceptance:** The migration successfully adds a `is_internal_note` boolean column (defaulting to `False`) to the `feedback_comments` table. The SQLAlchemy model is updated to reflect this change.
      - **Tech:** Alembic, SQLAlchemy.
  - [x] **2.2 Story: Backend API for Validation Actions**
    - [x] **2.2.1 Atomic:** Create `POST /api/v1/assessment-responses/{id}/validate` endpoint.
      - **Files:** `apps/api/app/api/v1/assessor.py`, `apps/api/app/services/assessor_service.py`, `apps/api/app/schemas/assessor.py`.
      - **Dependencies:** DB Schema (2.1.1).
      - **Acceptance:** The endpoint accepts a payload containing the validation status (`Pass`, `Fail`, `Conditional`), a public comment, and an internal note. The service logic saves both comments to the `feedback_comments` table, setting `is_internal_note` to `True` for the internal note.
      - **Tech:** FastAPI, Pydantic, SQLAlchemy.
    - [x] **2.2.2 Atomic:** Implement assessor-side MOV uploader endpoint.
      - **Files:** `apps/api/app/api/v1/assessor.py`, `apps/api/app/services/assessor_service.py`.
      - **Dependencies:** None.
      - **Acceptance:** A new endpoint `POST /api/v1/assessment-responses/{id}/upload-mov` accepts a file, saves it, and associates it with the assessment. The file metadata must indicate it was "Uploaded by Assessor".
      - **Tech:** FastAPI `UploadFile`.
    - [x] **2.2.3 Atomic:** Create `GET /api/v1/assessments/{id}` endpoint.
      - **Files:** `apps/api/app/api/v1/assessor.py`, `apps/api/app/services/assessor_service.py`.
      - **Dependencies:** None.
      - **Acceptance:** The endpoint returns the full details for a single assessment, including the BLGU's responses and all associated MOVs. Crucially, the response must **also include the official Technical Notes for each indicator** alongside the indicator data.
      - **Tech:** FastAPI, SQLAlchemy.
  - [x] **2.3 Story: Frontend Validation View & Controls**
    - [x] **2.3.1 Atomic:** Build the main validation page and its two-column layout.
      - **Files:** `apps/web/src/app/(app)/assessor/submissions/[id]/page.tsx`.
      - **Dependencies:** Backend API for fetching submission data must exist.
      - **Acceptance:** The page fetches the specific assessment data and displays the BLGU's submission in a read-only view on the left, and the interactive controls on the right.
      - **Tech:** Next.js App Router, TanStack Query.
    - [x] **2.3.2 Atomic:** Create the interactive `ValidationControls` component.
      - **Files:** `apps/web/src/components/features/assessor/ValidationControls.tsx`.
      - **Dependencies:** None.
      - **Acceptance:** The component renders controls for each indicator: `RadioGroup` for status, `Textarea` for public comments, and a separate `Textarea` for internal notes. The public comment field is mandatory if status is `Conditional`.
      - **Tech:** React, shadcn/ui (`RadioGroup`, `Textarea`, `Label`).
    - [x] **2.3.3 Atomic:** Implement "Save as Draft" functionality.
      - **Files:** `apps/web/src/hooks/useAssessor.ts`.
      - **Dependencies:** Backend API (2.2.1), Orval client updated.
      - **Acceptance:** A new `useMutation` hook is added to `useAssessor.ts` that calls the `validate` endpoint. The "Save as Draft" button on the validation page triggers this mutation.
      - **Tech:** TanStack Query `useMutation`.
    - [x] **2.3.4 Atomic:** Display Technical Notes in the validation view.
      - **Files:** `apps/web/src/components/features/assessor/ValidationControls.tsx`.
      - **Dependencies:** Backend API (2.2.3), Orval client updated.
      - **Acceptance:** The `ValidationControls` component receives the technical notes as part of the main assessment data object and displays the relevant technical note for each indicator, perhaps in a `Tooltip` or an `Accordion` from `shadcn/ui`. No separate API call is needed.
      - **Tech:** shadcn/ui (`Tooltip` or `Accordion`).
    - [x] **2.3.5 Atomic:** Implement the assessor-side MOV uploader UI.
      - **Files:** `apps/web/src/components/features/assessor/ValidationControls.tsx`, `apps/web/src/hooks/useAssessor.ts`.
      - **Dependencies:** Backend API (2.2.2), Orval client updated.
      - **Acceptance:** A `FileUploader` component is added to the validation controls for each indicator. A new `useMutation` hook in `useAssessor.ts` is created to handle the upload logic, calling the endpoint from task 2.2.2.
      - **Tech:** `FileUploader` component, TanStack Query `useMutation`.
  - [x] **2.4 Story: Frontend MOV Previewer Component**
    - [x] **2.4.1 Atomic:** Create a shared `FilePreviewerModal` component.
      - **Files:** `apps/web/src/components/shared/FilePreviewerModal.tsx`.
      - **Dependencies:** None.
      - **Acceptance:** The component, using `shadcn/ui` `Dialog`, accepts a file URL. It renders PDF and image files in-app (e.g., using `react-pdf` or an `<iframe>`/`<img>` tag). For other file types, it displays a "Download File" link.
      - **Tech:** shadcn/ui `Dialog`, potentially a library like `react-pdf`.
- [x] **3.0 Epic: Rework & Finalization Workflow** _(FR 4.3, 4.4)_
  - [x] **3.1 Story: Backend API for Rework & Finalization**
    - [x] **3.1.1 Atomic:** Create `POST /api/v1/assessments/{id}/rework` endpoint and trigger notification.
      - **Files:** `apps/api/app/api/v1/assessor.py`, `apps/api/app/services/assessor_service.py`, `apps/api/app/workers/notifications.py` (new file).
      - **Dependencies:** Celery worker setup (3.3.1).
      - **Acceptance:** The endpoint changes the assessment status to `Needs Rework` and triggers a Celery background task to handle sending the notification. It fails with a 403 error if the assessment's `rework_count` is not 0.
      - **Tech:** FastAPI, SQLAlchemy, Celery.
    - [x] **3.1.2 Atomic:** Create `POST /api/v1/assessments/{id}/finalize` endpoint.
      - **Files:** `apps/api/app/api/v1/assessor.py`, `apps/api/app/services/assessor_service.py`.
      - **Dependencies:** None.
      - **Acceptance:** The endpoint changes the assessment status to `Validated`, permanently locking the assessment from further edits by either the BLGU or the Assessor.
      - **Tech:** FastAPI, SQLAlchemy.
  - [x] **3.2 Story: Frontend Controls for Rework & Finalization**
    - [x] **3.2.1 Atomic:** Add workflow buttons and their controlling logic to the validation page.
      - **Files:** `apps/web/src/app/(app)/assessor/submissions/[id]/page.tsx`.
      - **Dependencies:** None.
      - **Acceptance:** "Compile and Send for Rework" and "Finalize Validation" buttons are added. The rework button is disabled until every indicator has been reviewed (status set). They are clearly styled as primary actions.
      - **Tech:** React state management (`useState`).
    - [x] **3.2.2 Atomic:** Create mutations for rework and finalization actions.
      - **Files:** `apps/web/src/hooks/useAssessor.ts`.
      - **Dependencies:** Backend API (3.1.1, 3.1.2), Orval client updated.
      - **Acceptance:** Two new `useMutation` hooks are added to `useAssessor.ts` for the `rework` and `finalize` endpoints. The buttons trigger these mutations, show loading states, and display success/error notifications using `sonner`. On success, the user is redirected to the dashboard.
      - **Tech:** TanStack Query `useMutation`, `sonner` for notifications, Next.js `useRouter`.
  - [x] **3.3 Story: Background Notification Worker**
    - [x] **3.3.1 Atomic:** Implement Celery task for sending rework notifications.
      - **Files:** `apps/api/app/workers/notifications.py` (new file).
      - **Dependencies:** Celery infrastructure must be configured.
      - **Acceptance:** A Celery task is created that takes an assessment ID, retrieves the necessary BLGU user details, and handles the logic for sending a notification (e.g., logging it for now, with email integration to come later).
      - **Tech:** Celery, Redis.
