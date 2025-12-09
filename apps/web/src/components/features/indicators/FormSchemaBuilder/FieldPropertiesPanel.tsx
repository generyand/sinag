"use client";

import { useFormBuilderStore } from "@/store/useFormBuilderStore";
import { Settings2 } from "lucide-react";
import { CheckboxGroupProperties } from "./FieldProperties/CheckboxGroupProperties";
import { DatePickerProperties } from "./FieldProperties/DatePickerProperties";
import { FileUploadProperties } from "./FieldProperties/FileUploadProperties";
import { NumberInputProperties } from "./FieldProperties/NumberInputProperties";
import { RadioButtonProperties } from "./FieldProperties/RadioButtonProperties";
import { TextAreaProperties } from "./FieldProperties/TextAreaProperties";
import { TextInputProperties } from "./FieldProperties/TextInputProperties";

/**
 * FieldPropertiesPanel Component
 *
 * Right sidebar panel that displays configuration forms for selected fields.
 *
 * Features:
 * - Shows "Select a field" message when no field is selected
 * - Renders appropriate field properties component based on field type
 * - Updates Zustand store on change
 * - Provides save/cancel actions
 *
 * Field type routing:
 * - checkbox_group → CheckboxGroupProperties
 * - radio_button → RadioButtonProperties
 * - number_input → NumberInputProperties
 * - text_input → TextInputProperties
 * - text_area → TextAreaProperties
 * - date_picker → DatePickerProperties
 * - file_upload → FileUploadProperties
 */
export function FieldPropertiesPanel() {
  const { selectedFieldId, getSelectedField } = useFormBuilderStore();
  const selectedField = getSelectedField();

  // Empty state - no field selected
  if (!selectedFieldId || !selectedField) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted)]/30">
            <Settings2 className="h-6 w-6 text-[var(--muted-foreground)]" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-[var(--foreground)]">No field selected</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Click on a field in the canvas to edit its properties
          </p>
        </div>
      </div>
    );
  }

  // Field selected - render appropriate properties form
  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 sticky top-0 z-10">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Field Properties</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {selectedField.field_type?.replace("_", " ") || "Unknown"} • {selectedField.field_id}
        </p>
      </div>

      {/* Properties Form - routed by field type */}
      <div className="p-4">
        {selectedField.field_type === "checkbox_group" && (
          <CheckboxGroupProperties fieldId={selectedField.field_id} />
        )}

        {selectedField.field_type === "radio_button" && (
          <RadioButtonProperties fieldId={selectedField.field_id} />
        )}

        {selectedField.field_type === "number_input" && (
          <NumberInputProperties fieldId={selectedField.field_id} />
        )}

        {selectedField.field_type === "text_input" && (
          <TextInputProperties fieldId={selectedField.field_id} />
        )}

        {selectedField.field_type === "text_area" && (
          <TextAreaProperties fieldId={selectedField.field_id} />
        )}

        {selectedField.field_type === "date_picker" && (
          <DatePickerProperties fieldId={selectedField.field_id} />
        )}

        {selectedField.field_type === "file_upload" && (
          <FileUploadProperties fieldId={selectedField.field_id} />
        )}
      </div>
    </div>
  );
}
