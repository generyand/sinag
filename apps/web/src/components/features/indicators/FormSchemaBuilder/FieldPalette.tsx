"use client";

import { CheckSquare, Circle, Hash, Type, AlignLeft, Calendar, Upload } from "lucide-react";
import { useFormBuilderStore, generateFieldId } from "@/store/useFormBuilderStore";
import type { FormField } from "@/store/useFormBuilderStore";

/**
 * Field type definitions with metadata for the palette
 */
const FIELD_TYPES = [
  // Selection Category
  {
    category: "Selection",
    fields: [
      {
        type: "checkbox_group",
        label: "Checkbox Group",
        icon: CheckSquare,
        description: "Multiple selection with checkboxes",
        colorStyle: {
          backgroundColor: "rgb(59, 130, 246, 0.1)",
          color: "rgb(59, 130, 246)",
          borderColor: "rgb(59, 130, 246, 0.3)",
        },
      },
      {
        type: "radio_button",
        label: "Radio Button",
        icon: Circle,
        description: "Single selection with radio buttons",
        colorStyle: {
          backgroundColor: "rgb(147, 51, 234, 0.1)",
          color: "rgb(147, 51, 234)",
          borderColor: "rgb(147, 51, 234, 0.3)",
        },
      },
    ],
  },
  // Input Category
  {
    category: "Input",
    fields: [
      {
        type: "number_input",
        label: "Number Input",
        icon: Hash,
        description: "Numeric input field with validation",
        colorStyle: {
          backgroundColor: "rgb(34, 197, 94, 0.1)",
          color: "rgb(34, 197, 94)",
          borderColor: "rgb(34, 197, 94, 0.3)",
        },
      },
      {
        type: "text_input",
        label: "Text Input",
        icon: Type,
        description: "Single-line text field",
        colorStyle: {
          backgroundColor: "rgb(249, 115, 22, 0.1)",
          color: "rgb(249, 115, 22)",
          borderColor: "rgb(249, 115, 22, 0.3)",
        },
      },
      {
        type: "text_area",
        label: "Text Area",
        icon: AlignLeft,
        description: "Multi-line text field",
        colorStyle: {
          backgroundColor: "rgb(234, 179, 8, 0.1)",
          color: "rgb(234, 179, 8)",
          borderColor: "rgb(234, 179, 8, 0.3)",
        },
      },
      {
        type: "date_picker",
        label: "Date Picker",
        icon: Calendar,
        description: "Date selection field",
        colorStyle: {
          backgroundColor: "rgb(99, 102, 241, 0.1)",
          color: "rgb(99, 102, 241)",
          borderColor: "rgb(99, 102, 241, 0.3)",
        },
      },
    ],
  },
  // Upload Category
  {
    category: "Upload",
    fields: [
      {
        type: "file_upload",
        label: "File Upload",
        icon: Upload,
        description: "File upload field with MOV support",
        colorStyle: {
          backgroundColor: "rgb(239, 68, 68, 0.1)",
          color: "rgb(239, 68, 68)",
          borderColor: "rgb(239, 68, 68, 0.3)",
        },
      },
    ],
  },
];

/**
 * Create default field data based on field type
 */
function createDefaultField(fieldType: string, fieldId: string): FormField {
  const baseField = {
    field_id: fieldId,
    label: `New ${fieldType.replace("_", " ")}`,
    required: true,
  };

  switch (fieldType) {
    case "checkbox_group":
      return {
        ...baseField,
        field_type: "checkbox_group",
        options: [
          { label: "Option 1", value: "option_1" },
          { label: "Option 2", value: "option_2" },
        ],
      };
    case "radio_button":
      return {
        ...baseField,
        field_type: "radio_button",
        options: [
          { label: "Option 1", value: "option_1" },
          { label: "Option 2", value: "option_2" },
        ],
      };
    case "number_input":
      return {
        ...baseField,
        field_type: "number_input",
        min_value: 0,
      };
    case "text_input":
      return {
        ...baseField,
        field_type: "text_input",
        max_length: 255,
      };
    case "text_area":
      return {
        ...baseField,
        field_type: "text_area",
        max_length: 1000,
        rows: 4,
      };
    case "date_picker":
      return {
        ...baseField,
        field_type: "date_picker",
      };
    case "file_upload":
      return {
        ...baseField,
        field_type: "file_upload",
        allowed_file_types: ["pdf", "jpg", "png"],
        max_file_size_mb: 10,
      };
    default:
      throw new Error(`Unknown field type: ${fieldType}`);
  }
}

/**
 * FieldPalette Component
 *
 * Displays draggable field type buttons organized by category.
 * Users can click to add fields to the canvas.
 */
export function FieldPalette() {
  const { fields, addField } = useFormBuilderStore();

  const handleAddField = (fieldType: string) => {
    // Generate unique field ID
    const existingIds = fields.map((f) => f.field_id);
    const fieldId = generateFieldId(fieldType, existingIds);

    // Create default field
    const newField = createDefaultField(fieldType, fieldId);

    // Add to store
    addField(newField);
  };

  return (
    <div className="space-y-6">
      {FIELD_TYPES.map((category) => (
        <div key={category.category}>
          {/* Category Header */}
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            {category.category}
          </h4>

          {/* Field Type Buttons */}
          <div className="space-y-2">
            {category.fields.map((field) => {
              const Icon = field.icon;
              return (
                <button
                  key={field.type}
                  onClick={() => handleAddField(field.type)}
                  className="group relative flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95"
                  style={{
                    backgroundColor: field.colorStyle.backgroundColor,
                    borderColor: field.colorStyle.borderColor,
                  }}
                  title={field.description}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0" style={{ color: field.colorStyle.color }}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)]">{field.label}</p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {field.description}
                    </p>
                  </div>

                  {/* Drag Handle (visual only for now, will be functional in 2.3.4) */}
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg
                      className="h-4 w-4 text-[var(--muted-foreground)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 8h16M4 16h16"
                      />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Help Text */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs text-gray-600">
          <strong>Tip:</strong> Click a field type to add it to the canvas. Drag and drop coming in
          the next task.
        </p>
      </div>
    </div>
  );
}
