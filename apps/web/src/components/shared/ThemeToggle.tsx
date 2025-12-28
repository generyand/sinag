/**
 * Theme Toggle Component
 *
 * Provides a dropdown menu for switching between Light, Dark, and System themes.
 * Follows @styling.mdc guidelines and uses shadcn/ui components for consistency.
 * Includes proper accessibility features and keyboard navigation support.
 */
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemeToggle } from "@/hooks/useThemeToggle";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  /**
   * Additional CSS classes to apply to the trigger button
   */
  className?: string;
  /**
   * Button size variant
   */
  size?: "default" | "sm" | "lg" | "icon";
  /**
   * Button variant
   */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

/**
 * Theme toggle dropdown component
 *
 * Allows users to switch between Light, Dark, and System themes.
 * Uses the useThemeToggle hook for state management and theme utilities.
 *
 * @param props - Component props
 * @returns Theme toggle dropdown component
 */
export function ThemeToggle({
  className,
  size = "icon",
  variant = "ghost",
  ...props
}: ThemeToggleProps) {
  const { themeOptions, currentThemeOption, setTheme } = useThemeToggle();

  const CurrentIconComponent = currentThemeOption.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            "relative transition-colors",
            "hover:bg-[var(--hover)] hover:text-[var(--foreground)]",
            "focus-visible:ring-[var(--ring)] focus-visible:ring-2",
            className
          )}
          aria-label={`Current theme: ${currentThemeOption.label}. Click to change theme.`}
          {...props}
        >
          <CurrentIconComponent className="h-4 w-4 text-[var(--icon-default)] transition-colors" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="min-w-[160px] bg-[var(--card)] border-[var(--border)]"
      >
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = currentThemeOption.value === option.value;

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 cursor-pointer",
                "hover:bg-[var(--hover)] hover:text-[var(--foreground)]",
                "focus:bg-[var(--hover)] focus:text-[var(--foreground)]",
                "text-[var(--foreground)]",
                isSelected && "bg-[var(--hover)] text-[var(--cityscape-yellow)]"
              )}
              aria-label={`Switch to ${option.label} theme`}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  isSelected ? "text-[var(--cityscape-yellow)]" : "text-[var(--icon-default)]"
                )}
              />
              <span className="flex-1 text-sm font-medium">{option.label}</span>
              {isSelected && (
                <div className="ml-auto h-2 w-2 rounded-full bg-[var(--cityscape-yellow)]" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
