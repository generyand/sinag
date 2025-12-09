"use client";

import { useCalculationRuleStore } from "@/store/useCalculationRuleStore";
import type { FormSchema } from "@sinag/shared";
import { ConditionGroupItem } from "./ConditionGroupItem";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface ConditionGroupListProps {
  /** Form schema for field reference validation */
  formSchema?: FormSchema | null;
}

/**
 * ConditionGroupList - Renders all condition groups
 *
 * Displays the list of condition groups with implicit AND logic between them.
 * Each group can have its own AND/OR operator for combining rules within.
 */
export function ConditionGroupList({ formSchema }: ConditionGroupListProps) {
  const { schema } = useCalculationRuleStore();

  if (!schema || schema.condition_groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {schema.condition_groups.map((group, index) => (
        <div key={index}>
          {/* Implicit AND separator between groups */}
          {index > 0 && (
            <div className="flex items-center justify-center py-4">
              <Separator className="flex-1" />
              <Badge variant="secondary" className="mx-4">
                AND
              </Badge>
              <Separator className="flex-1" />
            </div>
          )}

          {/* Condition Group */}
          <ConditionGroupItem group={group} groupIndex={index} formSchema={formSchema} />
        </div>
      ))}

      {/* Help Text */}
      {schema.condition_groups.length > 1 && (
        <p className="text-sm text-muted-foreground text-center mt-4">
          All condition groups must evaluate to true for the indicator to pass.
        </p>
      )}
    </div>
  );
}
