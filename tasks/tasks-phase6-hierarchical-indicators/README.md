# Tasks: Phase 6 - Administrative Features (Hierarchical Indicator Creation)

> Generated from: `docs/prds/prd-phase6-administrative-features.md` (v1.1)
> Based on: `docs/indicator-builder-specification.md` (v1.4)
> **Status: ✅ PHASE 6 COMPLETE - All 59 stories implemented and tested**
> Total: 6 epics → 59 stories (100% complete)
>
> **Production-Ready:** Hierarchical Indicator Builder with MOV Checklist, Schema Builders, BBI System, and Comprehensive Testing

---

## Overview

This feature enables MLGOO-DILG administrators to independently create and manage SGLGB indicators through a visual hierarchical builder interface. The system supports complex indicator structures with **MOV (Means of Verification) checklists** featuring 9 specialized item types, automatic validation rules, **BBI (Barangay-Based Institutions)** functionality mapping, and draft management with auto-save capabilities.

**Key Capabilities:**
- Multi-step wizard for creating hierarchical indicators (1.1, 1.1.1, 1.2, etc.)
- **Visual MOV checklist builder** supporting 9 item types aligned with Indicator Builder Specification v1.4
- Draft system with auto-save, optimistic locking, and cross-device synchronization
- **BBI system** with 9 mandatory institutions and one-to-one indicator mapping
- Real-time validation with grace period handling, OR logic, and conditional display
- Bulk publishing with parent-child relationship resolution via topological sorting

---

## PRD Traceability Matrix

Map each functional requirement to specific epics:

### Section 4.0: Hierarchical Indicator Creation Wizard
- **FR-6.0.1** (Multi-Step Wizard Interface) → Epic 2.0
- **FR-6.0.2** (Draft System with Auto-Save) → Epic 1.0
- **FR-6.0.3** (Hierarchical Tree Editor) → Epic 2.0
- **FR-6.0.4** (Visual Schema Builders) → Epic 3.0, Epic 4.0
- **FR-6.0.5** (Real-Time Validation) → Epic 6.0
- **FR-6.0.6** (Bulk Creation & Publishing) → Epic 6.0
- **FR-6.0.7** (Conflict Resolution & Locking) → Epic 1.0
- **FR-6.0.8** (API Endpoints - Drafts) → Epic 1.0

### Section 4.1: Indicator Management Interface
- **FR-6.1.1** (Indicator CRUD Operations) → Epic 2.0
- **FR-6.1.2** (Form Schema Builder - BLGU Input Fields) → Epic 4.0
- **FR-6.1.2** (MOV Checklist - 9 Types for Validators) → **Epic 3.0** ⚠️ **CRITICAL**
- **FR-6.1.3** (Calculation Schema Builder) → Epic 4.0
- **FR-6.1.4** (Remark Schema Builder) → Epic 4.0

### Section 4.2: BBI Configuration Interface
- **FR-6.2.1** (BBI Definition Management) → **Epic 5.0**
- **FR-6.2.2** (Indicator-to-BBI Mapping) → **Epic 5.0**

### Section 4.3-4.4: Deferred to Phase 6B
- FR-6.3.x (Deadline Management) → Deferred to future phase
- FR-6.4.x (Audit & Versioning) → Partially integrated into Epic 6.0

---

## Epic Files

This directory contains separate files for each epic to make the tasks more manageable:

- [Epic 1.0: Draft System & Auto-Save Infrastructure](./epic-1.0-draft-system-autosave.md) - _(FR-6.0.2, FR-6.0.7, FR-6.0.8)_
- [Epic 2.0: Hierarchical Tree Editor & Split-Pane UI](./epic-2.0-tree-editor-ui.md) - _(FR-6.0.1, FR-6.0.3, FR-6.1.1)_
- [Epic 3.0: MOV Checklist Builder (9 Item Types)](./epic-3.0-mov-checklist-builder.md) - _(FR-6.1.2 MOV, Spec v1.4)_ ⚠️ **NEW IMPLEMENTATION**
- [Epic 4.0: Form & Calculation Schema Builders](./epic-4.0-schema-builders.md) - _(FR-6.1.2 Form, FR-6.1.3, FR-6.1.4)_
- [Epic 5.0: BBI System Implementation](./epic-5.0-bbi-system.md) - _(FR-6.2.1, FR-6.2.2)_ ⚠️ **NEW IMPLEMENTATION**
- [Epic 6.0: Validation, Bulk Publishing & Testing](./epic-6.0-validation-testing.md) - _(FR-6.0.5, FR-6.0.6, FR-6.4.x)_

---

## Relevant Files

Tech-stack specific file structure for the Hierarchical Indicator Creation feature:

### Backend Files

**Database Models:**
- `apps/api/app/db/models/indicator_draft.py` - SQLAlchemy model for draft system
- `apps/api/app/db/models/indicator.py` - Enhanced with selection_mode, mov_checklist_items JSONB
- `apps/api/app/db/models/bbi.py` - SQLAlchemy model for 9 mandatory BBIs
- `apps/api/app/db/models/bbi_barangay_status.py` - BBI functionality status tracking per barangay

**Schemas:**
- `apps/api/app/schemas/indicator_draft.py` - Pydantic schemas for drafts (Create, Update, Response, Summary)
- `apps/api/app/schemas/indicator.py` - Enhanced with MOV checklist types, bulk operations
- `apps/api/app/schemas/bbi.py` - Pydantic schemas for BBIs (Create, Update, Response)
- `apps/api/app/schemas/mov_checklist.py` - 9 MOV item type schemas (checkbox, group, currency_input, number_input, text_input, date_input, assessment, radio_group, dropdown)

**Services:**
- `apps/api/app/services/indicator_draft_service.py` - Draft CRUD, auto-save, optimistic locking
- `apps/api/app/services/indicator_service.py` - Bulk creation with topological sorting, tree validation
- `apps/api/app/services/bbi_service.py` - BBI management, status determination (Indicator → BBI status)
- `apps/api/app/services/mov_validation_service.py` - MOV checklist validation (grace periods, OR logic, thresholds)

**API Endpoints:**
- `apps/api/app/api/v1/indicators.py` - Indicator CRUD, bulk operations (tag: `indicators`)
- `apps/api/app/api/v1/indicator_drafts.py` - Draft endpoints, locking (tag: `indicator-drafts`)
- `apps/api/app/api/v1/bbis.py` - BBI endpoints (tag: `bbis`)

**Database Migrations:**
- `apps/api/alembic/versions/xxxx_create_indicator_drafts.py` - Draft tables with optimistic locking
- `apps/api/alembic/versions/xxxx_add_mov_checklist_fields.py` - MOV item types JSONB fields
- `apps/api/alembic/versions/xxxx_create_bbi_tables.py` - BBI system tables

### Frontend Files

**Pages:**
- `apps/web/src/app/(app)/mlgoo/indicators/builder/page.tsx` - Builder wizard entry point
- `apps/web/src/app/(app)/mlgoo/indicators/page.tsx` - Indicator list/management page
- `apps/web/src/app/(app)/mlgoo/bbis/page.tsx` - BBI management page

**Builder Components:**
- `apps/web/src/components/features/indicators/builder/IndicatorBuilderLayout.tsx` - Split-pane layout (30% tree + 70% editor)
- `apps/web/src/components/features/indicators/builder/IndicatorTreeView.tsx` - react-arborist tree with drag-drop
- `apps/web/src/components/features/indicators/builder/IndicatorTreeNode.tsx` - Tree node with validation badges
- `apps/web/src/components/features/indicators/builder/IndicatorFormView.tsx` - Right panel: Basic Info, Schemas tabs
- `apps/web/src/components/features/indicators/builder/MOVChecklistBuilder.tsx` - 9 MOV item types builder ⚠️ **NEW**
- `apps/web/src/components/features/indicators/builder/FormSchemaBuilder.tsx` - BLGU input fields (reuse drag-drop patterns)
- `apps/web/src/components/features/indicators/builder/CalculationSchemaBuilder.tsx` - Simplified threshold validation
- `apps/web/src/components/features/indicators/builder/RemarkSchemaBuilder.tsx` - Template builder
- `apps/web/src/components/features/indicators/builder/DraftList.tsx` - Draft selection UI
- `apps/web/src/components/features/indicators/builder/ValidationSummary.tsx` - Validation results with MOV compliance

**MOV Item Type Components:**
- `apps/web/src/components/features/indicators/builder/mov-items/CheckboxItem.tsx`
- `apps/web/src/components/features/indicators/builder/mov-items/GroupItem.tsx` - Supports OR logic
- `apps/web/src/components/features/indicators/builder/mov-items/CurrencyInputItem.tsx` - PHP formatting
- `apps/web/src/components/features/indicators/builder/mov-items/NumberInputItem.tsx` - Threshold support
- `apps/web/src/components/features/indicators/builder/mov-items/TextInputItem.tsx`
- `apps/web/src/components/features/indicators/builder/mov-items/DateInputItem.tsx` - Grace period handling
- `apps/web/src/components/features/indicators/builder/mov-items/AssessmentItem.tsx` - YES/NO radio for validator judgment
- `apps/web/src/components/features/indicators/builder/mov-items/RadioGroupItem.tsx`
- `apps/web/src/components/features/indicators/builder/mov-items/DropdownItem.tsx`

**BBI Components:**
- `apps/web/src/components/features/bbis/BBIList.tsx` - BBI management table with 9 mandatory BBIs
- `apps/web/src/components/features/bbis/BBIForm.tsx` - BBI create/edit form
- `apps/web/src/components/features/bbis/IndicatorMappingSelector.tsx` - One-to-one indicator mapping UI

**State Management:**
- `apps/web/src/store/indicatorBuilderStore.ts` - Zustand store for builder state (flat Map model)
- `apps/web/src/store/draftStore.ts` - Draft auto-save logic with debouncing

**Hooks:**
- `apps/web/src/hooks/useIndicatorBuilder.ts` - Builder state hook with React Query integration
- `apps/web/src/hooks/useAutoSave.ts` - Auto-save debouncing (3s), version conflict handling
- `apps/web/src/hooks/useMOVValidation.ts` - MOV checklist validation hook

### Shared/Generated Files

- `packages/shared/src/generated/endpoints/indicators/` - Auto-generated React Query hooks (Orval)
- `packages/shared/src/generated/endpoints/indicator-drafts/` - Draft hooks
- `packages/shared/src/generated/endpoints/bbis/` - BBI hooks
- `packages/shared/src/generated/schemas/indicators/` - TypeScript types from Pydantic
- `packages/shared/src/generated/schemas/bbis/` - BBI types
- `packages/shared/src/generated/schemas/mov-checklist/` - MOV item types

### Testing Files

**Backend Tests:**
- `apps/api/tests/api/v1/test_indicators.py` - Indicator endpoint tests (bulk operations)
- `apps/api/tests/api/v1/test_indicator_drafts.py` - Draft endpoint tests (optimistic locking)
- `apps/api/tests/api/v1/test_bbis.py` - BBI endpoint tests
- `apps/api/tests/services/test_indicator_service.py` - Bulk creation, topological sorting tests
- `apps/api/tests/services/test_indicator_draft_service.py` - Draft service, locking tests
- `apps/api/tests/services/test_bbi_service.py` - BBI status determination tests
- `apps/api/tests/services/test_mov_validation_service.py` - MOV validation logic tests (grace periods, OR logic)

**Frontend Tests:**
- `apps/web/src/components/features/indicators/builder/__tests__/IndicatorTreeView.test.tsx`
- `apps/web/src/components/features/indicators/builder/__tests__/MOVChecklistBuilder.test.tsx` - 9 item types
- `apps/web/src/components/features/indicators/builder/__tests__/FormSchemaBuilder.test.tsx`
- `apps/web/src/store/__tests__/indicatorBuilderStore.test.ts`
- `apps/web/src/lib/__tests__/indicator-tree-utils.test.ts`

### Configuration Files

- `apps/api/app/core/config.py` - Draft storage settings, lock timeout (30 min)
- `orval.config.ts` - Ensure indicators/indicator-drafts/bbis tags included
- `apps/web/package.json` - react-arborist, @hello-pangea/dnd, TipTap dependencies

---

## Testing Notes

- **Backend Testing:** Place Pytest tests in `apps/api/tests/`. Test services and API endpoints separately. Run with `pytest -vv --log-cli-level=DEBUG`.
- **Frontend Testing:** Place test files alongside components (`.test.tsx`). Use Vitest and React Testing Library.
- **Type Safety:** Import auto-generated types from `@sinag/shared` to ensure frontend and backend are in sync. Run `pnpm generate-types` after backend changes.
- **Run Tests:** Use `pnpm test` from the root, which will run tests for all workspaces.
- **Test-First Approach:** Each epic MUST include a dedicated Testing & Validation story as the final story to ensure all features are tested before proceeding to the next epic.
- **Spec v1.4 Validation:** Test against all 29 validated indicator examples from `docs/indicator-builder-specification.md` (indicators 1.1 through 6.3).

---

## Quality Gates - Epic Review Checklist

- [ ] All PRD functional requirements are covered
- [ ] No functional requirement spans multiple epics
- [ ] Epic titles clearly indicate the feature boundary
- [ ] Each epic has its own dedicated file (epic-N-[name].md)
- [ ] **Each epic includes a Testing & Validation story as the final story**

---

## Epic Summary

| Epic | Stories | Duration | Status |
|------|---------|----------|--------|
| [Epic 1.0: Draft System & Auto-Save](./epic-1.0-draft-system-autosave.md) | 9 | 2-3 weeks | ✅ Complete |
| [Epic 2.0: Tree Editor & Split-Pane UI](./epic-2.0-tree-editor-ui.md) | 10 | 2-3 weeks | ✅ Complete |
| [Epic 3.0: MOV Checklist Builder](./epic-3.0-mov-checklist-builder.md) | 10 | 3-4 weeks | ✅ Complete |
| [Epic 4.0: Schema Builders](./epic-4.0-schema-builders.md) | 10 | 2-3 weeks | ✅ Complete |
| [Epic 5.0: BBI System](./epic-5.0-bbi-system.md) | 10 | 2-3 weeks | ✅ Complete |
| [Epic 6.0: Validation & Testing](./epic-6.0-validation-testing.md) | 10 | 3-4 weeks | ✅ Complete |
| **Total** | **59 stories** | **14-21 weeks** | **✅ 59/59 Complete (100%)** |

**Estimated Test Count:** 185 backend + 145 frontend + 5 E2E = **335 tests**

---

**Status:** ✅ **PHASE 6 COMPLETE** - All 59 stories implemented and tested (100%)
**Next Action:** Phase 6 Administrative Features fully implemented and production-ready
