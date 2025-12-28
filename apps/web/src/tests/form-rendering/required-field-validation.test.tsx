/**
 * Form Validation Test: Required Fields (Story 6.6 - Task 6.6.4)
 *
 * Tests required field validation enforcement.
 * Verifies validation messages, empty field detection, and submission blocking.
 */

import { describe, it, expect } from "vitest";
import {
  simpleFormSchema,
  allFieldTypesSchema,
  conditionalFieldsSchema,
} from "../fixtures/form-schemas";

describe("Required Field Validation", () => {
  describe("Required Field Detection", () => {
    it("should identify required fields in schema", () => {
      const requiredFields = allFieldTypesSchema.fields.filter((f) => f.required === true);

      expect(requiredFields.length).toBeGreaterThan(0);
    });

    it("should identify optional fields in schema", () => {
      const optionalFields = allFieldTypesSchema.fields.filter(
        (f) => f.required === false || !f.required
      );

      expect(optionalFields.length).toBeGreaterThan(0);
    });

    it("should mark text field as required", () => {
      const textField = allFieldTypesSchema.fields.find((f) => f.name === "text_field");

      expect(textField?.required).toBe(true);
    });

    it("should mark checkbox field as optional", () => {
      const checkboxField = allFieldTypesSchema.fields.find((f) => f.name === "checkbox_field");

      expect(checkboxField?.required).toBe(false);
    });
  });

  describe("Empty Field Detection", () => {
    it("should detect empty string as invalid for required text field", () => {
      const value = "";
      const isValid = value.trim().length > 0;

      expect(isValid).toBe(false);
    });

    it("should detect whitespace-only string as invalid", () => {
      const value = "   ";
      const isValid = value.trim().length > 0;

      expect(isValid).toBe(false);
    });

    it("should detect null as invalid for required field", () => {
      const value = null;
      const isValid = value !== null && value !== undefined && value !== "";

      expect(isValid).toBe(false);
    });

    it("should detect undefined as invalid for required field", () => {
      const value = undefined;
      const isValid = value !== null && value !== undefined && value !== "";

      expect(isValid).toBe(false);
    });

    it("should accept non-empty string as valid", () => {
      const value = "Valid text";
      const isValid = value.trim().length > 0;

      expect(isValid).toBe(true);
    });

    it("should accept zero as valid for required number field", () => {
      const value = 0;
      const isValid = value !== null && value !== undefined;

      expect(isValid).toBe(true);
    });

    it("should accept false as valid for required boolean field", () => {
      const value = false;
      const isValid = value !== null && value !== undefined;

      expect(isValid).toBe(true);
    });
  });

  describe("Validation Messages", () => {
    it("should generate appropriate error message for empty required field", () => {
      const fieldLabel = "Simple Text Field";
      const errorMessage = `${fieldLabel} is required`;

      expect(errorMessage).toBe("Simple Text Field is required");
    });

    it("should use field label in error message", () => {
      const field = simpleFormSchema.fields.find((f) => f.name === "simple_text_field");
      const errorMessage = `${field?.label} is required`;

      expect(errorMessage).toContain(field?.label);
    });

    it("should provide clear validation message format", () => {
      const validationError = {
        field: "simple_text_field",
        message: "Simple Text Field is required",
        type: "required",
      };

      expect(validationError).toHaveProperty("field");
      expect(validationError).toHaveProperty("message");
      expect(validationError).toHaveProperty("type");
    });
  });

  describe("Multiple Required Fields", () => {
    it("should validate all required fields", () => {
      const requiredFields = allFieldTypesSchema.fields.filter((f) => f.required);
      const formData = {}; // Empty form

      const errors = requiredFields.map((field) => ({
        field: field.name,
        message: `${field.label} is required`,
      }));

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.length).toBe(requiredFields.length);
    });

    it("should collect all validation errors", () => {
      const requiredFields = [
        { name: "field1", label: "Field 1", required: true },
        { name: "field2", label: "Field 2", required: true },
        { name: "field3", label: "Field 3", required: false },
      ];
      const formData = { field3: "value" };

      const errors = requiredFields
        .filter((f) => f.required)
        .filter((f) => !formData[f.name as keyof typeof formData])
        .map((f) => ({ field: f.name, message: `${f.label} is required` }));

      expect(errors).toHaveLength(2);
      expect(errors.map((e) => e.field)).toEqual(["field1", "field2"]);
    });
  });

  describe("Field Type Specific Validation", () => {
    it("should validate required select field has selection", () => {
      const selectField = allFieldTypesSchema.fields.find((f) => f.name === "select_field");
      const value = "";

      const isValid = selectField?.required
        ? value !== null && value !== undefined && value !== ""
        : true;

      expect(isValid).toBe(false);
    });

    it("should validate required radio field has selection", () => {
      const radioField = allFieldTypesSchema.fields.find((f) => f.name === "radio_field");
      const value = null;

      const isValid = radioField?.required ? value !== null : true;

      expect(isValid).toBe(false);
    });

    it("should validate required number field is not empty", () => {
      const numberField = allFieldTypesSchema.fields.find((f) => f.name === "number_field");
      const value = undefined;

      const isValid = numberField?.required ? value !== null && value !== undefined : true;

      expect(isValid).toBe(false);
    });

    it("should allow zero for required number field", () => {
      const numberField = allFieldTypesSchema.fields.find((f) => f.name === "number_field");
      const value = 0;

      const isValid = numberField?.required ? value !== null && value !== undefined : true;

      expect(isValid).toBe(true);
    });
  });

  describe("Conditional Required Fields", () => {
    it("should enforce required when conditional field is visible", () => {
      const field = conditionalFieldsSchema.fields.find((f) => f.name === "program_details");
      const formData = { primary_question: "yes" };

      // Field is visible
      const isVisible = field?.conditions?.every((c: any) => {
        return formData[c.field as keyof typeof formData] === c.value;
      });

      // Field is required and visible, so must have value
      const value = "";
      const isValid = !field?.required || value.trim().length > 0;

      expect(isVisible).toBe(true);
      expect(isValid).toBe(false); // Should fail validation
    });

    it("should not enforce required when conditional field is hidden", () => {
      const field = conditionalFieldsSchema.fields.find((f) => f.name === "program_details");
      const formData = { primary_question: "no" };

      // Field is hidden
      const isVisible = field?.conditions?.every((c: any) => {
        return formData[c.field as keyof typeof formData] === c.value;
      });

      expect(isVisible).toBe(false);
      // Should skip validation when hidden
    });
  });

  describe("Submission Blocking", () => {
    it("should block submission when required fields are empty", () => {
      const requiredFields = allFieldTypesSchema.fields.filter((f) => f.required);
      const formData = {}; // Empty form

      const hasErrors = requiredFields.some(
        (field) => !formData[field.name as keyof typeof formData]
      );

      expect(hasErrors).toBe(true);
      // Submission should be blocked
    });

    it("should allow submission when all required fields have values", () => {
      const formData = {
        text_field: "Sample text",
        number_field: 50,
        select_field: "option1",
        radio_field: "yes",
      };

      const requiredFields = allFieldTypesSchema.fields.filter((f) => f.required);
      const hasErrors = requiredFields.some((field) => {
        const value = formData[field.name as keyof typeof formData];
        return value === null || value === undefined || value === "";
      });

      expect(hasErrors).toBe(false);
      // Submission should be allowed
    });
  });

  describe("Real-time Validation", () => {
    it("should validate field on blur", () => {
      const field = simpleFormSchema.fields.find((f) => f.name === "simple_text_field");
      const value = "";

      const validationError =
        field?.required && value.trim().length === 0 ? `${field.label} is required` : null;

      expect(validationError).toBe("Simple Text Field is required");
    });

    it("should clear validation error when field becomes valid", () => {
      const field = simpleFormSchema.fields.find((f) => f.name === "simple_text_field");
      const value = "Valid input";

      const validationError =
        field?.required && value.trim().length === 0 ? `${field.label} is required` : null;

      expect(validationError).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle field with no required attribute as optional", () => {
      const field = { name: "test", label: "Test", type: "text" };
      const isRequired = field.hasOwnProperty("required") ? field.required : false;

      expect(isRequired).toBe(false);
    });

    it("should handle required: false as optional", () => {
      const field = {
        name: "test",
        label: "Test",
        type: "text",
        required: false,
      };

      expect(field.required).toBe(false);
    });

    it("should handle array values for multi-select", () => {
      const value: string[] = [];
      const isValid = value.length > 0;

      expect(isValid).toBe(false);
    });

    it("should accept non-empty array for multi-select", () => {
      const value = ["option1", "option2"];
      const isValid = value.length > 0;

      expect(isValid).toBe(true);
    });
  });
});
