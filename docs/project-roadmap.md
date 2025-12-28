# SINAG Application - Feature Roadmap

This document outlines the high-level feature epics for the development of the SINAG web
application. Epics are listed in the general order of implementation.

---

## Revision History

### November 5, 2025

**Reason:** Incorporating changes from November 4, 2025 DILG consultation **Impact:** Fundamental
re-evaluation of user roles, workflow terminology, assessment phases, and indicator calculation
logic.

**Key Changes:**

- **User Roles Redefined**: The `Assessor` role now covers all governance areas for assigned
  barangays during the new **Table Assessment (Phase 1)**. A new **`Validator` role** is introduced
  for **Table Validation (Phase 2)**, specializing in specific governance areas across all
  barangays.
- **Terminology Updated**: "Pre-Assessment" is formally renamed to **"Table Assessment"**, and
  "Validation" to **"Table Validation"**. The rework process within Table Assessment is now simply
  **"Rework"**, while in Table Validation, it's termed **"Calibration"**.
- **Workflow Restructured**: The original Phase 3 is now implicitly split, reflecting two distinct,
  sequential phases (`Table Assessment` by Assessors, followed by `Table Validation` by Validators).
- **Dynamic Indicator Logic & Calculations**: Enhanced support for **metadata-driven rule
  evaluation** for indicators. This includes handling complex conditions (e.g., "OR" conditions like
  50% physical _or_ 50% financial accomplishment) via `calculation_schema`, moving beyond simple
  Yes/No logic.
- **"Conditional" Status Redefined**: The `Conditional` status is introduced for specific indicators
  and will be internally treated as a `Pass` during area-level compliance calculations.
- **MLGOO-DILG Enhanced Control**: The MLGOO-DILG gains crucial system control to **unlock or extend
  deadlines for specific indicators** for a barangay, and participates directly as an Assessor in
  Phase 1.
- **BBI Functionality Determination**: BBI (Barangay-Based Institutions) status will now be
  **automatically calculated** ("Functional"/"Non-Functional") from structured indicator results
  within the system, rather than requiring a separate simple submission workflow.
- **Dynamic Indicator-Level Remarks**: The system will automatically generate descriptive remarks
  (e.g., "All requirements met," "[BBI Name] Functional/Non-functional") for Level 1 indicators
  based on defined remark_schema metadata and calculated statuses.
- **New AI Feature**: A new AI-powered feature for **summarizing Assessors'/Validators' textual
  comments** will be integrated.

---

## Phase 1: Core User Authentication & Management

**Status:** 🔄 Needs Revision **Description:** The foundational security layer. Includes user
login/logout, a User Management dashboard for the MLGOO-DILG (CRUD operations), and a secure,
role-based access control system. This is the gateway to all other features.

### Required Changes (Nov 4, 2025 Consultation)

**User Role Redefinition:**

- **Assessor Role**: Originally scoped to specific governance areas. Now redefined to cover **all
  governance areas** for their assigned barangays during **Table Assessment Phase 1** (the initial
  in-person assessment and rework cycle).
- **New Validator Role**: Introduced for **Table Validation Phase 2**. Validators are assigned to
  **specific governance areas** but work **across all barangays** during the calibration and final
  validation phase.
- **MLGOO-DILG Dual Role**: Acts as Assessor during Phase 1 for their assigned barangays, and as
  Chairman during Phase 2 with final approval authority and the ability to unlock/extend deadlines.

**Impact:**

- User management interface must support creating/editing both Assessor and Validator roles with
  distinct assignment patterns (barangay-wide vs. area-specific).
- Access control logic needs updating to reflect phase-specific role behaviors.
- Database schema may need updates to store phase-specific role assignments.

---

## Phase 2: The BLGU Table Assessment Workflow

**Status:** 🔄 Needs Revision **Description:** This epic focuses entirely on the BLGU user's
journey. It's the core "data input" part of the application, where the initial self-assessment data
is captured.

**Key Features:**

- A personalized BLGU dashboard showing their specific barangay's status.
- A multi-tabbed interface for navigating SGLGB Governance Areas.
- A dynamic, metadata-driven form for filling out the Self-Evaluation Document (SED).
- A fully functional MOV (Means of Verification) uploader.
- A "Submit for Review" function that sends the submission to the appropriate Assessor.

### Required Changes (Nov 4, 2025 Consultation)

**Terminology Update:**

- **"Pre-Assessment" → "Table Assessment"**: This phase represents the initial in-person assessment
  with the Assessor, not a "pre" phase. All UI labels, documentation, and code references need
  updating.

**Dynamic Indicator Logic Support:**

- **Metadata-Driven Rule Evaluation**: The form_schema and calculation_schema must support complex,
  flexible validation logic for indicators. This moves beyond simple Yes/No evaluation to handle
  conditional requirements and multiple compliance paths (e.g., "50% physical accomplishment OR 50%
  financial accomplishment", "Indicator 1 OR Indicator 2 must be met"). The form rendering and
  validation logic must be driven by these metadata schemas.
- **Automated Indicator Status Determination**: Based on the metadata-driven calculation rules and
  the "3+1" rule, the system should automatically determine and display whether an indicator is
  considered "Pass", "Fail", or "Conditional" during the BLGU's self-assessment input phase.

**Impact:**

- Form rendering engine needs enhancement to handle metadata-driven conditional logic and complex
  validation rules.
- Real-time status calculation during data entry based on calculation_schema.
- Database schema enhancements to store and execute complex form_schema and calculation_schema
  definitions.

---

## Phase 3: The Assessor/Validator Workflows

**Status:** 🔄 Needs Major Revision / Split into Two Phases **Description:** This epic originally
covered all assessor validation activities. Based on the November 4, 2025 consultation, this must
now be split into two distinct phases with different user roles, scopes, and workflows.

### Original Key Features (For Reference):

- A "Submissions Queue" dashboard, firewalled to the Assessor's specific governance area.
- A validation UI for reviewing BLGU submissions against official Technical Notes.
- A feature to compile a single, consolidated rework request and send it back to the BLGU.
- Functionality to perform the final, authoritative validation clicks within the system during the
  Table Assessment.
- An Assessor-side MOV uploader to handle "pahabol" documents presented during the Table Validation.

### Required Changes (Nov 4, 2025 Consultation)

**This phase must be split into:**

#### **Phase 3A: Assessor Table Assessment & Rework Cycle**

**Status:** 🔄 Needs Revision **User Role:** Assessor (covers all governance areas for assigned
barangays) **Workflow:**

1. Assessor reviews BLGU submission during initial in-person Table Assessment
2. Assessor validates all governance areas for their assigned barangays
3. Assessor can send ONE consolidated rework request back to BLGU
4. BLGU resubmits corrections
5. Assessor performs final validation during the Table Assessment phase
6. Assessor uploads any "pahabol" MOVs submitted during in-person meeting

**Key Changes:**

- Dashboard must show all governance areas for the Assessor's assigned barangays (not area-specific
  filtering)
- Single rework cycle enforcement remains
- "Conditional" status handling: Assessor can mark indicators as "Conditional" (treated as Pass
  internally)
- MLGOO-DILG acts as Assessor for their assigned barangays in this phase

#### **Phase 3B: Validator Table Validation & Calibration Cycle**

**Status:** 🚧 Not Yet Implemented **User Role:** Validator (covers specific governance area across
all barangays) **Workflow:**

1. After Phase 1 completes, Validators review all barangays for their assigned governance area
2. Validators can send calibration requests back to BLGUs (similar to rework, but called
   "Calibration")
3. BLGU resubmits corrections during the Calibration phase
4. Validator performs final validation
5. Validator uploads any additional MOVs during Table Validation Phase 2
6. MLGOO-DILG acts as Chairman with final approval authority and can unlock/extend deadlines

**Key Differences from Phase 3A:**

- **Scope**: Area-specific across all barangays (not barangay-wide)
- **Terminology**: "Calibration" instead of "Rework"
- **Deadline Control**: MLGOO-DILG can unlock submissions and extend deadlines for specific
  barangays
- **Final Authority**: Chairman role has ultimate approval power
- **Separate Deadline**: Table Validation Phase 2 has its own deadline distinct from Phase 1

**Impact:**

- Major UI refactor needed to support two distinct user roles with different filtering and
  permissions
- Database schema must distinguish between Rework (Phase 1) and Calibration (Phase 2) cycles
- Notification system must handle both phases separately
- Deadline management system must support phase-specific deadlines and MLGOO override capabilities

---

## Phase 4: The Core Intelligence Layer

**Status:** 🔄 In Progress / Needs Revision **Description:** This epic implements the "smart"
features that automate scoring and generate insights based on the final, validated data.

**Key Features:**

- **The Classification Algorithm:** A backend module that runs automatically after an Assessor
  performs the final validation in the system. It applies the "3+1" logic to the final,
  authoritative data to calculate the official SGLGB Compliance Status (pass/fail result).
- **Gemini API Integration:** A backend service that sends the finalized assessment results to the
  Google Gemini API to generate written recommendations and CapDev insights.

### Required Changes (Nov 4, 2025 Consultation)

**Classification Algorithm Refinements:**

- **"3+1" Rule Enhancement**: For Vary and Essential areas, if at least ONE indicator is met
  (regardless of the complexity of its calculation logic), the entire area passes. The algorithm
  must properly evaluate metadata-driven calculation rules when determining area-level compliance.
- **Enhanced Calculation Schema Support**: The calculation_schema must support evaluating indicators
  with flexible, metadata-driven logic including conditional requirements, multiple compliance
  paths, and complex validation rules (e.g., "50% physical OR 50% financial", "Indicator 1.1 OR
  Indicator 1.2 must be met").
- **"Conditional" Status Handling**: Indicators marked as "Conditional" by Assessors/Validators
  should be treated as "Pass" internally by the classification algorithm.
- **Phase-Aware Classification**: The algorithm must distinguish between Phase 1 (Table Assessment)
  and Phase 2 (Table Validation) final data.

**Gemini API Integration:**

- **New AI Feature - Comment Summarization**: The Gemini API should generate concise summaries of
  assessor/validator comments for each governance area or indicator. This helps BLGUs and leadership
  quickly understand key feedback themes.
- **Enhanced CapDev Recommendations**: Recommendations should account for the "Conditional" status
  and provide guidance on how to convert conditional passes to full compliance.

**Impact:**

- calculation_schema enhancement to support metadata-driven, flexible evaluation logic
- Classification algorithm refactor to handle "Conditional" status and execute calculation_schema
  rules
- New Gemini prompt engineering for comment summarization
- Database schema may need to store phase-specific classification results

---

## Phase 5: High-Level Analytics & Reporting

**Status:** 🔄 Needs Revision **Description:** This epic focuses on providing the MLGOO-DILG and
other stakeholders with high-level data visualizations and reports.

**Key Features:**

- A comprehensive MLGOO-DILG dashboard with KPIs on municipal-wide performance.
- A dedicated "Reports" page with data visualizations.
- The "Gap Analysis" report, which compares the initial BLGU submission against the final validated
  data to identify common areas of correction and weakness.
- A UI component to cleanly display the AI-generated recommendations from Gemini.
- A secure, read-only data feed/API endpoint for the Katuparan Center and the UMDC Peace Center.

### Required Changes (Nov 4, 2025 Consultation)

**Dashboard & Reporting Updates:**

- **Role-Specific Dashboards**: Must reflect new Assessor and Validator roles with distinct
  assignment patterns and phase-specific data.
- **Gap Analysis Enhancement**: Reports must clearly distinguish between:
  - **Rework** findings from Phase 1 (Table Assessment with Assessors)
  - **Calibration** findings from Phase 2 (Table Validation with Validators)
- **AI Comment Summaries**: UI must display the new Gemini-generated summaries of assessor/validator
  feedback alongside traditional reports.
- **BBI Functionality Reports**: Automatically calculated BBI (Barangay-based Institutions) status
  showing "Functional" or "Non-Functional" for each institution based on assessment indicator
  results. Accessible to MLGOO-DILG in reports and dashboards.

**Impact:**

- Dashboard components need refactoring to support phase-aware data filtering
- Gap Analysis reports must track Rework vs. Calibration cycles separately
- New UI components for displaying AI-generated comment summaries
- BBI calculation logic and reporting components to derive functionality status from indicators

---

## Phase 6: Administrative Features (MLGOO-DILG)

**Status:** 🔄 Needs Revision **Description:** A dedicated epic for high-level administrative
functions required by the MLGOO-DILG to manage the system over time.

**Key Features:**

- Indicator Management: A CRUD interface for the MLGOO-DILG to add, edit, or deactivate SGLGB
  indicators to keep the system aligned with national standards.
- BBI Configuration: Define which indicators determine BBI (Barangay-based Institutions)
  functionality status.
- System settings for managing assessment cycles and deadlines.

### Required Changes (Nov 4, 2025 Consultation)

**Indicator Management Enhancements:**

- **Dynamic form_schema Support**: The CRUD interface must support defining flexible,
  metadata-driven validation rules for indicators, including conditional logic, multiple compliance
  paths, and complex requirements (e.g., "50% physical OR 50% financial accomplishment",
  threshold-based evaluations, multi-part conditions).
- **calculation_schema Definition**: Must allow MLGOO-DILG to define the calculation logic that
  determines automatic Pass/Fail/Conditional status for indicators. This schema drives both
  real-time validation during data entry and final classification algorithm execution.

**BBI Configuration:**

- **BBI Definition**: BBI stands for **Barangay-based Institutions** (e.g., Lupon, BAC, BCPC, BHW,
  etc.)
- **Indicator-to-BBI Mapping**: Administrative interface to configure which indicator results
  determine whether each BBI is "Functional" or "Non-Functional"
- **Calculation Rules**: Define the logic for deriving BBI status from indicator outcomes (e.g., "If
  Indicator X passes, then Lupon is Functional")
- **No Separate Submission**: BBI status is automatically calculated from assessment results, not
  submitted separately

**Assessment Cycle Management:**

- **Granular Deadline Control**: System must support distinct deadlines for:
  - Table Assessment Phase 1 (with Assessors)
  - Rework submission deadline
  - Table Validation Phase 2 (with Validators)
  - Calibration submission deadline
- **MLGOO Unlock/Extend Deadline Control**: Critical feature allowing MLGOO-DILG to:
  - Unlock submissions for specific indicators for a specific barangay
  - Extend deadlines for individual barangays (providing "leeway" as needed)
  - Override standard deadline rules on a case-by-case basis

**Impact:**

- Major enhancement to indicator management UI to support flexible, metadata-driven form_schema and
  calculation_schema definitions
- New BBI configuration interface for mapping indicators to BBI functionality determinations
- Database schema for BBI calculation rules and indicator mappings
- Database schema updates for phase-specific deadlines and override tracking
- Access control updates for MLGOO deadline override capabilities

---

## Phase 7: General UI Polish & Notifications

**Status:** 🔄 Needs Revision **Description:** This is a cross-cutting epic that covers final polish
and essential user experience features.

**Key Features:**

- A comprehensive email notification system for all key events (e.g., "Submission Received," "Rework
  Required").
- User profile pages for users to manage their own passwords.
- Full mobile responsiveness testing and refinement.
- Creation of a "Help & Support" section.

### Required Changes (Nov 4, 2025 Consultation)

**Notification System Updates:**

- **Terminology Updates**: All notifications must use updated terminology:
  - "Table Assessment" instead of "Pre-Assessment"
  - Separate notifications for "Rework" (Phase 1) vs. "Calibration" (Phase 2)
- **New Notification Types**:
  - Rework request from Assessor (Phase 1)
  - Calibration request from Validator (Phase 2)
  - MLGOO deadline unlock/extension notifications
  - Phase 1 completion → Phase 2 transition notifications
- **Role-Specific Notifications**: Must route to correct user roles (Assessor vs. Validator) based
  on phase and assignment scope

**User Profile Updates:**

- **Role-Specific Assignments Display**: User profiles must show:
  - For Assessors: List of assigned barangays
  - For Validators: Assigned governance area(s)
  - For MLGOO-DILG: Dual role information and special capabilities

**Impact:**

- Notification templates need comprehensive updates for new terminology and phases
- Email routing logic must be phase-aware and role-aware
- User profile UI needs enhancement to display role-specific assignment information

---

## SINAG Web Application: A Brief Summary

The SGLGB Intelligent Analytics & Governance Platform (SINAG) is a pre-assessment, preparation, and
decision-support tool designed to address the high failure rate of barangays in the official Seal of
Good Local Governance for Barangays (SGLGB) assessment. The application manages a complete digital
workflow where Barangay Local Government Units (BLGUs) conduct a self-assessment by submitting a
Self-Evaluation Document (SED) and uploading digital Means of Verification (MOVs).

This submission then enters a single, consolidated rework cycle, where a specialized DILG Area
Assessor provides a comprehensive list of all deficiencies for the BLGU to correct and resubmit
once. The application's unique value is in its support for a hybrid validation process: during the
formal, in-person "Table Validation" meeting, the assessor uses SINAG as a live checklist to record
the final, official compliance data.

At its core, SINAG features a classification algorithm that runs on this final, validated data to
automatically apply the official "3+1" SGLGB logic and determine the official pass/fail result. The
system also functions as a powerful gap analysis tool by comparing the initial BLGU submission
against the final validated results. Finally, an integration with Google's Gemini API leverages
these outcomes to generate actionable CapDev recommendations, providing DILG leadership with a
sophisticated platform for data-driven governance.
