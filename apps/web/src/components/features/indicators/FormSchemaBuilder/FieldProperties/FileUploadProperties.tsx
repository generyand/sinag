'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useFormBuilderStore, isFileUploadField } from '@/store/useFormBuilderStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FileUploadField } from '@sinag/shared';

interface FileUploadPropertiesProps {
  fieldId: string;
}

interface FormValues {
  label: string;
  field_id: string;
  required: boolean;
  help_text: string;
  allowed_file_types: string;
  max_file_size_mb?: number;
  enable_conditional_mov: boolean;
  conditional_field_id?: string;
  conditional_operator?: string;
  conditional_value?: string;
}

/**
 * FileUploadProperties Component
 *
 * Configuration form for file upload fields with conditional MOV logic.
 */
export function FileUploadProperties({ fieldId }: FileUploadPropertiesProps) {
  const { getFieldById, updateField, fields } = useFormBuilderStore();
  const field = getFieldById(fieldId);
  const [hasChanges, setHasChanges] = useState(false);

  if (!field || !isFileUploadField(field)) {
    return <div className="text-sm text-red-600">Error: Field not found or wrong type</div>;
  }

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<FormValues>({
    defaultValues: {
      label: field.label,
      field_id: field.field_id,
      required: field.required,
      help_text: field.help_text || '',
      allowed_file_types: field.allowed_file_types?.join(', ') || 'pdf, jpg, png',
      max_file_size_mb: field.max_file_size_mb || 10,
      enable_conditional_mov: !!field.conditional_mov_requirement,
      conditional_field_id: field.conditional_mov_requirement?.field_id || '',
      conditional_operator: field.conditional_mov_requirement?.operator || 'equals',
      conditional_value: field.conditional_mov_requirement?.value || '',
    },
  });

  useEffect(() => {
    const subscription = watch(() => setHasChanges(true));
    return () => subscription.unsubscribe();
  }, [watch]);

  const enable_conditional_mov = watch('enable_conditional_mov');

  // Get available fields (exclude self and file upload fields)
  const availableFields = fields.filter(
    (f) => f.field_id !== fieldId && f.field_type !== 'file_upload'
  );

  const onSave = (data: FormValues) => {
    const updates: Partial<FileUploadField> = {
      label: data.label,
      field_id: data.field_id,
      required: data.required,
      help_text: data.help_text || undefined,
      allowed_file_types: data.allowed_file_types
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      max_file_size_mb: data.max_file_size_mb ? Number(data.max_file_size_mb) : undefined,
    };

    // Add conditional MOV requirement if enabled
    if (data.enable_conditional_mov && data.conditional_field_id) {
      updates.conditional_mov_requirement = {
        field_id: data.conditional_field_id,
        operator: data.conditional_operator as 'equals' | 'not_equals',
        value: data.conditional_value || '',
      };
    } else {
      updates.conditional_mov_requirement = undefined;
    }

    updateField(fieldId, updates);
    setHasChanges(false);
  };

  const onCancel = () => {
    reset();
    setHasChanges(false);
  };

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="label">Label <span className="text-red-600">*</span></Label>
        <Input id="label" {...register('label', { required: 'Label is required' })} />
        {errors.label && <p className="text-sm text-red-600">{errors.label.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="field_id">Field ID <span className="text-red-600">*</span></Label>
        <Input id="field_id" {...register('field_id', { required: 'Field ID is required', pattern: { value: /^[a-z0-9_]+$/, message: 'Only lowercase letters, numbers, and underscores' } })} />
        {errors.field_id && <p className="text-sm text-red-600">{errors.field_id.message}</p>}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
        <Label htmlFor="required" className="cursor-pointer">Required field</Label>
        <input id="required" type="checkbox" {...register('required')} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="help_text">Help text (optional)</Label>
        <Textarea id="help_text" {...register('help_text')} rows={3} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="allowed_file_types">Allowed file types <span className="text-red-600">*</span></Label>
        <Input id="allowed_file_types" {...register('allowed_file_types', { required: 'File types required' })} placeholder="pdf, jpg, png, docx" />
        <p className="text-xs text-gray-500">Comma-separated list (e.g., pdf, jpg, png)</p>
        {errors.allowed_file_types && <p className="text-sm text-red-600">{errors.allowed_file_types.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="max_file_size_mb">Max file size (MB)</Label>
        <Input id="max_file_size_mb" type="number" {...register('max_file_size_mb', { valueAsNumber: true })} placeholder="10" />
      </div>

      {/* Conditional MOV Requirement */}
      <div className="space-y-4 rounded-lg border-2 border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="enable_conditional_mov" className="cursor-pointer font-semibold">
              Conditional MOV Requirement
            </Label>
            <p className="text-xs text-gray-500">
              Require this file only if specific condition is met
            </p>
          </div>
          <input
            id="enable_conditional_mov"
            type="checkbox"
            {...register('enable_conditional_mov')}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>

        {enable_conditional_mov && (
          <div className="space-y-3 pt-3 border-t border-gray-200">
            {availableFields.length === 0 ? (
              <p className="text-sm text-gray-500">
                No fields available. Add other fields to the form first.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="conditional_field_id">If field</Label>
                  <select
                    id="conditional_field_id"
                    {...register('conditional_field_id')}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select a field...</option>
                    {availableFields.map((f) => (
                      <option key={f.field_id} value={f.field_id}>
                        {f.label} ({f.field_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conditional_operator">Operator</Label>
                  <select
                    id="conditional_operator"
                    {...register('conditional_operator')}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not equals</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conditional_value">Value</Label>
                  <Input
                    id="conditional_value"
                    {...register('conditional_value')}
                    placeholder="Expected value"
                  />
                </div>

                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-xs text-blue-900">
                    <strong>Example:</strong> If "has_experience" equals "yes", then this file upload becomes required.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button type="submit" disabled={!hasChanges} className="flex-1">Save Changes</Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={!hasChanges}>Cancel</Button>
      </div>

      {hasChanges && <p className="text-xs text-yellow-600">You have unsaved changes</p>}
    </form>
  );
}
