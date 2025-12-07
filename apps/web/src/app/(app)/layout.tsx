"use client";

import UserNav from "@/components/shared/UserNav";
import { NotificationBell } from "@/components/features/notifications";
import { useAssessorGovernanceArea } from "@/hooks/useAssessorGovernanceArea";
import { useAuthStore } from "@/store/useAuthStore";
import {
  X,
  ChevronLeft,
  ChevronRight,
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
  Menu,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/**
 * Icon mapping for navigation items
 * Uses lucide-react icons for better accessibility and smaller bundle
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

/**
 * Renders a navigation icon with proper accessibility
 */
function NavIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const IconComponent = ICON_MAP[name];
  if (!IconComponent) return null;
  return <IconComponent className={className} aria-hidden="true" />;
}

// Navigation items for different user roles
const mlgooNavigation = [
  { name: "Dashboard", href: "/mlgoo/dashboard", icon: "home" },
  { name: "Submission Queue", href: "/mlgoo/submissions", icon: "clipboard" },
  { name: "GAR Reports", href: "/mlgoo/gar", icon: "clipboard" },
  { name: "Analytics & Reports", href: "/analytics", icon: "chart" },
  { name: "Assessment Cycles", href: "/mlgoo/cycles", icon: "calendar" },
  { name: "User Management", href: "/user-management", icon: "users" },
  { name: "System Settings", href: "/mlgoo/settings", icon: "settings" },
  { name: "Profile", href: "/mlgoo/profile", icon: "user" },
];

const blguNavigation = [
  { name: "Dashboard", href: "/blgu/dashboard", icon: "home" },
  { name: "My Assessments", href: "/blgu/assessments", icon: "clipboard" },
  { name: "Profile", href: "/blgu/profile", icon: "user" },
];

const assessorNavigation = [
  {
    name: "Submissions Queue",
    href: "/assessor/submissions",
    icon: "clipboard",
  },
  { name: "Analytics", href: "/assessor/analytics", icon: "chart" },
  { name: "Profile", href: "/assessor/profile", icon: "user" },
];

const validatorNavigation = [
  {
    name: "Submissions Queue",
    href: "/validator/submissions",
    icon: "clipboard",
  },
  { name: "Profile", href: "/validator/profile", icon: "user" },
];

const katuparanNavigation = [
  { name: "Dashboard", href: "/katuparan/dashboard", icon: "home" },
  { name: "Reports", href: "/katuparan/reports", icon: "clipboard" },
  { name: "Profile", href: "/katuparan/profile", icon: "user" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, mustChangePassword } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Get assessor's governance area
  const { governanceAreaName } = useAssessorGovernanceArea();

  // Memoize role flags to prevent recalculation on every render
  const { isAdmin, isAssessor, isValidator, isExternalUser } = useMemo(
    () => ({
      isAdmin: user?.role === "MLGOO_DILG",
      isAssessor: user?.role === "ASSESSOR",
      isValidator: user?.role === "VALIDATOR",
      isExternalUser: user?.role === "KATUPARAN_CENTER_USER",
    }),
    [user?.role]
  );

  // Memoize navigation based on user role
  const navigation = useMemo(() => {
    if (!user) return blguNavigation;

    const navigationMap: Record<string, typeof mlgooNavigation> = {
      MLGOO_DILG: mlgooNavigation,
      ASSESSOR: assessorNavigation,
      VALIDATOR: validatorNavigation,
      KATUPARAN_CENTER_USER: katuparanNavigation,
    };

    return navigationMap[user.role] || blguNavigation;
  }, [user]);

  // Derive isUserDataLoaded from isAuthenticated and user
  const isUserDataLoaded = isAuthenticated && !!user;

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  // Redirect users to change password if required
  useEffect(() => {
    if (isAuthenticated && user && mustChangePassword && pathname !== "/change-password") {
      router.replace("/change-password");
      return;
    }
  }, [isAuthenticated, user, mustChangePassword, pathname, router]);

  // NOTE: Role-based redirect logic has been moved to middleware.ts
  // The middleware handles all route protection and redirects BEFORE the page renders,
  // which prevents the "flash" issue where users briefly see the wrong dashboard.
  // This layout component now only handles root path redirects.
  useEffect(() => {
    // Only redirect from root path if user data is fully loaded
    if (isAuthenticated && user && !mustChangePassword && isUserDataLoaded) {
      const currentPath = pathname;

      // If user is on root path, redirect to appropriate dashboard
      if (currentPath === "/") {
        const dashboardPath = isAdmin
          ? "/mlgoo/dashboard"
          : isAssessor
            ? "/assessor/submissions"
            : isValidator
              ? "/validator/submissions"
              : isExternalUser
                ? "/katuparan/dashboard"
                : "/blgu/dashboard";
        router.replace(dashboardPath);
      }
    }
  }, [
    isAuthenticated,
    user,
    mustChangePassword,
    pathname,
    router,
    isAdmin,
    isAssessor,
    isValidator,
    isExternalUser,
    isUserDataLoaded,
  ]);

  // Show loading if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show loading if user data is not yet loaded
  // Note: We removed the hasInitialRouteSet check because middleware now handles all route protection
  if (isAuthenticated && !isUserDataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // If user must change password and is not on the change-password page, show loading
  if (mustChangePassword && pathname !== "/change-password") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to password change...</p>
        </div>
      </div>
    );
  }

  // If user must change password, show only the change password page without navigation
  if (mustChangePassword && pathname === "/change-password") {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] transition-colors duration-300">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[var(--overlay)] z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-50 md:hidden ${sidebarOpen ? "" : "hidden"}`}>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[var(--card)] backdrop-blur-sm shadow-xl border-r border-[var(--border)] transition-colors duration-300">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-6 mb-8">
              <div className="flex items-center">
                <Image
                  src="/logo/logo.webp"
                  alt="SINAG Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 lg:w-10 lg:h-10 object-contain flex-shrink-0"
                />
                <div className="ml-3">
                  <h1 className="text-lg font-bold text-[var(--foreground)]">SINAG</h1>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {isAdmin
                      ? "Admin Portal"
                      : isAssessor
                        ? "Assessor Portal"
                        : isValidator
                          ? "Validator Portal"
                          : isExternalUser
                            ? "Katuparan Center"
                            : "Barangay Portal"}
                  </p>
                </div>
              </div>
            </div>
            <nav className="px-4 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-4 py-3 text-left rounded-sm transition-all duration-200 ${
                    pathname === item.href
                      ? "bg-[var(--cityscape-yellow)] text-[var(--cityscape-accent-foreground)] shadow-lg"
                      : "text-[var(--foreground)] hover:bg-[var(--hover)] hover:text-[var(--cityscape-yellow)]"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <NavIcon name={item.icon} />
                  <span className="ml-3 font-medium">{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div
        className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 transition-all duration-300 ${
          sidebarCollapsed ? "md:w-20" : "md:w-64"
        }`}
      >
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--card)] backdrop-blur-sm shadow-xl border-r border-[var(--border)] transition-colors duration-300">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div
              className={`flex flex-shrink-0 px-4 mb-8 ${sidebarCollapsed ? "flex-col items-center gap-3" : "items-center justify-between"}`}
            >
              <div className={`flex items-center ${sidebarCollapsed ? "flex-col" : ""}`}>
                <Image
                  src="/logo/logo.webp"
                  alt="SINAG Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 lg:w-10 lg:h-10 object-contain flex-shrink-0"
                />
                {!sidebarCollapsed && (
                  <div className="ml-3">
                    <h1 className="text-lg font-bold text-[var(--foreground)]">SINAG</h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {isAdmin
                        ? "Admin Portal"
                        : isAssessor
                          ? "Assessor Portal"
                          : isValidator
                            ? "Validator Portal"
                            : isExternalUser
                              ? "Katuparan Center"
                              : "Barangay Portal"}
                    </p>
                  </div>
                )}
              </div>
              {/* Collapse/Expand toggle button */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="flex items-center justify-center h-8 w-8 rounded-md transition-all duration-200 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--cityscape-yellow)]"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!sidebarCollapsed}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </button>
            </div>
            <nav className="flex-1 px-2 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center ${sidebarCollapsed ? "justify-center px-2" : "px-4"} py-3 text-left rounded-sm transition-all duration-200 ${
                    pathname === item.href
                      ? "bg-[var(--cityscape-yellow)] text-[var(--cityscape-accent-foreground)] shadow-lg"
                      : "text-[var(--foreground)] hover:bg-[var(--hover)] hover:text-[var(--cityscape-yellow)]"
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <div className="flex-shrink-0">
                    <NavIcon name={item.icon} />
                  </div>
                  {!sidebarCollapsed && <span className="ml-3 font-medium">{item.name}</span>}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        className={`flex flex-col flex-1 transition-all duration-300 ${
          sidebarCollapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-[var(--background)] transition-colors duration-300">
          <button
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-[var(--icon-default)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--cityscape-yellow)] transition-colors duration-200"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Header */}
        <header className="bg-[var(--card)] shadow-sm transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <div>
                  <h2 className="text-2xl font-bold leading-7 text-[var(--foreground)] sm:truncate">
                    {isAdmin
                      ? // Admin-specific titles
                        pathname === "/mlgoo/reports"
                        ? "Analytics & Reports"
                        : pathname === "/mlgoo/submissions"
                          ? "Submission Queue"
                          : pathname === "/mlgoo/cycles"
                            ? "Assessment Cycles"
                            : pathname === "/mlgoo/settings"
                              ? "System Settings"
                              : pathname === "/mlgoo/profile"
                                ? "Profile"
                                : navigation.find((item) => pathname === item.href)?.name ||
                                  "Dashboard"
                      : isAssessor
                        ? // Assessor-specific titles
                          pathname === "/assessor/submissions"
                          ? "Submissions Dashboard"
                          : pathname === "/assessor/analytics"
                            ? `Analytics: ${governanceAreaName || "Loading..."}`
                            : pathname === "/assessor/profile"
                              ? "Profile"
                              : navigation.find((item) => pathname === item.href)?.name ||
                                "Dashboard"
                        : isExternalUser
                          ? // Katuparan Center titles
                            pathname === "/katuparan/dashboard"
                            ? "Municipal SGLGB Overview"
                            : pathname === "/katuparan/reports"
                              ? "Data Export & Trends"
                              : pathname === "/katuparan/profile"
                                ? "User Settings"
                                : navigation.find((item) => pathname === item.href)?.name ||
                                  "Dashboard"
                          : // BLGU titles - show specific titles for better UX
                            pathname === "/blgu/dashboard"
                            ? "SGLGB Dashboard"
                            : pathname === "/blgu/assessments"
                              ? "My Assessments"
                              : pathname === "/blgu/profile"
                                ? "Profile"
                                : navigation.find((item) => pathname === item.href)?.name ||
                                  "Dashboard"}
                  </h2>
                  {/* Show context-specific subtitle for all users */}
                  {!isAdmin && pathname.startsWith("/blgu") && (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {pathname === "/blgu/dashboard" &&
                        "Monitor your SGLGB performance and track assessment progress"}
                      {pathname === "/blgu/assessments" &&
                        "Manage and complete your SGLGB assessments"}
                      {pathname === "/blgu/profile" &&
                        "Manage your account settings, update your password, and view your profile information."}
                    </p>
                  )}
                  {isAssessor && pathname.startsWith("/assessor") && (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {pathname === "/assessor/submissions" &&
                        `Governance Area: ${governanceAreaName || "Loading..."}`}
                      {pathname === "/assessor/analytics" &&
                        "Performance trends for all 25 barangays in your assigned area"}
                      {pathname === "/assessor/profile" &&
                        "Manage your account settings and profile information"}
                    </p>
                  )}
                  {isAdmin && (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {pathname === "/mlgoo/dashboard" && "Welcome to your SINAG dashboard"}
                      {pathname === "/mlgoo/submissions" &&
                        "Review and manage submitted assessments from barangays"}
                      {pathname === "/mlgoo/reports" &&
                        "View analytics and generate reports on assessment data"}
                      {pathname === "/analytics" &&
                        "Comprehensive analytics, municipal overview, and performance reports"}
                      {pathname.startsWith("/mlgoo/indicators") &&
                        "Create and manage assessment indicators with custom form schemas"}
                      {pathname.startsWith("/mlgoo/cycles") &&
                        "Create and manage assessment cycles with submission deadlines"}
                      {pathname.startsWith("/mlgoo/deadlines") &&
                        "Monitor deadline compliance and grant submission extensions"}
                      {pathname === "/user-management" && "Manage user accounts and permissions"}
                      {pathname === "/mlgoo/settings" &&
                        "Configure system settings and preferences"}
                      {pathname === "/mlgoo/profile" &&
                        "Manage your account settings and profile information"}
                    </p>
                  )}
                  {isExternalUser && pathname.startsWith("/katuparan") && (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {pathname === "/katuparan/dashboard" &&
                        "High-level, anonymized insights into SGLGB performance across all barangays"}
                      {pathname === "/katuparan/reports" &&
                        "Download aggregated data for research and CapDev planning"}
                      {pathname === "/katuparan/profile" &&
                        "Manage your account settings and password"}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <NotificationBell />

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    className="flex items-center space-x-2 p-2 rounded-full text-[var(--icon-default)] hover:text-[var(--cityscape-yellow)] hover:bg-[var(--hover)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--cityscape-yellow)] focus:ring-offset-2"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] flex items-center justify-center text-[var(--cityscape-accent-foreground)] font-semibold text-sm">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-[var(--foreground)]">
                      {user?.name || "User"}
                    </span>
                  </button>

                  {/* Profile dropdown menu */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-[var(--card)] rounded-sm shadow-xl border border-[var(--border)] z-50 transition-colors duration-300">
                      <div className="py-1">
                        <UserNav />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
          </div>
        </main>
      </div>

      {/* Click outside to close dropdown */}
      {profileDropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
      )}
    </div>
  );
}
