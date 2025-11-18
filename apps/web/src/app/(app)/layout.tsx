"use client";

import UserNav from "@/components/shared/UserNav";
import { useAssessorGovernanceArea } from "@/hooks/useAssessorGovernanceArea";
import { useAuthStore } from "@/store/useAuthStore";
import { Bell, X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Navigation items for different user roles
const mlgooNavigation = [
  { name: "Dashboard", href: "/mlgoo/dashboard", icon: "home" },
  { name: "Submission Queue", href: "/mlgoo/submissions", icon: "clipboard" },
  { name: "Analytics Dashboard", href: "/analytics", icon: "chart" },
  { name: "Reports & Visualizations", href: "/reports", icon: "chart" },
  { name: "Analytics & Reports (Legacy)", href: "/mlgoo/reports", icon: "chart" },
  { name: "Indicators", href: "/mlgoo/indicators", icon: "list" },
  { name: "BBIs", href: "/mlgoo/bbis", icon: "layers" },
  { name: "Assessment Cycles", href: "/mlgoo/cycles", icon: "calendar" },
  { name: "Deadlines", href: "/mlgoo/deadlines", icon: "clock" },
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

const getIcon = (name: string) => {
  switch (name) {
    case "home":
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      );
    case "clipboard":
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case "chart":
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      );
    case "users":
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
          />
        </svg>
      );
    case "user":
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      );
    case "settings":
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      );
    case "list":
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      );
    case "layers":
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      );
    case "calendar":
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    case "clock":
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    default:
      return null;
  }
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, mustChangePassword } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);

  // Get assessor's governance area
  const { governanceAreaName } = useAssessorGovernanceArea();

  // Determine navigation based on user role - only when user data is loaded
  const isAdmin = user?.role === "MLGOO_DILG";
  const isAssessor = user?.role === "ASSESSOR";
  const isValidator = user?.role === "VALIDATOR";
  const navigation = user
    ? isAdmin
      ? mlgooNavigation
      : isAssessor
      ? assessorNavigation
      : isValidator
      ? validatorNavigation
      : blguNavigation
    : blguNavigation;

  // Track when user data is loaded
  useEffect(() => {
    console.log("User Data Loading State:", {
      isAuthenticated,
      hasUser: !!user,
      userRole: user?.role,
      isUserDataLoaded,
    });

    if (isAuthenticated && user) {
      console.log("Setting user data as loaded");
      setIsUserDataLoaded(true);
    } else {
      console.log("Setting user data as not loaded");
      setIsUserDataLoaded(false);
    }
  }, [isAuthenticated, user, isUserDataLoaded]);

  // Debug logging for routing issues
  useEffect(() => {
    console.log("Layout Debug:", {
      user,
      userRole: user?.role,
      isAdmin,
      isAssessor,
      pathname,
      isAuthenticated,
      mustChangePassword,
      isUserDataLoaded,
    });
  }, [
    user,
    isAdmin,
    isAssessor,
    pathname,
    isAuthenticated,
    mustChangePassword,
    isUserDataLoaded,
  ]);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  // Redirect users to change password if required
  useEffect(() => {
    if (
      isAuthenticated &&
      user &&
      mustChangePassword &&
      pathname !== "/change-password"
    ) {
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
          : "/blgu/dashboard";
        console.log("Redirecting from root to:", dashboardPath);
        router.replace(dashboardPath);
      }
    }
  }, [isAuthenticated, user, mustChangePassword, pathname, router, isAdmin, isAssessor, isValidator, isUserDataLoaded]);

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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
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
      <div
        className={`fixed inset-0 flex z-50 md:hidden ${
          sidebarOpen ? "" : "hidden"
        }`}
      >
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
                  <h1 className="text-lg font-bold text-[var(--foreground)]">
                    SINAG
                  </h1>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {isAdmin
                      ? "Admin Portal"
                      : isAssessor
                      ? "Assessor Portal"
                      : isValidator
                      ? "Validator Portal"
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
                  {getIcon(item.icon)}
                  <span className="ml-3 font-medium">{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 transition-all duration-300 ${
        sidebarCollapsed ? 'md:w-20' : 'md:w-64'
      }`}>
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--card)] backdrop-blur-sm shadow-xl border-r border-[var(--border)] transition-colors duration-300">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className={`flex items-center flex-shrink-0 px-6 mb-8 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className={`flex items-center ${sidebarCollapsed ? 'flex-col' : ''}`}>
                <Image
                  src="/logo/logo.webp"
                  alt="SINAG Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 lg:w-10 lg:h-10 object-contain flex-shrink-0"
                />
                {!sidebarCollapsed && (
                  <div className="ml-3">
                    <h1 className="text-lg font-bold text-[var(--foreground)]">
                      SINAG
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {isAdmin
                        ? "Admin Portal"
                        : isAssessor
                        ? "Assessor Portal"
                        : isValidator
                        ? "Validator Portal"
                        : "Barangay Portal"}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <nav className="flex-1 px-2 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-left rounded-sm transition-all duration-200 ${
                    pathname === item.href
                      ? "bg-[var(--cityscape-yellow)] text-[var(--cityscape-accent-foreground)] shadow-lg"
                      : "text-[var(--foreground)] hover:bg-[var(--hover)] hover:text-[var(--cityscape-yellow)]"
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <div className="flex-shrink-0">
                    {getIcon(item.icon)}
                  </div>
                  {!sidebarCollapsed && (
                    <span className="ml-3 font-medium">{item.name}</span>
                  )}
                </Link>
              ))}
            </nav>

            {/* Collapse/Expand toggle button */}
            <div className="px-2 pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`group flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-4'} w-full py-3 text-left rounded-sm transition-all duration-200 text-[var(--foreground)] hover:bg-[var(--hover)] hover:text-[var(--cityscape-yellow)]`}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <div className="flex-shrink-0">
                  {sidebarCollapsed ? (
                    <ChevronRight className="w-5 h-5" />
                  ) : (
                    <ChevronLeft className="w-5 h-5" />
                  )}
                </div>
                {!sidebarCollapsed && (
                  <span className="ml-3 font-medium">Collapse</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ${
        sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
      }`}>
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-[var(--background)] transition-colors duration-300">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-[var(--icon-default)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--cityscape-yellow)] transition-colors duration-200"
            onClick={() => setSidebarOpen(true)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
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
                        : navigation.find((item) => pathname === item.href)
                            ?.name || "Dashboard"
                      : isAssessor
                      ? // Assessor-specific titles
                        pathname === "/assessor/submissions"
                        ? "Submissions Dashboard"
                        : pathname === "/assessor/analytics"
                        ? `Analytics: ${governanceAreaName || "Loading..."}`
                        : pathname === "/assessor/profile"
                        ? "Profile"
                        : navigation.find((item) => pathname === item.href)
                            ?.name || "Dashboard"
                      : // BLGU titles - show specific titles for better UX
                      pathname === "/blgu/dashboard"
                      ? "SGLGB Dashboard"
                      : pathname === "/blgu/assessments"
                      ? "My Assessments"
                      : pathname === "/blgu/profile"
                      ? "Profile"
                      : navigation.find((item) => pathname === item.href)
                          ?.name || "Dashboard"}
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
                        `Governance Area: ${
                          governanceAreaName || "Loading..."
                        }`}
                      {pathname === "/assessor/analytics" &&
                        "Performance trends for all 25 barangays in your assigned area"}
                      {pathname === "/assessor/profile" &&
                        "Manage your account settings and profile information"}
                    </p>
                  )}
                  {isAdmin && (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {pathname === "/mlgoo/dashboard" &&
                        "Welcome to your Vantage dashboard"}
                      {pathname === "/mlgoo/submissions" &&
                        "Review and manage submitted assessments from barangays"}
                      {pathname === "/mlgoo/reports" &&
                        "View analytics and generate reports on assessment data"}
                      {pathname.startsWith("/mlgoo/indicators") &&
                        "Create and manage assessment indicators with custom form schemas"}
                      {pathname.startsWith("/mlgoo/bbis") &&
                        "Configure and manage Barangay Basic Indicator mappings"}
                      {pathname.startsWith("/mlgoo/cycles") &&
                        "Create and manage assessment cycles with submission deadlines"}
                      {pathname.startsWith("/mlgoo/deadlines") &&
                        "Monitor deadline compliance and grant submission extensions"}
                      {pathname === "/user-management" &&
                        "Manage user accounts and permissions"}
                      {pathname === "/mlgoo/settings" &&
                        "Configure system settings and preferences"}
                      {pathname === "/mlgoo/profile" &&
                        "Manage your account settings and profile information"}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button className="p-2 rounded-full text-[var(--icon-default)] hover:text-[var(--cityscape-yellow)] hover:bg-[var(--hover)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--cityscape-yellow)] focus:ring-offset-2">
                  <Bell className="h-5 w-5" />
                </button>

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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Click outside to close dropdown */}
      {profileDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setProfileDropdownOpen(false)}
        />
      )}
    </div>
  );
}
