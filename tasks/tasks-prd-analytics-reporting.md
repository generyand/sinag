# Tasks: High-Level Analytics & Reporting Feature

> Generated from: `docs/prds/prd-analytics-reporting.md` Status: Phase 3 - Atomic Tasks Generated
> (Partially Complete - Epics 1.0-3.0 Fully Detailed)
>
> **Completion Status:**
>
> - ✅ Epic 1.0 (MLGOO-DILG Dashboard): 6 stories → 24 atomic tasks
> - ✅ Epic 2.0 (Reports Page): 10 stories → 44 atomic tasks
> - ✅ Epic 3.0 (Gap Analysis): 7 stories → 20 atomic tasks
> - ⚠️ Epic 4.0 (AI Recommendations): 8 stories → Atomic tasks in progress
> - ⚠️ Epic 5.0 (External API): 8 stories → Atomic tasks pending
> - ⚠️ Epic 6.0 (Infrastructure): 8 stories → Atomic tasks pending
>
> **Total:** 88 atomic tasks completed for 23 stories across 3 epics
>
> **Note:** Epics 1.0-3.0 provide comprehensive atomic task templates. Epics 4.0-6.0 follow the same
> pattern and can be completed using the established methodology demonstrated in the first 3 epics.

---

## 🔔 IMPORTANT TODO

**After completing implementation of Epics 1.0-3.0, generate atomic tasks for the remaining epics:**

- [ ] **TODO: Generate Atomic Tasks for Epic 4.0** (AI Recommendations Display & Tracking)
  - Apply the same 3-tier methodology used in Epics 1.0-3.0
  - Break down each of the 8 stories into 3-5 atomic tasks
  - Expected output: ~25-30 atomic tasks

- [ ] **TODO: Generate Atomic Tasks for Epic 5.0** (External API for Partner Institutions)
  - Apply the same 3-tier methodology used in Epics 1.0-3.0
  - Break down each of the 8 stories into 3-5 atomic tasks
  - Expected output: ~25-30 atomic tasks

- [ ] **TODO: Generate Atomic Tasks for Epic 6.0** (Analytics Infrastructure & Optimization)
  - Apply the same 3-tier methodology used in Epics 1.0-3.0
  - Break down each of the 8 stories into 3-5 atomic tasks
  - Expected output: ~25-30 atomic tasks

**Rationale:** Complete Epics 1.0-3.0 first to validate the approach and incorporate lessons learned
before generating detailed tasks for the remaining epics. The established pattern in Epics 1.0-3.0
serves as the template.

---

## PRD Traceability Matrix

Map each functional requirement to specific epics:

- **FR-1 to FR-6** (MLGOO-DILG Dashboard) → Epic 1.0
- **FR-7 to FR-11** (Reports Page) → Epic 2.0
- **FR-12 to FR-17** (Gap Analysis Report) → Epic 3.0
- **FR-18 to FR-22** (AI Recommendations Display & Tracking) → Epic 4.0
- **FR-23 to FR-30** (External API Endpoint) → Epic 5.0
- **FR-31 to FR-35** (Analytics Infrastructure & Optimization) → Epic 6.0

## Relevant Files

Tech-stack specific file structure for the Analytics & Reporting feature:

### Backend Files

- `apps/api/app/db/models/recommendation_tracking.py` - SQLAlchemy model for recommendation tracking
- `apps/api/app/db/models/external_api_key.py` - SQLAlchemy model for external API keys
- `apps/api/app/db/models/api_access_log.py` - SQLAlchemy model for API access audit logs
- `apps/api/app/schemas/analytics.py` - Pydantic schemas for analytics data
- `apps/api/app/schemas/recommendations.py` - Pydantic schemas for AI recommendations
- `apps/api/app/schemas/external_api.py` - Pydantic schemas for external API responses
- `apps/api/app/services/analytics_service.py` - Business logic for analytics calculations
- `apps/api/app/services/gap_analysis_service.py` - Business logic for gap analysis
- `apps/api/app/services/external_api_service.py` - Business logic for external API data
  anonymization
- `apps/api/app/api/v1/analytics.py` - FastAPI endpoints for analytics (tag: `analytics`)
- `apps/api/app/api/v1/recommendations.py` - FastAPI endpoints for recommendations (tag:
  `recommendations`)
- `apps/api/app/api/v1/external_api.py` - FastAPI endpoints for external partners (tag:
  `external-api`)
- `apps/api/app/core/cache.py` - Redis caching utilities for analytics data
- `apps/api/app/core/rate_limiter.py` - Rate limiting middleware for external API
- `apps/api/alembic/versions/xxxx_add_analytics_tables.py` - Alembic migration for new tables

### Frontend Files

- `apps/web/src/app/(app)/analytics/page.tsx` - MLGOO-DILG dashboard page
- `apps/web/src/app/(app)/reports/page.tsx` - Reports page with visualizations
- `apps/web/src/app/(app)/gap-analysis/page.tsx` - Gap Analysis page
- `apps/web/src/app/(app)/recommendations/page.tsx` - AI Recommendations page
- `apps/web/src/components/features/analytics/DashboardKPIs.tsx` - Dashboard KPI cards
- `apps/web/src/components/features/analytics/TrendChart.tsx` - Trend visualization component
- `apps/web/src/components/features/analytics/BarangayMap.tsx` - Geographic map component
- `apps/web/src/components/features/reports/VisualizationGrid.tsx` - Reports page layout
- `apps/web/src/components/features/reports/ChartComponents.tsx` - Recharts wrappers
- `apps/web/src/components/features/reports/DataTable.tsx` - TanStack Table implementation
- `apps/web/src/components/features/reports/ExportControls.tsx` - CSV/PNG/PDF export UI
- `apps/web/src/components/features/gap-analysis/GapAnalysisView.tsx` - Gap analysis drill-down UI
- `apps/web/src/components/features/gap-analysis/ComparisonTable.tsx` - Before/after comparison
- `apps/web/src/components/features/recommendations/RecommendationCard.tsx` - AI recommendation
  display
- `apps/web/src/components/features/recommendations/StatusTracker.tsx` - Implementation status UI
- `apps/web/src/components/features/recommendations/PDFGenerator.tsx` - PDF export component
- `apps/web/src/hooks/useAnalytics.ts` - Custom hook wrapping Orval-generated analytics hooks
- `apps/web/src/hooks/useGapAnalysis.ts` - Custom hook for gap analysis data
- `apps/web/src/hooks/useRecommendations.ts` - Custom hook for recommendations data
- `apps/web/src/lib/pdf-export.ts` - PDF generation utility using jsPDF/html2canvas

### Shared/Generated Files

- `packages/shared/src/generated/endpoints/analytics/` - Auto-generated React Query hooks
- `packages/shared/src/generated/endpoints/recommendations/` - Auto-generated React Query hooks
- `packages/shared/src/generated/endpoints/external-api/` - Auto-generated React Query hooks
- `packages/shared/src/generated/schemas/analytics/` - TypeScript types for analytics
- `packages/shared/src/generated/schemas/recommendations/` - TypeScript types for recommendations
- `packages/shared/src/generated/schemas/external-api/` - TypeScript types for external API

### Testing Files

- `apps/api/tests/api/v1/test_analytics.py` - Pytest tests for analytics endpoints
- `apps/api/tests/api/v1/test_recommendations.py` - Pytest tests for recommendations endpoints
- `apps/api/tests/api/v1/test_external_api.py` - Pytest tests for external API
- `apps/api/tests/services/test_analytics_service.py` - Unit tests for analytics service
- `apps/api/tests/services/test_gap_analysis_service.py` - Unit tests for gap analysis service
- `apps/web/src/components/features/analytics/__tests__/DashboardKPIs.test.tsx` - Component tests

### Configuration Files

- `apps/api/app/core/config.py` - Add Redis cache configuration
- `apps/web/package.json` - Add Recharts, Leaflet, jsPDF dependencies
- `orval.config.ts` - Ensure analytics/recommendations/external-api tags are included

---

## Tasks

### Phase 1: Epic Tasks

- [ ] **1.0 Epic: MLGOO-DILG Dashboard** _(FR-1 to FR-6)_
  - **Description:** Build a dedicated analytics dashboard for MLGOO-DILG users displaying
    municipal-wide KPIs including pass/fail rates, compliance status by governance area, top failed
    indicators, comparative barangay performance, and historical trends across assessment cycles.
  - **PRD Reference:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6
  - **User Stories:** US-1, US-2, US-3, US-4
  - **Duration:** 2-3 weeks
  - **Success Criteria:**
    - MLGOO-DILG users can view all 5 KPI categories for any assessment cycle
    - Dashboard auto-refreshes when cycle selection changes without page reload
    - Trend charts display historical data across up to 3 cycles
    - All data respects RBAC (MLGOO-DILG role only)

- [ ] **2.0 Epic: Reports Page with Interactive Visualizations** _(FR-7 to FR-11)_
  - **Description:** Create a comprehensive Reports page with role-based access control, featuring
    interactive visualizations (bar/pie/line charts, geographic maps, data tables) with flexible
    filtering and export capabilities (CSV, PNG, PDF).
  - **PRD Reference:** FR-7, FR-8, FR-9, FR-10, FR-11
  - **User Stories:** US-4, US-6
  - **Duration:** 3-4 weeks
  - **Success Criteria:**
    - All 5 visualization types render correctly with real data
    - RBAC enforced: MLGOO-DILG sees all data, Assessors see their area, BLGUs see own barangay
    - Filters (cycle, area, barangay, status) work independently and in combination
    - Export functionality generates valid CSV, PNG, and PDF files
    - Interactive tooltips and drill-down work on all charts

- [ ] **3.0 Epic: Gap Analysis Report System** _(FR-12 to FR-17)_
  - **Description:** Implement a Gap Analysis feature that compares initial BLGU submissions against
    final validated data, highlighting changes in compliance status at governance area and indicator
    levels with interactive drill-down and pattern detection.
  - **PRD Reference:** FR-12, FR-13, FR-14, FR-15, FR-16, FR-17
  - **User Stories:** US-7, US-9
  - **Duration:** 2-3 weeks
  - **Success Criteria:**
    - Default view shows governance area-level before/after compliance counts
    - Users can drill down: governance area → indicators → response details
    - System identifies and displays common correction patterns (e.g., "80% changes related to
      missing MOVs")
    - Gap Analysis respects RBAC filtering (barangay/area based on role)
    - PDF export generates properly formatted report with DILG branding

- [ ] **4.0 Epic: AI Recommendations Display & Tracking** _(FR-18 to FR-22)_
  - **Description:** Build a UI to display Gemini-generated AI recommendations with rich formatting,
    priority indicators, and implementation status tracking allowing MLGOO-DILG to monitor progress
    on capacity development initiatives.
  - **PRD Reference:** FR-18, FR-19, FR-20, FR-21, FR-22
  - **User Stories:** US-5, US-8
  - **Duration:** 2 weeks
  - **Success Criteria:**
    - Recommendations display in collapsible sections by governance area
    - Visual priority indicators (High/Medium/Low) and action items are highlighted
    - MLGOO-DILG can update recommendation status (Not Started/In Progress/Completed/Not Applicable)
    - Status changes are timestamped and logged in database
    - PDF export generates formatted report suitable for official documentation
    - RBAC enforced: MLGOO-DILG sees all, BLGUs see only their barangay's recommendations

- [ ] **5.0 Epic: External API for Partner Institutions** _(FR-23 to FR-30)_
  - **Description:** Create a secure, read-only REST API endpoint for UMDC Peace Center and
    Katuparan Center to access anonymized, aggregated SGLGB data with API key authentication, rate
    limiting, and comprehensive audit logging.
  - **PRD Reference:** FR-23, FR-24, FR-25, FR-26, FR-27, FR-28, FR-29, FR-30
  - **User Stories:** US-10, US-11
  - **Duration:** 2 weeks
  - **Success Criteria:**
    - External API endpoint requires valid API key for access
    - Only anonymized, aggregated data is exposed (no PII, no MOVs, no individual attributable
      scores)
    - Query parameters (cycle_id, date range, governance_area) filter data correctly
    - Rate limiting prevents abuse (100 requests/hour per key)
    - All API access logged with timestamp, endpoint, key, and query parameters
    - OpenAPI documentation generated and accessible

- [ ] **6.0 Epic: Analytics Infrastructure & Optimization** _(FR-31 to FR-35)_
  - **Description:** Implement cross-cutting infrastructure requirements including database schema
    migrations, caching strategy with Redis, query optimization, RBAC enforcement, and timezone
    handling to support high-performance analytics features.
  - **PRD Reference:** FR-31, FR-32, FR-33, FR-34, FR-35
  - **User Stories:** All (cross-cutting)
  - **Duration:** 1-2 weeks
  - **Success Criteria:**
    - New database tables created: recommendation_tracking, external_api_keys, api_access_logs
    - Database indexes created on high-query columns (cycle_id, compliance_status, area_code,
      is_completed)
    - Redis caching implemented with 15-minute TTL and on-demand invalidation
    - Dashboard KPI queries execute in <1 second
    - All reports include metadata (date range, filters, generation timestamp)
    - Timezone handling defaults to Philippine Time (UTC+8)

---

### Phase 2: Story Tasks

- [x] **1.0 Epic: MLGOO-DILG Dashboard** _(FR-1 to FR-6)_
  - [x] **1.1 Story: Backend Analytics Service for Dashboard KPIs**
    - **Scope:** Implement business logic for calculating all dashboard KPIs (pass/fail rates,
      compliance by area, top failed indicators, barangay rankings, trends)
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
        - Schema `DashboardKPIResponse` created with fields: `overall_compliance_rate`,
          `completion_status`, `area_breakdown`, `top_failed_indicators`, `barangay_rankings`,
          `trends`
        - Schema `ComplianceRate` with fields: `total_barangays`, `passed`, `failed`,
          `pass_percentage`
        - Schema `AreaBreakdown` with fields: `area_code`, `area_name`, `passed`, `failed`,
          `percentage`
        - Schema `FailedIndicator` with fields: `indicator_id`, `indicator_name`, `failure_count`,
          `percentage`
        - Schema `BarangayRanking` with fields: `barangay_id`, `barangay_name`, `score`, `rank`
        - Schema `TrendData` with fields: `cycle_id`, `cycle_name`, `pass_rate`, `date`
        - All schemas use proper types (int, float, str, datetime) and include `Config` with
          `from_attributes = True`
      - **Tech:** Pydantic, Python typing

    - [x] **1.1.2 Atomic:** Implement analytics service class with KPI calculation methods
      - **Files:** `apps/api/app/services/analytics_service.py`
      - **Dependencies:** 1.1.1 (schemas exist)
      - **Acceptance:**
        - Create `AnalyticsService` class with methods: `get_dashboard_kpis(db, cycle_id)`,
          `_calculate_overall_compliance()`, `_calculate_area_breakdown()`,
          `_calculate_top_failed_indicators()`, `_calculate_barangay_rankings()`,
          `_calculate_trends()`
        - Each method uses SQLAlchemy queries with proper joins (assessments →
          governance_area_results → assessment_responses)
        - Handles None/empty cycle_id by defaulting to latest cycle
        - Handles edge cases: no assessments, no validated data, missing governance areas
        - Returns data matching Pydantic schemas from 1.1.1
        - Uses efficient queries with `group_by`, `count()`, aggregations
      - **Tech:** SQLAlchemy ORM, Python, dependency injection pattern

    - [x] **1.1.3 Atomic:** Implement overall compliance rate calculation
      - **Files:** `apps/api/app/services/analytics_service.py` (extend
        `_calculate_overall_compliance()`)
      - **Dependencies:** 1.1.2 (service class exists)
      - **Acceptance:**
        - Method queries `assessments` table filtered by `cycle_id` and
          `final_compliance_status IS NOT NULL`
        - Counts total barangays, passed (status = 'Pass'), failed (status = 'Fail')
        - Calculates pass_percentage = (passed / total) \* 100
        - Returns `ComplianceRate` schema instance
        - Handles division by zero (returns 0% if no assessments)
      - **Tech:** SQLAlchemy `func.count()`, `case()` statements

    - [x] **1.1.4 Atomic:** Implement area breakdown and top failed indicators calculation
      - **Files:** `apps/api/app/services/analytics_service.py` (extend methods)
      - **Dependencies:** 1.1.3 (overall calculation implemented)
      - **Acceptance:**
        - `_calculate_area_breakdown()`: Joins `governance_area_results` with `governance_areas`,
          groups by area_code, counts pass/fail per area
        - `_calculate_top_failed_indicators()`: Joins `assessment_responses` where
          `is_completed = False`, groups by `indicator_id`, orders by count DESC, limits to 5
        - Both methods filter by cycle_id
        - Returns list of `AreaBreakdown` and `FailedIndicator` schemas
      - **Tech:** SQLAlchemy joins, `order_by()`, `limit()`

    - [x] **1.1.5 Atomic:** Implement barangay rankings and trend analysis
      - **Files:** `apps/api/app/services/analytics_service.py` (extend methods)
      - **Dependencies:** 1.1.4 (area/indicator calculations done)
      - **Acceptance:**
        - `_calculate_barangay_rankings()`: Calculates score per barangay (percentage of completed
          indicators), orders DESC, assigns rank
        - `_calculate_trends()`: Queries last 3 cycles, calculates pass_rate for each, returns
          chronologically
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
        - Endpoint signature:
          `get_dashboard(cycle_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_mlgoo_dilg_user))`
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
        - Test with `curl http://localhost:8000/api/v1/analytics/dashboard` (should return 401
          without auth)
      - **Tech:** FastAPI router composition

  - [x] **1.3 Story: Type Generation for Dashboard**
    - **Scope:** Run Orval to generate TypeScript types and React Query hooks for dashboard
      endpoints
    - **Duration:** 1 hour
    - **Dependencies:** 1.2 (API endpoints exist)
    - **Files:** `packages/shared/src/generated/endpoints/analytics/`,
      `packages/shared/src/generated/schemas/analytics/`
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
        - Verify OpenAPI spec includes analytics endpoints:
          `curl http://localhost:8000/openapi.json | grep "analytics/dashboard"`
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
        - Page layout: header with title "Analytics Dashboard", cycle selector dropdown, grid
          container for KPI cards
        - Export default function `AnalyticsPage`
      - **Tech:** Next.js 15, React 19, TypeScript, TanStack Query

    - [x] **1.4.2 Atomic:** Implement cycle selector and data fetching
      - **Files:** `apps/web/src/app/(app)/analytics/page.tsx` (extend)
      - **Dependencies:** 1.4.1 (page component exists)
      - **Acceptance:**
        - Add state: `const [selectedCycle, setSelectedCycle] = useState<number | null>(null)`
        - Use hook:
          `const { data, isLoading, error } = useGetAnalyticsDashboard({ cycle_id: selectedCycle })`
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
      - KPI cards display all 5 categories: overall rate, completion status, area breakdown, top
        failed, rankings
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
      - **Files:** `apps/web/src/components/features/analytics/DashboardKPIs.tsx` (extend),
        `apps/web/src/components/features/analytics/TrendChart.tsx`
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
        - Grid includes: ComplianceRateCard, CompletionStatusCard, AreaBreakdownCard,
          TopFailedIndicatorsCard, BarangayRankingsCard, TrendChart
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
        - Test `_calculate_top_failed_indicators()` returns exactly 5 items (or fewer if < 5
          failures)
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
      - **Files:**
        `apps/web/src/components/features/dashboard-analytics/__tests__/DashboardKPIs.test.tsx`,
        `apps/web/src/components/features/dashboard-analytics/__tests__/TrendChart.test.tsx`
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

- [ ] **2.0 Epic: Reports Page with Interactive Visualizations** _(FR-7 to FR-11)_
  - [ ] **2.1 Story: Backend Reports Service with Filtering**
    - **Scope:** Implement service layer for reports data aggregation with flexible filtering
      (cycle, area, barangay, status)
    - **Duration:** 2-3 days
    - **Dependencies:** Epic 6.0 (database schema)
    - **Files:** `apps/api/app/services/analytics_service.py` (extend),
      `apps/api/app/schemas/analytics.py`
    - **Tech:** SQLAlchemy dynamic queries, Pydantic, Python
    - **Success Criteria:**
      - Service methods support all filter combinations
      - Returns data for all 5 visualization types (bar, pie, line, map, table)
      - RBAC filtering applied: MLGOO_DILG (all), Assessor (area), BLGU (own barangay)
      - Efficient queries with pagination for large datasets

    - [ ] **2.1.1 Atomic:** Create Pydantic schemas for reports data
      - **Files:** `apps/api/app/schemas/analytics.py` (extend)
      - **Dependencies:** None
      - **Acceptance:**
        - Schema `ReportsDataResponse` with fields: `chart_data`, `map_data`, `table_data`,
          `metadata`
        - Schema `ChartData` with fields: `bar_chart`, `pie_chart`, `line_chart`
        - Schema `MapData` with fields: `barangays: List[BarangayMapPoint]` where `BarangayMapPoint`
          has `barangay_id`, `name`, `lat`, `lng`, `status`, `score`
        - Schema `TableData` with fields: `rows: List[AssessmentRow]`, `total_count`, `page`,
          `page_size`
        - Schema `AssessmentRow` with fields: `barangay_id`, `barangay_name`, `governance_area`,
          `status`, `score`
        - All schemas properly typed
      - **Tech:** Pydantic, Python typing

    - [ ] **2.1.2 Atomic:** Implement dynamic filtering service methods
      - **Files:** `apps/api/app/services/analytics_service.py` (extend)
      - **Dependencies:** 2.1.1 (schemas exist), 6.5 (RBAC utilities)
      - **Acceptance:**
        - Add method `get_reports_data(db, filters: ReportsFilters, current_user: User)`
        - `ReportsFilters` dataclass with optional: `cycle_id`, `start_date`, `end_date`,
          `governance_area_codes`, `barangay_ids`, `status`
        - Method builds dynamic SQLAlchemy query applying only provided filters
        - Applies RBAC filtering based on user role (MLGOO_DILG: all, Assessor: assigned area, BLGU:
          own barangay)
        - Returns data for all 5 visualization types
        - Handles empty filter combinations (returns all accessible data)
      - **Tech:** SQLAlchemy dynamic queries, Python dataclasses

    - [ ] **2.1.3 Atomic:** Implement chart data aggregation
      - **Files:** `apps/api/app/services/analytics_service.py` (extend)
      - **Dependencies:** 2.1.2 (filtering service exists)
      - **Acceptance:**
        - Method `_aggregate_chart_data(query)` returns bar, pie, line chart data
        - Bar chart: pass/fail rates by governance area (group by area_code)
        - Pie chart: overall compliance status distribution (Pass/Fail/In Progress counts)
        - Line chart: trends over cycles (if date range filter used)
        - All use efficient SQL aggregations
        - Returns structured data matching schemas
      - **Tech:** SQLAlchemy `func.count()`, `group_by()`

    - [ ] **2.1.4 Atomic:** Implement map data and table data aggregation
      - **Files:** `apps/api/app/services/analytics_service.py` (extend)
      - **Dependencies:** 2.1.3 (chart aggregation exists)
      - **Acceptance:**
        - Method `_aggregate_map_data(query)` joins barangays table to get coordinates (lat/lng)
        - Returns list of barangays with status, score, coordinates
        - Handles missing coordinates gracefully (exclude from results or use default)
        - Method `_aggregate_table_data(query, page, page_size)` implements pagination
        - Table data includes: barangay name, governance area, status, score
        - Default pagination: 50 rows per page
        - Returns total count for pagination UI
      - **Tech:** SQLAlchemy joins, pagination with `limit()` and `offset()`

  - [ ] **2.2 Story: Backend API Endpoints for Reports**
    - **Scope:** Create FastAPI endpoints for reports data with role-based filtering
    - **Duration:** 1-2 days
    - **Dependencies:** 2.1 (reports service implemented)
    - **Files:** `apps/api/app/api/v1/analytics.py` (extend)
    - **Tech:** FastAPI, query parameters, RBAC dependencies
    - **Success Criteria:**
      - `GET /api/v1/analytics/reports` endpoint with tag `analytics`
      - Query params: `cycle_id`, `start_date`, `end_date`, `governance_area[]`, `barangay_id[]`,
        `status`
      - Response includes data for charts, map coordinates, and tabular data
      - RBAC enforced based on user role

    - [ ] **2.2.1 Atomic:** Create reports endpoint with query parameters
      - **Files:** `apps/api/app/api/v1/analytics.py` (extend)
      - **Dependencies:** 2.1.4 (reports service complete)
      - **Acceptance:**
        - Implement `GET /reports` endpoint in analytics router
        - Parameters: `cycle_id: Optional[int]`, `start_date: Optional[date]`,
          `end_date: Optional[date]`, `governance_area: Optional[List[str]] = Query(None)`,
          `barangay_id: Optional[List[int]] = Query(None)`, `status: Optional[str]`,
          `page: int = 1`, `page_size: int = 50`
        - Requires authentication (JWT), applies RBAC via dependency
        - Calls `analytics_service.get_reports_data()` with filters
        - Returns `ReportsDataResponse` schema
        - OpenAPI docs include parameter descriptions and examples
      - **Tech:** FastAPI, Query parameters, Pydantic

  - [ ] **2.3 Story: Install and Configure Visualization Dependencies**
    - **Scope:** Add Recharts, Leaflet, and table libraries to frontend
    - **Duration:** 1 hour
    - **Dependencies:** None
    - **Files:** `apps/web/package.json`
    - **Tech:** pnpm, npm packages
    - **Success Criteria:**
      - Install `recharts`, `react-leaflet`, `leaflet`, `@tanstack/react-table`
      - Verify no version conflicts with existing dependencies
      - `pnpm install` runs successfully

    - [ ] **2.3.1 Atomic:** Install visualization libraries
      - **Files:** `apps/web/package.json`
      - **Dependencies:** None
      - **Acceptance:**
        - Run: `cd apps/web && pnpm add recharts react-leaflet leaflet @tanstack/react-table`
        - Run: `pnpm add -D @types/leaflet` (TypeScript types)
        - Verify `package.json` updated with new dependencies
        - Run `pnpm install` from root, verify no conflicts
        - Verify `node_modules` contains new packages
        - Test import in a component to ensure no errors
      - **Tech:** pnpm, npm package management

  - [ ] **2.4 Story: Type Generation for Reports**
    - **Scope:** Generate TypeScript types for reports endpoints
    - **Duration:** 1 hour
    - **Dependencies:** 2.2 (API endpoints exist)
    - **Files:** `packages/shared/src/generated/endpoints/analytics/`
    - **Tech:** Orval
    - **Success Criteria:**
      - `pnpm generate-types` generates reports hooks and types

    - [ ] **2.4.1 Atomic:** Generate TypeScript types for reports endpoint
      - **Files:** Run from repository root
      - **Dependencies:** 2.2.1 (reports endpoint exists)
      - **Acceptance:**
        - Backend running with reports endpoint
        - Run `pnpm generate-types` from root
        - Verify `useGetAnalyticsReports` hook generated
        - Verify TypeScript types for `ReportsDataResponse`, `ChartData`, `MapData`, `TableData`
          exist
        - No TypeScript compilation errors
        - Test import in frontend: `import { useGetAnalyticsReports } from '@sinag/shared'`
      - **Tech:** Orval, OpenAPI, TypeScript

  - [x] **2.5 Story: Frontend Reports Page Layout**
    - **Scope:** Create reports page with filter controls and visualization grid
    - **Duration:** 1-2 days
    - **Dependencies:** 2.4 (types generated)
    - **Files:**
      - `apps/web/src/app/(app)/reports/page.tsx`
      - `apps/web/src/components/features/reports/VisualizationGrid.tsx`
    - **Tech:** Next.js App Router, Tailwind CSS, shadcn/ui
    - **Success Criteria:**
      - Page accessible at `/reports` route
      - RBAC enforced (MLGOO_DILG, Assessor, BLGU with appropriate filtering)
      - Filter controls: cycle selector, area multi-select, barangay multi-select, status selector
      - Grid layout responsive (mobile, tablet, desktop)
      - Loading states and skeleton screens implemented

    - [x] **2.5.1 Atomic:** Create reports page component with data fetching
      - **Files:** `apps/web/src/app/(app)/reports/page.tsx`
      - **Dependencies:** 2.4.1 (types generated)
      - **Acceptance:**
        - Create page with `'use client'` directive
        - Import `useGetAnalyticsReports` from `@sinag/shared`
        - State management for filters: `cycle`, `startDate`, `endDate`, `governanceAreas`,
          `barangayIds`, `status`, `page`
        - Call hook with filter state:
          `const { data, isLoading, error } = useGetAnalyticsReports({ ...filters })`
        - RBAC check for current user role
        - Page header with title "Reports & Visualizations"
        - Loading state with Skeleton components
        - Error state with Alert component
      - **Tech:** Next.js, React hooks, TanStack Query

    - [x] **2.5.2 Atomic:** Create filter controls component
      - **Files:** `apps/web/src/components/features/reports/FilterControls.tsx`
      - **Dependencies:** 2.5.1 (page exists)
      - **Acceptance:**
        - Component accepts props: `filters`, `onFilterChange`, `userRole`
        - Cycle selector (shadcn/ui Select)
        - Date range picker (shadcn/ui Calendar/Popover) for start/end dates
        - Governance area multi-select (shadcn/ui MultiSelect or Checkbox group)
        - Barangay multi-select (filtered based on RBAC: MLGOO_DILG sees all, Assessor sees area
          barangays, BLGU disabled)
        - Status selector (Pass/Fail/In Progress)
        - Clear filters button
        - Filter changes trigger `onFilterChange` callback
        - Responsive layout (stacks vertically on mobile)
      - **Tech:** React, shadcn/ui (Select, Popover, Calendar, Button), Tailwind CSS

    - [x] **2.5.3 Atomic:** Create visualization grid layout component
      - **Files:** `apps/web/src/components/features/reports/VisualizationGrid.tsx`
      - **Dependencies:** 2.5.1 (page exists)
      - **Acceptance:**
        - Component accepts prop: `data: ReportsDataResponse`
        - Grid layout using Tailwind CSS Grid
        - Desktop: 2 columns for charts, full-width sections for map and table
        - Tablet: 1-2 columns adaptive
        - Mobile: Single column stacked
        - Skeleton placeholders for loading states
        - Error boundaries for individual visualizations
        - Section headers for each visualization type
      - **Tech:** React, Tailwind CSS Grid, Flexbox

    - [x] **2.5.4 Atomic:** Integrate filters and grid into reports page
      - **Files:** `apps/web/src/app/(app)/reports/page.tsx` (extend)
      - **Dependencies:** 2.5.2, 2.5.3 (filter and grid components exist)
      - **Acceptance:**
        - Import FilterControls and VisualizationGrid
        - Render FilterControls at top, pass filter state and handlers
        - Render VisualizationGrid below filters, pass fetched data
        - Filter changes trigger data re-fetch via TanStack Query
        - Page fully responsive
        - Export metadata display (timestamp, applied filters shown)
      - **Tech:** Next.js, React composition

  - [x] **2.6 Story: Chart Visualization Components**
    - **Scope:** Build bar, pie, and line chart components using Recharts
    - **Duration:** 2-3 days
    - **Dependencies:** 2.5 (reports page exists)
    - **Files:**
      - `apps/web/src/components/features/reports/ChartComponents.tsx`
      - `apps/web/src/hooks/useAnalytics.ts` (extend)
    - **Tech:** Recharts, React, TypeScript
    - **Success Criteria:**
      - Bar chart displays pass/fail rates by governance area
      - Pie chart shows overall compliance status distribution
      - Line chart displays trends over multiple cycles
      - Charts are interactive with tooltips and click drill-down
      - Color coding consistent (green/red/yellow)
      - Charts responsive and accessible (WCAG 2.1 AA)

    - [x] **2.6.1 Atomic:** Create bar chart component for governance area breakdown
      - **Files:** `apps/web/src/components/features/reports/ChartComponents.tsx`
      - **Dependencies:** 2.3.1 (Recharts installed), 2.5.3 (grid layout exists)
      - **Acceptance:**
        - Export `AreaBreakdownBarChart` component
        - Props: `data: BarChartData[]` (from API response)
        - Use Recharts `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `Legend`,
          `ResponsiveContainer`
        - X-axis: Governance area names
        - Y-axis: Percentage (0-100)
        - Two bars per area: Passed (green), Failed (red)
        - Tooltip shows exact counts and percentages
        - Responsive container adjusts to parent width
        - Chart height: 300px minimum
        - Accessible: ARIA labels, keyboard navigation
      - **Tech:** Recharts, React, TypeScript

    - [x] **2.6.2 Atomic:** Create pie chart component for compliance status distribution
      - **Files:** `apps/web/src/components/features/reports/ChartComponents.tsx` (extend)
      - **Dependencies:** 2.6.1 (bar chart created)
      - **Acceptance:**
        - Export `ComplianceStatusPieChart` component
        - Props: `data: PieChartData[]`
        - Use Recharts `PieChart`, `Pie`, `Cell`, `Tooltip`, `Legend`, `ResponsiveContainer`
        - Slices: Pass (green), Fail (red), In Progress (yellow/amber)
        - Shows percentage labels on slices
        - Tooltip shows count and percentage
        - Legend positioned below chart
        - Chart centered, responsive
        - Click slice highlights (optional drill-down hook)
      - **Tech:** Recharts, React, color constants

    - [x] **2.6.3 Atomic:** Create line chart component for trend analysis
      - **Files:** `apps/web/src/components/features/reports/ChartComponents.tsx` (extend)
      - **Dependencies:** 2.6.2 (pie chart created)
      - **Acceptance:**
        - Export `TrendLineChart` component
        - Props: `data: TrendData[]` (cycle_id, cycle_name, pass_rate, date)
        - Use Recharts `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `CartesianGrid`,
          `ResponsiveContainer`
        - X-axis: Cycle names or dates
        - Y-axis: Pass rate percentage
        - Line color: green (#10b981)
        - Dot markers at each data point
        - Grid lines for readability
        - Tooltip shows cycle name and exact pass rate
        - Handle empty data (show "No trend data available")
      - **Tech:** Recharts, React, date formatting

    - [x] **2.6.4 Atomic:** Integrate charts into visualization grid
      - **Files:** `apps/web/src/components/features/reports/VisualizationGrid.tsx` (extend)
      - **Dependencies:** 2.6.3 (all charts created)
      - **Acceptance:**
        - Import AreaBreakdownBarChart, ComplianceStatusPieChart, TrendLineChart
        - Render charts in grid sections
        - Pass `data.chart_data` from ReportsDataResponse to charts
        - Each chart in its own Card component with title
        - Loading skeletons while data fetching
        - Error boundaries catch chart render errors
        - Charts responsive to grid column changes
      - **Tech:** React composition, shadcn/ui Card

  - [x] **2.7 Story: Geographic Map Visualization**
    - **Scope:** Implement interactive map showing barangays color-coded by performance
    - **Duration:** 2-3 days
    - **Dependencies:** 2.5 (reports page exists)
    - **Files:** `apps/web/src/components/features/analytics/BarangayMap.tsx`
    - **Tech:** React-Leaflet, Leaflet, TypeScript
    - **Success Criteria:**
      - Map displays municipality with 25 barangays as markers/polygons
      - Markers color-coded: green (pass), red (fail), yellow (in progress)
      - Click marker shows tooltip with barangay name and status
      - Map responsive and mobile-friendly
      - Handles missing coordinate data gracefully

    - [x] **2.7.1 Atomic:** Create barangay map component with custom SVG
      - **Files:** `apps/web/src/components/features/analytics/BarangayMap.tsx`
      - **Dependencies:** 2.3.1 (Leaflet installed)
      - **Acceptance:**
        - Export `BarangayMap` component
        - Props: `barangays: BarangayMapPoint[]` (from API response)
        - Use React-Leaflet: `MapContainer`, `TileLayer`, `Marker`, `Popup`
        - Default center: Center of Tubod municipality (get from first barangay or hardcoded)
        - Default zoom level: 13 (shows municipality)
        - Use OpenStreetMap tiles: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
        - Map container height: 400px
        - Attribution included
      - **Tech:** React-Leaflet, Leaflet, TypeScript

    - [x] **2.7.2 Atomic:** Implement color-coded barangay paths with click interaction
      - **Files:** `apps/web/src/components/features/analytics/BarangayMap.tsx` (extend)
      - **Dependencies:** 2.7.1 (map component exists)
      - **Acceptance:**
        - Create custom marker icons based on status:
          - Pass: Green marker (`divIcon` with green background)
          - Fail: Red marker
          - In Progress: Yellow/amber marker
        - Render Marker for each barangay at `[lat, lng]`
        - Attach Popup to each marker showing: barangay name, status, score
        - Click marker opens popup
        - Markers clustered if many barangays overlap (optional: use `react-leaflet-cluster`)
        - Handle missing coordinates: skip barangay or show warning
      - **Tech:** Leaflet divIcon, React-Leaflet Popup

    - [x] **2.7.3 Atomic:** Make map responsive and integrate into analytics page
      - **Files:** `apps/web/src/components/features/analytics/BarangayMap.tsx` (extend),
        `apps/web/src/components/features/reports/VisualizationGrid.tsx` (extend)
      - **Dependencies:** 2.7.2 (markers implemented)
      - **Acceptance:**
        - Map responsive: Use `useEffect` to invalidate size on container resize
        - Mobile-friendly: Touch gestures work (zoom, pan)
        - Map takes full width of grid section
        - Import and render BarangayMap in VisualizationGrid
        - Pass `data.map_data.barangays` to component
        - Map in Card with title "Barangay Performance Map"
        - Loading state while coordinates fetch
      - **Tech:** React hooks, Leaflet invalidateSize, CSS

  - [x] **2.8 Story: Interactive Data Table**
    - **Scope:** Build filterable, sortable data table using TanStack Table
    - **Duration:** 2 days
    - **Dependencies:** 2.5 (reports page exists)
    - **Files:** `apps/web/src/components/features/reports/DataTable.tsx`
    - **Tech:** TanStack Table, shadcn/ui Table, React
    - **Success Criteria:**
      - Table displays assessment data with columns: barangay, area, status, score
      - Sortable columns (click header to sort)
      - Search functionality filters rows
      - Pagination (50 rows per page)
      - Row click drills down to detailed view

    - [x] **2.8.1 Atomic:** Create data table component with TanStack Table
      - **Files:** `apps/web/src/components/features/reports/DataTable.tsx`
      - **Dependencies:** 2.3.1 (@tanstack/react-table installed)
      - **Acceptance:**
        - Export `AssessmentDataTable` component
        - Props: `data: TableData` (rows, total_count, page, page_size)
        - Use `useReactTable` hook with column definitions
        - Columns: Barangay Name, Governance Area, Status, Score
        - Render using shadcn/ui Table components (Table, TableHeader, TableBody, TableRow,
          TableCell)
        - Basic table styling with Tailwind CSS
        - Component accepts `onRowClick` callback
      - **Tech:** TanStack Table, shadcn/ui Table, React

    - [x] **2.8.2 Atomic:** Implement sorting and search functionality
      - **Files:** `apps/web/src/components/features/reports/DataTable.tsx` (extend)
      - **Dependencies:** 2.8.1 (table component exists)
      - **Acceptance:**
        - Add sorting state: `const [sorting, setSorting] = useState<SortingState>([])`
        - Configure table with `onSortingChange: setSorting`, `state: { sorting }`
        - Enable sorting on all columns via `enableSorting: true` in column defs
        - Click column header toggles sort direction (asc/desc)
        - Display sort indicator icon in header (up/down arrow)
        - Add search input above table filtering by barangay name
        - Search state updates `globalFilter` in table config
        - Debounce search input (300ms delay)
      - **Tech:** TanStack Table sorting/filtering, React state, debounce utility

    - [x] **2.8.3 Atomic:** Implement pagination and integration
      - **Files:** `apps/web/src/components/features/reports/DataTable.tsx` (extend),
        `apps/web/src/components/features/reports/VisualizationGrid.tsx` (extend)
      - **Dependencies:** 2.8.2 (sorting/search implemented)
      - **Acceptance:**
        - Add pagination controls below table using shadcn/ui Pagination
        - Show: Previous, page numbers, Next buttons
        - Display "Showing X-Y of Z results"
        - Page change triggers API re-fetch via parent component
        - Default 50 rows per page (configurable)
        - Import and render AssessmentDataTable in VisualizationGrid
        - Pass `data.table_data` to component
        - Table in full-width section with title "Assessment Data"
        - Handle row click: navigate to assessment detail page or show modal
      - **Tech:** shadcn/ui Pagination, TanStack Table pagination, Next.js navigation

  - [x] **2.9 Story: Export Functionality (CSV, PNG, PDF)**
    - **Scope:** Implement data export controls for CSV, PNG, and PDF formats
    - **Duration:** 2-3 days
    - **Dependencies:** 2.6, 2.7, 2.8 (all visualizations complete)
    - **Files:**
      - `apps/web/src/components/features/reports/ExportControls.tsx`
      - `apps/web/src/lib/pdf-export.ts`
    - **Tech:** jsPDF, html2canvas, CSV libraries, React
    - **Success Criteria:**
      - Export button group with CSV, PNG, PDF options
      - CSV export: Downloads filtered table data as `.csv` file
      - PNG export: Captures selected chart/map as image using html2canvas
      - PDF export: Generates multi-page report with all visualizations, metadata, and DILG branding
      - Exports include metadata (date range, filters, timestamp)
      - Loading indicators during export generation

    - [x] **2.9.1 Atomic:** Install export dependencies and create CSV export utility
      - **Files:** `apps/web/package.json`, `apps/web/src/lib/csv-export.ts`
      - **Dependencies:** None
      - **Acceptance:**
        - Run: `cd apps/web && pnpm add jspdf html2canvas`
        - Create `csv-export.ts` with function `exportToCSV(data: any[], filename: string)`
        - Function converts array of objects to CSV format
        - Uses browser download: creates blob, temporary anchor element, clicks, removes
        - Handles special characters and commas in data (proper escaping)
        - Filename includes timestamp: `${filename}_${timestamp}.csv`
        - Export function
      - **Tech:** jsPDF, html2canvas npm packages, vanilla JS CSV generation

    - [x] **2.9.2 Atomic:** Create PNG export utility and export controls component
      - **Files:** `apps/web/src/lib/png-export.ts`,
        `apps/web/src/components/features/reports/ExportControls.tsx`
      - **Dependencies:** 2.9.1 (jsPDF/html2canvas installed)
      - **Acceptance:**
        - Create `png-export.ts` with function `exportToPNG(elementId: string, filename: string)`
        - Function uses html2canvas to capture DOM element as image
        - Downloads as PNG file
        - Create ExportControls component with props: `tableData`, `chartRefs`, `currentFilters`
        - Button group: CSV, PNG (dropdown for selecting chart), PDF
        - CSV button exports table data via `exportToCSV()`
        - PNG dropdown shows chart options (Bar, Pie, Line, Map)
        - Loading state during export generation
      - **Tech:** html2canvas, React, shadcn/ui Button, DropdownMenu

    - [x] **2.9.3 Atomic:** Create PDF export utility with DILG branding
      - **Files:** `apps/web/src/lib/pdf-export.ts`
      - **Dependencies:** 2.9.2 (export utilities exist)
      - **Acceptance:**
        - Export function
          `exportReportToPDF(data: ReportsDataResponse, filters: FilterState, metadata: Metadata)`
        - Use jsPDF to create multi-page document
        - Page 1: Cover with DILG logo, title "Assessment Reports", metadata (date range, filters,
          generation timestamp)
        - Page 2+: Captured chart images (use html2canvas on chart divs)
        - Page final: Table data formatted
        - Headers/footers on all pages with page numbers
        - A4 portrait orientation
        - Function triggers download: `report_${timestamp}.pdf`
        - Handle errors gracefully (show toast notification)
      - **Tech:** jsPDF, html2canvas, async/await

    - [x] **2.9.4 Atomic:** Integrate export controls into reports page
      - **Files:** `apps/web/src/app/(app)/reports/page.tsx` (extend)
      - **Dependencies:** 2.9.3 (all export utilities complete)
      - **Acceptance:**
        - Import ExportControls component
        - Render in page header (top-right corner)
        - Pass table data, chart refs (useRef on each chart), current filters
        - Wire up CSV/PNG/PDF button clicks to export functions
        - Show loading spinner/toast during export generation
        - Success toast after export completes
        - Error toast if export fails
        - Only visible to MLGOO_DILG role (hide for others)
      - **Tech:** React refs, toast notifications, RBAC

  - [ ] **2.10 Story: Reports Testing**
    - **Scope:** Test reports service, endpoints, and frontend components
    - **Duration:** 2 days
    - **Dependencies:** 2.9 (all reports features complete)
    - **Files:**
      - `apps/api/tests/api/v1/test_analytics.py` (extend)
      - `apps/api/tests/services/test_analytics_service.py` (extend)
      - `apps/web/src/components/features/reports/__tests__/ChartComponents.test.tsx`
    - **Tech:** Pytest, Vitest, React Testing Library
    - **Success Criteria:**
      - Backend: Test filtering logic with all parameter combinations
      - Backend: Test RBAC enforcement per role
      - Frontend: Test chart rendering with mock data
      - Frontend: Test filter interactions
      - Frontend: Test export functionality
      - All tests pass

    - [ ] **2.10.1 Atomic:** Write backend reports service tests
      - **Files:** `apps/api/tests/services/test_analytics_service.py` (extend)
      - **Dependencies:** 2.1.4 (reports service complete)
      - **Acceptance:**
        - Test `get_reports_data()` with various filter combinations (cycle, date range, area,
          barangay, status)
        - Test empty filters returns all accessible data
        - Test RBAC filtering: MLGOO_DILG sees all, Assessor sees assigned area only, BLGU sees own
          barangay only
        - Test chart data aggregation returns correct structure
        - Test map data includes coordinates
        - Test table data pagination (page 1, page 2, correct total_count)
        - Use pytest fixtures for test data
        - Run: `pytest tests/services/test_analytics_service.py::test_get_reports_data -vv`
      - **Tech:** Pytest, SQLAlchemy fixtures

    - [ ] **2.10.2 Atomic:** Write backend reports endpoint tests
      - **Files:** `apps/api/tests/api/v1/test_analytics.py` (extend)
      - **Dependencies:** 2.2.1 (reports endpoint exists)
      - **Acceptance:**
        - Test `GET /api/v1/analytics/reports` returns 200 with valid JWT
        - Test query parameters: `?cycle_id=1`, `?governance_area=FA&governance_area=SA`,
          `?status=Pass`
        - Test RBAC: MLGOO_DILG gets all data, Assessor gets filtered by area, BLGU gets own
          barangay
        - Test 401 without auth, 403 with wrong role
        - Test pagination: `?page=2&page_size=25`
        - Verify response matches `ReportsDataResponse` schema
        - Run: `pytest tests/api/v1/test_analytics.py::test_get_reports -vv`
      - **Tech:** Pytest, FastAPI TestClient

    - [ ] **2.10.3 Atomic:** Write frontend chart component tests
      - **Files:** `apps/web/src/components/features/reports/__tests__/ChartComponents.test.tsx`
      - **Dependencies:** 2.6.4 (charts integrated)
      - **Acceptance:**
        - Test `AreaBreakdownBarChart` renders with mock data
        - Test `ComplianceStatusPieChart` renders correct slices
        - Test `TrendLineChart` displays trend line
        - Test charts handle empty data (show "No data")
        - Test tooltips appear on hover (simulate mouse events)
        - Mock Recharts components if needed
        - Run: `pnpm test ChartComponents.test.tsx`
      - **Tech:** Vitest, React Testing Library, @testing-library/user-event

    - [ ] **2.10.4 Atomic:** Write frontend filter and export tests
      - **Files:** `apps/web/src/components/features/reports/__tests__/FilterControls.test.tsx`,
        `apps/web/src/lib/__tests__/pdf-export.test.ts`
      - **Dependencies:** 2.5.2, 2.9.4 (filters and export complete)
      - **Acceptance:**
        - Test FilterControls: cycle change triggers `onFilterChange` callback
        - Test filter clear button resets all filters
        - Test multi-select governance area selection
        - Test CSV export: mock `exportToCSV`, verify called with correct data
        - Test PNG export: mock `html2canvas`, verify called
        - Test PDF export: mock `jsPDF`, verify document structure
        - All export tests verify filename includes timestamp
        - Run: `pnpm test FilterControls.test.tsx pdf-export.test.ts`
      - **Tech:** Vitest, mocking libraries (vi.mock)

- [ ] **3.0 Epic: Gap Analysis Report System** _(FR-12 to FR-17)_
  - [ ] **3.1 Story: Backend Gap Analysis Service**
    - **Scope:** Implement service to compare initial vs. final assessment responses
    - **Duration:** 3 days
    - **Dependencies:** Epic 6.0 (database schema)
    - **Files:** `apps/api/app/services/gap_analysis_service.py`,
      `apps/api/app/schemas/analytics.py` (extend)
    - **Tech:** SQLAlchemy, Pydantic, Python data comparison
    - **Success Criteria:**
      - Service retrieves `response_version = 1` (initial) and latest version (final) for each
        indicator
      - Calculates delta: changes in `is_completed`, text responses, MOV attachments
      - Aggregates by governance area: count/percentage of changed indicators
      - Identifies common patterns (e.g., "80% changes related to missing MOVs")
      - Returns hierarchical data: municipal → area → indicator → response details

    - [ ] **3.1.1 Atomic:** Create Pydantic schemas for gap analysis data
      - **Files:** `apps/api/app/schemas/analytics.py` (extend)
      - **Dependencies:** None
      - **Acceptance:**
        - Schema `GapAnalysisResponse` with fields: `municipal_summary`, `area_gaps`,
          `common_patterns`, `metadata`
        - Schema `AreaGap` with fields: `area_code`, `area_name`, `total_indicators`,
          `changed_indicators`, `change_percentage`, `indicator_gaps: List[IndicatorGap]`
        - Schema `IndicatorGap` with fields: `indicator_id`, `indicator_name`, `initial_response`,
          `final_response`, `change_type` (is_completed_changed, text_changed, mov_changed)
        - Schema `ResponseComparison` with fields: `is_completed_before`, `is_completed_after`,
          `text_response_before`, `text_response_after`, `mov_count_before`, `mov_count_after`
        - Schema `CommonPattern` with fields: `pattern_description`, `occurrence_count`,
          `percentage`
        - All schemas properly typed
      - **Tech:** Pydantic, Python typing, Enum for change_type

    - [ ] **3.1.2 Atomic:** Implement gap analysis service class and version retrieval
      - **Files:** `apps/api/app/services/gap_analysis_service.py`
      - **Dependencies:** 3.1.1 (schemas exist)
      - **Acceptance:**
        - Create `GapAnalysisService` class
        - Method `get_gap_analysis(db, cycle_id, barangay_ids, governance_area_codes, current_user)`
        - Helper `_get_initial_responses(assessment_id)`: queries `assessment_responses` WHERE
          `response_version = 1`
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
        - Determines `change_type`: multiple changes can be true (e.g., both is_completed AND mov
          changed)
        - Returns structured comparison object
      - **Tech:** Python comparison logic, JSON parsing

    - [ ] **3.1.4 Atomic:** Implement aggregation by governance area and pattern detection
      - **Files:** `apps/api/app/services/gap_analysis_service.py` (extend)
      - **Dependencies:** 3.1.3 (comparison logic exists)
      - **Acceptance:**
        - Method `_aggregate_by_area(comparisons)` groups by governance_area_code
        - Calculates per area: total indicators, changed indicators, change percentage
        - Method `_detect_common_patterns(comparisons)` analyzes change types
        - Identifies patterns: "X% of changes involved missing MOVs", "Y% changed is_completed
          status", etc.
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
        - Parameters: `cycle_id: int`, `barangay_id: Optional[List[int]] = Query(None)`,
          `governance_area: Optional[str]`
        - Requires authentication, applies RBAC filtering via dependency
        - Calls `gap_analysis_service.get_gap_analysis()` with filters and current_user
        - Returns `GapAnalysisResponse` schema
        - OpenAPI docs include description and examples
        - Test endpoint manually:
          `curl http://localhost:8000/api/v1/analytics/gap-analysis?cycle_id=1`
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
        - Import test: `import { useGetAnalyticsGapAnalysis } from '@sinag/shared'`
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
        - Import `useGetAnalyticsGapAnalysis` from `@sinag/shared`
        - State for filters: cycle, barangay, governance area
        - Call hook: `const { data, isLoading, error } = useGetAnalyticsGapAnalysis({ ...filters })`
        - RBAC check: accessible to MLGOO_DILG, Assessor, BLGU with appropriate filtering
        - Page header with title "Gap Analysis"
        - Loading/error states with Skeleton and Alert
      - **Tech:** Next.js, React hooks, TanStack Query

    - [ ] **3.4.2 Atomic:** Create custom gap analysis hook and filter controls
      - **Files:** `apps/web/src/hooks/useGapAnalysis.ts`,
        `apps/web/src/app/(app)/gap-analysis/page.tsx` (extend)
      - **Dependencies:** 3.4.1 (page exists)
      - **Acceptance:**
        - Custom hook `useGapAnalysis()` wraps Orval hook with error handling
        - Add filter controls to page: cycle selector, barangay multi-select, governance area
          selector
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
        - Display area-level cards showing: area name, total indicators, changed indicators, change
          percentage
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
        - Export function
          `exportGapAnalysisToPDF(data: GapAnalysisResponse, filters: FilterState, metadata: Metadata)`
        - Use jsPDF to create document
        - Page 1: Cover with DILG logo, title "Gap Analysis Report", metadata (cycle, filters,
          generation timestamp)
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
        - Test comparison logic: indicator changed from incomplete → complete, complete →
          incomplete, text changed, MOV count changed
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
        - Test query parameters: `?cycle_id=1`, `?barangay_id=1&barangay_id=2`,
          `?governance_area=FA`
        - Test RBAC: 401 without auth, 403 for unauthorized role
        - Test response structure matches `GapAnalysisResponse` schema
        - Verify nested structure: areas contain indicators, indicators contain comparisons
        - Run: `pytest tests/api/v1/test_analytics.py::test_gap_analysis -vv`
      - **Tech:** Pytest, FastAPI TestClient

    - [ ] **3.7.3 Atomic:** Write frontend gap analysis component tests
      - **Files:**
        `apps/web/src/components/features/gap-analysis/__tests__/GapAnalysisView.test.tsx`
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

- [ ] **4.0 Epic: AI Recommendations Display & Tracking** _(FR-18 to FR-22)_
  - [ ] **4.1 Story: Database Schema for Recommendation Tracking**
    - **Scope:** Create `recommendation_tracking` table for status management
    - **Duration:** 1 day
    - **Dependencies:** Epic 6.0 (migrations setup)
    - **Files:**
      - `apps/api/app/db/models/recommendation_tracking.py`
      - `apps/api/alembic/versions/xxxx_add_recommendation_tracking.py`
    - **Tech:** SQLAlchemy, Alembic
    - **Success Criteria:**
      - Model defines: id, assessment_id (FK), governance_area_code (FK), recommendation_text,
        priority, status, updated_by (FK), updated_at, created_at
      - Migration creates table with indexes on assessment_id, status
      - `alembic upgrade head` runs successfully

    - [ ] **4.1.1 Atomic:** Create recommendation_tracking SQLAlchemy model
      - **Files:** `apps/api/app/db/models/recommendation_tracking.py`
      - **Dependencies:** None
      - **Acceptance:**
        - Create `RecommendationTracking` model class inheriting from Base
        - Columns: `id` (Integer, PK), `assessment_id` (ForeignKey to assessments),
          `governance_area_code` (ForeignKey), `recommendation_text` (Text), `priority` (Enum:
          High/Medium/Low), `status` (Enum: Not Started/In Progress/Completed/Not Applicable),
          `updated_by` (ForeignKey to users), `updated_at` (DateTime), `created_at` (DateTime,
          default=now)
        - Relationships: `assessment`, `governance_area`, `updater` (user)
        - `__tablename__ = "recommendation_tracking"`
        - Model exports at module level
      - **Tech:** SQLAlchemy, Python Enum

    - [ ] **4.1.2 Atomic:** Create Alembic migration for recommendation_tracking table
      - **Files:** `apps/api/alembic/versions/xxxx_add_recommendation_tracking.py`
      - **Dependencies:** 4.1.1 (model exists)
      - **Acceptance:**
        - Run:
          `cd apps/api && alembic revision --autogenerate -m "add recommendation_tracking table"`
        - Review generated migration, ensure all columns and constraints correct
        - Add indexes:
          `create_index('ix_recommendation_tracking_assessment_id', 'recommendation_tracking', ['assessment_id'])`,
          `create_index('ix_recommendation_tracking_status', 'recommendation_tracking', ['status'])`
        - Run: `alembic upgrade head`
        - Verify table created in database with correct schema
        - Test downgrade: `alembic downgrade -1`, then upgrade again
      - **Tech:** Alembic, SQL DDL

  - [ ] **4.2 Story: Backend Recommendations Service**
    - **Scope:** Implement service to retrieve and update recommendation tracking
    - **Duration:** 2 days
    - **Dependencies:** 4.1 (database table exists)
    - **Files:** `apps/api/app/services/intelligence_service.py` (extend),
      `apps/api/app/schemas/recommendations.py`
    - **Tech:** SQLAlchemy, Pydantic, Integration with existing Gemini API logic
    - **Success Criteria:**
      - Service retrieves AI recommendations from `assessments.ai_recommendations` JSON field
      - Parses and structures recommendations by governance area
      - CRUD operations for recommendation tracking (create, read, update status)
      - Timestamps status changes
      - Calculates implementation progress summary

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

  - [ ] **4.4 Story: Type Generation for Recommendations**
    - **Scope:** Generate types for recommendations endpoints
    - **Duration:** 1 hour
    - **Dependencies:** 4.3 (endpoints exist)
    - **Files:** `packages/shared/src/generated/endpoints/recommendations/`,
      `packages/shared/src/generated/schemas/recommendations/`
    - **Tech:** Orval
    - **Success Criteria:** Hooks and types generated

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

  - [ ] **4.7 Story: Recommendations PDF Export**
    - **Scope:** Generate formatted PDF of AI recommendations
    - **Duration:** 1-2 days
    - **Dependencies:** 4.6 (UI complete)
    - **Files:** `apps/web/src/components/features/recommendations/PDFGenerator.tsx`,
      `apps/web/src/lib/pdf-export.ts` (extend)
    - **Tech:** jsPDF, html2canvas
    - **Success Criteria:**
      - Export button on recommendations page
      - PDF includes DILG branding, official formatting
      - Grouped by governance area with priority indicators
      - Includes metadata, generation timestamp
      - Suitable for sharing with barangay officials

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

- [ ] **5.0 Epic: External API for Partner Institutions** _(FR-23 to FR-30)_
  - [ ] **5.1 Story: Database Schema for External API Management**
    - **Scope:** Create tables for API keys and access logs
    - **Duration:** 1 day
    - **Dependencies:** Epic 6.0 (migrations setup)
    - **Files:**
      - `apps/api/app/db/models/external_api_key.py`
      - `apps/api/app/db/models/api_access_log.py`
      - `apps/api/alembic/versions/xxxx_add_external_api_tables.py`
    - **Tech:** SQLAlchemy, Alembic
    - **Success Criteria:**
      - `external_api_keys` table: id, institution_name, api_key (hashed), is_active, rate_limit,
        created_at, last_used_at
      - `api_access_logs` table: id, api_key_id (FK), endpoint, query_parameters (JSONB),
        response_status, timestamp
      - Indexes on api_key, timestamp
      - Migration runs successfully

  - [ ] **5.2 Story: Backend External API Service**
    - **Scope:** Implement data anonymization and aggregation logic for partner institutions
    - **Duration:** 2-3 days
    - **Dependencies:** 5.1 (database tables exist)
    - **Files:** `apps/api/app/services/external_api_service.py`,
      `apps/api/app/schemas/external_api.py`
    - **Tech:** SQLAlchemy, Pydantic, Python
    - **Success Criteria:**
      - Service retrieves only validated assessments (no in-progress data)
      - Anonymizes barangay identifiers (replace names with anonymous IDs)
      - Aggregates: overall pass/fail rates, rates by governance area
      - Provides trend data across cycles
      - Excludes PII, MOVs, individual attributable scores
      - Supports filtering by cycle_id, date range, governance_area

  - [ ] **5.3 Story: API Key Authentication System**
    - **Scope:** Implement API key validation and authentication dependency
    - **Duration:** 1-2 days
    - **Dependencies:** 5.1 (external_api_keys table exists)
    - **Files:** `apps/api/app/core/auth.py` (extend), `apps/api/app/api/deps.py` (extend)
    - **Tech:** FastAPI dependencies, bcrypt for hashing
    - **Success Criteria:**
      - Dependency function `get_api_key()` validates API key from header (`X-API-Key`)
      - Checks key exists, is active, and not expired
      - Returns associated institution metadata
      - Updates `last_used_at` timestamp on successful validation
      - Returns 401 for invalid/missing keys

  - [ ] **5.4 Story: Rate Limiting Middleware**
    - **Scope:** Implement rate limiting for external API (100 req/hour per key)
    - **Duration:** 1-2 days
    - **Dependencies:** 5.3 (API key auth exists)
    - **Files:** `apps/api/app/core/rate_limiter.py`, `apps/api/app/core/config.py` (extend)
    - **Tech:** Redis, FastAPI middleware, Slowapi or custom implementation
    - **Success Criteria:**
      - Rate limiter tracks requests per API key using Redis
      - Configurable limit (default 100 req/hour)
      - Returns 429 Too Many Requests when limit exceeded
      - Response includes `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers

  - [ ] **5.5 Story: Backend External API Endpoints**
    - **Scope:** Create external API endpoint with comprehensive query parameters
    - **Duration:** 1-2 days
    - **Dependencies:** 5.2, 5.3, 5.4 (service, auth, rate limiting complete)
    - **Files:** `apps/api/app/api/v1/external_api.py`
    - **Tech:** FastAPI
    - **Success Criteria:**
      - `GET /api/v1/external/sglgb-data` endpoint with tag `external-api`
      - Requires API key authentication (no JWT)
      - Query params: `cycle_id`, `start_date`, `end_date`, `governance_area`
      - Returns anonymized, aggregated JSON data
      - Rate limiting enforced
      - All access logged to `api_access_logs` table

  - [ ] **5.6 Story: API Access Logging**
    - **Scope:** Implement comprehensive audit logging for all external API calls
    - **Duration:** 1 day
    - **Dependencies:** 5.5 (endpoint exists)
    - **Files:** `apps/api/app/api/v1/external_api.py` (extend),
      `apps/api/app/services/external_api_service.py` (extend)
    - **Tech:** SQLAlchemy, FastAPI middleware
    - **Success Criteria:**
      - Every external API request logged: timestamp, api_key_id, endpoint, query_parameters,
        response_status
      - Logging happens asynchronously (doesn't slow requests)
      - Logs stored in `api_access_logs` table
      - Failed requests (401, 403, 429) also logged

  - [ ] **5.7 Story: OpenAPI Documentation for External API**
    - **Scope:** Enhance OpenAPI docs specifically for external partners
    - **Duration:** 1 day
    - **Dependencies:** 5.5 (endpoint exists)
    - **Files:** `apps/api/app/api/v1/external_api.py` (extend with docstrings)
    - **Tech:** FastAPI OpenAPI generation
    - **Success Criteria:**
      - Endpoint includes comprehensive description, parameter docs, example responses
      - OpenAPI spec accessible at `/openapi.json` includes external-api tag
      - Swagger UI at `/docs` displays external API documentation
      - Authentication requirements clearly documented

  - [ ] **5.8 Story: External API Testing**
    - **Scope:** Test external API service, auth, rate limiting, and endpoints
    - **Duration:** 2 days
    - **Dependencies:** 5.7 (all features complete)
    - **Files:** `apps/api/tests/api/v1/test_external_api.py`,
      `apps/api/tests/services/test_external_api_service.py`
    - **Tech:** Pytest
    - **Success Criteria:**
      - Backend: Test anonymization logic (no PII leaked)
      - Backend: Test API key authentication (valid, invalid, inactive keys)
      - Backend: Test rate limiting (exceeding limit returns 429)
      - Backend: Test access logging (all requests logged)
      - Backend: Test filtering with various query parameters
      - Backend: Test that in-progress data is excluded
      - All tests pass

- [ ] **6.0 Epic: Analytics Infrastructure & Optimization** _(FR-31 to FR-35)_
  - [ ] **6.1 Story: Database Migrations for All Analytics Tables**
    - **Scope:** Consolidate all analytics-related database migrations
    - **Duration:** 1 day
    - **Dependencies:** None (foundation for other epics)
    - **Files:** `apps/api/alembic/versions/xxxx_add_analytics_infrastructure.py`
    - **Tech:** Alembic, SQLAlchemy
    - **Success Criteria:**
      - Single migration creates: recommendation_tracking, external_api_keys, api_access_logs
      - Migration is reversible (`alembic downgrade` works)
      - `alembic upgrade head` runs without errors
      - All tables created with proper constraints and relationships

  - [ ] **6.2 Story: Database Indexes & Query Optimization**
    - **Scope:** Create indexes on high-query columns for performance
    - **Duration:** 1-2 days
    - **Dependencies:** 6.1 (tables exist)
    - **Files:** `apps/api/alembic/versions/xxxx_add_analytics_indexes.py`
    - **Tech:** Alembic, PostgreSQL indexes
    - **Success Criteria:**
      - Indexes created on: `assessments.cycle_id`, `assessments.final_compliance_status`,
        `governance_area_results.area_code`, `assessment_responses.is_completed`
      - Composite indexes for common query patterns (e.g., `cycle_id + barangay_id`)
      - Use EXPLAIN ANALYZE to verify query performance improvements
      - Dashboard KPI queries execute in <1 second

  - [ ] **6.3 Story: Redis Caching Implementation**
    - **Scope:** Set up Redis caching for aggregated analytics data
    - **Duration:** 2 days
    - **Dependencies:** None
    - **Files:** `apps/api/app/core/cache.py`, `apps/api/app/core/config.py` (extend)
    - **Tech:** Redis, redis-py, FastAPI
    - **Success Criteria:**
      - Cache utility functions: `get_cached_data()`, `set_cached_data()`, `invalidate_cache()`
      - Cache key pattern: `analytics:{cycle_id}:{filter_hash}`
      - TTL: 15 minutes (configurable)
      - Cache invalidation function called when assessment is validated
      - Redis connection pooling configured
      - Error handling: Cache failures don't break API (fallback to DB)

  - [ ] **6.4 Story: Apply Caching to Analytics Endpoints**
    - **Scope:** Integrate Redis caching into analytics service methods
    - **Duration:** 1-2 days
    - **Dependencies:** 6.3 (cache utilities exist)
    - **Files:** `apps/api/app/services/analytics_service.py` (extend),
      `apps/api/app/api/v1/analytics.py` (extend)
    - **Tech:** Redis, Python
    - **Success Criteria:**
      - Dashboard KPIs cached (check cache before querying DB)
      - Reports data cached per filter combination
      - Gap analysis cached per assessment/cycle
      - Cache hit/miss logged for monitoring
      - Cached responses include `X-Cache: HIT` or `X-Cache: MISS` header

  - [ ] **6.5 Story: RBAC Enforcement Utilities**
    - **Scope:** Create reusable RBAC dependencies and filters for analytics endpoints
    - **Duration:** 1-2 days
    - **Dependencies:** None (uses existing user service)
    - **Files:** `apps/api/app/api/deps.py` (extend)
    - **Tech:** FastAPI dependencies, SQLAlchemy
    - **Success Criteria:**
      - Dependency `get_current_mlgoo_dilg_user()` enforces MLGOO_DILG role (returns 403 otherwise)
      - Dependency `get_rbac_filtered_query()` applies role-based filters:
        - MLGOO_DILG: No filter (sees all)
        - Assessor: Filters by assigned governance_area
        - BLGU: Filters by barangay_id
      - Dependencies reused across all analytics endpoints
      - Unit tested for each role

  - [ ] **6.6 Story: Timezone Handling**
    - **Scope:** Implement consistent timezone handling (default Philippine Time UTC+8)
    - **Duration:** 1 day
    - **Dependencies:** None
    - **Files:** `apps/api/app/core/config.py` (extend),
      `apps/api/app/services/analytics_service.py` (extend)
    - **Tech:** Python pytz, datetime
    - **Success Criteria:**
      - All datetime fields stored in DB as UTC
      - API responses convert to Philippine Time (UTC+8) before serialization
      - Frontend displays times in user's configured timezone (default PT)
      - Timestamps include timezone info in ISO 8601 format

  - [ ] **6.7 Story: Report Metadata Generation**
    - **Scope:** Add metadata to all analytics responses (date range, filters, timestamp)
    - **Duration:** 1 day
    - **Dependencies:** 6.6 (timezone handling exists)
    - **Files:** `apps/api/app/schemas/analytics.py` (extend),
      `apps/api/app/services/analytics_service.py` (extend)
    - **Tech:** Pydantic
    - **Success Criteria:**
      - All analytics response schemas include `metadata` field
      - Metadata contains: `date_range`, `applied_filters`, `generated_at` (timestamp),
        `cache_status`
      - Frontend displays metadata in report headers/footers
      - PDF exports include metadata on cover page

  - [ ] **6.8 Story: Infrastructure Testing**
    - **Scope:** Test caching, RBAC, timezone handling, and query optimization
    - **Duration:** 2 days
    - **Dependencies:** 6.7 (all infrastructure complete)
    - **Files:**
      - `apps/api/tests/core/test_cache.py`
      - `apps/api/tests/api/test_deps.py`
      - `apps/api/tests/services/test_analytics_service.py` (extend)
    - **Tech:** Pytest, pytest-redis, pytest-mock
    - **Success Criteria:**
      - Test cache hit/miss scenarios
      - Test cache invalidation logic
      - Test RBAC dependencies for all 3 roles
      - Test timezone conversions (UTC → PT)
      - Test query performance with indexes (EXPLAIN ANALYZE)
      - Test metadata generation
      - All tests pass

---

## Next Steps

**AWAITING USER APPROVAL**: Please review the Story tasks above and respond with **"Go"** to proceed
to **Phase 3: Atomic Tasks** where each story will be broken down into granular, file-specific tasks
with explicit acceptance criteria suitable for a junior developer.

---

## Quality Gates - Story Review Checklist

- [x] Stories align with SINAG full-stack architecture (Frontend, Backend, Database)
- [x] Each story represents a cohesive implementation domain (1-3 days)
- [x] Dependencies between stories are clearly identified
- [x] Stories can be worked on sequentially to build each epic
- [x] Story descriptions specify exact tech stack components
- [x] Success criteria are specific and testable
