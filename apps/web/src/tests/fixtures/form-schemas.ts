/**
 * Form Schema Test Fixtures (Story 6.6 - Task 6.6.1)
 *
 * Comprehensive test fixtures for form schema validation testing.
 * Covers simple schemas, complex nested schemas, all field types,
 * conditional fields, and edge cases.
 */

export const simpleFormSchema = {
  fields: [
    {
      name: "simple_text_field",
      label: "Simple Text Field",
      type: "text",
      required: true,
      placeholder: "Enter text here",
    },
    {
      name: "simple_number_field",
      label: "Simple Number Field",
      type: "number",
      required: false,
      min: 0,
      max: 100,
    },
  ],
};

export const allFieldTypesSchema = {
  fields: [
    {
      name: "text_field",
      label: "Text Field",
      type: "text",
      required: true,
      placeholder: "Enter text",
      defaultValue: "",
    },
    {
      name: "number_field",
      label: "Number Field",
      type: "number",
      required: true,
      min: 0,
      max: 1000,
      step: 1,
      placeholder: "Enter a number",
    },
    {
      name: "select_field",
      label: "Select Field",
      type: "select",
      required: true,
      options: [
        { value: "option1", label: "Option 1" },
        { value: "option2", label: "Option 2" },
        { value: "option3", label: "Option 3" },
      ],
    },
    {
      name: "radio_field",
      label: "Radio Field",
      type: "radio",
      required: true,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    {
      name: "checkbox_field",
      label: "Checkbox Field",
      type: "checkbox",
      required: false,
      defaultValue: false,
    },
    {
      name: "file_field",
      label: "File Upload Field",
      type: "file",
      required: false,
      accept: ".pdf,.jpg,.png",
      maxSize: 5242880, // 5MB
    },
    {
      name: "textarea_field",
      label: "Textarea Field",
      type: "textarea",
      required: false,
      placeholder: "Enter long text",
      rows: 5,
    },
    {
      name: "date_field",
      label: "Date Field",
      type: "date",
      required: false,
    },
  ],
};

export const conditionalFieldsSchema = {
  fields: [
    {
      name: "primary_question",
      label: "Do you have a governance program?",
      type: "radio",
      required: true,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    {
      name: "program_details",
      label: "Program Details",
      type: "textarea",
      required: true,
      conditions: [
        {
          field: "primary_question",
          operator: "==",
          value: "yes",
        },
      ],
    },
    {
      name: "program_budget",
      label: "Program Budget",
      type: "number",
      required: true,
      min: 0,
      conditions: [
        {
          field: "primary_question",
          operator: "==",
          value: "yes",
        },
      ],
    },
    {
      name: "reason_for_no_program",
      label: "Why no program?",
      type: "textarea",
      required: true,
      conditions: [
        {
          field: "primary_question",
          operator: "==",
          value: "no",
        },
      ],
    },
  ],
};

export const nestedConditionalSchema = {
  fields: [
    {
      name: "level_1_question",
      label: "Level 1: Have governance program?",
      type: "radio",
      required: true,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    {
      name: "level_2_question",
      label: "Level 2: Is it funded?",
      type: "radio",
      required: true,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
      conditions: [
        {
          field: "level_1_question",
          operator: "==",
          value: "yes",
        },
      ],
    },
    {
      name: "level_3_question",
      label: "Level 3: Budget amount?",
      type: "number",
      required: true,
      min: 0,
      conditions: [
        {
          field: "level_1_question",
          operator: "==",
          value: "yes",
        },
        {
          field: "level_2_question",
          operator: "==",
          value: "yes",
        },
      ],
    },
    {
      name: "level_3_alt",
      label: "Level 3 Alt: Why not funded?",
      type: "textarea",
      required: true,
      conditions: [
        {
          field: "level_1_question",
          operator: "==",
          value: "yes",
        },
        {
          field: "level_2_question",
          operator: "==",
          value: "no",
        },
      ],
    },
  ],
};

export const complexFormSchema = {
  fields: [
    {
      name: "barangay_name",
      label: "Barangay Name",
      type: "text",
      required: true,
      validation: {
        pattern: "^[A-Za-z\\s]+$",
        message: "Only letters and spaces allowed",
      },
    },
    {
      name: "population",
      label: "Population Count",
      type: "number",
      required: true,
      min: 1,
      max: 100000,
      validation: {
        custom: "validatePopulation",
      },
    },
    {
      name: "budget_category",
      label: "Budget Category",
      type: "select",
      required: true,
      options: [
        { value: "small", label: "Small (< 1M)" },
        { value: "medium", label: "Medium (1M - 5M)" },
        { value: "large", label: "Large (> 5M)" },
      ],
    },
    {
      name: "budget_amount",
      label: "Exact Budget Amount",
      type: "number",
      required: true,
      min: 0,
      conditions: [
        {
          field: "budget_category",
          operator: "!=",
          value: "",
        },
      ],
    },
    {
      name: "governance_areas",
      label: "Governance Areas Implemented",
      type: "checkbox-group",
      required: true,
      options: [
        { value: "area1", label: "Social Protection" },
        { value: "area2", label: "Peace & Order" },
        { value: "area3", label: "Business Friendliness" },
      ],
    },
    {
      name: "documentation_files",
      label: "Upload Governance Documentation",
      type: "file",
      required: true,
      accept: ".pdf,.docx",
      maxSize: 10485760, // 10MB
      multiple: true,
    },
  ],
};

export const edgeCaseCircularConditionSchema = {
  fields: [
    {
      name: "field_a",
      label: "Field A",
      type: "radio",
      required: true,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
      conditions: [
        {
          field: "field_b",
          operator: "==",
          value: "yes",
        },
      ],
    },
    {
      name: "field_b",
      label: "Field B",
      type: "radio",
      required: true,
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
      conditions: [
        {
          field: "field_a",
          operator: "==",
          value: "yes",
        },
      ],
    },
  ],
};

export const edgeCaseInvalidFieldTypeSchema = {
  fields: [
    {
      name: "invalid_field",
      label: "Invalid Field Type",
      type: "unknown_type", // Invalid field type
      required: true,
    },
  ],
};

export const edgeCaseMissingRequiredPropsSchema = {
  fields: [
    {
      name: "incomplete_field",
      // Missing 'label' and 'type'
      required: true,
    },
  ],
};

export const edgeCaseInvalidConditionOperatorSchema = {
  fields: [
    {
      name: "parent_field",
      label: "Parent Field",
      type: "text",
      required: true,
    },
    {
      name: "child_field",
      label: "Child Field",
      type: "text",
      required: true,
      conditions: [
        {
          field: "parent_field",
          operator: "invalid_operator", // Invalid operator
          value: "test",
        },
      ],
    },
  ],
};

export const edgeCaseNonExistentConditionFieldSchema = {
  fields: [
    {
      name: "visible_field",
      label: "Visible Field",
      type: "text",
      required: true,
      conditions: [
        {
          field: "non_existent_field", // Field doesn't exist in schema
          operator: "==",
          value: "test",
        },
      ],
    },
  ],
};

export const validationRulesSchema = {
  fields: [
    {
      name: "email_field",
      label: "Email Address",
      type: "text",
      required: true,
      validation: {
        pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
        message: "Please enter a valid email address",
      },
    },
    {
      name: "phone_field",
      label: "Phone Number",
      type: "text",
      required: false,
      validation: {
        pattern: "^\\d{11}$",
        message: "Phone number must be 11 digits",
      },
    },
    {
      name: "percentage_field",
      label: "Percentage",
      type: "number",
      required: true,
      min: 0,
      max: 100,
      validation: {
        message: "Percentage must be between 0 and 100",
      },
    },
    {
      name: "url_field",
      label: "Website URL",
      type: "text",
      required: false,
      validation: {
        pattern: "^https?://.*",
        message: "URL must start with http:// or https://",
      },
    },
  ],
};

export const emptySchema = {
  fields: [],
};

export const singleFieldSchema = {
  fields: [
    {
      name: "only_field",
      label: "Only Field",
      type: "text",
      required: true,
    },
  ],
};

/**
 * Helper function to create a custom schema for specific testing scenarios
 */
export function createCustomSchema(fields: any[]) {
  return { fields };
}

/**
 * All test schemas exported as a collection
 */
export const testSchemas = {
  simple: simpleFormSchema,
  allFieldTypes: allFieldTypesSchema,
  conditional: conditionalFieldsSchema,
  nestedConditional: nestedConditionalSchema,
  complex: complexFormSchema,
  validationRules: validationRulesSchema,
  empty: emptySchema,
  singleField: singleFieldSchema,
  edgeCases: {
    circularCondition: edgeCaseCircularConditionSchema,
    invalidFieldType: edgeCaseInvalidFieldTypeSchema,
    missingRequiredProps: edgeCaseMissingRequiredPropsSchema,
    invalidConditionOperator: edgeCaseInvalidConditionOperatorSchema,
    nonExistentConditionField: edgeCaseNonExistentConditionFieldSchema,
  },
};
