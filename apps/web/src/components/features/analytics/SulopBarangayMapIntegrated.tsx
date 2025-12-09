"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, ClipboardList, Clock, X, XCircle } from "lucide-react";
import React, { useState } from "react";
import { BARANGAY_PATHS } from "./sulop-barangay-paths";

/**
 * Core indicator codes for governance assessment
 */
type CoreIndicatorCode = "FAS" | "DP" | "SPO";

/**
 * Essential indicator codes for governance assessment
 */
type EssentialIndicatorCode = "SPS" | "BFC" | "EM";

/**
 * Status for individual indicators
 */
type IndicatorStatus = "passed" | "failed" | "pending";

/**
 * Assessment status containing Core and Essential indicator results
 */
interface AssessmentStatus {
  core: {
    passed: number;
    total: number;
    indicators: Record<CoreIndicatorCode, IndicatorStatus>;
  };
  essential: {
    passed: number;
    total: number;
    indicators: Record<EssentialIndicatorCode, IndicatorStatus>;
  };
}

/**
 * Workflow status showing current phase and action needed
 */
interface WorkflowStatus {
  currentPhase: string;
  actionNeeded: string;
}

/**
 * Barangay data structure with assessment and workflow status
 */
interface BarangayData {
  id: string; // e.g., "1katipunan", "2tanwalang"
  name: string; // Display name
  status: "pass" | "fail" | "in_progress" | "not_started";
  compliance_rate?: number;
  submission_count?: number;
  assessmentStatus?: AssessmentStatus;
  workflowStatus?: WorkflowStatus;
}

interface SulopBarangayMapProps {
  barangays: BarangayData[];
  onBarangayClick?: (barangay: BarangayData) => void;
  title?: string;
  description?: string;
}

/**
 * Color scheme for barangay status
 */
const STATUS_COLORS = {
  pass: "#22c55e", // Green
  fail: "#ef4444", // Red
  in_progress: "#f59e0b", // Orange
  not_started: "#94a3b8", // Gray
} as const;

/**
 * Darker stroke colors for selected state - same hue but darker shade
 */
const STATUS_STROKE_COLORS = {
  pass: "#15803d", // Darker green
  fail: "#b91c1c", // Darker red
  in_progress: "#b45309", // Darker orange
  not_started: "#475569", // Darker gray
} as const;

const STATUS_LABELS = {
  pass: "Pass",
  fail: "Fail",
  in_progress: "In Progress",
  not_started: "Not Started",
} as const;

/**
 * Mapping from SVG path IDs to possible barangay name variations
 * This allows matching API data (which uses barangay names) to SVG paths (which use IDs)
 */
const SVG_ID_TO_NAME_VARIATIONS: Record<string, string[]> = {
  "1katipunan": ["katipunan"],
  "2tanwalang": ["tanwalang"],
  "3solongvale": ["solongvale", "solong vale", "solong-vale"],
  "4tala-o": ["tala-o", "talao", "tala o"],
  "5balasinon": ["balasinon"],
  "6haradabutai": ["harada-butai", "haradabutai", "harada butai"],
  "7roxas": ["roxas"],
  "8newcebu": ["new cebu", "newcebu", "new-cebu"],
  "9palili": ["palili"],
  "10talas": ["talas"],
  "11carre": ["carre"],
  "12buguis": ["buguis"],
  "13mckinley": ["mckinley", "mc kinley", "mc-kinley"],
  "14kiblagon": ["kiblagon"],
  "15laperas": ["laperas"],
  "16clib": ["clib"],
  "17osmena": ["osmena", "osmeña"],
  "18luparan": ["luparan"],
  "19poblacion": ["poblacion"],
  "20tagolilong": ["tagolilong"],
  "21lapla": ["lapla"],
  "22litos": ["litos"],
  "23parame": ["parame"],
  "24labon": ["labon"],
  "25waterfall": ["waterfall"],
};

/**
 * Normalizes a name for comparison (lowercase, no special chars except alphanumeric)
 */
const normalizeName = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
};

/**
 * Find SVG ID from barangay name or numeric ID
 */
const findSvgIdFromBarangay = (barangayId: string, barangayName: string): string | null => {
  const normalizedName = normalizeName(barangayName);

  // First try: exact match with normalized name
  for (const [svgId, variations] of Object.entries(SVG_ID_TO_NAME_VARIATIONS)) {
    for (const variation of variations) {
      if (normalizeName(variation) === normalizedName) {
        return svgId;
      }
    }
  }

  // Second try: check if normalized name contains or is contained by variation
  for (const [svgId, variations] of Object.entries(SVG_ID_TO_NAME_VARIATIONS)) {
    for (const variation of variations) {
      const normalizedVariation = normalizeName(variation);
      if (
        normalizedName.includes(normalizedVariation) ||
        normalizedVariation.includes(normalizedName)
      ) {
        return svgId;
      }
    }
  }

  // Third try: check if numeric ID matches SVG ID prefix (e.g., "1" matches "1katipunan")
  for (const svgId of Object.keys(SVG_ID_TO_NAME_VARIATIONS)) {
    const numericPrefix = svgId.match(/^(\d+)/)?.[1];
    if (numericPrefix === barangayId) {
      return svgId;
    }
  }

  return null;
};

/**
 * Assessment Status Section - Displays Core and Essential indicator results
 * Clean card layout with balanced visual hierarchy
 */
function AssessmentStatusSection({ assessmentStatus }: { assessmentStatus: AssessmentStatus }) {
  const getIndicatorIcon = (status: IndicatorStatus) => {
    switch (status) {
      case "passed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600" />;
    }
  };

  const coreIndicators: CoreIndicatorCode[] = ["FAS", "DP", "SPO"];
  const essentialIndicators: EssentialIndicatorCode[] = ["SPS", "BFC", "EM"];

  const allCorePassed = assessmentStatus.core.passed === assessmentStatus.core.total;
  const allEssentialPassed = assessmentStatus.essential.passed === assessmentStatus.essential.total;

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Assessment Status
      </h4>

      {/* Two-column grid for Core and Essential */}
      <div className="grid grid-cols-2 gap-3">
        {/* Core Card */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Core</span>
            <span
              className={`text-xs font-bold ${allCorePassed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
            >
              {assessmentStatus.core.passed}/{assessmentStatus.core.total}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            {coreIndicators.map((code) => (
              <div
                key={code}
                className="flex flex-col items-center gap-0.5 flex-1"
                title={`${code}: ${assessmentStatus.core.indicators[code]}`}
              >
                {getIndicatorIcon(assessmentStatus.core.indicators[code])}
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                  {code}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Essential Card */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Essential
            </span>
            <span
              className={`text-xs font-bold ${allEssentialPassed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
            >
              {assessmentStatus.essential.passed}/{assessmentStatus.essential.total}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            {essentialIndicators.map((code) => (
              <div
                key={code}
                className="flex flex-col items-center gap-0.5 flex-1"
                title={`${code}: ${assessmentStatus.essential.indicators[code]}`}
              >
                {getIndicatorIcon(assessmentStatus.essential.indicators[code])}
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                  {code}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Workflow Status Section - Displays current phase and action needed
 * Clean card layout matching Assessment Status section
 */
function WorkflowStatusSection({ workflowStatus }: { workflowStatus: WorkflowStatus }) {
  const isCompleted = workflowStatus.currentPhase.toLowerCase().includes("completed");
  const noActionNeeded = workflowStatus.actionNeeded.toLowerCase().includes("none");

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Workflow Status
      </h4>

      {/* Two-column grid for balanced layout */}
      <div className="grid grid-cols-2 gap-3">
        {/* Current Phase Card */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
              Phase
            </span>
          </div>
          <p
            className={`text-xs font-semibold truncate ${isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-gray-700 dark:text-gray-300"}`}
            title={workflowStatus.currentPhase}
          >
            {workflowStatus.currentPhase}
          </p>
        </div>

        {/* Action Needed Card */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            {!noActionNeeded && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
            {noActionNeeded && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
              Action
            </span>
          </div>
          <p
            className={`text-xs font-semibold truncate ${noActionNeeded ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
            title={workflowStatus.actionNeeded}
          >
            {noActionNeeded ? "None" : workflowStatus.actionNeeded}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Sulop Barangay Map - Fully Integrated with Your SVG Data
 *
 * This component now contains the actual barangay boundary paths from your SVG.
 * Each path is interactive and will be colored based on the barangay's status.
 */
export function SulopBarangayMapIntegrated({
  barangays,
  onBarangayClick,
  title = "Sulop Barangay Assessment Status",
  description = "Interactive map showing assessment status for each barangay in Sulop",
}: SulopBarangayMapProps) {
  const [hoveredBarangay, setHoveredBarangay] = useState<string | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<string | null>(null);

  // Create a lookup map that maps SVG path IDs to barangay data
  // This handles the conversion from API barangay data to SVG element IDs
  const svgIdToBarangayMap = React.useMemo(() => {
    const map = new Map<string, BarangayData>();
    barangays.forEach((brgy) => {
      // Try to find matching SVG ID using name and id
      const svgId = findSvgIdFromBarangay(brgy.id, brgy.name);
      if (svgId) {
        map.set(svgId, brgy);
      }
      // Also keep original ID mapping as fallback
      map.set(brgy.id, brgy);
    });
    return map;
  }, [barangays]);

  // Get color for a barangay based on its status (using SVG path ID)
  const getBarangayColor = (svgId: string): string => {
    const brgy = svgIdToBarangayMap.get(svgId);
    if (!brgy) return STATUS_COLORS.not_started;
    return STATUS_COLORS[brgy.status];
  };

  // Get stroke color for selected barangay (darker shade of status color)
  const getBarangayStrokeColor = (svgId: string): string => {
    const brgy = svgIdToBarangayMap.get(svgId);
    if (!brgy) return STATUS_STROKE_COLORS.not_started;
    return STATUS_STROKE_COLORS[brgy.status];
  };

  // Get display name from SVG ID
  const getDisplayName = (svgId: string): string => {
    const variations = SVG_ID_TO_NAME_VARIATIONS[svgId];
    if (variations && variations.length > 0) {
      // Capitalize first letter of each word
      return variations[0]
        .split(/[-\s]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
    return svgId;
  };

  // Handle barangay path click - works for all barangays including those without data
  const handleBarangayClick = (svgId: string) => {
    setSelectedBarangay(svgId);
    const brgy = svgIdToBarangayMap.get(svgId);
    if (brgy) {
      onBarangayClick?.(brgy);
    } else {
      // Create a placeholder for barangays without data
      const placeholderBarangay: BarangayData = {
        id: svgId,
        name: getDisplayName(svgId),
        status: "not_started",
      };
      onBarangayClick?.(placeholderBarangay);
    }
  };

  // Get currently displayed barangay - when panel is open, only show selected barangay (not hovered)
  const getDisplayedBarangay = (): BarangayData | null => {
    // When details panel is open, only show the selected barangay (ignore hover)
    const targetId = selectedBarangay ? selectedBarangay : hoveredBarangay;
    if (!targetId) return null;

    const existing = svgIdToBarangayMap.get(targetId);
    if (existing) return existing;

    // Create placeholder for barangays without data
    return {
      id: targetId,
      name: getDisplayName(targetId),
      status: "not_started",
    };
  };

  const displayedBarangay = getDisplayedBarangay();

  // Check if details panel should be shown
  const showDetailsPanel = selectedBarangay !== null;

  // Count barangays by status
  const statusCounts = React.useMemo(() => {
    const counts = {
      pass: 0,
      fail: 0,
      in_progress: 0,
      not_started: 0,
    };
    barangays.forEach((brgy) => {
      counts[brgy.status]++;
    });
    return counts;
  }, [barangays]);

  return (
    <Card className="w-full rounded-sm" role="region" aria-label={title}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>

        {/* Status Legend */}
        <div
          className="flex flex-wrap gap-2 pt-2"
          role="list"
          aria-label="Assessment status legend"
        >
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <Badge
              key={status}
              variant="outline"
              className="flex items-center gap-2 border-0"
              role="listitem"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="text-xs">
                {STATUS_LABELS[status as keyof typeof STATUS_LABELS]} (
                {statusCounts[status as keyof typeof statusCounts]})
              </span>
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {/* Main container with equal heights for map and details */}
        <div className="flex flex-col md:flex-row md:items-stretch gap-4">
          {/* Map Container - Expands/Shrinks based on selection */}
          <div
            className={`transition-all duration-500 ease-in-out w-full flex items-center ${
              showDetailsPanel ? "md:w-2/3" : "md:w-full"
            }`}
          >
            <div className="relative w-full aspect-[2.15/1] min-h-[250px] md:min-h-0 bg-gray-50 dark:bg-gray-900 rounded-sm overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-sm">
              {/* Title Overlay */}
              <div className="absolute top-4 left-0 right-0 text-center pointer-events-none z-10 w-full px-4">
                <h3 className="text-xs md:text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100 bg-white/50 dark:bg-black/50 backdrop-blur-sm py-1 px-3 rounded-full inline-block mx-auto">
                  {displayedBarangay?.name || "Sulop, Davao del Sur"}
                </h3>
              </div>
              <svg
                viewBox="0 0 1920 892"
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="Interactive map of Sulop barangays showing assessment status. Click on a barangay to view details."
              >
                <title>Sulop Barangay Assessment Map</title>
                <desc>
                  Interactive map showing the assessment status of all 25 barangays in Sulop, Davao
                  del Sur. Colors indicate: green for passed, red for failed, orange for in
                  progress, and gray for not started.
                </desc>

                {/* Background - Click to close details panel */}
                <rect
                  width="1920"
                  height="892"
                  className="fill-gray-50 dark:fill-gray-900 cursor-pointer"
                  onClick={() => setSelectedBarangay(null)}
                  aria-hidden="true"
                />

                {/* Barangay Paths - High Quality SVG with Bezier Curves */}
                {Object.entries(BARANGAY_PATHS).map(([svgId, pathData]) => {
                  const brgy = svgIdToBarangayMap.get(svgId);
                  const displayName = brgy?.name || getDisplayName(svgId);
                  const statusLabel = brgy ? STATUS_LABELS[brgy.status] : "Not Started";
                  return (
                    <path
                      key={svgId}
                      id={svgId}
                      d={pathData}
                      fill={getBarangayColor(svgId)}
                      stroke={selectedBarangay === svgId ? getBarangayStrokeColor(svgId) : "none"}
                      strokeWidth={selectedBarangay === svgId ? 4 : 0}
                      className="cursor-pointer transition-all duration-200 hover:brightness-110 focus:outline-none"
                      onClick={() => handleBarangayClick(svgId)}
                      onMouseEnter={() => setHoveredBarangay(svgId)}
                      onMouseLeave={() => setHoveredBarangay(null)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${displayName}: ${statusLabel}${brgy?.compliance_rate !== undefined ? `, ${brgy.compliance_rate.toFixed(1)}% compliance` : ""}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleBarangayClick(svgId);
                        }
                      }}
                    />
                  );
                })}
              </svg>

              {/* Hover Tooltip */}
              {hoveredBarangay && displayedBarangay && !showDetailsPanel && (
                <div
                  className="absolute top-2 left-2 bg-white shadow-lg rounded-sm p-3 border pointer-events-none z-10"
                  role="tooltip"
                  aria-live="polite"
                >
                  <div className="text-sm font-semibold">{displayedBarangay.name}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Status:{" "}
                    <span
                      className="font-medium"
                      style={{ color: STATUS_COLORS[displayedBarangay.status] }}
                    >
                      {STATUS_LABELS[displayedBarangay.status]}
                    </span>
                  </div>
                  {displayedBarangay.compliance_rate !== undefined && (
                    <div className="text-xs text-gray-600">
                      Compliance: {displayedBarangay.compliance_rate.toFixed(1)}%
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-2 italic">Click to view details</div>
                </div>
              )}
            </div>
          </div>

          {/* Details Panel - Slides in from right when barangay is selected */}
          <aside
            className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] w-full ${
              showDetailsPanel
                ? "opacity-100 md:w-1/3 translate-x-0"
                : "opacity-0 md:w-0 md:translate-x-4 h-0 md:h-auto overflow-hidden"
            }`}
            aria-label="Barangay details panel"
            aria-hidden={!showDetailsPanel}
          >
            <div className="bg-gray-50 dark:bg-gray-800 rounded-sm p-4 border-2 border-gray-200 dark:border-gray-700 shadow-sm h-full min-w-[280px] transition-transform duration-300">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold" id="details-panel-heading">
                  Barangay Details
                </h3>
                <button
                  onClick={() => setSelectedBarangay(null)}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  aria-label="Close details panel"
                >
                  <X className="w-4 h-4 text-gray-500" aria-hidden="true" />
                </button>
              </div>

              {displayedBarangay ? (
                displayedBarangay.status === "not_started" ? (
                  /* Empty state for barangays without assessment */
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div
                      className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4"
                      aria-hidden="true"
                    >
                      <ClipboardList className="w-8 h-8 text-gray-400" aria-hidden="true" />
                    </div>
                    <div className="text-lg font-bold text-gray-900 mb-1">
                      {displayedBarangay.name}
                    </div>
                    <Badge
                      variant="secondary"
                      className="mb-4 bg-gray-200 text-gray-600 rounded-sm"
                    >
                      No Assessment Yet
                    </Badge>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-[200px]">
                      This barangay hasn&apos;t submitted an assessment for the current cycle yet.
                    </p>
                  </div>
                ) : (
                  /* Details for barangays with assessment data */
                  <div className="space-y-3">
                    <div>
                      <div className="text-lg font-bold text-gray-900">
                        {displayedBarangay.name}
                      </div>
                      <div className="text-xs text-gray-500">ID: {displayedBarangay.id}</div>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600">Status:</span>
                        <Badge
                          style={{
                            backgroundColor: STATUS_COLORS[displayedBarangay.status],
                            color: "white",
                          }}
                        >
                          {STATUS_LABELS[displayedBarangay.status]}
                        </Badge>
                      </div>

                      {displayedBarangay.compliance_rate !== undefined && (
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-600">Compliance Rate:</span>
                          <span className="text-sm font-semibold">
                            {displayedBarangay.compliance_rate.toFixed(1)}%
                          </span>
                        </div>
                      )}

                      {displayedBarangay.submission_count !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Submissions:</span>
                          <span className="text-sm font-semibold">
                            {displayedBarangay.submission_count}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Assessment Status Section */}
                    {displayedBarangay.assessmentStatus && (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <AssessmentStatusSection
                          assessmentStatus={displayedBarangay.assessmentStatus}
                        />
                      </div>
                    )}

                    {/* Workflow Status Section */}
                    {displayedBarangay.workflowStatus && (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <WorkflowStatusSection workflowStatus={displayedBarangay.workflowStatus} />
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">
                  Click a barangay to view details
                </div>
              )}
            </div>
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}
