# Epic 2.0: BLGU Dashboard with Completion Tracking

**PRD Reference:** FR-2.1, FR-2.2 - BLGU dashboard showing completion status (NOT compliance
status), navigation to incomplete sections, and assessor comments for rework

**Objective:** Create a BLGU-facing dashboard that shows submission progress, completion tracking,
navigation to incomplete indicators, and assessor feedback during rework cycles. The dashboard must
NOT expose compliance status (PASS/FAIL/CONDITIONAL).

## Stories

### Three-Tier Structure: Epic → Story → Atomic

- [x] **2.1 Story: Backend API for Dashboard Completion Metrics**
  - Create `GET /api/v1/assessments/{assessment_id}/blgu-dashboard` endpoint
  - Calculate completion metrics: total indicators, completed indicators, incomplete indicators
  - Use CompletenessValidationService to determine completion status per indicator
  - Return grouped data: completed sections, incomplete sections, pending sections
  - Include assessor comments if assessment is in REWORK status
  - Tech stack involved: FastAPI, Pydantic schemas, SQLAlchemy
  - Dependencies: Epic 1 Story 1.5 (CompletenessValidationService) must be complete

  - [x] **2.1.1 Atomic: Create router file for BLGU dashboard endpoints**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py` (NEW)
    - **Dependencies:** Epic 1 Story 1.5 must be complete
    - **Acceptance:** Router file created with FastAPI APIRouter instance. Tagged with
      "blgu-dashboard" for Orval generation. Includes imports for dependencies (Session, User,
      services).
    - **Tech:** FastAPI APIRouter, tags configuration
    - **Time Estimate:** 2 hours

  - [x] **2.1.2 Atomic: Implement GET /blgu-dashboard endpoint structure**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 2.1.1 must be complete
    - **Acceptance:** Endpoint defined with path parameter assessment_id. Includes dependencies:
      get_db, get_current_user. Returns placeholder response. Endpoint registered in main API
      router.
    - **Tech:** FastAPI route decorator, dependency injection, path parameters
    - **Time Estimate:** 2 hours

  - [x] **2.1.3 Atomic: Add permission check for BLGU users only**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 2.1.2 must be complete
    - **Acceptance:** Endpoint checks current user's role is BLGU_USER. Checks current user owns the
      assessment (assessment.barangay_id matches user.barangay_id). Raises 403 if unauthorized.
    - **Tech:** FastAPI HTTPException, role-based access control
    - **Time Estimate:** 3 hours

  - [x] **2.1.4 Atomic: Retrieve assessment with all indicators and responses**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 2.1.3 must be complete
    - **Acceptance:** Query retrieves assessment by ID with eager loading of indicators and
      responses. Uses SQLAlchemy joinedload or selectinload. Raises 404 if assessment not found.
    - **Tech:** SQLAlchemy queries, eager loading, error handling
    - **Time Estimate:** 3 hours

  - [x] **2.1.5 Atomic: Calculate completion metrics using CompletenessValidationService**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 2.1.4 must be complete
    - **Acceptance:** For each indicator, call
      completeness_validation_service.validate_completeness(). Count total indicators, completed
      (is_complete=True), incomplete (is_complete=False).
    - **Tech:** Service layer calls, iteration, aggregation
    - **Time Estimate:** 4 hours

  - [x] **2.1.6 Atomic: Group indicators by governance area and section**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 2.1.5 must be complete
    - **Acceptance:** Group indicators by governance_area, then by section within form_schema.
      Return nested structure: governance_areas → sections → indicators with completion status.
    - **Tech:** Python dict grouping, itertools.groupby or custom grouping logic
    - **Time Estimate:** 4 hours

  - [x] **2.1.7 Atomic: Include assessor comments if assessment status is REWORK**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 2.1.6 must be complete
    - **Acceptance:** Check assessment.status == REWORK. If true, include rework_comments field in
      response. If not, exclude or set to null.
    - **Tech:** Conditional response data, status checking
    - **Time Estimate:** 2 hours

  - [x] **2.1.8 Atomic: Return BLGUDashboardResponse schema**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 2.1.7 must be complete (will need schema from Story 2.4)
    - **Acceptance:** Endpoint returns Pydantic schema BLGUDashboardResponse with completion
      metrics, grouped indicators, rework comments. Status code 200.
    - **Tech:** Pydantic response model, FastAPI response_model
    - **Time Estimate:** 2 hours

- [x] **2.2 Story: Backend API for Indicator Navigation**
  - Create `GET /api/v1/assessments/{assessment_id}/indicators/navigation` endpoint
  - Return list of indicators with completion status (complete/incomplete)
  - Group by governance area and section
  - Include indicator ID, title, completion status, and route path
  - Filter to show only indicators assigned to the BLGU's barangay
  - Tech stack involved: FastAPI, Pydantic schemas, SQLAlchemy relationships
  - Dependencies: Epic 1 Story 1.3 (SQLAlchemy models) must be complete

  - [x] **2.2.1 Atomic: Create GET /indicators/navigation endpoint**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Story 2.1 must be complete
    - **Acceptance:** Endpoint defined with path parameter assessment_id. Includes dependencies:
      get_db, get_current_user. Returns placeholder response.
    - **Tech:** FastAPI route decorator, dependency injection
    - **Time Estimate:** 2 hours

  - [x] **2.2.2 Atomic: Retrieve all indicators for assessment's barangay**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 2.2.1 must be complete
    - **Acceptance:** Query retrieves all governance_indicators filtered by user's barangay (if
      applicable). Orders by governance_area, section, indicator order.
    - **Tech:** SQLAlchemy queries, filtering, ordering
    - **Time Estimate:** 3 hours

  - [x] **2.2.3 Atomic: Calculate completion status for each indicator**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 2.2.2 must be complete
    - **Acceptance:** For each indicator, retrieve responses for current assessment. Call
      completeness_validation_service. Set completion status: "complete" or "incomplete".
    - **Tech:** Service layer calls, status mapping
    - **Time Estimate:** 3 hours

  - [x] **2.2.4 Atomic: Generate route path for each indicator**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 2.2.3 must be complete
    - **Acceptance:** For each indicator, generate frontend route path:
      `/blgu/assessment/{assessment_id}/indicator/{indicator_id}`. Include in response.
    - **Tech:** String formatting, path generation
    - **Time Estimate:** 2 hours

  - [x] **2.2.5 Atomic: Return IndicatorNavigationResponse schema**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 2.2.4 must be complete (will need schema from Story 2.4)
    - **Acceptance:** Endpoint returns list of IndicatorNavigationItem schemas with id, title,
      completion_status, route_path. Status code 200.
    - **Tech:** Pydantic response model, list response
    - **Time Estimate:** 2 hours

- [x] **2.3 Story: Backend API for Assessor Comments Retrieval**
  - Create `GET /api/v1/assessments/{assessment_id}/assessor-comments` endpoint
  - Return assessor comments grouped by indicator
  - Only return comments if assessment status is REWORK
  - Include comment text, timestamp, and associated indicator
  - Ensure BLGU users can only access their own assessment comments
  - Tech stack involved: FastAPI, Pydantic schemas, role-based access control
  - Dependencies: Epic 1 Story 1.3 (SQLAlchemy models) must be complete

  - [x] **2.3.1 Atomic: Create GET /assessor-comments endpoint**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Story 2.2 must be complete
    - **Acceptance:** Endpoint defined with path parameter assessment_id. Includes dependencies:
      get_db, get_current_user.
    - **Tech:** FastAPI route decorator, dependency injection
    - **Time Estimate:** 2 hours

  - [x] **2.3.2 Atomic: Check assessment status is REWORK**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 2.3.1 must be complete
    - **Acceptance:** Retrieve assessment. Check status == REWORK. If not, return empty list or 204
      No Content. If yes, proceed to retrieve comments.
    - **Tech:** Status checking, conditional response
    - **Time Estimate:** 2 hours

  - [x] **2.3.3 Atomic: Retrieve rework_comments from assessment**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 2.3.2 must be complete
    - **Acceptance:** Retrieve assessment.rework_comments (text field). Retrieve rework_requested_at
      (timestamp). Retrieve rework_requested_by (user).
    - **Tech:** SQLAlchemy relationship loading, field access
    - **Time Estimate:** 2 hours

  - [x] **2.3.4 Atomic: Format comments response with metadata**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 2.3.3 must be complete
    - **Acceptance:** Format response with comment_text, timestamp, assessor_name. If comments
      reference specific indicators, parse and group (future enhancement).
    - **Tech:** Data formatting, string manipulation
    - **Time Estimate:** 3 hours

  - [x] **2.3.5 Atomic: Return AssessorCommentsResponse schema**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 2.3.4 must be complete (will need schema from Story 2.4)
    - **Acceptance:** Endpoint returns AssessorCommentsResponse with comments, timestamp, assessor
      info. Status code 200.
    - **Tech:** Pydantic response model
    - **Time Estimate:** 2 hours

- [x] **2.4 Story: Pydantic Schemas for Dashboard Responses**
  - Create `BLGUDashboardResponse` schema with completion metrics
  - Create `IndicatorNavigationItem` schema for navigation list
  - Create `AssessorCommentResponse` schema for rework comments
  - Ensure schemas are properly tagged for Orval type generation
  - Tech stack involved: Pydantic, Python type hints
  - Dependencies: Stories 2.1, 2.2, 2.3 must be complete

  - [x] **2.4.1 Atomic: Create BLGUDashboardResponse schema**
    - **Files:** `apps/api/app/schemas/blgu_dashboard.py` (NEW)
    - **Dependencies:** Stories 2.1, 2.2, 2.3 endpoint logic must be defined
    - **Acceptance:** Schema includes: total_indicators (int), completed_indicators (int),
      incomplete_indicators (int), completion_percentage (float), governance_areas (list),
      rework_comments (optional str). All fields have type hints.
    - **Tech:** Pydantic BaseModel, type hints, optional fields
    - **Time Estimate:** 3 hours

  - [x] **2.4.2 Atomic: Create IndicatorNavigationItem schema**
    - **Files:** `apps/api/app/schemas/blgu_dashboard.py`
    - **Dependencies:** Task 2.4.1 must be complete
    - **Acceptance:** Schema includes: indicator_id (int), title (str), completion_status (str:
      "complete" or "incomplete"), route_path (str), governance_area_name (str), section_name (str).
    - **Tech:** Pydantic BaseModel, type hints, literal types
    - **Time Estimate:** 2 hours

  - [x] **2.4.3 Atomic: Create AssessorCommentResponse schema**
    - **Files:** `apps/api/app/schemas/blgu_dashboard.py`
    - **Dependencies:** Task 2.4.2 must be complete
    - **Acceptance:** Schema includes: comment_text (str), timestamp (datetime), assessor_name
      (str), assessment_id (int). Fields have type hints.
    - **Tech:** Pydantic BaseModel, datetime handling, type hints
    - **Time Estimate:** 2 hours

  - [x] **2.4.4 Atomic: Update endpoint response_model with schemas**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Tasks 2.4.1, 2.4.2, 2.4.3 must be complete
    - **Acceptance:** Endpoints use response_model parameter with BLGUDashboardResponse,
      list[IndicatorNavigationItem], AssessorCommentResponse. Schemas validate response data.
    - **Tech:** FastAPI response_model, Pydantic validation
    - **Time Estimate:** 2 hours

  - [x] **2.4.5 Atomic: Add schemas to **init**.py for imports**
    - **Files:** `apps/api/app/schemas/__init__.py`
    - **Dependencies:** Tasks 2.4.1-2.4.3 must be complete
    - **Acceptance:** New schemas exported from schemas module. Can be imported:
      `from app.schemas import BLGUDashboardResponse, IndicatorNavigationItem, AssessorCommentResponse`.
    - **Tech:** Python module exports
    - **Time Estimate:** 1 hour

- [x] **2.5 Story: Type Generation and Frontend API Client**
  - Run `pnpm generate-types` to generate TypeScript types and React Query hooks
  - Verify generated hooks: `useGetBLGUDashboard`, `useGetIndicatorNavigation`,
    `useGetAssessorComments`
  - Ensure all response schemas are correctly typed
  - Tech stack involved: Orval, TypeScript, React Query
  - Dependencies: Story 2.4 must be complete

  - [x] **2.5.1 Atomic: Register blgu_dashboard router in main API**
    - **Files:** `apps/api/app/api/v1/__init__.py`
    - **Dependencies:** Story 2.4 must be complete
    - **Acceptance:** Import blgu_dashboard router. Include router in API with prefix
      `/blgu-dashboard` and tag `blgu-dashboard`.
    - **Tech:** FastAPI router registration
    - **Time Estimate:** 1 hour

  - [x] **2.5.2 Atomic: Run pnpm generate-types**
    - **Files:** Execute command: `pnpm generate-types` from project root
    - **Dependencies:** Task 2.5.1 must be complete, backend must be running
    - **Acceptance:** Command succeeds. TypeScript files generated in
      `packages/shared/src/generated/endpoints/blgu-dashboard/` and
      `packages/shared/src/generated/schemas/blgu-dashboard/`.
    - **Tech:** Orval, TypeScript generation, npm scripts
    - **Time Estimate:** 2 hours

  - [x] **2.5.3 Atomic: Verify useGetBLGUDashboard hook generated**
    - **Files:** `packages/shared/src/generated/endpoints/blgu-dashboard/blgu-dashboard.ts`
    - **Dependencies:** Task 2.5.2 must be complete
    - **Acceptance:** Hook `useGetBLGUDashboard` exists. Accepts assessmentId parameter. Returns
      TanStack Query hook with typed response BLGUDashboardResponse.
    - **Tech:** TypeScript, TanStack Query types inspection
    - **Time Estimate:** 1 hour

  - [x] **2.5.4 Atomic: Verify useGetIndicatorNavigation hook generated**
    - **Files:** `packages/shared/src/generated/endpoints/blgu-dashboard/blgu-dashboard.ts`
    - **Dependencies:** Task 2.5.2 must be complete
    - **Acceptance:** Hook `useGetIndicatorNavigation` exists. Accepts assessmentId parameter.
      Returns typed array of IndicatorNavigationItem.
    - **Tech:** TypeScript type checking
    - **Time Estimate:** 1 hour

  - [x] **2.5.5 Atomic: Verify useGetAssessorComments hook generated**
    - **Files:** `packages/shared/src/generated/endpoints/blgu-dashboard/blgu-dashboard.ts`
    - **Dependencies:** Task 2.5.2 must be complete
    - **Acceptance:** Hook `useGetAssessorComments` exists. Accepts assessmentId parameter. Returns
      typed AssessorCommentResponse.
    - **Tech:** TypeScript type checking
    - **Time Estimate:** 1 hour

  - [x] **2.5.6 Atomic: Test generated hooks import successfully**
    - **Files:** Create test file: `apps/web/src/test-imports.ts` (temporary)
    - **Dependencies:** Tasks 2.5.3-2.5.5 must be complete
    - **Acceptance:** Import all three hooks in test file. TypeScript compiles without errors.
      Delete test file after verification.
    - **Tech:** TypeScript imports, compilation check
    - **Time Estimate:** 1 hour

- [x] **2.6 Story: Dashboard Page Component Structure**
  - Create `/apps/web/src/app/(app)/blgu/dashboard/page.tsx`
  - Implement page layout with header, metrics section, navigation section
  - Use Server Components for initial data loading where appropriate
  - Set up client components for interactive elements
  - Tech stack involved: Next.js 15 App Router, React 19, TypeScript
  - Dependencies: Story 2.5 must be complete

  - [x] **2.6.1 Atomic: Create dashboard page file structure**
    - **Files:** `apps/web/src/app/(app)/blgu/dashboard/page.tsx` (NEW)
    - **Dependencies:** Story 2.5 must be complete
    - **Acceptance:** File created as Server Component. Exports default Page component. Includes
      page metadata (title: "Dashboard"). Placeholder content renders.
    - **Tech:** Next.js 15 App Router, React Server Components, TypeScript
    - **Time Estimate:** 2 hours

  - [x] **2.6.2 Atomic: Create dashboard page layout structure**
    - **Files:** `apps/web/src/app/(app)/blgu/dashboard/page.tsx`
    - **Dependencies:** Task 2.6.1 must be complete
    - **Acceptance:** Page structure includes: page header (title, description), metrics section
      container, navigation section container. Uses Tailwind classes for spacing and grid layout.
    - **Tech:** React JSX, Tailwind CSS, layout design
    - **Time Estimate:** 3 hours

  - [x] **2.6.3 Atomic: Add assessment ID retrieval from URL or context**
    - **Files:** `apps/web/src/app/(app)/blgu/dashboard/page.tsx`
    - **Dependencies:** Task 2.6.2 must be complete
    - **Acceptance:** Retrieve current assessment_id from URL params, user context, or Zustand
      store. Pass to child components as prop.
    - **Tech:** Next.js useSearchParams, React context, Zustand store access
    - **Time Estimate:** 3 hours

  - [x] **2.6.4 Atomic: Import and render CompletionMetricsCard component**
    - **Files:** `apps/web/src/app/(app)/blgu/dashboard/page.tsx`
    - **Dependencies:** Task 2.6.3 must be complete (will need component from Story 2.7)
    - **Acceptance:** Import CompletionMetricsCard. Render in metrics section. Pass assessmentId
      prop. Component displays placeholder until Story 2.7 complete.
    - **Tech:** React component composition, prop passing
    - **Time Estimate:** 2 hours

  - [x] **2.6.5 Atomic: Import and render IndicatorNavigationList component**
    - **Files:** `apps/web/src/app/(app)/blgu/dashboard/page.tsx`
    - **Dependencies:** Task 2.6.4 must be complete (will need component from Story 2.8)
    - **Acceptance:** Import IndicatorNavigationList. Render in navigation section. Pass
      assessmentId prop. Component displays placeholder until Story 2.8 complete.
    - **Tech:** React component composition, prop passing
    - **Time Estimate:** 2 hours

  - [x] **2.6.6 Atomic: Import and render AssessorCommentsPanel component**
    - **Files:** `apps/web/src/app/(app)/blgu/dashboard/page.tsx`
    - **Dependencies:** Task 2.6.5 must be complete (will need component from Story 2.9)
    - **Acceptance:** Import AssessorCommentsPanel. Conditionally render if rework comments exist.
      Pass assessmentId prop. Component displays placeholder until Story 2.9 complete.
    - **Tech:** React conditional rendering, component composition
    - **Time Estimate:** 2 hours

- [x] **2.7 Story: Completion Metrics Components**
  - Create `CompletionMetricsCard` component in `src/components/features/dashboard/`
  - Display total indicators, completed count, incomplete count
  - Show visual progress bar or circular progress indicator
  - Use shadcn/ui Card, Progress components
  - Tech stack involved: React, TypeScript, shadcn/ui, Tailwind CSS
  - Dependencies: Story 2.5 must be complete

  - [x] **2.7.1 Atomic: Create CompletionMetricsCard component file**
    - **Files:** `apps/web/src/components/features/dashboard/CompletionMetricsCard.tsx` (NEW)
    - **Dependencies:** Story 2.5 must be complete
    - **Acceptance:** Client Component created ("use client" directive). Accepts assessmentId prop
      (number). Exports default CompletionMetricsCard. Placeholder content renders.
    - **Tech:** React Client Component, TypeScript, prop types
    - **Time Estimate:** 2 hours

  - [x] **2.7.2 Atomic: Integrate useGetBLGUDashboard hook**
    - **Files:** `apps/web/src/components/features/dashboard/CompletionMetricsCard.tsx`
    - **Dependencies:** Task 2.7.1 must be complete
    - **Acceptance:** Import and call useGetBLGUDashboard(assessmentId). Destructure data,
      isLoading, error. Handle loading state with skeleton. Handle error state with error message.
    - **Tech:** TanStack Query hooks, loading/error states, React hooks
    - **Time Estimate:** 3 hours

  - [x] **2.7.3 Atomic: Display completion metrics (total, completed, incomplete)**
    - **Files:** `apps/web/src/components/features/dashboard/CompletionMetricsCard.tsx`
    - **Dependencies:** Task 2.7.2 must be complete
    - **Acceptance:** Display data.total_indicators, data.completed_indicators,
      data.incomplete_indicators. Use shadcn/ui Card component. Show numbers in clear typography.
      Use Tailwind for styling.
    - **Tech:** shadcn/ui Card, Tailwind CSS, data display
    - **Time Estimate:** 3 hours

  - [x] **2.7.4 Atomic: Add progress bar visualization**
    - **Files:** `apps/web/src/components/features/dashboard/CompletionMetricsCard.tsx`
    - **Dependencies:** Task 2.7.3 must be complete
    - **Acceptance:** Use shadcn/ui Progress component. Calculate percentage: (completed /
      total) \* 100. Display progress bar with completion percentage. Color code: green for
      complete, yellow for in-progress.
    - **Tech:** shadcn/ui Progress, percentage calculation, conditional styling
    - **Time Estimate:** 3 hours

  - [x] **2.7.5 Atomic: Add completion percentage text**
    - **Files:** `apps/web/src/components/features/dashboard/CompletionMetricsCard.tsx`
    - **Dependencies:** Task 2.7.4 must be complete
    - **Acceptance:** Display completion percentage as text: "75% Complete". Position above or
      beside progress bar. Format as integer percentage.
    - **Tech:** JavaScript number formatting, text display
    - **Time Estimate:** 2 hours

  - [x] **2.7.6 Atomic: Export component from features/dashboard index**
    - **Files:** `apps/web/src/components/features/dashboard/index.ts` (NEW or UPDATE)
    - **Dependencies:** Task 2.7.5 must be complete
    - **Acceptance:** Export CompletionMetricsCard from dashboard index. Can be imported:
      `import { CompletionMetricsCard } from '@/components/features/dashboard'`.
    - **Tech:** TypeScript module exports
    - **Time Estimate:** 1 hour

- [x] **2.8 Story: Indicator Navigation List Component**
  - Create `IndicatorNavigationList` component in `src/components/features/dashboard/`
  - Group indicators by governance area and section
  - Show completion status badge (Complete/Incomplete) - NOT compliance status
  - Provide clickable links to navigate to each indicator's form
  - Use shadcn/ui Accordion, Badge, Button components
  - Tech stack involved: React, TypeScript, shadcn/ui, Next.js Link
  - Dependencies: Story 2.5 must be complete

  - [x] **2.8.1 Atomic: Create IndicatorNavigationList component file**
    - **Files:** `apps/web/src/components/features/dashboard/IndicatorNavigationList.tsx` (NEW)
    - **Dependencies:** Story 2.5 must be complete
    - **Acceptance:** Client Component created. Accepts assessmentId prop. Exports default
      IndicatorNavigationList. Placeholder content renders.
    - **Tech:** React Client Component, TypeScript
    - **Time Estimate:** 2 hours

  - [x] **2.8.2 Atomic: Integrate useGetIndicatorNavigation hook**
    - **Files:** `apps/web/src/components/features/dashboard/IndicatorNavigationList.tsx`
    - **Dependencies:** Task 2.8.1 must be complete
    - **Acceptance:** Import and call useGetIndicatorNavigation(assessmentId). Destructure data
      (array), isLoading, error. Handle states.
    - **Tech:** TanStack Query hooks, array data handling
    - **Time Estimate:** 2 hours

  - [x] **2.8.3 Atomic: Group indicators by governance area**
    - **Files:** `apps/web/src/components/features/dashboard/IndicatorNavigationList.tsx`
    - **Dependencies:** Task 2.8.2 must be complete
    - **Acceptance:** Use JavaScript reduce or lodash groupBy to group indicators by
      governance_area_name. Create nested structure for rendering.
    - **Tech:** JavaScript array methods, grouping logic
    - **Time Estimate:** 3 hours

  - [x] **2.8.4 Atomic: Render governance areas with shadcn/ui Accordion**
    - **Files:** `apps/web/src/components/features/dashboard/IndicatorNavigationList.tsx`
    - **Dependencies:** Task 2.8.3 must be complete
    - **Acceptance:** Use shadcn/ui Accordion component. Each governance area is an AccordionItem.
      Area name as AccordionTrigger. Indicators as AccordionContent.
    - **Tech:** shadcn/ui Accordion, React mapping
    - **Time Estimate:** 3 hours

  - [x] **2.8.5 Atomic: Render indicator list items with completion badges**
    - **Files:** `apps/web/src/components/features/dashboard/IndicatorNavigationList.tsx`
    - **Dependencies:** Task 2.8.4 must be complete
    - **Acceptance:** For each indicator, display title, completion badge (shadcn/ui Badge). Badge
      shows "Complete" (green) or "Incomplete" (yellow). Do NOT show compliance status.
    - **Tech:** shadcn/ui Badge, conditional styling, mapping
    - **Time Estimate:** 3 hours

  - [x] **2.8.6 Atomic: Add Next.js Link to navigate to indicator form**
    - **Files:** `apps/web/src/components/features/dashboard/IndicatorNavigationList.tsx`
    - **Dependencies:** Task 2.8.5 must be complete
    - **Acceptance:** Wrap each indicator item in Next.js Link. href set to indicator.route_path.
      Clicking navigates to form page. Use shadcn/ui Button as link child.
    - **Tech:** Next.js Link, routing, shadcn/ui Button
    - **Time Estimate:** 3 hours

  - [x] **2.8.7 Atomic: Add empty state when no indicators**
    - **Files:** `apps/web/src/components/features/dashboard/IndicatorNavigationList.tsx`
    - **Dependencies:** Task 2.8.6 must be complete
    - **Acceptance:** If data array is empty, display empty state message: "No indicators found."
      Use shadcn/ui Alert or Card for styling.
    - **Tech:** Conditional rendering, shadcn/ui components
    - **Time Estimate:** 2 hours

  - [x] **2.8.8 Atomic: Export component from features/dashboard index**
    - **Files:** `apps/web/src/components/features/dashboard/index.ts`
    - **Dependencies:** Task 2.8.7 must be complete
    - **Acceptance:** Export IndicatorNavigationList from dashboard index.
    - **Tech:** TypeScript module exports
    - **Time Estimate:** 1 hour

- [x] **2.9 Story: Assessor Comments Display Component**
  - Create `AssessorCommentsPanel` component in `src/components/features/dashboard/`
  - Display assessor comments grouped by indicator
  - Only show when assessment status is REWORK
  - Highlight which indicators need attention based on comments
  - Use shadcn/ui Alert, Card components
  - Tech stack involved: React, TypeScript, shadcn/ui
  - Dependencies: Story 2.5 must be complete

  - [x] **2.9.1 Atomic: Create AssessorCommentsPanel component file**
    - **Files:** `apps/web/src/components/features/dashboard/AssessorCommentsPanel.tsx` (NEW)
    - **Dependencies:** Story 2.5 must be complete
    - **Acceptance:** Client Component created. Accepts assessmentId prop. Exports default
      AssessorCommentsPanel. Placeholder content renders.
    - **Tech:** React Client Component, TypeScript
    - **Time Estimate:** 2 hours

  - [x] **2.9.2 Atomic: Integrate useGetAssessorComments hook**
    - **Files:** `apps/web/src/components/features/dashboard/AssessorCommentsPanel.tsx`
    - **Dependencies:** Task 2.9.1 must be complete
    - **Acceptance:** Import and call useGetAssessorComments(assessmentId). Destructure data,
      isLoading, error. Handle states. If no data (not REWORK status), return null (don't render).
    - **Tech:** TanStack Query hooks, conditional rendering
    - **Time Estimate:** 3 hours

  - [x] **2.9.3 Atomic: Render comments in shadcn/ui Alert component**
    - **Files:** `apps/web/src/components/features/dashboard/AssessorCommentsPanel.tsx`
    - **Dependencies:** Task 2.9.2 must be complete
    - **Acceptance:** Use shadcn/ui Alert with variant "warning" or "info". Display comment_text.
      Show alert icon.
    - **Tech:** shadcn/ui Alert, component styling
    - **Time Estimate:** 2 hours

  - [x] **2.9.4 Atomic: Display assessor name and timestamp**
    - **Files:** `apps/web/src/components/features/dashboard/AssessorCommentsPanel.tsx`
    - **Dependencies:** Task 2.9.3 must be complete
    - **Acceptance:** Display assessor_name and timestamp below comment text. Format timestamp as
      human-readable date: "Requested by [Name] on [Date]". Use date-fns or similar for formatting.
    - **Tech:** JavaScript date formatting, data display
    - **Time Estimate:** 2 hours

  - [x] **2.9.5 Atomic: Add heading "Rework Required"**
    - **Files:** `apps/web/src/components/features/dashboard/AssessorCommentsPanel.tsx`
    - **Dependencies:** Task 2.9.4 must be complete
    - **Acceptance:** Add heading above alert: "Rework Required". Use Tailwind typography. Make it
      prominent to draw attention.
    - **Tech:** Tailwind CSS, typography
    - **Time Estimate:** 1 hour

  - [x] **2.9.6 Atomic: Export component from features/dashboard index**
    - **Files:** `apps/web/src/components/features/dashboard/index.ts`
    - **Dependencies:** Task 2.9.5 must be complete
    - **Acceptance:** Export AssessorCommentsPanel from dashboard index.
    - **Tech:** TypeScript module exports
    - **Time Estimate:** 1 hour

- [x] **2.10 Story: Dashboard Integration with TanStack Query**
  - Integrate `useGetBLGUDashboard` hook in dashboard page
  - Integrate `useGetIndicatorNavigation` hook for navigation list
  - Integrate `useGetAssessorComments` hook for rework comments
  - Handle loading states, error states, and empty states
  - Implement proper error boundaries
  - Tech stack involved: TanStack Query (React Query), React, error handling
  - Dependencies: Stories 2.6, 2.7, 2.8, 2.9 must be complete

  - [x] **2.10.1 Atomic: Verify all hooks integrated in components**
    - **Files:** Verify in `CompletionMetricsCard.tsx`, `IndicatorNavigationList.tsx`,
      `AssessorCommentsPanel.tsx`
    - **Dependencies:** Stories 2.7, 2.8, 2.9 must be complete
    - **Acceptance:** Each component uses correct hook. Data fetching occurs on component mount.
      isLoading, error, data handled.
    - **Tech:** TanStack Query verification, React hooks
    - **Time Estimate:** 2 hours

  - [x] **2.10.2 Atomic: Add loading skeletons for all components**
    - **Files:** `CompletionMetricsCard.tsx`, `IndicatorNavigationList.tsx`,
      `AssessorCommentsPanel.tsx`
    - **Dependencies:** Task 2.10.1 must be complete
    - **Acceptance:** While isLoading is true, display skeleton placeholders. Use shadcn/ui Skeleton
      component. Skeletons match layout of actual content.
    - **Tech:** shadcn/ui Skeleton, conditional rendering
    - **Time Estimate:** 4 hours

  - [x] **2.10.3 Atomic: Add error state displays**
    - **Files:** All dashboard components
    - **Dependencies:** Task 2.10.2 must be complete
    - **Acceptance:** If error exists, display error message using shadcn/ui Alert. Message: "Failed
      to load [component name]. Please try again." Include retry button if applicable.
    - **Tech:** shadcn/ui Alert, error handling, retry logic
    - **Time Estimate:** 3 hours

  - [x] **2.10.4 Atomic: Add React Error Boundary to dashboard page**
    - **Files:** `apps/web/src/app/(app)/blgu/dashboard/page.tsx`
    - **Dependencies:** Task 2.10.3 must be complete
    - **Acceptance:** Wrap dashboard page in Error Boundary. Catch rendering errors. Display
      fallback UI with error message and reset button.
    - **Tech:** React Error Boundary, error handling
    - **Time Estimate:** 3 hours

  - [x] **2.10.5 Atomic: Test TanStack Query cache behavior**
    - **Files:** Manual testing in browser DevTools
    - **Dependencies:** Task 2.10.4 must be complete
    - **Acceptance:** Navigate to dashboard, verify data fetched. Navigate away, return to
      dashboard. Verify data loaded from cache (instant display). Verify refetch on stale data.
    - **Tech:** TanStack Query DevTools, cache inspection
    - **Time Estimate:** 2 hours

- [x] **2.11 Story: Status Badge Component (Completion Only)**
  - Create `CompletionStatusBadge` component in `src/components/features/dashboard/`
  - Display "Complete" or "Incomplete" status (NOT PASS/FAIL/CONDITIONAL)
  - Use color coding: green for complete, yellow for incomplete
  - Ensure no compliance status leaks to BLGU interface
  - Tech stack involved: React, TypeScript, shadcn/ui Badge
  - Dependencies: Story 2.5 must be complete

  - [x] **2.11.1 Atomic: Create CompletionStatusBadge component file**
    - **Files:** `apps/web/src/components/features/dashboard/CompletionStatusBadge.tsx` (NEW)
    - **Dependencies:** Story 2.5 must be complete
    - **Acceptance:** Component created. Accepts status prop: "complete" | "incomplete". Exports
      default CompletionStatusBadge.
    - **Tech:** React, TypeScript, union types
    - **Time Estimate:** 2 hours

  - [x] **2.11.2 Atomic: Render shadcn/ui Badge with status text**
    - **Files:** `apps/web/src/components/features/dashboard/CompletionStatusBadge.tsx`
    - **Dependencies:** Task 2.11.1 must be complete
    - **Acceptance:** Use shadcn/ui Badge component. Display "Complete" if status is "complete",
      "Incomplete" if "incomplete". No other statuses allowed.
    - **Tech:** shadcn/ui Badge, conditional text
    - **Time Estimate:** 2 hours

  - [x] **2.11.3 Atomic: Apply color coding (green/yellow)**
    - **Files:** `apps/web/src/components/features/dashboard/CompletionStatusBadge.tsx`
    - **Dependencies:** Task 2.11.2 must be complete
    - **Acceptance:** Badge is green (variant="success" or custom class) for "complete". Badge is
      yellow (variant="warning" or custom class) for "incomplete". Colors are visually distinct.
    - **Tech:** shadcn/ui Badge variants, Tailwind CSS custom classes
    - **Time Estimate:** 2 hours

  - [x] **2.11.4 Atomic: Add TypeScript type guard to prevent compliance status**
    - **Files:** `apps/web/src/components/features/dashboard/CompletionStatusBadge.tsx`
    - **Dependencies:** Task 2.11.3 must be complete
    - **Acceptance:** Status prop type is strict literal: "complete" | "incomplete". TypeScript
      compiler error if PASS/FAIL/CONDITIONAL attempted. Add comment: "DO NOT expose compliance
      status to BLGU".
    - **Tech:** TypeScript literal types, type safety
    - **Time Estimate:** 2 hours

  - [x] **2.11.5 Atomic: Export component from features/dashboard index**
    - **Files:** `apps/web/src/components/features/dashboard/index.ts`
    - **Dependencies:** Task 2.11.4 must be complete
    - **Acceptance:** Export CompletionStatusBadge from dashboard index.
    - **Tech:** TypeScript module exports
    - **Time Estimate:** 1 hour

- [x] **2.12 Story: Dashboard Routing and Navigation**
  - Update BLGU sidebar navigation to include Dashboard link
  - Ensure dashboard is the default landing page for BLGU users
  - Implement navigation from dashboard to specific indicator forms
  - Handle assessment ID in URL routing
  - Tech stack involved: Next.js App Router, React, routing
  - Dependencies: Story 2.6 must be complete

  - [x] **2.12.1 Atomic: Add Dashboard link to BLGU sidebar navigation**
    - **Files:** `apps/web/src/components/shared/Sidebar.tsx` (or equivalent navigation component)
    - **Dependencies:** Story 2.6 must be complete
    - **Acceptance:** Add navigation item: "Dashboard" with icon. href set to `/blgu/dashboard`.
      Only visible for BLGU_USER role. Positioned at top of navigation.
    - **Tech:** Next.js Link, conditional rendering, role-based UI
    - **Time Estimate:** 3 hours

  - [x] **2.12.2 Atomic: Set dashboard as default landing page for BLGU users**
    - **Files:** `apps/web/src/app/(app)/blgu/page.tsx` or `apps/web/middleware.ts`
    - **Dependencies:** Task 2.12.1 must be complete
    - **Acceptance:** When BLGU user logs in or navigates to `/blgu`, redirect to `/blgu/dashboard`.
      Use Next.js redirect or middleware.
    - **Tech:** Next.js redirect, middleware, role detection
    - **Time Estimate:** 3 hours

  - [x] **2.12.3 Atomic: Implement navigation from IndicatorNavigationList to form page**
    - **Files:** `apps/web/src/components/features/dashboard/IndicatorNavigationList.tsx`
    - **Dependencies:** Task 2.8.6 must be complete
    - **Acceptance:** Verify Link components navigate correctly. Click indicator → navigate to
      `/blgu/assessment/{assessmentId}/indicator/{indicatorId}`. URL params preserved.
    - **Tech:** Next.js Link, routing verification
    - **Time Estimate:** 2 hours

  - [x] **2.12.4 Atomic: Add back-to-dashboard navigation in form page**
    - **Files:**
      `apps/web/src/app/(app)/blgu/assessment/[assessmentId]/indicator/[indicatorId]/page.tsx`
      (future Epic 3, placeholder task)
    - **Dependencies:** Task 2.12.3 must be complete
    - **Acceptance:** Form page includes "Back to Dashboard" link or breadcrumb. Navigates to
      `/blgu/dashboard`. Uses Next.js Link.
    - **Tech:** Next.js Link, breadcrumbs, navigation
    - **Time Estimate:** 2 hours

  - [x] **2.12.5 Atomic: Test full navigation flow**
    - **Files:** Manual testing in browser
    - **Dependencies:** Tasks 2.12.1-2.12.4 must be complete
    - **Acceptance:** Login as BLGU user → lands on dashboard. Click indicator → navigates to form.
      Click back → returns to dashboard. URL updates correctly throughout.
    - **Tech:** Manual testing, navigation flow verification
    - **Time Estimate:** 2 hours

- [x] **2.13 Story: Testing & Validation** ⚠️ **REQUIRED BEFORE NEXT EPIC**
  - Unit test backend endpoints for dashboard metrics, navigation, comments
  - Test role-based access control (BLGU can only see own assessments)
  - Test completion calculation logic with various form states
  - Frontend component tests for all dashboard components
  - Integration test: verify TanStack Query hooks fetch correct data
  - Visual regression test: dashboard layout on different screen sizes
  - E2E test: BLGU user logs in, sees dashboard, navigates to incomplete indicator
  - Tech stack involved: Pytest, React Testing Library, Vitest, Playwright
  - Dependencies: All implementation stories 2.1-2.12 must be complete

  - [x] **2.13.1 Atomic: Unit test GET /blgu-dashboard endpoint**
    - **Files:** `apps/api/tests/api/v1/test_blgu_dashboard.py` (NEW)
    - **Dependencies:** Story 2.1 must be complete
    - **Acceptance:** Test endpoint returns correct completion metrics. Test BLGU user can only
      access own assessment. Test 403 for other users. Test 404 for non-existent assessment. All
      tests pass.
    - **Tech:** Pytest, FastAPI TestClient, fixtures
    - **Time Estimate:** 5 hours

  - [x] **2.13.2 Atomic: Unit test GET /indicators/navigation endpoint**
    - **Files:** `apps/api/tests/api/v1/test_blgu_dashboard.py`
    - **Dependencies:** Story 2.2 must be complete
    - **Acceptance:** Test endpoint returns indicator list with completion status. Test route_path
      generation. Test grouping by governance area. All tests pass.
    - **Tech:** Pytest, FastAPI TestClient
    - **Time Estimate:** 4 hours

  - [x] **2.13.3 Atomic: Unit test GET /assessor-comments endpoint**
    - **Files:** `apps/api/tests/api/v1/test_blgu_dashboard.py`
    - **Dependencies:** Story 2.3 must be complete
    - **Acceptance:** Test endpoint returns comments only if status is REWORK. Test empty response
      if not REWORK. Test permission checks. All tests pass.
    - **Tech:** Pytest, status mocking
    - **Time Estimate:** 3 hours

  - [x] **2.13.4 Atomic: Component test for CompletionMetricsCard**
    - **Files:** `apps/web/src/components/features/dashboard/CompletionMetricsCard.test.tsx` (NEW)
    - **Dependencies:** Story 2.7 must be complete
    - **Acceptance:** Test component renders with mock data. Test loading state shows skeleton. Test
      error state shows error message. Test progress bar displays correct percentage. All tests
      pass.
    - **Tech:** Vitest, React Testing Library, mock TanStack Query
    - **Time Estimate:** 5 hours

  - [x] **2.13.5 Atomic: Component test for IndicatorNavigationList**
    - **Files:** `apps/web/src/components/features/dashboard/IndicatorNavigationList.test.tsx` (NEW)
    - **Dependencies:** Story 2.8 must be complete
    - **Acceptance:** Test component renders indicator list. Test grouping by governance area. Test
      completion badges display correctly. Test Link navigation. All tests pass.
    - **Tech:** Vitest, React Testing Library, mock data
    - **Time Estimate:** 5 hours

  - [x] **2.13.6 Atomic: Component test for AssessorCommentsPanel**
    - **Files:** `apps/web/src/components/features/dashboard/AssessorCommentsPanel.test.tsx` (NEW)
    - **Dependencies:** Story 2.9 must be complete
    - **Acceptance:** Test component renders comments. Test component returns null if no comments.
      Test assessor name and timestamp display. All tests pass.
    - **Tech:** Vitest, React Testing Library
    - **Time Estimate:** 4 hours

  - [x] **2.13.7 Atomic: Integration test for TanStack Query hooks**
    - **Files:** `apps/web/src/components/features/dashboard/__tests__/integration.test.tsx` (NEW)
    - **Dependencies:** Stories 2.7, 2.8, 2.9 must be complete
    - **Acceptance:** Mock API responses. Test hooks fetch data correctly. Test data displayed in
      components. Test cache behavior. All tests pass.
    - **Tech:** Vitest, Mock Service Worker (MSW), TanStack Query testing
    - **Time Estimate:** 6 hours

  - [x] **2.13.8 Atomic: E2E test for dashboard workflow**
    - **Files:** `apps/web/e2e/blgu-dashboard.spec.ts` (NEW)
    - **Dependencies:** All implementation stories must be complete
    - **Acceptance:** Test: BLGU user logs in → lands on dashboard → sees completion metrics →
      clicks incomplete indicator → navigates to form. All steps succeed.
    - **Tech:** Playwright, E2E testing, user flow simulation
    - **Time Estimate:** 6 hours

  - [x] **2.13.9 Atomic: Visual regression test for dashboard layout**
    - **Files:** `apps/web/e2e/visual/dashboard.spec.ts` (NEW)
    - **Dependencies:** Story 2.6 must be complete
    - **Acceptance:** Take screenshots of dashboard on desktop, tablet, mobile. Compare to baseline.
      No unexpected layout shifts. Responsive design works correctly.
    - **Tech:** Playwright screenshots, visual regression testing
    - **Time Estimate:** 4 hours

  - [x] **2.13.10 Atomic: Verify all Epic 2 tests pass**
    - **Files:** Run all tests from tasks 2.13.1-2.13.9
    - **Dependencies:** Tasks 2.13.1-2.13.9 must be complete
    - **Acceptance:** Run `pytest apps/api/tests/` (Epic 2 tests) - all pass. Run `pnpm test`
      (frontend tests) - all pass. Run `pnpm e2e` - all pass. No failures.
    - **Tech:** Pytest, Vitest, Playwright, CI verification
    - **Time Estimate:** 3 hours

## Key Design Decisions

### Completion vs. Compliance Separation

- Dashboard shows **completion status only** (complete/incomplete)
- Compliance status (PASS/FAIL/CONDITIONAL) is **never** exposed to BLGU users
- Backend calculates compliance but stores it in assessor-only fields

### Rework Workflow Integration

- Assessor comments are only visible when assessment status is REWORK
- Comments guide BLGUs to specific indicators needing revision
- Dashboard highlights incomplete indicators that need attention

### Navigation Experience

- Dashboard provides one-click navigation to incomplete indicators
- Indicators are grouped by governance area for better organization
- Progress tracking motivates completion

## Dependencies for Next Epic

Epic 3.0 (Dynamic Form Rendering) depends on:

- Story 2.5: Type generation must be complete for form component integration
- Story 2.12: Routing must be established for navigation to form pages
- Story 2.13: All testing must pass
