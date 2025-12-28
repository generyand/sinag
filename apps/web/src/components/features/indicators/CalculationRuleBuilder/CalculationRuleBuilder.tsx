"use client";

import { useState, useEffect } from "react";
import { useCalculationRuleStore } from "@/store/useCalculationRuleStore";
import type { CalculationSchema, FormSchema } from "@sinag/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Plus, Info } from "lucide-react";
import { ConditionGroupList } from "./ConditionGroupList";
import { OutputStatusConfig } from "./OutputStatusConfig";
import { TestCalculationPanel } from "./TestCalculationPanel";

interface CalculationRuleBuilderProps {
  /** Existing calculation schema to load (for editing) */
  initialSchema?: CalculationSchema | null;
  /** Form schema to reference for field IDs */
  formSchema?: FormSchema | null;
  /** Callback when schema changes */
  onChange?: (schema: CalculationSchema | null) => void;
}

/**
 * CalculationRuleBuilder - Visual builder for creating calculation schemas
 *
 * This component provides an interface for MLGOO users to build calculation
 * rules that automatically determine Pass/Fail status for indicators.
 *
 * Features:
 * - Nested condition groups with AND/OR logic
 * - 6 rule types (Percentage Threshold, Count Threshold, Match Value, etc.)
 * - Visual representation of rule logic
 * - Test calculation with sample data
 * - Validation before save
 *
 * Architecture:
 * - Uses Zustand store for state management
 * - Integrates with form_schema for field references
 * - Supports recursive nesting of rules
 */
export function CalculationRuleBuilder({
  initialSchema,
  formSchema,
  onChange,
}: CalculationRuleBuilderProps) {
  const { schema, isDirty, initializeSchema, loadSchema, addConditionGroup, isSchemaValid } =
    useCalculationRuleStore();

  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize or load schema on mount
  useEffect(() => {
    if (!isInitialized) {
      if (initialSchema) {
        loadSchema(initialSchema);
      } else {
        initializeSchema();
      }
      setIsInitialized(true);
    }
  }, [isInitialized, initialSchema, loadSchema, initializeSchema, setIsInitialized]);

  // Notify parent of changes
  useEffect(() => {
    if (isInitialized && onChange) {
      onChange(schema);
    }
  }, [schema, isInitialized, onChange]);

  // Handle adding a new condition group
  const handleAddConditionGroup = () => {
    addConditionGroup({
      operator: "AND",
      rules: [],
    });
  };

  if (!isInitialized || !schema) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading calculation rule builder...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Calculation Rule Builder</CardTitle>
          <CardDescription>
            Define rules to automatically calculate Pass/Fail status for this indicator. Combine
            multiple conditions with AND/OR logic.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Rules are evaluated sequentially. All condition groups must be true for the indicator
              to pass. Each group can contain multiple rules combined with AND or OR logic.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Output Status Configuration */}
      <OutputStatusConfig />

      {/* Condition Groups */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Condition Groups</CardTitle>
            <CardDescription>
              {schema.condition_groups.length === 0
                ? "Add your first condition group to get started"
                : `${schema.condition_groups.length} condition group${
                    schema.condition_groups.length === 1 ? "" : "s"
                  } defined`}
            </CardDescription>
          </div>
          <Button onClick={handleAddConditionGroup} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Group
          </Button>
        </CardHeader>
        <CardContent>
          {schema.condition_groups.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-muted-foreground">
              No condition groups defined. Click "Add Group" to create your first rule.
            </div>
          ) : (
            <ConditionGroupList formSchema={formSchema} />
          )}
        </CardContent>
      </Card>

      {/* Validation Status */}
      {!isSchemaValid() && (
        <Alert variant="destructive">
          <AlertDescription>
            At least one condition group is required to save this calculation schema.
          </AlertDescription>
        </Alert>
      )}

      {/* Dirty State Indicator */}
      {isDirty && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>You have unsaved changes.</AlertDescription>
        </Alert>
      )}

      {/* Test Calculation Panel */}
      <TestCalculationPanel formSchema={formSchema} />
    </div>
  );
}
