// 🛡️ Generate Zod Validation Schema
// Dynamically generate Zod validation schemas from form schema

import { z } from "zod";
import type { FormSchema, FormSchemaFieldsItem } from "@sinag/shared";

/**
 * Generate a Zod validation schema from a form schema
 *
 * @param formSchema - Form schema defining the fields
 * @returns Zod object schema for validation
 */
export function generateValidationSchema(
  formSchema: FormSchema | Record<string, unknown> | null | undefined
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  // Handle null/undefined schema
  if (!formSchema || !("fields" in formSchema) || !Array.isArray(formSchema.fields)) {
    return z.object({});
  }

  const fields = formSchema.fields as FormSchemaFieldsItem[];
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    schemaShape[field.field_id] = createFieldValidator(field);
  });

  return z.object(schemaShape);
}

/**
 * Create a Zod validator for a specific field type
 */
function createFieldValidator(field: FormSchemaFieldsItem): z.ZodTypeAny {
  switch (field.field_type) {
    case "text_input":
      return createTextInputValidator(field);

    case "text_area":
      return createTextAreaValidator(field);

    case "number_input":
      return createNumberInputValidator(field);

    case "date_picker":
      return createDatePickerValidator(field);

    case "radio_button":
      return createRadioButtonValidator(field);

    case "checkbox_group":
      return createCheckboxGroupValidator(field);

    case "file_upload":
      return createFileUploadValidator(field);

    default:
      // Unknown field type - optional string
      return z.string().optional();
  }
}

/**
 * Text input field validator
 */
function createTextInputValidator(field: FormSchemaFieldsItem): z.ZodTypeAny {
  let validator = z.string();

  if (field.required) {
    validator = validator.min(1, `${field.label} is required`);
  } else {
    validator = validator.optional() as any;
  }

  // Add max length validation if specified
  if ("max_length" in field && typeof field.max_length === "number") {
    validator = validator.max(
      field.max_length,
      `${field.label} must be at most ${field.max_length} characters`
    );
  }

  return validator;
}

/**
 * Text area field validator
 */
function createTextAreaValidator(field: FormSchemaFieldsItem): z.ZodTypeAny {
  let validator = z.string();

  if (field.required) {
    validator = validator.min(1, `${field.label} is required`);
  } else {
    validator = validator.optional() as any;
  }

  // Add max length validation if specified
  if ("max_length" in field && typeof field.max_length === "number") {
    validator = validator.max(
      field.max_length,
      `${field.label} must be at most ${field.max_length} characters`
    );
  }

  return validator;
}

/**
 * Number input field validator
 */
function createNumberInputValidator(field: FormSchemaFieldsItem): z.ZodTypeAny {
  let validator = z.number();

  // Add min/max validation BEFORE making it optional
  if ("min_value" in field && typeof field.min_value === "number") {
    validator = validator.min(
      field.min_value,
      `${field.label} must be at least ${field.min_value}`
    );
  }

  if ("max_value" in field && typeof field.max_value === "number") {
    validator = validator.max(field.max_value, `${field.label} must be at most ${field.max_value}`);
  }

  // Apply required/optional AFTER constraints
  if (field.required) {
    validator = validator.refine((val) => val !== undefined && val !== null, {
      message: `${field.label} is required`,
    });
  } else {
    validator = validator.optional() as any;
  }

  return validator;
}

/**
 * Date picker field validator
 */
function createDatePickerValidator(field: FormSchemaFieldsItem): z.ZodTypeAny {
  let validator = z.string();

  if (field.required) {
    validator = validator.min(1, `${field.label} is required`);
  } else {
    validator = validator.optional() as any;
  }

  // Validate ISO date format (YYYY-MM-DD)
  validator = validator.refine(
    (val) => {
      if (!val) return !field.required; // Allow empty if not required
      return /^\d{4}-\d{2}-\d{2}$/.test(val);
    },
    { message: `${field.label} must be a valid date (YYYY-MM-DD)` }
  );

  return validator;
}

/**
 * Radio button field validator
 */
function createRadioButtonValidator(field: FormSchemaFieldsItem): z.ZodTypeAny {
  let validator = z.string();

  if (field.required) {
    validator = validator.min(1, `${field.label} is required`);
  } else {
    validator = validator.optional() as any;
  }

  // Validate that selected value is one of the options
  if ("options" in field && Array.isArray(field.options)) {
    const validValues = field.options.map((opt: { value: string }) => opt.value);
    validator = validator.refine(
      (val) => {
        if (!val) return !field.required; // Allow empty if not required
        return validValues.includes(val);
      },
      { message: `${field.label} must be one of the valid options` }
    );
  }

  return validator;
}

/**
 * Checkbox group field validator
 */
function createCheckboxGroupValidator(field: FormSchemaFieldsItem): z.ZodTypeAny {
  let validator = z.array(z.string());

  if (field.required) {
    validator = validator.min(1, `${field.label} requires at least one selection`);
  } else {
    validator = validator.optional() as any;
  }

  // Validate that selected values are valid options
  if ("options" in field && Array.isArray(field.options)) {
    const validValues = field.options.map((opt: { value: string }) => opt.value);
    validator = validator.refine(
      (val) => {
        if (!val || val.length === 0) return !field.required;
        return val.every((v) => validValues.includes(v));
      },
      { message: `${field.label} contains invalid selections` }
    );
  }

  return validator;
}

/**
 * File upload field validator (placeholder)
 */
function createFileUploadValidator(field: FormSchemaFieldsItem): z.ZodTypeAny {
  // File upload will be implemented in Epic 4
  // For now, treat as optional
  return z.any().optional();
}
