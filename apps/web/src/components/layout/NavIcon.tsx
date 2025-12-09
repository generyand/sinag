"use client";

/**
 * NavIcon Component
 *
 * Renders navigation icons using lucide-react.
 * Provides accessible icons with proper aria attributes.
 */

import {
  Home,
  ClipboardList,
  BarChart3,
  Users,
  User,
  Settings,
  ListTodo,
  Layers,
  Calendar,
  Building2,
  Clock,
  type LucideIcon,
} from "lucide-react";

/**
 * Mapping of icon names to lucide-react components
 */
const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  clipboard: ClipboardList,
  chart: BarChart3,
  users: Users,
  user: User,
  settings: Settings,
  list: ListTodo,
  layers: Layers,
  calendar: Calendar,
  building: Building2,
  clock: Clock,
};

interface NavIconProps {
  name: string;
  className?: string;
}

/**
 * Renders a navigation icon with proper accessibility
 */
export function NavIcon({ name, className = "w-5 h-5" }: NavIconProps) {
  const IconComponent = ICON_MAP[name];

  if (!IconComponent) {
    return null;
  }

  return <IconComponent className={className} aria-hidden="true" />;
}
