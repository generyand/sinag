'use client';

/**
 * MobileSidebar Component
 *
 * Slide-out navigation for mobile devices.
 */

import { X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavIcon } from './NavIcon';
import type { NavItem } from '@/lib/navigation';

interface MobileSidebarProps {
  navigation: NavItem[];
  portalName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({
  navigation,
  portalName,
  isOpen,
  onClose,
}: MobileSidebarProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--overlay)] z-40 md:hidden transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <div className="fixed inset-0 flex z-50 md:hidden">
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[var(--card)] backdrop-blur-sm shadow-xl border-r border-[var(--border)] transition-colors duration-300">
          {/* Close Button */}
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={onClose}
              aria-label="Close navigation menu"
            >
              <X className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            {/* Logo Section */}
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
                    {portalName}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="px-4 space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-4 py-3 text-left rounded-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-[var(--cityscape-yellow)] text-[var(--cityscape-accent-foreground)] shadow-lg'
                        : 'text-[var(--foreground)] hover:bg-[var(--hover)] hover:text-[var(--cityscape-yellow)]'
                    }`}
                    onClick={onClose}
                  >
                    <NavIcon name={item.icon} />
                    <span className="ml-3 font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
