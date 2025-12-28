"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared";

interface AnalyticsHeaderProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}

const assessmentPeriods = [
  { value: "sglgb-2024", label: "SGLGB 2024" },
  { value: "sglgb-2023", label: "SGLGB 2023" },
  { value: "sglgb-2022", label: "SGLGB 2022" },
];

export function AnalyticsHeader({ selectedPeriod, onPeriodChange }: AnalyticsHeaderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Reports"
        description="Strategic analysis and decision support for SGLGB pre-assessment effectiveness"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Global Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="period-select" className="text-sm font-medium text-gray-700">
                Assessment Period:
              </label>
              <Select value={selectedPeriod} onValueChange={onPeriodChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {assessmentPeriods.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
