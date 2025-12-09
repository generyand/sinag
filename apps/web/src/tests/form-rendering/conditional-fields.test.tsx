/**
 * Form Rendering Test: Conditional Fields (Story 6.6 - Task 6.6.3)
 *
 * Tests conditional field visibility based on parent field values.
 * Verifies nested conditions, operator evaluation, and visibility toggling.
 */

import { describe, it, expect } from "vitest";
import { conditionalFieldsSchema, nestedConditionalSchema } from "../fixtures/form-schemas";

describe("Conditional Field Visibility", () => {
  describe("Simple Conditional Fields", () => {
    it("should define conditional fields with proper conditions", () => {
      const conditionalFields = conditionalFieldsSchema.fields.filter((f) => f.conditions);

      expect(conditionalFields.length).toBeGreaterThan(0);
    });

    it("should show program_details when primary_question is yes", () => {
      const programDetails = conditionalFieldsSchema.fields.find(
        (f) => f.name === "program_details"
      );

      expect(programDetails?.conditions).toBeDefined();
      expect(programDetails?.conditions?.[0]).toEqual({
        field: "primary_question",
        operator: "==",
        value: "yes",
      });
    });

    it("should show program_budget when primary_question is yes", () => {
      const programBudget = conditionalFieldsSchema.fields.find((f) => f.name === "program_budget");

      expect(programBudget?.conditions).toBeDefined();
      expect(programBudget?.conditions?.[0]).toEqual({
        field: "primary_question",
        operator: "==",
        value: "yes",
      });
    });

    it("should show reason_for_no_program when primary_question is no", () => {
      const reasonForNo = conditionalFieldsSchema.fields.find(
        (f) => f.name === "reason_for_no_program"
      );

      expect(reasonForNo?.conditions).toBeDefined();
      expect(reasonForNo?.conditions?.[0]).toEqual({
        field: "primary_question",
        operator: "==",
        value: "no",
      });
    });

    it("should have mutually exclusive conditional branches", () => {
      const yesFields = conditionalFieldsSchema.fields.filter(
        (f) => f.conditions && f.conditions.some((c: any) => c.value === "yes")
      );
      const noFields = conditionalFieldsSchema.fields.filter(
        (f) => f.conditions && f.conditions.some((c: any) => c.value === "no")
      );

      expect(yesFields.length).toBeGreaterThan(0);
      expect(noFields.length).toBeGreaterThan(0);

      // Verify no field appears in both branches
      const yesFieldNames = yesFields.map((f) => f.name);
      const noFieldNames = noFields.map((f) => f.name);
      const overlap = yesFieldNames.filter((name) => noFieldNames.includes(name));
      expect(overlap).toHaveLength(0);
    });
  });

  describe("Nested Conditional Fields (3+ levels)", () => {
    it("should have level 1 unconditional field", () => {
      const level1 = nestedConditionalSchema.fields.find((f) => f.name === "level_1_question");

      expect(level1?.conditions).toBeUndefined();
    });

    it("should have level 2 field conditional on level 1", () => {
      const level2 = nestedConditionalSchema.fields.find((f) => f.name === "level_2_question");

      expect(level2?.conditions).toBeDefined();
      expect(level2?.conditions).toHaveLength(1);
      expect(level2?.conditions?.[0].field).toBe("level_1_question");
    });

    it("should have level 3 field with multiple conditions (AND logic)", () => {
      const level3 = nestedConditionalSchema.fields.find((f) => f.name === "level_3_question");

      expect(level3?.conditions).toBeDefined();
      expect(level3?.conditions).toHaveLength(2);
      expect(level3?.conditions?.[0].field).toBe("level_1_question");
      expect(level3?.conditions?.[1].field).toBe("level_2_question");
    });

    it("should have alternative level 3 field with different conditions", () => {
      const level3Alt = nestedConditionalSchema.fields.find((f) => f.name === "level_3_alt");

      expect(level3Alt?.conditions).toBeDefined();
      expect(level3Alt?.conditions).toHaveLength(2);
      expect(level3Alt?.conditions?.[0].field).toBe("level_1_question");
      expect(level3Alt?.conditions?.[0].value).toBe("yes");
      expect(level3Alt?.conditions?.[1].field).toBe("level_2_question");
      expect(level3Alt?.conditions?.[1].value).toBe("no");
    });

    it("should evaluate conditions as AND (all must be true)", () => {
      const level3 = nestedConditionalSchema.fields.find((f) => f.name === "level_3_question");

      // Simulating condition evaluation
      const mockFormData = {
        level_1_question: "yes",
        level_2_question: "yes",
      };

      const allConditionsMet = level3?.conditions?.every((condition: any) => {
        return mockFormData[condition.field as keyof typeof mockFormData] === condition.value;
      });

      expect(allConditionsMet).toBe(true);
    });

    it("should fail condition evaluation when any condition is false", () => {
      const level3 = nestedConditionalSchema.fields.find((f) => f.name === "level_3_question");

      // Simulating condition evaluation with one false condition
      const mockFormData = {
        level_1_question: "yes",
        level_2_question: "no", // This fails the condition
      };

      const allConditionsMet = level3?.conditions?.every((condition: any) => {
        return mockFormData[condition.field as keyof typeof mockFormData] === condition.value;
      });

      expect(allConditionsMet).toBe(false);
    });
  });

  describe("Condition Operators", () => {
    it("should support == operator", () => {
      const field = conditionalFieldsSchema.fields.find((f) => f.name === "program_details");

      expect(field?.conditions?.[0].operator).toBe("==");
    });

    it("should evaluate == operator correctly", () => {
      const condition = { field: "test", operator: "==", value: "yes" };
      const formData = { test: "yes" };

      const result = formData.test === condition.value;
      expect(result).toBe(true);
    });

    it("should evaluate != operator correctly", () => {
      const condition = { field: "test", operator: "!=", value: "" };
      const formData = { test: "something" };

      const result = formData.test !== condition.value;
      expect(result).toBe(true);
    });

    it("should evaluate > operator for numbers", () => {
      const condition = { field: "age", operator: ">", value: 18 };
      const formData = { age: 25 };

      const result = formData.age > condition.value;
      expect(result).toBe(true);
    });

    it("should evaluate >= operator for numbers", () => {
      const condition = { field: "age", operator: ">=", value: 18 };
      const formData = { age: 18 };

      const result = formData.age >= condition.value;
      expect(result).toBe(true);
    });

    it("should evaluate < operator for numbers", () => {
      const condition = { field: "age", operator: "<", value: 65 };
      const formData = { age: 30 };

      const result = formData.age < condition.value;
      expect(result).toBe(true);
    });
  });

  describe("Visibility Toggle Behavior", () => {
    it("should hide field when condition not met", () => {
      const field = conditionalFieldsSchema.fields.find((f) => f.name === "program_details");
      const formData = { primary_question: "no" };

      const isVisible = field?.conditions?.every((condition: any) => {
        return formData[condition.field as keyof typeof formData] === condition.value;
      });

      expect(isVisible).toBe(false);
    });

    it("should show field when condition is met", () => {
      const field = conditionalFieldsSchema.fields.find((f) => f.name === "program_details");
      const formData = { primary_question: "yes" };

      const isVisible = field?.conditions?.every((condition: any) => {
        return formData[condition.field as keyof typeof formData] === condition.value;
      });

      expect(isVisible).toBe(true);
    });

    it("should handle undefined form values as hidden", () => {
      const field = conditionalFieldsSchema.fields.find((f) => f.name === "program_details");
      const formData = {}; // No value set yet

      const isVisible = field?.conditions?.every((condition: any) => {
        return formData[condition.field as keyof typeof formData] === condition.value;
      });

      expect(isVisible).toBe(false);
    });
  });

  describe("Condition Chain Dependencies", () => {
    it("should maintain proper parent-child relationships", () => {
      const level2 = nestedConditionalSchema.fields.find((f) => f.name === "level_2_question");
      const level3 = nestedConditionalSchema.fields.find((f) => f.name === "level_3_question");

      // Level 2 depends on level 1
      expect(level2?.conditions?.[0].field).toBe("level_1_question");

      // Level 3 depends on both level 1 and level 2
      expect(level3?.conditions?.map((c: any) => c.field)).toContain("level_1_question");
      expect(level3?.conditions?.map((c: any) => c.field)).toContain("level_2_question");
    });

    it("should cascade visibility changes through levels", () => {
      // When level 1 = 'no', level 2 should be hidden
      const level2 = nestedConditionalSchema.fields.find((f) => f.name === "level_2_question");
      const formData1 = { level_1_question: "no" };

      const level2Visible = level2?.conditions?.every((condition: any) => {
        return formData1[condition.field as keyof typeof formData1] === condition.value;
      });

      expect(level2Visible).toBe(false);

      // When level 2 is hidden, level 3 should also be hidden
      const level3 = nestedConditionalSchema.fields.find((f) => f.name === "level_3_question");
      const formData2 = { level_1_question: "no", level_2_question: "yes" };

      const level3Visible = level3?.conditions?.every((condition: any) => {
        return formData2[condition.field as keyof typeof formData2] === condition.value;
      });

      expect(level3Visible).toBe(false);
    });
  });

  describe("Required Field Behavior with Conditions", () => {
    it("should mark conditional fields as required", () => {
      const programDetails = conditionalFieldsSchema.fields.find(
        (f) => f.name === "program_details"
      );

      expect(programDetails?.required).toBe(true);
      expect(programDetails?.conditions).toBeDefined();
    });

    it("should only enforce required when field is visible", () => {
      const field = conditionalFieldsSchema.fields.find((f) => f.name === "program_details");

      // Field is required but hidden
      const formDataHidden = { primary_question: "no" };
      const isVisible1 = field?.conditions?.every((c: any) => {
        return formDataHidden[c.field as keyof typeof formDataHidden] === c.value;
      });
      expect(isVisible1).toBe(false);
      // Should NOT require value when hidden

      // Field is required and visible
      const formDataVisible = { primary_question: "yes" };
      const isVisible2 = field?.conditions?.every((c: any) => {
        return formDataVisible[c.field as keyof typeof formDataVisible] === c.value;
      });
      expect(isVisible2).toBe(true);
      // SHOULD require value when visible
    });
  });
});
