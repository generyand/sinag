'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { isTextAreaField, useFormBuilderStore } from '@/store/useFormBuilderStore';
import type { TextAreaField } from '@sinag/shared';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface TextAreaPropertiesProps {
  fieldId: string;
}

interface FormValues {
  label: string;
  field_id: string;
  required: boolean;
  help_text: string;
  max_length?: number;
  rows?: number;
  placeholder?: string;
}

/**
 * TextAreaProperties Component
 *
 * Configuration form for text area fields.
 */
export function TextAreaProperties({ fieldId }: TextAreaPropertiesProps) {
  const { getFieldById, updateField } = useFormBuilderStore();
  const field = getFieldById(fieldId);
  const [hasChanges, setHasChanges] = useState(false);

  if (!field || !isTextAreaField(field)) {
    return <div className="text-sm text-red-600">Error: Field not found or wrong type</div>;
  }

  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<FormValues>({
    defaultValues: {
      label: field.label,
      field_id: field.field_id,
      required: field.required,
      help_text: field.help_text || '',
      max_length: field.max_length ?? undefined,
      rows: field.rows ?? 4,
      placeholder: field.placeholder ?? undefined,
    },
  });

  useEffect(() => {
    const subscription = watch(() => setHasChanges(true));
    return () => subscription.unsubscribe();
  }, [watch]);

  const onSave = (data: FormValues) => {
    const updates: Partial<TextAreaField> = {
      label: data.label,
      field_id: data.field_id,
      required: data.required,
      help_text: data.help_text || undefined,
      max_length: data.max_length ? Number(data.max_length) : undefined,
      rows: data.rows ? Number(data.rows) : undefined,
      placeholder: data.placeholder || undefined,
    };
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
        <Label htmlFor="max_length">Max length (optional)</Label>
        <Input id="max_length" type="number" {...register('max_length', { valueAsNumber: true })} placeholder="1000" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rows">Rows (height)</Label>
        <Input id="rows" type="number" {...register('rows', { valueAsNumber: true })} placeholder="4" />
        <p className="text-xs text-gray-500">Number of visible text lines</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="placeholder">Placeholder (optional)</Label>
        <Input id="placeholder" {...register('placeholder')} placeholder="Enter text..." />
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button type="submit" disabled={!hasChanges} className="flex-1">Save Changes</Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={!hasChanges}>Cancel</Button>
      </div>

      {hasChanges && <p className="text-xs text-yellow-600">You have unsaved changes</p>}
    </form>
  );
}
