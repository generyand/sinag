"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Check,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  ExternalLink,
  MapPin,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useMemo, useRef, useState } from "react";
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
  assessment_id?: number; // Assessment ID for linking to GAR page
  assessmentStatus?: AssessmentStatus;
  workflowStatus?: WorkflowStatus;
}

/**
 * Mapping from indicator codes to governance area IDs for GAR page navigation
 */
const INDICATOR_TO_AREA_ID: Record<CoreIndicatorCode | EssentialIndicatorCode, string> = {
  FAS: "1", // CGA 1: Financial Administration & Sustainability
  DP: "2", // CGA 2: Disaster Preparedness
  SPO: "3", // CGA 3: Safety, Peace & Order
  SPS: "4", // EGA 1: Social Protection & Sensitivity
  BFC: "5", // EGA 2: Business-Friendliness & Competitiveness
  EM: "6", // EGA 3: Environmental Management
};

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
 * Full names for indicator codes
 */
const INDICATOR_FULL_NAMES: Record<CoreIndicatorCode | EssentialIndicatorCode, string> = {
  FAS: "Financial Administration & Sustainability",
  DP: "Disaster Preparedness",
  SPO: "Safety, Peace & Order",
  SPS: "Social Protection & Sensitivity",
  BFC: "Business-Friendliness & Competitiveness",
  EM: "Environmental Management",
};

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
 * Hero Status Card - Prominent display of pass/fail status with compliance rate
 */
function HeroStatusCard({
  status,
  complianceRate,
}: {
  status: "pass" | "fail" | "in_progress" | "not_started";
  complianceRate?: number;
}) {
  const _isPassed = status === "pass";
  const _isFailed = status === "fail";
  const isInProgress = status === "in_progress";

  const statusConfig = {
    pass: {
      bgGradient:
        "from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
      iconBg: "bg-emerald-500",
      labelColor: "text-emerald-700 dark:text-emerald-400",
      valueColor: "text-emerald-900 dark:text-emerald-300",
      progressBg: "bg-emerald-600",
      icon: <CheckCircle2 className="h-5 w-5 text-white" />,
      label: "PASSED",
    },
    fail: {
      bgGradient: "from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20",
      border: "border-red-200 dark:border-red-800",
      iconBg: "bg-red-500",
      labelColor: "text-red-700 dark:text-red-400",
      valueColor: "text-red-900 dark:text-red-300",
      progressBg: "bg-red-600",
      icon: <XCircle className="h-5 w-5 text-white" />,
      label: "FAILED",
    },
    in_progress: {
      bgGradient: "from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      iconBg: "bg-amber-500",
      labelColor: "text-amber-700 dark:text-amber-400",
      valueColor: "text-amber-900 dark:text-amber-300",
      progressBg: "bg-amber-600",
      icon: <Clock className="h-5 w-5 text-white" />,
      label: "IN PROGRESS",
    },
    not_started: {
      bgGradient: "from-slate-50 to-slate-100/50 dark:from-slate-950/30 dark:to-slate-900/20",
      border: "border-slate-200 dark:border-slate-700",
      iconBg: "bg-slate-400",
      labelColor: "text-slate-600 dark:text-slate-400",
      valueColor: "text-slate-700 dark:text-slate-300",
      progressBg: "bg-slate-500",
      icon: <Circle className="h-5 w-5 text-white" />,
      label: "NOT STARTED",
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-sm p-3 border-2",
        `bg-gradient-to-br ${config.bgGradient}`,
        config.border
      )}
    >
      {/* Decorative background blur */}
      <div className="absolute top-0 right-0 -mr-6 -mt-6 h-24 w-24 rounded-full bg-white/20 dark:bg-white/5 blur-2xl" />

      <div className="relative flex items-center justify-between gap-4">
        {/* Status indicator */}
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-md shadow-md",
              config.iconBg
            )}
          >
            {config.icon}
          </div>
          <div>
            <div
              className={cn("text-[9px] font-semibold uppercase tracking-wider", config.labelColor)}
            >
              Assessment Result
            </div>
            <div className={cn("text-lg font-bold", config.valueColor)}>{config.label}</div>
          </div>
        </div>

        {/* Compliance Rate (or Completion for in-progress) */}
        {complianceRate !== undefined && (
          <div className="text-right">
            <div className="text-[9px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              {isInProgress ? "Completion" : "Compliance"}
            </div>
            <div className={cn("text-xl font-bold tabular-nums", config.valueColor)}>
              {complianceRate.toFixed(1)}%
            </div>
            {/* Mini progress bar */}
            <div className="mt-1 w-16 h-1 bg-white/60 dark:bg-white/10 rounded-full overflow-hidden ml-auto">
              <div
                className={cn("h-full rounded-full transition-all duration-700", config.progressBg)}
                style={{ width: `${Math.min(complianceRate, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Clickable indicator pill for governance area navigation
 * Extracted as a separate component to prevent re-creation on every render
 */
const IndicatorPill = React.memo(function IndicatorPill({
  code,
  status,
  fullName,
  isClickable,
  onClick,
}: {
  code: CoreIndicatorCode | EssentialIndicatorCode;
  status: IndicatorStatus;
  fullName: string;
  isClickable: boolean;
  onClick: () => void;
}) {
  const isPassed = status === "passed";
  const isFailed = status === "failed";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        "group relative flex items-center gap-1 px-2 py-1 rounded border transition-all duration-200",
        isPassed &&
          "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700",
        isFailed && "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700",
        !isPassed &&
          !isFailed &&
          "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",
        isClickable &&
          "cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 dark:hover:ring-offset-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500",
        !isClickable && "cursor-default"
      )}
      title={fullName}
      aria-label={`${fullName}: ${status}${isClickable ? " - Click to view detailed results" : ""}`}
    >
      {/* Status icon */}
      <div
        className={cn(
          "flex items-center justify-center w-4 h-4 rounded-full",
          isPassed && "bg-emerald-500",
          isFailed && "bg-red-500",
          !isPassed && !isFailed && "bg-slate-300 dark:bg-slate-600"
        )}
      >
        {isPassed && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
        {isFailed && <X className="h-2.5 w-2.5 text-white stroke-[3]" />}
        {!isPassed && !isFailed && <Circle className="h-2 w-2 text-white" />}
      </div>

      {/* Indicator code */}
      <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">{code}</span>

      {/* External link icon for clickable indicators */}
      {isClickable && (
        <ExternalLink className="h-2.5 w-2.5 text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      {/* Enhanced tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 max-w-[180px]">
        <div className="font-semibold">{fullName}</div>
        {isClickable && (
          <div className="text-blue-300 dark:text-blue-400 mt-0.5 flex items-center gap-1">
            <ExternalLink className="h-2 w-2" />
            Click to view detailed results
          </div>
        )}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
      </div>
    </button>
  );
});

/**
 * Compact Assessment Status Section with inline indicators
 */
function AssessmentStatusSection({
  assessmentStatus,
  assessmentId,
}: {
  assessmentStatus: AssessmentStatus;
  assessmentId?: number;
}) {
  const router = useRouter();
  const coreIndicators: CoreIndicatorCode[] = ["FAS", "DP", "SPO"];
  const essentialIndicators: EssentialIndicatorCode[] = ["SPS", "BFC", "EM"];

  const allCorePassed = assessmentStatus.core.passed === assessmentStatus.core.total;
  // Essential only requires at least 1 to pass
  const essentialMet = assessmentStatus.essential.passed >= 1;
  const isClickable = !!assessmentId;

  // Memoized click handlers to prevent re-creation on every render
  const handleIndicatorClick = useCallback(
    (code: CoreIndicatorCode | EssentialIndicatorCode) => {
      if (!assessmentId) return;
      const areaId = INDICATOR_TO_AREA_ID[code];
      router.push(`/mlgoo/gar?assessmentId=${assessmentId}&areaId=${areaId}`);
    },
    [assessmentId, router]
  );

  // Create stable click handlers for each indicator
  const clickHandlers = useMemo(
    () => ({
      FAS: () => handleIndicatorClick("FAS"),
      DP: () => handleIndicatorClick("DP"),
      SPO: () => handleIndicatorClick("SPO"),
      SPS: () => handleIndicatorClick("SPS"),
      BFC: () => handleIndicatorClick("BFC"),
      EM: () => handleIndicatorClick("EM"),
    }),
    [handleIndicatorClick]
  );

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Governance Area Performance
      </h4>

      {/* Core Indicators - responsive layout */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 font-semibold text-[9px] px-1.5 py-0"
            >
              Core
            </Badge>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
              Must all pass
            </span>
          </div>
          <span
            className={cn(
              "text-xs font-bold tabular-nums",
              allCorePassed
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {assessmentStatus.core.passed}/{assessmentStatus.core.total}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {coreIndicators.map((code) => (
            <IndicatorPill
              key={code}
              code={code}
              status={assessmentStatus.core.indicators[code]}
              fullName={INDICATOR_FULL_NAMES[code]}
              isClickable={isClickable}
              onClick={clickHandlers[code]}
            />
          ))}
        </div>
      </div>

      {/* Essential Indicators - responsive layout */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800 font-semibold text-[9px] px-1.5 py-0"
            >
              Essential
            </Badge>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
              At least 1 must pass
            </span>
          </div>
          <span
            className={cn(
              "text-xs font-bold tabular-nums",
              essentialMet
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {assessmentStatus.essential.passed}/{assessmentStatus.essential.total}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {essentialIndicators.map((code) => (
            <IndicatorPill
              key={code}
              code={code}
              status={assessmentStatus.essential.indicators[code]}
              fullName={INDICATOR_FULL_NAMES[code]}
              isClickable={isClickable}
              onClick={clickHandlers[code]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Workflow Progress Stepper
 */
function WorkflowStatusSection({ workflowStatus }: { workflowStatus: WorkflowStatus }) {
  const workflowSteps = [
    { key: "submitted", shortName: "Submit" },
    { key: "review", shortName: "Review" },
    { key: "validation", shortName: "Validate" },
    { key: "approval", shortName: "Approve" },
    { key: "completed", shortName: "Done" },
  ];

  // Determine current step based on phase
  const getCurrentStepIndex = () => {
    const phase = workflowStatus.currentPhase.toLowerCase();
    if (phase.includes("completed") || phase.includes("done") || phase.includes("final")) return 4;
    if (phase.includes("approval") || phase.includes("mlgoo") || phase.includes("phase 3"))
      return 3;
    if (phase.includes("validation") || phase.includes("phase 2")) return 2;
    if (phase.includes("review") || phase.includes("rework")) return 1;
    if (phase.includes("submitted") || phase.includes("phase 1")) return 0;
    return 0;
  };

  const currentStepIndex = getCurrentStepIndex();
  const isCompleted = currentStepIndex === 4;
  const noActionNeeded =
    workflowStatus.actionNeeded.toLowerCase().includes("none") ||
    workflowStatus.actionNeeded.toLowerCase().includes("finalized");

  return (
    <div className="space-y-2.5">
      <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Workflow Progress
      </h4>

      {/* Compact Stepper */}
      <div className="relative">
        {/* Connection line */}
        <div className="absolute top-3 left-3 right-3 h-0.5 bg-slate-200 dark:bg-slate-700" />
        <div
          className="absolute top-3 left-3 h-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-700"
          style={{ width: `${(currentStepIndex / (workflowSteps.length - 1)) * (100 - 6)}%` }}
        />

        <div className="relative flex items-start justify-between">
          {workflowSteps.map((step, index) => {
            const isStepCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div key={step.key} className="flex flex-col items-center relative z-10">
                {/* Step circle */}
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                    isStepCompleted && "bg-emerald-500 border-emerald-500",
                    isCurrent &&
                      "bg-blue-500 border-blue-500 shadow-md shadow-blue-500/30 ring-2 ring-blue-100 dark:ring-blue-900/50",
                    !isStepCompleted &&
                      !isCurrent &&
                      "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                  )}
                >
                  {isStepCompleted ? (
                    <Check className="h-3 w-3 text-white stroke-[3]" />
                  ) : (
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isCurrent ? "bg-white" : "bg-slate-300 dark:bg-slate-600"
                      )}
                    />
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "mt-1 text-[8px] font-medium text-center leading-tight",
                    isStepCompleted || isCurrent
                      ? "text-slate-700 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-500"
                  )}
                >
                  {step.shortName}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compact Status Badge */}
      <div
        className={cn(
          "flex items-center gap-2 px-2.5 py-1.5 rounded border",
          isCompleted
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              "text-[10px] font-semibold",
              isCompleted
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-slate-700 dark:text-slate-200"
            )}
          >
            {workflowStatus.currentPhase}
          </span>
          {!noActionNeeded && (
            <span className="text-[9px] text-amber-600 dark:text-amber-400 ml-1.5">
              • {workflowStatus.actionNeeded}
            </span>
          )}
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
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Use refs to track hover state and prevent flickering caused by rapid state changes
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoveredBarangayRef = useRef<string | null>(null);

  // Event delegation: single handler on SVG instead of per-path handlers
  // This prevents React re-render cycles from interfering with hover detection
  // Using refs to avoid callback recreation on state changes
  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (isTransitioning) return;

      const target = e.target as SVGElement;
      // Check if we're hovering over a path (barangay)
      if (target.tagName === "path" && target.id) {
        // Only update if actually changed (compare with ref, not state)
        if (hoveredBarangayRef.current !== target.id) {
          hoveredBarangayRef.current = target.id;
          setHoveredBarangay(target.id);
        }
      } else if (hoveredBarangayRef.current !== null) {
        // Hovering over non-path element (like background rect)
        hoveredBarangayRef.current = null;
        setHoveredBarangay(null);
      }
    },
    [isTransitioning]
  );

  const handleSvgMouseLeave = useCallback(() => {
    if (isTransitioning) return;
    hoveredBarangayRef.current = null;
    setHoveredBarangay(null);
  }, [isTransitioning]);

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
    // Start transition lock to prevent hover flickering during width animation
    setIsTransitioning(true);
    // Clear hover state immediately when clicking
    setHoveredBarangay(null);

    // Clear any existing transition timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    // Unlock after the CSS transition completes (300ms + buffer)
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 350);

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

  // Handle closing the details panel
  const handleClosePanel = useCallback(() => {
    // Start transition lock to prevent hover flickering during width animation
    setIsTransitioning(true);

    // Clear any existing transition timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    // Unlock after the CSS transition completes (300ms + buffer)
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 350);

    setSelectedBarangay(null);
  }, []);

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
    <Card className="w-full rounded-sm mb-12 overflow-hidden" role="region" aria-label={title}>
      <CardHeader className="px-4 sm:px-6">
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

      <CardContent className="pb-12 px-4 sm:px-6 overflow-hidden">
        {/* Main container with equal heights for map and details */}
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-4 overflow-hidden">
          {/* Map Container - Expands/Shrinks based on selection */}
          <div
            className={`w-full flex items-start transition-[width] duration-300 ease-out overflow-hidden ${
              showDetailsPanel ? "lg:w-2/3" : "lg:w-full"
            }`}
          >
            <div
              className="relative w-full aspect-[2.15/1] min-h-[200px] md:min-h-[250px] overflow-hidden"
              style={{
                willChange: "transform",
                transform: "translateZ(0)",
                contain: "layout style paint",
              }}
            >
              {/* Title Overlay - only show selected barangay name, not hovered (to prevent flickering) */}
              <div className="absolute top-4 left-0 right-0 text-center pointer-events-none z-10 w-full px-4 h-8 md:h-10">
                <h3 className="text-xs md:text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100 bg-white/50 dark:bg-black/50 backdrop-blur-sm py-1 px-3 rounded-full inline-block mx-auto min-w-[180px]">
                  {selectedBarangay ? getDisplayName(selectedBarangay) : "Sulop, Davao del Sur"}
                </h3>
              </div>
              <svg
                viewBox="0 0 1920 892"
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="Interactive map of Sulop barangays showing assessment status. Click on a barangay to view details."
                onMouseMove={handleSvgMouseMove}
                onMouseLeave={handleSvgMouseLeave}
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
                  className="fill-transparent cursor-pointer"
                  onClick={handleClosePanel}
                  aria-hidden="true"
                />

                {/* Barangay Paths - Using event delegation on SVG for hover (no per-path handlers) */}
                {Object.entries(BARANGAY_PATHS).map(([svgId, pathData]) => {
                  const brgy = svgIdToBarangayMap.get(svgId);
                  const displayName = brgy?.name || getDisplayName(svgId);
                  const statusLabel = brgy ? STATUS_LABELS[brgy.status] : "Not Started";
                  const isSelected = svgId === selectedBarangay;
                  return (
                    <path
                      key={svgId}
                      id={svgId}
                      d={pathData}
                      fill={getBarangayColor(svgId)}
                      stroke={isSelected ? getBarangayStrokeColor(svgId) : "white"}
                      strokeWidth={isSelected ? 4 : 1}
                      className="cursor-pointer focus:outline-none"
                      onClick={() => handleBarangayClick(svgId)}
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

              {/* Hover Tooltip - always mounted, visibility controlled by CSS to prevent reflows */}
              <div
                className={`absolute top-2 left-2 bg-white dark:bg-slate-900 shadow-lg rounded-sm border border-slate-200 dark:border-slate-700 pointer-events-none z-10 min-w-[160px] overflow-hidden transition-all duration-150 origin-top-left ${
                  hoveredBarangay && displayedBarangay && !showDetailsPanel
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-95 pointer-events-none"
                }`}
                role="tooltip"
                aria-hidden={!hoveredBarangay || !displayedBarangay || showDetailsPanel}
              >
                {/* Header with status color accent */}
                <div
                  className="px-3 py-2 border-b border-slate-100 dark:border-slate-800"
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: displayedBarangay
                      ? STATUS_COLORS[displayedBarangay.status]
                      : STATUS_COLORS.not_started,
                  }}
                >
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {displayedBarangay?.name || ""}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Sulop, Davao del Sur
                  </div>
                </div>

                {/* Status info - fixed height to prevent layout shifts */}
                <div className="px-3 py-2 space-y-1.5 min-h-[52px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Status
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: displayedBarangay
                          ? STATUS_COLORS[displayedBarangay.status]
                          : STATUS_COLORS.not_started,
                      }}
                    >
                      {displayedBarangay ? STATUS_LABELS[displayedBarangay.status] : ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {displayedBarangay?.status === "in_progress" ? "Completion" : "Compliance"}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {displayedBarangay?.compliance_rate !== undefined
                        ? `${displayedBarangay.compliance_rate.toFixed(1)}%`
                        : "N/A"}
                    </span>
                  </div>
                </div>

                {/* Footer hint */}
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 text-center">
                    Click to view details
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details Panel - Slides in from right when barangay is selected */}
          <aside
            className={`w-full transition-all duration-300 ease-out overflow-hidden ${
              showDetailsPanel
                ? "opacity-100 lg:w-1/3 lg:min-w-[260px] translate-x-0 scale-100"
                : "opacity-0 lg:w-0 translate-x-2 scale-[0.98] h-0 lg:h-auto pointer-events-none"
            }`}
            aria-label="Barangay details panel"
            aria-hidden={!showDetailsPanel}
          >
            <div
              className={`bg-white dark:bg-slate-900 rounded-sm p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-lg h-full transition-all duration-300 ease-out overflow-hidden ${
                showDetailsPanel ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              }`}
            >
              {/* Header */}
              <div
                className={`flex items-start justify-between gap-2 mb-3 transition-all duration-300 ease-out ${
                  showDetailsPanel ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-950/50 rounded flex-shrink-0">
                    <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                      {displayedBarangay?.name || "Select a barangay"}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Sulop, Davao del Sur
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClosePanel}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors flex-shrink-0"
                  aria-label="Close details panel"
                >
                  <X className="w-4 h-4 text-slate-500" aria-hidden="true" />
                </button>
              </div>

              {displayedBarangay ? (
                displayedBarangay.status === "not_started" ? (
                  /* Empty state for barangays without assessment */
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div
                      className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3"
                      aria-hidden="true"
                    >
                      <ClipboardList className="w-6 h-6 text-slate-400" aria-hidden="true" />
                    </div>
                    <Badge
                      variant="secondary"
                      className="mb-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]"
                    >
                      No Assessment Yet
                    </Badge>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[200px]">
                      This barangay hasn&apos;t submitted an assessment for the current cycle yet.
                    </p>
                  </div>
                ) : (
                  /* Details for barangays with assessment data */
                  <div className="space-y-3">
                    {/* Hero Status Card - appears first */}
                    <div
                      className={`transition-all duration-300 ease-out ${
                        showDetailsPanel
                          ? "opacity-100 translate-y-0 delay-[50ms]"
                          : "opacity-0 translate-y-2"
                      }`}
                    >
                      <HeroStatusCard
                        status={displayedBarangay.status}
                        complianceRate={displayedBarangay.compliance_rate}
                      />
                    </div>

                    {/* Assessment Status Section - appears second */}
                    {displayedBarangay.assessmentStatus && (
                      <div
                        className={`pt-3 border-t border-slate-200 dark:border-slate-700 transition-all duration-300 ease-out ${
                          showDetailsPanel
                            ? "opacity-100 translate-y-0 delay-[100ms]"
                            : "opacity-0 translate-y-2"
                        }`}
                      >
                        <AssessmentStatusSection
                          assessmentStatus={displayedBarangay.assessmentStatus}
                          assessmentId={displayedBarangay.assessment_id}
                        />
                      </div>
                    )}

                    {/* Workflow Status Section - appears third */}
                    {displayedBarangay.workflowStatus ? (
                      <div
                        className={`pt-3 border-t border-slate-200 dark:border-slate-700 transition-all duration-300 ease-out ${
                          showDetailsPanel
                            ? "opacity-100 translate-y-0 delay-[150ms]"
                            : "opacity-0 translate-y-2"
                        }`}
                      >
                        <WorkflowStatusSection workflowStatus={displayedBarangay.workflowStatus} />
                      </div>
                    ) : displayedBarangay.status === "in_progress" ? (
                      /* Draft state - not yet submitted to assessor */
                      <div
                        className={`pt-3 border-t border-slate-200 dark:border-slate-700 transition-all duration-300 ease-out ${
                          showDetailsPanel
                            ? "opacity-100 translate-y-0 delay-[150ms]"
                            : "opacity-0 translate-y-2"
                        }`}
                      >
                        <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Workflow Progress
                        </h4>
                        <div className="flex items-center gap-2 px-2.5 py-2 rounded border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                          <div className="p-1 bg-amber-100 dark:bg-amber-900/50 rounded">
                            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1">
                            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                              {(displayedBarangay.compliance_rate ?? 0) === 0
                                ? "Not Started"
                                : (displayedBarangay.compliance_rate ?? 0) >= 100
                                  ? "Ready to Submit"
                                  : "Draft in Progress"}
                            </span>
                            <p className="text-[9px] text-amber-600/80 dark:text-amber-400/70">
                              {(displayedBarangay.compliance_rate ?? 0) === 0
                                ? "BLGU has not started filling out the assessment"
                                : (displayedBarangay.compliance_rate ?? 0) >= 100
                                  ? "BLGU has filled out the form, pending submission"
                                  : "BLGU is currently filling out the assessment"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              ) : (
                <div className="text-sm text-slate-500 text-center py-8">
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
