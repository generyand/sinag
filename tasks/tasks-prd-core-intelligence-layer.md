# Tasks: Core Intelligence Layer

## PRD Traceability Matrix

This matrix maps each functional requirement from the PRD to the corresponding Epic in this task
list.

- **FR 4.1** (Database Schema Changes) → **Epic 1.0**
- **FR 4.2** (Classification Algorithm) → **Epic 2.0**
- **FR 4.3** (Display of Compliance Status) → **Epic 3.0**
- **FR 4.4** (Gemini API Integration) → **Epic 4.0**
- **FR 4.5** (API Endpoints) → **Epic 2.0, 4.0**

## Relevant Files

### Backend Files

- `apps/api/app/db/enums.py` - ComplianceStatus enum added ✓
- `apps/api/app/db/models/assessment.py` - Intelligence fields added to Assessment model ✓
- `apps/api/alembic/versions/9feee8a18b32_add_intelligence_fields_to_assessments.py` - Database
  migration created and tested ✓
- `apps/api/app/services/intelligence_service.py` - Intelligence service with classification
  algorithm ✓
- `apps/api/app/services/assessment_service.py` - Added get_all_validated_assessments method ✓
- `apps/api/app/services/assessor_service.py` - Integrated classification into finalization ✓
- `apps/api/app/api/v1/assessor.py` - Manual classification endpoint ✓
- `apps/api/app/api/v1/assessments.py` - List assessments endpoint and generate insights endpoint
  for MLGOO ✓
- `apps/api/app/core/config.py` - Gemini API key configuration added ✓
- `apps/api/pyproject.toml` - google-generativeai package added ✓
- `apps/api/app/core/celery_app.py` - Registered intelligence_worker in Celery app ✓
- `apps/api/app/workers/intelligence_worker.py` - Celery worker for Gemini processing with caching
  and retries ✓

### Frontend Files

- `apps/web/src/app/(app)/reports/page.tsx` - Reports list page with compliance badges ✓
- `apps/web/src/app/(app)/mlgoo/reports/page.tsx` - MLGOO reports page integrated ✓
- `apps/web/src/app/(app)/reports/[id]/page.tsx` - Detailed report page with area results and AI
  insights ✓
- `apps/web/src/components/features/reports/ComplianceBadge.tsx` - Compliance badge component ✓
- `apps/web/src/components/features/reports/AreaResultsDisplay.tsx` - Area results component ✓
- `apps/web/src/components/features/reports/InsightsGenerator.tsx` - AI insights generator button
  component ✓
- `apps/web/src/components/features/reports/AIInsightsDisplay.tsx` - Display Gemini insights
  component ✓
- `apps/web/src/hooks/useIntelligence.ts` - Hook for intelligence operations with polling support ✓

### Tests

- `apps/api/tests/test_classification_algorithm.py` - Classification algorithm tests ✓
- `apps/api/tests/test_gemini_prompt.py` - Gemini prompt building tests ✓
- `apps/api/tests/test_gemini_service.py` - Gemini API integration tests with mocking ✓
- `apps/api/tests/test_intelligence_worker.py` - Celery background task tests ✓
- `apps/api/tests/conftest.py` - Added fixtures for mock assessments and users ✓

### Testing Notes

- **Backend Testing:** Place Pytest tests in `apps/api/tests/`. Test the classification algorithm
  with various pass/fail combinations. Run with `pytest -vv --log-cli-level=DEBUG`.
- **Frontend Testing:** Place test files alongside components (`.test.tsx`). Use Vitest and React
  Testing Library.
- **API Integration Testing:** Mock Gemini API calls in tests. Include tests for timeout and error
  scenarios.
- **Type Safety:** Ensure all new database enums and fields are reflected in the generated OpenAPI
  spec and TypeScript types.

## Tasks

### Three-Tier Structure: Epic → Story → Atomic

---

- [x] **1.0 Epic: Database Schema Extension for Intelligence Layer** _(FR 4.1)_
  - [x] **1.1 Story: Add ComplianceStatus Enum**
    - [x] **1.1.1 Atomic:** Add `ComplianceStatus` enum to `apps/api/app/db/enums.py`
      - **Files:** `apps/api/app/db/enums.py`
      - **Dependencies:** None
      - **Acceptance:** New enum `ComplianceStatus` exists with values `PASSED` and `FAILED`

  - [x] **1.2 Story: Extend Assessment Model**
    - [x] **1.2.1 Atomic:** Add `final_compliance_status`, `area_results`, and `ai_recommendations`
          columns to Assessment model
      - **Files:** `apps/api/app/db/models/assessment.py`
      - **Dependencies:** 1.1.1
      - **Acceptance:** Assessment model has three new nullable fields with appropriate types

  - [x] **1.3 Story: Create Database Migration**
    - [x] **1.3.1 Atomic:** Generate Alembic migration for new Assessment columns
      - **Files:** `apps/api/alembic/versions/xxxxx_add_intelligence_fields_to_assessments.py`
      - **Dependencies:** 1.2.1
      - **Acceptance:** Migration file created with correct column definitions
      - **Commands:**
        `cd apps/api && alembic revision --autogenerate -m "Add intelligence fields to assessments"`

    - [x] **1.3.2 Atomic:** Review and test migration script
      - **Files:** Migration file from 1.3.1
      - **Dependencies:** 1.3.1
      - **Acceptance:** Migration upgrades and downgrades without errors
      - **Commands:** Test both `alembic upgrade head` and `alembic downgrade -1`

---

- [x] **2.0 Epic: Classification Algorithm Implementation** _(FR 4.2, 4.5)_
  - [x] **2.1 Story: Query Validation Data**
    - [x] **2.1.1 Atomic:** Create method to fetch all assessment_responses for an assessment
          filtered by validation_status
      - **Files:** `apps/api/app/services/intelligence_service.py`
      - **Dependencies:** 1.2.1
      - **Acceptance:** Method returns all responses with `validation_status` of `Pass`, grouped by
        governance area

    - [x] **2.1.2 Atomic:** Create method to identify which governance areas have passed (all
          indicators must pass)
      - **Files:** `apps/api/app/services/intelligence_service.py`
      - **Dependencies:** 2.1.1
      - **Acceptance:** Method returns dictionary mapping area name to pass/fail status

  - [x] **2.2 Story: Implement "3+1" Rule Logic**
    - [x] **2.2.1 Atomic:** Implement logic to determine if all three Core areas have passed
      - **Files:** `apps/api/app/services/intelligence_service.py`
      - **Dependencies:** 2.1.2
      - **Acceptance:** Method correctly identifies if all Core areas (Financial, Disaster Prep,
        Safety/Peace/Order) have passed

    - [x] **2.2.2 Atomic:** Implement logic to determine if at least one Essential area has passed
      - **Files:** `apps/api/app/services/intelligence_service.py`
      - **Dependencies:** 2.1.2
      - **Acceptance:** Method correctly identifies if at least one Essential area has passed

    - [x] **2.2.3 Atomic:** Implement overall compliance determination using "3+1" rule
      - **Files:** `apps/api/app/services/intelligence_service.py`
      - **Dependencies:** 2.2.1, 2.2.2
      - **Acceptance:** Returns `PASSED` if all Core areas pass AND at least one Essential area
        passes; otherwise returns `FAILED`

  - [x] **2.3 Story: Store Classification Results**
    - [x] **2.3.1 Atomic:** Create method to save final_compliance_status and area_results to
          database
      - **Files:** `apps/api/app/services/intelligence_service.py`
      - **Dependencies:** 2.2.3, 1.2.1
      - **Acceptance:** Method updates assessment record with compliance status and area results
        JSONB

  - [x] **2.4 Story: Integrate into Finalization Process**
    - [x] **2.4.1 Atomic:** Automatically trigger classification algorithm when assessment is
          finalized
      - **Files:** `apps/api/app/services/assessor_service.py`,
        `apps/api/app/services/intelligence_service.py`
      - **Dependencies:** 2.3.1
      - **Acceptance:** When "Finalize Validation" is called, classification algorithm runs and
        stores results

    - [x] **2.4.2 Atomic:** Create API endpoint for manual classification (for testing)
      - **Files:** `apps/api/app/api/v1/assessor.py`
      - **Dependencies:** 2.3.1
      - **Acceptance:** `POST /api/v1/assessor/assessments/{id}/classify` endpoint exists and
        requires authentication

  - [x] **2.5 Story: Unit Tests for Classification Logic**
    - [x] **2.5.1 Atomic:** Create test cases covering all possible "3+1" combinations
      - **Files:** `apps/api/tests/test_classification_algorithm.py`
      - **Dependencies:** 2.2.3
      - **Acceptance:** Tests verify 100% of possible pass/fail combinations across all 6 areas

---

- [x] **3.0 Epic: Display Compliance Status** _(FR 4.3)_
  - [x] **3.1 Story: MLGOO Dashboard Compliance Badge**
    - [x] **3.1.1 Atomic:** Create ComplianceBadge component with PASSED/FAILED states
      - **Files:** `apps/web/src/components/features/reports/ComplianceBadge.tsx`
      - **Dependencies:** None
      - **Acceptance:** Component renders styled badge with appropriate colors (green for PASSED,
        red for FAILED)

    - [x] **3.1.2 Atomic:** Update MLGOO dashboard to display compliance badge next to barangay name
      - **Files:** `apps/web/src/app/(app)/mlgoo/reports/page.tsx`
      - **Dependencies:** 3.1.1
      - **Acceptance:** Dashboard shows compliance badge for each assessment in the list

    - [x] **3.1.3 Atomic:** Make compliance badge clickable to navigate to detailed report
      - **Files:** `apps/web/src/components/features/reports/ComplianceBadge.tsx`
      - **Dependencies:** 3.1.1
      - **Acceptance:** Clicking badge navigates to detailed assessment report page

  - [x] **3.2 Story: Area Results Display**
    - [x] **3.2.1 Atomic:** Create AreaResultsDisplay component to show individual area statuses
      - **Files:** `apps/web/src/components/features/reports/AreaResultsDisplay.tsx`
      - **Dependencies:** None
      - **Acceptance:** Component displays area results in readable format (table or grid with
        icons)

    - [x] **3.2.2 Atomic:** Add AreaResultsDisplay to detailed report page
      - **Files:** `apps/web/src/app/(app)/reports/[id]/page.tsx`
      - **Dependencies:** 3.2.1
      - **Acceptance:** Detailed report page shows area-by-area compliance breakdown

---

- [ ] **4.0 Epic: Gemini API Integration** _(FR 4.4, 4.5)_
  - [x] **4.1 Story: Gemini Service Setup**
    - [x] **4.1.1 Atomic:** Add Gemini API key to configuration
      - **Files:** `apps/api/app/core/config.py`
      - **Dependencies:** None
      - **Acceptance:** New setting `GEMINI_API_KEY` exists and reads from environment variable

    - [x] **4.1.2 Atomic:** Install Google AI Python SDK
      - **Files:** `apps/api/pyproject.toml`
      - **Dependencies:** None
      - **Acceptance:** `google-generativeai` package is added to dependencies
      - **Command:** `cd apps/api && uv add google-generativeai`

  - [x] **4.2 Story: Build Gemini Prompt**
    - [x] **4.2.1 Atomic:** Create method to build structured prompt from failed indicators
      - **Files:** `apps/api/app/services/intelligence_service.py`
      - **Dependencies:** 4.1.1
      - **Acceptance:** Method creates comprehensive prompt with barangay name, year, failed
        indicators, and assessor comments

  - [x] **4.3 Story: Call Gemini API**
    - [x] **4.3.1 Atomic:** Implement method to call Gemini API and parse response
      - **Files:** `apps/api/app/services/intelligence_service.py`
      - **Dependencies:** 4.1.2, 4.2.1
      - **Acceptance:** Method successfully calls API and returns parsed JSON with `summary`,
        `recommendations`, and `capacity_development_needs` keys

    - [x] **4.3.2 Atomic:** Implement error handling for API failures and timeouts
      - **Files:** `apps/api/app/services/intelligence_service.py`
      - **Dependencies:** 4.3.1
      - **Acceptance:** Method catches exceptions and returns appropriate error messages

    - [x] **4.3.3 Atomic:** Implement caching logic (check if ai_recommendations already exists)
      - **Files:** `apps/api/app/services/intelligence_service.py`
      - **Dependencies:** 4.3.1
      - **Acceptance:** Method checks database first and only calls API if recommendations don't
        exist

  - [x] **4.4 Story: Store and Retrieve Recommendations**
    - [x] **4.4.1 Atomic:** Create method to save Gemini response to ai_recommendations column
      - **Files:** `apps/api/app/services/intelligence_service.py`
      - **Dependencies:** 4.3.1, 1.2.1
      - **Acceptance:** Method stores JSON response in database

  - [x] **4.5 Story: API Endpoint for Insights Generation**
    - [x] **4.5.1 Atomic:** Create API endpoint `POST /api/v1/assessments/{id}/generate-insights`
          that dispatches a Celery task
      - **Files:** `apps/api/app/api/v1/assessments.py`
      - **Dependencies:** 4.8.1
      - **Acceptance:** Endpoint requires authentication, validates assessment status, dispatches
        Celery task using `generate_insights_task.delay(assessment_id)`, and immediately returns
        `202 Accepted` HTTP status

  - [x] **4.6 Story: Frontend Insights Generator**
    - [x] **4.6.1 Atomic:** Create InsightsGenerator component with "Generate AI-Powered Insights"
          button
      - **Files:** `apps/web/src/components/features/reports/InsightsGenerator.tsx`
      - **Dependencies:** None
      - **Acceptance:** Component displays button that is enabled only when assessment is validated

    - [x] **4.6.2 Atomic:** Create API hook for generating insights with polling support
      - **Files:** `apps/web/src/hooks/useIntelligence.ts`
      - **Dependencies:** 4.5.1
      - **Acceptance:** Hook provides `generateInsights` function that expects 202 Accepted
        response, initiates polling every 5 seconds using a query refetch mechanism to check for
        ai_recommendations field, automatically stops polling when data appears

  - [x] **4.7 Story: Display AI Insights**
    - [x] **4.7.1 Atomic:** Create AIInsightsDisplay component to render Gemini response
      - **Files:** `apps/web/src/components/features/reports/AIInsightsDisplay.tsx`
      - **Dependencies:** None
      - **Acceptance:** Component displays summary, recommendations list, and capacity development
        needs

    - [x] **4.7.2 Atomic:** Integrate AIInsightsDisplay into report page with loading and error
          states
      - **Files:** `apps/web/src/app/(app)/reports/[id]/page.tsx`
      - **Dependencies:** 4.6.1, 4.6.2, 4.7.1
      - **Acceptance:** Report page shows persistent "Generating..." state during polling, displays
        insights when ready, shows error message on failure

  - [x] **4.8 Story: Background Worker for Insight Generation**
    - [x] **4.8.1 Atomic:** Create Celery task `generate_insights_task` that calls
          intelligence_service and saves results
      - **Files:** `apps/api/app/workers/intelligence_worker.py` (new file)
      - **Dependencies:** 4.3.1, 4.4.1
      - **Acceptance:** Celery task accepts assessment_id, calls Gemini API via
        intelligence_service, handles errors/retries, and saves to ai_recommendations column

    - [x] **4.8.2 Atomic:** Register Celery task with decorator and implement error handling with
          retries
      - **Files:** `apps/api/app/workers/intelligence_worker.py`
      - **Dependencies:** 4.8.1
      - **Acceptance:** Task has retry logic (max 3 attempts with exponential backoff) and logs
        errors appropriately

  - [x] **4.9 Story: Testing Gemini Integration** (Backend complete, frontend tests pending setup)
    - [x] **4.9.1 Atomic:** Create unit tests for Gemini prompt building
      - **Files:** `apps/api/tests/test_gemini_prompt.py`
      - **Dependencies:** 4.2.1
      - **Acceptance:** Tests verify prompt structure and content

    - [x] **4.9.2 Atomic:** Create integration tests for Gemini API calls (mocked)
      - **Files:** `apps/api/tests/test_gemini_service.py`
      - **Dependencies:** 4.3.1
      - **Acceptance:** Tests verify API call, response parsing, and caching logic

    - [x] **4.9.3 Atomic:** Create tests for Celery background task
      - **Files:** `apps/api/tests/test_intelligence_worker.py`
      - **Dependencies:** 4.8.1, 4.8.2
      - **Acceptance:** Tests verify task execution, error handling, validation logic, and database
        persistence

    - [~] **4.9.4 Atomic:** Create frontend tests for InsightsGenerator component and polling
      behavior
      - **Files:** `apps/web/src/components/features/reports/InsightsGenerator.test.tsx`
      - **Dependencies:** 4.6.1, 4.6.2
      - **Acceptance:** Tests verify button states, polling logic, and error handling
      - **Note:** Deferred - requires Vitest and React Testing Library setup (frontend testing
        infrastructure not yet established)

---

## Implementation Notes

### Critical Implementation Order

1. **Implement Epic 1.0 first** (Database schema changes must be deployed before any intelligence
   features are built)
2. **Implement Epic 2.0 second** (Classification algorithm is prerequisite for Epic 4.0)
3. **Implement Epic 3.0 third** (Display features depend on Epic 2.0 data)
4. **Implement Epic 4.0 last** (Gemini integration consumes output from Epic 2.0)

### Key Considerations

- **Performance:** The classification algorithm must complete in under 5 seconds to ensure real-time
  user experience
- **Asynchronous Processing:** The Gemini API integration uses Celery background tasks for
  resilience. The API endpoint dispatches a task and immediately returns `202 Accepted`, while the
  frontend polls for results.
- **Cost Management:** Always check if `ai_recommendations` exists before calling Gemini API to
  avoid duplicate API calls
- **Error Handling:** Both classification and Gemini integration must handle failures gracefully
  without breaking the user workflow. Celery tasks include retry logic (max 3 attempts with
  exponential backoff).
- **User Experience:** The frontend must provide persistent "Generating..." feedback during polling,
  allowing users to navigate away and return later to see results.
- **Testing:** Create comprehensive test coverage for the "3+1" logic to verify 100% accuracy across
  all possible combinations. Include tests for Celery task dispatch and polling behavior.
- **Type Safety:** Ensure all database changes are reflected in the OpenAPI spec and regenerated
  TypeScript types using `pnpm generate`

### Environment Variables Required

Add to `.env` file in `apps/api/`:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```
