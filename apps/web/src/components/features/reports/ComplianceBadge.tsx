import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface ComplianceBadgeProps {
  status: "Passed" | "Failed";
  assessmentId?: number;
  className?: string;
}

export function ComplianceBadge({ status, assessmentId, className }: ComplianceBadgeProps) {
  const router = useRouter();

  const handleClick = () => {
    if (assessmentId) {
      router.push(`/reports/${assessmentId}`);
    }
  };

  const isPassed = status === "Passed";
  const baseStyles =
    "rounded-sm px-3 py-1 text-xs font-semibold transition-all cursor-pointer hover:shadow-md";

  const getStyles = () => {
    if (isPassed) {
      return cn(
        baseStyles,
        "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100",
        className
      );
    }
    return cn(
      baseStyles,
      "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
      className
    );
  };

  return (
    <Badge
      onClick={handleClick}
      className={getStyles()}
      role={assessmentId ? "button" : undefined}
      tabIndex={assessmentId ? 0 : undefined}
    >
      {isPassed ? (
        <>
          <Check className="h-3 w-3 mr-1" />
          PASSED
        </>
      ) : (
        <>
          <X className="h-3 w-3 mr-1" />
          FAILED
        </>
      )}
    </Badge>
  );
}
