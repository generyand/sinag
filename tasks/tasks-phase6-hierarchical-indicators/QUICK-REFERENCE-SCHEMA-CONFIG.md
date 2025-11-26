# Quick Reference: Split-Pane Schema Configuration

**Version:** 1.0 | **Last Updated:** January 10, 2025

---

## Problem (One-Sentence)

The current schema configuration step (Step 3) only shows one indicator at a time without the tree hierarchy, causing users to lose context, making navigation slow (3 clicks per switch), and preventing progress tracking.

---

## Solution (One-Paragraph)

Introduce a **persistent split-pane layout** (30% tree navigator + 70% schema editor) where the tree remains visible throughout Step 3, displaying status icons (☑ complete, ○ incomplete, ⚠ error, ◉ current) for each indicator, enabling **click-to-switch navigation** with auto-save, and showing real-time progress tracking ("8/12 complete, 67%"). Delta-based auto-save reduces payload size by 50x (600 KB → 12 KB), while copy/paste and template system (Phase 3) enable schema reuse across similar indicators.

---

## Key Benefits

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Schema config time** | ~8 min/indicator | ~5 min/indicator | **37% faster** |
| **Context switches** | 20-30 per session | 0 | **100% reduction** |
| **Auto-save payload** | 600 KB | 12 KB | **50x smaller** |
| **User errors** | 2-3 missed indicators | Near zero | **90% reduction** |

---

## Key Components

### Frontend Components

| Component | Purpose | File Path |
|-----------|---------|-----------|
| **SchemaConfigurationStep** | Orchestrator component for Step 3 | `apps/web/src/components/features/indicators/builder/SchemaConfigurationStep.tsx` |
| **SchemaSplitPane** | Layout manager (30/70 split) | `apps/web/src/components/features/indicators/builder/SchemaSplitPane.tsx` |
| **SchemaTreeNavigator** | Tree UI with status icons | `apps/web/src/components/features/indicators/builder/SchemaTreeNavigator.tsx` |
| **SchemaTreeNode** | Single tree node renderer | `apps/web/src/components/features/indicators/builder/SchemaTreeNode.tsx` |
| **StatusIcon** | Status indicator (☑ ○ ⚠ ◉) | `apps/web/src/components/features/indicators/builder/StatusIcon.tsx` |
| **TreeHeader** | Progress badge + filters | `apps/web/src/components/features/indicators/builder/TreeHeader.tsx` |
| **TreeFooter** | Progress bar + next button | `apps/web/src/components/features/indicators/builder/TreeFooter.tsx` |
| **SchemaEditorPane** | Schema editor with tabs | `apps/web/src/components/features/indicators/builder/SchemaEditorPane.tsx` |
| **EditorHeader** | Indicator name + actions | `apps/web/src/components/features/indicators/builder/EditorHeader.tsx` |
| **EditorFooter** | Auto-save + validation status | `apps/web/src/components/features/indicators/builder/EditorFooter.tsx` |
| **TemplateLibraryModal** | Template picker (Phase 3) | `apps/web/src/components/features/indicators/builder/TemplateLibraryModal.tsx` |

---

## Key Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| **useSchemaEditor** | Manage schema editor state for current indicator | `{ indicator, completionStatus, errors, updateFormSchema, updateCalculationSchema, updateRemarkSchema, copySchema, pasteSchema }` |
| **useSchemaTreeNavigation** | Handle tree navigation and indicator selection | `{ selectedIndicatorId, selectIndicator, goToNextIncomplete, progress }` |
| **useAutoSave** | Delta-based auto-save with 3s debounce | `{ saveNow, lastSaved, isSaving, error }` |

**File Paths:**
- `apps/web/src/hooks/useSchemaEditor.ts`
- `apps/web/src/hooks/useSchemaTreeNavigation.ts`
- `apps/web/src/hooks/useAutoSave.ts` (extend existing)

---

## Key State (Zustand Store Extensions)

### New State Fields

```typescript
// Extend apps/web/src/store/useIndicatorBuilderStore.ts

schemaEditorState: {
  expandedNodeIds: Set<string>;                     // Which tree nodes are expanded
  completionStatus: Map<string, SchemaCompletionStatus>;  // Per-indicator status
  validationErrors: Map<string, ValidationError[]>;       // Per-indicator errors
  lastSavedTimestamps: Map<string, number>;               // "Saved 2s ago"
  copiedSchema: CopiedSchema | null;                      // Schema clipboard
}
```

### New Actions

```typescript
// New actions in store.actions

updateSchemaCompletionStatus(indicatorId: string, status: SchemaCompletionStatus): void
copySchema(indicatorId: string, type: 'form' | 'calculation' | 'remark'): void
pasteSchema(indicatorId: string, type: 'form' | 'calculation' | 'remark'): void
toggleNodeExpansion(nodeId: string): void
getNextIncompleteIndicator(): string | null
getSchemaProgress(): { complete: number; total: number; percentage: number }
```

---

## Key API Changes

### Backend Enhancements (No New Endpoints for Phase 1-2)

**Enhanced Endpoint:**
```python
# apps/api/app/services/indicator_draft_service.py

PUT /api/v1/indicator-drafts/:id

# Request payload (delta update):
{
  "changed": [
    { "temp_id": "uuid-123", "form_schema": {...}, "calculation_schema": {...} }
  ],
  "changedIds": ["uuid-123"],
  "version": 5
}

# Response:
{
  "id": "uuid",
  "data": [...],  # Full draft with merged changes
  "version": 6,
  "updated_at": "2025-01-10T10:30:00Z"
}
```

**Delta Merge Logic:**
```python
# If 'changed' in data, merge with existing indicators
existing_indicators = {ind['temp_id']: ind for ind in draft.data}
for changed_ind in data['changed']:
    existing_indicators[changed_ind['temp_id']] = changed_ind
draft.data = list(existing_indicators.values())
```

---

### Phase 3: Template System API

**New Endpoints:**
```python
# apps/api/app/api/v1/schema_templates.py

POST   /api/v1/schema-templates         # Create template
GET    /api/v1/schema-templates         # List templates (filter by type)
DELETE /api/v1/schema-templates/:id     # Delete user template
```

**New Database Table:**
```sql
CREATE TABLE schema_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL,  -- 'form', 'calculation', 'remark'
    schema_data JSONB NOT NULL,
    created_by_user_id INTEGER REFERENCES users(id),
    is_system_template BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Initial render (50 indicators)** | < 300ms | Perceived as instant (< 400ms threshold) |
| **Tree re-render after status update** | < 50ms | No visual lag (60fps = 16ms frame budget) |
| **Indicator switch time** | < 100ms | Instant feedback for user |
| **Auto-save latency** | < 200ms | User shouldn't notice |
| **Memory usage (100 indicators)** | < 50MB | Reasonable browser limit |
| **Lighthouse score** | ≥ 95 | Google performance standards |

---

## Optimization Strategies

### 1. **Memoize Tree Nodes**
```typescript
export const SchemaTreeNode = React.memo(({ node, status, errorCount }) => {
  // ... render logic
}, (prev, next) => (
  prev.node.id === next.node.id &&
  prev.status === next.status &&
  prev.errorCount === next.errorCount
));
```
**Impact:** 5x faster tree updates (200ms → 40ms)

---

### 2. **Delta-Based Auto-Save**
```typescript
// Only save changed indicators
const changedIndicators = Array.from(dirtyIndicatorIds).map(id =>
  store.indicators.get(id)
);

saveDraftMutation.mutate({
  draftId,
  data: { changed: changedIndicators, changedIds: [...dirtyIndicatorIds] },
  version,
});
```
**Impact:** 50x smaller payloads (600 KB → 12 KB)

---

### 3. **Lazy-Load Schema Builders**
```typescript
const FormSchemaBuilder = React.lazy(() => import('./FormSchemaBuilder'));
const CalculationSchemaBuilder = React.lazy(() => import('./CalculationSchemaBuilder'));
```
**Impact:** 33% faster initial load (1.2s → 0.8s)

---

### 4. **Virtualize Tree (react-arborist)**
```typescript
<Tree
  data={treeData}
  height={600}
  overscanCount={10}
  rowHeight={32}
>
  {Node}
</Tree>
```
**Impact:** Handles 200+ indicators smoothly

---

## Status Icon Reference

| Icon | Status | Color | Meaning |
|------|--------|-------|---------|
| ☑ | Complete | Green (`#16a34a`) | All required schemas configured and valid |
| ○ | Incomplete | Gray (`#9ca3af`) | Missing schemas or incomplete configuration |
| ⚠ | Error | Red (`#dc2626`) | Validation errors present |
| ◉ | Current | Blue (`#2563eb`) | Currently selected indicator |

**Accessibility:** Icons provide shape-based redundancy for colorblind users (WCAG 2.1 AA compliant).

---

## User Workflow

```
User enters Step 3
  ↓
System loads draft → renders tree with status icons
  ↓
System auto-selects first incomplete indicator
  ↓
User edits form schema → status updates to "complete" (☑)
  ↓
User clicks different indicator in tree
  ↓
System auto-saves current indicator (delta update, 200ms)
  ↓
System switches to new indicator → editor updates
  ↓
User continues until all indicators complete
  ↓
User clicks "Continue" → navigates to Step 4 (Review & Publish)
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Tab** | Focus tree navigator |
| **Arrow Up/Down** | Navigate tree nodes |
| **Arrow Left/Right** | Collapse/expand parent nodes |
| **Enter** | Select indicator (load in editor) |
| **Space** | Toggle node expansion |
| **Ctrl+S** | Manual save (bypass debounce) |
| **Ctrl+C** | Copy schema from current indicator |
| **Ctrl+V** | Paste schema to current indicator |
| **Ctrl+1/2/3** | Switch tabs (Form / Calculation / Remark) |

---

## Phase Breakdown

### **Phase 1: Core Split-Pane (Week 1-2)**
✅ Split-pane layout (30/70)
✅ Status icon system (☑ ○ ⚠ ◉)
✅ Click-to-switch navigation
✅ Progress tracking footer
✅ Keyboard navigation

**Deliverable:** Users can configure schemas with persistent tree visibility.

---

### **Phase 2: Auto-Save & Validation (Week 3)**
✅ Delta-based auto-save (50x faster)
✅ Real-time validation with error tracking
✅ Copy/paste schema functionality
✅ Keyboard shortcuts (Ctrl+S, Ctrl+C, Ctrl+V)

**Deliverable:** Users experience instant saves and schema reuse.

---

### **Phase 3: Template System (Week 4-5)**
✅ Database table: `schema_templates`
✅ API endpoints for CRUD operations
✅ Template library modal UI
✅ 5 system templates (Attendance Record, Budget Accomplishment, etc.)
✅ Save/use template functionality

**Deliverable:** Users can reuse common schemas via templates.

---

### **Phase 4: Polish & Optimization (Week 6)**
✅ Performance optimization (memoization, lazy-loading)
✅ Accessibility audit (WCAG 2.1 AA)
✅ User acceptance testing (5 MLGOO users)
✅ Bug fixes and refinements

**Deliverable:** Production-ready feature with ≥4.5/5 user satisfaction.

---

## Testing Checklist

### **Unit Tests**
- [ ] Zustand store actions (updateSchemaCompletionStatus, copySchema, pasteSchema)
- [ ] Custom hooks (useSchemaEditor, useSchemaTreeNavigation)
- [ ] Validation logic (validateFormSchema, validateCalculationSchema)
- [ ] Template service (create, list, delete templates) - Phase 3

**Target Coverage:** ≥80% for new code

---

### **Integration Tests**
- [ ] Full wizard flow: Step 1 → Step 2 → Step 3 (split-pane) → Step 4
- [ ] Click indicator in tree → verify editor updates
- [ ] Edit schema → verify auto-save → verify status icon changes
- [ ] Copy schema → paste on different indicator → verify applied
- [ ] Use template → verify schema applied → verify usage count incremented - Phase 3

---

### **Performance Tests**
- [ ] Initial render < 300ms for 50 indicators
- [ ] Indicator switch < 100ms
- [ ] Auto-save latency < 200ms with network throttling (3G)
- [ ] Memory usage < 50 MB during 1-hour session
- [ ] Lighthouse score ≥ 95

---

### **Accessibility Tests**
- [ ] WAVE scan: 0 errors
- [ ] Keyboard navigation 100% functional
- [ ] Screen reader announcements correct
- [ ] Color contrast ≥ 4.5:1 (WCAG 2.1 AA)
- [ ] Focus-visible on all interactive elements

---

## Success Metrics

### **Phase 1 Launch Criteria**
- [ ] Split-pane layout renders correctly
- [ ] Status icons display correctly
- [ ] Click-to-switch navigation works
- [ ] Progress tracking accurate
- [ ] Initial render < 300ms (50 indicators)
- [ ] 5/5 MLGOO users report "much better" than current implementation

---

### **Phase 2 Success Criteria**
- [ ] Delta-based auto-save reduces payload by ≥95%
- [ ] Copy/paste reduces schema duplication time by ≥50%
- [ ] Schema configuration time reduced by ≥37% (8 min → 5 min)
- [ ] Validation catches errors in real-time (not delayed to Step 4)

---

### **Phase 3 Success Criteria**
- [ ] ≥50% of users create at least 1 template
- [ ] ≥30% of indicators use templates
- [ ] Time saved: 10 minutes per indicator set

---

### **Phase 4 Success Criteria**
- [ ] Lighthouse score ≥95
- [ ] UAT: ≥80% success rate, ≥4.5/5 satisfaction
- [ ] Zero critical bugs in production

---

## Common Pitfalls to Avoid

### ❌ **Don't create a new Zustand store**
**Why:** Leads to prop drilling and state sync issues.
**Do Instead:** Extend existing `useIndicatorBuilderStore` with `schemaEditorState`.

---

### ❌ **Don't save full draft on every auto-save**
**Why:** 600 KB payload takes 300ms on slow networks.
**Do Instead:** Use delta-based saves (only changed indicators).

---

### ❌ **Don't render all 50+ tree nodes on status update**
**Why:** Causes 200ms lag.
**Do Instead:** Memoize `SchemaTreeNode` with `React.memo` and selective props.

---

### ❌ **Don't rely on color alone for status icons**
**Why:** Violates WCAG 2.1 (not accessible for colorblind users).
**Do Instead:** Use shape + color (☑ ○ ⚠ ◉).

---

### ❌ **Don't prompt "Save changes?" when switching indicators**
**Why:** Interrupts flow, annoys users.
**Do Instead:** Auto-save before switching.

---

## Quick Start (For Developers)

### **1. Install Dependencies**
```bash
cd apps/web
pnpm add react-arborist  # Tree editor with virtualization
```

### **2. Extend Zustand Store**
```typescript
// apps/web/src/store/useIndicatorBuilderStore.ts
schemaEditorState: {
  expandedNodeIds: new Set<string>(),
  completionStatus: new Map<string, SchemaCompletionStatus>(),
  validationErrors: new Map<string, ValidationError[]>(),
  lastSavedTimestamps: new Map<string, number>(),
  copiedSchema: null,
}
```

### **3. Create Components**
```bash
mkdir -p apps/web/src/components/features/indicators/builder
touch apps/web/src/components/features/indicators/builder/SchemaConfigurationStep.tsx
touch apps/web/src/components/features/indicators/builder/SchemaSplitPane.tsx
touch apps/web/src/components/features/indicators/builder/SchemaTreeNavigator.tsx
touch apps/web/src/components/features/indicators/builder/SchemaTreeNode.tsx
# ... (10 more components)
```

### **4. Create Hooks**
```bash
touch apps/web/src/hooks/useSchemaEditor.ts
touch apps/web/src/hooks/useSchemaTreeNavigation.ts
```

### **5. Enhance Backend Service**
```python
# apps/api/app/services/indicator_draft_service.py

def save_draft(self, db, draft_id, data, version):
    # Add delta merge logic
    if 'changed' in data:
        existing = {ind['temp_id']: ind for ind in draft.data}
        for changed in data['changed']:
            existing[changed['temp_id']] = changed
        draft.data = list(existing.values())
```

### **6. Test**
```bash
cd apps/web
pnpm test src/store/__tests__/useIndicatorBuilderStore.test.ts
pnpm test src/hooks/__tests__/useSchemaEditor.test.tsx
```

---

## Resources

### **Documentation**
- [Full Architecture](./SCHEMA-CONFIGURATION-ARCHITECTURE.md) - Complete technical specification (30+ pages)
- [Implementation Plan](./IMPLEMENTATION-PLAN-SPLIT-PANE.md) - 6-week phased roadmap
- [Expert Recommendations](./EXPERT-RECOMMENDATIONS.md) - UX, Frontend, and Backend expert insights
- [PRD Phase 6](../../docs/prds/prd-phase6-administrative-features.md) - Product requirements

### **External Libraries**
- [react-arborist](https://github.com/brimdata/react-arborist) - Tree editor with virtualization
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility standards
- [React Performance](https://react.dev/learn/render-and-commit) - Official React optimization guide

---

## Contact

**Questions or Feedback?**
- Slack: `#sinag-phase6`
- Email: sinag-dev@dilg.gov.ph
- GitHub Issues: [SINAG Repo Issues](https://github.com/sinag/issues)

---

**Document Status:** Ready for Implementation
**Next Step:** Begin Phase 1 (Week 1-2)
**Maintainers:** SINAG Development Team
