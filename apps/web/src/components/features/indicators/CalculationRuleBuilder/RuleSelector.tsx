"use client";

import { useState } from "react";
import { createDefaultRule, type CalculationRule } from "@/store/useCalculationRuleStore";
import type { FormSchema } from "@sinag/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { RuleConfigForm } from "./RuleConfigForm";

interface RuleSelectorProps {
  onAddRule: (rule: CalculationRule) => void;
  formSchema?: FormSchema | null;
}

/**
 * RuleSelector - Dialog for selecting and configuring a new rule
 *
 * Workflow:
 * 1. User clicks "Add Rule" button
 * 2. Dialog opens with rule type selector
 * 3. User selects rule type
 * 4. Form appears for configuring the rule
 * 5. User fills in configuration
 * 6. Rule is added to the condition group
 */
export function RuleSelector({ onAddRule, formSchema }: RuleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRuleType, setSelectedRuleType] = useState<string>("");
  const [currentRule, setCurrentRule] = useState<CalculationRule | null>(null);

  // Handle rule type selection
  const handleRuleTypeSelect = (ruleType: string) => {
    setSelectedRuleType(ruleType);
    const defaultRule = createDefaultRule(ruleType);
    setCurrentRule(defaultRule);
  };

  // Handle rule configuration change
  const handleRuleChange = (updatedRule: CalculationRule) => {
    setCurrentRule(updatedRule);
  };

  // Handle adding the configured rule
  const handleAddRule = () => {
    if (currentRule) {
      onAddRule(currentRule);
      // Reset state
      setIsOpen(false);
      setSelectedRuleType("");
      setCurrentRule(null);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setIsOpen(false);
    setSelectedRuleType("");
    setCurrentRule(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Calculation Rule</DialogTitle>
          <DialogDescription>Select a rule type and configure its properties</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rule Type Selector */}
          <div className="space-y-2">
            <Label htmlFor="rule-type">Rule Type</Label>
            <Select value={selectedRuleType} onValueChange={handleRuleTypeSelect}>
              <SelectTrigger id="rule-type">
                <SelectValue placeholder="Select a rule type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENTAGE_THRESHOLD">
                  <div className="space-y-1">
                    <div className="font-medium">Percentage Threshold</div>
                    <div className="text-xs text-muted-foreground">
                      Check if a numeric field meets a percentage threshold (0-100%)
                    </div>
                  </div>
                </SelectItem>

                <SelectItem value="COUNT_THRESHOLD">
                  <div className="space-y-1">
                    <div className="font-medium">Count Threshold</div>
                    <div className="text-xs text-muted-foreground">
                      Check if the count of selected checkboxes meets a threshold
                    </div>
                  </div>
                </SelectItem>

                <SelectItem value="MATCH_VALUE">
                  <div className="space-y-1">
                    <div className="font-medium">Match Value</div>
                    <div className="text-xs text-muted-foreground">
                      Check if a field's value matches an expected value
                    </div>
                  </div>
                </SelectItem>

                <SelectItem value="BBI_FUNCTIONALITY_CHECK">
                  <div className="space-y-1">
                    <div className="font-medium">BBI Functionality Check</div>
                    <div className="text-xs text-muted-foreground">
                      Check if a specific BBI is marked as Functional (Epic 4)
                    </div>
                  </div>
                </SelectItem>

                <SelectItem value="AND_ALL" disabled>
                  <div className="space-y-1">
                    <div className="font-medium">All Conditions (AND)</div>
                    <div className="text-xs text-muted-foreground">
                      Nested conditions - all must be true (Coming soon)
                    </div>
                  </div>
                </SelectItem>

                <SelectItem value="OR_ANY" disabled>
                  <div className="space-y-1">
                    <div className="font-medium">Any Condition (OR)</div>
                    <div className="text-xs text-muted-foreground">
                      Nested conditions - at least one must be true (Coming soon)
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rule Configuration Form */}
          {currentRule && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <RuleConfigForm
                rule={currentRule}
                formSchema={formSchema}
                onChange={handleRuleChange}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleAddRule} disabled={!currentRule}>
            Add Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
