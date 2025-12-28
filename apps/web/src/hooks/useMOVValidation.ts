import { useMemo } from "react";
import {
  MOVChecklistConfig,
  MOVItem,
  MOVGroupItem,
  MOVCurrencyInputItem,
  MOVNumberInputItem,
  MOVDateInputItem,
  MOVRadioGroupItem,
  MOVDropdownItem,
  isMOVGroupItem,
  isMOVCurrencyInputItem,
  isMOVNumberInputItem,
  isMOVDateInputItem,
  isMOVRadioGroupItem,
  isMOVDropdownItem,
} from "@/types/mov-checklist";

/**
 * MOV Validation Hook
 *
 * Provides real-time validation for MOV checklist configuration in the builder.
 * This validates the checklist structure itself, not submission data (that's done by backend).
 *
 * Validation Rules:
 * - All items must have labels
 * - Group items must have at least 1 child
 * - OR groups must have min_required set
 * - Currency/number inputs: min_value <= max_value (if both set)
 * - Date inputs with considered_status_enabled must have grace_period_days > 0
 * - Radio groups and dropdowns must have at least minimum required options
 * - Option values must be unique
 *
 * Returns:
 * - isValid: Boolean indicating if checklist is valid
 * - errors: Array of validation errors with field paths
 * - warnings: Array of warnings (non-blocking issues)
 */

export interface ValidationError {
  /** Item ID where error occurred */
  itemId: string;
  /** Field path within item (e.g., "label", "min_value", "options") */
  field: string;
  /** Error message */
  message: string;
  /** Severity level */
  severity: "error" | "warning";
}

export interface MOVValidationResult {
  /** True if all validation passes */
  isValid: boolean;
  /** Array of validation errors */
  errors: ValidationError[];
  /** Array of warnings (non-blocking) */
  warnings: ValidationError[];
  /** Errors grouped by item ID for easy lookup */
  errorsByItem: Map<string, ValidationError[]>;
}

/**
 * Validate a single MOV item
 */
function validateMOVItem(item: MOVItem): ValidationError[] {
  const errors: ValidationError[] = [];

  // Rule: All items must have labels
  if (!item.label || item.label.trim().length === 0) {
    errors.push({
      itemId: item.id,
      field: "label",
      message: "Label is required",
      severity: "error",
    });
  }

  // Type-specific validation
  if (isMOVGroupItem(item)) {
    errors.push(...validateGroupItem(item));
  } else if (isMOVCurrencyInputItem(item)) {
    errors.push(...validateCurrencyInputItem(item));
  } else if (isMOVNumberInputItem(item)) {
    errors.push(...validateNumberInputItem(item));
  } else if (isMOVDateInputItem(item)) {
    errors.push(...validateDateInputItem(item));
  } else if (isMOVRadioGroupItem(item)) {
    errors.push(...validateRadioGroupItem(item));
  } else if (isMOVDropdownItem(item)) {
    errors.push(...validateDropdownItem(item));
  }

  return errors;
}

/**
 * Validate group item
 */
function validateGroupItem(item: MOVGroupItem): ValidationError[] {
  const errors: ValidationError[] = [];

  // Rule: Group items must have at least 1 child
  if (!item.children || item.children.length === 0) {
    errors.push({
      itemId: item.id,
      field: "children",
      message: "Group must have at least 1 child item",
      severity: "error",
    });
  }

  // Rule: OR groups must have min_required set
  if (item.logic_operator === "OR") {
    if (item.min_required === undefined || item.min_required === null) {
      errors.push({
        itemId: item.id,
        field: "min_required",
        message: "OR groups must have min_required set",
        severity: "error",
      });
    } else if (item.min_required < 1) {
      errors.push({
        itemId: item.id,
        field: "min_required",
        message: "min_required must be at least 1",
        severity: "error",
      });
    } else if (item.children && item.min_required > item.children.length) {
      errors.push({
        itemId: item.id,
        field: "min_required",
        message: `min_required (${item.min_required}) cannot exceed number of children (${item.children.length})`,
        severity: "error",
      });
    }
  }

  // Rule: AND groups should not have min_required set
  if (
    item.logic_operator === "AND" &&
    item.min_required !== undefined &&
    item.min_required !== null
  ) {
    errors.push({
      itemId: item.id,
      field: "min_required",
      message: "AND groups should not have min_required set",
      severity: "warning",
    });
  }

  // Recursively validate children
  if (item.children && item.children.length > 0) {
    item.children.forEach((child) => {
      errors.push(...validateMOVItem(child));
    });
  }

  return errors;
}

/**
 * Validate currency input item
 */
function validateCurrencyInputItem(item: MOVCurrencyInputItem): ValidationError[] {
  const errors: ValidationError[] = [];

  // Rule: min_value <= max_value
  if (
    item.min_value !== undefined &&
    item.max_value !== undefined &&
    item.min_value > item.max_value
  ) {
    errors.push({
      itemId: item.id,
      field: "max_value",
      message: `max_value (${item.max_value}) must be greater than min_value (${item.min_value})`,
      severity: "error",
    });
  }

  // Rule: threshold should be between min and max if all are set
  if (
    item.threshold !== undefined &&
    item.min_value !== undefined &&
    item.threshold < item.min_value
  ) {
    errors.push({
      itemId: item.id,
      field: "threshold",
      message: `threshold (${item.threshold}) should be >= min_value (${item.min_value})`,
      severity: "warning",
    });
  }

  if (
    item.threshold !== undefined &&
    item.max_value !== undefined &&
    item.threshold > item.max_value
  ) {
    errors.push({
      itemId: item.id,
      field: "threshold",
      message: `threshold (${item.threshold}) should be <= max_value (${item.max_value})`,
      severity: "warning",
    });
  }

  // Warning: Threshold not set (optional but recommended)
  if (item.threshold === undefined || item.threshold === null) {
    errors.push({
      itemId: item.id,
      field: "threshold",
      message: 'Consider setting a threshold for "Passed" vs "Considered" status',
      severity: "warning",
    });
  }

  return errors;
}

/**
 * Validate number input item
 */
function validateNumberInputItem(item: MOVNumberInputItem): ValidationError[] {
  const errors: ValidationError[] = [];

  // Rule: min_value <= max_value
  if (
    item.min_value !== undefined &&
    item.max_value !== undefined &&
    item.min_value > item.max_value
  ) {
    errors.push({
      itemId: item.id,
      field: "max_value",
      message: `max_value (${item.max_value}) must be greater than min_value (${item.min_value})`,
      severity: "error",
    });
  }

  // Rule: threshold should be between min and max if all are set
  if (
    item.threshold !== undefined &&
    item.min_value !== undefined &&
    item.threshold < item.min_value
  ) {
    errors.push({
      itemId: item.id,
      field: "threshold",
      message: `threshold (${item.threshold}) should be >= min_value (${item.min_value})`,
      severity: "warning",
    });
  }

  if (
    item.threshold !== undefined &&
    item.max_value !== undefined &&
    item.threshold > item.max_value
  ) {
    errors.push({
      itemId: item.id,
      field: "threshold",
      message: `threshold (${item.threshold}) should be <= max_value (${item.max_value})`,
      severity: "warning",
    });
  }

  return errors;
}

/**
 * Validate date input item
 */
function validateDateInputItem(item: MOVDateInputItem): ValidationError[] {
  const errors: ValidationError[] = [];

  // Rule: Date inputs with considered_status_enabled must have grace_period_days > 0
  if (item.considered_status_enabled) {
    if (item.grace_period_days === undefined || item.grace_period_days === null) {
      errors.push({
        itemId: item.id,
        field: "grace_period_days",
        message: "grace_period_days is required when considered_status_enabled is true",
        severity: "error",
      });
    } else if (item.grace_period_days <= 0) {
      errors.push({
        itemId: item.id,
        field: "grace_period_days",
        message: "grace_period_days must be greater than 0",
        severity: "error",
      });
    }
  }

  // Rule: min_date <= max_date
  if (item.min_date && item.max_date) {
    const minDate = new Date(item.min_date);
    const maxDate = new Date(item.max_date);

    if (minDate > maxDate) {
      errors.push({
        itemId: item.id,
        field: "max_date",
        message: "max_date must be after min_date",
        severity: "error",
      });
    }
  }

  return errors;
}

/**
 * Validate radio group item
 */
function validateRadioGroupItem(item: MOVRadioGroupItem): ValidationError[] {
  const errors: ValidationError[] = [];

  // Rule: Radio groups must have at least 2 options
  if (!item.options || item.options.length < 2) {
    errors.push({
      itemId: item.id,
      field: "options",
      message: "Radio groups must have at least 2 options",
      severity: "error",
    });
    return errors;
  }

  // Rule: All options must have labels
  item.options.forEach((option, index) => {
    if (!option.label || option.label.trim().length === 0) {
      errors.push({
        itemId: item.id,
        field: `options[${index}].label`,
        message: `Option ${index + 1} must have a label`,
        severity: "error",
      });
    }
    if (!option.value || option.value.trim().length === 0) {
      errors.push({
        itemId: item.id,
        field: `options[${index}].value`,
        message: `Option ${index + 1} must have a value`,
        severity: "error",
      });
    }
  });

  // Rule: Option values must be unique
  const values = item.options.map((opt) => opt.value);
  const uniqueValues = new Set(values);
  if (values.length !== uniqueValues.size) {
    errors.push({
      itemId: item.id,
      field: "options",
      message: "Option values must be unique",
      severity: "error",
    });
  }

  // Warning: Default value should match one of the options
  if (item.default_value && !values.includes(item.default_value)) {
    errors.push({
      itemId: item.id,
      field: "default_value",
      message: `default_value "${item.default_value}" does not match any option value`,
      severity: "warning",
    });
  }

  return errors;
}

/**
 * Validate dropdown item
 */
function validateDropdownItem(item: MOVDropdownItem): ValidationError[] {
  const errors: ValidationError[] = [];

  // Rule: Dropdowns must have at least 1 option
  if (!item.options || item.options.length < 1) {
    errors.push({
      itemId: item.id,
      field: "options",
      message: "Dropdowns must have at least 1 option",
      severity: "error",
    });
    return errors;
  }

  // Rule: All options must have labels and values
  item.options.forEach((option, index) => {
    if (!option.label || option.label.trim().length === 0) {
      errors.push({
        itemId: item.id,
        field: `options[${index}].label`,
        message: `Option ${index + 1} must have a label`,
        severity: "error",
      });
    }
    if (!option.value || option.value.trim().length === 0) {
      errors.push({
        itemId: item.id,
        field: `options[${index}].value`,
        message: `Option ${index + 1} must have a value`,
        severity: "error",
      });
    }
  });

  // Rule: Option values must be unique
  const values = item.options.map((opt) => opt.value);
  const uniqueValues = new Set(values);
  if (values.length !== uniqueValues.size) {
    errors.push({
      itemId: item.id,
      field: "options",
      message: "Option values must be unique",
      severity: "error",
    });
  }

  return errors;
}

/**
 * useMOVValidation Hook
 *
 * Validates MOV checklist configuration and returns validation results.
 *
 * @param checklistConfig - The MOV checklist configuration to validate
 * @returns Validation result with errors, warnings, and validity status
 */
export function useMOVValidation(
  checklistConfig: MOVChecklistConfig | undefined
): MOVValidationResult {
  return useMemo(() => {
    if (!checklistConfig || !checklistConfig.items || checklistConfig.items.length === 0) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        errorsByItem: new Map(),
      };
    }

    const allErrors: ValidationError[] = [];

    // Validate each item
    checklistConfig.items.forEach((item) => {
      allErrors.push(...validateMOVItem(item));
    });

    // Separate errors and warnings
    const errors = allErrors.filter((e) => e.severity === "error");
    const warnings = allErrors.filter((e) => e.severity === "warning");

    // Group errors by item ID
    const errorsByItem = new Map<string, ValidationError[]>();
    allErrors.forEach((error) => {
      const existing = errorsByItem.get(error.itemId) || [];
      errorsByItem.set(error.itemId, [...existing, error]);
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      errorsByItem,
    };
  }, [checklistConfig]);
}
