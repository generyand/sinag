"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIndicators } from "@/hooks/useIndicators";
import { useTestBBICalculationMutation } from "@/hooks/useBBIs";
import { Plus, Trash2, PlayCircle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { IndicatorResponse } from "@sinag/shared";

interface MappingCondition {
  indicator_id: number;
  required_status: "Pass" | "Fail";
}

interface MappingRules {
  operator: "AND" | "OR";
  conditions: MappingCondition[];
}

interface BBIMappingBuilderProps {
  governanceAreaId: number;
  initialMappingRules?: MappingRules;
  onSave: (mappingRules: MappingRules) => void;
  isSaving?: boolean;
}

export default function BBIMappingBuilder({
  governanceAreaId,
  initialMappingRules,
  onSave,
  isSaving = false,
}: BBIMappingBuilderProps) {
  const [mappingRules, setMappingRules] = React.useState<MappingRules>(
    initialMappingRules || {
      operator: "AND",
      conditions: [],
    }
  );

  const [testResults, setTestResults] = React.useState<any>(null);

  // Fetch indicators for the governance area
  const { data: allIndicators } = useIndicators({
    governance_area_id: governanceAreaId,
    is_active: true,
  });

  const testCalculationMutation = useTestBBICalculationMutation();

  // Filter out indicators that are already in conditions
  const availableIndicators = (allIndicators || []).filter(
    (indicator: IndicatorResponse) =>
      !mappingRules.conditions.some((c) => c.indicator_id === indicator.id)
  );

  const addCondition = (indicatorId: number) => {
    setMappingRules({
      ...mappingRules,
      conditions: [
        ...mappingRules.conditions,
        { indicator_id: indicatorId, required_status: "Pass" },
      ],
    });
  };

  const removeCondition = (index: number) => {
    setMappingRules({
      ...mappingRules,
      conditions: mappingRules.conditions.filter((_, i) => i !== index),
    });
  };

  const updateConditionStatus = (index: number, status: "Pass" | "Fail") => {
    const newConditions = [...mappingRules.conditions];
    newConditions[index].required_status = status;
    setMappingRules({
      ...mappingRules,
      conditions: newConditions,
    });
  };

  const getIndicatorName = (indicatorId: number) => {
    const indicator = allIndicators?.find((i: IndicatorResponse) => i.id === indicatorId);
    return indicator?.name || `Indicator ${indicatorId}`;
  };

  const handleTestCalculation = async () => {
    if (mappingRules.conditions.length === 0) {
      toast.error("Please add at least one condition to test");
      return;
    }

    // Create sample indicator statuses (all Pass for testing)
    const sampleStatuses: Record<number, string> = {};
    mappingRules.conditions.forEach((condition) => {
      sampleStatuses[condition.indicator_id] = condition.required_status;
    });

    try {
      const result = await testCalculationMutation.mutateAsync({
        data: {
          mapping_rules: mappingRules as any,
          indicator_statuses: sampleStatuses,
        },
      });
      setTestResults(result);
      toast.success("Test calculation completed!");
    } catch (error) {
      toast.error("Failed to test calculation");
      setTestResults(null);
    }
  };

  const handleSave = () => {
    if (mappingRules.conditions.length === 0) {
      toast.error("Please add at least one condition before saving");
      return;
    }
    onSave(mappingRules);
  };

  return (
    <div className="space-y-6">
      {/* Operator Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Logic Operator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>
              How should the conditions be evaluated?
            </Label>
            <Select
              value={mappingRules.operator}
              onValueChange={(value: "AND" | "OR") =>
                setMappingRules({ ...mappingRules, operator: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">
                  AND - All conditions must be met
                </SelectItem>
                <SelectItem value="OR">
                  OR - At least one condition must be met
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-[var(--muted-foreground)]">
              {mappingRules.operator === "AND"
                ? "The BBI will be Functional only if ALL indicators have the required status"
                : "The BBI will be Functional if ANY indicator has the required status"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>Mapping Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mappingRules.conditions.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              No conditions added yet. Add indicators to define functionality criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {mappingRules.conditions.map((condition, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 border border-[var(--border)] rounded-sm"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {getIndicatorName(condition.indicator_id)}
                    </div>
                  </div>
                  <Select
                    value={condition.required_status}
                    onValueChange={(value: "Pass" | "Fail") =>
                      updateConditionStatus(index, value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pass">Pass</SelectItem>
                      <SelectItem value="Fail">Fail</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCondition(index)}
                    className="hover:bg-red-500/10 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add Condition */}
          {availableIndicators.length > 0 && (
            <div className="pt-4 border-t border-[var(--border)]">
              <Label className="mb-2 block">Add Indicator</Label>
              <Select onValueChange={(value) => addCondition(parseInt(value))}>
                <SelectTrigger>
                  <Plus className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Select an indicator to add..." />
                </SelectTrigger>
                <SelectContent>
                  {availableIndicators.map((indicator: IndicatorResponse) => (
                    <SelectItem key={indicator.id} value={indicator.id.toString()}>
                      {indicator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Calculation */}
      <Card>
        <CardHeader>
          <CardTitle>Test Calculation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Test your mapping rules to see what BBI status would result from the current configuration.
          </p>
          <Button
            onClick={handleTestCalculation}
            variant="outline"
            disabled={
              mappingRules.conditions.length === 0 ||
              testCalculationMutation.isPending
            }
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            {testCalculationMutation.isPending ? "Testing..." : "Test Calculation"}
          </Button>

          {testResults && (
            <div className="mt-4 p-4 border border-[var(--border)] rounded-sm bg-[var(--muted)]/20">
              <div className="flex items-center gap-2 mb-2">
                {testResults.predicted_status === "FUNCTIONAL" ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-600">Functional</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-600">Non-Functional</span>
                  </>
                )}
              </div>
              <div className="text-sm text-[var(--muted-foreground)]">
                {testResults.evaluation_details?.logic}
              </div>
              {testResults.evaluation_details?.condition_results && (
                <div className="mt-3 space-y-1">
                  {testResults.evaluation_details.condition_results.map(
                    (result: any, index: number) => (
                      <div
                        key={index}
                        className="text-xs flex items-center gap-2"
                      >
                        {result.matches ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-600" />
                        )}
                        <span>
                          {getIndicatorName(result.indicator_id)}: Required{" "}
                          {result.required_status}, Got {result.actual_status}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button
          onClick={handleSave}
          disabled={isSaving || mappingRules.conditions.length === 0}
          style={{
            background:
              "linear-gradient(to bottom right, var(--cityscape-yellow), var(--cityscape-yellow-dark))",
            color: "var(--foreground)",
          }}
        >
          {isSaving ? "Saving..." : "Save Mapping Rules"}
        </Button>
      </div>
    </div>
  );
}
