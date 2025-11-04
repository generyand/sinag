# Epic 4.0: AI Recommendations Display & Tracking

> **PRD Reference:** FR-18 to FR-22
> **User Stories:** US-5, US-8
> **Duration:** 2 weeks
> **Status:** ✅ Completed - 8 stories → 26 atomic tasks

**[← Back to Overview](./README.md)**

---

## Epic Overview

**Description:** Build a UI to display Gemini-generated AI recommendations with rich formatting, priority indicators, and implementation status tracking allowing MLGOO-DILG to monitor progress on capacity development initiatives.

**Success Criteria:**
- Recommendations display in collapsible sections by governance area
- Visual priority indicators (High/Medium/Low) and action items are highlighted
- MLGOO-DILG can update recommendation status (Not Started/In Progress/Completed/Not Applicable)
- Status changes are timestamped and logged in database
- PDF export generates formatted report suitable for official documentation
- RBAC enforced: MLGOO-DILG sees all, BLGUs see only their barangay's recommendations

---

  - [ ] **4.1 Story: Database Schema for Recommendation Tracking**

    - **Scope:** Create `recommendation_tracking` table for status management
    - **Duration:** 1 day
    - **Dependencies:** Epic 6.0 (migrations setup)
    - **Files:**
      - `apps/api/app/db/models/recommendation_tracking.py`
      - `apps/api/alembic/versions/xxxx_add_recommendation_tracking.py`
    - **Tech:** SQLAlchemy, Alembic
    - **Success Criteria:**

      - Model defines: id, assessment_id (FK), governance_area_code (FK), recommendation_text, priority, status, updated_by (FK), updated_at, created_at
      - Migration creates table with indexes on assessment_id, status
      - `alembic upgrade head` runs successfully

    - [ ] **4.1.1 Atomic:** Create recommendation_tracking SQLAlchemy model

      - **Files:** `apps/api/app/db/models/recommendation_tracking.py`
      - **Dependencies:** None
      - **Acceptance:**
        - Create `RecommendationTracking` model class inheriting from Base
        - Columns: `id` (Integer, PK), `assessment_id` (ForeignKey to assessments), `governance_area_code` (ForeignKey), `recommendation_text` (Text), `priority` (Enum: High/Medium/Low), `status` (Enum: Not Started/In Progress/Completed/Not Applicable), `updated_by` (ForeignKey to users), `updated_at` (DateTime), `created_at` (DateTime, default=now)
        - Relationships: `assessment`, `governance_area`, `updater` (user)
        - `__tablename__ = "recommendation_tracking"`
        - Model exports at module level
      - **Tech:** SQLAlchemy, Python Enum

    - [ ] **4.1.2 Atomic:** Create Alembic migration for recommendation_tracking table

      - **Files:** `apps/api/alembic/versions/xxxx_add_recommendation_tracking.py`
      - **Dependencies:** 4.1.1 (model exists)
      - **Acceptance:**
        - Run: `cd apps/api && alembic revision --autogenerate -m "add recommendation_tracking table"`
        - Review generated migration, ensure all columns and constraints correct
        - Add indexes: `create_index('ix_recommendation_tracking_assessment_id', 'recommendation_tracking', ['assessment_id'])`, `create_index('ix_recommendation_tracking_status', 'recommendation_tracking', ['status'])`
        - Run: `alembic upgrade head`
        - Verify table created in database with correct schema
        - Test downgrade: `alembic downgrade -1`, then upgrade again
      - **Tech:** Alembic, SQL DDL

    - [ ] **4.1.3 Atomic:** Import and register model in models init file
      - **Files:** `apps/api/app/db/models/__init__.py`
      - **Dependencies:** 4.1.1 (model created)
      - **Acceptance:**
        - Import `RecommendationTracking` model in `__init__.py`
        - Add to `__all__` list for proper module exports
        - Verify model is discoverable by Alembic autogenerate
        - Run `alembic check` to verify no pending changes before migration
      - **Tech:** Python imports, Alembic

  - [ ] **4.2 Story: Backend Recommendations Service**

    - **Scope:** Implement service to retrieve and update recommendation tracking
    - **Duration:** 2 days
    - **Dependencies:** 4.1 (database table exists)
    - **Files:** `apps/api/app/services/intelligence_service.py` (extend), `apps/api/app/schemas/recommendations.py`
    - **Tech:** SQLAlchemy, Pydantic, Integration with existing Gemini API logic
    - **Success Criteria:**
      - Service retrieves AI recommendations from `assessments.ai_recommendations` JSON field
      - Parses and structures recommendations by governance area
      - CRUD operations for recommendation tracking (create, read, update status)
      - Timestamps status changes
      - Calculates implementation progress summary

    - [ ] **4.2.1 Atomic:** Create Pydantic schemas for recommendations

      - **Files:** `apps/api/app/schemas/recommendations.py`
      - **Dependencies:** None
      - **Acceptance:**
        - Schema `RecommendationResponse` with fields: `id`, `assessment_id`, `governance_area_code`, `governance_area_name`, `recommendation_text`, `priority`, `status`, `updated_by`, `updated_at`, `created_at`
        - Schema `RecommendationStatusUpdate` with fields: `status` (Enum validation), `updated_by`
        - Schema `RecommendationsGroupedResponse` with fields: `assessment_id`, `barangay_name`, `governance_areas` (list of area objects with recommendations)
        - Schema `RecommendationProgressSummary` with fields: `total`, `not_started`, `in_progress`, `completed`, `not_applicable`, `completion_percentage`
        - All schemas use proper types and include `Config` with `from_attributes = True`
      - **Tech:** Pydantic, Python typing, Enum

    - [ ] **4.2.2 Atomic:** Implement recommendations retrieval service methods

      - **Files:** `apps/api/app/services/intelligence_service.py` (extend)
      - **Dependencies:** 4.2.1 (schemas exist), 4.1.3 (model registered)
      - **Acceptance:**
        - Add method `get_recommendations_by_assessment(db, assessment_id, user)` that:
          - Retrieves `assessments.ai_recommendations` JSON field
          - Joins with `recommendation_tracking` table to get status
          - Groups recommendations by governance_area_code
          - Applies RBAC filtering (MLGOO_DILG sees all, BLGU sees only their barangay)
          - Returns `RecommendationsGroupedResponse` schema
        - Add method `parse_ai_recommendations(json_data)` to structure raw Gemini output
        - Handle empty/null ai_recommendations field gracefully
      - **Tech:** SQLAlchemy ORM, JSON parsing, Python

    - [ ] **4.2.3 Atomic:** Implement recommendation status update service methods

      - **Files:** `apps/api/app/services/intelligence_service.py` (extend)
      - **Dependencies:** 4.2.2 (retrieval methods exist)
      - **Acceptance:**
        - Add method `update_recommendation_status(db, recommendation_id, status_update, user)` that:
          - Validates recommendation_id exists
          - Checks user has permission to update (RBAC)
          - Updates status field in `recommendation_tracking`
          - Sets `updated_by` to current user
          - Sets `updated_at` to current timestamp
          - Commits to database and returns updated `RecommendationResponse`
        - Raises appropriate exceptions for not found, unauthorized
      - **Tech:** SQLAlchemy ORM, exception handling

    - [ ] **4.2.4 Atomic:** Implement progress summary calculation

      - **Files:** `apps/api/app/services/intelligence_service.py` (extend)
      - **Dependencies:** 4.2.3 (status update methods exist)
      - **Acceptance:**
        - Add method `calculate_recommendation_progress(db, assessment_id)` that:
          - Counts recommendations by status (not_started, in_progress, completed, not_applicable)
          - Calculates total and completion_percentage = (completed / (total - not_applicable)) * 100
          - Returns `RecommendationProgressSummary` schema
          - Handles division by zero (returns 0% if no applicable recommendations)
        - Export service methods at module level
      - **Tech:** SQLAlchemy aggregations, Python calculations

  - [ ] **4.3 Story: Backend Recommendations API Endpoints**

    - **Scope:** Create endpoints for getting and updating recommendations
    - **Duration:** 1 day
    - **Dependencies:** 4.2 (service complete)
    - **Files:** `apps/api/app/api/v1/recommendations.py`
    - **Tech:** FastAPI
    - **Success Criteria:**
      - `GET /api/v1/recommendations/{assessment_id}` endpoint with tag `recommendations`
      - `PATCH /api/v1/recommendations/{recommendation_id}/status` endpoint
      - RBAC: MLGOO_DILG (all), BLGU (own barangay only)
      - Status update validates enum values, logs timestamp and user

    - [ ] **4.3.1 Atomic:** Create recommendations router and GET endpoint

      - **Files:** `apps/api/app/api/v1/recommendations.py`
      - **Dependencies:** 4.2.4 (service complete)
      - **Acceptance:**
        - Create FastAPI router with prefix `/recommendations` and tag `["recommendations"]`
        - Implement `GET /{assessment_id}` endpoint
        - Endpoint signature: `get_recommendations(assessment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user))`
        - Calls `intelligence_service.get_recommendations_by_assessment(db, assessment_id, current_user)`
        - Returns `RecommendationsGroupedResponse` schema
        - RBAC enforced within service layer
        - Include OpenAPI docs: summary, description, response examples
      - **Tech:** FastAPI, Pydantic, dependency injection

    - [ ] **4.3.2 Atomic:** Create PATCH endpoint for status updates

      - **Files:** `apps/api/app/api/v1/recommendations.py` (extend)
      - **Dependencies:** 4.3.1 (GET endpoint exists)
      - **Acceptance:**
        - Implement `PATCH /{recommendation_id}/status` endpoint
        - Endpoint signature: `update_status(recommendation_id: int, status_update: RecommendationStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user))`
        - Calls `intelligence_service.update_recommendation_status(db, recommendation_id, status_update, current_user)`
        - Returns updated `RecommendationResponse` schema
        - Validates enum values via Pydantic
        - Returns 404 if recommendation not found, 403 if unauthorized
        - Include OpenAPI docs
      - **Tech:** FastAPI, Pydantic validation, HTTP status codes

    - [ ] **4.3.3 Atomic:** Register recommendations router in API initialization
      - **Files:** `apps/api/app/api/v1/__init__.py`
      - **Dependencies:** 4.3.2 (endpoints created)
      - **Acceptance:**
        - Import `recommendations` router from `app.api.v1.recommendations`
        - Add `app.include_router(recommendations.router, prefix="/api/v1")` in API router registration
        - Verify endpoints accessible at `GET /api/v1/recommendations/{id}` and `PATCH /api/v1/recommendations/{id}/status`
        - Test with `curl http://localhost:8000/api/v1/recommendations/1` (should return 401 without auth)
      - **Tech:** FastAPI router composition

  - [ ] **4.4 Story: Type Generation for Recommendations**

    - **Scope:** Generate types for recommendations endpoints
    - **Duration:** 1 hour
    - **Dependencies:** 4.3 (endpoints exist)
    - **Files:** `packages/shared/src/generated/endpoints/recommendations/`, `packages/shared/src/generated/schemas/recommendations/`
    - **Tech:** Orval
    - **Success Criteria:** Hooks and types generated

    - [ ] **4.4.1 Atomic:** Generate TypeScript types from OpenAPI spec
      - **Files:** Run from repository root
      - **Dependencies:** 4.3.3 (endpoints registered and backend running)
      - **Acceptance:**
        - Start backend: `cd apps/api && pnpm dev`
        - Verify OpenAPI spec includes recommendations endpoints: `curl http://localhost:8000/openapi.json | grep "recommendations"`
        - Run type generation from root: `pnpm generate-types`
        - Verify files created in `packages/shared/src/generated/endpoints/recommendations/recommendations.ts`
        - Verify types in `packages/shared/src/generated/schemas/recommendations/`
        - Verify hooks exist: `useGetRecommendations`, `usePatchRecommendationsStatus`
        - No TypeScript errors in generated files
      - **Tech:** Orval, OpenAPI, shell commands

  - [ ] **4.5 Story: Frontend Recommendations Page**

    - **Scope:** Create recommendations page with layout
    - **Duration:** 1 day
    - **Dependencies:** 4.4 (types generated)
    - **Files:** `apps/web/src/app/(app)/recommendations/page.tsx`
    - **Tech:** Next.js, React
    - **Success Criteria:**
      - Page accessible at `/recommendations`
      - RBAC enforced (MLGOO_DILG, BLGU)
      - Filter: Select assessment/barangay
      - Layout includes header and grid for recommendation cards

    - [ ] **4.5.1 Atomic:** Create recommendations page component

      - **Files:** `apps/web/src/app/(app)/recommendations/page.tsx`
      - **Dependencies:** 4.4.1 (types generated)
      - **Acceptance:**
        - Create file with `'use client'` directive (needs client-side data fetching)
        - Import `useGetRecommendations` from `@vantage/shared`
        - Component checks user role, allows MLGOO_DILG and BLGU
        - Implements loading state with shadcn/ui Skeleton components
        - Implements error state with Alert component
        - Page layout: header with title "AI Recommendations", assessment selector dropdown
        - Export default function `RecommendationsPage`
      - **Tech:** Next.js 15, React 19, TypeScript, TanStack Query

    - [ ] **4.5.2 Atomic:** Implement assessment selector and data fetching

      - **Files:** `apps/web/src/app/(app)/recommendations/page.tsx` (extend)
      - **Dependencies:** 4.5.1 (page component exists)
      - **Acceptance:**
        - Add state: `const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null)`
        - Use hook: `const { data, isLoading, error } = useGetRecommendations({ assessmentId: selectedAssessmentId })`
        - Create assessment selector using shadcn/ui Select component
        - For MLGOO_DILG: Fetch list of all assessments
        - For BLGU: Auto-select their barangay's assessment
        - onChange updates selectedAssessmentId state, triggering re-fetch
        - Display progress summary from API response
      - **Tech:** React state, TanStack Query, shadcn/ui Select

    - [ ] **4.5.3 Atomic:** Create layout grid for recommendation cards
      - **Files:** `apps/web/src/app/(app)/recommendations/page.tsx` (extend)
      - **Dependencies:** 4.5.2 (data fetching implemented)
      - **Acceptance:**
        - Group recommendations by governance_area from API response
        - Create collapsible sections for each governance area
        - Use shadcn/ui Collapsible component
        - Responsive grid layout (1 column mobile, 2 columns desktop)
        - Display generation timestamp from metadata
        - Container ready to receive RecommendationCard components
      - **Tech:** React, shadcn/ui Collapsible, Tailwind CSS

  - [ ] **4.6 Story: Recommendation Display Components**

    - **Scope:** Build recommendation cards with priority indicators and status tracking
    - **Duration:** 2-3 days
    - **Dependencies:** 4.5 (page exists)
    - **Files:**
      - `apps/web/src/components/features/recommendations/RecommendationCard.tsx`
      - `apps/web/src/components/features/recommendations/StatusTracker.tsx`
      - `apps/web/src/hooks/useRecommendations.ts`
    - **Tech:** React, shadcn/ui (Collapsible, Badge, Select), TanStack Query
    - **Success Criteria:**
      - Cards organized in collapsible sections by governance area
      - Priority badges: High (red), Medium (yellow), Low (green)
      - Action items highlighted with bold/italic formatting
      - Timestamp displayed ("Generated on MM/DD/YYYY HH:MM")
      - Status dropdown: Not Started, In Progress, Completed, Not Applicable
      - Status change triggers API mutation and optimistic UI update
      - Summary section shows implementation progress (e.g., "5/20 completed")

    - [ ] **4.6.1 Atomic:** Create custom recommendations hook wrapper

      - **Files:** `apps/web/src/hooks/useRecommendations.ts`
      - **Dependencies:** 4.4.1 (Orval hooks generated)
      - **Acceptance:**
        - Import `useGetRecommendations` and `usePatchRecommendationsStatus` from `@vantage/shared`
        - Create wrapper hook `useRecommendations(assessmentId?: number)` that:
          - Calls Orval hooks with proper error handling
          - Formats error messages for user display
          - Provides typed data with defaults for missing fields
          - Returns: `{ data, isLoading, error, refetch, updateStatus }`
        - `updateStatus` method wraps mutation with optimistic updates
        - Export hook as default
      - **Tech:** React hooks, TypeScript, TanStack Query mutations

    - [ ] **4.6.2 Atomic:** Create RecommendationCard component with priority indicators

      - **Files:** `apps/web/src/components/features/recommendations/RecommendationCard.tsx`
      - **Dependencies:** 4.6.1 (custom hook exists)
      - **Acceptance:**
        - Create `RecommendationCard` component with props: `recommendation` (typed from API)
        - Use shadcn/ui Card component with CardHeader, CardContent
        - Display recommendation_text with proper formatting
        - Priority Badge component: High (red bg), Medium (yellow bg), Low (green bg)
        - Parse recommendation_text for action items (lines starting with "-" or "•")
        - Highlight action items with bold/italic styling
        - Display timestamp: "Generated on {formatted date}"
        - Component exports individually
      - **Tech:** React, shadcn/ui (Card, Badge), Tailwind CSS, date formatting

    - [ ] **4.6.3 Atomic:** Create StatusTracker component with dropdown

      - **Files:** `apps/web/src/components/features/recommendations/StatusTracker.tsx`
      - **Dependencies:** 4.6.2 (card component exists)
      - **Acceptance:**
        - Create `StatusTracker` component with props: `recommendation`, `onStatusChange` callback
        - Use shadcn/ui Select component for status dropdown
        - Options: Not Started, In Progress, Completed, Not Applicable
        - Status badge with color coding (gray/blue/green/red)
        - onChange triggers `onStatusChange` with new status value
        - Display last updated info: "Updated by {user} on {date}"
        - Disabled state when user lacks permission
      - **Tech:** React, shadcn/ui (Select, Badge), TypeScript

    - [ ] **4.6.4 Atomic:** Integrate StatusTracker and mutation logic

      - **Files:** `apps/web/src/components/features/recommendations/RecommendationCard.tsx` (extend)
      - **Dependencies:** 4.6.3 (StatusTracker exists)
      - **Acceptance:**
        - Import and add `StatusTracker` component to RecommendationCard
        - Import `updateStatus` from `useRecommendations` hook
        - Handle `onStatusChange` event: calls `updateStatus` mutation
        - Implement optimistic UI update (status changes immediately, reverts on error)
        - Display success toast on successful update
        - Display error toast on failed update
        - Loading state on status dropdown during mutation
      - **Tech:** React, TanStack Query mutations, shadcn/ui Toast

    - [ ] **4.6.5 Atomic:** Create progress summary component and integrate
      - **Files:** `apps/web/src/components/features/recommendations/ProgressSummary.tsx`, `apps/web/src/app/(app)/recommendations/page.tsx` (extend)
      - **Dependencies:** 4.6.4 (status tracking complete)
      - **Acceptance:**
        - Create `ProgressSummary` component with props: `summary` (from API)
        - Display: "{completed}/{total} recommendations completed ({percentage}%)"
        - Progress bar visual using shadcn/ui Progress component
        - Breakdown: count per status (Not Started, In Progress, Completed, Not Applicable)
        - Use Badge components for each status with counts
        - Integrate ProgressSummary into recommendations page header
        - Summary updates when any status changes
      - **Tech:** React, shadcn/ui (Progress, Badge), Tailwind CSS

  - [ ] **4.7 Story: Recommendations PDF Export**

    - **Scope:** Generate formatted PDF of AI recommendations
    - **Duration:** 1-2 days
    - **Dependencies:** 4.6 (UI complete)
    - **Files:** `apps/web/src/components/features/recommendations/PDFGenerator.tsx`, `apps/web/src/lib/pdf-export.ts` (extend)
    - **Tech:** jsPDF, html2canvas
    - **Success Criteria:**
      - Export button on recommendations page
      - PDF includes DILG branding, official formatting
      - Grouped by governance area with priority indicators
      - Includes metadata, generation timestamp
      - Suitable for sharing with barangay officials

    - [ ] **4.7.1 Atomic:** Extend PDF export utility for recommendations

      - **Files:** `apps/web/src/lib/pdf-export.ts` (extend)
      - **Dependencies:** 4.6.5 (UI components complete)
      - **Acceptance:**
        - Add function `exportRecommendationsToPDF(data, options)` that:
          - Accepts recommendations data and configuration options
          - Uses jsPDF to create new document
          - Adds DILG header/logo on first page
          - Includes metadata: barangay name, assessment cycle, generation date
          - Groups recommendations by governance area
          - Formats priority badges (text-based: HIGH, MEDIUM, LOW)
          - Includes status for each recommendation
          - Adds page numbers and footer
          - Returns PDF blob for download
        - Handle long text wrapping and page breaks
      - **Tech:** jsPDF, TypeScript, PDF formatting

    - [ ] **4.7.2 Atomic:** Create PDFGenerator component

      - **Files:** `apps/web/src/components/features/recommendations/PDFGenerator.tsx`
      - **Dependencies:** 4.7.1 (PDF utility exists)
      - **Acceptance:**
        - Create `PDFExportButton` component with props: `recommendations`, `assessmentInfo`
        - Renders shadcn/ui Button with download icon
        - onClick handler calls `exportRecommendationsToPDF`
        - Shows loading spinner during PDF generation
        - Triggers browser download with filename: `AI_Recommendations_{BarangayName}_{Date}.pdf`
        - Displays success toast on completion
        - Handles errors gracefully with error toast
      - **Tech:** React, shadcn/ui Button, jsPDF

    - [ ] **4.7.3 Atomic:** Integrate PDF export into recommendations page
      - **Files:** `apps/web/src/app/(app)/recommendations/page.tsx` (extend)
      - **Dependencies:** 4.7.2 (PDFExportButton component exists)
      - **Acceptance:**
        - Import `PDFExportButton` component
        - Add export button to page header next to title
        - Pass recommendations data and assessment info as props
        - Button disabled when no recommendations loaded
        - Test PDF generation with sample data
        - Verify PDF formatting, content accuracy, and branding
      - **Tech:** Next.js, React, integration testing

  - [ ] **4.8 Story: Recommendations Testing**
    - **Scope:** Test recommendations backend and frontend
    - **Duration:** 1-2 days
    - **Dependencies:** 4.7 (all features complete)
    - **Files:**
      - `apps/api/tests/api/v1/test_recommendations.py`
      - `apps/api/tests/services/test_intelligence_service.py` (extend)
      - `apps/web/src/components/features/recommendations/__tests__/RecommendationCard.test.tsx`
    - **Tech:** Pytest, Vitest, React Testing Library
    - **Success Criteria:**
      - Backend: Test CRUD operations for tracking
      - Backend: Test RBAC enforcement
      - Frontend: Test status update interaction
      - Frontend: Test PDF export
      - All tests pass

    - [ ] **4.8.1 Atomic:** Write backend service layer tests

      - **Files:** `apps/api/tests/services/test_intelligence_service.py` (extend)
      - **Dependencies:** 4.2.4 (intelligence service methods complete)
      - **Acceptance:**
        - Test `get_recommendations_by_assessment()` with valid assessment_id returns correct data
        - Test with assessment_id having no recommendations returns empty list
        - Test `parse_ai_recommendations()` correctly structures JSON from Gemini
        - Test `update_recommendation_status()` updates status and timestamps correctly
        - Test `calculate_recommendation_progress()` returns accurate counts and percentages
        - Test edge case: all recommendations marked as "Not Applicable" (percentage calculation)
        - Test RBAC filtering within service methods (MLGOO_DILG vs BLGU)
        - All tests use pytest fixtures for test data
        - Run with: `cd apps/api && pytest tests/services/test_intelligence_service.py -vv`
      - **Tech:** Pytest, SQLAlchemy test fixtures, Python

    - [ ] **4.8.2 Atomic:** Write backend API endpoint tests

      - **Files:** `apps/api/tests/api/v1/test_recommendations.py`
      - **Dependencies:** 4.3.3 (endpoints registered)
      - **Acceptance:**
        - Test `GET /api/v1/recommendations/{assessment_id}` returns 200 with valid JWT
        - Test returns 401 without authentication token
        - Test returns 403 when BLGU tries to access another barangay's recommendations
        - Test MLGOO_DILG can access all recommendations
        - Test `PATCH /api/v1/recommendations/{id}/status` updates status successfully
        - Test PATCH returns 404 for non-existent recommendation_id
        - Test PATCH validates enum values (returns 422 for invalid status)
        - Test response structure matches schemas
        - Use pytest fixtures for authenticated clients (MLGOO_DILG, BLGU)
        - Run with: `cd apps/api && pytest tests/api/v1/test_recommendations.py -vv`
      - **Tech:** Pytest, FastAPI TestClient, JWT fixtures

    - [ ] **4.8.3 Atomic:** Write frontend component tests

      - **Files:**
        - `apps/web/src/components/features/recommendations/__tests__/RecommendationCard.test.tsx`
        - `apps/web/src/components/features/recommendations/__tests__/StatusTracker.test.tsx`
        - `apps/web/src/components/features/recommendations/__tests__/ProgressSummary.test.tsx`
      - **Dependencies:** 4.6.5 (all UI components complete)
      - **Acceptance:**
        - Test `RecommendationCard` renders with mock data (text, priority badge colors)
        - Test priority badges display correct colors (High=red, Medium=yellow, Low=green)
        - Test action items are highlighted correctly
        - Test `StatusTracker` renders status dropdown with all options
        - Test `StatusTracker` calls onStatusChange when selection changes
        - Test `ProgressSummary` displays correct counts and percentage
        - Test components handle empty/null data gracefully
        - Mock TanStack Query hook responses
        - Run with: `pnpm test` from repository root
      - **Tech:** Vitest, React Testing Library

    - [ ] **4.8.4 Atomic:** Write frontend page and PDF export tests
      - **Files:**
        - `apps/web/src/app/(app)/recommendations/__tests__/page.test.tsx`
        - `apps/web/src/components/features/recommendations/__tests__/PDFGenerator.test.tsx`
      - **Dependencies:** 4.7.3 (PDF export integrated)
      - **Acceptance:**
        - Test recommendations page renders with mock authenticated user
        - Test assessment selector renders and handles selection
        - Test loading state shows Skeleton components
        - Test error state shows Alert with error message
        - Test RBAC: MLGOO_DILG can select any assessment, BLGU sees only their barangay
        - Test `PDFExportButton` calls PDF export function on click
        - Mock PDF generation (don't actually generate PDF in tests)
        - Test success/error toast display
        - Verify all recommendation cards render on page
        - Run with: `pnpm test`
      - **Tech:** Vitest, React Testing Library, Next.js testing utilities, mock functions

