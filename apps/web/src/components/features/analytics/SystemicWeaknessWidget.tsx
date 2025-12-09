"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WeaknessData {
  indicator: string;
  failedCount: number;
  totalBarangays: number;
  percentage: number;
}

interface SystemicWeaknessData {
  weaknesses: WeaknessData[];
}

interface SystemicWeaknessWidgetProps {
  data: SystemicWeaknessData;
}

export function SystemicWeaknessWidget({ data }: SystemicWeaknessWidgetProps) {
  const { weaknesses } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Municipality-Wide Performance Hotspots</CardTitle>
        <p className="text-sm text-gray-600">
          Top 5 most commonly failed indicators based on official results
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weaknesses.map((weakness, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">{weakness.indicator}</h4>
                  <p className="text-xs text-gray-500">
                    Failed by {weakness.failedCount} Barangays ({weakness.percentage}%)
                  </p>
                </div>
                <div className="text-sm font-semibold text-red-600">
                  {weakness.failedCount}/{weakness.totalBarangays}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-red-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${weakness.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Actionable Insight */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Capacity Development Priority</h4>
          <p className="text-sm text-blue-800">
            Focus municipal training programs on the indicators with the highest failure rates. The
            top failing indicators represent the most critical areas for capacity development.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
