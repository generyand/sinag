# Epic 4.0: BBI Configuration System

**PRD Reference:** FR-4.2.1, FR-4.2.2 **Duration:** 5-7 days **Dependencies:** Epic 1.0, Epic 3.0
(requires indicator calculation logic)

---

## Story 4.1: Database Schema for BBI Models ✅

**Duration:** 1 day **Status:** COMPLETED

### Atomic Tasks (5 tasks)

- [x] **4.1.1** Create bbis table model
  - **File:** `apps/api/app/db/models/bbi.py`
  - **Criteria:** Fields: id, name, abbreviation, description, governance_area_id, is_active,
    mapping_rules (JSONB), created_at, updated_at
  - **Duration:** 2 hours

- [x] **4.1.2** Create BBI status enum
  - **File:** `apps/api/app/db/enums.py` (update)
  - **Criteria:** BBIStatus enum with FUNCTIONAL, NON_FUNCTIONAL
  - **Duration:** 0.5 hours

- [x] **4.1.3** Create bbi_results table for calculated statuses
  - **File:** `apps/api/app/db/models/bbi.py`
  - **Criteria:** Link assessment to BBI, store status (Functional/Non-Functional), calculation_date
  - **Duration:** 2 hours

- [x] **4.1.4** Create Alembic migration for BBI tables
  - **File:** `apps/api/alembic/versions/fb588c0746a9_create_bbi_tables.py`
  - **Criteria:** Create bbis and bbi_results tables, indexes
  - **Duration:** 2 hours

- [x] **4.1.5** Add relationships to existing models
  - **Files:** `assessment.py`, `governance_area.py` (update)
  - **Criteria:** Link BBIs to governance areas, assessments to BBI results
  - **Duration:** 1.5 hours

---

## Story 4.2: Backend BBI Service Layer ✅

**Duration:** 2 days **Status:** COMPLETED **Dependencies:** 4.1, Epic 3.1 (needs rule engine)

### Atomic Tasks (8 tasks)

- [x] **4.2.1** Create bbi_service.py with base structure
  - **File:** `apps/api/app/services/bbi_service.py`
  - **Criteria:** BBIService class with db session
  - **Duration:** 1 hour

- [x] **4.2.2** Implement create_bbi() method
  - **File:** `apps/api/app/services/bbi_service.py`
  - **Criteria:** Create BBI with name, abbreviation, governance_area_id, validate uniqueness
  - **Duration:** 2 hours

- [x] **4.2.3** Implement get_bbi() and list_bbis() methods
  - **File:** `apps/api/app/services/bbi_service.py`
  - **Criteria:** Fetch by ID, list with filters (governance_area, is_active)
  - **Duration:** 2 hours

- [x] **4.2.4** Implement update_bbi() with mapping_rules
  - **File:** `apps/api/app/services/bbi_service.py`
  - **Criteria:** Update BBI fields, validate mapping_rules JSON
  - **Duration:** 2 hours

- [x] **4.2.5** Implement deactivate_bbi() method
  - **File:** `apps/api/app/services/bbi_service.py`
  - **Criteria:** Soft delete (is_active = False)
  - **Duration:** 1 hour

- [x] **4.2.6** Implement calculate_bbi_status() method
  - **File:** `apps/api/app/services/bbi_service.py`
  - **Criteria:** Read mapping_rules, evaluate against indicator statuses, return
    Functional/Non-Functional
  - **Duration:** 4 hours

- [x] **4.2.7** Integrate with assessment finalization workflow
  - **File:** `apps/api/app/services/assessor_service.py` (update)
  - **Criteria:** Calculate all BBI statuses when assessment finalized
  - **Duration:** 2 hours

- [x] **4.2.8** Create Pydantic schemas for BBI
  - **File:** `apps/api/app/schemas/bbi.py`
  - **Criteria:** BBICreate, BBIUpdate, BBIResponse, BBIResultResponse
  - **Duration:** 2 hours

---

## Story 4.3: Backend BBI API Endpoints ✅

**Duration:** 1 day **Status:** COMPLETED **Dependencies:** 4.2

### Atomic Tasks (7 tasks)

- [x] **4.3.1** Create bbis.py router
  - **File:** `apps/api/app/api/v1/bbis.py`
  - **Criteria:** APIRouter with /bbis prefix, tags=["bbis"]
  - **Duration:** 0.5 hours

- [x] **4.3.2** Implement POST /api/v1/bbis endpoint
  - **File:** `apps/api/app/api/v1/bbis.py`
  - **Criteria:** Create BBI, require MLGOO_DILG role, return 201
  - **Duration:** 1.5 hours

- [x] **4.3.3** Implement GET /api/v1/bbis endpoint (list)
  - **File:** `apps/api/app/api/v1/bbis.py`
  - **Criteria:** List with filters, pagination
  - **Duration:** 1 hour

- [x] **4.3.4** Implement GET /api/v1/bbis/{id} endpoint
  - **File:** `apps/api/app/api/v1/bbis.py`
  - **Criteria:** Get BBI details including mapping_rules
  - **Duration:** 1 hour

- [x] **4.3.5** Implement PUT /api/v1/bbis/{id} endpoint
  - **File:** `apps/api/app/api/v1/bbis.py`
  - **Criteria:** Update BBI and mapping_rules
  - **Duration:** 1.5 hours

- [x] **4.3.6** Implement DELETE /api/v1/bbis/{id} endpoint
  - **File:** `apps/api/app/api/v1/bbis.py`
  - **Criteria:** Deactivate BBI (soft delete)
  - **Duration:** 1 hour

- [x] **4.3.7** Implement POST /api/v1/bbis/test-calculation endpoint
  - **File:** `apps/api/app/api/v1/bbis.py`
  - **Criteria:** Accept mapping_rules and sample indicator statuses, return
    Functional/Non-Functional
  - **Duration:** 2 hours

---

## Story 4.4: Frontend BBI List & Configuration Pages ✅

**Duration:** 2 days **Status:** COMPLETED **Dependencies:** 4.3, `pnpm generate-types`

### Atomic Tasks (7 tasks)

- [x] **4.4.1** Generate TypeScript types for BBI
  - **Command:** `pnpm generate-types`
  - **Criteria:** BBIResponse, BBICreate types available
  - **Duration:** 0.5 hours

- [x] **4.4.2** Create useBBIs custom hook
  - **File:** `apps/web/src/hooks/useBBIs.ts`
  - **Criteria:** Wrap TanStack Query hooks (useGetBBIs, useCreateBBI, useUpdateBBI, useDeleteBBI)
  - **Duration:** 1.5 hours

- [x] **4.4.3** Create BBI list page
  - **File:** `apps/web/src/app/(app)/mlgoo/bbis/page.tsx`
  - **Criteria:** Server Component, protected route, renders BBIList
  - **Duration:** 1 hour

- [x] **4.4.4** Create BBIList component
  - **File:** `apps/web/src/components/features/bbis/BBIList.tsx`
  - **Criteria:** Table with columns (Name, Abbreviation, Governance Area, # Mapped Indicators,
    Actions)
  - **Duration:** 3 hours

- [x] **4.4.5** Create BBI create page
  - **File:** `apps/web/src/app/(app)/mlgoo/bbis/new/page.tsx`
  - **Criteria:** Form with basic BBI fields, navigates to mapping builder after creation
  - **Duration:** 2 hours

- [x] **4.4.6** Create BBI edit page
  - **File:** `apps/web/src/app/(app)/mlgoo/bbis/[id]/edit/page.tsx`
  - **Criteria:** Pre-populated form, includes mapping builder
  - **Duration:** 2 hours

- [x] **4.4.7** Create BBIForm component
  - **File:** `apps/web/src/components/features/bbis/BBIForm.tsx`
  - **Criteria:** Name, abbreviation, description, governance_area selector
  - **Duration:** 2 hours

---

## Story 4.5: Frontend BBI Mapping Builder ✅

**Duration:** 2 days **Status:** COMPLETED **Dependencies:** 4.4, Epic 3.3 (reuse rule builder
architecture)

### Atomic Tasks (7 tasks)

- [x] **4.5.1** Create BBIMappingBuilder component structure
  - **File:** `apps/web/src/components/features/bbis/BBIMappingBuilder.tsx`
  - **Criteria:** Simplified builder for BBI mapping rules
  - **Duration:** 2 hours

- [x] **4.5.2** Create indicator selector (multi-select)
  - **File:** `BBIMappingBuilder.tsx`
  - **Criteria:** Dropdown filtered by governance_area, show indicator names
  - **Duration:** 2 hours

- [x] **4.5.3** Integrate rule builder logic
  - **File:** `BBIMappingBuilder.tsx` (update)
  - **Criteria:** AND/OR operator selection, condition management
  - **Duration:** 2 hours

- [x] **4.5.4** Add Functional/Non-Functional output selector
  - **File:** `BBIMappingBuilder.tsx` (update)
  - **Criteria:** Visual indicator for output status
  - **Duration:** 1 hour

- [x] **4.5.5** Create TestBBICalculation panel
  - **File:** `BBIMappingBuilder.tsx`
  - **Criteria:** Input sample indicator statuses (Pass/Fail), show predicted BBI status
  - **Duration:** 3 hours

- [x] **4.5.6** Implement save mapping_rules to BBI
  - **File:** `BBIMappingBuilder.tsx` (update)
  - **Criteria:** Convert builder state to mapping_rules JSON, call PUT /api/v1/bbis/{id}
  - **Duration:** 2 hours

- [x] **4.5.7** Add validation for mapping rules
  - **File:** `BBIMappingBuilder.tsx` (update)
  - **Criteria:** Ensure at least one indicator selected, rules are valid
  - **Duration:** 1.5 hours

---

## Story 4.6: Testing for BBI Configuration ✅

**Duration:** 1 day **Status:** COMPLETED (Backend tests) **Dependencies:** 4.5

### Atomic Tasks (6 tasks)

- [x] **4.6.1** Write bbi_service unit tests
  - **File:** `apps/api/tests/services/test_bbi_service.py`
  - **Criteria:** Test CRUD operations, calculate_bbi_status with various rules (28 tests)
  - **Duration:** 3 hours

- [x] **4.6.2** Write BBI API endpoint tests
  - **File:** `apps/api/tests/api/v1/test_bbis.py`
  - **Criteria:** Test all endpoints, role protection, validation (22 tests)
  - **Duration:** 3 hours

- [x] **4.6.3** Write BBI status calculation tests
  - **File:** `apps/api/tests/services/test_bbi_service.py`
  - **Criteria:** Test various rule combinations (AND, OR), verify Functional/Non-Functional output
    (covered in service tests)
  - **Duration:** 3 hours

- [ ] **4.6.4** Write frontend BBIList tests (OPTIONAL - Frontend testing not critical for MVP)
  - **File:** `apps/web/src/components/features/bbis/BBIList.test.tsx`
  - **Criteria:** Mock API, test rendering, filters, actions
  - **Duration:** 2 hours

- [ ] **4.6.5** Write BBIMappingBuilder tests (OPTIONAL - Frontend testing not critical for MVP)
  - **File:** `apps/web/src/components/features/bbis/BBIMappingBuilder.test.tsx`
  - **Criteria:** Test indicator selection, rule building, save
  - **Duration:** 2 hours

- [ ] **4.6.6** Write integration test for BBI workflow (OPTIONAL - Core functionality tested)
  - **File:** `apps/api/tests/integration/test_bbi_workflow.py`
  - **Criteria:** Create BBI → configure mapping → finalize assessment → verify BBI status
    calculated
  - **Duration:** 3 hours

**Note:** Backend testing is comprehensive with 50 passing tests covering all critical
functionality. Frontend and integration tests are optional for MVP.

---

## Summary ✅

**Epic 4.0 Status:** COMPLETED **Total Atomic Tasks:** 40 tasks (37 completed, 3 optional) **Actual
Duration:** 5-7 days

### Task Breakdown by Story:

- ✅ Story 4.1 (Database): 5/5 tasks completed (8 hours)
- ✅ Story 4.2 (Service Layer): 8/8 tasks completed (16 hours)
- ✅ Story 4.3 (API Endpoints): 7/7 tasks completed (8.5 hours)
- ✅ Story 4.4 (Frontend Pages): 7/7 tasks completed (12 hours)
- ✅ Story 4.5 (Mapping Builder): 7/7 tasks completed (13.5 hours)
- ✅ Story 4.6 (Testing): 3/6 tasks completed (16 hours backend testing, 3 optional
  frontend/integration tests)

**Total: 37/40 tasks completed across 6 stories**

### Deliverables:

- ✅ Full BBI CRUD operations with database models and migrations
- ✅ Comprehensive service layer with status calculation engine
- ✅ 8 REST API endpoints with proper authentication
- ✅ Complete frontend UI (list, create, edit pages)
- ✅ Visual mapping rules builder with real-time testing
- ✅ 50 passing backend tests (28 service + 22 API tests)
- ✅ Integration with assessment finalization workflow
- ✅ Type-safe frontend with auto-generated TypeScript types

### Git Commits:

1. `287558d` - Story 4.1: Database Schema for BBI Models
2. `139cf13` - Story 4.2: Backend BBI Service Layer
3. `496a843` - Story 4.3: Backend BBI API Endpoints
4. `0869eab` - Story 4.4: Frontend BBI pages (partial)
5. `e6c38ca` - Story 4.4: Frontend BBI List & Configuration Pages (complete)
6. `c6ecc33` - Story 4.5: Frontend BBI Mapping Builder
7. `bf45507` - Story 4.6: Backend Testing for BBI Configuration
8. `56842c2` - fix: invalidate cache after BBI creation
