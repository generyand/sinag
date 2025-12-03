/**
 * 🔍 Indicator Schema Validation Utilities
 *
 * Real-time validation for form, calculation, and remark schemas.
 * Runs on every schema change (debounced 500ms) to provide immediate feedback.
 *
 * Features:
 * - Field-level validation for form schemas
 * - Cross-reference validation for calculation schemas
 * - Completeness checks for all schema types
 * - Severity levels (error vs warning)
 *
 * @module indicator-validation
 */

import type { ValidationError } from '@/store/useIndicatorBuilderStore';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Form field type (must match backend)
 */
export type FormFieldType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'radio'
  | 'checkbox'
  | 'file_upload'
  | 'date';

/**
 * Form field interface
 */
export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  helpText?: string;
  options?: { label: string; value: string }[];
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  rows?: number;
  allowedFileTypes?: string[];
  maxFileSizeMb?: number;
  conditionalMovRequirement?: any;
  [key: string]: any;
}

/**
 * Form schema interface
 */
export interface FormSchema {
  fields: FormField[];
}

/**
 * Calculation schema interface
 */
export interface CalculationSchema {
  outputStatusOnPass?: 'PASS' | 'FAIL' | 'N/A';
  outputStatusOnFail?: 'PASS' | 'FAIL' | 'N/A';
  rules?: any[];
  formula?: string;
  [key: string]: any;
}

/**
 * Remark schema interface
 */
export interface RemarkSchema {
  content?: string;
  template?: string;
  [key: string]: any;
}

// ============================================================================
// Form Schema Validation
// ============================================================================

/**
 * Validate form schema completeness and field integrity
 *
 * @param schema - Form schema to validate
 * @returns Array of validation errors
 *
 * @example
 * ```typescript
 * const errors = validateFormSchema(formSchema);
 * if (errors.length > 0) {
 *   console.error('Form schema has errors:', errors);
 * }
 * ```
 */
export function validateFormSchema(schema: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if schema exists
  if (!schema) {
    errors.push({
      field: 'form',
      message: 'Form schema is required',
      severity: 'error',
    });
    return errors;
  }

  // Check if fields array exists
  if (!schema.fields || !Array.isArray(schema.fields)) {
    errors.push({
      field: 'form',
      message: 'Form schema must have a "fields" array',
      severity: 'error',
    });
    return errors;
  }

  // Check if at least one field exists
  if (schema.fields.length === 0) {
    errors.push({
      field: 'form',
      message: 'At least one field is required',
      severity: 'error',
    });
    return errors;
  }

  // Validate each field
  const fieldNames = new Set<string>();
  schema.fields.forEach((field: FormField, index: number) => {
    // Check field name
    if (!field.name || field.name.trim() === '') {
      errors.push({
        field: 'form',
        message: `Field ${index + 1}: Name is required`,
        severity: 'error',
      });
    } else {
      // Check for duplicate field names
      if (fieldNames.has(field.name)) {
        errors.push({
          field: 'form',
          message: `Field "${field.name}": Duplicate field name`,
          severity: 'error',
        });
      }
      fieldNames.add(field.name);

      // Check field name format (alphanumeric + underscore only)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
        errors.push({
          field: 'form',
          message: `Field "${field.name}": Name must start with letter/underscore and contain only letters, numbers, underscores`,
          severity: 'error',
        });
      }
    }

    // Check field label
    if (!field.label || field.label.trim() === '') {
      errors.push({
        field: 'form',
        message: `Field ${index + 1}: Label is required`,
        severity: 'error',
      });
    }

    // Check field type
    const validTypes: FormFieldType[] = [
      'text',
      'number',
      'textarea',
      'radio',
      'checkbox',
      'file_upload',
      'date',
    ];
    if (!field.type || !validTypes.includes(field.type)) {
      errors.push({
        field: 'form',
        message: `Field "${field.name || index + 1}": Invalid field type "${field.type}"`,
        severity: 'error',
      });
    }

    // Type-specific validation
    if (field.type === 'radio' || field.type === 'checkbox') {
      if (!field.options || !Array.isArray(field.options) || field.options.length === 0) {
        errors.push({
          field: 'form',
          message: `Field "${field.name || index + 1}": Radio/checkbox fields require at least one option`,
          severity: 'error',
        });
      } else {
        // Check option structure
        field.options.forEach((option: any, optIndex: number) => {
          if (!option.label || !option.value) {
            errors.push({
              field: 'form',
              message: `Field "${field.name || index + 1}", Option ${optIndex + 1}: Both label and value are required`,
              severity: 'error',
            });
          }
        });
      }
    }

    // Number field validation
    if (field.type === 'number') {
      if (field.minValue !== undefined && field.maxValue !== undefined) {
        if (field.minValue > field.maxValue) {
          errors.push({
            field: 'form',
            message: `Field "${field.name || index + 1}": Min value cannot be greater than max value`,
            severity: 'error',
          });
        }
      }
    }

    // Text/textarea length validation
    if (field.type === 'text' || field.type === 'textarea') {
      if (field.minLength !== undefined && field.maxLength !== undefined) {
        if (field.minLength > field.maxLength) {
          errors.push({
            field: 'form',
            message: `Field "${field.name || index + 1}": Min length cannot be greater than max length`,
            severity: 'error',
          });
        }
      }
      if (field.maxLength !== undefined && field.maxLength < 1) {
        errors.push({
          field: 'form',
          message: `Field "${field.name || index + 1}": Max length must be at least 1`,
          severity: 'error',
        });
      }
    }

    // File upload validation
    if (field.type === 'file_upload') {
      if (field.maxFileSizeMb !== undefined && field.maxFileSizeMb <= 0) {
        errors.push({
          field: 'form',
          message: `Field "${field.name || index + 1}": Max file size must be positive`,
          severity: 'error',
        });
      }
    }
  });

  return errors;
}

// ============================================================================
// Calculation Schema Validation
// ============================================================================

/**
 * Validate calculation schema and cross-reference with form schema
 *
 * @param calculationSchema - Calculation schema to validate
 * @param formSchema - Form schema for field reference validation
 * @returns Array of validation errors
 *
 * @example
 * ```typescript
 * const errors = validateCalculationSchema(calcSchema, formSchema);
 * ```
 */
export function validateCalculationSchema(
  calculationSchema: any,
  formSchema: FormSchema | null | undefined
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if schema exists
  if (!calculationSchema) {
    errors.push({
      field: 'calculation',
      message: 'Calculation schema is required',
      severity: 'error',
    });
    return errors;
  }

  // Check if outputStatusOnPass is set
  if (!calculationSchema.outputStatusOnPass) {
    errors.push({
      field: 'calculation',
      message: 'Output status on pass is required',
      severity: 'error',
    });
  } else {
    const validStatuses = ['PASS', 'FAIL', 'N/A'];
    if (!validStatuses.includes(calculationSchema.outputStatusOnPass)) {
      errors.push({
        field: 'calculation',
        message: `Invalid output status on pass: "${calculationSchema.outputStatusOnPass}"`,
        severity: 'error',
      });
    }
  }

  // Check if outputStatusOnFail is set
  if (!calculationSchema.outputStatusOnFail) {
    errors.push({
      field: 'calculation',
      message: 'Output status on fail is required',
      severity: 'error',
    });
  } else {
    const validStatuses = ['PASS', 'FAIL', 'N/A'];
    if (!validStatuses.includes(calculationSchema.outputStatusOnFail)) {
      errors.push({
        field: 'calculation',
        message: `Invalid output status on fail: "${calculationSchema.outputStatusOnFail}"`,
        severity: 'error',
      });
    }
  }

  // Check if rules or formula exists
  const hasRules = calculationSchema.rules && Array.isArray(calculationSchema.rules) && calculationSchema.rules.length > 0;
  const hasFormula = calculationSchema.formula && calculationSchema.formula.trim() !== '';

  if (!hasRules && !hasFormula) {
    errors.push({
      field: 'calculation',
      message: 'Either rules or formula is required',
      severity: 'error',
    });
  }

  // Cross-reference validation: Check if calculation references valid form fields
  if (formSchema && formSchema.fields) {
    const formFieldNames = new Set(formSchema.fields.map(f => f.name));

    // Validate rules reference valid fields
    if (hasRules) {
      calculationSchema.rules.forEach((rule: any, ruleIndex: number) => {
        // Check conditions in conditional rules
        if (rule.conditions && Array.isArray(rule.conditions)) {
          rule.conditions.forEach((condition: any, condIndex: number) => {
            if (condition.field && !formFieldNames.has(condition.field)) {
              errors.push({
                field: 'calculation',
                message: `Rule ${ruleIndex + 1}, Condition ${condIndex + 1}: Field "${condition.field}" not found in form schema`,
                severity: 'error',
              });
            }
          });
        }

        // Check field in match rules
        if (rule.field && !formFieldNames.has(rule.field)) {
          errors.push({
            field: 'calculation',
            message: `Rule ${ruleIndex + 1}: Field "${rule.field}" not found in form schema`,
            severity: 'error',
          });
        }
      });
    }

    // Validate formula references valid fields
    if (hasFormula) {
      // Extract field names from formula (simple regex, may need improvement)
      const fieldReferences = calculationSchema.formula.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
      const invalidFields = fieldReferences.filter((ref: string) => {
        // Exclude common operators and keywords
        const keywords = ['AND', 'OR', 'NOT', 'IF', 'THEN', 'ELSE', 'true', 'false', 'null'];
        return !keywords.includes(ref) && !formFieldNames.has(ref);
      });

      invalidFields.forEach((invalidField: string) => {
        errors.push({
          field: 'calculation',
          message: `Formula references invalid field: "${invalidField}"`,
          severity: 'warning', // Warning instead of error (may be false positive)
        });
      });
    }
  }

  return errors;
}

// ============================================================================
// Remark Schema Validation
// ============================================================================

/**
 * Validate remark schema completeness
 *
 * @param remarkSchema - Remark schema to validate
 * @returns Array of validation errors
 *
 * @example
 * ```typescript
 * const errors = validateRemarkSchema(remarkSchema);
 * ```
 */
export function validateRemarkSchema(remarkSchema: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if schema exists
  if (!remarkSchema) {
    errors.push({
      field: 'remark',
      message: 'Remark schema is required',
      severity: 'error',
    });
    return errors;
  }

  // Check if content or template exists
  const hasContent = remarkSchema.content && remarkSchema.content.trim() !== '';
  const hasTemplate = remarkSchema.template && remarkSchema.template.trim() !== '';

  if (!hasContent && !hasTemplate) {
    errors.push({
      field: 'remark',
      message: 'Remark content or template is required',
      severity: 'error',
    });
  }

  // Minimum length check for content
  if (hasContent && remarkSchema.content.trim().length < 3) {
    errors.push({
      field: 'remark',
      message: 'Remark content must be at least 3 characters',
      severity: 'error',
    });
  }

  return errors;
}

// ============================================================================
// Combined Validation
// ============================================================================

/**
 * Validate all schemas for an indicator
 *
 * @param indicator - Indicator node with schemas
 * @returns Object with errors per schema type
 *
 * @example
 * ```typescript
 * const { formErrors, calculationErrors, remarkErrors, allErrors } = validateIndicatorSchemas(indicator);
 * ```
 */
export function validateIndicatorSchemas(indicator: {
  form_schema?: any;
  calculation_schema?: any;
  remark_schema?: any;
}): {
  formErrors: ValidationError[];
  calculationErrors: ValidationError[];
  remarkErrors: ValidationError[];
  allErrors: ValidationError[];
} {
  const formErrors = validateFormSchema(indicator.form_schema);
  const calculationErrors = validateCalculationSchema(
    indicator.calculation_schema,
    indicator.form_schema
  );
  const remarkErrors = validateRemarkSchema(indicator.remark_schema);

  return {
    formErrors,
    calculationErrors,
    remarkErrors,
    allErrors: [...formErrors, ...calculationErrors, ...remarkErrors],
  };
}

/**
 * Check if an indicator has all schemas complete and valid
 *
 * @param indicator - Indicator node with schemas
 * @returns Boolean indicating if indicator is complete
 *
 * @example
 * ```typescript
 * const isComplete = isIndicatorComplete(indicator);
 * ```
 */
export function isIndicatorComplete(indicator: {
  form_schema?: any;
  calculation_schema?: any;
  remark_schema?: any;
}): boolean {
  const { allErrors } = validateIndicatorSchemas(indicator);
  return allErrors.filter(e => e.severity === 'error').length === 0;
}

/**
 * Get completion status summary
 *
 * @param indicator - Indicator node with schemas
 * @returns Summary object with completion flags and error counts
 *
 * @example
 * ```typescript
 * const { isComplete, errorCount, warningCount } = getCompletionStatus(indicator);
 * ```
 */
export function getCompletionStatus(indicator: {
  form_schema?: any;
  calculation_schema?: any;
  remark_schema?: any;
}): {
  formComplete: boolean;
  calculationComplete: boolean;
  remarkComplete: boolean;
  isComplete: boolean;
  errorCount: number;
  warningCount: number;
  errors: ValidationError[];
} {
  const { formErrors, calculationErrors, remarkErrors, allErrors } = validateIndicatorSchemas(indicator);

  const errorCount = allErrors.filter(e => e.severity === 'error').length;
  const warningCount = allErrors.filter(e => e.severity === 'warning').length;

  return {
    formComplete: formErrors.filter(e => e.severity === 'error').length === 0,
    calculationComplete: calculationErrors.filter(e => e.severity === 'error').length === 0,
    remarkComplete: remarkErrors.filter(e => e.severity === 'error').length === 0,
    isComplete: errorCount === 0,
    errorCount,
    warningCount,
    errors: allErrors,
  };
}
