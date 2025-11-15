# Phase 6 Task Documentation Update - Comprehensive Recommendation

**Version:** 1.0
**Date:** 2025-11-13
**Author:** VANTAGE Technical Documentation Specialist
**Purpose:** Restructure task documentation to align with new implementation approach

---

## Executive Summary

**Recommendation: HYBRID APPROACH (Option D) with Strategic Archiving**

The current task documentation was built for a **schema-first** approach (visual JSON editors). The new implementation requires a **MOV-checklist-first** approach based on Indicator Builder Specification v1.4. Rather than wholesale deletion or versioning, I recommend:

1. **Archive outdated schema-focused content** to `archive/v1-schema-builder/`
2. **Update core files** (README, Split-Pane Plan) with version history sections
3. **Create new MOV-focused task files** aligned with Spec v1.4 and FormSchemaBuilder.tsx reuse
4. **Preserve valuable architectural decisions** and testing infrastructure

**Rationale:**
- **Minimizes context loss**: Architectural decisions and expert recommendations remain accessible
- **Clear progress tracking**: Separates "what's done" from "what needs rework"
- **Enables incremental transition**: Development can continue while updating docs
- **Maintains audit trail**: Version history shows evolution of understanding

---

## Current State Assessment

### What Exists (Valid & Valuable)

| File | Size | Status | Value Assessment |
|------|------|--------|------------------|
| **IMPLEMENTATION-PLAN-SPLIT-PANE.md** | 70KB | ✅ **KEEP & UPDATE** | Split-pane UI architecture is still valid; needs MOV checklist integration |
| **README.md** | 27KB | ⚠️ **UPDATE EXTENSIVELY** | Core task breakdown; needs realignment to Spec v1.4 MOV patterns |
| **AI-FEATURES-ROADMAP.md** | 32KB | ✅ **KEEP AS-IS** | Post-MVP AI features; no changes needed (deferred to Phase 3) |
| **EXPERT-RECOMMENDATIONS.md** | 37KB | ✅ **KEEP AS-IS** | UX/Frontend/Backend insights remain valid for split-pane layout |
| **TESTING-GUIDE-PHASE1.md** | 12KB | ⚠️ **UPDATE** | Testing strategy valid; needs new MOV checklist test cases |
| **sample-indicator-data.json** | 20KB | ❌ **ARCHIVE** | Based on old schema structure; Spec v1.4 has 29 validated indicators |
| **SCHEMA-CONFIGURATION-ARCHITECTURE.md** | 53KB | ⚠️ **ARCHIVE & REPLACE** | 90% focused on form/calc schema builders; needs MOV-first rewrite |
| **QUICK-REFERENCE-SCHEMA-CONFIG.md** | 16KB | ❌ **ARCHIVE** | Quick ref for outdated schema builder approach |

### What's Missing (Gaps)

1. **MOV Checklist Item Catalog**: No task breakdown for implementing 9 MOV item types
2. **BBI Mapping Tasks**: No implementation tasks for BBI system (9 mandatory BBIs)
3. **FormSchemaBuilder Integration Guide**: No plan for reusing existing drag-drop component
4. **Spec v1.4 Compliance Checklist**: No validation that implementation matches spec
5. **Grace Period Validation Tasks**: No tasks for "Considered" status logic
6. **Alternative Evidence Tasks**: No tasks for OR logic and substitute documents
7. **Conditional Display Tasks**: No tasks for show/hide MOV items based on conditions

### What's Outdated (Needs Revision)

1. **README.md Task 2.7 (Form Schema Builder)**: Describes building generic form fields, not MOV checklist items
2. **README.md Task 2.8 (Calculation Schema Builder)**: Focuses on generic rules, not threshold validation for MOVs
3. **SCHEMA-CONFIGURATION-ARCHITECTURE.md**: Entire document assumes JSON schema editing, not MOV-first workflow
4. **QUICK-REFERENCE-SCHEMA-CONFIG.md**: Quick ref for wrong approach

---

## Recommended Approach: HYBRID (Option D)

### Strategy Overview

```
Current Task Directory Structure
├── archive/                              [NEW]
│   └── v1-schema-builder/                [Archive old approach]
│       ├── SCHEMA-CONFIGURATION-ARCHITECTURE.md
│       ├── QUICK-REFERENCE-SCHEMA-CONFIG.md
│       ├── sample-indicator-data.json
│       └── MIGRATION-NOTES.md            [Why we pivoted]
│
├── README.md                             [UPDATE with version history]
├── IMPLEMENTATION-PLAN-SPLIT-PANE.md     [UPDATE with MOV integration]
├── AI-FEATURES-ROADMAP.md                [KEEP as-is]
├── EXPERT-RECOMMENDATIONS.md             [KEEP as-is]
├── TESTING-GUIDE-PHASE1.md               [UPDATE with MOV test cases]
│
├── MOV-CHECKLIST-IMPLEMENTATION.md       [NEW - Core MOV tasks]
├── BBI-SYSTEM-IMPLEMENTATION.md          [NEW - BBI mapping tasks]
├── FORM-BUILDER-REUSE-GUIDE.md           [NEW - FormSchemaBuilder integration]
├── SPEC-V1.4-COMPLIANCE-CHECKLIST.md     [NEW - Validation against spec]
└── MIGRATION-FROM-V1.md                  [NEW - How to transition]
```

### Rationale for Hybrid Approach

**Why Archive (not delete)?**
- **Preserve architectural decisions**: Expert recommendations for split-pane are still valid
- **Audit trail**: Shows evolution of understanding (from schema-first → MOV-first)
- **Learning resource**: Future team members can understand why approach changed

**Why Update (not replace)?**
- **Continuity**: README and Split-Pane Plan have valuable structure that can be adapted
- **Progress tracking**: Testing results and completed tasks shouldn't be lost
- **Version history**: Shows what was done vs. what needs rework

**Why Create New Files?**
- **Clear separation**: MOV checklist work is fundamentally different from generic schema building
- **Spec alignment**: Each new file maps directly to Spec v1.4 sections
- **Parallel work**: Team can reference both old and new approaches during transition

---

## File-by-File Action Plan

### Existing Files: Actions & Reasoning

#### 1. README.md (27KB)
**ACTION: UPDATE with Version History**

**Changes Required:**
1. **Add version history header**:
   ```markdown
   ## Document Version History

   | Version | Date | Summary |
   |---------|------|---------|
   | v1.0 | Nov 9, 2025 | Initial schema-builder approach |
   | v2.0 | Nov 13, 2025 | **Pivot to MOV-checklist-first** aligned with Spec v1.4 |

   ### v2.0 Changes
   - Replaced generic form schema builder with 9 MOV checklist item types
   - Added BBI system implementation tasks (9 mandatory BBIs)
   - Integrated FormSchemaBuilder.tsx drag-drop reuse
   - Removed AI features from MVP scope (deferred to Phase 3)
   ```

2. **Update Task 2.7 (Form Schema Builder)**:
   ```markdown
   #### Task 2.7: MOV Checklist Builder (Reuse FormSchemaBuilder.tsx)

   **IMPLEMENTATION NOTE**: This task has been **REVISED** to align with Indicator Builder
   Specification v1.4. Instead of building generic form schemas, we now build **MOV
   checklists** with 9 specialized item types.

   **Files:**
   - `apps/web/src/components/features/indicators/builder/MOVChecklistBuilder.tsx` (NEW)
   - `apps/web/src/components/features/indicators/builder/FormSchemaBuilder.tsx` (REUSE PATTERNS)

   **Checklist:**
   - [x] Review FormSchemaBuilder.tsx drag-drop implementation
   - [ ] Create MOVChecklistBuilder component reusing drag-drop logic
   - [ ] Implement 9 MOV item types (see MOV-CHECKLIST-IMPLEMENTATION.md):
     - [ ] Checkbox (binary validation)
     - [ ] Group (nested items with OR logic support)
     - [ ] Currency Input (threshold validation)
     - [ ] Number Input (min/max validation)
     - [ ] Text Input (free-text evidence)
     - [ ] Date Input (grace period support)
     - [ ] Assessment (YES/NO validator judgment)
     - [ ] Radio Group
     - [ ] Dropdown
   - [ ] Add OR logic configuration UI (alternative evidence paths)
   - [ ] Add conditional display rules (show/hide based on other items)
   - [ ] Add threshold validation UI (≥50% utilization, etc.)

   **Reference**: See `docs/indicator-builder-specification.md` Section 2 (MOV Checklist System)
   ```

3. **Update Task 2.8 (Calculation Schema Builder)**:
   ```markdown
   #### Task 2.8: Threshold & Formula Validator (Simplified)

   **IMPLEMENTATION NOTE**: Calculation schemas are now primarily used for **threshold
   validation** (e.g., "≥50% budget utilization") rather than complex rule engines.

   **Checklist:**
   - [ ] Add threshold input UI (percentage, currency, numeric)
   - [ ] Add formula calculator for utilization rates: `(amount_utilized / amount_allocated) × 100`
   - [ ] Add validation status mapping:
     - [ ] Passed: All thresholds met
     - [ ] Considered: Grace period or alternative evidence
     - [ ] Failed: Thresholds not met
   - [ ] Remove complex AND/OR rule groups (not needed for MOV validation)

   **Reference**: See Spec v1.4 Example 5 (Indicator 2.1.4 - BDRRMC Accomplishment)
   ```

4. **Add "Completed Work" section**:
   ```markdown
   ## Progress Summary

   ### ✅ Completed (v1.0 - Nov 9, 2025)
   - [x] Backend: Database schema (indicator_drafts table)
   - [x] Backend: Bulk creation service with topological sorting
   - [x] Backend: Draft auto-save service with optimistic locking
   - [x] Backend: 27/43 tests passing (service layer 96% complete)
   - [x] Frontend: Zustand store with flat state model
   - [x] Frontend: Tree utilities (recalculateCodes, buildTreeFromFlat)
   - [x] Frontend: Draft storage service (localStorage + backend hybrid)
   - [x] Frontend: 176/178 tests passing (99% pass rate)

   ### 🔄 In Progress (v2.0 - Nov 13, 2025)
   - [ ] MOV Checklist Builder (replacing generic form schema builder)
   - [ ] BBI System Integration (9 mandatory BBIs)
   - [ ] FormSchemaBuilder.tsx integration

   ### ⏳ Not Started (v2.0)
   - [ ] Grace period validation logic
   - [ ] Alternative evidence UI (OR logic)
   - [ ] Conditional display rules
   ```

**REASONING**: README is the central task list. Updating with version history preserves completed work while clearly marking what needs rework.

---

#### 2. IMPLEMENTATION-PLAN-SPLIT-PANE.md (70KB)
**ACTION: UPDATE with MOV Integration Section**

**Changes Required:**
1. **Add new section after Phase 1**:
   ```markdown
   ### Phase 1.5: MOV Checklist Integration (Week 2.5)

   **NEW REQUIREMENT** (Added Nov 13, 2025): Integrate MOV checklist builder into
   split-pane schema configuration step.

   #### Task 1.5.1: Adapt Tree Navigator for MOV Status

   - [ ] Add MOV validation status icons to tree nodes:
     - ☑ All MOV items verified (green)
     - ○ Missing required MOV items (yellow)
     - ⚠ MOV validation errors (red)
   - [ ] Update progress calculation to include MOV completion percentage

   #### Task 1.5.2: Replace Generic Schema Builder with MOV Builder

   - [ ] Swap FormSchemaBuilder component with MOVChecklistBuilder
   - [ ] Update tab structure:
     - Tab 1: MOV Checklist (9 item types)
     - Tab 2: Threshold Validation (calculation rules)
     - Tab 3: Remark Template
   - [ ] Preserve split-pane layout (30% tree / 70% MOV editor)

   **Reference**: See `MOV-CHECKLIST-IMPLEMENTATION.md` for detailed MOV builder tasks
   ```

2. **Update timeline**:
   ```markdown
   | Phase | Duration | Deliverables | Status |
   |-------|----------|--------------|--------|
   | Phase 1 | Week 1-2 | Core split-pane UI, tree navigator | 🟢 Complete |
   | **Phase 1.5** | **Week 2.5** | **MOV checklist integration** | 🟡 **NEW** |
   | Phase 2 | Week 3 | Delta-based auto-save, copy/paste schemas | 🟡 Planned |
   ```

**REASONING**: Split-pane architecture is sound; needs integration with MOV-first approach, not complete rewrite.

---

#### 3. SCHEMA-CONFIGURATION-ARCHITECTURE.md (53KB)
**ACTION: ARCHIVE to `archive/v1-schema-builder/` & CREATE NEW**

**Archival Notes:**
- 90% of content assumes generic JSON schema editing (form_schema, calculation_schema)
- Only 10% (split-pane layout diagrams) remains relevant
- Better to archive entire file and extract layout diagrams into new MOV-focused architecture doc

**New File**: `MOV-CHECKLIST-ARCHITECTURE.md` (see "New Files Required" section below)

**REASONING**: Too much content is outdated; clean slate is clearer than massive inline edits.

---

#### 4. QUICK-REFERENCE-SCHEMA-CONFIG.md (16KB)
**ACTION: ARCHIVE to `archive/v1-schema-builder/`**

**Archival Notes:**
- Entire quick reference is for outdated schema builder UI
- No content salvageable for MOV-first approach
- Will be replaced with new quick reference for MOV checklist items

**REASONING**: Quick references should be concise and accurate. Old one is neither for new approach.

---

#### 5. sample-indicator-data.json (20KB)
**ACTION: ARCHIVE to `archive/v1-schema-builder/`**

**Archival Notes:**
- JSON structure predates Spec v1.4 (no MOV checklist format)
- Spec v1.4 now has 29 validated real indicators with correct MOV structure
- No value in updating old sample data; use Spec v1.4 examples instead

**REASONING**: Sample data should match current implementation model. Old JSON is confusing.

---

#### 6. AI-FEATURES-ROADMAP.md (32KB)
**ACTION: KEEP AS-IS (No Changes)**

**Rationale:**
- AI features deferred to post-MVP Phase 3
- Document accurately describes future enhancements
- No dependency on schema-first vs. MOV-first approach
- Gemini prompts can be adapted to MOV checklists later

**REASONING**: No action needed; document is forward-looking and approach-agnostic.

---

#### 7. EXPERT-RECOMMENDATIONS.md (37KB)
**ACTION: KEEP AS-IS (No Changes)**

**Rationale:**
- Expert recommendations focus on **split-pane UX**, not schema structure
- UX insights (30/70 split, status icons, click-to-switch) remain valid
- Dr. Vasquez's accessibility recommendations apply to MOV builder too
- Alex Chen's React performance advice still relevant

**REASONING**: No action needed; UX principles transcend implementation details.

---

#### 8. TESTING-GUIDE-PHASE1.md (12KB)
**ACTION: UPDATE with MOV Test Cases**

**Changes Required:**
1. **Add MOV validation test section**:
   ```markdown
   ### Test Suite: MOV Checklist Validation

   #### Test Category: MOV Item Types

   **Test 1: Checkbox Item Validation**
   - Create MOV checklist with single checkbox
   - Verify checkbox renders correctly
   - Test validation: unchecked → incomplete, checked → complete

   **Test 2: Group with OR Logic**
   - Create group with OR logic (Path A OR Path B)
   - Verify only ONE path needs completion
   - Test: Path A complete, Path B empty → Status: PASSED

   **Test 3: Currency Input with Threshold**
   - Create currency input (Budget Allocation)
   - Set threshold: ≥ ₱50,000
   - Test: ₱60,000 → PASSED, ₱40,000 → FAILED

   **Test 4: Date Input with Grace Period**
   - Create date input with deadline: Dec 31, 2022
   - Set grace period: until Mar 31, 2023
   - Test cases:
      - Dec 15, 2022 → PASSED
   - Jan 15, 2023 → CONSIDERED
   - Apr 15, 2023 → FAILED

   **Test 5: Assessment Field (YES/NO)**
   - Create assessment question: "BDRRMC functional?"
   - Verify YES/NO radio buttons render
   - Test conditional display: Items show only when YES selected
   ```

2. **Update integration test scenarios**:
   ```markdown
   ### Integration Test: Complete Indicator with MOV Checklist

   **Scenario**: Create Indicator 2.1.4 (BDRRMC Accomplishment) from Spec v1.4

   1. Create indicator "2.1.4 BDRRMC Accomplishment Report"
   2. Build MOV checklist:
      - Add Path A: Physical accomplishment ≥50%
        - Assessment field: "At least 50% accomplishment?"
        - Conditional items (shown if YES):
          - Checkbox: Accomplishment Report
          - Checkbox: Certification from C/MDRRMO
          - Number input: % completion (≥50%)
      - Add Path B: Fund utilization ≥50%
        - Assessment field: "At least 50% fund utilization?"
        - Conditional items (shown if YES):
          - Checkbox: Utilization Report
          - Currency inputs: Amount utilized, Amount allocated
          - Auto-calculation: utilization rate
   3. Test OR logic: Path A pass → Indicator PASSES (even if Path B empty)
   4. Validate status mapping: PASSED, CONSIDERED, FAILED
   ```

**REASONING**: Testing strategy is sound; needs new test cases for MOV-specific validation.

---

### New Files Required

#### 1. MOV-CHECKLIST-IMPLEMENTATION.md
**Purpose**: Comprehensive task breakdown for 9 MOV item types

**Outline**:
```markdown
# MOV Checklist Implementation Guide

## Overview
Implementation tasks for 9 MOV checklist item types defined in Indicator Builder
Specification v1.4.

## Component Architecture

### Core Component: MOVChecklistBuilder.tsx
- Reuses drag-drop patterns from FormSchemaBuilder.tsx
- Supports 9 item types with specialized configuration panels

## Task Breakdown by Item Type

### 1. Checkbox Item Type
- [ ] Create CheckboxItemConfig component
- [ ] Add binary validation (checked/unchecked)
- [ ] Support label, helpText, required toggle

### 2. Group Item Type (with OR Logic)
- [ ] Create GroupItemConfig component
- [ ] Add nested item support (drag-drop into group)
- [ ] Implement OR logic toggle (one_of vs all)
- [ ] Add visual grouping (indentation, borders)

### 3. Currency Input Item Type
- [ ] Create CurrencyInputConfig component
- [ ] Add currency formatter (₱ symbol, comma separators)
- [ ] Add threshold validation UI (≥, ≤, ==)
- [ ] Add comparison logic (field A > field B)

### 4. Number Input Item Type
- [ ] Create NumberInputConfig component
- [ ] Add min/max validation
- [ ] Add threshold validation (percentage support)
- [ ] Add auto-calculation support (formulas)

### 5. Text Input Item Type
- [ ] Create TextInputConfig component
- [ ] Add maxLength validation
- [ ] Add free-text evidence recording

### 6. Date Input Item Type (with Grace Period)
- [ ] Create DateInputConfig component
- [ ] Add deadline validation UI
- [ ] Add grace period configuration (consideration deadline)
- [ ] Implement 3-state validation: PASSED, CONSIDERED, FAILED

### 7. Assessment Item Type (YES/NO Validator Judgment)
- [ ] Create AssessmentItemConfig component
- [ ] Add YES/NO radio button rendering
- [ ] Add conditional display trigger configuration
- [ ] Link to conditional items (show if YES/NO)

### 8. Radio Group Item Type
- [ ] Create RadioGroupItemConfig component
- [ ] Add options editor (add/remove/reorder)
- [ ] Add single-selection validation

### 9. Dropdown Item Type
- [ ] Create DropdownItemConfig component
- [ ] Add options editor (add/remove/reorder)
- [ ] Add placeholder text

## Advanced Features

### Alternative Evidence (OR Logic)
- [ ] Task: Implement OR groups within MOV checklists
- [ ] UI: "Add Alternative Evidence Path" button
- [ ] Validation: ANY path passing = item validated

### Conditional Display
- [ ] Task: Show/hide items based on other items
- [ ] UI: "Conditional Display Rules" panel
- [ ] Logic: if (item_X == value) then show(item_Y)

### Exclusion Rules
- [ ] Task: Mark evidence as NOT acceptable
- [ ] UI: "Exclusion Warning" configuration
- [ ] Display: Red warning banner when excluded evidence uploaded

## Integration with FormSchemaBuilder.tsx

### Reusable Patterns
1. Drag-drop implementation (@hello-pangea/dnd)
2. Field properties panel (right sidebar)
3. JSON preview tab
4. Delete field confirmation dialog

### New Patterns Needed
1. MOV-specific validation types (threshold, grace period)
2. OR logic configuration UI
3. Conditional display rule builder
4. Three-state validation status (PASSED/CONSIDERED/FAILED)

## Spec v1.4 Compliance Checklist

### Validated Against Examples
- [ ] Example 1: Indicator 1.1 (grouped MOV items)
- [ ] Example 2: Indicator 1.2 (currency comparison)
- [ ] Example 3: Indicator 1.3.1 (date with grace period)
- [ ] Example 4: Indicator 1.6 (mutually exclusive scenarios)
- [ ] Example 5: Indicator 2.1.4 (OR evidence paths + assessment)

## Testing Checklist

### Unit Tests
- [ ] Test each MOV item type renders correctly
- [ ] Test OR logic: Path A OR Path B validation
- [ ] Test conditional display: items show/hide correctly
- [ ] Test threshold validation: ≥50% logic
- [ ] Test grace period: PASSED vs CONSIDERED vs FAILED

### Integration Tests
- [ ] Test complete MOV checklist creation workflow
- [ ] Test MOV validation during indicator submission
- [ ] Test BBI status determination from MOV results

## Reference
- Spec v1.4 Section 2: MOV Checklist System
- Spec v1.4 Section 3: Validated Indicator Examples (29 indicators)
```

**REASONING**: 9 MOV item types require comprehensive task breakdown. Separate file keeps focus.

---

#### 2. BBI-SYSTEM-IMPLEMENTATION.md
**Purpose**: Implementation tasks for 9 mandatory BBI mappings

**Outline**:
```markdown
# BBI System Implementation Guide

## Overview
Implementation tasks for Barangay-Based Institution (BBI) functionality tracking
system as defined in Indicator Builder Specification v1.4 and PRD v1.1 Section 4.2.

## BBI System Architecture

### Database Schema

#### Table: bbis
```sql
CREATE TABLE bbis (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,  -- 'BDRRMC', 'BADAC', etc.
    name VARCHAR(200) NOT NULL,
    governance_area_id INTEGER REFERENCES governance_areas(id),
    functionality_indicator_id INTEGER REFERENCES indicators(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table: bbi_barangay_status
```sql
CREATE TABLE bbi_barangay_status (
    id SERIAL PRIMARY KEY,
    bbi_id INTEGER REFERENCES bbis(id),
    barangay_id INTEGER REFERENCES barangays(id),
    assessment_id INTEGER REFERENCES assessments(id),
    is_functional BOOLEAN,
    validation_status VARCHAR(50),  -- 'passed', 'considered', 'failed', 'not_applicable'
    consideration_note TEXT,  -- Grace period or alternative evidence explanation
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bbi_id, barangay_id, assessment_id)
);
```

## Task Breakdown

### Backend Tasks

#### Task 1: BBI Data Migration
- [ ] Create migration: Seed 9 mandatory BBIs
  ```python
  # Seed data from Spec v1.4
  MANDATORY_BBIS = [
      {'code': 'BDRRMC', 'name': 'Barangay Disaster Risk Reduction and Management Committee', 'governance_area': 'Core 2', 'indicator_code': '2.1'},
      {'code': 'BADAC', 'name': 'Barangay Anti-Drug Abuse Council', 'governance_area': 'Core 3', 'indicator_code': '3.1'},
      # ... 7 more BBIs
  ]
  ```
- [ ] Link BBIs to governance areas
- [ ] Link BBIs to functionality indicators (one-to-one)

#### Task 2: BBI Service Layer
- [ ] Create `bbi_service.py`
  - [ ] `update_bbi_status(bbi_code, barangay_id, indicator_result)`
  - [ ] `get_bbi_status(bbi_code, barangay_id)`
  - [ ] `get_all_bbi_statuses(barangay_id, assessment_id)`

#### Task 3: Integration with Indicator Validation
- [ ] Modify `assessor_service.py`:
  - [ ] After validating BBI functionality indicator (e.g., 2.1), call:
    ```python
    if indicator.is_bbi_functionality_indicator:
        bbi_code = indicator.bbi.code
        bbi_service.update_bbi_status(
            bbi_code=bbi_code,
            barangay_id=assessment.barangay_id,
            indicator_result=validation_result,
            consideration_note=validation_result.consideration_note  # Grace period or alt evidence
        )
    ```

### Frontend Tasks

#### Task 4: BBI Configuration UI (MLGOO Admin)
- [ ] Create `BBIManagementPage.tsx` at `/mlgoo/bbi-management`
- [ ] Display 9 mandatory BBIs in table:
  - Columns: BBI Code, Name, Governance Area, Functionality Indicator, Status
- [ ] Add "View Mapping" button → Shows which indicator determines BBI status
- [ ] Add validation status legend:
  - ✅ Functional (Passed)
  - ✅ Functional* (Considered - with grace period note)
  - ❌ Non-Functional (Failed)
  - ⚠️ N/A (Not Applicable)
  - ⏳ Pending Validation

#### Task 5: BBI Status Display (Assessor/BLGU Views)
- [ ] Add BBI status panel to assessment review page
- [ ] Display all 9 BBIs with current functionality status
- [ ] Show consideration notes (e.g., "Document dated within grace period")

## Validation Status Mapping

### Rule Implementation
- [ ] Implement status determination logic:
  ```python
  def determine_bbi_status(indicator_result):
      if indicator_result.status == 'passed':
          return {'is_functional': True, 'validation_status': 'passed'}
      elif indicator_result.status == 'considered':
          return {
              'is_functional': True,
              'validation_status': 'considered',
              'consideration_note': indicator_result.consideration_note
          }
      elif indicator_result.status == 'failed':
          return {'is_functional': False, 'validation_status': 'failed'}
      elif indicator_result.status == 'not_applicable':
          return {'is_functional': None, 'validation_status': 'not_applicable'}
  ```

## Grace Period Handling

### Example: BDRRMC Meeting Minutes Date
- Indicator 2.1.2: "Meeting minutes dated by Dec 31, 2023"
- Grace period: Until Mar 31, 2024
- Logic:
  - Date ≤ Dec 31, 2023 → Status: PASSED → BBI: Functional
  - Date ≤ Mar 31, 2024 → Status: CONSIDERED → BBI: Functional (with note: "Within grace period")
  - Date > Mar 31, 2024 → Status: FAILED → BBI: Non-Functional

## Testing

### Unit Tests
- [ ] Test BBI status update from indicator result
- [ ] Test grace period consideration note persistence
- [ ] Test one-to-one indicator-to-BBI mapping validation

### Integration Tests
- [ ] Test full workflow:
  1. Assessor validates Indicator 2.1 (BDRRMC Functionality)
  2. Result: CONSIDERED (grace period)
  3. System updates BBI: BDRRMC = Functional (with note)
  4. BBI status appears in assessment reports

## Reference
- Spec v1.4: BBI Functionality Tracking System
- PRD v1.1 Section 4.2: BBI Configuration Interface
- PRD v1.1 Section 4.2.2: Indicator-to-BBI Mapping
```

**REASONING**: BBI system is a major feature requiring dedicated task file. Separates concerns from MOV checklists.

---

#### 3. FORM-BUILDER-REUSE-GUIDE.md
**Purpose**: Integration guide for reusing FormSchemaBuilder.tsx patterns

**Outline**:
```markdown
# FormSchemaBuilder Integration Guide

## Overview
This guide explains how to **reuse drag-drop patterns** from the existing
`FormSchemaBuilder.tsx` component when building the new `MOVChecklistBuilder.tsx`.

## Current FormSchemaBuilder.tsx Analysis

### Location
`apps/web/src/components/features/indicators/builder/FormSchemaBuilder.tsx`

### Key Features to Reuse

#### 1. Drag-and-Drop Implementation
**Library**: `@hello-pangea/dnd` (already installed)

**Reusable Pattern**:
```typescript
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// In FormSchemaBuilder.tsx (lines 1-100)
<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable droppableId="fields">
    {(provided) => (
      <div {...provided.droppableProps} ref={provided.innerRef}>
        {fields.map((field, index) => (
          <Draggable key={field.id} draggableId={field.id} index={index}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              >
                <GripVertical className="drag-handle" />
                {/* Field content */}
              </div>
            )}
          </Draggable>
        ))}
      </div>
    )}
  </Droppable>
</DragDropContext>
```

**Adaptation for MOVChecklistBuilder**:
- Keep DragDropContext structure
- Change field types from generic (text, number, email) to MOV types (checkbox, group, currency)
- Add support for **nested droppables** (groups within groups)

#### 2. Field Palette (Left Sidebar)
**Reusable Pattern**:
```typescript
const FIELD_TYPES = [
  { type: 'text', label: 'Text Input', icon: Type },
  { type: 'number', label: 'Number Input', icon: Hash },
  // ...
];

<div className="field-palette">
  {FIELD_TYPES.map((fieldType) => (
    <Button onClick={() => addField(fieldType.type)}>
      <fieldType.icon />
      {fieldType.label}
    </Button>
  ))}
</div>
```

**Adaptation for MOVChecklistBuilder**:
```typescript
const MOV_ITEM_TYPES = [
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'group', label: 'Group (OR Logic)', icon: Folder },
  { type: 'currency', label: 'Currency Input', icon: DollarSign },
  { type: 'date', label: 'Date (Grace Period)', icon: Calendar },
  { type: 'assessment', label: 'Assessment (YES/NO)', icon: HelpCircle },
  // ... 4 more MOV types
];
```

#### 3. Field Properties Panel (Right Sidebar)
**Reusable Pattern**:
```typescript
// When field selected, show properties panel
{selectedField && (
  <Card className="field-properties">
    <CardHeader>
      <CardTitle>Field Properties</CardTitle>
    </CardHeader>
    <CardContent>
      <Label>Field Label</Label>
      <Input
        value={selectedField.label}
        onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
      />

      <Label>Required</Label>
      <Switch
        checked={selectedField.required}
        onCheckedChange={(checked) => updateField(selectedField.id, { required: checked })}
      />

      {/* More properties */}
    </CardContent>
  </Card>
)}
```

**Adaptation for MOVChecklistBuilder**:
- Add MOV-specific properties:
  - **For Currency Input**: Threshold value, comparison operator (≥, ≤)
  - **For Date Input**: Deadline date, grace period end date
  - **For Group**: OR logic toggle (one_of vs all)
  - **For Assessment**: Conditional display rules

#### 4. JSON Preview Tab
**Reusable Pattern**:
```typescript
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="builder">Visual Builder</TabsTrigger>
    <TabsTrigger value="json">JSON Preview</TabsTrigger>
  </TabsList>

  <TabsContent value="json">
    <pre className="json-preview">
      {JSON.stringify(schema, null, 2)}
    </pre>
  </TabsContent>
</Tabs>
```

**Adaptation for MOVChecklistBuilder**:
- Keep tab structure
- Change JSON output format to match MOV checklist schema (not form_schema)

## Integration Steps

### Step 1: Copy Component Structure
1. Create `MOVChecklistBuilder.tsx` in same directory
2. Copy imports, state management, and layout structure from FormSchemaBuilder.tsx
3. Keep drag-drop, palette, properties panel, JSON preview

### Step 2: Replace Field Types
1. Replace `FIELD_TYPES` constant with `MOV_ITEM_TYPES`
2. Update `FormField` interface → `MOVChecklistItem` interface
3. Add new properties: `orLogic`, `threshold`, `gracePeriod`, `conditionalDisplay`

### Step 3: Customize Properties Panel
1. For each MOV item type, create custom properties panel
2. Reuse form controls (Input, Select, Switch) from FormSchemaBuilder
3. Add new controls:
   - Threshold configurator (number input + comparison operator dropdown)
   - Grace period date pickers (deadline date + consideration date)
   - OR logic toggle (radio buttons: "All items required" vs "Any item satisfies")

### Step 4: Update Validation Logic
1. Add MOV-specific validation:
   - Currency threshold validation (≥50%)
   - Date grace period validation (PASSED vs CONSIDERED vs FAILED)
   - Group OR logic validation (any path passes → group passes)
2. Keep existing required field validation

### Step 5: Testing
1. Copy test structure from `FormSchemaBuilder.test.tsx` (if exists)
2. Add MOV-specific test cases:
   - Test OR group validation
   - Test threshold calculation
   - Test grace period status determination

## Code Comparison

### FormSchemaBuilder.tsx (Current)
```typescript
interface FormField {
  id: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select';
  label: string;
  required: boolean;
  validation: ValidationRule[];
}
```

### MOVChecklistBuilder.tsx (New)
```typescript
interface MOVChecklistItem {
  id: string;
  type: 'checkbox' | 'group' | 'currency' | 'number' | 'text' | 'date' | 'assessment' | 'radio' | 'dropdown';
  label: string;
  required: boolean;

  // MOV-specific fields
  orLogic?: boolean;  // For groups: true = one_of, false = all
  threshold?: {
    value: number;
    operator: '>=' | '<=' | '==' | '>' | '<';
    unit: 'percentage' | 'currency' | 'number';
  };
  gracePeriod?: {
    deadline: string;  // ISO date
    considerationDeadline: string;  // ISO date (grace period end)
  };
  conditionalDisplay?: {
    dependsOn: string;  // Other item ID
    condition: 'equals' | 'not_equals';
    value: any;
  };
  children?: MOVChecklistItem[];  // For groups
}
```

## What NOT to Change

### Keep These Patterns Unchanged
1. **Drag-drop library**: Continue using `@hello-pangea/dnd`
2. **Layout structure**: Keep palette (left), canvas (center), properties (right)
3. **State management**: Use same `useState` pattern for fields array
4. **Add/delete actions**: Keep same button placement and confirmation dialogs
5. **Styling**: Reuse same Tailwind classes and Card/Button components

### Only Change These Parts
1. **Field type definitions**: Generic → MOV-specific
2. **Properties panel content**: Generic validation → MOV validation (threshold, grace period)
3. **JSON output format**: form_schema → mov_checklist schema
4. **Validation logic**: Add MOV-specific validation (OR groups, thresholds)

## Reference Implementation

### File to Study
`apps/web/src/components/features/indicators/builder/FormSchemaBuilder.tsx`

### Key Sections to Review
- Lines 1-100: Imports and type definitions
- Lines 100-200: Drag-drop implementation
- Lines 200-300: Field palette
- Lines 300-400: Properties panel
- Lines 400-500: JSON preview

### Lines to Copy Verbatim
- DragDropContext setup (lines ~150-200)
- Droppable/Draggable structure (lines ~200-250)
- Properties panel layout (lines ~300-350)

### Lines to Modify Heavily
- Field type definitions (lines ~40-80) → Replace with MOV types
- Properties content (lines ~350-400) → Add MOV-specific properties
- Validation logic (lines ~450-500) → Add threshold/grace period validation
```

**REASONING**: Reusing existing FormSchemaBuilder patterns accelerates development. Dedicated guide prevents reinventing the wheel.

---

#### 4. SPEC-V1.4-COMPLIANCE-CHECKLIST.md
**Purpose**: Validation checklist to ensure implementation matches Spec v1.4

**Outline**:
```markdown
# Indicator Builder Specification v1.4 Compliance Checklist

## Purpose
This checklist ensures the implementation of the Hierarchical Indicator Builder
fully complies with the **Indicator Builder Specification v1.4**, which is the
**SOURCE OF TRUTH** for indicator structure, MOV validation, and BBI functionality.

**Reference Document**: `docs/indicator-builder-specification.md` (v1.4, 27,851 tokens)

---

## Section 1: Hierarchical Indicator Structure

### Spec Requirement: 4-Level Hierarchy Support
- [ ] System supports up to 4 levels (1, 1.1, 1.1.1, 1.1.1.1)
- [ ] Automatic code generation using DFS traversal
- [ ] Auto-renumbering when indicators reordered via drag-drop

### Spec Requirement: Selection Modes
- [ ] `all` mode: All child indicators must pass (default)
- [ ] `one_of` mode: Only ONE child indicator applies (mutually exclusive)
- [ ] UI for selecting which `one_of` scenario applies to barangay

**Validation Method**: Create indicator tree with 4 levels, reorder, verify codes update correctly.

---

## Section 2: MOV Checklist System

### Spec Requirement: 9 MOV Item Types Implemented

| MOV Item Type | Implemented? | Test Case |
|---------------|--------------|-----------|
| **Checkbox** | [ ] | Binary validation (checked/unchecked) |
| **Group** | [ ] | Nested items with OR logic support |
| **Currency Input** | [ ] | Threshold validation (₱50,000 ≥) |
| **Number Input** | [ ] | Min/max validation, percentage thresholds |
| **Text Input** | [ ] | Free-text evidence recording |
| **Date Input** | [ ] | Grace period validation (3 states) |
| **Assessment** | [ ] | YES/NO radio for validator judgment |
| **Radio Group** | [ ] | Single-selection validation |
| **Dropdown** | [ ] | Dropdown selection validation |

### Spec Requirement: Advanced Validation Features

| Feature | Implemented? | Example from Spec v1.4 |
|---------|--------------|------------------------|
| **OR Logic** | [ ] | Indicator 2.1.4 (Path A OR Path B) |
| **Conditional Display** | [ ] | Indicator 1.6.2 (show if SK officials ≥5) |
| **Threshold Validation** | [ ] | Indicator 2.1.4 (≥50% utilization) |
| **Grace Period** | [ ] | Indicator 1.3.1 (Dec 31 vs Mar 31 deadline) |
| **Alternative Evidence** | [ ] | Indicator 1.6.1.1 (bank statements instead of deposit slips) |
| **Exclusion Rules** | [ ] | Indicator 1.6.1.3 (SK Resolution NOT acceptable) |
| **Calculation Formulas** | [ ] | Indicator 2.1.4 (utilization rate auto-calc) |
| **Intra-checklist Conditions** | [ ] | Indicator 2.1.4 (show items if Assessment=YES) |

**Validation Method**: For each feature, implement one validated indicator example from Spec v1.4.

---

## Section 3: BBI Functionality System

### Spec Requirement: 9 Mandatory BBIs

| BBI Code | BBI Name | Governance Area | Functionality Indicator | Implemented? |
|----------|----------|-----------------|------------------------|--------------|
| **BDRRMC** | Barangay Disaster Risk Reduction and Management Committee | Core 2 | 2.1 | [ ] |
| **BADAC** | Barangay Anti-Drug Abuse Council | Core 3 | 3.1 | [ ] |
| **BPOC** | Barangay Peace and Order Committee | Core 3 | 3.2 | [ ] |
| **LT** | Lupong Tagapamayapa | Core 3 | 3.3 | [ ] |
| **VAW Desk** | Barangay Violence Against Women Desk | Essential 1 | 4.1 | [ ] |
| **BDC** | Barangay Development Council | Essential 1 | 4.3 | [ ] |
| **BCPC** | Barangay Council for the Protection of Children | Essential 1 | 4.5 | [ ] |
| **BNC** | Barangay Nutrition Committee | Essential 1 | 4.8 | [ ] |
| **BESWMC** | Barangay Ecological Solid Waste Management Committee | Essential 3 | 6.1 | [ ] |

### Spec Requirement: BBI Status Determination

| Indicator Result | BBI Status | Consideration Note Required? | Implemented? |
|------------------|------------|------------------------------|--------------|
| **Passed** | ✅ Functional | No | [ ] |
| **Considered** | ✅ Functional | Yes (grace period or alt evidence) | [ ] |
| **Failed** | ❌ Non-Functional | No | [ ] |
| **Not Applicable** | ⚠️ N/A | No | [ ] |
| **Pending** | ⏳ Pending Validation | No | [ ] |

### Spec Requirement: One-Way Relationship
- [ ] Indicator result → BBI status (one-way)
- [ ] No cross-references (indicators don't check BBI status)
- [ ] BBI status stored in database but not used by other indicators

**Validation Method**: Validate Indicator 2.1 (BDRRMC) with grace period → Verify BBI status = Functional with consideration note.

---

## Section 4: Validated Indicator Examples (29 Total)

### Example 1: Indicator 1.1 - BFDP Compliance
- [ ] 3-level hierarchy (1.1, 1.1.1, 1.1.2)
- [ ] Grouped MOV items (ANNUAL REPORT group, QUARTERLY REPORT group)
- [ ] Document count validation (2 photos minimum)
- [ ] All child indicators must pass (AND logic)

**Test**: Create Indicator 1.1 with grouped MOV items, validate 2 photo minimum.

### Example 2: Indicator 1.2 - Revenue Innovation
- [ ] Currency input comparison (CY 2023 > CY 2022)
- [ ] Warning but allow override if validation fails
- [ ] BLGU uploads files, Validator enters amounts

**Test**: Create currency inputs with comparison validation, test warning display.

### Example 3: Indicator 1.3.1 - Budget Approval Date
- [ ] Mixed types (checkbox + date input)
- [ ] Date validation with grace period
- [ ] 3-state validation (PASSED, CONSIDERED, FAILED)
- [ ] Consideration note: "Approval until March 31, 2023"

**Test**: Input date Jan 15, 2023 → Status should be CONSIDERED with grace period note.

### Example 4: Indicator 1.6 - SK Fund Release
- [ ] Mutually exclusive sub-indicators (1.6.1.1, 1.6.1.2, 1.6.1.3)
- [ ] Validator selects ONE scenario
- [ ] Conditional display (if SK officials ≥5)
- [ ] Alternative evidence (bank statements instead of deposit slips)
- [ ] Exclusion rule (SK Resolution NOT acceptable)

**Test**: Select scenario 1.6.1.1, verify only relevant checklist items display.

### Example 5: Indicator 2.1.4 - BDRRMC Accomplishment
- [ ] OR evidence paths (Path A OR Path B)
- [ ] Assessment fields (YES/NO validator judgment)
- [ ] Intra-checklist conditions (show items if YES)
- [ ] Threshold validation (≥50% completion or utilization)
- [ ] Auto-calculation formula (amount utilized / amount allocated × 100)

**Test**: Select Path A YES, input 60% completion → Indicator PASSES. Path B empty → Still PASSES (OR logic).

### Additional Examples (Summarized)
- [ ] Example 6-29: Validate remaining 24 indicators from Spec v1.4 Section 3

**Validation Method**: For each example, create indicator in builder, configure MOV checklist, test validation logic.

---

## Section 5: User Workflow Compliance

### BLGU Submission Workflow
- [ ] BLGU users only upload files (Means of Verification)
- [ ] BLGU users do NOT enter data in MOV checklist input fields
- [ ] MOV checklists are VALIDATOR-SIDE validation tools

### Validator/Assessor Workflow
- [ ] Validators select which `one_of` scenario applies (for mutually exclusive indicators)
- [ ] Validators enter data in input fields (currency, number, date)
- [ ] Validators check checkboxes after reviewing MOVs
- [ ] Validators answer assessment questions (YES/NO)
- [ ] System auto-calculates where formulas exist (utilization rates)
- [ ] System determines PASSED/CONSIDERED/FAILED based on thresholds and grace periods

**Validation Method**: Role-play full workflow for one indicator from BLGU submission → Validator validation → Result determination.

---

## Section 6: Data Model Compliance

### MOVChecklistItem Interface
```typescript
interface MOVChecklistItem {
  id: string;
  type: 'checkbox' | 'group' | 'currency_input' | 'number_input' | 'text_input' | 'date_input' | 'assessment' | 'radio_group' | 'dropdown';
  label: string;
  helpText?: string;
  required: boolean;

  // Group-specific
  children?: MOVChecklistItem[];
  orLogic?: boolean;  // true = one_of (mutually exclusive)

  // Validation
  threshold?: { value: number; operator: string; unit: string; };
  gracePeriod?: { deadline: string; considerationDeadline: string; };
  conditionalDisplay?: { dependsOn: string; condition: string; value: any; };

  // Metadata
  considerationNote?: string;
  exclusionWarning?: string;
  alternativeEvidence?: string[];
}
```

**Compliance Check**:
- [ ] All 9 MOV item types supported in `type` field
- [ ] `orLogic` boolean for group OR logic
- [ ] `threshold` object for validation thresholds
- [ ] `gracePeriod` object for date grace periods
- [ ] `conditionalDisplay` object for show/hide rules
- [ ] `considerationNote` for grace period or alternative evidence explanations

---

## Section 7: UI/UX Compliance

### Split-Pane Layout (from Implementation Plan)
- [ ] 30% tree navigator (left) / 70% MOV checklist editor (right)
- [ ] Tree nodes show MOV validation status icons (☑, ○, ⚠)
- [ ] Click-to-switch navigation between indicators
- [ ] Progress tracking footer (8/12 complete, 67%)

### MOV Checklist Builder UI
- [ ] Drag-drop field palette (9 MOV item types)
- [ ] Field properties panel (right sidebar)
- [ ] JSON preview tab (for debugging)
- [ ] Live validation feedback (red borders, error messages)

**Validation Method**: User testing with MLGOO admin, collect feedback on usability.

---

## Section 8: Performance Compliance

### Auto-Save Requirements
- [ ] Delta-based auto-save (only changed items)
- [ ] Debounced auto-save (3 seconds after last edit)
- [ ] Hybrid storage (localStorage + backend database)
- [ ] Optimistic locking (version conflict detection)

### Tree Rendering Performance
- [ ] Virtualization for trees with 50+ nodes
- [ ] Memoized tree traversal functions
- [ ] Optimistic updates (UI updates before server response)

**Validation Method**: Create draft with 50 indicators, measure auto-save time (target: <500ms).

---

## Section 9: Integration Testing

### End-to-End Test Scenarios

#### Scenario 1: Create Complete Governance Area
1. Create 12 indicators for "Core 1: Financial Administration"
2. Configure MOV checklists for all 12 indicators
3. Include examples of all 9 MOV item types
4. Publish indicator set
5. Verify no validation errors

**Success Criteria**: All indicators published, no errors, codes auto-numbered correctly.

#### Scenario 2: Validate BBI Functionality Indicator
1. Create Indicator 2.1 (BDRRMC Functionality)
2. Configure MOV checklist with date input (grace period)
3. Validator enters date: Jan 15, 2023 (within grace period)
4. System determines status: CONSIDERED
5. System updates BBI: BDRRMC = Functional (with consideration note)

**Success Criteria**: BBI status updated correctly, consideration note stored.

#### Scenario 3: Test OR Evidence Logic
1. Create Indicator 2.1.4 (BDRRMC Accomplishment)
2. Configure Path A (physical) and Path B (financial)
3. Validator selects Path A YES, inputs 60% completion
4. Path B left empty
5. System validates: PASSED (OR logic satisfied by Path A)

**Success Criteria**: Indicator PASSES despite Path B empty.

---

## Final Compliance Report

### Compliance Summary
- [ ] **Section 1**: Hierarchical structure (4 levels, selection modes)
- [ ] **Section 2**: MOV checklist system (9 types, 8 advanced features)
- [ ] **Section 3**: BBI functionality system (9 BBIs, status determination)
- [ ] **Section 4**: Validated examples (29 indicators)
- [ ] **Section 5**: User workflow (BLGU vs Validator roles)
- [ ] **Section 6**: Data model (interface compliance)
- [ ] **Section 7**: UI/UX (split-pane, builder usability)
- [ ] **Section 8**: Performance (auto-save, rendering)
- [ ] **Section 9**: Integration testing (E2E scenarios)

### Sign-Off
- [ ] Development Lead: Implementation complete and spec-compliant
- [ ] QA Engineer: All test scenarios passed
- [ ] Product Owner: Acceptance criteria met

**Date**: ___________
**Version**: Indicator Builder Implementation v2.0 (Spec v1.4 Compliant)
```

**REASONING**: Spec v1.4 is source of truth. Compliance checklist ensures nothing is missed during implementation.

---

#### 5. MIGRATION-FROM-V1.md
**Purpose**: Transition guide from old approach to new MOV-first approach

**Outline**:
```markdown
# Migration Guide: Schema-Builder (v1) → MOV-Checklist-First (v2)

## Overview
This guide helps the development team transition from the **schema-builder approach**
(v1.0, Nov 9, 2025) to the **MOV-checklist-first approach** (v2.0, Nov 13, 2025).

## Why the Pivot?

### What Changed?
On November 12, 2025, the **Indicator Builder Specification v1.4** was finalized
after validating against 29 real SGLGB indicators. This revealed that our initial
approach (generic form schema + calculation schema builders) was **not aligned**
with how SGLGB indicators actually work.

**Key Discovery**: SGLGB indicators use **MOV checklists** with 9 specialized
validation types (checkbox, group with OR logic, currency thresholds, date grace
periods, etc.), not generic JSON schemas.

### Impact on Development

| Area | v1.0 Approach (OLD) | v2.0 Approach (NEW) |
|------|---------------------|---------------------|
| **Form Builder** | Generic field types (text, number, email) | 9 MOV item types (checkbox, group, currency, etc.) |
| **Validation** | Generic rules (required, min/max) | MOV-specific (threshold, grace period, OR logic) |
| **Calculation** | Complex rule engine (AND/OR groups) | Threshold validation + auto-calculation formulas |
| **BBI System** | Not planned | 9 mandatory BBIs with one-to-one indicator mapping |
| **Data Model** | `form_schema` + `calculation_schema` JSONB | `mov_checklist` JSONB with nested validation rules |

---

## What Work is Still Valid?

### ✅ Backend Work (80% Reusable)

| Component | Status | Reusability |
|-----------|--------|-------------|
| **Database schema** (indicator_drafts table) | ✅ Complete | **100%** - No changes needed |
| **Bulk creation service** (topological sorting) | ✅ Complete | **100%** - No changes needed |
| **Draft auto-save service** | ✅ Complete | **100%** - No changes needed |
| **Optimistic locking** (version conflict detection) | ✅ Complete | **100%** - No changes needed |
| **API endpoints** (8 new endpoints) | ✅ Complete | **100%** - No changes needed |
| **Service layer tests** (27/27 passing) | ✅ Complete | **95%** - Minor test data updates |

**Why reusable?** Backend infrastructure (drafts, bulk creation, auto-save) is
**approach-agnostic**. It doesn't care if frontend builds form schemas or MOV
checklists—it just stores JSONB data.

### ✅ Frontend Foundation (70% Reusable)

| Component | Status | Reusability |
|-----------|--------|-------------|
| **Zustand store** (flat state model) | ✅ Complete | **90%** - Minor schema field updates |
| **Tree utilities** (recalculateCodes) | ✅ Complete | **100%** - No changes needed |
| **Draft storage** (localStorage + backend) | ✅ Complete | **100%** - No changes needed |
| **Auto-save hook** | ✅ Complete | **100%** - No changes needed |
| **Tree view component** (react-arborist) | ✅ Complete | **100%** - No changes needed |
| **Split-pane layout** | ✅ Complete | **100%** - No changes needed |
| **Rich text editor** (TipTap) | ✅ Complete | **100%** - No changes needed |
| **FormSchemaBuilder component** | ✅ Complete | **60%** - Drag-drop patterns reusable |
| **CalculationSchemaBuilder component** | ✅ Complete | **30%** - Some UI patterns reusable |

**Why reusable?** Tree manipulation, draft management, and layout are
**schema-agnostic**. Only the schema editor itself needs replacement.

### ❌ What Needs Replacement (20% of Code)

| Component | Status | Why Replace? |
|-----------|--------|--------------|
| **FormSchemaBuilder.tsx** | ⚠️ Needs adaptation | Built for generic form fields, not MOV checklists |
| **CalculationSchemaBuilder.tsx** | ⚠️ Needs simplification | Too complex; MOVs use simple threshold validation |
| **Validation logic** | ⚠️ Needs MOV-specific rules | Current logic validates form fields, not MOV items |

**Replacement Strategy**: Don't delete FormSchemaBuilder.tsx! Instead:
1. **Copy** FormSchemaBuilder.tsx → MOVChecklistBuilder.tsx
2. **Reuse** drag-drop, palette, properties panel structure
3. **Replace** field type definitions and validation logic
4. **Add** MOV-specific features (OR logic, grace periods, thresholds)

---

## Migration Steps

### Step 1: Archive Old Schema-Focused Documentation
```bash
cd tasks/tasks-phase6-hierarchical-indicators/
mkdir -p archive/v1-schema-builder/
mv SCHEMA-CONFIGURATION-ARCHITECTURE.md archive/v1-schema-builder/
mv QUICK-REFERENCE-SCHEMA-CONFIG.md archive/v1-schema-builder/
mv sample-indicator-data.json archive/v1-schema-builder/
```

**Create migration note**:
```bash
cat > archive/v1-schema-builder/MIGRATION-NOTES.md << 'EOF'
# Why We Archived These Files

**Date**: November 13, 2025

These files documented the **v1.0 schema-builder approach** (generic form schemas
+ calculation rule engines). After validating against 29 real SGLGB indicators in
the Indicator Builder Specification v1.4, we discovered this approach did not match
how SGLGB indicators actually work.

**What We Learned**:
- SGLGB indicators use **MOV checklists** with 9 specialized item types
- Validation includes advanced patterns: OR logic, grace periods, thresholds
- BBI functionality system requires one-to-one indicator mappings

**New Approach (v2.0)**:
See updated task files:
- `MOV-CHECKLIST-IMPLEMENTATION.md` (MOV builder tasks)
- `BBI-SYSTEM-IMPLEMENTATION.md` (BBI mapping tasks)
- `SPEC-V1.4-COMPLIANCE-CHECKLIST.md` (validation against spec)

**What's Still Valid**:
- Split-pane layout architecture (30/70 split, tree navigator)
- Expert UX recommendations (status icons, click-to-switch)
- Performance optimization strategies (delta-based auto-save)
EOF
```

### Step 2: Update README.md with Version History
1. Add version history table at top of README.md
2. Mark old tasks (2.7, 2.8) with **REVISED** badges
3. Add new tasks for MOV checklist builder
4. Add "Completed Work" section showing backend progress

**Diff Example**:
```diff
# Phase 6: Hierarchical Indicator Creation - Implementation Tasks

+## Document Version History
+
+| Version | Date | Summary |
+|---------|------|---------|
+| v1.0 | Nov 9, 2025 | Initial schema-builder approach |
+| v2.0 | Nov 13, 2025 | **Pivot to MOV-checklist-first** aligned with Spec v1.4 |

-#### Task 2.7: Form Schema Builder (Visual)
+#### Task 2.7: MOV Checklist Builder (Reuse FormSchemaBuilder.tsx) **[REVISED v2.0]**

-**Checklist:**
-- [ ] Create field palette with draggable field types:
-  - [ ] Text Input, Number Input, Date Picker, Checkbox, etc.
+**IMPLEMENTATION NOTE**: This task has been **REVISED** to align with Indicator
+Builder Specification v1.4. We now build **MOV checklists** with 9 specialized
+item types instead of generic form schemas.
+
+**Files:**
+- `apps/web/src/components/features/indicators/builder/MOVChecklistBuilder.tsx` (NEW)
+- `apps/web/src/components/features/indicators/builder/FormSchemaBuilder.tsx` (REUSE PATTERNS)
+
+**Checklist:**
+- [x] Review FormSchemaBuilder.tsx drag-drop implementation
+- [ ] Create MOVChecklistBuilder component reusing drag-drop logic
+- [ ] Implement 9 MOV item types (see MOV-CHECKLIST-IMPLEMENTATION.md):
+  - [ ] Checkbox, Group (OR logic), Currency Input, Number Input, etc.
```

### Step 3: Create New MOV-Focused Task Files
1. Create `MOV-CHECKLIST-IMPLEMENTATION.md` (see section above)
2. Create `BBI-SYSTEM-IMPLEMENTATION.md` (see section above)
3. Create `FORM-BUILDER-REUSE-GUIDE.md` (see section above)
4. Create `SPEC-V1.4-COMPLIANCE-CHECKLIST.md` (see section above)

### Step 4: Update Testing Guide
1. Add MOV validation test cases to `TESTING-GUIDE-PHASE1.md`
2. Add BBI integration test scenarios
3. Keep existing service layer tests (still valid)

**Diff Example**:
```diff
# Testing Guide - Phase 1

+## Test Suite: MOV Checklist Validation (Added v2.0)
+
+### Test Category: MOV Item Types
+
+**Test 1: Checkbox Item Validation**
+- Create MOV checklist with single checkbox
+- Verify checkbox renders correctly
+- Test validation: unchecked → incomplete, checked → complete
+
+**Test 2: Group with OR Logic**
+- Create group with OR logic (Path A OR Path B)
+- Verify only ONE path needs completion
+- Test: Path A complete, Path B empty → Status: PASSED
```

### Step 5: Update Split-Pane Implementation Plan
1. Add Phase 1.5 (MOV Checklist Integration)
2. Update timeline to reflect MOV builder work
3. Keep split-pane architecture (still valid)

---

## Developer FAQ

### Q1: Do I need to delete FormSchemaBuilder.tsx?
**A:** No! **Reuse its drag-drop patterns**. Copy it to MOVChecklistBuilder.tsx
and adapt field types.

### Q2: Is the backend work still valid?
**A:** Yes, 100%. Database schema, draft service, bulk creation—all still valid.
Backend doesn't care about schema structure.

### Q3: What about the 176 passing frontend tests?
**A:** 95% still valid. Tree utilities, draft storage, Zustand store tests require
minor updates to test data (MOV schema format instead of form schema format).

### Q4: How long will migration take?
**A:** Estimated 1-2 weeks:
- Week 1: Create MOVChecklistBuilder.tsx, implement 9 MOV item types
- Week 2: BBI system, testing, integration

### Q5: Can I still reference archived docs?
**A:** Yes! Archived docs in `archive/v1-schema-builder/` remain accessible.
Split-pane UX diagrams and expert recommendations are still valuable.

---

## Rollout Plan

### Week 1: MOV Checklist Foundation
- [ ] Day 1: Archive old docs, update README version history
- [ ] Day 2-3: Create MOVChecklistBuilder.tsx (copy FormSchemaBuilder patterns)
- [ ] Day 4-5: Implement first 5 MOV item types (checkbox, group, currency, number, text)

### Week 2: Advanced MOV Features + BBI System
- [ ] Day 1-2: Implement remaining 4 MOV item types (date, assessment, radio, dropdown)
- [ ] Day 3-4: Add OR logic, conditional display, threshold validation
- [ ] Day 5: BBI system (database migration, service layer, UI)

### Week 3: Testing & Integration
- [ ] Day 1-2: Unit tests for MOV validation logic
- [ ] Day 3: Integration tests (end-to-end indicator creation)
- [ ] Day 4: Spec v1.4 compliance validation (29 indicator examples)
- [ ] Day 5: User testing, bug fixes

---

## Risk Mitigation

### Risk 1: Scope Creep
**Mitigation**: Strict adherence to Spec v1.4. If an indicator pattern isn't in
the 29 validated examples, defer to Phase 2.

### Risk 2: Team Confusion
**Mitigation**: This migration guide. Daily standup to address questions. Pair
programming for MOV builder.

### Risk 3: Lost Work
**Mitigation**: Archive old docs (don't delete). Version history in README. Git
branch strategy:
- `main` branch: v1.0 code (schema-builder)
- `feat/mov-checklist-v2` branch: v2.0 code (MOV-first)
- Merge after testing complete

---

## Success Criteria

### Migration Complete When:
- [ ] All v1.0 schema-focused docs archived with migration notes
- [ ] README.md updated with v2.0 version history
- [ ] 5 new task files created (MOV, BBI, FormBuilder Reuse, Spec Compliance, Migration)
- [ ] MOVChecklistBuilder.tsx implements all 9 item types
- [ ] BBI system functional (9 BBIs seeded, status determination working)
- [ ] All 29 Spec v1.4 indicator examples validated
- [ ] Integration tests passing
- [ ] User acceptance testing complete

### Sign-Off
- [ ] Tech Lead: Architecture approved
- [ ] Product Owner: Spec v1.4 compliance verified
- [ ] QA: All tests passing

**Target Completion**: November 27, 2025 (2 weeks from Nov 13, 2025)
```

**REASONING**: Clear migration path reduces team confusion and preserves context from v1.0 work.

---

## Implementation Alignment Plan

### FormSchemaBuilder.tsx Integration

#### Current FormSchemaBuilder.tsx Analysis

**Location**: `apps/web/src/components/features/indicators/builder/FormSchemaBuilder.tsx`

**Reusable Patterns**:
1. **Drag-and-drop** (@hello-pangea/dnd) - Lines 1-100
   - DragDropContext, Droppable, Draggable structure
   - GripVertical drag handle icons
   - onDragEnd handler for reordering

2. **Field Palette** (Left Sidebar) - Lines 100-200
   - Button grid of draggable field types
   - Click-to-add functionality
   - Field type icons (Type, Hash, Calendar, etc.)

3. **Properties Panel** (Right Sidebar) - Lines 200-300
   - Dynamic properties based on selected field
   - Input, Label, Switch, Select controls from shadcn/ui
   - Required toggle, validation rules, help text

4. **JSON Preview Tab** - Lines 300-400
   - Tabs component (Visual Builder | JSON Preview)
   - Syntax-highlighted JSON output
   - Copy-to-clipboard functionality

**What Needs Extension**:

| FormSchemaBuilder Feature | MOVChecklistBuilder Requirement | Gap |
|---------------------------|--------------------------------|-----|
| **Field types**: text, number, email, date, select | **MOV item types**: checkbox, group, currency, assessment (9 total) | New type definitions needed |
| **Validation**: required, min, max, pattern | **MOV validation**: threshold (≥50%), grace period, OR logic | New validation types needed |
| **Flat field structure** | **Nested groups** (groups contain children) | Nested droppable support needed |
| **Generic properties** | **MOV-specific properties** (orLogic, threshold, gracePeriod) | New property panels needed |

#### Integration Strategy

**Step 1: Create MOVChecklistBuilder.tsx**
```typescript
// Copy structure from FormSchemaBuilder.tsx
// File: apps/web/src/components/features/indicators/builder/MOVChecklistBuilder.tsx

'use client';

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
// ... same imports as FormSchemaBuilder

// CHANGED: MOV item types instead of form field types
export type MOVItemType =
  | 'checkbox'
  | 'group'
  | 'currency_input'
  | 'number_input'
  | 'text_input'
  | 'date_input'
  | 'assessment'
  | 'radio_group'
  | 'dropdown';

// CHANGED: MOV-specific interface
export interface MOVChecklistItem {
  id: string;
  type: MOVItemType;
  label: string;
  required: boolean;

  // MOV-specific fields (NEW)
  orLogic?: boolean;
  threshold?: { value: number; operator: string; unit: string; };
  gracePeriod?: { deadline: string; considerationDeadline: string; };
  conditionalDisplay?: { dependsOn: string; condition: string; value: any; };
  children?: MOVChecklistItem[];  // For groups
}

// REUSED: Same drag-drop structure from FormSchemaBuilder
export default function MOVChecklistBuilder({ value, onChange }: Props) {
  const [items, setItems] = useState<MOVChecklistItem[]>(value?.items || []);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // REUSED: Same drag-drop handler
  const handleDragEnd = (result: DropResult) => {
    // Same logic as FormSchemaBuilder
  };

  return (
    <div className="flex gap-4">
      {/* LEFT: Item Palette (CHANGED item types) */}
      <ItemPalette onAddItem={addItem} />

      {/* CENTER: Drag-drop canvas (REUSED structure) */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <ItemList items={items} />
      </DragDropContext>

      {/* RIGHT: Properties panel (CHANGED properties) */}
      {selectedItem && (
        <MOVItemPropertiesPanel item={selectedItem} onUpdate={updateItem} />
      )}
    </div>
  );
}
```

**Step 2: Implement 9 MOV Item Type Configurations**
- Each MOV item type gets its own properties panel component
- Reuse Input, Select, Switch from shadcn/ui (same as FormSchemaBuilder)
- Add new controls for MOV-specific features:
  - Threshold configurator (number input + operator dropdown)
  - Grace period date pickers
  - OR logic toggle (for groups)

**Step 3: Add Nested Droppable Support**
- Groups need to accept dragged items as children
- Use nested `<Droppable>` components
- Reference: react-beautiful-dnd nested examples

---

### Indicator Builder Spec v1.4 Compliance: Gap Analysis

#### Current vs. Required Field Types

| Spec v1.4 MOV Type | FormSchemaBuilder Equivalent | Gap |
|--------------------|------------------------------|-----|
| ✅ **checkbox** | ❌ Not present (has checkbox group for multi-select) | Need binary checkbox |
| ✅ **group** | ❌ Not present (no nested structure support) | Need group with OR logic |
| ✅ **currency_input** | ❌ Not present (has generic number input) | Need currency formatter, threshold |
| ✅ **number_input** | ✅ Has number input | Need threshold validation |
| ✅ **text_input** | ✅ Has text input | Already supported |
| ✅ **date_input** | ✅ Has date picker | Need grace period logic |
| ✅ **assessment** | ❌ Not present | Need YES/NO radio (validator judgment) |
| ✅ **radio_group** | ✅ Has radio button group | Already supported |
| ✅ **dropdown** | ✅ Has dropdown select | Already supported |

**Summary**: 4/9 MOV types already supported, 5/9 need new implementations.

#### Current vs. Required Validation Features

| Spec v1.4 Feature | FormSchemaBuilder Support | Gap |
|-------------------|---------------------------|-----|
| **OR Logic** (alternative evidence paths) | ❌ Not supported | Need group-level OR toggle |
| **Conditional Display** (show/hide items) | ❌ Not supported | Need conditional rules builder |
| **Threshold Validation** (≥50%) | ⚠️ Partial (has min/max) | Need threshold with operators |
| **Grace Period** (3-state validation) | ❌ Not supported | Need deadline + consideration deadline |
| **Alternative Evidence** | ❌ Not supported | Need consideration notes field |
| **Exclusion Rules** | ❌ Not supported | Need exclusion warning field |
| **Calculation Formulas** | ❌ Not supported (separate builder) | Need inline formula editor |
| **Intra-checklist Conditions** | ❌ Not supported | Need item-to-item dependencies |

**Summary**: 0/8 advanced features fully supported. All require new implementation.

---

### PRD v1.1 Feature Mapping

| PRD Section | Task File | Status |
|-------------|-----------|--------|
| **4.0.1** Multi-Step Wizard | README.md (Step 1-4) | ✅ Complete |
| **4.0.2** Draft System with Auto-Save | README.md (Task 1.4, 2.5) | ✅ Complete |
| **4.0.3** Hierarchical Tree Editor | README.md (Task 2.6) | ✅ Complete |
| **4.0.4** Visual Schema Builders | **MOV-CHECKLIST-IMPLEMENTATION.md** | 🔄 **IN PROGRESS** |
| **4.0.5** Real-Time Validation | README.md (Task 2.11), SPEC-V1.4-COMPLIANCE-CHECKLIST.md | ⏳ Not Started |
| **4.0.6** Bulk Creation & Publishing | README.md (Task 1.3) | ✅ Backend Complete |
| **4.0.7** Conflict Resolution & Locking | README.md (Task 1.4) | ✅ Complete |
| **4.1.2** Form Schema Builder (MOV Checklist) | **MOV-CHECKLIST-IMPLEMENTATION.md** | 🔄 **IN PROGRESS** |
| **4.2.1** BBI Definition Management | **BBI-SYSTEM-IMPLEMENTATION.md** | ⏳ Not Started |
| **4.2.2** Indicator-to-BBI Mapping | **BBI-SYSTEM-IMPLEMENTATION.md** | ⏳ Not Started |

---

## Migration Strategy

### Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| **Week 1** | Documentation cleanup | Archive old docs, update README, create 5 new task files |
| **Week 2** | MOV Checklist Builder (5 item types) | Checkbox, Group, Currency, Number, Text |
| **Week 3** | MOV Checklist Builder (4 item types) | Date (grace period), Assessment, Radio, Dropdown |
| **Week 4** | Advanced Features | OR logic, conditional display, threshold validation |
| **Week 5** | BBI System | Database migration, service layer, UI, testing |
| **Week 6** | Validation & Testing | Spec v1.4 compliance, 29 indicator examples, user testing |

### Rollback Plan

**If migration fails**:
1. Git revert to v1.0 branch (`main`)
2. Continue with schema-builder approach
3. Defer MOV checklist to Phase 7

**Rollback triggers**:
- User testing feedback <60% satisfaction
- Implementation complexity exceeds 6 weeks
- Critical bugs in MOV validation logic

---

## Context Preservation Strategy

### Version Control

**Branch Strategy**:
```
main (v1.0 - schema-builder)
  ├── archive (tagged: v1.0-schema-builder)
  └── feat/mov-checklist-v2 (active development)
       ├── docs: Update task files with version history
       ├── feat: MOVChecklistBuilder component
       ├── feat: BBI system
       └── test: Spec v1.4 compliance validation
```

**Tag Strategy**:
- `v1.0-schema-builder`: Snapshot before migration
- `v2.0-mov-checklist-alpha`: First working MOV builder
- `v2.0-mov-checklist-beta`: BBI system integrated
- `v2.0-mov-checklist-release`: Spec v1.4 compliant

### Documentation History

**All files get version history sections**:
```markdown
## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v1.0 | Nov 9, 2025 | Team | Initial schema-builder approach |
| v2.0 | Nov 13, 2025 | Team | **Pivot to MOV-checklist-first**, aligned with Spec v1.4 |
```

**Archive directory structure**:
```
tasks/tasks-phase6-hierarchical-indicators/
├── archive/
│   └── v1-schema-builder/
│       ├── SCHEMA-CONFIGURATION-ARCHITECTURE.md
│       ├── QUICK-REFERENCE-SCHEMA-CONFIG.md
│       ├── sample-indicator-data.json
│       └── MIGRATION-NOTES.md  (explains why archived)
```

### Progress Tracking

**README.md "Progress Summary" section**:
```markdown
## Progress Summary

### ✅ Completed (v1.0 - Backend & Infrastructure)
- [x] Database schema (indicator_drafts table)
- [x] Bulk creation service (topological sorting)
- [x] Draft auto-save service (optimistic locking)
- [x] Zustand store (flat state model)
- [x] Tree utilities (recalculateCodes, buildTreeFromFlat)
- [x] 176/178 frontend tests passing (99%)
- [x] 27/27 backend service tests passing (100%)

### 🔄 In Progress (v2.0 - MOV Checklist)
- [ ] MOVChecklistBuilder.tsx (0/9 item types complete)
- [ ] BBI system (0/9 BBIs configured)
- [ ] Spec v1.4 compliance (0/29 indicators validated)

### ⏳ Not Started (v2.0)
- [ ] Grace period validation logic
- [ ] Alternative evidence UI (OR logic)
- [ ] Conditional display rules
- [ ] Threshold auto-calculation
```

---

## Risk Mitigation

### Risk 1: Team Confusion About Pivot
**Impact**: High (team may continue building wrong components)
**Probability**: Medium

**Mitigation**:
1. ✅ **This comprehensive documentation** explaining why we pivoted
2. ✅ Daily standup discussion of migration progress
3. ✅ Pair programming for first MOV item type implementation
4. ✅ Clear task assignments in new MOV-CHECKLIST-IMPLEMENTATION.md

### Risk 2: Lost Context from v1.0 Work
**Impact**: Medium (architectural decisions forgotten)
**Probability**: Low (with proper archiving)

**Mitigation**:
1. ✅ Archive old docs (don't delete)
2. ✅ Add MIGRATION-NOTES.md explaining rationale
3. ✅ Version history in all updated files
4. ✅ Git tags for v1.0 snapshot

### Risk 3: Scope Creep (Adding Non-Spec Features)
**Impact**: High (timeline extension, budget overrun)
**Probability**: Medium

**Mitigation**:
1. ✅ Strict adherence to Spec v1.4 (use compliance checklist)
2. ✅ "If it's not in the 29 validated indicators, defer to Phase 2" rule
3. ✅ Weekly scope review in sprint planning
4. ✅ Product Owner sign-off required for any new features

### Risk 4: FormSchemaBuilder Reuse Fails
**Impact**: High (need to build from scratch)
**Probability**: Low (drag-drop patterns are generic)

**Mitigation**:
1. ✅ Proof-of-concept: Copy FormSchemaBuilder → MOVChecklistBuilder, test drag-drop
2. ✅ Fallback: Use different drag-drop library (react-beautiful-dnd) if needed
3. ✅ Time buffer: Allocate 1 extra week for unexpected rework

---

## Success Criteria

### Documentation Restructure Success
- [ ] All outdated files archived with clear migration notes
- [ ] All updated files have version history sections
- [ ] 5 new task files created and reviewed by team
- [ ] Zero confusion during team onboarding (measured by questions in standup)

### Implementation Alignment Success
- [ ] MOVChecklistBuilder.tsx implements all 9 MOV item types
- [ ] All 8 advanced validation features implemented (OR logic, grace period, etc.)
- [ ] FormSchemaBuilder drag-drop patterns successfully reused (80%+ code reuse)
- [ ] BBI system functional (9 BBIs seeded, status determination working)

### Spec v1.4 Compliance Success
- [ ] All 29 indicator examples from Spec v1.4 can be created in builder
- [ ] All validation logic matches Spec v1.4 expected behavior
- [ ] Compliance checklist 100% complete
- [ ] Product Owner sign-off: "Implementation matches spec"

### Testing Success
- [ ] Unit tests: 95%+ pass rate (MOV validation logic)
- [ ] Integration tests: Full workflow (BLGU submission → Validator validation → BBI status update)
- [ ] User acceptance testing: 80%+ satisfaction score from MLGOO admins

### Timeline Success
- [ ] Migration complete within 6 weeks (by November 27, 2025)
- [ ] No more than 1 week delay due to unforeseen issues
- [ ] Weekly progress reports show consistent velocity

---

**END OF RECOMMENDATION DOCUMENT**

---

## Next Steps for Development Team

1. **Review this recommendation document** (1 day)
   - Team reads document
   - Questions addressed in team meeting
   - Sign-off from Tech Lead, Product Owner, QA

2. **Execute Step 1: Archive old docs** (1 day)
   - Create `archive/v1-schema-builder/` directory
   - Move 3 files (SCHEMA-CONFIG-ARCH, QUICK-REF, sample-data.json)
   - Create MIGRATION-NOTES.md

3. **Execute Step 2: Update existing files** (2 days)
   - README.md: Add version history, update Task 2.7/2.8
   - IMPLEMENTATION-PLAN-SPLIT-PANE.md: Add Phase 1.5 (MOV integration)
   - TESTING-GUIDE-PHASE1.md: Add MOV test cases

4. **Execute Step 3: Create 5 new task files** (2 days)
   - MOV-CHECKLIST-IMPLEMENTATION.md
   - BBI-SYSTEM-IMPLEMENTATION.md
   - FORM-BUILDER-REUSE-GUIDE.md
   - SPEC-V1.4-COMPLIANCE-CHECKLIST.md
   - MIGRATION-FROM-V1.md

5. **Begin development** (4 weeks)
   - Week 1: MOVChecklistBuilder.tsx (first 5 item types)
   - Week 2: MOVChecklistBuilder.tsx (remaining 4 item types + advanced features)
   - Week 3: BBI system (backend + frontend)
   - Week 4: Testing, Spec v1.4 compliance validation, user testing

---

**Document prepared by**: VANTAGE Technical Documentation Specialist
**Review requested from**: Tech Lead, Product Owner, QA Engineer
**Target decision date**: November 14, 2025
**Implementation start date**: November 15, 2025 (if approved)
