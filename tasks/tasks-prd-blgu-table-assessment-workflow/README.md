# Tasks: BLGU Table Assessment Workflow

## Overview

This task list implements **Phase 2: The BLGU Table Assessment Workflow** - the core data input
component of the SINAG governance assessment platform. This feature provides BLGU (Barangay Local
Government Unit) users with a comprehensive, metadata-driven interface to conduct their SGLGB (Seal
of Good Local Governance for Barangays) self-assessment, upload evidence (Means of Verification -
MOVs), and submit their completed assessment for review.

**Important Version History Context:**

- **Version 2.0 (November 2025):** Incorporated terminology changes (Pre-Assessment → Table
  Assessment), introduced dynamic indicator logic support via `calculation_schema`, and automated
  status determination.
- **Version 2.1 (November 2025):** Critical architectural correction - BLGUs should NOT see
  Pass/Fail/Conditional (P/F/C) status during Table Assessment. The focus shifted from "compliance
  status" to "completion status" for the BLGU user experience.

**Key Architectural Principles:**

1. **Two-Tier Validation System:**
   - **Completeness Validation (shown to BLGU):** Ensures all required fields are filled, MOVs
     uploaded, and formats are valid. Focus: "Is my submission complete?"
   - **Compliance Validation (NOT shown to BLGU):** Backend calculates Pass/Fail/Conditional status
     via `calculation_schema` for Assessor/Validator use only. Focus: "Does this meet SGLGB
     requirements?"

2. **Dynamic Form Rendering:** The system renders forms dynamically based on `form_schema` metadata,
   supporting complex field types (YES_NO, NUMERIC, DATE, TEXT, COMPOUND, MULTI_CHECKBOX,
   PERCENTAGE, CONDITIONAL).

3. **Real-Time Completion Feedback:** The UI provides immediate feedback on completeness (not
   compliance), guiding BLGUs to provide all necessary information.

4. **Backend Calculation Engine:** While P/F/C status is calculated on the backend for every data
   update, these results are NEVER exposed to BLGU API endpoints or UI.

## PRD Traceability Matrix

This section maps each functional requirement from the PRD to specific epics:

| PRD Section | Functional Requirement                                           | Epic Mapping                                                     |
| ----------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| **4.1**     | The BLGU Dashboard                                               | Epic 2.0: BLGU Dashboard with Completion Tracking                |
| **4.2**     | Assessment Interface (My Table Assessment Page)                  | Epic 3.0: Dynamic Form Rendering Engine with Completion Feedback |
| **4.3**     | MOV (Means of Verification) Uploader                             | Epic 4.0: MOV Upload System                                      |
| **4.4**     | Submission Workflow                                              | Epic 5.0: Submission & Rework Workflow                           |
| **4.5**     | Feedback and Rework Workflow                                     | Epic 5.0: Submission & Rework Workflow                           |
| **7.1**     | Database Schema (calculation_schema, form_schema, remark_schema) | Epic 1.0: Database Schema & Backend Foundation                   |
| **7.2**     | Backend Logic (Calculation Engine, Completeness Check)           | Epic 1.0: Database Schema & Backend Foundation                   |
| **7.3**     | Frontend Implementation (Form Rendering, Completeness Tracking)  | Epic 3.0: Dynamic Form Rendering Engine with Completion Feedback |
| **7.4**     | File Storage (Supabase Storage for MOVs)                         | Epic 4.0: MOV Upload System                                      |

## Epic Files

This feature is broken down into 6 epics, each in its own file:

1. [Epic 1.0: Database Schema & Backend Foundation](./epic-1-database-backend-foundation.md) _(FR
   7.1, 7.2)_
   - Implements `governance_indicators` schema with `form_schema`, `calculation_schema`, and
     `remark_schema`
   - Creates `assessment_responses` with `calculated_status` and `calculated_remark` fields
   - Implements the Calculation Engine for automatic P/F/C determination (backend only)
   - Sets up backend validation for completeness vs. compliance

2. [Epic 2.0: BLGU Dashboard with Completion Tracking](./epic-2-blgu-dashboard-completion-tracking.md)
   _(FR 4.1)_
   - Builds the "Mission Control" dashboard with progress visualization
   - Displays assessment status, completion metrics, and governance area navigation
   - Shows assessor comments for rework cases
   - Implements real-time completion percentage tracking

3. [Epic 3.0: Dynamic Form Rendering Engine with Completion Feedback](./epic-3-dynamic-form-rendering-completion-feedback.md)
   _(FR 4.2, 7.3)_
   - Creates metadata-driven form rendering engine supporting all field types
   - Implements conditional field visibility based on `form_schema`
   - Provides real-time completion feedback (NOT compliance feedback)
   - Displays technical notes and indicator guidance
   - Handles complex form requirements (compound fields, multi-part inputs)

4. [Epic 4.0: MOV Upload System](./epic-4-mov-upload-system.md) _(FR 4.3, 7.4)_
   - Implements secure file upload to Supabase Storage
   - Enforces file type and size restrictions
   - Associates MOVs with specific indicators and assessments
   - Provides upload/delete functionality with appropriate permissions

5. [Epic 5.0: Submission & Rework Workflow](./epic-5-submission-rework-workflow.md) _(FR 4.4, 4.5)_
   - Implements comprehensive completeness validation for submissions
   - Creates submission confirmation and status update workflow
   - Implements locked state after submission (read-only)
   - Handles rework cycle (single iteration during Table Assessment phase)
   - Provides specific, actionable error messages for incomplete submissions

6. [Epic 6.0: Testing & Integration](./epic-6-testing-integration.md) _(Quality Assurance)_
   - End-to-end testing of the complete BLGU workflow
   - Integration testing between frontend and backend
   - Type safety validation via Orval-generated types
   - User acceptance testing scenarios
   - Performance and security testing

## Relevant Files

This section provides a tech-stack specific file structure for reference.

### Backend Files (`apps/api`)

**Database Models:**

- `apps/api/app/db/models/governance_area.py` - Governance areas (existing)
- `apps/api/app/db/models/assessment.py` - Assessment entity with status tracking
- `apps/api/app/db/models/indicator.py` - Governance indicators with `form_schema`,
  `calculation_schema`, `remark_schema`
- `apps/api/app/db/models/response.py` - Assessment responses with `response_data`,
  `calculated_status`, `calculated_remark`
- `apps/api/app/db/models/mov.py` - MOV file metadata

**Schemas (Pydantic):**

- `apps/api/app/schemas/assessment.py` - Assessment request/response schemas
- `apps/api/app/schemas/indicator.py` - Indicator schemas with `form_schema` structure
- `apps/api/app/schemas/response.py` - Response schemas with dynamic `response_data`
- `apps/api/app/schemas/mov.py` - MOV upload/response schemas

**Services (Business Logic):**

- `apps/api/app/services/assessment_service.py` - Assessment CRUD and status management
- `apps/api/app/services/indicator_service.py` - Indicator retrieval with metadata
- `apps/api/app/services/response_service.py` - Response validation and persistence
- `apps/api/app/services/calculation_service.py` - Calculation engine for P/F/C determination
- `apps/api/app/services/completeness_service.py` - Completeness validation logic
- `apps/api/app/services/storage_service.py` - Supabase Storage integration for MOVs

**API Endpoints:**

- `apps/api/app/api/v1/assessments.py` - Assessment endpoints (BLGU-facing)
- `apps/api/app/api/v1/indicators.py` - Indicator retrieval endpoints
- `apps/api/app/api/v1/responses.py` - Response CRUD endpoints
- `apps/api/app/api/v1/movs.py` - MOV upload/delete endpoints

**Migrations:**

- `apps/api/alembic/versions/xxxx_add_calculation_schema_fields.py` - Migration for
  `calculation_schema`, `remark_schema`
- `apps/api/alembic/versions/xxxx_add_calculated_status_fields.py` - Migration for
  `calculated_status`, `calculated_remark`

### Frontend Files (`apps/web`)

**Pages (Next.js App Router):**

- `apps/web/src/app/(app)/blgu/dashboard/page.tsx` - BLGU dashboard page
- `apps/web/src/app/(app)/blgu/assessment/page.tsx` - My Table Assessment page

**Feature Components:**

- `apps/web/src/components/features/blgu/dashboard/DashboardHeader.tsx` - Dashboard header with
  status badge
- `apps/web/src/components/features/blgu/dashboard/ProgressBar.tsx` - Visual progress indicator
- `apps/web/src/components/features/blgu/dashboard/GovernanceAreaCard.tsx` - Clickable governance
  area cards
- `apps/web/src/components/features/blgu/dashboard/ReworkSummary.tsx` - Assessor comments display
- `apps/web/src/components/features/blgu/assessment/AssessmentTabs.tsx` - Governance area tabs
- `apps/web/src/components/features/blgu/assessment/IndicatorAccordion.tsx` - Accordion for
  indicators
- `apps/web/src/components/features/blgu/assessment/DynamicFormRenderer.tsx` - Core form rendering
  engine
- `apps/web/src/components/features/blgu/assessment/FieldComponents.tsx` - Individual field type
  components (YES_NO, NUMERIC, etc.)
- `apps/web/src/components/features/blgu/assessment/ConditionalFieldHandler.tsx` - Conditional
  visibility logic
- `apps/web/src/components/features/blgu/assessment/CompletenessIndicator.tsx` - Visual completion
  status
- `apps/web/src/components/features/blgu/assessment/TechnicalNotes.tsx` - Technical notes display
- `apps/web/src/components/features/blgu/assessment/MOVUploader.tsx` - File upload component
- `apps/web/src/components/features/blgu/assessment/SubmissionButton.tsx` - Submit with validation

**Hooks:**

- `apps/web/src/hooks/useAssessment.ts` - Assessment data fetching and mutations
- `apps/web/src/hooks/useIndicators.ts` - Indicator retrieval with metadata
- `apps/web/src/hooks/useResponses.ts` - Response CRUD operations
- `apps/web/src/hooks/useCompleteness.ts` - Client-side completeness tracking
- `apps/web/src/hooks/useMOVUpload.ts` - MOV upload/delete operations

**Utilities:**

- `apps/web/src/lib/form-validation.ts` - Client-side validation utilities
- `apps/web/src/lib/completeness-tracker.ts` - Completeness calculation logic
- `apps/web/src/lib/form-schema-parser.ts` - Parser for `form_schema` metadata

**Store (Zustand):**

- `apps/web/src/store/assessment-store.ts` - Client-side assessment state
- `apps/web/src/store/form-state-store.ts` - Dynamic form state management

### Shared Files (`packages/shared`)

**Auto-Generated Types (Orval):**

- `packages/shared/src/generated/schemas/assessments/index.ts` - Assessment types
- `packages/shared/src/generated/schemas/indicators/index.ts` - Indicator types with `form_schema`
- `packages/shared/src/generated/schemas/responses/index.ts` - Response types
- `packages/shared/src/generated/schemas/movs/index.ts` - MOV types
- `packages/shared/src/generated/endpoints/assessments/index.ts` - Assessment API hooks
- `packages/shared/src/generated/endpoints/indicators/index.ts` - Indicator API hooks
- `packages/shared/src/generated/endpoints/responses/index.ts` - Response API hooks
- `packages/shared/src/generated/endpoints/movs/index.ts` - MOV API hooks

### Test Files

**Backend Tests:**

- `apps/api/tests/services/test_calculation_service.py` - Calculation engine unit tests
- `apps/api/tests/services/test_completeness_service.py` - Completeness validation tests
- `apps/api/tests/services/test_response_service.py` - Response service tests
- `apps/api/tests/api/v1/test_assessments.py` - Assessment endpoint tests
- `apps/api/tests/api/v1/test_responses.py` - Response endpoint tests
- `apps/api/tests/api/v1/test_movs.py` - MOV endpoint tests

**Frontend Tests:**

- `apps/web/src/components/features/blgu/assessment/DynamicFormRenderer.test.tsx` - Form rendering
  tests
- `apps/web/src/components/features/blgu/assessment/ConditionalFieldHandler.test.tsx` - Conditional
  logic tests
- `apps/web/src/components/features/blgu/dashboard/ProgressBar.test.tsx` - Progress bar tests
- `apps/web/src/hooks/useCompleteness.test.ts` - Completeness hook tests

## Testing Notes

### Backend Testing Strategy

- **Service Layer Tests (`pytest`):**
  - Test calculation engine with all supported logic types (boolean, threshold, OR conditions,
    multi-part)
  - Test completeness validation with all field types and conditional logic
  - Test response service CRUD operations with dynamic `response_data`
  - Run with: `cd apps/api && pytest -vv --log-cli-level=DEBUG`

- **API Endpoint Tests (`pytest` with FastAPI TestClient):**
  - Test BLGU-facing endpoints do NOT return `calculated_status` or `calculated_remark`
  - Test submission validation blocks incomplete submissions with specific error messages
  - Test rework workflow (status changes, field editability)
  - Run with: `cd apps/api && pytest -vv --log-cli-level=DEBUG`

### Frontend Testing Strategy

- **Component Tests (Vitest + React Testing Library):**
  - Test dynamic form rendering for all field types (YES_NO, NUMERIC, DATE, etc.)
  - Test conditional field visibility logic
  - Test completeness indicator display
  - Test MOV uploader component (file selection, validation, delete)
  - Run with: `cd apps/web && pnpm test`

- **Integration Tests:**
  - Test full BLGU workflow: dashboard → assessment form → submission
  - Verify type safety with Orval-generated types from `@sinag/shared`
  - Test error handling and loading states
  - Verify no P/F/C status is displayed to BLGUs

### Type Safety Validation

- **Critical Step:** After any backend schema changes, run `pnpm generate-types` from the root
- Verify that `@sinag/shared` types match backend Pydantic schemas
- Ensure frontend imports use generated types exclusively

### Quality Gates

Each epic includes a dedicated **Testing & Validation** story as the final story. This story must be
completed before proceeding to the next epic, ensuring:

- All new code is tested (backend services, API endpoints, frontend components)
- Integration between layers is verified
- Type safety is maintained
- User workflows function end-to-end

## Implementation Priorities

1. **Epic 1 (Foundation):** Must be completed first - establishes database schema and backend
   calculation engine
2. **Epic 2 (Dashboard):** Can begin once Epic 1 database schema is complete
3. **Epic 3 (Form Rendering):** Depends on Epic 1 completion (requires `form_schema` metadata)
4. **Epic 4 (MOV Upload):** Can be developed in parallel with Epic 3
5. **Epic 5 (Submission):** Integrates Epics 1-4, must be last functional epic
6. **Epic 6 (Testing):** Final validation of entire feature before release

## Key Success Criteria

- BLGUs can successfully complete and submit assessments with all field types
- Completeness tracking is 95%+ accurate based on visual completion indicators
- Submission validation prevents 100% of incomplete submissions with specific error messages
- Internal P/F/C calculation accuracy is 100% (verified against manual Assessor determination)
- Complex form requirements (conditional fields, compound inputs) are properly handled
- End-to-end flow (data entry → submission → rework → resubmission) is functional and intuitive
- BLGU users understand what information is required without seeing P/F/C status

## Notes

- **Critical:** The frontend MUST NOT display Pass/Fail/Conditional status to BLGUs. All UI focuses
  on completeness, not compliance.
- **Backend Calculation:** The backend calculates P/F/C status for internal use (Assessor/Validator
  views in Phase 3), but BLGU-facing API endpoints must exclude these fields.
- **Type Generation:** Always run `pnpm generate-types` after modifying backend schemas or
  endpoints.
- **Migration Strategy:** Existing indicators need migration to add new schema fields. Consider
  creating seed data with sample `calculation_schema` for testing.
