"use client";

import type { FormSchemaFieldsItem } from "@sinag/shared";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface DynamicFormInputProps {
  field: FormSchemaFieldsItem;
  value: any;
  onChange: (value: any) => void;
}

/**
 * DynamicFormInput - Renders appropriate input based on field type
 *
 * Generates dynamic input fields from form_schema for test calculation.
 * Supports all 7 field types with appropriate UI controls.
 *
 * Simplifications for testing:
 * - File uploads not supported (test data only)
 * - Date pickers use text input for ISO strings
 * - Checkboxes return array of selected option values
 */
export function DynamicFormInput({ field, value, onChange }: DynamicFormInputProps) {
  const fieldType = field.field_type;

  switch (fieldType) {
    case "text_input":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.field_id}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            id={field.field_id}
            type="text"
            placeholder={field.placeholder || `Enter ${field.label}`}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            maxLength={field.max_length as any}
          />
          {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
        </div>
      );

    case "text_area":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.field_id}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Textarea
            id={field.field_id}
            placeholder={field.placeholder || `Enter ${field.label}`}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            rows={field.rows || 3}
            maxLength={field.max_length as any}
          />
          {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
        </div>
      );

    case "number_input":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.field_id}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            id={field.field_id}
            type="number"
            placeholder={field.placeholder || `Enter ${field.label}`}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
            min={field.min_value as any}
            max={field.max_value as any}
          />
          {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
        </div>
      );

    case "checkbox_group":
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="space-y-2">
            {field.options?.map((option) => {
              const isChecked = Array.isArray(value) && value.includes(option.value);
              return (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.field_id}-${option.value}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      if (checked) {
                        onChange([...currentValues, option.value]);
                      } else {
                        onChange(currentValues.filter((v: any) => v !== option.value));
                      }
                    }}
                  />
                  <label
                    htmlFor={`${field.field_id}-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </label>
                </div>
              );
            })}
          </div>
          {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
        </div>
      );

    case "radio_button":
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${field.field_id}-${option.value}`}
                  name={field.field_id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-4 w-4 text-primary focus:ring-2 focus:ring-primary"
                />
                <label
                  htmlFor={`${field.field_id}-${option.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
          {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
        </div>
      );

    case "date_picker":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.field_id}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            id={field.field_id}
            type="date"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            min={field.min_date as any}
            max={field.max_date as any}
          />
          {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
        </div>
      );

    case "file_upload":
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 text-center">
            <p className="text-sm text-muted-foreground">File upload not supported in test mode</p>
          </div>
          {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          <Label>{field.label}</Label>
          <p className="text-sm text-muted-foreground">Unsupported field type: {fieldType}</p>
        </div>
      );
  }
}
