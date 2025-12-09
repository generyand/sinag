"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isNumberInputField, useFormBuilderStore } from "@/store/useFormBuilderStore";
import type { NumberInputField } from "@sinag/shared";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

interface NumberInputPropertiesProps {
  fieldId: string;
}

interface FormValues {
  label: string;
  field_id: string;
  required: boolean;
  help_text: string;
  min_value?: number;
  max_value?: number;
  placeholder?: string;
  default_value?: number;
}

/**
 * NumberInputProperties Component
 *
 * Configuration form for number input fields.
 *
 * Features:
 * - Edit label, field_id, required, help_text
 * - Set min/max values with validation (min < max)
 * - Placeholder and default value
 * - Real-time updates to Zustand store
 */
export function NumberInputProperties({ fieldId }: NumberInputPropertiesProps) {
  const { getFieldById, updateField } = useFormBuilderStore();
  const field = getFieldById(fieldId);
  const numberField = field && isNumberInputField(field) ? field : null;
  const [hasChanges, setHasChanges] = useState(false);

  const defaultValues = useMemo<FormValues>(() => {
    if (!numberField) {
      return {
        label: "",
        field_id: "",
        required: false,
        help_text: "",
        min_value: undefined,
        max_value: undefined,
        placeholder: undefined,
        default_value: undefined,
      };
    }

    return {
      label: numberField.label,
      field_id: numberField.field_id,
      required: numberField.required ?? false,
      help_text: numberField.help_text || "",
      min_value: numberField.min_value ?? undefined,
      max_value: numberField.max_value ?? undefined,
      placeholder: numberField.placeholder ?? undefined,
      default_value: numberField.default_value ?? undefined,
    };
  }, [numberField]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    defaultValues,
  });

  // Watch for changes
  useEffect(() => {
    const subscription = watch(() => {
      setHasChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Type guard
  if (!numberField) {
    return <div className="text-sm text-red-600">Error: Field not found or wrong type</div>;
  }

  // Watch min and max for validation
  const min_value = watch("min_value");
  const max_value = watch("max_value");

  // Handle save
  const onSave = (data: FormValues) => {
    const updates: Partial<NumberInputField> = {
      label: data.label,
      field_id: data.field_id,
      required: data.required,
      help_text: data.help_text || undefined,
      min_value:
        data.min_value !== undefined && data.min_value !== null
          ? Number(data.min_value)
          : undefined,
      max_value:
        data.max_value !== undefined && data.max_value !== null
          ? Number(data.max_value)
          : undefined,
      placeholder: data.placeholder || undefined,
      default_value:
        data.default_value !== undefined && data.default_value !== null
          ? Number(data.default_value)
          : undefined,
    };

    updateField(fieldId, updates);
    setHasChanges(false);
  };

  // Handle cancel
  const onCancel = () => {
    reset({
      label: numberField.label,
      field_id: numberField.field_id,
      required: numberField.required ?? false,
      help_text: numberField.help_text || "",
      min_value: numberField.min_value ?? undefined,
      max_value: numberField.max_value ?? undefined,
      placeholder: numberField.placeholder ?? undefined,
      default_value: numberField.default_value ?? undefined,
    });
    setHasChanges(false);
  };

  // Validation: min < max
  const hasMinMaxError =
    min_value !== undefined && max_value !== undefined && Number(min_value) >= Number(max_value);

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="label">
          Label <span className="text-red-600">*</span>
        </Label>
        <Input
          id="label"
          {...register("label", { required: "Label is required" })}
          placeholder="Enter field label"
        />
        {errors.label && <p className="text-sm text-red-600">{errors.label.message}</p>}
      </div>

      {/* Field ID */}
      <div className="space-y-2">
        <Label htmlFor="field_id">
          Field ID <span className="text-red-600">*</span>
        </Label>
        <Input
          id="field_id"
          {...register("field_id", {
            required: "Field ID is required",
            pattern: {
              value: /^[a-z0-9_]+$/,
              message: "Only lowercase letters, numbers, and underscores",
            },
          })}
          placeholder="field_id"
        />
        {errors.field_id && <p className="text-sm text-red-600">{errors.field_id.message}</p>}
        <p className="text-xs text-gray-500">Used to identify this field in the form data</p>
      </div>

      {/* Required Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
        <div>
          <Label htmlFor="required" className="cursor-pointer">
            Required field
          </Label>
          <p className="text-xs text-gray-500">User must provide a value</p>
        </div>
        <input
          id="required"
          type="checkbox"
          {...register("required")}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </div>

      {/* Help Text */}
      <div className="space-y-2">
        <Label htmlFor="help_text">Help text (optional)</Label>
        <Textarea
          id="help_text"
          {...register("help_text")}
          placeholder="Provide additional context or instructions"
          rows={3}
        />
      </div>

      {/* Min and Max Values */}
      <div className="space-y-3">
        <Label>Value Constraints</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="min_value" className="text-xs">
              Min value (optional)
            </Label>
            <Input
              id="min_value"
              type="number"
              {...register("min_value", { valueAsNumber: true })}
              placeholder="No minimum"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_value" className="text-xs">
              Max value (optional)
            </Label>
            <Input
              id="max_value"
              type="number"
              {...register("max_value", { valueAsNumber: true })}
              placeholder="No maximum"
            />
          </div>
        </div>
        {hasMinMaxError && (
          <p className="text-sm text-red-600">Minimum value must be less than maximum value</p>
        )}
      </div>

      {/* Placeholder */}
      <div className="space-y-2">
        <Label htmlFor="placeholder">Placeholder (optional)</Label>
        <Input id="placeholder" {...register("placeholder")} placeholder="Enter a number..." />
        <p className="text-xs text-gray-500">Shown in the input when empty</p>
      </div>

      {/* Default Value */}
      <div className="space-y-2">
        <Label htmlFor="default_value">Default value (optional)</Label>
        <Input
          id="default_value"
          type="number"
          {...register("default_value", { valueAsNumber: true })}
          placeholder="No default"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button type="submit" disabled={!hasChanges || hasMinMaxError} className="flex-1">
          Save Changes
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={!hasChanges}>
          Cancel
        </Button>
      </div>

      {hasChanges && <p className="text-xs text-yellow-600">You have unsaved changes</p>}
    </form>
  );
}
