"use client";

import { AssessmentStatus } from "@/types/assessment";
import { Clock, Lock, Shield } from "lucide-react";
import {
  getGracePeriodMessage,
  getLockMessage,
  getLockReasonLabel,
  hasActiveGracePeriod,
} from "@/lib/assessment-locks";

interface AssessmentLockedBannerProps {
  status: AssessmentStatus;
  isLockedForBlgu?: boolean | null;
  lockReason?: string | null;
  gracePeriodExpiresAt?: string | null;
}

export function AssessmentLockedBanner({
  status,
  isLockedForBlgu = false,
  lockReason,
  gracePeriodExpiresAt,
}: AssessmentLockedBannerProps) {
  const isGracePeriodActive = hasActiveGracePeriod({
    is_locked_for_blgu: isLockedForBlgu,
    grace_period_expires_at: gracePeriodExpiresAt,
  });

  if (isLockedForBlgu) {
    return (
      <div className="border-b border-red-200 bg-red-50">
        <div className="mx-auto max-w-[1920px] px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 text-sm">
            <div className="rounded-full bg-red-100 p-1 text-red-600">
              <Lock className="h-4 w-4" />
            </div>
            <span className="font-medium text-red-900">{getLockReasonLabel(lockReason)}</span>
            <span className="hidden text-red-400 sm:inline">•</span>
            <span className="hidden text-red-700 sm:inline">{getLockMessage(lockReason)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (isGracePeriodActive) {
    return (
      <div className="border-b border-sky-200 bg-sky-50">
        <div className="mx-auto max-w-[1920px] px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 text-sm">
            <div className="rounded-full bg-sky-100 p-1 text-sky-600">
              <Clock className="h-4 w-4" />
            </div>
            <span className="font-medium text-sky-900">Editing Reopened</span>
            <span className="hidden text-sky-400 sm:inline">•</span>
            <span className="hidden text-sky-700 sm:inline">
              {getGracePeriodMessage(gracePeriodExpiresAt)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const getBannerContent = () => {
    // Normalize status to lowercase for comparison
    const normalizedStatus = (status || "").toLowerCase();

    // Submitted states
    if (
      normalizedStatus === "submitted" ||
      normalizedStatus === "submitted-for-review" ||
      normalizedStatus === "in-review"
    ) {
      return {
        icon: <Clock className="h-4 w-4" />,
        title: "Assessment Submitted",
        description: "This assessment is currently under review.",
        bgClass: "bg-blue-50 border-blue-100",
        iconClass: "text-blue-600 bg-blue-100",
        textClass: "text-blue-900",
        descriptionClass: "text-blue-700",
      };
    }

    // Awaiting final validation
    if (normalizedStatus === "awaiting-final-validation") {
      return {
        icon: <Clock className="h-4 w-4" />,
        title: "Awaiting Final Validation",
        description: "Waiting for final validation from the validator.",
        bgClass: "bg-purple-50 border-purple-100",
        iconClass: "text-purple-600 bg-purple-100",
        textClass: "text-purple-900",
        descriptionClass: "text-purple-700",
      };
    }

    // Validated/Completed states
    if (normalizedStatus === "validated" || normalizedStatus === "completed") {
      return {
        icon: <Shield className="h-4 w-4" />,
        title: "Assessment Validated",
        description: "This assessment has been validated and is locked.",
        bgClass: "bg-emerald-50 border-emerald-100",
        iconClass: "text-emerald-600 bg-emerald-100",
        textClass: "text-emerald-900",
        descriptionClass: "text-emerald-700",
      };
    }

    // Default locked state
    return {
      icon: <Lock className="h-4 w-4" />,
      title: "Assessment Locked",
      description: "This assessment is currently locked.",
      bgClass: "bg-gray-50 border-gray-100",
      iconClass: "text-gray-600 bg-gray-100",
      textClass: "text-gray-900",
      descriptionClass: "text-gray-700",
    };
  };

  const content = getBannerContent();

  return (
    <div className={`border-b ${content.bgClass}`}>
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-center gap-2 text-sm">
          <div className={`p-1 rounded-full ${content.iconClass}`}>{content.icon}</div>
          <span className={`font-medium ${content.textClass}`}>{content.title}</span>
          <span className={`hidden sm:inline text-gray-400`}>•</span>
          <span className={`hidden sm:inline ${content.descriptionClass}`}>
            {content.description}
          </span>
        </div>
      </div>
    </div>
  );
}
