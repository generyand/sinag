"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormField } from "@/store/useFormBuilderStore";
import { useFormBuilderStore } from "@/store/useFormBuilderStore";
import type { FieldOption } from "@sinag/shared";
import { Eye } from "lucide-react";

/**
 * FormPreview Component
 *
 * Displays a read-only preview of how the form will appear to BLGU users.
 *
 * Features:
 * - Renders all field types with proper UI components
 * - Shows labels, placeholders, help text
 * - Displays required indicators (*)
 * - Shows validation rules visually
 * - Non-interactive (read-only)
 * - Responsive layout
 */
export function FormPreview() {
  const { fields } = useFormBuilderStore();

  if (fields.length === 0) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Eye className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-sm font-medium text-gray-900">No fields to preview</h3>
          <p className="mt-2 text-sm text-gray-500">
            Add fields using the builder to see the preview
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Preview Header */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900">Form Preview</h3>
            <p className="mt-1 text-xs text-blue-700">
              This is how the form will appear to BLGU users. Fields are read-only in preview mode.
            </p>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {fields.map((field) => (
          <PreviewField key={field.field_id} field={field} />
        ))}
      </div>
    </div>
  );
}

/**
 * PreviewField Component
 *
 * Renders a single field in preview mode based on its type.
 */
function PreviewField({ field }: { field: FormField }) {
  const renderField = () => {
    switch (field.field_type) {
      case "checkbox_group":
        return (
          <div className="space-y-3">
            {"options" in field &&
              field.options?.map((option: FieldOption) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox id={`${field.field_id}-${option.value}`} disabled />
                  <label
                    htmlFor={`${field.field_id}-${option.value}`}
                    className="text-sm text-gray-700"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
          </div>
        );

      case "radio_button":
        return (
          <div className="space-y-3">
            {"options" in field &&
              field.options?.map((option: FieldOption) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`${field.field_id}-${option.value}`}
                    name={field.field_id}
                    disabled
                    className="h-4 w-4 border-gray-300 text-blue-600"
                  />
                  <label
                    htmlFor={`${field.field_id}-${option.value}`}
                    className="text-sm text-gray-700"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
          </div>
        );

      case "number_input":
        return (
          <div className="space-y-2">
            <Input
              type="number"
              placeholder={"placeholder" in field ? (field.placeholder ?? undefined) : undefined}
              disabled
              className="bg-gray-50"
            />
            <FieldConstraints field={field} />
          </div>
        );

      case "text_input":
        return (
          <div className="space-y-2">
            <Input
              type="text"
              placeholder={"placeholder" in field ? (field.placeholder ?? undefined) : undefined}
              disabled
              className="bg-gray-50"
            />
            <FieldConstraints field={field} />
          </div>
        );

      case "text_area":
        return (
          <div className="space-y-2">
            <Textarea
              placeholder={"placeholder" in field ? (field.placeholder ?? undefined) : undefined}
              rows={"rows" in field ? (field.rows ?? 4) : 4}
              disabled
              className="bg-gray-50"
            />
            <FieldConstraints field={field} />
          </div>
        );

      case "date_picker":
        return (
          <div className="space-y-2">
            <Input type="date" disabled className="bg-gray-50" />
            <FieldConstraints field={field} />
          </div>
        );

      case "file_upload":
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-600">Upload file</p>
              </div>
            </div>
            <FieldConstraints field={field} />
            {"conditional_mov_requirement" in field && field.conditional_mov_requirement && (
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-xs text-amber-900">
                  <strong>Conditional MOV:</strong> Required if{" "}
                  <code className="rounded bg-amber-100 px-1 py-0.5">
                    {field.conditional_mov_requirement.field_id}
                  </code>{" "}
                  {field.conditional_mov_requirement.operator === "equals" ? "=" : "≠"} "
                  {field.conditional_mov_requirement.value}"
                </p>
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-sm text-gray-500">Unsupported field type: {field.field_type}</p>;
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      {/* Field Label */}
      <Label className="text-base font-medium text-gray-900">
        {field.label}
        {field.required && <span className="ml-1 text-red-600">*</span>}
      </Label>

      {/* Help Text */}
      {field.help_text && <p className="mt-1 text-sm text-gray-500">{field.help_text}</p>}

      {/* Field Input */}
      <div className="mt-3">{renderField()}</div>

      {/* Field ID Badge */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-mono text-gray-600">
          {field.field_id}
        </span>
      </div>
    </div>
  );
}

/**
 * FieldConstraints Component
 *
 * Displays validation rules and constraints for a field.
 */
function FieldConstraints({ field }: { field: FormField }) {
  const constraints: string[] = [];

  if ("min_value" in field && field.min_value !== undefined) {
    constraints.push(`Min: ${field.min_value}`);
  }
  if ("max_value" in field && field.max_value !== undefined) {
    constraints.push(`Max: ${field.max_value}`);
  }
  if ("max_length" in field && field.max_length !== undefined) {
    constraints.push(`Max length: ${field.max_length}`);
  }
  if ("min_date" in field && field.min_date) {
    constraints.push(`Min date: ${field.min_date}`);
  }
  if ("max_date" in field && field.max_date) {
    constraints.push(`Max date: ${field.max_date}`);
  }
  if ("allowed_file_types" in field && field.allowed_file_types) {
    constraints.push(`Allowed: ${field.allowed_file_types.join(", ")}`);
  }
  if ("max_file_size_mb" in field && field.max_file_size_mb) {
    constraints.push(`Max size: ${field.max_file_size_mb}MB`);
  }

  if (constraints.length === 0) {
    return null;
  }

  return <p className="text-xs text-gray-500">{constraints.join(" • ")}</p>;
}
