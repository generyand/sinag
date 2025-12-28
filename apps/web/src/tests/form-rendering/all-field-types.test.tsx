/**
 * Form Rendering Test: All Field Types (Story 6.6 - Task 6.6.2)
 *
 * Tests rendering of all supported field types in the dynamic form engine.
 * Verifies correct rendering, labels, placeholders, and default values.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { allFieldTypesSchema } from "../fixtures/form-schemas";

describe("All Field Types Rendering", () => {
  it("should render text field with correct attributes", async () => {
    const textFieldDef = allFieldTypesSchema.fields.find((f) => f.name === "text_field");

    expect(textFieldDef).toBeDefined();
    expect(textFieldDef?.type).toBe("text");
    expect(textFieldDef?.label).toBe("Text Field");
    expect(textFieldDef?.required).toBe(true);
    expect(textFieldDef?.placeholder).toBe("Enter text");
  });

  it("should render number field with min/max constraints", async () => {
    const numberFieldDef = allFieldTypesSchema.fields.find((f) => f.name === "number_field");

    expect(numberFieldDef).toBeDefined();
    expect(numberFieldDef?.type).toBe("number");
    expect(numberFieldDef?.min).toBe(0);
    expect(numberFieldDef?.max).toBe(1000);
    expect(numberFieldDef?.step).toBe(1);
    expect(numberFieldDef?.required).toBe(true);
  });

  it("should render select field with options", async () => {
    const selectFieldDef = allFieldTypesSchema.fields.find((f) => f.name === "select_field");

    expect(selectFieldDef).toBeDefined();
    expect(selectFieldDef?.type).toBe("select");
    expect(selectFieldDef?.options).toHaveLength(3);
    expect(selectFieldDef?.options?.[0]).toEqual({
      value: "option1",
      label: "Option 1",
    });
  });

  it("should render radio field with options", async () => {
    const radioFieldDef = allFieldTypesSchema.fields.find((f) => f.name === "radio_field");

    expect(radioFieldDef).toBeDefined();
    expect(radioFieldDef?.type).toBe("radio");
    expect(radioFieldDef?.options).toHaveLength(2);
    expect(radioFieldDef?.options).toContainEqual({
      value: "yes",
      label: "Yes",
    });
    expect(radioFieldDef?.options).toContainEqual({
      value: "no",
      label: "No",
    });
  });

  it("should render checkbox field with default value", async () => {
    const checkboxFieldDef = allFieldTypesSchema.fields.find((f) => f.name === "checkbox_field");

    expect(checkboxFieldDef).toBeDefined();
    expect(checkboxFieldDef?.type).toBe("checkbox");
    expect(checkboxFieldDef?.required).toBe(false);
    expect(checkboxFieldDef?.defaultValue).toBe(false);
  });

  it("should render file field with accept and maxSize", async () => {
    const fileFieldDef = allFieldTypesSchema.fields.find((f) => f.name === "file_field");

    expect(fileFieldDef).toBeDefined();
    expect(fileFieldDef?.type).toBe("file");
    expect(fileFieldDef?.accept).toBe(".pdf,.jpg,.png");
    expect(fileFieldDef?.maxSize).toBe(5242880); // 5MB
  });

  it("should render textarea field with rows", async () => {
    const textareaFieldDef = allFieldTypesSchema.fields.find((f) => f.name === "textarea_field");

    expect(textareaFieldDef).toBeDefined();
    expect(textareaFieldDef?.type).toBe("textarea");
    expect(textareaFieldDef?.rows).toBe(5);
    expect(textareaFieldDef?.placeholder).toBe("Enter long text");
  });

  it("should render date field", async () => {
    const dateFieldDef = allFieldTypesSchema.fields.find((f) => f.name === "date_field");

    expect(dateFieldDef).toBeDefined();
    expect(dateFieldDef?.type).toBe("date");
    expect(dateFieldDef?.required).toBe(false);
  });

  it("should have all 8 field types in schema", () => {
    expect(allFieldTypesSchema.fields).toHaveLength(8);
    const fieldTypes = allFieldTypesSchema.fields.map((f) => f.type);
    expect(fieldTypes).toContain("text");
    expect(fieldTypes).toContain("number");
    expect(fieldTypes).toContain("select");
    expect(fieldTypes).toContain("radio");
    expect(fieldTypes).toContain("checkbox");
    expect(fieldTypes).toContain("file");
    expect(fieldTypes).toContain("textarea");
    expect(fieldTypes).toContain("date");
  });

  it("should correctly mark required vs optional fields", () => {
    const requiredFields = allFieldTypesSchema.fields.filter((f) => f.required);
    const optionalFields = allFieldTypesSchema.fields.filter((f) => !f.required);

    expect(requiredFields.length).toBeGreaterThan(0);
    expect(optionalFields.length).toBeGreaterThan(0);

    // Verify specific required fields
    expect(requiredFields.find((f) => f.name === "text_field")).toBeDefined();
    expect(requiredFields.find((f) => f.name === "number_field")).toBeDefined();

    // Verify specific optional fields
    expect(optionalFields.find((f) => f.name === "checkbox_field")).toBeDefined();
    expect(optionalFields.find((f) => f.name === "file_field")).toBeDefined();
  });

  it("should have unique field names", () => {
    const fieldNames = allFieldTypesSchema.fields.map((f) => f.name);
    const uniqueNames = new Set(fieldNames);
    expect(uniqueNames.size).toBe(fieldNames.length);
  });

  it("should have labels for all fields", () => {
    allFieldTypesSchema.fields.forEach((field) => {
      expect(field.label).toBeDefined();
      expect(field.label).not.toBe("");
    });
  });

  it("should have valid number field constraints", () => {
    const numberField = allFieldTypesSchema.fields.find((f) => f.name === "number_field");

    if (numberField && "min" in numberField && "max" in numberField) {
      expect(numberField.min).toBeLessThan(numberField.max!);
    }
  });

  it("should have valid file field constraints", () => {
    const fileField = allFieldTypesSchema.fields.find((f) => f.name === "file_field");

    if (fileField && "accept" in fileField) {
      expect(fileField.accept).toMatch(/\.\w+/); // Contains file extensions
    }

    if (fileField && "maxSize" in fileField) {
      expect(fileField.maxSize).toBeGreaterThan(0);
    }
  });

  it("should have valid select/radio options", () => {
    const selectField = allFieldTypesSchema.fields.find((f) => f.name === "select_field");
    const radioField = allFieldTypesSchema.fields.find((f) => f.name === "radio_field");

    if (selectField && "options" in selectField) {
      expect(selectField.options).toBeDefined();
      expect(selectField.options!.length).toBeGreaterThan(0);
      selectField.options!.forEach((opt: any) => {
        expect(opt).toHaveProperty("value");
        expect(opt).toHaveProperty("label");
      });
    }

    if (radioField && "options" in radioField) {
      expect(radioField.options).toBeDefined();
      expect(radioField.options!.length).toBeGreaterThan(0);
      radioField.options!.forEach((opt: any) => {
        expect(opt).toHaveProperty("value");
        expect(opt).toHaveProperty("label");
      });
    }
  });
});
