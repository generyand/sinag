'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from 'lucide-react';
import type { OverallComplianceResponse } from '@sinag/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface OverallComplianceCardProps {
  data?: OverallComplianceResponse;
  isLoading?: boolean;
  error?: Error | null;
}

export function OverallComplianceCard({ data, isLoading, error }: OverallComplianceCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>Overall Municipal Compliance</CardTitle>
          </div>
          <CardDescription>Municipal-wide SGLGB pass/fail statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>Overall Municipal Compliance</CardTitle>
          </div>
          <CardDescription>Municipal-wide SGLGB pass/fail statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            <p>Error loading compliance data</p>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Prepare chart data
  const failPercentage = 100 - data.pass_percentage;
  const chartData = [
    { name: 'Passed', value: data.passed_count, percentage: data.pass_percentage },
    { name: 'Failed', value: data.failed_count, percentage: failPercentage },
  ];

  const COLORS = {
    Passed: '#22c55e', // green-500
    Failed: '#ef4444', // red-500
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle>Overall Municipal Compliance</CardTitle>
        </div>
        <CardDescription>
          Municipal-wide SGLGB pass/fail statistics across {data.total_barangays} barangays
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Pie Chart */}
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => `${(props.percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} barangays`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm font-medium text-muted-foreground">Passed</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-green-600">{data.passed_count}</span>
                <span className="text-sm text-muted-foreground">({data.pass_percentage.toFixed(1)}%)</span>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm font-medium text-muted-foreground">Failed</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-red-600">{data.failed_count}</span>
                <span className="text-sm text-muted-foreground">({failPercentage.toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          {/* Assessment Cycle Info */}
          {data.assessment_cycle && (
            <div className="text-center text-sm text-muted-foreground pt-2 border-t">
              Assessment Cycle: <span className="font-medium">{data.assessment_cycle}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
