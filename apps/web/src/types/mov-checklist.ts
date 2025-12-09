/**
 * 📋 MOV Checklist TypeScript Types
 *
 * TypeScript equivalents of Pydantic schemas from apps/api/app/schemas/mov_checklist.py
 * These types define the structure for MOV (Means of Verification) checklists
 * aligned with Indicator Builder Specification v1.4.
 *
 * MOV Item Types (9 Types):
 * 1. checkbox - Simple yes/no verification
 * 2. group - Logical grouping with OR logic support
 * 3. currency_input - PHP monetary values with threshold validation
 * 4. number_input - Numeric values with min/max/threshold
 * 5. text_input - Free text fields
 * 6. date_input - Date fields with grace period handling
 * 7. assessment - YES/NO radio for validator judgment
 * 8. radio_group - Single selection from options
 * 9. dropdown - Dropdown selection
 */

// =============================================================================
// Common Base Types
// =============================================================================

/**
 * Conditional display logic for MOV items.
 *
 * Example: Show item only if another field equals specific value.
 * {
 *   "field_id": "has_budget",
 *   "operator": "equals",
 *   "value": true
 * }
 */
export interface DisplayCondition {
  /** ID of field to check */
  field_id: string;
  /** Comparison operator */
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than";
  /** Value to compare against */
  value: any;
}

/**
 * Option for radio groups and dropdowns.
 */
export interface OptionItem {
  /** Display label for option */
  label: string;
  /** Value submitted when option selected */
  value: string;
}

/**
 * Base interface for all MOV item types with common fields.
 */
export interface MOVItemBase {
  /** Unique identifier for this MOV item */
  id: string;
  /** MOV item type discriminator */
  type: string;
  /** Label displayed to validator */
  label: string;
  /** Whether this item must be completed */
  required: boolean;
  /** Help text for validators */
  help_text?: string;
  /** Conditional display logic */
  display_condition?: DisplayCondition;
}

// =============================================================================
// MOV Item Type Interfaces (9 Types)
// =============================================================================

/**
 * Simple checkbox for yes/no verification.
 *
 * Example: "BFR signed and stamped by C/M Accountant"
 */
export interface MOVCheckboxItem extends MOVItemBase {
  type: "checkbox";
  /** Default checked state */
  default_value: boolean;
}

/**
 * Logical grouping with OR logic support.
 *
 * Used to group related items where only some need to pass (OR logic).
 * Example: "Posted financial documents (any 5 of 7)"
 */
export interface MOVGroupItem extends MOVItemBase {
  type: "group";
  /** How to combine child validations */
  logic_operator: "AND" | "OR";
  /** Minimum items required to pass (for OR logic) */
  min_required?: number;
  /** Child MOV items in this group */
  children: MOVItem[];
}

/**
 * Currency input with threshold validation for "Considered" status.
 *
 * Example: "Annual budget amount (threshold: ₱500,000 for 'Passed')"
 * Validation Logic:
 * - value >= threshold → "Passed"
 * - min_value <= value < threshold → "Considered"
 * - value < min_value → "Failed"
 */
export interface MOVCurrencyInputItem extends MOVItemBase {
  type: "currency_input";
  /** Minimum acceptable value */
  min_value?: number;
  /** Maximum acceptable value */
  max_value?: number;
  /** Threshold for 'Passed' vs 'Considered' status */
  threshold?: number;
  /** Currency code (PHP only for now) */
  currency_code: "PHP";
}

/**
 * Numeric input with threshold validation and optional unit.
 *
 * Example: "Trees planted this year (threshold: 100)"
 */
export interface MOVNumberInputItem extends MOVItemBase {
  type: "number_input";
  /** Minimum acceptable value */
  min_value?: number;
  /** Maximum acceptable value */
  max_value?: number;
  /** Threshold for 'Passed' vs 'Considered' status */
  threshold?: number;
  /** Unit label (e.g., 'trees', 'kg') */
  unit?: string;
}

/**
 * Free text input with optional validation pattern.
 *
 * Example: "Barangay Resolution Number"
 */
export interface MOVTextInputItem extends MOVItemBase {
  type: "text_input";
  /** Placeholder text */
  placeholder?: string;
  /** Maximum character count */
  max_length?: number;
  /** Regex pattern for validation (e.g., for resolution numbers) */
  validation_pattern?: string;
}

/**
 * Date input with grace period handling.
 *
 * Example: "Appropriation Ordinance approval date (grace period: 90 days)"
 * Validation Logic:
 * - date on or before deadline → "Passed"
 * - date within grace period → "Considered"
 * - date after grace period → "Failed"
 */
export interface MOVDateInputItem extends MOVItemBase {
  type: "date_input";
  /** Earliest acceptable date */
  min_date?: string; // ISO date string YYYY-MM-DD
  /** Latest acceptable date (deadline) */
  max_date?: string; // ISO date string YYYY-MM-DD
  /** Grace period in days after deadline */
  grace_period_days?: number;
  /** Whether to use 'Considered' status for grace period */
  considered_status_enabled: boolean;
}

/**
 * YES/NO radio for validator judgment.
 *
 * Semantically different from RadioGroupItem - used for validator's assessment
 * of compliance rather than data collection.
 *
 * Example: "BDRRMC is organized and functional (Assessor judgment)"
 */
export interface MOVAssessmentItem extends MOVItemBase {
  type: "assessment";
  /** Type of assessment judgment */
  assessment_type: "YES_NO" | "COMPLIANT_NON_COMPLIANT";
}

/**
 * Single selection radio button group.
 *
 * Example: "Type of business permit: [New, Renewal, Amendment]"
 */
export interface MOVRadioGroupItem extends MOVItemBase {
  type: "radio_group";
  /** Radio button options */
  options: OptionItem[];
  /** Default selected option value */
  default_value?: string;
}

/**
 * Dropdown selection with optional multi-select and search.
 *
 * Example: "Select required documents: [Dropdown with 20+ options, searchable]"
 */
export interface MOVDropdownItem extends MOVItemBase {
  type: "dropdown";
  /** Dropdown options */
  options: OptionItem[];
  /** Allow selecting multiple options */
  allow_multiple: boolean;
  /** Enable search functionality for large option lists */
  searchable: boolean;
}

// =============================================================================
// Discriminated Union and Config
// =============================================================================

/**
 * Discriminated union of all MOV item types.
 */
export type MOVItem =
  | MOVCheckboxItem
  | MOVGroupItem
  | MOVCurrencyInputItem
  | MOVNumberInputItem
  | MOVTextInputItem
  | MOVDateInputItem
  | MOVAssessmentItem
  | MOVRadioGroupItem
  | MOVDropdownItem;

/**
 * Complete MOV checklist configuration for an indicator.
 *
 * Stored in Indicator.mov_checklist_items JSONB field.
 */
export interface MOVChecklistConfig {
  /** List of MOV items */
  items: MOVItem[];
  /** Validation mode: 'strict' requires all items, 'lenient' allows partial completion */
  validation_mode: "strict" | "lenient";
}

// =============================================================================
// Validation Status Types
// =============================================================================

/**
 * Validation status type.
 */
export type ValidationStatusType =
  | "Passed"
  | "Considered"
  | "Failed"
  | "Not Applicable"
  | "Pending";

/**
 * Result of MOV checklist validation.
 */
export interface MOVValidationStatus {
  /** Overall validation status */
  status: ValidationStatusType;
  /** Validation status for each item by ID */
  item_results: Record<string, string>;
  /** List of validation error messages */
  errors: string[];
  /** List of validation warning messages */
  warnings: string[];
}

// =============================================================================
// Type Guards (for discriminated union)
// =============================================================================

export function isMOVCheckboxItem(item: MOVItem): item is MOVCheckboxItem {
  return item.type === "checkbox";
}

export function isMOVGroupItem(item: MOVItem): item is MOVGroupItem {
  return item.type === "group";
}

export function isMOVCurrencyInputItem(item: MOVItem): item is MOVCurrencyInputItem {
  return item.type === "currency_input";
}

export function isMOVNumberInputItem(item: MOVItem): item is MOVNumberInputItem {
  return item.type === "number_input";
}

export function isMOVTextInputItem(item: MOVItem): item is MOVTextInputItem {
  return item.type === "text_input";
}

export function isMOVDateInputItem(item: MOVItem): item is MOVDateInputItem {
  return item.type === "date_input";
}

export function isMOVAssessmentItem(item: MOVItem): item is MOVAssessmentItem {
  return item.type === "assessment";
}

export function isMOVRadioGroupItem(item: MOVItem): item is MOVRadioGroupItem {
  return item.type === "radio_group";
}

export function isMOVDropdownItem(item: MOVItem): item is MOVDropdownItem {
  return item.type === "dropdown";
}
