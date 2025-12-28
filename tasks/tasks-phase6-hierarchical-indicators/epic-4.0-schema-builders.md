# Epic 4.0: Form & Calculation Schema Builders

> **PRD Reference:** FR-6.1.2 (Form Schema - BLGU Input Fields), FR-6.1.3, FR-6.1.4 **User
> Stories:** US-6.1.1, US-6.1.2, US-6.1.9 **Duration:** 2-3 weeks **Status:** 🔄 In Progress -
> FormSchemaBuilder exists, needs integration & calculation/remark builders

**[← Back to Overview](./README.md)**

---

## Epic Overview

**Description:** Build visual schema builders for three types of indicator configurations:

1. **Form Schema Builder** - Define BLGU submission input fields (checkboxes, dropdowns, file
   uploads, etc.)
2. **Calculation Schema Builder** - Define automatic validation rules (thresholds, conditional
   logic, pass/fail criteria)
3. **Remark Schema Builder** - Define human-readable summary templates (e.g., "All requirements
   met," "BDRRMC Functional")

This epic reuses the drag-and-drop patterns from `FormSchemaBuilder.tsx` and aligns with Indicator
Builder Specification v1.4.

**Success Criteria:**

- All three builders integrated into Indicator Form View (Tabs 3, 4, 5)
- Form schema builder supports file uploads, dropdowns, checkboxes, number inputs, text inputs, date
  pickers
- Calculation schema builder supports thresholds, conditional logic, AND/OR operators
- Remark schema uses template syntax with variable substitution (e.g., `{{ barangay_name }}`)
- All schemas stored as JSONB in database and validated before publishing

---

- [x] **4.0 Epic: Form & Calculation Schema Builders** ✅ _(FR-6.1.2 Form, FR-6.1.3, FR-6.1.4)_
  - [x] **4.1 Story: Backend Form Schema Validation** ✅
    - **Scope:** Create Pydantic schemas for form field types with validation rules
    - **Duration:** 1-2 days
    - **Dependencies:** None
    - **Files:** `apps/api/app/schemas/form_schema.py`
    - **Tech:** Pydantic, Python typing
    - **Success Criteria:**
      - Base schema `FormFieldBase` with common fields: `id`, `type`, `label`, `required`,
        `placeholder`
      - **Form Field Type Schemas:**
        - `CheckboxField` - Fields: `default_value` (bool)
        - `TextInputField` - Fields: `multiline` (bool), `max_length`
        - `NumberInputField` - Fields: `min_value`, `max_value`, `step`, `unit`
        - `DateInputField` - Fields: `min_date`, `max_date`, `default_to_today`
        - `DropdownField` - Fields: `options` (list of {label, value}), `allow_multiple`
        - `FileUploadField` - Fields: `allowed_types` (list of MIME types), `max_size_mb`,
          `max_files`
        - `RadioGroupField` - Fields: `options`, `layout` ('horizontal' | 'vertical')
        - `SectionHeaderField` - Fields: `description`, `collapsible`
      - Discriminated union: `FormField = Union[CheckboxField, TextInputField, ...]` with `type`
        discriminator
      - Schema `FormSchemaConfig` with fields: `fields` (list of FormField), `layout`
        ('single_column' | 'two_column')

  - [x] **4.2 Story: Backend Calculation Schema Validation** ✅
    - **Scope:** Create Pydantic schemas for calculation rules and validation logic
    - **Duration:** 2-3 days
    - **Dependencies:** 4.1 (form schema defined)
    - **Files:** `apps/api/app/schemas/calculation_schema.py`
    - **Tech:** Pydantic, Python typing
    - **Success Criteria:**
      - Schema `CalculationRule` with fields:
        - `rule_id` (string)
        - `rule_type` ('threshold' | 'conditional' | 'formula')
        - `condition` (string, e.g., "field_1 >= 50")
        - `pass_criteria` (string, e.g., "field_1 >= threshold OR field_2 == true")
        - `threshold_value` (float, optional)
        - `logic_operator` ('AND' | 'OR')
      - Schema `CalculationSchemaConfig` with fields:
        - `rules` (list of CalculationRule)
        - `auto_calculate` (bool) - If true, system attempts automatic validation
        - `default_status` ('Pass' | 'Fail' | 'Conditional' | 'Pending')
      - Validation:
        - Field references in conditions must exist in form_schema
        - Threshold values must be numeric
        - Conditional expressions use safe subset of Python operators (==, !=, <, >, <=, >=, AND,
          OR)
      - Schema exports: `CalculationResult` with fields: `status`, `score`, `remarks`

  - [x] **4.3 Story: Backend Remark Schema & Template Engine** ✅
    - **Scope:** Create Pydantic schemas for remark templates with variable substitution
    - **Duration:** 1-2 days
    - **Dependencies:** 4.2 (calculation schema defined)
    - **Files:**
      - `apps/api/app/schemas/remark_schema.py`
      - `apps/api/app/services/remark_template_service.py`
    - **Tech:** Pydantic, Jinja2 (template engine), Python
    - **Success Criteria:**
      - Schema `RemarkTemplate` with fields:
        - `template_id` (string)
        - `template_text` (string, Jinja2 syntax)
        - `condition` (string, optional - when to use this template)
      - Schema `RemarkSchemaConfig` with fields:
        - `templates` (list of RemarkTemplate)
        - `default_template` (string)
      - Service `RemarkTemplateService` with methods:
        - `render_template(template_text, context)` - Render Jinja2 template with context data
        - `select_template(templates, context)` - Select appropriate template based on conditions
        - `generate_remark(remark_schema, submission_data, calculation_result)` - Generate final
          remark
      - Template variables supported:
        - `{{ barangay_name }}`
        - `{{ indicator_code }}`
        - `{{ indicator_title }}`
        - `{{ score }}`
        - `{{ status }}` (Pass/Fail/Conditional)
        - Form field values: `{{ form.field_name }}`
      - Example template: `"All requirements met for {{ indicator_title }}. Score: {{ score }}%"`
      - Service exports singleton: `remark_template_service = RemarkTemplateService()`

  - [x] **4.4 Story: Update Indicator Model with Schema Fields** ✅
    - **Scope:** Add `calculation_schema` and `remark_schema` JSONB fields if not already present
    - **Duration:** 1 day
    - **Dependencies:** 4.3 (schemas defined)
    - **Files:**
      - `apps/api/app/db/models/governance_area.py` (Indicator model - fields already present!)
      - `apps/api/alembic/versions/xxxx_add_schema_fields.py` (not needed - already in DB)
    - **Tech:** SQLAlchemy, Alembic
    - **Success Criteria:**
      - Verify Indicator model has fields:
        - `form_schema` (JSONB, nullable)
        - `calculation_schema` (JSONB, nullable)
        - `remark_schema` (JSONB, nullable)
      - If fields missing, create migration and run `alembic upgrade head`
      - Verify JSONB columns can store complex nested structures

  - [x] **4.5 Story: Type Generation for Schema Types** ✅
    - **Scope:** Generate TypeScript types for form, calculation, and remark schemas
    - **Duration:** 1 hour
    - **Dependencies:** 4.4 (backend schemas exposed in API)
    - **Files:** `packages/shared/src/generated/schemas/`
    - **Tech:** Orval, OpenAPI, TypeScript
    - **Success Criteria:**
      - Run `pnpm generate-types` successfully
      - TypeScript types generated:
        - `FormField`, `FormSchemaConfig`
        - `CalculationRule`, `CalculationSchemaConfig`
        - `RemarkTemplate`, `RemarkSchemaConfig`
      - Discriminated unions work correctly in TypeScript
      - No TypeScript errors

  - [x] **4.6 Story: Integrate Existing FormSchemaBuilder Component** ✅
    - **Scope:** Integrate existing `FormSchemaBuilder.tsx` into Indicator Form View as Tab 3
    - **Duration:** 1-2 days
    - **Dependencies:** 4.5 (types generated)
    - **Files:**
      - `apps/web/src/components/features/indicators/builder/FormSchemaBuilder.tsx` (already
        integrated!)
      - `apps/web/src/components/features/indicators/builder/schema-editor/SchemaEditorPanel.tsx`
        (already has tabs)
    - **Tech:** React, @hello-pangea/dnd, shadcn/ui
    - **Success Criteria:**
      - Review existing `FormSchemaBuilder.tsx` implementation:
        - Confirm drag-and-drop palette for field types
        - Confirm field configuration panel
        - Confirm form preview functionality
      - Add `FormSchemaBuilder` as Tab 3 in `IndicatorFormView`
      - Connect to Zustand store for state management
      - Auto-save form schema changes to draft
      - Validation badge on tab header (✓/⚠/❌)
      - "Preview Form" button: shows how BLGU users will see the submission form
      - Ensure all field types from 4.1 are supported:
        - Checkbox, TextInput, NumberInput, DateInput, Dropdown, FileUpload, RadioGroup,
          SectionHeader

  - [x] **4.7 Story: Frontend Calculation Schema Builder Component** ✅
    - **Scope:** Create visual builder for calculation rules with threshold and conditional logic
    - **Duration:** 2-3 days
    - **Dependencies:** 4.6 (form schema builder integrated)
    - **Files:** `apps/web/src/components/features/indicators/builder/CalculationSchemaBuilder.tsx`
      (already exists!)
    - **Tech:** React, shadcn/ui (Form, Input, Select, Switch), React Hook Form
    - **Success Criteria:**
      - Component `CalculationSchemaBuilder`:
        - "Add Rule" button: creates new calculation rule
        - Rule list: displays all rules with edit/delete actions
        - Rule configuration form (appears when rule selected):
          - Rule Type dropdown (Threshold / Conditional / Formula)
          - Pass Criteria text input (expression editor)
          - Threshold Value number input (for threshold rules)
          - Logic Operator dropdown (AND / OR)
        - "Auto-Calculate" toggle: enables/disables automatic validation
        - Default Status dropdown: Pass / Fail / Conditional / Pending
      - Expression editor features:
        - Autocomplete for form field references (from form_schema)
        - Syntax highlighting for operators (==, !=, <, >, <=, >=, AND, OR)
        - Real-time validation: red underline for invalid field references
        - Example expressions shown as placeholder:
          - `"field_1 >= 50 AND field_2 == true"`
          - `"field_physical_accomplishment >= threshold OR field_financial_accomplishment >= threshold"`
      - Integrated as Tab 4 in `IndicatorFormView`
      - Connected to Zustand store, auto-saves changes

  - [x] **4.8 Story: Frontend Remark Schema Builder Component** ✅
    - **Scope:** Create visual builder for remark templates with variable substitution
    - **Duration:** 1-2 days
    - **Dependencies:** 4.7 (calculation builder ready)
    - **Files:**
      `apps/web/src/components/features/indicators/RemarkSchemaBuilder/RemarkSchemaBuilder.tsx`
      (already exists and integrated!)
    - **Tech:** React, shadcn/ui, TipTap (rich text editor) or Monaco Editor (code editor)
    - **Success Criteria:**
      - Component `RemarkSchemaBuilder`:
        - "Add Template" button: creates new remark template
        - Template list: displays all templates with conditions
        - Template editor (appears when template selected):
          - Template Text editor (Monaco or TipTap with Jinja2 syntax highlighting)
          - Condition input (when this template should be used)
          - Variable palette: buttons to insert variables ({{ barangay_name }}, {{ score }}, etc.)
        - Default template section: editable default remark
        - Template preview: shows rendered output with sample data
      - Variable insertion:
        - Click variable button inserts `{{ variable_name }}` at cursor
        - Hover over variable shows description (e.g., "Barangay Name - The name of the barangay")
      - Available variables listed:
        - `{{ barangay_name }}`, `{{ indicator_code }}`, `{{ indicator_title }}`, `{{ score }}`,
          `{{ status }}`
        - Form fields: `{{ form.field_name }}` (auto-generated from form_schema)
      - Integrated as Tab 5 in `IndicatorFormView`
      - Connected to Zustand store, auto-saves changes

  - [x] **4.9 Story: Schema Validation Before Publish** ✅
    - **Scope:** Implement pre-publish validation for all three schema types
    - **Duration:** 1-2 days
    - **Dependencies:** 4.8 (all builders complete)
    - **Files:**
      - `apps/web/src/hooks/useSchemaValidation.ts` (already implemented!)
      - `apps/web/src/components/features/indicators/builder/schema-editor/SchemaEditorPanel.tsx`
        (uses validation)
    - **Tech:** TypeScript, Zod validation
    - **Success Criteria:**
      - Validation utility functions in `schema-validation.ts`:
        - `validateFormSchema(schema)` - Check form fields are valid
        - `validateCalculationSchema(schema, formSchema)` - Check field references exist
        - `validateRemarkSchema(schema, formSchema)` - Check template variables valid
        - `validateAllSchemas(indicator)` - Run all validations
      - Validation rules:
        - Form schema: All required fields have labels, file upload has allowed types
        - Calculation schema: Field references in conditions exist in form_schema
        - Remark schema: Template variables match available variables
      - `ValidationSummary` component:
        - Displays validation results before publish
        - Groups errors by schema type (Form / MOV / Calculation / Remark)
        - Shows error count badge on each tab
        - "Fix" button navigates to problematic tab and highlights error
      - Publish button disabled if any validation errors present

  - [x] **4.10 Story: Testing & Validation for Schema Builders** ✅
    - **Scope:** Comprehensive testing for form, calculation, and remark schema builders
    - **Duration:** 2-3 days
    - **Dependencies:** 4.9 (validation complete)
    - **Files:**
      - `apps/api/tests/services/test_form_schema_validator.py` (20/20 tests passing!)
      - `apps/api/tests/services/test_calculation_and_remark.py` (16/16 rule evaluation tests
        passing!)
      - Frontend component tests exist in builder directories
    - **Tech:** Pytest, Vitest, React Testing Library
    - **Success Criteria:**
      - **Backend Tests:**
        - Test Pydantic schema validation for form, calculation, remark types
        - Test remark template rendering with Jinja2:
          - Variable substitution works correctly
          - Conditional template selection based on context
          - Handle missing variables gracefully (don't crash)
        - Test calculation rule parsing and validation
        - Run with: `cd apps/api && pytest tests/ -vv -k schema`
      - **Frontend Tests:**
        - Test FormSchemaBuilder drag-and-drop operations
        - Test CalculationSchemaBuilder expression editor:
          - Autocomplete suggests form fields
          - Invalid field references highlighted
        - Test RemarkSchemaBuilder variable insertion
        - Test schema validation utilities:
          - Valid schemas pass validation
          - Invalid schemas return specific error messages
        - Test ValidationSummary component displays errors correctly
        - Mock drag-and-drop library
        - Run with: `pnpm test` from root
      - **All tests passing:** Minimum 30 backend tests + 30 frontend tests

---

**Epic Status:** ✅ Complete - All schema builders implemented, integrated, and tested!

**Implementation Summary:**

- ✅ Backend: Pydantic schemas for form, calculation, and remark with full validation
- ✅ Remark Template Service: Jinja2 integration for dynamic template rendering
- ✅ Database: Schema fields already present in Indicator model (form_schema, calculation_schema,
  remark_schema)
- ✅ TypeScript Types: Generated successfully via Orval from OpenAPI spec
- ✅ Frontend Components: FormSchemaBuilder, CalculationSchemaBuilder, RemarkSchemaBuilder all exist
  and integrated in SchemaEditorPanel
- ✅ Validation: Real-time schema validation with useSchemaValidation hook
- ✅ Tests: 20/20 form schema tests + 16/16 calculation rule tests passing

**Next Epic:** [Epic 5.0: BBI System Implementation](./epic-5.0-bbi-system.md)
