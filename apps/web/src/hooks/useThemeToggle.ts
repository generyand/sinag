/**
 * Custom hook for theme toggle functionality
 *
 * Provides theme state management, icon selection, and label generation
 * for the theme toggle component. Integrates with the ThemeProvider context.
 *
 * @returns Object containing theme state, setter, and display properties
 */
"use client";

import { useTheme } from "@/providers/ThemeProvider";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

interface ThemeOption {
  value: Theme;
  label: string;
  icon: typeof Sun;
}

/**
 * Custom hook for managing theme toggle functionality
 *
 * @returns Theme management state and utilities
 */
export function useThemeToggle() {
  const { theme, setTheme, actualTheme } = useTheme();

  // Theme options configuration
  const themeOptions: ThemeOption[] = [
    {
      value: "light",
      label: "Light",
      icon: Sun,
    },
    {
      value: "dark",
      label: "Dark",
      icon: Moon,
    },
    {
      value: "system",
      label: "System",
      icon: Monitor,
    },
  ];

  // Get current theme option
  const currentThemeOption =
    themeOptions.find((option) => option.value === theme) || themeOptions[2];

  // Get the icon for the current theme
  const getCurrentIcon = () => {
    return currentThemeOption.icon;
  };

  // Get the label for the current theme
  const getCurrentLabel = () => {
    return currentThemeOption.label;
  };

  // Handle theme change
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return {
    // Current theme state
    theme,
    actualTheme,

    // Theme options
    themeOptions,
    currentThemeOption,

    // Display utilities
    getCurrentIcon,
    getCurrentLabel,

    // Actions
    setTheme: handleThemeChange,
  };
}
