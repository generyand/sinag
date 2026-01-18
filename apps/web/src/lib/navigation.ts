/**
 * Navigation Configuration
 *
 * Centralized navigation configuration for different user roles.
 * This provides a single source of truth for navigation items.
 */

export interface NavItem {
  name: string;
  href: string;
  icon: string;
}

export const mlgooNavigation: NavItem[] = [
  { name: "Dashboard", href: "/mlgoo/dashboard", icon: "home" },
  { name: "Submission Queue", href: "/mlgoo/submissions", icon: "clipboard" },

  { name: "Analytics & Reports", href: "/analytics", icon: "chart" },
  { name: "Assessment Cycles", href: "/mlgoo/cycles", icon: "calendar" },
  { name: "User Management", href: "/user-management", icon: "users" },
  { name: "System Settings", href: "/mlgoo/settings", icon: "settings" },
  { name: "Profile", href: "/mlgoo/profile", icon: "user" },
];

export const blguNavigation: NavItem[] = [
  { name: "Dashboard", href: "/blgu/dashboard", icon: "home" },
  { name: "My Assessments", href: "/blgu/assessments", icon: "clipboard" },
  { name: "Insights", href: "/blgu/analytics", icon: "chart" },
  { name: "Profile", href: "/blgu/profile", icon: "user" },
];

export const assessorNavigation: NavItem[] = [
  { name: "Submissions Queue", href: "/assessor/submissions", icon: "clipboard" },
  { name: "Review History", href: "/assessor/history", icon: "history" },
  { name: "Profile", href: "/assessor/profile", icon: "user" },
];

export const validatorNavigation: NavItem[] = [
  { name: "Submissions Queue", href: "/validator/submissions", icon: "clipboard" },
  { name: "Validation History", href: "/validator/history", icon: "history" },
  { name: "Analytics", href: "/validator/analytics", icon: "chart" },
  { name: "Profile", href: "/validator/profile", icon: "user" },
];

export const katuparanNavigation: NavItem[] = [
  { name: "Dashboard", href: "/katuparan/dashboard", icon: "home" },
  { name: "Reports", href: "/katuparan/reports", icon: "clipboard" },
  { name: "Profile", href: "/katuparan/profile", icon: "user" },
];

/**
 * Get navigation items based on user role
 */
export function getNavigationByRole(role: string | undefined): NavItem[] {
  if (!role) return blguNavigation;

  const navigationMap: Record<string, NavItem[]> = {
    MLGOO_DILG: mlgooNavigation,
    ASSESSOR: assessorNavigation,
    VALIDATOR: validatorNavigation,
    KATUPARAN_CENTER_USER: katuparanNavigation,
    BLGU_USER: blguNavigation,
  };

  return navigationMap[role] || blguNavigation;
}

/**
 * Get the default dashboard path for a user role
 */
export function getDefaultDashboard(role: string | undefined): string {
  const dashboardMap: Record<string, string> = {
    MLGOO_DILG: "/mlgoo/dashboard",
    ASSESSOR: "/assessor/submissions",
    VALIDATOR: "/validator/submissions",
    KATUPARAN_CENTER_USER: "/katuparan/dashboard",
    BLGU_USER: "/blgu/dashboard",
  };

  return dashboardMap[role || "BLGU_USER"] || "/blgu/dashboard";
}

/**
 * Get the portal name for display
 */
export function getPortalName(role: string | undefined): string {
  const portalMap: Record<string, string> = {
    MLGOO_DILG: "Admin Portal",
    ASSESSOR: "Assessor Portal",
    VALIDATOR: "Validator Portal",
    KATUPARAN_CENTER_USER: "Katuparan Center",
    BLGU_USER: "Barangay Portal",
  };

  return portalMap[role || "BLGU_USER"] || "Barangay Portal";
}
