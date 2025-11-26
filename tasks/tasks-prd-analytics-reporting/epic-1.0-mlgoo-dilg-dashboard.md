# Epic 1.0: MLGOO-DILG Dashboard

> **PRD Reference:** FR-1 to FR-6  
> **User Stories:** US-1, US-2, US-3, US-4  
> **Duration:** 2-3 weeks  
> **Status:** ✅ Completed - 6 stories → 24 atomic tasks

**[← Back to Overview](./README.md)**

---

## Epic Overview

**Description:** Build a dedicated analytics dashboard for MLGOO-DILG users displaying municipal-wide KPIs including pass/fail rates, compliance status by governance area, top failed indicators, comparative barangay performance, and historical trends across assessment cycles.

**Success Criteria:**
- MLGOO-DILG users can view all 5 KPI categories for any assessment cycle
- Dashboard auto-refreshes when cycle selection changes without page reload
- Trend charts display historical data across up to 3 cycles
- All data respects RBAC (MLGOO-DILG role only)

---

- [x] **1.0 Epic: MLGOO-DILG Dashboard** _(FR-1 to FR-6)_

  - [x] **1.1 Story: Backend Analytics Service for Dashboard KPIs**

    - **Scope:** Implement business logic for calculating all dashboard KPIs (pass/fail rates, compliance by area, top failed indicators, barangay rankings, trends)
    - **Duration:** 2-3 days
    - **Dependencies:** Epic 6.0 (database schema must exist)
    - **Files:** `apps/api/app/services/analytics_service.py`, `apps/api/app/schemas/analytics.py`
    - **Tech:** SQLAlchemy queries, Pydantic schemas, Python data aggregation
    - **Success Criteria:**

      - Service methods calculate all 5 KPI categories correctly
      - Handles edge cases (no data, single cycle, missing governance areas)
      - Efficiently queries database using joins and aggregations
      - Returns structured data matching Pydantic schemas

    - [x] **1.1.1 Atomic:** Create Pydantic schemas for dashboard data structures

      - **Files:** `apps/api/app/schemas/analytics.py`
      - **Dependencies:** None
      - **Acceptance:**
        - Schema `DashboardKPIResponse` created with fields: `overall_compliance_rate`, `completion_status`, `area_breakdown`, `top_failed_indicators`, `barangay_rankings`, `trends`
        - Schema `ComplianceRate` with fields: `total_barangays`, `passed`, `failed`, `pass_percentage`
        - Schema `AreaBreakdown` with fields: `area_code`, `area_name`, `passed`, `failed`, `percentage`
        - Schema `FailedIndicator` with fields: `indicator_id`, `indicator_name`, `failure_count`, `percentage`
        - Schema `BarangayRanking` with fields: `barangay_id`, `barangay_name`, `score`, `rank`
        - Schema `TrendData` with fields: `cycle_id`, `cycle_name`, `pass_rate`, `date`
        - All schemas use proper types (int, float, str, datetime) and include `Config` with `from_attributes = True`
      - **Tech:** Pydantic, Python typing

    - [x] **1.1.2 Atomic:** Implement analytics service class with KPI calculation methods

      - **Files:** `apps/api/app/services/analytics_service.py`
      - **Dependencies:** 1.1.1 (schemas exist)
      - **Acceptance:**
        - Create `AnalyticsService` class with methods: `get_dashboard_kpis(db, cycle_id)`, `_calculate_overall_compliance()`, `_calculate_area_breakdown()`, `_calculate_top_failed_indicators()`, `_calculate_barangay_rankings()`, `_calculate_trends()`
        - Each method uses SQLAlchemy queries with proper joins (assessments → governance_area_results → assessment_responses)
        - Handles None/empty cycle_id by defaulting to latest cycle
        - Handles edge cases: no assessments, no validated data, missing governance areas
        - Returns data matching Pydantic schemas from 1.1.1
        - Uses efficient queries with `group_by`, `count()`, aggregations
      - **Tech:** SQLAlchemy ORM, Python, dependency injection pattern

    - [x] **1.1.3 Atomic:** Implement overall compliance rate calculation

      - **Files:** `apps/api/app/services/analytics_service.py` (extend `_calculate_overall_compliance()`)
      - **Dependencies:** 1.1.2 (service class exists)
      - **Acceptance:**
        - Method queries `assessments` table filtered by `cycle_id` and `final_compliance_status IS NOT NULL`
        - Counts total barangays, passed (status = 'Pass'), failed (status = 'Fail')
        - Calculates pass_percentage = (passed / total) \* 100
        - Returns `ComplianceRate` schema instance
        - Handles division by zero (returns 0% if no assessments)
      - **Tech:** SQLAlchemy `func.count()`, `case()` statements

    - [x] **1.1.4 Atomic:** Implement area breakdown and top failed indicators calculation

      - **Files:** `apps/api/app/services/analytics_service.py` (extend methods)
      - **Dependencies:** 1.1.3 (overall calculation implemented)
      - **Acceptance:**
        - `_calculate_area_breakdown()`: Joins `governance_area_results` with `governance_areas`, groups by area_code, counts pass/fail per area
        - `_calculate_top_failed_indicators()`: Joins `assessment_responses` where `is_completed = False`, groups by `indicator_id`, orders by count DESC, limits to 5
        - Both methods filter by cycle_id
        - Returns list of `AreaBreakdown` and `FailedIndicator` schemas
      - **Tech:** SQLAlchemy joins, `order_by()`, `limit()`

    - [x] **1.1.5 Atomic:** Implement barangay rankings and trend analysis
      - **Files:** `apps/api/app/services/analytics_service.py` (extend methods)
      - **Dependencies:** 1.1.4 (area/indicator calculations done)
      - **Acceptance:**
        - `_calculate_barangay_rankings()`: Calculates score per barangay (percentage of completed indicators), orders DESC, assigns rank
        - `_calculate_trends()`: Queries last 3 cycles, calculates pass_rate for each, returns chronologically
        - Both return proper schema instances
        - Export singleton: `analytics_service = AnalyticsService()` at module level
      - **Tech:** SQLAlchemy window functions for ranking, date filtering

  - [x] **1.2 Story: Backend API Endpoints for Dashboard**

    - **Scope:** Create FastAPI endpoints to serve dashboard data with RBAC enforcement
    - **Duration:** 1-2 days
    - **Dependencies:** 1.1 (analytics service implemented)
    - **Files:** `apps/api/app/api/v1/analytics.py`
    - **Tech:** FastAPI, JWT authentication, dependency injection
    - **Success Criteria:**

      - `GET /api/v1/analytics/dashboard` endpoint created with tag `analytics`
      - Requires MLGOO_DILG role (enforced via dependency)
      - Accepts `cycle_id` query parameter (optional, defaults to latest)
      - Returns all KPIs in structured JSON format
      - Handles 401/403 errors for unauthorized access

    - [x] **1.2.1 Atomic:** Create analytics router and dashboard endpoint

      - **Files:** `apps/api/app/api/v1/analytics.py`
      - **Dependencies:** 1.1.5 (analytics service complete)
      - **Acceptance:**
        - Create FastAPI router with prefix `/analytics` and tag `["analytics"]`
        - Implement `GET /dashboard` endpoint
        - Endpoint signature: `get_dashboard(cycle_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_mlgoo_dilg_user))`
        - Calls `analytics_service.get_dashboard_kpis(db, cycle_id)`
        - Returns `DashboardKPIResponse` schema
        - Include OpenAPI docs: summary, description, response examples
      - **Tech:** FastAPI, Pydantic, dependency injection

    - [x] **1.2.2 Atomic:** Register analytics router in API initialization
      - **Files:** `apps/api/app/api/v1/__init__.py`
      - **Dependencies:** 1.2.1 (router created)
      - **Acceptance:**
        - Import `analytics` router from `app.api.v1.analytics`
        - Add `app.include_router(analytics.router, prefix="/api/v1")` in API router registration
        - Verify endpoint accessible at `GET /api/v1/analytics/dashboard`
        - Test with `curl http://localhost:8000/api/v1/analytics/dashboard` (should return 401 without auth)
      - **Tech:** FastAPI router composition

  - [x] **1.3 Story: Type Generation for Dashboard**

    - **Scope:** Run Orval to generate TypeScript types and React Query hooks for dashboard endpoints
    - **Duration:** 1 hour
    - **Dependencies:** 1.2 (API endpoints exist)
    - **Files:** `packages/shared/src/generated/endpoints/analytics/`, `packages/shared/src/generated/schemas/analytics/`
    - **Tech:** Orval, OpenAPI, TypeScript
    - **Success Criteria:**

      - `pnpm generate-types` runs successfully
      - React Query hooks generated (e.g., `useGetAnalyticsDashboard`)
      - TypeScript types generated for all request/response schemas

    - [x] **1.3.1 Atomic:** Generate TypeScript types from OpenAPI spec
      - **Files:** Run from repository root
      - **Dependencies:** 1.2.2 (endpoint registered and backend running)
      - **Acceptance:**
        - Start backend: `cd apps/api && pnpm dev`
        - Verify OpenAPI spec includes analytics endpoints: `curl http://localhost:8000/openapi.json | grep "analytics/dashboard"`
        - Run type generation from root: `pnpm generate-types`
        - Verify files created in `packages/shared/src/generated/endpoints/analytics/analytics.ts`
        - Verify types in `packages/shared/src/generated/schemas/analytics/`
        - Verify `useGetAnalyticsDashboard` hook exists with correct signature
        - No TypeScript errors in generated files
      - **Tech:** Orval, OpenAPI, shell commands

  - [x] **1.4 Story: Frontend Dashboard Page**

    - **Scope:** Create MLGOO-DILG dashboard page with layout and routing
    - **Duration:** 1 day
    - **Dependencies:** 1.3 (types generated)
    - **Files:** `apps/web/src/app/(app)/analytics/page.tsx`
    - **Tech:** Next.js 15 App Router, Server Components, TypeScript
    - **Success Criteria:**

      - Page accessible at `/analytics` route
      - Protected by authentication middleware
      - RBAC check ensures only MLGOO_DILG role can access
      - Page layout includes header, cycle selector, and grid for KPI cards
      - Loading states and error handling implemented

    - [x] **1.4.1 Atomic:** Create analytics dashboard page component

      - **Files:** `apps/web/src/app/(app)/analytics/page.tsx`
      - **Dependencies:** 1.3.1 (types generated)
      - **Acceptance:**
        - Create file with `'use client'` directive (needs client-side data fetching)
        - Import `useGetAnalyticsDashboard` from `@sinag/shared`
        - Component checks user role, redirects if not MLGOO_DILG
        - Implements loading state with shadcn/ui Skeleton components
        - Implements error state with Alert component
        - Page layout: header with title "Analytics Dashboard", cycle selector dropdown, grid container for KPI cards
        - Export default function `AnalyticsPage`
      - **Tech:** Next.js 15, React 19, TypeScript, TanStack Query

    - [x] **1.4.2 Atomic:** Implement cycle selector and data fetching
      - **Files:** `apps/web/src/app/(app)/analytics/page.tsx` (extend)
      - **Dependencies:** 1.4.1 (page component exists)
      - **Acceptance:**
        - Add state: `const [selectedCycle, setSelectedCycle] = useState<number | null>(null)`
        - Use hook: `const { data, isLoading, error } = useGetAnalyticsDashboard({ cycle_id: selectedCycle })`
        - Create cycle selector using shadcn/ui Select component
        - Fetch available cycles from API or use hardcoded options for now
        - onChange updates selectedCycle state, triggering re-fetch
        - Data auto-refreshes without page reload
        - Display last updated timestamp from response
      - **Tech:** React state, TanStack Query, shadcn/ui Select

  - [x] **1.5 Story: Frontend Dashboard KPI Components**

    - **Scope:** Build reusable KPI card components and trend chart visualizations
    - **Duration:** 2-3 days
    - **Dependencies:** 1.4 (dashboard page exists)
    - **Files:**
      - `apps/web/src/components/features/analytics/DashboardKPIs.tsx`
      - `apps/web/src/components/features/analytics/TrendChart.tsx`
      - `apps/web/src/hooks/useAnalytics.ts`
    - **Tech:** React 19, TanStack Query, Recharts, shadcn/ui, Tailwind CSS
    - **Success Criteria:**

      - KPI cards display all 5 categories: overall rate, completion status, area breakdown, top failed, rankings
      - Trend chart visualizes historical data across 3 cycles using Recharts
      - Cycle selector dropdown auto-refreshes data without page reload
      - Custom hook wraps Orval-generated hook with error handling
      - Components use shadcn/ui Card, Badge, and Select components
      - Color coding: green (pass), red (fail), yellow (in progress)

    - [x] **1.5.1 Atomic:** Create custom analytics hook wrapper

      - **Files:** `apps/web/src/hooks/useAnalytics.ts`
      - **Dependencies:** 1.3.1 (Orval hooks generated)
      - **Acceptance:**
        - Import `useGetAnalyticsDashboard` from `@sinag/shared`
        - Create wrapper hook `useAnalytics(cycleId?: number)` that:
          - Calls Orval hook with proper error handling
          - Formats error messages for user display
          - Provides typed data with defaults for missing fields
          - Returns: `{ data, isLoading, error, refetch }`
        - Export hook as default
      - **Tech:** React hooks, TypeScript, TanStack Query

    - [x] **1.5.2 Atomic:** Create KPI card components for overall compliance and completion

      - **Files:** `apps/web/src/components/features/analytics/DashboardKPIs.tsx`
      - **Dependencies:** 1.5.1 (custom hook exists)
      - **Acceptance:**
        - Create `ComplianceRateCard` component displaying overall pass/fail rate
        - Create `CompletionStatusCard` showing validated vs in-progress barangays
        - Both use shadcn/ui Card component with CardHeader, CardContent
        - Display percentage with progress indicator
        - Use Badge for status (green/red/yellow based on PRD color coding)
        - Props: typed data from API response
        - Components export individually
      - **Tech:** React, shadcn/ui (Card, Badge, Progress), Tailwind CSS

    - [x] **1.5.3 Atomic:** Create KPI cards for area breakdown and top failed indicators

      - **Files:** `apps/web/src/components/features/analytics/DashboardKPIs.tsx` (extend)
      - **Dependencies:** 1.5.2 (basic KPI cards exist)
      - **Acceptance:**
        - Create `AreaBreakdownCard` displaying governance areas with pass/fail percentages
        - Create `TopFailedIndicatorsCard` showing top 5 failed indicators
        - AreaBreakdownCard: Uses horizontal bar chart or list with percentage bars
        - TopFailedIndicatorsCard: Shows indicator names with failure counts and percentages
        - Color coding consistent (green/red)
        - Handle empty data gracefully ("No data available")
      - **Tech:** React, shadcn/ui components, Tailwind CSS

    - [x] **1.5.4 Atomic:** Create barangay rankings card and trend chart component

      - **Files:** `apps/web/src/components/features/analytics/DashboardKPIs.tsx` (extend), `apps/web/src/components/features/analytics/TrendChart.tsx`
      - **Dependencies:** 1.5.3 (other KPI cards exist), Recharts installed
      - **Acceptance:**
        - `BarangayRankingsCard`: Table or list showing barangays ranked by score
        - `TrendChart`: Line chart using Recharts showing pass rates across 3 cycles
        - TrendChart props: `data: TrendData[]`
        - Chart features: axes labels, tooltips, responsive container, grid lines
        - Legend showing what the line represents
        - Color: green for trend line
        - Both handle loading and empty states
      - **Tech:** React, Recharts (LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer), shadcn/ui

    - [x] **1.5.5 Atomic:** Integrate all KPI components into dashboard page
      - **Files:** `apps/web/src/app/(app)/analytics/page.tsx` (extend)
      - **Dependencies:** 1.5.4 (all KPI components created)
      - **Acceptance:**
        - Import all KPI components
        - Arrange in responsive grid using Tailwind CSS (3 columns desktop, 2 tablet, 1 mobile)
        - Pass data from `useAnalytics` hook to each component
        - Grid includes: ComplianceRateCard, CompletionStatusCard, AreaBreakdownCard, TopFailedIndicatorsCard, BarangayRankingsCard, TrendChart
        - All components render with real data
        - Responsive layout verified on mobile/tablet/desktop
      - **Tech:** Next.js, React, Tailwind CSS grid/flexbox

  - [x] **1.6 Story: Dashboard Testing**

    - **Scope:** Write comprehensive tests for dashboard backend and frontend
    - **Duration:** 1-2 days
    - **Dependencies:** 1.2, 1.5 (backend and frontend complete)
    - **Files:**
      - `apps/api/tests/api/v1/test_analytics.py`
      - `apps/api/tests/test_analytics_service.py`
      - `apps/web/src/components/features/dashboard-analytics/__tests__/DashboardKPIs.test.tsx`
      - `apps/web/src/components/features/dashboard-analytics/__tests__/TrendChart.test.tsx`
      - `apps/web/src/app/(app)/analytics/__tests__/page.test.tsx`
    - **Tech:** Pytest, React Testing Library, Vitest
    - **Success Criteria:**
      - Backend: Test KPI calculation logic with various datasets ✅
      - Backend: Test RBAC enforcement (401/403 for non-MLGOO_DILG) ✅
      - Backend: Test cycle filtering and edge cases ✅
      - Frontend: Test component rendering with mock data ✅
      - Frontend: Test cycle selector rendering ✅
      - All tests pass with `pnpm test` ✅
    - **Result:** ✅ 50 total tests (20 backend + 30 frontend) - 49 passing, 1 skipped

    - [x] **1.6.1 Atomic:** Write backend service layer tests

      - **Files:** `apps/api/tests/test_analytics_service.py`
      - **Dependencies:** 1.1.5 (analytics service complete)
      - **Acceptance:**
        - Test `get_dashboard_kpis()` with valid cycle_id returns correct data structure
        - Test with `cycle_id=None` defaults to latest cycle
        - Test `_calculate_overall_compliance()` with various pass/fail distributions
        - Test `_calculate_area_breakdown()` with multiple governance areas
        - Test `_calculate_top_failed_indicators()` returns exactly 5 items (or fewer if < 5 failures)
        - Test edge case: no assessments (returns empty/zero values)
        - Test edge case: all passed (failed list empty)
        - All tests use pytest fixtures for test data
        - Run with: `cd apps/api && pytest tests/test_analytics_service.py -vv`
      - **Tech:** Pytest, SQLAlchemy test fixtures, Python
      - **Result:** ✅ 13 tests passing

    - [x] **1.6.2 Atomic:** Write backend API endpoint tests

      - **Files:** `apps/api/tests/api/v1/test_analytics.py`
      - **Dependencies:** 1.2.2 (endpoint registered)
      - **Acceptance:**
        - Test `GET /api/v1/analytics/dashboard` returns 200 with valid MLGOO_DILG JWT
        - Test returns 401 without authentication token
        - Test returns 403 with non-MLGOO_DILG user (BLGU or Assessor role)
        - Test with `?cycle_id=1` filters correctly
        - Test response structure matches `DashboardKPIResponse` schema
        - Use pytest fixtures for authenticated clients
        - Run with: `cd apps/api && pytest tests/api/v1/test_analytics.py -vv`
      - **Tech:** Pytest, FastAPI TestClient, JWT fixtures
      - **Result:** ✅ 7 tests passing

    - [x] **1.6.3 Atomic:** Write frontend component tests

      - **Files:** `apps/web/src/components/features/dashboard-analytics/__tests__/DashboardKPIs.test.tsx`, `apps/web/src/components/features/dashboard-analytics/__tests__/TrendChart.test.tsx`
      - **Dependencies:** 1.5.5 (all KPI components integrated)
      - **Acceptance:**
        - Test `ComplianceRateCard` renders with mock data (shows correct percentage)
        - Test `CompletionStatusCard` displays correct counts
        - Test `AreaBreakdownCard` renders all governance areas
        - Test `TopFailedIndicatorsCard` shows indicator names and counts
        - Test `TrendChart` renders component with data table
        - Test components handle empty data gracefully (no crash, shows "No data")
        - Mock TanStack Query hook responses
        - Run with: `pnpm test` from repository root
      - **Tech:** Vitest, React Testing Library
      - **Result:** ✅ 21 tests passing (16 DashboardKPIs + 5 TrendChart)

    - [x] **1.6.4 Atomic:** Write frontend page integration test
      - **Files:** `apps/web/src/app/(app)/analytics/__tests__/page.test.tsx`
      - **Dependencies:** 1.6.3 (component tests written)
      - **Acceptance:**
        - Test full page renders with mock authenticated user (MLGOO_DILG role)
        - Test cycle selector rendering
        - Test loading state shows Skeleton components
        - Test error state shows Alert with error message
        - Test RBAC: non-MLGOO_DILG user denied access
        - Mock `useDashboardAnalytics` hook
        - Verify all 6 KPI components render on page
      - **Tech:** Vitest, React Testing Library, Next.js testing utilities
      - **Result:** ✅ 8 tests passing + 1 skipped (jsdom limitation with Radix UI Select)

