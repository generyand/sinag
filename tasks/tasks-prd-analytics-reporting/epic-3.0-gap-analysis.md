# Epic 3.0: Gap Analysis Report System

> **PRD Reference:** FR-12 to FR-17  
> **User Stories:** US-7, US-9  
> **Duration:** 2-3 weeks  
> **Status:** ✅ Completed - 7 stories → 20 atomic tasks

**[← Back to Overview](./README.md)**

---

## Epic Overview

**Description:** Implement a Gap Analysis feature that compares initial BLGU submissions against final validated data, highlighting changes in compliance status at governance area and indicator levels with interactive drill-down and pattern detection.

**Success Criteria:**
- Default view shows governance area-level before/after compliance counts
- Users can drill down: governance area → indicators → response details
- System identifies and displays common correction patterns (e.g., "80% changes related to missing MOVs")
- Gap Analysis respects RBAC filtering (barangay/area based on role)
- PDF export generates properly formatted report with DILG branding

---

  - [ ] **3.1 Story: Backend Gap Analysis Service**

    - **Scope:** Implement service to compare initial vs. final assessment responses
    - **Duration:** 3 days
    - **Dependencies:** Epic 6.0 (database schema)
    - **Files:** `apps/api/app/services/gap_analysis_service.py`, `apps/api/app/schemas/analytics.py` (extend)
    - **Tech:** SQLAlchemy, Pydantic, Python data comparison
    - **Success Criteria:**

      - Service retrieves `response_version = 1` (initial) and latest version (final) for each indicator
      - Calculates delta: changes in `is_completed`, text responses, MOV attachments
      - Aggregates by governance area: count/percentage of changed indicators
      - Identifies common patterns (e.g., "80% changes related to missing MOVs")
      - Returns hierarchical data: municipal → area → indicator → response details

    - [ ] **3.1.1 Atomic:** Create Pydantic schemas for gap analysis data

      - **Files:** `apps/api/app/schemas/analytics.py` (extend)
      - **Dependencies:** None
      - **Acceptance:**
        - Schema `GapAnalysisResponse` with fields: `municipal_summary`, `area_gaps`, `common_patterns`, `metadata`
        - Schema `AreaGap` with fields: `area_code`, `area_name`, `total_indicators`, `changed_indicators`, `change_percentage`, `indicator_gaps: List[IndicatorGap]`
        - Schema `IndicatorGap` with fields: `indicator_id`, `indicator_name`, `initial_response`, `final_response`, `change_type` (is_completed_changed, text_changed, mov_changed)
        - Schema `ResponseComparison` with fields: `is_completed_before`, `is_completed_after`, `text_response_before`, `text_response_after`, `mov_count_before`, `mov_count_after`
        - Schema `CommonPattern` with fields: `pattern_description`, `occurrence_count`, `percentage`
        - All schemas properly typed
      - **Tech:** Pydantic, Python typing, Enum for change_type

    - [ ] **3.1.2 Atomic:** Implement gap analysis service class and version retrieval

      - **Files:** `apps/api/app/services/gap_analysis_service.py`
      - **Dependencies:** 3.1.1 (schemas exist)
      - **Acceptance:**
        - Create `GapAnalysisService` class
        - Method `get_gap_analysis(db, cycle_id, barangay_ids, governance_area_codes, current_user)`
        - Helper `_get_initial_responses(assessment_id)`: queries `assessment_responses` WHERE `response_version = 1`
        - Helper `_get_final_responses(assessment_id)`: queries for MAX(response_version)
        - Returns dict mapping indicator_id → (initial_response, final_response)
        - Handles missing initial or final versions gracefully
      - **Tech:** SQLAlchemy queries, Python dict comprehension

    - [ ] **3.1.3 Atomic:** Implement response comparison and delta calculation

      - **Files:** `apps/api/app/services/gap_analysis_service.py` (extend)
      - **Dependencies:** 3.1.2 (version retrieval implemented)
      - **Acceptance:**
        - Method `_compare_responses(initial, final)` returns `ResponseComparison`
        - Compares `is_completed`: True → False, False → True, or unchanged
        - Compares `text_response`: detects if changed (simple string comparison)
        - Compares MOV attachments: count changed (parse JSON array lengths)
        - Determines `change_type`: multiple changes can be true (e.g., both is_completed AND mov changed)
        - Returns structured comparison object
      - **Tech:** Python comparison logic, JSON parsing

    - [ ] **3.1.4 Atomic:** Implement aggregation by governance area and pattern detection
      - **Files:** `apps/api/app/services/gap_analysis_service.py` (extend)
      - **Dependencies:** 3.1.3 (comparison logic exists)
      - **Acceptance:**
        - Method `_aggregate_by_area(comparisons)` groups by governance_area_code
        - Calculates per area: total indicators, changed indicators, change percentage
        - Method `_detect_common_patterns(comparisons)` analyzes change types
        - Identifies patterns: "X% of changes involved missing MOVs", "Y% changed is_completed status", etc.
        - Returns top 5 most common patterns sorted by occurrence
        - Export singleton: `gap_analysis_service = GapAnalysisService()`
      - **Tech:** Python grouping (itertools.groupby or dict aggregation), pattern analysis

  - [ ] **3.2 Story: Backend Gap Analysis API Endpoint**

    - **Scope:** Create endpoint for gap analysis data with RBAC filtering
    - **Duration:** 1 day
    - **Dependencies:** 3.1 (gap analysis service complete)
    - **Files:** `apps/api/app/api/v1/analytics.py` (extend)
    - **Tech:** FastAPI
    - **Success Criteria:**

      - `GET /api/v1/analytics/gap-analysis` endpoint with tag `analytics`
      - Query params: `cycle_id`, `barangay_id[]`, `governance_area`
      - RBAC filtering: MLGOO_DILG (all), Assessor (area), BLGU (own)
      - Returns nested structure for drill-down

    - [ ] **3.2.1 Atomic:** Create gap analysis endpoint with RBAC
      - **Files:** `apps/api/app/api/v1/analytics.py` (extend)
      - **Dependencies:** 3.1.4 (gap analysis service complete)
      - **Acceptance:**
        - Implement `GET /gap-analysis` endpoint in analytics router
        - Parameters: `cycle_id: int`, `barangay_id: Optional[List[int]] = Query(None)`, `governance_area: Optional[str]`
        - Requires authentication, applies RBAC filtering via dependency
        - Calls `gap_analysis_service.get_gap_analysis()` with filters and current_user
        - Returns `GapAnalysisResponse` schema
        - OpenAPI docs include description and examples
        - Test endpoint manually: `curl http://localhost:8000/api/v1/analytics/gap-analysis?cycle_id=1`
      - **Tech:** FastAPI, Query parameters, dependency injection

  - [ ] **3.3 Story: Type Generation for Gap Analysis**

    - **Scope:** Generate types for gap analysis endpoints
    - **Duration:** 1 hour
    - **Dependencies:** 3.2 (endpoint exists)
    - **Files:** `packages/shared/src/generated/endpoints/analytics/`
    - **Tech:** Orval
    - **Success Criteria:** Types and hooks generated

    - [ ] **3.3.1 Atomic:** Generate TypeScript types for gap analysis
      - **Files:** Run from repository root
      - **Dependencies:** 3.2.1 (endpoint exists)
      - **Acceptance:**
        - Backend running with gap-analysis endpoint
        - Run `pnpm generate-types`
        - Verify `useGetAnalyticsGapAnalysis` hook generated
        - Verify types for `GapAnalysisResponse`, `AreaGap`, `IndicatorGap`, `CommonPattern` exist
        - No TypeScript errors
        - Import test: `import { useGetAnalyticsGapAnalysis } from '@vantage/shared'`
      - **Tech:** Orval, TypeScript

  - [ ] **3.4 Story: Frontend Gap Analysis Page**

    - **Scope:** Create gap analysis page with default medium-detail view
    - **Duration:** 1-2 days
    - **Dependencies:** 3.3 (types generated)
    - **Files:**
      - `apps/web/src/app/(app)/gap-analysis/page.tsx`
      - `apps/web/src/components/features/gap-analysis/GapAnalysisView.tsx`
    - **Tech:** Next.js, React, TanStack Query
    - **Success Criteria:**

      - Page accessible at `/gap-analysis`
      - RBAC enforced
      - Default view shows governance area-level summary
      - Filter controls: cycle, barangay, area
      - Displays common correction patterns highlighted

    - [ ] **3.4.1 Atomic:** Create gap analysis page component

      - **Files:** `apps/web/src/app/(app)/gap-analysis/page.tsx`
      - **Dependencies:** 3.3.1 (types generated)
      - **Acceptance:**
        - Create page with `'use client'` directive
        - Import `useGetAnalyticsGapAnalysis` from `@vantage/shared`
        - State for filters: cycle, barangay, governance area
        - Call hook: `const { data, isLoading, error } = useGetAnalyticsGapAnalysis({ ...filters })`
        - RBAC check: accessible to MLGOO_DILG, Assessor, BLGU with appropriate filtering
        - Page header with title "Gap Analysis"
        - Loading/error states with Skeleton and Alert
      - **Tech:** Next.js, React hooks, TanStack Query

    - [ ] **3.4.2 Atomic:** Create custom gap analysis hook and filter controls

      - **Files:** `apps/web/src/hooks/useGapAnalysis.ts`, `apps/web/src/app/(app)/gap-analysis/page.tsx` (extend)
      - **Dependencies:** 3.4.1 (page exists)
      - **Acceptance:**
        - Custom hook `useGapAnalysis()` wraps Orval hook with error handling
        - Add filter controls to page: cycle selector, barangay multi-select, governance area selector
        - Filters apply to hook query
        - Filter changes trigger data re-fetch
        - Responsive filter layout
      - **Tech:** React custom hooks, shadcn/ui Select

    - [ ] **3.4.3 Atomic:** Create area-level summary view with common patterns
      - **Files:** `apps/web/src/components/features/gap-analysis/GapAnalysisView.tsx`
      - **Dependencies:** 3.4.2 (hook and filters exist)
      - **Acceptance:**
        - Component accepts prop: `data: GapAnalysisResponse`
        - Display municipal summary: total changes, overall change percentage
        - Display area-level cards showing: area name, total indicators, changed indicators, change percentage
        - Use progress bars or percentage indicators
        - Section for "Common Patterns" highlighting top patterns with Badge components
        - Color coding: high change % (red), medium (yellow), low (green)
        - Default view: collapsed, shows summary only
      - **Tech:** React, shadcn/ui (Card, Badge, Progress), Tailwind CSS

  - [ ] **3.5 Story: Interactive Drill-Down Components**

    - **Scope:** Build collapsible drill-down UI (area → indicators → details)
    - **Duration:** 2-3 days
    - **Dependencies:** 3.4 (gap analysis page exists)
    - **Files:**
      - `apps/web/src/components/features/gap-analysis/GapAnalysisView.tsx` (extend)
      - `apps/web/src/components/features/gap-analysis/ComparisonTable.tsx`
      - `apps/web/src/hooks/useGapAnalysis.ts`
    - **Tech:** React, shadcn/ui Collapsible, Accordion, Table
    - **Success Criteria:**

      - Click governance area expands to show indicators
      - Click indicator shows before/after comparison table
      - Comparison highlights: changes in `is_completed`, text diffs, MOV changes
      - Smooth animations for expand/collapse
      - Color coding for changes (added/removed/modified)

    - [ ] **3.5.1 Atomic:** Implement collapsible governance area sections

      - **Files:** `apps/web/src/components/features/gap-analysis/GapAnalysisView.tsx` (extend)
      - **Dependencies:** 3.4.3 (summary view exists)
      - **Acceptance:**
        - Convert area cards to Accordion components (shadcn/ui)
        - Each area is an AccordionItem with trigger showing summary
        - State management: track which areas are expanded
        - Click area card/header expands to show indicator list
        - Smooth expand/collapse animation (CSS transitions)
        - Expanded view shows all indicators in that area with change status
      - **Tech:** shadcn/ui Accordion, React state, CSS animations

    - [ ] **3.5.2 Atomic:** Create indicator comparison table component

      - **Files:** `apps/web/src/components/features/gap-analysis/ComparisonTable.tsx`
      - **Dependencies:** 3.5.1 (collapsible areas exist)
      - **Acceptance:**
        - Export `IndicatorComparisonTable` component
        - Props: `indicatorGap: IndicatorGap` (from API response)
        - Table with columns: Field, Initial Value, Final Value, Changed
        - Rows: is_completed, text_response, MOV count
        - Color coding: green (unchanged), yellow (modified), red (removed/failed)
        - Text diff highlighting: Show changed words/sentences in different color
        - MOV count shows before/after with visual indicator (arrows up/down)
        - Table uses shadcn/ui Table components
      - **Tech:** React, shadcn/ui Table, text diff library (optional: diff-match-patch)

    - [ ] **3.5.3 Atomic:** Integrate drill-down with click interactions
      - **Files:** `apps/web/src/components/features/gap-analysis/GapAnalysisView.tsx` (extend)
      - **Dependencies:** 3.5.2 (comparison table exists)
      - **Acceptance:**
        - When area expanded, render list of indicators
        - Each indicator is clickable (Button or clickable div)
        - Click indicator opens Dialog or expands inline to show ComparisonTable
        - Dialog contains indicator name, comparison table, close button
        - Multiple indicators can be compared sequentially
        - Keyboard navigation support (Esc to close, Tab through items)
        - Import and render ComparisonTable in dialog/expanded section
      - **Tech:** shadcn/ui Dialog or Collapsible nested, keyboard events

  - [ ] **3.6 Story: Gap Analysis PDF Export**

    - **Scope:** Generate PDF report for gap analysis with DILG branding
    - **Duration:** 1-2 days
    - **Dependencies:** 3.5 (UI complete)
    - **Files:** `apps/web/src/lib/pdf-export.ts` (extend)
    - **Tech:** jsPDF, html2canvas
    - **Success Criteria:**

      - Export button generates PDF with gap analysis data
      - PDF includes DILG logo, headers/footers, page numbers
      - Contains metadata: cycle, filters, timestamp
      - Formatted tables show before/after comparisons
      - Only accessible to MLGOO_DILG

    - [ ] **3.6.1 Atomic:** Create gap analysis PDF export function

      - **Files:** `apps/web/src/lib/pdf-export.ts` (extend)
      - **Dependencies:** 3.5.3 (UI complete), 2.9.1 (jsPDF installed)
      - **Acceptance:**
        - Export function `exportGapAnalysisToPDF(data: GapAnalysisResponse, filters: FilterState, metadata: Metadata)`
        - Use jsPDF to create document
        - Page 1: Cover with DILG logo, title "Gap Analysis Report", metadata (cycle, filters, generation timestamp)
        - Page 2: Municipal summary and common patterns
        - Page 3+: Per-area breakdown with before/after tables
        - Each area gets own section with: area name, change summary, top changed indicators
        - Headers/footers on all pages with page numbers
        - A4 portrait orientation
        - Function triggers download: `gap-analysis_${timestamp}.pdf`
      - **Tech:** jsPDF, async/await

    - [ ] **3.6.2 Atomic:** Add export button to gap analysis page
      - **Files:** `apps/web/src/app/(app)/gap-analysis/page.tsx` (extend)
      - **Dependencies:** 3.6.1 (PDF export function exists)
      - **Acceptance:**
        - Add "Export PDF" button in page header (top-right)
        - Button only visible to MLGOO_DILG role
        - Click button calls `exportGapAnalysisToPDF()` with current data and filters
        - Show loading spinner during PDF generation
        - Success toast notification: "Gap Analysis PDF exported successfully"
        - Error toast if export fails
        - Button disabled while loading or if no data
      - **Tech:** React, shadcn/ui Button, toast notifications, RBAC

  - [ ] **3.7 Story: Gap Analysis Testing**

    - **Scope:** Test gap analysis service and UI
    - **Duration:** 1-2 days
    - **Dependencies:** 3.6 (all features complete)
    - **Files:**
      - `apps/api/tests/services/test_gap_analysis_service.py`
      - `apps/api/tests/api/v1/test_analytics.py` (extend)
      - `apps/web/src/components/features/gap-analysis/__tests__/GapAnalysisView.test.tsx`
    - **Tech:** Pytest, Vitest, React Testing Library
    - **Success Criteria:**

      - Backend: Test comparison logic with various data scenarios
      - Backend: Test pattern detection algorithm
      - Frontend: Test drill-down interactions
      - Frontend: Test PDF export
      - All tests pass

    - [ ] **3.7.1 Atomic:** Write backend gap analysis service tests

      - **Files:** `apps/api/tests/services/test_gap_analysis_service.py`
      - **Dependencies:** 3.1.4 (gap analysis service complete)
      - **Acceptance:**
        - Test `get_gap_analysis()` with valid cycle_id returns hierarchical data
        - Test comparison logic: indicator changed from incomplete → complete, complete → incomplete, text changed, MOV count changed
        - Test aggregation by area: verify percentages calculated correctly
        - Test pattern detection: verify top patterns identified
        - Test edge cases: no changes (all responses identical), all indicators changed
        - Test RBAC filtering: MLGOO_DILG sees all, Assessor sees area only, BLGU sees own barangay
        - Use pytest fixtures for test data with version 1 and version 2 responses
        - Run: `pytest tests/services/test_gap_analysis_service.py -vv`
      - **Tech:** Pytest, SQLAlchemy fixtures

    - [ ] **3.7.2 Atomic:** Write backend gap analysis endpoint tests

      - **Files:** `apps/api/tests/api/v1/test_analytics.py` (extend)
      - **Dependencies:** 3.2.1 (endpoint exists)
      - **Acceptance:**
        - Test `GET /api/v1/analytics/gap-analysis` returns 200 with valid JWT
        - Test query parameters: `?cycle_id=1`, `?barangay_id=1&barangay_id=2`, `?governance_area=FA`
        - Test RBAC: 401 without auth, 403 for unauthorized role
        - Test response structure matches `GapAnalysisResponse` schema
        - Verify nested structure: areas contain indicators, indicators contain comparisons
        - Run: `pytest tests/api/v1/test_analytics.py::test_gap_analysis -vv`
      - **Tech:** Pytest, FastAPI TestClient

    - [ ] **3.7.3 Atomic:** Write frontend gap analysis component tests

      - **Files:** `apps/web/src/components/features/gap-analysis/__tests__/GapAnalysisView.test.tsx`
      - **Dependencies:** 3.5.3 (drill-down complete)
      - **Acceptance:**
        - Test GapAnalysisView renders with mock data
        - Test area summary cards display correctly
        - Test common patterns section renders top patterns
        - Test accordion expand/collapse on area click
        - Test indicator list appears when area expanded
        - Test ComparisonTable renders with indicator data
        - Test dialog/modal opens when indicator clicked
        - Mock hook: `useGetAnalyticsGapAnalysis` returns mock `GapAnalysisResponse`
        - Run: `pnpm test GapAnalysisView.test.tsx`
      - **Tech:** Vitest, React Testing Library, user-event

    - [ ] **3.7.4 Atomic:** Write gap analysis PDF export test
      - **Files:** `apps/web/src/lib/__tests__/pdf-export.test.ts` (extend)
      - **Dependencies:** 3.6.2 (PDF export integrated)
      - **Acceptance:**
        - Test `exportGapAnalysisToPDF()` function
        - Mock jsPDF: verify called with correct parameters
        - Verify PDF structure: cover page, summary page, area breakdowns
        - Verify metadata included in PDF
        - Test filename format includes timestamp
        - Test error handling if PDF generation fails
        - Run: `pnpm test pdf-export.test.ts`
      - **Tech:** Vitest, vi.mock for jsPDF

