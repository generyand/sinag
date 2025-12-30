import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Input variants for shape and size, using theme tokens from @styling.mdc and @globals.css
const inputVariants = cva(
  "file:text-foreground placeholder:text-muted selection:bg-primary selection:text-primary-foreground bg-input border-2 border-border flex h-12 w-full min-w-0 px-4 py-3 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      shape: {
        boxy: "rounded-sm",
        rounded: "rounded-lg",
        pill: "rounded-full",
      },
      size: {
        sm: "h-10 text-sm px-3 py-2",
        md: "h-12 text-base px-4 py-3",
        lg: "h-14 text-lg px-5 py-4",
      },
    },
    defaultVariants: {
      shape: "rounded",
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
