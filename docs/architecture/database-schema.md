# Database Schema

This document provides comprehensive visual documentation of the SINAG database schema, including entity relationship diagrams, table structures, and data relationships for the SGLGB assessment platform.

## Table of Contents

- [Complete Entity Relationship Diagram](#complete-entity-relationship-diagram)
- [User and Role Management](#user-and-role-management)
- [Assessment Years](#assessment-years)
- [Assessment Workflow](#assessment-workflow)
- [Governance Areas and Indicators](#governance-areas-and-indicators)
- [BBI Functionality System](#bbi-functionality-system)
- [Administrative Features](#administrative-features)
- [Indexes and Performance](#indexes-and-performance)

---

## Complete Entity Relationship Diagram

Comprehensive ERD showing all tables and their relationships in the SINAG database:

```mermaid
erDiagram
    users ||--o{ assessments : "blgu_user creates"
    users ||--o{ feedback_comments : "assessor writes"
    users ||--o{ audit_logs : "admin performs"
    users ||--o| barangays : "assigned to"
    users ||--o| governance_areas : "validator assigned to"
    users ||--o{ deadline_overrides : "creator"
    users ||--o{ mov_files : "uploaded_by"
    users ||--o{ assessment_years : "activated_by"

    barangays ||--o{ users : "has users"
    barangays ||--o{ deadline_overrides : "has overrides"

    assessment_years ||--o{ assessments : "contains"

    governance_areas ||--o{ users : "has validators"
    governance_areas ||--o{ indicators : "contains"
    governance_areas ||--o{ bbis : "defines"

    indicators ||--o{ assessment_responses : "has responses"
    indicators ||--o{ mov_files : "requires MOVs"
    indicators ||--o| indicators : "parent-child hierarchy"
    indicators ||--o{ checklist_items : "has MOV checklist"
    indicators ||--o{ indicators_history : "versioned"
    indicators ||--o{ deadline_overrides : "can be extended"

    assessments ||--o{ assessment_responses : "contains"
    assessments ||--o{ bbi_results : "calculates"
    assessments ||--o{ mov_files : "has evidence"
    assessments ||--o| users : "rework_requested_by"

    assessment_responses ||--o{ movs : "has MOVs (legacy)"
    assessment_responses ||--o{ feedback_comments : "receives feedback"

    bbis ||--o{ bbi_results : "evaluated in"

    assessment_cycles ||--o{ deadline_overrides : "has overrides"

    users {
        int id PK
        string email UK
        string name
        string phone_number
        enum role "MLGOO_DILG, VALIDATOR, ASSESSOR, BLGU_USER, KATUPARAN_CENTER_USER"
        int validator_area_id FK
        int barangay_id FK
        string hashed_password
        boolean must_change_password
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    barangays {
        int id PK
        string name UK
    }

    governance_areas {
        int id PK
        string name UK
        string code "FI, DI, SA, SO, BU, EN"
        enum area_type "CORE, ESSENTIAL"
    }

    indicators {
        int id PK
        string name
        string description
        int version
        boolean is_active
        boolean is_auto_calculable
        boolean is_profiling_only
        json form_schema
        json calculation_schema
        json remark_schema
        string technical_notes_text
        int governance_area_id FK
        int parent_id FK
        string indicator_code "1.1, 1.1.1, etc"
        int sort_order
        string selection_mode "single, multiple, none"
        json mov_checklist_items
        string validation_rule "ALL_ITEMS_REQUIRED, etc"
        boolean is_bbi
        datetime effective_date
        datetime retired_date
        int effective_from_year "First assessment year (NULL = all)"
        int effective_to_year "Last assessment year (NULL = ongoing)"
        datetime created_at
        datetime updated_at
    }

    assessment_years {
        int id PK
        int year UK "Assessment year e.g. 2025"
        datetime assessment_period_start
        datetime assessment_period_end
        datetime phase1_deadline
        datetime rework_deadline
        datetime phase2_deadline
        datetime calibration_deadline
        boolean is_active "Only ONE can be true"
        boolean is_published "Visible to Katuparan Center"
        text description
        datetime created_at
        datetime updated_at
        datetime activated_at
        int activated_by_id FK
        datetime deactivated_at
        int deactivated_by_id FK
    }

    assessments {
        int id PK
        enum status "DRAFT, SUBMITTED, IN_REVIEW, REWORK, AWAITING_FINAL_VALIDATION, AWAITING_MLGOO_APPROVAL, COMPLETED"
        int assessment_year FK "Links to assessment_years.year"
        int rework_count
        datetime rework_requested_at
        int rework_requested_by FK
        text rework_comments
        json rework_summary
        boolean is_calibration_rework
        int calibration_validator_id FK
        datetime calibration_requested_at
        int calibration_count
        json calibrated_area_ids
        json calibration_summary
        json pending_calibrations
        json calibration_summaries_by_area
        int mlgoo_approved_by FK
        datetime mlgoo_approved_at
        boolean is_mlgoo_recalibration
        int mlgoo_recalibration_requested_by FK
        datetime mlgoo_recalibration_requested_at
        int mlgoo_recalibration_count
        json mlgoo_recalibration_indicator_ids
        text mlgoo_recalibration_comments
        datetime grace_period_expires_at
        boolean is_locked_for_deadline
        datetime locked_at
        enum final_compliance_status "PASSED, FAILED"
        json area_results
        json ai_recommendations
        json capdev_insights
        datetime capdev_insights_generated_at
        string capdev_insights_status
        int blgu_user_id FK
        int reviewed_by FK
        datetime created_at
        datetime updated_at
        datetime submitted_at
        datetime validated_at
    }

    assessment_responses {
        int id PK
        json response_data
        boolean is_completed
        boolean requires_rework
        enum validation_status "PASSED, CONSIDERED, FAILED, NOT_APPLICABLE, PENDING"
        text generated_remark
        text assessor_remarks
        int assessment_id FK
        int indicator_id FK
        datetime created_at
        datetime updated_at
    }

    movs {
        int id PK
        string filename
        string original_filename
        int file_size
        string content_type
        string storage_path
        enum status "UPLOADED, VERIFIED, REJECTED"
        int response_id FK
        datetime uploaded_at
    }

    mov_files {
        int id PK
        int assessment_id FK
        int indicator_id FK
        int uploaded_by FK
        string file_name
        string file_url
        string file_type
        int file_size
        datetime uploaded_at
        datetime deleted_at
    }

    feedback_comments {
        int id PK
        text comment
        string comment_type
        boolean is_internal_note
        int response_id FK
        int assessor_id FK
        datetime created_at
    }

    bbis {
        int id PK
        string name
        string abbreviation
        text description
        boolean is_active
        json mapping_rules
        int governance_area_id FK
        datetime created_at
        datetime updated_at
    }

    bbi_results {
        int id PK
        enum status "HIGHLY_FUNCTIONAL, MODERATELY_FUNCTIONAL, LOW_FUNCTIONAL"
        json calculation_details
        int assessment_id FK
        int bbi_id FK
        datetime calculation_date
    }

    mov_annotations {
        int id PK
        int mov_file_id FK
        int assessor_id FK
        string annotation_type
        int page
        json rect
        json rects
        text comment
        datetime created_at
        datetime updated_at
    }

    checklist_items {
        int id PK
        int indicator_id FK
        string item_id UK "1_1_1_a, 1_1_1_b"
        string label
        string item_type "checkbox, info_text, etc"
        string group_name
        string mov_description
        boolean required
        boolean requires_document_count
        int display_order
        datetime created_at
        datetime updated_at
    }

    indicators_history {
        int id PK
        int indicator_id FK
        int version
        string name
        string description
        boolean is_active
        boolean is_auto_calculable
        boolean is_profiling_only
        json form_schema
        json calculation_schema
        json remark_schema
        datetime archived_at
        int archived_by FK
    }

    audit_logs {
        int id PK
        int user_id FK
        string entity_type "indicator, bbi, deadline_override"
        int entity_id
        string action "create, update, delete, deactivate"
        json changes
        string ip_address
        datetime created_at
    }

    assessment_cycles {
        int id PK
        string name "SGLGB 2025"
        smallint year
        datetime phase1_deadline
        datetime rework_deadline
        datetime phase2_deadline
        datetime calibration_deadline
        boolean is_active UK
        datetime created_at
        datetime updated_at
    }

    deadline_overrides {
        int id PK
        int cycle_id FK
        int barangay_id FK
        int indicator_id FK
        int created_by FK
        datetime original_deadline
        datetime new_deadline
        text reason
        datetime created_at
    }
```

---

## User and Role Management

User authentication, role-based access control, and organizational assignments:

```mermaid
erDiagram
    users ||--o| barangays : "BLGU_USER assigned to"
    users ||--o| governance_areas : "VALIDATOR assigned to"

    users {
        int id PK "Primary key"
        string email UK "Unique email address"
        string name "Full name"
        string phone_number "Contact number"
        enum role "MLGOO_DILG, VALIDATOR, ASSESSOR, BLGU_USER, KATUPARAN_CENTER_USER"
        int validator_area_id FK "For VALIDATOR role only"
        int barangay_id FK "For BLGU_USER role only"
        string hashed_password "bcrypt hashed"
        boolean must_change_password "Force password change on first login"
        boolean is_active "Account activation status"
        boolean is_superuser "Legacy field (unused)"
        datetime created_at
        datetime updated_at
    }

    barangays {
        int id PK
        string name UK "Barangay name (unique)"
    }

    governance_areas {
        int id PK
        string name UK "Area name (unique)"
        string code "FI, DI, SA, SO, BU, EN"
        enum area_type "CORE or ESSENTIAL"
    }
```

**Role-Based Field Requirements:**

| Role | Required Fields | Optional Fields | Purpose |
|------|-----------------|-----------------|---------|
| `MLGOO_DILG` | email, name, password | - | System administrators with full access, final approval authority |
| `VALIDATOR` | email, name, password, **validator_area_id** | - | Area-specific validators (requires governance area assignment) |
| `ASSESSOR` | email, name, password | - | Flexible assessors (can work with any barangay) |
| `BLGU_USER` | email, name, password, **barangay_id** | - | Barangay users (requires barangay assignment) |
| `KATUPARAN_CENTER_USER` | email, name, password | - | External research users with read-only access to aggregated analytics |

**Business Rules:**

1. **VALIDATOR role**: Must have `validator_area_id` set to a valid governance area
2. **BLGU_USER role**: Must have `barangay_id` set to a valid barangay
3. **ASSESSOR role**: No assignments required (can work with any barangay)
4. **MLGOO_DILG role**: No assignments required (system-wide access, final approval authority)
5. **KATUPARAN_CENTER_USER role**: No assignments required (read-only external access)
6. **Email uniqueness**: Each email can only be used once across all roles
7. **Password change**: All new users must change password on first login (`must_change_password = True`)

**Example Queries:**

```sql
-- Get all validators for a specific governance area
SELECT u.* FROM users u
WHERE u.role = 'VALIDATOR'
  AND u.validator_area_id = 3
  AND u.is_active = TRUE;

-- Get all BLGU users for a barangay
SELECT u.* FROM users u
WHERE u.role = 'BLGU_USER'
  AND u.barangay_id = 123
  AND u.is_active = TRUE;

-- Get user with governance area loaded (for validators)
SELECT u.*, ga.name as area_name
FROM users u
JOIN governance_areas ga ON u.validator_area_id = ga.id
WHERE u.id = 42 AND u.role = 'VALIDATOR';
```

---

## Assessment Years

The `assessment_years` table provides unified management of annual SGLGB assessment cycles, combining year configuration with phase deadlines:

```mermaid
erDiagram
    assessment_years ||--o{ assessments : "contains"
    users ||--o{ assessment_years : "activated_by"
    users ||--o{ assessment_years : "deactivated_by"

    assessment_years {
        int id PK
        int year UK "Unique year number e.g. 2025"
        datetime assessment_period_start "Start of assessment window"
        datetime assessment_period_end "End of assessment window"
        datetime phase1_deadline "Initial submission deadline"
        datetime rework_deadline "Rework submission deadline"
        datetime phase2_deadline "Final submission deadline"
        datetime calibration_deadline "Calibration deadline"
        boolean is_active "Only ONE year can be active"
        boolean is_published "Visible to Katuparan Center"
        text description "Optional notes"
        datetime created_at
        datetime updated_at
        datetime activated_at "When year was activated"
        int activated_by_id FK "User who activated"
        datetime deactivated_at "When year was deactivated"
        int deactivated_by_id FK "User who deactivated"
    }

    assessments {
        int id PK
        int assessment_year FK "Links to assessment_years.year"
        int blgu_user_id FK
        enum status
    }
```

**Key Concepts:**

| Concept | Description |
|---------|-------------|
| **Active Year** | The year currently accepting new submissions. Only ONE year can be active at a time. Activating a new year automatically deactivates the previous one. |
| **Published Year** | The year's data is visible to Katuparan Center users for external analytics. Multiple years can be published simultaneously. |
| **Year Lifecycle** | CREATE (inactive) -> ACTIVATE (active) -> PUBLISH (visible) -> DEACTIVATE (historical) |

**Unique Constraints:**

```sql
-- Only one active year at a time (partial unique index)
CREATE UNIQUE INDEX uq_assessment_years_single_active
ON assessment_years (is_active) WHERE is_active = true;

-- Each BLGU can only have one assessment per year
ALTER TABLE assessments ADD CONSTRAINT uq_assessment_blgu_year
    UNIQUE (blgu_user_id, assessment_year);
```

**Role-Based Year Access:**

| Role | Accessible Years |
|------|------------------|
| MLGOO_DILG | All years (published and unpublished) |
| KATUPARAN_CENTER_USER | Published years only |
| BLGU_USER | Years they have assessments for |
| ASSESSOR / VALIDATOR | Active year only |

**Year Placeholder Resolution:**

The `YearPlaceholderResolver` uses the assessment year to resolve dynamic placeholders in indicator definitions:

| Placeholder | Example (Year 2025) |
|-------------|---------------------|
| `{CURRENT_YEAR}` | 2025 |
| `{PREVIOUS_YEAR}` | 2024 |
| `{JAN_OCT_CURRENT_YEAR}` | January to October 2025 |
| `{CY_CURRENT_YEAR}` | CY 2025 |

**Migration from Legacy Tables:**

The `assessment_years` table unifies data from two legacy tables:
- `assessment_year_configs`: Year and period configuration
- `assessment_cycles`: Phase deadline configuration

Both legacy tables are preserved for backward compatibility.

---

## Assessment Workflow

Assessment lifecycle from creation through validation to final classification:

```mermaid
erDiagram
    users ||--o{ assessments : "blgu_user creates"
    users ||--o{ assessments : "assessor requests rework"
    assessments ||--o{ assessment_responses : "contains"
    assessments ||--o{ bbi_results : "produces"
    assessments ||--o{ mov_files : "has evidence"

    assessment_responses ||--o{ movs : "legacy MOV system"
    assessment_responses ||--o{ feedback_comments : "receives feedback"
    users ||--o{ feedback_comments : "assessor writes"

    assessments {
        int id PK
        enum status "DRAFT, SUBMITTED, IN_REVIEW, REWORK, AWAITING_FINAL_VALIDATION, AWAITING_MLGOO_APPROVAL, COMPLETED"
        int rework_count "Max 1 per assessment"
        datetime rework_requested_at
        int rework_requested_by FK "Assessor who requested rework"
        text rework_comments
        json rework_summary "AI-generated rework summary"
        boolean is_calibration_rework "Routes back to Validator"
        int calibration_validator_id FK "Validator who requested calibration"
        datetime calibration_requested_at
        int calibration_count "Deprecated: use calibrated_area_ids"
        json calibrated_area_ids "Track per-area calibration"
        json pending_calibrations "Parallel calibration support"
        int mlgoo_approved_by FK "MLGOO who gave final approval"
        datetime mlgoo_approved_at
        boolean is_mlgoo_recalibration "MLGOO RE-calibration mode"
        int mlgoo_recalibration_count "Max 1 per assessment"
        datetime grace_period_expires_at "Deadline for BLGU compliance"
        boolean is_locked_for_deadline "Auto-locked after deadline"
        enum final_compliance_status "PASSED, FAILED"
        json area_results "Scores by governance area"
        json ai_recommendations "Gemini-generated insights"
        json capdev_insights "CapDev recommendations by language"
        string capdev_insights_status "pending, generating, completed, failed"
        int blgu_user_id FK
        int reviewed_by FK "Assessor who completed review"
        datetime created_at
        datetime updated_at
        datetime submitted_at
        datetime validated_at
    }

    assessment_responses {
        int id PK
        json response_data "Dynamic form data from indicator schema"
        boolean is_completed "All required fields filled"
        boolean requires_rework "Assessor flagged for rework"
        enum validation_status "PASSED, CONSIDERED, FAILED, NOT_APPLICABLE, PENDING"
        text generated_remark "Auto-generated from remark_schema"
        text assessor_remarks "Manual remarks for validators"
        int assessment_id FK
        int indicator_id FK
        datetime created_at
        datetime updated_at
    }

    mov_files {
        int id PK
        int assessment_id FK
        int indicator_id FK
        int uploaded_by FK
        string file_name
        string file_url "Supabase storage URL"
        string file_type "pdf, jpg, png, etc"
        int file_size "Bytes"
        datetime uploaded_at
        datetime deleted_at "Soft delete"
    }

    movs {
        int id PK "LEGACY TABLE"
        string filename
        string original_filename
        int file_size
        string content_type
        string storage_path
        enum status "UPLOADED, VERIFIED, REJECTED"
        int response_id FK
        datetime uploaded_at
    }

    feedback_comments {
        int id PK
        text comment
        string comment_type "general, specific issue, etc"
        boolean is_internal_note "Assessor notes vs public feedback"
        int response_id FK
        int assessor_id FK
        datetime created_at
    }

    bbi_results {
        int id PK
        enum status "FUNCTIONAL, NON_FUNCTIONAL"
        json calculation_details "Audit trail of BBI calculation"
        int assessment_id FK
        int bbi_id FK
        datetime calculation_date
    }
```

**Assessment Status Flow:**

```mermaid
stateDiagram-v2
    [*] --> DRAFT: BLGU creates assessment
    DRAFT --> SUBMITTED: BLGU submits for review
    SUBMITTED --> IN_REVIEW: Assessor starts review
    IN_REVIEW --> REWORK: Assessor requests rework (max 1)
    IN_REVIEW --> AWAITING_FINAL_VALIDATION: Assessor approves
    REWORK --> SUBMITTED: BLGU resubmits after fixes
    AWAITING_FINAL_VALIDATION --> REWORK: Validator requests calibration
    AWAITING_FINAL_VALIDATION --> AWAITING_MLGOO_APPROVAL: Validator finalizes
    AWAITING_MLGOO_APPROVAL --> REWORK: MLGOO requests RE-calibration (max 1)
    AWAITING_MLGOO_APPROVAL --> COMPLETED: MLGOO approves
    COMPLETED --> [*]: Assessment archived

    note right of REWORK
        Rework routes depend on mode:
        - is_calibration_rework=false: Back to Assessor
        - is_calibration_rework=true: Back to same Validator
        - is_mlgoo_recalibration=true: Unlocks specific indicators
    end note

    note right of AWAITING_MLGOO_APPROVAL
        NEW STATE: MLGOO final approval required
        - Reviews all validator decisions
        - Can request RE-calibration (max 1)
        - Final authority on assessment outcome
    end note

    note right of COMPLETED
        Triggers classification:
        - 3+1 SGLGB scoring
        - BBI calculation (3-tier rating)
        - CapDev insights generation
    end note
```

**Calibration Workflow (Validator to BLGU):**

When a Validator requests calibration:
1. Assessment status changes to `REWORK`
2. `is_calibration_rework` is set to `true`
3. `calibration_validator_id` stores the requesting Validator's ID
4. `calibrated_area_ids` tracks which governance areas have been calibrated
5. BLGU makes corrections and resubmits
6. Assessment routes back to the **same Validator** (not Assessor)
7. Each governance area can only be calibrated once (max 1 per area)

**Parallel Calibration:**

Multiple Validators can calibrate different governance areas simultaneously:
- `pending_calibrations` stores: `[{"validator_id": 1, "governance_area_id": 2, "requested_at": "...", "approved": false}, ...]`
- `calibration_summaries_by_area` stores per-area AI summaries

**MLGOO RE-calibration (distinct from Validator calibration):**

When MLGOO determines a Validator was too strict:
1. MLGOO sets `is_mlgoo_recalibration = true`
2. `mlgoo_recalibration_indicator_ids` specifies which indicators to unlock
3. BLGU can update only those specific indicators
4. Maximum of 1 MLGOO RE-calibration per assessment

**Grace Period & Auto-Lock:**

- `grace_period_expires_at`: Deadline for BLGU to comply with rework/calibration
- `is_locked_for_deadline`: When `true`, BLGU cannot edit assessment
- `locked_at`: Timestamp when auto-lock was triggered
- System sends `GRACE_PERIOD_WARNING` notification before expiration
- System sends `DEADLINE_EXPIRED_LOCKED` notification when locked

**Validation Status Options:**

| Status | Description | Use Case |
|--------|-------------|----------|
| `PASSED` | Indicator fully met | All MOVs present and valid |
| `CONSIDERED` | Partial compliance | Some criteria met, grace period applied |
| `FAILED` | Indicator not met | Missing MOVs or invalid evidence |
| `NOT_APPLICABLE` | Indicator doesn't apply | Grace period or exemption |
| `PENDING` | Not yet validated | Awaiting assessor review |

**Business Rules:**

1. **Rework Limit**: `rework_count` cannot exceed 1 (enforced by model validator)
2. **Locked Assessments**: BLGU cannot edit assessments in `SUBMITTED`, `IN_REVIEW`, `AWAITING_FINAL_VALIDATION`, or `COMPLETED` status
3. **MOV Requirements**: Each indicator response must have associated MOV files unless `is_profiling_only = True`
4. **Soft Delete**: MOV files use `deleted_at` timestamp instead of hard deletion
5. **Internal Notes**: Assessor feedback can be marked as `is_internal_note = True` to hide from BLGU users

---

## Governance Areas and Indicators

Dynamic indicator system with hierarchical structure and MOV checklist validation:

```mermaid
erDiagram
    governance_areas ||--o{ indicators : "contains"
    indicators ||--o| indicators : "parent-child hierarchy"
    indicators ||--o{ checklist_items : "has MOV checklist"
    indicators ||--o{ indicators_history : "versioned"
    indicators ||--o{ assessment_responses : "generates responses"

    governance_areas {
        int id PK
        string name UK "Financial Integrity, Disaster Intervention, etc"
        string code "FI, DI, SA, SO, BU, EN"
        enum area_type "CORE, ESSENTIAL"
    }

    indicators {
        int id PK
        string name
        string description
        int version "Current version number"
        boolean is_active "Soft delete flag"
        boolean is_auto_calculable "Auto Pass/Fail determination"
        boolean is_profiling_only "No Pass/Fail scoring"
        json form_schema "Dynamic form fields"
        json calculation_schema "Auto-calculation rules"
        json remark_schema "Template for generated_remark"
        string technical_notes_text "Plain text notes"
        int governance_area_id FK
        int parent_id FK "Self-referencing hierarchy"
        string indicator_code "1.1, 1.1.1, 2.3.4"
        int sort_order "Tree ordering within siblings"
        string selection_mode "single, multiple, none"
        json mov_checklist_items "LEGACY: JSON array of MOV items"
        string validation_rule "ALL_ITEMS_REQUIRED, ANY_ITEM_REQUIRED, CUSTOM"
        boolean is_bbi "Is this a BBI indicator"
        datetime effective_date "Version became active"
        datetime retired_date "Version retired"
        datetime created_at
        datetime updated_at
    }

    checklist_items {
        int id PK
        int indicator_id FK
        string item_id UK "1_1_1_a, 1_1_1_b (unique per indicator)"
        string label "Display text (e.g., a. Barangay Financial Report)"
        string item_type "checkbox, info_text, assessment_field, document_count, calculation_field"
        string group_name "Visual grouping (ANNUAL REPORT, QUARTERLY REPORT)"
        string mov_description "Right column MOV description"
        boolean required "Must be checked for Pass"
        boolean requires_document_count "Validator enters count"
        int display_order "Sort order within indicator"
        datetime created_at
        datetime updated_at
    }

    indicators_history {
        int id PK
        int indicator_id FK
        int version "Archived version number"
        string name "Snapshot at archival time"
        string description
        boolean is_active
        boolean is_auto_calculable
        boolean is_profiling_only
        json form_schema "Frozen schema"
        json calculation_schema
        json remark_schema
        string technical_notes_text
        string indicator_code
        int sort_order
        string selection_mode
        json mov_checklist_items
        int governance_area_id
        int parent_id
        datetime created_at "Original creation"
        datetime updated_at "Original update"
        datetime archived_at "When archived"
        int archived_by FK "User who archived"
    }
```

**Indicator Hierarchy Example:**

```
1. Financial Integrity (Root - Governance Area)
├── 1.1 Financial Reports (Parent Indicator)
│   ├── 1.1.1 Annual Report (Child - Leaf)
│   ├── 1.1.2 Quarterly Reports (Child - Leaf)
│   └── 1.1.3 Audit Report (Child - Leaf)
├── 1.2 Budget Allocation (Parent Indicator)
│   ├── 1.2.1 General Fund (Child - Leaf)
│   └── 1.2.2 Special Fund (Child - Leaf)
```

**MOV Checklist Item Types:**

| Type | Description | Validator Action | Required Field |
|------|-------------|------------------|----------------|
| `checkbox` | Standard MOV requirement | Check if present | `required` |
| `info_text` | Informational note | Read only | N/A |
| `assessment_field` | Dynamic assessment data | View/validate data | Depends on schema |
| `document_count` | Validator counts documents | Enter count | `requires_document_count = True` |
| `calculation_field` | Auto-calculated result | View only | N/A |

**Validation Rules:**

| Rule | Logic | Use Case |
|------|-------|----------|
| `ALL_ITEMS_REQUIRED` | All checklist items must be checked | Strict compliance indicators |
| `ANY_ITEM_REQUIRED` | At least one item must be checked | Alternative evidence allowed |
| `CUSTOM` | Custom validation logic in backend | Complex business rules |

**Versioning Workflow:**

1. **Active Version**: Current `indicators` table record with `version = N`
2. **Modify Indicator**: Create new version (`version = N + 1`)
3. **Archive Old Version**: Copy old record to `indicators_history` table
4. **Update Active**: Update `indicators` with new schema and increment version
5. **Historical Reference**: Existing assessments continue referencing archived version via `indicators_history`

**Example Queries:**

```sql
-- Get all indicators for a governance area with hierarchy
WITH RECURSIVE indicator_tree AS (
  -- Root indicators
  SELECT id, name, indicator_code, parent_id, 0 as depth
  FROM indicators
  WHERE governance_area_id = 1 AND parent_id IS NULL AND is_active = TRUE

  UNION ALL

  -- Child indicators
  SELECT i.id, i.name, i.indicator_code, i.parent_id, depth + 1
  FROM indicators i
  JOIN indicator_tree it ON i.parent_id = it.id
  WHERE i.is_active = TRUE
)
SELECT * FROM indicator_tree
ORDER BY indicator_code;

-- Get MOV checklist for an indicator
SELECT * FROM checklist_items
WHERE indicator_id = 42
ORDER BY display_order;

-- Get indicator version history
SELECT * FROM indicators_history
WHERE indicator_id = 42
ORDER BY version DESC;
```

---

## BBI Functionality System

Barangay-Based Institutions (BBIs) calculation system with mapping rules:

```mermaid
erDiagram
    governance_areas ||--o{ bbis : "defines"
    bbis ||--o{ bbi_results : "calculated for assessments"
    assessments ||--o{ bbi_results : "produces"

    bbis {
        int id PK
        string name "Full BBI name"
        string abbreviation "BAC, BDC, BHC, etc"
        text description
        boolean is_active "Soft delete"
        json mapping_rules "Logic for Functional/Non-Functional determination"
        int governance_area_id FK
        datetime created_at
        datetime updated_at
    }

    bbi_results {
        int id PK
        enum status "HIGHLY_FUNCTIONAL, MODERATELY_FUNCTIONAL, LOW_FUNCTIONAL"
        json calculation_details "Audit trail of rule evaluation"
        int assessment_id FK
        int bbi_id FK
        datetime calculation_date
    }

    governance_areas {
        int id PK
        string name UK
        string code
        enum area_type
    }

    assessments {
        int id PK
        enum status
        int blgu_user_id FK
    }
```

**9 Mandatory BBIs and Governance Area Mapping:**

| BBI | Abbreviation | Governance Area | Mapping Indicators |
|-----|--------------|-----------------|-------------------|
| Barangay Anti-Drug Abuse Council | BADAC | Social Protection & Inclusion | 4.1, 4.2, 4.3 |
| Barangay Council for Protection of Children | BCPC | Social Protection & Inclusion | 4.4, 4.5 |
| Barangay Disaster Risk Reduction Management Committee | BDRRMC | Disaster Intervention | 2.1, 2.2, 2.3 |
| Barangay Health Committee | BHC | Social Protection & Inclusion | 4.6, 4.7 |
| Barangay Nutrition Committee | BNC | Social Protection & Inclusion | 4.8, 4.9 |
| Barangay Peace & Order Committee | BPOC | Social Protection & Inclusion | 4.10, 4.11 |
| Lupong Tagapamayapa | LT | Social Protection & Inclusion | 4.12, 4.13 |
| Sangguniang Kabataan | SK | Community Empowerment | 5.1, 5.2, 5.3 |
| Barangay Housing Committee | BHoC | Environmental | 6.1, 6.2 |

**BBI Mapping Rules Example (JSON):**

```json
{
  "bbi_id": 1,
  "name": "BADAC",
  "rules": {
    "functional_criteria": [
      {
        "indicator_code": "4.1",
        "validation_status": "PASSED",
        "weight": 0.33
      },
      {
        "indicator_code": "4.2",
        "validation_status": "PASSED",
        "weight": 0.33
      },
      {
        "indicator_code": "4.3",
        "validation_status": "PASSED",
        "weight": 0.34
      }
    ],
    "determination_logic": "all_must_pass",
    "threshold": 1.0
  }
}
```

**BBI 3-Tier Rating System (DILG MC 2024-417):**

BBI functionality is now determined by compliance rate using a 3-tier system:

| Status | Compliance Rate | Description |
|--------|-----------------|-------------|
| `HIGHLY_FUNCTIONAL` | 75% - 100% | Full or near-full compliance with all sub-indicators |
| `MODERATELY_FUNCTIONAL` | 50% - 74% | Partial compliance, some improvements needed |
| `LOW_FUNCTIONAL` | Below 50% | Significant gaps in compliance |

**Compliance Rate Calculation:**

```
Compliance Rate = (Passed Sub-Indicators / Total Sub-Indicators) x 100%
```

**Legacy Values (backward compatibility):**
- `FUNCTIONAL` maps to `HIGHLY_FUNCTIONAL`
- `NON_FUNCTIONAL` maps to `LOW_FUNCTIONAL`

**BBI Calculation Logic:**

1. **Fetch Assessment**: Get assessment with all indicator responses
2. **Identify BBI Indicators**: Query indicators where `is_bbi = True` for governance area
3. **Evaluate Mapping Rules**: Check validation status against BBI mapping rules
4. **Calculate Compliance Rate**: Count passed sub-indicators vs. total
5. **Determine 3-Tier Status**:
   - >= 75%: `HIGHLY_FUNCTIONAL`
   - 50-74%: `MODERATELY_FUNCTIONAL`
   - < 50%: `LOW_FUNCTIONAL`
6. **Store Result**: Insert `bbi_results` record with calculation details for audit

**Example Queries:**

```sql
-- Get all BBIs for a governance area
SELECT * FROM bbis
WHERE governance_area_id = 4
  AND is_active = TRUE;

-- Get BBI results for an assessment
SELECT br.*, b.name as bbi_name, b.abbreviation
FROM bbi_results br
JOIN bbis b ON br.bbi_id = b.id
WHERE br.assessment_id = 123
ORDER BY b.abbreviation;

-- Calculate BBI functionality (example simplified logic)
SELECT
  b.id,
  b.abbreviation,
  CASE
    WHEN COUNT(*) FILTER (WHERE ar.validation_status = 'PASSED') =
         COUNT(*) FILTER (WHERE i.is_bbi = TRUE)
    THEN 'FUNCTIONAL'
    ELSE 'NON_FUNCTIONAL'
  END as calculated_status
FROM bbis b
JOIN governance_areas ga ON b.governance_area_id = ga.id
JOIN indicators i ON i.governance_area_id = ga.id AND i.is_bbi = TRUE
JOIN assessment_responses ar ON ar.indicator_id = i.id
WHERE ar.assessment_id = 123
GROUP BY b.id, b.abbreviation;
```

---

## Administrative Features

Administrative tables for audit logs, assessment cycles, and deadline management:

```mermaid
erDiagram
    users ||--o{ audit_logs : "performs actions"
    users ||--o{ deadline_overrides : "creates"

    assessment_cycles ||--o{ deadline_overrides : "has overrides"
    barangays ||--o{ deadline_overrides : "receives extension"
    indicators ||--o{ deadline_overrides : "can be extended"

    audit_logs {
        int id PK
        int user_id FK "MLGOO_DILG who performed action"
        string entity_type "indicator, bbi, deadline_override"
        int entity_id "FK to entity (nullable for bulk ops)"
        string action "create, update, delete, deactivate"
        json changes "Before/after diff"
        string ip_address "IPv4 or IPv6"
        datetime created_at
    }

    assessment_cycles {
        int id PK
        string name "SGLGB 2025"
        smallint year
        datetime phase1_deadline "Initial submission deadline"
        datetime rework_deadline "Rework submission deadline"
        datetime phase2_deadline "Final submission deadline"
        datetime calibration_deadline "Calibration/validation deadline"
        boolean is_active UK "Only one active cycle at a time"
        datetime created_at
        datetime updated_at
    }

    deadline_overrides {
        int id PK
        int cycle_id FK
        int barangay_id FK
        int indicator_id FK
        int created_by FK "MLGOO_DILG user"
        datetime original_deadline "From assessment_cycles"
        datetime new_deadline "Extended deadline"
        text reason "Justification for extension"
        datetime created_at
    }

    users {
        int id PK
        enum role
    }

    barangays {
        int id PK
        string name
    }

    indicators {
        int id PK
        string name
    }
```

**Audit Log Change Tracking:**

```json
{
  "entity_type": "indicator",
  "entity_id": 42,
  "action": "update",
  "changes": {
    "is_active": {
      "before": true,
      "after": false
    },
    "form_schema": {
      "before": { "fields": [...] },
      "after": { "fields": [...] }
    }
  },
  "user_id": 1,
  "ip_address": "192.168.1.100",
  "created_at": "2025-11-19T10:30:00Z"
}
```

**Assessment Cycle Constraints:**

1. **Unique Active Cycle**: Only one cycle can have `is_active = TRUE` at a time (enforced by partial unique index)
2. **Deadline Ordering**: `phase1_deadline < rework_deadline < phase2_deadline < calibration_deadline`
3. **Year Validation**: Year must match current or next year
4. **Timezone**: All deadlines stored in UTC

**Deadline Override Rules:**

1. **Authorization**: Only MLGOO_DILG users can create overrides
2. **Reason Required**: Text justification mandatory for audit trail
3. **Specificity**: Overrides are specific to (cycle, barangay, indicator) tuple
4. **Extension Only**: `new_deadline` must be after `original_deadline`
5. **Audit Trail**: All overrides logged in `audit_logs` table

**Example Queries:**

```sql
-- Get active assessment cycle
SELECT * FROM assessment_cycles
WHERE is_active = TRUE;

-- Get deadline for specific barangay and indicator
SELECT COALESCE(do.new_deadline, ac.phase1_deadline) as effective_deadline
FROM assessment_cycles ac
LEFT JOIN deadline_overrides do
  ON do.cycle_id = ac.id
  AND do.barangay_id = 123
  AND do.indicator_id = 42
WHERE ac.is_active = TRUE;

-- Audit log for indicator changes
SELECT
  al.*,
  u.name as user_name,
  u.email as user_email
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.entity_type = 'indicator'
  AND al.entity_id = 42
ORDER BY al.created_at DESC;
```

---

## Indexes and Performance

Critical indexes for query performance optimization:

**User Table Indexes:**

```sql
CREATE INDEX idx_users_email ON users(email); -- Unique constraint covers this
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_barangay_id ON users(barangay_id) WHERE barangay_id IS NOT NULL;
CREATE INDEX idx_users_validator_area_id ON users(validator_area_id) WHERE validator_area_id IS NOT NULL;
CREATE INDEX idx_users_is_active ON users(is_active);
```

**Assessment Table Indexes:**

```sql
CREATE INDEX idx_assessments_blgu_user_id ON assessments(blgu_user_id);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_submitted_at ON assessments(submitted_at) WHERE submitted_at IS NOT NULL;
CREATE INDEX idx_assessments_rework_count ON assessments(rework_count) WHERE rework_count > 0;
```

**Assessment Response Indexes:**

```sql
CREATE INDEX idx_assessment_responses_assessment_id ON assessment_responses(assessment_id);
CREATE INDEX idx_assessment_responses_indicator_id ON assessment_responses(indicator_id);
CREATE INDEX idx_assessment_responses_validation_status ON assessment_responses(validation_status);
CREATE INDEX idx_assessment_responses_requires_rework ON assessment_responses(requires_rework) WHERE requires_rework = TRUE;
```

**Indicator Table Indexes:**

```sql
CREATE INDEX idx_indicators_governance_area_id ON indicators(governance_area_id);
CREATE INDEX idx_indicators_parent_id ON indicators(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_indicators_indicator_code ON indicators(indicator_code);
CREATE INDEX idx_indicators_is_active ON indicators(is_active);
CREATE INDEX idx_indicators_is_bbi ON indicators(is_bbi) WHERE is_bbi = TRUE;
```

**MOV Files Indexes:**

```sql
CREATE INDEX idx_mov_files_assessment_id ON mov_files(assessment_id);
CREATE INDEX idx_mov_files_indicator_id ON mov_files(indicator_id);
CREATE INDEX idx_mov_files_uploaded_by ON mov_files(uploaded_by);
CREATE INDEX idx_mov_files_deleted_at ON mov_files(deleted_at) WHERE deleted_at IS NULL; -- Soft delete support
```

**Audit Logs Indexes:**

```sql
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_lookup ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at_desc ON audit_logs(created_at DESC);
```

**Deadline Overrides Composite Indexes:**

```sql
CREATE INDEX idx_deadline_overrides_barangay_indicator ON deadline_overrides(barangay_id, indicator_id);
CREATE INDEX idx_deadline_overrides_cycle_barangay ON deadline_overrides(cycle_id, barangay_id);
CREATE INDEX idx_deadline_overrides_created_at_desc ON deadline_overrides(created_at DESC);
```

**Query Performance Considerations:**

1. **Filtered Indexes**: Use `WHERE` clauses on indexes to reduce size (e.g., `WHERE is_active = TRUE`)
2. **Partial Unique Indexes**: Assessment cycles use partial unique index on `is_active = TRUE`
3. **Composite Indexes**: Multi-column indexes for common JOIN queries
4. **Covering Indexes**: Include frequently queried columns in index (future optimization)
5. **JSONB Indexes**: Consider GIN indexes on `form_schema`, `mapping_rules` for JSON queries (future enhancement)

---

## Database Statistics

Current schema metrics (as of December 2025):

| Category | Count | Notes |
|----------|-------|-------|
| **Core Tables** | 18 | Main application tables (including mov_annotations) |
| **Total Columns** | ~250+ | Across all tables |
| **Foreign Keys** | 30+ | Enforcing referential integrity |
| **Unique Constraints** | 15+ | Ensuring data uniqueness |
| **Check Constraints** | 5+ | Business rule enforcement |
| **Indexes** | 45+ | Performance optimization |
| **Enums** | 8 | AssessmentStatus, ValidationStatus, UserRole, BBIStatus, NotificationType, etc |

---

## Migration Strategy

Database migrations managed with Alembic:

```bash
# Create a new migration after model changes
cd apps/api
alembic revision --autogenerate -m "add deadline_overrides table"

# Review generated migration in alembic/versions/
# Edit if needed (auto-detection isn't perfect)

# Apply migration
alembic upgrade head

# Rollback if needed
alembic downgrade -1
```

**Migration Best Practices:**

1. **Always Review**: Auto-generated migrations may miss edge cases
2. **Test Locally**: Run migrations on dev database first
3. **Data Migrations**: Separate data migrations from schema migrations
4. **Reversibility**: Ensure `downgrade()` function works correctly
5. **Incremental Changes**: Small, atomic migrations are easier to debug

---

## MOV Annotations

The `mov_annotations` table supports interactive annotation of MOV files (PDFs and images) by assessors:

```mermaid
erDiagram
    mov_files ||--o{ mov_annotations : "has"
    users ||--o{ mov_annotations : "creates"

    mov_annotations {
        int id PK
        int mov_file_id FK "Target MOV file"
        int assessor_id FK "Assessor who created"
        string annotation_type "pdfRect or imageRect"
        int page "Page number (0-indexed for PDFs)"
        json rect "Primary rectangle coords (percentages)"
        json rects "Multi-line rectangles for text selections"
        text comment "Annotation comment text"
        datetime created_at
        datetime updated_at
    }
```

**Annotation Types:**

| Type | Description | Use Case |
|------|-------------|----------|
| `pdfRect` | Rectangle annotation on PDF page | Highlight text or mark areas on PDF MOVs |
| `imageRect` | Rectangle annotation on image | Mark areas on image MOVs (JPG, PNG) |

**Rectangle Format (stored as percentages for responsive rendering):**

```json
{
  "x": 10.5,   // Left position as % of document width
  "y": 25.0,  // Top position as % of document height
  "w": 30.0,  // Width as % of document width
  "h": 5.0    // Height as % of document height
}
```

---

## CapDev Insights

AI-generated Capacity Development (CapDev) insights are stored in the `capdev_insights` JSON field:

```json
{
  "ceb": {
    "summary": "Kinatibuk-ang pagsusi...",
    "recommendations": ["Recommendation 1", "..."],
    "capacity_development_needs": ["Training need 1", "..."],
    "suggested_interventions": ["Intervention 1", "..."],
    "priority_actions": ["Action 1", "..."],
    "generated_at": "2025-12-01T10:30:00Z"
  },
  "en": {
    "summary": "Overall assessment...",
    "recommendations": ["Recommendation 1", "..."],
    "capacity_development_needs": ["Training need 1", "..."],
    "suggested_interventions": ["Intervention 1", "..."],
    "priority_actions": ["Action 1", "..."],
    "generated_at": "2025-12-01T10:30:00Z"
  }
}
```

**CapDev Insights Status:**

| Status | Description |
|--------|-------------|
| `pending` | Insights generation queued |
| `generating` | AI is currently generating insights |
| `completed` | Insights generated successfully |
| `failed` | Generation failed (can be retried) |

---

## Notification Types

The system supports the following notification types for workflow events:

| Type | Trigger | Recipients |
|------|---------|------------|
| `NEW_SUBMISSION` | BLGU submits assessment | All Assessors |
| `REWORK_REQUESTED` | Assessor requests rework | BLGU |
| `REWORK_RESUBMITTED` | BLGU resubmits after rework | All Assessors |
| `READY_FOR_VALIDATION` | Assessor finalizes | Validator(s) |
| `CALIBRATION_REQUESTED` | Validator requests calibration | BLGU |
| `CALIBRATION_RESUBMITTED` | BLGU resubmits calibration | Same Validator |
| `VALIDATION_COMPLETED` | Validator completes validation | MLGOO and BLGU |
| `READY_FOR_MLGOO_APPROVAL` | All validators done | MLGOO |
| `MLGOO_RECALIBRATION_REQUESTED` | MLGOO requests RE-calibration | BLGU |
| `ASSESSMENT_APPROVED` | MLGOO approves assessment | BLGU |
| `DEADLINE_EXPIRED_LOCKED` | Grace period expired | BLGU (locked), MLGOO |
| `GRACE_PERIOD_WARNING` | Grace period expiring soon | BLGU |

---

## Notes

- All diagrams reflect the actual SINAG database schema as of December 2025
- Schema supports multi-tenancy through `barangay_id` and `validator_area_id` isolation
- Five user roles: MLGOO_DILG, VALIDATOR, ASSESSOR, BLGU_USER, KATUPARAN_CENTER_USER
- JSONB fields (`form_schema`, `mapping_rules`, `capdev_insights`) enable dynamic, schema-less data storage
- Soft deletes used for `indicators` (`is_active`), `mov_files` (`deleted_at`), and `bbis` (`is_active`)
- Audit trail maintained via `audit_logs` table for all administrative actions
- Performance optimized with strategic indexes on high-cardinality columns and common JOIN paths
- Versioning system for indicators ensures historical assessment data integrity
- BBI functionality uses 3-tier rating system per DILG MC 2024-417
- Calibration workflow supports both Validator calibration and MLGOO RE-calibration

*Last updated: December 2025*
