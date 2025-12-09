# **PRD: The BLGU Table Assessment Workflow**

## **Document Version History**

| Version | Date              | Author                             | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------- | ----------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.2     | November 12, 2025 | SINAG Development Team             | **Phase 2 PRD Alignment**: Aligned with Indicator Builder Specification v1.4<br/>- Added [Section 9.3 (MOV Checklist Validation System)](#93-mov-checklist-validation-system) comprehensively documenting MOV Checklist Validation System with 9 checklist item types, advanced validation patterns, and BBI functionality determination<br/>- Enhanced [Section 4.2 (Assessment Interface)](#42-assessment-interface-the-my-table-assessment-page) with BBI functionality indicator context in Dynamic Form Rendering note<br/>- Added comprehensive specification reference to [Section 7.2 (Backend Logic)](#72-backend-logic)<br/>- Added BBI functionality indicators table (9 indicators determining BBI status)<br/>- Clarified direction of BBI relationship: Indicator result → BBI status (no cross-references) |
| 2.1     | November 2025     | Technical Documentation Specialist | Architectural correction - BLGU should not see P/F/C status during Table Assessment. Removed real-time Pass/Fail/Conditional feedback from BLGU UI. Shifted focus from "compliance status" to "completion status" for BLGU experience. Clarified that calculation_schema runs on backend but results are not displayed to BLGUs. Backend still calculates P/F/C internally for Assessor/Validator use.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2.0     | November 2025     | Technical Documentation Specialist | Incorporating November 4, 2025 DILG consultation changes: terminology updates (Pre-Assessment → Table Assessment), dynamic indicator logic support, automated status determination, calculation_schema support                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 1.0     | Initial           | -                                  | Original PRD for BLGU Pre-Assessment Workflow                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

---

### **1. Introduction & Overview**

**Project Title:** SGLGB Analytics System: Strategic Insights Nurturing Assessments and Governance
(SINAG) To Assess And Assist Barangays utilizing a Large Language Model and Classification Algorithm

This document outlines the product requirements for **Phase 2: The BLGU Table Assessment Workflow**.
This feature is the core "data input" component of the SINAG platform, focusing entirely on the
experience of the Barangay Local Government Unit (BLGU) user.

**Terminology Update (Nov 2025):** This phase was previously called "Pre-Assessment" but is now
formally renamed to **"Table Assessment"** to accurately reflect that this represents the initial
in-person assessment with the Assessor, not a preliminary or "pre" phase.

The primary goal is to provide BLGU users with a clear, intuitive, and **dynamically generated
interface** to conduct their SGLGB self-assessment, upload the necessary evidence (Means of
Verification - MOVs), and submit their completed assessment for review. This workflow is the
starting point for the entire assessment lifecycle.

### **2. Goals**

- **Provide a "Mission Control" Dashboard:** To give BLGU users a clear, at-a-glance summary of
  their assessment status and required actions.
- **Streamline Data Entry via a Dynamic UI:** To create an efficient, **metadata-driven interface**
  that automatically renders the correct input fields (e.g., Yes/No, Date, Numeric) for each unique
  SGLGB indicator.
- **Support Complex Form Requirements:** To implement a flexible, metadata-driven form rendering
  engine (via `form_schema`) that handles complex indicator input requirements including conditional
  field visibility, compound fields, and multi-part inputs.
- **Provide Real-Time Completion Feedback:** To enable BLGUs to understand and complete all required
  inputs with real-time guidance on form requirements, required fields, MOV uploads, and submission
  completeness. The system will internally calculate Pass/Fail/Conditional status (for
  Assessor/Validator use), but the BLGU UX focuses on ensuring they can complete all required inputs
  and understand what's needed for a complete submission.
- **Ensure Data Integrity:** To implement a robust MOV upload system with validation checks that
  prevent incomplete submissions.
- **Establish a Clear Workflow:** To define a locked submission process with clear status changes,
  guiding the user through the single, consolidated rework cycle.

### **3. User Stories**

- **As a BLGU user, I want to:**
  - See a personalized dashboard with my table assessment status, a progress bar, and direct links
    to each governance area, so I can immediately understand what to do.
  - See a summary of assessor comments on my dashboard if my assessment "Needs Rework," so I can
    quickly find what to fix.
  - **Be presented with the correct set of input fields for each indicator (e.g., a Yes/No choice, a
    date picker, a number field), so I can provide accurate data for every type of question.**
  - **See clear indicators of completion status** (e.g., "Section complete", "Missing required
    fields", "MOV required"), so I know my submission is complete and ready for Assessor review.
  - **Understand complex indicator requirements with clear visual guidance** (e.g., "This indicator
    requires either a date OR a percentage value"), so I can navigate conditional field logic and
    provide all necessary information.
  - Have the official "Technical Notes" visible for every indicator, so I have the necessary
    guidance to understand what information is needed.
  - Upload multiple files (PDF, DOCX, etc.) of up to 10MB for any indicator, so I can provide all
    necessary evidence.
  - Be prevented from submitting if I have missing required fields, haven't uploaded required MOVs,
    or if required fields based on conditional logic are incomplete.
  - Receive a clear confirmation after submission and see my dashboard status update to "Submitted
    for Review."
  - Be notified when my submission is sent back for rework and see exactly which indicators are
    flagged.

### **4. Functional Requirements**

#### **4.1. The BLGU Dashboard**

1.1. The dashboard must display a prominent visual progress bar indicating the number of indicators
completed. 1.2. A large, clear status badge must be displayed, showing the current table assessment
status (`Not Started`, `In Progress`, `Submitted for Review`, `Needs Rework`, `Validated`). 1.3. The
dashboard must feature a list of clickable links to navigate directly to each SGLGB Governance Area.
1.4. If the status is `Needs Rework`, the dashboard must display a section summarizing the
assessor's comments with clear indicators of which specific items need attention. 1.5. **Real-Time
Completion Tracking**: The dashboard should display completeness metrics (e.g., "17 indicators
completed, 3 indicators with missing data, 2 indicators with missing MOVs out of 22 total
indicators"). Completion means all required fields are filled and all required MOVs are uploaded.

#### **4.2. Assessment Interface (The "My Table Assessment" Page)**

2.1. The interface must be organized into tabs, each corresponding to a top-level **Governance
Area**. 2.2. Within each tab, all corresponding **Indicators** must be listed in an accordion style.
2.3. **Dynamic Form Rendering:** For each indicator, the system must read its `form_schema` metadata
from the API and dynamically render the appropriate input components. This includes support for:

- **`YES_NO`:** A radio button group with `Yes` and `No` options.
- **`NUMERIC`:** A number input field with validation for acceptable ranges.
- **`DATE`:** A date picker component.
- **`TEXT`:** A text input field.
- **`COMPOUND`:** A combination of multiple input fields within a single indicator.
- **`MULTI_CHECKBOX`:** A list of checkboxes for sub-indicators.
- **`PERCENTAGE`:** A numeric input specifically for percentage values (0-100%).
- **`CONDITIONAL`:** Fields that appear/disappear based on other field values (e.g., "If you select
  'Yes', provide date").

**Note on BBI Functionality Indicators:** Nine specific indicators (2.1, 3.1, 3.2, 3.3, 4.1, 4.3,
4.5, 4.8, 6.1) serve a dual purpose: they assess compliance AND determine the functionality status
of their associated Barangay-Based Institution (BBI). For example, Indicator 2.1 assesses BDRRMC
compliance and its validation result determines whether the BDRRMC is "Functional" or
"Non-Functional." This BBI functionality determination happens automatically after
Assessor/Validator validation, but BLGUs are not shown this status during their submission phase.
See Section 9.3 for complete BBI system details. 2.4. Each indicator must display its official
"Technical Notes" and the MOV Uploader component. 2.5. **Real-Time Completion Feedback:** As the
BLGU user enters data, the system must:

- Validate that all required fields (based on `form_schema`) are filled
- Validate that input formats are correct (e.g., valid percentages 0-100%, valid dates)
- Track which indicators have all required MOVs uploaded
- Display completion indicators (e.g., blue checkmark for "complete", gray icon for "incomplete")
- Show clear, actionable guidance for incomplete indicators (e.g., "Please upload required MOV",
  "This field is required when you select 'Yes'")
- Update completion status immediately when any input value changes 2.6. **Complex Form Requirements
  Support:** The form rendering engine must handle metadata-driven conditional field visibility and
  validation rules from `form_schema` including:
- **Conditional field visibility**: "If Field A = 'Yes', then show Field B"
- **Required field logic**: "Field B is required only if Field A = 'Yes'"
- **Format validation**: "Percentage must be between 0 and 100"
- **Compound field requirements**: "This indicator requires multiple input fields to be complete"
- **MOV requirements**: "If compliance indicator = 'Yes', then MOV upload is required"

**Note**: While the backend calculates Pass/Fail/Conditional status internally (via
`calculation_schema`) for Assessor/Validator use, this compliance status is NOT shown to the BLGU
user. The BLGU UI focuses entirely on input completeness and data validity.

#### **4.3. MOV (Means of Verification) Uploader**

3.1. The uploader must restrict uploads to: **PDF, DOCX, XLSX, PNG, and JPG**. 3.2. A maximum file
size limit of **10MB** per file must be enforced. 3.3. Multiple files must be allowed for a single
indicator. 3.4. Uploaded files must appear in a list with a "delete" icon, which is only active
before submission or during a rework phase.

#### **4.4. Submission Workflow**

4.1. A "Submit for Review" button must be present on the assessment page. 4.2. **Comprehensive
Completeness Check:** Upon clicking "Submit," the system must perform a validation check to ensure
the submission is complete:

- If any required fields (based on `form_schema`) are missing, the submission must be blocked
- If any conditionally required fields (based on conditional logic in `form_schema`) are incomplete,
  the submission must be blocked
- If any indicators that require MOVs (based on `form_schema` requirements) are missing uploads, the
  submission must be blocked
- If any format validation rules defined in `form_schema` are not met, the submission must be
  blocked
- The UI must highlight all incomplete or invalid indicators with specific error messages explaining
  what is missing or incorrect (e.g., "Required field missing", "MOV upload required", "Invalid
  percentage value") 4.3. **Successful Submission:** If the completeness check passes, a
  confirmation modal must appear, and the user will be redirected to their dashboard. The status
  must update to `Submitted for Review`. 4.4. **Locked State:** Once submitted, the entire "My Table
  Assessment" page becomes read-only for the BLGU user.

**Note**: The submission validation focuses on COMPLETENESS (all required data provided) not
COMPLIANCE (whether requirements are met). The backend will calculate Pass/Fail/Conditional status
after submission for Assessor review, but this is not part of the BLGU submission workflow.

#### **4.5. Feedback and Rework Workflow**

5.1. When an assessment is sent back for rework during the Table Assessment phase, the BLGU user
must be notified, and the dashboard status must change to `Needs Rework`. 5.2. The "My Table
Assessment" page must become editable again, but **only for the specific indicators** flagged by the
assessor. 5.3. The BLGU user can then update their answers, re-upload corrected MOVs, and resubmit.
This rework cycle can only be performed **once** during the Table Assessment phase. 5.4. **Real-time
completion validation during rework**: When editing during rework, the system validates that all
required corrections from the rework request have been addressed and all fields are complete. The
same completeness feedback (required fields, MOV uploads, format validation) continues to function,
helping the BLGU user ensure their rework submission is complete before resubmitting.

### **5. Non-Goals (Out of Scope)**

- The system will not save multiple draft versions of a table assessment. It will only maintain the
  single, current state.
- A user-facing audit log or detailed history of changes is not required for this epic.
- The application will not support an offline mode for filling out forms.
- A feature for the BLGU user to unilaterally "un-submit" or recall their submission is not
  included.
- **The Table Validation Phase 2 workflow** (with Validators and Calibration) is out of scope for
  this PRD - that is covered separately in Phase 3B.

### **6. Design & UX Considerations**

- The UI will be built using `shadcn/ui` components for consistency.
- The dashboard should be designed as a "mission control" center, prioritizing clarity and
  at-a-glance information.
- The use of visual aids like progress bars and color-coded status badges is highly encouraged.
- **Completion status indicators** must be visually clear and use neutral, informational color
  coding:
  - **Complete**: Blue with checkmark icon (all required fields filled, all required MOVs uploaded)
  - **Incomplete**: Gray with pending icon (missing required fields or MOVs)
  - **Invalid**: Orange with alert icon (format validation failed, e.g., invalid percentage)
  - Avoid green/red/yellow which imply pass/fail judgment - focus on complete/incomplete states
- **Field requirement guidance** must be presented in user-friendly language with clear actionable
  instructions. For example:
  - "This indicator requires either a date OR a percentage value"
  - "Please upload at least one MOV document"
  - "This field is required because you selected 'Yes' for the previous question"
- Error messages must be user-friendly, specific, and actionable, focusing on what data is needed,
  not compliance judgment.
- The UI must clearly distinguish between locked (read-only) and editable states.
- **Conditional field visibility**: When fields appear/disappear based on conditional logic in
  `form_schema`, use smooth transitions to avoid jarring UX.
- **Validation feedback**: Provide immediate visual feedback when fields are validated (e.g.,
  checkmark when valid format entered).

**Key UX Principle**: The BLGU interface emphasizes **completeness** (all required information
provided) rather than **compliance** (whether requirements are met). Focus messaging on
"complete/incomplete" not "pass/fail".

### **7. Technical Considerations**

#### **7.1. Database Schema**

This epic requires the implementation and interaction of the following models:

- **`governance_indicators`**: Must include:
  - **`form_schema` (JSONB)**: Defines the structure of each indicator's form (field types, labels,
    validation rules)
  - **`calculation_schema` (JSONB)**: Defines the logic for automatically calculating indicator
    status (Pass/Fail/Conditional) based on response data. This schema must support:
    - Simple boolean logic (e.g., "If Yes, then Pass")
    - Threshold evaluations (e.g., "If value >= 50%, then Pass")
    - OR conditions (e.g., "If physical_accomplishment >= 50% OR financial_accomplishment >= 50%,
      then Pass")
    - Multi-part conditions (e.g., "If field_A = 'Yes' AND field_B >= 3, then Pass")
    - Multiple compliance paths with different requirements
  - **`remark_schema` (JSONB)**: Defines rules for automatically generating descriptive remarks
    based on calculated status and response data
  - **`technical_notes` (Text)**: Official guidance text displayed to BLGU users

- **`assessments`**: To track the overall status (Enum: `Not Started`, `In Progress`,
  `Submitted for Review`, `Needs Rework`, `Validated`)

- **`assessment_responses`**: Must include:
  - **`response_data` (JSONB)**: Flexibly stores the structured data from dynamic forms
  - **`calculated_status` (Enum)**: Stores the automatically calculated status
    (Pass/Fail/Conditional) based on `calculation_schema` execution
  - **`calculated_remark` (Text)**: Stores the auto-generated descriptive remark based on
    `remark_schema`

- **`movs` & `feedback_comments`**: As previously defined

#### **7.2. Backend Logic**

**Reference Documentation:**

For complete indicator structure specifications, MOV checklist validation patterns, BBI
functionality system, and detailed technical implementation guidance, see: **📄
[Indicator Builder Specification v1.4](/docs/indicator-builder-specification.md)**

This specification document defines:

- Complete `form_schema` structure for all SGLGB indicators
- MOV checklist item types and validation logic for Assessor/Validator interfaces
- BBI functionality determination rules
- Grace period validation and "Considered" status handling
- OR logic, conditional display, and alternative evidence patterns
- Database schema for indicators, MOV checklists, and BBI tracking

---

- **API Endpoints:**
  - The main `GET` endpoint for the assessment must return `form_schema` for each indicator (defines
    input fields and requirements)
  - The `PUT` endpoint for updating an indicator response must:
    - Handle and validate the flexible `JSONB` data structure based on the indicator's `form_schema`
    - Validate completeness: all required fields filled, correct formats, required MOVs uploaded
    - Execute the `calculation_schema` logic to automatically determine the indicator status
      (Pass/Fail/Conditional)
    - Execute the `remark_schema` logic to generate the descriptive remark
    - Store the calculated status and remark in the `assessment_responses` table for
      Assessor/Validator use
    - **Do NOT return** `calculated_status` and `calculated_remark` in the response to the BLGU
      frontend
    - Return validation results for completeness (e.g., "required field missing", "invalid format",
      "MOV required")

- **Calculation Engine:**
  - Must be implemented as a reusable service/module that can execute `calculation_schema` logic
  - Should handle all supported logic types: boolean, threshold, OR conditions, multi-part
    conditions, multiple compliance paths
  - Must be testable independently of API endpoints
  - Should provide clear error messages if calculation logic fails
  - **Purpose**: The calculation engine runs on every submission update to maintain up-to-date
    calculated status for Assessor/Validator views, but these calculated values are not exposed to
    the BLGU API endpoints

- **Comprehensive Completeness Check:**
  - Must validate submission completeness:
    - All required fields (based on `form_schema`) are filled
    - Conditionally required fields (based on conditional logic in `form_schema`) are complete
    - All validation rules defined in `form_schema` are met (format, ranges, etc.)
    - Required MOVs (based on `form_schema` requirements) are uploaded
  - Must provide specific, actionable error messages for each validation failure
  - Does NOT check compliance (Pass/Fail/Conditional) - only checks completeness

#### **7.3. Frontend Implementation**

- **Form Rendering Engine:**
  - Must dynamically render form fields based on `form_schema` metadata
  - Must support all field types (YES_NO, NUMERIC, DATE, TEXT, COMPOUND, MULTI_CHECKBOX, PERCENTAGE,
    CONDITIONAL)
  - Must handle conditional field visibility based on other field values from `form_schema`
  - Must validate input in real-time based on `form_schema` validation rules

- **Completeness Tracking Logic:**
  - Track which indicators have all required fields completed (based on `form_schema`)
  - Track which indicators have all required MOVs uploaded
  - Display aggregate completeness percentage on dashboard
  - Provide clear actionable items for what's missing (e.g., "3 indicators need MOV uploads", "2
    indicators have missing required fields")
  - Update completion status in real-time as user enters data

- **Client-Side Validation:**
  - Implement client-side validation to guide BLGUs to provide complete and valid data:
    - Required fields are filled
    - Input formats are correct (e.g., valid percentages 0-100%, valid dates)
    - Required MOVs are uploaded
    - Conditional fields (from `form_schema`) are properly shown/hidden and validated
  - Provide immediate feedback to users without requiring API calls for simple validations
  - Must still defer to backend for final completeness validation before submission

**Note**: The frontend does NOT display Pass/Fail/Conditional status to BLGUs. All frontend logic
for displaying real-time P/F/C based on `calculation_schema` is removed for the BLGU's Table
Assessment view. The frontend focuses purely on guiding the BLGU to complete all inputs as per
`form_schema`.

#### **7.4. File Storage**

- All uploaded MOV files will be securely stored in **Supabase Storage**
- File metadata (name, size, upload date, uploader) must be tracked in the `movs` table
- Files must be associated with specific indicators and assessments

#### **7.5. Migration Considerations**

- Existing `governance_indicators` table must be migrated to add `calculation_schema` and
  `remark_schema` columns
- Existing `assessment_responses` table must be migrated to add `calculated_status` and
  `calculated_remark` columns
- Migration scripts must provide default/placeholder values for existing data
- Consider creating seed data with sample `calculation_schema` definitions for testing

### **8. Success Metrics**

- BLGU users can successfully complete and submit their table assessment, accurately providing data
  for all different indicator types (Yes/No, Numeric, Date, Percentage, Compound, Conditional,
  etc.).
- **Completeness tracking works correctly**: BLGUs can clearly identify incomplete sections with
  95%+ accuracy based on visual completion indicators.
- **Submission validation prevents incomplete submissions 100% of the time** and provides specific,
  actionable error messages for what's missing.
- **Internal Pass/Fail/Conditional calculation accuracy is 100%** (verified against Assessor manual
  determination). This calculation runs on the backend and is used by Assessors/Validators, but is
  not displayed to BLGUs.
- **Complex form requirements are properly handled**, including conditional field visibility,
  compound fields, and multi-part input validation.
- The "Comprehensive Completeness Check" successfully blocks all incomplete submissions and provides
  specific, actionable error messages focused on what data is missing or invalid.
- The end-to-end flow—from data entry with real-time completeness feedback, to submission, to
  rework, to resubmission—is functional and intuitive.
- A measurable reduction in the time it takes for a BLGU to complete their self-assessment compared
  to manual methods.
- **User feedback indicates clarity**: BLGU users understand what information is required for each
  indicator and can navigate conditional field logic without confusion (measured via user testing or
  feedback surveys).

### **9. Architectural Clarifications**

#### **9.1. Two-Tier Validation System**

The SINAG system implements a two-tier validation approach:

1. **Completeness Validation (shown to BLGU)**:
   - **Purpose**: Ensure the BLGU has provided all required information
   - **What it checks**: All required fields filled? All MOVs uploaded? Valid input formats?
   - **When it runs**: Real-time as BLGU enters data, and before submission
   - **Displayed to**: BLGU users via completion indicators and validation messages
   - **Focus**: "Is my submission complete and ready for review?"

2. **Compliance Validation (NOT shown to BLGU)**:
   - **Purpose**: Determine if the BLGU meets SGLGB requirements
   - **What it checks**: Does this response meet the indicator's compliance criteria?
     Pass/Fail/Conditional?
   - **When it runs**: On the backend after each data update and submission
   - **Displayed to**: Assessors and Validators (in Phase 3), NOT to BLGU users
   - **Focus**: "Does this meet the SGLGB requirements?"

**Key Principle**: BLGUs should understand what information is needed (completeness), but
Pass/Fail/Conditional determination is the responsibility of human Assessors and Validators, not the
BLGU themselves.

#### **9.2. Assessor vs. Validator View Distinction**

While this PRD focuses on the BLGU experience (Phase 2), it's important to note:

- **Assessors** (Phase 3A) WILL see the calculated Pass/Fail/Conditional status when they review
  BLGU submissions
- **Validators** (Phase 3B) WILL also see the calculated status during the Table Validation phase
- This calculated status (from `calculation_schema`) helps guide Assessor/Validator review but does
  not replace their professional judgment
- The Phase 3 PRDs cover the Assessor/Validator interfaces where compliance status IS displayed

#### **9.3. MOV Checklist Validation System**

The SINAG system implements a comprehensive **MOV (Means of Verification) checklist validation
system** used by Assessors and Validators during the review process. This system is distinct from
the BLGU submission interface and represents the professional validation layer.

**Key Characteristics:**

1. **BLGU Submission Layer (Phase 2 - This PRD)**:
   - BLGUs upload MOV files (PDF, DOCX, images) as evidence
   - BLGUs provide data inputs (dates, amounts, text) via `form_schema`-driven forms
   - Focus: Completeness of submission

2. **Assessor/Validator Validation Layer (Phase 3)**:
   - Assessors/Validators use **MOV checklist items** to systematically validate evidence
   - Checklist items are metadata-driven (defined per indicator in indicator configuration)
   - 9 checklist item types supported: checkbox, group, currency_input, number_input, text_input,
     date_input, assessment, radio_group, dropdown
   - Validation includes threshold checks, grace period handling, OR logic, conditional display
   - Results in Pass/Fail/Considered/Not Applicable status determination

**MOV Checklist Item Types:**

| Type               | Purpose                                 | Example Use Case                             |
| ------------------ | --------------------------------------- | -------------------------------------------- |
| **checkbox**       | Binary validation (Yes/No)              | "Document posted: Yes/No"                    |
| **group**          | Logical grouping with optional OR logic | "Either document A OR document B acceptable" |
| **currency_input** | Monetary validation with thresholds     | "Budget allocation ≥ ₱50,000"                |
| **number_input**   | Numeric validation with min/max         | "Training attendance ≥ 15 participants"      |
| **text_input**     | Free-text evidence recording            | "BBI composition details"                    |
| **date_input**     | Date validation with grace periods      | "Ordinance date within 30-day grace period"  |
| **assessment**     | Sub-indicator evaluation                | "Validator judgment: Compliant?"             |
| **radio_group**    | Single-selection validation             | "Select document type verified"              |
| **dropdown**       | Dropdown selection validation           | "Select applicable category"                 |

**Advanced Validation Patterns:**

- **OR Logic**: Alternative evidence paths (e.g., "Physical accomplishment ≥50% OR Financial
  utilization ≥50%")
- **Conditional Display**: Show/hide checklist items based on barangay data or previous responses
- **Threshold Validation**: Automatic pass/fail with numeric thresholds
- **Grace Period Handling**: Date validation with grace periods produces "Considered" status
  (equivalent to "Passed")
- **Alternative Evidence**: Substitute acceptable documents with consideration notes
- **Mutually Exclusive Scenarios**: Selection mode for "one_of" logic where validator selects
  applicable scenario

**BBI Functionality Determination:**

Nine indicators across the SGLGB framework serve a dual purpose:

1. Standard indicator validation (Pass/Fail/Considered)
2. **Determine BBI (Barangay-Based Institution) functionality status**

The **direction of relationship** is critical:

- **Indicator validation result → BBI functionality status**
- When an indicator passes validation → its associated BBI is marked "Functional"
- When an indicator fails validation → its associated BBI is marked "Non-Functional"
- **No cross-references**: Indicators do NOT check other BBI statuses as validation criteria

**9 BBI Functionality Indicators:**

| Indicator | BBI Determined      | Governance Area                       |
| --------- | ------------------- | ------------------------------------- |
| 2.1       | BDRRMC              | Core 2: Disaster Preparedness         |
| 3.1       | BADAC               | Core 3: Safety, Peace and Order       |
| 3.2       | BPOC                | Core 3: Safety, Peace and Order       |
| 3.3       | Lupong Tagapamayapa | Core 3: Safety, Peace and Order       |
| 4.1       | VAW Desk            | Essential 1: Social Protection        |
| 4.3       | BDC                 | Essential 1: Social Protection        |
| 4.5       | BCPC                | Essential 1: Social Protection        |
| 4.8       | BNC                 | Essential 1: Social Protection        |
| 6.1       | BESWMC              | Essential 3: Environmental Management |

**Reference Documentation:**

For complete MOV checklist specifications, validation patterns, BBI system details, and 29+ real
indicator examples, see: **📄
[Indicator Builder Specification v1.4](/docs/indicator-builder-specification.md)**

### **10. Open Questions**

#### **10.1. Calculation Schema Implementation**

- **Q:** What specific format should the `calculation_schema` JSON structure follow? Should it be a
  custom DSL (Domain-Specific Language) or leverage an existing expression language?
- **Consideration:** A well-defined JSON schema for `calculation_schema` will be critical for both
  MLGOO-DILG indicator management (Phase 6) and backend implementation. Consider creating a formal
  schema definition document.
- **Note**: This calculation runs on the backend only and is not used by the BLGU frontend.

#### **10.2. Performance Optimization**

- **Q:** For complex indicators with multiple nested conditions, what is the acceptable latency for
  backend status calculation?
- **Consideration:** Since the calculated status is not displayed to BLGUs in real-time, performance
  requirements are less critical for the BLGU experience. Calculation can be optimized for accuracy
  over speed.

#### **10.3. Error Handling for Invalid Calculation Schemas**

- **Q:** If a `calculation_schema` is malformed or contains logic errors, how should the system
  gracefully handle this during backend processing?
- **Consideration:** Need fallback behavior and admin alerting to MLGOO-DILG when schema execution
  fails. Since BLGUs don't see the calculated status, schema errors won't directly impact BLGU UX,
  but will affect Assessor/Validator views.

#### **10.4. Backward Compatibility**

- **Q:** How should the system handle existing indicators that don't yet have a `calculation_schema`
  defined?
- **Consideration:** May need a "legacy mode" that falls back to simple Yes/No logic until all
  indicators are migrated to the new metadata-driven approach.

#### **10.5. Conditional Field Data Persistence**

- **Q:** When conditionally required fields become hidden (e.g., user changes answer from "Yes" to
  "No"), should their previously entered data be preserved or cleared?
- **Consideration:** User experience implications - preserving data allows users to toggle back
  without re-entering, but may cause validation confusion. Recommend preserving data but not
  validating hidden fields.
