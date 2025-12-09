import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Input variants for shape and size, using theme tokens from @styling.mdc and @globals.css
const inputVariants = cva(
  "file:text-foreground placeholder:text-muted selection:bg-primary selection:text-primary-foreground bg-input border border-border flex h-9 w-full min-w-0 px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      shape: {
        boxy: "rounded-sm",
        rounded: "rounded-md",
        pill: "rounded-full",
      },
      size: {
        sm: "h-8 text-sm",
        md: "h-9 text-base",
        lg: "h-11 text-lg",
      },
    },
    defaultVariants: {
      shape: "boxy",
      size: "md",
    },
  }
);

type InputProps = React.ComponentProps<"input"> & VariantProps<typeof inputVariants>;

function Input({ className, shape, size, ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      className={cn(
        inputVariants({ shape, size }),
        // Focus and error states as before
        "focus-visible:border-[var(--focus)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-0",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  );
}

export { Input, inputVariants };
