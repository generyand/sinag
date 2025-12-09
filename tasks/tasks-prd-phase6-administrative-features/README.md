# Phase 6: Administrative Features - Implementation Tasks

**PRD Reference:** `/docs/prds/prd-phase6-administrative-features.md` **Status:** Phase 3 - Atomic
Task Definition (COMPLETE) **Last Updated:** November 6, 2025

---

## Overview

This task list implements the comprehensive MLGOO-DILG administrative interface that enables
independent management of SINAG system configuration, including indicators, BBI mappings, and
deadline control. The implementation follows a three-tier Epic → Story → Atomic task structure.

---

## PRD Traceability Matrix

Map each functional requirement section to specific epics:

- **FR-4.1** Indicator Management Interface → Epic 1.0, Epic 2.0, Epic 3.0
  - **FR-4.1.1** Indicator CRUD Operations → Epic 1.0
  - **FR-4.1.2** Form Schema Builder (Visual) → Epic 2.0
  - **FR-4.1.3** Calculation Schema Builder (Visual Rule Builder) → Epic 3.0
  - **FR-4.1.4** Remark Schema Builder → Epic 3.0

- **FR-4.2** BBI Configuration Interface → Epic 4.0
  - **FR-4.2.1** BBI Definition Management → Epic 4.0
  - **FR-4.2.2** Indicator-to-BBI Mapping → Epic 4.0

- **FR-4.3** Assessment Cycle & Deadline Management → Epic 5.0
  - **FR-4.3.1** Assessment Cycle Creation → Epic 5.0
  - **FR-4.3.2** Deadline Monitoring Dashboard → Epic 5.0
  - **FR-4.3.3** Granular Deadline Override Controls → Epic 5.0
  - **FR-4.3.4** Audit Trail for Deadline Overrides → Epic 5.0

- **FR-4.4** Audit & Versioning → Epic 6.0
  - **FR-4.4.1** Indicator Edit Audit Trail → Epic 6.0
  - **FR-4.4.2** Indicator Versioning → Epic 6.0
  - **FR-4.4.3** BBI Configuration Audit Trail → Epic 6.0

- **FR-4.5** Access Control → Epic 6.0
- **FR-4.6** Data Validation & Error Handling → Epic 6.0

---

## Relevant Files

This implementation will touch the following areas of the codebase:

### Backend (`apps/api`)

**Database Models:**

- `apps/api/app/db/models/assessment.py` - Update indicators model, add versioning
- `apps/api/app/db/models/bbi.py` - New BBI models
- `apps/api/app/db/models/admin.py` - New admin-specific models (cycles, overrides, audit)
- `apps/api/app/db/enums.py` - Add new enums for rule types, BBI status

**Pydantic Schemas:**

- `apps/api/app/schemas/admin.py` - Admin-specific request/response schemas
- `apps/api/app/schemas/indicator.py` - New indicator management schemas
- `apps/api/app/schemas/bbi.py` - BBI configuration schemas

**Services:**

- `apps/api/app/services/admin_service.py` - Core administrative business logic
- `apps/api/app/services/indicator_service.py` - Enhanced indicator management
- `apps/api/app/services/bbi_service.py` - BBI configuration service
- `apps/api/app/services/deadline_service.py` - Deadline management service
- `apps/api/app/services/audit_service.py` - Audit trail service

**API Routers:**

- `apps/api/app/api/v1/admin.py` - New admin endpoints router
- `apps/api/app/api/v1/indicators.py` - Indicator management endpoints
- `apps/api/app/api/v1/bbis.py` - BBI configuration endpoints

**Migrations:**

- `apps/api/alembic/versions/xxxx_add_indicator_versioning.py`
- `apps/api/alembic/versions/xxxx_create_bbi_tables.py`
- `apps/api/alembic/versions/xxxx_create_admin_tables.py`

**Workers:**

- `apps/api/app/workers/admin_notifications.py` - Background tasks for admin notifications

### Frontend (`apps/web`)

**Pages:**

- `apps/web/src/app/(app)/admin/indicators/page.tsx` - Indicator management list
- `apps/web/src/app/(app)/admin/indicators/new/page.tsx` - Create indicator
- `apps/web/src/app/(app)/admin/indicators/[id]/edit/page.tsx` - Edit indicator
- `apps/web/src/app/(app)/admin/bbis/page.tsx` - BBI configuration
- `apps/web/src/app/(app)/admin/cycles/page.tsx` - Assessment cycle management
- `apps/web/src/app/(app)/admin/deadlines/page.tsx` - Deadline monitoring dashboard
- `apps/web/src/app/(app)/admin/audit/page.tsx` - Audit log viewer

**Components:**

- `apps/web/src/components/features/admin/indicators/` - Indicator management components
  - `IndicatorList.tsx` - Searchable, filterable list
  - `IndicatorForm.tsx` - Core indicator form
  - `FormSchemaBuilder.tsx` - Visual form builder
  - `CalculationRuleBuilder.tsx` - Visual rule builder
  - `RemarkSchemaBuilder.tsx` - Remark template builder
  - `FormPreview.tsx` - Live preview of form
  - `JsonViewer.tsx` - JSON preview toggle
- `apps/web/src/components/features/admin/bbis/` - BBI configuration components
  - `BBIList.tsx` - List of BBIs
  - `BBIForm.tsx` - BBI definition form
  - `BBIMappingBuilder.tsx` - Indicator-to-BBI mapping interface
- `apps/web/src/components/features/admin/deadlines/` - Deadline management components
  - `DeadlineStatusDashboard.tsx` - Visual deadline status grid
  - `DeadlineOverrideModal.tsx` - Multi-step override modal
  - `DeadlineAuditLog.tsx` - Override audit trail

**Hooks:**

- `apps/web/src/hooks/useIndicators.ts` - Indicator CRUD operations
- `apps/web/src/hooks/useBBIs.ts` - BBI configuration operations
- `apps/web/src/hooks/useDeadlines.ts` - Deadline management operations
- `apps/web/src/hooks/useAudit.ts` - Audit log fetching

**Shared Types:**

- `packages/shared/src/generated/schemas/admin/` - Auto-generated from Orval
- `packages/shared/src/generated/endpoints/admin/` - Auto-generated API hooks

### Testing

**Backend Tests:**

- `apps/api/tests/api/v1/test_admin.py` - Admin endpoint tests
- `apps/api/tests/services/test_indicator_service.py` - Indicator service tests
- `apps/api/tests/services/test_bbi_service.py` - BBI service tests
- `apps/api/tests/services/test_deadline_service.py` - Deadline service tests

**Frontend Tests:**

- `apps/web/src/components/features/admin/indicators/FormSchemaBuilder.test.tsx`
- `apps/web/src/components/features/admin/indicators/CalculationRuleBuilder.test.tsx`
- `apps/web/src/components/features/admin/deadlines/DeadlineOverrideModal.test.tsx`

---

## Testing Notes

### Backend Testing

- Place Pytest tests in `apps/api/tests/`
- Test services and API endpoints separately
- Mock database interactions for unit tests
- Use test fixtures for common setup (test users, indicators, etc.)
- Run with `pytest -vv --log-cli-level=DEBUG`

### Frontend Testing

- Place test files alongside components (`.test.tsx`)
- Use Vitest and React Testing Library
- Mock API calls using MSW (Mock Service Worker)
- Test user interactions and form validation
- Run with `pnpm test`

### Type Safety

- Always import auto-generated types from `@sinag/shared`
- Run `pnpm generate-types` after backend schema changes
- Verify type consistency between frontend and backend

### Integration Testing

- Test complete workflows (e.g., create indicator → preview form → save → verify in DB)
- Test versioning behavior (edit indicator → verify new version created → verify old assessments use
  old version)
- Test deadline override flow (select barangay → select indicators → extend deadline → verify
  notification sent)

---

## Tasks

### Phase 1: Epic-Level Tasks

---

## Epic 1.0: Indicator Management - Core CRUD & Versioning System

**PRD Reference:** FR-4.1.1, FR-4.4.2 **Duration:** 5-7 days **Dependencies:** None

**Description:** Implement the foundational indicator management system with full CRUD operations,
indicator versioning to protect historical data integrity, and the database schema to support
metadata-driven form_schema and calculation_schema. This epic establishes the core data model and
API layer for all indicator operations.

**Key Deliverables:**

- Database schema with versioning support (indicators, indicators_history tables)
- Core indicator CRUD API endpoints (Create, Read, Update, Deactivate)
- Indicator versioning logic ensuring changes don't affect existing assessments
- Basic indicator list and detail views in frontend
- Service layer for indicator operations with versioning
- Comprehensive test coverage for versioning behavior

**Success Criteria:**

- ✅ MLGOO-DILG can create, edit, view, and deactivate indicators via API
- ✅ Editing an indicator creates a new version, old assessments reference original version
- ✅ Indicator history is fully auditable with version tracking
- ✅ All indicator CRUD operations are protected by MLGOO_DILG role check
- ✅ Tests verify versioning isolation (edit doesn't affect existing assessments)

---

## Epic 2.0: Indicator Management - Form Schema Builder (Visual)

**PRD Reference:** FR-4.1.2 **Duration:** 7-10 days **Dependencies:** Epic 1.0 (Core CRUD system
must exist)

**Description:** Build a visual, drag-and-drop form builder interface that allows MLGOO-DILG to
define the form_schema (input fields, validation rules, MOV requirements) for indicators without
writing JSON. Implements a hybrid approach with visual building and JSON preview for power users.

**Key Deliverables:**

- Visual form builder component with drag-and-drop field placement
- Support for 7 input types (Checkbox Group, Radio Button, Number Input, Text Input, Text Area, Date
  Picker, File Upload)
- Field configuration panel (labels, validation rules, conditional MOV requirements)
- Live preview of how the form will appear to BLGU users
- JSON viewer toggle for debugging and verification
- Form schema validation before saving
- Integration with indicator CRUD API

**Success Criteria:**

- ✅ MLGOO-DILG can build a complete indicator form using only visual tools (no JSON editing
  required)
- ✅ All 7 input types are available and configurable
- ✅ Live preview accurately shows BLGU user experience
- ✅ "View JSON" toggle displays valid form_schema structure
- ✅ Invalid schemas are caught before saving with clear error messages
- ✅ Form schema is correctly saved to indicator and can be rendered dynamically

---

## Epic 3.0: Indicator Management - Calculation Schema Builder & Remark Builder

**PRD Reference:** FR-4.1.3, FR-4.1.4 **Duration:** 8-12 days **Dependencies:** Epic 1.0, Epic 2.0
(requires form_schema fields to reference)

**Description:** Implement a visual rule builder for defining calculation_schema (automatic
Pass/Fail logic) and remark_schema (human-readable status summaries) for indicators. Includes
support for 6 rule types and nested condition groups, plus integration with the backend rule engine.

**Key Deliverables:**

- Visual calculation rule builder with flowchart/decision-tree interface
- Support for 6 rule types (AND_ALL, OR_ANY, PERCENTAGE_THRESHOLD, COUNT_THRESHOLD, MATCH_VALUE,
  BBI_FUNCTIONALITY_CHECK)
- Nested condition group support (e.g., "(A AND B) OR C")
- Field selector dropdown populated from form_schema
- "Test Calculation" feature with sample data input
- Remark schema builder with conditional text templates
- Backend rule engine extension to execute all rule types
- Integration with `is_auto_calculable` flag

**Success Criteria:**

- ✅ MLGOO-DILG can define complex calculation rules visually (e.g., "50% physical OR 50%
  financial")
- ✅ Nested condition groups work correctly (proper AND/OR precedence)
- ✅ "Test Calculation" accurately predicts Pass/Fail based on sample input
- ✅ Remark schema generates human-readable status strings
- ✅ Backend rule engine correctly evaluates all 6 rule types
- ✅ `is_auto_calculable` flag correctly controls automatic evaluation

---

## Epic 4.0: BBI Configuration System

**PRD Reference:** FR-4.2.1, FR-4.2.2 **Duration:** 5-7 days **Dependencies:** Epic 1.0, Epic 3.0
(requires indicator calculation logic)

**Description:** Implement the BBI (Barangay-based Institutions) configuration system allowing
MLGOO-DILG to define BBIs and map indicators to determine BBI "Functional" or "Non-Functional"
status. BBI status is automatically calculated based on indicator compliance results.

**Key Deliverables:**

- Database schema for BBIs and indicator-to-BBI mappings
- BBI definition CRUD interface (Create, Read, Update, Deactivate)
- BBI rule builder for mapping indicators to functionality determination
- "Test BBI Calculation" feature with sample indicator statuses
- Backend service to auto-calculate BBI status from assessment results
- Frontend list and configuration views for BBIs
- Integration with indicator calculation results

**Success Criteria:**

- ✅ MLGOO-DILG can create and configure BBIs (e.g., "Lupon", "BADAC")
- ✅ MLGOO-DILG can define rules like "If Indicator 1.1 = Pass AND 1.2 = Pass, then Lupon =
  Functional"
- ✅ BBI status is automatically calculated when assessment is finalized
- ✅ "Test BBI Calculation" correctly predicts Functional/Non-Functional status
- ✅ BBI configuration changes are versioned (only apply to future assessments)
- ✅ BBI status appears in reports and dashboards

---

## Epic 5.0: Assessment Cycle & Deadline Management System

**PRD Reference:** FR-4.3.1, FR-4.3.2, FR-4.3.3, FR-4.3.4 **Duration:** 6-8 days **Dependencies:**
Epic 1.0 (indicators must exist), Epic 6.0 (audit logging)

**Description:** Implement assessment cycle creation with phase-specific deadlines and granular
deadline override controls allowing MLGOO-DILG to extend deadlines for specific indicators and
barangays. Includes a visual deadline monitoring dashboard and comprehensive audit trail.

**Key Deliverables:**

- Database schema for assessment cycles and deadline overrides
- Assessment cycle creation interface with 4 phase-specific deadlines
- Deadline Status Dashboard with visual grid (submitted, late, pending)
- Multi-step Deadline Override Modal (select barangay → indicators → new deadline → reason)
- Email notifications for deadline extensions
- Deadline override audit log with full traceability
- CSV export for audit log

**Success Criteria:**

- ✅ MLGOO-DILG can create assessment cycles with distinct Phase 1, Rework, Phase 2, Calibration
  deadlines
- ✅ Deadline Status Dashboard accurately shows submission status for all barangays
- ✅ MLGOO-DILG can extend deadlines for specific indicators for specific barangays
- ✅ Confirmation dialog clearly shows what will change before applying override
- ✅ Affected BLGU users receive email notification of deadline extension
- ✅ All deadline overrides are logged with timestamp, user, barangay, indicator, reason
- ✅ Audit log is filterable and exportable to CSV

---

## Epic 6.0: Audit & Security Infrastructure

**PRD Reference:** FR-4.4.1, FR-4.4.3, FR-4.5, FR-4.6 **Duration:** 4-6 days **Dependencies:** None
(supports all other epics)

**Description:** Implement comprehensive audit logging for all administrative actions, access
control enforcement for MLGOO_DILG role, and robust data validation and error handling across all
administrative features. This is a cross-cutting epic that supports all other epics.

**Key Deliverables:**

- Audit trail service that logs all indicator edits, BBI changes, deadline overrides
- Audit log models with fields: timestamp, user, entity_type, entity_id, action, changes (JSON)
- MLGOO_DILG role-based access control middleware
- Comprehensive data validation for all schemas (form_schema, calculation_schema, remark_schema, BBI
  rules)
- User-friendly error messages with actionable guidance
- Security measures: input sanitization, rate limiting, XSS prevention
- Audit log viewer UI with filtering by date, user, entity type, action

**Success Criteria:**

- ✅ All administrative actions are logged with complete information (who, what, when)
- ✅ Non-MLGOO_DILG users receive 403 Forbidden on all admin endpoints
- ✅ Invalid JSON schemas are caught with specific error messages before saving
- ✅ Circular dependencies in indicators are prevented
- ✅ All user inputs are sanitized to prevent XSS
- ✅ Audit log UI allows filtering and shows complete change history
- ✅ Rate limiting prevents abuse of admin endpoints

---

### Phase 2: Story-Level Tasks

Breaking down each epic into tech-stack specific implementation areas (Database, Backend, Frontend,
Testing).

---

#### **Epic 1.0: Indicator Management - Core CRUD & Versioning System**

- [ ] **1.1 Story: Database Schema & Migrations for Indicator Versioning**
  - **Duration:** 1 day
  - **Dependencies:** None
  - **Tech Stack:** SQLAlchemy, Alembic, PostgreSQL
  - **Description:** Create database models and migrations for indicators table with versioning
    support. Add indicators_history table to track all versions. Update existing indicators to use
    version field.
  - **Deliverables:**
    - Enhanced `indicators` table with `version`, `is_auto_calculable`, `form_schema`,
      `calculation_schema`, `remark_schema` (all JSONB)
    - New `indicators_history` table for version tracking
    - Migration to add new columns to existing indicators
    - Enum updates for rule types and indicator statuses

- [ ] **1.2 Story: Backend Indicator Service Layer with Versioning Logic**
  - **Duration:** 2 days
  - **Dependencies:** 1.1 (Database schema must exist)
  - **Tech Stack:** FastAPI, SQLAlchemy, Pydantic
  - **Description:** Implement `indicator_service.py` with all CRUD operations and versioning logic.
    When an indicator is edited, create a new version and preserve old version in history table.
  - **Deliverables:**
    - `create_indicator()` - Create new indicator with version 1
    - `get_indicator(id)` - Retrieve indicator by ID
    - `list_indicators()` - List with filtering (active, governance area)
    - `update_indicator(id)` - Create new version, preserve old in history
    - `deactivate_indicator(id)` - Soft delete by setting is_active=False
    - `get_indicator_history(id)` - Retrieve version history
    - Versioning helper functions

- [ ] **1.3 Story: Backend Indicator API Endpoints**
  - **Duration:** 1 day
  - **Dependencies:** 1.2 (Service layer must exist)
  - **Tech Stack:** FastAPI, Pydantic schemas
  - **Description:** Create RESTful API endpoints for indicator CRUD operations with MLGOO_DILG role
    protection.
  - **Deliverables:**
    - `POST /api/v1/indicators` - Create indicator
    - `GET /api/v1/indicators` - List indicators with filtering
    - `GET /api/v1/indicators/{id}` - Get indicator details
    - `PUT /api/v1/indicators/{id}` - Update indicator (creates new version)
    - `DELETE /api/v1/indicators/{id}` - Deactivate indicator
    - `GET /api/v1/indicators/{id}/history` - Get version history
    - Role-based access control middleware
    - Pydantic schemas for requests/responses

- [ ] **1.4 Story: Frontend Indicator List & Detail Views**
  - **Duration:** 2 days
  - **Dependencies:** 1.3 (API endpoints must exist), `pnpm generate-types`
  - **Tech Stack:** Next.js, React, TanStack Query, shadcn/ui
  - **Description:** Create indicator management pages with list view (searchable, filterable) and
    detail view showing indicator configuration.
  - **Deliverables:**
    - `/admin/indicators/page.tsx` - Indicator list page
    - `IndicatorList.tsx` component with search, filter, pagination
    - `IndicatorCard.tsx` or table row component
    - `/admin/indicators/[id]/page.tsx` - Indicator detail page
    - Version history display component
    - Custom hook `useIndicators.ts` wrapping TanStack Query

- [ ] **1.5 Story: Backend & Frontend Testing for Core CRUD**
  - **Duration:** 1 day
  - **Dependencies:** 1.2, 1.3, 1.4
  - **Tech Stack:** Pytest, Vitest, React Testing Library
  - **Description:** Comprehensive test coverage for indicator CRUD and versioning behavior.
  - **Deliverables:**
    - `test_indicator_service.py` - Service layer unit tests
    - `test_indicators_api.py` - API endpoint tests
    - Versioning tests (edit creates new version, old assessments unaffected)
    - `IndicatorList.test.tsx` - Frontend component tests
    - Integration test for full CRUD workflow

---

#### **Epic 2.0: Indicator Management - Form Schema Builder (Visual)**

- [ ] **2.1 Story: Form Schema Data Models & Validation**
  - **Duration:** 1 day
  - **Dependencies:** Epic 1.0 complete
  - **Tech Stack:** Pydantic, JSON Schema
  - **Description:** Create Pydantic models defining the structure of form_schema JSON. Implement
    validation logic to ensure form_schema is valid before saving.
  - **Deliverables:**
    - Pydantic models for each input type (CheckboxGroupField, NumberInputField, etc.)
    - FormSchema root model with list of fields
    - Validation rules (field IDs unique, required fields present)
    - JSON schema generation for TypeScript type generation

- [ ] **2.2 Story: Backend Form Schema Validation Service**
  - **Duration:** 1 day
  - **Dependencies:** 2.1
  - **Tech Stack:** FastAPI, Pydantic
  - **Description:** Add validation endpoint to test form_schema before saving. Integrate validation
    into indicator update service.
  - **Deliverables:**
    - `POST /api/v1/indicators/validate-form-schema` endpoint
    - Integration with `update_indicator()` service method
    - Detailed error messages for invalid schemas
    - Prevention of circular references

- [ ] **2.3 Story: Frontend Form Builder Core Architecture**
  - **Duration:** 2 days
  - **Dependencies:** 2.1, 2.2, `pnpm generate-types`
  - **Tech Stack:** React, Zustand, TypeScript
  - **Description:** Build core form builder architecture with state management for form fields,
    drag-and-drop zones, and field configuration.
  - **Deliverables:**
    - `FormSchemaBuilder.tsx` main component
    - Zustand store for form builder state
    - Field palette (sidebar with draggable input types)
    - Drop zone (canvas area)
    - Drag-and-drop implementation (react-dnd or dnd-kit)

- [ ] **2.4 Story: Frontend Form Builder - Field Components (7 Input Types)**
  - **Duration:** 2 days
  - **Dependencies:** 2.3
  - **Tech Stack:** React, shadcn/ui, CVA
  - **Description:** Create configurable field components for all 7 input types with property
    panels.
  - **Deliverables:**
    - `CheckboxGroupField.tsx` - Multi-select with options
    - `RadioButtonField.tsx` - Single-select with options
    - `NumberInputField.tsx` - Number with min/max validation
    - `TextInputField.tsx` - Short text
    - `TextAreaField.tsx` - Long text
    - `DatePickerField.tsx` - Date selection
    - `FileUploadField.tsx` - File upload with conditional MOV
    - Field configuration panel (right sidebar)
    - Validation rule configuration UI

- [ ] **2.5 Story: Frontend Form Builder - Live Preview & JSON Viewer**
  - **Duration:** 1 day
  - **Dependencies:** 2.4
  - **Tech Stack:** React, JSON syntax highlighting library
  - **Description:** Implement live preview showing how form will appear to BLGU users and JSON
    viewer toggle for debugging.
  - **Deliverables:**
    - `FormPreview.tsx` component rendering form in BLGU view
    - `JsonViewer.tsx` with syntax highlighting and copy button
    - Toggle switch between Visual Builder / JSON Viewer / Preview
    - Real-time synchronization between builder and preview

- [ ] **2.6 Story: Frontend Form Builder - Integration & Persistence**
  - **Duration:** 1 day
  - **Dependencies:** 2.5
  - **Tech Stack:** React, TanStack Query
  - **Description:** Wire form builder to indicator create/update API. Handle save, validate, and
    error states.
  - **Deliverables:**
    - Integration with `POST /api/v1/indicators` and `PUT /api/v1/indicators/{id}`
    - Save button with loading states
    - Validation before save (client-side and server-side)
    - Error handling with user-friendly messages
    - Success toast notifications

- [ ] **2.7 Story: Testing for Form Schema Builder**
  - **Duration:** 1 day
  - **Dependencies:** 2.6
  - **Tech Stack:** Vitest, React Testing Library, MSW
  - **Description:** Test form builder UI interactions, validation, and persistence.
  - **Deliverables:**
    - `FormSchemaBuilder.test.tsx` - Component tests
    - Drag-and-drop interaction tests
    - Field configuration tests
    - Validation error handling tests
    - API integration tests with MSW mocks

---

#### **Epic 3.0: Indicator Management - Calculation Schema Builder & Remark Builder**

- [ ] **3.1 Story: Calculation Schema Data Models & Rule Engine Foundation**
  - **Duration:** 2 days
  - **Dependencies:** Epic 1.0 complete
  - **Tech Stack:** Pydantic, SQLAlchemy
  - **Description:** Create Pydantic models for calculation_schema defining all 6 rule types. Extend
    rule engine in `intelligence_service.py`.
  - **Deliverables:**
    - Pydantic models for rule types (AndAllRule, OrAnyRule, PercentageThresholdRule, etc.)
    - CalculationSchema root model
    - Rule engine extension in `intelligence_service.py`
    - `evaluate_rule()` function supporting all rule types
    - Support for nested condition groups

- [ ] **3.2 Story: Backend Calculation Schema Validation & Test Endpoint**
  - **Duration:** 1 day
  - **Dependencies:** 3.1
  - **Tech Stack:** FastAPI, Pydantic
  - **Description:** Add validation for calculation_schema and create "Test Calculation" endpoint.
  - **Deliverables:**
    - `POST /api/v1/indicators/validate-calculation-schema`
    - `POST /api/v1/indicators/test-calculation` - Accepts sample data, returns Pass/Fail
    - Validation preventing references to non-existent fields
    - Integration with `is_auto_calculable` flag logic

- [ ] **3.3 Story: Frontend Calculation Rule Builder Core Architecture**
  - **Duration:** 2 days
  - **Dependencies:** 3.2, Epic 2.0 (needs form_schema fields), `pnpm generate-types`
  - **Tech Stack:** React, Zustand, TypeScript
  - **Description:** Build visual rule builder with flowchart/decision-tree interface for defining
    calculation logic.
  - **Deliverables:**
    - `CalculationRuleBuilder.tsx` main component
    - Zustand store for rule builder state
    - Condition group components with nesting support
    - Rule type selector dropdown
    - Field selector (populated from form_schema)
    - Operator selector (>=, =, contains, etc.)
    - Value input fields

- [ ] **3.4 Story: Frontend Calculation Rule Builder - Rule Type Components**
  - **Duration:** 2 days
  - **Dependencies:** 3.3
  - **Tech Stack:** React, shadcn/ui
  - **Description:** Create UI components for each of the 6 rule types with appropriate
    configuration options.
  - **Deliverables:**
    - `AndAllRuleComponent.tsx` - Multiple conditions, all must be true
    - `OrAnyRuleComponent.tsx` - Multiple conditions, at least one true
    - `PercentageThresholdRuleComponent.tsx` - Number field >= threshold
    - `CountThresholdRuleComponent.tsx` - Count of checkboxes >= threshold
    - `MatchValueRuleComponent.tsx` - Field equals specific value
    - `BBIFunctionalityCheckComponent.tsx` - Check BBI status
    - Visual indicators for Pass (green) and Fail (red) outputs

- [ ] **3.5 Story: Frontend Calculation Rule Builder - Test Calculation Feature**
  - **Duration:** 1 day
  - **Dependencies:** 3.4
  - **Tech Stack:** React, TanStack Query
  - **Description:** Implement "Test Calculation" feature allowing MLGOO to input sample data and
    see predicted Pass/Fail result.
  - **Deliverables:**
    - Test panel with sample data inputs (matching form_schema fields)
    - "Run Test" button
    - Result display showing Pass/Fail with explanation
    - Error handling for invalid test data
    - Integration with `POST /api/v1/indicators/test-calculation`

- [ ] **3.6 Story: Frontend Remark Schema Builder**
  - **Duration:** 2 days
  - **Dependencies:** 3.1
  - **Tech Stack:** React, shadcn/ui
  - **Description:** Create remark schema builder for defining conditional text templates based on
    indicator status.
  - **Deliverables:**
    - `RemarkSchemaBuilder.tsx` component
    - Condition selector (all children pass, any child fail, BBI status)
    - Text template editor with placeholder support
    - Placeholder suggestions (e.g., {indicator_name}, {bbi_name})
    - Default remark template field
    - Preview of generated remarks based on sample data

- [ ] **3.7 Story: Backend Remark Generation Service**
  - **Duration:** 1 day
  - **Dependencies:** 3.1
  - **Tech Stack:** Python, Jinja2 (for template rendering)
  - **Description:** Implement remark generation logic in backend service.
  - **Deliverables:**
    - `generate_indicator_remark()` function in `intelligence_service.py`
    - Template rendering with placeholder replacement
    - Integration with assessment response workflow
    - Storage of generated remarks in `assessment_responses` table

- [ ] **3.8 Story: Testing for Calculation & Remark Builders**
  - **Duration:** 1 day
  - **Dependencies:** 3.7
  - **Tech Stack:** Pytest, Vitest, React Testing Library
  - **Description:** Comprehensive testing for calculation logic and remark generation.
  - **Deliverables:**
    - Backend tests for all 6 rule types
    - Nested condition group evaluation tests
    - Remark generation tests with various templates
    - Frontend tests for rule builder UI
    - Test calculation feature tests

---

#### **Epic 4.0: BBI Configuration System**

- [ ] **4.1 Story: Database Schema for BBI Models**
  - **Duration:** 1 day
  - **Dependencies:** None
  - **Tech Stack:** SQLAlchemy, Alembic, PostgreSQL
  - **Description:** Create database models for BBIs and indicator-to-BBI mappings with calculation
    rules.
  - **Deliverables:**
    - `bbis` table (id, name, abbreviation, description, governance_area_id, is_active)
    - `bbi_indicator_mappings` table (bbi_id, mapping_rules JSONB)
    - Alembic migration
    - BBI status enum (Functional, Non-Functional)

- [ ] **4.2 Story: Backend BBI Service Layer**
  - **Duration:** 2 days
  - **Dependencies:** 4.1, Epic 3.1 (needs rule engine)
  - **Tech Stack:** FastAPI, SQLAlchemy, Pydantic
  - **Description:** Implement BBI CRUD operations and BBI status calculation service.
  - **Deliverables:**
    - `bbi_service.py` with CRUD operations
    - `create_bbi()`, `get_bbi()`, `list_bbis()`, `update_bbi()`, `deactivate_bbi()`
    - `calculate_bbi_status()` - Evaluates indicator results against mapping rules
    - Integration with assessment finalization workflow
    - Pydantic schemas for BBI requests/responses

- [ ] **4.3 Story: Backend BBI API Endpoints**
  - **Duration:** 1 day
  - **Dependencies:** 4.2
  - **Tech Stack:** FastAPI
  - **Description:** Create RESTful API endpoints for BBI configuration.
  - **Deliverables:**
    - `POST /api/v1/bbis` - Create BBI
    - `GET /api/v1/bbis` - List BBIs
    - `GET /api/v1/bbis/{id}` - Get BBI details
    - `PUT /api/v1/bbis/{id}` - Update BBI and mapping rules
    - `DELETE /api/v1/bbis/{id}` - Deactivate BBI
    - `POST /api/v1/bbis/test-calculation` - Test BBI status calculation
    - MLGOO_DILG role protection

- [ ] **4.4 Story: Frontend BBI List & Configuration Pages**
  - **Duration:** 2 days
  - **Dependencies:** 4.3, `pnpm generate-types`
  - **Tech Stack:** Next.js, React, TanStack Query, shadcn/ui
  - **Description:** Create BBI management interface with list and configuration views.
  - **Deliverables:**
    - `/admin/bbis/page.tsx` - BBI list page
    - `BBIList.tsx` component
    - `/admin/bbis/new/page.tsx` - Create BBI page
    - `/admin/bbis/[id]/edit/page.tsx` - Edit BBI page
    - `BBIForm.tsx` component for BBI basic info
    - Custom hook `useBBIs.ts`

- [ ] **4.5 Story: Frontend BBI Mapping Builder**
  - **Duration:** 2 days
  - **Dependencies:** 4.4, Epic 3.3 (reuse rule builder architecture)
  - **Tech Stack:** React, shadcn/ui
  - **Description:** Create interface for defining indicator-to-BBI mapping rules (reusing
    calculation rule builder components).
  - **Deliverables:**
    - `BBIMappingBuilder.tsx` component
    - Indicator selector (multi-select from governance area)
    - Rule builder (reuse components from Epic 3.3)
    - Functionality determination (Functional/Non-Functional) output
    - "Test BBI Calculation" panel
    - Integration with `PUT /api/v1/bbis/{id}`

- [ ] **4.6 Story: Testing for BBI Configuration**
  - **Duration:** 1 day
  - **Dependencies:** 4.5
  - **Tech Stack:** Pytest, Vitest, React Testing Library
  - **Description:** Test BBI CRUD, calculation logic, and UI.
  - **Deliverables:**
    - `test_bbi_service.py` - Service layer tests
    - `test_bbis_api.py` - API endpoint tests
    - BBI status calculation tests with various rule combinations
    - `BBIMappingBuilder.test.tsx` - Frontend tests
    - Integration test for BBI status appearing in assessment results

---

#### **Epic 5.0: Assessment Cycle & Deadline Management System**

- [ ] **5.1 Story: Database Schema for Cycles & Deadline Overrides**
  - **Duration:** 1 day
  - **Dependencies:** None
  - **Tech Stack:** SQLAlchemy, Alembic, PostgreSQL
  - **Description:** Create database models for assessment cycles and deadline override tracking.
  - **Deliverables:**
    - `assessment_cycles` table (id, name, year, phase1_deadline, rework_deadline, phase2_deadline,
      calibration_deadline, is_active)
    - `deadline_overrides` table (id, barangay_id, indicator_id, original_deadline, new_deadline,
      reason, created_by, created_at)
    - Alembic migration
    - Constraints ensuring only one active cycle

- [ ] **5.2 Story: Backend Deadline Management Service**
  - **Duration:** 2 days
  - **Dependencies:** 5.1
  - **Tech Stack:** FastAPI, SQLAlchemy, Pydantic
  - **Description:** Implement cycle management and deadline override logic with audit logging.
  - **Deliverables:**
    - `deadline_service.py`
    - `create_assessment_cycle()`, `get_active_cycle()`, `update_cycle()`
    - `get_deadline_status()` - Check submission status for all barangays
    - `apply_deadline_override()` - Extend deadline for specific barangay/indicators
    - Validation (deadlines in chronological order, new deadline not in past)
    - Integration with notification service

- [ ] **5.3 Story: Backend Deadline API Endpoints**
  - **Duration:** 1 day
  - **Dependencies:** 5.2
  - **Tech Stack:** FastAPI
  - **Description:** Create API endpoints for cycle management and deadline operations.
  - **Deliverables:**
    - `POST /api/v1/admin/cycles` - Create cycle
    - `GET /api/v1/admin/cycles/active` - Get active cycle
    - `PUT /api/v1/admin/cycles/{id}` - Update cycle
    - `GET /api/v1/admin/deadlines/status` - Get deadline status for all barangays
    - `POST /api/v1/admin/deadlines/override` - Apply deadline override
    - `GET /api/v1/admin/deadlines/overrides` - List all overrides (audit log)
    - `GET /api/v1/admin/deadlines/overrides/export` - Export to CSV
    - MLGOO_DILG role protection

- [ ] **5.4 Story: Frontend Assessment Cycle Management Page**
  - **Duration:** 1 day
  - **Dependencies:** 5.3, `pnpm generate-types`
  - **Tech Stack:** Next.js, React, TanStack Query, shadcn/ui
  - **Description:** Create interface for creating and managing assessment cycles.
  - **Deliverables:**
    - `/admin/cycles/page.tsx` - Cycle management page
    - `CycleForm.tsx` - Form with 4 deadline inputs
    - Date picker validation (chronological order)
    - Active cycle display
    - Edit cycle functionality
    - Custom hook `useCycles.ts`

- [ ] **5.5 Story: Frontend Deadline Status Dashboard**
  - **Duration:** 2 days
  - **Dependencies:** 5.3, `pnpm generate-types`
  - **Tech Stack:** Next.js, React, TanStack Query, Recharts or similar
  - **Description:** Create visual dashboard showing deadline status for all barangays across all
    phases.
  - **Deliverables:**
    - `/admin/deadlines/page.tsx` - Deadline monitoring dashboard
    - `DeadlineStatusDashboard.tsx` - Grid/table showing barangays × phases
    - Status indicators (submitted on time, late, pending, overdue)
    - Filtering by barangay, governance area, phase
    - Color-coded visual indicators
    - Summary statistics (e.g., "15 barangays overdue")
    - Custom hook `useDeadlines.ts`

- [ ] **5.6 Story: Frontend Deadline Override Modal & Workflow**
  - **Duration:** 2 days
  - **Dependencies:** 5.5
  - **Tech Stack:** React, shadcn/ui Dialog, React Hook Form
  - **Description:** Create multi-step modal for applying deadline overrides with confirmation.
  - **Deliverables:**
    - `DeadlineOverrideModal.tsx` - Multi-step modal
    - Step 1: Select barangay (dropdown or search)
    - Step 2: Select indicators (multi-select or "All")
    - Step 3: Set new deadline (date picker) and reason (text input)
    - Step 4: Confirmation summary
    - Validation and error handling
    - Success notification
    - Integration with `POST /api/v1/admin/deadlines/override`

- [ ] **5.7 Story: Frontend Deadline Override Audit Log**
  - **Duration:** 1 day
  - **Dependencies:** 5.3, `pnpm generate-types`
  - **Tech Stack:** Next.js, React, TanStack Query
  - **Description:** Create audit log viewer for deadline overrides with filtering and export.
  - **Deliverables:**
    - `DeadlineAuditLog.tsx` component (can be embedded or separate page)
    - Table showing timestamp, user, barangay, indicators, old/new deadline, reason
    - Filtering by date range, barangay, user
    - CSV export button
    - Custom hook `useDeadlineAuditLog.ts`

- [ ] **5.8 Story: Deadline Extension Email Notifications**
  - **Duration:** 1 day
  - **Dependencies:** 5.2
  - **Tech Stack:** Celery, Redis, Email service (SendGrid or similar)
  - **Description:** Implement background task to send email notifications when deadlines are
    extended.
  - **Deliverables:**
    - Celery task in `admin_notifications.py`
    - Email template for deadline extension notification
    - Integration with `apply_deadline_override()` service
    - Notification sent to affected BLGU users
    - Task queue configuration

- [ ] **5.9 Story: Testing for Deadline Management**
  - **Duration:** 1 day
  - **Dependencies:** 5.8
  - **Tech Stack:** Pytest, Vitest, React Testing Library
  - **Description:** Test deadline management logic, UI, and notifications.
  - **Deliverables:**
    - `test_deadline_service.py` - Service layer tests
    - `test_deadline_api.py` - API endpoint tests
    - Validation tests (chronological deadlines, no past dates)
    - `DeadlineOverrideModal.test.tsx` - Frontend tests
    - Email notification tests
    - CSV export tests

---

#### **Epic 6.0: Audit & Security Infrastructure**

- [ ] **6.1 Story: Database Schema for Audit Logs**
  - **Duration:** 0.5 days
  - **Dependencies:** None
  - **Tech Stack:** SQLAlchemy, Alembic, PostgreSQL
  - **Description:** Create audit_logs table for tracking all administrative actions.
  - **Deliverables:**
    - `audit_logs` table (id, user_id, entity_type, entity_id, action, changes JSONB, timestamp)
    - Indexes on timestamp, user_id, entity_type for fast queries
    - Alembic migration

- [ ] **6.2 Story: Backend Audit Service**
  - **Duration:** 1 day
  - **Dependencies:** 6.1
  - **Tech Stack:** FastAPI, SQLAlchemy, Pydantic
  - **Description:** Implement audit logging service that can be called from all admin operations.
  - **Deliverables:**
    - `audit_service.py`
    - `log_audit_event()` - Generic function to log any action
    - `get_audit_logs()` - Retrieve with filtering
    - Integration points in indicator_service, bbi_service, deadline_service
    - Helper to calculate JSON diff for "changes" field

- [ ] **6.3 Story: Backend Access Control Middleware**
  - **Duration:** 1 day
  - **Dependencies:** None
  - **Tech Stack:** FastAPI, python-jose
  - **Description:** Implement MLGOO_DILG role-based access control for all admin endpoints.
  - **Deliverables:**
    - `require_mlgoo_dilg()` dependency function
    - Apply to all admin endpoints
    - 403 Forbidden responses for non-MLGOO users
    - Logging of access attempts
    - Integration with existing auth system

- [ ] **6.4 Story: Backend Data Validation for JSON Schemas**
  - **Duration:** 2 days
  - **Dependencies:** Epic 2.1, Epic 3.1 (Pydantic models must exist)
  - **Tech Stack:** Pydantic, JSON Schema
  - **Description:** Implement comprehensive validation for form_schema, calculation_schema,
    remark_schema, and BBI mapping rules.
  - **Deliverables:**
    - Pydantic validators for all schema types
    - Circular dependency detection for hierarchical indicators
    - Field reference validation (prevent referencing non-existent fields)
    - User-friendly error messages with specific field paths
    - Prevention of XSS in text inputs (HTML sanitization)

- [ ] **6.5 Story: Backend Security Measures**
  - **Duration:** 1 day
  - **Dependencies:** 6.3
  - **Tech Stack:** FastAPI, slowapi (rate limiting)
  - **Description:** Implement rate limiting, input sanitization, and other security measures.
  - **Deliverables:**
    - Rate limiting on admin endpoints (e.g., 100 requests per minute)
    - HTML sanitization for rich text fields
    - SQL injection prevention (verify parameterized queries)
    - CORS configuration for admin endpoints
    - Security headers

- [ ] **6.6 Story: Frontend Audit Log Viewer**
  - **Duration:** 1 day
  - **Dependencies:** 6.2, `pnpm generate-types`
  - **Tech Stack:** Next.js, React, TanStack Query, shadcn/ui
  - **Description:** Create audit log viewer UI for MLGOO-DILG to track all administrative actions.
  - **Deliverables:**
    - `/admin/audit/page.tsx` - Audit log viewer page
    - `AuditLogTable.tsx` - Table showing all logged actions
    - Filtering by date range, user, entity type, action
    - JSON diff viewer for "changes" field
    - Pagination for large datasets
    - Custom hook `useAuditLogs.ts`

- [ ] **6.7 Story: Frontend Error Handling & User Feedback**
  - **Duration:** 1 day
  - **Dependencies:** None
  - **Tech Stack:** React, Zustand, shadcn/ui Toast
  - **Description:** Implement consistent error handling and user-friendly error messages across all
    admin features.
  - **Deliverables:**
    - Global error handling in TanStack Query
    - Error message mapping (convert technical errors to user-friendly)
    - Toast notifications for success/error states
    - Form validation error display
    - Loading states for all async operations

- [ ] **6.8 Story: Testing for Audit & Security**
  - **Duration:** 1 day
  - **Dependencies:** 6.7
  - **Tech Stack:** Pytest, Vitest
  - **Description:** Test audit logging, access control, and validation.
  - **Deliverables:**
    - `test_audit_service.py` - Audit logging tests
    - Access control tests (verify 403 for non-MLGOO users)
    - Schema validation tests (invalid JSON, circular refs, XSS attempts)
    - Rate limiting tests
    - `AuditLogTable.test.tsx` - Frontend tests

---

---

### Phase 3: Atomic-Level Tasks

Each epic has been broken down into granular, file-specific atomic tasks (2-8 hours each) with exact
file paths, acceptance criteria, and dependencies. Tasks are organized in separate files for better
manageability:

**📁 Epic Task Files:**

1. **[epic-1-indicator-crud-versioning.md](./epic-1-indicator-crud-versioning.md)**
   - 38 atomic tasks across 5 stories
   - Database schema, service layer, API endpoints, frontend, testing
   - Duration: 76 hours (5-7 days)

2. **[epic-2-form-schema-builder.md](./epic-2-form-schema-builder.md)**
   - 35 atomic tasks across 7 stories
   - Visual form builder with drag-and-drop, 7 input types, preview/JSON viewer
   - Duration: 86.5 hours (7-10 days)

3. **[epic-3-calculation-remark-builders.md](./epic-3-calculation-remark-builders.md)**
   - 45 atomic tasks across 8 stories
   - Rule engine with 6 rule types, visual calculation builder, remark generator
   - Duration: 96 hours (8-12 days)

4. **[epic-4-bbi-configuration.md](./epic-4-bbi-configuration.md)**
   - 40 atomic tasks across 6 stories
   - BBI definitions, indicator-to-BBI mappings, automatic status calculation
   - Duration: 74 hours (5-7 days)

5. **[epic-5-deadline-management.md](./epic-5-deadline-management.md)**
   - 60 atomic tasks across 9 stories
   - Assessment cycles, deadline monitoring dashboard, granular overrides, email notifications
   - Duration: 107 hours (6-8 days)

6. **[epic-6-audit-security.md](./epic-6-audit-security.md)**
   - 46 atomic tasks across 8 stories
   - Comprehensive audit logging, access control, validation, security measures
   - Duration: 80.5 hours (4-6 days)

---

## Implementation Guidance

### For Developers

**Starting a New Epic:**

1. Open the corresponding epic-X-\*.md file
2. Review all atomic tasks and dependencies
3. Start with Story 1 (usually database schema)
4. Complete tasks in order (dependencies must be satisfied)
5. Check off tasks as completed
6. Run tests after each story completion

**Task Format:** Each atomic task includes:

- ✅ **File paths**: Exact location in monorepo
- ✅ **Dependencies**: What must be done first
- ✅ **Acceptance Criteria**: How to know it's complete
- ✅ **Tech Stack**: Specific tools/libraries to use
- ✅ **Duration**: Estimated hours (2-8 hours per task)

### For Project Managers

**Progress Tracking:**

- Each epic file contains a summary with total tasks and hours
- Stories provide logical milestones (1-3 days each)
- Epics map 1:1 with PRD functional requirements
- Total estimated duration: **35-50 days** across all epics

**Dependencies:**

- Epic 1 must complete before Epic 2 & Epic 3
- Epic 3 must complete before Epic 4
- Epic 6 runs in parallel (cross-cutting concerns)
- Epic 5 requires Epic 1 & Epic 6

---

## Next Steps

**Status: All Phases Complete ✅**

### ✅ **Completed:**

- **Phase 1:** Epic-Level Tasks (6 epics defined)
- **Phase 2:** Story-Level Tasks (43 stories defined)
- **Phase 3:** Atomic Tasks for ALL 6 Epics (264 tasks total)

### 📊 **Final Statistics:**

**Total Tasks Created:** 264 atomic tasks **Total Estimated Hours:** 520 hours (65 days @ 8
hours/day) **Total Stories:** 43 stories **Total Epics:** 6 epics

**Breakdown by Epic:**

- Epic 1 (Indicator CRUD): 38 tasks, 76 hours
- Epic 2 (Form Builder): 35 tasks, 86.5 hours
- Epic 3 (Calculation & Remark): 45 tasks, 96 hours
- Epic 4 (BBI Configuration): 40 tasks, 74 hours
- Epic 5 (Deadline Management): 60 tasks, 107 hours
- Epic 6 (Audit & Security): 46 tasks, 80.5 hours

### 🚀 **Ready for Implementation:**

All epics are now ready for development teams to begin implementation. Each task includes:

- ✅ Exact file paths in the monorepo
- ✅ Clear acceptance criteria
- ✅ Dependency chains
- ✅ Tech stack specifications
- ✅ Duration estimates (2-8 hours per task)

**Recommended Implementation Order:**

1. Start with **Epic 6** (Audit & Security) - provides foundation for all other epics
2. Then **Epic 1** (Indicator CRUD & Versioning) - core data model
3. Then **Epic 2** (Form Builder) - parallel with Epic 3
4. Then **Epic 3** (Calculation Builder) - depends on Epic 2
5. Then **Epic 4** (BBI Configuration) - depends on Epic 3
6. Finally **Epic 5** (Deadline Management) - depends on Epic 1 & 6

### 📝 **Documentation Complete:**

All documentation is now in place:

- ✅ Comprehensive PRD with success metrics
- ✅ Three-tier task breakdown (Epic → Story → Atomic)
- ✅ PRD traceability matrix
- ✅ Implementation guidance for developers
- ✅ Testing strategy across all epics
