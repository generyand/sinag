// 🔽 Select Field Component
// Dropdown selection field with React Hook Form integration

import { Controller, Control, FieldValues, Path } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { RadioButtonField } from "@sinag/shared";

interface SelectFieldComponentProps<TFieldValues extends FieldValues> {
  field: RadioButtonField; // Using RadioButtonField type as it has options structure
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  error?: string;
}

export function SelectFieldComponent<TFieldValues extends FieldValues>({
  field,
  control,
  name,
  error,
}: SelectFieldComponentProps<TFieldValues>) {
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
        }}
        render={({ field: controllerField }) => (
          <Select
            onValueChange={controllerField.onChange}
            value={controllerField.value}
          >
            <SelectTrigger
              id={field.field_id}
              className={error ? "border-destructive" : ""}
              aria-invalid={error ? "true" : "false"}
              aria-describedby={
                error ? `${field.field_id}-error` : undefined
              }
            >
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
