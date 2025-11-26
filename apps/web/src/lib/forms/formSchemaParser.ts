// 📋 Form Schema Parser Utility
// Utilities for parsing and evaluating form schemas with conditional logic

import type {
  FormSchema,
  FormSchemaResponse,
  FormSchemaFieldsItem,
} from "@sinag/shared";

// Re-export types for convenience
export type {
  FormSchema,
  FormSchemaResponse,
  FormSchemaFieldsItem,
};

/**
 * Conditional operators supported in form schema conditional logic
 */
export type ConditionalOperator =
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "lessThan"
  | "contains";

/**
 * Conditional rule structure for field visibility logic
 */
export interface ConditionalRule {
  /** Field ID to evaluate */
  field_id: string;
  /** Comparison operator */
  operator: ConditionalOperator;
  /** Value to compare against */
  value: string | number | boolean;
}

/**
 * Section metadata structure
 */
export interface Section {
  /** Unique section identifier */
  id: string;
  /** Section title */
  title: string;
  /** Optional section description */
  description?: string;
  /** Display order */
  order: number;
}

/**
 * Form values map (field_id -> value)
 */
export type FormValues = Record<string, unknown>;

/**
 * Field with extracted metadata
 * Simply an alias for FormSchemaFieldsItem for semantic clarity
 */
export type ParsedField = FormSchemaFieldsItem;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get sections from form schema
 *
 * Note: Current form schema structure has a flat list of fields without sections.
 * This function provides forward compatibility for when sections are added.
 * For now, returns a single default section containing all fields.
 *
 * @param formSchema - Form schema object (may be null/undefined)
 * @returns Array of sections with metadata (id, title, description, order)
 */
export function getSections(
  formSchema: FormSchema | Record<string, unknown> | null | undefined
): Section[] {
  // Handle null/undefined/malformed form schemas gracefully
  if (!formSchema || typeof formSchema !== "object") {
    return [];
  }

  // Check if form schema has explicit sections (future-proofing)
  if (
    "sections" in formSchema &&
    Array.isArray(formSchema.sections) &&
    formSchema.sections.length > 0
  ) {
    // Extract section metadata with proper typing
    return formSchema.sections.map((section: unknown, index: number) => {
      if (typeof section === "object" && section !== null) {
        const sectionObj = section as Record<string, unknown>;
        return {
          id: String(sectionObj.section_id ?? sectionObj.id ?? `section_${index}`),
          title: String(sectionObj.title ?? `Section ${index + 1}`),
          description:
            sectionObj.description !== undefined &&
            sectionObj.description !== null
              ? String(sectionObj.description)
              : undefined,
          order:
            typeof sectionObj.order === "number" ? sectionObj.order : index,
        };
      }
      // Fallback for malformed section
      return {
        id: `section_${index}`,
        title: `Section ${index + 1}`,
        order: index,
      };
    });
  }

  // Current implementation: single default section for all fields
  if ("fields" in formSchema && Array.isArray(formSchema.fields)) {
    return [
      {
        id: "default",
        title: "Form Fields",
        description: undefined,
        order: 0,
      },
    ];
  }

  // Empty form schema
  return [];
}

/**
 * Get fields for a specific section
 *
 * Note: Current form schema has flat list of fields without sections.
 * This function returns all fields for the "default" section.
 * Future versions may support section-based field organization.
 *
 * @param formSchema - Form schema object (may be null/undefined)
 * @param sectionId - Section ID to retrieve fields for
 * @returns Array of fields in the specified section, ordered by field order (if available)
 */
export function getFieldsForSection(
  formSchema: FormSchema | Record<string, unknown> | null | undefined,
  sectionId: string
): ParsedField[] {
  // Handle null/undefined/malformed schemas gracefully
  if (!formSchema || typeof formSchema !== "object") {
    return [];
  }

  // Future: Handle explicit sections if they exist
  if (
    "sections" in formSchema &&
    Array.isArray(formSchema.sections) &&
    formSchema.sections.length > 0
  ) {
    const targetSection = formSchema.sections.find(
      (section: unknown) => {
        if (typeof section === "object" && section !== null) {
          const sectionObj = section as Record<string, unknown>;
          const id = sectionObj.section_id ?? sectionObj.id;
          return id === sectionId;
        }
        return false;
      }
    );

    if (
      targetSection &&
      typeof targetSection === "object" &&
      "fields" in targetSection &&
      Array.isArray((targetSection as Record<string, unknown>).fields)
    ) {
      const fields = (targetSection as Record<string, unknown>)
        .fields as ParsedField[];
      // Sort by order if available
      return fields.sort((a, b) => {
        const orderA =
          typeof (a as unknown as Record<string, unknown>).order === "number"
            ? ((a as unknown as Record<string, unknown>).order as number)
            : 0;
        const orderB =
          typeof (b as unknown as Record<string, unknown>).order === "number"
            ? ((b as unknown as Record<string, unknown>).order as number)
            : 0;
        return orderA - orderB;
      });
    }
    return [];
  }

  // Current implementation: Return all fields for "default" section
  if (
    sectionId === "default" &&
    "fields" in formSchema &&
    Array.isArray(formSchema.fields)
  ) {
    // Type assertion: fields should be FormSchemaFieldsItem[]
    const fields = formSchema.fields as ParsedField[];

    // Sort by order if the field has an order property (future-proofing)
    return fields.sort((a, b) => {
      const orderA =
        typeof (a as unknown as Record<string, unknown>).order === "number"
          ? ((a as unknown as Record<string, unknown>).order as number)
          : 0;
      const orderB =
        typeof (b as unknown as Record<string, unknown>).order === "number"
          ? ((b as unknown as Record<string, unknown>).order as number)
          : 0;
      return orderA - orderB;
    });
  }

  // Section not found or empty
  return [];
}

/**
 * Check if a field is required
 *
 * @param field - Field object to check
 * @returns True if field is required, false otherwise (gracefully handles undefined/null)
 */
export function isFieldRequired(field: ParsedField | null | undefined): boolean {
  // Handle null/undefined gracefully
  if (!field) {
    return false;
  }

  // Check required property (defaults to false if not set)
  return field.required === true;
}

/**
 * Evaluate a conditional rule against form values
 *
 * Supports operators: equals, notEquals, greaterThan, lessThan, contains
 *
 * @param rule - Conditional rule to evaluate
 * @param formValues - Current form values map (field_id -> value)
 * @returns True if condition is met, false otherwise
 */
export function evaluateConditional(
  rule: ConditionalRule | null | undefined,
  formValues: FormValues
): boolean {
  // Handle null/undefined rule
  if (!rule) {
    return false;
  }

  // Get the field value from formValues
  const fieldValue = formValues[rule.field_id];

  // Evaluate based on operator
  switch (rule.operator) {
    case "equals":
      // Strict equality comparison
      return fieldValue === rule.value;

    case "notEquals":
      // Strict inequality comparison
      // Handles null/undefined explicitly
      return fieldValue !== rule.value;

    case "greaterThan": {
      // Parse values as numbers for numeric comparison
      const numFieldValue = Number(fieldValue);
      const numRuleValue = Number(rule.value);

      // Return false if either value is NaN (non-numeric)
      if (isNaN(numFieldValue) || isNaN(numRuleValue)) {
        return false;
      }

      return numFieldValue > numRuleValue;
    }

    case "lessThan": {
      // Parse values as numbers for numeric comparison
      const numFieldValue = Number(fieldValue);
      const numRuleValue = Number(rule.value);

      // Return false if either value is NaN (non-numeric)
      if (isNaN(numFieldValue) || isNaN(numRuleValue)) {
        return false;
      }

      return numFieldValue < numRuleValue;
    }

    case "contains": {
      // Case-insensitive substring check
      // Handle non-string values by converting to string
      if (
        fieldValue === null ||
        fieldValue === undefined ||
        rule.value === null ||
        rule.value === undefined
      ) {
        return false;
      }

      const fieldStr = String(fieldValue).toLowerCase();
      const ruleStr = String(rule.value).toLowerCase();

      return fieldStr.includes(ruleStr);
    }

    default:
      // Unknown operator - return false
      return false;
  }
}

/**
 * Get visible fields for a section based on conditional rules
 *
 * Evaluates conditional rules for each field and returns only fields that should be visible.
 * Fields without conditional rules are always visible.
 *
 * @param formSchema - Form schema object
 * @param sectionId - Section ID to get fields for
 * @param formValues - Current form values for evaluating conditionals
 * @returns Array of visible fields in the section
 */
export function getVisibleFields(
  formSchema: FormSchema | Record<string, unknown> | null | undefined,
  sectionId: string,
  formValues: FormValues
): ParsedField[] {
  // Get all fields in the section
  const allFields = getFieldsForSection(formSchema, sectionId);

  // Filter based on conditional visibility rules
  return allFields.filter((field) => {
    // Check if field has conditional rules (future-proofing for when this is added)
    const fieldObj = field as unknown as Record<string, unknown>;

    if (
      "conditionalRules" in fieldObj &&
      Array.isArray(fieldObj.conditionalRules) &&
      fieldObj.conditionalRules.length > 0
    ) {
      // Field has conditional rules - evaluate all rules
      const rules = fieldObj.conditionalRules as ConditionalRule[];

      // All rules must evaluate to true for field to be visible (AND logic)
      return rules.every((rule) => evaluateConditional(rule, formValues));
    }

    // No conditional rules - field is always visible
    return true;
  });
}
