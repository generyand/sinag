"use client";

/**
 * MobileSidebar Component
 *
 * Slide-out navigation for mobile devices.
 */

import type { NavItem } from "@/lib/navigation";
import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./NavIcon";

interface MobileSidebarProps {
  navigation: NavItem[];
  portalName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ navigation, portalName, isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--overlay)] z-40 md:hidden transition-opacity duration-300 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel Wrapper - pointer-events-none ensures clicks pass through empty space */}
      <div className="fixed inset-0 flex z-50 md:hidden pointer-events-none">
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[var(--card)] shadow-2xl border-r border-[var(--border)] transition-transform duration-300 pointer-events-auto">
          {/* Header Section: Logo + Close Button */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border)]">
            <div className="flex items-center">
              <Image
                src="/logo/logo.webp"
                alt="SINAG Logo"
                width={32}
                height={32}
                className="w-8 h-8 object-contain flex-shrink-0"
              />
              <div className="ml-3">
                <h1 className="text-lg font-bold text-[var(--foreground)] tracking-tight">SINAG</h1>
                <p className="text-xs text-[var(--text-secondary)] font-medium">{portalName}</p>
              </div>
            </div>
            <button
              className="group p-2 -mr-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              onClick={onClose}
              aria-label="Close navigation menu"
            >
              <X
                className="h-5 w-5 transition-transform group-hover:rotate-90"
                aria-hidden="true"
              />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 h-0 overflow-y-auto py-4">
            {/* Navigation Links */}
            <nav className="px-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-4 py-3 text-left rounded-md transition-all duration-200 ${
                      isActive
                        ? "bg-[var(--cityscape-yellow)] text-[var(--cityscape-accent-foreground)] shadow-sm font-medium"
                        : "text-[var(--foreground)] hover:bg-[var(--hover)] hover:text-[var(--cityscape-yellow)]"
                    }`}
                    onClick={onClose}
                  >
                    <NavIcon
                      name={item.icon}
                      className={`flex-shrink-0 h-5 w-5 ${isActive ? "text-[var(--cityscape-accent-foreground)]" : "text-[var(--text-secondary)] group-hover:text-[var(--cityscape-yellow)]"}`}
                    />
                    <span className="ml-3 text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Dummy div to constrain the sidebar width and allow right side to be valid "click outside" area */}
        <div className="flex-shrink-0 w-14" aria-hidden="true">
          {/* Force sidebar to not take full width so clicks can land on backdrop */}
        </div>
      </div>
    </>
  );
}
