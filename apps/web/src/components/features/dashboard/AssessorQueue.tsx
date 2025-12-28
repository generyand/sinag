"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AssessorData {
  id: string;
  name: string;
  governanceArea: string;
  pendingReviews: number;
  averageReviewTime: string;
  status: "active" | "overloaded" | "available";
}

interface AssessorQueueProps {
  data: AssessorData[];
}

const getStatusConfig = (status: AssessorData["status"]) => {
  switch (status) {
    case "overloaded":
      return {
        color: "var(--analytics-danger-text)",
        bgColor: "var(--analytics-danger-bg)",
        label: "Overloaded",
      };
    case "active":
      return {
        color: "var(--analytics-warning-text)",
        bgColor: "var(--analytics-warning-bg)",
        label: "Active",
      };
    case "available":
      return {
        color: "var(--analytics-success-text)",
        bgColor: "var(--analytics-success-bg)",
        label: "Available",
      };
    default:
      return {
        color: "var(--analytics-neutral-text)",
        bgColor: "var(--analytics-neutral-bg)",
        label: "Unknown",
      };
  }
};

export function AssessorQueue({ data }: AssessorQueueProps) {
  const totalPending = data.reduce((sum, assessor) => sum + assessor.pendingReviews, 0);
  const overloadedAssessors = data.filter((a) => a.status === "overloaded").length;

  return (
    <Card className="bg-[var(--card)] border border-[var(--border)] shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-[var(--foreground)]">
              Assessor Queue
            </CardTitle>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Current workload and performance metrics
            </p>
          </div>
          <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)]">
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
              {totalPending}
            </div>
            <div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
              Total Pending
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {overloadedAssessors > 0 && (
            <div
              className="rounded-sm p-4 backdrop-blur-sm border"
              style={{
                backgroundColor: "var(--analytics-danger-bg)",
                borderColor: "var(--analytics-danger-border)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-sm flex items-center justify-center"
                  style={{ backgroundColor: "var(--analytics-danger-bg)" }}
                >
                  <span className="text-sm" style={{ color: "var(--analytics-danger-text)" }}>
                    ⚠️
                  </span>
                </div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--analytics-danger-text)" }}
                >
                  {overloadedAssessors} assessor{overloadedAssessors > 1 ? "s" : ""}
                  {overloadedAssessors > 1 ? " are" : " is"} overloaded and may need assistance
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {data.map((assessor) => {
              const statusConfig = getStatusConfig(assessor.status);
              const isOverloaded = assessor.pendingReviews > 5;

              return (
                <div
                  key={assessor.id}
                  className="p-4 rounded-sm border transition-all duration-200 hover:shadow-md"
                  style={{
                    backgroundColor: isOverloaded
                      ? "var(--analytics-danger-bg)"
                      : assessor.pendingReviews === 0
                        ? "var(--analytics-success-bg)"
                        : "var(--hover)",
                    borderColor: isOverloaded
                      ? "var(--analytics-danger-border)"
                      : assessor.pendingReviews === 0
                        ? "var(--analytics-success-border)"
                        : "var(--border)",
                    opacity: assessor.pendingReviews === 0 ? 0.8 : 1,
                  }}
                >
                  <div className="flex items-center justify-between">
                    {/* Assessor Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-[var(--foreground)]">{assessor.name}</h4>
                        <Badge
                          variant="secondary"
                          className="text-xs font-medium rounded-sm"
                          style={{
                            backgroundColor: statusConfig.bgColor,
                            color: statusConfig.color,
                          }}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {assessor.governanceArea}
                      </p>
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div
                          className="text-2xl font-bold"
                          style={{
                            color:
                              assessor.pendingReviews > 5
                                ? "var(--analytics-danger-text-light)"
                                : assessor.pendingReviews > 0 && assessor.pendingReviews <= 5
                                  ? "var(--analytics-warning-text-light)"
                                  : assessor.pendingReviews === 0
                                    ? "var(--analytics-success-text-light)"
                                    : "var(--foreground)",
                          }}
                        >
                          {assessor.pendingReviews}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">Pending</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-[var(--foreground)]">
                          {assessor.averageReviewTime}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">Avg. Time</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-[var(--hover)] rounded-sm p-4 space-y-2">
            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">
              Performance Insights
            </h4>
            <div className="grid grid-cols-1 gap-2 text-xs text-[var(--muted-foreground)]">
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "var(--analytics-danger)" }}
                ></div>
                <span>High pending reviews (&gt;5) indicate potential bottlenecks</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "var(--kpi-blue-text)" }}
                ></div>
                <span>Average review time helps identify performance patterns</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "var(--analytics-success)" }}
                ></div>
                <span>Consider redistributing workload for overloaded assessors</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
