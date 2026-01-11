// 📄 Text Area Field Component
// Multi-line text input field with React Hook Form integration

import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { TextAreaField } from "@sinag/shared";

interface TextAreaFieldComponentProps<TFieldValues extends FieldValues> {
  field: TextAreaField;
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  error?: string;
}

export function TextAreaFieldComponent<TFieldValues extends FieldValues>({
  field,
  control,
  name,
  error,
}: TextAreaFieldComponentProps<TFieldValues>) {
  return (
    <div className="space-y-3">
      <Label htmlFor={field.field_id} className="text-base font-semibold">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {field.help_text && <p className="text-base text-muted-foreground">{field.help_text}</p>}

      <Controller
        name={name}
        control={control}
        rules={{
          required: field.required ? `${field.label} is required` : false,
          maxLength: field.max_length
            ? {
                value: field.max_length,
                message: `Maximum ${field.max_length} characters allowed`,
              }
            : undefined,
        }}
        render={({ field: controllerField }) => (
          <Textarea
            {...controllerField}
            id={field.field_id}
            placeholder={field.placeholder || undefined}
            maxLength={field.max_length || undefined}
            rows={field.rows || 3}
            className={error ? "border-destructive" : ""}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${field.field_id}-error` : undefined}
          />
        )}
      />

      {error && (
        <p id={`${field.field_id}-error`} className="text-base text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
