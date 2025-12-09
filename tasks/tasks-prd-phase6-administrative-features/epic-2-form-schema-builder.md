# Epic 2.0: Indicator Management - Form Schema Builder (Visual)

**PRD Reference:** FR-4.1.2 **Duration:** 7-10 days **Dependencies:** Epic 1.0 (Core CRUD system
must exist) **Status:** ✅ FUNCTIONALLY COMPLETE (Stories 2.1-2.6 completed on 2025-11-06)

## Completion Summary

**Completed Stories:** 6 of 7 (Story 2.7 Testing deferred) **Total Tasks Completed:** 31 of 37 tasks
**Functional Status:** Fully operational and ready for production use

### What's Working:

- ✅ Form schema data models and validation (Story 2.1)
- ✅ Backend validation service with circular reference detection (Story 2.2)
- ✅ Visual drag-and-drop form builder with 7 field types (Stories 2.3-2.4)
- ✅ Live preview and JSON viewer with syntax highlighting (Story 2.5)
- ✅ Full integration with create/edit workflows and persistence (Story 2.6)
- ✅ Client-side and server-side validation
- ✅ Unsaved changes warnings
- ✅ Navigation menu integration

### Deferred:

- ⏸️ Story 2.7: Comprehensive test suite (6 tasks) - to be implemented in future sprint

---

## Story 2.1: Form Schema Data Models & Validation

**Duration:** 1 day **Dependencies:** Epic 1.0 complete

### Atomic Tasks

- [x] **2.1.1 Atomic: Create Pydantic models for form field types**
  - **Files:**
    - `apps/api/app/schemas/form_schema.py`
  - **Dependencies:** None
  - **Acceptance Criteria:**
    - Create `FormFieldBase` with common fields: field_id, label, required, help_text
    - Create `CheckboxGroupField` extending FormFieldBase with options list
    - Create `RadioButtonField` extending FormFieldBase with options list
    - Create `NumberInputField` with min, max validation
    - Create `TextInputField` with max_length
    - Create `TextAreaField` with max_length
    - Create `DatePickerField` with min_date, max_date
    - Create `FileUploadField` with conditional_mov_requirement logic
    - Each field has `field_type` discriminator (checkbox_group, radio_button, etc.)
    - All models use proper type hints
  - **Tech:** Pydantic discriminated unions
  - **Duration:** 3 hours

- [x] **2.1.2 Atomic: Create FormSchema root model**
  - **Files:**
    - `apps/api/app/schemas/form_schema.py`
  - **Dependencies:** 2.1.1
  - **Acceptance Criteria:**
    - Create `FormSchema` model with `fields: list[FormFieldBase]`
    - Uses Union type with discriminator for all field types
    - Validator to ensure field_ids are unique
    - Validator to check required fields are present
    - Validator to prevent empty fields list
    - JSON schema generation compatible with TypeScript
    - Model can serialize/deserialize to/from JSONB
  - **Tech:** Pydantic validators, JSON Schema
  - **Duration:** 2 hours

- [x] **2.1.3 Atomic: Create validation helper functions**
  - **Files:**
    - `apps/api/app/services/form_schema_validator.py`
  - **Dependencies:** 2.1.2
  - **Acceptance Criteria:**
    - Function `validate_field_ids_unique(fields)` returns bool
    - Function `validate_no_circular_references(fields)` for hierarchical fields
    - Function `validate_conditional_mov_logic(field)` for file upload fields
    - Function `generate_validation_errors(schema)` returns list of error messages
    - All functions have clear error messages
    - Functions are reusable across services
  - **Tech:** Python type checking, Pydantic
  - **Duration:** 2 hours

- [x] **2.1.4 Atomic: Add TypeScript type generation for form schemas**
  - **Files:**
    - Update `orval.config.ts` if needed
  - **Dependencies:** 2.1.2
  - **Acceptance Criteria:**
    - Ensure form_schema types export properly from OpenAPI
    - Run `pnpm generate-types`
    - Verify FormSchema TypeScript types generated in packages/shared
    - All field type discriminators work in TypeScript
    - No type errors in generated files
  - **Tech:** Orval, TypeScript, OpenAPI
  - **Duration:** 1 hour

---

## Story 2.2: Backend Form Schema Validation Service

**Duration:** 1 day **Dependencies:** 2.1

### Atomic Tasks

- [x] **2.2.1 Atomic: Create form schema validation endpoint**
  - **Files:**
    - `apps/api/app/api/v1/indicators.py` (add endpoint)
  - **Dependencies:** 2.1.3
  - **Acceptance Criteria:**
    - Endpoint: `POST /api/v1/indicators/validate-form-schema`
    - Accepts FormSchema in request body
    - Calls validation helpers from form_schema_validator.py
    - Returns 200 with `{"valid": true}` if valid
    - Returns 400 with detailed errors if invalid
    - Error response includes field paths and specific issues
    - Requires MLGOO_DILG role
  - **Tech:** FastAPI, Pydantic validation
  - **Duration:** 2 hours

- [x] **2.2.2 Atomic: Integrate validation into update_indicator service**
  - **Files:**
    - `apps/api/app/services/indicator_service.py` (update)
  - **Dependencies:** 2.2.1
  - **Acceptance Criteria:**
    - Before saving form_schema, call validation helpers
    - Raise ValueError with clear message if validation fails
    - Validation runs in update_indicator() before creating new version
    - Validation also runs in create_indicator()
    - Log validation errors
  - **Tech:** Python exception handling
  - **Duration:** 2 hours

- [x] **2.2.3 Atomic: Add circular reference detection**
  - **Files:**
    - `apps/api/app/services/form_schema_validator.py` (update)
  - **Dependencies:** 2.1.3
  - **Acceptance Criteria:**
    - Detect if field references itself
    - Detect if conditional logic creates circular dependencies
    - Return clear error message with field path
    - Function: `detect_circular_references(form_schema) -> list[str]`
  - **Tech:** Python graph traversal
  - **Duration:** 3 hours

- [x] **2.2.4 Atomic: Write tests for form schema validation**
  - **Files:**
    - `apps/api/tests/services/test_form_schema_validator.py`
  - **Dependencies:** 2.2.3
  - **Acceptance Criteria:**
    - Test valid form schemas pass validation
    - Test duplicate field_ids fail validation
    - Test circular references detected
    - Test conditional MOV logic validation
    - Test empty fields list fails
    - Test validation error messages are clear
    - Run with `pytest -vv`
  - **Tech:** Pytest
  - **Duration:** 2 hours

---

## Story 2.3: Frontend Form Builder Core Architecture

**Duration:** 2 days **Dependencies:** 2.1, 2.2, `pnpm generate-types`

### Atomic Tasks

- [x] **2.3.1 Atomic: Create Zustand store for form builder state**
  - **Files:**
    - `apps/web/src/store/formBuilderStore.ts`
  - **Dependencies:** 2.1.4
  - **Acceptance Criteria:**
    - Store manages `fields: FormField[]` array
    - Actions: `addField(field)`, `updateField(id, updates)`, `deleteField(id)`,
      `reorderFields(fromIndex, toIndex)`, `clearFields()`
    - Selector: `getFieldById(id)`
    - State persists during editing session (no localStorage yet)
    - TypeScript types from generated schemas
  - **Tech:** Zustand, TypeScript, Immer
  - **Duration:** 2 hours

- [x] **2.3.2 Atomic: Create FormSchemaBuilder main component structure**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder.tsx`
  - **Dependencies:** 2.3.1
  - **Acceptance Criteria:**
    - Client Component with three-panel layout:
      - Left: Field Palette (sidebar)
      - Center: Canvas (drop zone)
      - Right: Field Properties Panel
    - Uses Zustand store for state
    - Renders empty state when no fields
    - "Add Field" placeholder visible
    - Responsive layout (collapsible sidebars on smaller screens)
  - **Tech:** React, Zustand, Tailwind CSS Grid/Flexbox
  - **Duration:** 3 hours

- [x] **2.3.3 Atomic: Create FieldPalette component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/FieldPalette.tsx`
  - **Dependencies:** None
  - **Acceptance Criteria:**
    - Displays 7 field type buttons:
      - Checkbox Group icon + label
      - Radio Button icon + label
      - Number Input icon + label
      - Text Input icon + label
      - Text Area icon + label
      - Date Picker icon + label
      - File Upload icon + label
    - Each button is draggable (use drag handle)
    - Icons from lucide-react
    - Tooltips with field descriptions
    - Organized by category (Selection, Input, Upload)
  - **Tech:** React, lucide-react icons, shadcn/ui Button, Tooltip
  - **Duration:** 2 hours

- [x] **2.3.4 Atomic: Implement drag-and-drop with dnd-kit**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder.tsx` (update)
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/CanvasDropZone.tsx`
  - **Dependencies:** 2.3.2, 2.3.3
  - **Acceptance Criteria:**
    - Install @dnd-kit/core, @dnd-kit/sortable
    - Wrap FormSchemaBuilder with DndContext
    - FieldPalette items are draggable
    - Canvas accepts drops from palette
    - Dropping field adds it to store
    - Fields in canvas are sortable (reorder via drag)
    - Visual indicators during drag (hover effects)
    - Drop zones clearly visible
  - **Tech:** @dnd-kit, React
  - **Duration:** 4 hours

- [x] **2.3.5 Atomic: Create FieldCanvasItem component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/FieldCanvasItem.tsx`
  - **Dependencies:** 2.3.4
  - **Acceptance Criteria:**
    - Props: field (FormField type)
    - Displays field type icon and label
    - Shows required badge if field.required === true
    - Drag handle for reordering
    - Click to select (highlights, opens properties panel)
    - Delete button (with confirmation)
    - Hover effects
    - Visual indicator when selected
  - **Tech:** React, shadcn/ui Card, Badge, Button
  - **Duration:** 3 hours

---

## Story 2.4: Frontend Form Builder - Field Components (7 Input Types)

**Duration:** 2 days **Dependencies:** 2.3

### Atomic Tasks

- [x] **2.4.1 Atomic: Create FieldPropertiesPanel component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/FieldPropertiesPanel.tsx`
  - **Dependencies:** 2.3.1
  - **Acceptance Criteria:**
    - Right sidebar panel
    - Displays "Select a field" message when no field selected
    - When field selected, shows appropriate configuration form
    - Uses React Hook Form for validation
    - Updates Zustand store on change (debounced)
    - "Save" button to apply changes
    - "Cancel" button to discard changes
  - **Tech:** React, React Hook Form, Zustand
  - **Duration:** 2 hours

- [x] **2.4.2 Atomic: Create CheckboxGroupFieldProperties component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/FieldProperties/CheckboxGroupProperties.tsx`
  - **Dependencies:** 2.4.1
  - **Acceptance Criteria:**
    - Form fields: label, field_id (auto-generated, editable), required toggle, help_text
    - Options list with "Add Option" button
    - Each option has label and value
    - Drag to reorder options
    - Delete option button
    - Minimum 2 options required validation
    - Conditional MOV requirement checkbox
  - **Tech:** React Hook Form, shadcn/ui Input, Switch, Button
  - **Duration:** 3 hours

- [x] **2.4.3 Atomic: Create RadioButtonFieldProperties component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/FieldProperties/RadioButtonProperties.tsx`
  - **Dependencies:** 2.4.1
  - **Acceptance Criteria:**
    - Same as CheckboxGroupProperties
    - Form fields: label, field_id, required, help_text, options
    - Options management (add, edit, delete, reorder)
    - Minimum 2 options validation
  - **Tech:** React Hook Form, shadcn/ui
  - **Duration:** 2.5 hours

- [x] **2.4.4 Atomic: Create NumberInputFieldProperties component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/FieldProperties/NumberInputProperties.tsx`
  - **Dependencies:** 2.4.1
  - **Acceptance Criteria:**
    - Form fields: label, field_id, required, help_text
    - Min value input (optional)
    - Max value input (optional)
    - Validation: min < max if both provided
    - Placeholder text input
    - Default value input
  - **Tech:** React Hook Form, shadcn/ui Input
  - **Duration:** 2 hours

- [x] **2.4.5 Atomic: Create TextInputFieldProperties component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/FieldProperties/TextInputProperties.tsx`
  - **Dependencies:** 2.4.1
  - **Acceptance Criteria:**
    - Form fields: label, field_id, required, help_text
    - Max length input (optional)
    - Placeholder text
    - Default value
  - **Tech:** React Hook Form, shadcn/ui Input
  - **Duration:** 1.5 hours

- [x] **2.4.6 Atomic: Create TextAreaFieldProperties component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/FieldProperties/TextAreaProperties.tsx`
  - **Dependencies:** 2.4.1
  - **Acceptance Criteria:**
    - Form fields: label, field_id, required, help_text
    - Max length input
    - Rows input (textarea height)
    - Placeholder text
  - **Tech:** React Hook Form, shadcn/ui Textarea
  - **Duration:** 1.5 hours

- [x] **2.4.7 Atomic: Create DatePickerFieldProperties component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/FieldProperties/DatePickerProperties.tsx`
  - **Dependencies:** 2.4.1
  - **Acceptance Criteria:**
    - Form fields: label, field_id, required, help_text
    - Min date input (optional)
    - Max date input (optional)
    - Validation: min_date < max_date if both provided
    - Default to today toggle
  - **Tech:** React Hook Form, shadcn/ui Calendar/DatePicker
  - **Duration:** 2 hours

- [x] **2.4.8 Atomic: Create FileUploadFieldProperties component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/FieldProperties/FileUploadProperties.tsx`
  - **Dependencies:** 2.4.1
  - **Acceptance Criteria:**
    - Form fields: label, field_id, required, help_text
    - Allowed file types input (comma-separated)
    - Max file size input (MB)
    - Conditional MOV requirement:
      - Toggle "Require MOV if specific condition met"
      - Field selector (from existing fields)
      - Operator selector (equals, not equals)
      - Value input
  - **Tech:** React Hook Form, shadcn/ui Input, Select
  - **Duration:** 3 hours

---

## Story 2.5: Frontend Form Builder - Live Preview & JSON Viewer

**Duration:** 1 day **Dependencies:** 2.4

### Atomic Tasks

- [x] **2.5.1 Atomic: Create FormPreview component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/FormPreview.tsx`
  - **Dependencies:** 2.3.1
  - **Acceptance Criteria:**
    - Reads fields from Zustand store
    - Renders each field as it would appear to BLGU user
    - Uses shadcn/ui form components
    - Shows labels, placeholders, help text
    - Displays required indicators (\*)
    - Shows validation rules visually (e.g., "Min: 0, Max: 100")
    - Non-interactive (read-only preview)
    - Responsive layout matching BLGU view
  - **Tech:** React, shadcn/ui Form components
  - **Duration:** 3 hours

- [x] **2.5.2 Atomic: Create JsonViewer component with syntax highlighting**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/JsonViewer.tsx`
  - **Dependencies:** 2.3.1
  - **Acceptance Criteria:**
    - Reads fields from Zustand store
    - Converts to JSON string (pretty-printed)
    - Displays with syntax highlighting (use react-json-view or similar)
    - "Copy to Clipboard" button
    - Collapsible sections for readability
    - Read-only (no editing JSON directly)
    - Shows validation errors if schema invalid
  - **Tech:** React, react-json-view or @uiw/react-json-view
  - **Duration:** 2 hours

- [x] **2.5.3 Atomic: Create ViewModeToggle component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/ViewModeToggle.tsx`
  - **Dependencies:** None
  - **Acceptance Criteria:**
    - Three-way toggle: "Builder" | "Preview" | "JSON"
    - Uses shadcn/ui Tabs or ToggleGroup
    - Stores selected mode in local state
    - Keyboard shortcuts: Ctrl+1 (Builder), Ctrl+2 (Preview), Ctrl+3 (JSON)
    - Visual active state
  - **Tech:** React, shadcn/ui Tabs
  - **Duration:** 1.5 hours

- [x] **2.5.4 Atomic: Integrate toggle into FormSchemaBuilder**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder.tsx` (update)
  - **Dependencies:** 2.5.1, 2.5.2, 2.5.3
  - **Acceptance Criteria:**
    - Add ViewModeToggle to top of component
    - Conditionally render based on selected mode:
      - Builder: show FieldPalette + Canvas + PropertiesPanel
      - Preview: show FormPreview (full width)
      - JSON: show JsonViewer (full width)
    - Smooth transitions between modes
    - State persists when switching modes
  - **Tech:** React conditional rendering
  - **Duration:** 1.5 hours

---

## Story 2.6: Frontend Form Builder - Integration & Persistence

**Duration:** 1 day **Dependencies:** 2.5

### Atomic Tasks

- [x] **2.6.1 Atomic: Create form builder page for new indicator**
  - **Files:**
    - `apps/web/src/app/(app)/mlgoo/indicators/new/page.tsx`
  - **Dependencies:** 2.5.4
  - **Acceptance Criteria:**
    - Page title: "Create New Indicator"
    - Breadcrumb: Admin / Indicators / New
    - Form with basic fields: name, description, governance area, parent (optional)
    - Renders FormSchemaBuilder component
    - "Save Draft" button (saves without form_schema)
    - "Save & Publish" button (validates and saves)
    - Uses useCreateIndicator mutation
    - Redirects to indicator list page on success
  - **Tech:** Next.js App Router, React Hook Form
  - **Duration:** 3 hours
  - **Completed:** 2025-11-06

- [x] **2.6.2 Atomic: Create form builder page for editing indicator**
  - **Files:**
    - `apps/web/src/app/(app)/mlgoo/indicators/[id]/edit/page.tsx`
  - **Dependencies:** 2.5.4
  - **Acceptance Criteria:**
    - Fetch indicator by ID on page load
    - Pre-populate form with existing data
    - Load existing form_schema into Zustand store
    - Same UI as create page
    - "Save Changes" button
    - Uses useUpdateIndicator mutation
    - Warning if navigating away with unsaved changes
    - Redirects to indicator list page on success
  - **Tech:** Next.js App Router, React Hook Form
  - **Duration:** 3 hours
  - **Completed:** 2025-11-06

- [x] **2.6.3 Atomic: Implement client-side validation before save**
  - **Files:**
    - `apps/web/src/lib/form-schema-validation.ts` (created)
    - `apps/web/src/components/features/indicators/SaveFormSchemaButton.tsx` (created)
  - **Dependencies:** 2.6.2
  - **Acceptance Criteria:**
    - Validate all fields have unique field_ids
    - Validate required fields are filled
    - Validate no circular references (using DFS algorithm)
    - Validate options exist for checkbox/radio fields
    - Validate min < max for number/date fields
    - Display validation errors in dialog with scrollable list
    - Prevent save if validation fails
  - **Tech:** Custom validation functions, React Hook Form
  - **Duration:** 2 hours
  - **Completed:** 2025-11-06

- [x] **2.6.4 Atomic: Implement server-side validation integration**
  - **Files:**
    - `apps/api/app/services/indicator_service.py` (updated)
    - `apps/web/src/components/features/indicators/SaveFormSchemaButton.tsx`
  - **Dependencies:** 2.2.1 (validation endpoint)
  - **Acceptance Criteria:**
    - On "Save" click, server validates form_schema via indicator_service
    - If server returns errors, display in toast notification
    - Server validation converts dict to Pydantic FormSchema model
    - Backend calls form_schema_validator for validation
    - Only save to database if server validation passes
  - **Tech:** TanStack Query mutation, error handling
  - **Duration:** 3 hours
  - **Completed:** 2025-11-06

- [x] **2.6.5 Atomic: Implement save functionality with loading states**
  - **Files:**
    - `apps/web/src/components/features/indicators/SaveFormSchemaButton.tsx`
  - **Dependencies:** 2.6.4
  - **Acceptance Criteria:**
    - "Save" button triggers save mutation
    - Button shows loading spinner during save
    - Button disabled while saving
    - Success toast on successful save
    - Error toast with details on failure
    - Invalidate queries after save
  - **Tech:** TanStack Query mutations, shadcn/ui Toast
  - **Duration:** 2 hours
  - **Completed:** 2025-11-06

- [x] **2.6.6 Atomic: Implement unsaved changes warning**
  - **Files:**
    - `apps/web/src/store/useFormBuilderStore.ts` (updated with isDirty tracking)
    - `apps/web/src/app/(app)/mlgoo/indicators/new/page.tsx` (unsaved changes dialog)
  - **Dependencies:** 2.3.1
  - **Acceptance Criteria:**
    - Track if form has unsaved changes via isDirty flag in store
    - Show custom dialog on navigate away with unsaved changes
    - Use Next.js router events and beforeunload for detection
    - Clear warning after successful save (markAsSaved())
    - "Discard Changes" and "Continue Editing" buttons
  - **Tech:** React useEffect, Next.js router, browser beforeunload event
  - **Duration:** 2 hours
  - **Completed:** 2025-11-06

---

## Story 2.7: Testing for Form Schema Builder

**Duration:** 1 day **Dependencies:** 2.6 **Status:** ⏸️ DEFERRED - Epic 2.0 is functionally
complete. Testing deferred to future sprint.

### Atomic Tasks

- [ ] **2.7.1 Atomic: Write tests for FieldPalette component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/FieldPalette.test.tsx`
  - **Dependencies:** 2.3.3
  - **Acceptance Criteria:**
    - Test all 7 field types render
    - Test field buttons are draggable
    - Test tooltips appear on hover
    - Test icons display correctly
  - **Tech:** Vitest, React Testing Library
  - **Duration:** 1.5 hours

- [ ] **2.7.2 Atomic: Write tests for drag-and-drop functionality**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/FormSchemaBuilder.test.tsx`
  - **Dependencies:** 2.3.4
  - **Acceptance Criteria:**
    - Mock @dnd-kit interactions
    - Test dragging field from palette to canvas adds field
    - Test reordering fields in canvas updates store
    - Test drop zones are active
    - Test visual indicators during drag
  - **Tech:** Vitest, React Testing Library, @dnd-kit testing utils
  - **Duration:** 3 hours

- [ ] **2.7.3 Atomic: Write tests for field property components**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/FieldProperties/*.test.tsx`
  - **Dependencies:** 2.4.8
  - **Acceptance Criteria:**
    - Test CheckboxGroupProperties validates min 2 options
    - Test NumberInputProperties validates min < max
    - Test DatePickerProperties validates date range
    - Test FileUploadProperties conditional MOV logic
    - Test form submission updates store
    - Test validation errors display
  - **Tech:** Vitest, React Testing Library, React Hook Form testing
  - **Duration:** 3 hours

- [ ] **2.7.4 Atomic: Write tests for FormPreview component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/FormPreview.test.tsx`
  - **Dependencies:** 2.5.1
  - **Acceptance Criteria:**
    - Mock Zustand store with sample fields
    - Test all 7 field types render correctly
    - Test required indicators display
    - Test help text appears
    - Test validation rules shown
    - Test layout matches BLGU view
  - **Tech:** Vitest, React Testing Library, Zustand testing
  - **Duration:** 2 hours

- [ ] **2.7.5 Atomic: Write tests for JsonViewer component**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/JsonViewer.test.tsx`
  - **Dependencies:** 2.5.2
  - **Acceptance Criteria:**
    - Test JSON renders with syntax highlighting
    - Test "Copy to Clipboard" button works
    - Test validation errors display
    - Test collapsible sections
  - **Tech:** Vitest, React Testing Library
  - **Duration:** 1.5 hours

- [ ] **2.7.6 Atomic: Write integration test for complete form builder workflow**
  - **Files:**
    - `apps/web/src/components/features/admin/indicators/FormSchemaBuilder/FormSchemaBuilder.integration.test.tsx`
  - **Dependencies:** 2.6.6
  - **Acceptance Criteria:**
    - Test complete workflow: drag field → configure → preview → validate → save
    - Mock API endpoints with MSW
    - Test validation errors prevent save
    - Test successful save redirects
    - Test unsaved changes warning
  - **Tech:** Vitest, React Testing Library, MSW
  - **Duration:** 4 hours

---

## Summary

**Epic 2.0 Total Atomic Tasks:** 37 tasks (35 implementation + 2 additional noted) **Estimated Total
Duration:** 7-10 days **Actual Duration:** ~6 days (Completed November 6, 2025)

### Task Breakdown by Story:

- Story 2.1 (Data Models): ✅ 4/4 tasks complete (8 hours)
- Story 2.2 (Validation Service): ✅ 4/4 tasks complete (9 hours)
- Story 2.3 (Core Architecture): ✅ 5/5 tasks complete (14 hours)
- Story 2.4 (Field Components): ✅ 8/8 tasks complete (17.5 hours)
- Story 2.5 (Preview & JSON): ✅ 4/4 tasks complete (8 hours)
- Story 2.6 (Integration): ✅ 6/6 tasks complete (15 hours)
- Story 2.7 (Testing): ⏸️ 6/6 tasks deferred (15 hours)

**Completed: 31/37 tasks (84% complete)** **Functional Status: 100% - All implementation complete,
testing deferred**

All tasks are 1.5-4 hours, suitable for junior developers, with clear acceptance criteria and file
paths.
