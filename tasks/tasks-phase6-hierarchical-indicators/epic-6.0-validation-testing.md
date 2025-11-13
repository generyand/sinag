# Epic 6.0: Validation, Bulk Publishing & Testing

> **PRD Reference:** FR-6.0.5, FR-6.0.6, FR-6.4.x (partial)
> **User Stories:** US-6.0.7, US-6.0.8, US-6.4.1
> **Duration:** 3-4 weeks
> **Status:** 🔄 In Progress - Core validation exists, needs comprehensive testing

**[← Back to Overview](./README.md)**

---

## Epic Overview

**Description:** Implement comprehensive pre-publish validation, bulk publishing with topological sorting for parent-child relationships, audit logging, and end-to-end testing across all Phase 6 features. This epic ensures data integrity, referential integrity, and system reliability before indicators go live.

**Validation Categories:**
1. **Tree Structure Validation** - No circular references, proper parent-child relationships
2. **Schema Validation** - Form/MOV/Calculation/Remark schemas complete and valid
3. **Weight Validation** - Sibling indicator weights sum to 100%
4. **Calculation Reference Validation** - Field references in calculations exist in form_schema
5. **BBI Mapping Validation** - Warn if indicators unmapped from BBIs

**Publishing Requirements:**
- Topological sorting: Parents published before children
- Atomic transaction: All indicators published or none (rollback on error)
- Version locking: Prevent concurrent edits during publish
- Audit trail: Log who published what, when

**Success Criteria:**
- Pre-publish validation catches all errors before database commit
- Bulk publish handles 50+ indicators in single transaction
- All 29 validated indicators from Spec v1.4 pass validation and publish successfully
- Comprehensive test coverage: >80% backend, >75% frontend
- End-to-end tests verify full workflow (draft → build → validate → publish)

---

- [ ] **6.0 Epic: Validation, Bulk Publishing & Testing** _(FR-6.0.5, FR-6.0.6, FR-6.4.x)_

  - [ ] **6.1 Story: Backend Tree Structure Validation**

    - **Scope:** Implement validation logic for hierarchical tree integrity
    - **Duration:** 2-3 days
    - **Dependencies:** Epic 2.2 (indicator service exists)
    - **Files:** `apps/api/app/services/indicator_validation_service.py`
    - **Tech:** Python, graph algorithms (DFS for cycle detection)
    - **Success Criteria:**

      - Service class `IndicatorValidationService` with methods:
        - `validate_tree_structure(indicators)` - Main validation entry point
        - `check_circular_references(indicators)` - Detect cycles using DFS
        - `validate_parent_child_relationships(indicators)` - Ensure parents exist
        - `validate_indicator_codes(indicators)` - Check code format (e.g., "1.1", "1.1.1")
        - `validate_sort_order(indicators)` - Ensure sort_order is sequential within siblings
      - **Validation Rules:**
        - **No Circular References:** Indicator cannot be its own ancestor
        - **Parent Exists:** If `parent_id` set, parent must exist in tree
        - **Code Format:** Codes match pattern `^\d+(\.\d+)*$` (e.g., "1", "1.1", "1.1.1")
        - **Sort Order:** Siblings have sequential sort_order (0, 1, 2, ...)
      - Returns: `ValidationResult` with `is_valid`, `errors` (list of error messages), `warnings`
      - Service exports singleton: `indicator_validation_service = IndicatorValidationService()`

  - [ ] **6.2 Story: Backend Schema Completeness Validation**

    - **Scope:** Validate that all required schemas are complete before publishing
    - **Duration:** 2 days
    - **Dependencies:** 6.1 (validation service created), Epic 4.0 (schema services exist)
    - **Files:** `apps/api/app/services/indicator_validation_service.py` (extend)
    - **Tech:** Python, Pydantic validation
    - **Success Criteria:**

      - Add methods to `IndicatorValidationService`:
        - `validate_schemas(indicator)` - Validate all schemas for single indicator
        - `validate_form_schema(form_schema)` - Check form fields are complete
        - `validate_mov_checklist(mov_checklist)` - Check MOV items valid
        - `validate_calculation_schema(calculation_schema, form_schema)` - Check field references exist
        - `validate_remark_schema(remark_schema, form_schema)` - Check template variables valid
      - **Validation Rules:**
        - **Form Schema:** All fields have labels, file uploads have allowed_types
        - **MOV Checklist:** All items have labels, groups have children
        - **Calculation Schema:** Field references in conditions exist in form_schema
        - **Remark Schema:** Template variables match available variables (barangay_name, score, form fields)
      - Returns: `SchemaValidationResult` with `is_valid`, `errors` by schema type
      - Validation runs for each indicator in tree before bulk publish

  - [ ] **6.3 Story: Backend Weight Sum Validation**

    - **Scope:** Validate that sibling indicator weights sum to 100%
    - **Duration:** 1 day
    - **Dependencies:** 6.2 (schema validation ready)
    - **Files:** `apps/api/app/services/indicator_validation_service.py` (extend)
    - **Tech:** Python
    - **Success Criteria:**

      - Add method: `validate_weights(indicators)` - Check weight sums for all sibling groups
      - **Validation Rules:**
        - For each parent indicator, get all children
        - Sum children weights
        - If sum != 100, add error: "Weights for indicators [codes] sum to [sum]%, must be 100%"
        - Allow tolerance: 99.9% - 100.1% considered valid (floating point precision)
      - Root indicators (no parent): weight validation skipped (or sum to 100 across all roots)
      - Returns: `WeightValidationResult` with `is_valid`, `errors` (grouped by parent)

  - [ ] **6.4 Story: Backend Topological Sorting for Bulk Publish**

    - **Scope:** Implement topological sort to publish parents before children
    - **Duration:** 2-3 days
    - **Dependencies:** 6.3 (weight validation ready)
    - **Files:** `apps/api/app/services/indicator_service.py` (extend `bulk_create_from_draft`)
    - **Tech:** Python, Kahn's algorithm or DFS-based topological sort
    - **Success Criteria:**

      - Update `bulk_create_from_draft(db, draft_id)` method:
        - Load draft data (indicator tree)
        - Run validation: `indicator_validation_service.validate_tree_structure(indicators)`
        - If validation fails, return errors without creating any indicators
        - Perform topological sort on indicators based on parent_id dependencies
        - Iterate through sorted list, creating indicators in order
        - Use database transaction: `with db.begin()` (rollback on any error)
        - After all created, delete draft
      - **Topological Sort Algorithm:**
        - Build adjacency list: parent → [children]
        - Use Kahn's algorithm: start with nodes with no parents (roots), process children after parents
        - If cycle detected during sort, raise error (should never happen after validation)
      - Returns: `BulkPublishResult` with `indicator_ids` (list of created IDs), `published_count`

  - [ ] **6.5 Story: Backend Audit Logging for Publications**

    - **Scope:** Log all indicator publications with user, timestamp, and action details
    - **Duration:** 1-2 days
    - **Dependencies:** 6.4 (bulk publish implemented)
    - **Files:**
      - `apps/api/app/db/models/audit_log.py` (may already exist)
      - `apps/api/app/services/audit_service.py`
    - **Tech:** SQLAlchemy, Python
    - **Success Criteria:**

      - **AuditLog Model** (if not exists):
        - Fields: `id`, `user_id`, `action`, `entity_type`, `entity_id`, `details` (JSONB), `timestamp`
      - **AuditService** with methods:
        - `log_indicator_publish(db, user_id, indicator_ids, draft_id)`
        - `log_indicator_update(db, user_id, indicator_id, changes)`
        - `log_bbi_mapping(db, user_id, bbi_id, indicator_id, action)`
      - **Integration:**
        - Call `audit_service.log_indicator_publish()` after successful bulk publish
        - Details JSONB includes: `{"draft_id": ..., "indicator_count": ..., "governance_area_id": ...}`
      - Audit logs queryable via API endpoint: `GET /api/v1/audit-logs?entity_type=indicator`
      - Service exports singleton: `audit_service = AuditService()`

  - [ ] **6.6 Story: Frontend Pre-Publish Validation Summary**

    - **Scope:** Create comprehensive validation summary component before publishing
    - **Duration:** 2-3 days
    - **Dependencies:** 6.5 (backend validation complete)
    - **Files:**
      - `apps/web/src/components/features/indicators/builder/ValidationSummary.tsx` (extend or create)
      - `apps/web/src/components/features/indicators/builder/PublishDialog.tsx`
    - **Tech:** React, shadcn/ui (Dialog, Alert, Badge, Accordion), TanStack Query
    - **Success Criteria:**

      - `ValidationSummary` component:
        - Runs validation on click "Publish All" button
        - Calls backend validation endpoint: `POST /api/v1/indicators/validate-tree` with draft data
        - Displays validation results in expandable sections:
          1. **Tree Structure** - Show any circular references, missing parents
          2. **Schemas** - Group errors by indicator and schema type (Form, MOV, Calculation, Remark)
          3. **Weights** - Show sibling groups with weight sum errors
          4. **BBI Mappings** - Warnings if indicators unmapped
        - Each section shows:
          - ✓ Green checkmark if valid
          - ⚠ Yellow warning icon if warnings
          - ❌ Red X if errors
        - Click section expands to show detailed error messages
        - Click error navigates to relevant indicator/tab in tree
      - `PublishDialog` component:
        - Shows after validation passes
        - Confirmation message: "You are about to publish [N] indicators. This action cannot be undone."
        - Lists indicators to be published (grouped by parent)
        - "Publish" button: calls `useBulkPublishIndicators` mutation
        - "Cancel" button: closes dialog
        - Success: redirects to `/mlgoo/indicators` with success toast
        - Error: shows error message, keeps draft intact

  - [ ] **6.7 Story: Backend Validation Endpoint**

    - **Scope:** Create API endpoint for pre-publish validation (dry run)
    - **Duration:** 1 day
    - **Dependencies:** 6.3 (all validation logic implemented)
    - **Files:** `apps/api/app/api/v1/indicators.py` (extend)
    - **Tech:** FastAPI, Pydantic
    - **Success Criteria:**

      - Endpoint: `POST /api/v1/indicators/validate-tree` with tag `indicators`
      - Request body: `draft_id` or inline `indicators` array
      - Response: `ValidationSummaryResponse` with:
        - `is_valid` (bool)
        - `tree_structure_errors` (list of strings)
        - `schema_errors` (dict: indicator_id → schema_type → errors)
        - `weight_errors` (dict: parent_id → error message)
        - `warnings` (list of warning messages)
      - Validation performed:
        - Call `indicator_validation_service.validate_tree_structure()`
        - Call `indicator_validation_service.validate_schemas()` for each indicator
        - Call `indicator_validation_service.validate_weights()`
      - Endpoint does NOT create indicators (dry run only)
      - Requires MLGOO_DILG role

  - [ ] **6.8 Story: Integration Testing for Full Workflow**

    - **Scope:** End-to-end tests covering draft → build → validate → publish workflow
    - **Duration:** 3-4 days
    - **Dependencies:** All epics complete
    - **Files:**
      - `apps/api/tests/integration/test_indicator_workflow.py`
      - `apps/web/src/__tests__/integration/indicator-builder-workflow.test.tsx`
    - **Tech:** Pytest, Playwright (E2E), Vitest, React Testing Library
    - **Success Criteria:**

      - **Backend Integration Tests** (`test_indicator_workflow.py`):
        - Test 1: Full workflow (create draft → add indicators → publish → verify in DB)
        - Test 2: Validation failure (missing weights → publish fails → draft intact)
        - Test 3: Topological sort (create parent after child in draft → publish succeeds in correct order)
        - Test 4: Concurrent publish attempt (version conflict → one succeeds, other fails)
        - Test 5: BBI status update (publish indicator → BBI status updated for mapped indicator)
        - Use pytest fixtures for test data (sample indicator trees)
        - Run with: `cd apps/api && pytest tests/integration/ -vv --log-cli-level=DEBUG`
      - **Frontend Integration Tests** (optional, or use E2E with Playwright):
        - Test full builder workflow using React Testing Library
        - Mock backend responses at network level (MSW)
        - Verify state transitions: draft → editing → validating → publishing → success
      - **E2E Tests with Playwright** (recommended):
        - Test 1: MLGOO_DILG user creates new draft, adds 3 indicators, publishes successfully
        - Test 2: Validation error prevents publish, user fixes error, publishes successfully
        - Test 3: Draft auto-saves while editing, user closes tab, resumes draft later
        - Run with: `pnpm test:e2e` (requires backend and frontend running)

  - [ ] **6.9 Story: Spec v1.4 Validation Testing**

    - **Scope:** Test all 29 validated indicators from Indicator Builder Specification v1.4
    - **Duration:** 2-3 days
    - **Dependencies:** 6.8 (integration tests ready)
    - **Files:**
      - `apps/api/tests/fixtures/spec_v1_4_indicators.json` - All 29 indicators as JSON
      - `apps/api/tests/test_spec_v1_4_validation.py`
    - **Tech:** Pytest, JSON fixtures
    - **Success Criteria:**

      - Extract all 29 indicators from Spec v1.4 (indicators 1.1 through 6.3) as JSON fixtures
      - For each indicator:
        - Load indicator config (form_schema, mov_checklist, calculation_schema, remark_schema)
        - Run validation: `indicator_validation_service.validate_schemas(indicator)`
        - Assert: `is_valid == True`
        - Create indicator in test database
        - Verify indicator created successfully
      - Test MOV checklist validation for each indicator:
        - Create sample submission data matching form_schema
        - Run MOV validation: `mov_validation_service.validate_checklist()`
        - Assert validation status matches expected (Passed/Considered/Failed based on sample data)
      - **Success Criteria:** All 29 indicators pass validation and can be created in database
      - Run with: `cd apps/api && pytest tests/test_spec_v1_4_validation.py -vv`

  - [ ] **6.10 Story: Comprehensive Test Suite & Coverage Report**

    - **Scope:** Final testing pass across all epics with coverage reporting
    - **Duration:** 3-4 days
    - **Dependencies:** 6.9 (Spec v1.4 tests complete)
    - **Files:** All test files across all epics
    - **Tech:** Pytest (with coverage), Vitest (with coverage), pytest-cov, vitest coverage
    - **Success Criteria:**

      - **Backend Test Coverage:**
        - Run: `cd apps/api && pytest --cov=app --cov-report=html --cov-report=term`
        - Target: >80% overall coverage
        - Critical modules must have >90% coverage:
          - `indicator_service.py`
          - `indicator_validation_service.py`
          - `mov_validation_service.py`
          - `bbi_service.py`
        - Coverage report generated at `apps/api/htmlcov/index.html`
      - **Frontend Test Coverage:**
        - Run: `pnpm test:coverage` from root
        - Target: >75% overall coverage
        - Critical components must have >85% coverage:
          - `IndicatorTreeView.tsx`
          - `MOVChecklistBuilder.tsx`
          - `FormSchemaBuilder.tsx`
          - `indicatorBuilderStore.ts`
        - Coverage report generated at `apps/web/coverage/index.html`
      - **Test Count Summary:**
        - Epic 1.0 (Draft System): 25 backend + 20 frontend = 45 tests
        - Epic 2.0 (Tree Editor): 30 backend + 25 frontend = 55 tests
        - Epic 3.0 (MOV Builder): 40 backend + 35 frontend = 75 tests
        - Epic 4.0 (Schema Builders): 30 backend + 30 frontend = 60 tests
        - Epic 5.0 (BBI System): 25 backend + 15 frontend = 40 tests
        - Epic 6.0 (Validation & Testing): 35 backend + 20 frontend + 5 E2E = 60 tests
        - **Total Target:** 185 backend + 145 frontend + 5 E2E = **335 tests**
      - **All tests passing:** No skipped tests (except known limitations), no flaky tests
      - Generate test report: `pytest --html=report.html` and `pnpm test -- --reporter=html`

---

**Epic Status:** 🔄 In Progress - Core validation logic exists, comprehensive testing underway

**Phase 6 Completion:** All 6 epics complete → Phase 6 ready for production deployment

---

## Phase 6 Summary

| Epic | Status | Backend Tests | Frontend Tests | Duration |
|------|--------|---------------|----------------|----------|
| 1.0: Draft System | 🔄 80% Complete | 25 | 20 | 2-3 weeks |
| 2.0: Tree Editor | 🔄 In Progress | 30 | 25 | 2-3 weeks |
| 3.0: MOV Builder | 🆕 New | 40 | 35 | 3-4 weeks |
| 4.0: Schema Builders | 🔄 In Progress | 30 | 30 | 2-3 weeks |
| 5.0: BBI System | 🆕 New | 25 | 15 | 2-3 weeks |
| 6.0: Validation & Testing | 🔄 In Progress | 35 + 5 E2E | 20 | 3-4 weeks |
| **Total** | - | **185** | **145 + 5 E2E** | **14-21 weeks** |

**Total Estimated Duration:** 14-21 weeks (3.5-5.25 months)

**Critical Path:** Epic 3.0 (MOV Builder) → Epic 6.0 (Validation) → Production

**Ready for Phase 3 (Atomic Tasks):** Awaiting user "Go" to expand each story into atomic tasks (2-8 hours each)
