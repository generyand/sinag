// 🚀 Modern component using auto-generated React Query hooks
"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { usePostAuthLogout } from "@sinag/shared";
import { Loader2, LogOut, User } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

/**
 * User navigation component with logout functionality
 *
 * Displays current user information and provides logout functionality.
 * Uses the Zustand auth store for user data and the auto-generated
 * usePostAuthLogout hook for logout operations.
 */
export default function UserNav() {
  // Get user data and logout function from auth store
  const { user, logout } = useAuthStore();

  // Function to humanize role text
  const humanizeRole = (role: string) => {
    const roleMap: Record<string, string> = {
      MLGOO_DILG: "MLGOO DILG",
      ASSESSOR: "Area Assessor",
      VALIDATOR: "Validator",
      BLGU_USER: "Barangay Official",
    };

    return roleMap[role] || role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Debug: Log the user data
  console.log("UserNav - User data:", user);

  // Auto-generated logout mutation hook
  const logoutMutation = usePostAuthLogout({
    mutation: {
      onSuccess: () => {
        console.log("Logout successful");
        // Clear auth store and force page reload to clear all state
        logout();
        // Force a page reload to clear any in-memory state
        window.location.href = "/login";
      },
      onError: (error) => {
        console.error("Logout failed:", error);
        // Even if logout fails on server, clear local auth state
        logout();
        // Force a page reload to clear any in-memory state
        window.location.href = "/login";
      },
    },
  });

  const handleLogout = (e?: React.MouseEvent) => {
    // Prevent default and bubbling
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      // Attempt server-side logout (fire and forget)
      logoutMutation.mutate();
    } catch (error) {
      console.error("Logout mutation triggering error:", error);
    }

    // Always perform local logout immediately
    logout();

    // Force redirect to login
    window.location.href = "/login";
  };

  if (!user) {
    return (
      <div className="px-4 py-4 border-b border-[var(--border)]">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-[var(--hover)] flex items-center justify-center">
            <User className="w-5 h-5 text-[var(--icon-muted)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--foreground)]">No user data</p>
            <p className="text-xs text-[var(--text-secondary)]">Please log in</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* User Info Section */}
      <div className="px-4 py-4 border-b border-[var(--border)]">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] flex items-center justify-center text-[var(--cityscape-accent-foreground)] font-semibold text-sm shadow-sm">
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--foreground)] truncate leading-tight">
              {user.name}
            </p>
            <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{user.email}</p>
            <div className="mt-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--hover)] text-[var(--foreground)] border border-[var(--border)]">
                {humanizeRole(user.role)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Toggle and Logout Section */}
      <div className="px-2 py-2 space-y-2">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Theme
          </span>
          <ThemeToggle
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
          />
        </div>

        {/* Divider */}
        <div className="h-px bg-[var(--border)] mx-1"></div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:text-[var(--cityscape-yellow)] hover:bg-[var(--hover)] rounded-sm transition-all duration-200 group border border-[var(--border)] hover:border-[var(--cityscape-yellow)] cursor-pointer"
        >
          {false ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-[var(--cityscape-yellow)]" />
              Signing out...
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4 mr-2 text-[var(--icon-default)] group-hover:text-[var(--cityscape-yellow)] transition-colors duration-200" />
              Sign out
            </>
          )}
        </button>
      </div>
    </>
  );
}
