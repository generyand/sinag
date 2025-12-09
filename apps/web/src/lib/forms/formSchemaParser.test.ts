// 📋 Form Schema Parser Unit Tests
// Comprehensive tests for form schema parsing and conditional logic evaluation

import { describe, it, expect } from "vitest";
import {
  getSections,
  getFieldsForSection,
  isFieldRequired,
  evaluateConditional,
  getVisibleFields,
  type FormSchema,
  type ConditionalRule,
  type FormValues,
  type ParsedField,
} from "./formSchemaParser";

describe("formSchemaParser", () => {
  // ============================================================================
  // getSections() Tests
  // ============================================================================
  describe("getSections", () => {
    it("should return empty array for null schema", () => {
      expect(getSections(null)).toEqual([]);
    });

    it("should return empty array for undefined schema", () => {
      expect(getSections(undefined)).toEqual([]);
    });

    it("should return empty array for non-object schema", () => {
      expect(getSections("invalid" as unknown as FormSchema)).toEqual([]);
      expect(getSections(123 as unknown as FormSchema)).toEqual([]);
    });

    it("should return default section for schema with flat fields list", () => {
      const schema: FormSchema = {
        fields: [
          {
            field_id: "test_field",
            field_type: "text_input",
            label: "Test Field",
            required: false,
          },
        ],
      };

      const sections = getSections(schema);

      expect(sections).toHaveLength(1);
      expect(sections[0]).toEqual({
        id: "default",
        title: "Form Fields",
        description: undefined,
        order: 0,
      });
    });

    it("should return empty array for schema without fields", () => {
      const schema = {} as FormSchema;
      expect(getSections(schema)).toEqual([]);
    });

    it("should handle future sections structure", () => {
      const schema = {
        sections: [
          { id: "section1", title: "Personal Info", description: "Enter your details", order: 0 },
          { id: "section2", title: "Address", order: 1 },
        ],
        fields: [],
      } as unknown as FormSchema;

      const sections = getSections(schema);

      expect(sections).toHaveLength(2);
      expect(sections[0]).toEqual({
        id: "section1",
        title: "Personal Info",
        description: "Enter your details",
        order: 0,
      });
      expect(sections[1]).toEqual({
        id: "section2",
        title: "Address",
        description: undefined,
        order: 1,
      });
    });

    it("should handle malformed sections with fallback values", () => {
      const schema = {
        sections: [
          {
            /* missing id and title */
          },
          { id: null, title: null },
        ],
        fields: [],
      } as unknown as FormSchema;

      const sections = getSections(schema);

      expect(sections).toHaveLength(2);
      // First section missing id/title - uses fallback
      expect(sections[0].id).toBe("section_0");
      expect(sections[0].title).toBe("Section 1");
      // Second section has null id/title - uses fallback too
      expect(sections[1].id).toBe("section_1");
      expect(sections[1].title).toBe("Section 2");
    });
  });

  // ============================================================================
  // getFieldsForSection() Tests
  // ============================================================================
  describe("getFieldsForSection", () => {
    it("should return empty array for null schema", () => {
      expect(getFieldsForSection(null, "default")).toEqual([]);
    });

    it("should return empty array for undefined schema", () => {
      expect(getFieldsForSection(undefined, "default")).toEqual([]);
    });

    it("should return all fields for default section", () => {
      const schema: FormSchema = {
        fields: [
          {
            field_id: "field1",
            field_type: "text_input",
            label: "Field 1",
            required: true,
          },
          {
            field_id: "field2",
            field_type: "number_input",
            label: "Field 2",
            required: false,
          },
        ],
      };

      const fields = getFieldsForSection(schema, "default");

      expect(fields).toHaveLength(2);
      expect(fields[0].field_id).toBe("field1");
      expect(fields[1].field_id).toBe("field2");
    });

    it("should return empty array for non-existent section", () => {
      const schema: FormSchema = {
        fields: [
          {
            field_id: "field1",
            field_type: "text_input",
            label: "Field 1",
            required: false,
          },
        ],
      };

      expect(getFieldsForSection(schema, "non_existent")).toEqual([]);
    });

    it("should sort fields by order if available", () => {
      const schema = {
        fields: [
          {
            field_id: "field3",
            field_type: "text_input",
            label: "Field 3",
            required: false,
            order: 2,
          },
          {
            field_id: "field1",
            field_type: "text_input",
            label: "Field 1",
            required: false,
            order: 0,
          },
          {
            field_id: "field2",
            field_type: "text_input",
            label: "Field 2",
            required: false,
            order: 1,
          },
        ],
      } as unknown as FormSchema;

      const fields = getFieldsForSection(schema, "default");

      expect(fields[0].field_id).toBe("field1");
      expect(fields[1].field_id).toBe("field2");
      expect(fields[2].field_id).toBe("field3");
    });

    it("should handle future sections structure", () => {
      const schema = {
        sections: [
          {
            id: "section1",
            title: "Section 1",
            fields: [
              {
                field_id: "field1",
                field_type: "text_input",
                label: "Field 1",
                required: false,
              },
            ],
          },
        ],
      } as unknown as FormSchema;

      const fields = getFieldsForSection(schema, "section1");

      expect(fields).toHaveLength(1);
      expect(fields[0].field_id).toBe("field1");
    });
  });

  // ============================================================================
  // isFieldRequired() Tests
  // ============================================================================
  describe("isFieldRequired", () => {
    it("should return false for null field", () => {
      expect(isFieldRequired(null)).toBe(false);
    });

    it("should return false for undefined field", () => {
      expect(isFieldRequired(undefined)).toBe(false);
    });

    it("should return true for required field", () => {
      const field: ParsedField = {
        field_id: "test",
        field_type: "text_input",
        label: "Test",
        required: true,
      };

      expect(isFieldRequired(field)).toBe(true);
    });

    it("should return false for non-required field", () => {
      const field: ParsedField = {
        field_id: "test",
        field_type: "text_input",
        label: "Test",
        required: false,
      };

      expect(isFieldRequired(field)).toBe(false);
    });

    it("should return false for field without required property", () => {
      const field = {
        field_id: "test",
        field_type: "text_input",
        label: "Test",
      } as ParsedField;

      expect(isFieldRequired(field)).toBe(false);
    });
  });

  // ============================================================================
  // evaluateConditional() Tests
  // ============================================================================
  describe("evaluateConditional", () => {
    it("should return false for null rule", () => {
      expect(evaluateConditional(null, {})).toBe(false);
    });

    it("should return false for undefined rule", () => {
      expect(evaluateConditional(undefined, {})).toBe(false);
    });

    describe("equals operator", () => {
      it("should return true when values are equal", () => {
        const rule: ConditionalRule = {
          field_id: "status",
          operator: "equals",
          value: "active",
        };
        const formValues: FormValues = { status: "active" };

        expect(evaluateConditional(rule, formValues)).toBe(true);
      });

      it("should return false when values are not equal", () => {
        const rule: ConditionalRule = {
          field_id: "status",
          operator: "equals",
          value: "active",
        };
        const formValues: FormValues = { status: "inactive" };

        expect(evaluateConditional(rule, formValues)).toBe(false);
      });

      it("should handle numeric equality", () => {
        const rule: ConditionalRule = {
          field_id: "count",
          operator: "equals",
          value: 5,
        };
        const formValues: FormValues = { count: 5 };

        expect(evaluateConditional(rule, formValues)).toBe(true);
      });

      it("should return false for undefined field value", () => {
        const rule: ConditionalRule = {
          field_id: "missing_field",
          operator: "equals",
          value: "test",
        };
        const formValues: FormValues = {};

        expect(evaluateConditional(rule, formValues)).toBe(false);
      });
    });

    describe("notEquals operator", () => {
      it("should return true when values are not equal", () => {
        const rule: ConditionalRule = {
          field_id: "status",
          operator: "notEquals",
          value: "active",
        };
        const formValues: FormValues = { status: "inactive" };

        expect(evaluateConditional(rule, formValues)).toBe(true);
      });

      it("should return false when values are equal", () => {
        const rule: ConditionalRule = {
          field_id: "status",
          operator: "notEquals",
          value: "active",
        };
        const formValues: FormValues = { status: "active" };

        expect(evaluateConditional(rule, formValues)).toBe(false);
      });

      it("should handle null/undefined values", () => {
        const rule: ConditionalRule = {
          field_id: "optional_field",
          operator: "notEquals",
          value: "test",
        };
        const formValues: FormValues = { optional_field: null };

        expect(evaluateConditional(rule, formValues)).toBe(true);
      });
    });

    describe("greaterThan operator", () => {
      it("should return true when field value is greater", () => {
        const rule: ConditionalRule = {
          field_id: "age",
          operator: "greaterThan",
          value: 18,
        };
        const formValues: FormValues = { age: 25 };

        expect(evaluateConditional(rule, formValues)).toBe(true);
      });

      it("should return false when field value is less or equal", () => {
        const rule: ConditionalRule = {
          field_id: "age",
          operator: "greaterThan",
          value: 18,
        };
        const formValues: FormValues = { age: 18 };

        expect(evaluateConditional(rule, formValues)).toBe(false);
      });

      it("should handle string numbers", () => {
        const rule: ConditionalRule = {
          field_id: "score",
          operator: "greaterThan",
          value: 75,
        };
        const formValues: FormValues = { score: "80" };

        expect(evaluateConditional(rule, formValues)).toBe(true);
      });

      it("should return false for non-numeric values", () => {
        const rule: ConditionalRule = {
          field_id: "text",
          operator: "greaterThan",
          value: 10,
        };
        const formValues: FormValues = { text: "not a number" };

        expect(evaluateConditional(rule, formValues)).toBe(false);
      });
    });

    describe("lessThan operator", () => {
      it("should return true when field value is less", () => {
        const rule: ConditionalRule = {
          field_id: "age",
          operator: "lessThan",
          value: 18,
        };
        const formValues: FormValues = { age: 15 };

        expect(evaluateConditional(rule, formValues)).toBe(true);
      });

      it("should return false when field value is greater or equal", () => {
        const rule: ConditionalRule = {
          field_id: "age",
          operator: "lessThan",
          value: 18,
        };
        const formValues: FormValues = { age: 20 };

        expect(evaluateConditional(rule, formValues)).toBe(false);
      });

      it("should handle negative numbers", () => {
        const rule: ConditionalRule = {
          field_id: "temperature",
          operator: "lessThan",
          value: 0,
        };
        const formValues: FormValues = { temperature: -5 };

        expect(evaluateConditional(rule, formValues)).toBe(true);
      });
    });

    describe("contains operator", () => {
      it("should return true when string contains substring (case-insensitive)", () => {
        const rule: ConditionalRule = {
          field_id: "description",
          operator: "contains",
          value: "important",
        };
        const formValues: FormValues = { description: "This is an IMPORTANT message" };

        expect(evaluateConditional(rule, formValues)).toBe(true);
      });

      it("should return false when string does not contain substring", () => {
        const rule: ConditionalRule = {
          field_id: "description",
          operator: "contains",
          value: "urgent",
        };
        const formValues: FormValues = { description: "This is a normal message" };

        expect(evaluateConditional(rule, formValues)).toBe(false);
      });

      it("should handle numeric values by converting to string", () => {
        const rule: ConditionalRule = {
          field_id: "code",
          operator: "contains",
          value: "123",
        };
        const formValues: FormValues = { code: 123456 };

        expect(evaluateConditional(rule, formValues)).toBe(true);
      });

      it("should return false for null/undefined values", () => {
        const rule: ConditionalRule = {
          field_id: "optional",
          operator: "contains",
          value: "test",
        };
        const formValues: FormValues = { optional: null };

        expect(evaluateConditional(rule, formValues)).toBe(false);
      });
    });

    describe("unknown operator", () => {
      it("should return false for unknown operator", () => {
        const rule = {
          field_id: "test",
          operator: "unknownOp",
          value: "test",
        } as unknown as ConditionalRule;
        const formValues: FormValues = { test: "test" };

        expect(evaluateConditional(rule, formValues)).toBe(false);
      });
    });
  });

  // ============================================================================
  // getVisibleFields() Tests
  // ============================================================================
  describe("getVisibleFields", () => {
    it("should return all fields when no conditional rules exist", () => {
      const schema: FormSchema = {
        fields: [
          {
            field_id: "field1",
            field_type: "text_input",
            label: "Field 1",
            required: false,
          },
          {
            field_id: "field2",
            field_type: "text_input",
            label: "Field 2",
            required: false,
          },
        ],
      };

      const visibleFields = getVisibleFields(schema, "default", {});

      expect(visibleFields).toHaveLength(2);
    });

    it("should filter fields based on conditional rules", () => {
      const schema = {
        fields: [
          {
            field_id: "field1",
            field_type: "text_input",
            label: "Field 1",
            required: false,
          },
          {
            field_id: "field2",
            field_type: "text_input",
            label: "Field 2",
            required: false,
            conditionalRules: [
              {
                field_id: "field1",
                operator: "equals",
                value: "show",
              },
            ],
          },
        ],
      } as unknown as FormSchema;

      // When field1 = "show", field2 should be visible
      const visibleFieldsWhenShow = getVisibleFields(schema, "default", {
        field1: "show",
      });
      expect(visibleFieldsWhenShow).toHaveLength(2);

      // When field1 != "show", field2 should be hidden
      const visibleFieldsWhenHide = getVisibleFields(schema, "default", {
        field1: "hide",
      });
      expect(visibleFieldsWhenHide).toHaveLength(1);
      expect(visibleFieldsWhenHide[0].field_id).toBe("field1");
    });

    it("should handle multiple conditional rules with AND logic", () => {
      const schema = {
        fields: [
          {
            field_id: "field1",
            field_type: "text_input",
            label: "Field 1",
            required: false,
          },
          {
            field_id: "field2",
            field_type: "number_input",
            label: "Field 2",
            required: false,
          },
          {
            field_id: "field3",
            field_type: "text_input",
            label: "Field 3",
            required: false,
            conditionalRules: [
              {
                field_id: "field1",
                operator: "equals",
                value: "active",
              },
              {
                field_id: "field2",
                operator: "greaterThan",
                value: 10,
              },
            ],
          },
        ],
      } as unknown as FormSchema;

      // Both conditions true - field3 visible
      const visibleWhenBothTrue = getVisibleFields(schema, "default", {
        field1: "active",
        field2: 15,
      });
      expect(visibleWhenBothTrue).toHaveLength(3);

      // First condition false - field3 hidden
      const visibleWhenFirstFalse = getVisibleFields(schema, "default", {
        field1: "inactive",
        field2: 15,
      });
      expect(visibleWhenFirstFalse).toHaveLength(2);
      expect(visibleWhenFirstFalse.find((f) => f.field_id === "field3")).toBeUndefined();

      // Second condition false - field3 hidden
      const visibleWhenSecondFalse = getVisibleFields(schema, "default", {
        field1: "active",
        field2: 5,
      });
      expect(visibleWhenSecondFalse).toHaveLength(2);
      expect(visibleWhenSecondFalse.find((f) => f.field_id === "field3")).toBeUndefined();
    });

    it("should return empty array for null schema", () => {
      expect(getVisibleFields(null, "default", {})).toEqual([]);
    });

    it("should return empty array for non-existent section", () => {
      const schema: FormSchema = {
        fields: [
          {
            field_id: "field1",
            field_type: "text_input",
            label: "Field 1",
            required: false,
          },
        ],
      };

      expect(getVisibleFields(schema, "non_existent", {})).toEqual([]);
    });
  });
});
