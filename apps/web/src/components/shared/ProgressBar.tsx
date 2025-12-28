import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const progressBarVariants = cva("relative w-full overflow-hidden rounded-full bg-gray-200", {
  variants: {
    size: {
      sm: "h-2",
      md: "h-3",
      lg: "h-4",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const progressFillVariants = cva("h-full transition-all duration-300 ease-in-out", {
  variants: {
    variant: {
      default: "bg-primary",
      success: "bg-green-500",
      warning: "bg-yellow-500",
      danger: "bg-red-500",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof progressBarVariants> {
  value: number;
  max?: number;
  showLabel?: boolean;
  variant?: VariantProps<typeof progressFillVariants>["variant"];
}

function ProgressBar({
  className,
  value,
  max = 100,
  showLabel = false,
  size,
  variant,
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  // Determine variant based on percentage
  const getVariant = (): VariantProps<typeof progressFillVariants>["variant"] => {
    if (variant) return variant;
    if (percentage >= 80) return "success";
    if (percentage >= 50) return "warning";
    return "danger";
  };

  return (
    <div className="w-full">
      <div className={cn(progressBarVariants({ size }), className)} {...props}>
        <div
          className={cn(progressFillVariants({ variant: getVariant() }))}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-xs text-gray-600 text-right">{Math.round(percentage)}%</div>
      )}
    </div>
  );
}

export { ProgressBar, progressBarVariants };
