import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "border-input placeholder:text-muted selection:bg-primary selection:text-primary-foreground bg-input border flex field-sizing-content min-h-16 w-full px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      shape: {
        boxy: "rounded-none",
        rounded: "rounded-md",
        pill: "rounded-full",
      },
      size: {
        sm: "min-h-10 text-sm py-1",
        md: "min-h-16 text-base py-2",
        lg: "min-h-24 text-lg py-3",
      },
    },
    defaultVariants: {
      shape: "boxy",
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
