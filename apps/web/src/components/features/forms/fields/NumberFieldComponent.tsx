// 🔢 Number Field Component
// Number input field with min/max validation and React Hook Form integration

import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NumberInputField } from "@sinag/shared";

interface NumberFieldComponentProps<TFieldValues extends FieldValues> {
  field: NumberInputField;
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  error?: string;
}

export function NumberFieldComponent<TFieldValues extends FieldValues>({
  field,
  control,
  name,
  error,
}: NumberFieldComponentProps<TFieldValues>) {
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
          min:
            field.min_value !== undefined && field.min_value !== null
              ? {
                  value: field.min_value,
                  message: `Minimum value is ${field.min_value}`,
                }
              : undefined,
          max:
            field.max_value !== undefined && field.max_value !== null
              ? {
                  value: field.max_value,
                  message: `Maximum value is ${field.max_value}`,
                }
              : undefined,
        }}
        render={({ field: controllerField }) => (
          <Input
            {...controllerField}
            id={field.field_id}
            type="number"
            placeholder={field.placeholder || undefined}
            min={field.min_value || undefined}
            max={field.max_value || undefined}
            step="any"
            className={error ? "border-destructive" : ""}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${field.field_id}-error` : undefined}
            value={controllerField.value ?? ""}
            onChange={(e) => {
              const value = e.target.value === "" ? undefined : Number(e.target.value);
              controllerField.onChange(value);
            }}
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
