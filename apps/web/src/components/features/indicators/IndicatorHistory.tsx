"use client";

import type { IndicatorHistoryResponse } from "@sinag/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, User, FileJson } from "lucide-react";

interface IndicatorHistoryProps {
  history: IndicatorHistoryResponse[];
  currentVersion: number;
  isLoading?: boolean;
}

export default function IndicatorHistory({
  history,
  currentVersion,
  isLoading = false,
}: IndicatorHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6 animate-pulse"
          >
            <div className="h-6 bg-[var(--muted)] rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-[var(--muted)] rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12 bg-[var(--card)] border border-[var(--border)] rounded-sm">
        <Clock className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No Version History</h3>
        <p className="text-[var(--muted-foreground)]">
          This indicator has no archived versions yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">Version History</h2>
        <p className="text-[var(--muted-foreground)] mt-1">
          {history.length} archived version{history.length !== 1 ? "s" : ""} • Current version:{" "}
          {currentVersion}
        </p>
      </div>

      <div className="space-y-4">
        {history.map((version) => (
          <Card key={version.id} className="overflow-hidden">
            <CardHeader className="bg-[var(--muted)] border-b border-[var(--border)]">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{version.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className="px-3 py-1 rounded-sm font-medium"
                      style={{
                        backgroundColor: "var(--analytics-info-bg)",
                        color: "var(--analytics-info-text)",
                        borderColor: "var(--analytics-info-border)",
                      }}
                    >
                      Version {version.version}
                    </Badge>
                  </div>

                  {version.description && (
                    <CardDescription className="text-sm">{version.description}</CardDescription>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Badge
                    variant="outline"
                    className="px-3 py-1 rounded-sm font-medium"
                    style={{
                      backgroundColor: version.is_active
                        ? "var(--analytics-success-bg)"
                        : "var(--analytics-neutral-bg)",
                      color: version.is_active
                        ? "var(--analytics-success-text)"
                        : "var(--analytics-neutral-text)",
                      borderColor: version.is_active
                        ? "var(--analytics-success-border)"
                        : "var(--analytics-neutral-border)",
                    }}
                  >
                    {version.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {version.is_auto_calculable && (
                    <Badge
                      variant="outline"
                      className="px-3 py-1 rounded-sm font-medium text-xs"
                      style={{
                        backgroundColor: "var(--kpi-purple-from)",
                        color: "var(--kpi-purple-text)",
                        borderColor: "var(--kpi-purple-border, var(--border))",
                      }}
                    >
                      Auto-calc
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <Tabs defaultValue="metadata" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="metadata">Metadata</TabsTrigger>
                  <TabsTrigger value="form_schema">Form Schema</TabsTrigger>
                  <TabsTrigger value="calculation_schema">Calculation</TabsTrigger>
                  <TabsTrigger value="remark_schema">Remark</TabsTrigger>
                </TabsList>

                {/* Metadata Tab */}
                <TabsContent value="metadata" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 bg-[var(--muted)] rounded-sm">
                      <Clock className="h-5 w-5 text-[var(--muted-foreground)] mt-0.5" />
                      <div>
                        <label className="text-sm font-medium text-[var(--muted-foreground)]">
                          Archived At
                        </label>
                        <p className="text-[var(--foreground)] text-sm mt-1">
                          {new Date(version.archived_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {version.archived_by_user && (
                      <div className="flex items-start gap-3 p-3 bg-[var(--muted)] rounded-sm">
                        <User className="h-5 w-5 text-[var(--muted-foreground)] mt-0.5" />
                        <div>
                          <label className="text-sm font-medium text-[var(--muted-foreground)]">
                            Archived By
                          </label>
                          <p className="text-[var(--foreground)] text-sm mt-1">
                            {version.archived_by_user.name}
                          </p>
                          <p className="text-[var(--muted-foreground)] text-xs mt-0.5">
                            {version.archived_by_user.email}
                          </p>
                        </div>
                      </div>
                    )}

                    {!version.archived_by_user && (
                      <div className="flex items-start gap-3 p-3 bg-[var(--muted)] rounded-sm">
                        <User className="h-5 w-5 text-[var(--muted-foreground)] mt-0.5" />
                        <div>
                          <label className="text-sm font-medium text-[var(--muted-foreground)]">
                            Archived By
                          </label>
                          <p className="text-[var(--foreground)] text-sm mt-1 italic">
                            System Migration
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {version.technical_notes_text && (
                    <div className="p-3 bg-[var(--muted)] rounded-sm">
                      <label className="text-sm font-medium text-[var(--muted-foreground)]">
                        Technical Notes
                      </label>
                      <p className="text-[var(--foreground)] text-sm mt-2 whitespace-pre-wrap">
                        {version.technical_notes_text}
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Form Schema Tab */}
                <TabsContent value="form_schema">
                  {version.form_schema ? (
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <FileJson className="h-4 w-4 text-[var(--muted-foreground)]" />
                        <span className="text-sm text-[var(--muted-foreground)]">
                          Form Schema (Version {version.version})
                        </span>
                      </div>
                      <pre className="bg-[var(--muted)] p-4 rounded-sm overflow-auto max-h-[400px] text-sm">
                        {JSON.stringify(version.form_schema, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-[var(--muted-foreground)] text-sm">
                      No form schema in this version
                    </p>
                  )}
                </TabsContent>

                {/* Calculation Schema Tab */}
                <TabsContent value="calculation_schema">
                  {version.calculation_schema ? (
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <FileJson className="h-4 w-4 text-[var(--muted-foreground)]" />
                        <span className="text-sm text-[var(--muted-foreground)]">
                          Calculation Schema (Version {version.version})
                        </span>
                      </div>
                      <pre className="bg-[var(--muted)] p-4 rounded-sm overflow-auto max-h-[400px] text-sm">
                        {JSON.stringify(version.calculation_schema, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-[var(--muted-foreground)] text-sm">
                      No calculation schema in this version
                    </p>
                  )}
                </TabsContent>

                {/* Remark Schema Tab */}
                <TabsContent value="remark_schema">
                  {version.remark_schema ? (
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <FileJson className="h-4 w-4 text-[var(--muted-foreground)]" />
                        <span className="text-sm text-[var(--muted-foreground)]">
                          Remark Schema (Version {version.version})
                        </span>
                      </div>
                      <pre className="bg-[var(--muted)] p-4 rounded-sm overflow-auto max-h-[400px] text-sm">
                        {JSON.stringify(version.remark_schema, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-[var(--muted-foreground)] text-sm">
                      No remark schema in this version
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
