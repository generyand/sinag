# Epic 1.0: Draft System & Auto-Save Infrastructure

> **PRD Reference:** FR-6.0.2, FR-6.0.7, FR-6.0.8
> **User Stories:** US-6.0.2, US-6.0.3
> **Duration:** 2-3 weeks
> **Status:** ✅ Complete - All 9 stories implemented and tested

**[← Back to Overview](./README.md)**

---

## Epic Overview

**Description:** Implement a hybrid draft system (localStorage + backend) with auto-save capabilities, optimistic locking for conflict resolution, and cross-device synchronization. This epic provides the foundational infrastructure for saving incomplete indicator creation work across multiple sessions.

**Success Criteria:**
- Drafts auto-save every 3 seconds (debounced) to localStorage
- Drafts sync to backend on manual save, navigation, or tab close
- Users can resume drafts from any device
- Optimistic locking prevents concurrent edit conflicts
- Draft list shows all saved drafts with progress indicators

---

- [x] **1.0 Epic: Draft System & Auto-Save Infrastructure** _(FR-6.0.2, FR-6.0.7, FR-6.0.8)_

  - [x] **1.1 Story: Database Schema for Indicator Drafts**

    - **Scope:** Create SQLAlchemy model and Alembic migration for indicator_drafts table with optimistic locking support
    - **Duration:** 1-2 days
    - **Dependencies:** None (foundational)
    - **Files:**
      - `apps/api/app/db/models/indicator_draft.py`
      - `apps/api/alembic/versions/xxxx_create_indicator_drafts.py`
    - **Tech:** SQLAlchemy, Alembic, PostgreSQL, JSONB columns
    - **Success Criteria:**

      - `indicator_drafts` table created with fields: `id`, `user_id` (FK), `governance_area_id` (FK), `title`, `draft_data` (JSONB), `current_step`, `status`, `version`, `created_at`, `updated_at`, `last_accessed_at`
      - `version` column supports optimistic locking (integer, auto-incremented on update)
      - `draft_data` JSONB stores: tree structure, form schemas, calculation schemas, MOV checklists
      - Indexes created on `user_id`, `governance_area_id`, `status`, `updated_at`
      - Migration runs successfully with `alembic upgrade head`

  - [x] **1.2 Story: Backend Pydantic Schemas for Drafts**

    - **Scope:** Define request/response schemas for draft operations with proper validation
    - **Duration:** 1 day
    - **Dependencies:** 1.1 (database model exists)
    - **Files:** `apps/api/app/schemas/indicator_draft.py`
    - **Tech:** Pydantic, Python typing
    - **Success Criteria:**

      - Schema `IndicatorDraftBase` with fields: `title`, `governance_area_id`, `draft_data`, `current_step`
      - Schema `IndicatorDraftCreate` extends Base
      - Schema `IndicatorDraftUpdate` with all optional fields + `version` (for optimistic locking)
      - Schema `IndicatorDraftResponse` with all fields + `id`, `user_id`, timestamps, `version`
      - Schema `IndicatorDraftSummary` for list view: `id`, `title`, `governance_area_name`, `progress_percentage`, `updated_at`, `status`
      - All schemas use proper types and include `Config` with `from_attributes = True`

  - [x] **1.3 Story: Backend Draft Service Layer**

    - **Scope:** Implement business logic for draft CRUD operations, auto-save, and optimistic locking
    - **Duration:** 2-3 days
    - **Dependencies:** 1.2 (schemas defined)
    - **Files:** `apps/api/app/services/indicator_draft_service.py`
    - **Tech:** SQLAlchemy, Pydantic, Python
    - **Success Criteria:**

      - Service class `IndicatorDraftService` with methods:
        - `create_draft(db, user_id, data)` - Create new draft
        - `get_draft(db, draft_id, user_id)` - Retrieve draft (RBAC enforced)
        - `list_drafts(db, user_id)` - List all user's drafts
        - `update_draft(db, draft_id, user_id, data, version)` - Update with optimistic locking
        - `delete_draft(db, draft_id, user_id)` - Soft delete draft
        - `calculate_progress(draft_data)` - Calculate completion percentage
      - Optimistic locking: `update_draft()` checks `version` field, raises `ConflictError` if version mismatch
      - Progress calculation: count completed indicators / total indicators
      - Service exports singleton: `indicator_draft_service = IndicatorDraftService()`

  - [x] **1.4 Story: Backend API Endpoints for Drafts**

    - **Scope:** Create FastAPI endpoints for draft operations with RBAC enforcement
    - **Duration:** 1-2 days
    - **Dependencies:** 1.3 (service layer complete)
    - **Files:**
      - `apps/api/app/api/v1/indicator_drafts.py`
      - `apps/api/app/api/v1/__init__.py` (register router)
    - **Tech:** FastAPI, JWT authentication, dependency injection
    - **Success Criteria:**

      - Endpoints created with tag `indicator-drafts`:
        - `POST /api/v1/indicator-drafts` - Create draft
        - `GET /api/v1/indicator-drafts` - List user's drafts
        - `GET /api/v1/indicator-drafts/{draft_id}` - Get draft details
        - `PUT /api/v1/indicator-drafts/{draft_id}` - Update draft (with version header)
        - `DELETE /api/v1/indicator-drafts/{draft_id}` - Delete draft
      - All endpoints require MLGOO_DILG role
      - Update endpoint returns 409 Conflict if version mismatch
      - OpenAPI docs include request/response examples
      - Router registered in `apps/api/app/api/v1/__init__.py`

  - [x] **1.5 Story: Type Generation for Draft Endpoints**

    - **Scope:** Generate TypeScript types and React Query hooks for draft endpoints
    - **Duration:** 1 hour
    - **Dependencies:** 1.4 (endpoints exist and backend running)
    - **Files:**
      - `packages/shared/src/generated/endpoints/indicator-drafts/`
      - `packages/shared/src/generated/schemas/indicator-drafts/`
    - **Tech:** Orval, OpenAPI, TypeScript
    - **Success Criteria:**

      - Run `pnpm generate-types` successfully
      - React Query hooks generated: `useCreateIndicatorDraft`, `useGetIndicatorDrafts`, `useGetIndicatorDraft`, `useUpdateIndicatorDraft`, `useDeleteIndicatorDraft`
      - TypeScript types generated for all request/response schemas
      - No TypeScript errors in generated files
      - Verify hooks have correct signatures and parameters

  - [x] **1.6 Story: Frontend Draft State Management**

    - **Scope:** Create Zustand store for draft state with localStorage sync and debounced auto-save
    - **Duration:** 2-3 days
    - **Dependencies:** 1.5 (types generated)
    - **Files:**
      - `apps/web/src/store/draftStore.ts`
      - `apps/web/src/hooks/useAutoSave.ts`
    - **Tech:** Zustand, localStorage, React hooks, TanStack Query
    - **Success Criteria:**

      - Zustand store `useDraftStore` with state:
        - `currentDraft` - Current draft data
        - `draftId` - Current draft ID (null for new draft)
        - `version` - Current version for optimistic locking
        - `lastSaved` - Timestamp of last save
        - `isSaving` - Auto-save in progress flag
      - Store actions:
        - `setDraft(data)` - Update draft data
        - `saveToLocalStorage()` - Save to localStorage immediately
        - `syncToBackend()` - Sync to backend database
        - `loadFromLocalStorage()` - Load from localStorage on mount
        - `reset()` - Clear draft state
      - Hook `useAutoSave()` implements:
        - Debounced auto-save (3 seconds)
        - localStorage save on every change
        - Backend sync on manual save, navigation, beforeunload
        - Error handling with exponential backoff retry (2s, 4s, 8s)
        - Toast notifications: "Draft saved 2 seconds ago" / "Auto-save failed"

  - [x] **1.7 Story: Frontend Draft List Component**

    - **Scope:** Create UI component for viewing and managing saved drafts
    - **Duration:** 1-2 days
    - **Dependencies:** 1.6 (state management ready)
    - **Files:** `apps/web/src/components/features/indicators/builder/DraftList.tsx`
    - **Tech:** Next.js, React, shadcn/ui (Table, Button, Badge), TanStack Query
    - **Success Criteria:**

      - Component displays table with columns:
        - Draft title
        - Governance area name
        - Progress (e.g., "8/12 indicators completed" with percentage badge)
        - Last updated (relative time: "2 hours ago")
        - Actions: "Resume" and "Delete" buttons
      - "Resume" button loads draft into builder wizard
      - "Delete" button shows confirmation dialog, then deletes draft
      - Empty state: "No saved drafts" with illustration
      - Loading state: Skeleton table rows
      - Error state: Alert with error message
      - Uses `useGetIndicatorDrafts` hook from generated client

  - [x] **1.8 Story: Conflict Resolution & Version Control UI**

    - **Scope:** Handle optimistic locking conflicts when draft versions mismatch
    - **Duration:** 1 day
    - **Dependencies:** 1.7 (draft list ready)
    - **Files:**
      - `apps/web/src/components/features/indicators/builder/ConflictResolutionDialog.tsx`
      - `apps/web/src/hooks/useAutoSave.ts` (extend)
    - **Tech:** React, shadcn/ui (Dialog, Alert), diff visualization
    - **Success Criteria:**

      - When `PUT /indicator-drafts/{id}` returns 409 Conflict:
        - Fetch latest draft version from server
        - Show `ConflictResolutionDialog` with three options:
          1. "Keep my changes" - Overwrite server version
          2. "Use server version" - Discard local changes
          3. "View differences" - Show side-by-side diff (optional for Phase 1)
        - Dialog displays: conflict timestamp, user who made conflicting change
      - After resolution, update `version` field and retry save
      - If user closes dialog without resolving, keep local changes in localStorage only (don't sync to backend)
      - Auto-save pauses during conflict resolution

  - [x] **1.9 Story: Testing & Validation for Draft System**

    - **Scope:** Comprehensive testing for draft backend, frontend, and auto-save logic
    - **Duration:** 2-3 days
    - **Dependencies:** 1.8 (all draft features complete)
    - **Files:**
      - `apps/api/tests/api/v1/test_indicator_drafts.py`
      - `apps/api/tests/services/test_indicator_draft_service.py`
      - `apps/web/src/store/__tests__/draftStore.test.ts`
      - `apps/web/src/hooks/__tests__/useAutoSave.test.ts`
      - `apps/web/src/components/features/indicators/builder/__tests__/DraftList.test.tsx`
    - **Tech:** Pytest, Vitest, React Testing Library, MSW (Mock Service Worker)
    - **Success Criteria:**

      - **Backend Tests:**
        - Test draft CRUD operations (create, read, update, delete)
        - Test optimistic locking: version mismatch returns 409
        - Test RBAC: non-MLGOO_DILG users cannot access drafts
        - Test progress calculation logic
        - Test edge cases: empty draft, invalid JSONB data
        - Run with: `cd apps/api && pytest tests/ -vv -k draft`
      - **Frontend Tests:**
        - Test Zustand store actions (setDraft, saveToLocalStorage, syncToBackend)
        - Test auto-save debouncing (saves after 3s, not immediately)
        - Test localStorage persistence across page reloads
        - Test conflict resolution dialog flow
        - Test draft list component rendering, resume, delete actions
        - Mock TanStack Query hooks and localStorage API
        - Run with: `pnpm test` from root
      - **All tests passing:** Minimum 25 backend tests + 20 frontend tests

---

**Epic Status:** 🔄 In Progress - Backend 80% complete (models, schemas, service layer exist), Frontend foundation ready (state management patterns established)

**Next Epic:** [Epic 2.0: Hierarchical Tree Editor & Split-Pane UI](./epic-2.0-tree-editor-ui.md)
