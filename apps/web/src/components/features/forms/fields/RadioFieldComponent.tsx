// 📻 Radio Field Component
// Radio button group field with React Hook Form integration

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { RadioButtonField } from "@sinag/shared";
import { Control, Controller, FieldValues, Path } from "react-hook-form";

interface RadioFieldComponentProps<TFieldValues extends FieldValues> {
  field: RadioButtonField;
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  error?: string;
}

export function RadioFieldComponent<TFieldValues extends FieldValues>({
  field,
  control,
  name,
  error,
}: RadioFieldComponentProps<TFieldValues>) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {field.help_text && <p className="text-sm text-muted-foreground">{field.help_text}</p>}

      <Controller
        name={name}
        control={control}
        rules={{
          required: field.required ? `${field.label} is required` : false,
        }}
        render={({ field: controllerField }) => (
          <RadioGroup
            onValueChange={controllerField.onChange}
            value={controllerField.value}
            className="flex flex-col gap-3"
          >
            {field.options.map((option) => (
              <div
                key={option.value}
                className="flex items-center space-x-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--hover)] hover:border-[var(--cityscape-yellow)]/50 transition-all duration-200 cursor-pointer group"
                onClick={() => controllerField.onChange(option.value)}
              >
                <RadioGroupItem
                  value={option.value}
                  id={`${field.field_id}-${option.value}`}
                  aria-describedby={error ? `${field.field_id}-error` : undefined}
                  className="text-[var(--cityscape-yellow)] border-[var(--muted-foreground)] group-hover:border-[var(--cityscape-yellow)]"
                />
                <Label
                  htmlFor={`${field.field_id}-${option.value}`}
                  className="font-medium cursor-pointer flex-1 text-[var(--foreground)] group-hover:text-[var(--cityscape-yellow-dark)] transition-colors"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      />

      {error && (
        <p id={`${field.field_id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
