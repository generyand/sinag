# Epic 5.0: BBI System Implementation

> **PRD Reference:** FR-6.2.1, FR-6.2.2
> **User Stories:** US-6.2.1, US-6.2.2, US-6.2.3, US-6.2.4
> **Duration:** 2-3 weeks
> **Status:** 🆕 New Implementation - BBI system with 9 mandatory institutions

**[← Back to Overview](./README.md)**

---

## Epic Overview

**Description:** Implement the Barangay-Based Institutions (BBI) management system with 9 mandatory institutions and one-to-one indicator mapping. The system automatically determines BBI functionality status based on indicator validation results, supporting the SGLGB assessment's BBI compliance reporting requirements.

**9 Mandatory BBIs (from Indicator Builder Specification v1.4):**
1. Lupon Tagapamayapa (Area 1)
2. Barangay Anti-Drug Abuse Council - BADAC (Area 1)
3. Barangay Council for the Protection of Children - BCPC (Area 1)
4. Barangay Disaster Risk Reduction and Management Committee - BDRRMC (Area 2)
5. Barangay Health Emergency Response Team - BHERT (Area 2)
6. Barangay Peace and Order Committee - BPOC (Area 3)
7. Barangay Justice Information System - BJIS (Area 3)
8. Barangay Anti-Corruption Action Team - BACAT (Area 4)
9. Barangay Transparency Board - BTB (Area 4)

**BBI Functionality Determination:**
- **Indicator → BBI Status** (one-way relationship, no cross-references)
- Each BBI is "Functional" or "Non-Functional" based on mapped indicator's validation status
- Status mapping: Passed → Functional, Considered → Functional (with note), Failed/Pending → Non-Functional

**Success Criteria:**
- All 9 BBIs pre-configured in system with governance area mappings
- MLGOO-DILG can map indicators to BBIs (one-to-one relationship)
- System automatically calculates BBI functionality status from indicator results
- Barangay-level BBI status tracking (per barangay, per assessment cycle)
- BBI management UI accessible only to MLGOO_DILG role

---

- [ ] **5.0 Epic: BBI System Implementation** _(FR-6.2.1, FR-6.2.2)_

  - [ ] **5.1 Story: Backend BBI Database Models**

    - **Scope:** Create SQLAlchemy models for BBI definitions and barangay-level BBI status tracking
    - **Duration:** 1-2 days
    - **Dependencies:** None
    - **Files:**
      - `apps/api/app/db/models/bbi.py`
      - `apps/api/app/db/models/bbi_barangay_status.py`
      - `apps/api/alembic/versions/xxxx_create_bbi_tables.py`
    - **Tech:** SQLAlchemy, Alembic, PostgreSQL
    - **Success Criteria:**

      - **BBI Model** (`apps/api/app/db/models/bbi.py`):
        - Fields:
          - `id` (Integer, PK)
          - `code` (String, unique, e.g., "lupon", "badac", "bcpc")
          - `name` (String, e.g., "Lupon Tagapamayapa")
          - `full_name` (String, e.g., "Lupon Tagapamayapa")
          - `governance_area_id` (Integer, FK to governance_areas)
          - `description` (Text, optional)
          - `mapped_indicator_id` (Integer, FK to indicators, nullable, unique) - One-to-one mapping
          - `is_active` (Boolean, default True)
          - `created_at`, `updated_at` (DateTime)
        - Relationships:
          - `governance_area` - Many-to-one with GovernanceArea
          - `mapped_indicator` - One-to-one with Indicator (nullable)
      - **BBIBarangayStatus Model** (`apps/api/app/db/models/bbi_barangay_status.py`):
        - Fields:
          - `id` (Integer, PK)
          - `bbi_id` (Integer, FK to bbis)
          - `barangay_id` (Integer, FK to barangays)
          - `assessment_cycle_id` (Integer, FK to assessment_cycles)
          - `functionality_status` (Enum: 'Functional', 'Non-Functional', 'Pending', 'Not Applicable')
          - `validation_status` (Enum: 'Passed', 'Considered', 'Failed', 'Pending') - From indicator
          - `notes` (Text, nullable) - E.g., "Considered due to grace period"
          - `last_updated` (DateTime)
        - Unique constraint: (`bbi_id`, `barangay_id`, `assessment_cycle_id`)
        - Relationships:
          - `bbi` - Many-to-one with BBI
          - `barangay` - Many-to-one with Barangay
          - `assessment_cycle` - Many-to-one with AssessmentCycle
      - Create migration: `alembic revision --autogenerate -m "create bbi tables"`
      - Run migration: `alembic upgrade head`

  - [ ] **5.2 Story: Backend BBI Pydantic Schemas**

    - **Scope:** Create Pydantic schemas for BBI operations
    - **Duration:** 1 day
    - **Dependencies:** 5.1 (models exist)
    - **Files:** `apps/api/app/schemas/bbi.py`
    - **Tech:** Pydantic, Python typing
    - **Success Criteria:**

      - Schema `BBIBase` with fields: `code`, `name`, `full_name`, `governance_area_id`, `description`
      - Schema `BBICreate` extends BBIBase
      - Schema `BBIUpdate` with all optional fields + `mapped_indicator_id`
      - Schema `BBIResponse` extends BBIBase with: `id`, `mapped_indicator_id`, `governance_area_name`, `mapped_indicator_code`, `is_active`, timestamps
      - Schema `BBIMappingUpdate` with fields: `bbi_id`, `indicator_id` (for mapping updates)
      - Schema `BBIBarangayStatusResponse` with fields: `bbi_id`, `bbi_name`, `barangay_id`, `barangay_name`, `functionality_status`, `validation_status`, `notes`, `last_updated`
      - All schemas use proper types and include `Config` with `from_attributes = True`

  - [ ] **5.3 Story: Backend BBI Service Layer**

    - **Scope:** Implement business logic for BBI management and status determination
    - **Duration:** 2-3 days
    - **Dependencies:** 5.2 (schemas defined)
    - **Files:** `apps/api/app/services/bbi_service.py`
    - **Tech:** SQLAlchemy, Pydantic, Python
    - **Success Criteria:**

      - Service class `BBIService` with methods:
        - `get_all_bbis(db)` - List all 9 BBIs with mapping status
        - `get_bbi(db, bbi_id)` - Get single BBI details
        - `update_bbi(db, bbi_id, data)` - Update BBI (description, active status)
        - `map_indicator_to_bbi(db, bbi_id, indicator_id)` - Create one-to-one mapping
        - `unmap_indicator_from_bbi(db, bbi_id)` - Remove mapping
        - `get_barangay_bbi_statuses(db, barangay_id, cycle_id)` - Get all 9 BBI statuses for a barangay
        - `update_bbi_status_from_indicator(db, indicator_id, barangay_id, cycle_id)` - Update BBI status when indicator validated
        - `initialize_mandatory_bbis(db)` - Seed 9 BBIs if not exist (run on startup)
      - **Status Determination Logic** in `update_bbi_status_from_indicator()`:
        - Get BBI mapped to this indicator
        - Get indicator's validation status for barangay
        - Map validation status to functionality status:
          - `Passed` → `Functional`
          - `Considered` → `Functional` (with note: "Considered due to [reason]")
          - `Failed` → `Non-Functional`
          - `Pending` → `Pending`
          - `Not Applicable` → `Not Applicable`
        - Update or create BBIBarangayStatus record
      - **One-to-One Mapping Validation**:
        - `map_indicator_to_bbi()` checks if indicator already mapped to another BBI (raise error if so)
        - Unmapping sets `mapped_indicator_id` to NULL
      - Service exports singleton: `bbi_service = BBIService()`

  - [ ] **5.4 Story: BBI Initialization on Startup**

    - **Scope:** Create database seeder to initialize 9 mandatory BBIs on first run
    - **Duration:** 1 day
    - **Dependencies:** 5.3 (service layer ready)
    - **Files:** `apps/api/app/services/startup_service.py` (extend or create)
    - **Tech:** SQLAlchemy, Python
    - **Success Criteria:**

      - Startup service calls `bbi_service.initialize_mandatory_bbis(db)` on app startup
      - Seeder checks if BBIs exist (by code), skips if already present
      - **9 BBIs Created** with data:
        1. `code: "lupon"`, `name: "Lupon Tagapamayapa"`, `governance_area_id: 1`
        2. `code: "badac"`, `name: "BADAC"`, `full_name: "Barangay Anti-Drug Abuse Council"`, `governance_area_id: 1`
        3. `code: "bcpc"`, `name: "BCPC"`, `full_name: "Barangay Council for the Protection of Children"`, `governance_area_id: 1`
        4. `code: "bdrrmc"`, `name: "BDRRMC"`, `full_name: "Barangay Disaster Risk Reduction and Management Committee"`, `governance_area_id: 2`
        5. `code: "bhert"`, `name: "BHERT"`, `full_name: "Barangay Health Emergency Response Team"`, `governance_area_id: 2`
        6. `code: "bpoc"`, `name: "BPOC"`, `full_name: "Barangay Peace and Order Committee"`, `governance_area_id: 3`
        7. `code: "bjis"`, `name: "BJIS"`, `full_name: "Barangay Justice Information System"`, `governance_area_id: 3`
        8. `code: "bacat"`, `name: "BACAT"`, `full_name: "Barangay Anti-Corruption Action Team"`, `governance_area_id: 4`
        9. `code: "btb"`, `name: "BTB"`, `full_name: "Barangay Transparency Board"`, `governance_area_id: 4`
      - Seeder logs: "Initialized 9 mandatory BBIs" or "BBIs already exist, skipping initialization"
      - Startup hook registered in `apps/api/main.py` (`@app.on_event("startup")`)

  - [ ] **5.5 Story: Backend API Endpoints for BBIs**

    - **Scope:** Create FastAPI endpoints for BBI management with tag `bbis`
    - **Duration:** 1-2 days
    - **Dependencies:** 5.4 (BBIs seeded)
    - **Files:**
      - `apps/api/app/api/v1/bbis.py`
      - `apps/api/app/api/v1/__init__.py` (register router)
    - **Tech:** FastAPI, Pydantic, dependency injection
    - **Success Criteria:**

      - Endpoints created with tag `bbis`:
        - `GET /api/v1/bbis` - List all 9 BBIs with mapping status
        - `GET /api/v1/bbis/{bbi_id}` - Get single BBI details
        - `PUT /api/v1/bbis/{bbi_id}` - Update BBI (description, active status)
        - `POST /api/v1/bbis/{bbi_id}/map-indicator` - Map indicator to BBI (body: `indicator_id`)
        - `DELETE /api/v1/bbis/{bbi_id}/map-indicator` - Unmap indicator from BBI
        - `GET /api/v1/bbis/barangay/{barangay_id}/status?cycle_id={id}` - Get all BBI statuses for barangay
      - All endpoints require MLGOO_DILG role
      - Mapping endpoints:
        - `POST` returns 409 Conflict if indicator already mapped to another BBI
        - `DELETE` returns 404 if no mapping exists
      - Status endpoint returns all 9 BBIs with functionality status for the barangay
      - OpenAPI docs include examples
      - Router registered in `apps/api/app/api/v1/__init__.py`

  - [ ] **5.6 Story: Type Generation for BBI Endpoints**

    - **Scope:** Generate TypeScript types and React Query hooks for BBI endpoints
    - **Duration:** 1 hour
    - **Dependencies:** 5.5 (endpoints exist)
    - **Files:**
      - `packages/shared/src/generated/endpoints/bbis/`
      - `packages/shared/src/generated/schemas/bbis/`
    - **Tech:** Orval, OpenAPI, TypeScript
    - **Success Criteria:**

      - Run `pnpm generate-types` successfully
      - React Query hooks generated: `useGetBbis`, `useGetBbi`, `useUpdateBbi`, `useMapIndicatorToBbi`, `useUnmapIndicatorFromBbi`, `useGetBarangayBbiStatus`
      - TypeScript types for `BBI`, `BBIResponse`, `BBIMappingUpdate`, `BBIBarangayStatusResponse`
      - No TypeScript errors
      - Verify hooks have correct signatures

  - [ ] **5.7 Story: Frontend BBI Management Page**

    - **Scope:** Create MLGOO-DILG page for viewing and managing BBIs
    - **Duration:** 2 days
    - **Dependencies:** 5.6 (types generated)
    - **Files:** `apps/web/src/app/(app)/mlgoo/bbis/page.tsx`
    - **Tech:** Next.js, React, shadcn/ui (Table, Button, Badge), TanStack Query
    - **Success Criteria:**

      - Page accessible at `/mlgoo/bbis` (MLGOO_DILG only)
      - Page title: "BBI Management"
      - Table displays all 9 BBIs with columns:
        - BBI Name (full name)
        - Code
        - Governance Area
        - Mapped Indicator (code + title, or "Not Mapped")
        - Status (Active/Inactive badge)
        - Actions (Edit, Map Indicator buttons)
      - Uses `useGetBbis` hook from generated client
      - Loading state: Skeleton table rows
      - Error state: Alert with error message
      - Empty state: Should never occur (9 BBIs always present)

  - [ ] **5.8 Story: Frontend Indicator Mapping Selector Component**

    - **Scope:** Create UI component for mapping indicators to BBIs (one-to-one)
    - **Duration:** 2-3 days
    - **Dependencies:** 5.7 (BBI page ready)
    - **Files:**
      - `apps/web/src/components/features/bbis/IndicatorMappingSelector.tsx`
      - `apps/web/src/components/features/bbis/BBIForm.tsx`
    - **Tech:** React, shadcn/ui (Dialog, Select, Form, Button), TanStack Query
    - **Success Criteria:**

      - `IndicatorMappingSelector` component:
        - Opens as Dialog when "Map Indicator" button clicked
        - Displays BBI name and governance area
        - Dropdown selector:
          - Lists all indicators for the BBI's governance area
          - Groups indicators by parent (e.g., "1.1 - Social Protection", children indented)
          - Shows indicator code + title
          - Disables indicators already mapped to other BBIs (with tooltip: "Already mapped to [BBI]")
        - "Save Mapping" button: calls `useMapIndicatorToBbi` mutation
        - "Remove Mapping" button: calls `useUnmapIndicatorFromBbi` mutation (only shown if currently mapped)
        - Success toast: "Indicator mapped successfully"
        - Error toast: "Failed to map indicator: [error message]"
      - `BBIForm` component (optional, for editing BBI details):
        - Form fields: Description (textarea), Active status (switch)
        - Save button: calls `useUpdateBbi` mutation
        - Used in Edit dialog

  - [ ] **5.9 Story: BBI Status Integration with Assessment Results**

    - **Scope:** Automatically update BBI statuses when indicator validation completes
    - **Duration:** 1-2 days
    - **Dependencies:** 5.8 (mapping UI ready), Epic 3.0 (MOV validation service exists)
    - **Files:**
      - `apps/api/app/services/assessor_service.py` (extend, or relevant validation service)
      - `apps/api/app/api/v1/assessor.py` (extend validation endpoint)
    - **Tech:** SQLAlchemy, FastAPI, service layer integration
    - **Success Criteria:**

      - After validator completes indicator validation (marks as Passed/Considered/Failed):
        - Call `bbi_service.update_bbi_status_from_indicator(db, indicator_id, barangay_id, cycle_id)`
        - BBI status updated in BBIBarangayStatus table
      - Integration points:
        - Assessor validation endpoint (when validator submits checklist results)
        - Automatic calculation endpoint (if indicator has auto-calculate enabled)
      - BBI status updated atomically within same transaction as indicator validation
      - If BBI has no mapped indicator, status remains "Not Applicable"
      - Logging: "BBI [code] status updated to [status] for barangay [id]"

  - [ ] **5.10 Story: Testing & Validation for BBI System**

    - **Scope:** Comprehensive testing for BBI backend, frontend, and status determination logic
    - **Duration:** 2-3 days
    - **Dependencies:** 5.9 (all BBI features complete)
    - **Files:**
      - `apps/api/tests/api/v1/test_bbis.py`
      - `apps/api/tests/services/test_bbi_service.py`
      - `apps/web/src/app/(app)/mlgoo/bbis/__tests__/page.test.tsx`
      - `apps/web/src/components/features/bbis/__tests__/IndicatorMappingSelector.test.tsx`
    - **Tech:** Pytest, Vitest, React Testing Library
    - **Success Criteria:**

      - **Backend Tests:**
        - Test BBI seeding: All 9 BBIs created on startup
        - Test BBI CRUD operations
        - Test one-to-one mapping validation:
          - Cannot map indicator already mapped to another BBI
          - Unmapping sets indicator to NULL
        - Test status determination logic:
          - Passed → Functional
          - Considered → Functional (with note)
          - Failed → Non-Functional
          - Pending → Pending
        - Test barangay BBI status retrieval (returns all 9 BBIs)
        - Test RBAC: non-MLGOO_DILG cannot access BBI endpoints
        - Run with: `cd apps/api && pytest tests/ -vv -k bbi`
      - **Frontend Tests:**
        - Test BBI page renders table with 9 BBIs
        - Test IndicatorMappingSelector:
          - Dropdown lists indicators for BBI's governance area
          - Disables already-mapped indicators
          - Save mapping calls mutation
          - Remove mapping calls mutation
        - Test error handling (mapping conflict, network error)
        - Mock TanStack Query hooks
        - Run with: `pnpm test` from root
      - **All tests passing:** Minimum 25 backend tests + 15 frontend tests

---

**Epic Status:** 🆕 New Implementation - Complete BBI system with 9 mandatory institutions and indicator mapping

**Next Epic:** [Epic 6.0: Validation, Bulk Publishing & Testing](./epic-6.0-validation-testing.md)
