# Epic 1.0: Indicator Management - Core CRUD & Versioning System ✅ COMPLETE

**PRD Reference:** FR-4.1.1, FR-4.4.2 **Duration:** 5-7 days **Status:** ✅ **COMPLETED** - All 5
stories complete with 37 tasks **Completion Date:** November 7, 2025 **Dependencies:** None

---

## Story 1.1: Database Schema & Migrations for Indicator Versioning

**Duration:** 1 day

### Atomic Tasks

- [x] **1.1.1 Atomic: Update indicators table schema with versioning fields**
  - **Files:**
    - `apps/api/app/db/models/assessment.py` (update Indicator model)
  - **Dependencies:** None
  - **Acceptance Criteria:**
    - Add `version` column (Integer, default=1, not null)
    - Add `is_auto_calculable` column (Boolean, default=False)
    - Add `form_schema` column (JSONB, nullable)
    - Add `calculation_schema` column (JSONB, nullable)
    - Add `remark_schema` column (JSONB, nullable)
    - Existing `technical_notes_text` remains (Text, nullable)
    - Model includes proper SQLAlchemy type hints
    - Model includes relationships to indicators_history
  - **Tech:** SQLAlchemy, PostgreSQL JSONB type
  - **Duration:** 2 hours

- [x] **1.1.2 Atomic: Create indicators_history table model**
  - **Files:**
    - `apps/api/app/db/models/assessment.py` (add IndicatorHistory model)
  - **Dependencies:** None
  - **Acceptance Criteria:**
    - Table mirrors indicators table structure
    - Includes `indicator_id` FK to indicators.id
    - Includes `version` column to track version number
    - Includes `archived_at` timestamp
    - Includes `archived_by` FK to users.id
    - All JSONB fields preserved (form_schema, calculation_schema, remark_schema)
    - Composite unique constraint on (indicator_id, version)
  - **Tech:** SQLAlchemy, PostgreSQL
  - **Duration:** 2 hours

- [x] **1.1.3 Atomic: Add rule type enums to enums.py**
  - **Files:**
    - `apps/api/app/db/enums.py`
  - **Dependencies:** None
  - **Acceptance Criteria:**
    - Create `RuleType` enum with values: AND_ALL, OR_ANY, PERCENTAGE_THRESHOLD, COUNT_THRESHOLD,
      MATCH_VALUE, BBI_FUNCTIONALITY_CHECK
    - Create `BBIStatus` enum with values: FUNCTIONAL, NON_FUNCTIONAL
    - Enums properly inherit from str and enum.Enum for SQLAlchemy compatibility
  - **Tech:** Python enum, SQLAlchemy
  - **Duration:** 1 hour

- [x] **1.1.4 Atomic: Create Alembic migration for indicator versioning**
  - **Files:**
    - `apps/api/alembic/versions/xxxx_add_indicator_versioning.py`
  - **Dependencies:** 1.1.1, 1.1.2, 1.1.3
  - **Acceptance Criteria:**
    - Migration adds new columns to indicators table
    - Migration creates indicators_history table
    - Migration includes upgrade() to apply changes
    - Migration includes downgrade() to reverse changes
    - Default value for `version` set to 1 for existing indicators
    - Existing indicators remain intact with all original data
    - Migration runs successfully: `alembic upgrade head`
  - **Tech:** Alembic, PostgreSQL
  - **Duration:** 2 hours

- [x] **1.1.5 Atomic: Create data migration to populate initial versions**
  - **Files:**
    - `apps/api/alembic/versions/xxxx_populate_indicator_versions.py`
  - **Dependencies:** 1.1.4
  - **Acceptance Criteria:**
    - Create snapshot of existing indicators in indicators_history as version 1
    - Set `archived_at` to migration timestamp
    - Set `archived_by` to null (initial migration)
    - All existing assessment_responses link to correct indicator version
    - Migration is idempotent (can run multiple times safely)
  - **Tech:** Alembic, SQLAlchemy ORM
  - **Duration:** 2 hours

---

## Story 1.2: Backend Indicator Service Layer with Versioning Logic

**Duration:** 2 days **Dependencies:** 1.1 (Database schema must exist)

### Atomic Tasks

- [x] **1.2.1 Atomic: Create indicator_service.py with base structure**
  - **Files:**
    - `apps/api/app/services/indicator_service.py`
  - **Dependencies:** 1.1.4
  - **Acceptance Criteria:**
    - Create `IndicatorService` class
    - Initialize with database session dependency
    - Import necessary models (Indicator, IndicatorHistory, User)
    - Set up logging with loguru
    - Create singleton instance: `indicator_service = IndicatorService()`
    - Follows fat service pattern (all logic in service, not router)
  - **Tech:** FastAPI, SQLAlchemy, Loguru
  - **Duration:** 1 hour

- [x] **1.2.2 Atomic: Implement create_indicator() method**
  - **Files:**
    - `apps/api/app/services/indicator_service.py`
  - **Dependencies:** 1.2.1
  - **Acceptance Criteria:**
    - Method signature:
      `create_indicator(db: Session, data: IndicatorCreate, user_id: int) -> Indicator`
    - Validate governance_area_id exists
    - Validate parent_id exists if provided
    - Prevent circular parent relationships
    - Set version to 1 for new indicators
    - Set is_active to True by default
    - Save to database and commit
    - Log creation event
    - Return created indicator with all fields
    - Raise appropriate exceptions (e.g., ValueError for invalid parent)
  - **Tech:** SQLAlchemy, Pydantic validation
  - **Duration:** 3 hours

- [x] **1.2.3 Atomic: Implement get_indicator() method**
  - **Files:**
    - `apps/api/app/services/indicator_service.py`
  - **Dependencies:** 1.2.1
  - **Acceptance Criteria:**
    - Method signature: `get_indicator(db: Session, indicator_id: int) -> Indicator | None`
    - Fetch indicator by ID
    - Include relationships (governance_area, parent, children)
    - Return None if not found (not exception)
    - Eager load JSONB fields (form_schema, calculation_schema, remark_schema)
  - **Tech:** SQLAlchemy query with joinedload
  - **Duration:** 1 hour

- [x] **1.2.4 Atomic: Implement list_indicators() method with filtering**
  - **Files:**
    - `apps/api/app/services/indicator_service.py`
  - **Dependencies:** 1.2.1
  - **Acceptance Criteria:**
    - Method signature:
      `list_indicators(db: Session, governance_area_id: int | None = None, is_active: bool | None = None, search: str | None = None, skip: int = 0, limit: int = 100) -> list[Indicator]`
    - Filter by governance_area_id if provided
    - Filter by is_active if provided
    - Search by name (case-insensitive) if search term provided
    - Support pagination with skip/limit
    - Order by governance_area_id, then name
    - Return list of indicators
  - **Tech:** SQLAlchemy filtering, pagination
  - **Duration:** 2 hours

- [x] **1.2.5 Atomic: Implement update_indicator() method with versioning**
  - **Files:**
    - `apps/api/app/services/indicator_service.py`
  - **Dependencies:** 1.2.1, 1.2.3
  - **Acceptance Criteria:**
    - Method signature:
      `update_indicator(db: Session, indicator_id: int, data: IndicatorUpdate, user_id: int) -> Indicator`
    - Fetch existing indicator
    - If form_schema, calculation_schema, or remark_schema changed:
      - Archive current version to indicators_history
      - Increment version number
      - Set archived_at to now
      - Set archived_by to user_id
    - If only metadata changed (name, description, is_active), update in place without versioning
    - Update indicator fields with new data
    - Commit and return updated indicator
    - Log versioning event if version changed
  - **Tech:** SQLAlchemy, Python datetime
  - **Duration:** 4 hours

- [x] **1.2.6 Atomic: Implement deactivate_indicator() method**
  - **Files:**
    - `apps/api/app/services/indicator_service.py`
  - **Dependencies:** 1.2.1, 1.2.3
  - **Acceptance Criteria:**
    - Method signature:
      `deactivate_indicator(db: Session, indicator_id: int, user_id: int) -> Indicator`
    - Fetch indicator
    - Set is_active to False (soft delete)
    - Do NOT delete from database
    - Prevent deletion if indicator has child indicators that are active
    - Log deactivation event
    - Return updated indicator
  - **Tech:** SQLAlchemy
  - **Duration:** 2 hours

- [x] **1.2.7 Atomic: Implement get_indicator_history() method**
  - **Files:**
    - `apps/api/app/services/indicator_service.py`
  - **Dependencies:** 1.2.1
  - **Acceptance Criteria:**
    - Method signature:
      `get_indicator_history(db: Session, indicator_id: int) -> list[IndicatorHistory]`
    - Fetch all versions from indicators_history for given indicator_id
    - Include current version from indicators table
    - Order by version DESC (newest first)
    - Include archived_by user information
    - Return list of all versions
  - **Tech:** SQLAlchemy query with join to users
  - **Duration:** 2 hours

- [x] **1.2.8 Atomic: Implement helper to prevent circular parent relationships**
  - **Files:**
    - `apps/api/app/services/indicator_service.py`
  - **Dependencies:** 1.2.1
  - **Acceptance Criteria:**
    - Helper function:
      `_check_circular_parent(db: Session, indicator_id: int, parent_id: int) -> bool`
    - Recursively check if parent_id eventually leads back to indicator_id
    - Return True if circular relationship detected
    - Raise ValueError with clear message if circular detected
    - Used in create_indicator() and update_indicator()
  - **Tech:** Python recursion, SQLAlchemy
  - **Duration:** 2 hours

---

## Story 1.3: Backend Indicator API Endpoints

**Duration:** 1 day **Dependencies:** 1.2 (Service layer must exist)

### Atomic Tasks

- [x] **1.3.1 Atomic: Create Pydantic schemas for indicator requests/responses**
  - **Files:**
    - `apps/api/app/schemas/indicator.py`
  - **Dependencies:** None
  - **Acceptance Criteria:**
    - `IndicatorBase` schema with common fields (name, description, governance_area_id, parent_id,
      is_active, is_profiling_only, is_auto_calculable, technical_notes_text)
    - `IndicatorCreate` schema inheriting from IndicatorBase
    - `IndicatorUpdate` schema with all fields optional
    - `IndicatorResponse` schema including id, version, created_at, updated_at, and nested
      governance_area/parent
    - `IndicatorHistoryResponse` schema for version history
    - Proper type hints (int, str, bool, JSONB as dict)
    - Validation: name required, min length 3 characters
  - **Tech:** Pydantic, Python type hints
  - **Duration:** 2 hours

- [x] **1.3.2 Atomic: Create indicators.py router with CRUD endpoints**
  - **Files:**
    - `apps/api/app/api/v1/indicators.py`
  - **Dependencies:** 1.3.1, 1.2.8 (service must be complete)
  - **Acceptance Criteria:**
    - Create FastAPI router: `router = APIRouter(prefix="/indicators", tags=["indicators"])`
    - Import indicator_service singleton
    - Import Pydantic schemas
    - Import dependencies (get_db, get_current_user, require_mlgoo_dilg)
    - Router structure ready for endpoints
  - **Tech:** FastAPI APIRouter
  - **Duration:** 1 hour

- [x] **1.3.3 Atomic: Implement POST /api/v1/indicators endpoint**
  - **Files:**
    - `apps/api/app/api/v1/indicators.py`
  - **Dependencies:** 1.3.2
  - **Acceptance Criteria:**
    - Endpoint: `@router.post("/", response_model=IndicatorResponse, status_code=201)`
    - Requires MLGOO_DILG role (use require_mlgoo_dilg dependency)
    - Accepts IndicatorCreate schema in request body
    - Calls indicator_service.create_indicator()
    - Returns created indicator as IndicatorResponse
    - Returns 400 if validation fails (circular parent, invalid governance area)
    - Returns 403 if user not MLGOO_DILG
  - **Tech:** FastAPI, Pydantic, HTTP status codes
  - **Duration:** 2 hours

- [x] **1.3.4 Atomic: Implement GET /api/v1/indicators endpoint (list)**
  - **Files:**
    - `apps/api/app/api/v1/indicators.py`
  - **Dependencies:** 1.3.2
  - **Acceptance Criteria:**
    - Endpoint: `@router.get("/", response_model=list[IndicatorResponse])`
    - Requires MLGOO_DILG role
    - Query parameters: governance_area_id (optional), is_active (optional), search (optional), skip
      (default 0), limit (default 100)
    - Calls indicator_service.list_indicators()
    - Returns list of indicators
    - Returns empty list if no results
  - **Tech:** FastAPI query parameters
  - **Duration:** 1.5 hours

- [x] **1.3.5 Atomic: Implement GET /api/v1/indicators/{id} endpoint**
  - **Files:**
    - `apps/api/app/api/v1/indicators.py`
  - **Dependencies:** 1.3.2
  - **Acceptance Criteria:**
    - Endpoint: `@router.get("/{indicator_id}", response_model=IndicatorResponse)`
    - Requires MLGOO_DILG role
    - Path parameter: indicator_id (int)
    - Calls indicator_service.get_indicator()
    - Returns indicator if found
    - Returns 404 if indicator not found
  - **Tech:** FastAPI path parameters, HTTPException
  - **Duration:** 1 hour

- [x] **1.3.6 Atomic: Implement PUT /api/v1/indicators/{id} endpoint**
  - **Files:**
    - `apps/api/app/api/v1/indicators.py`
  - **Dependencies:** 1.3.2
  - **Acceptance Criteria:**
    - Endpoint: `@router.put("/{indicator_id}", response_model=IndicatorResponse)`
    - Requires MLGOO_DILG role
    - Path parameter: indicator_id (int)
    - Accepts IndicatorUpdate schema in request body
    - Calls indicator_service.update_indicator()
    - Returns updated indicator
    - Returns 404 if indicator not found
    - Creates new version if schemas changed
  - **Tech:** FastAPI, Pydantic
  - **Duration:** 2 hours

- [x] **1.3.7 Atomic: Implement DELETE /api/v1/indicators/{id} endpoint**
  - **Files:**
    - `apps/api/app/api/v1/indicators.py`
  - **Dependencies:** 1.3.2
  - **Acceptance Criteria:**
    - Endpoint: `@router.delete("/{indicator_id}", status_code=204)`
    - Requires MLGOO_DILG role
    - Path parameter: indicator_id (int)
    - Calls indicator_service.deactivate_indicator()
    - Returns 204 No Content on success
    - Returns 404 if indicator not found
    - Returns 400 if indicator has active children
  - **Tech:** FastAPI, HTTP 204 status
  - **Duration:** 1.5 hours

- [x] **1.3.8 Atomic: Implement GET /api/v1/indicators/{id}/history endpoint**
  - **Files:**
    - `apps/api/app/api/v1/indicators.py`
  - **Dependencies:** 1.3.2
  - **Acceptance Criteria:**
    - Endpoint:
      `@router.get("/{indicator_id}/history", response_model=list[IndicatorHistoryResponse])`
    - Requires MLGOO_DILG role
    - Path parameter: indicator_id (int)
    - Calls indicator_service.get_indicator_history()
    - Returns list of all versions (current + archived)
    - Each version includes archived_at, archived_by user info
    - Returns 404 if indicator not found
  - **Tech:** FastAPI, Pydantic nested models
  - **Duration:** 2 hours

- [x] **1.3.9 Atomic: Register indicators router in main API**
  - **Files:**
    - `apps/api/app/api/v1/__init__.py`
  - **Dependencies:** 1.3.8
  - **Acceptance Criteria:**
    - Import indicators router
    - Include in api_router with prefix "/indicators"
    - Verify router appears in OpenAPI docs at /docs
    - All endpoints visible under "indicators" tag
  - **Tech:** FastAPI router inclusion
  - **Duration:** 0.5 hours

---

## Story 1.4: Frontend Indicator List & Detail Views

**Duration:** 2 days **Dependencies:** 1.3 (API endpoints must exist), `pnpm generate-types`

### Atomic Tasks

- [x] **1.4.1 Atomic: Generate TypeScript types from backend**
  - **Files:**
    - `packages/shared/src/generated/schemas/indicators/` (auto-generated)
    - `packages/shared/src/generated/endpoints/indicators/` (auto-generated)
  - **Dependencies:** 1.3.9
  - **Acceptance Criteria:**
    - Run `pnpm generate-types` successfully
    - IndicatorResponse type generated
    - IndicatorCreate type generated
    - IndicatorUpdate type generated
    - React Query hooks generated (useGetIndicators, useGetIndicator, useCreateIndicator, etc.)
    - No TypeScript errors in generated files
  - **Tech:** Orval, OpenAPI, TypeScript
  - **Duration:** 0.5 hours

- [x] **1.4.2 Atomic: Create useIndicators custom hook**
  - **Files:**
    - `apps/web/src/hooks/useIndicators.ts`
  - **Dependencies:** 1.4.1
  - **Acceptance Criteria:**
    - Import generated hooks from @sinag/shared
    - Wrap useGetIndicators with custom logic (if needed)
    - Export `useIndicators()` hook for list with filters
    - Export `useIndicator(id)` hook for single indicator
    - Export `useCreateIndicator()` mutation hook
    - Export `useUpdateIndicator()` mutation hook
    - Export `useDeleteIndicator()` mutation hook
    - Export `useIndicatorHistory(id)` hook
    - Include proper TypeScript types
  - **Tech:** React, TanStack Query, TypeScript
  - **Duration:** 2 hours

- [x] **1.4.3 Atomic: Create admin/indicators folder structure**
  - **Files:**
    - `apps/web/src/app/(app)/admin/indicators/page.tsx` (create)
    - `apps/web/src/app/(app)/admin/indicators/[id]/page.tsx` (create)
    - `apps/web/src/components/features/admin/indicators/index.ts` (create)
  - **Dependencies:** None
  - **Acceptance Criteria:**
    - Folder structure matches Next.js App Router conventions
    - Pages use `(app)` route group (authenticated)
    - Placeholder pages with "Indicator Management" headings
    - Pages export default async function (Server Component)
  - **Tech:** Next.js 15 App Router
  - **Duration:** 0.5 hours

- [x] **1.4.4 Atomic: Create IndicatorList component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/IndicatorList.tsx`
  - **Dependencies:** 1.4.2
  - **Acceptance Criteria:**
    - Client Component with "use client" directive
    - Uses useIndicators() hook to fetch data
    - Displays loading state (Skeleton or Spinner)
    - Displays error state with user-friendly message
    - Renders table with columns: Name, Governance Area, Active Status, Auto-Calculable, Version,
      Actions
    - Search input (debounced) to filter by name
    - Filter dropdown for governance area
    - Filter toggle for active/inactive
    - Pagination controls (Next/Previous)
    - "Create Indicator" button linking to /admin/indicators/new
    - Proper TypeScript types from generated schemas
  - **Tech:** React, TanStack Query, shadcn/ui Table, Input, Button, Select
  - **Duration:** 4 hours

- [x] **1.4.5 Atomic: Create IndicatorCard or table row component**
  - **Files:**
    - `apps/web/src/components/features/indicators/IndicatorTableRow.tsx`
  - **Dependencies:** None
  - **Acceptance Criteria:**
    - Props: indicator (IndicatorResponse type)
    - Displays indicator name as link to detail page
    - Displays governance area name
    - Displays active status badge (green if active, gray if inactive)
    - Displays auto-calculable badge
    - Displays profiling badge
    - Displays version number
    - Actions dropdown with "View Details", "Edit", "View History", "Deactivate"
    - Click "Edit" navigates to /mlgoo/indicators/[id]/edit
    - Click "View History" navigates to /mlgoo/indicators/[id]?tab=history
    - Click "Deactivate" shows confirmation dialog with AlertDialog
  - **Tech:** React, shadcn/ui Badge, DropdownMenu, AlertDialog
  - **Duration:** 3 hours
  - **Status:** COMPLETE

- [x] **1.4.6 Atomic: Create indicator list page**
  - **Files:**
    - `apps/web/src/app/(app)/admin/indicators/page.tsx`
  - **Dependencies:** 1.4.4, 1.4.5
  - **Acceptance Criteria:**
    - Server Component that renders page layout
    - Page title: "Indicator Management"
    - Breadcrumb: Admin / Indicators
    - Renders IndicatorList component
    - Protected by MLGOO_DILG role check (redirect if not authorized)
    - Proper metadata (title, description)
  - **Tech:** Next.js App Router, Server Component
  - **Duration:** 1 hour

- [x] **1.4.7 Atomic: Create IndicatorDetail component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/IndicatorDetail.tsx`
  - **Dependencies:** 1.4.2
  - **Acceptance Criteria:**
    - Client Component
    - Props: indicatorId (number)
    - Uses useIndicator(id) hook to fetch data
    - Displays loading state
    - Displays error state (404 if not found)
    - Shows all indicator fields in read-only view:
      - Name, Description, Governance Area
      - Parent Indicator (if any)
      - Active Status, Auto-Calculable flag
      - Version number
      - Technical Notes (formatted)
      - form_schema (JSON viewer, collapsible)
      - calculation_schema (JSON viewer, collapsible)
      - remark_schema (JSON viewer, collapsible)
    - "Edit" button linking to /admin/indicators/[id]/edit
    - "View History" button
  - **Tech:** React, TanStack Query, shadcn/ui Card, Accordion
  - **Duration:** 3 hours

- [x] **1.4.8 Atomic: Create IndicatorHistory component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/IndicatorHistory.tsx`
  - **Dependencies:** 1.4.2
  - **Acceptance Criteria:**
    - Client Component
    - Props: indicatorId (number)
    - Uses useIndicatorHistory(id) hook
    - Displays timeline of all versions
    - Each version shows: version number, archived date, archived by user, changes summary
    - Collapsible details showing full schema diffs
    - Visual timeline UI (vertical line connecting versions)
    - Most recent version at top
  - **Tech:** React, TanStack Query, custom Timeline component or shadcn/ui
  - **Duration:** 4 hours

- [x] **1.4.9 Atomic: Create indicator detail page**
  - **Files:**
    - `apps/web/src/app/(app)/admin/indicators/[id]/page.tsx`
  - **Dependencies:** 1.4.7, 1.4.8
  - **Acceptance Criteria:**
    - Server Component with dynamic [id] param
    - Page title: indicator name (fetch on server)
    - Breadcrumb: Admin / Indicators / [Indicator Name]
    - Renders IndicatorDetail component
    - Conditional rendering of IndicatorHistory (in tabs or accordion)
    - Protected by MLGOO_DILG role check
    - Returns 404 if indicator not found
  - **Tech:** Next.js App Router, Server Component, dynamic routes
  - **Duration:** 1.5 hours

---

## Story 1.5: Backend & Frontend Testing for Core CRUD

**Duration:** 1 day **Dependencies:** 1.2, 1.3, 1.4

### Atomic Tasks

- [x] **1.5.1 Atomic: Create test fixtures for indicators**
  - **Files:**
    - `apps/api/tests/conftest.py` (update)
  - **Dependencies:** None
  - **Acceptance Criteria:**
    - Create `test_indicator` fixture that returns a sample Indicator
    - Create `test_indicator_with_parent` fixture for hierarchical testing
    - Create `test_governance_area` fixture if not exists
    - Create `test_mlgoo_user` fixture for MLGOO_DILG user
    - Fixtures use database session and clean up after tests
  - **Tech:** Pytest fixtures, SQLAlchemy
  - **Duration:** 2 hours

- [x] **1.5.2 Atomic: Write indicator_service unit tests**
  - **Files:**
    - `apps/api/tests/services/test_indicator_service.py`
  - **Dependencies:** 1.5.1
  - **Acceptance Criteria:**
    - Test `create_indicator()` - success case
    - Test `create_indicator()` - circular parent detection
    - Test `get_indicator()` - found and not found
    - Test `list_indicators()` - with various filters
    - Test `update_indicator()` - metadata only (no version change)
    - Test `update_indicator()` - schema change (version increments)
    - Test `deactivate_indicator()` - success
    - Test `deactivate_indicator()` - fails if has active children
    - Test `get_indicator_history()` - returns all versions
    - All tests use fixtures and mock database
    - Run with `pytest -vv apps/api/tests/services/test_indicator_service.py`
  - **Tech:** Pytest, SQLAlchemy mocking
  - **Duration:** 4 hours

- [x] **1.5.3 Atomic: Write indicator API endpoint tests**
  - **Files:**
    - `apps/api/tests/api/v1/test_indicators.py`
  - **Dependencies:** 1.5.1
  - **Acceptance Criteria:**
    - Test POST /api/v1/indicators - success (201)
    - Test POST /api/v1/indicators - unauthorized (403)
    - Test GET /api/v1/indicators - list with filters
    - Test GET /api/v1/indicators/{id} - found (200)
    - Test GET /api/v1/indicators/{id} - not found (404)
    - Test PUT /api/v1/indicators/{id} - success, version increments
    - Test DELETE /api/v1/indicators/{id} - success (204)
    - Test GET /api/v1/indicators/{id}/history - returns versions
    - All tests use TestClient and fixtures
    - Run with `pytest -vv apps/api/tests/api/v1/test_indicators.py`
  - **Tech:** Pytest, FastAPI TestClient
  - **Duration:** 4 hours

- [x] **1.5.4 Atomic: Write versioning integration test**
  - **Files:**
    - `apps/api/tests/integration/test_indicator_versioning.py`
  - **Dependencies:** 1.5.1
  - **Acceptance Criteria:**
    - Test complete workflow: create indicator → update schema → verify new version created
    - Verify old assessments still reference version 1
    - Verify new assessments use version 2
    - Verify indicators_history contains version 1
    - Verify current indicators table contains version 2
    - Test is isolated (uses separate test database)
  - **Tech:** Pytest, SQLAlchemy integration testing
  - **Duration:** 3 hours

- [x] **1.5.5 Atomic: Write frontend IndicatorList component tests**
  - **Files:**
    - `apps/web/src/components/features/indicators/IndicatorList.test.tsx`
  - **Dependencies:** 1.4.4
  - **Acceptance Criteria:**
    - Mock useIndicators hook with MSW
    - Test loading state renders skeleton
    - Test error state renders error message
    - Test successful data fetch renders table
    - Test search input filters indicators
    - Test governance area filter works
    - Test active/inactive toggle works
    - Test pagination controls
    - Test "Create Indicator" button navigation
    - Run with `pnpm test IndicatorList.test.tsx`
  - **Tech:** Vitest, React Testing Library, MSW
  - **Duration:** 3 hours

- [x] **1.5.6 Atomic: Write frontend IndicatorDetail component tests**
  - **Files:**
    - `apps/web/src/components/features/indicators/IndicatorDetail.test.tsx`
  - **Dependencies:** 1.4.7
  - **Acceptance Criteria:**
    - Mock useIndicator hook with MSW
    - Test loading state
    - Test 404 error state
    - Test successful render of all indicator fields
    - Test JSON viewers are collapsible
    - Test "Edit" button navigation
    - Test "View History" button
  - **Tech:** Vitest, React Testing Library, MSW
  - **Duration:** 2 hours

---

## Summary ✅

**Epic 1.0 Total Atomic Tasks:** 38 tasks **Status:** COMPLETE (37/37 tasks - 100%) **Completion
Date:** November 7, 2025 **Estimated Total Duration:** 5-7 days

### Task Breakdown by Story:

- Story 1.1 (Database): ✅ 5/5 tasks (9 hours)
- Story 1.2 (Service Layer): ✅ 8/8 tasks (16 hours)
- Story 1.3 (API Endpoints): ✅ 9/9 tasks (13.5 hours)
- Story 1.4 (Frontend): ✅ 9/9 tasks (19.5 hours) ← Just completed!
- Story 1.5 (Testing): ✅ 6/6 tasks (18 hours)

**Total: 76 hours across 5 stories - 100% COMPLETE**

### Implementation Summary:

✅ Complete indicator CRUD operations with versioning ✅ Full database schema with versioning and
history tracking ✅ Comprehensive backend service layer with audit logging ✅ RESTful API endpoints
with proper access control ✅ Frontend indicator list, detail, create, and edit views ✅
IndicatorTableRow component for table-based display ✅ Test coverage for backend and frontend

All tasks completed with clear acceptance criteria and file paths.
