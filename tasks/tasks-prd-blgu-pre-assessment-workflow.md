## PRD Traceability Matrix

- **FR 4.1 (BLGU Dashboard)** → Epic 2.0
- **FR 4.2 (Assessment Interface)** → Epic 2.0, Epic 3.0
- **FR 4.3 (MOV Uploader)** → Epic 3.0
- **FR 4.4 (Submission Workflow)** → Epic 4.0
- **FR 4.5 (Rework Workflow)** → Epic 4.0
- **Technical Considerations (Database & API)** → Epic 1.0

## Relevant Files

- **Backend Models:**
  - `apps/api/app/db/models/governance_area.py` (updated with `Indicator` model including
    `form_schema` JSON field)
  - `apps/api/app/db/models/assessment.py` (created with `Assessment`, `AssessmentResponse`, `MOV`,
    `FeedbackComment` models)
- **Database Migration:**
  - `apps/api/alembic/versions/de8ece1d7614_add_dynamic_assessment_schema_with_.py` (generated
    migration file)
- **Backend Schemas:**
  - `apps/api/app/schemas/assessment.py` (created with comprehensive assessment-related Pydantic
    schemas)
- **Backend Services:**
  - `apps/api/app/services/assessment_service.py` (created with comprehensive business logic for
    assessment management)
- **Backend API Routes:**
  - `apps/api/app/api/v1/assessments.py` (created with comprehensive assessment endpoints)
- **Frontend Pages:**
  - `apps/web/src/app/(app)/blgu/dashboard/page.tsx`
  - `apps/web/src/app/(app)/blgu/assessments/page.tsx`
- **Frontend Components:**
  - `apps/web/src/components/features/dashboard/` (various new dashboard components)
  - `apps/web/src/components/features/assessments/` (various new assessment components, including a
    dynamic form renderer)
  - `apps/web/src/components/shared/FileUploader.tsx`
- **Frontend Hooks:**
  - `apps/web/src/hooks/useDashboard.ts`
  - `apps/web/src/hooks/useAssessment.ts`
- **Shared Types:**
  - `packages/shared/src/generated/schemas/assessment/index.ts` (auto-generated)

## Summary of Changes for Handling Indicator Hierarchy

### Backend Changes

1. Modify the `indicators` table schema to add `parent_id`:
   - Format: integer, Type: number
   - Constraints: Foreign key referencing `indicators.id`, nullable (top-level allowed)
2. Update SQLAlchemy `Indicator` model:
   - Add `parent_id` column
   - Add self-referencing relationships: `parent` and `children`
3. Generate and apply Alembic migration for the new column and FK constraint

### Backend API Schema & Logic

1. Create recursive Pydantic schema `IndicatorRead` with `children: list[IndicatorRead]`
2. Update service logic to load indicators with children using `selectinload`
3. Return only top-level indicators (`parent_id is None`) with nested `children`

### Frontend Changes

1. Support recursive rendering of indicators in React:
   - Map through top-level indicators and render a `RecursiveIndicator` per item
   - Recursively render `children` with indentation via a `level` prop

### Testing Notes

- **Backend Testing:** Place Pytest tests in `apps/api/tests/`. Test the new `assessment_service`
  and API endpoints in `assessments.py`. Focus on validating the dynamic `response_data` against the
  `form_schema`.
- **Frontend Testing:** Place component tests alongside the new components (e.g.,
  `DynamicForm.test.tsx`). Use Vitest and React Testing Library to test form rendering logic and
  submission workflows.
- **Type Safety:** Ensure the auto-generated types from `@sinag/shared` are used for all data
  exchange between the frontend and backend.

## Tasks

### Three-Tier Structure: Epic → Story → Atomic

- [ ] **1.0 Epic: Backend Foundation for Dynamic Assessments** _(FR 7)_
  - [x] **1.1 Story: Database Schema for Dynamic Assessments**
    - [x] **1.1.1 Atomic:** Update `Indicator` model in `governance_area.py` to include
          `form_schema: Mapped[dict] = mapped_column(JSONB, nullable=False)`.
      - **Files:** `apps/api/app/db/models/governance_area.py`
      - **Acceptance:** The `Indicator` model has a non-nullable `form_schema` column of type
        `JSONB`.
    - [x] **1.1.2 Atomic:** Create new models for `Assessment`, `AssessmentResponse`, `MOV`, and
          `FeedbackComment` in a new file.
      - **Files:** `apps/api/app/db/models/assessment.py`
      - **Acceptance:** `AssessmentResponse` model must include a
        `response_data: Mapped[dict] = mapped_column(JSON, nullable=True)` to store dynamic form
        data. Models for tracking overall assessment status, file uploads (MOVs), and feedback are
        created with correct relationships.
    - [x] **1.1.3 Atomic:** Generate a new Alembic migration script for the database changes.
      - **Files:** `apps/api/alembic/versions/de8ece1d7614_add_dynamic_assessment_schema_with_.py`
      - **Acceptance:** The auto-generated migration script correctly reflects the changes to the
        `Indicator` model and the creation of the new assessment-related tables.
    - [x] **1.1.4 Atomic:** Apply the migration to the local database.
      - **Command:** `cd apps/api && alembic upgrade head`
      - **Acceptance:** The database schema is successfully updated.
  - [x] **1.2 Story: API Endpoints for Managing Assessments**
    - [x] **1.2.1 Atomic:** Create Pydantic schemas for assessment data in a new file.
      - **Files:** `apps/api/app/schemas/assessment.py`
      - **Acceptance:** Schemas for `AssessmentResponseCreate`, `AssessmentResponseUpdate`, and a
        main `Assessment` schema (including indicators with their `form_schema`) are defined.
    - [x] **1.2.2 Atomic:** Implement `assessment_service.py` with core business logic.
      - **Files:** `apps/api/app/services/assessment_service.py`
      - **Acceptance:** Service contains functions like `get_assessment_for_blgu`,
        `update_assessment_response`, and `submit_assessment`. The `update` function must validate
        the incoming `response_data` JSON against the indicator's `form_schema`.
    - [x] **1.2.3 Atomic:** Create the `GET /api/v1/assessments/my-assessment` endpoint.
      - **Files:** `apps/api/app/api/v1/assessments.py`
      - **Acceptance:** Endpoint returns the full assessment data for the logged-in BLGU user,
        including all governance areas, indicators, `form_schema` for each indicator, and any
        existing `response_data`.
    - [x] **1.2.4 Atomic:** Create the `PUT /api/v1/assessments/responses/{response_id}` endpoint.
      - **Files:** `apps/api/app/api/v1/assessments.py`
      - **Acceptance:** Endpoint accepts a payload with `response_data` and updates the
        corresponding `AssessmentResponse` in the database after validation in the service layer.

- [x] **2.0 Epic: BLGU Dashboard & Assessment Page UI** _(FR 4.1, 4.2)_
  - [x] **2.1 Story: Implement BLGU "Mission Control" Dashboard**
    - [x] **2.1.1 Atomic:** Create the main BLGU dashboard page component.
      - **Files:** `apps/web/src/app/(app)/blgu/dashboard/page.tsx`
      - **Acceptance:** The page is created within the correct route group and serves as the
        container for all dashboard widgets.
    - [x] **2.1.2 Atomic:** Create a `useDashboard` hook to fetch all necessary data for the
          dashboard.
      - **Files:** `apps/web/src/hooks/useDashboard.ts`
      - **Acceptance:** Hook uses TanStack Query to fetch assessment status, progress, and
        governance area list from the backend.
    - [x] **2.1.3 Atomic:** Build dashboard components for progress bar, status badge, and
          governance area links.
      - **Files:** `apps/web/src/components/features/dashboard/`
      - **Acceptance:** Reusable components are created to display key dashboard information fetched
        by the `useDashboard` hook.
  - [x] **2.2 Story: Build the Main Assessment Interface**
    - [x] **2.2.1 Atomic:** Create the main "My Assessment" page component.
      - **Files:** `apps/web/src/app/(app)/blgu/assessments/page.tsx`
      - **Acceptance:** The page component is set up to display the assessment interface.
    - [x] **2.2.2 Atomic:** Create a `useAssessment` hook to fetch the full assessment data
          structure.
      - **Files:** `apps/web/src/hooks/useAssessment.ts`
      - **Acceptance:** The hook fetches all governance areas, indicators, `form_schema`, and
        existing responses for the BLGU user.
    - [x] **2.2.3 Atomic:** Implement the tabbed navigation for Governance Areas.
      - **Files:** `apps/web/src/components/features/assessments/AssessmentTabs.tsx`
      - **Acceptance:** A user can click through tabs, each corresponding to a governance area.
    - [x] **2.2.4 Atomic:** Implement the accordion UI for indicators within each tab.
      - **Files:** `apps/web/src/components/features/assessments/IndicatorAccordion.tsx`
      - **Acceptance:** Each indicator is displayed in an accordion item that can be expanded to
        show the form.

- [x] **3.0 Epic: Dynamic Indicator Form Rendering & MOV Upload** _(FR 4.2, 4.3)_
  - [x] **3.1 Story: Develop a Dynamic Form Renderer**
    - [x] **3.1.1 Atomic:** Create a `DynamicIndicatorForm` component that renders inputs based on
          JSON schema.
      - **Files:** `apps/web/src/components/features/assessments/DynamicIndicatorForm.tsx`
      - **Acceptance:** The component accepts an indicator's `form_schema` and `response_data` as
        props. It correctly renders `RadioGroup`, `Input`, `DatePicker`, etc., based on the schema
        definition.
    - [x] **3.1.2 Atomic:** Implement a `useUpdateResponse` mutation hook.
      - **Files:** `apps/web/src/hooks/useAssessment.ts`
      - **Acceptance:** The hook provides a function to call the `PUT /assessments/responses/{id}`
        endpoint. It should be configured to automatically save form data on change (debounced).
    - [x] **3.1.3 Atomic:** Integrate the `DynamicIndicatorForm` into the `IndicatorAccordion`.
      - **Files:** `apps/web/src/components/features/assessments/IndicatorAccordion.tsx`
      - **Acceptance:** When an indicator is expanded, its dynamic form is displayed, populated with
        existing data, and is fully interactive.
  - [x] **3.2 Story: Implement MOV Uploader and Management**
    - [x] **3.2.1 Atomic:** Create backend API endpoints for uploading and deleting MOVs.
      - **Files:** `apps/api/app/api/v1/assessments.py`,
        `apps/api/app/services/assessment_service.py`
      - **Acceptance:** `POST /responses/{id}/movs` and `DELETE /movs/{mov_id}` endpoints are
        created. The service logic handles file uploads to Supabase Storage and updates the `movs`
        table.
    - [x] **3.2.2 Atomic:** Enhance the `FileUploader` shared component for MOV management.
      - **Files:** `apps/web/src/components/shared/FileUploader.tsx`
      - **Acceptance:** The component is updated to show a list of already uploaded files with
        delete buttons, and it enforces file type and size restrictions.
    - [x] **3.2.3 Atomic:** Create `useUploadMov` and `useDeleteMov` mutation hooks.
      - **Files:** `apps/web/src/hooks/useAssessment.ts`
      - **Acceptance:** Hooks are created to interact with the new MOV endpoints and invalidate
        relevant queries on success to refresh the UI.
    - [x] **3.2.4 Atomic:** Integrate the MOV uploader into the `IndicatorAccordion`.
      - **Files:** `apps/web/src/components/features/assessments/IndicatorAccordion.tsx`
      - **Acceptance:** Each indicator has a fully functional file upload and management section.

- [ ] **4.0 Epic: Assessment Submission & Rework Workflow** _(FR 4.4, 4.5)_
  - [ ] **4.1 Story: Implement Assessment Submission Workflow**
    - [x] **4.1.1 Atomic:** Create the `POST /assessments/{id}/submit` backend endpoint.
      - **Files:** `apps/api/app/api/v1/assessments.py`,
        `apps/api/app/services/assessment_service.py`
      - **Acceptance:** Endpoint runs the "Preliminary Compliance Check" (no `YES` answers without
        MOVs). If valid, it updates the assessment status to `Submitted for Review`. If invalid, it
        returns a 400 error with details of the failed indicators.
    - [x] **4.1.2 Atomic:** Add a "Submit for Review" button and `useSubmitAssessment` mutation hook
          on the frontend.
      - **Files:** `apps/web/src/app/(app)/blgu/assessments/page.tsx`,
        `apps/web/src/hooks/useAssessment.ts`
      - **Acceptance:** The button triggers the mutation. On success, a confirmation modal is shown
        and the user is redirected. On failure, the specific indicators that failed the check are
        highlighted in the UI.
    - [x] **4.1.3 Atomic:** Implement the "locked" (read-only) state for the assessment UI.
      - **Files:** `apps/web/src/components/features/assessments/`
      - **Acceptance:** When the assessment status is `Submitted for Review` or `Validated`, all
        form inputs, uploader buttons, and delete icons are disabled.
  - [ ] **4.2 Story: Implement Rework Notification and Editing**
    - [x] **4.2.1 Atomic:** Update backend `GET /assessments/my-assessment` endpoint to include
          rework data.
      - **Files:** `apps/api/app/api/v1/assessments.py`
      - **Acceptance:** The endpoint response includes assessor feedback comments and a flag on each
        `AssessmentResponse` indicating if it requires rework.
    - [x] **4.2.2 Atomic:** Display rework comments and status on the BLGU dashboard.
      - **Files:** `apps/web/src/app/(app)/blgu/dashboard/page.tsx`
      - **Acceptance:** If the assessment status is `Needs Rework`, a new section appears on the
        dashboard summarizing assessor feedback.
    - [x] **4.2.3 Atomic:** Conditionally enable editing for flagged indicators.
      - **Files:** `apps/web/src/components/features/assessments/`
      - **Acceptance:** When the assessment status is `Needs Rework`, only the specific indicators
        flagged for rework are editable. All others remain in a read-only state.
    - [x] **4.2.4 Atomic:** Allow resubmission after rework is complete.
      - **Files:** `apps/web/src/app/(app)/blgu/assessments/page.tsx`
      - **Acceptance:** The "Submit for Review" button becomes active again during the
        `Needs Rework` phase and functions as before.

- [ ] **5.0 Epic: Indicator Hierarchy (Parent/Child) Support** _(FR 4.2, Technical Considerations)_

- [x] **5.1 Story: Database & Model Support for Hierarchy**
  - [x] **5.1.1 Atomic:** Add `parent_id` to `indicators` table with FK to `indicators.id`
        (nullable).
    - **Files:** `apps/api/app/db/models/governance_area.py`, `apps/api/alembic/versions/<new>.py`
    - **Acceptance:** Column exists, FK constraint enforced, null allowed for top-level.
  - [x] **5.1.2 Atomic:** Update `Indicator` SQLAlchemy model with `parent_id`, `parent`, and
        `children` relationships.
    - **Files:** `apps/api/app/db/models/governance_area.py`
    - **Acceptance:** Self-referencing relationships work; ORM can access `children` per indicator.
  - [x] **5.1.3 Atomic:** Generate and apply Alembic migration for `parent_id` and FK.
    - **Command:** `cd apps/api && alembic upgrade head`
    - **Acceptance:** DB schema updated with column and constraint.

  - [ ] **5.2 Story: API Schemas and Service Logic for Nested Indicators**
    - [x] **5.2.1 Atomic:** Add recursive `IndicatorRead` Pydantic schema with `children` and update
          forward refs.
      - **Files:** `apps/api/app/schemas/assessment.py` (or appropriate schema module)
      - **Acceptance:** Serialized indicator includes nested `children` array; validation passes.
    - [x] **5.2.2 Atomic:** Load indicators recursively using `selectinload` and return only
          top-level indicators.
      - **Files:** `apps/api/app/services/assessment_service.py`
      - **Acceptance:** `get_assessment_for_blgu` returns nested indicators; no N+1 queries observed
        in logs.
    - [x] **5.2.3 Atomic:** Update `GET /api/v1/assessments/my-assessment` to return nested
          indicators.
      - **Files:** `apps/api/app/api/v1/assessments.py`
      - **Acceptance:** Response contains only top-level indicators, each with a fully populated
        `children` tree.

  - [ ] **5.3 Story: Frontend Recursive Rendering of Indicators**
    - [x] **5.3.1 Atomic:** Update `useAssessment` to handle nested `indicators` structure.
      - **Files:** `apps/web/src/hooks/useAssessment.ts`
      - **Acceptance:** Types and data access updated; no runtime errors when reading `children`.
    - [x] **5.3.2 Atomic:** Implement `RecursiveIndicator` rendering with indentation via `level`
          prop.
      - **Files:** `apps/web/src/components/features/assessments/IndicatorAccordion.tsx` (or new
        component), `apps/web/src/components/features/assessments/DynamicIndicatorForm.tsx`
      - **Acceptance:** UI displays nested indicators; expanding parents reveals nested children
        with proper indentation.
    - [x] **5.3.3 Atomic:** Ensure MOV uploader and dynamic form work at any nesting level.
      - **Files:** `apps/web/src/components/features/assessments/*`,
        `apps/web/src/components/shared/FileUploader.tsx`
      - **Acceptance:** Users can edit and upload MOVs for both parent and child indicators;
        autosave still functions.
