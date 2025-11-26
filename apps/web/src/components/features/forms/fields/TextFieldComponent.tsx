// 📝 Text Field Component
// Single-line text input field with React Hook Form integration

import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TextInputField } from "@sinag/shared";

interface TextFieldComponentProps<TFieldValues extends FieldValues> {
  field: TextInputField;
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  error?: string;
}

export function TextFieldComponent<TFieldValues extends FieldValues>({
  field,
  control,
  name,
  error,
}: TextFieldComponentProps<TFieldValues>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={field.field_id} className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {field.help_text && (
        <p className="text-sm text-muted-foreground">{field.help_text}</p>
      )}

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
          <Input
            {...controllerField}
            id={field.field_id}
            type="text"
            placeholder={field.placeholder || undefined}
            maxLength={field.max_length || undefined}
            className={error ? "border-destructive" : ""}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={
              error ? `${field.field_id}-error` : undefined
            }
          />
        )}
      />

      {error && (
        <p
          id={`${field.field_id}-error`}
          className="text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
