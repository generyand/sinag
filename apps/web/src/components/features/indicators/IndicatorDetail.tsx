"use client";

import type { IndicatorResponse } from "@sinag/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, History, FileJson } from "lucide-react";
import { useRouter } from "next/navigation";

interface IndicatorDetailProps {
  indicator: IndicatorResponse;
  onEdit?: () => void;
  onViewHistory?: () => void;
}

export default function IndicatorDetail({
  indicator,
  onEdit,
  onViewHistory,
}: IndicatorDetailProps) {
  const router = useRouter();

  const handleBack = () => {
    router.push("/mlgoo/indicators");
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">
              {indicator.name}
            </h1>
            <p className="text-[var(--muted-foreground)] mt-1">
              Version {indicator.version}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {onViewHistory && (
            <Button
              variant="outline"
              onClick={onViewHistory}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              View History
            </Button>
          )}
          {onEdit && (
            <Button
              onClick={onEdit}
              className="flex items-center gap-2"
              style={{
                background: 'linear-gradient(to bottom right, var(--kpi-blue-from), var(--kpi-blue-to))',
                color: 'var(--kpi-blue-text)',
              }}
            >
              <Edit className="h-4 w-4" />
              Edit Indicator
            </Button>
          )}
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex items-center gap-3 flex-wrap">
        {indicator.governance_area && (
          <Badge
            variant="outline"
            className="px-3 py-1 rounded-sm font-medium"
            style={{
              backgroundColor: 'var(--kpi-blue-from)',
              color: 'var(--kpi-blue-text)',
              borderColor: 'var(--kpi-blue-border, var(--border))'
            }}
          >
            {indicator.governance_area.name}
          </Badge>
        )}

        <Badge
          variant="outline"
          className="px-3 py-1 rounded-sm font-medium"
          style={{
            backgroundColor: indicator.is_active
              ? 'var(--analytics-success-bg)'
              : 'var(--analytics-neutral-bg)',
            color: indicator.is_active
              ? 'var(--analytics-success-text)'
              : 'var(--analytics-neutral-text)',
            borderColor: indicator.is_active
              ? 'var(--analytics-success-border)'
              : 'var(--analytics-neutral-border)'
          }}
        >
          {indicator.is_active ? 'Active' : 'Inactive'}
        </Badge>

        {indicator.is_auto_calculable && (
          <Badge
            variant="outline"
            className="px-3 py-1 rounded-sm font-medium"
            style={{
              backgroundColor: 'var(--kpi-purple-from)',
              color: 'var(--kpi-purple-text)',
              borderColor: 'var(--kpi-purple-border, var(--border))'
            }}
          >
            Auto-calculable
          </Badge>
        )}

        {indicator.is_profiling_only && (
          <Badge
            variant="outline"
            className="px-3 py-1 rounded-sm font-medium"
            style={{
              backgroundColor: 'var(--analytics-warning-bg)',
              color: 'var(--analytics-warning-text)',
              borderColor: 'var(--analytics-warning-border)'
            }}
          >
            Profiling Only
          </Badge>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="form_schema">Form Schema</TabsTrigger>
          <TabsTrigger value="calculation_schema">Calculation Schema</TabsTrigger>
          <TabsTrigger value="remark_schema">Remark Schema</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Core indicator details and metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">
                    Name
                  </label>
                  <p className="text-[var(--foreground)] mt-1">{indicator.name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">
                    Governance Area
                  </label>
                  <p className="text-[var(--foreground)] mt-1">
                    {indicator.governance_area?.name || 'N/A'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">
                    Description
                  </label>
                  <p className="text-[var(--foreground)] mt-1">
                    {indicator.description || 'No description provided'}
                  </p>
                </div>

                {indicator.parent && (
                  <div>
                    <label className="text-sm font-medium text-[var(--muted-foreground)]">
                      Parent Indicator
                    </label>
                    <p className="text-[var(--foreground)] mt-1">
                      {indicator.parent.name} (v{indicator.parent.version})
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">
                    Version
                  </label>
                  <p className="text-[var(--foreground)] mt-1">{indicator.version}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">
                    Created At
                  </label>
                  <p className="text-[var(--foreground)] mt-1">
                    {new Date(indicator.created_at).toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">
                    Last Updated
                  </label>
                  <p className="text-[var(--foreground)] mt-1">
                    {new Date(indicator.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {indicator.technical_notes_text && (
            <Card>
              <CardHeader>
                <CardTitle>Technical Notes</CardTitle>
                <CardDescription>Additional implementation details and guidance</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--foreground)] whitespace-pre-wrap">
                  {indicator.technical_notes_text}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Form Schema Tab */}
        <TabsContent value="form_schema">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Form Schema
              </CardTitle>
              <CardDescription>
                JSON schema defining the form structure for data collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              {indicator.form_schema ? (
                <pre className="bg-[var(--muted)] p-4 rounded-sm overflow-auto max-h-[600px] text-sm">
                  {JSON.stringify(indicator.form_schema, null, 2)}
                </pre>
              ) : (
                <p className="text-[var(--muted-foreground)]">No form schema defined</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calculation Schema Tab */}
        <TabsContent value="calculation_schema">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Calculation Schema
              </CardTitle>
              <CardDescription>
                JSON schema defining automatic Pass/Fail calculation rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              {indicator.calculation_schema ? (
                <pre className="bg-[var(--muted)] p-4 rounded-sm overflow-auto max-h-[600px] text-sm">
                  {JSON.stringify(indicator.calculation_schema, null, 2)}
                </pre>
              ) : (
                <p className="text-[var(--muted-foreground)]">
                  No calculation schema defined
                  {!indicator.is_auto_calculable && ' (not auto-calculable)'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remark Schema Tab */}
        <TabsContent value="remark_schema">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Remark Schema
              </CardTitle>
              <CardDescription>
                JSON schema for generating human-readable status summaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              {indicator.remark_schema ? (
                <pre className="bg-[var(--muted)] p-4 rounded-sm overflow-auto max-h-[600px] text-sm">
                  {JSON.stringify(indicator.remark_schema, null, 2)}
                </pre>
              ) : (
                <p className="text-[var(--muted-foreground)]">No remark schema defined</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
