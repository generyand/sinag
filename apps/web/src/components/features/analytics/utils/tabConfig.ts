import {
  Building2,
  BarChart3,
  PieChart,
  Map,
  Table2,
  Layers,
  type LucideIcon,
} from "lucide-react";

/**
 * Analytics tab configuration.
 */
export interface AnalyticsTab {
  id: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

/**
 * Tab definitions for the Analytics & Reports page.
 */
export const ANALYTICS_TABS: readonly AnalyticsTab[] = [
  {
    id: "overview",
    label: "Overview",
    icon: Building2,
    description: "Municipal compliance summary and key metrics",
  },
  {
    id: "kpis",
    label: "KPIs",
    icon: BarChart3,
    description: "Key performance indicators and statistics",
  },
  {
    id: "charts",
    label: "Charts",
    icon: PieChart,
    description: "Visual charts and graphs",
  },
  {
    id: "map",
    label: "Geographic",
    icon: Map,
    description: "Geographic distribution view",
  },
  {
    id: "table",
    label: "Detailed Results",
    icon: Table2,
    description: "Detailed tabular data",
  },
  {
    id: "bbi",
    label: "BBI Status",
    icon: Layers,
    description: "Barangay-based institution functionality",
  },
] as const;

/**
 * Type for valid tab IDs.
 */
export type AnalyticsTabId = (typeof ANALYTICS_TABS)[number]["id"];

/**
 * Default tab to show when no tab is specified.
 */
export const DEFAULT_TAB: AnalyticsTabId = "overview";

/**
 * Gets a tab configuration by ID.
 */
export function getTabConfig(tabId: string): AnalyticsTab | undefined {
  return ANALYTICS_TABS.find((tab) => tab.id === tabId);
}

/**
 * Validates if a string is a valid tab ID.
 */
export function isValidTabId(tabId: string): tabId is AnalyticsTabId {
  return ANALYTICS_TABS.some((tab) => tab.id === tabId);
}
