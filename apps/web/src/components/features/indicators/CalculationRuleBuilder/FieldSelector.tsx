"use client";

import type { FormSchema } from "@sinag/shared";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface FieldSelectorProps {
  fieldId: string;
  formSchema?: FormSchema | null;
  fieldTypes?: string[];
  onChange: (fieldId: string) => void;
}

/**
 * FieldSelector - Select a field from the form schema
 *
 * Filters fields by type to ensure only compatible fields are shown.
 * For example, PERCENTAGE_THRESHOLD only works with number_input fields.
 */
export function FieldSelector({
  fieldId,
  formSchema,
  fieldTypes = [],
  onChange,
}: FieldSelectorProps) {
  // Get available fields filtered by type
  const availableFields =
    (formSchema as any)?.input_fields?.filter((field: any) => {
      if (fieldTypes.length === 0) return true;
      return fieldTypes.includes(field.field_type || "");
    }) || [];

  // No form schema available
  if (!formSchema) {
    return (
      <div className="space-y-2">
        <Label>Field</Label>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No form schema found. Please create a form schema first before adding calculation rules.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // No compatible fields available
  if (availableFields.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Field</Label>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No compatible fields found in the form schema. Required field types:{" "}
            {fieldTypes.join(", ")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="field-id">Field</Label>
      <Select value={fieldId} onValueChange={onChange}>
        <SelectTrigger id="field-id">
          <SelectValue placeholder="Select a field" />
        </SelectTrigger>
        <SelectContent>
          {availableFields.map((field: any) => (
            <SelectItem key={field.field_id} value={field.field_id}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{field.label}</span>
                <span className="text-xs text-muted-foreground">({field.field_type})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">Select the field to evaluate for this rule</p>
    </div>
  );
}
