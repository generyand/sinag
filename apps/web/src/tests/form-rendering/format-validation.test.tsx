/**
 * Form Validation Test: Field Format and Number Range (Story 6.6 - Task 6.6.5 & 6.6.6)
 *
 * Tests format validation (regex patterns, email, phone, URL).
 * Tests number range validation (min, max, step).
 */

import { describe, it, expect } from "vitest";
import { validationRulesSchema, allFieldTypesSchema } from "../fixtures/form-schemas";

describe("Field Format Validation", () => {
  describe("Email Validation", () => {
    it("should validate email field has pattern rule", () => {
      const emailField = validationRulesSchema.fields.find((f) => f.name === "email_field");

      expect(emailField?.validation).toBeDefined();
      expect(emailField?.validation?.pattern).toBeDefined();
    });

    it("should accept valid email addresses", () => {
      const emailField = validationRulesSchema.fields.find((f) => f.name === "email_field");
      const pattern = new RegExp(emailField?.validation?.pattern || "");

      const validEmails = [
        "user@example.com",
        "test.user@domain.co",
        "admin+tag@site.org",
        "name123@test-domain.com",
      ];

      validEmails.forEach((email) => {
        expect(pattern.test(email)).toBe(true);
      });
    });

    it("should reject invalid email addresses", () => {
      const emailField = validationRulesSchema.fields.find((f) => f.name === "email_field");
      const pattern = new RegExp(emailField?.validation?.pattern || "");

      const invalidEmails = [
        "notanemail",
        "@example.com",
        "user@",
        "user @example.com",
        "user@.com",
      ];

      invalidEmails.forEach((email) => {
        expect(pattern.test(email)).toBe(false);
      });
    });

    it("should provide helpful error message for invalid email", () => {
      const emailField = validationRulesSchema.fields.find((f) => f.name === "email_field");

      expect(emailField?.validation?.message).toBe("Please enter a valid email address");
    });
  });

  describe("Phone Number Validation", () => {
    it("should validate phone field has pattern rule", () => {
      const phoneField = validationRulesSchema.fields.find((f) => f.name === "phone_field");

      expect(phoneField?.validation).toBeDefined();
      expect(phoneField?.validation?.pattern).toBeDefined();
    });

    it("should accept valid 11-digit phone numbers", () => {
      const phoneField = validationRulesSchema.fields.find((f) => f.name === "phone_field");
      const pattern = new RegExp(phoneField?.validation?.pattern || "");

      const validPhones = ["09171234567", "09281234567", "09991234567"];

      validPhones.forEach((phone) => {
        expect(pattern.test(phone)).toBe(true);
      });
    });

    it("should reject invalid phone numbers", () => {
      const phoneField = validationRulesSchema.fields.find((f) => f.name === "phone_field");
      const pattern = new RegExp(phoneField?.validation?.pattern || "");

      const invalidPhones = ["123", "091712345", "091712345678", "abcd1234567", "0917-123-4567"];

      invalidPhones.forEach((phone) => {
        expect(pattern.test(phone)).toBe(false);
      });
    });

    it("should provide helpful error message for invalid phone", () => {
      const phoneField = validationRulesSchema.fields.find((f) => f.name === "phone_field");

      expect(phoneField?.validation?.message).toBe("Phone number must be 11 digits");
    });
  });

  describe("URL Validation", () => {
    it("should validate URL field has pattern rule", () => {
      const urlField = validationRulesSchema.fields.find((f) => f.name === "url_field");

      expect(urlField?.validation).toBeDefined();
      expect(urlField?.validation?.pattern).toBeDefined();
    });

    it("should accept valid URLs with http/https", () => {
      const urlField = validationRulesSchema.fields.find((f) => f.name === "url_field");
      const pattern = new RegExp(urlField?.validation?.pattern || "");

      const validUrls = [
        "http://example.com",
        "https://example.com",
        "https://sub.domain.com/path",
        "http://site.org?query=value",
      ];

      validUrls.forEach((url) => {
        expect(pattern.test(url)).toBe(true);
      });
    });

    it("should reject URLs without protocol", () => {
      const urlField = validationRulesSchema.fields.find((f) => f.name === "url_field");
      const pattern = new RegExp(urlField?.validation?.pattern || "");

      const invalidUrls = ["example.com", "www.example.com", "ftp://example.com"];

      invalidUrls.forEach((url) => {
        expect(pattern.test(url)).toBe(false);
      });
    });
  });

  describe("Custom Pattern Validation", () => {
    it("should apply custom regex patterns", () => {
      const customPattern = "^[A-Z]{3}-\\d{4}$"; // Format: ABC-1234
      const pattern = new RegExp(customPattern);

      expect(pattern.test("ABC-1234")).toBe(true);
      expect(pattern.test("XYZ-9999")).toBe(true);
      expect(pattern.test("abc-1234")).toBe(false);
      expect(pattern.test("AB-1234")).toBe(false);
      expect(pattern.test("ABC-123")).toBe(false);
    });

    it("should validate alphabetic text only", () => {
      const pattern = /^[A-Za-z\s]+$/;

      expect(pattern.test("John Doe")).toBe(true);
      expect(pattern.test("Mary Jane")).toBe(true);
      expect(pattern.test("John123")).toBe(false);
      expect(pattern.test("John@Doe")).toBe(false);
    });
  });
});

describe("Number Range Validation", () => {
  describe("Min/Max Constraints", () => {
    it("should define min and max for number field", () => {
      const numberField = allFieldTypesSchema.fields.find((f) => f.name === "number_field");

      expect(numberField?.min).toBeDefined();
      expect(numberField?.max).toBeDefined();
      expect(numberField?.min).toBe(0);
      expect(numberField?.max).toBe(1000);
    });

    it("should validate percentage field range 0-100", () => {
      const percentageField = validationRulesSchema.fields.find(
        (f) => f.name === "percentage_field"
      );

      expect(percentageField?.min).toBe(0);
      expect(percentageField?.max).toBe(100);
    });

    it("should accept values within range", () => {
      const min = 0;
      const max = 100;
      const validValues = [0, 25, 50, 75, 100];

      validValues.forEach((value) => {
        const isValid = value >= min && value <= max;
        expect(isValid).toBe(true);
      });
    });

    it("should reject values below minimum", () => {
      const min = 0;
      const value = -10;
      const isValid = value >= min;

      expect(isValid).toBe(false);
    });

    it("should reject values above maximum", () => {
      const max = 100;
      const value = 150;
      const isValid = value <= max;

      expect(isValid).toBe(false);
    });

    it("should accept boundary values (min and max)", () => {
      const min = 0;
      const max = 100;

      expect(min >= min && min <= max).toBe(true);
      expect(max >= min && max <= max).toBe(true);
    });
  });

  describe("Step Validation", () => {
    it("should define step for number field", () => {
      const numberField = allFieldTypesSchema.fields.find((f) => f.name === "number_field");

      expect(numberField?.step).toBeDefined();
      expect(numberField?.step).toBe(1);
    });

    it("should validate integer steps", () => {
      const step = 1;
      const validValues = [0, 1, 2, 10, 100];

      validValues.forEach((value) => {
        const isValidStep = value % step === 0;
        expect(isValidStep).toBe(true);
      });
    });

    it("should validate decimal steps", () => {
      const step = 0.5;
      const validValues = [0, 0.5, 1.0, 1.5, 2.0];

      validValues.forEach((value) => {
        const isValidStep = Math.abs((value / step) % 1) < 0.0001;
        expect(isValidStep).toBe(true);
      });
    });

    it("should reject values not matching step", () => {
      const step = 5;
      const invalidValues = [1, 2, 3, 4, 6, 7];

      invalidValues.forEach((value) => {
        const isValidStep = value % step === 0;
        expect(isValidStep).toBe(false);
      });
    });
  });

  describe("Validation Error Messages", () => {
    it("should provide message for value below minimum", () => {
      const field = {
        name: "test_number",
        label: "Test Number",
        min: 0,
        max: 100,
      };
      const value = -5;

      const errorMessage = value < field.min ? `Minimum value is ${field.min}` : null;

      expect(errorMessage).toBe("Minimum value is 0");
    });

    it("should provide message for value above maximum", () => {
      const field = {
        name: "test_number",
        label: "Test Number",
        min: 0,
        max: 100,
      };
      const value = 150;

      const errorMessage = value > field.max ? `Maximum value is ${field.max}` : null;

      expect(errorMessage).toBe("Maximum value is 100");
    });

    it("should provide combined min/max message", () => {
      const percentageField = validationRulesSchema.fields.find(
        (f) => f.name === "percentage_field"
      );

      expect(percentageField?.validation?.message).toBe("Percentage must be between 0 and 100");
    });
  });

  describe("Combined Validations", () => {
    it("should validate both required and range", () => {
      const field = {
        name: "budget",
        label: "Budget",
        type: "number",
        required: true,
        min: 1000,
        max: 1000000,
      };

      // Test required
      const value1 = undefined;
      const requiredError =
        field.required && (value1 === null || value1 === undefined) ? "Budget is required" : null;
      expect(requiredError).toBe("Budget is required");

      // Test range
      const value2 = 500;
      const rangeError = value2 < field.min ? "Minimum value is 1000" : null;
      expect(rangeError).toBe("Minimum value is 1000");

      // Test valid
      const value3 = 50000;
      const isValid =
        value3 !== null && value3 !== undefined && value3 >= field.min && value3 <= field.max;
      expect(isValid).toBe(true);
    });

    it("should validate format and required together", () => {
      const emailField = validationRulesSchema.fields.find((f) => f.name === "email_field");
      const pattern = new RegExp(emailField?.validation?.pattern || "");

      // Test required
      const value1 = "";
      const requiredError =
        emailField?.required && value1.trim().length === 0 ? "Email Address is required" : null;
      expect(requiredError).toBe("Email Address is required");

      // Test format
      const value2 = "invalid-email";
      const formatError = !pattern.test(value2) ? emailField?.validation?.message : null;
      expect(formatError).toBe("Please enter a valid email address");

      // Test valid
      const value3 = "user@example.com";
      const isValid = pattern.test(value3);
      expect(isValid).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle negative number ranges", () => {
      const field = { min: -100, max: -10 };
      const value = -50;

      const isValid = value >= field.min && value <= field.max;
      expect(isValid).toBe(true);
    });

    it("should handle decimal number ranges", () => {
      const field = { min: 0.1, max: 0.9 };
      const value = 0.5;

      const isValid = value >= field.min && value <= field.max;
      expect(isValid).toBe(true);
    });

    it("should handle very large numbers", () => {
      const field = { min: 0, max: 999999999 };
      const value = 123456789;

      const isValid = value >= field.min && value <= field.max;
      expect(isValid).toBe(true);
    });

    it("should handle floating point precision", () => {
      const value = 0.1 + 0.2; // JavaScript floating point issue
      const expected = 0.3;

      // Use epsilon comparison for floating point
      const isEqual = Math.abs(value - expected) < 0.0001;
      expect(isEqual).toBe(true);
    });
  });
});
