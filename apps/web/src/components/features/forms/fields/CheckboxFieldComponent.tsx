// ☑️ Checkbox Field Component
// Multi-select checkbox group field with React Hook Form integration

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { CheckboxGroupField } from "@sinag/shared";
import { Control, Controller, FieldValues, Path } from "react-hook-form";

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
            <div className="flex flex-col gap-3">
              {field.options.map((option) => {
                const isChecked = currentValue.includes(option.value);

                return (
                  <div
                    key={option.value}
                    className="flex items-center space-x-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--hover)] hover:border-[var(--cityscape-yellow)]/50 transition-all duration-200 cursor-pointer group"
                    onClick={() => {
                        if (!isChecked) {
                          controllerField.onChange([...currentValue, option.value]);
                        } else {
                          controllerField.onChange(currentValue.filter((v: string) => v !== option.value));
                        }
                    }}
                  >
                    <Checkbox
                      id={`${field.field_id}-${option.value}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          controllerField.onChange([...currentValue, option.value]);
                        } else {
                          controllerField.onChange(currentValue.filter((v: string) => v !== option.value));
                        }
                      }}
                      aria-describedby={
                        error ? `${field.field_id}-error` : undefined
                      }
                      className="data-[state=checked]:bg-[var(--cityscape-yellow)] data-[state=checked]:text-[var(--cityscape-yellow-dark)] border-[var(--muted-foreground)] group-hover:border-[var(--cityscape-yellow)]"
                    />
                    <Label
                      htmlFor={`${field.field_id}-${option.value}`}
                      className="font-medium cursor-pointer flex-1 text-[var(--foreground)] group-hover:text-[var(--cityscape-yellow-dark)] transition-colors"
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
