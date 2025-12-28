"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ValueInputProps {
  value: any;
  onChange: (value: any) => void;
  label?: string;
  placeholder?: string;
  helpText?: string;
}

/**
 * ValueInput - Generic input for expected values
 *
 * Used for MATCH_VALUE rules to specify the expected value.
 * Handles different value types (string, number, etc.)
 */
export function ValueInput({
  value,
  onChange,
  label = "Expected Value",
  placeholder = "Enter expected value",
  helpText = "Value to compare against the field",
}: ValueInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="expected-value">{label}</Label>
      <Input
        id="expected-value"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}
