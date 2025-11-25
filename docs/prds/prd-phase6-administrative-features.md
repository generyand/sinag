# Product Requirements Document (PRD)
## Phase 6: Administrative Features (MLGOO-DILG)

**Version:** 1.1
**Date:** November 12, 2025
**Status:** Draft
**Author:** SINAG Development Team
**Based on:** November 4, 2025 DILG Consultation

---

## Document History

| Version | Date | Author | Summary of Changes |
|---------|------|--------|-------------------|
| 1.1 | November 12, 2025 | SINAG Development Team | **Phase 1 PRD Alignment**: Aligned with Indicator Builder Specification v1.4<br/>- Added comprehensive MOV checklist item catalog to [Section 4.1.2 (Form Schema Builder)](#412-form-schema-builder) (9 item types with validation patterns)<br/>- Added mandatory 9 BBI list with governance area mappings to [Section 4.2.1 (BBI Definition Management)](#421-bbi-definition-management)<br/>- Enhanced [Section 4.2.2 (Indicator-to-BBI Mapping)](#422-indicator-to-bbi-mapping) with BBI mapping clarifications (one-to-one relationship, validation status table, grace period handling)<br/>- Added Indicator Builder Specification v1.4 reference to [Appendix A](#appendix-a-related-documents)<br/>- Clarified BBI functionality determination: Indicator result → BBI status (no cross-references) |
| 1.0 | November 6, 2025 | SINAG Development Team | Initial draft based on November 4, 2025 DILG Consultation |

---

## 1. Introduction/Overview

**Project Title:** SGLGB Analytics System: Strategic Insights Nurturing Assessments and Governance (SINAG) To Assess And Assist Barangays utilizing a Large Language Model and Classification Algorithm

### Problem Statement

The MLGOO-DILG currently lacks the administrative tools needed to independently manage the SINAG system as SGLGB standards evolve. Changes to indicators, assessment rules, deadlines, and BBI (Barangay-based Institutions) configuration currently require developer intervention, creating bottlenecks and reducing system adaptability.

### Solution Overview

Phase 6 introduces a comprehensive administrative interface that empowers the MLGOO-DILG to:

1. **Manage SGLGB Indicators** - Create, edit, and deactivate indicators with metadata-driven form schemas and calculation rules
2. **Configure BBI Functionality Logic** - Define which indicators determine whether BBIs (e.g., Lupon, BAC, BCPC) are "Functional" or "Non-Functional"
3. **Control Assessment Cycles & Deadlines** - Set phase-specific deadlines and provide granular deadline extensions for specific barangays

This phase transforms SINAG from a developer-dependent system into a flexible, MLGOO-controlled platform that adapts to changing SGLGB requirements without code changes.

### Goal

Enable the MLGOO-DILG to independently manage all critical aspects of the SGLGB assessment system, including indicator definitions, calculation logic, BBI mappings, and deadline control, without requiring developer support.

---

## 2. Goals

1. **MLGOO-DILG Independence**: Eliminate dependency on developers for indicator updates, rule changes, and deadline management
2. **Metadata-Driven Flexibility**: Support complex, dynamic indicator logic through visual configuration tools (form_schema and calculation_schema builders)
3. **BBI Automation**: Enable automatic calculation of BBI functionality status based on configurable indicator-to-BBI mappings
4. **Granular Deadline Control**: Provide the ability to unlock submissions and extend deadlines at the indicator and barangay level
5. **System Adaptability**: Allow the system to evolve with SGLGB standards through administrative configuration rather than code changes
6. **Audit & Accountability**: Maintain comprehensive audit trails for all administrative actions
7. **Historical Data Integrity**: Ensure changes to indicators do not retroactively affect completed or in-progress assessments

---

## 3. User Stories

### 3.1 Hierarchical Indicator Creation (NEW - Added Nov 9, 2025)

**US-6.0.1:** As an MLGOO-DILG administrator, I want to create a complete set of hierarchical indicators (e.g., 1.1, 1.1.1, 1.2, 1.2.1) for a governance area in a single workflow session, so that I can efficiently build the full indicator structure without creating indicators one by one.

**US-6.0.2:** As an MLGOO-DILG administrator, I want my indicator creation progress to be automatically saved as a draft every few seconds, so that I don't lose my work if I get interrupted or need to step away.

**US-6.0.3:** As an MLGOO-DILG administrator, I want to resume working on an incomplete indicator draft from the list of my saved drafts, so that I can complete indicator creation over multiple sessions.

**US-6.0.4:** As an MLGOO-DILG administrator, I want to reorder indicators in the hierarchy using drag-and-drop, so that I can easily reorganize the structure without manually renumbering everything.

**US-6.0.5:** As an MLGOO-DILG administrator, I want the system to automatically renumber indicators (1.1 → 1.2) when I reorder them, so that the numbering stays consistent without manual work.

**US-6.0.6:** As an MLGOO-DILG administrator, I want to use a visual form builder to define form schemas for each indicator, so that I can specify data collection fields without writing JSON code.

**US-6.0.7:** As an MLGOO-DILG administrator, I want the system to validate my indicator set before publishing (checking for missing required fields, weight sum errors, invalid calculation references), so that I catch errors before indicators go live.

**US-6.0.8:** As an MLGOO-DILG administrator, I want to publish an entire set of hierarchical indicators as a single transaction, so that all indicators appear together and maintain referential integrity.

### 3.1 Indicator Management

**US-6.1.1:** As an MLGOO-DILG administrator, I want to create a new SGLGB indicator with custom input fields (checkboxes, number inputs, date pickers, file uploads) using a visual form builder, so that I can adapt the system to updated DILG Technical Notes without developer help.

**US-6.1.2:** As an MLGOO-DILG administrator, I want to define calculation rules for an indicator (e.g., "Pass if 50% physical accomplishment OR 50% financial accomplishment") using a visual rule builder, so that the system can automatically determine compliance status based on BLGU submissions.

**US-6.1.3:** As an MLGOO-DILG administrator, I want to mark an indicator as "auto-calculable" or "human-judged only," so that the system knows whether to attempt automatic validation or leave it entirely to Assessor/Validator judgment.

**US-6.1.4:** As an MLGOO-DILG administrator, I want to edit an existing indicator's form schema or calculation schema, knowing that changes will only apply to future assessments, so that I can improve the system without invalidating historical data.

**US-6.1.5:** As an MLGOO-DILG administrator, I want to deactivate an outdated indicator, so that it no longer appears in new assessment cycles while preserving historical assessment data.

**US-6.1.6:** As an MLGOO-DILG administrator, I want to preview the JSON representation of my form_schema and calculation_schema, so that I can debug issues or share configurations with technical support if needed.

**US-6.1.7:** As an MLGOO-DILG administrator, I want to define when MOVs are required for an indicator (e.g., "MOV required if checkbox X is checked"), so that the system enforces proper documentation standards dynamically.

**US-6.1.8:** As an MLGOO-DILG administrator, I want to specify whether an indicator supports the "Conditional" status option, so that Assessors/Validators only see this choice when it's applicable.

**US-6.1.9:** As an MLGOO-DILG administrator, I want to define a remark_schema for an indicator to generate human-readable summaries (e.g., "All requirements met," "BDRRMC Functional"), so that reports automatically provide meaningful status descriptions.

### 3.2 BBI Configuration

**US-6.2.1:** As an MLGOO-DILG administrator, I want to create a BBI definition (e.g., "Lupon Tagapamayapa," "Barangay Anti-Drug Abuse Council"), so that the system can track and report on BBI functionality across all barangays.

**US-6.2.2:** As an MLGOO-DILG administrator, I want to map specific indicators to a BBI and define the rule for "Functional" status (e.g., "If Indicator 1.1 = Pass AND Indicator 1.2 = Pass, then Lupon = Functional"), so that the system automatically calculates BBI status from assessment results.

**US-6.2.3:** As an MLGOO-DILG administrator, I want to edit BBI calculation rules when DILG standards change, so that future assessments reflect updated BBI functionality criteria.

**US-6.2.4:** As an MLGOO-DILG administrator, I want to view a list of all configured BBIs and their associated indicator mappings, so that I can audit and verify the system's BBI logic.

### 3.3 Assessment Cycle & Deadline Management

**US-6.3.1:** As an MLGOO-DILG administrator, I want to create a new SGLGB assessment cycle with distinct deadlines for Table Assessment Phase 1, Rework, Table Validation Phase 2, and Calibration, so that the system enforces proper workflow timing.

**US-6.3.2:** As an MLGOO-DILG administrator, I want to view the current deadline status for all barangays across all phases, so that I can monitor overall progress and identify at-risk submissions.

**US-6.3.3:** As an MLGOO-DILG administrator, I want to unlock submissions for specific indicators for a specific barangay that missed the deadline, so that I can provide "leeway" to barangays facing legitimate challenges.

**US-6.3.4:** As an MLGOO-DILG administrator, I want to extend the deadline for specific indicators for a specific barangay by selecting a new deadline date, so that I can assist barangays on a case-by-case basis.

**US-6.3.5:** As an MLGOO-DILG administrator, I want to see a notification/confirmation before applying deadline overrides, so that I can avoid accidental changes.

**US-6.3.6:** As an MLGOO-DILG administrator, I want to view an audit log of all deadline overrides I've applied (with timestamps and reasons), so that I can maintain accountability and track my administrative actions.

### 3.4 Audit & Historical Integrity

**US-6.4.1:** As an MLGOO-DILG administrator, I want to view a complete audit trail of all indicator edits (who changed what, when), so that I can ensure accountability and debug issues.

**US-6.4.2:** As an MLGOO-DILG administrator, I want the system to clearly show me which version of an indicator was active during a specific assessment cycle, so that I can understand historical results in their proper context.

**US-6.4.3:** As a developer or system auditor, I want assurance that changes to indicators never retroactively affect completed or in-progress assessments, so that historical data integrity is maintained.

---

## 4. Functional Requirements

### 4.0 Hierarchical Indicator Creation Wizard (NEW - Added Nov 9, 2025)

#### 4.0.1 Multi-Step Wizard Interface

**FR-6.0.1.1:** The system MUST provide a multi-step "Indicator Builder" wizard accessible only to MLGOO_DILG users at `/mlgoo/indicators/builder`.

**FR-6.0.1.2:** The wizard MUST consist of 4 steps:
- Step 1: Select Governance Area & Creation Mode
- Step 2: Build Hierarchical Structure
- Step 3: Configure Schemas (Form, Calculation, Remark)
- Step 4: Review & Publish

**FR-6.0.1.3:** The wizard MUST display progress indicators showing which step the user is on (e.g., "Step 2/4").

**FR-6.0.1.4:** The wizard MUST allow users to navigate backward to previous steps without losing data.

**FR-6.0.1.5:** The wizard MUST prevent users from advancing to the next step if required fields in the current step are incomplete or invalid.

#### 4.0.2 Draft System with Auto-Save

**FR-6.0.2.1:** The system MUST automatically save the user's progress to a draft every 3 seconds (debounced) while the user is actively editing.

**FR-6.0.2.2:** Drafts MUST be persisted using a **hybrid storage strategy**:
- Primary storage: **localStorage** for fast, offline-capable saves
- Secondary storage: **Backend database** (indicator_drafts table) for cross-device access and reliability

**FR-6.0.2.3:** The system MUST sync localStorage drafts to the backend database when:
- User clicks "Save Draft" manually
- User navigates away from the wizard
- User closes the browser tab (via `beforeunload` event with `navigator.sendBeacon`)

**FR-6.0.2.4:** Each draft MUST store:
- Governance area ID
- Current wizard step (1-4)
- Indicator tree structure (flat array of indicator nodes with parent references)
- Draft status: `in_progress`, `validating`, `ready_to_publish`
- Creation mode: `incremental`, `bulk_import`
- Timestamp: `created_at`, `updated_at`, `last_accessed_at`

**FR-6.0.2.5:** The system MUST provide a "Drafts List" view showing all saved drafts for the current user with:
- Draft title (e.g., "Financial Accountability Indicators")
- Governance area name
- Progress percentage (e.g., "8/12 indicators completed")
- Last updated timestamp
- "Resume" and "Delete" actions

**FR-6.0.2.6:** The system MUST display a notification toast when auto-save succeeds (e.g., "Draft saved 2 seconds ago").

**FR-6.0.2.7:** If auto-save fails, the system MUST show an error notification and retry with exponential backoff (2s, 4s, 8s).

#### 4.0.3 Hierarchical Tree Editor

**FR-6.0.3.1:** The system MUST provide a tree editor component using **react-arborist** library for displaying and manipulating the hierarchical indicator structure.

**FR-6.0.3.2:** The tree editor MUST support the following operations:
- **Add Root Indicator**: Create a new top-level indicator (1.1, 1.2, etc.)
- **Add Child Indicator**: Create a sub-indicator under a selected parent (1.1.1, 1.1.2, etc.)
- **Add Sibling Indicator**: Create an indicator at the same level as the selected one
- **Delete Indicator**: Remove an indicator (with confirmation if it has children)
- **Drag-and-Drop Reorder**: Move indicators to different positions or parents

**FR-6.0.3.3:** When an indicator is dragged to a new position, the system MUST:
- Update the `parent_id` if moved to a different parent
- Recalculate indicator codes (e.g., 1.1 → 1.2) for all affected indicators
- Update the tree display immediately (optimistic update)
- Auto-save the changes to draft

**FR-6.0.3.4:** Each tree node MUST display:
- Indicator code (e.g., "1.1.1")
- Indicator title
- Validation status badge (e.g., "3 errors", "✓ Complete")
- Context menu icon (⋮) for actions

**FR-6.0.3.5:** The tree editor MUST support **expand/collapse** functionality for parent indicators with children.

**FR-6.0.3.6:** The tree editor MUST visually distinguish between:
- Draft indicators (not yet published)
- Indicators with incomplete schemas (yellow warning badge)
- Indicators with validation errors (red error badge)
- Complete indicators (green checkmark badge)

#### 4.0.4 Visual Schema Builders (Form, Calculation, Remark)

**FR-6.0.4.1:** For each indicator in the tree, the system MUST provide dedicated schema builder interfaces accessible via tabs:
- **Form Schema Builder**: Define data collection fields
- **Calculation Schema Builder**: Define automatic Pass/Fail logic
- **Remark Schema Builder**: Define human-readable summary templates

**FR-6.0.4.2:** The **Form Schema Builder** MUST provide a visual GUI (no JSON editing required) with the following features:
- **Field Palette**: Drag-drop or click-to-add field types:
  - Text Input
  - Number Input
  - Date Picker
  - Checkbox (single)
  - Checkbox Group (multi-select)
  - Radio Button Group
  - Dropdown Select
  - Text Area (long text)
  - File Upload
- **Field Properties Panel**: Configure for each field:
  - Field Name (auto-generated snake_case, editable)
  - Field Label (display text)
  - Required/Optional toggle
  - Validation rules (min, max, pattern, maxLength)
  - Help text (optional)
- **Field Reordering**: Drag-and-drop to reorder fields
- **Live Preview**: Real-time preview of how the form will appear to BLGU users
- **Delete Field**: Remove fields (with undo capability)

**FR-6.0.4.3:** The **Calculation Schema Builder** MUST provide a visual interface for defining conditional logic with:
- **Rule Type Selector**: Choose from:
  - Conditional (if-then rules)
  - Formula (mathematical expression)
  - Lookup Table (value mapping)
- **Conditional Rules Editor** (most common):
  - Add multiple condition groups
  - For each condition:
    - Select field from form schema (dropdown)
    - Select operator (>=, <=, ==, >, <)
    - Enter comparison value
    - Set score (0-100)
  - Define default score if no conditions match
- **Test Calculation**: Input sample data and see resulting score
- **Validation**: Ensure all referenced fields exist in form schema

**FR-6.0.4.4:** The **Remark Schema Builder** MUST allow users to define conditional text templates with placeholders (simplified version of calculation builder).

#### 4.0.5 Real-Time Validation

**FR-6.0.5.1:** The system MUST perform **real-time field validation** as the user types:
- Required fields are not empty
- Number inputs are within min/max range
- Text inputs don't exceed max length
- Field names are unique within an indicator

**FR-6.0.5.2:** The system MUST perform **schema structure validation** when the user saves an indicator:
- Calculation schema only references fields that exist in form schema
- Weights of sibling indicators sum to 100%
- No circular parent references

**FR-6.0.5.3:** The system MUST perform **cross-indicator validation** before publishing:
- All indicators have required schemas (form, calculation if auto-calculable)
- No duplicate indicator codes
- Hierarchical numbering is consistent (1.1, 1.1.1, 1.2, 1.2.1, etc.)

**FR-6.0.5.4:** The system MUST display validation errors inline with specific guidance on how to fix them.

**FR-6.0.5.5:** The system MUST show a validation summary in Step 4 (Review) with:
- Total indicators
- Complete indicators count
- Incomplete indicators count (with links to fix)
- Validation errors list (grouped by indicator)

#### 4.0.6 Bulk Creation & Publishing

**FR-6.0.6.1:** The system MUST provide a **bulk import** option in Step 1 where users can upload a CSV or JSON file containing indicator definitions.

**FR-6.0.6.2:** Upon file upload, the system MUST:
- Validate file format and structure
- Preview the indicator tree structure
- Show any import errors or warnings
- Allow user to review and edit before proceeding

**FR-6.0.6.3:** When the user clicks "Publish" in Step 4, the system MUST:
- Perform final validation of the entire indicator set
- Show a confirmation modal summarizing what will be published (e.g., "You are about to publish 12 indicators for Financial Accountability")
- Create all indicators in a **single database transaction** via `POST /api/v1/indicators/bulk`
- Handle parent-child relationships by:
  - Using temporary IDs (UUID) for draft indicators
  - Resolving `parent_temp_id` → `parent_id` after parent is created
  - Using topological sorting to ensure parents are created before children

**FR-6.0.6.4:** If bulk creation fails (e.g., validation error, database constraint violation), the system MUST:
- Rollback the entire transaction (no partial publishes)
- Display specific error messages
- Allow user to fix errors and retry

**FR-6.0.6.5:** Upon successful publish, the system MUST:
- Delete the draft from localStorage and backend
- Show success notification
- Redirect user to the indicator list page showing the newly created indicators

#### 4.0.7 Conflict Resolution & Locking

**FR-6.0.7.1:** The system MUST implement **single-user editing** - only one MLGOO_DILG user can edit a draft at a time.

**FR-6.0.7.2:** When a draft is opened, the system MUST:
- Acquire a lock by setting `locked_by_user_id` and `locked_at` in the backend
- Store a `lock_token` (UUID) in localStorage

**FR-6.0.7.3:** If another user (or the same user on a different device) tries to open a locked draft, the system MUST:
- Display a modal: "This draft is being edited by [user email] since [time]"
- Provide options:
  - "Wait and Retry" (check again in 30 seconds)
  - "Override Lock" (only if same user, requires confirmation)
  - "Create New Draft" (start from scratch)

**FR-6.0.7.4:** Locks MUST automatically expire after 30 minutes of inactivity (no save operations).

**FR-6.0.7.5:** When a user exits the wizard (closes tab or navigates away), the system MUST release the lock via a `navigator.sendBeacon` call to `POST /api/v1/indicator-drafts/{id}/release-lock`.

#### 4.0.8 API Endpoints (New)

**FR-6.0.8.1:** The following new API endpoints MUST be implemented:

```
POST   /api/v1/indicators/bulk
  - Bulk create indicators with parent resolution
  - Request: { governance_area_id, indicators: [{ temp_id, parent_temp_id, code, name, ... }] }
  - Response: { created: [...], temp_id_mapping: {}, errors: [] }

POST   /api/v1/indicators/reorder
  - Batch update indicator codes and parent_ids after drag-drop
  - Request: { updates: [{ id, code, parent_id, order }] }
  - Response: List[IndicatorResponse]

POST   /api/v1/indicator-drafts
  - Save draft to backend
  - Request: DraftCreate (governance_area_id, data: JSONB, current_step, etc.)
  - Response: DraftResponse with draft_id

GET    /api/v1/indicator-drafts
  - List all drafts for current user
  - Response: List[DraftSummary]

GET    /api/v1/indicator-drafts/{draft_id}
  - Load specific draft
  - Response: DraftResponse

PUT    /api/v1/indicator-drafts/{draft_id}
  - Update draft (with optimistic locking via version field)
  - Request: DraftUpdate with version number
  - Response: DraftResponse with new version

DELETE /api/v1/indicator-drafts/{draft_id}
  - Delete draft

POST   /api/v1/indicator-drafts/{draft_id}/release-lock
  - Release draft lock when user exits
```

**FR-6.0.8.2:** All draft endpoints MUST implement **optimistic locking** using a `version` field to detect concurrent edits.

**FR-6.0.8.3:** If a save operation detects a version mismatch, the system MUST return a `409 Conflict` error with details about the conflicting user and timestamp.

### 4.1 Indicator Management Interface

#### 4.1.1 Indicator CRUD Operations

**FR-6.1.1.1:** The system MUST provide a dedicated "Indicator Management" page accessible only to users with the MLGOO_DILG role.

**FR-6.1.1.2:** The system MUST display a searchable, filterable list of all indicators with columns for: Indicator Name, Governance Area, Active Status, Auto-Calculable Status, Last Modified Date.

**FR-6.1.1.3:** The system MUST allow MLGOO-DILG to create a new indicator with the following core fields:
- `name` (text, required)
- `description` (rich text, required)
- `governance_area_id` (dropdown selection, required)
- `parent_id` (dropdown selection of existing indicators, optional for hierarchical indicators)
- `is_active` (boolean, default: true)
- `is_profiling_only` (boolean, default: false)
- `is_auto_calculable` (boolean, default: false)
- `technical_notes_text` (rich text, required)

**FR-6.1.1.4:** The system MUST allow MLGOO-DILG to edit any field of an existing indicator.

**FR-6.1.1.5:** The system MUST allow MLGOO-DILG to deactivate (soft delete) an indicator by setting `is_active` to false.

**FR-6.1.1.6:** The system MUST prevent hard deletion of indicators that have associated assessment responses.

**FR-6.1.1.7:** The system MUST implement indicator versioning: when an indicator's `form_schema` or `calculation_schema` is edited, a new version is created, and existing assessments continue to reference the original version.

#### 4.1.2 Form Schema Builder (Visual)

**FR-6.1.2.1:** The system MUST provide a visual "Form Builder" interface for defining the `form_schema` of an indicator.

**FR-6.1.2.2:** The Form Builder MUST support adding the following input types via drag-and-drop or button clicks:

**For BLGU Data Input (frontend form fields):**
- Checkbox Group (multi-select)
- Radio Button Group (single-select)
- Number Input (with min/max validation)
- Text Input (short answer)
- Text Area (long answer)
- Date Picker
- File Upload (with conditional requirement logic)

**For Validator/Assessor MOV Checklist Validation:**

The Form Builder MUST also support configuring **MOV checklist items** used by Validators/Assessors during the validation workflow. These checklist items are defined in detail in the **Indicator Builder Specification v1.4** and include:

- **Checkbox**: Binary validation items (e.g., "Document posted: Yes/No")
- **Group**: Logical grouping of related checklist items with optional OR logic
- **Currency Input**: Monetary value validation with threshold support (e.g., "Budget allocation ≥ ₱50,000")
- **Number Input**: Numeric validation with min/max ranges and threshold checks
- **Text Input**: Free-text evidence recording (e.g., "BBI composition details")
- **Date Input**: Date validation with grace period support
- **Assessment**: Sub-indicator evaluation fields (YES/NO radio buttons for validator judgments)
- **Radio Group**: Single-selection validation options
- **Dropdown**: Dropdown selection validation

**Advanced Validation Patterns:**

The Form Builder MUST support configuration of:
- **OR Logic**: Alternative evidence paths (e.g., "Physical accomplishment ≥50% OR Financial utilization ≥50%")
- **Conditional Display**: Show/hide items based on other item values or external data (e.g., "Show certification field only if barangay type = city")
- **Threshold Validation**: Automatic pass/fail determination with numeric thresholds (e.g., "Budget ≥ ₱50,000 → Pass")
- **Mutually Exclusive Scenarios**: Selection mode for "one_of" logic where validator selects which scenario applies to the barangay
- **Grace Period Handling**: Date validation with configurable grace periods and "considered" status
- **Alternative Evidence**: Define substitute acceptable documents with consideration notes
- **Exclusion Rules**: Mark certain evidence as NOT acceptable with warnings

**Reference Documentation:**

For complete MOV checklist item specifications, validation patterns, and 29+ real-world indicator examples, see:
**📄 [Indicator Builder Specification v1.4](/docs/indicator-builder-specification.md)**

**FR-6.1.2.3:** For each input field added, the system MUST allow the MLGOO-DILG to configure:
- Field Label (text)
- Field ID (auto-generated, editable)
- Required/Optional toggle
- Conditional MOV Requirement (e.g., "Require MOV if this checkbox is checked")
- Validation Rules (for number inputs: min, max; for text inputs: max length)

**FR-6.1.2.4:** For Checkbox Groups and Radio Button Groups, the system MUST allow the MLGOO-DILG to define multiple options dynamically.

**FR-6.1.2.5:** The system MUST provide a live preview of how the form will appear to the BLGU user as the MLGOO-DILG builds it.

**FR-6.1.2.6:** The system MUST allow the MLGOO-DILG to reorder form fields via drag-and-drop.

**FR-6.1.2.7:** The system MUST provide a "View JSON" toggle that displays the underlying `form_schema` JSON representation for debugging and verification.

**FR-6.1.2.8:** The system MUST validate the `form_schema` JSON structure before saving to ensure it can be correctly rendered.

#### 4.1.3 Calculation Schema Builder (Visual Rule Builder)

**FR-6.1.3.1:** The system MUST provide a visual "Calculation Rule Builder" interface for defining the `calculation_schema` of an indicator.

**FR-6.1.3.2:** The Calculation Rule Builder MUST only be accessible if `is_auto_calculable` is set to `true` for the indicator.

**FR-6.1.3.3:** The system MUST support the following rule types in the Calculation Rule Builder:
- `AND_ALL` - All conditions must be true
- `OR_ANY` - At least one condition must be true
- `PERCENTAGE_THRESHOLD` - A numeric field must meet a percentage threshold (e.g., >= 50%)
- `COUNT_THRESHOLD` - A count of selected checkboxes must meet a threshold (e.g., at least 3 of 5)
- `MATCH_VALUE` - A field must match a specific value
- `BBI_FUNCTIONALITY_CHECK` - Check if a specific BBI is "Functional"

**FR-6.1.3.4:** The system MUST allow the MLGOO-DILG to create nested condition groups (e.g., "(Condition A AND Condition B) OR Condition C").

**FR-6.1.3.5:** The system MUST allow the MLGOO-DILG to select which field from the `form_schema` to reference in each rule condition.

**FR-6.1.3.6:** The system MUST allow the MLGOO-DILG to define the output status for when conditions are met (Pass) and not met (Fail).

**FR-6.1.3.7:** The system MUST allow the MLGOO-DILG to specify whether the "Conditional" status is allowed for this indicator via a checkbox.

**FR-6.1.3.8:** The system MUST provide a "View JSON" toggle for the `calculation_schema` for debugging and verification.

**FR-6.1.3.9:** The system MUST validate the `calculation_schema` JSON structure before saving to ensure it can be correctly executed by the rule engine.

**FR-6.1.3.10:** The system MUST provide a "Test Calculation" feature where the MLGOO-DILG can input sample data and see the resulting Pass/Fail status based on the defined rules.

#### 4.1.4 Remark Schema Builder

**FR-6.1.4.1:** The system MUST provide a "Remark Builder" interface for defining the `remark_schema` of an indicator.

**FR-6.1.4.2:** The system MUST allow the MLGOO-DILG to define conditional text templates based on:
- All children pass
- Any child fails
- Associated BBI status (Functional/Non-Functional)
- Custom conditions

**FR-6.1.4.3:** The system MUST support placeholders in remark templates (e.g., `{indicator_name}`, `{bbi_name}`) that are dynamically replaced at runtime.

**FR-6.1.4.4:** The system MUST provide a default remark template option (e.g., "Status pending.").

### 4.2 BBI Configuration Interface

#### 4.2.1 BBI Definition Management

**FR-6.2.1.1:** The system MUST provide a dedicated "BBI Configuration" page accessible only to users with the MLGOO_DILG role.

**FR-6.2.1.1a:** The system MUST pre-populate the BBI configuration interface with the **9 mandatory Barangay-Based Institutions** as defined in the SGLGB framework:

| # | BBI Name | Code | Governance Area | Indicator |
|---|----------|------|-----------------|-----------|
| 1 | Barangay Disaster Risk Reduction and Management Committee | **BDRRMC** | Core 2: Disaster Preparedness | 2.1 |
| 2 | Barangay Anti-Drug Abuse Council | **BADAC** | Core 3: Safety, Peace and Order | 3.1 |
| 3 | Barangay Peace and Order Committee | **BPOC** | Core 3: Safety, Peace and Order | 3.2 |
| 4 | Lupong Tagapamayapa (Barangay Justice System) | **LT** | Core 3: Safety, Peace and Order | 3.3 |
| 5 | Barangay Violence Against Women Desk | **VAW Desk** | Essential 1: Social Protection | 4.1 |
| 6 | Barangay Development Council | **BDC** | Essential 1: Social Protection | 4.3 |
| 7 | Barangay Council for the Protection of Children | **BCPC** | Essential 1: Social Protection | 4.5 |
| 8 | Barangay Nutrition Committee | **BNC** | Essential 1: Social Protection | 4.8 |
| 9 | Barangay Ecological Solid Waste Management Committee | **BESWMC** | Essential 3: Environmental Management | 6.1 |

**Key Points:**
- Each BBI has **ONE dedicated functionality indicator**
- BBI functionality status is **determined by** the indicator's pass/fail result (NOT the other way around)
- **Direction**: Indicator result → BBI status (one-way relationship)
- **No cross-references**: Indicators do NOT check other BBI statuses as validation criteria

**Note**: For complete BBI functionality determination rules, grace period handling, and the BBI tracking system, see:
**📄 [Indicator Builder Specification v1.4](/docs/indicator-builder-specification.md#barangay-based-institutions-bbis)**

**FR-6.2.1.2:** The system MUST allow the MLGOO-DILG to create a new BBI with the following fields:
- BBI Name (e.g., "Lupon Tagapamayapa", "Barangay Anti-Drug Abuse Council")
- BBI Abbreviation (e.g., "LUPON", "BADAC")
- Description (optional)
- Associated Governance Area (dropdown selection)

**FR-6.2.1.3:** The system MUST display a list of all configured BBIs with columns for: BBI Name, Governance Area, Number of Mapped Indicators, Active Status.

**FR-6.2.1.4:** The system MUST allow the MLGOO-DILG to edit or deactivate a BBI.

#### 4.2.2 Indicator-to-BBI Mapping

**FR-6.2.2.1:** For each BBI, the system MUST provide an interface to link the BBI to its **one dedicated functionality indicator**.

> **IMPORTANT CLARIFICATION:**
> - Each BBI has **exactly ONE** functionality indicator
> - The BBI's functionality status is **DETERMINED BY** the indicator's validation result (NOT the other way around)
> - **Direction of Relationship**: Indicator pass/fail → BBI functional/non-functional
> - **No Cross-References**: Indicators do NOT check other BBI statuses as validation criteria
> - BBIs are standalone - their status is purely derived from their associated indicator

**FR-6.2.2.2:** The BBI mapping interface MUST display:
- BBI Name and Code
- Associated Governance Area
- Dropdown to select the **one functionality indicator** from the same governance area
- Read-only display showing the current mapping if one exists

**FR-6.2.2.3:** The system MUST enforce the following BBI functionality determination rules:

| Indicator Validation Result | BBI Functionality Status | Notes |
|------------------------------|--------------------------|-------|
| **Passed** | ✅ Functional | All validation criteria met |
| **Considered** | ✅ Functional (with notes) | Passed with grace period or alternative evidence |
| **Failed** | ❌ Non-Functional | Validation criteria not met |
| **Not Applicable** | ⚠️ N/A | Indicator marked as not applicable |
| **Pending** | ⏳ Pending Validation | Awaiting assessor validation |

**FR-6.2.2.4:** When an indicator includes grace period validation (e.g., date within grace period), the system MUST:
- Mark the indicator status as **"Considered"** (not "Passed")
- Set the BBI functionality status to **"Functional"** with a notation indicating grace period acceptance
- Store the consideration note (e.g., "Document dated within 30-day grace period")

**FR-6.2.2.5:** The system MUST provide a "View BBI Mapping Summary" interface showing:
- All 9 mandatory BBIs
- Their associated functionality indicator codes (e.g., "2.1", "3.1")
- Current mapping status (Mapped/Unmapped)
- Validation status for the current assessment cycle

**FR-6.2.2.6:** The system MUST validate that:
- Each BBI is mapped to exactly ONE indicator
- The mapped indicator exists and is active
- The indicator belongs to the correct governance area as specified in the BBI table
- No circular references exist (though this should be impossible with the one-way relationship)

**FR-6.2.2.7:** The system MUST prevent the MLGOO-DILG from:
- Mapping multiple indicators to a single BBI
- Mapping an indicator to multiple BBIs (except for the 9 designated functionality indicators)
- Creating complex calculation rules for BBI determination (1:1 mapping only)

**Reference Documentation:**

For complete BBI system specifications, relationship diagrams, and database schema, see:
**📄 [Indicator Builder Specification v1.4 - BBI Functionality Tracking System](/docs/indicator-builder-specification.md#bbi-functionality-tracking-system)**

### 4.3 Assessment Cycle & Deadline Management

#### 4.3.1 Assessment Cycle Creation

**FR-6.3.1.1:** The system MUST provide a dedicated "Assessment Cycle Management" page accessible only to users with the MLGOO_DILG role.

**FR-6.3.1.2:** The system MUST allow the MLGOO-DILG to create a new assessment cycle with the following fields:
- Cycle Name (e.g., "SGLGB 2026")
- Cycle Year
- Table Assessment Phase 1 Deadline (date/time)
- Rework Submission Deadline (date/time)
- Table Validation Phase 2 Deadline (date/time)
- Calibration Submission Deadline (date/time)

**FR-6.3.1.3:** The system MUST enforce that deadlines are set in chronological order (Phase 1 → Rework → Phase 2 → Calibration).

**FR-6.3.1.4:** The system MUST allow only one active assessment cycle at a time.

**FR-6.3.1.5:** The system MUST allow the MLGOO-DILG to edit cycle-wide deadlines before the cycle begins.

#### 4.3.2 Deadline Monitoring Dashboard

**FR-6.3.2.1:** The system MUST provide a "Deadline Status Dashboard" showing all barangays and their submission status for each phase.

**FR-6.3.2.2:** The dashboard MUST visually distinguish between:
- Submitted on time
- Submitted late
- Not yet submitted (approaching deadline)
- Not yet submitted (past deadline)

**FR-6.3.2.3:** The dashboard MUST allow filtering by barangay, governance area, and phase.

#### 4.3.3 Granular Deadline Override Controls

**FR-6.3.3.1:** The system MUST provide a "Deadline Override" interface accessible from the Deadline Status Dashboard.

**FR-6.3.3.2:** The system MUST allow the MLGOO-DILG to select:
- A specific barangay
- One or more specific indicators (or "All indicators")
- A new deadline date/time
- A reason for the override (text input, required)

**FR-6.3.3.3:** The system MUST display a confirmation dialog before applying the deadline override, showing exactly what will be changed.

**FR-6.3.3.4:** Upon confirmation, the system MUST:
- Update the deadline for the selected indicator(s) and barangay
- Unlock the submission if it was previously locked due to the deadline
- Log the override action to the audit trail

**FR-6.3.3.5:** The system MUST send an email notification to the affected barangay's BLGU_USER(s) informing them of the deadline extension.

**FR-6.3.3.6:** The system MUST prevent the MLGOO-DILG from setting a new deadline in the past.

#### 4.3.4 Audit Trail for Deadline Overrides

**FR-6.3.4.1:** The system MUST provide a dedicated "Deadline Override Audit Log" page accessible to MLGOO_DILG users.

**FR-6.3.4.2:** The audit log MUST display all deadline overrides with the following information:
- Timestamp of override
- MLGOO-DILG user who performed the override
- Barangay affected
- Indicator(s) affected
- Original deadline
- New deadline
- Reason provided

**FR-6.3.4.3:** The audit log MUST be filterable by date range, barangay, and user.

**FR-6.3.4.4:** The audit log MUST be exportable to CSV format.

### 4.4 Audit & Versioning

#### 4.4.1 Indicator Edit Audit Trail

**FR-6.4.1.1:** The system MUST log every change to an indicator's core fields, `form_schema`, `calculation_schema`, or `remark_schema`.

**FR-6.4.1.2:** The audit log entry MUST include:
- Timestamp
- MLGOO-DILG user who made the change
- Indicator ID and name
- Fields changed (before and after values, if feasible)
- Indicator version number

**FR-6.4.1.3:** The system MUST provide an "Indicator Change History" view accessible from the Indicator Management page.

#### 4.4.2 Indicator Versioning

**FR-6.4.2.1:** The system MUST maintain a version history for each indicator, incrementing the version number whenever `form_schema`, `calculation_schema`, or `remark_schema` is edited.

**FR-6.4.2.2:** The system MUST link each assessment to the specific version of the indicator that was active when the assessment was created.

**FR-6.4.2.3:** The system MUST ensure that changes to an indicator never retroactively affect existing assessments.

**FR-6.4.2.4:** The system MUST allow the MLGOO-DILG to view previous versions of an indicator (read-only).

**FR-6.4.2.5:** The system MUST clearly label which version of an indicator is currently active for new assessments.

#### 4.4.3 BBI Configuration Audit Trail

**FR-6.4.3.1:** The system MUST log every change to BBI definitions and indicator-to-BBI mappings.

**FR-6.4.3.2:** The audit log entry MUST include:
- Timestamp
- MLGOO-DILG user who made the change
- BBI ID and name
- Change description (e.g., "Updated functionality rule")

**FR-6.4.3.3:** The system MUST provide a "BBI Change History" view accessible from the BBI Configuration page.

### 4.5 Access Control

**FR-6.5.1:** All administrative features in Phase 6 MUST be accessible only to users with the `MLGOO_DILG` role.

**FR-6.5.2:** The system MUST return a 403 Forbidden error if a non-MLGOO_DILG user attempts to access any administrative endpoint.

**FR-6.5.3:** The system MUST log all access attempts to administrative features for security auditing.

### 4.6 Data Validation & Error Handling

**FR-6.6.1:** The system MUST validate all form inputs before saving (e.g., required fields, valid date formats, valid JSON structures).

**FR-6.6.2:** The system MUST display clear, user-friendly error messages if validation fails.

**FR-6.6.3:** The system MUST prevent the MLGOO-DILG from creating circular dependencies in hierarchical indicators (e.g., Indicator A is parent of B, B is parent of A).

**FR-6.6.4:** The system MUST prevent the MLGOO-DILG from referencing non-existent fields in `calculation_schema` rules.

**FR-6.6.5:** The system MUST gracefully handle errors during JSON parsing and provide specific feedback on what is invalid.

---

## 5. Non-Goals (Out of Scope)

**NG-6.1:** **Multi-Tenancy for Multiple Municipalities** - This phase assumes a single-municipality deployment. Multi-tenancy support is out of scope.

**NG-6.2:** **Advanced Workflow Automation** - Features like "auto-approve assessments that meet X criteria" or "auto-send reminders 3 days before deadline" are out of scope. The system provides the tools; the MLGOO-DILG performs the actions.

**NG-6.3:** **Role-Based Indicator Editing** - All MLGOO_DILG users have the same administrative privileges. Granular permissions within the MLGOO_DILG role (e.g., "User A can edit indicators but not deadlines") are out of scope.

**NG-6.4:** **AI-Assisted Indicator Creation** - Using AI to suggest indicator structures or calculation rules based on Technical Notes is out of scope for this phase.

**NG-6.5:** **Mobile-First Administrative Interface** - While the UI should be responsive, the primary target for administrative features is desktop/laptop users. Mobile optimization is secondary.

**NG-6.6:** **Indicator Deletion with Data Migration** - Hard deletion of indicators with automatic migration of associated assessment data to a replacement indicator is out of scope. Deactivation (soft delete) is the supported approach.

**NG-6.7:** **Weighted Scoring for BBI Functionality** - BBI functionality is determined by rule-based logic (Pass/Fail of specific indicators), not by weighted scores or percentages.

**NG-6.8:** ~~**Bulk Import of Indicators**~~ - **NOW IN SCOPE** (Updated Nov 9, 2025): Basic bulk import from CSV/JSON is supported in the hierarchical indicator creation wizard. However, advanced import features (Excel with complex formatting, automatic schema generation from spreadsheet columns) remain out of scope.

**NG-6.9:** **Real-Time Collaborative Editing** - Real-time collaborative editing of indicators by multiple MLGOO-DILG users simultaneously (like Google Docs) is out of scope. The system supports single-user editing with draft locking.

---

## 6. Design Considerations

### 6.1 User Interface Design

**DC-6.1.1:** The administrative interface should follow the existing SINAG design system (Tailwind CSS, shadcn/ui components).

**DC-6.1.2:** The Form Builder and Calculation Rule Builder should use a clean, modern interface similar to tools like Google Forms (for form building) and Zapier/Make.com (for rule building).

**DC-6.1.3:** Visual feedback should be provided at every step:
- Loading spinners during save operations
- Success toasts after successful saves
- Clear error messages with actionable guidance

**DC-6.1.4:** The interface should use progressive disclosure - show basic options first, with "Advanced Settings" accordions for complex features.

**DC-6.1.5:** The "View JSON" toggle should be clearly separated from the visual builder to avoid confusion for non-technical users.

### 6.2 Form Builder UX

**DC-6.2.1:** The Form Builder should have a left sidebar with draggable input types and a center canvas showing the live form preview.

**DC-6.2.2:** Clicking on a field in the preview should open a right sidebar with field properties (label, validation, MOV requirement, etc.).

**DC-6.2.3:** The live preview should show exactly how the form will appear to the BLGU user, including all labels, placeholders, and validation indicators.

### 6.3 Calculation Rule Builder UX

**DC-6.3.1:** The Calculation Rule Builder should use a visual "flowchart" or "decision tree" style interface.

**DC-6.3.2:** Users should be able to add condition groups and nest them visually (with indentation or connecting lines).

**DC-6.3.3:** Each rule should show:
- The field being evaluated (dropdown selection from form_schema fields)
- The operator (e.g., ">=", "=", "contains")
- The comparison value (input field)

**DC-6.3.4:** The output (Pass/Fail) should be clearly indicated with color coding (e.g., green for Pass, red for Fail).

### 6.4 Deadline Override UX

**DC-6.4.1:** The Deadline Override interface should use a multi-step modal:
- Step 1: Select barangay
- Step 2: Select indicator(s)
- Step 3: Set new deadline and provide reason
- Step 4: Review and confirm

**DC-6.4.2:** The confirmation step should clearly summarize the change in plain language (e.g., "You are extending the deadline for Indicator 1.1 for Barangay San Jose from November 10, 2025 to November 17, 2025.").

### 6.5 Responsive Design

**DC-6.5.1:** While desktop is the primary target, the interface should be usable on tablets (landscape mode).

**DC-6.5.2:** Complex builders (Form Builder, Rule Builder) may have simplified mobile views or display a "Best viewed on desktop" message.

---

## 7. Technical Considerations

### 7.0 Hierarchical Indicator Creation - Technical Architecture (NEW - Added Nov 9, 2025)

#### 7.0.1 Frontend State Management

**TC-7.0.1.1:** The indicator builder MUST use a **flat state model** for the indicator tree:
```typescript
interface IndicatorNode {
  id?: number;                    // Backend ID (undefined for drafts)
  tempId: string;                 // UUID for client-side reference
  code: string;                   // e.g., "1.1.1"
  name: string;
  parent_id?: number;
  depth: number;                  // Computed: 0 for root, 1 for children
  children: string[];             // Computed: array of child tempIds
  isDraft: boolean;
  isModified: boolean;
  // ... other fields
}

interface IndicatorTreeState {
  nodes: Map<string, IndicatorNode>;  // Key: tempId
  rootIds: string[];                  // Top-level indicator tempIds
  selectedNodeId?: string;
  draftId?: string;
}
```

**TC-7.0.1.2:** The frontend MUST use **Zustand** for the indicator builder store to manage editing session state.

**TC-7.0.1.3:** The frontend MUST use **React Query** for server synchronization (fetching, mutations, caching).

**TC-7.0.1.4:** The tree editor component MUST use **react-arborist** library for rendering and drag-drop functionality.

#### 7.0.2 Draft Storage Implementation

**TC-7.0.2.1:** Draft auto-save MUST be implemented using a custom React hook:
```typescript
useAutoSave({
  draftId: string,
  data: IndicatorTreeState,
  version: number,
  debounceMs: 3000,  // 3 seconds
  onVersionUpdate: (newVersion) => void
})
```

**TC-7.0.2.2:** The auto-save hook MUST use `useEffect` with debouncing to trigger saves 3 seconds after the last edit.

**TC-7.0.2.3:** The backend draft service MUST store drafts in a new `indicator_drafts` table:
```sql
CREATE TABLE indicator_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id),
    governance_area_id INTEGER NOT NULL REFERENCES governance_areas(id),

    -- Wizard state
    creation_mode VARCHAR(50) NOT NULL,  -- 'incremental', 'bulk_import'
    current_step INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'in_progress',

    -- Draft data (JSONB)
    data JSONB NOT NULL DEFAULT '[]',

    -- Metadata
    title VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Optimistic locking
    version INTEGER DEFAULT 1,
    lock_token UUID,
    locked_by_user_id INTEGER REFERENCES users(id),
    locked_at TIMESTAMPTZ
);
```

#### 7.0.3 Bulk Creation Backend Logic

**TC-7.0.3.1:** The bulk create endpoint MUST implement **topological sorting** to create parent indicators before child indicators:
```python
def bulk_create_indicators(
    db: Session,
    request: BulkIndicatorCreate
) -> BulkIndicatorResponse:
    # 1. Topological sort by parent_temp_id
    sorted_indicators = topological_sort(request.indicators)

    # 2. Create in order, mapping temp_id → real id
    temp_id_map = {}
    created = []

    for indicator_data in sorted_indicators:
        # Resolve parent_id from temp_id
        parent_id = temp_id_map.get(indicator_data.parent_temp_id)

        # Create indicator
        indicator = create_indicator(db, indicator_data, parent_id)

        temp_id_map[indicator_data.temp_id] = indicator.id
        created.append(indicator)

    db.commit()
    return BulkIndicatorResponse(created=created, temp_id_mapping=temp_id_map)
```

**TC-7.0.3.2:** The bulk create operation MUST use a database transaction with rollback on any failure to ensure atomicity.

#### 7.0.4 Tree Reordering & Auto-Renumbering

**TC-7.0.4.1:** When indicators are reordered via drag-drop, the frontend MUST implement a `recalculateCodes()` function:
```typescript
function recalculateCodes(
  nodes: Map<string, IndicatorNode>,
  rootIds: string[]
): Map<string, IndicatorNode> {
  const updated = new Map(nodes);

  function traverse(nodeIds: string[], parentCode = '', depth = 0) {
    nodeIds.forEach((nodeId, index) => {
      const node = updated.get(nodeId);
      const newCode = parentCode
        ? `${parentCode}.${index + 1}`
        : `${index + 1}`;

      updated.set(nodeId, { ...node, code: newCode, depth });

      // Recurse to children
      if (node.children.length > 0) {
        traverse(node.children, newCode, depth + 1);
      }
    });
  }

  traverse(rootIds);
  return updated;
}
```

#### 7.0.5 Validation Strategy

**TC-7.0.5.1:** Real-time validation MUST be implemented client-side using **Zod schemas** for immediate feedback.

**TC-7.0.5.2:** Final validation before publish MUST be performed server-side to ensure data integrity.

**TC-7.0.5.3:** The validation service MUST check:
- All form_schema fields referenced in calculation_schema exist
- Weights of sibling indicators sum to 100%
- No circular parent references
- All required schemas are present

#### 7.0.6 Component Architecture

**TC-7.0.6.1:** The indicator builder frontend components MUST be located in:
```
apps/web/src/components/features/indicators/builder/
├── IndicatorBuilderLayout.tsx
├── IndicatorTreeView.tsx          (uses react-arborist)
├── IndicatorTreeNode.tsx
├── IndicatorFormView.tsx
├── FormSchemaBuilder.tsx           (visual builder, no JSON)
├── CalculationSchemaBuilder.tsx    (visual builder, no JSON)
├── RemarkSchemaBuilder.tsx
├── BulkImportView.tsx
├── DraftList.tsx
└── ValidationSummary.tsx
```

**TC-7.0.6.2:** The wizard page MUST be located at:
```
apps/web/src/app/(app)/mlgoo/indicators/builder/page.tsx
```

#### 7.0.7 Performance Optimizations

**TC-7.0.7.1:** For indicator trees with 50+ nodes, the tree view MUST use **virtualization** via `react-window` or react-arborist's built-in virtualization.

**TC-7.0.7.2:** The schema builders MUST use local component state (`useState`) during editing to avoid unnecessary re-renders.

**TC-7.0.7.3:** Expensive computations (tree traversal, validation) MUST be memoized using `useMemo`.

#### 7.0.8 Library Dependencies (New)

**TC-7.0.8.1:** The following new npm packages MUST be installed:
```json
{
  "react-arborist": "^3.x",           // Tree editor with drag-drop
  "zustand": "^4.x",                  // State management (if not already installed)
  "@tanstack/react-query": "^5.x",    // Server state (already installed)
  "zod": "^3.x",                      // Schema validation (already installed)
  "@tiptap/react": "^2.x",            // Rich text editor core
  "@tiptap/starter-kit": "^2.x",      // Basic TipTap extensions
  "@tiptap/extension-placeholder": "^2.x" // Placeholder support
}
```

**TC-7.0.8.2:** The rich text editor (TipTap) MUST be used for the "Minimum Requirement" field to support formatted text with:
- Bullet lists and numbered lists
- Bold, italic, underline formatting
- Headings (H3, H4)
- HTML output stored in `minimum_requirement_html` field

**TC-7.0.8.3:** No AI-related dependencies are required for MVP (Phase 1). AI features will be added in Phase 2.

### 7.1 Backend Architecture

**TC-7.1.1:** All administrative endpoints should be implemented in a new FastAPI router: `apps/api/app/api/v1/admin.py` with the tag `admin`.

**TC-7.1.2:** A new service layer should be created: `apps/api/app/services/admin_service.py` to handle all administrative business logic.

**TC-7.1.3:** Indicator versioning should be implemented in the database with an `indicators_history` table that stores previous versions.

**TC-7.1.4:** The `indicators` table should include a `version` column (integer) that increments on each schema edit.

**TC-7.1.5:** The `assessment_responses` table should include a `indicator_version_id` foreign key to link to the specific indicator version used.

### 7.2 Database Schema Updates

**TC-7.2.1:** New tables required:
- `indicators_history` - Stores previous versions of indicators
- `bbis` - Stores BBI definitions
- `bbi_indicator_mappings` - Stores indicator-to-BBI mappings and calculation rules
- `assessment_cycles` - Stores assessment cycle definitions and deadlines
- `deadline_overrides` - Stores all deadline override actions for audit

**TC-7.2.2:** Updated tables:
- `indicators` - Add columns: `is_auto_calculable`, `version`, `remark_schema`, `minimum_requirement_html` (TEXT, stores rich HTML formatting for indicator requirements)
- `assessment_responses` - Add column: `indicator_version_id`

**TC-7.2.2.1:** The `minimum_requirement_html` field MUST support rich HTML content including:
- Unordered lists (`<ul><li>`)
- Ordered lists (`<ol><li>`)
- Emphasis (`<strong>`, `<em>`, `<u>`)
- Headings (`<h3>`, `<h4>`)
- Paragraphs (`<p>`)
- Line breaks (`<br>`)

**TC-7.2.3:** All new tables should have `created_at`, `updated_at`, and `created_by` audit columns.

### 7.3 JSON Schema Validation

**TC-7.3.1:** The backend must validate `form_schema`, `calculation_schema`, and `remark_schema` JSON structures using Pydantic models before saving to the database.

**TC-7.3.2:** A library of Pydantic models should be created to define the structure of each rule type (AND_ALL, OR_ANY, PERCENTAGE_THRESHOLD, etc.).

**TC-7.3.3:** The backend should return specific error messages if JSON validation fails (e.g., "Field 'field_id' is required in PERCENTAGE_THRESHOLD rule").

### 7.4 Rule Engine Integration

**TC-7.4.1:** The existing `intelligence_service.py` rule engine must be extended to support all new rule types defined in the Calculation Rule Builder.

**TC-7.4.2:** The rule engine must check the `is_auto_calculable` flag before attempting to evaluate an indicator.

**TC-7.4.3:** The rule engine must handle nested condition groups correctly (respecting AND/OR precedence).

**TC-7.4.4:** The rule engine must support BBI_FUNCTIONALITY_CHECK rule type by querying the BBI calculation results.

### 7.5 Frontend Type Generation

**TC-7.5.1:** After implementing backend schemas, run `pnpm generate-types` to generate TypeScript types and React Query hooks for all new administrative endpoints.

**TC-7.5.2:** All admin components should be located in `apps/web/src/components/features/admin/`.

**TC-7.5.3:** Admin pages should be located in `apps/web/src/app/(app)/admin/`.

### 7.6 Performance Considerations

**TC-7.6.1:** The Form Builder and Rule Builder should use local state (useState) for editing to avoid unnecessary API calls during the build process.

**TC-7.6.2:** Only save to the backend when the user clicks "Save" or "Publish."

**TC-7.6.3:** The Deadline Status Dashboard should use pagination and filtering to avoid loading all barangays at once.

**TC-7.6.4:** The audit log queries should be indexed on `created_at` and `user_id` for performance.

### 7.7 Security Considerations

**TC-7.7.1:** All administrative endpoints must verify the user's role is `MLGOO_DILG` before allowing access.

**TC-7.7.2:** The system must sanitize all user inputs to prevent XSS attacks, especially in rich text fields (description, technical_notes_text).

**TC-7.7.3:** The system must rate-limit administrative API endpoints to prevent abuse.

**TC-7.7.4:** All database mutations (create, update, delete) must be logged to the audit trail.

### 7.8 Migration Strategy

**TC-7.8.1:** Existing indicators in the database must be migrated to the new versioning system with `version = 1`.

**TC-7.8.2:** A database migration script must populate the `indicators_history` table with the current state of all indicators as version 1.

**TC-7.8.3:** The migration must be reversible (provide a downgrade script).

---

## 8. Success Metrics

### 8.1 Primary Metrics

**SM-6.1:** **MLGOO-DILG Independence** - MLGOO-DILG can create or edit indicators without developer support (Target: 100% of indicator changes performed via UI, 0% via developer tickets).

**SM-6.2:** **Time to Configure New Cycle** - Time required to configure a new SGLGB assessment cycle is reduced by at least 50% compared to manual/developer-assisted configuration.

**SM-6.3:** **Developer Ticket Reduction** - Number of developer tickets for "change indicator logic," "update calculation rules," or "extend deadline for barangay X" is reduced to zero.

**SM-6.4:** **System Adaptability** - SINAG adapts to updated DILG SGLGB Technical Notes within 1 business day of release, without requiring code deployments.

### 8.2 Secondary Metrics

**SM-6.5:** **BBI Calculation Accuracy** - BBI functionality status is correctly auto-calculated for 100% of barangays based on configured rules.

**SM-6.6:** **Audit Compliance** - 100% of administrative actions (indicator edits, deadline overrides, BBI changes) are logged to the audit trail with complete information.

**SM-6.7:** **User Satisfaction** - MLGOO-DILG users rate the administrative interface as "Easy to Use" or "Very Easy to Use" (Target: ≥ 80% satisfaction).

**SM-6.8:** **Historical Data Integrity** - Zero instances of retroactive changes affecting completed or in-progress assessments (verified via automated tests).

### 8.3 Usage Metrics

**SM-6.9:** **Indicator Creation Rate** - Track the number of new indicators created per month via the UI.

**SM-6.10:** **Deadline Override Frequency** - Track the number of deadline overrides applied per assessment cycle to identify patterns and potential workflow improvements.

**SM-6.11:** **Form Builder Usage** - Percentage of indicators created using the visual Form Builder vs. direct JSON editing (Target: ≥ 90% use visual builder).

---

## 9. Open Questions

**OQ-6.1:** **Indicator Templates** - Should the system provide pre-built indicator templates for common patterns (e.g., "Document Posting Checklist," "Percentage Threshold Evaluation") to speed up indicator creation?

**OQ-6.2:** **Multi-Language Support** - Should indicator names, descriptions, and technical notes support multiple languages (English, Filipino) for future expansion?

**OQ-6.3:** **Indicator Duplication** - Should the system allow MLGOO-DILG to duplicate an existing indicator as a starting point for creating a similar one?

**OQ-6.4:** **BBI Versioning** - Should BBI definitions and mappings also be versioned (similar to indicators) to maintain historical accuracy?

**OQ-6.5:** **Deadline Extension Notifications** - Should the system notify the assigned Assessor/Validator when a deadline is extended for a barangay they're working with?

**OQ-6.6:** **Bulk Deadline Extensions** - Should the system support bulk deadline extensions (e.g., "Extend deadline for all barangays in a specific municipality by 7 days")?

**OQ-6.7:** **Indicator Approval Workflow** - Should indicator edits require a review/approval step before going live, or should MLGOO-DILG changes be immediately active?

**OQ-6.8:** **Remark Schema Complexity** - How complex should the remark schema builder be? Should it support conditional logic as advanced as the calculation schema, or should it remain simpler?

**OQ-6.9:** **Indicator Preview for BLGUs** - Should there be a "Preview Mode" where MLGOO-DILG can see how an indicator will appear to BLGUs before activating it?

**OQ-6.10:** **Export/Import Configuration** - Should the system support exporting indicator configurations (JSON) for backup or sharing with other municipalities in the future?

---

## Appendix A: Related Documents

- **`docs/indicator-builder-specification.md`** - **Indicator Builder Specification v1.4** (CRITICAL: Source of truth for indicator structure, MOV checklist items, validation patterns, and BBI functionality system)
- `docs/project-roadmap.md` - SINAG Feature Roadmap
- `tasks/tasks-prd-blgu-preassessmet-workflow/README.md` - Metadata-Driven Indicator Management Approach
- `CLAUDE.md` - SINAG Architecture & Development Guidelines
- `.cursor/rules/create-prd.mdc` - PRD Creation Guidelines

---

## Appendix B: Glossary

- **MLGOO-DILG**: Municipal Local Government Operations Officer - DILG, the primary administrator of the SINAG system
- **BBI**: Barangay-based Institutions (e.g., Lupon, BAC, BCPC, BHW)
- **SGLGB**: Seal of Good Local Governance for Barangays
- **MOV**: Means of Verification (documentary evidence)
- **form_schema**: JSON schema defining the input fields for an indicator
- **calculation_schema**: JSON schema defining the automatic Pass/Fail calculation rules for an indicator
- **remark_schema**: JSON schema defining how human-readable remarks are generated for an indicator
- **is_auto_calculable**: Boolean flag indicating whether the system should attempt automatic validation for an indicator

---

**End of PRD**
