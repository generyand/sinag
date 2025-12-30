import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "border-input placeholder:text-muted selection:bg-primary selection:text-primary-foreground bg-input border-2 flex field-sizing-content min-h-24 w-full px-4 py-3 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      shape: {
        boxy: "rounded-sm",
        rounded: "rounded-lg",
        pill: "rounded-2xl",
      },
      size: {
        sm: "min-h-20 text-sm px-3 py-2",
        md: "min-h-24 text-base px-4 py-3",
        lg: "min-h-32 text-lg px-5 py-4",
      },
    },
    defaultVariants: {
      shape: "rounded",
      size: "md",
    },
  }
);

type TextareaProps = React.ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>;

function Textarea({ className, shape, size, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        textareaVariants({ shape, size }),
        "focus-visible:border-[var(--focus)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-0",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  );
}

export { Textarea, textareaVariants };
