import { Building2, FileSpreadsheet, Layers, Map, Table2, type LucideIcon } from "lucide-react";

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
    id: "map",
    label: "Geographic",
    icon: Map,
    description: "Geographic distribution view",
  },
  {
    id: "bbi",
    label: "BBI Status",
    icon: Layers,
    description: "Barangay-based institution functionality",
  },
  {
    id: "table",
    label: "Verdict Results",
    icon: Table2,
    description: "Final verdict results per barangay",
  },
  {
    id: "gar",
    label: "GAR Report",
    icon: FileSpreadsheet,
    description: "Governance Assessment Report",
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
