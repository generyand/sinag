import type { FormField } from "@/store/useFormBuilderStore";
import type { FieldOption } from "@sinag/shared";

/**
 * Client-side validation for form schema before save
 *
 * Validates:
 * - Unique field IDs
 * - Required fields filled
 * - No circular references
 * - Options exist for checkbox/radio fields (min 2)
 * - Min < Max for number/date fields
 */

export interface ValidationError {
  fieldId?: string;
  message: string;
}

/**
 * Validate form schema client-side
 */
export function validateFormSchema(fields: FormField[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if empty
  if (fields.length === 0) {
    errors.push({ message: "Form must have at least one field" });
    return errors;
  }

  // Check for duplicate field IDs
  const fieldIds = fields.map((f) => f.field_id);
  const duplicates = fieldIds.filter((id, index) => fieldIds.indexOf(id) !== index);
  if (duplicates.length > 0) {
    const uniqueDuplicates = [...new Set(duplicates)];
    uniqueDuplicates.forEach((id) => {
      errors.push({
        fieldId: id,
        message: `Duplicate field_id: ${id}`,
      });
    });
  }

  // Validate each field
  fields.forEach((field) => {
    // Check for empty field_id or label
    if (!field.field_id || field.field_id.trim() === "") {
      errors.push({
        fieldId: field.field_id,
        message: "Field ID cannot be empty",
      });
    }

    if (!field.label || field.label.trim() === "") {
      errors.push({
        fieldId: field.field_id,
        message: `Field "${field.field_id}": Label cannot be empty`,
      });
    }

    // Validate field_id format
    if (field.field_id && !/^[a-z0-9_]+$/.test(field.field_id)) {
      errors.push({
        fieldId: field.field_id,
        message: `Field "${field.field_id}": Field ID can only contain lowercase letters, numbers, and underscores`,
      });
    }

    // Validate options for checkbox_group and radio_button
    if (field.field_type === "checkbox_group" || field.field_type === "radio_button") {
      if ("options" in field && field.options) {
        if (field.options.length < 2) {
          errors.push({
            fieldId: field.field_id,
            message: `Field "${field.field_id}": Requires at least 2 options`,
          });
        }

        // Check for duplicate option values
        const optionValues = field.options.map((opt: FieldOption) => opt.value);
        const dupOptions = optionValues.filter(
          (val: string, index: number) => optionValues.indexOf(val) !== index
        );
        if (dupOptions.length > 0) {
          errors.push({
            fieldId: field.field_id,
            message: `Field "${field.field_id}": Duplicate option values found`,
          });
        }
      } else {
        errors.push({
          fieldId: field.field_id,
          message: `Field "${field.field_id}": Options are required`,
        });
      }
    }

    // Validate min < max for number_input
    if (field.field_type === "number_input") {
      if (
        "min_value" in field &&
        "max_value" in field &&
        field.min_value !== undefined &&
        field.min_value !== null &&
        field.max_value !== undefined &&
        field.max_value !== null
      ) {
        if (field.min_value >= field.max_value) {
          errors.push({
            fieldId: field.field_id,
            message: `Field "${field.field_id}": Min value must be less than max value`,
          });
        }
      }
    }

    // Validate min_date < max_date for date_picker
    if (field.field_type === "date_picker") {
      if ("min_date" in field && "max_date" in field && field.min_date && field.max_date) {
        if (new Date(field.min_date) >= new Date(field.max_date)) {
          errors.push({
            fieldId: field.field_id,
            message: `Field "${field.field_id}": Min date must be before max date`,
          });
        }
      }
    }

    // Validate conditional_mov_requirement for file_upload
    if (field.field_type === "file_upload") {
      if ("conditional_mov_requirement" in field && field.conditional_mov_requirement) {
        const refFieldId = field.conditional_mov_requirement.field_id;

        // Check if referenced field exists
        if (!fields.find((f) => f.field_id === refFieldId)) {
          errors.push({
            fieldId: field.field_id,
            message: `Field "${field.field_id}": Referenced field "${refFieldId}" does not exist`,
          });
        }

        // Check for self-reference
        if (refFieldId === field.field_id) {
          errors.push({
            fieldId: field.field_id,
            message: `Field "${field.field_id}": Cannot reference itself`,
          });
        }
      }
    }
  });

  // Check for circular references in conditional MOV logic
  const circularErrors = detectCircularReferences(fields);
  errors.push(...circularErrors);

  return errors;
}

/**
 * Detect circular references in conditional MOV requirements
 */
function detectCircularReferences(fields: FormField[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Build dependency graph
  const dependencies: Map<string, string[]> = new Map();

  fields.forEach((field) => {
    dependencies.set(field.field_id, []);

    if (
      field.field_type === "file_upload" &&
      "conditional_mov_requirement" in field &&
      field.conditional_mov_requirement
    ) {
      dependencies.get(field.field_id)!.push(field.conditional_mov_requirement.field_id);
    }
  });

  // DFS to detect cycles
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycle(fieldId: string): boolean {
    visited.add(fieldId);
    recStack.add(fieldId);

    const deps = dependencies.get(fieldId) || [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        if (hasCycle(dep)) {
          return true;
        }
      } else if (recStack.has(dep)) {
        return true;
      }
    }

    recStack.delete(fieldId);
    return false;
  }

  for (const fieldId of dependencies.keys()) {
    if (!visited.has(fieldId)) {
      if (hasCycle(fieldId)) {
        errors.push({
          fieldId: fieldId,
          message: `Circular reference detected in conditional MOV logic`,
        });
      }
    }
  }

  return errors;
}
