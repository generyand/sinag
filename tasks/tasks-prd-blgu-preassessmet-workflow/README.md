### **Refined Comprehensive Approach: Metadata-Driven Indicator Management & Evaluation**

**(Updated based on November 4, 2025 Consultation & Latest Clarifications)**

The core strategy remains a **metadata-driven architecture**, providing the necessary flexibility for SINAG. We will enhance this by explicitly distinguishing between **system-automated** and **human-judged** indicators, and ensuring that human oversight always has the final say where appropriate.

#### **Phase 1: Defining Indicators (MLGOO-DILG Administration - Epic 6)**

The MLGOO-DILG's administrative interface for indicator creation and editing will be enhanced to capture these distinctions.

1.  **Indicator Management UI (`MLGOO-DILG Admin Interface`):**
    - **Goal:** Allow MLGOO-DILG to define all aspects of an SGLGB indicator, including its automation potential, without developer intervention.
    - **Fields to Capture for each Indicator (Additions Highlighted):**
      - `id`, `name`, `description`, `governance_area_id`, `parent_id`, `is_active`, `is_profiling_only`, `technical_notes_text` (No change).
      - **NEW: `is_auto_calculable` (Boolean):** A flag indicating whether the system can automatically derive a preliminary `validation_status` for this indicator using `calculation_schema`.
        - _Justification:_ This directly addresses your point that "not all indicators will be automatically indicated pass or fail by the system." This flag will control the behavior.
      - **`form_schema` (JSONB):** (No change in its core purpose). This still defines the BLGU's input UI and MOV requirements.
      - **`calculation_schema` (JSONB):** This blueprint defines the **rules for system-automated `validation_status`**.
        - **Crucial Update:** This schema will **only be required and defined if `is_auto_calculable` is `TRUE`**.
        - **Rule Types:** Define logic like `AND_ALL`, `OR_ANY`, `PERCENTAGE_THRESHOLD`, `COUNT_THRESHOLD`, `MATCH_VALUE`, `BBI_FUNCTIONALITY_CHECK`.
        - **Data References:** Rules will reference specific `field_ids` within the `response_data`.
        - **Output:** Define the resulting `Pass` or `Fail` status.
        - **`Conditional` Availability:** A flag within `calculation_schema` will still indicate if "Conditional" is an allowable manual override for this specific indicator.
      - **`remark_schema` (JSONB):** (No change in its core purpose). This defines the rules for generating human-readable remarks.

#### **Phase 2: BLGU Submission (Table Assessment - Phase 1)**

1.  **Dynamic Form Rendering (Frontend):** (No change). The UI renders based on `form_schema`.
2.  **Data Capture & MOV Submission:** (No change). `response_data` is stored, MOVs are uploaded.

#### **Phase 3: Automated Calculation & Status Determination (Backend - Epic 4)**

1.  **The "Rule Engine" (`intelligence_service.py`):**
    - The `evaluate_indicator_status(indicator_id, assessment_response_data)` function will be refined:
      - Before attempting any calculation, it will first check the indicator's `is_auto_calculable` flag.
      - **If `is_auto_calculable` is `TRUE`:** The function will proceed to execute the rules defined in the `calculation_schema` against the `response_data` to determine an **automatic `Pass` or `Fail` status.** This will be the _initial, system-generated `validation_status`_.
      - **If `is_auto_calculable` is `FALSE`:** The system will **NOT** attempt to set an automatic `validation_status`. Instead, it will leave the `validation_status` as `NULL` or a designated "Pending Human Review" state.
    - This automated `validation_status` (or pending status), along with MOV presence, will then feed into `_recalculate_response_completeness` to update `is_completed`.

#### **Phase 4: Assessor/Validator Review (Table Assessment & Table Validation - Phase 1 & 2)**

This is where human override is explicitly handled.

1.  **Pre-populated Status (Frontend):**
    - The Assessor's/Validator's UI will display the `validation_status` for each indicator:
      - **If `is_auto_calculable` is `TRUE`:** The system's automatically generated `Pass` or `Fail` will be displayed as the **pre-selected choice** in the radio buttons.
      - **If `is_auto_calculable` is `FALSE`:** The radio buttons will default to **no selection** (or a "Pending" visual state), explicitly prompting the human Assessor/Validator for their judgment.
2.  **Human Override & Finality (Frontend & Backend):**
    - The Assessor/Validator will then visually compare the BLGU's submission, MOVs, and the `technical_notes_text`.
    - They will then **confirm, adjust, or override** the system's `validation_status` (if `is_auto_calculable` is `TRUE`) or make their initial selection (if `is_auto_calculable` is `FALSE`) to `Pass`, `Fail`, or `Conditional`.
    - **Mutability:** The backend (`POST /api/v1/assessment-responses/{id}/validate`) will **always accept the human Assessor's/Validator's choice** as the authoritative `validation_status`, regardless of the `is_auto_calculable` flag or the system's previous suggestion. This ensures human override is fully supported.
    - The option to select `Conditional` will only be visible and enabled if the `calculation_schema` (or a specific flag on the indicator) explicitly allows it.
    - This human input remains the authoritative `validation_status` that drives `Rework`, `Calibration`, and `Finalize Validation`.

#### **Addressing Flexibility Concerns (Reconfirmed):**

- **System Adaptability:** This approach ensures SINAG is highly adaptable. The MLGOO-DILG, through the administrative UI (Epic 6), will control _which_ indicators are automated and _how_ they are automated, as well as those requiring direct human judgment.
- **Human Oversight:** The design explicitly ensures that human Assessors and Validators always have the final say, even when the system provides automated suggestions, making the system a powerful assistant, not a rigid replacement.

This refined approach ensures maximum flexibility, accuracy, and maintainability, allowing SINAG to truly handle the diverse nature of SGLGB indicators while maintaining human control.

---

### **Integration of Dynamic Indicator-Level Remarks**

**1. Where it fits in the Roadmap:**

This feature directly impacts **Epic 4: The Core Intelligence Layer** (for calculation) and **Epic 5: High-Level Analytics & Reporting** (for display). It also implicitly touches **Epic 6: Administrative Features** for defining _how_ these remarks are generated.

---

**2. Detailed Plan by Epic:**

#### **Epic 4: The Core Intelligence Layer (In Progress)**

This epic will be responsible for _generating_ these remarks.

- **New Requirement: `remark_schema` for Indicators:**
  - **Enhancement:** Within the `indicators` table, alongside `form_schema` and `calculation_schema` (or nested within `calculation_schema`), we need to add a **`remark_schema` (JSONB)** field. This schema will define the rules for generating a human-readable remark based on the calculated `validation_status` of the indicator and its children.
  - **Example `remark_schema` for Indicator 1.1 (Parent Indicator):**
    ```json
    {
      "type": "PARENT_AGGREGATE",
      "conditions": [
        {
          "evaluate": "all_children_pass",
          "output_template": "All requirements met for {indicator_name}."
        },
        {
          "evaluate": "has_associated_bbi",
          "then_evaluate_bbi_status": "BDRRMC", // Name of the BBI
          "output_template_functional": "{bbi_name} Functional.",
          "output_template_non_functional": "{bbi_name} Non-functional."
        },
        {
          "evaluate": "any_child_fail",
          "output_template": "Some requirements failed for {indicator_name}."
        }
      ],
      "default_output": "Status pending."
    }
    ```
- **Enhancement: Rule Engine Extension:**
  - The backend's `intelligence_service.py` (or `assessment_service.py`) will extend its `evaluate_indicator_status` function (or a new `generate_indicator_remark` function).
  - This function will now:
    1.  Evaluate the `calculation_schema` to get the `Pass`/`Fail`/`Conditional` status for the indicator (and its children, if it's a parent).
    2.  Read the `remark_schema` for the indicator.
    3.  Apply the `remark_schema`'s logic to the calculated statuses and associated BBI data (if any) to **generate the specific remark string**.
    4.  This generated remark string will be stored, likely as a new field `generated_remark` (VARCHAR) on the `assessment_responses` table (for the parent indicator) or a dedicated `indicator_remarks` table. This allows historical tracking.

#### **Epic 5: High-Level Analytics & Reporting (Not Started)**

This epic will be responsible for _displaying_ these remarks.

- **New Feature: Indicator-Level Remarks Display:**
  - The detailed assessment report page for the MLGOO-DILG (similar to the GAR sample) will be updated.
  - Next to each Level 1 (parent) indicator's status, the **`generated_remark` string** will be displayed prominently. This will provide the concise summary you've described ("All requirements," "[BBI name] Functional," etc.).
  - The MLGOO-DILG Dashboard might also display these remarks for quick scanning.

#### **Epic 6: Administrative Features (MLGOO-DILG) (Not Started)**

This epic will provide the UI for the MLGOO-DILG to _configure_ these remarks.

- **New Feature: `Remark Schema` Builder in Indicator Management:**
  - The Indicator Management CRUD interface will be extended with a specialized UI for defining the `remark_schema` for each indicator.
  - This "remark builder" will allow the MLGOO-DILG to configure the conditions and corresponding text templates (e.g., dropdowns for BBI names, text input for "output_template") without writing code. This ensures flexibility and MLGOO independence.
