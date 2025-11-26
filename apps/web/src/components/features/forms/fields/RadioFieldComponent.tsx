// 📻 Radio Field Component
// Radio button group field with React Hook Form integration

import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { RadioButtonField } from "@sinag/shared";

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

      {field.help_text && (
        <p className="text-sm text-muted-foreground">{field.help_text}</p>
      )}

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
            className="flex flex-col space-y-2"
          >
            {field.options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={option.value}
                  id={`${field.field_id}-${option.value}`}
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
            ))}
          </RadioGroup>
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
