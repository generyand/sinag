"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OperatorSelectorProps {
  operator: string;
  operators: string[];
  onChange: (operator: string) => void;
}

/**
 * OperatorSelector - Select comparison operator
 *
 * Different rule types support different operators:
 * - Numeric comparisons: >=, >, <=, <, ==
 * - Value matching: ==, !=, contains, not_contains
 */
export function OperatorSelector({ operator, operators, onChange }: OperatorSelectorProps) {
  // Map operators to user-friendly labels
  const operatorLabels: Record<string, string> = {
    ">=": "Greater than or equal to (≥)",
    ">": "Greater than (>)",
    "<=": "Less than or equal to (≤)",
    "<": "Less than (<)",
    "==": "Equal to (=)",
    "!=": "Not equal to (≠)",
    contains: "Contains",
    not_contains: "Does not contain",
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="operator">Operator</Label>
      <Select value={operator} onValueChange={onChange}>
        <SelectTrigger id="operator">
          <SelectValue placeholder="Select an operator" />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op} value={op}>
              {operatorLabels[op] || op}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Comparison operator for evaluating the field value
      </p>
    </div>
  );
}
