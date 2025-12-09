import { cn } from "@/lib/utils";
import { CheckCircle, XCircle } from "lucide-react";

interface AreaResult {
  areaName: string;
  status: "Passed" | "Failed";
}

interface AreaResultsDisplayProps {
  areaResults: Record<string, string>;
  className?: string;
}

export function AreaResultsDisplay({ areaResults, className }: AreaResultsDisplayProps) {
  if (!areaResults || Object.keys(areaResults).length === 0) {
    return (
      <div className={cn("p-4 text-sm text-muted-foreground", className)}>
        Area results not yet available
      </div>
    );
  }

  const areaNames = [
    "Financial Administration and Sustainability",
    "Disaster Preparedness",
    "Safety, Peace and Order",
    "Social Protection and Sensitivity",
    "Business-Friendliness and Competitiveness",
    "Environmental Management",
  ];

  const coreAreas = [
    "Financial Administration and Sustainability",
    "Disaster Preparedness",
    "Safety, Peace and Order",
  ];
  const essentialAreas = [
    "Social Protection and Sensitivity",
    "Business-Friendliness and Competitiveness",
    "Environmental Management",
  ];

  const getAreaType = (areaName: string) => {
    if (coreAreas.includes(areaName)) return "Core";
    return "Essential";
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Core Areas */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2">Core Areas (All must pass)</h4>
        <div className="grid grid-cols-1 gap-2">
          {areaNames
            .filter((area) => coreAreas.includes(area))
            .map((area) => {
              const status = areaResults[area];
              const isPassed = status === "Passed";

              return (
                <div
                  key={area}
                  className="flex items-center justify-between p-2 rounded-sm border"
                  style={{
                    backgroundColor: isPassed
                      ? "var(--analytics-success-bg)"
                      : "var(--analytics-danger-bg)",
                    borderColor: isPassed
                      ? "var(--analytics-success-border)"
                      : "var(--analytics-danger-border)",
                  }}
                >
                  <span
                    className="text-sm"
                    style={{
                      color: isPassed
                        ? "var(--analytics-success-text)"
                        : "var(--analytics-danger-text)",
                    }}
                  >
                    {area}
                  </span>
                  {isPassed ? (
                    <CheckCircle
                      className="h-4 w-4"
                      style={{ color: "var(--analytics-success-text)" }}
                    />
                  ) : (
                    <XCircle
                      className="h-4 w-4"
                      style={{ color: "var(--analytics-danger-text)" }}
                    />
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Essential Areas */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2">
          Essential Areas (At least one must pass)
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {areaNames
            .filter((area) => essentialAreas.includes(area))
            .map((area) => {
              const status = areaResults[area];
              const isPassed = status === "Passed";

              return (
                <div
                  key={area}
                  className="flex items-center justify-between p-2 rounded-sm border"
                  style={{
                    backgroundColor: isPassed
                      ? "var(--analytics-success-bg)"
                      : "var(--analytics-danger-bg)",
                    borderColor: isPassed
                      ? "var(--analytics-success-border)"
                      : "var(--analytics-danger-border)",
                  }}
                >
                  <span
                    className="text-sm"
                    style={{
                      color: isPassed
                        ? "var(--analytics-success-text)"
                        : "var(--analytics-danger-text)",
                    }}
                  >
                    {area}
                  </span>
                  {isPassed ? (
                    <CheckCircle
                      className="h-4 w-4"
                      style={{ color: "var(--analytics-success-text)" }}
                    />
                  ) : (
                    <XCircle
                      className="h-4 w-4"
                      style={{ color: "var(--analytics-danger-text)" }}
                    />
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
