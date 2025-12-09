/**
 * LockedStateBanner Component (Epic 5.0 - Story 5.13)
 *
 * Displays a banner when an assessment is in a locked state (Epic 5.0 workflow).
 * Shows different messages based on assessment status:
 * - SUBMITTED: Assessment under review, no edits allowed
 * - IN_REVIEW: Assessor is currently reviewing
 * - COMPLETED: Assessment finalized, no edits allowed
 * - SUBMITTED + rework_count >= 1: Final submission warning
 *
 * Note: This is the Epic 5.0 version. For legacy statuses, use AssessmentLockedBanner.
 *
 * Props:
 * - status: Current assessment status
 * - reworkCount: Number of rework cycles used (0 or 1)
 */

"use client";

import { Lock, Eye, CheckCircle2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type AssessmentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "REWORK"
  | "COMPLETED"
  | "AWAITING_FINAL_VALIDATION"
  | "SUBMITTED_FOR_REVIEW";

interface LockedStateBannerProps {
  status: AssessmentStatus;
  reworkCount?: number;
}

export function LockedStateBanner({ status, reworkCount = 0 }: LockedStateBannerProps) {
  // Don't show banner for DRAFT or REWORK statuses (assessment is editable)
  if (status === "DRAFT" || status === "REWORK") {
    return null;
  }

  // Determine banner variant and content based on status
  const getBannerConfig = () => {
    switch (status) {
      case "SUBMITTED":
        return {
          variant: "default" as const,
          icon: Lock,
          title: "Assessment Submitted",
          description: "Your assessment is under review. You cannot make edits at this time.",
          showReworkWarning: reworkCount >= 1,
        };

      case "IN_REVIEW":
      case "SUBMITTED_FOR_REVIEW":
        return {
          variant: "default" as const,
          icon: Eye,
          title: "Assessment In Review",
          description: "An assessor is currently reviewing your submission.",
          showReworkWarning: false,
        };

      case "AWAITING_FINAL_VALIDATION":
        return {
          variant: "default" as const,
          icon: Eye,
          title: "Under Validator Review",
          description:
            "Your assessment is being reviewed by validators. No edits allowed at this time.",
          showReworkWarning: false,
        };

      case "COMPLETED":
        return {
          variant: "default" as const,
          icon: CheckCircle2,
          title: "Assessment Completed",
          description: "This assessment has been finalized. No further edits allowed.",
          showReworkWarning: false,
          isSuccess: true,
        };

      default:
        return null;
    }
  };

  const config = getBannerConfig();

  if (!config) {
    return null;
  }

  const IconComponent = config.icon;

  return (
    <div className="space-y-3">
      {/* Main Status Banner */}
      <Alert
        variant={config.isSuccess ? "default" : "default"}
        className={`
          sticky top-0 z-10 shadow-sm
          ${
            config.isSuccess
              ? "border-green-600 bg-green-50 dark:bg-green-950/20"
              : "border-blue-600 bg-blue-50 dark:bg-blue-950/20"
          }
        `}
      >
        <IconComponent
          className={`h-4 w-4 ${config.isSuccess ? "text-green-600" : "text-blue-600"}`}
        />
        <AlertTitle
          className={
            config.isSuccess
              ? "text-green-700 dark:text-green-400"
              : "text-blue-700 dark:text-blue-400"
          }
        >
          <div className="flex items-center gap-2">
            {config.title}
            <Badge
              variant="secondary"
              className={
                config.isSuccess
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              }
            >
              {status}
            </Badge>
          </div>
        </AlertTitle>
        <AlertDescription
          className={
            config.isSuccess
              ? "text-green-600 dark:text-green-300"
              : "text-blue-600 dark:text-blue-300"
          }
        >
          {config.description}
        </AlertDescription>
      </Alert>

      {/* Rework Limit Warning (only shown when submitted with rework used) */}
      {config.showReworkWarning && (
        <Alert
          variant="destructive"
          className="border-orange-600 bg-orange-50 dark:bg-orange-950/20"
        >
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-700 dark:text-orange-400">Final Submission</AlertTitle>
          <AlertDescription className="text-orange-600 dark:text-orange-300">
            <strong>Note:</strong> You have used your one rework cycle. This is your final
            submission. The assessor cannot request further changes.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
