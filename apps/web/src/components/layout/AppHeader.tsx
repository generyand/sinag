'use client';

/**
 * AppHeader Component
 *
 * Main application header with page title, subtitles, and user actions.
 */

import { NotificationBell } from '@/components/features/notifications';
import UserNav from '@/components/shared/UserNav';
import { usePathname } from 'next/navigation';
import { useState, useMemo } from 'react';
import type { NavItem } from '@/lib/navigation';

interface AppHeaderProps {
  navigation: NavItem[];
  user: {
    name?: string;
    role?: string;
  } | null;
  governanceAreaName?: string;
}

interface PageInfo {
  title: string;
  subtitle?: string;
}

/**
 * Get page title and subtitle based on current path and user role
 */
function getPageInfo(
  pathname: string,
  role: string | undefined,
  navigation: NavItem[],
  governanceAreaName?: string
): PageInfo {
  const isAdmin = role === 'MLGOO_DILG';
  const isAssessor = role === 'ASSESSOR';
  const isExternalUser = role === 'KATUPARAN_CENTER_USER';

  // Admin-specific pages
  if (isAdmin) {
    const adminPages: Record<string, PageInfo> = {
      '/mlgoo/reports': { title: 'Analytics & Reports' },
      '/mlgoo/submissions': {
        title: 'Submission Queue',
        subtitle: 'Review and manage submitted assessments from barangays',
      },
      '/mlgoo/cycles': {
        title: 'Assessment Cycles',
        subtitle: 'Create and manage assessment cycles with submission deadlines',
      },
      '/mlgoo/settings': {
        title: 'System Settings',
        subtitle: 'Configure system settings and preferences',
      },
      '/mlgoo/profile': {
        title: 'Profile',
        subtitle: 'Manage your account settings and profile information',
      },
      '/mlgoo/dashboard': {
        title: 'Dashboard',
        subtitle: 'Welcome to your SINAG dashboard',
      },
      '/analytics': {
        title: 'Analytics & Reports',
        subtitle: 'Comprehensive analytics, municipal overview, and performance reports',
      },
      '/user-management': {
        title: 'User Management',
        subtitle: 'Manage user accounts and permissions',
      },
    };

    const info = adminPages[pathname];
    if (info) return info;

    if (pathname.startsWith('/mlgoo/indicators')) {
      return {
        title: 'Indicators',
        subtitle: 'Create and manage assessment indicators with custom form schemas',
      };
    }
    if (pathname.startsWith('/mlgoo/deadlines')) {
      return {
        title: 'Deadlines',
        subtitle: 'Monitor deadline compliance and grant submission extensions',
      };
    }
  }

  // Assessor-specific pages
  if (isAssessor) {
    const assessorPages: Record<string, PageInfo> = {
      '/assessor/submissions': {
        title: 'Submissions Dashboard',
        subtitle: `Governance Area: ${governanceAreaName || 'Loading...'}`,
      },
      '/assessor/analytics': {
        title: `Analytics: ${governanceAreaName || 'Loading...'}`,
        subtitle: 'Performance trends for all 25 barangays in your assigned area',
      },
      '/assessor/profile': {
        title: 'Profile',
        subtitle: 'Manage your account settings and profile information',
      },
    };

    const info = assessorPages[pathname];
    if (info) return info;
  }

  // Katuparan Center pages
  if (isExternalUser) {
    const katuparanPages: Record<string, PageInfo> = {
      '/katuparan/dashboard': {
        title: 'Municipal SGLGB Overview',
        subtitle: 'High-level, anonymized insights into SGLGB performance across all barangays',
      },
      '/katuparan/reports': {
        title: 'Data Export & Trends',
        subtitle: 'Download aggregated data for research and CapDev planning',
      },
      '/katuparan/profile': {
        title: 'User Settings',
        subtitle: 'Manage your account settings and password',
      },
    };

    const info = katuparanPages[pathname];
    if (info) return info;
  }

  // BLGU pages
  const blguPages: Record<string, PageInfo> = {
    '/blgu/dashboard': {
      title: 'SGLGB Dashboard',
      subtitle: 'Monitor your SGLGB performance and track assessment progress',
    },
    '/blgu/assessments': {
      title: 'My Assessments',
      subtitle: 'Manage and complete your SGLGB assessments',
    },
    '/blgu/profile': {
      title: 'Profile',
      subtitle: 'Manage your account settings, update your password, and view your profile information.',
    },
  };

  const blguInfo = blguPages[pathname];
  if (blguInfo) return blguInfo;

  // Fallback to navigation item name
  const navItem = navigation.find((item) => pathname === item.href);
  return { title: navItem?.name || 'Dashboard' };
}

export function AppHeader({
  navigation,
  user,
  governanceAreaName,
}: AppHeaderProps) {
  const pathname = usePathname();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const pageInfo = useMemo(
    () => getPageInfo(pathname, user?.role, navigation, governanceAreaName),
    [pathname, user?.role, navigation, governanceAreaName]
  );

  return (
    <header className="bg-[var(--card)] shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          {/* Page Title */}
          <div className="flex items-center">
            <div>
              <h2 className="text-2xl font-bold leading-7 text-[var(--foreground)] sm:truncate">
                {pageInfo.title}
              </h2>
              {pageInfo.subtitle && (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {pageInfo.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <NotificationBell />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                className="flex items-center space-x-2 p-2 rounded-full text-[var(--icon-default)] hover:text-[var(--cityscape-yellow)] hover:bg-[var(--hover)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--cityscape-yellow)] focus:ring-offset-2"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] flex items-center justify-center text-[var(--cityscape-accent-foreground)] font-semibold text-sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden sm:block text-sm font-medium text-[var(--foreground)]">
                  {user?.name || 'User'}
                </span>
              </button>

              {/* Dropdown Menu */}
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

      {/* Click outside to close dropdown */}
      {profileDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setProfileDropdownOpen(false)}
          aria-hidden="true"
        />
      )}
    </header>
  );
}
