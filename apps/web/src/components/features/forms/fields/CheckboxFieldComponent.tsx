// ☑️ Checkbox Field Component
// Multi-select checkbox group field with React Hook Form integration

import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { CheckboxGroupField } from "@sinag/shared";

interface CheckboxFieldComponentProps<TFieldValues extends FieldValues> {
  field: CheckboxGroupField;
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  error?: string;
}

export function CheckboxFieldComponent<TFieldValues extends FieldValues>({
  field,
  control,
  name,
  error,
}: CheckboxFieldComponentProps<TFieldValues>) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
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
          required: field.required
            ? `${field.label} requires at least one selection`
            : false,
        }}
        render={({ field: controllerField }) => {
          const currentValue: string[] = Array.isArray(controllerField.value)
            ? (controllerField.value as string[])
            : [];

          return (
            <div className="flex flex-col space-y-2">
              {field.options.map((option) => {
                const isChecked = currentValue.includes(option.value);

                return (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`${field.field_id}-${option.value}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // Add value to array
                          controllerField.onChange([
                            ...currentValue,
                            option.value,
                          ]);
                        } else {
                          // Remove value from array
                          controllerField.onChange(
                            currentValue.filter((v: string) => v !== option.value)
                          );
                        }
                      }}
                      aria-describedby={
                        error ? `${field.field_id}-error` : undefined
                      }
                    />
                    <Label
                      htmlFor={`${field.field_id}-${option.value}`}
                      className="font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          );
        }}
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
