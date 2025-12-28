"use client";

import { useCalculationRuleStore } from "@/store/useCalculationRuleStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

/**
 * OutputStatusConfig - Configure Pass/Fail output status
 *
 * This component allows MLGOO users to configure what status to assign
 * when the calculation rules evaluate to true or false.
 *
 * Typical configuration:
 * - output_status_on_pass: "Pass"
 * - output_status_on_fail: "Fail"
 *
 * But users can invert logic if needed (e.g., negative rules where
 * conditions passing means the indicator fails).
 */
export function OutputStatusConfig() {
  const { schema, setOutputStatusOnPass, setOutputStatusOnFail } = useCalculationRuleStore();

  if (!schema) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Output Status Configuration</CardTitle>
        <CardDescription>Define what status to assign when rules pass or fail</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Output Status on Pass */}
          <div className="space-y-2">
            <Label htmlFor="output-status-pass">When Rules Pass</Label>
            <Select
              value={schema.output_status_on_pass || "Pass"}
              onValueChange={(value: "Pass" | "Fail") => setOutputStatusOnPass(value)}
            >
              <SelectTrigger id="output-status-pass">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pass">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Pass</span>
                  </div>
                </SelectItem>
                <SelectItem value="Fail">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>Fail</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Status assigned when all conditions evaluate to true
            </p>
          </div>

          {/* Output Status on Fail */}
          <div className="space-y-2">
            <Label htmlFor="output-status-fail">When Rules Fail</Label>
            <Select
              value={schema.output_status_on_fail || "Fail"}
              onValueChange={(value: "Pass" | "Fail") => setOutputStatusOnFail(value)}
            >
              <SelectTrigger id="output-status-fail">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pass">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Pass</span>
                  </div>
                </SelectItem>
                <SelectItem value="Fail">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>Fail</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Status assigned when conditions evaluate to false
            </p>
          </div>
        </div>

        {/* Current Configuration Display */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="text-sm font-medium text-gray-700">Current Configuration:</div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-gray-600">If conditions pass →</span>
            <Badge variant={schema.output_status_on_pass === "Pass" ? "default" : "destructive"}>
              {schema.output_status_on_pass || "Pass"}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="text-gray-600">If conditions fail →</span>
            <Badge variant={schema.output_status_on_fail === "Fail" ? "destructive" : "default"}>
              {schema.output_status_on_fail || "Fail"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
