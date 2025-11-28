'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { isCheckboxGroupField, useFormBuilderStore } from '@/store/useFormBuilderStore';
import type { CheckboxGroupField } from '@sinag/shared';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

interface CheckboxGroupPropertiesProps {
  fieldId: string;
}

interface FormValues {
  label: string;
  field_id: string;
  required: boolean;
  help_text: string;
  options: Array<{ label: string; value: string }>;
}

/**
 * CheckboxGroupProperties Component
 *
 * Configuration form for checkbox group fields.
 *
 * Features:
 * - Edit label, field_id, required, help_text
 * - Manage options (add, edit, delete, reorder)
 * - Minimum 2 options validation
 * - Real-time updates to Zustand store
 */
export function CheckboxGroupProperties({ fieldId }: CheckboxGroupPropertiesProps) {
  const { getFieldById, updateField } = useFormBuilderStore();
  const field = getFieldById(fieldId);
  const checkboxField = field && isCheckboxGroupField(field) ? field : null;
  const [hasChanges, setHasChanges] = useState(false);

  const defaultValues = useMemo<FormValues>(() => {
    if (!checkboxField) {
      return {
        label: '',
        field_id: '',
        required: false,
        help_text: '',
        options: [
          { label: 'Option 1', value: 'option_1' },
          { label: 'Option 2', value: 'option_2' },
        ],
      };
    }

    return {
      label: checkboxField.label,
      field_id: checkboxField.field_id,
        required: checkboxField.required ?? false,
      help_text: checkboxField.help_text || '',
      options:
        checkboxField.options?.length
          ? checkboxField.options
          : [
              { label: 'Option 1', value: 'option_1' },
              { label: 'Option 2', value: 'option_2' },
            ],
    };
  }, [checkboxField]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    defaultValues,
  });

  const { fields: optionFields, append, remove } = useFieldArray({
    control,
    name: 'options',
  });

  // Watch for changes
  useEffect(() => {
    const subscription = watch(() => {
      setHasChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  if (!checkboxField) {
    return (
      <div className="text-sm text-red-600">
        Error: Field not found or wrong type
      </div>
    );
  }

  // Handle save
  const onSave = (data: FormValues) => {
    const updates: Partial<CheckboxGroupField> = {
      label: data.label,
      field_id: data.field_id,
      required: data.required,
      help_text: data.help_text || undefined,
      options: data.options,
    };

    updateField(fieldId, updates);
    setHasChanges(false);
  };

  // Handle cancel
  const onCancel = () => {
    reset({
      label: checkboxField.label,
      field_id: checkboxField.field_id,
      required: checkboxField.required ?? false,
      help_text: checkboxField.help_text || '',
      options:
        checkboxField.options?.length
          ? checkboxField.options
          : [
              { label: 'Option 1', value: 'option_1' },
              { label: 'Option 2', value: 'option_2' },
            ],
    });
    setHasChanges(false);
  };

  // Add new option
  const addOption = () => {
    const nextIndex = optionFields.length + 1;
    append({
      label: `Option ${nextIndex}`,
      value: `option_${nextIndex}`,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="label">
          Label <span className="text-red-600">*</span>
        </Label>
        <Input
          id="label"
          {...register('label', { required: 'Label is required' })}
          placeholder="Enter field label"
        />
        {errors.label && (
          <p className="text-sm text-red-600">{errors.label.message}</p>
        )}
      </div>

      {/* Field ID */}
      <div className="space-y-2">
        <Label htmlFor="field_id">
          Field ID <span className="text-red-600">*</span>
        </Label>
        <Input
          id="field_id"
          {...register('field_id', {
            required: 'Field ID is required',
            pattern: {
              value: /^[a-z0-9_]+$/,
              message: 'Only lowercase letters, numbers, and underscores',
            },
          })}
          placeholder="field_id"
        />
        {errors.field_id && (
          <p className="text-sm text-red-600">{errors.field_id.message}</p>
        )}
        <p className="text-xs text-gray-500">
          Used to identify this field in the form data
        </p>
      </div>

      {/* Required Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
        <div>
          <Label htmlFor="required" className="cursor-pointer">
            Required field
          </Label>
          <p className="text-xs text-gray-500">
            User must select at least one option
          </p>
        </div>
        <input
          id="required"
          type="checkbox"
          {...register('required')}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </div>

      {/* Help Text */}
      <div className="space-y-2">
        <Label htmlFor="help_text">Help text (optional)</Label>
        <Textarea
          id="help_text"
          {...register('help_text')}
          placeholder="Provide additional context or instructions"
          rows={3}
        />
      </div>

      {/* Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>
            Options <span className="text-red-600">*</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOption}
            className="h-8"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Option
          </Button>
        </div>

        {/* Validation: Minimum 2 options */}
        {optionFields.length < 2 && (
          <p className="text-sm text-red-600">
            At least 2 options are required
          </p>
        )}

        {/* Options List */}
        <div className="space-y-2">
          {optionFields.map((item, index) => (
            <div
              key={item.id}
              className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
            >
              {/* Drag Handle */}
              <button
                type="button"
                className="mt-2 cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
                aria-label="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </button>

              {/* Option Fields */}
              <div className="flex-1 space-y-2">
                <Input
                  {...register(`options.${index}.label` as const, {
                    required: 'Option label is required',
                  })}
                  placeholder="Option label"
                  className="bg-white"
                />
                <Input
                  {...register(`options.${index}.value` as const, {
                    required: 'Option value is required',
                    pattern: {
                      value: /^[a-z0-9_]+$/,
                      message: 'Only lowercase letters, numbers, and underscores',
                    },
                  })}
                  placeholder="option_value"
                  className="bg-white"
                />
                {errors.options?.[index] && (
                  <p className="text-xs text-red-600">
                    {errors.options[index]?.label?.message ||
                      errors.options[index]?.value?.message}
                  </p>
                )}
              </div>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={optionFields.length <= 2}
                className="mt-2 text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Delete option"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500">
          Drag to reorder • Minimum 2 options required
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button
          type="submit"
          disabled={!hasChanges || optionFields.length < 2}
          className="flex-1"
        >
          Save Changes
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={!hasChanges}
        >
          Cancel
        </Button>
      </div>

      {hasChanges && (
        <p className="text-xs text-yellow-600">
          You have unsaved changes
        </p>
      )}
    </form>
  );
}
