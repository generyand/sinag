# Epic 2.0: Hierarchical Tree Editor & Split-Pane UI

> **PRD Reference:** FR-6.0.1, FR-6.0.3, FR-6.1.1 **User Stories:** US-6.0.1, US-6.0.4, US-6.0.5,
> US-6.1.1 **Duration:** 2-3 weeks **Status:** ✅ Complete - All 10 stories implemented and tested

**[← Back to Overview](./README.md)**

---

## Epic Overview

**Description:** Build the hierarchical tree editor interface using react-arborist with
drag-and-drop support, automatic renumbering, and a split-pane layout (30% tree view + 70% form
editor). This epic provides the visual interface for creating and managing hierarchical indicator
structures.

**Success Criteria:**

- Users can add root, child, and sibling indicators via tree UI
- Drag-and-drop reordering works with automatic code recalculation (1.1 → 1.2)
- Split-pane layout displays tree on left, form editor on right
- Tree nodes show validation status badges (✓ complete, ⚠ incomplete)
- Selection persistence: selecting indicator in tree loads its form data

---

- [x] **2.0 Epic: Hierarchical Tree Editor & Split-Pane UI** _(FR-6.0.1, FR-6.0.3, FR-6.1.1)_
  - [x] **2.1 Story: Backend Indicator Model Enhancement**
    - **Scope:** Update Indicator model to support hierarchical structure, MOV checklist fields, and
      selection mode
    - **Duration:** 1-2 days
    - **Dependencies:** None
    - **Files:**
      - `apps/api/app/db/models/indicator.py`
      - `apps/api/alembic/versions/xxxx_add_hierarchical_indicator_fields.py`
    - **Tech:** SQLAlchemy, Alembic, PostgreSQL JSONB
    - **Success Criteria:**
      - Add fields to `Indicator` model:
        - `parent_id` (Integer, nullable, self-referential FK)
        - `indicator_code` (String, e.g., "1.1", "1.1.1")
        - `sort_order` (Integer, for maintaining tree order)
        - `selection_mode` (Enum: 'single', 'multiple', 'none')
        - `mov_checklist_items` (JSONB, array of MOV item configurations)
        - `form_schema` (JSONB, existing field enhanced)
        - `calculation_schema` (JSONB, existing field enhanced)
        - `remark_schema` (JSONB, new field)
      - Add relationship: `children = relationship('Indicator', backref='parent')`
      - Create migration with
        `alembic revision --autogenerate -m "add hierarchical indicator fields"`
      - Run migration: `alembic upgrade head`

  - [x] **2.2 Story: Backend Indicator Service for Tree Operations**
    - **Scope:** Implement service methods for hierarchical indicator operations (create, update,
      delete, reorder, bulk publish)
    - **Duration:** 2-3 days
    - **Dependencies:** 2.1 (model updated)
    - **Files:** `apps/api/app/services/indicator_service.py`
    - **Tech:** SQLAlchemy, Pydantic, Python, Topological sorting
    - **Success Criteria:**
      - Service class `IndicatorService` with methods:
        - `create_indicator(db, data)` - Create single indicator
        - `get_indicator_tree(db, governance_area_id)` - Get full tree structure
        - `update_indicator(db, indicator_id, data)` - Update indicator
        - `delete_indicator(db, indicator_id)` - Delete with cascade check
        - `reorder_indicators(db, reorder_operations)` - Handle drag-drop reordering
        - `recalculate_codes(db, governance_area_id)` - Renumber indicators after reorder
        - `bulk_create_from_draft(db, draft_id)` - Publish entire draft as transaction
        - `validate_tree(draft_data)` - Pre-publish validation
      - Topological sorting in `bulk_create_from_draft()`: ensure parents created before children
      - `validate_tree()` checks:
        - No circular parent references
        - All required fields present (title, governance_area_id)
        - Weight sum validation for siblings = 100%
        - Valid calculation references (fields exist in form_schema)
      - Service exports singleton: `indicator_service = IndicatorService()`

  - [x] **2.3 Story: Backend API Endpoints for Indicator CRUD**
    - **Scope:** Create FastAPI endpoints for indicator operations with tag `indicators`
    - **Duration:** 1-2 days
    - **Dependencies:** 2.2 (service layer complete)
    - **Files:**
      - `apps/api/app/api/v1/indicators.py`
      - `apps/api/app/schemas/indicator.py` (update schemas)
    - **Tech:** FastAPI, Pydantic, dependency injection
    - **Success Criteria:**
      - Endpoints created with tag `indicators`:
        - `GET /api/v1/indicators/tree?governance_area_id={id}` - Get indicator tree
        - `POST /api/v1/indicators` - Create single indicator
        - `PUT /api/v1/indicators/{indicator_id}` - Update indicator
        - `DELETE /api/v1/indicators/{indicator_id}` - Delete indicator
        - `POST /api/v1/indicators/reorder` - Reorder indicators (drag-drop)
        - `POST /api/v1/indicators/bulk-publish` - Publish draft as transaction
      - All endpoints require MLGOO_DILG role
      - Bulk publish endpoint:
        - Accepts `draft_id` in request body
        - Returns list of created indicator IDs
        - Uses database transaction (rollback on any error)
      - OpenAPI docs include examples
      - Router registered in `apps/api/app/api/v1/__init__.py`

  - [x] **2.4 Story: Type Generation for Indicator Endpoints**
    - **Scope:** Generate TypeScript types and React Query hooks for indicator endpoints
    - **Duration:** 1 hour
    - **Dependencies:** 2.3 (endpoints exist)
    - **Files:**
      - `packages/shared/src/generated/endpoints/indicators/`
      - `packages/shared/src/generated/schemas/indicators/`
    - **Tech:** Orval, OpenAPI, TypeScript
    - **Success Criteria:**
      - Run `pnpm generate-types` successfully
      - React Query hooks generated: `useGetIndicatorTree`, `useCreateIndicator`,
        `useUpdateIndicator`, `useDeleteIndicator`, `useReorderIndicators`,
        `useBulkPublishIndicators`
      - TypeScript types for `Indicator`, `IndicatorCreate`, `IndicatorUpdate`, `IndicatorTree`
      - No TypeScript errors
      - Verify hooks have correct signatures

  - [x] **2.5 Story: Frontend Indicator Builder Store**
    - **Scope:** Create Zustand store for managing indicator tree state with flat Map structure
    - **Duration:** 2-3 days
    - **Dependencies:** 2.4 (types generated)
    - **Files:** `apps/web/src/store/indicatorBuilderStore.ts`
    - **Tech:** Zustand, TypeScript, Immer (for immutable updates)
    - **Success Criteria:**
      - Zustand store `useIndicatorBuilderStore` with state:
        - `indicators` - Map<string, Indicator> (flat structure, keyed by ID)
        - `selectedIndicatorId` - Currently selected indicator ID
        - `governanceAreaId` - Current governance area
        - `rootIndicatorIds` - Array of root indicator IDs (for tree rendering)
      - Store actions:
        - `loadTree(treeData)` - Load indicator tree from API
        - `addIndicator(type, parentId?)` - Add root/child/sibling
        - `updateIndicator(id, data)` - Update indicator data
        - `deleteIndicator(id)` - Remove indicator from tree
        - `moveIndicator(id, newParentId, newIndex)` - Drag-drop operation
        - `selectIndicator(id)` - Set selected indicator
        - `recalculateCodes()` - Auto-renumber indicators after reorder
        - `reset()` - Clear store
      - Use Immer middleware for immutable updates
      - Persist selected indicator ID to localStorage

  - [x] **2.6 Story: Frontend Split-Pane Layout Component**
    - **Scope:** Create builder page with 30% tree pane + 70% editor pane
    - **Duration:** 1 day
    - **Dependencies:** 2.5 (store ready)
    - **Files:**
      - `apps/web/src/app/(app)/mlgoo/indicators/builder/page.tsx`
      - `apps/web/src/components/features/indicators/builder/IndicatorBuilderLayout.tsx`
    - **Tech:** Next.js, React, Tailwind CSS, react-resizable-panels
    - **Success Criteria:**
      - Page component at `/mlgoo/indicators/builder` (MLGOO_DILG only)
      - Layout component with two resizable panels:
        - Left panel (30% default): Tree view container
        - Right panel (70% default): Form editor container
      - Use `react-resizable-panels` library for resizing
      - Responsive: On mobile (<768px), stack panels vertically
      - Header with:
        - Page title: "Indicator Builder"
        - Draft selector dropdown (if resuming draft)
        - Actions: "Save Draft", "Publish All" buttons
      - Loading state: Skeleton for both panels
      - Error boundary: Catch errors in tree or form rendering

  - [x] **2.7 Story: Frontend Tree View Component with react-arborist**
    - **Scope:** Build tree view using react-arborist with drag-and-drop support
    - **Duration:** 2-3 days
    - **Dependencies:** 2.6 (layout ready)
    - **Files:**
      - `apps/web/src/components/features/indicators/builder/IndicatorTreeView.tsx`
      - `apps/web/src/components/features/indicators/builder/IndicatorTreeNode.tsx`
    - **Tech:** react-arborist, React, shadcn/ui, Tailwind CSS
    - **Success Criteria:**
      - `IndicatorTreeView` component:
        - Uses react-arborist `<Tree>` component
        - Data source: `useIndicatorBuilderStore` state
        - Drag-and-drop enabled (`onMove` handler updates store)
        - Selection: clicking node calls `selectIndicator(id)`
        - Actions toolbar:
          - "Add Root Indicator" button (+ icon)
          - "Add Child" button (enabled when node selected)
          - "Add Sibling" button (enabled when node selected)
          - "Delete" button (enabled when node selected, shows confirmation)
      - `IndicatorTreeNode` component:
        - Displays: indicator code (e.g., "1.1.1"), title, validation badge
        - Validation badge colors:
          - ✓ Green: all required fields complete
          - ⚠ Yellow: incomplete fields
          - ❌ Red: validation errors
        - Hover: highlight node, show action icons (edit, delete)
        - Expandable/collapsible for indicators with children
        - Indent levels for nested indicators

  - [x] **2.8 Story: Frontend Basic Indicator Form View**
    - **Scope:** Create right-panel form editor for basic indicator metadata (title, description,
      weight)
    - **Duration:** 2 days
    - **Dependencies:** 2.7 (tree view ready)
    - **Files:**
      - `apps/web/src/components/features/indicators/builder/IndicatorFormView.tsx`
      - `apps/web/src/components/features/indicators/builder/BasicInfoTab.tsx`
    - **Tech:** React, shadcn/ui (Tabs, Form, Input, Textarea), React Hook Form, Zod
    - **Success Criteria:**
      - `IndicatorFormView` component:
        - Tabbed interface using shadcn/ui Tabs:
          - Tab 1: "Basic Info" - Title, description, weight, selection mode
          - Tab 2: "MOV Checklist" - (placeholder, implemented in Epic 3.0)
          - Tab 3: "Form Schema" - (placeholder, implemented in Epic 4.0)
          - Tab 4: "Calculation" - (placeholder, implemented in Epic 4.0)
          - Tab 5: "Remarks" - (placeholder, implemented in Epic 4.0)
        - Displays selected indicator data from store
        - Form auto-saves on blur (debounced)
      - `BasicInfoTab` component:
        - Form fields:
          - Title (text input, required)
          - Description (textarea, optional)
          - Weight (number input, 0-100, required for leaf indicators)
          - Selection mode (dropdown: Single, Multiple, None)
        - Uses React Hook Form + Zod validation
        - onChange updates Zustand store immediately
        - Validation errors displayed inline

  - [x] **2.9 Story: Automatic Code Recalculation & Renumbering**
    - **Scope:** Implement automatic indicator code recalculation when tree structure changes
    - **Duration:** 1-2 days
    - **Dependencies:** 2.8 (basic form ready)
    - **Files:**
      - `apps/web/src/lib/indicator-tree-utils.ts`
      - `apps/web/src/store/indicatorBuilderStore.ts` (extend `recalculateCodes()`)
    - **Tech:** TypeScript, tree traversal algorithms
    - **Success Criteria:**
      - Utility functions in `indicator-tree-utils.ts`:
        - `recalculateIndicatorCodes(indicators, rootIds)` - DFS traversal to assign codes
        - `getNextCode(parentCode, siblingIndex)` - Calculate next code (e.g., 1.1 → 1.2, 1.1.1 →
          1.1.2)
        - `sortIndicatorsByCode(indicators)` - Sort indicators by code for display
      - `recalculateCodes()` in store:
        - Triggered after `addIndicator()`, `deleteIndicator()`, `moveIndicator()`
        - Updates all indicator codes in affected subtrees
        - Maintains sort_order based on tree position
      - Edge cases handled:
        - Moving indicator to different parent (recalculate both old and new parent subtrees)
        - Deleting indicator with children (promote children or cascade delete based on user choice)
        - Adding sibling between existing indicators (renumber subsequent siblings)

  - [x] **2.10 Story: Testing & Validation for Tree Editor**
    - **Scope:** Comprehensive testing for tree editor backend, frontend, and drag-drop logic
    - **Duration:** 2-3 days
    - **Dependencies:** 2.9 (all tree features complete)
    - **Files:**
      - `apps/api/tests/api/v1/test_indicators.py`
      - `apps/api/tests/services/test_indicator_service.py`
      - `apps/web/src/components/features/indicators/builder/__tests__/IndicatorTreeView.test.tsx`
      - `apps/web/src/store/__tests__/indicatorBuilderStore.test.ts`
      - `apps/web/src/lib/__tests__/indicator-tree-utils.test.ts`
    - **Tech:** Pytest, Vitest, React Testing Library
    - **Success Criteria:**
      - **Backend Tests:**
        - Test indicator CRUD operations
        - Test bulk publish with topological sorting (parents before children)
        - Test tree validation (circular references, weight sum, missing fields)
        - Test reorder operations
        - Test RBAC: non-MLGOO_DILG cannot create indicators
        - Run with: `cd apps/api && pytest tests/ -vv -k indicator`
      - **Frontend Tests:**
        - Test tree view rendering with nested indicators
        - Test drag-and-drop operations (mock react-arborist events)
        - Test add/delete indicator actions
        - Test automatic code recalculation after reorder
        - Test validation badge display (complete, incomplete, error states)
        - Test store actions: loadTree, addIndicator, moveIndicator, recalculateCodes
        - Mock TanStack Query hooks
        - Run with: `pnpm test` from root
      - **All tests passing:** Minimum 30 backend tests + 25 frontend tests

---

**Epic Status:** 🔄 In Progress - Tree view foundation exists, needs MOV integration and enhanced
validation

**Next Epic:** [Epic 3.0: MOV Checklist Builder (9 Item Types)](./epic-3.0-mov-checklist-builder.md)
