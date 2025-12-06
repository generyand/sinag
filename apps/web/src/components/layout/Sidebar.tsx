'use client';

/**
 * Sidebar Component
 *
 * Desktop sidebar navigation with collapsible state.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavIcon } from './NavIcon';
import type { NavItem } from '@/lib/navigation';

interface SidebarProps {
  navigation: NavItem[];
  portalName: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  navigation,
  portalName,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 transition-all duration-300 ${
        isCollapsed ? 'md:w-20' : 'md:w-64'
      }`}
    >
      <div className="flex-1 flex flex-col min-h-0 bg-[var(--card)] backdrop-blur-sm shadow-xl border-r border-[var(--border)] transition-colors duration-300">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          {/* Logo Section */}
          <div
            className={`flex items-center flex-shrink-0 px-6 mb-8 ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <div className={`flex items-center ${isCollapsed ? 'flex-col' : ''}`}>
              <Image
                src="/logo/logo.webp"
                alt="SINAG Logo"
                width={32}
                height={32}
                className="w-8 h-8 lg:w-10 lg:h-10 object-contain flex-shrink-0"
              />
              {!isCollapsed && (
                <div className="ml-3">
                  <h1 className="text-lg font-bold text-[var(--foreground)]">
                    SINAG
                  </h1>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {portalName}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-2 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'px-4'
                  } py-3 text-left rounded-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--cityscape-yellow)] text-[var(--cityscape-accent-foreground)] shadow-lg'
                      : 'text-[var(--foreground)] hover:bg-[var(--hover)] hover:text-[var(--cityscape-yellow)]'
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <div className="flex-shrink-0">
                    <NavIcon name={item.icon} />
                  </div>
                  {!isCollapsed && (
                    <span className="ml-3 font-medium">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Collapse Toggle */}
          <div className="px-2 pt-4 border-t border-[var(--border)]">
            <button
              onClick={onToggleCollapse}
              className={`group flex items-center ${
                isCollapsed ? 'justify-center px-2' : 'px-4'
              } w-full py-3 text-left rounded-sm transition-all duration-200 text-[var(--foreground)] hover:bg-[var(--hover)] hover:text-[var(--cityscape-yellow)]`}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <div className="flex-shrink-0">
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                )}
              </div>
              {!isCollapsed && (
                <span className="ml-3 font-medium">Collapse</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
