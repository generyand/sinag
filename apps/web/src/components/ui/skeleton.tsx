import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const skeletonVariants = cva("animate-pulse bg-[var(--border)]", {
  variants: {
    shape: {
      boxy: "rounded-none",
      rounded: "rounded-md",
      pill: "rounded-full",
    },
    size: {
      sm: "h-4",
      md: "h-6",
      lg: "h-10",
    },
    width: {
      sm: "w-16",
      md: "w-32",
      lg: "w-64",
      full: "w-full",
    },
  },
  defaultVariants: {
    shape: "rounded",
    size: "md",
    width: "full",
  },
});

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof skeletonVariants>;

export function Skeleton({ className, shape, size, width, ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(skeletonVariants({ shape, size, width }), className)}
      {...props}
    />
  );
}
